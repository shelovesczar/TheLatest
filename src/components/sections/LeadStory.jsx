import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImageProps } from '../../utils/imageUtils'
import { recordHistory } from '../../utils/savedArticles'
import './LeadStory.css'

/**
 * LeadStory — The dominant editorial card at the top of the feed.
 * Uses the first (highest-ranked) story from the news feed and renders it
 * full-width with a large image, prominent headline, and a 2-sentence excerpt.
 * This gives the homepage an editorial point-of-view instead of a raw feed dump.
 */
function LeadStory({ story, loading }) {
  const navigate = useNavigate()

  const goToArticle = useCallback((s) => {
    recordHistory(s)
    navigate('/article', { state: { article: s } })
  }, [navigate])

  const truncate = (text, max) => {
    if (!text) return ''
    // Try to cut at a sentence boundary within the limit
    const clipped = text.substring(0, max)
    const lastPeriod = clipped.lastIndexOf('.')
    if (lastPeriod > max * 0.6) return clipped.substring(0, lastPeriod + 1)
    return clipped.trimEnd() + '…'
  }

  // ── Skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="lead-story lead-story--skeleton">
        <div className="lead-story__image-wrap skeleton-block" />
        <div className="lead-story__overlay">
          <div className="lead-story__inner">
            <div className="skeleton-block" style={{ width: '30%', height: 16, borderRadius: 4, marginBottom: '1rem' }} />
            <div className="skeleton-block" style={{ width: '90%', height: 40, borderRadius: 6, marginBottom: '0.8rem' }} />
            <div className="skeleton-block" style={{ width: '75%', height: 40, borderRadius: 6, marginBottom: '1.5rem' }} />
            <div className="skeleton-block" style={{ width: '65%', height: 18, borderRadius: 4, marginBottom: '0.5rem' }} />
            <div className="skeleton-block" style={{ width: '50%', height: 18, borderRadius: 4 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!story) return null

  const href         = story.link || story.url || '#'
  const source       = story.source || story.sourceName || ''
  const time         = story.publishedAt || story.timeAgo || story.time || ''
  const description  = truncate(story.description || story.content || '', 280)
  const image        = story.image || story.urlToImage || ''

  return (
    <article className="lead-story">
      {/* Background image */}
      <div className="lead-story__image-wrap">
        {image && (
          <img
            {...getImageProps(image, story.title, 'news', { width: 1920, quality: 92, sharpen: true })}
            className="lead-story__bg-img"
          />
        )}
        <div className="lead-story__gradient" />
      </div>

      {/* Text content */}
      <div className="lead-story__overlay">
        <div className="lead-story__inner">
          <div className="lead-story__kicker">
            {source && <span className="lead-story__source">{source.toUpperCase()}</span>}
            {source && time && <span className="lead-story__sep">·</span>}
            {time && <span className="lead-story__time">{time}</span>}
          </div>

          <a href="#" onClick={e => { e.preventDefault(); goToArticle(story) }} className="lead-story__headline-link">
            <h2 className="lead-story__headline">{story.title}</h2>
          </a>

          {description && (
            <p className="lead-story__description">{description}</p>
          )}

          <a href="#" onClick={e => { e.preventDefault(); goToArticle(story) }} className="lead-story__cta">
            Read full story →
          </a>
        </div>
      </div>
    </article>
  )
}

export default LeadStory
