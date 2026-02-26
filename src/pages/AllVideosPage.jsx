import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams } from 'react-router-dom'
import { fetchVideos } from '../newsService'
import './AllVideosPage.css'

function AllVideosPage({ category = null }) {
  const { categoryName } = useParams()
  const { topic, hasActiveTopic } = useSearch()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  const filterContext = categoryName || category || (hasActiveTopic ? topic : null)

  useEffect(() => {
    loadVideos()
  }, [categoryName, category, topic])

  const loadVideos = async () => {
    setLoading(true)
    try {
      const videosData = await fetchVideos()
      
      // Filter by category OR topic
      let filtered = videosData
      if (filterContext) {
        const lowerFilter = filterContext.toLowerCase()
        filtered = videosData.filter(item => {
          const searchFields = [
            item.title,
            item.description,
            item.source,
            item.category
          ].filter(Boolean).join(' ').toLowerCase()
          
          return searchFields.includes(lowerFilter)
        })
      }
      
      setVideos(filtered)
    } catch (error) {
      console.error('Error loading videos:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="all-videos-page">
      {/* Hero Section */}
      <div className="all-videos-hero">
        <h1 className="all-videos-title">ALL VIDEOS</h1>
        <p className="all-videos-subtitle">
          {filterContext
            ? `Watch the latest videos on "${filterContext}"` 
            : 'Watch the latest news videos and reports'}
        </p>
      </div>

      {/* Videos Grid */}
      <div className="all-videos-content">
        {loading ? (
          <div className="loading-state">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="no-results">
            <p>No videos found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <div className="videos-grid">
            {videos.map((item, index) => (
              <article key={index} className="video-card">
                <div className="video-thumbnail">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title} />
                  )}
                  <div className="play-button">
                    <i className="fas fa-play"></i>
                  </div>
                  {item.duration && (
                    <span className="video-duration">{item.duration}</span>
                  )}
                </div>
                <div className="video-card-content">
                  <h2 className="video-card-title">{item.title}</h2>
                  {item.source && (
                    <p className="video-card-source">{item.source}</p>
                  )}
                  {item.publishedAt && (
                    <p className="video-card-date">{item.publishedAt}</p>
                  )}
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="watch-video-link"
                  >
                    Watch video →
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

export default AllVideosPage
