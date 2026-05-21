import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect } from 'react'
import { useSearch } from '../../context/SearchContext'
import './Hero.css'

function Hero({ visibleTopics, handleTopicClick }) {
  const WORD_HOLD_MS = 3200
  const FADE_OUT_MS = 280

  const { searchQuery, setSearchQuery, setTopic } = useSearch()
  const [currentWord, setCurrentWord] = useState(0)
  const [isFading, setIsFading] = useState(false)
  const rotatingWords = ['innovation', 'trends', 'conversations', 'lifestyle', 'culture', 'tech', 'science', 'entertainment', 'health', 'travel', 'business', 'world news']

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setTopic(searchQuery.trim())
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // If the user clears the search, clear the topic filter
    if (value.trim() === '') {
      setTopic('')
    }
  }

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true)
    }, WORD_HOLD_MS - FADE_OUT_MS)

    const rotateTimer = setTimeout(() => {
      setCurrentWord((prev) => (prev + 1) % rotatingWords.length)
      setIsFading(false)
    }, WORD_HOLD_MS)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(rotateTimer)
    }
  }, [currentWord, rotatingWords.length, WORD_HOLD_MS, FADE_OUT_MS])

  return (
    <section className="hero">
      <h1 className="hero-title">
        Keep up with<br />
        <span className="hero-line">
          the latest
          <span className="hero-highlight flipper-shell" aria-live="polite">
            <span key={currentWord} className={`flipper-word flipper-single${isFading ? ' is-fading' : ''}`}>{rotatingWords[currentWord]}</span>
          </span>
        </span>
      </h1>
      <p className="hero-subtitle">
        All topics. All Major platforms. All in one place.
      </p>
      
      {/* Search Bar */}
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="What do you want to know?"
          value={searchQuery}
          onChange={handleInputChange}
        />
        <button type="submit" className="search-button">
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>
      </form>

      {/* Scroll Indicator removed per user request */}

      {/* Hot Topics */}
      {/* <div className="hot-topics">
        {visibleTopics.map((topic, index) => (
          <button 
            key={index} 
            className="topic-btn"
            onClick={() => handleTopicClick(topic)}
          >
            {topic}
          </button>
        ))}
      </div> */}
    </section>
  )
}

export default Hero
