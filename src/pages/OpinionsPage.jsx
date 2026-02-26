import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { Link } from 'react-router-dom'
import Opinions from '../components/sections/Opinions'
import Subscribe from '../components/sections/Subscribe'
import { fetchOpinions } from '../newsService'
import './CategoryPage.css'

function OpinionsPage() {
  const { topic, hasActiveTopic } = useSearch()
  const [opinions, setOpinions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOpinions = async () => {
      setLoading(true)
      try {
        let opinionData = []
        
        if (hasActiveTopic) {
          // Fetch opinions filtered by current topic
          const allOpinions = await fetchOpinions()
          opinionData = allOpinions.filter(opinion => {
            const content = `${opinion.title} ${opinion.description || ''} ${opinion.source || ''}`.toLowerCase()
            return content.includes(topic.toLowerCase())
          })
        } else {
          // Show all opinions if no topic selected
          opinionData = await fetchOpinions()
        }
        
        setOpinions(opinionData)
      } catch (error) {
        console.error('Error loading opinions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadOpinions()
  }, [topic, hasActiveTopic])

  return (
    <div className="category-page">
      <div className="category-hero" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&h=500&fit=crop)`
      }}>
        <div className="category-hero-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1 className="category-title">
            {hasActiveTopic ? `${topic} Opinions` : 'All Opinions'}
          </h1>
          <p className="category-description">
            {hasActiveTopic 
              ? `Opinion pieces and analysis about ${topic} from leading voices`
              : 'Opinion pieces, editorials, and expert analysis from around the web'
            }
          </p>
        </div>
      </div>

      <div className="category-content">
        <Opinions 
          opinions={opinions}
          loadingOpinions={loading}
        />

        <Subscribe />
      </div>
    </div>
  )
}

export default OpinionsPage
