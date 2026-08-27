import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faSearch, faUser } from '@fortawesome/free-solid-svg-icons'
import { faCompass } from '@fortawesome/free-regular-svg-icons'
import { useState, useRef, useEffect, memo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSearch } from '../../context/SearchContext'
import { NAV_ITEMS } from '../../utils/navigationConfig'
import DateTicker from './DateTicker'
import LoginModal from './LoginModal'
import './Header.css'

function Header({ darkMode, toggleTheme, setMenuOpen, breakingNews = [] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isAdmin, user, signOut } = useAuth()
  const { clearTopic } = useSearch()
  const navShellRef = useRef(null)
  const flyoutRef = useRef(null)
  const profileMenuRef = useRef(null)
  const navItemRefs = useRef({})
  const navRef = useRef(null)
  const searchFormRef = useRef(null)
  const searchInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [flyoutPosition, setFlyoutPosition] = useState({ left: 0 })
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const useUnifiedHeader = true

  const emitSearchSubmit = (query) => {
    if (typeof window === 'undefined') {
      return
    }

    window.dispatchEvent(new CustomEvent('thelatest:search-submit', {
      detail: {
        query,
        source: 'header',
        submittedAt: Date.now()
      }
    }))
  }

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (searchFormRef.current && !searchFormRef.current.contains(event.target)) {
        setIsSearchOpen(false)
      }

      if (!navRef.current) return

      const clickedInsideNav = navRef.current.contains(event.target)
      const clickedNavTrigger = Object.values(navItemRefs.current).some((element) => element?.contains(event.target))
      const clickedFlyout = flyoutRef.current?.contains(event.target)
      const clickedProfileMenu = profileMenuRef.current?.contains(event.target)

      if (!clickedInsideNav) {
        setOpenDropdown(null)
        setProfileMenuOpen(false)
        return
      }

      if (!clickedNavTrigger && !clickedFlyout) {
        setOpenDropdown(null)
      }

      if (!clickedProfileMenu) {
        setProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null)
        setProfileMenuOpen(false)
        setIsSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setOpenDropdown(null)
      setProfileMenuOpen(false)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!openDropdown) return

    const updateFlyoutPosition = () => {
      const navElement = navRef.current
      const itemElement = navItemRefs.current?.[openDropdown]

      if (!navElement || !itemElement) return

      const navRect = navElement.getBoundingClientRect()
      const itemRect = itemElement.getBoundingClientRect()
      const idealLeft = itemRect.left - navRect.left
      const maxLeft = Math.max(0, navRect.width - 260)

      setFlyoutPosition({
        left: Math.max(0, Math.min(idealLeft, maxLeft))
      })
    }

    updateFlyoutPosition()

    const shellElement = navShellRef.current
    window.addEventListener('resize', updateFlyoutPosition)
    shellElement?.addEventListener('scroll', updateFlyoutPosition, { passive: true })

    return () => {
      window.removeEventListener('resize', updateFlyoutPosition)
      shellElement?.removeEventListener('scroll', updateFlyoutPosition)
    }
  }, [openDropdown])

  const handleLogoClick = () => {
    setSearchQuery('')
    clearTopic()
    setOpenDropdown(null)
    setProfileMenuOpen(false)
  }

  const handleSearch = (event) => {
    event.preventDefault()

    const normalizedQuery = searchQuery.trim()

    if (!normalizedQuery) {
      return
    }

    const currentQuery = new URLSearchParams(location.search).get('q')?.trim() || ''
    const isSameSearchRoute = location.pathname === '/search' && currentQuery === normalizedQuery

    emitSearchSubmit(normalizedQuery)

    if (!isSameSearchRoute) {
      navigate(`/search?q=${encodeURIComponent(normalizedQuery)}`)
    }

    clearTopic({ navigateHome: false })
    setOpenDropdown(null)
    setProfileMenuOpen(false)
    setMenuOpen(false)
    setIsSearchOpen(false)
  }

  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent?.isComposing) {
      return
    }

    event.currentTarget.form?.requestSubmit()
  }

  const handleSearchIconClick = (event) => {
    if (!isSearchOpen) {
      event.preventDefault()
      setIsSearchOpen(true)
      return
    }

    if (!searchQuery.trim()) {
      event.preventDefault()
      setIsSearchOpen(false)
    }
  }

  const handleNavClick = (path) => {
    setMenuOpen(false)
    setOpenDropdown(null)
    setProfileMenuOpen(false)
    clearTopic()
    navigate(path)
  }

  const handleProfileToggle = () => {
    setOpenDropdown(null)
    setProfileMenuOpen((current) => !current)
  }

  const handleProfileAction = (action) => {
    setProfileMenuOpen(false)
    setMenuOpen(false)
    action()
  }

  const handleDropdownIntent = (item) => {
    if (!item?.items?.length) {
      return
    }

    setProfileMenuOpen(false)
    setOpenDropdown(item.label)
  }

  const isItemActive = (item) => {
    if (item.label === 'News' && location.pathname === '/') {
      return true
    }

    return (item.matchPaths || []).some((path) => location.pathname.startsWith(path))
  }

  const openItem = NAV_ITEMS.find((item) => item.label === openDropdown)
  const profileLabel = isAuthenticated ? (user?.name?.split(' ')[0] || 'Profile') : 'Log In'

  return (
    <>
      <div className="header-shell">
        <DateTicker breakingNews={breakingNews} sticky={false} showDate={false} />
        <header className={`header ${useUnifiedHeader ? 'header--landing' : ''}`}>
          <div className={`header-top-row ${useUnifiedHeader ? 'header-top-row--landing' : ''}`}>
            <Link to="/" className={`logo ${useUnifiedHeader ? 'logo--landing' : ''}`} onClick={handleLogoClick}>
              <span className={`logo-main ${useUnifiedHeader ? 'logo-main--landing' : ''}`}>THE</span>
              <span className={`logo-accent ${useUnifiedHeader ? 'logo-accent--landing' : ''}`}>LATEST</span>
            </Link>

            <nav className={`nav ${useUnifiedHeader ? 'nav--landing' : ''}`} ref={navRef} aria-label="Primary">
              <div className="header-nav-shell" onMouseLeave={() => setOpenDropdown(null)}>
                <div className="header-nav-scroll" ref={navShellRef}>
                  <div className={`header-nav ${useUnifiedHeader ? 'header-nav--landing' : ''}`}>
                    {NAV_ITEMS.map((item) => {
                      const isOpen = openDropdown === item.label
                      const isActive = isItemActive(item)

                      return (
                        <div
                          key={item.label}
                          ref={(element) => {
                            if (element) {
                              navItemRefs.current[item.label] = element
                            } else {
                              delete navItemRefs.current[item.label]
                            }
                          }}
                          className={`header-nav-item ${isOpen ? 'open' : ''} ${isActive ? 'active' : ''} ${useUnifiedHeader ? 'header-nav-item--landing' : ''}`}
                          onMouseEnter={() => handleDropdownIntent(item)}
                          onMouseOver={() => handleDropdownIntent(item)}
                          onPointerEnter={() => handleDropdownIntent(item)}
                        >
                          {item.items.length > 0 ? (
                            <Link
                              to={item.target}
                              className={`header-nav-button header-nav-link ${useUnifiedHeader ? 'header-nav-link--landing' : ''}`}
                              onClick={() => handleNavClick(item.target)}
                              onMouseEnter={() => handleDropdownIntent(item)}
                              onMouseOver={() => handleDropdownIntent(item)}
                              onPointerEnter={() => handleDropdownIntent(item)}
                              onFocus={() => {
                                handleDropdownIntent(item)
                              }}
                            >
                              {item.label}
                              <span className="header-nav-arrow" aria-hidden="true"></span>
                            </Link>
                          ) : (
                            <Link
                              to={item.target}
                              className={`header-nav-button header-nav-link ${useUnifiedHeader ? 'header-nav-link--landing' : ''}`}
                              onClick={() => handleNavClick(item.target)}
                            >
                              {item.label}
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {openItem && openItem.items.length > 0 && (
                  <div ref={flyoutRef} className="header-nav-flyout open" style={{ left: `${flyoutPosition.left}px` }} role="menu">
                    <Link
                      to={openItem.target}
                      className="header-nav-dropdown-link header-nav-dropdown-overview"
                      onClick={() => handleNavClick(openItem.target)}
                    >
                      All {openItem.label}
                    </Link>
                    <div className="header-nav-divider"></div>
                    {openItem.items.map((dropdownItem) => (
                      <Link
                        key={dropdownItem.label}
                        to={dropdownItem.target}
                        className="header-nav-dropdown-link"
                        onClick={() => handleNavClick(dropdownItem.target)}
                      >
                        {dropdownItem.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="header-utilities">
                <Link
                  to="/compass"
                  className={`header-compass-link ${useUnifiedHeader ? 'header-compass-link--landing' : ''} ${location.pathname === '/compass' ? 'active' : ''}`}
                  onClick={() => handleNavClick('/compass')}
                  aria-label="The Compass — compare coverage across the political spectrum"
                >
                  <FontAwesomeIcon icon={faCompass} />
                  <span className="header-compass-label">Compass</span>
                </Link>

                <form
                  ref={searchFormRef}
                  className={`header-search-form ${useUnifiedHeader ? 'header-search-form--landing' : ''} ${isSearchOpen ? 'header-search-form--open' : 'header-search-form--collapsed'}`}
                  onSubmit={handleSearch}
                >
                  <input
                    ref={searchInputRef}
                    type="search"
                    className={`header-search-input ${useUnifiedHeader ? 'header-search-input--landing' : ''}`}
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    aria-label="Search news"
                    enterKeyHint="search"
                    tabIndex={isSearchOpen ? 0 : -1}
                  />
                  <button
                    type="submit"
                    className={`header-search-btn ${useUnifiedHeader ? 'header-search-btn--landing' : ''}`}
                    aria-label={isSearchOpen ? 'Search' : 'Open search'}
                    aria-expanded={isSearchOpen}
                    onClick={handleSearchIconClick}
                  >
                    <FontAwesomeIcon icon={faSearch} />
                  </button>
                </form>

                <button
                  type="button"
                  className={`header-theme-toggle ${useUnifiedHeader ? 'header-theme-toggle--landing' : ''}`}
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
                </button>

                <div
                  className={`header-profile ${profileMenuOpen ? 'open' : ''}`}
                  ref={profileMenuRef}
                  onMouseLeave={() => setProfileMenuOpen(false)}
                >
                  <button
                    type="button"
                    className={`header-profile-icon-button ${useUnifiedHeader ? 'header-profile-icon-button--landing' : ''}`}
                    onClick={() => {
                      if (!isAuthenticated) {
                        setOpenDropdown(null)
                        setProfileMenuOpen(false)
                        setLoginModalOpen(true)
                        return
                      }

                      handleProfileToggle()
                    }}
                    onFocus={() => {
                      if (isAuthenticated) {
                        setProfileMenuOpen(true)
                      }
                    }}
                    aria-label={profileLabel}
                    aria-haspopup={isAuthenticated ? 'menu' : undefined}
                    aria-expanded={isAuthenticated ? profileMenuOpen : undefined}
                  >
                    <FontAwesomeIcon icon={faUser} className="header-profile-glyph" />
                  </button>

                  {isAuthenticated && (
                    <div className={`header-profile-menu ${profileMenuOpen ? 'open' : ''}`} role="menu">
                      <span className="header-profile-eyebrow">Signed in as</span>
                      <span className="header-profile-name">{user?.name || 'Member'}</span>
                      <div className="header-nav-divider"></div>
                      <Link
                        to="/account"
                        className="header-profile-link"
                        onClick={() => handleProfileAction(() => navigate('/account'))}
                      >
                        Account
                      </Link>
                      <Link
                        to="/following"
                        className="header-profile-link"
                        onClick={() => handleProfileAction(() => navigate('/following'))}
                      >
                        Following
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/internal"
                          className="header-profile-link"
                          onClick={() => handleProfileAction(() => navigate('/internal'))}
                        >
                          Internal Dashboard
                        </Link>
                      )}
                      <button
                        type="button"
                        className="header-profile-link header-profile-action"
                        onClick={() => handleProfileAction(signOut)}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                <button className="mobile-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                  <FontAwesomeIcon icon={darkMode ? faMoon : faSun} />
                </button>
              </div>
            </nav>
          </div>
        </header>
      </div>

      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  )
}

export default memo(Header)