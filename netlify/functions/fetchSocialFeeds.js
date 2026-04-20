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

const TOPIC_EXPANSIONS = {
  politics: ['politics', 'election', 'congress', 'senate', 'policy', 'government', 'trump', 'biden', 'white house'],
  business: ['business', 'market', 'stocks', 'economy', 'finance', 'wall street'],
  tech: ['tech', 'technology', 'ai', 'artificial intelligence', 'startup', 'software', 'apple', 'google', 'microsoft', 'crypto', 'bitcoin'],
  entertainment: ['entertainment', 'movie', 'film', 'hollywood', 'music', 'celebrity', 'oscars', 'grammy'],
  sports: ['sports', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'fifa', 'olympics'],
  world: ['world', 'international', 'global', 'iran', 'israel', 'ukraine', 'middle east', 'strait', 'hormuz'],
  culture: ['culture', 'lifestyle', 'fashion', 'health', 'travel']
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

  const expanded = expandTopicQuery(query);
  const searchable = `${post?.title || ''} ${post?.content || ''} ${post?.author || ''} ${post?.source || ''} ${post?.category || ''} ${(post?.tags || []).join(' ')}`.toLowerCase();

  for (const keyword of expanded) {
    if (searchable.includes(keyword)) return true;
  }

  return false;
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
  const feeds = getConfiguredFeeds();
  const cacheKey = cacheKeyFor(topic, maxItems, feeds.length);
  const cached = socialCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION && Array.isArray(cached.data) && cached.data.length > 0) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ data: cached.data, cached: true, configuredFeeds: feeds.length })
    };
  }

  if (feeds.length === 0) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        data: [],
        configuredFeeds: 0,
        warning: 'No social RSS feeds configured. Add feed routes/URLs to netlify/functions/social-feed-config.cjs or SOCIAL_RSS_FEEDS env var.'
      })
    };
  }

  try {
    const settled = await Promise.allSettled(
      feeds.map(async (feed) => {
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
        return items.slice(0, 12).map((item) => normalizeFeedItem(item, feed));
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ data: filtered, configuredFeeds: feeds.length })
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