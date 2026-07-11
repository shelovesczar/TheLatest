import { useState, useEffect, useCallback, useLayoutEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'

// Import context
import { AuthProvider } from './context/AuthContext'
import { ConsentProvider, useConsent } from './context/ConsentContext'
import { SearchProvider } from './context/SearchContext'

// Always-visible layout — keep eager so there's no flash on any route
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import BottomDock from './components/layout/BottomDock'
import CookieConsentBanner from './components/common/CookieConsentBanner'
import ErrorBoundary from './components/common/ErrorBoundary'
import SeoManager from './components/common/SeoManager'

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
const TopicPage       = lazy(() => import('./pages/TopicPage'))
const SportsPage      = lazy(() => import('./components/sections/Sports'))
const SavedPage       = lazy(() => import('./pages/SavedPage'))
const FollowingPage   = lazy(() => import('./pages/FollowingPage'))
const DashboardPage   = lazy(() => import('./pages/DashboardPage'))
const ArticleReader   = lazy(() => import('./pages/ArticleReader'))
const PrivacyPage     = lazy(() => import('./pages/PrivacyPage'))
const TermsPage       = lazy(() => import('./pages/TermsPage'))
const AboutPage       = lazy(() => import('./pages/AboutPage'))
const EditorialStandardsPage = lazy(() => import('./pages/EditorialStandardsPage'))
const CorrectionsPage = lazy(() => import('./pages/CorrectionsPage'))
const ContactPage     = lazy(() => import('./pages/ContactPage'))

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

function AnalyticsTracker() {
  const location = useLocation()
  const { allowAnalytics } = useConsent()

  useEffect(() => {
    if (!allowAnalytics) {
      return
    }

    const payload = JSON.stringify({
      eventType: 'page-view',
      path: `${location.pathname}${location.search}`,
      pageTitle: document.title
    })

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/.netlify/functions/trackEngagement', blob)
        return
      }

      fetch('/.netlify/functions/trackEngagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload,
        keepalive: true
      }).catch(() => {})
    } catch {
      // Ignore analytics failures.
    }
  }, [allowAnalytics, location.pathname, location.search])

  return null
}

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    if (!window.history || !('scrollRestoration' in window.history)) {
      return undefined
    }

    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })

    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.search])

  return null
}

function App() {
  // State management
  const [menuOpen, setMenuOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [breakingNews, setBreakingNews] = useState([])
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) {
      return JSON.parse(saved)
    }
    // Default to dark mode if no preference saved (matches CSS default)
    return true
  })
  // Event handlers
  const handleSubscribe = useCallback((e) => {
    e.preventDefault()
    console.log('Subscribing email:', email)
    alert('Thank you for subscribing!')
    setEmail('')
  }, [email])

  const toggleTheme = useCallback(() => {
    setDarkMode(prev => !prev)
  }, [])

  const handleBreakingNewsChange = useCallback((nextBreakingNews = []) => {
    setBreakingNews((currentBreakingNews) => {
      const normalizedNext = Array.isArray(nextBreakingNews)
        ? nextBreakingNews.filter((headline) => typeof headline === 'string' && headline.trim().length > 0)
        : []

      if (currentBreakingNews.length === normalizedNext.length && currentBreakingNews.every((headline, index) => headline === normalizedNext[index])) {
        return currentBreakingNews
      }

      return normalizedNext
    })
  }, [])

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

  return (
    <Router>
      <ConsentProvider>
        <AuthProvider>
        <SearchProvider>
          <ScrollToTop />
          <AnalyticsTracker />
          <SeoManager />
          <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
          <Header 
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            setMenuOpen={setMenuOpen}
            breakingNews={breakingNews}
          />

          <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route 
              path="/" 
              element={
                <HomePage
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                  onBreakingNewsChange={handleBreakingNewsChange}
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
            <Route path="/following" element={<FollowingPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/editorial-standards" element={<EditorialStandardsPage />} />
            <Route path="/corrections" element={<CorrectionsPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* On-site article reader */}
            <Route path="/article" element={<ArticleReader />} />
            <Route path="/story/:storySlug" element={<ArticleReader />} />
            
            {/* All content pages (See More pages) */}
            <Route path="/all-news" element={<AllNewsPage />} />
            <Route path="/all-opinions" element={<AllOpinionsPage />} />
            <Route path="/all-videos" element={<AllVideosPage />} />
            <Route path="/all-podcasts" element={<AllPodcastsPage />} />
            
            {/* Search page */}
            <Route path="/search" element={<SearchResults />} />
            <Route path="/topic/:topicSlug" element={<TopicPage />} />
            <Route path="/topic/:topicSlug/all-news" element={<AllNewsPage />} />
            <Route path="/topic/:topicSlug/all-opinions" element={<AllOpinionsPage />} />
            <Route path="/topic/:topicSlug/all-videos" element={<AllVideosPage />} />
            <Route path="/topic/:topicSlug/all-podcasts" element={<AllPodcastsPage />} />
            
            {/* Category-specific All pages */}
            <Route path="/category/:categoryName/all-news" element={<AllNewsPage />} />
            <Route path="/category/:categoryName/all-opinions" element={<AllOpinionsPage />} />
            <Route path="/category/:categoryName/all-videos" element={<AllVideosPage />} />
            <Route path="/category/:categoryName/all-podcasts" element={<AllPodcastsPage />} />
            
            {/* Category pages */}
            <Route 
              path="/category/politics" 
              element={
                <CategoryPage 
                  category="politics"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/tech" 
              element={
                <CategoryPage 
                  category="tech"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
            <Route 
              path="/category/business" 
              element={
                <CategoryPage 
                  category="business"
                  email={email}
                  setEmail={setEmail}
                  handleSubscribe={handleSubscribe}
                />
              } 
            />
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
          <CookieConsentBanner />
          <Footer />
          </div>
        </SearchProvider>
        </AuthProvider>
      </ConsentProvider>
    </Router>
  )
}

export default App