import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NewsCard from '../components/common/NewsCard'
import LoginModal from '../components/layout/LoginModal'
import { useAuth } from '../context/AuthContext'
import { fetchFollows, updateFollowGroup } from '../services/followService'
import { fetchRSSNews } from '../rssService'
import { filterContentByCategory } from '../utils/categoryFiltering'
import './FollowingPage.css'

const CATEGORY_OPTIONS = [
  { label: 'Politics', value: 'politics' },
  { label: 'Tech', value: 'tech' },
  { label: 'Business', value: 'business' },
  { label: 'Sports', value: 'sports' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'Lifestyle', value: 'lifestyle' },
  { label: 'Culture', value: 'culture' }
]

const DEFAULT_FOLLOWS = {
  categories: [],
  topics: [],
  sources: []
}

const normalizeValue = (value = '') => String(value || '').trim().replace(/\s+/g, ' ')

const FollowingPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, loading: authLoading, token, user } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [follows, setFollows] = useState(DEFAULT_FOLLOWS)
  const [followedContent, setFollowedContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [topicDraft, setTopicDraft] = useState('')
  const [sourceDraft, setSourceDraft] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      setFollows(DEFAULT_FOLLOWS)
      setFollowedContent([])
      return
    }

    let ignore = false

    const loadFollowing = async () => {
      setLoading(true)
      try {
        const followPayload = await fetchFollows(token)
        const nextFollows = followPayload.follows || DEFAULT_FOLLOWS
        const feed = await fetchRSSNews()

        if (ignore) return

        setFollows(nextFollows)

        const matched = Array.isArray(feed)
          ? feed.filter((item) => matchesFollow(item, nextFollows)).slice(0, 24)
          : []

        setFollowedContent(matched)
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load follows:', error)
          setFollowedContent([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadFollowing()
    return () => { ignore = true }
  }, [isAuthenticated, token])

  const followCount = useMemo(
    () => (follows.categories?.length || 0) + (follows.topics?.length || 0) + (follows.sources?.length || 0),
    [follows]
  )

  const mutateFollow = async (group, value, action = 'toggle') => {
    if (!token) return
    setSaving(true)
    try {
      const payload = await updateFollowGroup(token, { group, value, action })
      setFollows(payload.follows || DEFAULT_FOLLOWS)

      const feed = await fetchRSSNews()
      const nextFollows = payload.follows || DEFAULT_FOLLOWS
      const matched = Array.isArray(feed)
        ? feed.filter((item) => matchesFollow(item, nextFollows)).slice(0, 24)
        : []

      setFollowedContent(matched)
    } catch (error) {
      console.error('Unable to update follows:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddFollow = async (group, value) => {
    const normalized = normalizeValue(value)
    if (!normalized) return
    await mutateFollow(group, normalized, 'follow')
    if (group === 'topics') setTopicDraft('')
    if (group === 'sources') setSourceDraft('')
  }

  if (authLoading) {
    return <div className="following-page"><div className="loading-state"><div className="spinner"></div></div></div>
  }

  return (
    <div className="following-page">
      <div className="following-header">
        <h1 className="page-title">
          <span className="apple-icon">📰</span>
          News
        </h1>
        <h2 className="page-subtitle">Following</h2>
        <button className="edit-btn" onClick={() => navigate('/saved')}>Saved</button>
        <p className="following-copy">
          {isAuthenticated
            ? `Signed in as ${user?.name || user?.email}. Manage your follows once and keep them synced.`
            : 'Sign in to follow topics, categories, and sources across devices.'}
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="following-auth-card">
          <h3>Cross-device following is live.</h3>
          <p>Create an account or sign in to save follows server-side and unlock the internal dashboard.</p>
          <button className="following-auth-btn" onClick={() => setShowLoginModal(true)}>
            Sign In To Continue
          </button>
        </div>
      ) : (
        <>
          <div className="following-controls-wrap">
            <section className="following-control-panel">
              <div className="following-panel-header">
                <div>
                  <span className="following-kicker">Categories</span>
                  <h3>Follow the desks you care about</h3>
                </div>
                <span className="following-count">{follows.categories?.length || 0} selected</span>
              </div>
              <div className="following-chip-grid">
                {CATEGORY_OPTIONS.map((option) => {
                  const active = follows.categories?.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`following-chip ${active ? 'active' : ''}`}
                      onClick={() => mutateFollow('categories', option.value)}
                      disabled={saving}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="following-control-panel">
              <div className="following-panel-header">
                <div>
                  <span className="following-kicker">Topics</span>
                  <h3>Track live topics</h3>
                </div>
              </div>
              <div className="following-input-row">
                <input
                  className="following-input"
                  value={topicDraft}
                  onChange={(e) => setTopicDraft(e.target.value)}
                  placeholder="Add a topic like AI, elections, or Apple"
                />
                <button type="button" className="following-add-btn" onClick={() => handleAddFollow('topics', topicDraft)} disabled={saving}>
                  Add Topic
                </button>
              </div>
              <div className="following-token-wrap">
                {(follows.topics || []).map((topic) => (
                  <button key={topic} type="button" className="following-token" onClick={() => mutateFollow('topics', topic, 'unfollow')}>
                    {topic} ×
                  </button>
                ))}
              </div>
            </section>

            <section className="following-control-panel">
              <div className="following-panel-header">
                <div>
                  <span className="following-kicker">Sources</span>
                  <h3>Pin the outlets you trust</h3>
                </div>
              </div>
              <div className="following-input-row">
                <input
                  className="following-input"
                  value={sourceDraft}
                  onChange={(e) => setSourceDraft(e.target.value)}
                  placeholder="Add a publisher like Reuters or TechCrunch"
                />
                <button type="button" className="following-add-btn" onClick={() => handleAddFollow('sources', sourceDraft)} disabled={saving}>
                  Add Source
                </button>
              </div>
              <div className="following-token-wrap">
                {(follows.sources || []).map((source) => (
                  <button key={source} type="button" className="following-token" onClick={() => mutateFollow('sources', source, 'unfollow')}>
                    {source} ×
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="following-summary-bar">
            <div>
              <strong>{followCount}</strong> follows active
            </div>
            <Link to="/dashboard">Open internal dashboard →</Link>
          </div>

          {loading ? (
            <div className="loading-state"><div className="spinner"></div></div>
          ) : followedContent.length > 0 ? (
            <div className="content-grid">
              {followedContent.map((item, index) => (
                <NewsCard
                  key={`${item.link || item.url || item.title}-${index}`}
                  title={item.title}
                  image={item.image}
                  source={item.source}
                  timeAgo={item.publishedAt}
                  url={item.link || item.url}
                  category={item.category}
                />
              ))}
            </div>
          ) : (
            <div className="following-auth-card following-empty-state">
              <h3>No matching stories yet.</h3>
              <p>Follow a category, topic, or source above and the page will start curating matching coverage.</p>
            </div>
          )}
        </>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  )
}

function matchesFollow(item, follows) {
  const searchText = `${item?.title || ''} ${item?.description || ''} ${item?.content || ''} ${item?.source || ''}`.toLowerCase()
  const categories = follows.categories || []
  const topics = follows.topics || []
  const sources = follows.sources || []

  const categoryMatch = categories.some((category) => filterContentByCategory([item], category, 1, { strict: false }).length > 0)
  const topicMatch = topics.some((topic) => searchText.includes(String(topic || '').toLowerCase()))
  const sourceMatch = sources.some((source) => String(item?.source || '').toLowerCase().includes(String(source || '').toLowerCase()))

  return categoryMatch || topicMatch || sourceMatch
}

export default FollowingPage
