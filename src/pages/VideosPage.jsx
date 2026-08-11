import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import Videos from '../components/sections/Videos'
import PageBackBar from '../components/common/PageBackBar'
import { fetchVideos } from '../newsService'
import './CategoryPage.css'

function VideosPage() {
  const { topic, hasActiveTopic } = useSearch()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true)
      try {
        const activeTopic = hasActiveTopic ? topic : ''
        const videoData = await fetchVideos(null, activeTopic)
        setVideos(videoData)
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadVideos()
  }, [topic, hasActiveTopic])

  return (
    <div className="category-page">
      <PageBackBar
        shellClassName="topic-page-shell"
        fallbackTo="/"
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: hasActiveTopic ? `${topic} Videos` : 'Videos' }
        ]}
        meta={`${videos.length} videos loaded`}
      />

      <div className="category-hero">
        <div className="category-hero-content">
          <h1 className="category-title">
            {hasActiveTopic ? `${topic} Videos` : 'All Videos'}
          </h1>
          <p className="category-description">
            {hasActiveTopic 
              ? `Latest video content about ${topic} from YouTube and other platforms`
              : 'Trending video content from across the web'
            }
          </p>
        </div>
      </div>

      <div className="category-content">
        <Videos 
          videos={videos}
          loadingVideos={loading}
        />
      </div>
    </div>
  )
}

export default VideosPage
