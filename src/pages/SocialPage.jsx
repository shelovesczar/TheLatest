import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { Link } from 'react-router-dom'
import { getRandomTrendingPosts } from '../socialMediaService'
import { getRandomCategoryPosts } from '../socialMediaPosts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXTwitter, faInstagram, faTiktok, faReddit } from '@fortawesome/free-brands-svg-icons'
import { getImageProps } from '../utils/imageUtils'
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
        const activeTopic = hasActiveTopic ? topic : ''
        let posts = await getRandomTrendingPosts(20, activeTopic)

        // If topic feed is sparse, broaden to overall social feed before mock fallback.
        if ((!posts || posts.length === 0) && activeTopic) {
          posts = await getRandomTrendingPosts(20, '')
        }

        setSocialPosts(posts && posts.length > 0 ? posts : getRandomCategoryPosts(20))
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
      <div className="category-hero">
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
                        <img {...getImageProps(post.image, post.content, 'general')} className="social-post-image" />
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

      </div>
    </div>
  )
}

export default SocialPage
