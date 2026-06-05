const buildTopicPath = (slug) => `/topic/${slug}`

const createTopic = (label, slug, query, subtitle, feedCategory, image) => ({
  label,
  slug,
  target: buildTopicPath(slug),
  title: label,
  query,
  subtitle,
  feedCategory,
  image
})

const IMAGE_SET = {
  news: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop',
  politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=500&fit=crop',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop',
  business: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&h=500&fit=crop',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=500&fit=crop',
  entertainment: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=500&fit=crop',
  lifestyle: 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=800&h=500&fit=crop',
  culture: 'https://images.unsplash.com/photo-1507842217343-583f7270bfed?w=800&h=500&fit=crop'
}

const NEWS_TOPICS = [
  createTopic('U.S.', 'us-news', 'u.s. news', 'National reporting, federal policy, and the stories moving the American agenda.', 'news', IMAGE_SET.news),
  createTopic('World', 'world-news', 'world news', 'International conflicts, diplomacy, and the global stories reshaping the map.', 'news', IMAGE_SET.news),
  createTopic('The Media', 'media-industry', 'media industry', 'The companies, creators, and power shifts redefining how news reaches audiences.', 'news', IMAGE_SET.news)
]

const POLITICS_TOPICS = [
  createTopic('Trump', 'trump', 'trump', 'Coverage of Donald Trump, his legal fights, campaign moves, and political influence.', 'news', IMAGE_SET.politics),
  createTopic('Congress', 'congress', 'congress', 'The House, Senate, budget fights, and the votes shaping federal policy.', 'news', IMAGE_SET.politics),
  createTopic('Supreme Court', 'supreme-court', 'supreme court', 'Major rulings, legal arguments, and the constitutional fights before the court.', 'news', IMAGE_SET.politics),
  createTopic('Elections', 'elections', 'elections', 'Campaign strategy, voter turnout, battlegrounds, and race-by-race shifts.', 'news', IMAGE_SET.politics),
  createTopic('Polls', 'polls', 'polls', 'Approval ratings, race tracking, and the numbers driving the political narrative.', 'news', IMAGE_SET.politics)
]

const TECH_TOPICS = [
  createTopic('Tech News', 'technology', 'technology', 'The broad platform shift across AI, software, devices, and startup ecosystems.', 'tech', IMAGE_SET.tech),
  createTopic('AI', 'ai', 'artificial intelligence', 'Models, labs, regulation, and the companies racing to define applied AI.', 'tech', IMAGE_SET.tech),
  createTopic('Gadgets', 'gadgets', 'gadgets', 'Phones, wearables, hardware launches, and the products competing for daily use.', 'tech', IMAGE_SET.tech),
  createTopic('Cybersecurity', 'cybersecurity', 'cybersecurity', 'Breaches, cyberwarfare, digital safety, and the response across industry and government.', 'tech', IMAGE_SET.tech),
  createTopic('Gaming', 'gaming', 'gaming', 'Studios, platforms, new releases, and the business of interactive entertainment.', 'tech', IMAGE_SET.tech)
]

const BUSINESS_TOPICS = [
  createTopic('Economy', 'economy', 'economy', 'Inflation, growth, labor, and the macro signals shaping business decisions.', 'business', IMAGE_SET.business),
  createTopic('Markets', 'markets', 'markets', 'Stocks, bonds, commodities, and the trades defining investor sentiment.', 'business', IMAGE_SET.business),
  createTopic('Companies', 'companies', 'companies', 'Corporate strategy, major leadership calls, and the firms under the sharpest focus.', 'business', IMAGE_SET.business),
  createTopic('CEOs', 'ceos', 'ceos', 'Executive moves, succession fights, and the people steering the largest organizations.', 'business', IMAGE_SET.business),
  createTopic('Deals', 'deals', 'deals', 'Mergers, acquisitions, partnerships, and the transactions redrawing industries.', 'business', IMAGE_SET.business)
]

const SPORTS_TOPICS = [
  createTopic('Football', 'football', 'football', 'NFL, college football, transfer news, and the biggest matchups on the board.', 'sports', IMAGE_SET.sports),
  createTopic('Soccer', 'soccer', 'soccer', 'Global football from club drama to tournaments and transfer-window pressure.', 'sports', IMAGE_SET.sports),
  createTopic('Basketball', 'basketball', 'basketball', 'NBA, college hoops, stars, coaching shifts, and postseason momentum.', 'sports', IMAGE_SET.sports),
  createTopic('Baseball', 'baseball', 'baseball', 'MLB race tracking, prospect movement, and the season’s defining storylines.', 'sports', IMAGE_SET.sports),
  createTopic('Tennis', 'tennis', 'tennis', 'Grand Slams, tour form, and the players driving the modern game.', 'sports', IMAGE_SET.sports),
  createTopic('Golf', 'golf', 'golf', 'Majors, tour rivalries, and the events shaping professional golf.', 'sports', IMAGE_SET.sports)
]

const ENTERTAINMENT_TOPICS = [
  createTopic('TV', 'tv', 'tv', 'Prestige series, ratings fights, networks, and the shows dominating conversation.', 'entertainment', IMAGE_SET.entertainment),
  createTopic('Movies', 'movies', 'movies', 'Box office, awards races, trailers, and the films shaping the release calendar.', 'entertainment', IMAGE_SET.entertainment),
  createTopic('Music', 'music', 'music', 'Albums, tours, streaming performance, and the artists defining the moment.', 'entertainment', IMAGE_SET.entertainment),
  createTopic('Books', 'books', 'books', 'Publishing, authors, critical reception, and the titles breaking through culture.', 'culture', IMAGE_SET.culture),
  createTopic('Celebrities', 'celebrities', 'celebrity', 'Profiles, interviews, reputation swings, and the personalities dominating entertainment news.', 'entertainment', IMAGE_SET.entertainment),
  createTopic('Streaming', 'streaming', 'streaming', 'Platform strategy, subscriber battles, and the business behind on-demand entertainment.', 'entertainment', IMAGE_SET.entertainment)
]

const LIFESTYLE_TOPICS = [
  createTopic('Cars', 'cars', 'cars', 'Automotive launches, EV competition, and the next generation of mobility.', 'lifestyle', IMAGE_SET.lifestyle),
  createTopic('Travel', 'travel', 'travel', 'Destinations, airlines, hospitality, and the shifts changing how people move.', 'lifestyle', IMAGE_SET.lifestyle),
  createTopic('Fashion', 'fashion', 'fashion', 'Designers, runways, retail moves, and the looks shaping the season.', 'lifestyle', IMAGE_SET.lifestyle),
  createTopic('Food & Drink', 'food-drink', 'food and drink', 'Restaurants, chefs, drinks, and the culture around what people consume.', 'lifestyle', IMAGE_SET.lifestyle),
  createTopic('Home & Garden', 'home-garden', 'home and garden', 'Interior trends, renovation ideas, and the products changing daily living.', 'lifestyle', IMAGE_SET.lifestyle),
  createTopic('Family', 'family', 'family', 'Parenting, relationships, education, and the stories shaping family life.', 'lifestyle', IMAGE_SET.lifestyle)
]

const TOPIC_GROUPS = {
  news: NEWS_TOPICS,
  politics: POLITICS_TOPICS,
  tech: TECH_TOPICS,
  business: BUSINESS_TOPICS,
  sports: SPORTS_TOPICS,
  entertainment: ENTERTAINMENT_TOPICS,
  lifestyle: LIFESTYLE_TOPICS
}

const allTopics = Object.values(TOPIC_GROUPS).flat()

export const TOPIC_PAGE_CONFIG = Object.fromEntries(
  allTopics.map((topic) => [topic.slug, topic])
)

export const getTopicPageConfig = (slug) => TOPIC_PAGE_CONFIG[slug] || null

export const NAV_ITEMS = [
  {
    label: 'News',
    target: '/category/top-stories',
    items: NEWS_TOPICS,
    matchPaths: ['/category/top-stories', '/all-news', ...NEWS_TOPICS.map((item) => item.target)]
  },
  {
    label: 'Politics',
    target: '/category/politics',
    items: POLITICS_TOPICS,
    matchPaths: ['/category/politics', ...POLITICS_TOPICS.map((item) => item.target)]
  },
  {
    label: 'Tech',
    target: '/category/tech',
    items: TECH_TOPICS,
    matchPaths: ['/category/tech', ...TECH_TOPICS.map((item) => item.target)]
  },
  {
    label: 'Business',
    target: '/category/business',
    items: BUSINESS_TOPICS,
    matchPaths: ['/category/business', '/category/business-tech', ...BUSINESS_TOPICS.map((item) => item.target)]
  },
  {
    label: 'Sports',
    target: '/category/sports',
    items: SPORTS_TOPICS,
    matchPaths: ['/category/sports', ...SPORTS_TOPICS.map((item) => item.target)]
  },
  {
    label: 'Entertainment',
    target: '/category/entertainment',
    items: ENTERTAINMENT_TOPICS,
    matchPaths: ['/category/entertainment', '/category/culture', ...ENTERTAINMENT_TOPICS.map((item) => item.target)]
  },
  {
    label: 'Lifestyle',
    target: '/category/lifestyle',
    items: LIFESTYLE_TOPICS,
    matchPaths: ['/category/lifestyle', ...LIFESTYLE_TOPICS.map((item) => item.target)]
  }
]