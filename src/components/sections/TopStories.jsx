import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import { recordHistory } from '../../utils/savedArticles'
import AdBreak from '../common/AdBreak'
import './TopStories.css'

function TopStories({ loading, topStories, activeStory, setActiveStory, categoryTitle, categorySources, categoryPath }) {
  const tickerRef = useRef(null)
  const imageRef = useRef(null)
  const cardRef = useRef(null)
  const navigate = useNavigate()
  const [descriptionLength, setDescriptionLength] = useState(150)

  const getMediaOutlet = useCallback((story) => {
    if (!story) return 'Unknown Source'

    const domainMap = {
      'nytimes.com': 'New York Times',
      'bbc.com': 'BBC News',
      'bbc.co.uk': 'BBC News',
      'cnn.com': 'CNN',
      'foxnews.com': 'Fox News',
      'reuters.com': 'Reuters',
      'theguardian.com': 'The Guardian',
      'washingtonpost.com': 'Washington Post',
      'wsj.com': 'Wall Street Journal',
      'apnews.com': 'Associated Press',
      'nbcnews.com': 'NBC News',
      'abcnews.go.com': 'ABC News',
      'cbsnews.com': 'CBS News',
      'npr.org': 'NPR',
      'politico.com': 'Politico',
      'latimes.com': 'LA Times',
      'usatoday.com': 'USA Today',
      'nypost.com': 'New York Post',
      'bloomberg.com': 'Bloomberg',
      'cnbc.com': 'CNBC'
    }

    const sourceText = (story.source || '').trim()

    if (story.url) {
      try {
        const hostname = new URL(story.url).hostname.replace(/^www\./, '')
        if (domainMap[hostname]) return domainMap[hostname]

        const matchingDomain = Object.keys(domainMap).find(domain => hostname === domain || hostname.endsWith(`.${domain}`))
        if (matchingDomain) return domainMap[matchingDomain]
      } catch {
        // ignore URL parsing errors and fall through
      }
    }

    return sourceText || 'Unknown Source'
  }, [])

  const goToArticle = useCallback((article) => {
    recordHistory(article)
    navigate('/article', { state: { article } })
  }, [navigate])

  const getOriginalUrl = useCallback((story) => {
    if (!story) return ''
    const candidate = (story.url || story.link || '').trim()
    if (!candidate) return ''
    if (/^https?:\/\//i.test(candidate)) return candidate
    return ''
  }, [])

  // Truncate text helper
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  const getStoryDescription = (story, maxLength) => {
    if (!story) return ''

    const primary = String(story.description || '').trim()
    const secondary = String(story.content || '').trim()

    let combined = primary

    // If description is short, use content as a continuation to avoid a sparse card.
    if (secondary && combined.length < maxLength * 0.72) {
      if (combined && secondary.toLowerCase().startsWith(combined.toLowerCase().slice(0, 60))) {
        combined = secondary
      } else {
        combined = `${combined} ${secondary}`.trim()
      }
    }

    if (!combined) {
      combined = String(story.title || '').trim()
    }

    return truncateText(combined, maxLength)
  }

  // Dynamically adjust description length based on the rendered card width
  useEffect(() => {
    const updateDescriptionLength = () => {
      const cardWidth = cardRef.current?.offsetWidth || window.innerWidth

      if (cardWidth >= 1200) {
        setDescriptionLength(420)
      } else if (cardWidth >= 960) {
        setDescriptionLength(330)
      } else if (cardWidth >= 768) {
        setDescriptionLength(260)
      } else if (cardWidth >= 560) {
        setDescriptionLength(200)
      } else {
        setDescriptionLength(140)
      }
    }

    updateDescriptionLength()

    if (!cardRef.current || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(() => {
      updateDescriptionLength()
    })

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [activeStory, topStories])

  // Clamp activeStory if topStories reloads with fewer items
  useEffect(() => {
    if (topStories.length > 0 && activeStory >= topStories.length) {
      setActiveStory(0)
    }
  }, [topStories, activeStory, setActiveStory])

  const nextStory = () => {
    setActiveStory((prev) => (prev + 1) % topStories.length)
  }

  const prevStory = () => {
    setActiveStory((prev) => (prev - 1 + topStories.length) % topStories.length)
  }

  // Determine section title
  const sectionTitle = categoryTitle && categoryTitle.toLowerCase() !== 'top stories'
    ? `TOP ${categoryTitle.toUpperCase()} STORIES`
    : 'TOP STORIES'

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

      {loading ? (
        <div className="loading-container">
          <p className="loading-text">Loading top stories...</p>
        </div>
      ) : topStories.length > 0 && topStories[activeStory] ? (
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
                  title={`Media outlet: ${getMediaOutlet(story)}`}
                  aria-label={`Show stories from media outlet ${getMediaOutlet(story)}`}
                >
                  <span className="pill-source">{truncateText(getMediaOutlet(story), 20)}</span>
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
            <article className="story-card-large" ref={cardRef}>
              <div className="story-card-image" ref={imageRef}>
                <img 
                  {...getImageProps(topStories[activeStory].image, topStories[activeStory].title, 'news')}
                />
              </div>
              <div className="story-card-content">
                <div className="story-card-body">
                  <a 
                    href="#"
                    onClick={e => { e.preventDefault(); goToArticle(topStories[activeStory]) }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <h3 className="story-card-headline">{topStories[activeStory].title}</h3>
                  </a>
                  <div className="story-card-meta">
                    <span className="story-card-source">{getMediaOutlet(topStories[activeStory])}</span>
                    <span className="story-card-time">{topStories[activeStory].time}</span>
                  </div>
                  <p className="story-card-description">{getStoryDescription(topStories[activeStory], descriptionLength)}</p>
                </div>
                <div className="story-card-footer">
                  <div className="story-source-credit">
                    <span className="story-source-label">Source:</span>
                    {getOriginalUrl(topStories[activeStory]) ? (
                      <a
                        className="story-source-link"
                        href={getOriginalUrl(topStories[activeStory])}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {getMediaOutlet(topStories[activeStory])}
                      </a>
                    ) : (
                      <span className="story-source-name">{getMediaOutlet(topStories[activeStory])}</span>
                    )}
                  </div>
                  <a 
                    href="#"
                    onClick={e => { e.preventDefault(); goToArticle(topStories[activeStory]) }}
                    className="read-more-link"
                  >
                    Read full story →
                  </a>
                </div>
              </div>
            </article>
            
            <div className="section-ad-sidebar">
              <AdBreak type="sidebar" />
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
