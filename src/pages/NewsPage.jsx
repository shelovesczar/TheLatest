import { Link } from 'react-router-dom'
import './NewsPage.css'

/**
 * NewsPage - Shows NEWS categories for navigation
 * Accessible via News+ button in the bottom dock
 */
function NewsPage() {
  const newsCategories = [
    {
      name: 'Top Stories',
      path: '/category/top-stories',
      icon: '🔥',
      color: '#FF2D55',
      description: 'Breaking news and trending headlines'
    },
    {
      name: 'Business/Tech',
      path: '/category/business-tech',
      icon: '💼',
      color: '#007AFF',
      description: 'Technology and business updates'
    },
    {
      name: 'Entertainment',
      path: '/category/entertainment',
      icon: '🎬',
      color: '#AF52DE',
      description: 'Movies, music, and celebrity news'
    },
    {
      name: 'Sports',
      path: '/category/sports',
      icon: '⚽',
      color: '#FFD60A',
      description: 'Latest scores, highlights, and analysis'
    },
    {
      name: 'Lifestyle',
      path: '/category/lifestyle',
      icon: '✨',
      color: '#FF9500',
      description: 'Health, wellness, and lifestyle trends'
    },
    {
      name: 'Culture',
      path: '/category/culture',
      icon: '🎨',
      color: '#34C759',
      description: 'Arts, books, and cultural events'
    }
  ]

  return (
    <div className="news-page">
      <div className="news-header">
        <h1 className="news-title">
          <span className="news-icon">📰</span>
          News
        </h1>
        <h2 className="news-subtitle">Categories</h2>
      </div>

      <div className="news-categories-grid">
        {newsCategories.map((category, index) => (
          <Link
            key={index}
            to={category.path}
            className="news-category-card"
            style={{ '--category-color': category.color }}
          >
            <div className="category-card-icon">{category.icon}</div>
            <div className="category-card-content">
              <h3 className="category-card-title">{category.name}</h3>
              <p className="category-card-description">{category.description}</p>
            </div>
            <div className="category-card-arrow">→</div>
          </Link>
        ))}
      </div>

      <div className="news-footer">
        <p className="news-footer-text">
          Tap any category to explore stories
        </p>
      </div>
    </div>
  )
}

export default NewsPage
