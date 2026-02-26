import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { searchRSSContent } from '../rssService'
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
        
        // If user has searched for a topic, use comprehensive search across all RSS feeds
        if (hasActiveTopic && topic && topic.trim().length > 0) {
          console.log(`[HomePage] Using comprehensive search for: "${topic}"`)
          
          // Search across ALL categories using the enhanced backend search
          const searchResults = await searchRSSContent(topic)
          console.log(`[HomePage] Search returned ${searchResults.length} results`)
          
          // Categorize search results by type
          const categorizedResults = {
            news: [],
            opinions: [],
            videos: [],
            podcasts: [],
            other: []
          }
          
          searchResults.forEach(item => {
            const type = (item.type || '').toLowerCase()
            const category = (item.category || '').toLowerCase()
            const source = (item.source || '').toLowerCase()
            
            // Categorize based on type, category, or source
            if (type === 'video' || source.includes('youtube') || category.includes('video')) {
              categorizedResults.videos.push(item)
            } else if (type === 'podcast' || category.includes('podcast') || source.includes('podcast')) {
              categorizedResults.podcasts.push(item)
            } else if (type === 'opinion' || category.includes('opinion') || category.includes('commentary')) {
              categorizedResults.opinions.push(item)
            } else {
              // Everything else goes to news
              categorizedResults.news.push(item)
            }
          })
          
          console.log('[HomePage] Categorized results:', {
            news: categorizedResults.news.length,
            opinions: categorizedResults.opinions.length,
            videos: categorizedResults.videos.length,
            podcasts: categorizedResults.podcasts.length
          })
          
          // Set all content from search results
          setTopStories(categorizedResults.news)
          setOpinions(categorizedResults.opinions)
          setVideos(categorizedResults.videos)
          setPodcasts(categorizedResults.podcasts)
          
          // Get social media posts related to topic
          const socialData = await getRandomTrendingPosts(12)
          const filteredSocial = socialData.filter(post => {
            const content = `${post.title || ''} ${post.description || ''} ${post.content || ''}`.toLowerCase()
            return content.includes(topic.toLowerCase())
          })
          setSocialPosts(filteredSocial.length > 0 ? filteredSocial : getRandomCategoryPosts(12))
          
          setSuggestedTopic(null)
          
        } else {
          // No active topic - fetch normal content
          console.log('[HomePage] Fetching default content (no topic)')
          
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

          setTopStories(newsData || [])
          setOpinions(opinionsData || [])
          setVideos(videosData || [])
          setPodcasts(podcastsData || [])
          setSocialPosts(socialData.length > 0 ? socialData : getRandomCategoryPosts(12))
          setSuggestedTopic(null)
        }
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
