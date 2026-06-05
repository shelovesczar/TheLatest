import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import { deriveMediaOutlet } from '../../utils/sourceUtils'
import { formatDateOnly } from '../../utils/dateUtils'
import './Podcasts.css'

function Podcasts({ loadingPodcasts, podcasts, categoryPath }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3
  const safePodcasts = Array.isArray(podcasts) ? podcasts.filter(Boolean) : []

  // Truncate text helper
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  const nextSlide = () => {
    if (safePodcasts.length === 0) return
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= safePodcasts.length ? 0 : next
    })
  }

  const prevSlide = () => {
    if (safePodcasts.length === 0) return
    setCurrentIndex((prev) => {
      if (prev === 0) {
        // Jump to last complete page
        const lastPageStart = Math.floor((safePodcasts.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  // Create circular array view - wrap around if needed
  const getVisiblePodcasts = () => {
    if (safePodcasts.length === 0) return []
    const items = []
    const maxItems = Math.min(itemsPerPage, safePodcasts.length)
    for (let i = 0; i < maxItems; i++) {
      const index = (currentIndex + i) % safePodcasts.length
      items.push(safePodcasts[index])
    }
    return items
  }

  const visiblePodcasts = safePodcasts.length > 0 ? getVisiblePodcasts() : []

  return (
    <section id="podcasts" className="section podcasts">
      <div className="section-hdr">
        <h2>Podcasts</h2>
        <Link to={categoryPath || "/all-podcasts"} className="see-more">View all episodes →</Link>
      </div>
      {loadingPodcasts ? (
        <div className="loading-container">
          <p className="loading-text">Loading podcasts...</p>
        </div>
      ) : safePodcasts.length > 0 ? (
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
              <div className="card-thumb">
                <img {...getImageProps(podcast.image, podcast.title, 'podcasts')} />
              </div>
              <div className="card-body-inner">
                <div className="card-source-row">
                  <span className="card-source">{deriveMediaOutlet(podcast)}</span>
                  <span className="card-date">{formatDateOnly(podcast.date)}</span>
                </div>
                <div className="card-headline-text">{truncateText(podcast.title, 100)}</div>
                <div className="card-excerpt">{truncateText(podcast.description, 140)}</div>
                <div className="card-footer-row">
                  <span className="card-author">Podcast</span>
                  <span className="card-read-more">Listen →</span>
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
    </section>
  )
}

export default Podcasts
