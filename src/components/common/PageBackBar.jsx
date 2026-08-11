import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import './PageBackBar.css'

function PageBackBar({ breadcrumbs = [], meta = '', fallbackTo = '/', shellClassName = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [stickyOffset, setStickyOffset] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const headerShell = document.querySelector('.header-shell')
    if (!headerShell) {
      setStickyOffset(0)
      return undefined
    }

    const updateOffset = () => {
      setStickyOffset(Math.ceil(headerShell.getBoundingClientRect().height))
    }

    updateOffset()

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => updateOffset())
      observer.observe(headerShell)
      window.addEventListener('resize', updateOffset)

      return () => {
        observer.disconnect()
        window.removeEventListener('resize', updateOffset)
      }
    }

    window.addEventListener('resize', updateOffset)

    return () => {
      window.removeEventListener('resize', updateOffset)
    }
  }, [])

  const handleBack = useCallback(() => {
    if (location.key && location.key !== 'default') {
      navigate(-1)
      return
    }

    navigate(fallbackTo)
  }, [fallbackTo, location.key, navigate])

  return (
    <div className="page-back-bar" style={{ '--page-back-bar-offset': `${stickyOffset}px` }}>
      <div className={`page-back-bar__shell ${shellClassName}`.trim()}>
        <div className="page-back-bar__inner">
          <div className="page-back-bar__leading">
            <button type="button" className="page-back-bar__button" onClick={handleBack} aria-label="Go back">
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Back</span>
            </button>

            <nav className="page-back-bar__breadcrumbs" aria-label="Breadcrumb">
              <ol className="page-back-bar__crumb-list">
              {breadcrumbs.map((crumb, index) => (
                <li className="page-back-bar__crumb" key={`${crumb.label}-${index}`}>
                  {index > 0 ? <span className="page-back-bar__separator">/</span> : null}
                  {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
                </li>
              ))}
              </ol>
            </nav>
          </div>

          {meta ? <span className="page-back-bar__meta">{meta}</span> : null}
        </div>
      </div>
    </div>
  )
}

export default PageBackBar