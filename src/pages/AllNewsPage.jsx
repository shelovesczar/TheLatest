import { useState, useEffect, useCallback } from 'react'
import { useSearch } from '../context/SearchContext'
import { useParams, useNavigate } from 'react-router-dom'
import { recordHistory } from '../utils/savedArticles'
import DateTicker from '../components/layout/DateTicker'
import { fetchRSSNews } from '../newsService'
import { getImageProps } from '../utils/imageUtils'
import { getCategoryConfig } from '../utils/categoryConfig'
import { filterContentByCategory } from '../utils/categoryFiltering'
import './AllNewsPage.css'

function AllNewsPage({ category = null }) {
  const { categoryName } = useParams()
  const navigate = useNavigate()
  const { topic, hasActiveTopic } = useSearch()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [tickerPage, setTickerPage] = useState(0)
  const [visibleCount, setVisibleCount] = useState(8)
  const TICKER_PAGE_SIZE = 5
  const LOAD_MORE_SIZE = 8

  // Navigate to the on-site article reader
  const goToArticle = useCallback((article) => {
    recordHistory(article)
    navigate('/article', { state: { article } })
  }, [navigate])

  const toStr = (value) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) return value.map(toStr).filter(Boolean).join(', ')
    if (typeof value === 'object' && typeof value._ === 'string') return value._
    return ''
  }

  const normalizeArticle = (item) => ({
    ...item,
    title: toStr(item?.title),
    description: toStr(item?.description),
    content: toStr(item?.content),
    source: toStr(item?.source),
    category: toStr(item?.category),
    publishedAt: toStr(item?.publishedAt || item?.time),
    link: toStr(item?.link || item?.url),
    image: toStr(item?.image),
  })

  const formatContextLabel = (value) => {
    if (!value) return 'All News'
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength).trim()}...`
  }

  const getDynamicTruncation = (imageUrl, text) => {
    if (!text) return ''

    const img = new Image()
    img.src = imageUrl

    let maxLength = 120
    const aspectRatio = img.naturalWidth / img.naturalHeight

    if (aspectRatio > 1.5) maxLength = 180
    else if (aspectRatio > 1.2) maxLength = 150
    else if (aspectRatio < 0.8) maxLength = 80

    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength).trim()}...`
  }

  const filterContext = categoryName || category || (hasActiveTopic ? topic : null)
  const categoryConfig = getCategoryConfig(filterContext)

  useEffect(() => {
    loadNews()
  }, [categoryName, category, topic])

  useEffect(() => {
    if (selectedSource !== 'ALL' && !news.some((item) => item.source === selectedSource)) {
      setSelectedSource('ALL')
    }
  }, [news, selectedSource])

  const loadNews = async () => {
    setLoading(true)
    try {
      console.log('[AllNewsPage] Loading news, filterContext:', filterContext)
      const newsData = await fetchRSSNews(filterContext)
      console.log('[AllNewsPage] Fetched data:', newsData?.length || 0, 'articles')
      const normalizedNews = (Array.isArray(newsData) ? newsData : []).map(normalizeArticle)
      console.log('[AllNewsPage] Normalized data:', normalizedNews?.length || 0, 'articles')

      let filtered = normalizedNews
      if (filterContext) {
        console.log('[AllNewsPage] Filtering by category:', filterContext)
        filtered = filterContentByCategory(normalizedNews, filterContext, 1, { strict: true })
        console.log('[AllNewsPage] After filtering:', filtered?.length || 0, 'articles')
      }

      console.log('[AllNewsPage] Final news to display:', filtered?.length || 0)
      setNews(filtered)
    } catch (error) {
      console.error('Error loading news:', error)
      setNews([])
    } finally {
      setLoading(false)
    }
  }

  const sources = ['ALL', ...new Set(news.map((item) => item.source).filter(Boolean))]
  const filteredNews = selectedSource === 'ALL'
    ? news
    : news.filter((item) => item.source === selectedSource)

  // Paginated ticker — shows TICKER_PAGE_SIZE pills at a time.
  // 'ALL' is always pinned left; the remaining source names page independently.
  const pagedSources = sources.filter(s => s !== 'ALL')
  const totalPages = Math.ceil(pagedSources.length / TICKER_PAGE_SIZE)
  const safeTickerPage = tickerPage % (totalPages || 1)
  const visibleSources = [
    'ALL',
    ...pagedSources.slice(safeTickerPage * TICKER_PAGE_SIZE, safeTickerPage * TICKER_PAGE_SIZE + TICKER_PAGE_SIZE)
  ]

  const handleSourceClick = (source) => {
    setSelectedSource(source)
    setVisibleCount(8) // reset pagination when switching source
    if (source !== 'ALL') {
      // Advance to the next page so the user always sees fresh options
      setTickerPage(prev => (prev + 1) % (totalPages || 1))
    }
  }

  const contextLabel = formatContextLabel(filterContext)
  const monthDayLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const leadStory = filteredNews[0]
  const mostReadStories = filteredNews.slice(1, 6)
  const featuredStories = filteredNews.slice(1, 4)
  const latestStoriesAll = filteredNews.slice(4)
  const latestStories = latestStoriesAll.slice(0, visibleCount)
  const hasMore = visibleCount < latestStoriesAll.length
  const remaining = latestStoriesAll.length - visibleCount
  const quickUpdates = filteredNews.slice(0, 8)
  const breakingHeadlines = filteredNews.slice(0, 10).map((item) => item.title).filter(Boolean)

  return (
    <div className="all-news-page">
      <div className="all-news-hero">
        <div className="all-news-hero-inner">
          <span className="all-news-kicker">{monthDayLabel}</span>
          <h1 className="all-news-title">{categoryConfig.newsTitle}</h1>
          <p className="all-news-subtitle">
            {filterContext
              ? categoryConfig.subtitle
              : 'Live headlines, top stories, and fast-moving updates from across the news cycle.'}
          </p>
          <div className="all-news-hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-value">{filteredNews.length}</span>
              <span className="hero-stat-label">Stories</span>
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

      {!loading && breakingHeadlines.length > 0 && (
        <DateTicker breakingNews={breakingHeadlines} sticky={false} label="TRENDING NOW" showDate={false} />
      )}

      <div className="source-filter-container">
        <div className="source-filter-header">
          <h2 className="source-filter-title">Source Ticker</h2>
          <span className="source-filter-count">
            {selectedSource === 'ALL' ? 'All sources active' : `${filteredNews.length} stories from ${selectedSource}`}
          </span>
        </div>
        <div className="source-pills">
          {visibleSources.map((source) => (
            <button
              key={source}
              className={`source-pill ${selectedSource === source ? 'active' : ''}`}
              onClick={() => handleSourceClick(source)}
            >
              {source}
            </button>
          ))}
          {totalPages > 1 && (
            <button
              className="source-pill ticker-next-btn"
              onClick={() => setTickerPage(prev => (prev + 1) % totalPages)}
              title={`Page ${safeTickerPage + 1} of ${totalPages} — click to see next 5 sources`}
            >
              More sources ›
            </button>
          )}
        </div>
      </div>

      <div className="all-news-content">
        {loading ? (
          <div className="loading-state">Loading news...</div>
        ) : filteredNews.length === 0 ? (
          <div className="no-results">
            <p>No news articles found{filterContext ? ` for "${filterContext}"` : ''}.</p>
          </div>
        ) : (
          <>
            <section className="all-news-top-grid">
              {leadStory && (
                <article className="lead-story-card">
                  {leadStory.image && (
                    <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="lead-story-image">
                      <img {...getImageProps(leadStory.image, leadStory.title, 'news')} />
                    </a>
                  )}
                  <div className="lead-story-content">
                    <div className="news-card-meta lead-story-meta">
                      <span className="news-card-source">{leadStory.category || leadStory.source}</span>
                      {leadStory.publishedAt && <span className="news-card-time">{leadStory.publishedAt}</span>}
                    </div>
                    <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="lead-story-headline-link">
                      <h2 className="lead-story-headline">{leadStory.title}</h2>
                    </a>
                    <p className="lead-story-description">
                      {truncateText(leadStory.description || leadStory.content || '', 260)}
                    </p>
                    <div className="lead-story-footer">
                      <span className="lead-story-source">{leadStory.source}</span>
                      <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="read-more-link">
                        Read full story →
                      </a>
                    </div>
                  </div>
                </article>
              )}

              <aside className="most-read-panel">
                <div className="panel-header">
                  <span className="panel-kicker">Now Reading</span>
                  <h2 className="panel-title">Most Read</h2>
                </div>
                <div className="most-read-list">
                  {mostReadStories.map((item, index) => (
                    <a
                      key={`${item.link || item.title}-${index}`}
                      href="#"
                      onClick={e => { e.preventDefault(); goToArticle(item) }}
                      className="most-read-item"
                    >
                      <span className="most-read-rank">{index + 1}</span>
                      <div className="most-read-copy">
                        <span className="most-read-tag">{item.source}</span>
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
                      <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="secondary-story-image">
                        <img {...getImageProps(item.image, item.title, 'news')} />
                      </a>
                    )}
                    <div className="secondary-story-content">
                      <div className="news-card-meta">
                        <span className="news-card-source">{item.source}</span>
                        {item.publishedAt && <span className="news-card-time">{item.publishedAt}</span>}
                      </div>
                      <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="secondary-story-link">
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
                  <h2 className="panel-title">Latest News</h2>
                </div>

                <div className="latest-news-list">
                  {(latestStories.length > 0 ? latestStories : filteredNews.slice(1)).map((item, index) => {
                    const isLast = index === latestStories.length - 1 && hasMore
                    return (
                    <article key={`${item.link || item.title}-${index}`} className={`latest-story-card${isLast ? ' latest-story-card--fade' : ''}`}>
                      {item.image && (
                        <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="latest-story-image">
                          <img {...getImageProps(item.image, item.title, 'news')} />
                        </a>
                      )}
                      <div className="latest-story-content">
                        <div className="news-card-meta">
                          <span className="news-card-source">{item.category || item.source}</span>
                          {item.publishedAt && <span className="news-card-time">{item.publishedAt}</span>}
                        </div>
                        <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="latest-story-link">
                          <h3 className="latest-story-headline">{item.title}</h3>
                        </a>
                        {item.description && (
                          <p className="latest-story-description">
                            {item.image
                              ? getDynamicTruncation(item.image, item.description)
                              : truncateText(item.description, 180)}
                          </p>
                        )}
                        <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="read-more-link">
                          Continue reading →
                        </a>
                      </div>
                    </article>
                    )
                  })}
                </div>

                {hasMore && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={() => setVisibleCount(c => c + LOAD_MORE_SIZE)}
                    >
                      Show {Math.min(remaining, LOAD_MORE_SIZE)} more
                      <span className="load-more-total">({remaining} remaining)</span>
                    </button>
                  </div>
                )}
              </div>

              <aside className="quick-updates-panel">
                <div className="panel-header">
                  <span className="panel-kicker">Desk Wire</span>
                  <h2 className="panel-title">Quick Updates</h2>
                </div>

                <div className="quick-updates-list">
                  {quickUpdates.map((item, index) => (
                    <a
                      key={`${item.link || item.title}-quick-${index}`}
                      href="#"
                      onClick={e => { e.preventDefault(); goToArticle(item) }}
                      className="quick-update-item"
                    >
                      <span className="quick-update-source">{item.source}</span>
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

export default AllNewsPage
