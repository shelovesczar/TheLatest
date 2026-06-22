const rssAggregator = require('./rss-aggregator');
const { labelStoryPerspective } = require('./perspective');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'about', 'after', 'before', 'their', 'there',
  'have', 'has', 'had', 'were', 'was', 'will', 'would', 'could', 'should', 'over', 'under', 'between',
  'amid', 'amidst', 'through', 'across', 'what', 'when', 'where', 'which', 'while', 'news', 'latest',
  'says', 'say', 'said', 'just', 'more', 'than', 'them', 'they', 'your', 'onto', 'still', 'also'
]);

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function getMinutesAgo(item = {}) {
  const stamp = item.publishedAt || item.date || item.pubDate || item.isoDate || '';
  const parsed = Date.parse(stamp);
  if (Number.isNaN(parsed)) return 9999;
  return Math.max(0, Math.round((Date.now() - parsed) / 60000));
}

function clusterScore(cluster = {}, tokens = []) {
  if (!cluster.tokens || cluster.tokens.size === 0 || tokens.length === 0) return 0;
  let overlap = 0;
  tokens.forEach((token) => {
    if (cluster.tokens.has(token)) overlap += 1;
  });
  return overlap;
}

function upsertTokenCounts(counts = new Map(), tokens = []) {
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
}

function buildClusterTopic(cluster = {}) {
  if (cluster.seed?.title) return cluster.seed.title;

  const terms = Array.from(cluster.tokenCounts?.entries?.() || [])
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([token]) => token.charAt(0).toUpperCase() + token.slice(1));

  return terms.length > 0 ? terms.join(' · ') : 'Coverage cluster';
}

async function clusterStories(items = [], limit = 8) {
  const stories = Array.isArray(items) ? items.filter(Boolean) : [];
  const clusters = [];

  stories.forEach((story) => {
    const titleTokens = tokenize(story.title || '');
    const bodyTokens = tokenize(`${story.description || ''} ${story.content || ''}`);
    const combinedTokens = Array.from(new Set([...titleTokens, ...bodyTokens])).slice(0, 12);
    if (combinedTokens.length === 0) return;

    let bestCluster = null;
    let bestScore = 0;
    clusters.forEach((cluster) => {
      const score = clusterScore(cluster, combinedTokens);
      if (score > bestScore) {
        bestScore = score;
        bestCluster = cluster;
      }
    });

    const sourceName = String(story.source || 'Unknown Source').trim() || 'Unknown Source';
    const sourceKey = sourceName.toLowerCase();

    if (!bestCluster || bestScore < 2) {
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        seed: story,
        tokens: new Set(combinedTokens),
        tokenCounts: upsertTokenCounts(new Map(), combinedTokens),
        stories: [story],
        sourceKeys: new Set([sourceKey]),
        latestMinutesAgo: getMinutesAgo(story)
      });
      return;
    }

    if (!bestCluster.sourceKeys.has(sourceKey)) {
      bestCluster.stories.push(story);
      bestCluster.sourceKeys.add(sourceKey);
    }

    combinedTokens.forEach((token) => bestCluster.tokens.add(token));
    upsertTokenCounts(bestCluster.tokenCounts, combinedTokens);
    bestCluster.latestMinutesAgo = Math.min(bestCluster.latestMinutesAgo, getMinutesAgo(story));
  });

  const ranked = clusters
    .map((cluster, index) => ({
      id: cluster.id || `cluster-${index + 1}`,
      topic: buildClusterTopic(cluster),
      minutesAgo: cluster.latestMinutesAgo,
      sourceCount: cluster.sourceKeys.size,
      sources: cluster.stories
        .sort((left, right) => getMinutesAgo(left) - getMinutesAgo(right))
        .slice(0, 6)
    }))
    .filter((cluster) => cluster.sources.length > 0)
    .sort((left, right) => {
      if (right.sourceCount !== left.sourceCount) return right.sourceCount - left.sourceCount;
      return left.minutesAgo - right.minutesAgo;
    })
    .slice(0, limit);

  return Promise.all(ranked.map(async (cluster) => ({
    ...cluster,
    sources: await Promise.all(cluster.sources.map(async (story) => {
      const perspective = await labelStoryPerspective({
        headline: story.title || '',
        source: story.source || ''
      });

      return {
        ...story,
        perspectiveKey: perspective.key,
        perspectiveLabel: perspective.label,
        perspectiveStyle: perspective.sourceStyle
      };
    }))
  })));
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  try {
    const { type = 'news', category = '', search = '', limit = '8' } = event.queryStringParameters || {};
    const maxClusters = Math.max(1, Math.min(parseInt(limit, 10) || 8, 12));

    const response = await rssAggregator.handler({
      httpMethod: 'GET',
      queryStringParameters: {
        type,
        ...(category ? { category } : {}),
        ...(search ? { search, strictSearch: '0', relaxSearchFallback: '1', minStrictResults: '4' } : {})
      }
    }, {});

    const payload = JSON.parse(response.body || '{}');
    const items = Array.isArray(payload.data) ? payload.data : [];
    const clusters = await clusterStories(items, maxClusters);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clusters,
        count: clusters.length,
        totalStories: items.length,
        type,
        category,
        search
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};
