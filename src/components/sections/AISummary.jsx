import { useState, useEffect } from 'react'
import { useSearch } from '../../context/SearchContext'
import { generateAISummary, getCachedSummary, cacheSummary, getSharedSummary, persistSharedSummary } from '../../services/aiService'
import { getImageProps } from '../../utils/imageUtils'
import './AISummary.css'

const SUMMARY_CACHE_VERSION = 'v4'

function AISummary({ category = 'general', description, categoryImage, categoryTitle, ignoreTopic = false }) {
  const { topic, hasActiveTopic } = useSearch()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  
  // Determine if we should use topic or category
  const useTopicFilter = !ignoreTopic && hasActiveTopic

  // Auto-refresh every hour
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSummary()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [topic, hasActiveTopic, ignoreTopic, category])

  // Load summary on mount or topic change
  useEffect(() => {
    setSummaryData(null)
    loadSummary()
  }, [topic, hasActiveTopic, ignoreTopic, category])

  const buildSummaryCacheKey = (searchTopic, contextCategory) => {
    const scopedKey = contextCategory && searchTopic
      ? `${searchTopic}_${contextCategory}`
      : searchTopic || (contextCategory || '')
    return `${SUMMARY_CACHE_VERSION}_${scopedKey}`
  }

  const loadSummary = async () => {
    const searchTopic = useTopicFilter ? topic : ''
    const contextCategory = category && category !== 'general' ? category : null
    const summaryRequest = {
      topic: searchTopic,
      category: contextCategory,
      enforceCategory: Boolean(contextCategory)
    }

    const shared = await getSharedSummary(summaryRequest)
    if (shared && !shared.isFallback) {
      setSummaryData(shared)
      setLastUpdated(new Date(shared.timestamp || Date.now()))

      const sharedCacheKey = buildSummaryCacheKey(searchTopic, contextCategory)
      cacheSummary(sharedCacheKey, {
        ...shared,
        scopeCategory: contextCategory || null
      })
      return
    }
    
    // Create cache key that includes both topic and category
    const cacheKey = buildSummaryCacheKey(searchTopic, contextCategory)
    
    // Try to get cached summary first
    const cached = getCachedSummary(cacheKey)
    const cacheMatchesScope = !contextCategory || cached?.scopeCategory === contextCategory

    if (cached && !cached.isFallback && cacheMatchesScope) {
      setSummaryData(cached)
      setLastUpdated(new Date(cached.timestamp))
      return
    }

    // Generate new summary
    await refreshSummary()
  }

  const refreshSummary = async ({ force = false } = {}) => {
    setIsRefreshing(true)
    try {
      const searchTopic = useTopicFilter ? topic : ''
      const contextCategory = category && category !== 'general' ? category : null
      const summaryRequest = {
        topic: searchTopic,
        category: contextCategory,
        enforceCategory: Boolean(contextCategory)
      }

      const shared = await getSharedSummary(summaryRequest, { refresh: force })
      if (shared && !shared.isFallback) {
        setSummaryData(shared)
        setLastUpdated(new Date(shared.timestamp || Date.now()))
        return
      }
      
      const result = await generateAISummary(summaryRequest)
      
      if (result) {
        setSummaryData(result)
        setLastUpdated(new Date(result.timestamp || Date.now()))
        
        // Cache the result with combined key
        if (!result.isFallback) {
          const cacheKey = buildSummaryCacheKey(searchTopic, contextCategory)
          const summaryPayload = {
            ...result,
            scopeCategory: contextCategory || null
          }

          cacheSummary(cacheKey, summaryPayload)
          await persistSharedSummary(summaryRequest, summaryPayload)
        }
      }
    } catch (error) {
      console.error('Error refreshing AI summary:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    refreshSummary({ force: true })
  }

  const formatCategoryLabel = () => {
    const label = categoryTitle || category || 'general'
    return String(label).replace(/-/g, ' ').trim()
  }

  const getHeadline = () => {
    if (summaryData?.headline) {
      return summaryData.headline
    }

    if (useTopicFilter) {
      return `${topic}: Latest Developments`
    }

    return category === 'general'
      ? "Today's Top Stories: Quick Brief"
      : `Latest ${formatCategoryLabel()} Brief`
  }

  const getCoverageUrl = () => {
    const candidate = String(summaryData?.url || '').trim()
    if (!candidate) return '/all-news'
    if (/^https?:\/\//i.test(candidate)) return candidate
    return '/all-news'
  }

  const splitSummaryIntoParagraphs = (text) => {
    const normalized = String(text || '').trim()
    if (!normalized) return []

    const explicitParagraphs = normalized
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)

    if (explicitParagraphs.length > 1) {
      return explicitParagraphs.slice(0, 3)
    }

    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [normalized]
    const paragraphCount = Math.min(3, Math.max(1, Math.ceil(sentences.length / 3)))
    const chunkSize = Math.ceil(sentences.length / paragraphCount)
    const paragraphs = []

    for (let index = 0; index < sentences.length; index += chunkSize) {
      paragraphs.push(sentences.slice(index, index + chunkSize).join(' '))
    }

    return paragraphs.slice(0, 3)
  }

  const formatUpdateTime = () =>
    lastUpdated.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

  const coverageUrl = getCoverageUrl()
  const isExternalCoverage = /^https?:\/\//i.test(coverageUrl)
  const summaryParagraphs = splitSummaryIntoParagraphs(summaryData?.summary || description || 'Loading AI summary...')
  const summaryBodyText = summaryParagraphs.join(' ')
  const providerLabel = summaryData?.provider || 'AI Summary'
  const providerDisplay = providerLabel.startsWith('Claude') ? 'Claude by Anthropic' : providerLabel
  const briefingLabel = useTopicFilter
    ? topic.toUpperCase()
    : (category === 'general' ? 'TOP STORIES' : formatCategoryLabel().toUpperCase())
  const leadInLabel = useTopicFilter ? `${topic}:` : (category === 'general' ? "Today's Top Stories" : `Today's ${formatCategoryLabel()}`)
  const noteLabel = 'Briefing based on current reporting signals. For real-time accuracy, verify with AP, Reuters, or NPR.'
  const updateLabel = summaryData?.isFallback ? 'Cached briefing' : 'Updates every 30 min'

  return (
    <section className="section ai-summary-section">
      <div className="summary-layout">
        <article className="summary-card">
          <div className="summary-body">
            <div className="summary-kicker-row">
              <div className="summary-kicker-badge">C</div>
              <div className="summary-kicker-text">AI DAILY BRIEFING — {briefingLabel}</div>
              <div className="summary-kicker-rule" aria-hidden="true"></div>
            </div>

            <h3 className="summary-headline">{getHeadline()}</h3>

            <p className="summary-copy">
              <span className="summary-lead">{leadInLabel}</span>
              {summaryBodyText}
            </p>

            <div className="summary-note">{noteLabel}</div>

            <div className="summary-footer">
              <a
                href={coverageUrl}
                target={isExternalCoverage ? '_blank' : undefined}
                rel={isExternalCoverage ? 'noopener noreferrer' : undefined}
                className="summary-provider"
              >
                <span className="summary-provider-label">Summary generated by</span>
                <span className="summary-provider-badge">C</span>
                <span className="summary-provider-name">{providerDisplay}</span>
              </a>

              <div className="summary-footer-actions">
                <span className="summary-update-label">{updateLabel}</span>
                <button className="summary-refresh" onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        </article>

        <div className="summary-ad-rail">
          <div className="summary-ad-card" aria-label="Advertisement">
            <div className="summary-ad-label">Advertisement</div>
            <div className="summary-ad-image">
              <img
                {...getImageProps('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=180&fit=crop', 'Finance ad', 'business-tech')}
              />
            </div>
            <div className="summary-ad-body">
              <div className="summary-ad-brand">Northstar Funds</div>
              <div className="summary-ad-headline">Invest Smarter. Build Long-Term Wealth.</div>
              <div className="summary-ad-rule"></div>
              <div className="summary-ad-copy">Low-fee index portfolios, automatic rebalancing, and tax-aware investing built for steady growth.</div>
              <div className="summary-ad-statbox">
                <div className="summary-ad-statlabel">Average annual return</div>
                <div className="summary-ad-statvalue">+10.4%</div>
                <div className="summary-ad-statsub">US large-cap blend · 30-year average</div>
              </div>
              <button className="summary-ad-cta">Start Investing Free →</button>
              <div className="summary-ad-disclaimer">Investing involves risk, including possible loss of principal. Review objectives, charges, and expenses carefully before investing.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AISummary
