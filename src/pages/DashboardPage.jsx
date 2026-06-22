import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './DashboardPage.css'

function DashboardPage() {
  const { isAuthenticated, loading, token } = useAuth()
  const [feedStatus, setFeedStatus] = useState([])
  const [trendingArticles, setTrendingArticles] = useState([])
  const [trendingSources, setTrendingSources] = useState([])
  const [pageViews, setPageViews] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [adminActionPending, setAdminActionPending] = useState(false)
  const [adminActionMessage, setAdminActionMessage] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }

    let ignore = false

    const loadDashboard = async () => {
      setIsLoading(true)
      setError('')

      try {
        const requestHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : undefined

        const [feedResponse, articleResponse, sourceResponse, pageResponse] = await Promise.all([
          fetch('/.netlify/functions/feedStatus', { headers: requestHeaders }),
          fetch('/.netlify/functions/trending?type=articles&days=7&limit=8', { headers: requestHeaders }),
          fetch('/.netlify/functions/trending?type=sources&days=7&limit=8', { headers: requestHeaders }),
          fetch('/.netlify/functions/trending?type=pages&days=7&limit=8', { headers: requestHeaders })
        ])

        const [feedPayload, articlePayload, sourcePayload, pagePayload] = await Promise.all([
          feedResponse.json(),
          articleResponse.json(),
          sourceResponse.json(),
          pageResponse.json()
        ])

        if (ignore) return

        if (!feedResponse.ok || !articleResponse.ok || !sourceResponse.ok || !pageResponse.ok) {
          throw new Error(
            feedPayload?.error ||
            articlePayload?.error ||
            sourcePayload?.error ||
            pagePayload?.error ||
            'Unable to load dashboard data.'
          )
        }

        setFeedStatus(feedPayload.items || [])
        setTrendingArticles(articlePayload.items || [])
        setTrendingSources(sourcePayload.items || [])
        setPageViews(pagePayload.items || [])
      } catch (loadError) {
        if (!ignore) {
          setError(loadError.message || 'Unable to load dashboard data.')
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadDashboard()
    return () => { ignore = true }
  }, [isAuthenticated, token])

  const handleWarmContent = async () => {
    if (!token) return

    setAdminActionPending(true)
    setAdminActionMessage('')

    try {
      const response = await fetch('/.netlify/functions/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'warm-content' })
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to warm content right now.')
      }

      setAdminActionMessage('Content refresh completed. Feed snapshots and summaries were rewarmed.')
    } catch (actionError) {
      setAdminActionMessage(actionError.message || 'Unable to warm content right now.')
    } finally {
      setAdminActionPending(false)
    }
  }

  if (loading) {
    return <main className="dashboard-page"><div className="dashboard-empty">Checking session…</div></main>
  }

  if (!isAuthenticated) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-hero">
          <div className="dashboard-hero-inner">
            <span className="dashboard-kicker">Internal Dashboard</span>
            <h1>Sign in to view feed health and trending analytics.</h1>
            <p>This page reads your new server-side analytics and feed status endpoints.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div className="dashboard-hero-inner">
          <span className="dashboard-kicker">Internal Dashboard</span>
          <h1>Feed health, trending content, and page activity.</h1>
          <p>Use this as the first pass for editorial operations and quality control.</p>
          <div className="dashboard-hero-actions">
            <button
              type="button"
              className="dashboard-action-btn"
              onClick={handleWarmContent}
              disabled={adminActionPending || !token}
            >
              {adminActionPending ? 'Refreshing Feeds…' : 'Refresh Feed Cache'}
            </button>
            {adminActionMessage && <span className="dashboard-action-message">{adminActionMessage}</span>}
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <h2>Feed Status</h2>
            <span>{feedStatus.length} tracked feeds</span>
          </div>
          {isLoading ? <p>Loading feed status…</p> : (
            <div className="dashboard-table">
              {feedStatus.slice(0, 12).map((feed) => (
                <div key={feed.feedKey} className="dashboard-row">
                  <div>
                    <strong>{feed.source}</strong>
                    <span>{feed.url}</span>
                  </div>
                  <div className={`dashboard-status ${feed.status}`}>{feed.status}</div>
                  <div>{feed.itemCount || 0} items</div>
                  <div>{feed.failureCount || 0} failures</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>Trending Articles</h2>
            <span>7 days</span>
          </div>
          <ul className="dashboard-list">
            {trendingArticles.map((item, index) => (
              <li key={`${item.url || item.title || index}-${index}`}>
                <strong>{item.title || item.path || 'Untitled'}</strong>
                <span>{item.views || 0} views</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>Trending Sources</h2>
            <span>7 days</span>
          </div>
          <ul className="dashboard-list">
            {trendingSources.map((item, index) => (
              <li key={`${item.source || item.path || index}-${index}`}>
                <strong>{item.source || 'Unknown Source'}</strong>
                <span>{item.views || 0} views</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h2>Top Pages</h2>
            <span>7 days</span>
          </div>
          <ul className="dashboard-list">
            {pageViews.map((item, index) => (
              <li key={`${item.path || item.title || index}-${index}`}>
                <strong>{item.title || item.path || 'Page'}</strong>
                <span>{item.views || 0} views</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {error && <div className="dashboard-error">{error}</div>}
    </main>
  )
}

export default DashboardPage