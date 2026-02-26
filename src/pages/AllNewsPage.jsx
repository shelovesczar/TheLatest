import { useState, useEffect, useRef } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams } from 'react-router-dom'
import { fetchRSSNews } from '../newsService'
import { getImageProps } from '../utils/imageUtils'
import './AllNewsPage.css'

function AllNewsPage({ category = null }) {
  const { categoryName } = useParams()
  const { topic, hasActiveTopic } = useSearch()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState('ALL')

  // Truncate text based on aspect ratio
  const getDynamicTruncation = (imageUrl, text) => {
    if (!text) return '';
    
    const img = new Image();
    img.src = imageUrl;
    
    // Default length
    let maxLength = 120;
    
    // This will run async, but we'll use a default for now
    // The image aspect ratio check happens in real-time in the browser
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    
    if (aspectRatio > 1.5) maxLength = 180; // Wide image
    else if (aspectRatio > 1.2) maxLength = 150;
    else if (aspectRatio < 0.8) maxLength = 80; // Tall image
    
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  // Use URL category, prop category, or search topic (in that order)
  const filterContext = categoryName || category || (hasActiveTopic ? topic : null)

  useEffect(() => {
    loadNews()
  }, [categoryName, category, topic])

  const loadNews = async () => {
    setLoading(true)
    try {
      const newsData = await fetchRSSNews()
      
      // Filter by category OR topic
      let filtered = newsData
      if (filterContext) {
        const lowerFilter = filterContext.toLowerCase()
        filtered = newsData.filter(item => {
          const searchFields = [
            item.title,
            item.description,
            item.content,
            item.source,
            item.category
          ].filter(Boolean).join(' ').toLowerCase()
          
          return searchFields.includes(lowerFilter)
        })
      }
      
      setNews(filtered)
    } catch (error) {
      console.error('Error loading news:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique sources from news
  const sources = ['ALL', ...new Set(news.map(item => item.source))]

  // Filter by selected source
  const filteredNews = selectedSource === 'ALL' 
    ? news 
    : news.filter(item => item.source === selectedSource)

  return (
    <div className="all-news-page">
      {/* Hero Section */}
      <div className="all-news-hero">
        <h1 className="all-news-title">ALL NEWS</h1>
        <p className="all-news-subtitle">
          {filterContext
            ? `Breaking news and trending stories for "${filterContext}"` 
            : 'Breaking news and trending stories from around the world'}
        </p>
      </div>

      {/* Source Filter */}
      <div className="source-filter-container">
        <div className="source-pills">
          {sources.map((source) => (
            <button
              key={source}
              className={`source-pill ${selectedSource === source ? 'active' : ''}`}
              onClick={() => setSelectedSource(source)}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      {/* News Grid */}
      <div className="all-news-content">
        {loading ? (
          <div className="loading-state">Loading news...</div>
        ) : filteredNews.length === 0 ? (
          <div className="no-results">
            <p>No news articles found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <div className="news-grid">
            {filteredNews.map((item, index) => (
              <article key={index} className="news-card">
                {item.image && (
                  <div className="news-card-image">
                    <img {...getImageProps(item.image, item.title, 'news')} />
                  </div>
                )}
                <div className="news-card-content">
                  <div className="news-card-meta">
                    <span className="news-card-source">{item.source}</span>
                    {item.publishedAt && (
                      <span className="news-card-time">{item.publishedAt}</span>
                    )}
                  </div>
                  <h2 className="news-card-headline">{item.title}</h2>
                  {item.description && (
                    <p className="news-card-description">
                      {item.image 
                        ? getDynamicTruncation(item.image, item.description)
                        : item.description.substring(0, 120) + (item.description.length > 120 ? '...' : '')
                      }
                    </p>
                  )}
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="read-more-link"
                  >
                    Read full story →
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AllNewsPage
