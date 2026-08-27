import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AccountPage.css'

function AccountPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, loading, user, signIn, signUp, signOut, requestReset } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signOutPending, setSignOutPending] = useState(false)

  const resetFormFields = () => {
    setName('')
    setEmail('')
    setPassword('')
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setErrorMessage('')
    setInfoMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        await signUp({ name, email, password })
        resetFormFields()
      } else if (mode === 'forgot') {
        const payload = await requestReset({ email })
        setInfoMessage(payload?.message || 'If an account exists for that email, a reset link is on its way.')
      } else {
        await signIn({ email, password })
        resetFormFields()
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to complete that request right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setSignOutPending(true)
    try {
      await signOut()
      navigate('/')
    } finally {
      setSignOutPending(false)
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-empty">Checking session…</div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="account-page">
        <section className="account-hero">
          <div className="account-hero-inner">
            <span className="account-kicker">Your Account</span>
            <h1>
              {mode === 'register'
                ? 'Create your account'
                : mode === 'forgot'
                  ? 'Reset your password'
                  : 'Sign in to The Latest'}
            </h1>
            <p>
              {mode === 'register'
                ? 'Create a cross-device account to follow topics, save articles, and keep preferences synced.'
                : mode === 'forgot'
                  ? "Enter your account email and we'll send you a link to choose a new password."
                  : 'Sign in to manage your follows, saved articles, and account preferences.'}
            </p>
          </div>
        </section>

        <div className="account-auth-panel">
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="account-name">Name</label>
                <input
                  type="text"
                  id="account-name"
                  className="form-input"
                  placeholder="How should we label your account?"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="account-email">Email</label>
              <input
                type="email"
                id="account-email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="form-group">
                <label htmlFor="account-password">Password</label>
                <input
                  type="password"
                  id="account-password"
                  className="form-input"
                  placeholder="Use at least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                className="auth-inline-btn auth-forgot-link"
                onClick={() => switchMode('forgot')}
              >
                Forgot password?
              </button>
            )}

            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {infoMessage && <p className="info-message">{infoMessage}</p>}

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting
                ? 'Working...'
                : mode === 'register'
                  ? 'Create Account'
                  : mode === 'forgot'
                    ? 'Send Reset Link'
                    : 'Sign In'}
            </button>
          </form>

          <div className="auth-mode-switch">
            {mode === 'forgot' ? (
              <button type="button" className="auth-inline-btn" onClick={() => switchMode('login')}>
                Back to sign in
              </button>
            ) : (
              <>
                <span>{mode === 'register' ? 'Already have an account?' : 'Need an account?'}</span>
                <button
                  type="button"
                  className="auth-inline-btn"
                  onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
                >
                  {mode === 'register' ? 'Sign in instead' : 'Create one'}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="account-page">
      <section className="account-hero">
        <div className="account-hero-inner">
          <span className="account-kicker">Your Account</span>
          <h1>Welcome back, {user?.name || 'there'}.</h1>
          <p>{user?.email}</p>
        </div>
      </section>

      <div className="account-grid">
        <section className="account-panel">
          <h2>Quick links</h2>
          <div className="account-links">
            <Link to="/following" className="account-link-btn">Manage Following</Link>
            <Link to="/saved" className="account-link-btn">Saved Articles</Link>
            {isAdmin && (
              <Link to="/internal" className="account-link-btn account-link-btn--admin">
                Internal Dashboard
              </Link>
            )}
          </div>
        </section>

        <section className="account-panel">
          <h2>Account details</h2>
          <dl className="account-detail-list">
            <div>
              <dt>Name</dt>
              <dd>{user?.name || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email}</dd>
            </div>
            {user?.createdAt && (
              <div>
                <dt>Member since</dt>
                <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className="account-signout-row">
        <button
          type="button"
          className="account-signout-btn"
          onClick={handleSignOut}
          disabled={signOutPending}
        >
          {signOutPending ? 'Signing Out…' : 'Sign Out'}
        </button>
      </div>
    </main>
  )
}

export default AccountPage
