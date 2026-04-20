import axios from 'axios'

const SOCIAL_FEEDS_API = '/.netlify/functions/fetchSocialFeeds'
const CACHE_PREFIX = 'social_rss_posts_'
const FRESH_CACHE_DURATION = 15 * 60 * 1000
const STALE_CACHE_DURATION = 24 * 60 * 60 * 1000
let socialFeedsAvailable = true

const shouldDisableSocialFeeds = (error) => {
  const code = error?.code
  const status = error?.response?.status
  return code === 'ERR_NETWORK' || code === 'ECONNABORTED' || status === 404 || status === 502 || status === 503 || status === 504
}

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)

const getCacheKey = (topic = '', limit = 12) => `${CACHE_PREFIX}${(topic || 'all').toLowerCase()}_${limit}`

export const getCachedSocialPosts = (topic = '', limit = 12, allowStale = false) => {
  const cacheKey = getCacheKey(topic, limit)
  const cached = localStorage.getItem(cacheKey)

  if (!cached) return null

  try {
    const data = JSON.parse(cached)
    const age = Date.now() - data.timestamp
    const maxAge = allowStale ? STALE_CACHE_DURATION : FRESH_CACHE_DURATION

    if (age <= maxAge) {
      return data.posts || []
    }
  } catch (error) {
    console.error('Error reading cached social posts:', error)
  }

  return null
}

export const cacheSocialPosts = (topic = '', limit = 12, posts = []) => {
  const cacheKey = getCacheKey(topic, limit)

  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      posts,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Error caching social posts:', error)
  }
}

export const fetchSocialFeedPosts = async (topic = '', limit = 12) => {
  if (!socialFeedsAvailable) {
    return []
  }

  try {
    const response = await axios.get(SOCIAL_FEEDS_API, {
      params: {
        topic: topic || undefined,
        limit
      },
      timeout: 25000
    })

    return response?.data?.data || []
  } catch (error) {
    if (shouldDisableSocialFeeds(error)) {
      socialFeedsAvailable = false
      console.warn(`[Social] Social feeds unavailable (${error?.code || 'request-failed'}). Falling back to cache.`)
      return []
    }

    throw error
  }
}

export const getRandomTrendingPosts = async (count = 6, topic = '') => {
  const freshCached = getCachedSocialPosts(topic, count)
  if (freshCached && freshCached.length > 0) {
    return shuffle(freshCached).slice(0, count)
  }

  try {
    let posts = await fetchSocialFeedPosts(topic, Math.max(count, 12))

    // If a topic-specific social query is sparse, broaden to all configured feeds.
    if (topic && posts.length < Math.min(count, 3)) {
      const broaderPosts = await fetchSocialFeedPosts('', Math.max(count, 12))
      posts = broaderPosts.length > 0 ? broaderPosts : posts
    }

    if (posts.length > 0) {
      cacheSocialPosts(topic, Math.max(count, 12), posts)
      return shuffle(posts).slice(0, count)
    }
  } catch (error) {
    console.warn(`[Social] Error getting social RSS posts: ${error?.message || 'Unknown error'}`)
  }

  const staleCached = getCachedSocialPosts(topic, Math.max(count, 12), true)
  if (staleCached && staleCached.length > 0) {
    return shuffle(staleCached).slice(0, count)
  }

  if (topic) {
    const staleBroad = getCachedSocialPosts('', Math.max(count, 12), true)
    if (staleBroad && staleBroad.length > 0) {
      return shuffle(staleBroad).slice(0, count)
    }
  }

  return []
}
