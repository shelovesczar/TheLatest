import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { useSearch } from '../../context/SearchContext'
import './Hero.css'

const ROTATING_WORDS = ['news', 'opinions', 'podcasts', 'videos', 'social']

function Hero() {
  const { topic } = useSearch()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const activeWord = topic && ROTATING_WORDS.includes(topic.toLowerCase()) ? topic.toLowerCase() : null

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextQuery = searchQuery.trim()
    if (!nextQuery) return
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`)
  }

  return (
    <section id="hero" className="hero">
      <div className="hero-inner">
        <h1 className="hero-headline">
          <span className="hero-headline-static">Keep up with the latest</span>
          <span className="hero-flipper" aria-hidden="true">
            {ROTATING_WORDS.map((word) => (
              <span key={word} className={`flip-word ${activeWord === word ? 'flip-word-active' : ''}`}>{word}</span>
            ))}
          </span>
        </h1>
        <p className="hero-tagline">All topics. All major platforms. All in one place.</p>
        <form className="hero-mobile-search" onSubmit={handleSubmit}>
          <label className="hero-mobile-search__label" htmlFor="hero-mobile-search-input">Search news</label>
          <span className="hero-mobile-search__icon" aria-hidden="true">
            <FontAwesomeIcon icon={faSearch} />
          </span>
          <input
            id="hero-mobile-search-input"
            className="hero-mobile-search__input"
            type="search"
            placeholder="What do you want to know"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className="hero-mobile-search__button" type="submit">
            Search
          </button>
        </form>
      </div>
    </section>
  )
}

export default Hero
