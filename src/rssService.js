import axios from 'axios';
import { cacheManager } from './utils/cacheManager';
import { deriveMediaOutlet } from './utils/sourceUtils';

// RSS Aggregator endpoint - works both locally (with netlify dev) and in production
const RSS_API_URL = '/.netlify/functions/rss-aggregator';
const RSS_CACHE_VERSION = 'v9-video-density';
const RSS_DISCOVERY_INDEX_KEY = `${RSS_CACHE_VERSION}_rss_bucket_index`;
const REQUEST_TIMEOUT = 12000; // 12s — avoids aborting cold-start live searches that legitimately run past 8s
const RETRY_ATTEMPTS = 1;      // no retry; stale cache is shown on failure instead
const RETRY_BASE_DELAY_MS = 500;
const FUNCTIONS_RECHECK_COOLDOWN_MS = 15000;
const FEED_STALE_FALLBACK_TIMEOUT_MS = {
  news: 7000,
  opinions: 5500,
  videos: 4500,
  podcasts: 6500,
};

const getVersionedCacheKey = (type, category = null) => {
  const scoped = category ? `${type}_${category}` : type;
  return `${RSS_CACHE_VERSION}_${scoped}`;
};

const normalizeFeedCategory = (category = null) => {
  const normalized = String(category || '').trim().toLowerCase();
  return normalized && normalized !== 'news' ? normalized : null;
};

const getSearchCacheKey = (term) => {
  const normalized = String(term || '').trim().toLowerCase().replace(/\s+/g, '_');
  return `${RSS_CACHE_VERSION}_search_${normalized}`;
};

const getIndexedBucketKeys = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const raw = window.localStorage.getItem(RSS_DISCOVERY_INDEX_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((key) => typeof key === 'string' && key.startsWith(`${RSS_CACHE_VERSION}_`) && !key.includes('_search_'))
      : [];
  } catch {
    return [];
  }
};

const registerBucketKey = (cacheKey) => {
  if (!cacheKey || typeof window === 'undefined' || !window.localStorage) return;

  try {
    const currentKeys = getIndexedBucketKeys();
    if (currentKeys.includes(cacheKey)) return;
    window.localStorage.setItem(RSS_DISCOVERY_INDEX_KEY, JSON.stringify([...currentKeys, cacheKey]));
  } catch {
    // Ignore registry persistence failures; cache writes still succeed.
  }
};

const setBucketCache = async (cacheKey, data) => {
  await cacheManager.set(cacheKey, data);
  registerBucketKey(cacheKey);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isHtmlLikeResponse = (response) => {
  const contentType = String(response?.headers?.['content-type'] || '').toLowerCase();
  const payload = response?.data;

  if (contentType.includes('text/html')) {
    return true;
  }

  return typeof payload === 'string' && /<!doctype html|<html[\s>]/i.test(payload);
};

const shouldDisableFunctions = (error) => {
  const code = error?.code;
  const status = error?.response?.status;
  return code === 'ERR_NETWORK' || code === 'ERR_INVALID_RSS_PAYLOAD' || status === 404 || status === 502 || status === 503 || status === 504;
};

async function requestWithRetry(url, config = {}, attempts = RETRY_ATTEMPTS) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        ...config
      });

      if (isHtmlLikeResponse(response)) {
        const invalidPayloadError = new Error(`Invalid RSS payload received for ${url}`);
        invalidPayloadError.code = 'ERR_INVALID_RSS_PAYLOAD';
        invalidPayloadError.response = response;
        throw invalidPayloadError;
      }

      return response;
    } catch (error) {
      lastError = error;
      const isRetryable = !error?.response || error?.response?.status >= 500 || error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK';

      if (!isRetryable || attempt === attempts) {
        throw error;
      }

      const delay = RETRY_BASE_DELAY_MS * attempt;
      console.debug(`[RSS] Retry ${attempt}/${attempts} for ${url} in ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError;
}

const extractDataArray = (response) => {
  const payload = response?.data?.data;
  return Array.isArray(payload) ? payload : [];
};

const getStaleOrEmpty = async (cacheKey, label) => {
  const staleData = await cacheManager.getStale(cacheKey);
  if (staleData && staleData.length > 0) {
    console.log(`[RSS] Using stale ${label} cache for ${cacheKey}`);
    return staleData;
  }
  return [];
};

const fetchFeedWithCacheFallback = async ({
  cacheKey,
  label,
  url,
  timeoutMs,
  transform,
}) => {
  const staleData = await getStaleOrEmpty(cacheKey, label);

  if (!canAttemptFunctions()) {
    console.log(`[RSS] Skipping ${label} fetch - functions unavailable`);
    return staleData;
  }

  const fetchFresh = async () => {
    const response = await requestWithRetry(url);
    markFunctionsAvailable();

    const nextData = transform(extractDataArray(response));
    if (!nextData.length) {
      console.warn(`[RSS] Empty ${label} payload returned from endpoint`);
      return staleData;
    }

    await setBucketCache(cacheKey, nextData);
    return nextData;
  };

  if (staleData.length > 0 && timeoutMs > 0) {
    const timedResult = await Promise.race([
      fetchFresh()
        .then((data) => ({ kind: 'fresh', data }))
        .catch((error) => ({ kind: 'error', error })),
      sleep(timeoutMs).then(() => ({ kind: 'stale' }))
    ]);

    if (timedResult.kind === 'fresh') {
      return timedResult.data;
    }

    if (timedResult.kind === 'error') {
      console.error(`[RSS] Error fetching ${label}:`, timedResult.error.message);
      if (shouldDisableFunctions(timedResult.error)) {
        markFunctionsUnavailable();
      }
      return staleData;
    }

    console.warn(`[RSS] Returning stale ${label} cache for ${cacheKey} after ${timeoutMs}ms soft timeout`);
    return staleData;
  }

  try {
    return await fetchFresh();
  } catch (error) {
    console.error(`[RSS] Error fetching ${label}:`, error.message);
    if (shouldDisableFunctions(error)) {
      markFunctionsUnavailable();
    }
    return staleData;
  }
};

const normalizeOutletSource = (item) => ({
  ...item,
  source: deriveMediaOutlet(item),
});

const SEARCH_FAST_PATH_TIMEOUT_MS = 600;
const SEARCH_REMOTE_COLD_TIMEOUT_MS = 2800;

const normalizeSearchText = (value) => String(value || '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const tokenizeSearchText = (value) => normalizeSearchText(value)
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

const countTokenHits = (fieldTokens = [], queryTokens = []) => {
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

const evaluateSearchRelevance = (item, searchTerm) => {
  if (!item || !item.title) return { isMatch: false, score: 0 };

  const queryTokens = tokenizeSearchText(searchTerm);
  if (queryTokens.length === 0) return { isMatch: false, score: 0 };

  const titleHits = countTokenHits(tokenizeSearchText(item.title), queryTokens);
  const descriptionHits = countTokenHits(tokenizeSearchText(item.description), queryTokens);
  const contentHits = countTokenHits(tokenizeSearchText(item.content), queryTokens);
  const metaHits = countTokenHits(tokenizeSearchText(`${item.source || ''} ${item.category || ''}`), queryTokens);

  const bodyScore = descriptionHits.score + (contentHits.score * 0.8);
  const weightedScore = (titleHits.score * 7) + (bodyScore * 4) + (metaHits.score * 1.5);
  const totalMatched = titleHits.matched + descriptionHits.matched + contentHits.matched + metaHits.matched;
  const requiredCoverage = queryTokens.length === 1 ? 1 : Math.ceil(queryTokens.length * 0.6);
  const titleOnlyWeak = titleHits.score > 0 && bodyScore === 0 && metaHits.score === 0;

  return {
    isMatch: totalMatched >= requiredCoverage && weightedScore >= 7.5 && !titleOnlyWeak,
    score: weightedScore
  };
};

const scoreLocalSearchResult = (item, searchTerm) => {
  const baseScore = evaluateSearchRelevance(item, searchTerm).score;
  let score = baseScore;

  const publishedAt = Date.parse(item.publishedAt || item.date || 0);
  if (!Number.isNaN(publishedAt)) {
    score += Math.max(0, 5 - Math.floor((Date.now() - publishedAt) / 86400000));
  }

  return score;
};

const searchCachedContent = async (searchTerm) => {
  try {
    const registeredKeys = getIndexedBucketKeys();
    const cacheKeys = registeredKeys.length > 0
      ? registeredKeys
      : (await cacheManager.getAllKeys()).filter((key) => typeof key === 'string' && key.startsWith(`${RSS_CACHE_VERSION}_`) && !key.includes('_search_'));

    const cachedBuckets = await Promise.all(
      cacheKeys.map(async (key) => {
        const data = await cacheManager.getStale(key);
        return Array.isArray(data) ? data : [];
      })
    );

    const cachedItems = cachedBuckets.flat();
    const matchedItems = cachedItems.filter((item) => evaluateSearchRelevance(item, searchTerm).isMatch);

    return dedupeContentItems(
      matchedItems
        .map((item) => ({
          ...normalizeOutletSource(item),
          relevanceScore: scoreLocalSearchResult(item, searchTerm)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
    );
  } catch (error) {
    console.warn('[RSS Search] Local cached search failed:', error.message);
    return [];
  }
};

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'guccounter', 'cmpid', 'ocid',
  'ref', 'ref_src', 'ref_url', 'source', 'spm', 'igshid'
]);

const normalizeDedupeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw, 'https://thelatest.local');
    parsed.hash = '';

    // Remove only known tracking params; keep meaningful params (e.g., YouTube v=...).
    const keptParams = [];
    parsed.searchParams.forEach((paramValue, paramKey) => {
      const normalizedKey = String(paramKey || '').toLowerCase();
      if (!TRACKING_QUERY_PARAMS.has(normalizedKey)) {
        keptParams.push([normalizedKey, String(paramValue || '')]);
      }
    });

    keptParams.sort((a, b) => {
      if (a[0] === b[0]) return a[1].localeCompare(b[1]);
      return a[0].localeCompare(b[0]);
    });

    parsed.search = '';
    keptParams.forEach(([key, paramValue]) => {
      parsed.searchParams.append(key, paramValue);
    });

    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    const search = parsed.searchParams.toString();
    const querySuffix = search ? `?${search}` : '';
    return `${parsed.origin}${pathname}${querySuffix}`.toLowerCase();
  } catch {
    return raw
      .replace(/#.*$/, '')
      .toLowerCase();
  }
};

const normalizeDedupeText = (value) => String(value || '')
  .toLowerCase()
  .replace(/&amp;/g, 'and')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const dedupeContentItems = (items = []) => {
  const seen = new Set();

  return items.filter((item) => {
    if (!item) return false;

    const normalizedUrl = normalizeDedupeUrl(item.url || item.link);
    const normalizedSource = normalizeDedupeText(item.source);
    const normalizedTitle = normalizeDedupeText(item.title);
    const titleKey = normalizedTitle ? `title:${normalizedSource}|${normalizedTitle}` : '';

    if (!normalizedUrl && !titleKey) {
      return false;
    }

    if ((normalizedUrl && seen.has(`url:${normalizedUrl}`)) || (titleKey && seen.has(titleKey))) {
      return false;
    }

    if (normalizedUrl) {
      seen.add(`url:${normalizedUrl}`);
    }
    if (titleKey) {
      seen.add(titleKey);
    }

    return true;
  });
};

// Detect if Netlify Functions are available
let functionsAvailable = true;
let lastFunctionsFailureAt = 0;

const markFunctionsUnavailable = () => {
  functionsAvailable = false;
  lastFunctionsFailureAt = Date.now();
};

const canAttemptFunctions = () => {
  if (functionsAvailable) return true;
  return Date.now() - lastFunctionsFailureAt >= FUNCTIONS_RECHECK_COOLDOWN_MS;
};

const markFunctionsAvailable = () => {
  functionsAvailable = true;
};

/**
 * Fetch news from RSS aggregator
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of news articles
 */
export async function fetchRSSNews(category = null) {
  const normalizedCategory = normalizeFeedCategory(category);
  const cacheKey = getVersionedCacheKey('news', normalizedCategory);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached news for ${cacheKey}`);
    return cachedData;
  }

  const params = new URLSearchParams({ type: 'news' });
  if (normalizedCategory) {
    params.append('category', normalizedCategory);
    console.log(`[RSS] Fetching news with category filter: ${normalizedCategory}`);
  }

  const url = `${RSS_API_URL}?${params.toString()}`;
  console.log(`[RSS] Request URL: ${url}`);

  const articles = await fetchFeedWithCacheFallback({
    cacheKey,
    label: 'news',
    url,
    timeoutMs: FEED_STALE_FALLBACK_TIMEOUT_MS.news,
    transform: (payload) => {
      const normalizedArticles = payload.map(normalizeOutletSource);
      const dedupedArticles = dedupeContentItems(normalizedArticles);
      if (dedupedArticles.length !== normalizedArticles.length) {
        console.log(`[RSS] Removed ${normalizedArticles.length - dedupedArticles.length} duplicate news items`);
      }
      return dedupedArticles;
    }
  });

  console.log(`[RSS] Resolved ${articles.length} news articles${normalizedCategory ? ` for ${normalizedCategory}` : ''}`);
  return articles;
}

/**
 * Fetch opinion pieces from RSS feeds
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of opinion articles
 */
export async function fetchRSSOpinions(category = null) {
  const normalizedCategory = normalizeFeedCategory(category);
  const cacheKey = getVersionedCacheKey('opinions', normalizedCategory);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached opinions for ${cacheKey}`);
    return cachedData;
  }

  const params = new URLSearchParams({ type: 'opinions' });
  if (normalizedCategory) {
    params.append('category', normalizedCategory);
    console.log(`[RSS] Fetching opinions with category filter: ${normalizedCategory}`);
  }

  const opinions = await fetchFeedWithCacheFallback({
    cacheKey,
    label: 'opinions',
    url: `${RSS_API_URL}?${params.toString()}`,
    timeoutMs: FEED_STALE_FALLBACK_TIMEOUT_MS.opinions,
    transform: (payload) => {
      const normalizedOpinions = payload.map((item) => {
        const normalized = normalizeOutletSource(item);
        return {
          ...normalized,
          author: item.author || 'Editorial',
          date: item.publishedAt || 'Recently'
        };
      });
      const dedupedOpinions = dedupeContentItems(normalizedOpinions);
      if (dedupedOpinions.length !== normalizedOpinions.length) {
        console.log(`[RSS] Removed ${normalizedOpinions.length - dedupedOpinions.length} duplicate opinion items`);
      }
      return dedupedOpinions;
    }
  });

  console.log(`[RSS] Resolved ${opinions.length} opinion pieces${normalizedCategory ? ` for ${normalizedCategory}` : ''}`);
  return opinions;
}

/**
 * Fetch videos from RSS feeds (YouTube channels)
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of video items
 */
export async function fetchRSSVideos(category = null) {
  const normalizedCategory = normalizeFeedCategory(category);
  const cacheKey = getVersionedCacheKey('videos', normalizedCategory);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached videos for ${cacheKey}`);
    return cachedData;
  }

  const params = new URLSearchParams({ type: 'videos' });
  if (normalizedCategory) {
    params.append('category', normalizedCategory);
    console.log(`[RSS] Fetching videos with category filter: ${normalizedCategory}`);
  }

  const videos = await fetchFeedWithCacheFallback({
    cacheKey,
    label: 'videos',
    url: `${RSS_API_URL}?${params.toString()}`,
    timeoutMs: FEED_STALE_FALLBACK_TIMEOUT_MS.videos,
    transform: (payload) => {
      const normalizedVideos = payload.map((item) => {
        const normalized = normalizeOutletSource(item);
        return {
          ...normalized,
          thumbnail: item.image,
          duration: '5:30'
        };
      });
      const dedupedVideos = dedupeContentItems(normalizedVideos);
      if (dedupedVideos.length !== normalizedVideos.length) {
        console.log(`[RSS] Removed ${normalizedVideos.length - dedupedVideos.length} duplicate video items`);
      }
      return dedupedVideos;
    }
  });

  console.log(`[RSS] Resolved ${videos.length} videos${normalizedCategory ? ` for ${normalizedCategory}` : ''}`);
  return videos;
}

/**
 * Fetch podcast episodes from RSS feeds
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of podcast items
 */
export async function fetchRSSPodcasts(category = null) {
  const normalizedCategory = normalizeFeedCategory(category);
  const cacheKey = getVersionedCacheKey('podcasts', normalizedCategory);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached podcasts for ${cacheKey}`);
    return cachedData;
  }

  const params = new URLSearchParams({ type: 'podcasts' });
  if (normalizedCategory) {
    params.append('category', normalizedCategory);
    console.log(`[RSS] Fetching podcasts with category filter: ${normalizedCategory}`);
  }

  const podcasts = await fetchFeedWithCacheFallback({
    cacheKey,
    label: 'podcasts',
    url: `${RSS_API_URL}?${params.toString()}`,
    timeoutMs: FEED_STALE_FALLBACK_TIMEOUT_MS.podcasts,
    transform: (payload) => {
      const normalizedPodcasts = payload.map((item) => {
        const normalized = normalizeOutletSource(item);
        return {
          ...normalized,
          thumbnail: item.image,
          hosts: item.hosts || item.author || '',
          date: item.publishedAt
        };
      });
      const dedupedPodcasts = dedupeContentItems(normalizedPodcasts);
      if (dedupedPodcasts.length !== normalizedPodcasts.length) {
        console.log(`[RSS] Removed ${normalizedPodcasts.length - dedupedPodcasts.length} duplicate podcast items`);
      }
      return dedupedPodcasts;
    }
  });

  console.log(`[RSS] Resolved ${podcasts.length} podcasts${normalizedCategory ? ` for ${normalizedCategory}` : ''}`);
  return podcasts;
}

/**
 * Search across all RSS content
 * @param {string} searchTerm - The search term to query
 * @returns {Promise<Array>} - Array of matching articles
 */
export async function searchRSSContent(searchTerm, options = {}) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    console.log('[RSS Search] Empty search term');
    return [];
  }

  const normalizedSearchTerm = String(searchTerm).trim();
  const searchCacheKey = getSearchCacheKey(normalizedSearchTerm);

  const strictSearch = options.strictSearch !== false;
  const relaxSearchFallback = options.relaxSearchFallback !== false;
  const preferFresh = options.preferFresh === true;
  const fastLocalOnly = options.fastLocalOnly === true;
  const parsedRemoteWait = Number.parseInt(options.maxBackendWaitMs, 10);
  const maxBackendWaitMs = Number.isNaN(parsedRemoteWait) ? 0 : Math.max(0, parsedRemoteWait);
  const parsedMinStrict = Number.parseInt(options.minStrictResults, 10);
  const minStrictResults = Number.isNaN(parsedMinStrict) ? 6 : Math.max(1, Math.min(parsedMinStrict, 20));

  const buildSearchUrl = (term) => {
    const params = new URLSearchParams({
      search: term,
      strictSearch: strictSearch ? '1' : '0',
      relaxSearchFallback: relaxSearchFallback ? '1' : '0',
      minStrictResults: String(minStrictResults)
    });
    return `${RSS_API_URL}?${params.toString()}`;
  };

  try {
    const cachedSearch = await cacheManager.get(searchCacheKey);
    if (cachedSearch && cachedSearch.length > 0) {
      console.log(`[RSS Search] Cache hit for "${normalizedSearchTerm}" with ${cachedSearch.length} results`);
      if (fastLocalOnly) {
        return cachedSearch;
      }
    }

    const normalizedTerm = normalizeSearchText(searchTerm);
    const localResults = cachedSearch && cachedSearch.length > 0
      ? cachedSearch
      : await searchCachedContent(normalizedTerm);

    if (fastLocalOnly) {
      return localResults;
    }

    if (preferFresh) {
      const freshUrl = buildSearchUrl(searchTerm);
      console.log(`[RSS Search] Prefer-fresh remote search for "${searchTerm}" at ${freshUrl}`);

      try {
        const response = await requestWithRetry(freshUrl);
        markFunctionsAvailable();

        const normalizedFreshResults = extractDataArray(response).map(normalizeOutletSource);
        const freshResults = dedupeContentItems(normalizedFreshResults);

        if (freshResults.length > 0) {
          await cacheManager.set(searchCacheKey, freshResults);
          return freshResults;
        }
      } catch (error) {
        console.warn('[RSS Search] Prefer-fresh remote search failed:', error.message);
        if (shouldDisableFunctions(error)) {
          markFunctionsUnavailable();
        }
      }
    }

    if (localResults.length > 0) {
      console.log(`[RSS Search] Local cache hit for "${searchTerm}" with ${localResults.length} results`);

      if (!canAttemptFunctions()) {
        return localResults;
      }

      const remotePromise = (async () => {
        const url = buildSearchUrl(searchTerm);
        console.log(`[RSS Search] Deep searching backend for "${searchTerm}" at ${url}`);
        const response = await requestWithRetry(url);
        markFunctionsAvailable();

        const normalizedResults = extractDataArray(response).map(normalizeOutletSource);
        return dedupeContentItems(normalizedResults);
      })();

      remotePromise.catch((error) => {
        console.warn('[RSS Search] Remote enhancement failed:', error.message);
        return [];
      });

      const remoteResults = await Promise.race([
        remotePromise,
        sleep(SEARCH_FAST_PATH_TIMEOUT_MS).then(() => null)
      ]);

      if (Array.isArray(remoteResults) && remoteResults.length > 0) {
        const merged = dedupeContentItems([...remoteResults, ...localResults]);
        await cacheManager.set(searchCacheKey, merged);
        console.log(`[RSS Search] Returning merged local+remote results: ${merged.length}`);
        return merged;
      }

      return localResults;
    }

    if (!canAttemptFunctions()) {
      console.warn('[RSS Search] Functions unavailable - backend not accessible');
      return [];
    }

    const url = buildSearchUrl(searchTerm);
    console.log(`[RSS Search] Searching for "${searchTerm}" at ${url}`);

    const remoteSearchPromise = (async () => {
      const response = await requestWithRetry(url);
      markFunctionsAvailable();

      console.log('[RSS Search] Response received:', {
        status: response.status,
        dataLength: response?.data?.data?.length || 0,
        responseStructure: Object.keys(response?.data || {})
      });

      const normalizedResults = extractDataArray(response).map(normalizeOutletSource);
      console.log(`[RSS Search] After extraction: ${normalizedResults.length} items`);

      const results = dedupeContentItems(normalizedResults);
      console.log(`[RSS Search] After dedup: ${results.length} items`);
      return { results, normalizedCount: normalizedResults.length };
    })();

    remoteSearchPromise.catch((error) => {
      console.warn('[RSS Search] Cold remote search failed:', error.message);
      return null;
    });

    const remoteOutcome = maxBackendWaitMs > 0
      ? await Promise.race([
          remoteSearchPromise,
          sleep(maxBackendWaitMs).then(() => null)
        ])
      : await remoteSearchPromise;

    if (!remoteOutcome) {
      console.warn(`[RSS Search] Backend search exceeded ${maxBackendWaitMs || SEARCH_REMOTE_COLD_TIMEOUT_MS}ms for "${searchTerm}"; falling back to local results`);
      return [];
    }

    const { results, normalizedCount } = remoteOutcome;

    if (results.length > 0) {
      await cacheManager.set(searchCacheKey, results);
      if (results.length !== normalizedCount) {
        console.log(`[RSS Search] Removed ${normalizedCount - results.length} duplicates`);
      }
      console.log(`[RSS Search] ✓ Found ${results.length} results for "${searchTerm}"`);
      return results;
    }

    console.warn(`[RSS Search] No results found for "${searchTerm}" from backend`);
    return [];
  } catch (error) {
    console.error('[RSS Search] ERROR:', {
      message: error.message,
      status: error?.response?.status,
      code: error?.code,
      url: error?.config?.url
    });
    if (shouldDisableFunctions(error)) {
      console.warn('[RSS Search] Disabling functions due to error');
      markFunctionsUnavailable();
    }
    return [];
  }
}

/**
 * Clear all RSS cache
 */
export function clearRSSCache() {
  functionsAvailable = true;
  lastFunctionsFailureAt = 0;
  cacheManager.clear();
  console.log('[RSS] Cache cleared');
}

export default {
  fetchRSSNews,
  fetchRSSOpinions,
  fetchRSSVideos,
  fetchRSSPodcasts,
  searchRSSContent,
  clearRSSCache
};
