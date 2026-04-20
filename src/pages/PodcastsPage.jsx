import { useState, useEffect } from 'react'
import { useSearch } from '../context/SearchContext'
import { Link } from 'react-router-dom'
import Podcasts from '../components/sections/Podcasts'
import Videos from '../components/sections/Videos'
import { fetchVideos, fetchTrendingContent } from '../newsService'
import { fetchRSSPodcasts } from '../rssService'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { filterItemsByTopic } from '../utils/topicFiltering'
import './CategoryPage.css'

function PodcastsPage() {
  const { topic, hasActiveTopic } = useSearch()
  const [podcasts, setPodcasts] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMedia = async () => {
      setLoading(true)
      try {
        const activeTopic = hasActiveTopic ? topic : ''

        // Fetch both in parallel
        const [rawVideos, rawPodcasts] = await Promise.all([
          fetchVideos(null, activeTopic).catch(() => []),
          fetchRSSPodcasts().catch(() => fetchTrendingContent(null, activeTopic).catch(() => []))
        ])

        const filteredVideos = rawVideos || []
        const filteredPodcasts = hasActiveTopic
          ? filterItemsByTopic(rawPodcasts || [], topic)
          : (rawPodcasts || [])

        // Cross-deduplication: build a set of identifiers from videos,
        // then strip any podcast item that matches so the two feeds never overlap.
        const videoKeys = new Set(
          filteredVideos.map(v => (v.url || v.link || v.title || '').toLowerCase()).filter(Boolean)
        )
        const uniquePodcasts = filteredPodcasts.filter(p => {
          const key = (p.url || p.link || p.title || '').toLowerCase()
          return key && !videoKeys.has(key)
        })

        setVideos(dedupeContentItems(filteredVideos))
        setPodcasts(dedupeContentItems(uniquePodcasts))
      } catch (error) {
        console.error('Error loading media:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMedia()
  }, [topic, hasActiveTopic])

  return (
    <div className="category-page">
      <div className="category-hero">
        <div className="category-hero-content">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1 className="category-title">Videos &amp; Podcasts</h1>
          <p className="category-description">Latest videos and podcast episodes</p>
        </div>
      </div>

      <main className="main-content">
        <Videos
          videos={videos}
          loadingVideos={loading}
        />
        <Podcasts
          podcasts={podcasts}
          loadingPodcasts={loading}
        />
      </main>
    </div>
  )
}

export default PodcastsPage
