import { useState, useEffect, lazy, Suspense, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useSearch } from '../context/SearchContext'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { searchRSSContent, fetchRSSVideos } from '../rssService'
import { getRandomTrendingPosts } from '../socialMediaService'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { matchesTopicQuery } from '../utils/topicFiltering'
import { useInView } from '../hooks/useInView'
import './HomePage.css'
import Hero from '../components/sections/Hero'
import TopStories from '../components/sections/TopStories'
import TrendingStories from '../components/sections/TrendingStories'
import AdBreak from '../components/common/AdBreak'
import CardSkeleton from '../components/common/CardSkeleton'

// Lazy load below-the-fold components
const AISummary = lazy(() => import('../components/sections/AISummary'))
const SocialMedia = lazy(() => import('../components/sections/SocialMedia'))
const Opinions = lazy(() => import('../components/sections/Opinions'))
const Videos = lazy(() => import('../components/sections/Videos'))
const Podcasts = lazy(() => import('../components/sections/Podcasts'))
const Search = lazy(() => import('../components/sections/Search'))

// Loading component
const SectionLoader = () => (
  <div style={{ padding: '1.2rem 0' }}>
    <CardSkeleton count={3} />
  </div>
)

const HOME_TOPIC_RAIL = ['Trump', 'Russia', 'Ebola', 'White House', 'West', 'Minutes', 'Now']

function HomePage({
  email,
  setEmail,
  hotTopics,
  handleSubscribe
}) {
  const normalizeCrossDedupeUrl = (value) => {
    const raw = String(value || '').trim()
    if (!raw) return ''

    try {
      const parsed = new URL(raw, 'https://thelatest.local')
      parsed.hash = ''

      const trackingParams = new Set([
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'mc_cid', 'mc_eid', 'guccounter', 'cmpid', 'ocid',
        'ref', 'ref_src', 'ref_url', 'source', 'spm', 'igshid'
      ])

      const kept = []
      parsed.searchParams.forEach((paramValue, paramKey) => {
        const key = String(paramKey || '').toLowerCase()
        if (!trackingParams.has(key)) {
          kept.push([key, String(paramValue || '')])
        }
      })

      kept.sort((a, b) => {
        if (a[0] === b[0]) return a[1].localeCompare(b[1])
        return a[0].localeCompare(b[0])
      })

      parsed.search = ''
      kept.forEach(([key, paramValue]) => parsed.searchParams.append(key, paramValue))

      const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
      const query = parsed.searchParams.toString()
      return `${parsed.origin}${pathname}${query ? `?${query}` : ''}`.toLowerCase()
    } catch {
      return raw.replace(/#.*$/, '').toLowerCase()
    }
  }

  const itemKey = (item) => {
    const normalizedUrl = normalizeCrossDedupeUrl(item?.url || item?.link)
    if (normalizedUrl) return `url:${normalizedUrl}`
    const fallbackTitle = String(item?.title || '').trim().toLowerCase()
    const fallbackSource = String(item?.source || '').trim().toLowerCase()
    return fallbackTitle ? `title:${fallbackSource}|${fallbackTitle}` : ''
  }

  const splitMediaWithoutOverlap = (videoItems, podcastItems) => {
    const uniqueVideos = dedupeContentItems(videoItems || [])
    const videoKeys = new Set(uniqueVideos.map(itemKey).filter(Boolean))
    const uniquePodcasts = dedupeContentItems(podcastItems || []).filter((item) => {
      const key = itemKey(item)
      return key && !videoKeys.has(key)
    })
    return { uniqueVideos, uniquePodcasts }
  }

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

  const { ref: opinionsRef, isInView: opinionsInView } = useInView({ rootMargin: '220px' })
  const { ref: videosRef, isInView: videosInView } = useInView({ rootMargin: '220px' })
  const { ref: podcastsRef, isInView: podcastsInView } = useInView({ rootMargin: '220px' })
  const { ref: socialRef, isInView: socialInView } = useInView({ rootMargin: '220px' })
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
  const topicFilters = HOME_TOPIC_RAIL

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

          const { uniqueVideos, uniquePodcasts } = splitMediaWithoutOverlap(guaranteedVideos, guaranteedPodcasts)

          setTopStories(dedupeContentItems(guaranteedNews))
          setOpinions(dedupeContentItems(guaranteedOpinions))
          setVideos(uniqueVideos)
          setPodcasts(uniquePodcasts)
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
            const mergedVideos = videosResult.status === 'fulfilled' ? (videosResult.value || []) : []
            const mergedPodcasts = podcastsResult.status === 'fulfilled' ? (podcastsResult.value || []) : []
            const { uniqueVideos, uniquePodcasts } = splitMediaWithoutOverlap(mergedVideos, mergedPodcasts)

            setVideos(uniqueVideos)
            setPodcasts(uniquePodcasts)

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
      if (!opinionsInView || opinions.length > 0 || sectionPrefetchRef.current.opinions) return
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
  }, [opinionsInView, hasActiveTopic])

  useEffect(() => {
    const loadVideos = async () => {
      if (!videosInView || videos.length > 0 || sectionPrefetchRef.current.videos) return
      setLoadingVideos(true)
      try {
        if (!hasActiveTopic) {
          const videosData = await fetchVideos()
          const nextVideos = dedupeContentItems(videosData || [])
          setVideos(nextVideos)
          setPodcasts((currentPodcasts) => {
            const { uniquePodcasts } = splitMediaWithoutOverlap(nextVideos, currentPodcasts || [])
            return uniquePodcasts
          })
        }
      } catch (error) {
        console.error('Error loading videos:', error)
      } finally {
        setLoadingVideos(false)
      }
    }
    loadVideos()
  }, [videosInView, hasActiveTopic])

  useEffect(() => {
    const loadPodcasts = async () => {
      if (!podcastsInView || podcasts.length > 0 || sectionPrefetchRef.current.podcasts) return
      setLoadingPodcasts(true)
      try {
        if (!hasActiveTopic) {
          const podcastsData = await fetchTrendingContent()
          const { uniquePodcasts } = splitMediaWithoutOverlap(videos || [], podcastsData || [])
          setPodcasts(uniquePodcasts)
        }
      } catch (error) {
        console.error('Error loading podcasts:', error)
      } finally {
        setLoadingPodcasts(false)
      }
    }
    loadPodcasts()
  }, [podcastsInView, hasActiveTopic])

  useEffect(() => {
    const loadSocial = async () => {
      const socialQuery = hasActiveTopic ? (topic || '').trim().toLowerCase() : '__all__'
      if (!socialInView) return
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
  }, [socialInView, hasActiveTopic, topic])

  return (
    <main className="main-content home-main-content">
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
      <Hero />

      <div className="page-body">

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
          <span className="topic-filter-label">Topics:</span>
          <div className="topic-filter-chips" ref={topicTickerRef}>
            <button
              data-topic-value="__all__"
              className={`topic-chip ${!hasActiveTopic ? 'active' : ''}`}
              onClick={handleAllTopicsClick}
            >
              All
            </button>
            {topicFilters.map((topicLabel, index) => (
              <button
                key={topicLabel}
                data-topic-value={topicLabel}
                className={`topic-chip ${topic === topicLabel ? 'active' : ''}`}
                onClick={() => handleTopicClick(topicLabel)}
              >
                {topicLabel}
                {index < topicFilters.length - 1 && <span className="topic-chip-divider" aria-hidden="true">|</span>}
              </button>
            ))}
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
      <AdBreak slot="home-feed-inline" />

      {/* ── 6. Opinions ── */}
      <div ref={opinionsRef} data-section="opinions">
        <Suspense fallback={<SectionLoader />}>
          <Opinions
            opinions={opinions}
            loadingOpinions={loadingOpinions}
          />
        </Suspense>
      </div>

      <AdBreak slot="section-break" />

      {/* ── 7. Videos ── */}
      <div ref={videosRef} data-section="videos">
        <Suspense fallback={<SectionLoader />}>
          <Videos
            videos={videos}
            loadingVideos={loadingVideos}
          />
        </Suspense>
      </div>

      <AdBreak slot="section-break" />

      {/* ── 8. Podcasts ── */}
      <div ref={podcastsRef} data-section="podcasts">
        <Suspense fallback={<SectionLoader />}>
          <Podcasts
            podcasts={podcasts}
            loadingPodcasts={loadingPodcasts}
          />
        </Suspense>
      </div>

      <AdBreak slot="section-break" />

      {/* ── 9. Social Media ── */}
      <div ref={socialRef} data-section="social">
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
      </div>

    </main>
  )
}

export default HomePage
