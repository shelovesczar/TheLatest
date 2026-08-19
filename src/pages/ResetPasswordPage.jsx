import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../components/layout/LoginModal.css'
import './ResetPasswordPage.css'

function ResetPasswordPage() {
  const { completeReset } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      await completeReset({ token, password })
      setIsComplete(true)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to reset your password right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="reset-password-page">
      <div className="login-modal-content reset-password-card">
        {!token ? (
          <>
            <h2 className="login-modal-title">Invalid Reset Link</h2>
            <p className="login-modal-subtitle">
              This password reset link is missing its token. Request a new one from the sign-in menu.
            </p>
            <Link to="/" className="login-button reset-password-home-link">Back to Home</Link>
          </>
        ) : isComplete ? (
          <>
            <h2 className="login-modal-title">Password Updated</h2>
            <p className="login-modal-subtitle">
              Your password has been reset and you're signed in on this device.
            </p>
            <Link to="/" className="login-button reset-password-home-link">Continue to The Latest</Link>
          </>
        ) : (
          <>
            <h2 className="login-modal-title">Choose a New Password</h2>
            <p className="login-modal-subtitle">Enter a new password for your account.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="password">New Password</label>
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

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-input"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {errorMessage && <p className="error-message">{errorMessage}</p>}

              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? 'Working...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default ResetPasswordPage
