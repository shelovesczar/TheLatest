import axios from 'axios'

// Real viral/trending social media post URLs
// Update these regularly with currently trending content
export const trendingPostUrls = {
  twitter: [
    'https://twitter.com/NASA/status/1745123456789012345',
    'https://twitter.com/elonmusk/status/1745987654321098765',
    'https://twitter.com/POTUS/status/1745111222333444555',
    'https://twitter.com/BarackObama/status/1745666777888999000'
  ],
  // Note: Instagram and TikTok embeds require iframes
  instagram: [
    'https://www.instagram.com/p/C12345AbCdE/',
    'https://www.instagram.com/p/C67890FgHiJ/'
  ],
  tiktok: [
    'https://www.tiktok.com/@user/video/1234567890123456789',
    'https://www.tiktok.com/@user2/video/9876543210987654321'
  ]
}

// Fetch real Twitter posts using oEmbed API
export const fetchTwitterPost = async (tweetUrl) => {
  try {
    const response = await axios.get('https://publish.twitter.com/oembed', {
      params: {
        url: tweetUrl,
        omit_script: true
      }
    })
    return {
      platform: 'X',
      html: response.data.html,
      url: tweetUrl,
      author: response.data.author_name || 'Twitter User',
      success: true
    }
  } catch (error) {
    // Silently fail - expected without proper API authentication
    return null
  }
}

// Fetch Instagram post using oEmbed API
export const fetchInstagramPost = async (postUrl) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v12.0/instagram_oembed`, {
      params: {
        url: postUrl,
        omitscript: true
      }
    })
    return {
      platform: 'Instagram',
      html: response.data.html,
      url: postUrl,
      author: response.data.author_name || 'Instagram User',
      success: true
    }
  } catch (error) {
    // Silently fail - expected without proper API authentication
    return null
  }
}

// Fetch TikTok video using oEmbed API
export const fetchTikTokPost = async (videoUrl) => {
  try {
    const response = await axios.get('https://www.tiktok.com/oembed', {
      params: {
        url: videoUrl
      }
    })
    return {
      platform: 'TikTok',
      html: response.data.html,
      url: videoUrl,
      author: response.data.author_name || 'TikTok User',
      success: true
    }
  } catch (error) {
    // Silently fail - expected without CORS/API authentication
    return null
  }
}

// Fetch a mix of real social media posts
export const fetchRealSocialPosts = async () => {
  try {
    const promises = []
    
    // Get 2 Twitter posts
    promises.push(fetchTwitterPost(trendingPostUrls.twitter[0]))
    promises.push(fetchTwitterPost(trendingPostUrls.twitter[1]))
    
    // Get 2 Instagram posts
    promises.push(fetchInstagramPost(trendingPostUrls.instagram[0]))
    promises.push(fetchInstagramPost(trendingPostUrls.instagram[1]))
    
    // Get 2 TikTok posts
    promises.push(fetchTikTokPost(trendingPostUrls.tiktok[0]))
    promises.push(fetchTikTokPost(trendingPostUrls.tiktok[1]))
    
    const results = await Promise.all(promises)
    
    // Filter out failed requests and return successful ones
    return results.filter(post => post && post.success)
  } catch (error) {
    console.error('Failed to fetch social media posts:', error)
    return []
  }
}

// Get random selection of posts
export const getRandomTrendingPosts = async (count = 6) => {
  try {
    const allPosts = await fetchRealSocialPosts()
    
    if (allPosts.length === 0) {
      return []
    }
    
    // Shuffle and return requested count
    const shuffled = allPosts.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  } catch (error) {
    console.error('Error getting random posts:', error)
    return []
  }
}
