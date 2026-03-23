import { useState, useEffect, lazy, Suspense } from 'react'
import { useSearch } from '../context/SearchContext'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { searchRSSContent } from '../rssService'
import { getRandomTrendingPosts } from '../socialMediaService'
import { getRandomCategoryPosts } from '../socialMediaPosts'
import { findClosestMatch, COMMON_KEYWORDS } from '../utils/fuzzySearch'
import Hero from '../components/sections/Hero'
import TopStories from '../components/sections/TopStories'
import DateTicker from '../components/layout/DateTicker'
import TrendingStories from '../components/sections/TrendingStories'

import AdBreak from '../components/common/AdBreak'

// Lazy load below-the-fold components
const AISummary = lazy(() => import('../components/sections/AISummary'))
const SocialMedia = lazy(() => import('../components/sections/SocialMedia'))
const Opinions = lazy(() => import('../components/sections/Opinions'))
const Videos = lazy(() => import('../components/sections/Videos'))
const Podcasts = lazy(() => import('../components/sections/Podcasts'))
const Search = lazy(() => import('../components/sections/Search'))

// Loading component
const SectionLoader = () => (
  <div style={{ 
    padding: '3rem', 
    textAlign: 'center', 
    color: '#666',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div className="spinner" style={{
      border: '3px solid #f3f3f3',
      borderTop: '3px solid #667eea',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      animation: 'spin 1s linear infinite'
    }} />
  </div>
)

function HomePage({
  email,
  setEmail,
  hotTopics,
  handleSubscribe
}) {
  const { topic, setTopic, hasActiveTopic } = useSearch()
  const [activeStory, setActiveStory] = useState(0)
  const [suggestedTopic, setSuggestedTopic] = useState(null)
  const [contentFilter, setContentFilter] = useState('all')
  
  // Content state - filters based on current topic
  const [topStories, setTopStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [opinions, setOpinions] = useState([])
  const [videos, setVideos] = useState([])
  const [podcasts, setPodcasts] = useState([])
  const [socialPosts, setSocialPosts] = useState([])
  const [loadingOpinions, setLoadingOpinions] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)
  const [loadingSocial, setLoadingSocial] = useState(true)
  
  // Track which sections are visible (for lazy loading)
  const [visibleSections, setVisibleSections] = useState({
    opinions: false,
    videos: false,
    podcasts: false,
    social: false
  })

  const handleSearch = (e) => {
    e.preventDefault()
    // Topic is already set via context
  }

  const handleTopicClick = (newTopic) => {
    setTopic(newTopic)
    // Scroll to top stories section
    setTimeout(() => {
      document.getElementById('news')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Load initial content (top stories only)
  useEffect(() => {
    const loadInitialContent = async () => {
      setLoading(true)

      try {
        console.log('Loading initial content, hasActiveTopic:', hasActiveTopic, 'topic:', topic)
        
        if (hasActiveTopic && topic && topic.trim().length > 0) {
          console.log(`[HomePage] Using comprehensive search for: "${topic}"`)
          const searchResults = await searchRSSContent(topic)
          console.log(`[HomePage] Search returned ${searchResults.length} results`)
          
          // Categorize search results
          const categorizedResults = {
            news: [],
            opinions: [],
            videos: [],
            podcasts: []
          }
          
          searchResults.forEach(item => {
            const type = (item.type || '').toLowerCase()
            const category = (item.category || '').toLowerCase()
            const source = (item.source || '').toLowerCase()
            
            if (type === 'video' || source.includes('youtube') || category.includes('video')) {
              categorizedResults.videos.push(item)
            } else if (type === 'podcast' || category.includes('podcast') || source.includes('podcast')) {
              categorizedResults.podcasts.push(item)
            } else if (type === 'opinion' || category.includes('opinion') || category.includes('commentary')) {
              categorizedResults.opinions.push(item)
            } else {
              categorizedResults.news.push(item)
            }
          })
          
          setTopStories(categorizedResults.news)
          setOpinions(categorizedResults.opinions)
          setVideos(categorizedResults.videos)
          setPodcasts(categorizedResults.podcasts)
          
          setSuggestedTopic(null)
          
        } else {
          // Load only top stories initially
          const newsData = await fetchRSSNews()
          setTopStories(newsData || [])
          setSuggestedTopic(null)
        }
      } catch (error) {
        console.error('Error loading initial content:', error)
        setTopStories([])
      } finally {
        setLoading(false)
      }
    }

    loadInitialContent()
  }, [topic, hasActiveTopic])

  // Load additional sections when they become visible
  useEffect(() => {
    const loadOpinions = async () => {
      if (!visibleSections.opinions || opinions.length > 0) return
      setLoadingOpinions(true)
      try {
        if (!hasActiveTopic) {
          const opinionsData = await fetchOpinions()
          setOpinions(opinionsData || [])
        }
      } catch (error) {
        console.error('Error loading opinions:', error)
      } finally {
        setLoadingOpinions(false)
      }
    }
    loadOpinions()
  }, [visibleSections.opinions, hasActiveTopic])

  useEffect(() => {
    const loadVideos = async () => {
      if (!visibleSections.videos || videos.length > 0) return
      setLoadingVideos(true)
      try {
        if (!hasActiveTopic) {
          const videosData = await fetchVideos()
          setVideos(videosData || [])
        }
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        setLoadingVideos(false)
      }
    }
    loadVideos()
  }, [visibleSections.videos, hasActiveTopic])

  useEffect(() => {
    const loadPodcasts = async () => {
      if (!visibleSections.podcasts || podcasts.length > 0) return
      setLoadingPodcasts(true)
      try {
        if (!hasActiveTopic) {
          const podcastsData = await fetchTrendingContent()
          setPodcasts(podcastsData || [])
        }
      } catch (error) {
        console.error('Error loading podcasts:', error)
      } finally {
        setLoadingPodcasts(false)
      }
    }
    loadPodcasts()
  }, [visibleSections.podcasts, hasActiveTopic])

  useEffect(() => {
    const loadSocial = async () => {
      if (!visibleSections.social || socialPosts.length > 0) return
      setLoadingSocial(true)
      try {
        const socialData = await getRandomTrendingPosts(12)
        if (hasActiveTopic && topic) {
          const filteredSocial = socialData.filter(post => {
            const content = `${post.title || ''} ${post.description || ''} ${post.content || ''}`.toLowerCase()
            return content.includes(topic.toLowerCase())
          })
          setSocialPosts(filteredSocial.length > 0 ? filteredSocial : getRandomCategoryPosts(12))
        } else {
          setSocialPosts(socialData.length > 0 ? socialData : getRandomCategoryPosts(12))
        }
      } catch (error) {
        console.error('Error loading social:', error)
        setSocialPosts(getRandomCategoryPosts(12))
      } finally {
        setLoadingSocial(false)
      }
    }
    loadSocial()
  }, [visibleSections.social, hasActiveTopic, topic])

  // Intersection Observer to detect when sections come into view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '200px', // Load 200px before section is visible
      threshold: 0.01
    }

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionName = entry.target.dataset.section
          if (sectionName) {
            setVisibleSections(prev => ({ ...prev, [sectionName]: true }))
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Observe all lazy-loaded sections
    const sections = ['opinions', 'videos', 'podcasts', 'social']
    sections.forEach(section => {
      const element = document.querySelector(`[data-section="${section}"]`)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <main className="main-content">
      {/* Date & News Ticker */}
      <DateTicker breakingNews={topStories.slice(0, 10).map(s => s.title).filter(Boolean)} />
      
      {suggestedTopic && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.95rem',
          borderBottom: '2px solid rgba(255,255,255,0.2)'
        }}>
          No results for "{topic}". Did you mean{' '}
          <button
            onClick={() => setTopic(suggestedTopic)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
              padding: '0.3rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '0.3rem'
            }}
          >
            {suggestedTopic}
          </button>
          ? Showing similar results below.
        </div>
      )}
      
      {/* Hero Section */}
      <Hero 
        visibleTopics={hotTopics}
        handleTopicClick={handleTopicClick}
      />
      
      {/* Trending Stories with Numbered Bubbles */}
      <TrendingStories stories={topStories} loading={loading} />
      
      <AdBreak type="standard" />
      
      {/* AI Summary - Lazy loaded */}
      <Suspense fallback={<SectionLoader />}>
        <AISummary 
          category="general"
          description="Get a quick AI-generated summary of today's most important news across all categories."
        />
      </Suspense>
      
      {/* Top Stories - Loaded immediately */}
      <TopStories 
        topStories={topStories} 
        loading={loading}
        activeStory={activeStory}
        setActiveStory={setActiveStory}
      />

      <AdBreak type="compact" />
      
      {/* Social Media - Lazy loaded on scroll */}
      <div data-section="social">
        <Suspense fallback={<SectionLoader />}>
          <SocialMedia 
            socialPosts={socialPosts}
            loadingSocial={loadingSocial}
          />
        </Suspense>
      </div>

      <AdBreak type="standard" />
      
      {/* Opinions - Lazy loaded on scroll */}
      <div data-section="opinions">
        <Suspense fallback={<SectionLoader />}>
          <Opinions 
            opinions={opinions}
            loadingOpinions={loadingOpinions}
          />
        </Suspense>
      </div>
      
      {/* Videos - Lazy loaded on scroll */}
      <div data-section="videos">
        <Suspense fallback={<SectionLoader />}>
          <Videos 
            videos={videos}
            loadingVideos={loadingVideos}
          />
        </Suspense>
      </div>

      <AdBreak type="compact" />
      
      {/* Podcasts - Lazy loaded on scroll */}
      <div data-section="podcasts">
        <Suspense fallback={<SectionLoader />}>
          <Podcasts 
            podcasts={podcasts}
            loadingPodcasts={loadingPodcasts}
          />
        </Suspense>
      </div>

      <AdBreak type="standard" />
      
      <Suspense fallback={<SectionLoader />}>
        <Search />
      </Suspense>
    </main>
  )
}

export default HomePage
