import { createContext, useContext, useMemo, useState } from 'react'

const CONSENT_STORAGE_KEY = 'thelatest_cookie_preferences_v1'

const ConsentContext = createContext(null)

function readStoredConsent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) || 'null')
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return {
      analytics: Boolean(parsed.analytics),
      status: parsed.status === 'granted' || parsed.status === 'essential-only' ? parsed.status : 'pending',
      updatedAt: parsed.updatedAt || null
    }
  } catch {
    return null
  }
}

export function ConsentProvider({ children }) {
  const stored = readStoredConsent()
  const [preferences, setPreferences] = useState(() => stored || {
    analytics: false,
    status: 'pending',
    updatedAt: null
  })

  const persistPreferences = (nextPreferences) => {
    setPreferences(nextPreferences)
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(nextPreferences))
  }

  const acceptAll = () => {
    persistPreferences({
      analytics: true,
      status: 'granted',
      updatedAt: new Date().toISOString()
    })
  }

  const acceptEssentialOnly = () => {
    persistPreferences({
      analytics: false,
      status: 'essential-only',
      updatedAt: new Date().toISOString()
    })
  }

  const value = useMemo(() => ({
    preferences,
    allowAnalytics: preferences.analytics,
    hasConsentChoice: preferences.status !== 'pending',
    acceptAll,
    acceptEssentialOnly
  }), [preferences])

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent() {
  const context = useContext(ConsentContext)
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider')
  }
  return context
}