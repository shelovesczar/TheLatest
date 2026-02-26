import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import './Opinions.css'

function Opinions({ loadingOpinions, opinions, categoryPath }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3

  // Helper function to truncate text
  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength).trim() + '...'
  }

  const nextSlide = () => {
    if (!opinions || opinions.length === 0) return
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= opinions.length ? 0 : next
    })
  }

  const prevSlide = () => {
    if (!opinions || opinions.length === 0) return
    setCurrentIndex((prev) => {
      if (prev === 0) {
        // Jump to last complete page
        const lastPageStart = Math.floor((opinions.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  // Create circular array view - wrap around if needed
  const getVisibleOpinions = () => {
    if (!opinions || opinions.length === 0) return []
    const items = []
    for (let i = 0; i < itemsPerPage; i++) {
      const index = (currentIndex + i) % opinions.length
      if (opinions[index]) {
        items.push(opinions[index])
      }
    }
    return items
  }

  const visibleOpinions = opinions && opinions.length > 0 ? getVisibleOpinions() : []

  return (
    <section id="opinions" className="section opinions">
      <h2 className="section-title">Opinions</h2>
      <Link to={categoryPath || "/all-opinions"} className="see-more-link">See More Opinions</Link>
      {loadingOpinions ? (
        <div className="loading-container">
          <p className="loading-text">Loading opinions...</p>
        </div>
      ) : opinions.length > 0 ? (
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
              {visibleOpinions.map((opinion, index) => (
            <a 
              key={currentIndex + index} 
              href={opinion.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="opinion-card" 
              tabIndex="0" 
              role="article" 
              aria-label={`Opinion by ${opinion.author} from ${opinion.source}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <img {...getImageProps(opinion.image, opinion.author, 'opinions')} className="opinion-image" />
              <div className="opinion-content">
                <h3 className="opinion-headline">{truncateText(opinion.title, 80)}</h3>
                <p className="opinion-excerpt">{truncateText(opinion.description, 120)}</p>
                <div className="opinion-meta">
                  <span className="opinion-author">{opinion.author}</span>
                  <span className="opinion-source">{opinion.source}</span>
                  <span className="opinion-date">{opinion.date}</span>
                </div>
              </div>
              </a>
            ))}
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
      <Link to={categoryPath || "/all-opinions"} className="see-more-btn">See More Opinions</Link>
    </section>
  )
}

export default Opinions
