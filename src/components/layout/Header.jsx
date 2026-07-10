import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faSearch } from '@fortawesome/free-solid-svg-icons'
import { useState, useRef, useEffect, memo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSearch } from '../../context/SearchContext'
import { NAV_ITEMS } from '../../utils/navigationConfig'
import DateTicker from './DateTicker'
import LoginModal from './LoginModal'
import './Header.css'

function ProfileGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="header-profile-glyph">
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19c1.5-3.4 4.1-5.1 7-5.1S17.5 15.6 19 19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function Header({ darkMode, toggleTheme, setMenuOpen, breakingNews = [] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, signOut } = useAuth()
  const { clearTopic } = useSearch()
  const navShellRef = useRef(null)
  const flyoutRef = useRef(null)
  const profileMenuRef = useRef(null)
  const navItemRefs = useRef({})
  const navRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [flyoutPosition, setFlyoutPosition] = useState({ left: 0 })
  const useUnifiedHeader = true

  useEffect(() => {
    const handlePointerDown = (event) => {
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
    setOpenDropdown(null)
    setProfileMenuOpen(false)
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

    if (!searchQuery.trim()) {
      return
    }

    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    clearTopic({ navigateHome: false })
    setOpenDropdown(null)
    setProfileMenuOpen(false)
    setMenuOpen(false)
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
                <form className={`header-search-form ${useUnifiedHeader ? 'header-search-form--landing' : ''}`} onSubmit={handleSearch}>
                  <input
                    type="text"
                    className={`header-search-input ${useUnifiedHeader ? 'header-search-input--landing' : ''}`}
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    aria-label="Search news"
                  />
                  <button type="submit" className={`header-search-btn ${useUnifiedHeader ? 'header-search-btn--landing' : ''}`} aria-label="Search">
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
                    <ProfileGlyph />
                  </button>

                  {isAuthenticated && (
                    <div className={`header-profile-menu ${profileMenuOpen ? 'open' : ''}`} role="menu">
                      <span className="header-profile-eyebrow">Signed in as</span>
                      <span className="header-profile-name">{user?.name || 'Member'}</span>
                      <div className="header-nav-divider"></div>
                      <Link
                        to="/dashboard"
                        className="header-profile-link"
                        onClick={() => handleProfileAction(() => navigate('/dashboard'))}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/following"
                        className="header-profile-link"
                        onClick={() => handleProfileAction(() => navigate('/following'))}
                      >
                        Following
                      </Link>
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