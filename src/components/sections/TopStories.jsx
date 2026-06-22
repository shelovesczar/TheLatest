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

const PERSPECTIVE_LOOKUP = Object.fromEntries(PERSPECTIVE_MAP.map((item) => [item.key, item]))

function TopStories({
  loading,
  topStories,
  activeStory,
  setActiveStory,
  sideBySideClusters = [],
  categoryTitle,
  categoryPath,
  defaultPerspectiveView = false,
  showPerspectiveToggle = true,
  sectionTitle,
  seeMoreLabel,
  sideBySideTitle
}) {
    const resolvePerspective = useCallback((story, fallbackIndex = 0) => {
      const explicitKey = String(story?.perspectiveKey || '').trim().toLowerCase()
      if (explicitKey && PERSPECTIVE_LOOKUP[explicitKey]) {
        return {
          ...PERSPECTIVE_LOOKUP[explicitKey],
          label: story?.perspectiveLabel || PERSPECTIVE_LOOKUP[explicitKey].label,
          sourceStyle: story?.perspectiveStyle || PERSPECTIVE_LOOKUP[explicitKey].sourceStyle
        }
      }

      return PERSPECTIVE_MAP[fallbackIndex] || PERSPECTIVE_MAP[PERSPECTIVE_MAP.length - 1]
    }, [])

  const navigate = useNavigate()
  const [showPerspectives, setShowPerspectives] = useState(defaultPerspectiveView)
  const [perspectiveFilter, setPerspectiveFilter] = useState('all')
  const [activePerspectiveSourceIndex, setActivePerspectiveSourceIndex] = useState(0)
  const clusterItems = useMemo(
    () => (Array.isArray(sideBySideClusters) ? sideBySideClusters.filter((item) => Array.isArray(item?.sources) && item.sources.length > 0) : []),
    [sideBySideClusters]
  )
  const useClusteredSideBySide = clusterItems.length > 0

  useEffect(() => {
    setShowPerspectives(defaultPerspectiveView)
  }, [defaultPerspectiveView])

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
    const activeLimit = useClusteredSideBySide ? clusterItems.length : topStories.length
    if (activeLimit > 0 && activeStory >= activeLimit) {
      setActiveStory(0)
    }
  }, [topStories, clusterItems, useClusteredSideBySide, activeStory, setActiveStory])

  const storyGroupCount = useMemo(() => {
    if (useClusteredSideBySide) return clusterItems.length
    if (!Array.isArray(topStories) || topStories.length === 0) return 0
    return Math.ceil(topStories.length / 3)
  }, [clusterItems, topStories, useClusteredSideBySide])

  const perspectiveGroupIndex = useMemo(() => {
    if (storyGroupCount === 0) return 0
    if (useClusteredSideBySide) return Math.min(activeStory, storyGroupCount - 1)
    return Math.floor(activeStory / 3) % storyGroupCount
  }, [activeStory, storyGroupCount, useClusteredSideBySide])

  useEffect(() => {
    setActivePerspectiveSourceIndex(0)
  }, [perspectiveFilter, perspectiveGroupIndex])

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
    if (useClusteredSideBySide) {
      const activeCluster = clusterItems[perspectiveGroupIndex]
      const items = Array.isArray(activeCluster?.sources) ? activeCluster.sources : []

      return items.map((story, index) => ({
        story,
        perspective: resolvePerspective(story, index)
      }))
    }

    if (!Array.isArray(topStories) || topStories.length === 0) return []

    const startIndex = perspectiveGroupIndex * 3
    const items = topStories.slice(startIndex, startIndex + 3)

    return items.map((story, index) => ({
      story,
      perspective: resolvePerspective(story, index)
    }))
  }, [clusterItems, perspectiveGroupIndex, resolvePerspective, topStories, useClusteredSideBySide])

  const filteredPerspectiveStories = useMemo(() => {
    if (perspectiveFilter === 'all') return perspectiveStories
    return perspectiveStories.filter((item) => item.perspective.key === perspectiveFilter)
  }, [perspectiveFilter, perspectiveStories])

  const visiblePerspectiveStories = useMemo(() => {
    if (filteredPerspectiveStories.length > 0) return filteredPerspectiveStories
    return perspectiveStories
  }, [filteredPerspectiveStories, perspectiveStories])

  const resolvedPerspectiveSourceIndex = useMemo(() => {
    if (visiblePerspectiveStories.length === 0) return 0
    return Math.min(activePerspectiveSourceIndex, visiblePerspectiveStories.length - 1)
  }, [activePerspectiveSourceIndex, visiblePerspectiveStories])

  const activePerspectiveItem = visiblePerspectiveStories[resolvedPerspectiveSourceIndex] || null

  const nextStory = () => {
    if (topStories.length === 0) return
    setActiveStory((prev) => (prev + 1) % topStories.length)
  }

  const prevStory = () => {
    if (topStories.length === 0) return
    setActiveStory((prev) => (prev - 1 + topStories.length) % topStories.length)
  }

  const nextPerspectiveGroup = () => {
    if (storyGroupCount === 0) return
    if (useClusteredSideBySide) {
      setActiveStory((prev) => (prev + 1) % storyGroupCount)
      return
    }
    setActiveStory(((perspectiveGroupIndex + 1) % storyGroupCount) * 3)
  }

  const prevPerspectiveGroup = () => {
    if (storyGroupCount === 0) return
    if (useClusteredSideBySide) {
      setActiveStory((prev) => (prev - 1 + storyGroupCount) % storyGroupCount)
      return
    }
    setActiveStory(((perspectiveGroupIndex - 1 + storyGroupCount) % storyGroupCount) * 3)
  }

  const resolvedSectionTitle = sectionTitle || (categoryTitle && categoryTitle.toLowerCase() !== 'top stories'
    ? `TOP ${categoryTitle.toUpperCase()} STORIES`
    : 'TOP STORIES')

  const resolvedSeeMoreLabel = seeMoreLabel || 'See all stories →'
  const resolvedSideBySideTitle = sideBySideTitle || 'Top Stories - Side by Side'

  const perspectiveTopic = perspectiveStories[0]?.story?.title
    ? truncateText(useClusteredSideBySide ? (clusterItems[perspectiveGroupIndex]?.topic || perspectiveStories[0].story.title) : perspectiveStories[0].story.title, 70)
    : 'Latest coverage'

  const coverageLabel = categoryTitle
    ? `${categoryTitle} coverage`
    : 'Coverage cluster'

  const cyclePerspectiveSource = (delta) => {
    if (visiblePerspectiveStories.length === 0) return
    setActivePerspectiveSourceIndex((prev) => {
      const total = visiblePerspectiveStories.length
      return (prev + delta + total) % total
    })
  }

  return (
    <section id="news" className="section top-stories-section">
      <div className="section-hdr top-stories-hdr">
        <h2>{showPerspectives ? resolvedSideBySideTitle : resolvedSectionTitle}</h2>
        <div className="top-stories-actions">
          {showPerspectiveToggle && (
            <button
              type="button"
              className="top-stories-toggle"
              onClick={() => setShowPerspectives((value) => !value)}
            >
              {showPerspectives ? '✕ Back to Top Stories' : '⇄ See Multiple Perspectives'}
            </button>
          )}
          <Link to={categoryPath || '/all-news'} className="see-more">{resolvedSeeMoreLabel}</Link>
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
            <div className="top-stories-nav-row">
              <div className="sbs-filter-row">
                <span className="sbs-filter-label">Filter:</span>
                <button type="button" onClick={() => setPerspectiveFilter('all')} className={`sbs-pill${perspectiveFilter === 'all' ? ' sbs-active' : ''}`}>All</button>
                <button type="button" onClick={() => setPerspectiveFilter('left')} className={`sbs-pill${perspectiveFilter === 'left' ? ' sbs-active' : ''}`}>● Left</button>
                <button type="button" onClick={() => setPerspectiveFilter('center')} className={`sbs-pill${perspectiveFilter === 'center' ? ' sbs-active' : ''}`}>● Center</button>
                <button type="button" onClick={() => setPerspectiveFilter('right')} className={`sbs-pill${perspectiveFilter === 'right' ? ' sbs-active' : ''}`}>● Right</button>
              </div>

              {storyGroupCount > 1 && (
                <span className="sbs-counter">Story {perspectiveGroupIndex + 1} of {storyGroupCount}</span>
              )}
            </div>

            <div className="sbs-story editorial-sbs">
              <div className="sbs-cluster-meta">
                <div className="sbs-cluster-copy">
                  <div className="sbs-topic-tag">{coverageLabel}</div>
                  <h3 className="sbs-cluster-topic">{perspectiveTopic}</h3>
                </div>
                <div className="sbs-cluster-badges">
                  <span className="sbs-cluster-badge sbs-cluster-badge-sources">{visiblePerspectiveStories.length} sources</span>
                  <span className="sbs-cluster-badge sbs-cluster-badge-mode">
                    {perspectiveFilter === 'all' ? 'Multiple perspectives' : activePerspectiveItem?.perspective.label || 'Focused view'}
                  </span>
                </div>
              </div>

              <div className="sbs-source-nav">
                <button className="sbs-source-arrow" type="button" onClick={() => cyclePerspectiveSource(-1)} aria-label="Previous source comparison">
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="sbs-source-tabs">
                  {visiblePerspectiveStories.map(({ story, perspective }, index) => (
                    <button
                      key={`${story.url || story.title || 'source'}-${index}`}
                      type="button"
                      className={`sbs-source-tab${index === resolvedPerspectiveSourceIndex ? ' active' : ''}`}
                      onClick={() => setActivePerspectiveSourceIndex(index)}
                    >
                      {getMediaOutlet(story)}
                      <span className="sbs-source-tab-perspective">{perspective.label}</span>
                    </button>
                  ))}
                </div>

                <button className="sbs-source-arrow" type="button" onClick={() => cyclePerspectiveSource(1)} aria-label="Next source comparison">
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>

                <span className="sbs-story-count">{resolvedPerspectiveSourceIndex + 1} of {visiblePerspectiveStories.length}</span>
              </div>

              <div className="sbs-stage sbs-stage-editorial">
                <button className="sbs-nav-btn" type="button" onClick={prevPerspectiveGroup} aria-label="Previous side-by-side story">
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="sbs-feature-shell">
                  {activePerspectiveItem && (
                    <article className="sbs-feature-card" data-persp={activePerspectiveItem.perspective.key}>
                      <div className="sbs-feature-media">
                        <img {...getImageProps(activePerspectiveItem.story.image, activePerspectiveItem.story.title, 'news')} />
                      </div>
                      <div className="sbs-feature-body">
                        <div className="sbs-source-row">
                          <span className="sbs-source-badge" style={activePerspectiveItem.perspective.sourceStyle}>● {getMediaOutlet(activePerspectiveItem.story)}</span>
                          <span className="sbs-persp-label" style={activePerspectiveItem.perspective.sourceStyle}>{activePerspectiveItem.perspective.label}</span>
                          <span className="sbs-time">{getStoryTime(activePerspectiveItem.story)}</span>
                        </div>
                        <div className="sbs-headline sbs-headline-feature">
                          <a
                            href="#"
                            onClick={(event) => {
                              event.preventDefault()
                              goToArticle(activePerspectiveItem.story)
                            }}
                          >
                            {activePerspectiveItem.story.title}
                          </a>
                        </div>
                        <div className="sbs-excerpt sbs-excerpt-feature">{getStoryDescription(activePerspectiveItem.story, 240)}</div>
                        <div className="sbs-footer">
                          <span className="sbs-author">{activePerspectiveItem.story.author || getMediaOutlet(activePerspectiveItem.story)}</span>
                          <a
                            href="#"
                            className="sbs-read"
                            onClick={(event) => {
                              event.preventDefault()
                              goToArticle(activePerspectiveItem.story)
                            }}
                          >
                            Read full story →
                          </a>
                        </div>
                      </div>
                    </article>
                  )}

                  <aside className="sbs-rail" aria-label="Coverage comparison list">
                    <div className="sbs-rail-title">Coverage snapshot</div>
                    <div className="sbs-rail-list">
                      {visiblePerspectiveStories.map(({ story, perspective }, index) => (
                        <button
                          key={`${story.url || story.title || 'rail'}-${index}`}
                          type="button"
                          className={`sbs-rail-item${index === resolvedPerspectiveSourceIndex ? ' active' : ''}`}
                          onClick={() => setActivePerspectiveSourceIndex(index)}
                        >
                          <span className="sbs-rail-source" style={perspective.sourceStyle}>{getMediaOutlet(story)}</span>
                          <span className="sbs-rail-headline">{truncateText(story.title, 88)}</span>
                          <span className="sbs-rail-meta">{perspective.label} · {getStoryTime(story)}</span>
                        </button>
                      ))}
                    </div>
                  </aside>
                </div>

                <button className="sbs-nav-btn" type="button" onClick={nextPerspectiveGroup} aria-label="Next side-by-side story">
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
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
