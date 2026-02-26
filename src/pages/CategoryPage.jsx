import { useState, useEffect } from 'react'
import AISummary from '../components/sections/AISummary'
import TopStories from '../components/sections/TopStories'
import Opinions from '../components/sections/Opinions'
import Videos from '../components/sections/Videos'
import Podcasts from '../components/sections/Podcasts'
import Subscribe from '../components/sections/Subscribe'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import './CategoryPage.css'

function CategoryPage({ 
  category, 
  email, 
  setEmail, 
  handleSubscribe 
}) {
  const [categoryNews, setCategoryNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStory, setActiveStory] = useState(0)
  const [opinions, setOpinions] = useState([])
  const [videos, setVideos] = useState([])
  const [podcasts, setPodcasts] = useState([])
  const [loadingOpinions, setLoadingOpinions] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)

  const categoryConfig = {
    'top-stories': {
      title: 'Top Stories',
      description: 'Breaking news and trending stories from around the world.',
      aiPrompt: 'today\'s top breaking news and trending stories',
      image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop',
      keywords: ['trump', 'president', 'election', 'congress', 'senate', 'breaking', 'urgent'],
      sources: ['Associated Press', 'Reuters', 'CNN', 'BBC News', 'The Guardian', 'NPR']
    },
    'entertainment': {
      title: 'Entertainment',
      description: 'Movies, music, celebrities, and pop culture.',
      aiPrompt: 'entertainment and pop culture news',
      image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&h=500&fit=crop',
      keywords: [
        // Awards & Events
        'emmy', 'emmys', 'oscar', 'oscars', 'academy awards', 'golden globe', 'golden globes', 'grammy', 'grammys', 
        'tony', 'tonys', 'sag awards', 'bafta', 'cannes', 'sundance', 'film festival', 'award', 'awards', 'nomination',
        // Movies & Film
        'movie', 'movies', 'film', 'cinema', 'box office', 'premiere', 'trailer', 'director', 'actor', 'actress',
        'hollywood', 'marvel', 'disney', 'warner', 'paramount', 'universal', 'blockbuster', 'screenplay',
        // TV & Streaming
        'television', 'tv show', 'series', 'netflix', 'hbo', 'amazon prime', 'apple tv', 'hulu', 'disney+',
        'streaming', 'episode', 'season', 'finale', 'streaming wars', 'binge', 'show',
        // Music
        'music', 'album', 'song', 'concert', 'tour', 'billboard', 'spotify', 'artist', 'band', 'musician',
        'taylor swift', 'beyonce', 'drake', 'adele', 'bad bunny', 'debut', 'chart', 'hit', 'single',
        // Celebrities & Pop Culture
        'celebrity', 'celebrities', 'star', 'fame', 'red carpet', 'paparazzi', 'scandal', 'gossip',
        'kim kardashian', 'kanye', 'selena gomez', 'dwayne johnson', 'tom cruise', 'jennifer lawrence',
        // Industry
        'entertainment', 'pop culture', 'culture', 'viral', 'trending', 'meme', 'influencer', 'social media',
        'tiktok', 'instagram', 'youtube', 'podcast', 'interview', 'exclusive'
      ],
      sources: ['Variety', 'Entertainment Weekly', 'Hollywood Reporter', 'Rolling Stone', 'Billboard', 'E! News']
    },
    'sports': {
      title: 'Sports',
      description: 'Scores, highlights, and sports news from around the globe.',
      aiPrompt: 'sports news and highlights',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=500&fit=crop',
      keywords: [
        // Major Leagues
        'nfl', 'football', 'super bowl', 'quarterback', 'touchdown', 'nba', 'basketball', 'playoff', 'finals',
        'mlb', 'baseball', 'world series', 'nhl', 'hockey', 'stanley cup', 'mls', 'soccer', 'world cup',
        // Teams & Players
        'team', 'player', 'athlete', 'championship', 'game', 'match', 'score', 'win', 'loss', 'trade',
        'lebron', 'mahomes', 'messi', 'ronaldo', 'mbappe', 'curry', 'brady', 'coach', 'draft', 'rookie',
        // Events & Competitions
        'olympics', 'olympic', 'tournament', 'league', 'division', 'conference', 'season', 'preseason',
        'postseason', 'bowl game', 'march madness', 'ncaa', 'college football', 'college basketball',
        // Other Sports
        'tennis', 'golf', 'pga', 'boxing', 'ufc', 'mma', 'wrestling', 'motorsport', 'f1', 'nascar',
        'track and field', 'swimming', 'gymnastics', 'cricket', 'rugby', 'volleyball',
        // General
        'sports', 'athletic', 'competition', 'victory', 'defeat', 'highlight', 'injury', 'record',
        'stats', 'statistics', 'mvp', 'all-star', 'hall of fame', 'retire', 'comeback'
      ],
      sources: ['ESPN', 'Sports Illustrated', 'The Athletic', 'NBC Sports', 'Fox Sports', 'Bleacher Report']
    },
    'business-tech': {
      title: 'Business & Tech',
      description: 'Latest updates in business, technology, and innovation.',
      aiPrompt: 'business and technology news',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=500&fit=crop',
      keywords: [
        // Technology
        'tech', 'technology', 'ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai',
        'apple', 'google', 'microsoft', 'meta', 'facebook', 'amazon', 'tesla', 'spacex', 'nvidia',
        'iphone', 'android', 'ios', 'software', 'hardware', 'chip', 'semiconductor', 'cloud',
        'cybersecurity', 'hacking', 'data breach', 'privacy', 'encryption', 'blockchain', 'crypto',
        // Startups & Innovation
        'startup', 'unicorn', 'venture capital', 'vc', 'funding', 'investment', 'ipo', 'innovation',
        'silicon valley', 'tech hub', 'entrepreneur', 'founder', 'ceo', 'disruption', 'saas',
        // Business & Finance
        'business', 'economy', 'finance', 'market', 'stock', 'stocks', 'wall street', 'nasdaq', 'dow',
        'trading', 'investor', 'earnings', 'revenue', 'profit', 'loss', 'merger', 'acquisition',
        'bankruptcy', 'layoff', 'hiring', 'jobs', 'employment', 'unemployment', 'recession', 'inflation',
        // Crypto & Digital
        'bitcoin', 'ethereum', 'cryptocurrency', 'nft', 'web3', 'defi', 'digital currency', 'crypto market',
        // Industry
        'retail', 'e-commerce', 'supply chain', 'manufacturing', 'automotive', 'energy', 'banking',
        'real estate', 'pharmaceutical', 'healthcare tech', 'fintech', 'edtech'
      ],
      sources: ['TechCrunch', 'The Verge', 'Bloomberg', 'CNBC', 'Wall Street Journal', 'Financial Times']
    },
    'lifestyle': {
      title: 'Lifestyle',
      description: 'Health, wellness, travel, and lifestyle trends.',
      aiPrompt: 'lifestyle, health, and wellness news',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop',
      keywords: [
        // Health & Wellness
        'health', 'wellness', 'fitness', 'exercise', 'workout', 'gym', 'yoga', 'pilates', 'meditation',
        'mental health', 'therapy', 'mindfulness', 'stress', 'anxiety', 'sleep', 'nutrition', 'diet',
        'weight loss', 'healthy eating', 'organic', 'supplements', 'vitamins', 'medical', 'doctor',
        // Travel
        'travel', 'vacation', 'trip', 'destination', 'tourism', 'hotel', 'resort', 'airline', 'flight',
        'cruise', 'adventure', 'backpacking', 'beach', 'mountain', 'city break', 'wanderlust', 'explore',
        'airbnb', 'booking', 'travel tips', 'passport', 'visa', 'international',
        // Food & Dining
        'food', 'recipe', 'cooking', 'chef', 'restaurant', 'dining', 'cuisine', 'culinary', 'meal prep',
        'vegan', 'vegetarian', 'keto', 'paleo', 'gluten free', 'ingredient', 'baking', 'dessert',
        'wine', 'cocktail', 'coffee', 'foodie', 'michelin', 'food trends',
        // Fashion & Beauty
        'fashion', 'style', 'outfit', 'designer', 'runway', 'fashion week', 'beauty', 'makeup', 'skincare',
        'cosmetics', 'hair', 'salon', 'trending styles', 'wardrobe', 'accessories', 'jewelry',
        // Home & Design
        'home', 'interior design', 'decor', 'furniture', 'renovation', 'diy', 'gardening', 'organization',
        'minimalism', 'hygge', 'home improvement', 'real estate', 'apartment', 'house',
        // Lifestyle General
        'lifestyle', 'self care', 'personal development', 'productivity', 'habits', 'routine', 'balance',
        'work-life balance', 'relationships', 'dating', 'parenting', 'family', 'pets'
      ],
      sources: ['Health.com', 'WebMD', 'Travel + Leisure', 'Bon Appétit', 'Vogue', 'GQ']
    },
    'culture': {
      title: 'Culture',
      description: 'Arts, culture, society, and human interest stories.',
      aiPrompt: 'culture and arts news',
      image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=500&fit=crop',
      keywords: [
        // Arts
        'art', 'artist', 'painting', 'sculpture', 'exhibition', 'gallery', 'museum', 'curator', 'collection',
        'contemporary art', 'modern art', 'installation', 'visual arts', 'street art', 'graffiti',
        'photography', 'photographer', 'photo', 'portrait', 'landscape photography',
        // Literature & Books
        'books', 'book', 'literature', 'author', 'writer', 'novel', 'fiction', 'non-fiction', 'poetry',
        'bestseller', 'publishing', 'publisher', 'literary', 'reading', 'library', 'bookshelf',
        'pulitzer', 'booker', 'national book award', 'memoir', 'biography',
        // Performance & Theatre
        'theatre', 'theater', 'play', 'broadway', 'west end', 'performance', 'dance', 'ballet', 'opera',
        'symphony', 'orchestra', 'classical music', 'jazz', 'performing arts',
        // Architecture & Design
        'architecture', 'architect', 'building', 'design', 'urban design', 'sustainable design',
        'landmark', 'historic', 'preservation', 'heritage', 'unesco',
        // Society & Culture
        'culture', 'cultural', 'society', 'social', 'community', 'tradition', 'heritage', 'identity',
        'diversity', 'inclusion', 'equality', 'human rights', 'activism', 'movement', 'protest',
        'generation', 'millennials', 'gen z', 'trends', 'phenomenon',
        // History & Education
        'history', 'historical', 'ancient', 'archaeology', 'discovery', 'excavation', 'artifact',
        'education', 'university', 'college', 'academic', 'research', 'study', 'science',
        // Philosophy & Ideas
        'philosophy', 'intellectual', 'essay', 'debate', 'discourse', 'ideology', 'theory',
        'psychology', 'sociology', 'anthropology', 'ethics', 'morality'
      ],
      sources: ['The New Yorker', 'The Atlantic', 'Smithsonian', 'Artsy', 'Hyperallergic', 'Literary Hub']
    }
  }

  const config = categoryConfig[category] || categoryConfig['top-stories']

  useEffect(() => {
    const loadCategoryContent = async () => {
      setLoading(true)
      setLoadingOpinions(true)
      setLoadingVideos(true)
      setLoadingPodcasts(true)

      try {
        // Map category to RSS category name - ALWAYS pass a category to get relevant feeds
        let rssCategory = 'news'; // Default
        if (category === 'sports') rssCategory = 'sports';
        else if (category === 'business-tech') rssCategory = 'tech';
        else if (category === 'entertainment') rssCategory = 'entertainment';
        else if (category === 'lifestyle') rssCategory = 'lifestyle';
        else if (category === 'culture') rssCategory = 'culture';
        else if (category === 'top-stories') rssCategory = 'news';
        
        console.log(`[CategoryPage] Loading ${category} → RSS category: ${rssCategory}`);
        
        // Fetch news with category filter for better relevance
        let allNews = [];
        try {
          allNews = await fetchRSSNews(rssCategory);
          console.log(`[CategoryPage] Fetched ${allNews?.length || 0} articles from ${rssCategory}`);
        } catch (rssError) {
          console.error(`[CategoryPage] RSS fetch failed for ${rssCategory}:`, rssError.message);
          allNews = [];
        }
        
        // Use category-specific RSS feeds without fallback
        let finalNews;
        
        if (['sports', 'business-tech', 'entertainment', 'lifestyle', 'culture'].includes(category)) {
          // Categories with dedicated RSS feeds - use all articles from those feeds
          console.log(`[CategoryPage] Using all ${allNews.length} articles from dedicated ${rssCategory} feeds`);
          finalNews = allNews.slice(0, 15);
        } else {
          // Top-stories - filter general news by keywords
          console.log(`[CategoryPage] Filtering ${allNews.length} articles by ${category} keywords...`);
          const filteredNews = allNews.filter(article => {
            const content = `${article.title} ${article.description || ''} ${article.source || ''}`.toLowerCase()
            return config.keywords.some(keyword => content.includes(keyword.toLowerCase())) ||
                   config.sources.some(source => (article.source || '').toLowerCase().includes(source.toLowerCase()))
          })

          // Prioritize articles that match multiple keywords
          const scoredNews = filteredNews.map(article => {
            const content = `${article.title} ${article.description || ''}`.toLowerCase()
            const score = config.keywords.filter(keyword => content.includes(keyword.toLowerCase())).length
            return { ...article, relevanceScore: score }
          }).sort((a, b) => b.relevanceScore - a.relevanceScore)

          // Use filtered if we have enough, otherwise show all news
          finalNews = scoredNews.length >= 5 ? scoredNews.slice(0, 15) : allNews.slice(0, 10);
          console.log(`[CategoryPage] Filtered to ${finalNews.length} relevant articles from ${allNews.length} total`);
        }
        
        setCategoryNews(finalNews)
        setLoading(false)

        // Load opinions - fetch general opinions and filter by category keywords
        const opinionData = await fetchOpinions() // Always fetch from general opinion feeds
        if (['sports', 'business-tech', 'entertainment', 'lifestyle', 'culture'].includes(category)) {
          // For dedicated category pages, filter opinions by category keywords with enhanced strict matching
          const filteredOpinions = opinionData.filter(opinion => {
            const content = `${opinion.title || ''} ${opinion.description || ''} ${opinion.source || ''}`.toLowerCase()
            
            // Strong category indicators (high-value keywords specific to this category)
            const strongKeywords = category === 'sports' 
              ? ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'world cup', 'olympics', 'playoff', 'championship', 'espn', 'sports illustrated']
              : category === 'entertainment'
              ? ['oscar', 'emmy', 'grammy', 'hollywood', 'netflix', 'movie', 'film', 'album', 'concert', 'celebrity']
              : category === 'business-tech'
              ? ['tech', 'startup', 'ipo', 'silicon valley', 'apple', 'google', 'microsoft', 'ai', 'cryptocurrency', 'stock market']
              : category === 'lifestyle'
              ? ['health', 'wellness', 'travel', 'recipe', 'fitness', 'nutrition', 'vacation', 'yoga']
              : ['culture', 'art', 'museum', 'literature', 'books', 'theatre', 'photography'];
            
            // Check for strong keyword matches (if any strong keyword matches, accept it)
            const hasStrongMatch = strongKeywords.some(keyword => content.includes(keyword.toLowerCase()))
            if (hasStrongMatch) return true
            
            // Otherwise, require at least 3 regular keyword matches
            const matchCount = config.keywords.filter(keyword => content.includes(keyword.toLowerCase())).length
            return matchCount >= 3
          })
          console.log(`[CategoryPage] Filtered ${filteredOpinions.length} opinions for ${category} from ${opinionData.length} total (enhanced matching)`);
          console.log(`[CategoryPage] Sample opinion titles:`, filteredOpinions.slice(0, 3).map(o => o.title));
          setOpinions(filteredOpinions.slice(0, 6))
        } else {
          // For top-stories, filter by keywords
          const filteredOpinions = opinionData.filter(opinion => {
            const content = `${opinion.title || ''} ${opinion.description || ''} ${opinion.source || ''}`.toLowerCase()
            return config.keywords.some(keyword => content.includes(keyword.toLowerCase()))
          })
          setOpinions(filteredOpinions.length > 0 ? filteredOpinions.slice(0, 6) : opinionData.slice(0, 3))
        }
        setLoadingOpinions(false)

        // Load videos - fetch general videos and filter by category keywords
        const videoData = await fetchVideos() // Always fetch from general video feeds
        if (['sports', 'business-tech', 'entertainment', 'lifestyle', 'culture'].includes(category)) {
          // For dedicated category pages, filter videos by category keywords with enhanced strict matching
          const filteredVideos = videoData.filter(video => {
            const content = `${video.title || ''} ${video.description || ''} ${video.source || ''}`.toLowerCase()
            
            // Strong category indicators
            const strongKeywords = category === 'sports' 
              ? ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'world cup', 'olympics', 'playoff', 'championship', 'espn', 'sports illustrated']
              : category === 'entertainment'
              ? ['oscar', 'emmy', 'grammy', 'hollywood', 'netflix', 'movie', 'film', 'album', 'concert', 'celebrity']
              : category === 'business-tech'
              ? ['tech', 'startup', 'ipo', 'silicon valley', 'apple', 'google', 'microsoft', 'ai', 'cryptocurrency', 'stock market']
              : category === 'lifestyle'
              ? ['health', 'wellness', 'travel', 'recipe', 'fitness', 'nutrition', 'vacation', 'yoga']
              : ['culture', 'art', 'museum', 'literature', 'books', 'theatre', 'photography'];
            
            // Check for strong keyword matches
            const hasStrongMatch = strongKeywords.some(keyword => content.includes(keyword.toLowerCase()))
            if (hasStrongMatch) return true
            
            // Otherwise, require at least 3 regular keyword matches
            const matchCount = config.keywords.filter(keyword => content.includes(keyword.toLowerCase())).length
            return matchCount >= 3
          })
          console.log(`[CategoryPage] Filtered ${filteredVideos.length} videos for ${category} from ${videoData.length} total (enhanced matching)`);
          setVideos(filteredVideos.slice(0, 6))
        } else {
          // For top-stories, filter by keywords
          const filteredVideos = videoData.filter(video => {
            const content = `${video.title || ''} ${video.description || ''} ${video.source || ''}`.toLowerCase()
            return config.keywords.some(keyword => content.includes(keyword.toLowerCase()))
          })
          setVideos(filteredVideos.length > 0 ? filteredVideos.slice(0, 6) : videoData.slice(0, 3))
        }
        setLoadingVideos(false)

        // Load podcasts - fetch general podcasts and filter by category keywords
        const podcastData = await fetchTrendingContent() // Always fetch from general podcast feeds
        if (['sports', 'business-tech', 'entertainment', 'lifestyle', 'culture'].includes(category)) {
          // For dedicated category pages, filter podcasts by category keywords with enhanced strict matching
          const filteredPodcasts = podcastData.filter(podcast => {
            const content = `${podcast.title || ''} ${podcast.description || ''} ${podcast.source || ''}`.toLowerCase()
            
            // Strong category indicators
            const strongKeywords = category === 'sports' 
              ? ['nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'world cup', 'olympics', 'playoff', 'championship', 'espn', 'sports illustrated']
              : category === 'entertainment'
              ? ['oscar', 'emmy', 'grammy', 'hollywood', 'netflix', 'movie', 'film', 'album', 'concert', 'celebrity']
              : category === 'business-tech'
              ? ['tech', 'startup', 'ipo', 'silicon valley', 'apple', 'google', 'microsoft', 'ai', 'cryptocurrency', 'stock market']
              : category === 'lifestyle'
              ? ['health', 'wellness', 'travel', 'recipe', 'fitness', 'nutrition', 'vacation', 'yoga']
              : ['culture', 'art', 'museum', 'literature', 'books', 'theatre', 'photography'];
            
            // Check for strong keyword matches
            const hasStrongMatch = strongKeywords.some(keyword => content.includes(keyword.toLowerCase()))
            if (hasStrongMatch) return true
            
            // Otherwise, require at least 3 regular keyword matches
            const matchCount = config.keywords.filter(keyword => content.includes(keyword.toLowerCase())).length
            return matchCount >= 3
          })
          console.log(`[CategoryPage] Filtered ${filteredPodcasts.length} podcasts for ${category} from ${podcastData.length} total (enhanced matching)`);
          setPodcasts(filteredPodcasts.slice(0, 6))
        } else {
          // For top-stories, filter by keywords
          const filteredPodcasts = podcastData.filter(podcast => {
            const content = `${podcast.title || ''} ${podcast.description || ''} ${podcast.source || ''}`.toLowerCase()
            return config.keywords.some(keyword => content.includes(keyword.toLowerCase()))
          })
          setPodcasts(filteredPodcasts.length > 0 ? filteredPodcasts.slice(0, 6) : podcastData.slice(0, 3))
        }
        setLoadingPodcasts(false)

      } catch (error) {
        console.error('Failed to load category content:', error)
        setCategoryNews([])
        setOpinions([])
        setVideos([])
        setPodcasts([])
        setLoading(false)
        setLoadingOpinions(false)
        setLoadingVideos(false)
        setLoadingPodcasts(false)
      }
    }

    loadCategoryContent()
  }, [category])

  return (
    <main className="main-content category-page">
      <div className="category-hero">
        <h1 className="category-title">{config.title}</h1>
        <p className="category-description">{config.description}</p>
      </div>

      <AISummary 
        category={category}
        description={`AI-generated summary of ${config.aiPrompt}.`}
        categoryImage={config.image}
        categoryTitle={config.title}
        ignoreTopic={true}
      />

      <TopStories 
        topStories={categoryNews} 
        loading={loading}
        activeStory={activeStory}
        setActiveStory={setActiveStory}
        categoryTitle={config.title}
        categorySources={config.sources}
        categoryPath={`/category/${category}/all-news`}
      />

      <div className="ad-placeholder">AD</div>

      <Opinions 
        opinions={opinions}
        loadingOpinions={loadingOpinions}
        categoryPath={`/category/${category}/all-opinions`}
      />

      <div className="ad-placeholder">AD</div>

      <Videos 
        videos={videos}
        loadingVideos={loadingVideos}
        categoryPath={`/category/${category}/all-videos`}
      />

      <div className="ad-placeholder">AD</div>

      <Podcasts 
        podcasts={podcasts}
        loadingPodcasts={loadingPodcasts}
        categoryPath={`/category/${category}/all-podcasts`}
      />

      <div className="ad-placeholder">AD</div>

      <Subscribe 
        email={email}
        setEmail={setEmail}
        handleSubscribe={handleSubscribe}
      />
    </main>
  )
}

export default CategoryPage
