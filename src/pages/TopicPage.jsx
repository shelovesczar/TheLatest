import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AISummary from '../components/sections/AISummary'
import TopStories from '../components/sections/TopStories'
import Opinions from '../components/sections/Opinions'
import SocialMedia from '../components/sections/SocialMedia'
import Videos from '../components/sections/Videos'
import Podcasts from '../components/sections/Podcasts'
import AdBreak from '../components/common/AdBreak'
import { searchRSSContent } from '../rssService'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { cacheSocialPosts, fetchAllSocialPosts, getCachedSocialPosts } from '../services/socialMediaApiService'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { filterItemsByTopic } from '../utils/topicFiltering'
import { getTopicPageConfig, getTopicSectionLabel } from '../utils/navigationConfig'
import './CategoryPage.css'

function TopicPage() {
  const { topicSlug } = useParams()
  const config = getTopicPageConfig(topicSlug)
  const sectionLabel = getTopicSectionLabel(topicSlug)
  const [topicNews, setTopicNews] = useState([])
  const [opinions, setOpinions] = useState([])
  const [videos, setVideos] = useState([])
  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingOpinions, setLoadingOpinions] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)
  const [socialPosts, setSocialPosts] = useState([])
  const [loadingSocial, setLoadingSocial] = useState(true)
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
      setLoadingSocial(false)
      return
    }

    let ignore = false

    const loadTopicContent = async () => {
      setLoading(true)
      setLoadingOpinions(true)
      setLoadingVideos(true)
      setLoadingPodcasts(true)
      setLoadingSocial(true)

      const feedCategory = config.feedCategory || 'news'
      const topicQuery = config.query || config.title
      const narrow = (items = [], limit = 6) => dedupeContentItems(filterItemsByTopic(items, topicQuery)).slice(0, limit)

      const cachedSocial = getCachedSocialPosts(topicQuery)
      if (cachedSocial && !ignore) {
        setSocialPosts(Array.isArray(cachedSocial) ? cachedSocial.slice(0, 6) : [])
        setLoadingSocial(false)
      }

      try {
        const [newsItems, opinionItems, videoItems, podcastItems, socialItems] = await Promise.all([
          searchRSSContent(topicQuery, {
            preferFresh: true,
            strictSearch: false,
            relaxSearchFallback: true,
            minStrictResults: 4
          }),
          fetchOpinions(feedCategory, topicQuery),
          fetchVideos(feedCategory, topicQuery),
          fetchTrendingContent(feedCategory, topicQuery),
          fetchAllSocialPosts(topicQuery, 6)
        ])

        if (ignore) return

        const resolvedTopicNews = Array.isArray(newsItems) && newsItems.length > 0
          ? dedupeContentItems(newsItems).slice(0, 15)
          : narrow(await fetchRSSNews(feedCategory, topicQuery), 15)

        setTopicNews(resolvedTopicNews)
        setOpinions(narrow(opinionItems, 6))
        setVideos(narrow(videoItems, 6))
        setPodcasts(narrow(podcastItems, 6))
        setSocialPosts(Array.isArray(socialItems) ? socialItems.slice(0, 6) : [])

        if (Array.isArray(socialItems) && socialItems.length > 0) {
          cacheSocialPosts(topicQuery, socialItems)
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load topic page content:', error)
          setTopicNews([])
          setOpinions([])
          setVideos([])
          setPodcasts([])
          setSocialPosts(cachedSocial || [])
        }
      } finally {
        if (!ignore) {
          setLoading(false)
          setLoadingOpinions(false)
          setLoadingVideos(false)
          setLoadingPodcasts(false)
          setLoadingSocial(false)
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
  const totalStoryCount = topicNews.length + opinions.length + videos.length + podcasts.length
  const sourceCount = useMemo(() => {
    const sources = [
      ...topicNews,
      ...opinions,
      ...videos,
      ...podcasts
    ].map((item) => String(item?.source || item?.author || '').trim()).filter(Boolean)

    return new Set(sources).size
  }, [opinions, podcasts, topicNews, videos])

  const tabItems = [
    { label: 'All', href: '#topic-top' },
    { label: 'AI', href: '#summary' },
    { label: 'Side by Side', href: '#news' },
    { label: 'Opinions', href: '#opinions' },
    { label: 'Social', href: '#social-media' },
    { label: 'Videos', href: '#videos' },
    { label: 'Podcasts', href: '#podcasts' }
  ]

  return (
    <main className="main-content category-page topic-page" id="topic-top">
      <div className="topic-page-back-bar">
        <div className="topic-page-shell topic-page-back-inner">
          <div className="topic-page-breadcrumbs">
            <Link to="/">Home</Link>
            <span>/</span>
            <Link to={sectionLabel === 'News' ? '/category/top-stories' : `/category/${sectionLabel.toLowerCase()}`}>{sectionLabel}</Link>
            <span>/</span>
            <span>{config.title}</span>
          </div>
          <span className="topic-page-result-count">{totalStoryCount} pieces across all sections</span>
        </div>
      </div>

      <section className="topic-hero-shell">
        <div className="topic-page-shell topic-hero-inner-shell">
          <div className="topic-hero-copy">
            <div className="topic-hero-breadcrumb">Home • {sectionLabel} • {config.title}</div>
            <h1 className="topic-hero-title">{config.title}</h1>
            <p className="topic-hero-subtitle">{config.subtitle}</p>
            <div className="topic-hero-stats">
              <div className="topic-hero-stat">
                <span className="topic-hero-stat-value">{topicNews.length || 0}</span>
                <span className="topic-hero-stat-label">Stories</span>
              </div>
              <div className="topic-hero-stat">
                <span className="topic-hero-stat-value">{sourceCount || 0}</span>
                <span className="topic-hero-stat-label">Sources</span>
              </div>
              <div className="topic-hero-stat">
                <span className="topic-hero-stat-value">{socialPosts.length || 0}</span>
                <span className="topic-hero-stat-label">Social</span>
              </div>
              <div className="topic-hero-stat">
                <span className="topic-hero-stat-value">{podcasts.length || 0}</span>
                <span className="topic-hero-stat-label">Podcasts</span>
              </div>
            </div>
          </div>

          <div className="topic-hero-image-wrap">
            <img src={config.image} alt={config.title} className="topic-hero-image" />
          </div>
        </div>
      </section>

      <div className="topic-page-tabs">
        <div className="topic-page-shell topic-page-tabs-inner">
          {tabItems.map((item) => (
            <a key={item.label} href={item.href} className="topic-page-tab-pill">{item.label}</a>
          ))}
        </div>
      </div>

      <div className="page-body category-page-body topic-page-body">
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
          defaultPerspectiveView={true}
          showPerspectiveToggle={false}
          sideBySideTitle="Top Stories - Side by Side"
          seeMoreLabel={`See all ${config.title} stories →`}
        />

        <AdBreak slot="home-feed-inline" />

        <Opinions
          opinions={opinions}
          loadingOpinions={loadingOpinions}
          categoryPath={`${topicBasePath}/all-opinions`}
        />

        <AdBreak slot="section-break" />

        <SocialMedia
          socialPosts={socialPosts}
          loadingSocial={loadingSocial}
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