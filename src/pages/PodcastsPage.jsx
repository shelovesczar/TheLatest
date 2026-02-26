import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { Link } from 'react-router-dom'
import Podcasts from '../components/sections/Podcasts'
import Subscribe from '../components/sections/Subscribe'
import { fetchTrendingContent } from '../newsService'
import './CategoryPage.css'

function PodcastsPage() {
  const { topic, hasActiveTopic } = useSearch()
  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPodcasts = async () => {
      setLoading(true)
      try {
        // TODO: Implement real podcast API integration
        // For now, using trending content as placeholder
        const data = hasActiveTopic 
          ? await fetchTrendingContent(topic)
          : await fetchTrendingContent('podcasts')
        
        setPodcasts(data.slice(0, 12))
      } catch (error) {
        console.error('Error loading podcasts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPodcasts()
  }, [topic, hasActiveTopic])

  return (
    <div className="category-page">
      <div className="category-hero" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&h=500&fit=crop)`
      }}>
        <div className="category-hero-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1 className="category-title">
            {hasActiveTopic ? `${topic} Podcasts` : 'All Podcasts'}
          </h1>
          <p className="category-description">
            {hasActiveTopic 
              ? `Latest podcast episodes discussing ${topic}`
              : 'Trending podcasts from across all topics and genres'
            }
          </p>
        </div>
      </div>

      <div className="category-content">
        <Podcasts 
          podcasts={podcasts}
          loadingPodcasts={loading}
        />

        <Subscribe />
      </div>
    </div>
  )
}

export default PodcastsPage
