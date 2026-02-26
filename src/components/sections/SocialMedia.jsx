import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXTwitter, faInstagram, faTiktok } from '@fortawesome/free-brands-svg-icons'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './SocialMedia.css'

function SocialMedia({ socialPosts, loadingSocial }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerPage = 3

  const nextSlide = () => {
    if (!socialPosts || socialPosts.length === 0) return
    setCurrentIndex((prev) => {
      const next = prev + itemsPerPage
      return next >= socialPosts.length ? 0 : next
    })
  }

  const prevSlide = () => {
    if (!socialPosts || socialPosts.length === 0) return
    setCurrentIndex((prev) => {
      if (prev === 0) {
        // Jump to last complete page
        const lastPageStart = Math.floor((socialPosts.length - 1) / itemsPerPage) * itemsPerPage
        return lastPageStart
      }
      return prev - itemsPerPage
    })
  }

  // Create circular array view - wrap around if needed
  const getVisiblePosts = () => {
    if (!socialPosts || socialPosts.length === 0) return []
    const posts = []
    for (let i = 0; i < itemsPerPage; i++) {
      const index = (currentIndex + i) % socialPosts.length
      if (socialPosts[index]) {
        posts.push(socialPosts[index])
      }
    }
    return posts
  }

  const visiblePosts = socialPosts && socialPosts.length > 0 ? getVisiblePosts() : []
  const getIcon = (platform) => {
    switch (platform) {
      case 'X':
        return faXTwitter
      case 'Instagram':
        return faInstagram
      case 'TikTok':
        return faTiktok
      default:
        return faXTwitter
    }
  }

  return (
    <section id="social-media" className="section social-media">
      <h2 className="section-title">Social Media</h2>
      <Link to="/social" className="see-more-link">See More</Link>
      
      {loadingSocial ? (
        <div className="loading-container">
          <p className="loading-text">Loading trending content...</p>
        </div>
      ) : socialPosts.length > 0 ? (
        <>
          <div className="social-slider-container">
            <button 
              className="slider-btn social-slider-btn" 
              onClick={prevSlide}
              aria-label="Previous posts"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="social-slider">
              {visiblePosts.map((post, index) => (
            post.html ? (
              // Render embedded social media posts
              <div 
                key={currentIndex + index}
                className="social-card social-embed"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            ) : (
              // Render fallback content
              <a 
                key={currentIndex + index} 
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="social-header">
                  <div className="social-logo">
                    <FontAwesomeIcon icon={getIcon(post.platform)} />
                  </div>
                  <span className="social-platform">{post.platform}</span>
                  <div className="social-author">{post.author}</div>
                </div>
                {post.image && (
                  <div className="social-media-image">
                    <img src={post.image} alt={post.author} />
                  </div>
                )}
                <div className="social-body">
                  <p className="social-content">{post.content}</p>
                </div>
                <div className="social-footer">
                  <span className="social-engagement">{post.engagement}</span>
                </div>
              </a>
            )
          ))}
            </div>

            <button 
              className="slider-btn social-slider-btn" 
              onClick={nextSlide}
              aria-label="Next posts"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </>
      ) : (
        <p className="no-content">No trending content available at this time.</p>
      )}
      
      <button className="see-more-btn">See More Posts</button>
    </section>
  )
}

export default SocialMedia
