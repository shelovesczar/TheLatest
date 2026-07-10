import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { searchRSSContent } from '../rssService'
import { fetchRSSNews, fetchOpinions, fetchVideos, fetchTrendingContent } from '../newsService'
import { recordHistory, searchArchive } from '../utils/savedArticles'
import DateTicker from '../components/layout/DateTicker'
import TopStories from '../components/sections/TopStories'
import AISummary from '../components/sections/AISummary'
import Opinions from '../components/sections/Opinions'
import SocialMedia from '../components/sections/SocialMedia'
import Videos from '../components/sections/Videos'
import Podcasts from '../components/sections/Podcasts'
import AdBreak from '../components/common/AdBreak'
import { formatDateOnly } from '../utils/dateUtils'
import { dedupeContentItems } from '../utils/contentDeduplication'
import { filterItemsByTopic } from '../utils/topicFiltering'
import { getImageProps } from '../utils/imageUtils'
import { getRandomTrendingPosts } from '../socialMediaService'
import { getSearchAssist } from '../services/aiService'
import { useInView } from '../hooks/useInView'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { faGoogle, faWikipediaW, faOpenai, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import OptimizedImage from '../components/common/OptimizedImage'
import CardSkeleton from '../components/common/CardSkeleton'
import './AllNewsPage.css'
import './SearchResults.css'

const RESEARCH_TOOLS = [
  {
    name: 'ChatGPT',
    searchUrl: 'https://chat.openai.com/?q=',
    icon: faOpenai,
    color: '#10a37f',
    description: 'AI-powered synthesis for quick briefings and follow-up questions.'
  },
  {
    name: 'Perplexity',
    searchUrl: 'https://www.perplexity.ai/search?q=',
    icon: faSearch,
    color: '#20808d',
    description: 'Citation-first research for source comparison and fast fact checks.'
  },
  {
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q=',
    icon: faGoogle,
    color: '#4285f4',
    description: 'Broad web coverage for primary sources, fresh reporting, and context.'
  },
  {
    name: 'Wikipedia',
    searchUrl: 'https://en.wikipedia.org/wiki/Special:Search?search=',
    icon: faWikipediaW,
    color: '#111827',
    description: 'Fast background on institutions, people, and timelines around the story.'
  },
  {
    name: 'Grok',
    searchUrl: 'https://x.com/i/grok?q=',
    icon: faXTwitter,
    color: '#111827',
    description: 'Live social graph context and fast-moving reactions from the X ecosystem.'
  }
]

const truncate = (text, max) => {
  if (!text) return ''
  return text.length <= max ? text : `${text.substring(0, max).trim()}...`
}

const formatPublishedDate = (dateString) => {
  if (!dateString) return 'Recently'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Recently'
    
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // For older dates, show month and day
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return 'Recently'
  }
}

const matchesSearchFallback = (item, rawQuery) => {
  const normalizedQuery = String(rawQuery || '').trim().toLowerCase()
  if (!normalizedQuery) return false

  const searchableText = [
    item?.title,
    item?.description,
    item?.content,
    item?.source,
    item?.category
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return normalizedQuery
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .every((token) => searchableText.includes(token))
}

const normalizeSearchValue = (value) => String(value || '').trim().toLowerCase()

const tokenizeSearchValue = (value) => normalizeSearchValue(value)
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter((token) => token.length > 2)

const buildArticleSearchText = (item) => [
  item?.title,
  item?.description,
  item?.content,
  item?.source,
  item?.category
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase()

const scoreArticleForClaudeMatch = (item, query, assist) => {
  const text = buildArticleSearchText(item)
  const title = normalizeSearchValue(item?.title)
  const normalizedQuery = normalizeSearchValue(assist?.normalizedQuery || query)
  const searchPhrases = Array.isArray(assist?.searchPhrases) ? assist.searchPhrases : []
  const suggestedTopics = Array.isArray(assist?.suggestedTopics) ? assist.suggestedTopics : []
  const keywordTokens = new Set([
    ...tokenizeSearchValue(query),
    ...tokenizeSearchValue(assist?.normalizedQuery),
    ...searchPhrases.flatMap((phrase) => tokenizeSearchValue(phrase)),
    ...suggestedTopics.flatMap((topic) => tokenizeSearchValue(topic))
  ])

  let score = 0

  if (normalizedQuery && title.includes(normalizedQuery)) {
    score += 12
  }
  if (normalizedQuery && text.includes(normalizedQuery)) {
    score += 8
  }

  searchPhrases.forEach((phrase) => {
    const normalizedPhrase = normalizeSearchValue(phrase)
    if (!normalizedPhrase) return
    if (title.includes(normalizedPhrase)) {
      score += 7
    } else if (text.includes(normalizedPhrase)) {
      score += 4
    }
  })

  suggestedTopics.forEach((topic) => {
    const normalizedTopic = normalizeSearchValue(topic)
    if (!normalizedTopic) return
    if (title.includes(normalizedTopic)) {
      score += 5
    } else if (text.includes(normalizedTopic)) {
      score += 3
    }
  })

  keywordTokens.forEach((token) => {
    if (title.includes(token)) {
      score += 1.4
    } else if (text.includes(token)) {
      score += 0.8
    }
  })

  return score
}

const getSearchResultKey = (item) => String(
  item?.url || item?.link || `${item?.source || ''}|${item?.title || ''}`
).trim().toLowerCase()

function SearchResults() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''

  // Local controlled input — initialise from URL so back/forward works
  const [inputValue, setInputValue] = useState(query)
  const inputRef = useRef(null)

  const [results, setResults]             = useState([])
  const [archiveResults, setArchiveResults] = useState([])
  const [queryNews, setQueryNews] = useState([])
  const [queryOpinions, setQueryOpinions] = useState([])
  const [queryVideos, setQueryVideos] = useState([])
  const [queryPodcasts, setQueryPodcasts] = useState([])
  const [querySocialPosts, setQuerySocialPosts] = useState([])
  const [searchAssist, setSearchAssist] = useState(null)
  const [searchAssistLoading, setSearchAssistLoading] = useState(false)
  const [suggestedTopicArticles, setSuggestedTopicArticles] = useState([])
  const [feedNews, setFeedNews]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [feedLoading, setFeedLoading]     = useState(true)
  const [sectionLoading, setSectionLoading] = useState({ opinions: false, social: false, videos: false, podcasts: false })
  const [sectionLoaded, setSectionLoaded] = useState({ opinions: false, social: false, videos: false, podcasts: false })
  const [selectedSource, setSelectedSource] = useState('ALL')
  const [selectedQuerySource, setSelectedQuerySource] = useState('ALL')
  const [activeQueryView, setActiveQueryView] = useState('all')
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280))
  const [activeStory, setActiveStory] = useState(0)
  const virtualResultsRef = useRef(null)
  const { ref: opinionsRef, isInView: opinionsInView } = useInView({ rootMargin: '260px' })
  const { ref: socialRef, isInView: socialInView } = useInView({ rootMargin: '260px' })
  const { ref: videosRef, isInView: videosInView } = useInView({ rootMargin: '260px' })
  const { ref: podcastsRef, isInView: podcastsInView } = useInView({ rootMargin: '260px' })

  // Keep input in sync when the URL query changes (e.g. back button)
  useEffect(() => { setInputValue(query) }, [query])

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Fetch default news feed (shown when no query)
  useEffect(() => {
    if (query.trim()) {
      setFeedNews([])
      setFeedLoading(false)
      return
    }

    setFeedLoading(true)
    fetchRSSNews()
      .then(data => setFeedNews(Array.isArray(data) ? data : []))
      .catch(() => setFeedNews([]))
      .finally(() => setFeedLoading(false))
  }, [query])

  // Run search whenever URL query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setQueryNews([])
      setQueryOpinions([])
      setQueryVideos([])
      setQueryPodcasts([])
      setQuerySocialPosts([])
      setSectionLoading({ opinions: false, social: false, videos: false, podcasts: false })
      setSectionLoaded({ opinions: false, social: false, videos: false, podcasts: false })
      setSearchAssist(null)
      setSuggestedTopicArticles([])
      return
    }

    let ignore = false
    setLoading(true)
    console.log('[SearchResults] Initiating search for:', query)

    const sortResults = (items = []) => [...items].sort((a, b) => {
      let dateA = new Date(a.publishedAt || 0)
      let dateB = new Date(b.publishedAt || 0)
      if (isNaN(dateA.getTime())) dateA = new Date(0)
      if (isNaN(dateB.getTime())) dateB = new Date(0)
      return dateB - dateA
    })

    const resolveFallbackSearchResults = async () => {
      const fallbackPool = await fetchRSSNews(null)
      return sortResults(dedupeContentItems((Array.isArray(fallbackPool) ? fallbackPool : []).filter((item) => matchesSearchFallback(item, query))))
    }

    searchRSSContent(query, {
      strictSearch: false,
      relaxSearchFallback: true,
      minStrictResults: 4
    })
      .then(async (data) => {
        if (ignore) return
        const items = Array.isArray(data) ? data : []
        console.log('[SearchResults] Got results:', items.length, 'items')
        const sorted = items.length > 0 ? sortResults(items) : await resolveFallbackSearchResults()
        if (ignore) return
        setResults(sorted)
        console.log('[SearchResults] Results state updated with', sorted.length, 'items')
      })
      .catch(err => {
        if (ignore) return
        console.error('[SearchResults] Search error:', err)
        setResults([])
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    // Also search saved + history archive
    const archiveResults = searchArchive(query)
    console.log('[SearchResults] Archive results:', archiveResults.length, 'items')
    setArchiveResults(archiveResults)

    return () => {
      ignore = true
    }
  }, [query])

  useEffect(() => {
    setActiveQueryView('all')
    setSelectedQuerySource('ALL')
  }, [query])

  useEffect(() => {
    if (!query.trim()) {
      setQueryNews([])
      return
    }

    const narrow = (items = [], limit = 15) => dedupeContentItems(filterItemsByTopic(items, query)).slice(0, limit)
    setQueryNews(narrow(results, 15))
  }, [query, results])

  useEffect(() => {
    if (!query.trim()) {
      setSearchAssist(null)
      setSuggestedTopicArticles([])
      setSearchAssistLoading(false)
      return
    }

    let ignore = false

    const loadSearchAssist = async () => {
      setSearchAssistLoading(true)

      try {
        const assist = await getSearchAssist(query)
        if (ignore) return

        setSearchAssist(assist)
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load AI search assist:', error)
          setSearchAssist(null)
          setSuggestedTopicArticles([])
        }
      } finally {
        if (!ignore) {
          setSearchAssistLoading(false)
        }
      }
    }

    loadSearchAssist()

    return () => {
      ignore = true
    }
  }, [query])

  useEffect(() => {
    const topics = Array.isArray(searchAssist?.suggestedTopics)
      ? searchAssist.suggestedTopics.slice(0, 4)
      : []

    if (topics.length === 0) {
      setSuggestedTopicArticles([])
      return
    }

    const storyPool = dedupeContentItems([
      ...results,
      ...queryNews
    ])

    const buildTopicMatches = (topic) => {
      const strictMatches = storyPool.filter((item) => matchesSearchFallback(item, topic))
      if (strictMatches.length > 0) {
        return strictMatches.slice(0, 2)
      }

      const topicTokens = String(topic || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length > 2)

      const looseMatches = storyPool.filter((item) => {
        const searchableText = [
          item?.title,
          item?.description,
          item?.content,
          item?.source,
          item?.category
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return topicTokens.some((token) => searchableText.includes(token))
      })

      if (looseMatches.length > 0) {
        return looseMatches.slice(0, 2)
      }

      return storyPool.slice(0, 2)
    }

    setSuggestedTopicArticles(
      topics
        .map((topic) => ({ topic, items: buildTopicMatches(topic) }))
        .filter((entry) => entry.items.length > 0)
    )
  }, [queryNews, results, searchAssist])

  const updateSectionLoading = useCallback((section, value) => {
    setSectionLoading((current) => ({ ...current, [section]: value }))
  }, [])

  const updateSectionLoaded = useCallback((section, value) => {
    setSectionLoaded((current) => ({ ...current, [section]: value }))
  }, [])

  useEffect(() => {
    if (!query.trim() || loading || sectionLoaded.opinions || sectionLoading.opinions) {
      return
    }

    const shouldLoad = activeQueryView === 'opinions' || (activeQueryView === 'all' && opinionsInView)
    if (!shouldLoad) return

    let ignore = false
    updateSectionLoading('opinions', true)

    fetchOpinions('news', query)
      .then((items) => {
        if (ignore) return
        setQueryOpinions(dedupeContentItems(filterItemsByTopic(items, query)).slice(0, 6))
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Failed to load search opinions:', error)
          setQueryOpinions([])
        }
      })
      .finally(() => {
        if (!ignore) {
          updateSectionLoading('opinions', false)
          updateSectionLoaded('opinions', true)
        }
      })

    return () => {
      ignore = true
    }
  }, [activeQueryView, loading, opinionsInView, query, sectionLoaded.opinions, sectionLoading.opinions, updateSectionLoaded, updateSectionLoading])

  useEffect(() => {
    if (!query.trim() || loading || sectionLoaded.social || sectionLoading.social) {
      return
    }

    const shouldLoad = activeQueryView === 'social' || (activeQueryView === 'all' && socialInView)
    if (!shouldLoad) return

    let ignore = false
    updateSectionLoading('social', true)

    getRandomTrendingPosts(6, query)
      .then((items) => {
        if (ignore) return
        setQuerySocialPosts(Array.isArray(items) ? items.slice(0, 6) : [])
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Failed to load search social posts:', error)
          setQuerySocialPosts([])
        }
      })
      .finally(() => {
        if (!ignore) {
          updateSectionLoading('social', false)
          updateSectionLoaded('social', true)
        }
      })

    return () => {
      ignore = true
    }
  }, [activeQueryView, loading, query, sectionLoaded.social, sectionLoading.social, socialInView, updateSectionLoaded, updateSectionLoading])

  useEffect(() => {
    if (!query.trim() || loading || sectionLoaded.videos || sectionLoading.videos) {
      return
    }

    const shouldLoad = activeQueryView === 'videos' || (activeQueryView === 'all' && videosInView)
    if (!shouldLoad) return

    let ignore = false
    updateSectionLoading('videos', true)

    fetchVideos('news', query)
      .then((items) => {
        if (ignore) return
        setQueryVideos(dedupeContentItems(filterItemsByTopic(items, query)).slice(0, 6))
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Failed to load search videos:', error)
          setQueryVideos([])
        }
      })
      .finally(() => {
        if (!ignore) {
          updateSectionLoading('videos', false)
          updateSectionLoaded('videos', true)
        }
      })

    return () => {
      ignore = true
    }
  }, [activeQueryView, loading, query, sectionLoaded.videos, sectionLoading.videos, updateSectionLoaded, updateSectionLoading, videosInView])

  useEffect(() => {
    if (!query.trim() || loading || sectionLoaded.podcasts || sectionLoading.podcasts) {
      return
    }

    const shouldLoad = activeQueryView === 'podcasts' || (activeQueryView === 'all' && podcastsInView)
    if (!shouldLoad) return

    let ignore = false
    updateSectionLoading('podcasts', true)

    fetchTrendingContent('news', query)
      .then((items) => {
        if (ignore) return
        setQueryPodcasts(dedupeContentItems(filterItemsByTopic(items, query)).slice(0, 6))
      })
      .catch((error) => {
        if (!ignore) {
          console.error('Failed to load search podcasts:', error)
          setQueryPodcasts([])
        }
      })
      .finally(() => {
        if (!ignore) {
          updateSectionLoading('podcasts', false)
          updateSectionLoaded('podcasts', true)
        }
      })

    return () => {
      ignore = true
    }
  }, [activeQueryView, loading, podcastsInView, query, sectionLoaded.podcasts, sectionLoading.podcasts, updateSectionLoaded, updateSectionLoading])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  const goToArticle = useCallback((article) => {
    recordHistory(article)
    navigate('/article', { state: { article } })
  }, [navigate])

  const handleClear = () => {
    setInputValue('')
    navigate('/search')
    inputRef.current?.focus()
  }

  const descriptionLimit = useMemo(() => {
    if (viewportWidth >= 1500) return 320
    if (viewportWidth >= 1280) return 260
    if (viewportWidth >= 1024) return 220
    if (viewportWidth >= 768) return 180
    return 130
  }, [viewportWidth])
  const searchStoryPool = results.length > 0 ? results : queryNews
  const featuredSearchStories = searchStoryPool.slice(0, 12)
  const liveSourceOptions = useMemo(() => (['ALL', ...new Set(results.map((item) => item.source).filter(Boolean))]), [results])
  const claudeExactMatches = useMemo(() => {
    const pool = dedupeContentItems([
      ...results,
      ...queryNews
    ])

    if (pool.length === 0) return []

    const scored = pool
      .map((item) => ({
        item,
        score: scoreArticleForClaudeMatch(item, query, searchAssist)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)

    return (scored.length > 0 ? scored : pool).slice(0, 3)
  }, [query, queryNews, results, searchAssist])
  const mergedFeaturedStories = useMemo(() => (
    dedupeContentItems([
      ...claudeExactMatches,
      ...featuredSearchStories
    ]).slice(0, 12)
  ), [claudeExactMatches, featuredSearchStories])
  const featuredStoryKeys = useMemo(() => (
    new Set(mergedFeaturedStories.map((item) => getSearchResultKey(item)).filter(Boolean))
  ), [mergedFeaturedStories])
  const remainingResults = useMemo(() => (
    results.filter((item) => !featuredStoryKeys.has(getSearchResultKey(item)))
  ), [featuredStoryKeys, results])
  const liveSourceList = remainingResults.length > 0 ? remainingResults : results
  const sourceList = selectedQuerySource === 'ALL'
    ? liveSourceList
    : liveSourceList.filter((item) => item.source === selectedQuerySource)
  const hasFeaturedStories = mergedFeaturedStories.length > 0
  const showAllSections = activeQueryView === 'all'
  const showTopStoriesSection = showAllSections || activeQueryView === 'news'
  const showNewsSection = showAllSections || activeQueryView === 'news'
  const showOpinionSection = showAllSections || activeQueryView === 'opinions'
  const showSocialSection = showAllSections || activeQueryView === 'social'
  const showVideoSection = showAllSections || activeQueryView === 'videos'
  const showPodcastSection = showAllSections || activeQueryView === 'podcasts'
  const showArchiveSection = showAllSections || activeQueryView === 'archive'
  const showToolsSection = showAllSections || activeQueryView === 'tools'
  const showRawArticleList = viewportWidth >= 768
  const anySectionLoading = Object.values(sectionLoading).some(Boolean)
  const showOpinionPlaceholder = showAllSections && !sectionLoaded.opinions && !sectionLoading.opinions
  const showSocialPlaceholder = showAllSections && !sectionLoaded.social && !sectionLoading.social
  const showVideoPlaceholder = showAllSections && !sectionLoaded.videos && !sectionLoading.videos
  const showPodcastPlaceholder = showAllSections && !sectionLoaded.podcasts && !sectionLoading.podcasts

  const resultVirtualizer = useVirtualizer({
    count: sourceList.length,
    getScrollElement: () => virtualResultsRef.current,
    estimateSize: () => 420,
    overscan: 8,
  })

  // ── Default feed layout helpers ──────────────────────────────
  const toStr = (v) => {
    if (!v) return ''
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.map(toStr).filter(Boolean).join(', ')
    if (typeof v === 'object' && v._) return v._
    return String(v)
  }
  const normalize = (item) => ({
    ...item,
    title:       toStr(item.title),
    description: toStr(item.description),
    source:      toStr(item.source),
    publishedAt: toStr(item.publishedAt || item.time),
    link:        toStr(item.link || item.url),
    image:       toStr(item.image),
  })

  const normalizedFeed = feedNews.map(normalize)
  const sources        = ['ALL', ...new Set(normalizedFeed.map(i => i.source).filter(Boolean))]
  const displayFeed    = selectedSource === 'ALL'
    ? normalizedFeed
    : normalizedFeed.filter(i => i.source === selectedSource)

  const leadStory        = displayFeed[0]
  const mostReadStories  = displayFeed.slice(1, 6)
  const featuredStories  = displayFeed.slice(1, 4)
  const latestStories    = displayFeed.slice(4)
  const quickUpdates     = displayFeed.slice(0, 8)
  const tickers          = displayFeed.slice(0, 10).map(i => i.title).filter(Boolean)
  const hasQuery   = !!query.trim()
  const isSearching = hasQuery && loading
  const hasLiveResults = results.length > 0
  const hasArchiveMatches = archiveResults.length > 0
  const hasSectionContent = searchStoryPool.length > 0 || queryOpinions.length > 0 || queryVideos.length > 0 || queryPodcasts.length > 0 || querySocialPosts.length > 0 || hasArchiveMatches
  const noResults   = hasQuery && !loading && !anySectionLoading && !hasSectionContent

  useEffect(() => {
    if (selectedQuerySource !== 'ALL' && !liveSourceOptions.includes(selectedQuerySource)) {
      setSelectedQuerySource('ALL')
    }
  }, [liveSourceOptions, selectedQuerySource])

  return (
    <div className="search-results-page" id="search-top">

      {/* ── Hero / Search Bar ──────────────────────────────── */}
      {hasQuery && (
        <div className="sr-back-bar">
          <div className="sr-shell sr-back-bar-inner">
            <div className="sr-back-bar-copy">
              <Link to="/">Home</Link>
              <span>/</span>
              <span>Search: "{query}"</span>
            </div>
            <span className="sr-back-bar-count">{results.length} result{results.length !== 1 ? 's' : ''} across all sources</span>
          </div>
        </div>
      )}

      <div className="sr-hero">
        <div className="sr-hero-inner sr-shell">
          <h1 className="sr-hero-title">
            {hasQuery ? `"${query}"` : 'Search'}
          </h1>
          <p className="sr-hero-subtitle">
            {hasQuery
              ? `${results.length} result${results.length !== 1 ? 's' : ''} across all sources`
              : 'Search news, opinions, videos, and podcasts'}
          </p>

          <form className="sr-search-form" onSubmit={handleSubmit} role="search">
            <div className="sr-search-wrap">
              <FontAwesomeIcon icon={faSearch} className="sr-search-icon" />
              <input
                ref={inputRef}
                type="search"
                className="sr-search-input"
                placeholder="Search all news..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                aria-label="Search news"
                autoComplete="off"
                autoFocus
              />
              {inputValue && (
                <button
                  type="button"
                  className="sr-clear-btn"
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
              <button type="submit" className="sr-submit-btn" aria-label="Search">
                Search
              </button>
            </div>
          </form>

          {hasQuery && (searchAssistLoading || searchAssist || suggestedTopicArticles.length > 0) && (
            <div className="sr-ai-assist" aria-live="polite">
              <div className="sr-ai-assist-header">
                <div>
                  <span className="sr-ai-assist-kicker">Claude Search Assist</span>
                  <p className="sr-ai-assist-copy">
                    {searchAssist?.topicBrief || `Pulling related topics and article angles for ${query}.`}
                  </p>
                </div>
                {searchAssist?.provider && (
                  <span className="sr-ai-assist-provider">{searchAssist.provider}</span>
                )}
              </div>

              {Array.isArray(searchAssist?.searchPhrases) && searchAssist.searchPhrases.length > 0 && (
                <div className="sr-ai-chip-row">
                  {searchAssist.searchPhrases.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      className="sr-ai-chip"
                      onClick={() => navigate(`/search?q=${encodeURIComponent(phrase)}`)}
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              )}

              {suggestedTopicArticles.length > 0 && (
                <div className="sr-ai-topic-grid">
                  {suggestedTopicArticles.map(({ topic, items }) => {
                    const leadItem = items[0]
                    if (!leadItem) return null

                    return (
                      <article key={topic} className="sr-ai-topic-card">
                        <button
                          type="button"
                          className="sr-ai-topic-link"
                          onClick={() => navigate(`/search?q=${encodeURIComponent(topic)}`)}
                        >
                          {topic}
                        </button>
                        <h3>{leadItem.title || topic}</h3>
                        <p>{truncate(leadItem.description || leadItem.content || '', 130)}</p>
                        <div className="sr-ai-topic-meta">
                          <span>{leadItem.source || 'Latest coverage'}</span>
                          <span>{formatPublishedDate(leadItem.publishedAt || leadItem.date)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {hasQuery && (
            <div className="sr-topic-tabs">
              {[
                ['all', 'All Coverage'],
                ['news', 'News'],
                ['opinions', 'Opinions'],
                ['social', 'Social'],
                ['videos', 'Videos'],
                ['podcasts', 'Podcasts'],
                ['tools', 'Research Tools'],
                ...(hasArchiveMatches ? [['archive', 'Archive']] : [])
              ].map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  className={`sr-topic-pill ${activeQueryView === view ? 'active' : ''}`}
                  onClick={() => setActiveQueryView(view)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Search Results ─────────────────────────────────── */}
      {hasQuery && (
        <div className="sr-results-section sr-shell">
          {isSearching ? (
            <div className="sr-loading">
              <div className="spinner" />
              <p>Searching for "{query}"…</p>
            </div>
          ) : noResults ? (
            <div className="no-results">
              <h2>No results found</h2>
              <p>Try different keywords or browse our <Link to="/">latest news</Link></p>
            </div>
          ) : (
            <>
              <AISummary
                category={query}
                categoryTitle={query}
                description={`AI-generated summary of the latest coverage around ${query}.`}
                ignoreTopic={true}
              />

              {showTopStoriesSection && hasFeaturedStories && (
                <TopStories
                  topStories={mergedFeaturedStories}
                  loading={loading && !hasLiveResults}
                  activeStory={activeStory}
                  setActiveStory={setActiveStory}
                  sectionTitle="Top Search Results"
                  showPerspectiveToggle={false}
                  defaultPerspectiveView={false}
                  seeMoreLabel="View all search results →"
                  categoryPath={`/search?q=${encodeURIComponent(query)}`}
                />
              )}

              {showToolsSection && (
                <section className="sr-tools-section">
                  <div className="section-hdr">
                    <h2>Advanced Search</h2>
                    <span className="see-more">Research tools</span>
                  </div>
                  <div className="sr-tools-grid">
                    {RESEARCH_TOOLS.map((tool) => (
                      <a
                        key={tool.name}
                        className="sr-tool-card"
                        href={`${tool.searchUrl}${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="sr-tool-icon" style={{ color: tool.color, borderColor: `${tool.color}33` }}>
                          <FontAwesomeIcon icon={tool.icon} />
                        </div>
                        <div className="sr-tool-copy">
                          <h3>{tool.name}</h3>
                          <p>{tool.description}</p>
                        </div>
                        <span className="sr-tool-action">Search {query}</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {(showAllSections || showTopStoriesSection || showToolsSection) && <AdBreak slot="home-feed-inline" />}

              {showOpinionSection && (
                <div ref={opinionsRef}>
                  {showOpinionPlaceholder ? (
                    <div className="sr-deferred-section">
                      <p>Opinions load as you scroll.</p>
                    </div>
                  ) : (
                    <Opinions
                      opinions={queryOpinions}
                      loadingOpinions={sectionLoading.opinions}
                      categoryPath={`/search?q=${encodeURIComponent(query)}`}
                    />
                  )}
                </div>
              )}

              {showOpinionSection && <AdBreak slot="section-break" />}

              {showSocialSection && (
                <div ref={socialRef}>
                  {showSocialPlaceholder ? (
                    <div className="sr-deferred-section">
                      <p>Social posts load as you scroll.</p>
                    </div>
                  ) : (
                    <SocialMedia
                      socialPosts={querySocialPosts}
                      loadingSocial={sectionLoading.social}
                    />
                  )}
                </div>
              )}

              {showSocialSection && <AdBreak slot="section-break" />}

              {showVideoSection && (
                <div ref={videosRef}>
                  {showVideoPlaceholder ? (
                    <div className="sr-deferred-section">
                      <p>Videos load as you scroll.</p>
                    </div>
                  ) : (
                    <Videos
                      videos={queryVideos}
                      loadingVideos={sectionLoading.videos}
                      categoryPath={`/search?q=${encodeURIComponent(query)}`}
                    />
                  )}
                </div>
              )}

              {showVideoSection && <AdBreak slot="section-break" />}

              {showPodcastSection && (
                <div ref={podcastsRef}>
                  {showPodcastPlaceholder ? (
                    <div className="sr-deferred-section">
                      <p>Podcasts load as you scroll.</p>
                    </div>
                  ) : (
                    <Podcasts
                      podcasts={queryPodcasts}
                      loadingPodcasts={sectionLoading.podcasts}
                      categoryPath={`/search?q=${encodeURIComponent(query)}`}
                    />
                  )}
                </div>
              )}

              {showPodcastSection && <AdBreak slot="section-break" />}

              {showNewsSection && showRawArticleList && hasLiveResults && sourceList.length > 0 && (
                <>
                  <div className="sr-results-header" id="search-results-list">
                    <div className="sr-results-header-row">
                      <span className="sr-count">{sourceList.length} article{sourceList.length !== 1 ? 's' : ''} found</span>
                      {liveSourceOptions.length > 1 && (
                        <div className="sr-source-pills" role="tablist" aria-label="Filter search results by source">
                          {liveSourceOptions.map((source) => (
                            <button
                              key={source}
                              type="button"
                              className={`sr-source-pill ${selectedQuerySource === source ? 'active' : ''}`}
                              onClick={() => setSelectedQuerySource(source)}
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="results-virtual-scroll" ref={virtualResultsRef}>
                    <div
                      className="results-virtual-inner"
                      style={{ height: `${resultVirtualizer.getTotalSize()}px` }}
                    >
                      {resultVirtualizer.getVirtualItems().map((virtualRow) => {
                        const article = sourceList[virtualRow.index]
                        if (!article) return null

                        return (
                          <div
                            key={virtualRow.key}
                            ref={resultVirtualizer.measureElement}
                            data-index={virtualRow.index}
                            className="results-virtual-item"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                          >
                            <a
                              href="#"
                              onClick={e => { e.preventDefault(); goToArticle(article) }}
                              className="result-card"
                            >
                              {article.image && (
                                <div className="result-image">
                                  <OptimizedImage
                                    src={article.image}
                                    alt={article.title}
                                    category="news"
                                    sizes="(max-width: 768px) 100vw, 80vw"
                                  />
                                </div>
                              )}
                              <div className="result-content">
                                <div className="result-content-body">
                                  <h3 className="result-title">{article.title}</h3>
                                  <p className="result-description">
                                    {truncate(article.description, descriptionLimit)}
                                  </p>
                                </div>
                                <div className="result-content-footer">
                                  <div className="result-meta">
                                    <span className="result-source">{article.source}</span>
                                    <span className="result-date">{formatPublishedDate(article.publishedAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </a>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Archive results */}
              {showArchiveSection && hasArchiveMatches && (
                <div className="sr-archive-section" id="archive-results">
                  <div className="sr-archive-header">
                    <span className="panel-kicker">Your Archive</span>
                    <h3 className="panel-title">From Saved &amp; History</h3>
                  </div>
                  <div className="results-grid">
                    {archiveResults.map((article, i) => (
                      <a
                        key={i}
                        href="#"
                        onClick={e => { e.preventDefault(); goToArticle(article) }}
                        className="result-card result-card--archive"
                      >
                        {article.image && (
                          <div className="result-image">
                            <OptimizedImage
                              src={article.image}
                              alt={article.title}
                              category="news"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          </div>
                        )}
                        <div className="result-content">
                          <div className="result-content-body">
                            <h3 className="result-title">{article.title}</h3>
                            <p className="result-description">{truncate(article.description, descriptionLimit)}</p>
                          </div>
                          <div className="result-content-footer">
                            <div className="result-meta">
                              <span className="result-source">{article.source}</span>
                              <span className="result-date">{formatPublishedDate(article.publishedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {!hasLiveResults && hasArchiveMatches && (
                <div className="sr-results-header">
                  <span className="sr-count">No live matches, showing {archiveResults.length} archive result{archiveResults.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Default feed (shown when no active query) ──────── */}
      {!hasQuery && (
        <>
          {!feedLoading && tickers.length > 0 && (
            <DateTicker breakingNews={tickers} sticky={false} label="TRENDING NOW" />
          )}

          <div className="source-filter-container">
            <div className="source-filter-header">
              <h2 className="source-filter-title">Browse by Source</h2>
              <span className="source-filter-count">
                {selectedSource === 'ALL' ? 'All sources active' : `${displayFeed.length} stories from ${selectedSource}`}
              </span>
            </div>
            <div className="source-pills">
              {sources.map(src => (
                <button
                  key={src}
                  className={`source-pill ${selectedSource === src ? 'active' : ''}`}
                  onClick={() => setSelectedSource(src)}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          <div className="all-news-content">
            {feedLoading ? (
              <div className="sr-loading">
                <CardSkeleton count={6} />
              </div>
            ) : displayFeed.length === 0 ? (
              <div className="no-results"><p>No articles found.</p></div>
            ) : (
              <>
                <section className="all-news-top-grid">
                  {leadStory && (
                    <article className="lead-story-card">
                      {leadStory.image && (
                        <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="lead-story-image">
                          <img {...getImageProps(leadStory.image, leadStory.title, 'news')} />
                        </a>
                      )}
                      <div className="lead-story-content">
                        <div className="news-card-meta lead-story-meta">
                          <span className="news-card-source">{leadStory.source}</span>
                          {leadStory.publishedAt && <span className="news-card-time">{formatDateOnly(leadStory.publishedAt)}</span>}
                        </div>
                        <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="lead-story-headline-link">
                          <h2 className="lead-story-headline">{leadStory.title}</h2>
                        </a>
                        <p className="lead-story-description">{truncate(leadStory.description || '', 260)}</p>
                        <div className="lead-story-footer">
                          <span className="lead-story-source">{leadStory.source}</span>
                          <a href="#" onClick={e => { e.preventDefault(); goToArticle(leadStory) }} className="read-more-link">
                            Read full story →
                          </a>
                        </div>
                      </div>
                    </article>
                  )}

                  <aside className="most-read-panel">
                    <div className="panel-header">
                      <span className="panel-kicker">Now Reading</span>
                      <h2 className="panel-title">Most Read</h2>
                    </div>
                    <div className="most-read-list">
                      {mostReadStories.map((item, i) => (
                        <a key={i} href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="most-read-item">
                          <span className="most-read-rank">{i + 1}</span>
                          <div className="most-read-copy">
                            <span className="most-read-tag">{item.source}</span>
                            <h3 className="most-read-headline">{truncate(item.title, 100)}</h3>
                          </div>
                        </a>
                      ))}
                    </div>
                  </aside>
                </section>

                {featuredStories.length > 0 && (
                  <section className="secondary-stories-grid">
                    {featuredStories.map((item, i) => (
                      <article key={i} className="secondary-story-card">
                        {item.image && (
                          <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="secondary-story-image">
                            <img {...getImageProps(item.image, item.title, 'news')} />
                          </a>
                        )}
                        <div className="secondary-story-content">
                          <div className="news-card-meta">
                            <span className="news-card-source">{item.source}</span>
                            {item.publishedAt && <span className="news-card-time">{formatDateOnly(item.publishedAt)}</span>}
                          </div>
                          <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="secondary-story-link">
                            <h3 className="secondary-story-headline">{item.title}</h3>
                          </a>
                        </div>
                      </article>
                    ))}
                  </section>
                )}

                <section className="latest-news-layout">
                  <div className="latest-news-column">
                    <div className="panel-header latest-news-header">
                      <span className="panel-kicker">Live Coverage</span>
                      <h2 className="panel-title">Latest News</h2>
                    </div>
                    <div className="latest-news-list">
                      {(latestStories.length > 0 ? latestStories : displayFeed.slice(1)).map((item, i) => (
                        <article key={i} className="latest-story-card">
                          {item.image && (
                            <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="latest-story-image">
                              <img {...getImageProps(item.image, item.title, 'news')} />
                            </a>
                          )}
                          <div className="latest-story-content">
                            <div className="news-card-meta">
                              <span className="news-card-source">{item.source}</span>
                              {item.publishedAt && <span className="news-card-time">{formatDateOnly(item.publishedAt)}</span>}
                            </div>
                            <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="latest-story-link">
                              <h3 className="latest-story-headline">{item.title}</h3>
                            </a>
                            {item.description && (
                              <p className="latest-story-description">{truncate(item.description, 180)}</p>
                            )}
                            <a href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="read-more-link">
                              Continue reading →
                            </a>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <aside className="quick-updates-panel">
                    <div className="panel-header">
                      <span className="panel-kicker">Desk Wire</span>
                      <h2 className="panel-title">Quick Updates</h2>
                    </div>
                    <div className="quick-updates-list">
                      {quickUpdates.map((item, i) => (
                        <a key={i} href="#" onClick={e => { e.preventDefault(); goToArticle(item) }} className="quick-update-item">
                          <span className="quick-update-source">{item.source}</span>
                          <h3 className="quick-update-headline">{truncate(item.title, 88)}</h3>
                          {item.publishedAt && <span className="quick-update-time">{formatDateOnly(item.publishedAt)}</span>}
                        </a>
                      ))}
                    </div>
                  </aside>
                </section>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default SearchResults
