import { useState, useEffect } from 'react'
import { useSearch } from '../../context/SearchContext'
import { generateAISummary, getCachedSummary, cacheSummary } from '../../services/aiService'
import { getTopicImage } from '../../utils/topicImages'
import './AISummary.css'

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
  }, [topic, hasActiveTopic, ignoreTopic])

  // Load summary on mount or topic change
  useEffect(() => {
    loadSummary()
  }, [topic, hasActiveTopic, ignoreTopic])

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
    <section className="ai-summary-section">
      <h2 className="section-title">
        {useTopicFilter ? `AI Summary: ${topic}` : "Today's AI Summary"}
      </h2>
      <button 
        className="see-more-link" 
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh Summary'}
      </button>

      <div className="story-with-ad-container">
        <article className="story-card-large">
          <div className="story-card-image">
            <img 
              src={getDisplayImage()} 
              alt={getHeadline()}
            />
          </div>
          <div className="story-card-content">
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
              {summaryData?.summary || description || 'Loading AI summary...'}
            </p>
            <a 
              href="https://www.perplexity.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="read-more-link"
            >
              View Full Analysis →
            </a>
          </div>
        </article>
        
        <div className="section-ad-sidebar">
          <div className="ad-placeholder ad-dynamic">
            <span>AD</span>
          </div>
        </div>
      </div>

      <button className="see-more-btn" onClick={handleRefresh} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh AI Summary'}
      </button>
    </section>
  )
}

export default AISummary
