import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { searchRSSContent } from '../rssService'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { recordHistory, searchArchive } from '../utils/savedArticles'
import DateTicker from '../components/layout/DateTicker'
import TopStories from '../components/sections/TopStories'
import AISummary from '../components/sections/AISummary'
import Opinions from '../components/sections/Opinions'
import SocialMedia from '../components/sections/SocialMedia'
import Videos from '../components/sections/Videos'
import Podcasts from '../components/sections/Podcasts'
import AdBreak from '../components/common/AdBreak'
import { formatDateOnly } from '../utils/dateUtils'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { filterItemsByTopic } from '../utils/topicFiltering'
import { getRandomTrendingPosts } from '../socialMediaService'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import OptimizedImage from '../components/common/OptimizedImage'
import CardSkeleton from '../components/common/CardSkeleton'
import './AllNewsPage.css'
import './SearchResults.css'

const truncate = (text, max) => {
  if (!text) return ''
  return text.length <= max ? text : `${text.substring(0, max).trim()}...`
}

const formatPublishedDate = (dateString) => {
  if (!dateString) return 'Recently'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Recently'
    
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // For older dates, show month and day
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Recently'
  }
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
  const [queryNews, setQueryNews] = useState([])
  const [queryOpinions, setQueryOpinions] = useState([])
  const [queryVideos, setQueryVideos] = useState([])
  const [queryPodcasts, setQueryPodcasts] = useState([])
  const [querySocialPosts, setQuerySocialPosts] = useState([])
  const [feedNews, setFeedNews]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [feedLoading, setFeedLoading]     = useState(true)
  const [querySectionsLoading, setQuerySectionsLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280))
  const [activeStory, setActiveStory] = useState(0)
  const virtualResultsRef = useRef(null)

  // Keep input in sync when the URL query changes (e.g. back button)
  useEffect(() => { setInputValue(query) }, [query])

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
      setQueryNews([])
      setQueryOpinions([])
      setQueryVideos([])
      setQueryPodcasts([])
      setQuerySocialPosts([])
      return
    }
    setLoading(true)
    console.log('[SearchResults] Initiating search for:', query)
    searchRSSContent(query, {
      preferFresh: true,
      minStrictResults: 4
    })
      .then(data => {
        const items = Array.isArray(data) ? data : []
        console.log('[SearchResults] Got results:', items.length, 'items')
        // Sort by most recent first - parse dates with fallback to epoch for invalid dates
        const sorted = items.sort((a, b) => {
          let dateA = new Date(a.publishedAt || 0)
          let dateB = new Date(b.publishedAt || 0)
          // Handle invalid dates - treat as epoch (oldest)
          if (isNaN(dateA.getTime())) dateA = new Date(0)
          if (isNaN(dateB.getTime())) dateB = new Date(0)
          return dateB - dateA
        })
        setResults(sorted)
        console.log('[SearchResults] Results state updated with', sorted.length, 'items')
      })
      .catch(err => {
        console.error('[SearchResults] Search error:', err)
        setResults([])
      })
      .finally(() => setLoading(false))

    // Also search saved + history archive
    const archiveResults = searchArchive(query)
    console.log('[SearchResults] Archive results:', archiveResults.length, 'items')
    setArchiveResults(archiveResults)
  }, [query])

  useEffect(() => {
    if (!query.trim()) {
      return
    }

    let ignore = false
    const narrow = (items = [], limit = 6) => dedupeContentItems(filterItemsByTopic(items, query)).slice(0, limit)

    const loadQuerySections = async () => {
      setQuerySectionsLoading(true)

      try {
        const [newsItems, opinionItems, videoItems, podcastItems, socialItems] = await Promise.all([
          results.length > 0
            ? Promise.resolve(results)
            : searchRSSContent(query, {
                preferFresh: true,
                strictSearch: false,
                relaxSearchFallback: true,
                minStrictResults: 4
              }),
          fetchOpinions('news', query),
          fetchVideos('news', query),
          fetchTrendingContent('news', query),
          getRandomTrendingPosts(6, query)
        ])

        if (ignore) return

        setQueryNews(narrow(newsItems, 15))
        setQueryOpinions(narrow(opinionItems, 6))
        setQueryVideos(narrow(videoItems, 6))
        setQueryPodcasts(narrow(podcastItems, 6))
        setQuerySocialPosts(Array.isArray(socialItems) ? socialItems.slice(0, 6) : [])
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load query sections:', error)
          setQueryNews([])
          setQueryOpinions([])
          setQueryVideos([])
          setQueryPodcasts([])
          setQuerySocialPosts([])
        }
      } finally {
        if (!ignore) {
          setQuerySectionsLoading(false)
        }
      }
    }

    loadQuerySections()

    return () => {
      ignore = true
    }
  }, [query, results])

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

  const getDescriptionLimit = () => {
    if (viewportWidth >= 1500) return 320
    if (viewportWidth >= 1280) return 260
    if (viewportWidth >= 1024) return 220
    if (viewportWidth >= 768) return 180
    return 130
  }

  const descriptionLimit = useMemo(() => getDescriptionLimit(), [viewportWidth])
  const searchStoryPool = results.length > 0 ? results : queryNews
  const featuredSearchStories = searchStoryPool.slice(0, 12)
  const remainingResults = featuredSearchStories.length > 0 ? results.slice(12) : results
  const sourceList = remainingResults.length > 0 ? remainingResults : results

  const resultVirtualizer = useVirtualizer({
    count: sourceList.length,
    getScrollElement: () => virtualResultsRef.current,
    estimateSize: () => 420,
    overscan: 8,
  })

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
  const hasLiveResults = results.length > 0
  const hasArchiveMatches = archiveResults.length > 0
  const hasSectionContent = searchStoryPool.length > 0 || queryOpinions.length > 0 || queryVideos.length > 0 || queryPodcasts.length > 0 || querySocialPosts.length > 0 || hasArchiveMatches
  const noResults   = hasQuery && !loading && !querySectionsLoading && !hasSectionContent

  return (
    <div className="search-results-page" id="search-top">

      {/* ── Hero / Search Bar ──────────────────────────────── */}
      {hasQuery && (
        <div className="sr-back-bar">
          <div className="sr-shell sr-back-bar-inner">
            <div className="sr-back-bar-copy">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Search: "{query}"</span>
            </div>
            <span className="sr-back-bar-count">{results.length} result{results.length !== 1 ? 's' : ''} across all sources</span>
          </div>
        </div>
      )}

      <div className="sr-hero">
        <div className="sr-hero-inner sr-shell">
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

          {hasQuery && (
            <div className="sr-topic-tabs">
              <a href="#news" className="sr-topic-pill">Side by Side</a>
              <a href="#search-results-list" className="sr-topic-pill">Results</a>
              {hasArchiveMatches && <a href="#archive-results" className="sr-topic-pill">Archive</a>}
            </div>
          )}
        </div>
      </div>

      {/* ── Search Results ─────────────────────────────────── */}
      {hasQuery && (
        <div className="sr-results-section sr-shell">
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
              <AISummary
                category={query}
                categoryTitle={query}
                description={`AI-generated summary of the latest coverage around ${query}.`}
                ignoreTopic={true}
              />

              {featuredSearchStories.length > 0 && (
                <TopStories
                  topStories={featuredSearchStories}
                  loading={querySectionsLoading && !hasLiveResults}
                  activeStory={activeStory}
                  setActiveStory={setActiveStory}
                  sectionTitle="Top Search Results"
                  sideBySideTitle="Top Stories - Side by Side"
                  showPerspectiveToggle={false}
                  defaultPerspectiveView={true}
                  seeMoreLabel="View all search results →"
                  categoryPath={`/search?q=${encodeURIComponent(query)}`}
                />
              )}

              <AdBreak slot="home-feed-inline" />

              <Opinions
                opinions={queryOpinions}
                loadingOpinions={querySectionsLoading}
                categoryPath={`/search?q=${encodeURIComponent(query)}`}
              />

              <AdBreak slot="section-break" />

              <SocialMedia
                socialPosts={querySocialPosts}
                loadingSocial={querySectionsLoading}
              />

              <AdBreak slot="section-break" />

              <Videos
                videos={queryVideos}
                loadingVideos={querySectionsLoading}
                categoryPath={`/search?q=${encodeURIComponent(query)}`}
              />

              <AdBreak slot="section-break" />

              <Podcasts
                podcasts={queryPodcasts}
                loadingPodcasts={querySectionsLoading}
                categoryPath={`/search?q=${encodeURIComponent(query)}`}
              />

              <AdBreak slot="section-break" />

              {hasLiveResults && sourceList.length > 0 && (
                <>
                  <div className="sr-results-header" id="search-results-list">
                    <span className="sr-count">{remainingResults.length > 0 ? remainingResults.length : results.length} articles found</span>
                  </div>
                  <div className="results-virtual-scroll" ref={virtualResultsRef}>
                    <div
                      className="results-virtual-inner"
                      style={{ height: `${resultVirtualizer.getTotalSize()}px` }}
                    >
                      {resultVirtualizer.getVirtualItems().map((virtualRow) => {
                        const article = sourceList[virtualRow.index]
                        if (!article) return null

                        return (
                          <div
                            key={virtualRow.key}
                            ref={resultVirtualizer.measureElement}
                            data-index={virtualRow.index}
                            className="results-virtual-item"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                          >
                            <a
                              href="#"
                              onClick={e => { e.preventDefault(); goToArticle(article) }}
                              className="result-card"
                            >
                              {article.image && (
                                <div className="result-image">
                                  <OptimizedImage
                                    src={article.image}
                                    alt={article.title}
                                    category="news"
                                    sizes="(max-width: 768px) 100vw, 80vw"
                                  />
                                </div>
                              )}
                              <div className="result-content">
                                <div className="result-content-body">
                                  <h3 className="result-title">{article.title}</h3>
                                  <p className="result-description">
                                    {truncate(article.description, descriptionLimit)}
                                  </p>
                                </div>
                                <div className="result-content-footer">
                                  <div className="result-meta">
                                    <span className="result-source">{article.source}</span>
                                    <span className="result-date">{formatPublishedDate(article.publishedAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </a>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Archive results */}
              {hasArchiveMatches && (
                <div className="sr-archive-section" id="archive-results">
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
                            <OptimizedImage
                              src={article.image}
                              alt={article.title}
                              category="news"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        )}
                        <div className="result-content">
                          <div className="result-content-body">
                            <h3 className="result-title">{article.title}</h3>
                            <p className="result-description">{truncate(article.description, descriptionLimit)}</p>
                          </div>
                          <div className="result-content-footer">
                            <div className="result-meta">
                              <span className="result-source">{article.source}</span>
                              <span className="result-date">{formatPublishedDate(article.publishedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!hasLiveResults && hasArchiveMatches && (
                <div className="sr-results-header">
                  <span className="sr-count">No live matches, showing {archiveResults.length} archive result{archiveResults.length !== 1 ? 's' : ''}</span>
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
                <CardSkeleton count={6} />
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
                          {leadStory.publishedAt && <span className="news-card-time">{formatDateOnly(leadStory.publishedAt)}</span>}
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
                            {item.publishedAt && <span className="news-card-time">{formatDateOnly(item.publishedAt)}</span>}
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
                              {item.publishedAt && <span className="news-card-time">{formatDateOnly(item.publishedAt)}</span>}
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
                          {item.publishedAt && <span className="quick-update-time">{formatDateOnly(item.publishedAt)}</span>}
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
