import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { reportClientError } from './services/errorReportingService'

window.addEventListener('error', (event) => {
  reportClientError({
    message: event.message || 'Unhandled window error',
    stack: event.error?.stack || '',
  })
})

window.addEventListener('unhandledrejection', (event) => {
  reportClientError({
    message: event.reason?.message || String(event.reason || 'Unhandled promise rejection'),
    stack: event.reason?.stack || '',
  })
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
