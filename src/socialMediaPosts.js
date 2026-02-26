// Curated collection of viral/trending social media posts
// Update these URLs regularly with current trending content

export const trendingPosts = {
  twitter: [
    {
      id: '1',
      url: 'https://twitter.com/NASA/status/1234567890',
      embedUrl: 'https://platform.twitter.com/embed/Tweet.html?id=1234567890',
      author: '@NASA',
      platform: 'X'
    },
    {
      id: '2',
      url: 'https://twitter.com/elonmusk/status/1234567891',
      embedUrl: 'https://platform.twitter.com/embed/Tweet.html?id=1234567891',
      author: '@elonmusk',
      platform: 'X'
    }
  ],
  instagram: [
    {
      id: '1',
      url: 'https://www.instagram.com/p/ABC123/',
      embedUrl: 'https://www.instagram.com/p/ABC123/embed',
      author: '@natgeo',
      platform: 'Instagram'
    },
    {
      id: '2',
      url: 'https://www.instagram.com/p/DEF456/',
      embedUrl: 'https://www.instagram.com/p/DEF456/embed',
      author: '@nasa',
      platform: 'Instagram'
    }
  ],
  tiktok: [
    {
      id: '1',
      url: 'https://www.tiktok.com/@username/video/1234567890',
      embedUrl: 'https://www.tiktok.com/embed/1234567890',
      author: '@trending',
      platform: 'TikTok'
    },
    {
      id: '2',
      url: 'https://www.tiktok.com/@username2/video/9876543210',
      embedUrl: 'https://www.tiktok.com/embed/9876543210',
      author: '@viral',
      platform: 'TikTok'
    }
  ]
}

// Helper to get random mix of posts
export const getRandomTrendingPosts = (count = 6) => {
  const allPosts = [
    ...trendingPosts.twitter,
    ...trendingPosts.instagram,
    ...trendingPosts.tiktok
  ]
  
  // Shuffle array
  const shuffled = allPosts.sort(() => 0.5 - Math.random())
  
  // Return requested number ensuring variety
  const selected = []
  const platforms = ['X', 'Instagram', 'TikTok']
  
  // Try to get 2 from each platform
  platforms.forEach(platform => {
    const platformPosts = shuffled.filter(p => p.platform === platform)
    selected.push(...platformPosts.slice(0, 2))
  })
  
  return selected.slice(0, count)
}

// Generate dynamic engagement numbers based on platform
const generateEngagement = (platform, baseNumber) => {
  // Add some variance (+/- 20%)
  const variance = Math.random() * 0.4 - 0.2 // -20% to +20%
  const dynamicNumber = baseNumber * (1 + variance)
  
  // Format the number
  const formatted = dynamicNumber >= 1000000 
    ? `${(dynamicNumber / 1000000).toFixed(1)}M`
    : dynamicNumber >= 1000
    ? `${(dynamicNumber / 1000).toFixed(1)}K`
    : dynamicNumber.toFixed(0)
  
  // Return with appropriate metric based on platform
  if (platform === 'TikTok') {
    return `${formatted} views`
  } else {
    return `${formatted} likes`
  }
}

// Categorized social media posts that rotate between topics
const socialMediaCategories = {
  breakingNews: [
    {
      platform: "BlueSky",
      author: "Breaking News",
      content: "🚨 DEVELOPING: Major investigation documents released. Epstein Files reveal new details. Media analyzing thousands of pages. #EpsteinFiles",
      engagement: "5.2M likes",
      category: "News",
      url: "https://bsky.app",
      image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80"
    },
    {
      platform: "Truth Social",
      author: "News Alert",
      content: "BREAKING: AI technology reaches new milestone. Artificial intelligence advancement reshapes tech industry. Full story developing.",
      engagement: "3.8M likes",
      category: "Technology",
      url: "https://truthsocial.com",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80"
    },
    {
      platform: "X",
      author: "CNN",
      content: "BREAKING: Major policy announcement expected this afternoon. Markets react to preliminary reports. Full coverage coming soon.",
      engagement: "4.9M likes",
      category: "News",
      url: "https://twitter.com/CNN",
      image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80"
    },
    {
      platform: "X",
      author: "Reuters",
      content: "Global markets update: Tech stocks lead gains as investors digest latest economic data. Full analysis on our website.",
      engagement: "2.8M likes",
      category: "Business",
      url: "https://twitter.com/Reuters",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80"
    },
    {
      platform: "BlueSky",
      author: "The Guardian",
      content: "Climate summit reaches historic agreement. World leaders commit to ambitious emission reduction targets. Details emerging now.",
      engagement: "6.3M likes",
      category: "News",
      url: "https://bsky.app",
      image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80"
    },
    {
      platform: "X",
      author: "BBC Breaking",
      content: "Scientific breakthrough in renewable energy announced. Researchers achieve unprecedented efficiency in solar technology. Full coverage coming.",
      engagement: "4.1M likes",
      category: "Technology",
      url: "https://twitter.com/BBCBreaking",
      image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80"
    },
    {
      platform: "Truth Social",
      author: "Fox News",
      content: "Major political development: Congressional hearing draws millions of viewers. Historic testimony underway. Live updates throughout the day.",
      engagement: "7.2M likes",
      category: "Politics",
      url: "https://truthsocial.com",
      image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80"
    }
  ],
  entertainment: [
    {
      platform: "BlueSky",
      author: "Academy Awards",
      content: "🏆 OSCARS 2026: The nominees are here! Historic night ahead with incredible performances. Who will take home the gold? #Oscars #AcademyAwards",
      engagement: "18.4M likes",
      category: "Entertainment",
      url: "https://bsky.app",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80"
    },
    {
      platform: "Instagram",
      author: "Variety",
      content: "Behind the scenes at the Oscars! The most glamorous night in Hollywood is just hours away. Red carpet coverage starts soon! ✨🎬",
      engagement: "12.7M likes",
      category: "Entertainment",
      url: "https://instagram.com/variety",
      image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "Hollywood Reporter",
      content: "This year's Oscar nominees ranked by how much we're obsessed 😍 Which performance was YOUR favorite? #Oscars2026",
      engagement: "24.8M views",
      category: "Entertainment",
      url: "https://tiktok.com/@thr",
      image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80"
    },
    {
      platform: "X",
      author: "IMDb",
      content: "Summer blockbuster season is heating up! 🎥🔥 These 10 movies are about to dominate the box office. Which one are you most excited for?",
      engagement: "8.9M likes",
      category: "Entertainment",
      url: "https://twitter.com/IMDb",
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80"
    },
    {
      platform: "Instagram",
      author: "Entertainment Weekly",
      content: "🎬 First look at this summer's most anticipated blockbuster! Behind-the-scenes photos you need to see. Link in bio!",
      engagement: "9.1M likes",
      category: "Entertainment",
      url: "https://instagram.com/entertainmentweekly",
      image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "PopCrave",
      content: "The Grammys red carpet was ICONIC tonight ✨ Here are the best moments everyone's talking about...",
      engagement: "12.3M views",
      category: "Entertainment",
      url: "https://tiktok.com/@popcrave",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80"
    },
    {
      platform: "X",
      author: "Variety",
      content: "Box office update: New release breaks records with $127M opening weekend 🎥🍿",
      engagement: "3.4M likes",
      category: "Entertainment",
      url: "https://twitter.com/Variety",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"
    },
    {
      platform: "Truth Social",
      author: "Hollywood News",
      content: "🎭 Oscars predictions are in! Best Picture race is the tightest in years. Academy Awards ceremony promises surprises. #Oscars2026",
      engagement: "4.7M likes",
      category: "Entertainment",
      url: "https://truthsocial.com",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80"
    }
  ],
  gossip: [
    {
      platform: "Instagram",
      author: "TMZ",
      content: "🚨 EXCLUSIVE: Celebrity couple spotted together for the first time in months! Are they back together? 👀",
      engagement: "8.7M likes",
      url: "https://instagram.com/tmz",
      image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "Deuxmoi",
      content: "The tea is PIPING hot today ☕ A-list actor seen leaving mysterious Hollywood party at 3am...",
      engagement: "6.2M views",
      url: "https://tiktok.com/@deuxmoi",
      image: "https://images.unsplash.com/photo-1514315384763-ba401779410f?w=800&q=80"
    }
  ],
  sports: [
    {
      platform: "X",
      author: "ESPN FC",
      content: "⚽ GOAL! Incredible soccer strike from outside the box! This is why football is the beautiful game. #WorldCup #Soccer",
      engagement: "8.2M likes",
      category: "Sports",
      url: "https://twitter.com/espnfc",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "Bleacher Report Football",
      content: "🔥 The soccer skills in this match were INSANE! Champions League football at its finest! ⚽",
      engagement: "12.5M views",
      category: "Sports",
      url: "https://tiktok.com/@brfootball",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80"
    },
    {
      platform: "Instagram",
      author: "FIFA",
      content: "⚽ World Cup soccer magic! Relive the greatest football moments from the tournament 🏆 #Soccer #Football",
      engagement: "15.7M likes",
      category: "Sports",
      url: "https://instagram.com/fifaworldcup",
      image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80"
    },
    {
      platform: "X",
      author: "ESPN",
      content: "🏀 UNBELIEVABLE! Buzzer-beater wins the basketball game in overtime! This is instant classic material.",
      engagement: "7.8M likes",
      category: "Sports",
      url: "https://twitter.com/espn",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80"
    },
    {
      platform: "X",
      author: "Premier League",
      content: "⚽ WHAT A MATCH! The football was electric today! Soccer at its absolute best in the Premier League! 🔴",
      engagement: "9.3M likes",
      category: "Sports",
      url: "https://twitter.com/premierleague",
      image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80"
    }
  ],
  technology: [
    {
      platform: "BlueSky",
      author: "AI News Daily",
      content: "🤖 BREAKTHROUGH: New AI model surpasses human performance in complex reasoning tasks. Artificial intelligence evolution continues. #AI #Technology",
      engagement: "8.9M likes",
      category: "Technology",
      url: "https://bsky.app",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "Tech Insider",
      content: "AI tools are changing how we work 🤖 Here's what the latest ChatGPT update can do that most people don't know about...",
      engagement: "3.7M views",
      category: "Technology",
      url: "https://tiktok.com/@techinsider",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80"
    },
    {
      platform: "X",
      author: "TechCrunch",
      content: "🚨 Major tech company announces surprise product launch event. Industry insiders predict game-changing announcement.",
      engagement: "2.9M likes",
      category: "Technology",
      url: "https://twitter.com/TechCrunch",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80"
    },
    {
      platform: "Truth Social",
      author: "Tech Watch",
      content: "AI artificial intelligence is transforming every industry. New developments in machine learning reshape the future. #ArtificialIntelligence",
      engagement: "5.1M likes",
      category: "Technology",
      url: "https://truthsocial.com",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80"
    }
  ],
  science: [
    {
      platform: "X",
      author: "NASA",
      content: "🚀 Breaking: New images from James Webb Space Telescope reveal stunning details of distant galaxies formed just after the Big Bang. Science is incredible!",
      engagement: "8.2M likes",
      url: "https://twitter.com/NASA",
      image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&q=80"
    },
    {
      platform: "Instagram",
      author: "National Geographic",
      content: "Rare wildlife moment captured in the Amazon rainforest 🦜 This endangered species population is showing signs of recovery thanks to conservation efforts.",
      engagement: "6.4M likes",
      url: "https://instagram.com/natgeo",
      image: "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=800&q=80"
    }
  ],
  lifestyle: [
    {
      platform: "Instagram",
      author: "Vogue",
      content: "Fashion week highlights: These runway looks are already trending 👗✨ Which is your favorite?",
      engagement: "5.6M likes",
      url: "https://instagram.com/voguemagazine",
      image: "https://images.unsplash.com/photo-1558769132-cb1aea870f7e?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "Tasty",
      content: "This viral recipe has 50M views and for good reason 🍕 It's literally so easy and tastes amazing!",
      engagement: "8.9M views",
      url: "https://tiktok.com/@buzzfeedtasty",
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80"
    }
  ],
  business: [
    {
      platform: "Instagram",
      author: "The Economist",
      content: "Electric vehicles are hitting a critical inflection point 🚗⚡ New data shows adoption rates surging in unexpected markets.",
      engagement: "3.2M likes",
      url: "https://instagram.com/theeconomist",
      image: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80"
    },
    {
      platform: "X",
      author: "Bloomberg",
      content: "💼 Startup valued at $5 billion after latest funding round. Investors betting big on this disruptive technology.",
      engagement: "1.9M likes",
      url: "https://twitter.com/business",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
    }
  ],
  popCulture: [
    {
      platform: "Instagram",
      author: "TIME",
      content: "These are the 100 most influential people of 2026 📸 Swipe to see who made the list this year.",
      engagement: "7.3M likes",
      url: "https://instagram.com/time",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80"
    },
    {
      platform: "TikTok",
      author: "BuzzFeed",
      content: "This meme is taking over the internet and honestly it's so relatable 😂 Tag someone who needs to see this!",
      engagement: "15.2M views",
      url: "https://tiktok.com/@buzzfeed",
      image: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800&q=80"
    }
  ],
  climate: [
    {
      platform: "TikTok",
      author: "BBC News",
      content: "Climate scientists share breakthrough findings on renewable energy efficiency 🌍 The future looks brighter than expected.",
      engagement: "5.1M views",
      url: "https://tiktok.com/@bbcnews",
      image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80"
    }
  ]
}

// Fallback posts that randomly pull from different categories
export const fallbackSocialPosts = Object.values(socialMediaCategories).flat()

// Get random posts from mixed categories for variety
export const getRandomCategoryPosts = (count = 6) => {
  const categories = Object.keys(socialMediaCategories)
  const selectedPosts = []
  
  // Randomly select categories and posts from each
  while (selectedPosts.length < count && categories.length > 0) {
    const randomCategoryIndex = Math.floor(Math.random() * categories.length)
    const category = categories[randomCategoryIndex]
    const categoryPosts = socialMediaCategories[category]
    
    if (categoryPosts.length > 0) {
      const randomPostIndex = Math.floor(Math.random() * categoryPosts.length)
      const post = categoryPosts[randomPostIndex]
      
      // Generate dynamic engagement based on platform and base number
      const baseEngagement = post.platform === 'TikTok' 
        ? parseFloat(post.engagement) * 1000000 // TikTok gets higher view counts
        : parseFloat(post.engagement) * 1000000 // X/Instagram get likes
      
      selectedPosts.push({
        ...post,
        engagement: generateEngagement(post.platform, baseEngagement)
      })
    }
    
    // Remove category to ensure variety
    categories.splice(randomCategoryIndex, 1)
  }
  
  return selectedPosts
}
