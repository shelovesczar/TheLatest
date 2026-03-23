import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faChevronLeft, faSearch } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { useSearch } from '../../context/SearchContext'
import LoginModal from './LoginModal'
import './Header.css'

function Header({ menuOpen, toggleMenu, darkMode, toggleTheme, newsDropdownOpen, setNewsDropdownOpen, setMenuOpen }) {
  const navigate = useNavigate()
  const { clearTopic } = useSearch()
  const [searchQuery, setSearchQuery] = useState('')
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const handleLogoClick = () => {
    setSearchQuery('')   // clear the header search bar
    clearTopic()         // clear context topic & navigate to '/'
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMenuOpen(false)
    }
  }

  const handleCategoryClick = (path) => {
    setMenuOpen(false)
    setNewsDropdownOpen(false)
    navigate(path)
  }

  const handleSectionClick = (sectionId) => {
    setMenuOpen(false)
    // If not on home page, go to home page first
    navigate('/')
    // Wait for navigation then scroll
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <>
      <header className="header">
        <Link to="/" className="logo" onClick={handleLogoClick}>
          <span className="logo-main">THE</span>
          <span className="logo-accent">LATEST</span>
        </Link>
        
        <button 
          className={`hamburger ${menuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav ${menuOpen ? 'active' : ''}`}>
          <form className="header-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="header-search-input"
              placeholder="Search all news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search news"
            />
            <button type="submit" className="header-search-btn" aria-label="Search">
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </form>
          
          <div 
            className="nav-item-dropdown"
            onClick={() => setNewsDropdownOpen(!newsDropdownOpen)}
          >
            <span className="nav-link">
              NEWS <FontAwesomeIcon icon={faChevronLeft} rotation={270} className="dropdown-arrow" />
            </span>
            <div className={`dropdown-menu ${newsDropdownOpen ? 'active' : ''}`}>
              <Link to="/category/top-stories" onClick={() => handleCategoryClick('/category/top-stories')}>Top Stories</Link>
              <Link to="/category/business-tech" onClick={() => handleCategoryClick('/category/business-tech')}>Business/Tech</Link>
              <Link to="/category/entertainment" onClick={() => handleCategoryClick('/category/entertainment')}>Entertainment</Link>
              <Link to="/category/sports" onClick={() => handleCategoryClick('/category/sports')}>Sports</Link>
              <Link to="/category/lifestyle" onClick={() => handleCategoryClick('/category/lifestyle')}>Lifestyle</Link>
              <Link to="/category/culture" onClick={() => handleCategoryClick('/category/culture')}>Culture</Link>
            </div>
          </div>
          
          {/* Navigate to Following page for sections */}
          <Link to="/following" className="nav-link-button following-link">
            FOLLOWING
          </Link>
          
          <button 
            className="login-button-header"
            onClick={() => setLoginModalOpen(true)}
            aria-label="Open login"
          >
            LOGIN
          </button>

          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>
        </nav>
      </header>

      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)} 
      />
    </>
  )
}

export default Header