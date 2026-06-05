const Parser = require('rss-parser');
const { STORE_NAMES, getJson, getJsonWithMetadata, setJson } = require('./blobStore');
const parser = new Parser({
  timeout: 5000, // 5 seconds — fail fast on slow feeds
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'thumbnail'],
      ['media:group', 'mediaGroup'],
      ['itunes:image', 'itunesImage'],
      ['image', 'imageField'],
      ['description', 'description'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

// In-memory cache (lasts for function lifetime)
let cache = {
  news: { data: null, timestamp: 0 },
  opinions: { data: null, timestamp: 0 },
  videos: { data: null, timestamp: 0 },
  podcasts: { data: null, timestamp: 0 },
  sports: { data: null, timestamp: 0 },
  tech: { data: null, timestamp: 0 },
  entertainment: { data: null, timestamp: 0 },
  business: { data: null, timestamp: 0 },
  lifestyle: { data: null, timestamp: 0 },
  culture: { data: null, timestamp: 0 }
};

// Tracks rotation offsets per feed key so non-priority feeds cycle over time.
let feedRotationOffsets = new Map();

let articleImageCache = new Map();
let feedFailureCache = new Map();

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes — fewer cold fetches
const MAX_ITEMS_PER_FEED = 15;          // only grab top 15 per feed for speed
const MAX_FEEDS_PER_REQUEST = 6;        // cap parallel feeds to avoid slow stragglers
const PRIORITY_FEED_MIN_ITEMS = 24;      // high-priority feeds pull more items
const ARTICLE_IMAGE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const MAX_IMAGE_ENRICH_ITEMS = 0;       // disabled — images come from feed metadata
const IMAGE_ENRICH_CONCURRENCY = 5;
const PERMANENT_FEED_FAILURE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const TRANSIENT_FEED_FAILURE_TTL = 30 * 60 * 1000; // 30 minutes
const SNAPSHOT_STALE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const FALLBACK_IMAGE_URLS = new Set([
  'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1600&q=85',
  'https://images.unsplash.com/photo-1586339949216-35c2747e98f8?w=1600&q=85',
  'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=1600&q=85',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1600&q=85'
]);

function normalizeKeyPart(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function stableHash(value = '') {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}

function buildSnapshotKey(cacheKey) {
  return `snapshots/${normalizeKeyPart(cacheKey) || 'news'}`;
}

function buildFeedHealthKey(feedConfig = {}) {
  return `feeds/${stableHash(feedConfig.url || feedConfig.source || 'feed')}`;
}

function isFreshTimestamp(timestamp, maxAge = CACHE_DURATION) {
  const parsed = Date.parse(timestamp || '');
  if (Number.isNaN(parsed)) return false;
  return (Date.now() - parsed) < maxAge;
}

async function getPersistedSnapshot(cacheKey, maxAge = CACHE_DURATION) {
  try {
    const snapshot = await getJsonWithMetadata(STORE_NAMES.articles, buildSnapshotKey(cacheKey));
    if (!snapshot || !snapshot.data) return null;
    if (!isFreshTimestamp(snapshot.data.timestamp, maxAge)) return null;
    return snapshot.data;
  } catch (error) {
    console.warn(`[SNAPSHOT] Failed to read persisted snapshot for ${cacheKey}:`, error.message);
    return null;
  }
}

async function persistSnapshot(cacheKey, items = [], context = {}) {
  if (!Array.isArray(items) || items.length === 0) return;

  const payload = {
    cacheKey,
    items,
    count: items.length,
    timestamp: new Date().toISOString(),
    context
  };

  try {
    await setJson(STORE_NAMES.articles, buildSnapshotKey(cacheKey), payload, {
      metadata: {
        cacheKey,
        type: String(context.type || '').slice(0, 40),
        category: String(context.category || '').slice(0, 40),
        updatedAt: payload.timestamp
      }
    });
  } catch (error) {
    console.warn(`[SNAPSHOT] Failed to persist snapshot for ${cacheKey}:`, error.message);
  }
}

async function recordFeedHealth(feedConfig = {}, update = {}) {
  if (!feedConfig?.url) return;

  const key = buildFeedHealthKey(feedConfig);

  try {
    const existing = await getJson(STORE_NAMES.feeds, key);
    const nextValue = {
      feedKey: key,
      url: feedConfig.url,
      source: feedConfig.source || 'Unknown Source',
      status: update.status || existing?.status || 'unknown',
      lastHttpStatus: update.httpStatus ?? existing?.lastHttpStatus ?? null,
      lastMessage: update.message || existing?.lastMessage || '',
      itemCount: Number(update.itemCount ?? existing?.itemCount ?? 0),
      successCount: Number(existing?.successCount || 0) + (update.status === 'healthy' ? 1 : 0),
      failureCount: Number(existing?.failureCount || 0) + (update.status === 'failed' ? 1 : 0),
      lastSuccessAt: update.status === 'healthy' ? new Date().toISOString() : (existing?.lastSuccessAt || null),
      lastFailureAt: update.status === 'failed' ? new Date().toISOString() : (existing?.lastFailureAt || null),
      updatedAt: new Date().toISOString()
    };

    await setJson(STORE_NAMES.feeds, key, nextValue, {
      metadata: {
        status: nextValue.status,
        source: String(nextValue.source || '').slice(0, 80),
        updatedAt: nextValue.updatedAt
      }
    });
  } catch (error) {
    console.warn(`[FEEDS] Failed to persist feed health for ${feedConfig.source || feedConfig.url}:`, error.message);
  }
}

function toPlainText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return value.map(toPlainText).filter(Boolean).join(' ');
  }

  if (typeof value === 'object') {
    const preferredKeys = ['_', 'name', 'term', 'label', 'title', 'text', 'value'];
    for (const key of preferredKeys) {
      if (key in value) {
        const textValue = toPlainText(value[key]);
        if (textValue) return textValue;
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  return '';
}

function toLowerSearchText(value) {
  return toPlainText(value).toLowerCase();
}

function tokenizeSearchText(value) {
  return toLowerSearchText(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

function damerauLevenshteinDistance(a = '', b = '') {
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
}

function tokenMatches(queryToken, candidateToken) {
  if (!queryToken || !candidateToken) return false;
  if (queryToken === candidateToken) return true;
  if (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken)) return true;

  const minLength = Math.min(queryToken.length, candidateToken.length);
  if (minLength < 5) return false;

  // Allow lightweight typo tolerance for longer words: e.g., "meixco" -> "mexico"
  return damerauLevenshteinDistance(queryToken, candidateToken) <= 1;
}

function countTokenHits(fieldTokens = [], queryTokens = []) {
  let score = 0;
  const matchedQueryTokens = new Set();

  queryTokens.forEach((queryToken) => {
    for (const candidateToken of fieldTokens) {
      if (!tokenMatches(queryToken, candidateToken)) continue;

      matchedQueryTokens.add(queryToken);
      score += queryToken === candidateToken ? 1 : 0.65;
      break;
    }
  });

  return { score, matchedCount: matchedQueryTokens.size };
}

function evaluateSearchRelevance(item = {}, query = '', options = {}) {
  const queryTokens = tokenizeSearchText(query);
  if (queryTokens.length === 0) {
    return { isMatch: true, score: 0, rationale: { title: 0, body: 0, meta: 0, matchedQueryTokens: 0 } };
  }

  const strictMode = Boolean(options.strictMode);

  const titleTokens = tokenizeSearchText(item.title);
  const descriptionTokens = tokenizeSearchText(item.description);
  const contentTokens = tokenizeSearchText(item.content);
  const metaTokens = tokenizeSearchText(`${item.source || ''} ${item.category || ''} ${(item.tags || []).join(' ')}`);

  const titleHits = countTokenHits(titleTokens, queryTokens);
  const descriptionHits = countTokenHits(descriptionTokens, queryTokens);
  const contentHits = countTokenHits(contentTokens, queryTokens);
  const metaHits = countTokenHits(metaTokens, queryTokens);

  const bodyScore = descriptionHits.score + (contentHits.score * 0.8);
  const weightedScore =
    (titleHits.score * 7) +
    (bodyScore * 4) +
    (metaHits.score * 1.5);

  const matchedQueryTokens = new Set([
    ...queryTokens.filter((token) => titleTokens.some((candidate) => tokenMatches(token, candidate))),
    ...queryTokens.filter((token) => descriptionTokens.some((candidate) => tokenMatches(token, candidate))),
    ...queryTokens.filter((token) => contentTokens.some((candidate) => tokenMatches(token, candidate))),
    ...queryTokens.filter((token) => metaTokens.some((candidate) => tokenMatches(token, candidate)))
  ]);

  const coverageRequired = strictMode
    ? (queryTokens.length === 1 ? 1 : Math.ceil(queryTokens.length * 0.7))
    : (queryTokens.length === 1 ? 1 : Math.ceil(queryTokens.length * 0.6));
  const hasEnoughCoverage = matchedQueryTokens.size >= coverageRequired;

  // Enforce substance: in strict mode reject title-only weak matches for single-word queries.
  const hasBodySupport = bodyScore >= 0.8;
  const singleWordTitleOnly = strictMode && queryTokens.length === 1 && titleHits.score > 0 && !hasBodySupport && metaHits.score === 0;
  const passesThreshold = weightedScore >= (strictMode ? 9.5 : 7.5);

  const isMatch = hasEnoughCoverage && passesThreshold && !singleWordTitleOnly;

  return {
    isMatch,
    score: Number(weightedScore.toFixed(2)),
    rationale: {
      mode: strictMode ? 'strict' : 'relaxed',
      title: Number(titleHits.score.toFixed(2)),
      body: Number(bodyScore.toFixed(2)),
      meta: Number(metaHits.score.toFixed(2)),
      matchedQueryTokens: matchedQueryTokens.size
    }
  };
}

function normalizeTitle(value) {
  return toLowerSearchText(value)
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(value) {
  const raw = toPlainText(value).trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    parsed.hash = '';

    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'guccounter', 'cmpid', 'ocid',
      'ref', 'ref_src', 'ref_url', 'source', 'spm', 'igshid'
    ];

    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    const normalizedSearch = parsed.searchParams.toString();
    const searchSuffix = normalizedSearch ? `?${normalizedSearch}` : '';

    return `${parsed.origin}${normalizedPath}${searchSuffix}`;
  } catch {
    return raw.split('#')[0];
  }
}

function isFallbackImage(imageUrl) {
  return FALLBACK_IMAGE_URLS.has(toPlainText(imageUrl));
}

function getArticlePreviewImage(articleUrl) {
  const normalizedUrl = normalizeUrl(articleUrl);
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) return null;
  return `https://image.thum.io/get/width/1200/noanimate/${encodeURIComponent(normalizedUrl)}`;
}

function toInt(value) {
  const parsed = parseInt(String(value || '').trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getImageDimensionHints(url = '') {
  const normalized = toPlainText(url).trim();
  const hints = { width: 0, height: 0 };
  if (!normalized) return hints;

  const sizeSuffixMatch = normalized.match(/[-_](\d{2,4})x(\d{2,4})(?=\.(?:jpg|jpeg|png|webp|avif|gif))/i);
  if (sizeSuffixMatch) {
    hints.width = toInt(sizeSuffixMatch[1]);
    hints.height = toInt(sizeSuffixMatch[2]);
  }

  try {
    const parsed = new URL(normalized);
    const widthParam =
      parsed.searchParams.get('width') ||
      parsed.searchParams.get('w') ||
      parsed.searchParams.get('max_width') ||
      parsed.searchParams.get('imgw');
    const heightParam =
      parsed.searchParams.get('height') ||
      parsed.searchParams.get('h') ||
      parsed.searchParams.get('max_height') ||
      parsed.searchParams.get('imgh');
    const resizeParam = parsed.searchParams.get('resize') || parsed.searchParams.get('size');

    hints.width = hints.width || toInt(widthParam);
    hints.height = hints.height || toInt(heightParam);

    if (resizeParam && (!hints.width || !hints.height)) {
      const resizeMatch = String(resizeParam).match(/(\d{2,4})[^\d]+(\d{2,4})/);
      if (resizeMatch) {
        hints.width = hints.width || toInt(resizeMatch[1]);
        hints.height = hints.height || toInt(resizeMatch[2]);
      }
    }
  } catch {
    // noop
  }

  return hints;
}

function enhanceImageUrl(rawUrl = '') {
  const normalized = toPlainText(rawUrl).trim();
  if (!normalized) return normalized;

  let upgraded = normalized
    .replace(/[-_](\d{2,4})x(\d{2,4})(?=\.(?:jpg|jpeg|png|webp|avif|gif))/i, '');

  try {
    const parsed = new URL(upgraded);
    const widthKeys = ['w', 'width', 'max_width', 'imgw'];
    const heightKeys = ['h', 'height', 'max_height', 'imgh'];

    widthKeys.forEach((key) => {
      const current = toInt(parsed.searchParams.get(key));
      if (current > 0 && current < 900) {
        parsed.searchParams.set(key, '1400');
      }
    });

    heightKeys.forEach((key) => {
      const current = toInt(parsed.searchParams.get(key));
      if (current > 0 && current < 550) {
        parsed.searchParams.set(key, '900');
      }
    });

    const quality = toInt(parsed.searchParams.get('q') || parsed.searchParams.get('quality'));
    if (quality > 0 && quality < 75) {
      if (parsed.searchParams.has('q')) parsed.searchParams.set('q', '85');
      if (parsed.searchParams.has('quality')) parsed.searchParams.set('quality', '85');
    }

    upgraded = parsed.toString();
  } catch {
    // noop
  }

  upgraded = upgraded
    .replace(/=s(\d{2,4})(?:-[\w-]+)?(?=$|&|\?)/i, '=s1600')
    .replace(/\/thumb\//i, '/');

  return upgraded;
}

function scoreImageCandidate(url = '') {
  const normalized = toPlainText(url).trim();
  if (!normalized || !isValidImageUrl(normalized)) return -1000;

  const lower = normalized.toLowerCase();
  const { width, height } = getImageDimensionHints(normalized);
  let score = 0;

  if (width >= 1400) score += 12;
  else if (width >= 1000) score += 8;
  else if (width >= 700) score += 4;
  else if (width > 0 && width < 500) score -= 8;

  if (height >= 800) score += 6;
  else if (height > 0 && height < 350) score -= 5;

  if (width > 0 && height > 0) {
    const area = width * height;
    if (area >= 800000) score += 6;
    else if (area < 180000) score -= 6;
  }

  if (/maxres|original|orig|2048|1600|full|large/i.test(lower)) score += 5;
  if (/thumb|thumbnail|small|avatar|icon|sprite/i.test(lower)) score -= 7;
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(lower)) score += 1;

  return score;
}

function pickBestImageCandidate(candidates = []) {
  const unique = [];
  const seen = new Set();

  candidates.forEach((candidate) => {
    const enhanced = enhanceImageUrl(candidate);
    if (!enhanced || seen.has(enhanced)) return;
    seen.add(enhanced);
    unique.push(enhanced);
  });

  const scored = unique
    .map((url) => ({ url, score: scoreImageCandidate(url) }))
    .filter((entry) => entry.score > -900)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.url || null;
}

function getDedupKey(item = {}) {
  const normalizedUrl = normalizeUrl(item.url || item.link);
  if (normalizedUrl) return `url:${normalizedUrl}`;

  const normalizedHeadline = normalizeTitle(item.title);
  const normalizedSource = normalizeTitle(item.source);
  return `title:${normalizedSource}|${normalizedHeadline}`;
}

function scoreItemQuality(item = {}) {
  let score = 0;

  if (normalizeUrl(item.url || item.link)) score += 6;
  if (toPlainText(item.description).length >= 80) score += 4;
  if (toPlainText(item.content).length >= 150) score += 4;

  const image = toPlainText(item.image);
  if (image) {
    score += isFallbackImage(image) ? 1 : 8;
  }

  const publishedAt = Date.parse(toPlainText(item.publishedAt));
  if (!Number.isNaN(publishedAt)) {
    score += 2;
  }

  return score;
}

function mergeItems(primary = {}, secondary = {}) {
  const primaryScore = scoreItemQuality(primary);
  const secondaryScore = scoreItemQuality(secondary);
  const best = primaryScore >= secondaryScore ? primary : secondary;
  const other = best === primary ? secondary : primary;

  return {
    ...other,
    ...best,
    url: normalizeUrl(best.url || best.link || other.url || other.link),
    link: normalizeUrl(best.link || best.url || other.link || other.url),
    title: toPlainText(best.title || other.title),
    description: toPlainText(best.description || other.description),
    content: toPlainText(best.content || other.content),
    source: toPlainText(best.source || other.source),
    category: toPlainText(best.category || other.category) || 'News',
    image: toPlainText(best.image || other.image),
    publishedAt: toPlainText(best.publishedAt || other.publishedAt) || 'Recently'
  };
}

function dedupeItems(items = []) {
  const dedupeMap = new Map();

  items.forEach((item) => {
    if (!item) return;

    const normalizedItem = {
      ...item,
      url: normalizeUrl(item.url || item.link),
      link: normalizeUrl(item.link || item.url),
      title: toPlainText(item.title),
      description: toPlainText(item.description),
      content: toPlainText(item.content),
      source: toPlainText(item.source),
      category: toPlainText(item.category) || 'News',
      image: toPlainText(item.image),
      publishedAt: toPlainText(item.publishedAt) || 'Recently'
    };

    const dedupeKey = getDedupKey(normalizedItem);
    if (!dedupeMap.has(dedupeKey)) {
      dedupeMap.set(dedupeKey, normalizedItem);
      return;
    }

    const merged = mergeItems(dedupeMap.get(dedupeKey), normalizedItem);
    dedupeMap.set(dedupeKey, merged);
  });

  return Array.from(dedupeMap.values());
}

function pruneArticleImageCache() {
  const now = Date.now();
  for (const [key, value] of articleImageCache.entries()) {
    if (!value || now - value.timestamp > ARTICLE_IMAGE_CACHE_DURATION) {
      articleImageCache.delete(key);
    }
  }
}

function readCachedArticleImage(url) {
  const cached = articleImageCache.get(url);
  if (!cached) return undefined;

  if (Date.now() - cached.timestamp > ARTICLE_IMAGE_CACHE_DURATION) {
    articleImageCache.delete(url);
    return undefined;
  }

  return cached.image;
}

function cacheArticleImage(url, image) {
  articleImageCache.set(url, { image: image || '', timestamp: Date.now() });
}

function pruneFeedFailureCache() {
  const now = Date.now();
  for (const [key, value] of feedFailureCache.entries()) {
    if (!value || now >= value.expiresAt) {
      feedFailureCache.delete(key);
    }
  }
}

function getFeedFailureStatus(error) {
  const directStatus = error?.statusCode || error?.status || error?.response?.status;
  if (directStatus) return Number(directStatus);

  const message = toPlainText(error?.message);
  const match = message.match(/status code\s+(\d{3})/i);
  return match ? Number(match[1]) : null;
}

function shouldCacheFeedFailure(status, error) {
  if ([401, 403, 404, 406].includes(status)) {
    return { shouldCache: true, ttl: PERMANENT_FEED_FAILURE_TTL };
  }

  const message = toPlainText(error?.message).toLowerCase();
  if (message.includes('enotfound') || message.includes('eai_again')) {
    return { shouldCache: true, ttl: TRANSIENT_FEED_FAILURE_TTL };
  }

  return { shouldCache: false, ttl: 0 };
}

function shouldSkipFeed(feedUrl) {
  pruneFeedFailureCache();
  const cachedFailure = feedFailureCache.get(feedUrl);
  if (!cachedFailure) return false;
  return Date.now() < cachedFailure.expiresAt;
}

function cacheFeedFailure(feedUrl, error) {
  const status = getFeedFailureStatus(error);
  const { shouldCache, ttl } = shouldCacheFeedFailure(status, error);
  if (!shouldCache) return;

  feedFailureCache.set(feedUrl, {
    status,
    message: toPlainText(error?.message),
    expiresAt: Date.now() + ttl
  });
}

function extractMetaImageCandidates(html = '') {
  const candidates = [];
  const add = (value) => {
    const normalized = toPlainText(value).trim();
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["'][^>]*>/gi
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      add(match[1]);
    }
  });

  return candidates;
}

async function fetchArticleImage(articleUrl) {
  const normalizedUrl = normalizeUrl(articleUrl);
  if (!normalizedUrl || !/^https?:\/\//i.test(normalizedUrl)) return null;

  const cachedImage = readCachedArticleImage(normalizedUrl);
  if (cachedImage !== undefined) return cachedImage || null;

  try {
    const response = await axios.get(normalizedUrl, {
      timeout: 3500,
      maxRedirects: 5,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const html = toPlainText(response.data);
    const metaCandidates = extractMetaImageCandidates(html)
      .map((candidate) => {
        try {
          return new URL(candidate, normalizedUrl).toString();
        } catch {
          return candidate;
        }
      });

    const bestImage = pickBestImageCandidate(metaCandidates);
    const resolvedImage = bestImage || getArticlePreviewImage(normalizedUrl);
    cacheArticleImage(normalizedUrl, resolvedImage || null);
    return resolvedImage || null;
  } catch {
    const previewImage = getArticlePreviewImage(normalizedUrl);
    cacheArticleImage(normalizedUrl, previewImage || null);
    return previewImage || null;
  }
}

function shouldEnrichImage(item = {}) {
  const image = toPlainText(item.image);
  if (!image) return true;
  if (!isValidImageUrl(image)) return true;
  if (isFallbackImage(image)) return true;
  return false;
}

async function enrichItemsWithArticleImages(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];

  pruneArticleImageCache();

  const enriched = [...items];
  const indicesToEnrich = [];

  for (let index = 0; index < enriched.length; index += 1) {
    if (indicesToEnrich.length >= MAX_IMAGE_ENRICH_ITEMS) break;

    const item = enriched[index];
    if (!item || !shouldEnrichImage(item)) continue;

    const articleUrl = normalizeUrl(item.url || item.link);
    if (!articleUrl) continue;

    indicesToEnrich.push(index);
  }

  if (indicesToEnrich.length === 0) {
    return enriched;
  }

  for (let start = 0; start < indicesToEnrich.length; start += IMAGE_ENRICH_CONCURRENCY) {
    const chunk = indicesToEnrich.slice(start, start + IMAGE_ENRICH_CONCURRENCY);
    await Promise.all(chunk.map(async (index) => {
      const item = enriched[index];
      const articleUrl = normalizeUrl(item.url || item.link);
      if (!articleUrl) return;

      const articleImage = await fetchArticleImage(articleUrl);
      if (articleImage && isValidImageUrl(articleImage)) {
        enriched[index] = {
          ...item,
          image: articleImage
        };
      }
    }));
  }

  return enriched;
}

// Filter Configuration - Add domains or keywords to exclude
const FILTER_CONFIG = {
  // Domains to exclude (exact match or contains)
  excludeDomains: [
    'example-spam-site.com',
    'unwanted-domain.com'
    // Add more domains here
  ],
  
  // Keywords to exclude from titles or descriptions
  excludeKeywords: [
    'sponsored',
    'advertisement',
    'promoted content',
    'press release'
    // Add more keywords here
  ],
  
  // Minimum title length (to filter out spam/short titles)
  minTitleLength: 20,
  
  // Exclude articles with these patterns in URLs
  excludeUrlPatterns: [
    /\/ads?\//i,
    /\/sponsored\//i,
    /\/promotion\//i
  ]
};

// Helper to strip HTML tags and decode entities
function stripHtml(html) {
  const normalizedHtml = toPlainText(html);
  if (!normalizedHtml) return '';
  
  // Remove HTML tags
  let text = normalizedHtml.replace(/<[^>]*>/g, ' ');
  
  // Decode common HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&mdash;': '-',
    '&ndash;': '-',
    '&hellip;': '...',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"'
  };
  
  Object.keys(entities).forEach(entity => {
    text = text.replace(new RegExp(entity, 'g'), entities[entity]);
  });
  
  // Handle numeric entities
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// Filter function to exclude unwanted articles
function shouldFilterOut(item) {
  const title = toLowerSearchText(item.title);
  const description = toLowerSearchText(item.description);
  const link = toLowerSearchText(item.link);
  
  // Check title length
  if (title.length < FILTER_CONFIG.minTitleLength) {
    return true;
  }
  
  // Check for excluded domains
  for (const domain of FILTER_CONFIG.excludeDomains) {
    if (link.includes(domain.toLowerCase())) {
      console.log(`Filtered out: ${item.title} (excluded domain: ${domain})`);
      return true;
    }
  }
  
  // Check for excluded keywords
  for (const keyword of FILTER_CONFIG.excludeKeywords) {
    const keywordLower = keyword.toLowerCase();
    if (title.includes(keywordLower) || description.includes(keywordLower)) {
      console.log(`Filtered out: ${item.title} (keyword: ${keyword})`);
      return true;
    }
  }
  
  // Check for excluded URL patterns
  for (const pattern of FILTER_CONFIG.excludeUrlPatterns) {
    if (pattern.test(link)) {
      console.log(`Filtered out: ${item.title} (URL pattern: ${pattern})`);
      return true;
    }
  }
  
  return false;
}

// RSS Feed Sources
const RSS_FEEDS = {
  news: [
    // Major News Networks
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'New York Times' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' },
    { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
    { url: 'http://rss.cnn.com/rss/cnn_topstories.rss', source: 'CNN' },
    { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters' },
    { url: 'https://feeds.npr.org/1001/rss.xml', source: 'NPR' },
    { url: 'https://www.politico.com/rss/politicopicks.xml', source: 'Politico' },
    { url: 'https://feeds.washingtonpost.com/rss/national', source: 'Washington Post' },
    { url: 'https://www.latimes.com/world-nation/rss2.0.xml', source: 'LA Times' },
    { url: 'http://feeds.foxnews.com/foxnews/latest', source: 'Fox News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', source: 'New York Times US' },
    { url: 'https://www.theguardian.com/us-news/rss', source: 'The Guardian US' },
    
    // International News Sources (Global Expansion)
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://rss.dw.com/xml/rss-en-all', source: 'Deutsche Welle' },
    { url: 'https://www.france24.com/en/rss', source: 'France 24' },
    { url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', source: 'Channel NewsAsia' },
    { url: 'https://www.scmp.com/rss/91/feed', source: 'South China Morning Post' },
    { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms', source: 'Times of India' },
    { url: 'https://www.thestar.com.my/rss/News/Latest/', source: 'The Star Malaysia' },
    { url: 'https://www.abc.net.au/news/feed/51120/rss.xml', source: 'ABC News Australia' },
    { url: 'https://www.cbc.ca/cmlink/rss-topstories', source: 'CBC News' },
    
    // Additional US News
    { url: 'https://feeds.nbcnews.com/nbcnews/public/news', source: 'NBC News' },
    { url: 'https://feeds.abcnews.com/abcnews/topstories', source: 'ABC News' },
    { url: 'https://www.cbsnews.com/latest/rss/main', source: 'CBS News' },
    { url: 'https://www.usatoday.com/rss/', source: 'USA Today' },
    { url: 'https://nypost.com/feed/', source: 'New York Post' },
    { url: 'https://apnews.com/apf-topnews', source: 'Associated Press' },
    
    // RSS APP feeds (for more niche topics)
    { url: 'https://rss.app/feeds/tTWnpqRL1kY8uxZD.xml', source: 'CNN' }
    // Bundle feed is prepended automatically by prependBundleFeed() at position 1
  ],
  opinions: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Opinion.xml', source: 'New York Times Opinion' },
    { url: 'https://www.theguardian.com/uk/commentisfree/rss', source: 'The Guardian Opinion' },
    { url: 'https://www.theguardian.com/us/commentisfree/rss', source: 'The Guardian US Opinion' },
    { url: 'https://www.latimes.com/opinion/rss2.0.xml', source: 'LA Times Opinion' },
    { url: 'https://feeds.washingtonpost.com/rss/opinions', source: 'Washington Post Opinion' },
    { url: 'https://thehill.com/opinion/feed/', source: 'The Hill Opinion' },
    { url: 'https://www.nationalreview.com/feed/', source: 'National Review' },
    { url: 'https://www.wsj.com/xml/rss/3_7041.xml', source: 'WSJ Opinion' },
    // RSS APP feeds (for more niche topics)
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' }
    // Bundle feed is prepended automatically by prependBundleFeed() at position 1
  ],
  videos: [
    // Video-focused feeds
    { url: 'https://rss.app/feeds/_D52QE16IQULFQQkk.xml', source: 'Custom Video Feed', priority: 'high', maxItems: 30 },
    // Major News Networks
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCeY0bbntWzzVIaj2z3QigXg', source: 'NBC News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC52X5wxOL_s5yw0dQk7NtgA', source: 'Associated Press Video' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCupvZG-dwjc-b5gqpDpMLEA', source: 'CNN' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UChqUTb1LzRh2qiKI7O-g1vQ', source: 'New York Times' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCH5YX9AEe82R-yz-EHqnVUA', source: 'BBC News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCoHnyF6otAH6D45KKcspd3g', source: 'Reuters TV' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXMCrsqgcQIBN4UYnIZ51uA', source: 'Fox News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCBi2mrWuNuyYy4tbNP5qpFQ', source: 'ABC News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCYzhQ58Uw0aHAW2J1qHBVLQ', source: 'CBS News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCQjzHeHnrz8ItchyNuSXe2A', source: 'AP News' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCAl6sMQK7UGrN-_XNR5Faqg', source: 'The Guardian' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCs7lxVk-yCAJta1j6_byrPw', source: 'Washington Post' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNLeXyNOC_-maxChBQOUQpQ', source: 'Al Jazeera English' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCA5YwsTYQONMNp9ZNVUamcA', source: 'PBS' },
    { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCaLlzGqiREWo1HWcxZ0-9Vg', source: 'MSNBC' },
  ],
  podcasts: [
    // Podcast-focused feeds (kept separate from videos to avoid overlap)
    { url: 'https://feeds.npr.org/510318/podcast.xml', source: 'NPR Up First' },
    { url: 'https://feeds.megaphone.fm/NYT8938532588', source: 'The Daily (NYT)' },
    { url: 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss', source: 'BBC Global News Podcast' },
    // Additional Podcast Feeds
    { url: 'https://feeds.publicradio.org/public_feeds/marketplace/rss/rss.xml', source: 'Marketplace' },
    { url: 'https://feeds.publicradio.org/public_feeds/marketplace-tech/rss/rss.xml', source: 'Marketplace Tech' },
    { url: 'https://feeds.npr.org/432398906/podcast.xml', source: 'TED Radio Hour' },
    { url: 'https://www.thisamericanlife.org/podcast/feed.chtbl.com/thisamericanlife.rss', source: 'This American Life' },
    { url: 'https://feeds.megaphone.fm/ADL2638872911', source: 'Freakonomics Radio' },
    { url: 'https://feeds.megaphone.fm/intelligence2', source: 'Intelligence Squared' },
    { url: 'https://feeds.megaphone.fm/WSJ2920671661', source: 'The Journal' },
    { url: 'https://feeds.megaphone.fm/the-world', source: 'The World' },
    { url: 'https://feeds.npr.org/510019/podcast.xml', source: 'Morning Edition' },
    { url: 'https://feeds.npr.org/510355/podcast.xml', source: 'All Things Considered' },
    { url: 'https://feeds.npr.org/510202/podcast.xml', source: 'Weekend Edition Saturday' },
    { url: 'https://feeds.npr.org/510200/podcast.xml', source: 'Weekend Edition Sunday' },
    { url: 'https://feeds.npr.org/510307/podcast.xml', source: 'Fresh Air' },
    { url: 'https://www.economist.com/podcasts/the-intelligence-rss', source: 'The Intelligence - Economist' },
    { url: 'https://podcasts.voanews.com/podcast/in-the-news/', source: 'VOA In The News' },
    { url: 'https://feeds.megaphone.fm/DW7903283160', source: 'Deutsche Welle - Global 3000' },
  ],
  sports: [
    // Priority Sports Feed - Featured
    { url: 'https://rss.app/feeds/_O0XVRIWKtus1tywc.xml', source: 'Sports RSS Bundle', priority: 'high', maxItems: 30 },
    
    // Major Sports Networks
    { url: 'https://www.espn.com/espn/rss/news', source: 'ESPN' },
    { url: 'https://www.si.com/rss/si_topstories.rss', source: 'Sports Illustrated' },
    { url: 'https://www.cbssports.com/rss/headlines', source: 'CBS Sports' },
    { url: 'http://rss.cnn.com/rss/si_topstories.rss', source: 'Sports Illustrated CNN' },
    { url: 'https://www.latimes.com/sports/rss2.0.xml', source: 'LA Times Sports' },
    { url: 'https://www.espn.com/espn/rss/nfl/news', source: 'ESPN NFL' },
    { url: 'https://www.espn.com/espn/rss/nba/news', source: 'ESPN NBA' },
    { url: 'https://www.espn.com/espn/rss/mlb/news', source: 'ESPN MLB' },
    { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN Soccer' },
    { url: 'https://www.theguardian.com/sport/rss', source: 'The Guardian Sports' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/sports/rss.xml', source: 'NYT Sports' },
    
    // Additional Sports Sources
    { url: 'https://sports.yahoo.com/rss/', source: 'Yahoo Sports' },
    { url: 'https://bleacherreport.com/articles/feed', source: 'Bleacher Report' },
    { url: 'https://www.foxsports.com/rss', source: 'Fox Sports' },
    { url: 'https://www.nbcsports.com/feed', source: 'NBC Sports' },
    { url: 'https://www.espn.com/espn/rss/nhl/news', source: 'ESPN NHL' },
    { url: 'https://www.espn.com/espn/rss/golf/news', source: 'ESPN Golf' },
    { url: 'https://www.espn.com/espn/rss/tennis/news', source: 'ESPN Tennis' },
    
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' }
  ],
  tech: [
    // Major Tech Publications
    { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
    { url: 'https://www.theverge.com/rss/index.xml', source: 'The Verge' },
    { url: 'https://www.wired.com/feed/rss', source: 'Wired' },
    { url: 'https://www.engadget.com/rss.xml', source: 'Engadget' },
    { url: 'https://arstechnica.com/feed/', source: 'Ars Technica' },
    { url: 'https://www.cnet.com/rss/news/', source: 'CNET' },
    { url: 'https://www.theverge.com/tech/rss/index.xml', source: 'The Verge Tech' },
    { url: 'https://mashable.com/feeds/rss/all', source: 'Mashable' },
    { url: 'https://www.recode.net/rss/index.xml', source: 'Recode' },
    { url: 'https://www.theguardian.com/technology/rss', source: 'The Guardian Tech' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/technology/rss.xml', source: 'NYT Technology' },
    { url: 'https://www.wsj.com/xml/rss/3_7455.xml', source: 'WSJ Tech' },
    { url: 'https://www.zdnet.com/news/rss.xml', source: 'ZDNet' },
    // RSS APP feeds
    { url: 'https://rss.app/feeds/wGtHhwQaOwup8JQs.xml', source: 'New York Post' }
  ],
  entertainment: [
    // Priority Entertainment Feed - Featured
    { url: 'https://rss.app/feeds/_D360VlaVzhpeXSVR.xml', source: 'Entertainment RSS Bundle', priority: 'high', maxItems: 30 },

    // Entertainment Publications
    { url: 'https://variety.com/feed/', source: 'Variety' },
    { url: 'https://ew.com/feed/', source: 'Entertainment Weekly' },
    { url: 'https://www.hollywoodreporter.com/feed/', source: 'Hollywood Reporter' },
    { url: 'https://deadline.com/feed/', source: 'Deadline' },
    { url: 'https://www.latimes.com/entertainment-arts/rss2.0.xml', source: 'LA Times Entertainment' },
    { url: 'https://www.theguardian.com/film/rss', source: 'The Guardian Film' },
    { url: 'https://www.theguardian.com/tv-and-radio/rss', source: 'The Guardian TV' },
    { url: 'https://www.theguardian.com/music/rss', source: 'The Guardian Music' },
    { url: 'https://www.rollingstone.com/feed/', source: 'Rolling Stone' },
    { url: 'https://pitchfork.com/rss/news/', source: 'Pitchfork' },
    { url: 'https://consequence.net/feed/', source: 'Consequence' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/arts/rss.xml', source: 'NYT Arts' },
    
    // Additional Entertainment Sources
    { url: 'https://www.billboard.com/feed/', source: 'Billboard' },
    { url: 'https://www.vulture.com/rss', source: 'Vulture' },
    { url: 'https://www.indiewire.com/feed/', source: 'IndieWire' },
    { url: 'https://www.avclub.com/rss', source: 'The A.V. Club' },
    { url: 'https://www.nme.com/feed', source: 'NME' },
    { url: 'https://www.metacritic.com/rss/movies', source: 'Metacritic Movies' },
    
    // RSS APP feeds
    { url: 'https://rss.app/feeds/NqNqG0vL6EpyGww2.xml', source: 'PJ Media' }
  ],
  business: [
    // Business & Finance
    { url: 'https://feeds.bloomberg.com/markets/news.rss', source: 'Bloomberg' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC' },
    { url: 'https://www.economist.com/rss', source: 'The Economist' },
    { url: 'https://www.ft.com/?format=rss', source: 'Financial Times' },
    { url: 'https://www.wsj.com/xml/rss/3_7014.xml', source: 'Wall Street Journal' },
    { url: 'https://feeds.fortune.com/fortune/headlines', source: 'Fortune' },
    { url: 'https://www.forbes.com/business/feed/', source: 'Forbes Business' },
    { url: 'https://www.reuters.com/business', source: 'Reuters Business' },
    { url: 'https://www.theguardian.com/business/rss', source: 'The Guardian Business' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/business/rss.xml', source: 'NYT Business' },
    { url: 'https://www.latimes.com/business/rss2.0.xml', source: 'LA Times Business' }
  ],
  lifestyle: [
    // Priority Lifestyle Feed - Featured
    { url: 'https://rss.app/feeds/_z0pmqqR3Yi6s5A5e.xml', source: 'Lifestyle RSS Bundle', priority: 'high', maxItems: 30 },

    // Health & Wellness
    { url: 'https://www.health.com/syndication/feed', source: 'Health.com' },
    { url: 'https://rss.medicalnewstoday.com/featurednews.xml', source: 'Medical News Today' },
    { url: 'https://www.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', source: 'WebMD' },
    { url: 'https://www.prevention.com/feed/', source: 'Prevention' },
    { url: 'https://www.shape.com/feed/', source: 'Shape' },
    { url: 'https://www.menshealth.com/rss/all.xml/', source: 'Men\'s Health' },
    { url: 'https://www.womenshealthmag.com/rss/all.xml/', source: 'Women\'s Health' },
    // Travel
    { url: 'https://www.travelandleisure.com/feed/', source: 'Travel + Leisure' },
    { url: 'https://www.cntraveler.com/feed/rss', source: 'Condé Nast Traveler' },
    { url: 'https://www.lonelyplanet.com/blog/feed/', source: 'Lonely Planet' },
    { url: 'https://www.nationalgeographic.com/travel/rss/', source: 'National Geographic Travel' },
    // Food & Cooking
    { url: 'https://www.bonappetit.com/feed/rss', source: 'Bon Appétit' },
    { url: 'https://www.foodnetwork.com/feeds/all-recipes.rss', source: 'Food Network' },
    { url: 'https://www.epicurious.com/services/rss/recipes', source: 'Epicurious' },
    { url: 'https://www.eater.com/rss/index.xml', source: 'Eater' },
    // Fashion & Style
    { url: 'https://www.vogue.com/feed/rss', source: 'Vogue' },
    { url: 'https://www.gq.com/feed/rss', source: 'GQ' },
    { url: 'https://www.elle.com/rss/all.xml/', source: 'Elle' },
    // Home & Design
    { url: 'https://www.architecturaldigest.com/feed/rss', source: 'Architectural Digest' },
    { url: 'https://www.hgtv.com/feeds/all-shows.rss', source: 'HGTV' },
    { url: 'https://www.realsimple.com/syndication/all', source: 'Real Simple' },
    // Lifestyle General
    { url: 'https://www.theguardian.com/lifeandstyle/rss', source: 'The Guardian Lifestyle' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/well/rss.xml', source: 'NYT Well' },
    { url: 'https://www.latimes.com/lifestyle/rss2.0.xml', source: 'LA Times Lifestyle' }
  ],
  culture: [
    // Arts & Culture
    { url: 'https://www.newyorker.com/feed/everything', source: 'The New Yorker' },
    { url: 'https://www.theatlantic.com/feed/all/', source: 'The Atlantic' },
    { url: 'https://www.smithsonianmag.com/rss/latest_articles/', source: 'Smithsonian Magazine' },
    { url: 'https://hyperallergic.com/feed/', source: 'Hyperallergic' },
    { url: 'https://www.artsy.net/rss/news', source: 'Artsy' },
    { url: 'https://www.theguardian.com/culture/rss', source: 'The Guardian Culture' },
    { url: 'https://www.theguardian.com/books/rss', source: 'The Guardian Books' },
    { url: 'https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/books/rss.xml', source: 'NYT Books' },
    { url: 'https://lithub.com/feed/', source: 'Literary Hub' },
    { url: 'https://www.npr.org/rss/rss.php?id=1008', source: 'NPR Books' },
    { url: 'https://www.theparisreview.org/blog/feed/', source: 'Paris Review' },
    { url: 'https://www.latimes.com/entertainment-arts/books/rss2.0.xml', source: 'LA Times Books' }
  ]
};

const RSS_APP_BUNDLE_FEED_URL = process.env.RSS_APP_BUNDLE_FEED_URL || 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml';
const RSS_APP_BUNDLE_SOURCE = process.env.RSS_APP_BUNDLE_SOURCE || 'The Latest Bundle';
const BUNDLE_ELIGIBLE_FEED_KEYS = new Set([
  // Keep the global bundle on generic feed groups only.
  // Category groups with dedicated bundles (e.g. sports/entertainment/lifestyle)
  // should not get this extra prepend to avoid timeout-heavy duplication.
  'news', 'opinions', 'videos', 'podcasts',
  'tech', 'business', 'culture'
]);

function prependBundleFeed(feedList = [], feedKey = 'news') {
  if (!RSS_APP_BUNDLE_FEED_URL || !BUNDLE_ELIGIBLE_FEED_KEYS.has(feedKey)) {
    return feedList;
  }

  const bundleUrl = String(RSS_APP_BUNDLE_FEED_URL).trim().toLowerCase();
  const alreadyIncluded = feedList.some((feed) => String(feed?.url || '').trim().toLowerCase() === bundleUrl);
  if (alreadyIncluded) {
    return feedList;
  }

  return [{ url: RSS_APP_BUNDLE_FEED_URL, source: RSS_APP_BUNDLE_SOURCE, priority: 'high', maxItems: 24 }, ...feedList];
}

// Helper to extract image from RSS item
function extractImage(item) {
  let imageUrl = null;

  const candidateUrls = [];
  const addCandidate = (value) => {
    const normalized = toPlainText(value).trim();
    if (!normalized) return;
    if (!candidateUrls.includes(normalized)) {
      candidateUrls.push(normalized);
    }
  };

  const addFromObject = (obj) => {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach(addFromObject);
      return;
    }
    if (typeof obj === 'string') {
      addCandidate(obj);
      return;
    }
    if (typeof obj !== 'object') return;

    addCandidate(obj.url);
    addCandidate(obj.href);
    addCandidate(obj.src);
    if (obj.$ && typeof obj.$ === 'object') {
      addCandidate(obj.$.url);
      addCandidate(obj.$.href);
      addCandidate(obj.$.src);
    }
  };
  
  // Special handling for YouTube videos - extract video ID and construct thumbnail URL
  const linkField = item.link || item.url || item.id;
  if (linkField) {
    // Handle both youtube.com and youtu.be formats, plus RSS guid formats
    const youtubeMatch = linkField.match(/(?:youtube\.com\/watch\?.*v=([^&?/]+)|youtu\.be\/([^&?/]+)|yt\.googleapis\.com\/v\/([^&?/?]+))/);
    if (youtubeMatch && (youtubeMatch[1] || youtubeMatch[2] || youtubeMatch[3])) {
      const videoId = youtubeMatch[1] || youtubeMatch[2] || youtubeMatch[3];
      // Use high quality thumbnail (maxresdefault), fall back to mq quality if not available
      return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }
  
  // Check for YouTube media:content thumbnails
  if (item['media:content']) {
    const mediaItems = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
    for (const media of mediaItems) {
      if (media.$ && media.$.url && media.$.url.includes('youtube.com')) {
        const youtubeMatch = media.$.url.match(/(?:youtube\.com\/v\/|yt\.googleapis\.com\/v\/)([^&?/?]+)/);
        if (youtubeMatch && youtubeMatch[1]) {
          return `https://i.ytimg.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
        }
      }
    }
  }
  
  // Check iTunes podcast image (common in podcast feeds) - multiple property name variations
  if (item.itunes && item.itunes.image) {
    if (typeof item.itunes.image === 'string') return item.itunes.image;
    if (item.itunes.image.$ && item.itunes.image.$.href) return item.itunes.image.$.href;
    if (item.itunes.image._ && item.itunes.image._) return item.itunes.image._;
  }

  // Direct iTunes namespace variations
  if (typeof item['itunes:image'] === 'string') {
    return item['itunes:image'];
  } else if (item['itunes:image'] && typeof item['itunes:image'] === 'object') {
    if (item['itunes:image'].$ && item['itunes:image'].$.href) {
      return item['itunes:image'].$.href;
    }
    addFromObject(item['itunes:image']);
  }

  // Check image element within itunes namespace
  if (item['itunes:image-href']) {
    const imageUrl = toPlainText(item['itunes:image-href']);
    if (isValidImageUrl(imageUrl)) return imageUrl;
  }

  if (item.imageField) {
    addFromObject(item.imageField);
  }

  if (item.image) {
    addFromObject(item.image);
  }

  if (item.media) {
    addFromObject(item.media);
  }

  if (item.thumbnail) {
    addFromObject(item.thumbnail);
  }

  if (item.enclosures) {
    addFromObject(item.enclosures);
  }

  if (item['im:image']) {
    addFromObject(item['im:image']);
  }
  
  // Priority 1: media:content with high resolution (usually best quality for news articles)
  if (item['media:content']) {
    if (Array.isArray(item['media:content'])) {
      // Sort by width to get highest resolution first
      const sortedMedia = item['media:content']
        .filter(m => m.$ && m.$.url && m.$.medium !== 'video')
        .sort((a, b) => {
          const widthA = parseInt(a.$.width) || 0;
          const widthB = parseInt(b.$.width) || 0;
          return widthB - widthA;
        });
      
      if (sortedMedia.length > 0) {
        const bestImage = sortedMedia[0];
        const width = parseInt(bestImage.$.width) || 0;
        // Only use if width is reasonable (prefer images >= 700px, but accept unknowns)
        if (width >= 700 || width === 0) {
          imageUrl = bestImage.$.url;
          if (isValidImageUrl(imageUrl)) return enhanceImageUrl(imageUrl);
        }
      }
      
      // Fallback to first media:content
      if (item['media:content'][0] && item['media:content'][0].$.url) {
        imageUrl = item['media:content'][0].$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    } else if (item['media:content'].$ && item['media:content'].$.url) {
      imageUrl = item['media:content'].$.url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
  }
  
  // Priority 2: enclosure (common for high quality images)
  if (item.enclosure) {
    if (item.enclosure.url) {
      imageUrl = item.enclosure.url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
    if (Array.isArray(item.enclosure)) {
      const imageEnclosure = item.enclosure.find(e => e.type && e.type.startsWith('image/'));
      if (imageEnclosure && imageEnclosure.url) {
        imageUrl = imageEnclosure.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
      // If no image type, use first enclosure
      if (item.enclosure[0] && item.enclosure[0].url) {
        imageUrl = item.enclosure[0].url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    }
  }
  
  // Priority 3: media:thumbnail (check dimensions to avoid small thumbnails)
  if (item['media:thumbnail']) {
    if (Array.isArray(item['media:thumbnail'])) {
      // Find largest thumbnail
      const sortedThumbs = item['media:thumbnail']
        .filter(t => t.$ && t.$.url)
        .sort((a, b) => {
          const widthA = parseInt(a.$.width) || 0;
          const widthB = parseInt(b.$.width) || 0;
          return widthB - widthA;
        });
      
      if (sortedThumbs.length > 0) {
        const bestThumb = sortedThumbs[0];
        const width = parseInt(bestThumb.$.width) || 0;
        // Prefer thumbnails >= 700px wide
        if (width >= 700 || width === 0) {
          imageUrl = bestThumb.$.url;
          if (isValidImageUrl(imageUrl)) return enhanceImageUrl(imageUrl);
        }
      }
    } else if (item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
      imageUrl = item['media:thumbnail'].$.url;
      if (isValidImageUrl(imageUrl)) return imageUrl;
    }
  }
  
  // Check media:group (nested media fields)
  if (item['media:group']) {
    if (item['media:group']['media:content']) {
      const content = item['media:group']['media:content'];
      if (content.$ && content.$.url) {
        imageUrl = content.$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
      if (Array.isArray(content) && content[0] && content[0].$.url) {
        imageUrl = content[0].$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    }
    if (item['media:group']['media:thumbnail']) {
      const thumbnail = item['media:group']['media:thumbnail'];
      if (thumbnail.$ && thumbnail.$.url) {
        imageUrl = thumbnail.$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
      if (Array.isArray(thumbnail) && thumbnail[0] && thumbnail[0].$.url) {
        imageUrl = thumbnail[0].$.url;
        if (isValidImageUrl(imageUrl)) return imageUrl;
      }
    }
  }

  if (item.mediaGroup) {
    addFromObject(item.mediaGroup);
  }
  
  // Legacy fields
  if (item.media && item.media.$) {
    imageUrl = item.media.$.url;
    if (isValidImageUrl(imageUrl)) return imageUrl;
  }
  if (item.thumbnail && item.thumbnail.$) {
    imageUrl = item.thumbnail.$.url;
    if (isValidImageUrl(imageUrl)) return imageUrl;
  }

  for (const candidateUrl of candidateUrls) {
    if (isValidImageUrl(candidateUrl)) return enhanceImageUrl(candidateUrl);
  }
  
  // Try to extract from content/description HTML
  const content = item.contentEncoded || item.content || item.description || '';
  if (content) {
    // Look for img tags
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    const imgUrls = [];
    
    while ((match = imgRegex.exec(content)) !== null) {
      const url = match[1];
      // Capture all image candidates and keep width hints only for ordering.
      const imgTag = match[0];
      const widthMatch = imgTag.match(/width=["']?(\d+)/i);
      const width = widthMatch ? parseInt(widthMatch[1]) : 0;
      imgUrls.push({ url, width });
    }

    const srcsetRegex = /srcset=["']([^"']+)["']/gi;
    while ((match = srcsetRegex.exec(content)) !== null) {
      const srcset = match[1];
      srcset
        .split(',')
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean)
        .forEach((url) => imgUrls.push({ url, width: 0 }));
    }
    
    // Sort by width and return largest
    if (imgUrls.length > 0) {
      imgUrls.sort((a, b) => b.width - a.width);
      const bestCandidate = pickBestImageCandidate(imgUrls.map((entry) => entry.url));
      if (bestCandidate && isValidImageUrl(bestCandidate)) return bestCandidate;
    }
  }
  
  // Category-specific fallback images for better UX
  const title = toLowerSearchText(item.title);
  const description = toLowerSearchText(item.description);

  // Log which items are falling back to splash images (for debugging)
  if (item.source && (item.source.includes('YouTube') || item.source.includes('News') || item.source.includes('Podcast'))) {
    console.log(`[Image Fallback] ${item.source}: "${toPlainText(item.title).substring(0, 50)}..."`);
  }

  const articlePreviewImage = getArticlePreviewImage(item.link || item.url);
  if (articlePreviewImage) {
    return articlePreviewImage;
  }
  
  if (title.includes('podcast') || description.includes('podcast')) {
    return 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1600&q=85'; // Podcast microphone
  }
  
  if (title.includes('opinion') || title.includes('editorial')) {
    return 'https://images.unsplash.com/photo-1586339949216-35c2747e98f8?w=1600&q=85'; // Opinion/writing
  }
  
  if (title.includes('video') || description.includes('video')) {
    return 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=1600&q=85'; // Video
  }
  
  // Default fallback image
  return 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1600&q=85';
}

// Helper function to validate image URLs
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;

  // Keep validation permissive: only ensure we have a non-empty URL string.
  if (url.trim().length === 0) return false;

  return true;
}

function extractAuthor(item) {
  if (item.creator) return toPlainText(item.creator); // dc:creator
  if (item.author) return toPlainText(item.author); // author field
  return '';
}

// Helper to extract the actual source from RSS item (for bundled feeds)
function extractSource(item, defaultSource) {
  // Check for source in custom fields
  if (item.source && item.source.title) return toPlainText(item.source.title);
  if (item.source && typeof item.source === 'string') return toPlainText(item.source);
  
  // Try to extract from link domain
  if (item.link) {
    try {
      const url = new URL(item.link);
      const domain = url.hostname.replace('www.', '');
      
      // Map common domains to readable names
      const domainMap = {
        'nytimes.com': 'New York Times',
        'theguardian.com': 'The Guardian',
        'bbc.com': 'BBC News',
        'bbc.co.uk': 'BBC News',
        'cnn.com': 'CNN',
        'reuters.com': 'Reuters',
        'apnews.com': 'Associated Press',
        'washingtonpost.com': 'Washington Post',
        'wsj.com': 'Wall Street Journal',
        'foxnews.com': 'Fox News',
        'nbcnews.com': 'NBC News',
        'abcnews.go.com': 'ABC News',
        'cbsnews.com': 'CBS News',
        'npr.org': 'NPR',
        'politico.com': 'Politico',
        'bloomberg.com': 'Bloomberg',
        'cnbc.com': 'CNBC',
        'techcrunch.com': 'TechCrunch',
        'theverge.com': 'The Verge',
        'wired.com': 'Wired',
        'arstechnica.com': 'Ars Technica',
        'engadget.com': 'Engadget',
        'variety.com': 'Variety',
        'hollywoodreporter.com': 'Hollywood Reporter',
        'deadline.com': 'Deadline',
        'espn.com': 'ESPN',
        'si.com': 'Sports Illustrated',
        'cbssports.com': 'CBS Sports',
        'nypost.com': 'New York Post',
        'aljazeera.com': 'Al Jazeera',
        'dw.com': 'Deutsche Welle',
        'france24.com': 'France 24',
        'channelnewsasia.com': 'Channel NewsAsia',
        'scmp.com': 'South China Morning Post',
        'timesofindia.indiatimes.com': 'Times of India',
        'thestar.com.my': 'The Star Malaysia',
        'abc.net.au': 'ABC News Australia',
        'cbc.ca': 'CBC News',
        'usatoday.com': 'USA Today'
      };
      
      // Return mapped name or capitalize domain
      if (domainMap[domain]) return domainMap[domain];
      
      // Capitalize first letter of domain name
      const baseDomain = domain.split('.')[0];
      return baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
    } catch (e) {
      // If URL parsing fails, use default
    }
  }
  
  // Fall back to provided source
  return toPlainText(defaultSource);
}

// ── Opinion classifier ──────────────────────────────────────────────────────
// Used to separate bundle-feed items between Top Stories (news) and Opinions.
const OPINION_URL_MARKERS = [
  '/opinion', '/commentary', '/editorial', '/column', '/op-ed',
  '/perspective', '/analysis', '/viewpoint', '/debate'
];
const OPINION_CATEGORY_WORDS = [
  'opinion', 'commentary', 'editorial', 'column', 'op-ed',
  'perspective', 'analysis', 'viewpoint', 'debate', 'comment'
];
const OPINION_TITLE_PREFIXES = [
  'opinion:', 'op-ed:', 'editorial:', 'analysis:', 'perspective:', 'column:'
];
const OPINION_SOURCE_SUFFIXES = [' opinion', ' editorial', ' commentary'];

function classifyAsOpinion(item) {
  const url      = toLowerSearchText(item.url || item.link);
  const category = toLowerSearchText(item.category);
  const title    = toLowerSearchText(item.title);
  const source   = toLowerSearchText(item.source);

  if (OPINION_URL_MARKERS.some(p  => url.includes(p)))      return true;
  if (OPINION_CATEGORY_WORDS.some(w => category.includes(w))) return true;
  if (OPINION_TITLE_PREFIXES.some(p => title.startsWith(p))) return true;
  if (OPINION_SOURCE_SUFFIXES.some(s => source.endsWith(s))) return true;
  return false;
}

// Parse a single RSS feed
async function parseFeed(feedConfig, options = {}) {
  if (shouldSkipFeed(feedConfig.url)) {
    return [];
  }

  try {
    const feed = await parser.parseURL(feedConfig.url);
    const requestedMaxItems = options.maxItems ?? MAX_ITEMS_PER_FEED;
    const feedSpecificMax = Number.isFinite(feedConfig?.maxItems) ? feedConfig.maxItems : 0;
    const priorityFloor = feedConfig?.priority === 'high' ? PRIORITY_FEED_MIN_ITEMS : 0;
    const maxItems = Math.max(requestedMaxItems, feedSpecificMax, priorityFloor);
    const rawItems = Array.isArray(feed.items) ? feed.items.slice(0, maxItems) : [];
    const filteredItems = rawItems
      .filter(item => !shouldFilterOut(item)) // Apply filtering
      .map(item => ({
        title: stripHtml(item.title || 'Untitled'), // Strip HTML from title
        description: stripHtml(item.contentSnippet || item.description || ''), // Strip HTML from description
        content: stripHtml(item.content || item.contentEncoded || item.description || ''), // Strip HTML from content
        url: toPlainText(item.link), // Use 'url' instead of 'link' for consistency with components
        link: toPlainText(item.link), // Keep 'link' for backward compatibility
        image: extractImage(item),
        source: extractSource(item, feedConfig.source), // Outlet / publisher source
        author: extractAuthor(item),
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date(0).toISOString(),
        category: toPlainText(item.categories ? item.categories[0] : 'News') || 'News',
        _feedUrl: feedConfig.url  // internal: used for bundle classification; stripped before response
      }));

    await recordFeedHealth(feedConfig, {
      status: 'healthy',
      httpStatus: 200,
      itemCount: filteredItems.length,
      message: ''
    });
    
    console.log(`${feedConfig.source}: ${rawItems.length} sampled, ${filteredItems.length} after filtering`);
    return filteredItems;
  } catch (error) {
    cacheFeedFailure(feedConfig.url, error);

    const status = getFeedFailureStatus(error);
    await recordFeedHealth(feedConfig, {
      status: 'failed',
      httpStatus: status,
      itemCount: 0,
      message: toPlainText(error?.message)
    });
    const prefix = status && [401, 403, 404, 406].includes(status) ? 'Skipped feed' : 'Error parsing feed';
    console.warn(`${prefix} ${feedConfig.source}:`, error.message);
    return [];
  }
}

function selectFeedsForRequest(feedList = [], options = {}) {
  const maxFeeds = options.maxFeeds ?? MAX_FEEDS_PER_REQUEST;
  if (!Array.isArray(feedList) || feedList.length === 0 || maxFeeds <= 0) return [];

  const highPriorityFeeds = feedList.filter((feed) => feed?.priority === 'high');
  const standardFeeds = feedList.filter((feed) => feed?.priority !== 'high');

  if (highPriorityFeeds.length >= maxFeeds) {
    return highPriorityFeeds.slice(0, maxFeeds);
  }

  const remainingSlots = maxFeeds - highPriorityFeeds.length;
  if (standardFeeds.length <= remainingSlots) {
    return [...highPriorityFeeds, ...standardFeeds];
  }

  const feedKey = String(options.feedKey || 'default');
  const currentOffset = feedRotationOffsets.get(feedKey) || 0;
  const rotatedStandardFeeds = [
    ...standardFeeds.slice(currentOffset),
    ...standardFeeds.slice(0, currentOffset)
  ];
  const selectedStandardFeeds = rotatedStandardFeeds.slice(0, remainingSlots);

  if (!options.disableRotation) {
    const nextOffset = (currentOffset + selectedStandardFeeds.length) % standardFeeds.length;
    feedRotationOffsets.set(feedKey, nextOffset);
  }

  return [...highPriorityFeeds, ...selectedStandardFeeds];
}

// Fetch multiple feeds in parallel, capped at MAX_FEEDS_PER_REQUEST to keep response fast
async function fetchFeeds(feedList, options = {}) {
  const limited = selectFeedsForRequest(feedList, options);
  console.log(`Starting to fetch ${limited.length} RSS feeds (${feedList.length} configured, ${limited.filter((f) => f?.priority === 'high').length} priority)...`);

  const feedPromises = limited.map(feed => parseFeed(feed, options));
  const results = await Promise.allSettled(feedPromises);
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.length === 0)).length;
  console.log(`RSS Fetch complete: ${successful} successful, ${failed} failed/empty`);
  
  const allItems = results
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);
  
  const deduped = dedupeItems(allItems)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // Skip article image enrichment — feed metadata already provides images and enrichment
  // fetches each article page which is the main source of latency.
  console.log(`Deduped ${allItems.length} → ${deduped.length} items; skipping image enrichment for speed.`);
  return deduped;
}

function buildSourceBreakdown(items = [], maxSources = 12) {
  const counts = new Map();

  items.forEach((item) => {
    const source = toPlainText(item?.source) || 'Unknown Source';
    counts.set(source, (counts.get(source) || 0) + 1);
  });

  const topSources = Array.from(counts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxSources);

  return {
    totalItems: items.length,
    uniqueSources: counts.size,
    topSources
  };
}

function logSourceBreakdown(label, items = []) {
  const stats = buildSourceBreakdown(items, 8);
  console.log(`[SOURCE STATS] ${label}: ${stats.totalItems} items across ${stats.uniqueSources} sources`);
  if (stats.topSources.length > 0) {
    console.log(`[SOURCE STATS] ${label} top sources: ${stats.topSources.map((s) => `${s.source} (${s.count})`).join(', ')}`);
  }
  return stats;
}

// Check if cache is valid
function isCacheValid(cacheKey) {
  const cached = cache[cacheKey];
  if (!cached) return false; // Cache key doesn't exist yet
  if (Date.now() - cached.timestamp >= CACHE_DURATION) return false;

  // Do not treat empty arrays as valid cache; allow immediate refetch.
  if (Array.isArray(cached.data)) {
    return cached.data.length > 0;
  }

  return Boolean(cached.data);
}

exports.handler = async (event, context) => {
  const { type = 'news', category, search, sourceStats, strictSearch = '0', relaxSearchFallback = '1', minStrictResults = '6' } = event.queryStringParameters || {};
  const includeSourceStats = ['1', 'true', 'yes'].includes(String(sourceStats || '').toLowerCase());
  const useStrictSearch = ['1', 'true', 'yes'].includes(String(strictSearch || '').toLowerCase());
  const allowRelaxedFallback = ['1', 'true', 'yes'].includes(String(relaxSearchFallback || '').toLowerCase());
  const strictMinimum = Math.max(1, Math.min(parseInt(minStrictResults, 10) || 6, 20));
  let cacheKey = category ? `${type}_${category}` : type;
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let data;

    // SEARCH FUNCTIONALITY - Cache-first, future-proof search across ALL RSS feeds
    // Automatically includes any new categories/feeds added to RSS_FEEDS
    if (search && search.trim().length > 0) {
      const searchTerm = toLowerSearchText(search).trim();
      console.log(`[SEARCH] Searching for: "${searchTerm}"`);

      // ── Step 1: Collect all cached data (instant, no network) ──────────────
      const allData = [];
      const staleCacheKeys = [];
      const searchBuckets = Array.from(new Set([
        ...Object.keys(cache),
        ...Object.keys(RSS_FEEDS)
      ]));

      searchBuckets.forEach(key => {
        if (!RSS_FEEDS[key] && !cache[key]) return;
        const cachedBucket = cache[key];

        if (cachedBucket && cachedBucket.data && Array.isArray(cachedBucket.data)) {
          allData.push(...cachedBucket.data);
          if (!isCacheValid(key)) staleCacheKeys.push(key);  // stale but still usable
        } else {
          staleCacheKeys.push(key); // empty
        }
      });
      console.log(`[SEARCH] ${allData.length} items in cache; ${staleCacheKeys.length} stale/empty buckets across ${searchBuckets.length} feed groups`);

      // ── Step 2: Only fetch categories that are NOT already cached ─────────
      // This prevents the timeout that caused 500 errors when all categories
      // had to be fetched fresh in parallel on every search request.
      // Future-proof: any new category added to RSS_FEEDS is automatically included.
      if (staleCacheKeys.length > 0) {
        // Tightly limited sources per category specifically for search-triggered fetches
        const SEARCH_SOURCES_LIMIT = 18; // broader source coverage for search confidence
        const SEARCH_VIDEO_SOURCES_LIMIT = 18; // prioritize richer media retrieval
        const GLOBAL_SEARCH_TIMEOUT = 8500; // keep below common function hard limits

        const fetchCategoryWithTimeout = async (catKey) => {
          try {
            const feedList = prependBundleFeed(RSS_FEEDS[catKey] || [], catKey);
            const sourceLimit = catKey === 'videos' ? SEARCH_VIDEO_SOURCES_LIMIT : SEARCH_SOURCES_LIMIT;
            const sourcesToFetch = feedList.slice(0, sourceLimit);
            if (sourcesToFetch.length === 0) return [];
            console.log(`[SEARCH] Fetching stale/empty category "${catKey}": ${sourcesToFetch.length} sources`);

            const perCategoryTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout: ${catKey}`)), catKey === 'videos' ? 4500 : 3500)
            );
            return await Promise.race([fetchFeeds(sourcesToFetch, {
              maxFeeds: sourceLimit,
              maxItems: catKey === 'videos' ? 18 : 24
            }), perCategoryTimeout]);
          } catch (err) {
            console.warn(`[SEARCH] Skipped "${catKey}": ${err.message}`);
            return [];
          }
        };

        try {
          // Global race: either all stale categories finish or we cut off at 7.5s
          const globalTimeout = new Promise(resolve =>
            setTimeout(() => {
              console.warn('[SEARCH] Global timeout hit — using partial results');
              resolve([]);
            }, GLOBAL_SEARCH_TIMEOUT)
          );

          const fetchAll = Promise.all(staleCacheKeys.map(fetchCategoryWithTimeout))
            .then(results => results.flat());

          const freshData = await Promise.race([fetchAll, globalTimeout]);
          console.log(`[SEARCH] Fetched ${freshData.length} fresh articles from stale categories`);

          // Merge fresh + cached, dedup with URL/title heuristics
          const mergedItems = dedupeItems([...allData, ...freshData]);
          allData.length = 0;
          allData.push(...mergedItems);
        } catch (err) {
          console.error('[SEARCH] Unexpected error during stale-fetch:', err.message);
          // allData still has whatever was cached — safe to continue
        }
      }

      console.log(`[SEARCH] Total ${allData.length} unique items available for search`);
      
      const strictResults = dedupeItems(allData)
        .map((item) => {
          const relevance = evaluateSearchRelevance(item, searchTerm, { strictMode: useStrictSearch });
          return {
            ...item,
            relevanceScore: relevance.score,
            relevanceRationale: relevance.rationale,
            _isRelevant: relevance.isMatch
          };
        })
        .filter((item) => item._isRelevant)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(({ _isRelevant, ...rest }) => rest);

      let scoredResults = strictResults;
      let searchModeUsed = useStrictSearch ? 'strict' : 'relaxed';

      if (useStrictSearch && allowRelaxedFallback && strictResults.length < strictMinimum) {
        const relaxedResults = dedupeItems(allData)
          .map((item) => {
            const relevance = evaluateSearchRelevance(item, searchTerm, { strictMode: false });
            return {
              ...item,
              relevanceScore: relevance.score,
              relevanceRationale: relevance.rationale,
              _isRelevant: relevance.isMatch
            };
          })
          .filter((item) => item._isRelevant)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .map(({ _isRelevant, ...rest }) => rest);

        scoredResults = relaxedResults;
        searchModeUsed = 'relaxed-fallback';
        console.log(`[SEARCH] Strict mode yielded ${strictResults.length} (<${strictMinimum}), switched to relaxed fallback: ${relaxedResults.length}`);
      }

      console.log(`[SEARCH] Relevant matches: ${scoredResults.length}`);

      if (scoredResults.length > 0) {
        const sampleMatches = scoredResults.slice(0, 3).map((r) => ({
          title: r.title?.substring(0, 60),
          source: r.source,
          relevanceScore: r.relevanceScore,
          rationale: r.relevanceRationale
        }));
        console.log('[SEARCH] Top ranked sample:', JSON.stringify(sampleMatches));
      }
      
      console.log(`[SEARCH] Found ${scoredResults.length} results for "${searchTerm}"`);
      if (scoredResults.length > 0) {
        logSourceBreakdown(`search:${searchTerm}`, scoredResults);
      }

      const statsPayload = includeSourceStats ? { sourceStats: buildSourceBreakdown(scoredResults) } : {};
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: scoredResults,
          cached: false,
          timestamp: Date.now(),
          count: scoredResults.length,
          searchTerm,
          searchMode: searchModeUsed,
          strictSearchEnabled: useStrictSearch,
          minStrictResults: strictMinimum,
          ...statsPayload
        })
      };
    }

    // Check cache first (non-search requests)
    if (isCacheValid(cacheKey)) {
      console.log(`Returning cached data for ${cacheKey}`);
      const cachedData = cache[cacheKey].data;
      const statsPayload = includeSourceStats ? { sourceStats: buildSourceBreakdown(cachedData || []) } : {};
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: cachedData,
          cached: true,
          timestamp: cache[cacheKey].timestamp,
          ...statsPayload
        })
      };
    }

    const persistedSnapshot = await getPersistedSnapshot(cacheKey, CACHE_DURATION);
    if (persistedSnapshot?.items?.length) {
      console.log(`Returning persisted snapshot for ${cacheKey}`);
      cache[cacheKey] = {
        data: persistedSnapshot.items,
        timestamp: Date.parse(persistedSnapshot.timestamp) || Date.now()
      };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          data: persistedSnapshot.items,
          cached: true,
          persisted: true,
          timestamp: persistedSnapshot.timestamp,
          count: persistedSnapshot.count || persistedSnapshot.items.length,
          ...(includeSourceStats ? { sourceStats: buildSourceBreakdown(persistedSnapshot.items) } : {})
        })
      };
    }

    // Determine which feeds to fetch
    let activeFeedKey = RSS_FEEDS[type] ? type : 'news';
    let feedsToFetch = prependBundleFeed(RSS_FEEDS[activeFeedKey] || RSS_FEEDS.news, activeFeedKey);
    
    // If category specified, fetch relevant feeds for ANY type (news, opinions, videos, podcasts)
    if (category) {
      const cat = toLowerSearchText(category);
      
      if (cat === 'sports') {
        activeFeedKey = 'sports';
        feedsToFetch = prependBundleFeed(RSS_FEEDS.sports, activeFeedKey);
        console.log(`Fetching SPORTS ${type}:`, feedsToFetch.length, 'sources');
      } else if (cat === 'tech' || cat === 'technology' || cat === 'business-tech') {
        activeFeedKey = 'tech';
        feedsToFetch = prependBundleFeed(RSS_FEEDS.tech, activeFeedKey);
        console.log(`Fetching TECH ${type}:`, feedsToFetch.length, 'sources');
      } else if (cat === 'business' || cat === 'finance') {
        activeFeedKey = 'business';
        feedsToFetch = prependBundleFeed(RSS_FEEDS.business, activeFeedKey);
        console.log(`Fetching BUSINESS ${type}:`, feedsToFetch.length, 'sources');
      } else if (cat === 'entertainment') {
        activeFeedKey = 'entertainment';
        feedsToFetch = prependBundleFeed(RSS_FEEDS.entertainment, activeFeedKey);
        console.log(`Fetching ENTERTAINMENT ${type}:`, feedsToFetch.length, 'sources');
      } else if (cat === 'lifestyle') {
        activeFeedKey = 'lifestyle';
        feedsToFetch = prependBundleFeed(RSS_FEEDS.lifestyle, activeFeedKey);
        console.log(`Fetching LIFESTYLE ${type}:`, feedsToFetch.length, 'sources');
      } else if (cat === 'culture') {
        activeFeedKey = 'culture';
        feedsToFetch = prependBundleFeed(RSS_FEEDS.culture, activeFeedKey);
        console.log(`Fetching CULTURE ${type}:`, feedsToFetch.length, 'sources');
      } else {
        // For unknown categories, keep the default feeds for the type
        console.log(`Fetching ${type.toUpperCase()} feeds (default):`, feedsToFetch.length, 'sources');
      }
    }

    // Fetch fresh data
    console.log(`Fetching fresh data for ${cacheKey}`);
    data = await fetchFeeds(feedsToFetch, { feedKey: activeFeedKey });

    // ── Bundle-feed classification ────────────────────────────────────────────
    // Items fetched from the bundle feed are mixed content (news + opinions).
    // For `news` requests  : keep only non-opinion bundle items (→ Top Stories).
    // For `opinions` requests: keep only opinion-classified bundle items.
    // Items from dedicated non-bundle feeds always pass through unchanged.
    const bundleUrlNorm = (RSS_APP_BUNDLE_FEED_URL || '').trim().toLowerCase();
    if (bundleUrlNorm) {
      if (activeFeedKey === 'news') {
        data = data.filter(item => {
          if ((item._feedUrl || '').trim().toLowerCase() !== bundleUrlNorm) return true;
          return !classifyAsOpinion(item);
        });
        console.log(`[BUNDLE] news: ${data.length} items after removing opinion-classified bundle entries`);
      } else if (activeFeedKey === 'opinions') {
        data = data.filter(item => {
          if ((item._feedUrl || '').trim().toLowerCase() !== bundleUrlNorm) return true;
          return classifyAsOpinion(item);
        });
        console.log(`[BUNDLE] opinions: ${data.length} items after keeping only opinion-classified bundle entries`);
      }
    }
    // Strip internal tracking field before caching / responding
    data = data.map(({ _feedUrl, ...rest }) => rest);

    logSourceBreakdown(cacheKey, data);

    // Update cache
    cache[cacheKey] = {
      data,
      timestamp: Date.now()
    };

    await persistSnapshot(cacheKey, data, {
      type,
      category: category || '',
      feedKey: activeFeedKey
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data,
        cached: false,
        timestamp: Date.now(),
        count: data.length,
        ...(includeSourceStats ? { sourceStats: buildSourceBreakdown(data) } : {})
      })
    };

  } catch (error) {
    console.error('RSS Aggregator Error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      type: event.queryStringParameters?.type,
      search: event.queryStringParameters?.search
    });

    if (!search) {
      const staleSnapshot = await getPersistedSnapshot(cacheKey, SNAPSHOT_STALE_DURATION);
      if (staleSnapshot?.items?.length) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            data: staleSnapshot.items,
            cached: true,
            persisted: true,
            stale: true,
            timestamp: staleSnapshot.timestamp,
            count: staleSnapshot.count || staleSnapshot.items.length
          })
        };
      }
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch RSS feeds',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
