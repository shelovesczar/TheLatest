const Parser = require('rss-parser');
const { socialFeeds: localSocialFeeds = [] } = require('./social-feed-config.cjs');

const parser = new Parser({
  timeout: 20000,
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['itunes:image', 'itunesImage'],
      ['dc:creator', 'dcCreator'],
      ['content:encoded', 'contentEncoded'],
      ['description', 'description']
    ]
  }
});

const CACHE_DURATION = 15 * 60 * 1000;
const RSSHUB_BASE_URL = process.env.RSSHUB_BASE_URL || 'https://rsshub.app';
let socialCache = new Map();
let currentCycleIndex = 0;  // Track current rotation cycle

const TOPIC_EXPANSIONS = {
  politics: ['politics', 'election', 'congress', 'senate', 'policy', 'government', 'trump', 'biden', 'white house'],
  business: ['business', 'market', 'stocks', 'economy', 'finance', 'wall street'],
  tech: ['tech', 'technology', 'ai', 'artificial intelligence', 'startup', 'software', 'apple', 'google', 'microsoft', 'crypto', 'bitcoin'],
  entertainment: ['entertainment', 'movie', 'film', 'hollywood', 'music', 'celebrity', 'oscars', 'grammy'],
  sports: ['sports', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'fifa', 'olympics'],
  world: ['world', 'international', 'global', 'iran', 'israel', 'ukraine', 'middle east', 'strait', 'hormuz'],
  culture: ['culture', 'lifestyle', 'fashion', 'health', 'travel']
};

const tokenize = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((token) => token.length >= 2);

const damerauLevenshteinDistance = (a = '', b = '') => {
  const source = String(a);
  const target = String(b);
  const sourceLength = source.length;
  const targetLength = target.length;

  if (!sourceLength) return targetLength;
  if (!targetLength) return sourceLength;

  const matrix = Array.from({ length: sourceLength + 1 }, () => new Array(targetLength + 1).fill(0));
  for (let i = 0; i <= sourceLength; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= targetLength; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= sourceLength; i += 1) {
    for (let j = 1; j <= targetLength; j += 1) {
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );

      if (
        i > 1 &&
        j > 1 &&
        source[i - 1] === target[j - 2] &&
        source[i - 2] === target[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[sourceLength][targetLength];
};

const tokenMatches = (queryToken, candidateToken) => {
  if (!queryToken || !candidateToken) return false;
  if (queryToken === candidateToken) return true;
  if (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken)) return true;
  if (Math.min(queryToken.length, candidateToken.length) < 5) return false;
  return damerauLevenshteinDistance(queryToken, candidateToken) <= 1;
};

const countHits = (fieldTokens = [], queryTokens = []) => {
  let score = 0;
  let matched = 0;

  queryTokens.forEach((queryToken) => {
    for (const candidateToken of fieldTokens) {
      if (!tokenMatches(queryToken, candidateToken)) continue;
      matched += 1;
      score += queryToken === candidateToken ? 1 : 0.65;
      break;
    }
  });

  return { score, matched };
};

const stripHtml = (value = '') =>
  String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const parseEnvFeeds = () => {
  try {
    const raw = process.env.SOCIAL_RSS_FEEDS;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[SocialFeeds] Invalid SOCIAL_RSS_FEEDS JSON:', error.message);
    return [];
  }
};

const normalizeRoute = (route = '') => {
  const value = String(route || '').trim();
  if (!value) return null;
  return value.startsWith('/') ? value : `/${value}`;
};

const resolveFeedUrl = (feed) => {
  if (feed?.url && /^https?:\/\//i.test(feed.url)) return feed.url;
  const route = normalizeRoute(feed?.route);
  if (!route) return null;
  return `${RSSHUB_BASE_URL.replace(/\/$/, '')}${route}`;
};

const resolveFallbackUrl = (feed) => {
  if (feed?.fallbackUrl && /^https?:\/\//i.test(feed.fallbackUrl)) return feed.fallbackUrl;
  return null;
};

const getConfiguredFeeds = () => {
  const envFeeds = parseEnvFeeds();
  const feedList = envFeeds.length > 0 ? envFeeds : localSocialFeeds;

  return feedList
    .map((feed) => {
      const resolvedUrl = resolveFeedUrl(feed);
      const fallbackUrl = resolveFallbackUrl(feed);
      if (!resolvedUrl && !fallbackUrl) return null;

      return {
        ...feed,
        url: resolvedUrl,
        fallbackUrl,
        tags: Array.isArray(feed?.tags)
          ? feed.tags.map((tag) => String(tag).toLowerCase())
          : []
      };
    })
    .filter(Boolean);
};

/**
 * Get active feeds based on rotation cycle
 * High-priority feeds are always included
 * Standard feeds rotate based on cycle index
 */
const getActiveFeeds = (allFeeds, cycleIndex = 0) => {
  const feedConfig = require('./social-feed-config.cjs');
  const priorityFeeds = allFeeds.filter(f => f.priority === 'high');
  
  const rotationCycleLength = feedConfig.fetchConfig.rotationCycleLength;
  const activeRotationIndex = cycleIndex % rotationCycleLength;
  
  const rotationalFeeds = allFeeds.filter(f => 
    f.priority === 'standard' && f.rotationIndex === activeRotationIndex
  );
  
  console.log(`[SocialFeeds] Cycle ${cycleIndex}: Active feeds =`, 
    [...priorityFeeds, ...rotationalFeeds].map(f => f.source).join(', '));
  
  return [...priorityFeeds, ...rotationalFeeds];
};

/**
 * Get max items to fetch for a specific feed
 */
const getMaxItemsForFeed = (feed) => {
  const feedConfig = require('./social-feed-config.cjs');
  return feed.maxItems || (feedConfig.fetchConfig.defaultItemsPerFeed * (feed.weight || 1));
};

const getImageFromItem = (item) => {
  const mediaContent = item?.mediaContent;
  if (Array.isArray(mediaContent) && mediaContent[0]?.$?.url) return mediaContent[0].$.url;
  if (item?.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  if (typeof item?.itunesImage === 'string') return item.itunesImage;
  if (item?.enclosure?.url) return item.enclosure.url;
  if (typeof item?.image === 'string') return item.image;
  return null;
};

const getAuthorFromItem = (item, feed) =>
  stripHtml(item?.creator || item?.dcCreator || item?.author || feed?.source || feed?.platform || 'Social');

const normalizeFeedItem = (item, feed) => {
  const title = stripHtml(item?.title || '');
  const body = stripHtml(item?.contentSnippet || item?.content || item?.contentEncoded || item?.description || '');
  const content = body || title;

  return {
    platform: feed?.platform || 'Social',
    author: getAuthorFromItem(item, feed),
    source: feed?.source || feed?.platform || 'Social',
    category: feed?.category || 'social',
    tags: feed?.tags || [],
    content,
    title,
    url: item?.link || item?.guid || feed?.url,
    timestamp: item?.isoDate || item?.pubDate || null,
    image: getImageFromItem(item),
    engagement: '',
    html: null
  };
};

const expandTopicQuery = (topic) => {
  const query = String(topic || '').trim().toLowerCase();
  if (!query) return new Set();

  const expanded = new Set([query]);
  Object.values(TOPIC_EXPANSIONS).forEach((keywords) => {
    if (keywords.some((keyword) => query.includes(keyword) || keyword.includes(query))) {
      keywords.forEach((keyword) => expanded.add(keyword));
    }
  });

  return expanded;
};

const matchesTopic = (post, topic) => {
  const query = String(topic || '').trim().toLowerCase();
  if (!query) return true;

  const expanded = Array.from(expandTopicQuery(query));
  const queryTokens = tokenize(expanded.join(' '));

  const titleHits = countHits(tokenize(post?.title || ''), queryTokens);
  const bodyHits = countHits(tokenize(`${post?.content || ''}`), queryTokens);
  const metaHits = countHits(tokenize(`${post?.author || ''} ${post?.source || ''} ${post?.category || ''} ${(post?.tags || []).join(' ')}`), queryTokens);

  const weightedScore = (titleHits.score * 6) + (bodyHits.score * 4) + (metaHits.score * 1.5);
  const hasCoverage = titleHits.matched + bodyHits.matched + metaHits.matched >= Math.max(1, Math.ceil(tokenize(query).length * 0.6));
  const titleOnlyWeakMatch = titleHits.score > 0 && bodyHits.score === 0 && metaHits.score === 0;

  return hasCoverage && weightedScore >= 6 && !titleOnlyWeakMatch;
};

const uniqueByUrl = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.url || item?.title || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const cacheKeyFor = (topic, limit, feedCount) => `${String(topic || '').trim().toLowerCase()}::${limit}::${feedCount}`;

exports.handler = async (event) => {
  const { topic = '', limit = '12' } = event.queryStringParameters || {};
  const maxItems = Math.max(1, Math.min(parseInt(limit, 10) || 12, 30));
  const allFeeds = getConfiguredFeeds();
  
  // Get active feeds for current cycle
  const activeFeeds = getActiveFeeds(allFeeds, currentCycleIndex);
  
  const cacheKey = cacheKeyFor(topic, maxItems, activeFeeds.length);
  const cached = socialCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION && Array.isArray(cached.data) && cached.data.length > 0) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        data: cached.data, 
        cached: true, 
        configuredFeeds: allFeeds.length,
        activeFeedsInCycle: activeFeeds.length,
        cycle: currentCycleIndex
      })
    };
  }

  if (activeFeeds.length === 0) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        data: [],
        configuredFeeds: allFeeds.length,
        warning: 'No active feeds in current rotation cycle. Check social-feed-config.cjs for configuration.'
      })
    };
  }

  try {
    const settled = await Promise.allSettled(
      activeFeeds.map(async (feed) => {
        const urlsToTry = [feed.url, feed.fallbackUrl].filter(Boolean);
        let parsed = null;

        for (const candidateUrl of urlsToTry) {
          try {
            parsed = await parser.parseURL(candidateUrl);
            if (Array.isArray(parsed?.items) && parsed.items.length > 0) break;
          } catch (error) {
            console.warn(`[SocialFeeds] Failed feed ${feed.source} via ${candidateUrl}: ${error.message}`);
          }
        }

        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        const maxItemsForFeed = getMaxItemsForFeed(feed);
        return items.slice(0, maxItemsForFeed).map((item) => normalizeFeedItem(item, feed));
      })
    );

    const allPosts = settled
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value || []);

    const filtered = uniqueByUrl(allPosts)
      .filter((post) => matchesTopic(post, topic))
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, maxItems);

    if (filtered.length > 0) {
      socialCache.set(cacheKey, {
        timestamp: Date.now(),
        data: filtered
      });
    }

    // Increment cycle for next fetch
    currentCycleIndex++;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        data: filtered, 
        configuredFeeds: allFeeds.length,
        activeFeedsInCycle: activeFeeds.length,
        cycle: currentCycleIndex - 1
      })
    };
  } catch (error) {
    console.error('[SocialFeeds] Error:', error.message);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Failed to fetch social feeds', message: error.message })
    };
  }
};