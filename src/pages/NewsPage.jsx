import { Link } from 'react-router-dom'
import { NAV_ITEMS } from '../utils/navigationConfig'
import { getCategoryConfig } from '../utils/categoryConfig'
import './NewsPage.css'

/**
 * NewsPage - Section hub for categories and topic subpages
 * Accessible via the bottom dock on mobile
 */
function NewsPage() {
  const categoryAccentMap = {
    News: '#ff6b6b',
    Politics: '#4f8dfd',
    Tech: '#1fb7a6',
    Business: '#4f8dfd',
    Sports: '#f59e0b',
    Entertainment: '#f06292',
    Lifestyle: '#22c55e'
  }

  const sectionCards = NAV_ITEMS.map((item) => {
    const categorySlug = item.target.split('/').filter(Boolean).pop() || 'top-stories'
    const config = getCategoryConfig(categorySlug)

    return {
      label: item.label,
      name: config.title,
      path: item.target,
      description: config.subtitle,
      image: config.image,
      accent: categoryAccentMap[item.label] || '#2b6ba8',
      topics: Array.isArray(item.items) ? item.items.slice(0, 4) : []
    }
  })

  return (
    <div className="news-page">
      <section className="news-hero">
        <div className="news-shell news-hero-inner">
          <div className="news-hero-copy">
            <div className="news-eyebrow">Section Guide</div>
            <h1 className="news-hero-title">Browse the latest by section.</h1>
            <p className="news-hero-description">
              Open a full category page or jump straight into the topic routes that sit underneath it.
            </p>
          </div>
          <div className="news-hero-stats" aria-label="Section summary">
            <div className="news-hero-stat">
              <span className="news-hero-stat-value">{sectionCards.length}</span>
              <span className="news-hero-stat-label">sections</span>
            </div>
            <div className="news-hero-stat">
              <span className="news-hero-stat-value">{sectionCards.reduce((total, card) => total + card.topics.length, 0)}</span>
              <span className="news-hero-stat-label">topic links</span>
            </div>
          </div>
        </div>
      </section>

      <div className="news-shell">
        <div className="news-section-heading">
          <div>
            <div className="news-heading-kicker">Navigate faster</div>
            <h2 className="news-heading-title">Sections and subpages</h2>
          </div>
          <p className="news-heading-copy">Choose a desk to see the full page, or use the topic chips to go directly into a subpage.</p>
        </div>

        <div className="news-categories-grid">
          {sectionCards.map((category) => (
            <article
              key={category.path}
              className="news-category-card"
              style={{ '--category-color': category.accent, '--category-image': `url(${category.image})` }}
            >
              <div className="news-category-media" aria-hidden="true"></div>
              <div className="news-category-card-inner">
                <div className="category-card-meta">{category.label}</div>
                <div className="category-card-content">
                  <h3 className="category-card-title">{category.name}</h3>
                  <p className="category-card-description">{category.description}</p>
                </div>

                <div className="category-card-topics">
                  {category.topics.map((topic) => (
                    <Link key={topic.slug} to={topic.target} className="category-topic-chip">
                      {topic.label}
                    </Link>
                  ))}
                </div>

                <div className="category-card-actions">
                  <Link to={category.path} className="category-card-primary-action">
                    Open section
                  </Link>
                  <span className="category-card-arrow" aria-hidden="true">→</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="news-footer">
        <p className="news-footer-text">
          Open a section for the full feed, or jump straight into a topic route from the chips above.
        </p>
      </div>
    </div>
  )
}

export default NewsPage
