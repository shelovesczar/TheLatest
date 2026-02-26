import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInstagram, faXTwitter, faFacebook, faPinterest } from '@fortawesome/free-brands-svg-icons'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <p className="footer-text">From headlines to hashtags, keep up with <em>the latest!</em></p>
      <div className="footer-links">
        {/* <a href="#about">About Us</a> */}
        <a href="#news">News</a>
        <a href="#social">Social</a>
        <a href="#opinions">Opinions</a>
        <a href="#videos">Videos</a>
        <a href="#podcasts">Podcasts</a>
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
