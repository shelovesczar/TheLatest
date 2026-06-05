import { useSearch } from '../../context/SearchContext'
import './Hero.css'

const ROTATING_WORDS = ['news', 'opinions', 'podcasts', 'videos', 'social']

function Hero({ visibleTopics, handleTopicClick }) {
  const { searchQuery, setSearchQuery, setTopic } = useSearch()

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

  return (
    <section id="hero" className="hero">
      <div className="hero-inner">
        <h1 className="hero-headline">
          <span className="hero-headline-static">Keep up with the latest</span>
          <span className="hero-flipper" aria-hidden="true">
            {ROTATING_WORDS.map((word) => (
              <span key={word} className="flip-word">{word}</span>
            ))}
          </span>
        </h1>
        <p className="hero-tagline">All topics. All major platforms. All in one place.</p>

        <form className="hero-search-wrap" onSubmit={handleSearch}>
          <svg className="hero-search-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="22" y2="22" />
          </svg>
          <input
            type="text"
            placeholder="What do you want to know?"
            value={searchQuery}
            onChange={handleInputChange}
            aria-label="Search topics"
          />
          <button type="submit" className="hero-search-btn">Search</button>
        </form>
      </div>
    </section>
  )
}

export default Hero
