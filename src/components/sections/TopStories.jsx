import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import './TopStories.css'

function TopStories({ loading, topStories, activeStory, setActiveStory, categoryTitle, categorySources, categoryPath }) {
  const tickerRef = useRef(null)
  const imageRef = useRef(null)
  const [descriptionLength, setDescriptionLength] = useState(150)

  // Truncate text helper
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  // Dynamically adjust description length based on image aspect ratio
  useEffect(() => {
    if (imageRef.current && topStories[activeStory]) {
      const img = new Image();
      img.src = topStories[activeStory].image;
      
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        
        // Landscape images (wider) = more vertical space for text
        if (aspectRatio > 1.5) {
          setDescriptionLength(250); // Wide image, show more text
        } else if (aspectRatio > 1.2) {
          setDescriptionLength(200); // Medium wide
        } else if (aspectRatio < 0.8) {
          setDescriptionLength(100); // Tall/portrait image, less text
        } else {
          setDescriptionLength(150); // Square/normal
        }
      };
    }
  }, [activeStory, topStories])

  const nextStory = () => {
    setActiveStory((prev) => (prev + 1) % topStories.length)
  }

  const prevStory = () => {
    setActiveStory((prev) => (prev - 1 + topStories.length) % topStories.length)
  }

  // Determine section title
  const sectionTitle = categoryTitle ? `TOP ${categoryTitle.toUpperCase()} STORIES` : 'TOP STORIES'

  // Scroll active pill into view
  useEffect(() => {
    if (tickerRef.current && topStories.length > 0) {
      const activePill = tickerRef.current.querySelector('.source-pill.active')
      if (activePill) {
        const container = tickerRef.current
        
        // For first item, scroll to start
        if (activeStory === 0) {
          container.scrollTo({
            left: 0,
            behavior: 'smooth'
          })
          return
        }
        
        // For last item, scroll to end
        if (activeStory === topStories.length - 1) {
          container.scrollTo({
            left: container.scrollWidth,
            behavior: 'smooth'
          })
          return
        }
        
        // For middle items, center them
        const containerWidth = container.offsetWidth
        const scrollLeft = activePill.offsetLeft - (containerWidth / 2) + (activePill.offsetWidth / 2)
        
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        })
      }
    }
  }, [activeStory, topStories])

  return (
    <section id="news" className="section top-stories-section">
      <h2 className="section-title">{sectionTitle}</h2>
      <Link to={categoryPath || "/all-news"} className="see-more-link">See More News</Link>

      {loading ? (
        <div className="loading-container">
          <p className="loading-text">Loading top stories...</p>
        </div>
      ) : topStories.length > 0 ? (
        <>
          <div className="source-ticker-container">
            <button 
              className="slider-btn ticker-btn" 
              onClick={prevStory}
              aria-label="Previous story"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="source-ticker" ref={tickerRef}>
              {topStories.map((story, index) => (
                <button
                  key={index}
                  className={`source-pill ${index === activeStory ? 'active' : ''}`}
                  onClick={() => setActiveStory(index)}
                  title={story.title}
                >
                  <span className="pill-source">{truncateText(story.source, 20)}</span>
                  <span className="pill-divider">•</span>
                  <span className="pill-title">{truncateText(story.title, 30)}</span>
                </button>
              ))}
            </div>

            <button 
              className="slider-btn ticker-btn" 
              onClick={nextStory}
              aria-label="Next story"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="story-with-ad-container">
            <article className="story-card-large">
              <div className="story-card-image" ref={imageRef}>
                <img 
                  {...getImageProps(topStories[activeStory].image, topStories[activeStory].title, 'news')}
                />
              </div>
              <div className="story-card-content">
                <a 
                  href={topStories[activeStory].url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <h3 className="story-card-headline">{topStories[activeStory].title}</h3>
                </a>
                <div className="story-card-meta">
                  <span className="story-card-source">{topStories[activeStory].source}</span>
                  <span className="story-card-time">{topStories[activeStory].time}</span>
                </div>
                <p className="story-card-description">{truncateText(topStories[activeStory].description, descriptionLength)}</p>
                <a 
                  href={topStories[activeStory].url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="read-more-link"
                >
                  Read full story →
                </a>
              </div>
            </article>
            
            <div className="section-ad-sidebar">
              <div className="ad-placeholder ad-dynamic">
                <span>AD</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="no-content">No stories available at this time.</p>
      )}

      <Link to={categoryPath || "/all-news"} className="see-more-btn">See More Stories</Link>
    </section>
  )
}

export default TopStories
