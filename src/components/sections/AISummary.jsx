import { useState, useEffect, useRef } from 'react'
import { useSearch } from '../../context/SearchContext'
import { generateAISummary, getCachedSummary, cacheSummary } from '../../services/aiService'
import { getTopicImage } from '../../utils/topicImages'
import { getImageProps } from '../../utils/imageUtils'
import AdBreak from '../common/AdBreak'
import './AISummary.css'

function AISummary({ category = 'general', description, categoryImage, categoryTitle, ignoreTopic = false }) {
  const { topic, hasActiveTopic } = useSearch()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summaryData, setSummaryData] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const cardRef = useRef(null)
  const [descriptionLength, setDescriptionLength] = useState(180)
  
  // Determine if we should use topic or category
  const useTopicFilter = !ignoreTopic && hasActiveTopic

  // Auto-refresh every hour
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSummary()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [topic, hasActiveTopic, ignoreTopic])

  // Load summary on mount or topic change
  useEffect(() => {
    loadSummary()
  }, [topic, hasActiveTopic, ignoreTopic])

  // Adjust the summary excerpt length based on the rendered card width.
  useEffect(() => {
    const updateDescriptionLength = () => {
      const cardWidth = cardRef.current?.offsetWidth || window.innerWidth

      if (cardWidth >= 1200) {
        setDescriptionLength(320)
      } else if (cardWidth >= 960) {
        setDescriptionLength(260)
      } else if (cardWidth >= 768) {
        setDescriptionLength(220)
      } else if (cardWidth >= 560) {
        setDescriptionLength(180)
      } else {
        setDescriptionLength(130)
      }
    }

    updateDescriptionLength()

    if (!cardRef.current || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(() => {
      updateDescriptionLength()
    })

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [topic, hasActiveTopic, ignoreTopic])

  const truncateText = (text, maxLength) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return `${text.substring(0, maxLength).trim()}...`
  }

  const loadSummary = async () => {
    const searchTopic = useTopicFilter ? topic : ''
    const contextCategory = category && category !== 'general' ? category : null
    
    // Create cache key that includes both topic and category
    const cacheKey = contextCategory && searchTopic 
      ? `${searchTopic}_${contextCategory}`
      : searchTopic || (contextCategory || '')
    
    // Try to get cached summary first
    const cached = getCachedSummary(cacheKey)
    if (cached && !cached.isFallback) {
      setSummaryData(cached)
      setLastUpdated(new Date(cached.timestamp))
      return
    }

    // Generate new summary
    await refreshSummary()
  }

  const refreshSummary = async () => {
    setIsRefreshing(true)
    try {
      const searchTopic = useTopicFilter ? topic : ''
      const contextCategory = category && category !== 'general' ? category : null
      
      // Create combined query for AI
      let aiQuery = searchTopic
      if (contextCategory && searchTopic) {
        // Both topic and category: "oscars in entertainment"
        aiQuery = `${searchTopic} in ${contextCategory.replace('-', ' ')}`
      } else if (contextCategory && !searchTopic) {
        // Just category
        aiQuery = contextCategory.replace('-', ' ')
      }
      
      const result = await generateAISummary(aiQuery)
      
      if (result) {
        setSummaryData(result)
        setLastUpdated(new Date())
        
        // Cache the result with combined key
        if (!result.isFallback) {
          const cacheKey = contextCategory && searchTopic 
            ? `${searchTopic}_${contextCategory}`
            : searchTopic || (contextCategory || '')
          cacheSummary(cacheKey, result)
        }
      }
    } catch (error) {
      console.error('Error refreshing AI summary:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    refreshSummary()
  }

  const getHeadline = () => {
    if (useTopicFilter) {
      return `${topic}: Latest Developments & Analysis`
    }
    return category === 'general' 
      ? "Trump's First Year: Immigration, Trade & AI Reshape America"
      : `Latest ${categoryTitle || category.replace('-', ' ')} News Summary`
  }

  const getDisplayImage = () => {
    // Priority: topic-specific image > category image > default
    if (useTopicFilter) {
      return getTopicImage(topic, categoryImage)
    }
    return categoryImage || getTopicImage('general')
  }

  const defaultImage = "https://img-s-msn-com.akamaized.net/tenant/amp/entityid/AA1C0mI9.img?w=768&h=432&m=6&x=810&y=204&s=236&d=236"

  return (
    <section className="section ai-summary-section">
      <h2 className="section-title">
        {useTopicFilter ? `AI Summary: ${topic}` : "Today's AI Summary"}
      </h2>

      <div className="story-with-ad-container">
        <article className="story-card-large" ref={cardRef}>
          <div className="story-card-image">
            <img 
              {...getImageProps(getDisplayImage(), getHeadline(), 'news')}
            />
          </div>
          <div className="story-card-content">
            <div className="story-card-body">
              <h3 className="story-card-headline">{getHeadline()}</h3>
              <div className="story-card-meta">
                <span className="story-card-source">
                  {summaryData?.provider || 'AI Summary'} 
                  {summaryData?.isFallback && ' (Configure API keys for live updates)'}
                </span>
                <span className="story-card-time">
                  Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <p className="story-card-description">
                {truncateText(summaryData?.summary || description || 'Loading AI summary...', descriptionLength)}
              </p>
            </div>

            <div className="story-card-footer">
              <a 
                href="https://www.perplexity.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="read-more-link"
              >
                View Full Summary →
              </a>
            </div>
          </div>
        </article>
        
        <div className="section-ad-sidebar">
          <AdBreak type="sidebar" />
        </div>
      </div>

      <button className="see-more-btn" onClick={handleRefresh} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh AI Summary'}
      </button>
    </section>
  )
}

export default AISummary
