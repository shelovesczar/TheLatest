import React, { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faBookmark,
  faShareNodes,
  faExternalLinkAlt,
  faCircleNotch,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons'
import { isArticleSaved, saveArticle, unsaveArticle, recordHistory } from '../utils/savedArticles'
import { processImageUrl } from '../utils/imageUtils'
import './ArticleReader.css'

// ── Reading-time estimate ──────────────────────────────────────────────────────
function readingTime(text = '') {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

// ── Render paragraphs from plain text ─────────────────────────────────────────
function ArticleBody({ text }) {
  if (!text) return null
  return (
    <div className="ar-body">
      {text.split(/\n\n+/).map((para, i) => (
        <p key={i}>{para.trim()}</p>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ArticleReader() {
  const location = useLocation()
  const navigate = useNavigate()

  // Article data passed via navigate('/article', { state: { article } })
  const passedArticle = location.state?.article || null

  const [article, setArticle]     = useState(passedArticle)
  const [fetched, setFetched]     = useState(null)   // data from fetchArticle function
  const [loading, setLoading]     = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [saved, setSaved]         = useState(false)
  const [copied, setCopied]       = useState(false)
  const [fontSize, setFontSize]   = useState(18)     // px

  // ── Record history + set initial saved state ────────────────────────────────
  useEffect(() => {
    if (!article) return
    recordHistory(article)
    setSaved(isArticleSaved(article))
  }, [article])

  // ── Fetch full article content via Netlify function ─────────────────────────
  useEffect(() => {
    const url = article?.link || article?.url
    if (!url) return

    setLoading(true)
    setFetchError(null)

    const controller = new AbortController()
    const endpoint  = `/.netlify/functions/fetchArticle?url=${encodeURIComponent(url)}`

    fetch(endpoint, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setFetched(data)
        } else {
          setFetchError(data.error)
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') setFetchError(err.message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [article])

  // ── Handle missing article (direct URL navigation) ──────────────────────────
  if (!article) {
    return (
      <div className="ar-not-found">
        <p>No article data found.</p>
        <button className="ar-back-btn" onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faArrowLeft} /> Go back
        </button>
      </div>
    )
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const title     = fetched?.title   || article.title   || 'Untitled'
  const byline    = fetched?.byline  || article.author  || article.source || ''
  const siteName  = fetched?.siteName || article.source || ''
  const heroImage = fetched?.image   || article.image   || article.urlToImage || ''
  const content   = fetched?.content || article.description || article.content || ''
  const sourceUrl = article.link     || article.url     || ''
  const minutes   = readingTime(content)

  // Publish date
  const pubDate = article.publishedAt || article.pubDate || article.date || ''
  const dateStr = pubDate
    ? new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  // ── Toggle bookmark ──────────────────────────────────────────────────────────
  const toggleSave = useCallback(() => {
    if (saved) {
      unsaveArticle(article)
      setSaved(false)
    } else {
      saveArticle(article)
      setSaved(true)
    }
  }, [saved, article])

  // ── Share / copy link ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: sourceUrl })
        return
      } catch { /* user cancelled */ }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(sourceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [title, sourceUrl])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="article-reader-page">

      {/* Top bar */}
      <div className="ar-topbar">
        <button className="ar-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back</span>
        </button>

        <div className="ar-topbar-actions">
          <button
            className={`ar-icon-btn ${saved ? 'active' : ''}`}
            onClick={toggleSave}
            title={saved ? 'Remove bookmark' : 'Save article'}
          >
            <FontAwesomeIcon icon={faBookmark} />
          </button>

          <button
            className="ar-icon-btn"
            onClick={handleShare}
            title="Share article"
          >
            <FontAwesomeIcon icon={faShareNodes} />
            {copied && <span className="ar-copied-toast">Copied!</span>}
          </button>

          {sourceUrl && (
            <a
              className="ar-icon-btn"
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View original"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </a>
          )}
        </div>
      </div>

      {/* Reader viewport */}
      <div className="ar-viewport">

        {/* Hero image */}
        {heroImage && (
          <div className="ar-hero-image">
            <img
              src={processImageUrl(heroImage, { width: 1200, quality: 90 })}
              alt={title}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
        )}

        {/* Article header */}
        <div className="ar-header">
          {siteName && <div className="ar-site-name">{siteName}</div>}

          <h1 className="ar-title">{title}</h1>

          <div className="ar-meta">
            {byline && <span className="ar-byline">{byline}</span>}
            {dateStr && <span className="ar-date">{dateStr}</span>}
            <span className="ar-reading-time">{minutes} min read</span>
          </div>
        </div>

        {/* Font size control */}
        <div className="ar-font-controls">
          <button onClick={() => setFontSize(s => Math.max(14, s - 2))}>A−</button>
          <button onClick={() => setFontSize(18)}>A</button>
          <button onClick={() => setFontSize(s => Math.min(28, s + 2))}>A+</button>
        </div>

        {/* Content area */}
        <div className="ar-content-area" style={{ fontSize: `${fontSize}px` }}>

          {loading && (
            <div className="ar-loading">
              <FontAwesomeIcon icon={faCircleNotch} spin />
              <span>Loading full article…</span>
            </div>
          )}

          {!loading && content && <ArticleBody text={content} />}

          {!loading && !content && !fetchError && (
            <div className="ar-no-content">
              <p>No article content available.</p>
            </div>
          )}

          {/* Paywall / fetch-error fallback */}
          {!loading && (fetchError || (!content && sourceUrl)) && (
            <div className="ar-paywall-notice">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <p>
                {fetchError
                  ? 'This article could not be loaded on-site.'
                  : 'Full article content requires visiting the original source.'}
              </p>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ar-visit-source-btn"
              >
                Read on {siteName || 'original site'} →
              </a>
            </div>
          )}
        </div>

        {/* Footer attribution */}
        {sourceUrl && (
          <div className="ar-attribution">
            <span>Originally published by</span>
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {siteName || new URL(sourceUrl).hostname}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
