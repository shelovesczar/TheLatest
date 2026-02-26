import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams } from 'react-router-dom'
import { fetchTrendingContent } from '../newsService'
import { getImageProps } from '../utils/imageUtils'
import './AllPodcastsPage.css'

function AllPodcastsPage({ category = null }) {
  const { categoryName } = useParams()
  const { topic, hasActiveTopic } = useSearch()
  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(true)

  const filterContext = categoryName || category || (hasActiveTopic ? topic : null)

  useEffect(() => {
    loadPodcasts()
  }, [categoryName, category, topic])

  const loadPodcasts = async () => {
    setLoading(true)
    try {
      const podcastsData = await fetchTrendingContent()
      
      // Filter by category OR topic
      let filtered = podcastsData
      if (filterContext) {
        const lowerFilter = filterContext.toLowerCase()
        filtered = podcastsData.filter(item => {
          const searchFields = [
            item.title,
            item.description,
            item.hosts,
            item.category
          ].filter(Boolean).join(' ').toLowerCase()
          
          return searchFields.includes(lowerFilter)
        })
      }
      
      setPodcasts(filtered)
    } catch (error) {
      console.error('Error loading podcasts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="all-podcasts-page">
      {/* Hero Section */}
      <div className="all-podcasts-hero">
        <h1 className="all-podcasts-title">ALL PODCASTS</h1>
        <p className="all-podcasts-subtitle">
          {filterContext
            ? `Listen to podcasts about "${filterContext}"` 
            : 'Listen to the latest podcasts and audio content'}
        </p>
      </div>

      {/* Podcasts Grid */}
      <div className="all-podcasts-content">
        {loading ? (
          <div className="loading-state">Loading podcasts...</div>
        ) : podcasts.length === 0 ? (
          <div className="no-results">
            <p>No podcasts found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <div className="podcasts-grid">
            {podcasts.map((item, index) => (
              <article key={index} className="podcast-card">
                <div className="podcast-image">
                  {item.thumbnail && (
                    <img {...getImageProps(item.thumbnail, item.title, 'podcasts')} className="podcast-thumbnail" />
                  )}
                </div>
                <div className="podcast-card-content">
                  <h2 className="podcast-card-title">{item.title}</h2>
                  {item.hosts && (
                    <p className="podcast-card-hosts">{item.hosts}</p>
                  )}
                  {item.description && (
                    <p className="podcast-card-description">{item.description}</p>
                  )}
                  {item.publishedAt && (
                    <p className="podcast-card-date">{item.publishedAt}</p>
                  )}
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="listen-podcast-link"
                  >
                    Listen now →
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

export default AllPodcastsPage
