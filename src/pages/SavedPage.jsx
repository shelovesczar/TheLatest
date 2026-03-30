import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookmark, faTrash, faClock, faSearch } from '@fortawesome/free-solid-svg-icons'
import { getSavedArticles, getHistory, unsaveArticle, clearAllSaved, clearHistory } from '../utils/savedArticles'
import { getImageProps } from '../utils/imageUtils'
import './SavedPage.css'

function SavedPage() {
  const [tab, setTab] = useState('saved')      // 'saved' | 'history'
  const [saved, setSaved] = useState([])
  const [history, setHistory] = useState([])
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  const reload = useCallback(() => {
    setSaved(getSavedArticles())
    setHistory(getHistory())
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleUnsave = (e, article) => {
    e.stopPropagation()
    e.preventDefault()
    unsaveArticle(article)
    reload()
  }

  const handleClear = () => {
    if (tab === 'saved') {
      if (window.confirm('Remove all saved stories?')) { clearAllSaved(); reload() }
    } else {
      if (window.confirm('Clear your reading history?')) { clearHistory(); reload() }
    }
  }

  const openArticle = (article) => {
    navigate('/article', { state: { article } })
  }

  const activeList = tab === 'saved' ? saved : history
  const q = filter.toLowerCase()
  const displayList = q.length >= 2
    ? activeList.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.source || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      )
    : activeList

  const formatDate = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch { return '' }
  }

  return (
    <div className="saved-page">
      <div className="saved-hero">
        <div className="saved-hero-inner">
          <h1 className="saved-title">
            <FontAwesomeIcon icon={faBookmark} style={{ marginRight: '0.6rem', color: 'var(--accent-color)' }} />
            Following
          </h1>
          <p className="saved-subtitle">Your saved stories and reading history — all searchable, all offline.</p>

          {/* search within archive */}
          <div className="saved-search-wrap">
            <FontAwesomeIcon icon={faSearch} className="saved-search-icon" />
            <input
              className="saved-search-input"
              type="text"
              placeholder="Filter your archive…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>

          {/* tabs */}
          <div className="saved-tabs">
            <button className={`saved-tab ${tab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
              <FontAwesomeIcon icon={faBookmark} /> Saved ({saved.length})
            </button>
            <button className={`saved-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
              <FontAwesomeIcon icon={faClock} /> History ({history.length})
            </button>
          </div>
        </div>
      </div>

      <div className="saved-content">
        {displayList.length === 0 ? (
          <div className="saved-empty">
            <p>
              {tab === 'saved'
                ? 'No saved stories yet. Click the bookmark icon on any article to save it here.'
                : 'No reading history yet. Articles you open will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className="saved-list-header">
              <span className="saved-count">{displayList.length} {tab === 'saved' ? 'saved' : 'recent'} articles</span>
              <button className="saved-clear-btn" onClick={handleClear}>
                <FontAwesomeIcon icon={faTrash} /> Clear all
              </button>
            </div>

            <div className="saved-grid">
              {displayList.map((article, i) => (
                <article
                  key={article.id || i}
                  className="saved-card"
                  onClick={() => openArticle(article)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && openArticle(article)}
                >
                  {article.image && (
                    <div className="saved-card-img">
                      <img {...getImageProps(article.image, article.title, 'news', { width: 600 })} />
                    </div>
                  )}
                  <div className="saved-card-body">
                    <div className="saved-card-meta">
                      <span className="saved-card-source">{article.source}</span>
                      <span className="saved-card-date">
                        {formatDate(tab === 'saved' ? article.savedAt : article.readAt)}
                      </span>
                    </div>
                    <h3 className="saved-card-title">{article.title}</h3>
                    {article.description && (
                      <p className="saved-card-desc">
                        {article.description.slice(0, 120)}{article.description.length > 120 ? '…' : ''}
                      </p>
                    )}
                    <div className="saved-card-footer">
                      <button className="read-on-site-btn">Read on site →</button>
                      {tab === 'saved' && (
                        <button className="unsave-btn" onClick={e => handleUnsave(e, article)}>
                          <FontAwesomeIcon icon={faBookmark} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SavedPage
