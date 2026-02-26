import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { Link } from 'react-router-dom'
import { getRandomTrendingPosts } from '../socialMediaService'
import { getRandomCategoryPosts } from '../socialMediaPosts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXTwitter, faInstagram, faTiktok, faReddit } from '@fortawesome/free-brands-svg-icons'
import Subscribe from '../components/sections/Subscribe'
import './CategoryPage.css'
import '../components/sections/SocialMedia.css'

function SocialPage() {
  const { topic, hasActiveTopic } = useSearch()
  const [socialPosts, setSocialPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSocialPosts = async () => {
      setLoading(true)
      try {
        // TODO: Replace with real API calls when keys are available
        // For now, use mock data
        const posts = hasActiveTopic 
          ? getRandomCategoryPosts(20) // Simulate topic-filtered posts
          : await getRandomTrendingPosts(20)
        
        setSocialPosts(posts || getRandomCategoryPosts(20))
      } catch (error) {
        console.error('Error loading social posts:', error)
        setSocialPosts(getRandomCategoryPosts(20))
      } finally {
        setLoading(false)
      }
    }

    loadSocialPosts()
  }, [topic, hasActiveTopic])

  const getIcon = (platform) => {
    switch (platform) {
      case 'X':
        return faXTwitter
      case 'Instagram':
        return faInstagram
      case 'TikTok':
        return faTiktok
      case 'Reddit':
        return faReddit
      default:
        return faXTwitter
    }
  }

  return (
    <div className="category-page">
      <div className="category-hero" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=500&fit=crop)`
      }}>
        <div className="category-hero-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1 className="category-title">
            {hasActiveTopic ? `${topic} on Social Media` : 'Trending Social Media'}
          </h1>
          <p className="category-description">
            {hasActiveTopic 
              ? `The most popular social media posts about ${topic} right now`
              : 'Trending posts from X, Instagram, TikTok, and Reddit'
            }
          </p>
        </div>
      </div>

      <div className="category-content">
        <section className="section social-media">
          <h2 className="section-title">Social Media Posts</h2>
          
          {loading ? (
            <div className="loading-container">
              <p className="loading-text">Loading social media posts...</p>
            </div>
          ) : (
            <div className="social-posts-grid">
              {socialPosts.map((post, index) => (
                <div key={index} className="social-post-card">
                  {post.html ? (
                    <div dangerouslySetInnerHTML={{ __html: post.html }} />
                  ) : (
                    <>
                      <div className="social-post-header">
                        <FontAwesomeIcon icon={getIcon(post.platform)} className="platform-icon" />
                        <div className="social-post-meta">
                          <span className="author">{post.author}</span>
                          <span className="platform">{post.platform}</span>
                        </div>
                      </div>
                      {post.image && (
                        <img src={post.image} alt={post.content} className="social-post-image" />
                      )}
                      <p className="social-post-content">{post.content}</p>
                      <div className="social-post-stats">
                        <span>{post.likes?.toLocaleString() || 0} likes</span>
                        <span>{post.shares?.toLocaleString() || 0} shares</span>
                      </div>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="view-post-link">
                        View Post →
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <Subscribe />
      </div>
    </div>
  )
}

export default SocialPage
