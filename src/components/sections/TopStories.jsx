import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import { recordHistory } from '../../utils/savedArticles'
import './TopStories.css'

const PERSPECTIVE_MAP = [
  {
    key: 'left',
    label: 'Left-Center',
    sourceStyle: { background: '#dbeafe', color: '#1e40af' }
  },
  {
    key: 'center',
    label: 'Center',
    sourceStyle: { background: '#d1fae5', color: '#065f46' }
  },
  {
    key: 'right',
    label: 'Right-Center',
    sourceStyle: { background: '#fef3c7', color: '#92400e' }
  }
]

function TopStories({ loading, topStories, activeStory, setActiveStory, categoryTitle, categoryPath }) {
  const navigate = useNavigate()
  const [showPerspectives, setShowPerspectives] = useState(false)
  const [perspectiveFilter, setPerspectiveFilter] = useState('all')

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

        const matchingDomain = Object.keys(domainMap).find((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
        if (matchingDomain) return domainMap[matchingDomain]
      } catch {
        // ignore URL parsing errors and fall through
      }
    }

    return sourceText || 'Unknown Source'
  }, [])

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength).trim()}...`
  }

  const getStoryDescription = (story, maxLength) => {
    if (!story) return ''

    const primary = String(story.description || '').trim()
    const secondary = String(story.content || '').trim()
    let combined = primary

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

  const getStoryTime = (story) => {
    const directTime = String(story?.time || '').trim()
    if (directTime) return directTime

    const candidate = story?.date || story?.pubDate || story?.isoDate
    if (!candidate) return 'Latest'

    const parsed = new Date(candidate)
    if (Number.isNaN(parsed.getTime())) return 'Latest'

    const diffMs = Date.now() - parsed.getTime()
    const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)))
    if (diffHours < 24) return `${diffHours}h ago`

    const diffDays = Math.round(diffHours / 24)
    return `${diffDays}d ago`
  }

  const goToArticle = useCallback((article) => {
    recordHistory(article)
    navigate('/article', { state: { article } })
  }, [navigate])

  useEffect(() => {
    if (topStories.length > 0 && activeStory >= topStories.length) {
      setActiveStory(0)
    }
  }, [topStories, activeStory, setActiveStory])

  const visibleStories = useMemo(() => {
    if (!Array.isArray(topStories) || topStories.length === 0) return []

    const maxItems = Math.min(3, topStories.length)
    const items = []
    for (let index = 0; index < maxItems; index += 1) {
      items.push(topStories[(activeStory + index) % topStories.length])
    }
    return items
  }, [activeStory, topStories])

  const perspectiveStories = useMemo(() => {
    return visibleStories.map((story, index) => ({
      story,
      perspective: PERSPECTIVE_MAP[index] || PERSPECTIVE_MAP[PERSPECTIVE_MAP.length - 1]
    }))
  }, [visibleStories])

  const filteredPerspectiveStories = useMemo(() => {
    if (perspectiveFilter === 'all') return perspectiveStories
    return perspectiveStories.filter((item) => item.perspective.key === perspectiveFilter)
  }, [perspectiveFilter, perspectiveStories])

  const nextStory = () => {
    if (topStories.length === 0) return
    setActiveStory((prev) => (prev + 1) % topStories.length)
  }

  const prevStory = () => {
    if (topStories.length === 0) return
    setActiveStory((prev) => (prev - 1 + topStories.length) % topStories.length)
  }

  const sectionTitle = categoryTitle && categoryTitle.toLowerCase() !== 'top stories'
    ? `TOP ${categoryTitle.toUpperCase()} STORIES`
    : 'TOP STORIES'

  const perspectiveTopic = visibleStories[0]?.title
    ? truncateText(visibleStories[0].title, 36)
    : 'Latest coverage'

  return (
    <section id="news" className="section top-stories-section">
      <div className="section-hdr top-stories-hdr">
        <h2>{sectionTitle}</h2>
        <div className="top-stories-actions">
          <button
            type="button"
            className="top-stories-toggle"
            onClick={() => setShowPerspectives((value) => !value)}
          >
            {showPerspectives ? '✕ Back to Top Stories' : '⇄ See Multiple Perspectives'}
          </button>
          <Link to={categoryPath || '/all-news'} className="see-more">See all stories →</Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <p className="loading-text">Loading top stories...</p>
        </div>
      ) : visibleStories.length > 0 ? (
        !showPerspectives ? (
          <div id="storiesCarousel">
            <div className="carousel-wrap">
              <button className="carousel-arrow prev" onClick={prevStory} aria-label="Previous stories">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <div className="carousel-track">
                {visibleStories.map((story, index) => (
                  <article key={`${story.url || story.title || 'story'}-${index}`} className="content-card">
                    <div className="card-thumb">
                      <img {...getImageProps(story.image, story.title, 'news')} />
                    </div>
                    <div className="card-body-inner">
                      <div className="card-source-row">
                        <span className="card-source">{getMediaOutlet(story)}</span>
                        <span className="card-date">{getStoryTime(story)}</span>
                      </div>
                      <div className="card-headline-text">
                        <a
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            goToArticle(story)
                          }}
                        >
                          {story.title}
                        </a>
                      </div>
                      <div className="card-excerpt">{getStoryDescription(story, 150)}</div>
                      <div className="card-footer-row">
                        <span className="card-author">{story.author || getMediaOutlet(story)}</span>
                        <span className="persp-dot"></span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <button className="carousel-arrow next" onClick={nextStory} aria-label="Next stories">
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        ) : (
          <div id="storiesSBS">
            <div className="sbs-filter-row">
              <span className="sbs-filter-label">Filter:</span>
              <button type="button" onClick={() => setPerspectiveFilter('all')} className={`sbs-pill${perspectiveFilter === 'all' ? ' sbs-active' : ''}`}>All</button>
              <button type="button" onClick={() => setPerspectiveFilter('left')} className={`sbs-pill${perspectiveFilter === 'left' ? ' sbs-active' : ''}`}>● Left</button>
              <button type="button" onClick={() => setPerspectiveFilter('center')} className={`sbs-pill${perspectiveFilter === 'center' ? ' sbs-active' : ''}`}>● Center</button>
              <button type="button" onClick={() => setPerspectiveFilter('right')} className={`sbs-pill${perspectiveFilter === 'right' ? ' sbs-active' : ''}`}>● Right</button>
            </div>

            <div className="sbs-story">
              <div className="sbs-story-label">
                <div className="sbs-topic-tag">{perspectiveTopic}</div>
                <div className="sbs-story-count">{filteredPerspectiveStories.length} sources shown</div>
              </div>

              <div className="sbs-grid">
                {filteredPerspectiveStories.map(({ story, perspective }, index) => (
                  <article key={`${story.url || story.title || 'perspective'}-${index}`} className="sbs-card" data-persp={perspective.key}>
                    <div className="sbs-card-img">
                      <img {...getImageProps(story.image, story.title, 'news')} />
                    </div>
                    <div className="sbs-card-body">
                      <div className="sbs-source-row">
                        <span className="sbs-source-badge" style={perspective.sourceStyle}>● {getMediaOutlet(story)}</span>
                        <span className="sbs-persp-label" style={perspective.sourceStyle}>{perspective.label}</span>
                        <span className="sbs-time">{getStoryTime(story)}</span>
                      </div>
                      <div className="sbs-headline">
                        <a
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            goToArticle(story)
                          }}
                        >
                          {story.title}
                        </a>
                      </div>
                      <div className="sbs-excerpt">{getStoryDescription(story, 170)}</div>
                      <div className="sbs-footer">
                        <span className="sbs-author">{story.author || getMediaOutlet(story)}</span>
                        <a
                          href="#"
                          className="sbs-read"
                          onClick={(event) => {
                            event.preventDefault()
                            goToArticle(story)
                          }}
                        >
                          Read →
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        <p className="no-content">No stories available at this time.</p>
      )}
    </section>
  )
}

export default TopStories
