import axios from 'axios';
import { cacheManager } from './utils/cacheManager';
import { deriveMediaOutlet } from './utils/sourceUtils';

// RSS Aggregator endpoint - works both locally (with netlify dev) and in production
const RSS_API_URL = '/.netlify/functions/rss-aggregator';
const RSS_CACHE_VERSION = 'v9-video-density';
const REQUEST_TIMEOUT = 8000;  // 8s — backend now completes in ~5s
const RETRY_ATTEMPTS = 1;      // no retry; stale cache is shown on failure instead
const RETRY_BASE_DELAY_MS = 500;
const FUNCTIONS_RECHECK_COOLDOWN_MS = 15000;

const getVersionedCacheKey = (type, category = null) => {
  const scoped = category ? `${type}_${category}` : type;
  return `${RSS_CACHE_VERSION}_${scoped}`;
};

const getSearchCacheKey = (term) => {
  const normalized = String(term || '').trim().toLowerCase().replace(/\s+/g, '_');
  return `${RSS_CACHE_VERSION}_search_${normalized}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldDisableFunctions = (error) => {
  const code = error?.code;
  const status = error?.response?.status;
  return code === 'ERR_NETWORK' || status === 404 || status === 502 || status === 503 || status === 504;
};

async function requestWithRetry(url, config = {}, attempts = RETRY_ATTEMPTS) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await axios.get(url, {
        timeout: REQUEST_TIMEOUT,
        ...config
      });
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

const normalizeOutletSource = (item) => ({
  ...item,
  source: deriveMediaOutlet(item),
});

const SEARCH_FAST_PATH_TIMEOUT_MS = 600;

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
    const keys = await cacheManager.getAllKeys();
    const cacheKeys = keys.filter((key) => typeof key === 'string' && !key.includes('_search_'));

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

// Test if Netlify Functions are available
async function checkFunctionsAvailability() {
  try {
    const response = await axios.get(RSS_API_URL + '?type=news', { timeout: 5000 });
    functionsAvailable = response.status === 200;
    return functionsAvailable;
  } catch (error) {
    console.log('[RSS] Netlify Functions not available (run "netlify dev" to enable)');
    markFunctionsUnavailable();
    return false;
  }
}

/**
 * Fetch news from RSS aggregator
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of news articles
 */
export async function fetchRSSNews(category = null) {
  const cacheKey = getVersionedCacheKey('news', category);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached news for ${cacheKey}`);
    return cachedData;
  }

  // If functions not available, return empty (will trigger fallback in newsService)
  if (!canAttemptFunctions()) {
    console.log('[RSS] Skipping RSS fetch - functions unavailable (use "netlify dev")');
    return getStaleOrEmpty(cacheKey, 'news');
  }

  try {
    const params = new URLSearchParams({ type: 'news' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching news with category filter: ${category}`);
    }
    
    const url = `${RSS_API_URL}?${params.toString()}`;
    console.log(`[RSS] Request URL: ${url}`);
    
    const response = await requestWithRetry(url);
    markFunctionsAvailable();

    const normalizedArticles = extractDataArray(response).map(normalizeOutletSource);
    const articles = dedupeContentItems(normalizedArticles);
    if (!articles.length) {
      console.warn('[RSS] Empty news payload returned from endpoint');
      return getStaleOrEmpty(cacheKey, 'news');
    }

    if (articles.length !== normalizedArticles.length) {
      console.log(`[RSS] Removed ${normalizedArticles.length - articles.length} duplicate news items`);
    }
    
    // Update cache with IndexedDB
    await cacheManager.set(cacheKey, articles);
    
    console.log(`[RSS] Fetched ${articles.length} news articles${category ? ` for ${category}` : ''}`);
    return articles;
  } catch (error) {
    console.error('[RSS] Error fetching news:', error.message);
    // Mark functions as unavailable on first error
    if (shouldDisableFunctions(error)) {
      markFunctionsUnavailable();
    }
    return getStaleOrEmpty(cacheKey, 'news');
  }
}

/**
 * Fetch opinion pieces from RSS feeds
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of opinion articles
 */
export async function fetchRSSOpinions(category = null) {
  const cacheKey = getVersionedCacheKey('opinions', category);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached opinions for ${cacheKey}`);
    return cachedData;
  }

  if (!canAttemptFunctions()) {
    console.log('[RSS] Skipping opinions fetch - functions unavailable');
    return getStaleOrEmpty(cacheKey, 'opinions');
  }
  
  try {
    const params = new URLSearchParams({ type: 'opinions' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching opinions with category filter: ${category}`);
    }
    
    const response = await requestWithRetry(`${RSS_API_URL}?${params.toString()}`);
    markFunctionsAvailable();

    const payload = extractDataArray(response);
    if (payload.length > 0) {
      const normalizedOpinions = payload.map(item => {
        const normalized = normalizeOutletSource(item);
        return {
          ...normalized,
          author: item.author || 'Editorial',
          date: item.publishedAt || 'Recently'
        };
      });
      const opinions = dedupeContentItems(normalizedOpinions);

      if (opinions.length !== normalizedOpinions.length) {
        console.log(`[RSS] Removed ${normalizedOpinions.length - opinions.length} duplicate opinion items`);
      }
      
      // Update cache with IndexedDB
      await cacheManager.set(cacheKey, opinions);
      
      console.log(`[RSS] Fetched ${opinions.length} opinion pieces${category ? ` for ${category}` : ''}`);
      return opinions;
    }

    return getStaleOrEmpty(cacheKey, 'opinions');
  } catch (error) {
    console.error('[RSS] Error fetching opinions:', error.message);
    if (shouldDisableFunctions(error)) {
      markFunctionsUnavailable();
    }
    return getStaleOrEmpty(cacheKey, 'opinions');
  }
}

/**
 * Fetch videos from RSS feeds (YouTube channels)
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of video items
 */
export async function fetchRSSVideos(category = null) {
  const cacheKey = getVersionedCacheKey('videos', category);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached videos for ${cacheKey}`);
    return cachedData;
  }

  if (!canAttemptFunctions()) {
    console.log('[RSS] Skipping videos fetch - functions unavailable');
    return getStaleOrEmpty(cacheKey, 'videos');
  }

  try {
    const params = new URLSearchParams({ type: 'videos' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching videos with category filter: ${category}`);
    }
    
    const response = await requestWithRetry(`${RSS_API_URL}?${params.toString()}`);
    markFunctionsAvailable();

    const payload = extractDataArray(response);
    if (payload.length > 0) {
      const normalizedVideos = payload.map(item => {
        const normalized = normalizeOutletSource(item);
        return {
          ...normalized,
          thumbnail: item.image,
          duration: '5:30' // RSS doesn't provide duration, using placeholder
        };
      });
      const videos = dedupeContentItems(normalizedVideos);

      if (videos.length !== normalizedVideos.length) {
        console.log(`[RSS] Removed ${normalizedVideos.length - videos.length} duplicate video items`);
      }
      
      // Update cache with IndexedDB
      await cacheManager.set(cacheKey, videos);
      
      console.log(`[RSS] Fetched ${videos.length} videos${category ? ` for ${category}` : ''}`);
      return videos;
    }

    return getStaleOrEmpty(cacheKey, 'videos');
  } catch (error) {
    console.error('[RSS] Error fetching videos:', error.message);
    if (shouldDisableFunctions(error)) {
      markFunctionsUnavailable();
    }
    return getStaleOrEmpty(cacheKey, 'videos');
  }
}

/**
 * Fetch podcast episodes from RSS feeds
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of podcast items
 */
export async function fetchRSSPodcasts(category = null) {
  const cacheKey = getVersionedCacheKey('podcasts', category);
  
  // Check cache first using IndexedDB
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS] Using cached podcasts for ${cacheKey}`);
    return cachedData;
  }

  if (!canAttemptFunctions()) {
    console.log('[RSS] Skipping podcasts fetch - functions unavailable');
    return getStaleOrEmpty(cacheKey, 'podcasts');
  }

  try {
    const params = new URLSearchParams({ type: 'podcasts' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching podcasts with category filter: ${category}`);
    }
    
    const response = await requestWithRetry(`${RSS_API_URL}?${params.toString()}`);
    markFunctionsAvailable();

    const payload = extractDataArray(response);
    if (payload.length > 0) {
      const normalizedPodcasts = payload.map(item => {
        const normalized = normalizeOutletSource(item);
        return {
          ...normalized,
          thumbnail: item.image,
          hosts: item.hosts || item.author || '',
          date: item.publishedAt
        };
      });
      const podcasts = dedupeContentItems(normalizedPodcasts);

      if (podcasts.length !== normalizedPodcasts.length) {
        console.log(`[RSS] Removed ${normalizedPodcasts.length - podcasts.length} duplicate podcast items`);
      }
      
      // Update cache with IndexedDB
      await cacheManager.set(cacheKey, podcasts);
      
      console.log(`[RSS] Fetched ${podcasts.length} podcasts${category ? ` for ${category}` : ''}`);
      return podcasts;
    }

    return getStaleOrEmpty(cacheKey, 'podcasts');
  } catch (error) {
    console.error('[RSS] Error fetching podcasts:', error.message);
    if (shouldDisableFunctions(error)) {
      markFunctionsUnavailable();
    }
    return getStaleOrEmpty(cacheKey, 'podcasts');
  }
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

  const strictSearch = options.strictSearch !== false;
  const relaxSearchFallback = options.relaxSearchFallback !== false;
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
    const normalizedTerm = normalizeSearchText(searchTerm);
    const localResults = await searchCachedContent(normalizedTerm);

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
    
    if (results.length > 0) {
      if (results.length !== normalizedResults.length) {
        console.log(`[RSS Search] Removed ${normalizedResults.length - results.length} duplicates`);
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
