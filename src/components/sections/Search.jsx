import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faLightbulb, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { faGoogle, faWikipediaW, faOpenai, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import { useState } from 'react'
import { useSearch } from '../../context/SearchContext'
import { handleImageError } from '../../utils/imageUtils'
import './Search.css'

function Search() {
  const { topic, hasActiveTopic } = useSearch()
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3
  
  const searchEngines = [
    {
      name: 'ChatGPT',
      url: 'https://chat.openai.com/',
      searchUrl: 'https://chat.openai.com/?q=',
      icon: faOpenai,
      color: '#10a37f',
      description: 'AI-powered search & analysis'
    },
    {
      name: 'Perplexity',
      url: 'https://www.perplexity.ai/',
      searchUrl: 'https://www.perplexity.ai/search?q=',
      icon: faLightbulb,
      color: '#20808d',
      description: 'AI research assistant'
    },
    {
      name: 'Google',
      url: 'https://www.google.com',
      searchUrl: 'https://www.google.com/search?q=',
      icon: faGoogle,
      color: '#4285f4',
      description: 'Search the world\'s information'
    },
    {
      name: 'Wikipedia',
      url: 'https://www.wikipedia.org',
      searchUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=',
      icon: faWikipediaW,
      color: '#000000',
      description: 'Free online encyclopedia'
    },
    {
      name: 'DuckDuckGo',
      url: 'https://duckduckgo.com',
      searchUrl: 'https://duckduckgo.com/?q=',
      logo: 'https://duckduckgo.com/favicon.ico',
      color: '#de5833',
      description: 'Privacy-focused search'
    },
    {
      name: 'Grok',
      url: 'https://x.com/i/grok',
      searchUrl: 'https://x.com/i/grok?q=',
      icon: faXTwitter,
      color: '#000000',
      description: 'X AI assistant'
    },
    {
      name: 'Claude',
      url: 'https://claude.ai/',
      searchUrl: 'https://claude.ai/new?q=',
      logo: 'https://claude.ai/favicon.ico',
      color: '#cc9b7a',
      description: 'AI assistant by Anthropic'
    }
  ]

  const getSearchUrl = (engine) => {
    if (hasActiveTopic && topic) {
      return `${engine.searchUrl}${encodeURIComponent(topic)}`
    }
    return engine.url
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= searchEngines.length ? 0 : next
    })
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      if (prev === 0) {
        const lastPageStart = Math.floor((searchEngines.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  const getVisibleEngines = () => {
    const items = []
    for (let i = 0; i < itemsPerPage; i++) {
      const index = (currentIndex + i) % searchEngines.length
      if (searchEngines[index]) {
        items.push(searchEngines[index])
      }
    }
    return items
  }

  const visibleEngines = getVisibleEngines()

  return (
    <section id="search" className="section search-section">
      <h2 className="section-title">Advanced Search</h2>
      <p className="section-subtitle">
        {hasActiveTopic 
          ? `Search for "${topic}" across different platforms` 
          : 'Explore topics with AI and traditional search engines'
        }
      </p>
      
      <div className="search-slider-container">
        <button 
          className="slider-btn search-slider-btn" 
          onClick={prevSlide}
          aria-label="Previous search engines"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <div className="search-engines-grid">
          {visibleEngines.map((engine, index) => (
            <a
              key={currentIndex + index}
              href={getSearchUrl(engine)}
              target="_blank"
              rel="noopener noreferrer"
              className="search-engine-card"
            >
              <div className="search-engine-icon" style={{ borderColor: engine.color }}>
                {engine.icon ? (
                  <FontAwesomeIcon icon={engine.icon} style={{ fontSize: '2rem', color: engine.color }} />
                ) : (
                  <img src={engine.logo} alt={`${engine.name} logo`} onError={(e) => handleImageError(e, 'general')} loading="lazy" />
                )}
              </div>
              <h3 className="search-engine-name">{engine.name}</h3>
              <p className="search-engine-description">{engine.description}</p>
              <div className="search-engine-action">
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <span>{hasActiveTopic ? `Search ${topic}` : 'Search Now'}</span>
              </div>
            </a>
          ))}
        </div>

        <button 
          className="slider-btn search-slider-btn" 
          onClick={nextSlide}
          aria-label="Next search engines"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </section>
  )
}

export default Search
