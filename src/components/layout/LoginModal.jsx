import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './LoginModal.css'

function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    setErrorMessage('')

    // Hard-coded demo user for prototype
    const demoEmail = 'demo@thelatest.com'
    const demoPassword = 'password123'

    if (email === demoEmail && password === demoPassword) {
      setIsLoggedIn(true)
      setEmail('')
      setPassword('')
      // Auto close after 2 seconds to show success
      setTimeout(() => {
        onClose()
        setIsLoggedIn(false)
      }, 2000)
    } else {
      setErrorMessage('Invalid email or password. Try demo@thelatest.com / password123')
    }
  }

  const handleClose = () => {
    setEmail('')
    setPassword('')
    setErrorMessage('')
    setIsLoggedIn(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="login-modal-overlay" onClick={handleClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="login-modal-close" onClick={handleClose} aria-label="Close login">
          <FontAwesomeIcon icon={faTimes} />
        </button>

        {isLoggedIn ? (
          <div className="login-success">
            <h2>Welcome!</h2>
            <p>You've been signed in successfully.</p>
          </div>
        ) : (
          <>
            <h2 className="login-modal-title">Sign In</h2>
            <form onSubmit={handleLogin} className="login-form">
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

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {errorMessage && <p className="error-message">{errorMessage}</p>}

              <button type="submit" className="login-button">
                Sign In
              </button>
            </form>

            <div className="login-demo-info">
              <p><strong>Demo Credentials:</strong></p>
              <p>Email: demo@thelatest.com</p>
              <p>Password: password123</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default LoginModal