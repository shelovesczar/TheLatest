import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from './newsService'
import { fallbackSocialPosts, getRandomCategoryPosts } from './socialMediaPosts'
import { getRandomTrendingPosts } from './socialMediaService'

// Import context
import { SearchProvider } from './context/SearchContext'

// Import components
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import NewsPage from './pages/NewsPage'
import SocialPage from './pages/SocialPage'
import VideosPage from './pages/VideosPage'
import OpinionsPage from './pages/OpinionsPage'
import PodcastsPage from './pages/PodcastsPage'
import AllNewsPage from './pages/AllNewsPage'
import AllOpinionsPage from './pages/AllOpinionsPage'
import AllVideosPage from './pages/AllVideosPage'
import AllPodcastsPage from './pages/AllPodcastsPage'
import SearchResults from './pages/SearchResults'

function App() {
  // State management
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeStory, setActiveStory] = useState(0)
  const [email, setEmail] = useState('')
  const [newsDropdownOpen, setNewsDropdownOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : false
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
  
  // Hot topics state with rotation
  const allTopics = [
    'Donald Trump', 'AI', 'Stock Market', 'Tech', 'Greenland',
    'Minneapolis', 'The Fed', 'Golden Globes', 'Super Bowl', 'Climate Change',
    'Elon Musk', 'Chat GPT', 'Ukraine', 'Bitcoin', 'NASA',
    'Taylor Swift', 'NFL', 'Elections', 'Apple', 'SpaceX'
  ]
  const [visibleTopics, setVisibleTopics] = useState(allTopics.slice(0, 10))

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
  }, [darkMode])

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true)
      try {
        console.log('Fetching news...')
        const news = await fetchRSSNews()
        console.log('News fetched:', news.length, 'articles')
        if (news && news.length > 0) {
          setTopStories(news)
        } else {
          console.error('No news articles returned')
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
        setOpinions(opinionData)
      } catch (error) {
        console.error('Failed to load opinions:', error)
        setOpinions([])
      } finally {
        setLoadingOpinions(false)
      }
    }

    const loadVideos = async () => {
      setLoadingVideos(true)
      try {
        const videoData = await fetchVideos()
        setVideos(videoData)
      } catch (error) {
        console.error('Failed to load videos:', error)
        setVideos([])
      } finally {
        setLoadingVideos(false)
      }
    }

    const loadPodcasts = async () => {
      setLoadingPodcasts(true)
      try {
        const podcastData = await fetchTrendingContent()
        setPodcasts(podcastData)
      } catch (error) {
        console.error('Failed to load podcasts:', error)
        setPodcasts([])
      } finally {
        setLoadingPodcasts(false)
      }
    }

    loadNews()
    loadOpinions()
    loadVideos()
    loadPodcasts()
    
    // Load initial social media posts
    rotateSocialPosts()

    // Auto-refresh news content every 10 minutes
    const newsInterval = setInterval(() => {
      loadNews()
      loadOpinions()
      loadVideos()
      loadPodcasts()
    }, 10 * 60 * 1000)

    // Rotate social media posts every 10 minutes
    const socialInterval = setInterval(() => {
      rotateSocialPosts()
    }, 10 * 60 * 1000)

    // Rotate hot topics every 7 minutes
    const topicInterval = setInterval(() => {
      setVisibleTopics(prevTopics => {
        const currentIndex = allTopics.indexOf(prevTopics[0])
        const nextIndex = (currentIndex + 10) % allTopics.length
        return allTopics.slice(nextIndex, nextIndex + 10).concat(
          allTopics.slice(0, Math.max(0, nextIndex + 10 - allTopics.length))
        )
      })
    }, 7 * 60 * 1000)

    return () => {
      clearInterval(newsInterval)
      clearInterval(socialInterval)
      clearInterval(topicInterval)
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

          <Footer />
        </div>
      </SearchProvider>
    </Router>
  )
}

export default App