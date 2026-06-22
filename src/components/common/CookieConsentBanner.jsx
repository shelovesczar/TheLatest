import { Link } from 'react-router-dom'
import { useConsent } from '../../context/ConsentContext'
import './CookieConsentBanner.css'

function CookieConsentBanner() {
  const { hasConsentChoice, acceptAll, acceptEssentialOnly } = useConsent()

  if (hasConsentChoice) {
    return null
  }

  return (
    <aside className="cookie-consent" aria-label="Cookie consent banner">
      <h2 className="cookie-consent__title">Privacy choices</h2>
      <p className="cookie-consent__body">
        We use essential storage to keep the product working and optional analytics to understand site performance.
        You can allow analytics or continue with essential-only storage. See our <Link to="/privacy">Privacy Policy</Link> for details.
      </p>
      <div className="cookie-consent__actions">
        <button className="cookie-consent__button cookie-consent__button--primary" type="button" onClick={acceptAll}>
          Allow analytics
        </button>
        <button className="cookie-consent__button cookie-consent__button--secondary" type="button" onClick={acceptEssentialOnly}>
          Essential only
        </button>
      </div>
    </aside>
  )
}

export default CookieConsentBanner