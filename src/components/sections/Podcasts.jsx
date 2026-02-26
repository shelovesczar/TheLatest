import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import './Podcasts.css'

function Podcasts({ loadingPodcasts, podcasts, categoryPath }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3

  // Truncate text helper
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  const nextSlide = () => {
    if (!podcasts || podcasts.length === 0) return
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= podcasts.length ? 0 : next
    })
  }

  const prevSlide = () => {
    if (!podcasts || podcasts.length === 0) return
    setCurrentIndex((prev) => {
      if (prev === 0) {
        // Jump to last complete page
        const lastPageStart = Math.floor((podcasts.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  // Create circular array view - wrap around if needed
  const getVisiblePodcasts = () => {
    if (!podcasts || podcasts.length === 0) return []
    const items = []
    for (let i = 0; i < itemsPerPage; i++) {
      const index = (currentIndex + i) % podcasts.length
      if (podcasts[index]) {
        items.push(podcasts[index])
      }
    }
    return items
  }

  const visiblePodcasts = podcasts && podcasts.length > 0 ? getVisiblePodcasts() : []

  return (
    <section id="podcasts" className="section podcasts">
      <h2 className="section-title">Podcasts</h2>
      {loadingPodcasts ? (
        <div className="loading-container">
          <p className="loading-text">Loading podcasts...</p>
        </div>
      ) : podcasts.length > 0 ? (
        <>
          <div className="podcasts-slider-container">
            <button 
              className="slider-btn podcasts-slider-btn" 
              onClick={prevSlide}
              aria-label="Previous podcasts"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="podcasts-slider">
              {visiblePodcasts.map((podcast, index) => (
            <a 
              key={currentIndex + index} 
              href={podcast.url}
              target="_blank"
              rel="noopener noreferrer"
              className="podcast-card" 
              tabIndex="0" 
              role="article" 
              aria-label={`Trending: ${podcast.title}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="podcast-video-wrapper">
                <img 
                  {...getImageProps(podcast.image, podcast.title, 'podcasts')}
                  className="podcast-thumbnail"
                />
              </div>
              <div className="podcast-info">
                <h3 className="podcast-title">{truncateText(podcast.title, 60)}</h3>
                <p className="podcast-description">{truncateText(podcast.description, 100)}</p>
                <div className="podcast-footer">
                  <span className="podcast-platform">Listen on {podcast.source}</span>
                  <span className="podcast-date">{podcast.date}</span>
                </div>
              </div>
              </a>
            ))}
            </div>

            <button 
              className="slider-btn podcasts-slider-btn" 
              onClick={nextSlide}
              aria-label="Next podcasts"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </>
      ) : (
        <p className="no-content">No podcasts available at this time.</p>
      )}
      <Link to={categoryPath || "/all-podcasts"} className="see-more-btn">View All Episodes →</Link>
    </section>
  )
}

export default Podcasts
