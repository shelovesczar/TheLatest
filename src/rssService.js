import axios from 'axios';
import { cacheManager } from './utils/cacheManager';
import { deriveMediaOutlet } from './utils/sourceUtils';

// RSS Aggregator endpoint - works both locally (with netlify dev) and in production
const RSS_API_URL = '/.netlify/functions/rss-aggregator';
const RSS_CACHE_VERSION = 'v4-dedupe';
const REQUEST_TIMEOUT = 12000; // 12s — matches backend feed timeout
const RETRY_ATTEMPTS = 2;      // was 3 — one retry is enough
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

const normalizeDedupeUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw, 'https://thelatest.local');
    parsed.hash = '';
    parsed.search = '';

    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${pathname}`.toLowerCase();
  } catch {
    return raw
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
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
export async function searchRSSContent(searchTerm) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    console.log('[RSS Search] Empty search term');
    return [];
  }

  const cacheKey = getSearchCacheKey(searchTerm);
  const cachedData = await cacheManager.get(cacheKey);
  if (cachedData) {
    console.log(`[RSS Search] Using cached results for "${searchTerm}"`);
    return cachedData;
  }

  if (!canAttemptFunctions()) {
    console.log('[RSS Search] Functions unavailable');
    return getStaleOrEmpty(cacheKey, 'search');
  }

  try {
    const response = await requestWithRetry(`${RSS_API_URL}?search=${encodeURIComponent(searchTerm)}`);
    markFunctionsAvailable();

    const normalizedResults = extractDataArray(response).map(normalizeOutletSource);
    const results = dedupeContentItems(normalizedResults);
    if (results.length > 0) {
      if (results.length !== normalizedResults.length) {
        console.log(`[RSS Search] Removed ${normalizedResults.length - results.length} duplicate search results`);
      }
      await cacheManager.set(cacheKey, results);
      console.log(`[RSS Search] Found ${results.length} results for "${searchTerm}"`);
      return results;
    }

    return getStaleOrEmpty(cacheKey, 'search');
  } catch (error) {
    console.error('[RSS Search] Error:', error.message);
    if (shouldDisableFunctions(error)) {
      markFunctionsUnavailable();
    }
    return getStaleOrEmpty(cacheKey, 'search');
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
