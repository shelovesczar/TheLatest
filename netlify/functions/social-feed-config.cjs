module.exports = {
  socialFeeds: [
    // Keep these aligned with the publishers already used in rss-aggregator.js.
    // Use either:
    // - route: '/<rsshub-route>' (joined with RSSHUB_BASE_URL)
    // - url:   'https://full-rss-url'

    // RSS.app Homepage Aggregator — primary news source (35 feeds)
    // Covers: HuffPost, Fox News, Bloomberg, CBS News, NewsNation, Newsmax, ABC News,
    //         NY Times, NPR, Reuters, BBC, NY Post, CNBC, AP News, CNN, USA Today,
    //         The Federalist, Al Jazeera, TechCrunch, The New Yorker, PJ Media, and more
    { platform: 'Social', source: 'Homepage Aggregator', category: 'news', url: 'https://rss.app/feeds/_iIjbt3XTnFFpU0Cv.xml', tags: ['news', 'politics', 'world', 'us', 'business', 'technology', 'entertainment', 'society', 'breaking', 'culture', 'sports', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'movies', 'tv', 'hollywood', 'music', 'awards', 'celebrities', 'health', 'travel', 'food', 'arts', 'books', 'ideas', 'innovation', 'los angeles', 'california'] },

    // RSS.app Social Media Bundle
    { platform: 'Social', source: 'Social Media Bundle', category: 'news', url: 'https://rss.app/feeds/_LVYomWWGnBBWz7m9.xml', tags: ['news', 'social', 'world', 'politics', 'business', 'entertainment', 'us', 'culture', 'sports', 'nfl', 'nba', 'mlb', 'soccer', 'football', 'fifa', 'basketball', 'movies', 'tv', 'hollywood', 'oscars', 'music', 'charts', 'artists', 'awards', 'celebrities', 'lifestyle', 'health', 'wellness', 'fitness', 'travel', 'vacation', 'hotels', 'food', 'cooking', 'recipes', 'nature', 'adventure', 'arts', 'society', 'books', 'literature', 'authors', 'ideas', 'innovation', 'breaking', 'los angeles', 'california'] },

    // Local news (not covered by bundles above)
    { platform: 'TikTok', source: 'KTLA', category: 'news', route: '/tiktok/user/ktla5news', fallbackUrl: 'https://ktla.com/feed/', tags: ['news', 'los angeles', 'california', 'breaking'] },

    // Sports
    { platform: 'X', source: 'ESPN', category: 'sports', route: '/twitter/user/espn', fallbackUrl: 'https://www.espn.com/espn/rss/news', tags: ['sports', 'nfl', 'nba', 'mlb', 'soccer'] },
    { platform: 'Instagram', source: 'ESPN NFL', category: 'sports', route: '/instagram/user/espn', fallbackUrl: 'https://www.espn.com/espn/rss/nfl/news', tags: ['sports', 'nfl', 'football'] },
    { platform: 'TikTok', source: 'ESPN NBA', category: 'sports', route: '/tiktok/user/espn', fallbackUrl: 'https://www.espn.com/espn/rss/nba/news', tags: ['sports', 'nba', 'basketball'] },
    { platform: 'X', source: 'ESPN Soccer', category: 'sports', route: '/twitter/user/espnfc', fallbackUrl: 'https://www.espn.com/espn/rss/soccer/news', tags: ['sports', 'soccer', 'football', 'fifa'] },

    // Entertainment
    { platform: 'Instagram', source: 'Variety', category: 'entertainment', route: '/instagram/user/variety', fallbackUrl: 'https://variety.com/feed/', tags: ['entertainment', 'movies', 'tv', 'hollywood', 'oscars'] },
    { platform: 'X', source: 'Hollywood Reporter', category: 'entertainment', route: '/twitter/user/THR', fallbackUrl: 'https://www.hollywoodreporter.com/feed/', tags: ['entertainment', 'movies', 'tv', 'awards'] },
    { platform: 'TikTok', source: 'Rolling Stone', category: 'entertainment', route: '/tiktok/user/rollingstone', fallbackUrl: 'https://www.rollingstone.com/feed/', tags: ['entertainment', 'music', 'culture', 'celebrities'] },
    { platform: 'Instagram', source: 'Billboard', category: 'entertainment', route: '/instagram/user/billboard', fallbackUrl: 'https://www.billboard.com/feed/', tags: ['entertainment', 'music', 'charts', 'artists'] },

    // Lifestyle
    { platform: 'Instagram', source: 'Health.com', category: 'lifestyle', route: '/instagram/user/healthmagazine', fallbackUrl: 'https://www.health.com/syndication/feed', tags: ['lifestyle', 'health', 'wellness', 'fitness'] },
    { platform: 'X', source: 'Travel + Leisure', category: 'lifestyle', route: '/twitter/user/TravelLeisure', fallbackUrl: 'https://www.travelandleisure.com/feed/', tags: ['lifestyle', 'travel', 'vacation', 'hotels'] },
    { platform: 'TikTok', source: 'Food Network', category: 'lifestyle', route: '/tiktok/user/foodnetwork', fallbackUrl: 'https://www.foodnetwork.com/feeds/all-recipes.rss', tags: ['lifestyle', 'food', 'cooking', 'recipes'] },
    { platform: 'Instagram', source: 'National Geographic Travel', category: 'lifestyle', route: '/instagram/user/natgeotravel', fallbackUrl: 'https://www.nationalgeographic.com/travel/rss/', tags: ['lifestyle', 'travel', 'nature', 'adventure'] },

    // Culture
    { platform: 'X', source: 'The Guardian Culture', category: 'culture', route: '/twitter/user/guardian', fallbackUrl: 'https://www.theguardian.com/culture/rss', tags: ['culture', 'arts', 'society', 'books'] },
    { platform: 'Instagram', source: 'NPR Books', category: 'culture', route: '/instagram/user/npr', fallbackUrl: 'https://www.npr.org/rss/rss.php?id=1008', tags: ['culture', 'books', 'literature', 'authors'] },
    { platform: 'TikTok', source: 'TED Radio Hour', category: 'culture', route: '/tiktok/user/npr', fallbackUrl: 'https://feeds.npr.org/510298/podcast.xml', tags: ['culture', 'ideas', 'society', 'innovation'] }
  ]
};