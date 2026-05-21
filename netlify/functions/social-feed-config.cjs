module.exports = {
  // Priority configuration for feed fetching
  fetchConfig: {
    // Primary feed weight: fetches more content from high-priority feeds
    priorityWeight: 3,          // Multiplier for high-priority feeds (fetch 3x more)
    standardWeight: 1,          // Multiplier for standard feeds
    rotationCycleLength: 7,     // Rotate secondary feeds every N fetches
    defaultItemsPerFeed: 20,    // Default items to fetch per feed
  },

  socialFeeds: [
    // PRIORITY FEED: RSS.app Social Media Bundle — primary content source
    // Fetches 3x more content than standard feeds
    { 
      platform: 'Social', 
      source: 'Social Media Bundle', 
      category: 'news', 
      url: 'https://rss.app/feeds/_LVYomWWGnBBWz7m9.xml', 
      priority: 'high',           // High priority - fetches more frequently
      weight: 3,                  // Fetch multiplier
      maxItems: 60,               // Override: fetch up to 60 items from this feed
      rotationIndex: null,        // Not rotated
      tags: ['news', 'social', 'world', 'politics', 'business', 'entertainment', 'us', 'culture', 'sports', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'fifa', 'basketball', 'movies', 'tv', 'hollywood', 'oscars', 'music', 'charts', 'artists', 'awards', 'celebrities', 'lifestyle', 'health', 'wellness', 'fitness', 'travel', 'vacation', 'hotels', 'food', 'cooking', 'recipes', 'nature', 'adventure', 'arts', 'society', 'books', 'literature', 'authors', 'ideas', 'innovation', 'breaking', 'los angeles', 'california'] 
    },

    // SECONDARY FEED: RSS.app Homepage Aggregator (35 feeds)
    // Covers: HuffPost, Fox News, Bloomberg, CBS News, NewsNation, Newsmax, ABC News, NY Times, NPR, Reuters, BBC, NY Post, CNBC, AP News, CNN, USA Today, etc.
    { 
      platform: 'Social', 
      source: 'Homepage Aggregator', 
      category: 'news', 
      url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', 
      priority: 'standard',
      weight: 1,
      maxItems: 20,
      rotationIndex: 0,           // Rotates in group 0
      tags: ['news', 'politics', 'world', 'us', 'business', 'technology', 'entertainment', 'society', 'breaking', 'culture', 'sports', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'movies', 'tv', 'hollywood', 'music', 'awards', 'celebrities', 'health', 'travel', 'food', 'arts', 'books', 'ideas', 'innovation', 'los angeles', 'california'] 
    },

    // ROTATIONAL FEEDS: Cycle between these based on rotation index
    // Local news (not covered by bundles above)
    // { 
    //   platform: 'TikTok', 
    //   source: 'KTLA', 
    //   category: 'news', 
    //   route: '/tiktok/user/ktla5news', 
    //   fallbackUrl: 'https://ktla.com/feed/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 1,           // Rotates
    //   tags: ['news', 'los angeles', 'california', 'breaking'] 
    // },

    // // Sports
    // { 
    //   platform: 'X', 
    //   source: 'ESPN', 
    //   category: 'sports', 
    //   route: '/twitter/user/espn', 
    //   fallbackUrl: 'https://www.espn.com/espn/rss/news', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 18,
    //   rotationIndex: 2,
    //   tags: ['sports', 'nfl', 'nba', 'mlb', 'soccer'] 
    // },
    // { 
    //   platform: 'Instagram', 
    //   source: 'ESPN NFL', 
    //   category: 'sports', 
    //   route: '/instagram/user/espn', 
    //   fallbackUrl: 'https://www.espn.com/espn/rss/nfl/news', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 3,
    //   tags: ['sports', 'nfl', 'football'] 
    // },
    // { 
    //   platform: 'TikTok', 
    //   source: 'ESPN NBA', 
    //   category: 'sports', 
    //   route: '/tiktok/user/espn', 
    //   fallbackUrl: 'https://www.espn.com/espn/rss/nba/news', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 4,
    //   tags: ['sports', 'nba', 'basketball'] 
    // },
    // { 
    //   platform: 'X', 
    //   source: 'ESPN Soccer', 
    //   category: 'sports', 
    //   route: '/twitter/user/espnfc', 
    //   fallbackUrl: 'https://www.espn.com/espn/rss/soccer/news', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 5,
    //   tags: ['sports', 'soccer', 'football', 'fifa'] 
    // },

    // // Entertainment
    // { 
    //   platform: 'Instagram', 
    //   source: 'Variety', 
    //   category: 'entertainment', 
    //   route: '/instagram/user/variety', 
    //   fallbackUrl: 'https://variety.com/feed/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 6,
    //   tags: ['entertainment', 'movies', 'tv', 'hollywood', 'oscars'] 
    // },
    // { 
    //   platform: 'X', 
    //   source: 'Hollywood Reporter', 
    //   category: 'entertainment', 
    //   route: '/twitter/user/THR', 
    //   fallbackUrl: 'https://www.hollywoodreporter.com/feed/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 0,
    //   tags: ['entertainment', 'movies', 'tv', 'awards'] 
    // },
    // { 
    //   platform: 'TikTok', 
    //   source: 'Rolling Stone', 
    //   category: 'entertainment', 
    //   route: '/tiktok/user/rollingstone', 
    //   fallbackUrl: 'https://www.rollingstone.com/feed/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 1,
    //   tags: ['entertainment', 'music', 'culture', 'celebrities'] 
    // },
    // { 
    //   platform: 'Instagram', 
    //   source: 'Billboard', 
    //   category: 'entertainment', 
    //   route: '/instagram/user/billboard', 
    //   fallbackUrl: 'https://www.billboard.com/feed/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 2,
    //   tags: ['entertainment', 'music', 'charts', 'artists'] 
    // },

    // Lifestyle
    // { 
    //   platform: 'Instagram', 
    //   source: 'Health.com', 
    //   category: 'lifestyle', 
    //   route: '/instagram/user/healthmagazine', 
    //   fallbackUrl: 'https://www.health.com/syndication/feed', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 3,
    //   tags: ['lifestyle', 'health', 'wellness', 'fitness'] 
    // },
    // { 
    //   platform: 'X', 
    //   source: 'Travel + Leisure', 
    //   category: 'lifestyle', 
    //   route: '/twitter/user/TravelLeisure', 
    //   fallbackUrl: 'https://www.travelandleisure.com/feed/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 4,
    //   tags: ['lifestyle', 'travel', 'vacation', 'hotels'] 
    // },
    // { 
    //   platform: 'TikTok', 
    //   source: 'Food Network', 
    //   category: 'lifestyle', 
    //   route: '/tiktok/user/foodnetwork', 
    //   fallbackUrl: 'https://www.foodnetwork.com/feeds/all-recipes.rss', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 5,
    //   tags: ['lifestyle', 'food', 'cooking', 'recipes'] 
    // },
    // { 
    //   platform: 'Instagram', 
    //   source: 'National Geographic Travel', 
    //   category: 'lifestyle', 
    //   route: '/instagram/user/natgeotravel', 
    //   fallbackUrl: 'https://www.nationalgeographic.com/travel/rss/', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 6,
    //   tags: ['lifestyle', 'travel', 'nature', 'adventure'] 
    // },

    // Culture
    // { 
    //   platform: 'X', 
    //   source: 'The Guardian Culture', 
    //   category: 'culture', 
    //   route: '/twitter/user/guardian', 
    //   fallbackUrl: 'https://www.theguardian.com/culture/rss', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 0,
    //   tags: ['culture', 'arts', 'society', 'books'] 
    // },
    // { 
    //   platform: 'Instagram', 
    //   source: 'NPR Books', 
    //   category: 'culture', 
    //   route: '/instagram/user/npr', 
    //   fallbackUrl: 'https://www.npr.org/rss/rss.php?id=1008', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 1,
    //   tags: ['culture', 'books', 'literature', 'authors'] 
    // },
    // { 
    //   platform: 'TikTok', 
    //   source: 'TED Radio Hour', 
    //   category: 'culture', 
    //   route: '/tiktok/user/npr', 
    //   fallbackUrl: 'https://feeds.npr.org/510298/podcast.xml', 
    //   priority: 'standard',
    //   weight: 1,
    //   maxItems: 15,
    //   rotationIndex: 2,
    //   tags: ['culture', 'ideas', 'society', 'innovation'] 
    // }
  ],

  /**
   * Helper function to get feeds for this fetch cycle
   * @param {number} cycleIndex - Current fetch cycle (increments each time this is called)
   * @returns {Array} Filtered feeds for this cycle
   */
  getFeedsForCycle(cycleIndex = 0) {
    // Always include high-priority feeds
    const priorityFeeds = this.socialFeeds.filter(f => f.priority === 'high');
    
    // Calculate which rotation index should be active this cycle
    const rotationCycleLength = this.fetchConfig.rotationCycleLength;
    const activeRotationIndex = cycleIndex % rotationCycleLength;
    
    // Include standard feeds matching the active rotation index
    const rotationalFeeds = this.socialFeeds.filter(f => 
      f.priority === 'standard' && f.rotationIndex === activeRotationIndex
    );
    
    return [...priorityFeeds, ...rotationalFeeds];
  },

  /**
   * Helper function to get max items for a feed
   * @param {Object} feed - Feed configuration object
   * @returns {number} Number of items to fetch
   */
  getMaxItemsForFeed(feed) {
    return feed.maxItems || (this.fetchConfig.defaultItemsPerFeed * feed.weight);
  }
};