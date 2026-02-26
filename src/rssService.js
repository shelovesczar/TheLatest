import axios from 'axios';

// RSS Aggregator endpoint - works both locally (with netlify dev) and in production
const RSS_API_URL = '/.netlify/functions/rss-aggregator';

// Detect if Netlify Functions are available
let functionsAvailable = true;

// Cache to reduce function calls
let rssCache = {
  news: { data: null, timestamp: 0 },
  opinions: { data: null, timestamp: 0 },
  videos: { data: null, timestamp: 0 },
  podcasts: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes client-side cache

// Check if cache is valid
function isCacheValid(type) {
  const cached = rssCache[type];
  return cached.data && cached.data.length > 0 && (Date.now() - cached.timestamp < CACHE_DURATION);
}

// Test if Netlify Functions are available
async function checkFunctionsAvailability() {
  try {
    const response = await axios.get(RSS_API_URL + '?type=news', { timeout: 5000 });
    functionsAvailable = response.status === 200;
    return functionsAvailable;
  } catch (error) {
    console.log('[RSS] Netlify Functions not available (run "netlify dev" to enable)');
    functionsAvailable = false;
    return false;
  }
}

/**
 * Fetch news from RSS aggregator
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of news articles
 */
export async function fetchRSSNews(category = null) {
  const cacheKey = category ? `news_${category}` : 'news';
  
  // Initialize cache for this key if it doesn't exist
  if (!rssCache[cacheKey]) {
    rssCache[cacheKey] = { data: null, timestamp: 0 };
  }
  
  // Check cache first
  if (isCacheValid(cacheKey)) {
    console.log(`[RSS] Using cached news for ${cacheKey}`);
    return rssCache[cacheKey].data;
  }

  // If functions not available, return empty (will trigger fallback in newsService)
  if (functionsAvailable === false) {
    console.log('[RSS] Skipping RSS fetch - functions unavailable (use "netlify dev")');
    return [];
  }

  try {
    const params = new URLSearchParams({ type: 'news' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching news with category filter: ${category}`);
    }
    
    const url = `${RSS_API_URL}?${params.toString()}`;
    console.log(`[RSS] Request URL: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000
    });

    // Check response structure carefully
    if (!response) {
      console.warn('[RSS] No response received');
      return [];
    }
    
    if (!response.data) {
      console.warn('[RSS] Response has no data property');
      return [];
    }
    
    if (!response.data.data) {
      console.warn('[RSS] Response.data has no data property:', response.data);
      return [];
    }
    
    const articles = response.data.data;
    
    if (!Array.isArray(articles)) {
      console.warn('[RSS] Articles is not an array:', articles);
      return [];
    }
    
    // Update cache
    rssCache[cacheKey] = {
      data: articles,
      timestamp: Date.now()
    };
    
    console.log(`[RSS] Fetched ${articles.length} news articles${category ? ` for ${category}` : ''}`);
    return articles;
  } catch (error) {
    console.error('[RSS] Error fetching news:', error.message);
    // Mark functions as unavailable on first error
    if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      functionsAvailable = false;
    }
    return [];
  }
}

/**
 * Fetch opinion pieces from RSS feeds
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of opinion articles
 */
export async function fetchRSSOpinions(category = null) {
  const cacheKey = category ? `opinions_${category}` : 'opinions';
  
  // Initialize cache for this key if it doesn't exist
  if (!rssCache[cacheKey]) {
    rssCache[cacheKey] = { data: null, timestamp: 0 };
  }
  
  if (isCacheValid(cacheKey)) {
    console.log(`[RSS] Using cached opinions for ${cacheKey}`);
    return rssCache[cacheKey].data;
  }

  if (functionsAvailable === false) {
    console.log('[RSS] Skipping opinions fetch - functions unavailable');
    return [];
  }
  try {
    const params = new URLSearchParams({ type: 'opinions' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching opinions with category filter: ${category}`);
    }
    
    const response = await axios.get(`${RSS_API_URL}?${params.toString()}`, {
      timeout: 30000
    });

    if (response && response.data && response.data.data) {
      const opinions = response.data.data.map(item => ({
        ...item,
        author: item.source || 'Editorial',
        date: item.publishedAt || 'Recently'
      }));
      
      rssCache[cacheKey] = {
        data: opinions,
        timestamp: Date.now()
      };
      
      console.log(`[RSS] Fetched ${opinions.length} opinion pieces${category ? ` for ${category}` : ''}`);
      return opinions;
    }
    
    return [];
  } catch (error) {
    console.error('[RSS] Error fetching opinions:', error.message);
    if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      functionsAvailable = false;
    }
    return [];
  }
}

/**
 * Fetch videos from RSS feeds (YouTube channels)
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of video items
 */
export async function fetchRSSVideos(category = null) {
  const cacheKey = category ? `videos_${category}` : 'videos';
  
  // Initialize cache for this key if it doesn't exist
  if (!rssCache[cacheKey]) {
    rssCache[cacheKey] = { data: null, timestamp: 0 };
  }
  
  if (isCacheValid(cacheKey)) {
    console.log(`[RSS] Using cached videos for ${cacheKey}`);
    return rssCache[cacheKey].data;
  }

  if (functionsAvailable === false) {
    console.log('[RSS] Skipping videos fetch - functions unavailable');
    return [];
  }

  try {
    const params = new URLSearchParams({ type: 'videos' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching videos with category filter: ${category}`);
    }
    
    const response = await axios.get(`${RSS_API_URL}?${params.toString()}`, {
      timeout: 30000
    });

    if (response && response.data && response.data.data) {
      const videos = response.data.data.map(item => ({
        ...item,
        thumbnail: item.image,
        duration: '5:30' // RSS doesn't provide duration, using placeholder
      }));
      
      rssCache[cacheKey] = {
        data: videos,
        timestamp: Date.now()
      };
      
      console.log(`[RSS] Fetched ${videos.length} videos${category ? ` for ${category}` : ''}`);
      return videos;
    }
    
    return [];
  } catch (error) {
    console.error('[RSS] Error fetching videos:', error.message);
    if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      functionsAvailable = false;
    }
    return [];
  }
}

/**
 * Fetch podcast episodes from RSS feeds
 * @param {string} category - Optional category filter (sports, tech, entertainment, etc.)
 * @returns {Promise<Array>} - Array of podcast items
 */
export async function fetchRSSPodcasts(category = null) {
  const cacheKey = category ? `podcasts_${category}` : 'podcasts';
  
  // Initialize cache for this key if it doesn't exist
  if (!rssCache[cacheKey]) {
    rssCache[cacheKey] = { data: null, timestamp: 0 };
  }
  
  if (isCacheValid(cacheKey)) {
    console.log(`[RSS] Using cached podcasts for ${cacheKey}`);
    return rssCache[cacheKey].data;
  }

  if (functionsAvailable === false) {
    console.log('[RSS] Skipping podcasts fetch - functions unavailable');
    return [];
  }

  try {
    const params = new URLSearchParams({ type: 'podcasts' });
    if (category) {
      params.append('category', category);
      console.log(`[RSS] Fetching podcasts with category filter: ${category}`);
    }
    
    const response = await axios.get(`${RSS_API_URL}?${params.toString()}`, {
      timeout: 30000
    });

    if (response && response.data && response.data.data) {
      const podcasts = response.data.data.map(item => ({
        ...item,
        thumbnail: item.image,
        hosts: item.source,
        date: item.publishedAt
      }));
      
      rssCache[cacheKey] = {
        data: podcasts,
        timestamp: Date.now()
      };
      
      console.log(`[RSS] Fetched ${podcasts.length} podcasts${category ? ` for ${category}` : ''}`);
      return podcasts;
    }
    
    return [];
  } catch (error) {
    console.error('[RSS] Error fetching podcasts:', error.message);    if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
      functionsAvailable = false;
    }    return [];
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

  if (functionsAvailable === false) {
    console.log('[RSS Search] Functions unavailable');
    return [];
  }

  try {
    const response = await axios.get(`${RSS_API_URL}?search=${encodeURIComponent(searchTerm)}`, {
      timeout: 30000
    });

    if (response && response.data && response.data.data) {
      const results = response.data.data;
      console.log(`[RSS Search] Found ${results.length} results for "${searchTerm}"`);
      return results;
    }
    
    return [];
  } catch (error) {
    console.error('[RSS Search] Error:', error.message);
    return [];
  }
}

/**
 * Clear all RSS cache
 */
export function clearRSSCache() {
  rssCache = {
    news: { data: null, timestamp: 0 },
    opinions: { data: null, timestamp: 0 },
    videos: { data: null, timestamp: 0 },
    podcasts: { data: null, timestamp: 0 }
  };
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
