import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { dedupeContentItems } from './utils/contentDeduplication'
import './App.css'

/**
 * Extract trending topics from a set of news article headlines.
 * Algorithm:
 *   1. Split every headline into tokens.
 *   2. Collect runs of Title-Cased or ALL-CAPS words (proper noun phrases).
 *   3. Score by frequency across all headlines.
 *   4. Return the top N, filtered against a stop-list of words that are
 *      grammatically capitalized but carry no topical meaning.
 */
function extractTopicsFromHeadlines(articles, topN = 12) {
  const STOP = new Set([
    'The','A','An','In','On','At','By','For','Of','To','And','Or','But',
    'Is','Are','Was','Were','Has','Have','Had','Will','Would','Could',
    'Should','Be','Been','Being','With','This','That','These','Those',
    'From','Up','After','Before','As','Its','It','He','She','They','We',
    'His','Her','Their','Our','My','Your','It\'s','How','Why','What',
    'When','Where','Who','Says','Say','Said','New','Over','About','Into',
    'More','Than','Now','Just','Also','Still','Even','Not','No','So',
    'Report','Reports','Source','Sources','Amid','Despite','Calls',
  ])

  const freq = {}

  for (const article of articles) {
    const text = article.title || ''
    // Split on spaces and punctuation, keep only letter-sequences
    const tokens = text.split(/[\s\-–—/|:,;!?"()\[\]]+/).filter(Boolean)

    let phrase = []
    const flush = () => {
      if (phrase.length > 0) {
        const key = phrase.join(' ')
        // Minimum 1 word, but single words must be ≥4 chars to avoid noise
        if (phrase.length > 1 || (phrase.length === 1 && phrase[0].length >= 4)) {
          freq[key] = (freq[key] || 0) + 1
        }
        phrase = []
      }
    }

    for (const token of tokens) {
      // A proper-noun token: starts with uppercase, rest can be anything,
      // not in stop list, not a pure number
      const isProper = /^[A-Z]/.test(token) && !/^\d+$/.test(token) && !STOP.has(token)
      if (isProper) {
        phrase.push(token.replace(/['.]/g, '')) // strip trailing punctuation
      } else {
        flush()
      }
    }
    flush()
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([topic]) => topic)
}
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from './newsService'
import { fallbackSocialPosts, getRandomCategoryPosts } from './socialMediaPosts'
import { getRandomTrendingPosts } from './socialMediaService'

// Import context
import { SearchProvider } from './context/SearchContext'

// Always-visible layout — keep eager so there's no flash on any route
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import BottomDock from './components/layout/BottomDock'
import ErrorBoundary from './components/common/ErrorBoundary'

// Route-level code splitting — each page is its own JS chunk loaded on demand
const HomePage      = lazy(() => import('./pages/HomePage'))
const CategoryPage  = lazy(() => import('./pages/CategoryPage'))
const NewsPage      = lazy(() => import('./pages/NewsPage'))
const SocialPage    = lazy(() => import('./pages/SocialPage'))
const VideosPage    = lazy(() => import('./pages/VideosPage'))
const OpinionsPage  = lazy(() => import('./pages/OpinionsPage'))
const PodcastsPage  = lazy(() => import('./pages/PodcastsPage'))
const AllNewsPage   = lazy(() => import('./pages/AllNewsPage'))
const AllOpinionsPage = lazy(() => import('./pages/AllOpinionsPage'))
const AllVideosPage   = lazy(() => import('./pages/AllVideosPage'))
const AllPodcastsPage = lazy(() => import('./pages/AllPodcastsPage'))
const SearchResults   = lazy(() => import('./pages/SearchResults'))
const SportsPage      = lazy(() => import('./components/sections/Sports'))
const SavedPage       = lazy(() => import('./pages/SavedPage'))
const ArticleReader   = lazy(() => import('./pages/ArticleReader'))

// Minimal spinner shown while a route chunk is downloading
const RouteLoader = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh'
  }}>
    <div style={{
      width: 44, height: 44,
      border: '3px solid rgba(43,107,168,0.2)',
      borderTop: '3px solid var(--accent-color)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
  </div>
)

function App() {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeStory, setActiveStory] = useState(0)
  const [email, setEmail] = useState('')
  const [newsDropdownOpen, setNewsDropdownOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      return JSON.parse(saved)
    }
    // Default to dark mode if no preference saved (matches CSS default)
    return true
  })
  
  // Content state
  const [topStories, setTopStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [opinions, setOpinions] = useState([])
  const [videos, setVideos] = useState([])
  const [loadingOpinions, setLoadingOpinions] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [podcasts, setPodcasts] = useState([])
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)
  const [socialPosts, setSocialPosts] = useState(fallbackSocialPosts)
  const [loadingSocial, setLoadingSocial] = useState(false)
  
  // Hot topics — derived from live headlines, not a hardcoded list.
  // Seeded with a sensible default so the strip is never empty on first paint.
  const FALLBACK_TOPICS = ['Donald Trump', 'AI', 'Ukraine', 'Tech', 'Economy',
    'Climate Change', 'Elon Musk', 'Bitcoin', 'NASA', 'Elections']
  const [visibleTopics, setVisibleTopics] = useState(FALLBACK_TOPICS)

  // Event handlers
  const handleSearch = (e) => {
    e.preventDefault()
    console.log('Searching for:', searchQuery)
  }

  const handleSubscribe = (e) => {
    e.preventDefault()
    console.log('Subscribing email:', email)
    alert('Thank you for subscribing!')
    setEmail('')
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  const toggleTheme = () => {
    setDarkMode(!darkMode)
  }

  // Rotate social media posts - fetch real content
  const rotateSocialPosts = async () => {
    setLoadingSocial(true)
    try {
      const realPosts = await getRandomTrendingPosts(6)
      
      if (realPosts && realPosts.length > 0) {
        setSocialPosts(realPosts)
      } else {
        // Use random category posts for variety
        setSocialPosts(getRandomCategoryPosts(6))
      }
    } catch (error) {
      console.error('Failed to rotate social posts:', error)
      // Use random category posts
      setSocialPosts(getRandomCategoryPosts(6))
    } finally {
      setLoadingSocial(false)
    }
  }

  // Effects
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [menuOpen])

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    // Also set it on the body for additional styling hooks
    document.body.classList.toggle('dark-mode', darkMode)
    document.body.classList.toggle('light-mode', !darkMode)
  }, [darkMode])

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true)
      try {
        const news = await fetchRSSNews()
        if (news && news.length > 0) {
          const uniqueNews = dedupeContentItems(news)
          setTopStories(uniqueNews)
          // Derive hot topics directly from what's in today's headlines
          const extracted = extractTopicsFromHeadlines(uniqueNews, 12)
          if (extracted.length >= 4) {
            setVisibleTopics(extracted)
          }
        } else {
          setTopStories([])
        }
      } catch (error) {
        console.error('Failed to load news:', error)
        setTopStories([])
      } finally {
        setLoading(false)
      }
    }
    
    const loadOpinions = async () => {
      setLoadingOpinions(true)
      try {
        const opinionData = await fetchOpinions()
        setOpinions(dedupeContentItems(opinionData))
      } catch (error) {
        console.error('Failed to load opinions:', error)
        setOpinions([])
      } finally {
        setLoadingOpinions(false)
      }
    }

    // Load videos and podcasts together so we can cross-deduplicate
    const loadMedia = async () => {
      setLoadingVideos(true)
      setLoadingPodcasts(true)
      try {
        const [rawVideos, rawPodcasts] = await Promise.all([
          fetchVideos().catch(() => []),
          fetchTrendingContent().catch(() => [])
        ])
        const dedupedVideos   = dedupeContentItems(rawVideos   || [])
        const dedupedPodcasts = dedupeContentItems(rawPodcasts || [])

        // Remove any podcast item whose URL/title already appears in videos
        const videoKeys = new Set(
          dedupedVideos.map(v => (v.url || v.link || v.title || '').toLowerCase()).filter(Boolean)
        )
        const uniquePodcasts = dedupedPodcasts.filter(p => {
          const key = (p.url || p.link || p.title || '').toLowerCase()
          return key && !videoKeys.has(key)
        })

        setVideos(dedupedVideos)
        setPodcasts(uniquePodcasts)
      } catch (error) {
        console.error('Failed to load media:', error)
        setVideos([])
        setPodcasts([])
      } finally {
        setLoadingVideos(false)
        setLoadingPodcasts(false)
      }
    }

    // ── Priority-ordered loading ──────────────────────────────────────────────
    // 1. News first — above-the-fold, user sees it immediately
    loadNews()

    // 2. Opinions + media slightly deferred — they're below the fold on first
    //    paint; yielding a tick lets the browser finish painting news cards
    //    before kicking off 2 more network requests.
    const belowFoldTimer = setTimeout(() => {
      loadOpinions()
      loadMedia()
    }, 150)

    // 3. Social posts last — furthest below the fold; 800 ms is enough time
    //    for above-fold content to paint before we start fetching social feeds.
    const socialTimer = setTimeout(() => {
      rotateSocialPosts()
    }, 800)

    // Auto-refresh every 10 minutes
    const newsInterval = setInterval(() => {
      loadNews()
      loadOpinions()
      loadMedia()
    }, 10 * 60 * 1000)

    const socialInterval = setInterval(() => {
      rotateSocialPosts()
    }, 10 * 60 * 1000)

    return () => {
      clearTimeout(belowFoldTimer)
      clearTimeout(socialTimer)
      clearInterval(newsInterval)
      clearInterval(socialInterval)
    }
  }, [])

  return (
    <Router>
      <SearchProvider>
        <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
          <Header 
            menuOpen={menuOpen}
            toggleMenu={toggleMenu}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            newsDropdownOpen={newsDropdownOpen}
            setNewsDropdownOpen={setNewsDropdownOpen}
            setMenuOpen={setMenuOpen}
          />

          <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  activeStory={activeStory}
                  setActiveStory={setActiveStory}
                  email={email}
                  setEmail={setEmail}
                  topStories={topStories}
                  loading={loading}
                  opinions={opinions}
                  videos={videos}
                  loadingOpinions={loadingOpinions}
                  loadingVideos={loadingVideos}
                  podcasts={podcasts}
                  loadingPodcasts={loadingPodcasts}
                  socialPosts={socialPosts}
                  loadingSocial={loadingSocial}
                  hotTopics={visibleTopics}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            
            {/* New dedicated content pages */}
            <Route path="/news" element={<NewsPage />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/opinions" element={<OpinionsPage />} />
            <Route path="/podcasts" element={<PodcastsPage />} />
            
            {/* Apple News-style pages */}
            <Route path="/sports" element={<SportsPage />} />
            <Route path="/following" element={<SavedPage />} />

            {/* On-site article reader */}
            <Route path="/article" element={<ArticleReader />} />
            
            {/* All content pages (See More pages) */}
            <Route path="/all-news" element={<AllNewsPage />} />
            <Route path="/all-opinions" element={<AllOpinionsPage />} />
            <Route path="/all-videos" element={<AllVideosPage />} />
            <Route path="/all-podcasts" element={<AllPodcastsPage />} />
            
            {/* Search page */}
            <Route path="/search" element={<SearchResults />} />
            
            {/* Category-specific All pages */}
            <Route path="/category/:categoryName/all-news" element={<AllNewsPage />} />
            <Route path="/category/:categoryName/all-opinions" element={<AllOpinionsPage />} />
            <Route path="/category/:categoryName/all-videos" element={<AllVideosPage />} />
            <Route path="/category/:categoryName/all-podcasts" element={<AllPodcastsPage />} />
            
            {/* Category pages */}
            <Route 
              path="/category/top-stories" 
              element={
                <CategoryPage 
                  category="top-stories"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/business-tech" 
              element={
                <CategoryPage 
                  category="business-tech"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/entertainment" 
              element={
                <CategoryPage 
                  category="entertainment"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/sports" 
              element={
                <CategoryPage 
                  category="sports"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/lifestyle" 
              element={
                <CategoryPage 
                  category="lifestyle"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/culture" 
              element={
                <CategoryPage 
                  category="culture"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
          </Routes>
          </Suspense>
          </ErrorBoundary>

          <BottomDock />
          <Footer />
        </div>
      </SearchProvider>
    </Router>
  )
}

export default App