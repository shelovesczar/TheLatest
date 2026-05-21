import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import { deriveMediaOutlet } from '../../utils/sourceUtils'
import { formatDateOnly } from '../../utils/dateUtils'
import './Videos.css'

function Videos({ loadingVideos, videos, categoryPath }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredVideoKey, setHoveredVideoKey] = useState(null)
  const itemsPerPage = 3

  const isYouTubeUrl = (url) => {
    if (!url) return false
    try {
      const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be'
    } catch {
      return false
    }
  }

  const getVideoSourceLabel = (video) => {
    const outlet = deriveMediaOutlet(video)
    const author = String(video?.author || '').trim()
    const isYouTube = isYouTubeUrl(video?.url) || /youtube/i.test(outlet)

    if (!isYouTube) {
      return { primary: outlet, secondary: '' }
    }

    const publisher = author && !/unknown|staff/i.test(author) ? author : outlet
    if (publisher && !/youtube/i.test(publisher)) {
      return { primary: publisher, secondary: 'on YouTube' }
    }

    return { primary: 'YouTube', secondary: '' }
  }

  const getVideoKey = (video, index) => {
    const base = video?.url || video?.title || 'video'
    return `${base}-${currentIndex + index}`
  }

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase()

      let id = null
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        if (parsed.pathname === '/watch') {
          id = parsed.searchParams.get('v')
        } else if (parsed.pathname.startsWith('/shorts/')) {
          id = parsed.pathname.split('/')[2]
        } else if (parsed.pathname.startsWith('/embed/')) {
          id = parsed.pathname.split('/')[2]
        }
      } else if (host === 'youtu.be') {
        id = parsed.pathname.replace('/', '')
      }

      if (!id) return null
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&rel=0&playsinline=1`
    } catch {
      return null
    }
  }

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
    const maxItems = Math.min(itemsPerPage, videos.length)
    for (let i = 0; i < maxItems; i++) {
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
              {visibleVideos.map((video, index) => {
                const cardKey = getVideoKey(video, index)
                const embedUrl = getYouTubeEmbedUrl(video.url)
                const isHovered = hoveredVideoKey === cardKey
                const canPreview = Boolean(embedUrl)
                const sourceLabel = getVideoSourceLabel(video)

                return (
            <a 
              key={cardKey}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="video-card" 
              tabIndex="0" 
              role="article" 
              aria-label={`Video: ${video.title} from ${deriveMediaOutlet(video)}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
              onMouseEnter={() => setHoveredVideoKey(cardKey)}
              onMouseLeave={() => setHoveredVideoKey(null)}
              onFocus={() => setHoveredVideoKey(cardKey)}
              onBlur={() => setHoveredVideoKey(null)}
            >
              <div className="video-thumbnail">
                <img {...getImageProps(video.image, video.title, 'videos')} />
                {canPreview && isHovered && (
                  <div className="video-preview-layer" aria-hidden="true">
                    <iframe
                      src={embedUrl}
                      title={`${video.title} preview`}
                      loading="lazy"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen={false}
                      tabIndex="-1"
                    />
                  </div>
                )}
                <div className={`play-button${isHovered && canPreview ? ' is-hidden' : ''}`} aria-hidden="true"><FontAwesomeIcon icon={faPlay} /></div>
                <span className="video-duration">{video.duration}</span>
              </div>
              <h3 className="video-title">{video.title}</h3>
              <div className="video-meta">
                <span className="video-source">{sourceLabel.primary}</span>
                {sourceLabel.secondary && <span className="video-source-platform">{sourceLabel.secondary}</span>}
                <span className="video-date">{formatDateOnly(video.date)}</span>
              </div>
              </a>
              )
            })}
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
