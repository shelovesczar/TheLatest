import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { searchRSSContent } from '../rssService'
import { fetchRSSNews } from '../newsService'
import { getImageProps } from '../utils/imageUtils'
import { recordHistory, searchArchive } from '../utils/savedArticles'
import DateTicker from '../components/layout/DateTicker'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import './AllNewsPage.css'
import './SearchResults.css'

const truncate = (text, max) => {
  if (!text) return ''
  return text.length <= max ? text : `${text.substring(0, max).trim()}...`
}

function SearchResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''

  // Local controlled input — initialise from URL so back/forward works
  const [inputValue, setInputValue] = useState(query)
  const inputRef = useRef(null)

  const [results, setResults]             = useState([])
  const [archiveResults, setArchiveResults] = useState([])
  const [feedNews, setFeedNews]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [feedLoading, setFeedLoading]     = useState(true)
  const [selectedSource, setSelectedSource] = useState('ALL')

  // Keep input in sync when the URL query changes (e.g. back button)
  useEffect(() => { setInputValue(query) }, [query])

  // Fetch default news feed (shown when no query)
  useEffect(() => {
    setFeedLoading(true)
    fetchRSSNews()
      .then(data => setFeedNews(Array.isArray(data) ? data : []))
      .catch(() => setFeedNews([]))
      .finally(() => setFeedLoading(false))
  }, [])

  // Run search whenever URL query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    searchRSSContent(query)
      .then(data => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false))

    // Also search saved + history archive
    setArchiveResults(searchArchive(query))
  }, [query])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  const goToArticle = useCallback((article) => {
    recordHistory(article)
    navigate('/article', { state: { article } })
  }, [navigate])

  const handleClear = () => {
    setInputValue('')
    navigate('/search')
    inputRef.current?.focus()
  }

  // ── Default feed layout helpers ──────────────────────────────
  const toStr = (v) => {
    if (!v) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.map(toStr).filter(Boolean).join(', ')
    if (typeof v === 'object' && v._) return v._
    return String(v)
  }
  const normalize = (item) => ({
    ...item,
    title:       toStr(item.title),
    description: toStr(item.description),
    source:      toStr(item.source),
    publishedAt: toStr(item.publishedAt || item.time),
    link:        toStr(item.link || item.url),
    image:       toStr(item.image),
  })

  const normalizedFeed = feedNews.map(normalize)
  const sources        = ['ALL', ...new Set(normalizedFeed.map(i => i.source).filter(Boolean))]
  const displayFeed    = selectedSource === 'ALL'
    ? normalizedFeed
    : normalizedFeed.filter(i => i.source === selectedSource)

  const leadStory        = displayFeed[0]
  const mostReadStories  = displayFeed.slice(1, 6)
  const featuredStories  = displayFeed.slice(1, 4)
  const latestStories    = displayFeed.slice(4)
  const quickUpdates     = displayFeed.slice(0, 8)
  const tickers          = displayFeed.slice(0, 10).map(i => i.title).filter(Boolean)
  const monthDay         = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const hasQuery   = !!query.trim()
  const isSearching = hasQuery && loading
  const noResults   = hasQuery && !loading && results.length === 0

  return (
    <div className="search-results-page">

      {/* ── Hero / Search Bar ──────────────────────────────── */}
      <div className="sr-hero">
        <div className="sr-hero-inner">
          <h1 className="sr-hero-title">
            {hasQuery ? `"${query}"` : 'Search'}
          </h1>
          <p className="sr-hero-subtitle">
            {hasQuery
              ? `${results.length} result${results.length !== 1 ? 's' : ''} across all sources`
              : 'Search news, opinions, videos, and podcasts'}
          </p>

          <form className="sr-search-form" onSubmit={handleSubmit} role="search">
            <div className="sr-search-wrap">
              <FontAwesomeIcon icon={faSearch} className="sr-search-icon" />
              <input
                ref={inputRef}
                type="search"
                className="sr-search-input"
                placeholder="Search all news..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                aria-label="Search news"
                autoComplete="off"
                autoFocus
              />
              {inputValue && (
                <button
                  type="button"
                  className="sr-clear-btn"
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
              <button type="submit" className="sr-submit-btn" aria-label="Search">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Search Results ─────────────────────────────────── */}
      {hasQuery && (
        <div className="sr-results-section">
          {isSearching ? (
            <div className="sr-loading">
              <div className="spinner" />
              <p>Searching for "{query}"…</p>
            </div>
          ) : noResults ? (
            <div className="no-results">
              <h2>No results found</h2>
              <p>Try different keywords or browse our <Link to="/">latest news</Link></p>
            </div>
          ) : (
            <>
              <div className="sr-results-header">
                <span className="sr-count">{results.length} articles found</span>
              </div>
              <div className="results-grid">
                {results.map((article, index) => (
                  <a
                    key={index}
                    href="#"
                    onClick={e => { e.preventDefault(); goToArticle(article) }}
                    className="result-card"
                  >
                    {article.image && (
                      <div className="result-image">
                        <img {...getImageProps(article.image, article.title, 'news')} />
                      </div>
                    )}
                    <div className="result-content">
                      <h3 className="result-title">{article.title}</h3>
                      <p className="result-description">
                        {truncate(article.description, 150)}
                      </p>
                      <div className="result-meta">
                        <span className="result-source">{article.source}</span>
                        <span className="result-date">{article.publishedAt || article.date}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Archive results */}
              {archiveResults.length > 0 && (
                <div className="sr-archive-section">
                  <div className="sr-archive-header">
                    <span className="panel-kicker">Your Archive</span>
                    <h3 className="panel-title">From Saved &amp; History</h3>
                  </div>
                  <div className="results-grid">
                    {archiveResults.map((article, i) => (
                      <a
                        key={i}
                        href="#"
                        onClick={e => { e.preventDefault(); goToArticle(article) }}
                        className="result-card result-card--archive"
                      >
                        {article.image && (
                          <div className="result-image">
                            <img {...getImageProps(article.image, article.title, 'news')} />
                          </div>
                        )}
                        <div className="result-content">
                          <h3 className="result-title">{article.title}</h3>
                          <p className="result-description">{truncate(article.description, 150)}</p>
                          <div className="result-meta">
                            <span className="result-source">{article.source}</span>
                            <span className="result-date">{article.publishedAt || article.date}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Default feed (shown when no active query) ──────── */}
      {!hasQuery && (
        <>
          {!feedLoading && tickers.length > 0 && (
            <DateTicker breakingNews={tickers} sticky={false} label="TRENDING NOW" />
          )}

          <div className="source-filter-container">
            <div className="source-filter-header">
              <h2 className="source-filter-title">Browse by Source</h2>
              <span className="source-filter-count">
                {selectedSource === 'ALL' ? 'All sources active' : `${displayFeed.length} stories from ${selectedSource}`}
              </span>
            </div>
            <div className="source-pills">
              {sources.map(src => (
                <button
                  key={src}
                  className={`source-pill ${selectedSource === src ? 'active' : ''}`}
                  onClick={() => setSelectedSource(src)}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          <div className="all-news-content">
            {feedLoading ? (
              <div className="sr-loading">
                <div className="spinner" />
                <p>Loading latest news…</p>
              </div>
            ) : displayFeed.length === 0 ? (
              <div className="no-results"><p>No articles found.</p></div>
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
                          <span className="news-card-source">{leadStory.source}</span>
                          {leadStory.publishedAt && <span className="news-card-time">{leadStory.publishedAt}</span>}
                        </div>
                        <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="lead-story-headline-link">
                          <h2 className="lead-story-headline">{leadStory.title}</h2>
                        </a>
                        <p className="lead-story-description">{truncate(leadStory.description || '', 260)}</p>
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
                      {mostReadStories.map((item, i) => (
                        <a key={i} href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="most-read-item">
                          <span className="most-read-rank">{i + 1}</span>
                          <div className="most-read-copy">
                            <span className="most-read-tag">{item.source}</span>
                            <h3 className="most-read-headline">{truncate(item.title, 100)}</h3>
                          </div>
                        </a>
                      ))}
                    </div>
                  </aside>
                </section>

                {featuredStories.length > 0 && (
                  <section className="secondary-stories-grid">
                    {featuredStories.map((item, i) => (
                      <article key={i} className="secondary-story-card">
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
                      {(latestStories.length > 0 ? latestStories : displayFeed.slice(1)).map((item, i) => (
                        <article key={i} className="latest-story-card">
                          {item.image && (
                            <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="latest-story-image">
                              <img {...getImageProps(item.image, item.title, 'news')} />
                            </a>
                          )}
                          <div className="latest-story-content">
                            <div className="news-card-meta">
                              <span className="news-card-source">{item.source}</span>
                              {item.publishedAt && <span className="news-card-time">{item.publishedAt}</span>}
                            </div>
                            <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="latest-story-link">
                              <h3 className="latest-story-headline">{item.title}</h3>
                            </a>
                            {item.description && (
                              <p className="latest-story-description">{truncate(item.description, 180)}</p>
                            )}
                            <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="read-more-link">
                              Continue reading →
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <aside className="quick-updates-panel">
                    <div className="panel-header">
                      <span className="panel-kicker">Desk Wire</span>
                      <h2 className="panel-title">Quick Updates</h2>
                    </div>
                    <div className="quick-updates-list">
                      {quickUpdates.map((item, i) => (
                        <a key={i} href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="quick-update-item">
                          <span className="quick-update-source">{item.source}</span>
                          <h3 className="quick-update-headline">{truncate(item.title, 88)}</h3>
                          {item.publishedAt && <span className="quick-update-time">{item.publishedAt}</span>}
                        </a>
                      ))}
                    </div>
                  </aside>
                </section>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default SearchResults
