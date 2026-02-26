import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { getRandomTrendingPosts } from '../socialMediaService'
import { getRandomCategoryPosts } from '../socialMediaPosts'
import { findClosestMatch, COMMON_KEYWORDS } from '../utils/fuzzySearch'
import Hero from '../components/sections/Hero'
import AISummary from '../components/sections/AISummary'
import TopStories from '../components/sections/TopStories'
import SocialMedia from '../components/sections/SocialMedia'
import Opinions from '../components/sections/Opinions'
import Videos from '../components/sections/Videos'
import Podcasts from '../components/sections/Podcasts'
import Search from '../components/sections/Search'
import Subscribe from '../components/sections/Subscribe'

function HomePage({
  email,
  setEmail,
  hotTopics,
  handleSubscribe
}) {
  const { topic, setTopic, hasActiveTopic } = useSearch()
  const [activeStory, setActiveStory] = useState(0)
  const [suggestedTopic, setSuggestedTopic] = useState(null)
  
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

  // Load all content
  useEffect(() => {
    const loadAllContent = async () => {
      setLoading(true)
      setLoadingOpinions(true)
      setLoadingVideos(true)
      setLoadingPodcasts(true)
      setLoadingSocial(true)

      try {
        console.log('Loading content, hasActiveTopic:', hasActiveTopic, 'topic:', topic)
        
        // Fetch all content in parallel
        const [newsData, opinionsData, videosData, podcastsData, socialData] = await Promise.all([
          fetchRSSNews(),
          fetchOpinions(),
          fetchVideos(),
          fetchTrendingContent(),
          getRandomTrendingPosts(12)
        ])

        console.log('Fetched data:', { 
          news: newsData?.length, 
          opinions: opinionsData?.length, 
          videos: videosData?.length,
          podcasts: podcastsData?.length,
          social: socialData?.length 
        })

        // Filter by topic if active
        const filterByTopic = (items) => {
          if (!hasActiveTopic || !items || !Array.isArray(items)) {
            console.log('No filtering needed, returning all items')
            setSuggestedTopic(null)
            return items || []
          }
          
          const filtered = items.filter(item => {
            const content = `${item.title || ''} ${item.description || ''} ${item.content || ''} ${item.source || ''} ${item.category || ''}`.toLowerCase()
            return content.includes(topic.toLowerCase())
          })
          
          console.log(`Filtered ${items.length} items to ${filtered.length} for topic "${topic}"`)
          
          // If no results found, try fuzzy matching
          if (filtered.length === 0 && hasActiveTopic) {
            const suggestion = findClosestMatch(topic, COMMON_KEYWORDS)
            if (suggestion) {
              console.log(`No results for "${topic}", suggesting "${suggestion}"`)
              setSuggestedTopic(suggestion)
              
              // Return results for the suggested topic
              const suggestedFiltered = items.filter(item => {
                const content = `${item.title || ''} ${item.description || ''} ${item.content || ''} ${item.source || ''} ${item.category || ''}`.toLowerCase()
                return content.includes(suggestion.toLowerCase())
              })
              return suggestedFiltered
            }
          } else {
            setSuggestedTopic(null)
          }
          
          return filtered
        }

        const filteredNews = filterByTopic(newsData)
        const filteredOpinions = filterByTopic(opinionsData)
        const filteredVideos = filterByTopic(videosData)
        const filteredPodcasts = filterByTopic(podcastsData)
        const filteredSocial = filterByTopic(socialData)

        setTopStories(filteredNews)
        setOpinions(filteredOpinions)
        setVideos(filteredVideos)
        setPodcasts(filteredPodcasts)
        // Use fetched social or fallback to category posts
        setSocialPosts(filteredSocial.length > 0 ? filteredSocial : getRandomCategoryPosts(12))
      } catch (error) {
        console.error('Error loading content:', error)
        // Use fallback content on error
        setTopStories([])
        setOpinions([])
        setVideos([])
        setPodcasts([])
        setSocialPosts(getRandomCategoryPosts(12))
      } finally {
        setLoading(false)
        setLoadingOpinions(false)
        setLoadingVideos(false)
        setLoadingPodcasts(false)
        setLoadingSocial(false)
      }
    }

    loadAllContent()
  }, [topic, hasActiveTopic])

  return (
    <main className="main-content">
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
      <Hero 
        visibleTopics={hotTopics}
        handleTopicClick={handleTopicClick}
      />
      
      {/* AI Summary - Full width for better flow */}
      <AISummary 
        category="general"
        description="Get a quick AI-generated summary of today's most important news across all categories."
      />
      
      {/* Top Stories */}
      <TopStories 
        topStories={topStories} 
        loading={loading}
        activeStory={activeStory}
        setActiveStory={setActiveStory}
      />

      <div className="ad-placeholder">AD</div>
      
      <SocialMedia 
        socialPosts={socialPosts}
        loadingSocial={loadingSocial}
      />

      <div className="ad-placeholder">AD</div>
      
      <Opinions 
        opinions={opinions}
        loadingOpinions={loadingOpinions}
      />
      
      <Videos 
        videos={videos}
        loadingVideos={loadingVideos}
      />

      <div className="ad-placeholder">AD</div>
      
      <Podcasts 
        podcasts={podcasts}
        loadingPodcasts={loadingPodcasts}
      />

      <div className="ad-placeholder">AD</div>
      
      <Search />
      
      <Subscribe 
        email={email}
        setEmail={setEmail}
        handleSubscribe={handleSubscribe}
      />
    </main>
  )
}

export default HomePage
