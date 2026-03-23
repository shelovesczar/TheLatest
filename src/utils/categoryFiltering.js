/**
 * Category-based content filtering
 * Uses keywords to intelligently filter news, opinions, videos, and podcasts by category
 */

export const CATEGORY_KEYWORDS = {
  'top-stories': {
    keywords: [
      'breaking', 'urgent', 'alert', 'emergency', 'crisis', 'disaster',
      'president', 'congress', 'senate', 'white house', 'capitol',
      'election', 'vote', 'campaign', 'primary', 'ballot',
      'international', 'global', 'world', 'worldwide', 'countries',
      'scandal', 'investigation', 'criminal', 'arrest', 'court',
      'economic', 'recession', 'inflation', 'market', 'stocks',
      'trending', 'viral', 'top story', 'breaking news', 'latest news',
      'death', 'killed', 'attack', 'war', 'conflict', 'military'
    ]
  },
  'entertainment': {
    keywords: [
      'emmy', 'emmys', 'oscar', 'oscars', 'academy awards', 'golden globe', 'grammy', 'tony',
      'movie', 'movies', 'film', 'cinema', 'box office', 'premiere', 'trailer', 'director',
      'actor', 'actress', 'hollywood', 'marvel', 'disney', 'warner', 'paramount',
      'television', 'tv show', 'series', 'netflix', 'hbo', 'amazon prime', 'streaming',
      'music', 'album', 'song', 'concert', 'tour', 'billboard', 'spotify', 'artist',
      'celebrity', 'celebrities', 'star', 'red carpet', 'paparazzi', 'scandal', 'gossip',
      'taylor swift', 'beyonce', 'drake', 'adele', 'dwayne johnson', 'zendaya',
      'entertainment', 'pop culture', 'viral', 'trending', 'influencer', 'tiktok', 'youtube'
    ]
  },
  'sports': {
    keywords: [
      'nfl', 'football', 'super bowl', 'quarterback', 'touchdown', 'nba', 'basketball',
      'playoff', 'finals', 'mlb', 'baseball', 'world series', 'nhl', 'hockey',
      'stanley cup', 'mls', 'soccer', 'world cup', 'team', 'player', 'athlete',
      'championship', 'game', 'match', 'score', 'win', 'loss', 'trade', 'draft',
      'lebron', 'mahomes', 'messi', 'ronaldo', 'mbappe', 'curry', 'brady',
      'olympics', 'olympic', 'tournament', 'league', 'division', 'conference',
      'tennis', 'golf', 'pga', 'boxing', 'ufc', 'mma', 'wrestling', 'motorsport',
      'f1', 'nascar', 'mvp', 'all-star', 'hall of fame', 'retire', 'comeback'
    ]
  },
  'business-tech': {
    keywords: [
      'tech', 'technology', 'ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai',
      'apple', 'google', 'microsoft', 'meta', 'facebook', 'amazon', 'tesla', 'spacex', 'nvidia',
      'iphone', 'android', 'ios', 'software', 'hardware', 'chip', 'semiconductor', 'cloud',
      'cybersecurity', 'hacking', 'data breach', 'privacy', 'encryption', 'blockchain', 'crypto',
      'startup', 'unicorn', 'venture capital', 'vc', 'funding', 'investment', 'ipo', 'innovation',
      'silicon valley', 'entrepreneur', 'founder', 'ceo', 'disruption', 'saas',
      'business', 'economy', 'finance', 'market', 'stock', 'stocks', 'wall street', 'nasdaq',
      'trading', 'investor', 'earnings', 'revenue', 'profit', 'merger', 'acquisition',
      'bitcoin', 'ethereum', 'cryptocurrency', 'nft', 'web3', 'defi',
      'retail', 'e-commerce', 'supply chain', 'manufacturing', 'energy', 'banking', 'real estate',
      'fintech', 'edtech', 'proptech'
    ]
  },
  'lifestyle': {
    keywords: [
      'health', 'wellness', 'fitness', 'exercise', 'workout', 'gym', 'yoga', 'meditation',
      'mental health', 'therapy', 'mindfulness', 'stress', 'anxiety', 'sleep', 'nutrition', 'diet',
      'weight loss', 'healthy eating', 'organic', 'supplements', 'vitamins',
      'travel', 'vacation', 'trip', 'destination', 'tourism', 'hotel', 'resort', 'airline',
      'cruise', 'adventure', 'backpacking', 'beach', 'mountain', 'airbnb',
      'food', 'recipe', 'cooking', 'chef', 'restaurant', 'dining', 'cuisine', 'meal prep',
      'vegan', 'vegetarian', 'keto', 'paleo', 'wine', 'cocktail', 'coffee',
      'fashion', 'style', 'outfit', 'designer', 'runway', 'beauty', 'makeup', 'skincare',
      'home', 'interior design', 'decor', 'furniture', 'renovation', 'diy', 'gardening',
      'self care', 'personal development', 'productivity', 'relationships', 'parenting', 'pets'
    ]
  },
  'culture': {
    keywords: [
      'art', 'artist', 'painting', 'sculpture', 'exhibition', 'gallery', 'museum', 'curator',
      'literature', 'books', 'author', 'novel', 'poetry', 'writing', 'publishing',
      'theatre', 'theater', 'drama', 'broadway', 'play', 'performance', 'acting',
      'classical music', 'opera', 'symphony', 'concert', 'conductor',
      'film', 'cinema', 'documentary', 'independent film',
      'cultural', 'society', 'community', 'tradition', 'heritage', 'history',
      'human interest', 'people', 'stories', 'profiles', 'interviews',
      'philosophy', 'ethics', 'religion', 'spirituality', 'belief',
      'social issues', 'activism', 'advocacy', 'social justice'
    ]
  }
}

const CATEGORY_ALIASES = {
  'business-tech': 'business-tech',
  business: 'business-tech',
  tech: 'business-tech',
  technology: 'business-tech',
  businesstech: 'business-tech',
  'top-stories': 'top-stories',
  topstories: 'top-stories',
}

const resolveCategoryName = (categoryName) => {
  if (!categoryName) return null

  const normalized = String(categoryName).trim().toLowerCase()
  if (CATEGORY_KEYWORDS[normalized]) return normalized
  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized]

  const compact = normalized.replace(/[^a-z]/g, '')
  if (CATEGORY_ALIASES[compact]) return CATEGORY_ALIASES[compact]

  return normalized
}

const getSearchText = (item = {}) =>
  [
    item.title,
    item.description,
    item.content,
    item.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const getKeywordMatchCount = (searchText, keywords) =>
  keywords.filter((keyword) => searchText.includes(keyword.toLowerCase())).length

/**
 * Filter content by category using keyword matching
 * @param {Array} items - Array of articles/content to filter
 * @param {string} categoryName - Category name (e.g., 'business-tech')
 * @param {number} minKeywordMatches - Minimum keyword matches required (default: 1)
 * @param {Object} options - Filtering options
 * @param {boolean} options.strict - When true, returns only matched content for known categories
 * @returns {Array} Filtered items
 */
export function filterContentByCategory(items, categoryName, minKeywordMatches = 1, options = {}) {
  const { strict = false } = options

  if (!Array.isArray(items)) {
    return [];
  }

  if (!categoryName) {
    return items;
  }

  const resolvedCategory = resolveCategoryName(categoryName)
  const keywords = CATEGORY_KEYWORDS[resolvedCategory]?.keywords

  if (!keywords || keywords.length === 0) {
    return items;
  }

  const scoredItems = items.map((item) => {
    const searchText = getSearchText(item)
    const matchCount = getKeywordMatchCount(searchText, keywords)
    return { item, matchCount }
  })

  const strictlyMatched = scoredItems
    .filter(({ matchCount }) => matchCount >= minKeywordMatches)
    .map(({ item }) => item)

  if (strictlyMatched.length > 0) {
    return strictlyMatched
  }

  const looselyMatched = scoredItems
    .filter(({ matchCount }) => matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .map(({ item }) => item)

  if (looselyMatched.length > 0) {
    return looselyMatched
  }

  if (strict) {
    return []
  }

  return items
}

/**
 * Get all keywords for a category
 * @param {string} categoryName - Category name
 * @returns {Array} Array of keywords
 */
export function getCategoryKeywords(categoryName) {
  const resolvedCategory = resolveCategoryName(categoryName)
  return CATEGORY_KEYWORDS[resolvedCategory]?.keywords || [];
}

/**
 * Check if content belongs to a category
 * @param {Object} item - Content item to check
 * @param {string} categoryName - Category name
 * @returns {boolean} True if content matches category
 */
export function belongsToCategory(item, categoryName) {
  const keywords = getCategoryKeywords(categoryName);
  if (keywords.length === 0) return false;

  const searchText = getSearchText(item)

  return keywords.some((keyword) =>
    searchText.includes(keyword.toLowerCase())
  );
}
