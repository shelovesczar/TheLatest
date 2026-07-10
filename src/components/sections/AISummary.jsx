import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from '../../context/SearchContext'
import { generateAISummary, getCachedSummary, cacheSummary, getSharedSummary, persistSharedSummary } from '../../services/aiService'
import { getImageProps } from '../../utils/imageUtils'
import './AISummary.css'

const SUMMARY_CACHE_VERSION = 'v5'
const SUMMARY_AD_ROTATE_MS = 12000

const SUMMARY_ADS = [
  {
    brand: 'Northstar Funds',
    headline: 'Invest Smarter. Build Long-Term Wealth.',
    copy: 'Low-fee index portfolios and automatic rebalancing built for steady growth.',
    secondaryCopy: 'Tax-aware investing plans with guided allocations for long-horizon savers.',
    statLabel: 'Average annual return',
    statValue: '+10.4%',
    statSub: 'US large-cap blend · 30-year average',
    cta: 'Start Investing Free',
    disclaimer: 'Investing involves risk, including possible loss of principal.',
    href: 'https://example.com/northstar-funds',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=180&fit=crop',
    alt: 'Finance dashboard advertisement',
    tone: 'finance'
  },
  {
    brand: 'Atlas Cloud',
    headline: 'Ship Faster With AI-Ready Infrastructure.',
    copy: 'Deploy secure workloads with observability, autoscaling, and low-latency edge regions.',
    secondaryCopy: 'Built for product teams that need performance without adding ops drag.',
    statLabel: 'Median deploy time',
    statValue: '42 sec',
    statSub: 'Across production rollouts last quarter',
    cta: 'See The Platform',
    disclaimer: 'Performance metrics based on internal customer benchmarks.',
    href: 'https://example.com/atlas-cloud',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=180&fit=crop',
    alt: 'Cloud infrastructure advertisement',
    tone: 'tech'
  },
  {
    brand: 'Field Notes Travel',
    headline: 'Turn Weekends Into Better Getaways.',
    copy: 'Curated city guides, boutique stays, and member-only flight alerts in one travel app.',
    secondaryCopy: 'Designed for quick planning when you want a trip to feel considered, not rushed.',
    statLabel: 'Average member savings',
    statValue: '$186',
    statSub: 'Per roundtrip domestic booking',
    cta: 'Browse Escapes',
    disclaimer: 'Savings figures vary by market, season, and travel dates.',
    href: 'https://example.com/field-notes-travel',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=300&h=180&fit=crop',
    alt: 'Travel planning advertisement',
    tone: 'travel'
  }
]

const getSummaryAdDensity = (height = 0) => {
  if (height >= 620) return 'expanded'
  if (height >= 470) return 'balanced'
  return 'compact'
}

const buildCompactSummaryText = (text = '', maxSentences = 2, maxChars = 500) => {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [normalized]
  const shortened = sentences.slice(0, maxSentences).join(' ')

  if (shortened.length <= maxChars) return shortened

  const clipped = shortened.slice(0, maxChars).trim()
  const lastSpace = clipped.lastIndexOf(' ')
  const safeClip = lastSpace > maxChars * 0.65 ? clipped.slice(0, lastSpace) : clipped
  return `${safeClip.replace(/[,:;\-]+$/, '')}...`
}

const getDynamicSummaryLineHeight = (length = 0) => {
  if (length <= 180) return '1.72'
  if (length <= 320) return '1.64'
  if (length <= 440) return '1.56'
  return '1.48'
}

const formatSourceList = (sources = []) => {
  if (sources.length === 0) return ''
  if (sources.length === 1) return sources[0]
  if (sources.length === 2) return `${sources[0]} and ${sources[1]}`
  return `${sources.slice(0, -1).join(', ')}, and ${sources[sources.length - 1]}`
}

const buildSummaryNote = (summaryData) => {
  const sources = Array.isArray(summaryData?.sources)
    ? summaryData.sources.filter(Boolean).slice(0, 4)
    : [summaryData?.source].filter(Boolean)

  if (sources.length === 0) {
    return 'Briefing based on current reporting signals. Verify fast-moving details with primary reporting.'
  }

  return `Briefing based on reporting signals from ${formatSourceList(sources)}.`
}

function AISummary({ category = 'general', description, categoryImage, categoryTitle, ignoreTopic = false }) {
  const { topic, hasActiveTopic } = useSearch()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [activeAdIndex, setActiveAdIndex] = useState(0)
  const [adDensity, setAdDensity] = useState('balanced')
  const summaryCardRef = useRef(null)
  
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAdIndex((current) => (current + 1) % SUMMARY_ADS.length)
    }, SUMMARY_AD_ROTATE_MS)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const node = summaryCardRef.current
    if (!node || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver((entries) => {
      const nextHeight = entries[0]?.contentRect?.height || node.getBoundingClientRect().height || 0
      setAdDensity(getSummaryAdDensity(nextHeight))
    })

    observer.observe(node)
    setAdDensity(getSummaryAdDensity(node.getBoundingClientRect().height || 0))

    return () => observer.disconnect()
  }, [summaryData, description, topic, category])

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

  const coverageUrl = getCoverageUrl()
  const isExternalCoverage = /^https?:\/\//i.test(coverageUrl)
  const summaryBodyText = useMemo(() => (
    buildCompactSummaryText(summaryData?.summary || description || 'Loading AI summary...')
  ), [description, summaryData?.summary])
  const summaryLineHeight = useMemo(() => getDynamicSummaryLineHeight(summaryBodyText.length), [summaryBodyText])
  const providerLabel = summaryData?.provider || 'AI Summary'
  const providerDisplay = providerLabel.startsWith('Claude') ? 'Claude by Anthropic' : providerLabel
  const briefingLabel = useTopicFilter
    ? topic.toUpperCase()
    : (category === 'general' ? 'TOP STORIES' : formatCategoryLabel().toUpperCase())
  const leadInLabel = useTopicFilter ? `${topic}:` : (category === 'general' ? "Today's Top Stories" : `Today's ${formatCategoryLabel()}`)
  const noteLabel = buildSummaryNote(summaryData)
  const updateLabel = summaryData?.isFallback ? 'Cached briefing' : 'Updates every 30 min'
  const activeAd = SUMMARY_ADS[activeAdIndex]

  return (
    <section className="section ai-summary-section">
      <div className="summary-layout">
        <article className="summary-card" ref={summaryCardRef}>
          <div className="summary-body">
            <div className="summary-kicker-row">
              <div className="summary-kicker-badge">C</div>
              <div className="summary-kicker-text">AI DAILY BRIEFING — {briefingLabel}</div>
              <div className="summary-kicker-rule" aria-hidden="true"></div>
            </div>

            <h3 className="summary-headline">{getHeadline()}</h3>

            <p className="summary-copy" style={{ '--summary-line-height': summaryLineHeight }}>
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
          <a
            className={`summary-ad-card summary-ad-card--${activeAd.tone}`}
            data-density={adDensity}
            href={activeAd.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${activeAd.brand} advertisement`}
          >
            <div className="summary-ad-label-row">
              <div className="summary-ad-label">Advertisement</div>
              <div className="summary-ad-rotation">Rotating creative</div>
            </div>
            <div className="summary-ad-image">
              <img
                {...getImageProps(activeAd.image, activeAd.alt, 'business-tech')}
              />
            </div>
            <div className="summary-ad-body">
              <div className="summary-ad-main">
                <div className="summary-ad-brand">{activeAd.brand}</div>
                <div className="summary-ad-headline">{activeAd.headline}</div>
                <div className="summary-ad-rule"></div>
                <div className="summary-ad-copy">{activeAd.copy}</div>
                <div className="summary-ad-copy summary-ad-copy-secondary">{activeAd.secondaryCopy}</div>
              </div>
              <div className="summary-ad-statbox">
                <div className="summary-ad-statlabel">{activeAd.statLabel}</div>
                <div className="summary-ad-statvalue">{activeAd.statValue}</div>
                <div className="summary-ad-statsub">{activeAd.statSub}</div>
              </div>
              <div className="summary-ad-footer-wrap">
                <span className="summary-ad-cta">{activeAd.cta} →</span>
                <div className="summary-ad-disclaimer">{activeAd.disclaimer}</div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}

export default AISummary
