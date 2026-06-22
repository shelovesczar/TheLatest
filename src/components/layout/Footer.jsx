import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInstagram, faXTwitter, faFacebook, faPinterest } from '@fortawesome/free-brands-svg-icons'
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
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Use</Link>
      </div>
      <div className="footer-social">
        <a href="#" aria-label="Instagram"><FontAwesomeIcon icon={faInstagram} /></a>
        <a href="#" aria-label="X"><FontAwesomeIcon icon={faXTwitter} /></a>
        <a href="#" aria-label="Facebook"><FontAwesomeIcon icon={faFacebook} /></a>
        <a href="#" aria-label="Pinterest"><FontAwesomeIcon icon={faPinterest} /></a>
      </div>
      <p className="footer-copyright">© 2026 The Latest, Inc. All Rights Reserved.</p>
    </footer>
  )
}

export default Footer
