// Social Media API Integration Services
// Supports Twitter/X, Reddit, Instagram, and TikTok

const API_KEYS = {
  twitter: import.meta.env.VITE_TWITTER_API_KEY,
  reddit: import.meta.env.VITE_REDDIT_CLIENT_ID,
  redditSecret: import.meta.env.VITE_REDDIT_SECRET,
  instagram: import.meta.env.VITE_INSTAGRAM_API_KEY,
  youtube: import.meta.env.VITE_YOUTUBE_API_KEY
}

/**
 * Fetch trending tweets from Twitter/X API v2
 * Requires Twitter API Premium ($200/month for search)
 */
export async function fetchTwitterPosts(topic = '', limit = 10) {
  const apiKey = API_KEYS.twitter
  
  if (!apiKey) {
    console.warn('Twitter API key not configured')
    return null
  }

  try {
    const query = topic || 'trending'
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${limit}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=name,username,profile_image_url`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.data?.map(tweet => {
      const author = data.includes?.users?.find(u => u.id === tweet.author_id)
      return {
        platform: 'X',
        author: author?.name || 'Unknown',
        username: author?.username || '',
        content: tweet.text,
        likes: tweet.public_metrics?.like_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        url: `https://twitter.com/${author?.username}/status/${tweet.id}`,
        timestamp: tweet.created_at,
        image: null
      }
    }) || []
  } catch (error) {
    console.error('Twitter API error:', error)
    return null
  }
}

/**
 * Fetch top posts from Reddit using official API
 */
export async function fetchRedditPosts(topic = '', limit = 10) {
  const clientId = API_KEYS.reddit
  const clientSecret = API_KEYS.redditSecret

  try {
    let url
    if (topic) {
      // Search for topic across Reddit
      url = `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=hot&limit=${limit}`
    } else {
      // Get trending from r/all
      url = `https://www.reddit.com/r/all/hot.json?limit=${limit}`
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TheLatest/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.data?.children?.map(post => ({
      platform: 'Reddit',
      author: post.data.author,
      content: post.data.title,
      subreddit: post.data.subreddit_name_prefixed,
      likes: post.data.ups || 0,
      comments: post.data.num_comments || 0,
      shares: post.data.num_crossposts || 0,
      url: `https://reddit.com${post.data.permalink}`,
      timestamp: new Date(post.data.created_utc * 1000).toISOString(),
      image: post.data.thumbnail !== 'self' && post.data.thumbnail !== 'default' ? post.data.thumbnail : null
    })) || []
  } catch (error) {
    console.error('Reddit API error:', error)
    return null
  }
}

/**
 * Fetch YouTube videos
 */
export async function fetchYouTubePosts(topic = '', limit = 10) {
  const apiKey = API_KEYS.youtube
  
  if (!apiKey) {
    console.warn('YouTube API key not configured')
    return null
  }

  try {
    const query = topic || 'trending news'
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${limit}&order=viewCount&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.items?.map(video => ({
      platform: 'YouTube',
      author: video.snippet.channelTitle,
      content: video.snippet.title,
      description: video.snippet.description,
      url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      timestamp: video.snippet.publishedAt,
      image: video.snippet.thumbnails?.medium?.url || null,
      videoId: video.id.videoId
    })) || []
  } catch (error) {
    console.error('YouTube API error:', error)
    return null
  }
}

/**
 * Fetch Instagram posts (requires business account and approved app)
 */
export async function fetchInstagramPosts(topic = '', limit = 10) {
  const apiKey = API_KEYS.instagram
  
  if (!apiKey) {
    console.warn('Instagram API key not configured. Instagram requires business account and app approval.')
    return null
  }

  // Instagram Graph API is complex and requires OAuth flow
  // This is a placeholder for when proper authentication is set up
  console.warn('Instagram API requires OAuth setup and business account')
  return null
}

/**
 * Main function to fetch social media posts from all platforms
 */
export async function fetchAllSocialPosts(topic = '', limit = 12) {
  try {
    const [twitterPosts, redditPosts, youtubePosts] = await Promise.all([
      fetchTwitterPosts(topic, Math.ceil(limit / 3)),
      fetchRedditPosts(topic, Math.ceil(limit / 3)),
      fetchYouTubePosts(topic, Math.ceil(limit / 3))
    ])

    const allPosts = [
      ...(twitterPosts || []),
      ...(redditPosts || []),
      ...(youtubePosts || [])
    ]

    // Shuffle and limit
    const shuffled = allPosts.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, limit)
  } catch (error) {
    console.error('Error fetching social posts:', error)
    return []
  }
}

/**
 * Get cached social posts
 */
export function getCachedSocialPosts(topic = '') {
  const cacheKey = `social_posts_${topic || 'trending'}`
  const cached = localStorage.getItem(cacheKey)
  
  if (!cached) return null
  
  try {
    const data = JSON.parse(cached)
    const age = Date.now() - data.timestamp
    
    // Cache expires after 15 minutes
    if (age < 15 * 60 * 1000) {
      return data.posts
    }
  } catch (error) {
    console.error('Error reading cached social posts:', error)
  }
  
  return null
}

/**
 * Cache social posts
 */
export function cacheSocialPosts(topic = '', posts) {
  const cacheKey = `social_posts_${topic || 'trending'}`
  try {
    localStorage.setItem(cacheKey, JSON.stringify({
      posts,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Error caching social posts:', error)
  }
}

export default {
  fetchTwitterPosts,
  fetchRedditPosts,
  fetchYouTubePosts,
  fetchInstagramPosts,
  fetchAllSocialPosts,
  getCachedSocialPosts,
  cacheSocialPosts
}
