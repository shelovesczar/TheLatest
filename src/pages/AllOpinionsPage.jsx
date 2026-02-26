import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams } from 'react-router-dom'
import { fetchOpinions } from '../newsService'
import { getImageProps } from '../utils/imageUtils'
import './AllOpinionsPage.css'

function AllOpinionsPage({ category = null }) {
  const { categoryName } = useParams()
  const { topic, hasActiveTopic } = useSearch()
  const [opinions, setOpinions] = useState([])
  const [loading, setLoading] = useState(true)

  const filterContext = categoryName || category || (hasActiveTopic ? topic : null)

  useEffect(() => {
    loadOpinions()
  }, [categoryName, category, topic])

  const loadOpinions = async () => {
    setLoading(true)
    try {
      const opinionsData = await fetchOpinions()
      
      // Filter by category OR topic
      let filtered = opinionsData
      if (filterContext) {
        const lowerFilter = filterContext.toLowerCase()
        filtered = opinionsData.filter(item => {
          const searchFields = [
            item.title,
            item.description,
            item.content,
            item.author,
            item.category
          ].filter(Boolean).join(' ').toLowerCase()
          
          return searchFields.includes(lowerFilter)
        })
      }
      
      setOpinions(filtered)
    } catch (error) {
      console.error('Error loading opinions:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="all-opinions-page">
      {/* Hero Section */}
      <div className="all-opinions-hero">
        <h1 className="all-opinions-title">ALL OPINIONS</h1>
        <p className="all-opinions-subtitle">
          {filterContext
            ? `Expert opinions and perspectives on "${filterContext}"` 
            : 'Expert opinions and perspectives from leading voices'}
        </p>
      </div>

      {/* Opinions Grid */}
      <div className="all-opinions-content">
        {loading ? (
          <div className="loading-state">Loading opinions...</div>
        ) : opinions.length === 0 ? (
          <div className="no-results">
            <p>No opinion pieces found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <div className="opinions-grid">
            {opinions.map((item, index) => (
              <article key={index} className="opinion-card">
                {item.image && (
                  <div className="opinion-card-image">
                    <img {...getImageProps(item.image, item.title, 'opinions')} />
                  </div>
                )}
                <div className="opinion-card-content">
                  <h2 className="opinion-card-headline">{item.title}</h2>
                  {item.author && (
                    <p className="opinion-card-author">By {item.author}</p>
                  )}
                  {item.description && (
                    <p className="opinion-card-description">{item.description}</p>
                  )}
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="read-more-link"
                  >
                    Read opinion →
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

export default AllOpinionsPage
