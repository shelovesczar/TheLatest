const STORY_QUERY_LIMITS = {
  title: 160,
  description: 260,
  source: 80,
  author: 80,
  category: 60,
  image: 600,
  url: 900,
  publishedAt: 80,
  generatedId: 120,
  provider: 80,
  fallbackLabel: 80,
  contentKind: 40
}

function toPlainString(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(toPlainString).filter(Boolean).join(', ').trim()
  if (typeof value === 'object' && typeof value._ === 'string') return value._.trim()
  return ''
}

function trimValue(value, maxLength) {
  const normalized = toPlainString(value)
  if (!normalized || normalized.length <= maxLength) return normalized
  return normalized.slice(0, maxLength).trim()
}

function stableHash(value = '') {
  const source = String(value || '')
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function normalizeStorySlug(value = '') {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return normalized || 'story'
}

export function toStoryArticle(article = {}) {
  const url = toPlainString(article?.link || article?.url)
  const title = toPlainString(article?.title)
  const description = toPlainString(article?.description || article?.content)
  const source = toPlainString(article?.source || article?.sourceName || article?.siteName)
  const author = toPlainString(article?.author || article?.creator || article?.byline)
  const image = toPlainString(article?.image || article?.urlToImage)
  const category = toPlainString(article?.category)
  const publishedAt = toPlainString(article?.publishedAt || article?.pubDate || article?.date || article?.time)
  const generatedId = toPlainString(article?.generatedId)
  const provider = toPlainString(article?.provider)
  const fallbackLabel = toPlainString(article?.fallbackLabel)
  const contentKind = toPlainString(article?.contentKind || article?.type)

  if (!url && !title) return null

  return {
    title,
    description,
    source,
    author,
    image,
    category,
    publishedAt,
    url,
    link: url,
    generatedId,
    provider,
    fallbackLabel,
    contentKind,
    isGenerated: Boolean(article?.isGenerated || generatedId)
  }
}

export function buildStorySlug(article = {}) {
  const normalized = toStoryArticle(article)
  if (!normalized) return 'story'

  const slugBase = normalizeStorySlug(normalized.title || normalized.source || normalized.url)
  const fingerprint = stableHash(`${normalized.url}|${normalized.source}|${normalized.publishedAt}`)
  return `${slugBase}-${fingerprint}`
}

export function buildStoryHref(article = {}) {
  const normalized = toStoryArticle(article)
  if (!normalized) return '/story/story'

  const params = new URLSearchParams()
  const assignments = {
    title: trimValue(normalized.title, STORY_QUERY_LIMITS.title),
    description: trimValue(normalized.description, STORY_QUERY_LIMITS.description),
    source: trimValue(normalized.source, STORY_QUERY_LIMITS.source),
    author: trimValue(normalized.author, STORY_QUERY_LIMITS.author),
    category: trimValue(normalized.category, STORY_QUERY_LIMITS.category),
    image: trimValue(normalized.image, STORY_QUERY_LIMITS.image),
    url: trimValue(normalized.url, STORY_QUERY_LIMITS.url),
    publishedAt: trimValue(normalized.publishedAt, STORY_QUERY_LIMITS.publishedAt),
    generatedId: trimValue(normalized.generatedId, STORY_QUERY_LIMITS.generatedId),
    provider: trimValue(normalized.provider, STORY_QUERY_LIMITS.provider),
    fallbackLabel: trimValue(normalized.fallbackLabel, STORY_QUERY_LIMITS.fallbackLabel),
    contentKind: trimValue(normalized.contentKind, STORY_QUERY_LIMITS.contentKind)
  }

  Object.entries(assignments).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  const queryString = params.toString()
  return `/story/${buildStorySlug(normalized)}${queryString ? `?${queryString}` : ''}`
}

export function parseStoryArticleFromSearch(input = {}) {
  const search = typeof input === 'string'
    ? input
    : String(input?.search || '')

  const params = new URLSearchParams(search)
  const article = toStoryArticle({
    title: params.get('title') || '',
    description: params.get('description') || '',
    source: params.get('source') || '',
    author: params.get('author') || '',
    category: params.get('category') || '',
    image: params.get('image') || '',
    url: params.get('url') || '',
    publishedAt: params.get('publishedAt') || '',
    generatedId: params.get('generatedId') || '',
    provider: params.get('provider') || '',
    fallbackLabel: params.get('fallbackLabel') || '',
    contentKind: params.get('contentKind') || ''
  })

  return article
}

function isGeneratedFallbackUrl(value = '') {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized.includes('fallback.thelatest.local/generated/')
}

export function resolveContentHref(article = {}) {
  const normalized = toStoryArticle(article)
  if (!normalized) return '/story/story'

  const directHref = toPlainString(normalized.link || normalized.url)
  if (!directHref) return buildStoryHref(normalized)
  if (directHref.startsWith('/story/')) return directHref
  if (normalized.generatedId || normalized.isGenerated || isGeneratedFallbackUrl(directHref)) {
    return buildStoryHref(normalized)
  }

  return directHref
}