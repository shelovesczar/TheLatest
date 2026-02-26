import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Videos.css'

function Videos({ loadingVideos, videos, categoryPath }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3

  const nextSlide = () => {
    if (!videos || videos.length === 0) return
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= videos.length ? 0 : next
    })
  }

  const prevSlide = () => {
    if (!videos || videos.length === 0) return
    setCurrentIndex((prev) => {
      if (prev === 0) {
        // Jump to last complete page
        const lastPageStart = Math.floor((videos.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  // Create circular array view - wrap around if needed
  const getVisibleVideos = () => {
    if (!videos || videos.length === 0) return []
    const items = []
    for (let i = 0; i < itemsPerPage; i++) {
      const index = (currentIndex + i) % videos.length
      if (videos[index]) {
        items.push(videos[index])
      }
    }
    return items
  }

  const visibleVideos = videos && videos.length > 0 ? getVisibleVideos() : []

  return (
    <section id="videos" className="section videos">
      <h2 className="section-title">Videos</h2>
      <Link to={categoryPath || "/all-videos"} className="see-more-link">See More Videos</Link>
      {loadingVideos ? (
        <div className="loading-container">
          <p className="loading-text">Loading videos...</p>
        </div>
      ) : videos.length > 0 ? (
        <>
          <div className="videos-slider-container">
            <button 
              className="slider-btn videos-slider-btn" 
              onClick={prevSlide}
              aria-label="Previous videos"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="videos-slider">
              {visibleVideos.map((video, index) => (
            <a 
              key={currentIndex + index}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="video-card" 
              tabIndex="0" 
              role="article" 
              aria-label={`Video: ${video.title} from ${video.source}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="video-thumbnail">
                <img src={video.image} alt={video.title} />
                <div className="play-button" aria-hidden="true"><FontAwesomeIcon icon={faPlay} /></div>
                <span className="video-duration">{video.duration}</span>
              </div>
              <h3 className="video-title">{video.title}</h3>
              <div className="video-meta">
                <span className="video-source">{video.source}</span>
                <span className="video-date">{video.date}</span>
              </div>
              </a>
            ))}
            </div>

            <button 
              className="slider-btn videos-slider-btn" 
              onClick={nextSlide}
              aria-label="Next videos"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </>
      ) : (
        <p className="no-content">No videos available at this time.</p>
      )}
      <Link to={categoryPath || "/all-videos"} className="see-more-btn">See More Videos</Link>
    </section>
  )
}

export default Videos
