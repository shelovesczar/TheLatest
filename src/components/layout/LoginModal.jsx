import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import './LoginModal.css'

function LoginModal({ isOpen, onClose }) {
  const { signIn, signUp, requestReset } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        await signUp({ name, email, password })
        setName('')
        setEmail('')
        setPassword('')
        onClose()
      } else if (mode === 'forgot') {
        const payload = await requestReset({ email })
        setInfoMessage(payload?.message || 'If an account exists for that email, a reset link is on its way.')
      } else {
        await signIn({ email, password })
        setName('')
        setEmail('')
        setPassword('')
        onClose()
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to complete that request right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setMode('login')
    setName('')
    setEmail('')
    setPassword('')
    setErrorMessage('')
    setInfoMessage('')
    setIsSubmitting(false)
    onClose()
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setErrorMessage('')
    setInfoMessage('')
  }

  if (!isOpen) return null

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={handleClose} aria-label="Close login">
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h2 className="login-modal-title">
          {mode === 'register' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Sign In'}
        </h2>
        <p className="login-modal-subtitle">
          {mode === 'register'
            ? 'Create a cross-device account for following, dashboard access, and saved preferences.'
            : mode === 'forgot'
              ? "Enter your account email and we'll send you a link to choose a new password."
              : 'Sign in to manage your follows, view the dashboard, and keep preferences synced.'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                className="form-input"
                placeholder="How should we label your account?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="Use at least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
    </div>
  )
}

export default LoginModal