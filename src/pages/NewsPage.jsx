import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { Link } from 'react-router-dom'
import TopStories from '../components/sections/TopStories'
import Subscribe from '../components/sections/Subscribe'
import { fetchRSSNews, fetchTrendingContent } from '../newsService'
import './CategoryPage.css'

function NewsPage() {
  const { topic, hasActiveTopic } = useSearch()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeStory, setActiveStory] = useState(0)

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true)
      try {
        let newsData = []
        
        if (hasActiveTopic) {
          // Fetch news filtered by current topic
          const allNews = await fetchRSSNews()
          newsData = allNews.filter(article => {
            const content = `${article.title} ${article.description || ''} ${article.source || ''}`.toLowerCase()
            return content.includes(topic.toLowerCase())
          })
          
          // If not enough results, try trending content
          if (newsData.length < 10) {
            const trendingNews = await fetchTrendingContent(topic)
            newsData = [...newsData, ...trendingNews].slice(0, 30)
          }
        } else {
          // Show all news if no topic selected
          newsData = await fetchRSSNews()
        }
        
        setNews(newsData)
      } catch (error) {
        console.error('Error loading news:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNews()
  }, [topic, hasActiveTopic])

  return (
    <div className="category-page">
      <div className="category-hero" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop)`
      }}>
        <div className="category-hero-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1 className="category-title">
            {hasActiveTopic ? `${topic} News` : 'All News'}
          </h1>
          <p className="category-description">
            {hasActiveTopic 
              ? `Latest breaking news and stories about ${topic}`
              : 'All the latest breaking news and trending stories from around the world'
            }
          </p>
        </div>
      </div>

      <div className="category-content">
        <TopStories 
          topStories={news}
          loading={loading}
          activeStory={activeStory}
          setActiveStory={setActiveStory}
          categoryTitle={hasActiveTopic ? topic : 'All'}
        />

        <Subscribe />
      </div>
    </div>
  )
}

export default NewsPage
