import { getCategoryConfig } from './categoryConfig.js'
import { getTopicPageConfig, getTopicSectionLabel } from './navigationConfig.js'
import { parseStoryArticleFromSearch } from './storyRouting.js'

export const SITE_NAME = 'The Latest'
export const SITE_URL = 'https://thelatest.news'
export const DEFAULT_DESCRIPTION = 'Breaking news, politics, tech, business, culture, video, and podcast coverage curated for fast, high-signal reading.'
export const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop'

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

function ensureBaseUrl(origin = '') {
  return String(origin || SITE_URL).replace(/\/$/, '') || SITE_URL
}

function buildCanonicalUrl(baseUrl, pathname, search = '') {
  return `${ensureBaseUrl(baseUrl)}${pathname || '/'}${search || ''}`
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

function getStoryMetadata(search = '') {
  const article = parseStoryArticleFromSearch(search)
  if (!article) return null

  return {
    title: article.title || 'Story',
    description: article.description || (article.source ? `Read coverage from ${article.source} on ${SITE_NAME}.` : DEFAULT_DESCRIPTION),
    image: article.image || DEFAULT_IMAGE,
    article
  }
}

export function buildRouteMetadata(locationLike = {}, options = {}) {
  const pathname = locationLike.pathname || '/'
  const search = locationLike.search || ''
  const params = new URLSearchParams(search)
  const query = trimQuery(params.get('q') || '')
  const segments = pathname.split('/').filter(Boolean)
  const baseUrl = ensureBaseUrl(options.baseUrl || locationLike.origin)
  const canonicalUrl = buildCanonicalUrl(baseUrl, pathname, search)

  let title = `${SITE_NAME} | Breaking News, Politics, Tech, Business & Culture`
  let description = DEFAULT_DESCRIPTION
  let image = DEFAULT_IMAGE
  let robots = 'index,follow'
  let openGraphType = 'website'

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
    robots = 'noindex,nofollow'
  } else if (pathname === '/privacy') {
    title = `Privacy Policy | ${SITE_NAME}`
    description = 'How The Latest collects, uses, stores, and protects account, reading, and analytics information.'
  } else if (pathname === '/terms') {
    title = `Terms of Use | ${SITE_NAME}`
    description = 'The rules governing access, account use, content handling, and acceptable behavior across The Latest.'
  } else if (pathname === '/about') {
    title = `About | ${SITE_NAME}`
    description = 'What The Latest is building, how it approaches news discovery, and what it prioritizes in product trust.'
  } else if (pathname === '/advertise') {
    title = `Advertise | ${SITE_NAME}`
    description = 'Advertising, sponsorship, and branded placement information for campaigns on The Latest.'
  } else if (pathname === '/editorial-standards') {
    title = `Editorial Standards | ${SITE_NAME}`
    description = 'How The Latest handles source selection, generated fallback content, labeling, and corrections.'
  } else if (pathname === '/corrections') {
    title = `Corrections | ${SITE_NAME}`
    description = 'How to report factual, routing, or labeling issues and how The Latest handles corrections.'
  } else if (pathname === '/contact') {
    title = `Contact | ${SITE_NAME}`
    description = 'Contact The Latest for editorial questions, product support, corrections, and privacy requests.'
  } else if (segments[0] === 'story' && segments[1]) {
    const storyMeta = getStoryMetadata(search)
    if (storyMeta) {
      title = `${storyMeta.title} | ${SITE_NAME}`
      description = storyMeta.description
      image = storyMeta.image
      openGraphType = 'article'
    } else {
      title = `Story | ${SITE_NAME}`
      description = 'Read story coverage on The Latest.'
    }
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
    canonicalUrl,
    openGraphType
  }
}

export function buildStructuredData(locationLike = {}, metadata = {}) {
  const pathname = locationLike.pathname || '/'
  const search = locationLike.search || ''
  const params = new URLSearchParams(search)
  const query = trimQuery(params.get('q') || '')
  const segments = pathname.split('/').filter(Boolean)
  const baseUrl = ensureBaseUrl(locationLike.origin)
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
    breadcrumbItems.push({ name: 'Dashboard', item: metadata.canonicalUrl })
  } else if (pathname === '/saved') {
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: 'Saved', item: metadata.canonicalUrl })
  } else if (pathname === '/privacy') {
    breadcrumbItems.push({ name: 'Privacy Policy', item: metadata.canonicalUrl })
  } else if (pathname === '/terms') {
    breadcrumbItems.push({ name: 'Terms of Use', item: metadata.canonicalUrl })
  } else if (pathname === '/about') {
    breadcrumbItems.push({ name: 'About', item: metadata.canonicalUrl })
  } else if (pathname === '/editorial-standards') {
    breadcrumbItems.push({ name: 'Editorial Standards', item: metadata.canonicalUrl })
  } else if (pathname === '/corrections') {
    breadcrumbItems.push({ name: 'Corrections', item: metadata.canonicalUrl })
  } else if (pathname === '/contact') {
    breadcrumbItems.push({ name: 'Contact', item: metadata.canonicalUrl })
  } else if (pathname === '/following') {
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: 'Following', item: metadata.canonicalUrl })
  } else if (pathname === '/article') {
    breadcrumbItems.push({ name: 'Article Reader', item: metadata.canonicalUrl })
  } else if (segments[0] === 'story' && segments[1]) {
    const storyMeta = getStoryMetadata(search)
    breadcrumbItems.push({ name: 'Stories', item: `${baseUrl}/news` })
    breadcrumbItems.push({ name: storyMeta?.title || 'Story', item: metadata.canonicalUrl })
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
    const sectionTarget = topicConfig?.feedCategory ? `${baseUrl}/category/${topicConfig.feedCategory}` : `${baseUrl}/news`
    pageType = 'CollectionPage'
    breadcrumbItems.push({ name: sectionLabel, item: sectionTarget })
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

  if (segments[0] === 'story' && segments[1]) {
    const storyMeta = getStoryMetadata(search)
    if (storyMeta?.article) {
      graph.push({
        '@type': 'NewsArticle',
        '@id': `${metadata.canonicalUrl}#article`,
        headline: storyMeta.title,
        description: storyMeta.description,
        image: storyMeta.image ? [storyMeta.image] : [DEFAULT_IMAGE],
        datePublished: storyMeta.article.publishedAt || undefined,
        dateModified: storyMeta.article.publishedAt || undefined,
        author: storyMeta.article.author
          ? [{ '@type': 'Person', name: storyMeta.article.author }]
          : undefined,
        publisher: {
          '@id': organizationId
        },
        mainEntityOfPage: {
          '@id': pageId
        },
        isAccessibleForFree: true,
        articleSection: storyMeta.article.category || storyMeta.article.source || 'News'
      })
    }
  }

  if (breadcrumbItems.length > 1) {
    graph.push(createBreadcrumbList(breadcrumbItems))
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  }
}