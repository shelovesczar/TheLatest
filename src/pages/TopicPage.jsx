import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AISummary from '../components/sections/AISummary'
import TopStories from '../components/sections/TopStories'
import Opinions from '../components/sections/Opinions'
import Videos from '../components/sections/Videos'
import Podcasts from '../components/sections/Podcasts'
import AdBreak from '../components/common/AdBreak'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { filterItemsByTopic } from '../utils/topicFiltering'
import { getTopicPageConfig } from '../utils/navigationConfig'
import './CategoryPage.css'

function TopicPage() {
  const { topicSlug } = useParams()
  const config = getTopicPageConfig(topicSlug)
  const [topicNews, setTopicNews] = useState([])
  const [opinions, setOpinions] = useState([])
  const [videos, setVideos] = useState([])
  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingOpinions, setLoadingOpinions] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)
  const [activeStory, setActiveStory] = useState(0)

  useEffect(() => {
    if (!config) {
      setTopicNews([])
      setOpinions([])
      setVideos([])
      setPodcasts([])
      setLoading(false)
      setLoadingOpinions(false)
      setLoadingVideos(false)
      setLoadingPodcasts(false)
      return
    }

    let ignore = false

    const loadTopicContent = async () => {
      setLoading(true)
      setLoadingOpinions(true)
      setLoadingVideos(true)
      setLoadingPodcasts(true)

      const feedCategory = config.feedCategory || 'news'
      const topicQuery = config.query || config.title
      const narrow = (items = [], limit = 6) => dedupeContentItems(filterItemsByTopic(items, topicQuery)).slice(0, limit)

      try {
        const [newsItems, opinionItems, videoItems, podcastItems] = await Promise.all([
          fetchRSSNews(feedCategory),
          fetchOpinions(feedCategory),
          fetchVideos(feedCategory),
          fetchTrendingContent(feedCategory)
        ])

        if (ignore) return

        setTopicNews(narrow(newsItems, 15))
        setOpinions(narrow(opinionItems, 6))
        setVideos(narrow(videoItems, 6))
        setPodcasts(narrow(podcastItems, 6))
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load topic page content:', error)
          setTopicNews([])
          setOpinions([])
          setVideos([])
          setPodcasts([])
        }
      } finally {
        if (!ignore) {
          setLoading(false)
          setLoadingOpinions(false)
          setLoadingVideos(false)
          setLoadingPodcasts(false)
        }
      }
    }

    loadTopicContent()
    return () => { ignore = true }
  }, [config, topicSlug])

  if (!config) {
    return (
      <main className="main-content category-page">
        <div className="category-hero">
          <h1 className="category-title">Topic Not Found</h1>
          <p className="category-description">This nav topic does not have a page definition yet.</p>
        </div>
      </main>
    )
  }

  const topicBasePath = `/topic/${topicSlug}`

  return (
    <main className="main-content category-page">
      <div className="category-hero">
        <h1 className="category-title">{config.title}</h1>
        <p className="category-description">{config.subtitle}</p>
      </div>

      <div className="page-body category-page-body">
        <AISummary
          category={topicSlug}
          description={`AI-generated summary of the latest coverage around ${config.title}.`}
          categoryImage={config.image}
          categoryTitle={config.title}
          ignoreTopic={true}
        />

        <TopStories
          topStories={topicNews}
          loading={loading}
          activeStory={activeStory}
          setActiveStory={setActiveStory}
          categoryTitle={config.title}
          categoryPath={`${topicBasePath}/all-news`}
        />

        <AdBreak slot="home-feed-inline" />

        <Opinions
          opinions={opinions}
          loadingOpinions={loadingOpinions}
          categoryPath={`${topicBasePath}/all-opinions`}
        />

        <AdBreak slot="section-break" />

        <Videos
          videos={videos}
          loadingVideos={loadingVideos}
          categoryPath={`${topicBasePath}/all-videos`}
        />

        <AdBreak slot="section-break" />

        <Podcasts
          podcasts={podcasts}
          loadingPodcasts={loadingPodcasts}
          categoryPath={`${topicBasePath}/all-podcasts`}
        />

        <AdBreak slot="section-break" />
      </div>
    </main>
  )
}

export default TopicPage