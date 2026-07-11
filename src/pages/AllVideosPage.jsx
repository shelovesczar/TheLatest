import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import AdBreak from '../components/common/AdBreak'
import { fetchVideos } from '../newsService'
import { searchRSSContent, fetchRSSVideos } from '../rssService'
import { getImageProps } from '../utils/imageUtils'
import { getCategoryConfig } from '../utils/categoryConfig'
import { filterContentByCategory } from '../utils/categoryFiltering'
import { deriveMediaOutlet } from '../utils/sourceUtils'
import { matchesTopicQuery } from '../utils/topicFiltering'
import { getTopicPageConfig } from '../utils/navigationConfig'
import { isVideoItem, isPodcastItem, dedupeByMediaKey, removeCrossDuplicates } from '../utils/mediaClassification'
import { formatDateOnly } from '../utils/dateUtils'
import { resolveContentHref } from '../utils/storyRouting'
import { getGeneratedContentLabel } from '../utils/contentLabels'
import './AllNewsPage.css'

function toTextValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(toTextValue).filter(Boolean).join(', ')
  if (typeof value === 'object' && typeof value._ === 'string') return value._
  return ''
}

function AllVideosPage({ category = null }) {
  const { categoryName, topicSlug } = useParams()
  const { topic, hasActiveTopic } = useSearch()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [visibleCount, setVisibleCount] = useState(8)
  const LOAD_MORE_SIZE = 8
  const sourceTickerRef = useRef(null)

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength).trim()}...`
  }

  const topicConfig = getTopicPageConfig(topicSlug)
  const activeTopicQuery = topicConfig?.query || (hasActiveTopic ? topic : null)
  const filterContext = categoryName || category || topicConfig?.slug || activeTopicQuery
  const categoryConfig = topicConfig ? {
    title: topicConfig.title,
    newsTitle: `${topicConfig.title} Videos`,
    subtitle: topicConfig.subtitle,
    image: topicConfig.image
  } : getCategoryConfig(filterContext)

  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      const normalizeVideoItem = (item) => ({
        ...item,
        title: toTextValue(item?.title),
        description: toTextValue(item?.description),
        source: deriveMediaOutlet({ source: toTextValue(item?.source), url: toTextValue(item?.link || item?.url) }) || 'Video Desk',
        type: toTextValue(item?.type),
        category: toTextValue(item?.category),
        publishedAt: toTextValue(item?.publishedAt || item?.time),
        link: toTextValue(item?.link || item?.url),
        image: toTextValue(item?.thumbnail) || toTextValue(item?.image),
        duration: toTextValue(item?.duration),
      })

      if (activeTopicQuery && activeTopicQuery.trim().length > 0) {
        const searchResults = await searchRSSContent(activeTopicQuery)
        const normalizedResults = (Array.isArray(searchResults) ? searchResults : []).map(normalizeVideoItem)
        const searchVideos = normalizedResults.filter(isVideoItem)
        const searchPodcasts = normalizedResults.filter(isPodcastItem)
        let topicVideos = dedupeByMediaKey(removeCrossDuplicates(searchVideos, searchPodcasts))

        const MIN_TOPIC_VIDEOS = 20
        if (topicVideos.length < MIN_TOPIC_VIDEOS) {
          const videoPool = await fetchRSSVideos()
          const supplemental = (Array.isArray(videoPool) ? videoPool : [])
            .map(normalizeVideoItem)
            .filter((item) => !isPodcastItem(item))
            .filter((item) => matchesTopicQuery(item, activeTopicQuery))
          topicVideos = dedupeByMediaKey([...topicVideos, ...supplemental])
        }

        if (topicVideos.length < MIN_TOPIC_VIDEOS) {
          const generatedFallback = await fetchVideos(null, activeTopicQuery)
          topicVideos = dedupeByMediaKey([...topicVideos, ...(Array.isArray(generatedFallback) ? generatedFallback : []).map(normalizeVideoItem)])
        }

        setVideos(dedupeByMediaKey(topicVideos))
      } else {
        const videosData = await fetchVideos(filterContext)
        const normalizedVideos = (Array.isArray(videosData) ? videosData : [])
          .map(normalizeVideoItem)
          .filter((item) => !isPodcastItem(item))

        let filtered = normalizedVideos
        if (filterContext) {
          filtered = filterContentByCategory(normalizedVideos, filterContext, 1, { strict: true })
        }

        setVideos(dedupeByMediaKey(filtered))
      }
    } catch (error) {
      console.error('Error loading videos:', error)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [activeTopicQuery, filterContext])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  useEffect(() => {
    if (selectedSource !== 'ALL' && !videos.some((item) => item.source === selectedSource)) {
      setSelectedSource('ALL')
    }
  }, [videos, selectedSource])

  const sources = ['ALL', ...new Set(videos.map((item) => item.source).filter(Boolean))]
  const filteredVideos = selectedSource === 'ALL'
    ? videos
    : videos.filter((item) => item.source === selectedSource)

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

  const leadStory = filteredVideos[0]
  const leadStoryHref = leadStory ? resolveContentHref(leadStory) : ''
  const featuredStories = filteredVideos.slice(1, 4)
  const latestStoriesAll = filteredVideos.slice(4)
  const latestStories = latestStoriesAll.slice(0, visibleCount)
  const hasMore = visibleCount < latestStoriesAll.length
  const remaining = latestStoriesAll.length - visibleCount
  const quickUpdates = filteredVideos.slice(0, 8)

  return (
    <div className="all-news-page">
      <div className="all-news-hero">
        <div className="all-news-hero-inner">
          <h1 className="all-news-title">Top {categoryConfig.title} Videos</h1>
          <p className="all-news-subtitle">Select Source(s)</p>
          <div className="all-news-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{filteredVideos.length}</span>
              <span className="hero-stat-label">Videos</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{Math.max(sources.length - 1, 0)}</span>
              <span className="hero-stat-label">Sources</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-value">{selectedSource === 'ALL' ? 'Live' : selectedSource}</span>
              <span className="hero-stat-label">Feed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="source-filter-container">
        <div className="source-filter-header">
          <h2 className="source-filter-title">Source Ticker</h2>
          <span className="source-filter-count">
            {selectedSource === 'ALL' ? 'All sources active' : `${filteredVideos.length} videos from ${selectedSource}`}
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
          <div className="loading-state">Loading videos...</div>
        ) : filteredVideos.length === 0 ? (
          <div className="no-results">
            <p>No videos found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <>
            <section className="all-news-top-grid">
              {leadStory && (
                <article className="lead-story-card">
                  {leadStory.image && (
                    <a href={leadStoryHref} target="_blank" rel="noopener noreferrer" className="lead-story-image">
                      <img {...getImageProps(leadStory.image, leadStory.title, 'videos')} />
                    </a>
                  )}
                  <div className="lead-story-content">
                    <div className="news-card-meta lead-story-meta">
                      <span className="news-card-source">{leadStory.category || leadStory.source}</span>
                      {getGeneratedContentLabel(leadStory) && <span className="news-card-time">{getGeneratedContentLabel(leadStory)}</span>}
                      {leadStory.publishedAt && <span className="news-card-time">{formatDateOnly(leadStory.publishedAt)}</span>}
                    </div>
                    <a href={leadStoryHref} target="_blank" rel="noopener noreferrer" className="lead-story-headline-link">
                      <h2 className="lead-story-headline">{leadStory.title}</h2>
                    </a>
                    <p className="lead-story-description">
                      {truncateText(leadStory.description || '', 260)}
                    </p>
                    <div className="lead-story-footer">
                      <span className="lead-story-source">{leadStory.duration || leadStory.source}</span>
                      <a href={leadStoryHref} target="_blank" rel="noopener noreferrer" className="read-more-link">
                        Watch video →
                      </a>
                    </div>
                  </div>
                </article>
              )}

              <aside className="all-news-ad-panel" aria-label="Advertisement">
                <AdBreak
                  slot="article-sidebar"
                  campaignIndex={2}
                  variationKey="all-videos-top"
                  sizes={{
                    desktop: { width: 320, height: 350 },
                    tablet: { width: 320, height: 250 },
                    mobile: { width: 320, height: 100 }
                  }}
                />
              </aside>
            </section>

            {featuredStories.length > 0 && (
              <section className="secondary-stories-grid">
                {featuredStories.map((item, index) => (
                  <article key={`${item.link || item.title}-${index}`} className="secondary-story-card">
                    {item.image && (
                      <a href={resolveContentHref(item)} target="_blank" rel="noopener noreferrer" className="secondary-story-image">
                        <img {...getImageProps(item.image, item.title, 'videos')} />
                      </a>
                    )}
                    <div className="secondary-story-content">
                      <div className="news-card-meta">
                        <span className="news-card-source">{item.source}</span>
                        {getGeneratedContentLabel(item) && <span className="news-card-time">{getGeneratedContentLabel(item)}</span>}
                        {item.publishedAt && <span className="news-card-time">{formatDateOnly(item.publishedAt)}</span>}
                      </div>
                      <a href={resolveContentHref(item)} target="_blank" rel="noopener noreferrer" className="secondary-story-link">
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
                  <span className="panel-kicker">Live Coverage</span>
                  <h2 className="panel-title">Latest Videos</h2>
                </div>

                <div className="latest-news-list">
                  {(latestStories.length > 0 ? latestStories : filteredVideos.slice(1)).map((item, index) => {
                    const isLast = index === latestStories.length - 1 && hasMore
                    const href = resolveContentHref(item)
                    return (
                    <article key={`${item.link || item.title}-${index}`} className={`latest-story-card${isLast ? ' latest-story-card--fade' : ''}`}>
                      {item.image && (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="latest-story-image">
                          <img {...getImageProps(item.image, item.title, 'videos')} />
                        </a>
                      )}
                      <div className="latest-story-content">
                        <div className="news-card-meta">
                          <span className="news-card-source">{item.category || item.source}</span>
                          {getGeneratedContentLabel(item) && <span className="news-card-time">{getGeneratedContentLabel(item)}</span>}
                          {item.publishedAt && <span className="news-card-time">{formatDateOnly(item.publishedAt)}</span>}
                        </div>
                        <a href={href} target="_blank" rel="noopener noreferrer" className="latest-story-link">
                          <h3 className="latest-story-headline">{item.title}</h3>
                        </a>
                        {item.description && (
                          <p className="latest-story-description">
                            {truncateText(item.description, 180)}
                          </p>
                        )}
                        <a href={href} target="_blank" rel="noopener noreferrer" className="read-more-link">
                          Watch now →
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
                  <span className="panel-kicker">Video Wire</span>
                  <h2 className="panel-title">Quick Clips</h2>
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
                      <span className="quick-update-source">{item.source}</span>
                      <h3 className="quick-update-headline">{truncateText(item.title, 88)}</h3>
                      {item.publishedAt && <span className="quick-update-time">{formatDateOnly(item.publishedAt)}</span>}
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

export default AllVideosPage
