import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getCategoryConfig } from '../../utils/categoryConfig'
import { getTopicPageConfig, getTopicSectionLabel } from '../../utils/navigationConfig'

const SITE_NAME = 'The Latest'
const SITE_URL = 'https://thelatest.news'
const DEFAULT_DESCRIPTION = 'Breaking news, politics, tech, business, culture, video, and podcast coverage curated for fast, high-signal reading.'
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop'

function toTitleCase(value = '') {
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim()
}

function trimQuery(value = '', max = 80) {
  const normalized = String(value || '').trim()
  return normalized.length > max ? `${normalized.slice(0, max - 1).trim()}...` : normalized
}

function getBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return SITE_URL
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'content') {
        element.setAttribute(key, value)
      }
    })
    document.head.appendChild(element)
  }

  if (attributes.content !== undefined) {
    element.setAttribute('content', attributes.content)
  }
}

function upsertLink(selector, rel, href) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }

  element.setAttribute('href', href)
}

function upsertStructuredData(id, payload) {
  let element = document.head.querySelector(`script[data-structured-data="${id}"]`)
  if (!element) {
    element = document.createElement('script')
    element.setAttribute('type', 'application/ld+json')
    element.setAttribute('data-structured-data', id)
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(payload)
}

function createBreadcrumbList(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  }
}

function buildStructuredData(location, metadata) {
  const pathname = location.pathname || '/'
  const params = new URLSearchParams(location.search || '')
  const query = trimQuery(params.get('q') || '')
  const segments = pathname.split('/').filter(Boolean)
  const baseUrl = getBaseUrl()
  const organizationId = `${baseUrl}/#organization`
  const websiteId = `${baseUrl}/#website`
  const pageId = `${metadata.canonicalUrl}#webpage`
  const breadcrumbItems = [{ name: 'Home', item: baseUrl }]

  const graph = [
    {
      '@type': 'NewsMediaOrganization',
      '@id': organizationId,
      name: SITE_NAME,
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/thelatest.svg`
      },
      image: DEFAULT_IMAGE
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: baseUrl,
      name: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      publisher: {
        '@id': organizationId
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  ]

  let pageType = 'WebPage'

  if (pathname === '/') {
    pageType = 'CollectionPage'
  } else if (pathname === '/search') {
    pageType = 'SearchResultsPage'
    breadcrumbItems.push({ name: 'Search', item: `${baseUrl}/search` })
    if (query) {
      breadcrumbItems.push({ name: query, item: metadata.canonicalUrl })
    }
  } else if (pathname === '/dashboard') {
    pageType = 'WebPage'
    breadcrumbItems.push({ name: 'Dashboard', item: metadata.canonicalUrl })
  } else if (pathname === '/saved') {
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: 'Saved', item: metadata.canonicalUrl })
  } else if (pathname === '/privacy') {
    pageType = 'WebPage'
    breadcrumbItems.push({ name: 'Privacy Policy', item: metadata.canonicalUrl })
  } else if (pathname === '/terms') {
    pageType = 'WebPage'
    breadcrumbItems.push({ name: 'Terms of Use', item: metadata.canonicalUrl })
  } else if (pathname === '/following') {
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: 'Following', item: metadata.canonicalUrl })
  } else if (pathname === '/article') {
    pageType = 'WebPage'
    breadcrumbItems.push({ name: 'Article Reader', item: metadata.canonicalUrl })
  } else if (segments[0] === 'category' && segments[1]) {
    const config = getCategoryConfig(segments[1])
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: config.title, item: `${baseUrl}/category/${segments[1]}` })

    if (segments[2] === 'all-news') {
      breadcrumbItems.push({ name: 'All News', item: metadata.canonicalUrl })
    } else if (segments[2] === 'all-opinions') {
      breadcrumbItems.push({ name: 'All Opinions', item: metadata.canonicalUrl })
    } else if (segments[2] === 'all-videos') {
      breadcrumbItems.push({ name: 'All Videos', item: metadata.canonicalUrl })
    } else if (segments[2] === 'all-podcasts') {
      breadcrumbItems.push({ name: 'All Podcasts', item: metadata.canonicalUrl })
    }
  } else if (segments[0] === 'topic' && segments[1]) {
    const topicConfig = getTopicPageConfig(segments[1])
    const topicLabel = topicConfig?.title || toTitleCase(segments[1])
    const sectionLabel = topicConfig ? getTopicSectionLabel(segments[1]) : 'Topics'
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: sectionLabel, item: `${baseUrl}/category/${topicConfig?.feedCategory || ''}`.replace(/\/$/, '') })
    breadcrumbItems.push({ name: topicLabel, item: `${baseUrl}/topic/${segments[1]}` })

    if (segments[2] === 'all-news') {
      breadcrumbItems.push({ name: 'All News', item: metadata.canonicalUrl })
    } else if (segments[2] === 'all-opinions') {
      breadcrumbItems.push({ name: 'All Opinions', item: metadata.canonicalUrl })
    } else if (segments[2] === 'all-videos') {
      breadcrumbItems.push({ name: 'All Videos', item: metadata.canonicalUrl })
    } else if (segments[2] === 'all-podcasts') {
      breadcrumbItems.push({ name: 'All Podcasts', item: metadata.canonicalUrl })
    }
  } else if (segments[0]) {
    pageType = ['news', 'opinions', 'videos', 'podcasts', 'social', 'sports', 'all-news', 'all-opinions', 'all-videos', 'all-podcasts'].includes(segments[0])
      ? 'CollectionPage'
      : 'WebPage'
    breadcrumbItems.push({ name: toTitleCase(segments[0]), item: metadata.canonicalUrl })
  }

  graph.push({
    '@type': pageType,
    '@id': pageId,
    url: metadata.canonicalUrl,
    name: metadata.title,
    description: metadata.description,
    isPartOf: {
      '@id': websiteId
    },
    about: {
      '@id': organizationId
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: metadata.image
    },
    inLanguage: 'en-US'
  })

  if (breadcrumbItems.length > 1) {
    graph.push(createBreadcrumbList(breadcrumbItems))
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  }
}

function buildRouteMetadata(location) {
  const pathname = location.pathname || '/'
  const params = new URLSearchParams(location.search || '')
  const query = trimQuery(params.get('q') || '')
  const segments = pathname.split('/').filter(Boolean)
  const baseUrl = getBaseUrl()
  const canonicalUrl = `${baseUrl}${pathname}${location.search || ''}`

  let title = `${SITE_NAME} | Breaking News, Politics, Tech, Business & Culture`
  let description = DEFAULT_DESCRIPTION
  let image = DEFAULT_IMAGE
  let robots = 'index,follow'

  if (pathname === '/') {
    title = `${SITE_NAME} | Breaking News, Politics, Tech, Business & Culture`
  } else if (pathname === '/search') {
    title = query ? `Search results for "${query}" | ${SITE_NAME}` : `Search | ${SITE_NAME}`
    description = query
      ? `Search results for ${query} across news, opinions, videos, podcasts, and curated editorial coverage.`
      : 'Search the latest reporting, analysis, and media coverage across every section of The Latest.'
    robots = 'noindex,follow'
  } else if (pathname === '/dashboard') {
    title = `Internal Dashboard | ${SITE_NAME}`
    description = 'Internal editorial dashboard for feed health, source quality, and engagement monitoring.'
    robots = 'noindex,nofollow'
  } else if (pathname === '/saved') {
    title = `Saved Stories | ${SITE_NAME}`
    description = 'Your saved stories and reading list inside The Latest.'
    robots = 'noindex,nofollow'
  } else if (pathname === '/following') {
    title = `Following | ${SITE_NAME}`
    description = 'The topics, sources, and categories you follow on The Latest.'
    robots = 'noindex,nofollow'
  } else if (pathname === '/article') {
    title = `Article Reader | ${SITE_NAME}`
    description = 'Read the full story in The Latest article reader with fast on-site access and related coverage.'
  } else if (pathname === '/privacy') {
    title = `Privacy Policy | ${SITE_NAME}`
    description = 'How The Latest collects, uses, stores, and protects account, reading, and analytics information.'
  } else if (pathname === '/terms') {
    title = `Terms of Use | ${SITE_NAME}`
    description = 'The rules governing access, account use, content handling, and acceptable behavior across The Latest.'
  } else if (segments[0] === 'category' && segments[1]) {
    const categoryName = segments[1]
    const config = getCategoryConfig(categoryName)
    image = config.image || image

    if (segments[2] === 'all-news') {
      title = `${config.title} News | ${SITE_NAME}`
      description = `More ${config.title.toLowerCase()} reporting, headlines, and developing coverage from The Latest.`
    } else if (segments[2] === 'all-opinions') {
      title = `${config.title} Opinions | ${SITE_NAME}`
      description = `Opinion, commentary, and analysis in ${config.title.toLowerCase()} from across The Latest.`
    } else if (segments[2] === 'all-videos') {
      title = `${config.title} Videos | ${SITE_NAME}`
      description = `Watch the latest ${config.title.toLowerCase()} video coverage and explainers from The Latest.`
    } else if (segments[2] === 'all-podcasts') {
      title = `${config.title} Podcasts | ${SITE_NAME}`
      description = `Listen to ${config.title.toLowerCase()} podcasts, interviews, and audio briefings from The Latest.`
    } else {
      title = `${config.title} | ${SITE_NAME}`
      description = config.subtitle || DEFAULT_DESCRIPTION
    }
  } else if (segments[0] === 'topic' && segments[1]) {
    const topicConfig = getTopicPageConfig(segments[1])
    const topicLabel = topicConfig?.title || toTitleCase(segments[1])
    const sectionLabel = topicConfig ? getTopicSectionLabel(segments[1]) : 'Topics'
    image = topicConfig?.image || image

    if (segments[2] === 'all-news') {
      title = `${topicLabel} News | ${SITE_NAME}`
      description = `Expanded ${topicLabel} news coverage from The Latest across the ${sectionLabel.toLowerCase()} desk.`
    } else if (segments[2] === 'all-opinions') {
      title = `${topicLabel} Opinions | ${SITE_NAME}`
      description = `Commentary and analysis about ${topicLabel} from The Latest and partner sources.`
    } else if (segments[2] === 'all-videos') {
      title = `${topicLabel} Videos | ${SITE_NAME}`
      description = `Video coverage, clips, and explainers focused on ${topicLabel}.`
    } else if (segments[2] === 'all-podcasts') {
      title = `${topicLabel} Podcasts | ${SITE_NAME}`
      description = `Podcast episodes and audio coverage focused on ${topicLabel}.`
    } else {
      title = `${topicLabel} Coverage | ${SITE_NAME}`
      description = topicConfig?.subtitle || `${topicLabel} coverage, context, and the latest developments from The Latest.`
    }
  } else {
    const routeMap = {
      news: {
        title: `News | ${SITE_NAME}`,
        description: 'The latest reporting, headlines, and developing stories from around the world.'
      },
      opinions: {
        title: `Opinions | ${SITE_NAME}`,
        description: 'Opinion, commentary, and analysis spanning politics, business, culture, and technology.'
      },
      videos: {
        title: `Videos | ${SITE_NAME}`,
        description: 'Watch breaking-news clips, explainers, interviews, and curated video coverage.'
      },
      podcasts: {
        title: `Podcasts | ${SITE_NAME}`,
        description: 'Listen to interviews, daily briefings, and podcast coverage from across the news cycle.'
      },
      social: {
        title: `Social Media | ${SITE_NAME}`,
        description: 'Trending social posts and conversation snapshots connected to the biggest stories.'
      },
      sports: {
        title: `Sports | ${SITE_NAME}`,
        description: 'Scores, highlights, and the top sports stories from around the globe.'
      },
      'all-news': {
        title: `All News | ${SITE_NAME}`,
        description: 'A broader stream of live headlines, top stories, and fast-moving updates from The Latest.'
      },
      'all-opinions': {
        title: `All Opinions | ${SITE_NAME}`,
        description: 'A deeper feed of commentary, columns, and opinion coverage from The Latest.'
      },
      'all-videos': {
        title: `All Videos | ${SITE_NAME}`,
        description: 'A broader stream of video reporting, highlights, and visual explainers from The Latest.'
      },
      'all-podcasts': {
        title: `All Podcasts | ${SITE_NAME}`,
        description: 'A broader stream of podcasts, interviews, and audio briefings from The Latest.'
      }
    }

    const routeMeta = routeMap[segments[0]]
    if (routeMeta) {
      title = routeMeta.title
      description = routeMeta.description
    }
  }

  return {
    title,
    description,
    image,
    robots,
    canonicalUrl
  }
}

function SeoManager() {
  const location = useLocation()

  useEffect(() => {
    const metadata = buildRouteMetadata(location)
    const structuredData = buildStructuredData(location, metadata)

    document.title = metadata.title
    upsertMeta('meta[name="description"]', { name: 'description', content: metadata.description })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: metadata.robots })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: metadata.title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: metadata.description })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: metadata.canonicalUrl })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: metadata.image })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: metadata.image })
    upsertLink('link[rel="canonical"]', 'canonical', metadata.canonicalUrl)
    upsertStructuredData('site-graph', structuredData)
  }, [location])

  return null
}

export default SeoManager