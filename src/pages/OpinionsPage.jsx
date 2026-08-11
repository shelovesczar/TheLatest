import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import Opinions from '../components/sections/Opinions'
import PageBackBar from '../components/common/PageBackBar'
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
        const activeTopic = hasActiveTopic ? topic : ''
        const opinionData = await fetchOpinions(null, activeTopic)
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
      <PageBackBar
        shellClassName="topic-page-shell"
        fallbackTo="/"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: hasActiveTopic ? `${topic} Opinions` : 'Opinions' }
        ]}
        meta={`${opinions.length} opinion pieces loaded`}
      />

      <div className="category-hero">
        <div className="category-hero-content">
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
      </div>
    </div>
  )
}

export default OpinionsPage
