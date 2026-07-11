import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import { deriveMediaOutlet } from '../../utils/sourceUtils'
import { formatDateOnly } from '../../utils/dateUtils'
import { resolveContentHref } from '../../utils/storyRouting'
import { getGeneratedContentLabel } from '../../utils/contentLabels'
import './Opinions.css'

function Opinions({ loadingOpinions, opinions, categoryPath }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3
  const safeOpinions = Array.isArray(opinions) ? opinions.filter(Boolean) : []

  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  const nextSlide = () => {
    if (safeOpinions.length === 0) return
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= safeOpinions.length ? 0 : next
    })
  }

  const prevSlide = () => {
    if (safeOpinions.length === 0) return
    setCurrentIndex((prev) => {
      if (prev === 0) {
        // Jump to last complete page
        const lastPageStart = Math.floor((safeOpinions.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  // Create circular array view - wrap around if needed
  const getVisibleOpinions = () => {
    if (safeOpinions.length === 0) return []
    const items = []
    const maxItems = Math.min(itemsPerPage, safeOpinions.length)
    for (let i = 0; i < maxItems; i++) {
      const index = (currentIndex + i) % safeOpinions.length
      items.push(safeOpinions[index])
    }
    return items
  }

  const visibleOpinions = safeOpinions.length > 0 ? getVisibleOpinions() : []

  return (
    <section id="opinions" className="section opinions">
      <div className="section-hdr">
        <h2>Opinions</h2>
        <Link to={categoryPath || "/all-opinions"} className="see-more">See more opinions →</Link>
      </div>
      {loadingOpinions ? (
        <div className="loading-container">
          <p className="loading-text">Loading opinions...</p>
        </div>
      ) : safeOpinions.length > 0 ? (
        <>
          <div className="opinions-slider-container">
            <button 
              className="slider-btn opinions-slider-btn" 
              onClick={prevSlide}
              aria-label="Previous opinions"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="opinions-slider">
              {visibleOpinions.map((opinion, index) => {
                const href = resolveContentHref(opinion)
                return (
            <a 
              key={currentIndex + index} 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="opinion-card" 
              tabIndex="0" 
              role="article" 
              aria-label={`Opinion by ${opinion.author} from ${deriveMediaOutlet(opinion)}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card-thumb">
                <img {...getImageProps(opinion.image, opinion.author, 'opinions')} />
              </div>
              <div className="card-body-inner">
                <div className="card-source-row">
                  <span className="card-source">{deriveMediaOutlet(opinion)}</span>
                  {getGeneratedContentLabel(opinion) && <span className="card-date">{getGeneratedContentLabel(opinion)}</span>}
                  <span className="card-date">{formatDateOnly(opinion.date)}</span>
                </div>
                <div className="card-headline-text">{truncateText(opinion.title, 120)}</div>
                <div className="card-excerpt">{truncateText(opinion.description, 160)}</div>
                <div className="card-footer-row">
                  <span className="card-author">{opinion.author}</span>
                  <span className="card-read-more">Read →</span>
                </div>
              </div>
              </a>
                )
              })}
            </div>

            <button 
              className="slider-btn opinions-slider-btn" 
              onClick={nextSlide}
              aria-label="Next opinions"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </>
      ) : (
        <p className="no-content">No opinion articles available at this time.</p>
      )}
    </section>
  )
}

export default Opinions
