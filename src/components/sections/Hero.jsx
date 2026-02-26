import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect } from 'react'
import { useSearch } from '../../context/SearchContext'
import './Hero.css'

function Hero({ visibleTopics, handleTopicClick }) {
  const { searchQuery, setSearchQuery, setTopic } = useSearch()
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [currentWord, setCurrentWord] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
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
    const word = rotatingWords[currentWord]
    
    const typeSpeed = isDeleting ? 50 : 100
    const pauseTime = isDeleting ? 500 : 2000

    if (!isDeleting && displayText === word) {
      // Finished typing, wait then start deleting
      setTimeout(() => setIsDeleting(true), pauseTime)
      return
    }

    if (isDeleting && displayText === '') {
      // Finished deleting, move to next word
      setIsDeleting(false)
      setCurrentWord((prev) => (prev + 1) % rotatingWords.length)
      return
    }

    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayText(word.substring(0, displayText.length - 1))
      } else {
        setDisplayText(word.substring(0, displayText.length + 1))
      }
    }, typeSpeed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, currentWord, rotatingWords])

  useEffect(() => {
    // Detect if device is mobile/touch-enabled
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                      || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches)
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      // Show indicator only when at the top of the page (within hero section)
      if (window.scrollY < 100) {
        setShowScrollIndicator(true)
      } else {
        setShowScrollIndicator(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="hero">
      <h1 className="hero-title">
        Keep up with<br />
        the latest <span className="hero-highlight rotating-word">{displayText}<span className="cursor">|</span></span>
      </h1>
      <p className="hero-subtitle">
        All topics. Most major platforms. All in one place.
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

      {/* Scroll Indicator - Mobile Only */}
      {showScrollIndicator && isMobile && (
        <div className="scroll-indicator">
          <span className="scroll-text">Swipe to see more</span>
          <div className="scroll-chevrons">
            <FontAwesomeIcon icon={faChevronDown} className="chevron chevron-large" />
            <FontAwesomeIcon icon={faChevronDown} className="chevron chevron-medium" />
            <FontAwesomeIcon icon={faChevronDown} className="chevron chevron-small" />
          </div>
        </div>
      )}

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
