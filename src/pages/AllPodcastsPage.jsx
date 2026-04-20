import { useState, useEffect, useRef } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import DateTicker from '../components/layout/DateTicker'
import { fetchTrendingContent } from '../newsService'
import { searchRSSContent, fetchRSSPodcasts } from '../rssService'
import { getImageProps } from '../utils/imageUtils'
import { getCategoryConfig } from '../utils/categoryConfig'
import { filterContentByCategory } from '../utils/categoryFiltering'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { deriveMediaOutlet } from '../utils/sourceUtils'
import { matchesTopicQuery } from '../utils/topicFiltering'
import './AllNewsPage.css'

function AllPodcastsPage({ category = null }) {
  const { categoryName } = useParams()
  const { topic, hasActiveTopic } = useSearch()
  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [visibleCount, setVisibleCount] = useState(8)
  const LOAD_MORE_SIZE = 8
  const sourceTickerRef = useRef(null)

  const toStr = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) return value.map(toStr).filter(Boolean).join(', ')
    if (typeof value === 'object' && typeof value._ === 'string') return value._
    return ''
  }

  const formatContextLabel = (value) => {
    if (!value) return 'All Podcasts'
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength).trim()}...`
  }

  const filterContext = categoryName || category || (hasActiveTopic ? topic : null)
  const categoryConfig = getCategoryConfig(filterContext)

  useEffect(() => {
    loadPodcasts()
  }, [categoryName, category, topic])

  useEffect(() => {
    if (selectedSource !== 'ALL' && !podcasts.some((item) => item.source === selectedSource)) {
      setSelectedSource('ALL')
    }
  }, [podcasts, selectedSource])

  const loadPodcasts = async () => {
    setLoading(true)
    try {
      const normalizePodcastItem = (item) => ({
        ...item,
        title: toStr(item?.title),
        description: toStr(item?.description),
        type: toStr(item?.type),
        source: deriveMediaOutlet({ source: toStr(item?.source), url: toStr(item?.link || item?.url) }) || 'Podcast Desk',
        hosts: toStr(item?.hosts),
        category: toStr(item?.category),
        publishedAt: toStr(item?.publishedAt || item?.time),
        link: toStr(item?.link || item?.url),
        image: toStr(item?.thumbnail) || toStr(item?.image),
      })

      if (hasActiveTopic && topic && topic.trim().length > 0) {
        const searchResults = await searchRSSContent(topic)
        const normalizedResults = (Array.isArray(searchResults) ? searchResults : []).map(normalizePodcastItem)
        let topicPodcasts = dedupeContentItems(normalizedResults.filter((item) => {
          const typeText = toStr(item?.type).toLowerCase()
          const categoryText = toStr(item?.category).toLowerCase()
          const sourceText = toStr(item?.source).toLowerCase()
          const linkText = toStr(item?.link).toLowerCase()
          return (
            typeText === 'podcast' ||
            categoryText.includes('podcast') ||
            categoryText.includes('audio') ||
            sourceText.includes('podcast') ||
            linkText.includes('podcast')
          )
        }))

        const MIN_TOPIC_PODCASTS = 20
        if (topicPodcasts.length < MIN_TOPIC_PODCASTS) {
          const podcastPool = await fetchRSSPodcasts()
          const supplemental = (Array.isArray(podcastPool) ? podcastPool : [])
            .map(normalizePodcastItem)
            .filter((item) => matchesTopicQuery(item, topic))
          topicPodcasts = dedupeContentItems([...topicPodcasts, ...supplemental])
        }

        setPodcasts(dedupeContentItems(topicPodcasts))
      } else {
        const podcastsData = await fetchTrendingContent(filterContext)
        const normalizedPodcasts = (Array.isArray(podcastsData) ? podcastsData : []).map(normalizePodcastItem)

        let filtered = normalizedPodcasts
        if (filterContext) {
          filtered = filterContentByCategory(normalizedPodcasts, filterContext, 1, { strict: true })
        }

        setPodcasts(dedupeContentItems(filtered))
      }
    } catch (error) {
      console.error('Error loading podcasts:', error)
      setPodcasts([])
    } finally {
      setLoading(false)
    }
  }

  const sources = ['ALL', ...new Set(podcasts.map((item) => item.source).filter(Boolean))]
  const filteredPodcasts = selectedSource === 'ALL'
    ? podcasts
    : podcasts.filter((item) => item.source === selectedSource)

  const handleSourceClick = (source) => {
    setSelectedSource(source)
    setVisibleCount(8)
  }

  const scrollTickerLeft = () => {
    sourceTickerRef.current?.scrollBy({ left: -240, behavior: 'smooth' })
  }

  const scrollTickerRight = () => {
    sourceTickerRef.current?.scrollBy({ left: 240, behavior: 'smooth' })
  }

  const contextLabel = formatContextLabel(filterContext)
  const monthDayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const leadStory = filteredPodcasts[0]
  const mostReadStories = filteredPodcasts.slice(1, 6)
  const featuredStories = filteredPodcasts.slice(1, 4)
  const latestStoriesAll = filteredPodcasts.slice(4)
  const latestStories = latestStoriesAll.slice(0, visibleCount)
  const hasMore = visibleCount < latestStoriesAll.length
  const remaining = latestStoriesAll.length - visibleCount
  const quickUpdates = filteredPodcasts.slice(0, 8)
  const breakingHeadlines = filteredPodcasts.slice(0, 10).map((item) => item.title).filter(Boolean)

  return (
    <div className="all-news-page">
      <div className="all-news-hero">
        <div className="all-news-hero-inner">
          <span className="all-news-kicker">{monthDayLabel}</span>
          <h1 className="all-news-title">Top {categoryConfig.title} Podcasts</h1>
          <p className="all-news-subtitle">
            {filterContext
              ? categoryConfig.subtitle
              : 'Listen to the latest episodes, interviews, and analysis from across the news cycle.'}
          </p>
          <div className="all-news-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{filteredPodcasts.length}</span>
              <span className="hero-stat-label">Episodes</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{Math.max(sources.length - 1, 0)}</span>
              <span className="hero-stat-label">Shows</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{selectedSource === 'ALL' ? 'Live' : selectedSource}</span>
              <span className="hero-stat-label">Feed</span>
            </div>
          </div>
        </div>
      </div>

      {!loading && breakingHeadlines.length > 0 && (
        <DateTicker breakingNews={breakingHeadlines} sticky={false} label="PODCAST NOW" showDate={false} />
      )}

      <div className="source-filter-container">
        <div className="source-filter-header">
          <h2 className="source-filter-title">Show / Host Ticker</h2>
          <span className="source-filter-count">
            {selectedSource === 'ALL' ? 'All shows active' : `${filteredPodcasts.length} episodes from ${selectedSource}`}
          </span>
        </div>
        <div className="source-ticker-row">
          <button className="slider-btn ticker-btn" onClick={scrollTickerLeft} aria-label="Scroll sources left">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <div className="source-pills" ref={sourceTickerRef}>
            {sources.map((source) => (
              <button
                key={source}
                className={`source-pill ${selectedSource === source ? 'active' : ''}`}
                onClick={() => handleSourceClick(source)}
              >
                {source}
              </button>
            ))}
          </div>
          <button className="slider-btn ticker-btn" onClick={scrollTickerRight} aria-label="Scroll sources right">
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      <div className="all-news-content">
        {loading ? (
          <div className="loading-state">Loading podcasts...</div>
        ) : filteredPodcasts.length === 0 ? (
          <div className="no-results">
            <p>No podcasts found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <>
            <section className="all-news-top-grid">
              {leadStory && (
                <article className="lead-story-card">
                  {leadStory.image && (
                    <a href={leadStory.link} target="_blank" rel="noopener noreferrer" className="lead-story-image">
                      <img {...getImageProps(leadStory.image, leadStory.title, 'podcasts')} />
                    </a>
                  )}
                  <div className="lead-story-content">
                    <div className="news-card-meta lead-story-meta">
                      <span className="news-card-source">{leadStory.category || leadStory.source}</span>
                      {leadStory.publishedAt && <span className="news-card-time">{leadStory.publishedAt}</span>}
                    </div>
                    <a href={leadStory.link} target="_blank" rel="noopener noreferrer" className="lead-story-headline-link">
                      <h2 className="lead-story-headline">{leadStory.title}</h2>
                    </a>
                    <p className="lead-story-description">
                      {truncateText(leadStory.description || '', 260)}
                    </p>
                    <div className="lead-story-footer">
                      <span className="lead-story-source">{leadStory.hosts || leadStory.source}</span>
                      <a href={leadStory.link} target="_blank" rel="noopener noreferrer" className="read-more-link">
                        Listen now →
                      </a>
                    </div>
                  </div>
                </article>
              )}

              <aside className="most-read-panel">
                <div className="panel-header">
                  <span className="panel-kicker">Now Listening</span>
                  <h2 className="panel-title">Top Episodes</h2>
                </div>
                <div className="most-read-list">
                  {mostReadStories.map((item, index) => (
                    <a
                      key={`${item.link || item.title}-${index}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="most-read-item"
                    >
                      <span className="most-read-rank">{index + 1}</span>
                      <div className="most-read-copy">
                        <span className="most-read-tag">{item.hosts || item.source}</span>
                        <h3 className="most-read-headline">{truncateText(item.title, 100)}</h3>
                      </div>
                    </a>
                  ))}
                </div>
              </aside>
            </section>

            {featuredStories.length > 0 && (
              <section className="secondary-stories-grid">
                {featuredStories.map((item, index) => (
                  <article key={`${item.link || item.title}-${index}`} className="secondary-story-card">
                    {item.image && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="secondary-story-image">
                        <img {...getImageProps(item.image, item.title, 'podcasts')} />
                      </a>
                    )}
                    <div className="secondary-story-content">
                      <div className="news-card-meta">
                        <span className="news-card-source">{item.hosts || item.source}</span>
                        {item.publishedAt && <span className="news-card-time">{item.publishedAt}</span>}
                      </div>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="secondary-story-link">
                        <h3 className="secondary-story-headline">{item.title}</h3>
                      </a>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="latest-news-layout">
              <div className="latest-news-column">
                <div className="panel-header latest-news-header">
                  <span className="panel-kicker">Live Audio</span>
                  <h2 className="panel-title">Latest Podcasts</h2>
                </div>

                <div className="latest-news-list">
                  {(latestStories.length > 0 ? latestStories : filteredPodcasts.slice(1)).map((item, index) => {
                    const isLast = index === latestStories.length - 1 && hasMore
                    return (
                    <article key={`${item.link || item.title}-${index}`} className={`latest-story-card${isLast ? ' latest-story-card--fade' : ''}`}>
                      {item.image && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="latest-story-image">
                          <img {...getImageProps(item.image, item.title, 'podcasts')} />
                        </a>
                      )}
                      <div className="latest-story-content">
                        <div className="news-card-meta">
                          <span className="news-card-source">{item.category || item.hosts || item.source}</span>
                          {item.publishedAt && <span className="news-card-time">{item.publishedAt}</span>}
                        </div>
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="latest-story-link">
                          <h3 className="latest-story-headline">{item.title}</h3>
                        </a>
                        {item.description && (
                          <p className="latest-story-description">
                            {truncateText(item.description, 180)}
                          </p>
                        )}
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="read-more-link">
                          Listen now →
                        </a>
                      </div>
                    </article>
                    )
                  })}
                </div>

                {hasMore && (
                  <div className="load-more-container">
                    <button className="load-more-btn" onClick={() => setVisibleCount(c => c + LOAD_MORE_SIZE)}>
                      Show {Math.min(remaining, LOAD_MORE_SIZE)} more
                      <span className="load-more-total">({remaining} remaining)</span>
                    </button>
                  </div>
                )}
              </div>

              <aside className="quick-updates-panel">
                <div className="panel-header">
                  <span className="panel-kicker">Audio Wire</span>
                  <h2 className="panel-title">Quick Picks</h2>
                </div>

                <div className="quick-updates-list">
                  {quickUpdates.map((item, index) => (
                    <a
                      key={`${item.link || item.title}-quick-${index}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="quick-update-item"
                    >
                      <span className="quick-update-source">{item.hosts || item.source}</span>
                      <h3 className="quick-update-headline">{truncateText(item.title, 88)}</h3>
                      {item.publishedAt && <span className="quick-update-time">{item.publishedAt}</span>}
                    </a>
                  ))}
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export default AllPodcastsPage
