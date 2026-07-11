import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <p className="footer-text">From headlines to hashtags, keep up with <em>the latest!</em></p>
      <div className="footer-links">
        <Link to="/news">News</Link>
        <Link to="/social">Social</Link>
        <Link to="/opinions">Opinions</Link>
        <Link to="/videos">Videos</Link>
        <Link to="/podcasts">Podcasts</Link>
      </div>
      <div className="footer-links footer-links--legal">
        <Link to="/about">About</Link>
        <Link to="/advertise">Advertise</Link>
        <Link to="/editorial-standards">Editorial Standards</Link>
        <Link to="/corrections">Corrections</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Use</Link>
      </div>
      <p className="footer-support">Editorial, corrections, and support requests: <a href="mailto:support@thelatest.news">support@thelatest.news</a></p>
      <p className="footer-copyright">© 2026 The Latest, Inc. All Rights Reserved.</p>
    </footer>
  )
}

export default Footer
