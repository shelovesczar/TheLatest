import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getSession, loginUser, logoutUser, registerUser } from '../services/authService'

const AUTH_STORAGE_KEY = 'thelatest_auth_session_v1'
const AuthContext = createContext(null)

const readStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const stored = readStoredSession()
  const [token, setToken] = useState(stored?.token || '')
  const [user, setUser] = useState(stored?.user || null)
  const [loading, setLoading] = useState(Boolean(stored?.token))

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    let ignore = false

    const hydrateSession = async () => {
      try {
        const payload = await getSession(token)
        if (ignore) return

        setUser(payload.user || null)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user: payload.user || null }))
      } catch {
        if (ignore) return
        setToken('')
        setUser(null)
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    hydrateSession()

    return () => {
      ignore = true
    }
  }, [token])

  const persistAuth = useCallback((payload) => {
    setToken(payload.token)
    setUser(payload.user)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: payload.token, user: payload.user }))
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const payload = await loginUser({ email, password })
    persistAuth(payload)
    return payload
  }, [persistAuth])

  const signUp = useCallback(async ({ name, email, password }) => {
    const payload = await registerUser({ name, email, password })
    persistAuth(payload)
    return payload
  }, [persistAuth])

  const signOut = useCallback(async () => {
    const currentToken = token
    setToken('')
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)

    if (currentToken) {
      try {
        await logoutUser(currentToken)
      } catch {
        // Ignore logout failures once local state is cleared.
      }
    }
  }, [token])

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    signIn,
    signUp,
    signOut
  }), [token, user, loading, signIn, signOut, signUp])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}