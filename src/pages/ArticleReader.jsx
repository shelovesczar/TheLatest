import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { useConsent } from '../context/ConsentContext'
import { processImageUrl } from '../utils/imageUtils'
import { buildStoryHref, parseStoryArticleFromSearch } from '../utils/storyRouting'
import './ArticleReader.css'

const isGeneratedFallbackUrl = (value = '') => String(value || '').includes('fallback.thelatest.local/generated/')

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
  const { storySlug } = useParams()
  const { allowAnalytics } = useConsent()

  const [storedStory, setStoredStory] = useState(null)

  const derivedArticle = useMemo(() => (
    location.state?.article || storedStory || parseStoryArticleFromSearch({ search: location.search }) || null
  ), [location.search, location.state, storedStory])

  useEffect(() => {
    if (!storySlug) {
      setStoredStory(null)
      return
    }

    let ignore = false

    fetch(`/.netlify/functions/storySnapshot?slug=${encodeURIComponent(storySlug)}`)
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (ignore) return
        setStoredStory(ok && body?.story ? body.story : null)
      })
      .catch(() => {
        if (!ignore) {
          setStoredStory(null)
        }
      })

    return () => {
      ignore = true
    }
  }, [storySlug])

  const article = derivedArticle
  const articleKey = useMemo(() => (article ? buildStoryHref(article) : ''), [article])
  const [fetchState, setFetchState] = useState({ url: '', data: null, error: null, status: 'idle' })
  const [savedByKey, setSavedByKey] = useState({ key: '', value: false })
  const [copied, setCopied]       = useState(false)
  const [fontSize, setFontSize]   = useState(18)     // px

  const trackEngagement = useCallback((payload) => {
    if (!allowAnalytics) {
      return
    }

    try {
      const body = JSON.stringify(payload)

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon('/.netlify/functions/trackEngagement', blob)
        return
      }

      fetch('/.netlify/functions/trackEngagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body,
        keepalive: true
      }).catch(() => {})
    } catch {
      // Ignore analytics failures.
    }
  }, [allowAnalytics])

  // ── Record history + set initial saved state ────────────────────────────────
  useEffect(() => {
    if (!article) return
    recordHistory(article)
    trackEngagement({
      eventType: 'article-view',
      path: location.pathname,
      pageTitle: article.title,
      article
    })
  }, [article, location.pathname, trackEngagement])

  // ── Fetch full article content via Netlify function ─────────────────────────
  useEffect(() => {
    const generatedId = article?.generatedId
    const url = article?.link || article?.url
    if (!generatedId && !url) return

    const controller = new AbortController()

    ;(async () => {
      try {
        if (generatedId) {
          const response = await fetch(`/.netlify/functions/generatedContent?id=${encodeURIComponent(generatedId)}`, { signal: controller.signal })
          const data = await response.json()

          if (response.ok && !data.error) {
            setFetchState({ url: generatedId, data, error: null, status: 'ready' })
          } else {
            setFetchState({ url: generatedId, data: null, error: data?.error || 'Generated content unavailable', status: 'error' })
          }
          return
        }

        const endpoint  = `/.netlify/functions/fetchArticle?url=${encodeURIComponent(url)}`
        const response = await fetch(endpoint, { signal: controller.signal })
        const data = await response.json()

        if (!data.error) {
          setFetchState({ url, data, error: null, status: 'ready' })
        } else {
          setFetchState({ url, data: null, error: data.error, status: 'error' })
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setFetchState({ url, data: null, error: err.message, status: 'error' })
        }
      }
    })()

    return () => controller.abort()
  }, [article])

  // ── Derived values ───────────────────────────────────────────────────────────
  const rawSourceUrl = article?.link || article?.url || ''
  const isGeneratedArticle = Boolean(article?.generatedId || fetched?.generatedId || article?.isGenerated || fetched?.isGenerated || isGeneratedFallbackUrl(rawSourceUrl))
  const sourceUrl = isGeneratedArticle ? '' : rawSourceUrl
  const effectiveFetchState = useMemo(() => {
    const lookupKey = article?.generatedId || sourceUrl

    if (!lookupKey) {
      return { url: '', data: null, error: null, status: 'idle' }
    }

    if (fetchState.url === lookupKey) {
      return fetchState
    }

    return { url: lookupKey, data: null, error: null, status: 'loading' }
  }, [article?.generatedId, fetchState, sourceUrl])

  const fetched = effectiveFetchState.status === 'ready' ? effectiveFetchState.data : null
  const loading = effectiveFetchState.status === 'loading'
  const fetchError = effectiveFetchState.status === 'error' ? effectiveFetchState.error : null
  const saved = article ? (savedByKey.key === articleKey ? savedByKey.value : isArticleSaved(article)) : false
  const title     = fetched?.title   || article?.title   || 'Untitled'
  const byline    = fetched?.byline  || article?.author  || article?.source || ''
  const siteName  = fetched?.siteName || fetched?.source || article?.source || ''
  const heroImage = fetched?.image   || article?.image   || article?.urlToImage || ''
  const content   = fetched?.content || article?.content || article?.description || ''
  const minutes   = readingTime(content)
  const generatedNote = fetched?.fallbackLabel || article?.fallbackLabel || ''
  const shareUrl = useMemo(() => {
    if (typeof window !== 'undefined' && window.location?.pathname.startsWith('/story/')) {
      return window.location.href
    }

    if (!article) return sourceUrl

    const storyHref = buildStoryHref(article)
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${storyHref}`
    }

    return storyHref || sourceUrl
  }, [article, sourceUrl])

  // Publish date
  const pubDate = article.publishedAt || article.pubDate || article.date || ''
  const dateStr = pubDate
    ? new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  // ── Toggle bookmark ──────────────────────────────────────────────────────────
  const toggleSave = useCallback(() => {
    if (!article) return

    if (saved) {
      unsaveArticle(article)
      setSavedByKey({ key: articleKey, value: false })
    } else {
      saveArticle(article)
      setSavedByKey({ key: articleKey, value: true })
    }
  }, [article, articleKey, saved])

  // ── Share / copy link ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl })
        return
      } catch { /* user cancelled */ }
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [title, shareUrl])

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

          {isGeneratedArticle && (
            <p className="ar-generated-note">
              {generatedNote || 'AI-generated fallback briefing built for The Latest when live RSS coverage is temporarily unavailable.'}
            </p>
          )}

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
          {!loading && !isGeneratedArticle && (fetchError || (!content && sourceUrl)) && (
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
        {sourceUrl && !isGeneratedArticle && (
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
