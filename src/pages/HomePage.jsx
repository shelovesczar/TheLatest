import { useState, useEffect, lazy, Suspense, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useSearch } from '../context/SearchContext'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { searchRSSContent, fetchRSSVideos } from '../rssService'
import { getRandomTrendingPosts } from '../socialMediaService'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { matchesTopicQuery } from '../utils/topicFiltering'
import './HomePage.css'
import Hero from '../components/sections/Hero'
import TopStories from '../components/sections/TopStories'
import DateTicker from '../components/layout/DateTicker'
import TrendingStories from '../components/sections/TrendingStories'
import AdBreak from '../components/common/AdBreak'

// Lazy load below-the-fold components
const AISummary = lazy(() => import('../components/sections/AISummary'))
const SocialMedia = lazy(() => import('../components/sections/SocialMedia'))
const Opinions = lazy(() => import('../components/sections/Opinions'))
const Videos = lazy(() => import('../components/sections/Videos'))
const Podcasts = lazy(() => import('../components/sections/Podcasts'))
const Search = lazy(() => import('../components/sections/Search'))

// Loading component
const SectionLoader = () => (
  <div style={{
    padding: '3rem',
    textAlign: 'center',
    color: '#666',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div className="spinner" style={{
      border: '3px solid #f3f3f3',
      borderTop: '3px solid var(--accent-color)',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      animation: 'spin 1s linear infinite'
    }} />
  </div>
)

function HomePage({
  email,
  setEmail,
  hotTopics,
  handleSubscribe
}) {
  const ensureTopicCoverage = (primaryItems, backupPool, topicValue, minItems) => {
    const primary = Array.isArray(primaryItems) ? primaryItems : []
    const backup = Array.isArray(backupPool) ? backupPool : []

    const topicMatchedBackup = backup.filter((item) => matchesTopicQuery(item, topicValue))
    const merged = dedupeContentItems([...primary, ...topicMatchedBackup])

    if (merged.length < minItems) {
      console.log(`[HomePage] Topic "${topicValue}" has limited matches (${merged.length}/${minItems})`)
    }

    return merged
  }

  const { topic, setTopic, clearTopic, hasActiveTopic } = useSearch()
  const [activeStory, setActiveStory] = useState(0)
  const [suggestedTopic, setSuggestedTopic] = useState(null)

  // Content state - filters based on current topic
  const [topStories, setTopStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [opinions, setOpinions] = useState([])
  const [videos, setVideos] = useState([])
  const [podcasts, setPodcasts] = useState([])
  const [socialPosts, setSocialPosts] = useState([])
  const [loadingOpinions, setLoadingOpinions] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(true)
  const [loadingPodcasts, setLoadingPodcasts] = useState(true)
  const [loadingSocial, setLoadingSocial] = useState(true)

  // Track which sections are visible (for lazy loading)
  const [visibleSections, setVisibleSections] = useState({
    opinions: false,
    videos: false,
    podcasts: false,
    social: false
  })
  const topicTickerRef = useRef(null)
  const lastSocialQueryRef = useRef(null)
  const sectionPrefetchRef = useRef({
    opinions: false,
    videos: false,
    podcasts: false
  })

  const handleTopicClick = (newTopic, shouldScrollToNews = true) => {
    setTopic(newTopic)
    if (shouldScrollToNews) {
      setTimeout(() => {
        document.getElementById('news')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  const handleAllTopicsClick = (shouldScrollToNews = true) => {
    clearTopic()
    if (shouldScrollToNews) {
      setTimeout(() => {
        document.getElementById('news')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  /*Filter by topic:
  Allows the for the  manpulations of how many topics to display to the user*/
  const topicFilters = (hotTopics || []).slice(0, 9)

  const scrollTopicIntoView = (topicValue) => {
    if (!topicTickerRef.current) return
    const chipSelector = topicValue === '__all__'
      ? '[data-topic-value="__all__"]'
      : `[data-topic-value="${topicValue}"]`
    const chip = topicTickerRef.current.querySelector(chipSelector)
    if (chip) {
      chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }

  const scrollTopicTicker = (direction) => {
    const topicOptions = ['__all__', ...topicFilters]
    if (topicOptions.length === 0) return

    const currentIndex = !hasActiveTopic
      ? 0
      : Math.max(0, topicOptions.indexOf(topic))

    const nextIndex = direction === 'left'
      ? (currentIndex - 1 + topicOptions.length) % topicOptions.length
      : (currentIndex + 1) % topicOptions.length

    const nextTopic = topicOptions[nextIndex]

    if (nextTopic === '__all__') {
      handleAllTopicsClick(false)
      setTimeout(() => scrollTopicIntoView('__all__'), 120)
      return
    }

    handleTopicClick(nextTopic, false)
    setTimeout(() => scrollTopicIntoView(nextTopic), 120)
  }

  // Load initial content (top stories only)
  useEffect(() => {
    let isCancelled = false

    const loadInitialContent = async () => {
      setLoading(true)
      setLoadingOpinions(true)
      setLoadingVideos(true)
      setLoadingPodcasts(true)

      try {
        console.log('Loading initial content, hasActiveTopic:', hasActiveTopic, 'topic:', topic)

        if (hasActiveTopic && topic && topic.trim().length > 0) {
          console.log(`[HomePage] Using comprehensive search for: "${topic}"`)
          const searchResults = await searchRSSContent(topic)
          console.log(`[HomePage] Search returned ${searchResults.length} results`)

          // Categorize search results
          const categorizedResults = {
            news: [],
            opinions: [],
            videos: [],
            podcasts: []
          }

          searchResults.forEach(item => {
            const type = (item.type || '').toLowerCase()
            const category = (item.category || '').toLowerCase()
            const source = (item.source || '').toLowerCase()

            if (type === 'video' || source.includes('youtube') || category.includes('video')) {
              categorizedResults.videos.push(item)
            } else if (type === 'podcast' || category.includes('podcast') || source.includes('podcast')) {
              categorizedResults.podcasts.push(item)
            } else if (type === 'opinion' || category.includes('opinion') || category.includes('commentary')) {
              categorizedResults.opinions.push(item)
            } else {
              categorizedResults.news.push(item)
            }
          })

          // Ensure all sections have live content by pulling broader pools and backfilling.
          const [opinionsPoolResult, videosPoolResult, podcastsPoolResult, newsPoolResult, rssVideoPoolResult] = await Promise.allSettled([
            fetchOpinions(),
            fetchVideos(),
            fetchTrendingContent(),
            fetchRSSNews(),
            fetchRSSVideos()
          ])

          const opinionsPool = opinionsPoolResult.status === 'fulfilled' ? (opinionsPoolResult.value || []) : []
          const videosPool = videosPoolResult.status === 'fulfilled' ? (videosPoolResult.value || []) : []
          const podcastsPool = podcastsPoolResult.status === 'fulfilled' ? (podcastsPoolResult.value || []) : []
          const newsPool = newsPoolResult.status === 'fulfilled' ? (newsPoolResult.value || []) : []
          const rssVideosPool = rssVideoPoolResult.status === 'fulfilled' ? (rssVideoPoolResult.value || []) : []

          const MIN_TOPIC_NEWS = 10
          const MIN_TOPIC_OPINIONS = 8
          const MIN_TOPIC_VIDEOS = 12
          const MIN_TOPIC_PODCASTS = 12

          const guaranteedNews = ensureTopicCoverage(categorizedResults.news, newsPool, topic, MIN_TOPIC_NEWS)
          const guaranteedOpinions = ensureTopicCoverage(categorizedResults.opinions, opinionsPool, topic, MIN_TOPIC_OPINIONS)
          const guaranteedVideos = ensureTopicCoverage(
            categorizedResults.videos,
            dedupeContentItems([...(videosPool || []), ...(rssVideosPool || [])]),
            topic,
            MIN_TOPIC_VIDEOS
          )
          const guaranteedPodcasts = ensureTopicCoverage(categorizedResults.podcasts, podcastsPool, topic, MIN_TOPIC_PODCASTS)

          if (isCancelled) return

          setTopStories(dedupeContentItems(guaranteedNews))
          setOpinions(dedupeContentItems(guaranteedOpinions))
          setVideos(dedupeContentItems(guaranteedVideos))
          setPodcasts(dedupeContentItems(guaranteedPodcasts))
          setLoadingOpinions(false)
          setLoadingVideos(false)
          setLoadingPodcasts(false)

          setSuggestedTopic(null)

        } else {
          // Load top stories first, then prefetch other sections in parallel.
          const newsData = await fetchRSSNews()
          if (isCancelled) return

          setTopStories(dedupeContentItems(newsData || []))
          setSuggestedTopic(null)

          sectionPrefetchRef.current.opinions = true
          sectionPrefetchRef.current.videos = true
          sectionPrefetchRef.current.podcasts = true

          Promise.allSettled([
            fetchOpinions(),
            fetchVideos(),
            fetchTrendingContent()
          ]).then(([opinionsResult, videosResult, podcastsResult]) => {
            sectionPrefetchRef.current.opinions = false
            sectionPrefetchRef.current.videos = false
            sectionPrefetchRef.current.podcasts = false

            if (isCancelled || hasActiveTopic) return

            if (opinionsResult.status === 'fulfilled') {
              setOpinions(dedupeContentItems(opinionsResult.value || []))
            }
            if (videosResult.status === 'fulfilled') {
              setVideos(dedupeContentItems(videosResult.value || []))
            }
            if (podcastsResult.status === 'fulfilled') {
              setPodcasts(dedupeContentItems(podcastsResult.value || []))
            }

            setLoadingOpinions(false)
            setLoadingVideos(false)
            setLoadingPodcasts(false)
          }).catch(() => {
            sectionPrefetchRef.current.opinions = false
            sectionPrefetchRef.current.videos = false
            sectionPrefetchRef.current.podcasts = false

            if (isCancelled) return
            setLoadingOpinions(false)
            setLoadingVideos(false)
            setLoadingPodcasts(false)
          })
        }
      } catch (error) {
        console.error('Error loading initial content:', error)
        if (isCancelled) return

        setTopStories([])
        setLoadingOpinions(false)
        setLoadingVideos(false)
        setLoadingPodcasts(false)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadInitialContent()

    return () => {
      isCancelled = true
      sectionPrefetchRef.current.opinions = false
      sectionPrefetchRef.current.videos = false
      sectionPrefetchRef.current.podcasts = false
    }
  }, [topic, hasActiveTopic])

  // Load additional sections when they become visible
  useEffect(() => {
    const loadOpinions = async () => {
      if (!visibleSections.opinions || opinions.length > 0 || sectionPrefetchRef.current.opinions) return
      setLoadingOpinions(true)
      try {
        if (!hasActiveTopic) {
          const opinionsData = await fetchOpinions()
          setOpinions(opinionsData || [])
        }
      } catch (error) {
        console.error('Error loading opinions:', error)
      } finally {
        setLoadingOpinions(false)
      }
    }
    loadOpinions()
  }, [visibleSections.opinions, hasActiveTopic])

  useEffect(() => {
    const loadVideos = async () => {
      if (!visibleSections.videos || videos.length > 0 || sectionPrefetchRef.current.videos) return
      setLoadingVideos(true)
      try {
        if (!hasActiveTopic) {
          const videosData = await fetchVideos()
          setVideos(videosData || [])
        }
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        setLoadingVideos(false)
      }
    }
    loadVideos()
  }, [visibleSections.videos, hasActiveTopic])

  useEffect(() => {
    const loadPodcasts = async () => {
      if (!visibleSections.podcasts || podcasts.length > 0 || sectionPrefetchRef.current.podcasts) return
      setLoadingPodcasts(true)
      try {
        if (!hasActiveTopic) {
          const podcastsData = await fetchTrendingContent()
          setPodcasts(podcastsData || [])
        }
      } catch (error) {
        console.error('Error loading podcasts:', error)
      } finally {
        setLoadingPodcasts(false)
      }
    }
    loadPodcasts()
  }, [visibleSections.podcasts, hasActiveTopic])

  useEffect(() => {
    const loadSocial = async () => {
      const socialQuery = hasActiveTopic ? (topic || '').trim().toLowerCase() : '__all__'
      if (!visibleSections.social) return
      if (socialPosts.length > 0 && lastSocialQueryRef.current === socialQuery) return

      setLoadingSocial(true)
      try {
        const socialData = await getRandomTrendingPosts(12, hasActiveTopic ? topic : '')
        lastSocialQueryRef.current = socialQuery
        setSocialPosts(socialData || [])
      } catch (error) {
        console.error('Error loading social:', error)
        lastSocialQueryRef.current = socialQuery
        setSocialPosts([])
      } finally {
        setLoadingSocial(false)
      }
    }
    loadSocial()
  }, [visibleSections.social, hasActiveTopic, topic])

  // Intersection Observer to detect when sections come into view
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '200px', // Load 200px before section is visible
      threshold: 0.01
    }

    const observerCallback = (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionName = entry.target.dataset.section
          if (sectionName) {
            setVisibleSections(prev => ({ ...prev, [sectionName]: true }))
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)

    // Observe all lazy-loaded sections
    const sections = ['opinions', 'videos', 'podcasts', 'social']
    sections.forEach(section => {
      const element = document.querySelector(`[data-section="${section}"]`)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <main className="main-content home-main-content">

      {/* ── Breaking news ticker ── */}
      <DateTicker breakingNews={topStories.slice(0, 10).map(s => s.title).filter(Boolean)} />

      {/* ── Fuzzy-match suggestion banner ── */}
      {suggestedTopic && (
        <div style={{
          background: 'var(--gradient-brand-soft)',
          color: 'white',
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.95rem',
          borderBottom: '2px solid rgba(255,255,255,0.2)'
        }}>
          No results for "{topic}". Did you mean{' '}
          <button
            onClick={() => setTopic(suggestedTopic)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
              padding: '0.3rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: '0.3rem'
            }}
          >
            {suggestedTopic}
          </button>
          ? Showing similar results below.
        </div>
      )}

      {/* ── 1. Hero — search + hot topics ── */}
      <Hero
        visibleTopics={hotTopics}
        handleTopicClick={handleTopicClick}
      />

      {/* ── 2. AI Summary — editorial lead-in ── */}
      <Suspense fallback={<SectionLoader />}>
        <AISummary
          category="general"
          description="Get a quick AI-generated summary of today's most important news across all categories."
        />
      </Suspense>

      {/* ── 2. Topic filter strip + Top Stories ── */}
      {hotTopics && hotTopics.length > 0 && (
        <div className="topic-filter-strip">
          <span className="topic-filter-label">FILTER BY TOPIC</span>
          <div className="topic-filter-row">
            <button
              className="slider-btn topic-filter-btn"
              onClick={() => scrollTopicTicker('left')}
              aria-label="Scroll topics left"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="topic-filter-chips" ref={topicTickerRef}>
              <button
                data-topic-value="__all__"
                className={`topic-chip ${!hasActiveTopic ? 'active' : ''}`}
                onClick={handleAllTopicsClick}
              >
                ALL
              </button>
              {topicFilters.map((t, i) => (
                <button
                  key={i}
                  data-topic-value={t}
                  className={`topic-chip ${topic === t ? 'active' : ''}`}
                  onClick={() => handleTopicClick(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              className="slider-btn topic-filter-btn"
              onClick={() => scrollTopicTicker('right')}
              aria-label="Scroll topics right"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>
      )}

      <TopStories
        topStories={topStories}
        loading={loading}
        activeStory={activeStory}
        setActiveStory={setActiveStory}
      />

      {/* ── 3. Trending Stories — visual follow-on ── */}
      {/* <TrendingStories stories={topStories} loading={loading} limit={6} /> */}

      {/* ── Single strategic ad placement ── */}
      <AdBreak type="standard" />

      {/* ── 6. Opinions ── */}
      <div data-section="opinions">
        <Suspense fallback={<SectionLoader />}>
          <Opinions
            opinions={opinions}
            loadingOpinions={loadingOpinions}
          />
        </Suspense>
      </div>

      <AdBreak type="compact" />

      {/* ── 7. Videos ── */}
      <div data-section="videos">
        <Suspense fallback={<SectionLoader />}>
          <Videos
            videos={videos}
            loadingVideos={loadingVideos}
          />
        </Suspense>
      </div>

      <AdBreak type="compact" />

      {/* ── 8. Podcasts ── */}
      <div data-section="podcasts">
        <Suspense fallback={<SectionLoader />}>
          <Podcasts
            podcasts={podcasts}
            loadingPodcasts={loadingPodcasts}
          />
        </Suspense>
      </div>

      <AdBreak type="compact" />

      {/* ── 9. Social Media ── */}
      <div data-section="social">
        <Suspense fallback={<SectionLoader />}>
          <SocialMedia
            socialPosts={socialPosts}
            loadingSocial={loadingSocial}
          />
        </Suspense>
      </div>

      <Suspense fallback={<SectionLoader />}>
        <Search />
      </Suspense>

    </main>
  )
}

export default HomePage
