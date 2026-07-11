// AI Service for generating dynamic summaries
// Supports OpenAI, Anthropic Claude, and Perplexity

import {
  fetchRSSNews,
  fetchRSSOpinions,
  fetchRSSVideos,
  searchRSSContent
} from '../rssService'
import { filterContentByCategory, getCategoryKeywords } from '../utils/categoryFiltering'

const AI_PROVIDERS = {
  EDITORIAL: 'editorial',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  PERPLEXITY: 'perplexity'
}

const SHARED_SUMMARY_ENDPOINT = '/.netlify/functions/sharedSummary'
const SEARCH_ASSIST_ENDPOINT = '/.netlify/functions/searchAssist'
const AUTH_STORAGE_KEY = 'thelatest_auth_session_v1'

// Configuration - Add your API keys to .env
const CONFIG = {
  provider: import.meta.env.VITE_AI_PROVIDER || AI_PROVIDERS.OPENAI,
  apiKeys: {
    openai: import.meta.env.VITE_OPENAI_API_KEY,
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
    perplexity: import.meta.env.VITE_PERPLEXITY_API_KEY
  },
  maxTokens: 250,
  temperature: 0.7
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over', 'after',
  'about', 'have', 'has', 'had', 'will', 'are', 'was', 'were', 'but', 'not',
  'its', 'their', 'they', 'you', 'your', 'our', 'out', 'new', 'latest', 'says',
  'amid', 'more', 'than', 'what', 'when', 'where', 'which', 'while', 'across'
])

const cleanText = (value = '') => String(value || '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.;!?])/g, '$1')
  .trim()

const trimHeadline = (value = '', max = 95) => {
  const text = cleanText(value)
  if (text.length <= max) return text
  return `${text.slice(0, max).trim().replace(/[,:;-]+$/, '')}...`
}

const toSentence = (value = '') => {
  const text = cleanText(value)
  if (!text) return ''
  if (/[.!?]$/.test(text)) return text
  return `${text}.`
}

const normalizeTopic = (topic = '') => cleanText(topic).toLowerCase()

const KNOWN_CATEGORY_SLUGS = new Set([
  'top-stories',
  'entertainment',
  'sports',
  'business-tech',
  'lifestyle',
  'culture'
])

const normalizeCategorySlug = (value = '') => {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
  if (!normalized) return ''
  if (normalized === 'business' || normalized === 'tech' || normalized === 'technology') {
    return 'business-tech'
  }
  return normalized
}

const getRssCategoryForSummary = (categorySlug = '') => {
  if (!categorySlug || categorySlug === 'general' || categorySlug === 'top-stories') return null
  if (categorySlug === 'business-tech') return 'tech'
  return categorySlug
}

const resolveSummaryRequest = (requestOrTopic = '', options = {}) => {
  if (typeof requestOrTopic === 'object' && requestOrTopic !== null) {
    const topic = cleanText(requestOrTopic.topic || '')
    const category = normalizeCategorySlug(requestOrTopic.category || '')
    return {
      topic,
      category,
      enforceCategory: Boolean(requestOrTopic.enforceCategory)
    }
  }

  const topic = cleanText(requestOrTopic || '')
  const category = normalizeCategorySlug(options.category || '')

  return {
    topic,
    category,
    enforceCategory: Boolean(options.enforceCategory)
  }
}

const getStoredAuthToken = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null')
    return typeof stored?.token === 'string' ? stored.token.trim() : ''
  } catch {
    return ''
  }
}

const filterToCategoryScope = (items = [], categorySlug = '', strict = true) => {
  if (!categorySlug || categorySlug === 'general' || categorySlug === 'top-stories') {
    return Array.isArray(items) ? items : []
  }
  return filterContentByCategory(items, categorySlug, 1, { strict })
}

const getSearchableText = (item = {}) => cleanText([
  item?.title,
  item?.description,
  item?.content,
  item?.category,
  item?.source
].filter(Boolean).join(' ')).toLowerCase()

const scoreItemCategoryRelevance = (item = {}, categorySlug = '') => {
  const keywords = getCategoryKeywords(categorySlug)
  if (!keywords || keywords.length === 0) return 0

  const titleText = cleanText(item?.title || '').toLowerCase()
  const bodyText = getSearchableText(item)

  let score = 0
  keywords.forEach((keyword) => {
    const normalizedKeyword = cleanText(keyword).toLowerCase()
    if (!normalizedKeyword) return

    if (bodyText.includes(normalizedKeyword)) {
      score += 1
    }
    if (titleText.includes(normalizedKeyword)) {
      score += 1
    }
  })

  return score
}

const prioritizeCategoryItems = (items = [], categorySlug = '') => {
  if (!Array.isArray(items) || items.length === 0) return []

  return [...items]
    .map((item) => ({
      item,
      relevanceScore: scoreItemCategoryRelevance(item, categorySlug),
      freshnessScore: scoreItemFreshness(item)
    }))
    .filter(({ relevanceScore }) => relevanceScore > 0)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      return b.freshnessScore - a.freshnessScore
    })
    .map(({ item }) => item)
}

const CATEGORY_THEME_DEFAULTS = {
  entertainment: ['streaming', 'celebrity', 'awards'],
  sports: ['playoffs', 'highlights', 'teams'],
  'business-tech': ['innovation', 'markets', 'technology'],
  lifestyle: ['wellness', 'travel', 'health'],
  culture: ['arts', 'society', 'ideas'],
  'top-stories': ['breaking', 'global', 'analysis']
}

const buildCategoryKeywordTokenSet = (categorySlug = '') => {
  const keywords = getCategoryKeywords(categorySlug)
  const tokens = new Set()

  keywords.forEach((keyword) => {
    cleanText(keyword)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
      .forEach((token) => tokens.add(token))
  })

  return tokens
}

const getCategoryThemeTerms = (items = [], categorySlug = '', limit = 3) => {
  const topTerms = getTopTerms(items, Math.max(limit * 3, 8))
  const keywordTokenSet = buildCategoryKeywordTokenSet(categorySlug)

  const aligned = topTerms
    .filter((term) => keywordTokenSet.has(String(term || '').toLowerCase()))
    .slice(0, limit)

  if (aligned.length > 0) return aligned
  return (CATEGORY_THEME_DEFAULTS[categorySlug] || CATEGORY_THEME_DEFAULTS['top-stories']).slice(0, limit)
}

const scoreItemFreshness = (item) => {
  const stamp = item?.publishedAt || item?.date || item?.time || ''
  const parsed = Date.parse(stamp)
  if (Number.isNaN(parsed)) return 0
  const ageHours = Math.max(0, (Date.now() - parsed) / (1000 * 60 * 60))
  return Math.max(0, 48 - ageHours)
}

const getTopTerms = (items = [], limit = 3) => {
  const counts = new Map()

  items.forEach((item) => {
    const tokens = cleanText(`${item?.title || ''} ${item?.description || ''}`)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))

    tokens.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1)
    })
  })

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token)
}

const toTitleCase = (value = '') => cleanText(value)
  .split(' ')
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

const buildThemePhrase = (terms = []) => {
  const cleanTerms = terms
    .map((term) => toTitleCase(term))
    .filter(Boolean)
    .slice(0, 3)

  if (cleanTerms.length === 0) return 'Key Trends and Developments'
  if (cleanTerms.length === 1) return `${cleanTerms[0]} in Focus`
  if (cleanTerms.length === 2) return `${cleanTerms[0]} and ${cleanTerms[1]} in Focus`
  return `${cleanTerms[0]}, ${cleanTerms[1]}, and ${cleanTerms[2]} in Focus`
}

const buildEditorialHeadline = (topic, lead, terms) => {
  const normalizedTopic = normalizeTopic(topic)
  const themePhrase = buildThemePhrase(terms)

  if (normalizedTopic) {
    const explicitTopic = toTitleCase(topic)
    return trimHeadline(`${explicitTopic} Brief: ${themePhrase}`, 92)
  }

  return trimHeadline(`Today in Focus: ${themePhrase}`, 92)
}

async function generateEditorialSummary(topic = '', context = {}) {
  const normalizedTopic = normalizeTopic(topic)
  const normalizedCategory = normalizeCategorySlug(context.category || '')
  const hasCategoryScope = Boolean(
    normalizedCategory &&
    normalizedCategory !== 'general' &&
    normalizedCategory !== 'top-stories' &&
    KNOWN_CATEGORY_SLUGS.has(normalizedCategory)
  )
  const rssCategory = getRssCategoryForSummary(normalizedCategory)

  let pool = []
  let categoryPool = []

  if (normalizedTopic) {
    pool = await searchRSSContent(normalizedTopic, {
      strictSearch: true,
      relaxSearchFallback: true,
      minStrictResults: 6
    })
  }

  if (hasCategoryScope) {
    const [newsByCategory, opinionsByCategory, videosByCategory] = await Promise.allSettled([
      fetchRSSNews(rssCategory),
      fetchRSSOpinions(rssCategory),
      fetchRSSVideos(rssCategory)
    ])

    categoryPool = [
      ...(newsByCategory.status === 'fulfilled' ? (newsByCategory.value || []) : []),
      ...(opinionsByCategory.status === 'fulfilled' ? (opinionsByCategory.value || []) : []),
      ...(videosByCategory.status === 'fulfilled' ? (videosByCategory.value || []) : [])
    ]

    const strictScoped = filterToCategoryScope([...pool, ...categoryPool], normalizedCategory, true)
    pool = strictScoped.length > 0 ? strictScoped : [...categoryPool]
  }

  if (!Array.isArray(pool) || pool.length === 0) {
    const [news, opinions, videos] = await Promise.allSettled([
      fetchRSSNews(rssCategory),
      fetchRSSOpinions(rssCategory),
      fetchRSSVideos(rssCategory)
    ])

    pool = [
      ...(news.status === 'fulfilled' ? (news.value || []) : []),
      ...(opinions.status === 'fulfilled' ? (opinions.value || []) : []),
      ...(videos.status === 'fulfilled' ? (videos.value || []) : [])
    ]

    if (hasCategoryScope) {
      const strictScoped = filterToCategoryScope(pool, normalizedCategory, true)
      const looseScoped = filterToCategoryScope(pool, normalizedCategory, false)
      pool = strictScoped.length > 0
        ? strictScoped
        : (looseScoped.length > 0 ? looseScoped : pool)
    }
  }

  const unique = []
  const seen = new Set()
  for (const item of (pool || [])) {
    const key = String(item?.url || item?.link || `${item?.source || ''}|${item?.title || ''}`).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(item)
  }

  if (hasCategoryScope) {
    const scopedStrict = filterToCategoryScope(unique, normalizedCategory, true)
    const scopedLoose = filterToCategoryScope(unique, normalizedCategory, false)
    const scopedUnique = scopedStrict.length > 0
      ? scopedStrict
      : (scopedLoose.length > 0 ? scopedLoose : [])

    if (scopedUnique.length === 0 && categoryPool.length > 0) {
      const seedUnique = []
      const seedSeen = new Set()
      for (const item of categoryPool) {
        const seedKey = String(item?.url || item?.link || `${item?.source || ''}|${item?.title || ''}`).trim().toLowerCase()
        if (!seedKey || seedSeen.has(seedKey)) continue
        seedSeen.add(seedKey)
        seedUnique.push(item)
      }
      if (seedUnique.length > 0) {
        unique.length = 0
        unique.push(...seedUnique)
      }
    } else if (scopedUnique.length > 0) {
      const prioritizedScoped = prioritizeCategoryItems(scopedUnique, normalizedCategory)

      unique.length = 0
      if (prioritizedScoped.length > 0) {
        unique.push(...prioritizedScoped)
      } else {
        unique.push(
          ...[...scopedUnique].sort((a, b) => scoreItemFreshness(b) - scoreItemFreshness(a))
        )
      }
    }

    if (unique.length === 0) return null
  }

  if (unique.length === 0) return null

  const ranked = [...unique]
    .sort((a, b) => scoreItemFreshness(b) - scoreItemFreshness(a))
    .slice(0, 12)

  const lead = ranked[0]
  const second = ranked[1]
  const third = ranked[2]
  const terms = hasCategoryScope
    ? getCategoryThemeTerms(ranked, normalizedCategory, 3)
    : getTopTerms(ranked, 3)
  const theme = terms.length > 0 ? terms.join(', ') : 'policy, markets, and culture'

  const sourceCount = new Set(ranked.map((item) => String(item?.source || '').trim()).filter(Boolean)).size
  const sourcePreview = [...new Set(ranked.map((item) => String(item?.source || '').trim()).filter(Boolean))]
    .slice(0, 2)
    .join(' and ')

  const intro = normalizedTopic
    ? toSentence(`${topic} is moving fast: ${trimHeadline(lead?.title || '')}`)
    : toSentence(`Today's biggest moves center on ${theme}: ${trimHeadline(lead?.title || '')}`)

  const follow = second
    ? toSentence(`Also in focus, ${trimHeadline(second?.title || '')}${third ? `, while ${trimHeadline(third?.title || '')}` : ''}`)
    : ''

  const closer = toSentence(
    `Across ${sourceCount || 1} outlets${sourcePreview ? `, including ${sourcePreview},` : ''} the direction is clear: fast updates, high stakes, and practical impact for readers`
  )

  const summary = cleanText([intro, follow, closer].filter(Boolean).join(' '))
  const headlineTopic = normalizedTopic || (hasCategoryScope ? normalizedCategory.replace(/-/g, ' ') : '')
  const headline = buildEditorialHeadline(headlineTopic, lead, terms)
  const image = lead?.image || lead?.thumbnail || second?.image || second?.thumbnail || ''
  const url = lead?.url || lead?.link || ''

  return {
    headline,
    image,
    url,
    summary,
    provider: 'Local Editorial Fallback',
    timestamp: new Date().toISOString(),
    isFallback: false,
    modelFree: true
  }
}

/**
 * Generate AI summary using OpenAI GPT-4
 */
async function generateOpenAISummary(topic = '') {
  const apiKey = CONFIG.apiKeys.openai
  
  if (!apiKey) {
    console.warn('OpenAI API key not configured')
    return null
  }

  const prompt = topic 
    ? `Provide a concise 150-word summary of the latest news and developments about "${topic}". Focus on the most recent and significant events, trends, and discussions.`
    : `Provide a concise 150-word summary of today's top global news stories across politics, technology, business, culture, and current events.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a news analyst providing concise, factual summaries of current events. Focus on the most recent developments and keep summaries to exactly 150 words.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      summary: data.choices[0].message.content,
      provider: 'OpenAI GPT-4',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    return null
  }
}

/**
 * Generate AI summary using Anthropic Claude
 */
async function generateClaudeSummary(topic = '') {
  const apiKey = CONFIG.apiKeys.anthropic
  
  if (!apiKey) {
    console.warn('Anthropic API key not configured')
    return null
  }

  const prompt = topic 
    ? `Provide a concise 150-word summary of the latest news and developments about "${topic}". Focus on the most recent and significant events, trends, and discussions.`
    : `Provide a concise 150-word summary of today's top global news stories across politics, technology, business, culture, and current events.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: CONFIG.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      summary: data.content[0].text,
      provider: 'Claude 3 Sonnet',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Anthropic API error:', error)
    return null
  }
}

/**
 * Generate AI summary using Perplexity
 */
async function generatePerplexitySummary(topic = '') {
  const apiKey = CONFIG.apiKeys.perplexity
  
  if (!apiKey) {
    console.warn('Perplexity API key not configured')
    return null
  }

  const prompt = topic 
    ? `Provide a concise 150-word summary of the latest news and developments about "${topic}". Focus on the most recent and significant events.`
    : `Provide a concise 150-word summary of today's top global news stories.`

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar-medium-online',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      summary: data.choices[0].message.content,
      provider: 'Perplexity Sonar',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Perplexity API error:', error)
    return null
  }
}

/**
 * Main function to generate AI summary
 * Automatically falls back to next provider if one fails
 */
export async function generateAISummary(requestOrTopic = '', options = {}) {
  const request = resolveSummaryRequest(requestOrTopic, options)
  const effectiveQuery = request.topic || request.category || ''

  if (CONFIG.provider === AI_PROVIDERS.EDITORIAL) {
    const editorialOnly = await generateEditorialSummary(effectiveQuery, request)
    if (editorialOnly) return editorialOnly
    return getFallbackSummary(effectiveQuery, request.category)
  }

  const providers = [
    { name: AI_PROVIDERS.PERPLEXITY, fn: generatePerplexitySummary },
    { name: AI_PROVIDERS.OPENAI, fn: generateOpenAISummary },
    { name: AI_PROVIDERS.ANTHROPIC, fn: generateClaudeSummary }
  ]

  // Try configured provider first
  const primaryProvider = providers.find(p => p.name === CONFIG.provider)
  if (primaryProvider) {
    const result = await primaryProvider.fn(effectiveQuery)
    if (result) return result
  }

  // Fallback to other providers
  for (const provider of providers) {
    if (provider.name !== CONFIG.provider) {
      const result = await provider.fn(effectiveQuery)
      if (result) return result
    }
  }

  // Model-free live fallback generated from our own RSS content.
  const editorialSummary = await generateEditorialSummary(effectiveQuery, request)
  if (editorialSummary) return editorialSummary

  // If all AI providers fail, return fallback static summary
  return getFallbackSummary(effectiveQuery, request.category)
}

export async function getSharedSummary(requestOrTopic = '', options = {}) {
  const request = resolveSummaryRequest(requestOrTopic, options)
  const params = new URLSearchParams()
  const shouldRefresh = Boolean(options.refresh)

  if (request.topic) params.set('topic', request.topic)
  if (request.category) params.set('category', request.category)
  if (shouldRefresh) {
    params.set('refresh', '1')
  } else {
    params.set('allowStale', '1')
  }

  try {
    const response = await fetch(`${SHARED_SUMMARY_ENDPOINT}?${params.toString()}`)
    if (!response.ok) return null

    const payload = await response.json()
    return payload?.data || null
  } catch (error) {
    console.warn('Shared summary unavailable:', error)
    return null
  }
}

export async function getSearchAssist(query = '') {
  const normalizedQuery = cleanText(query)
  if (!normalizedQuery) return null

  try {
    const params = new URLSearchParams({ q: normalizedQuery })
    const response = await fetch(`${SEARCH_ASSIST_ENDPOINT}?${params.toString()}`)
    if (!response.ok) return null

    const payload = await response.json()
    return payload?.data || null
  } catch (error) {
    console.warn('Search assist unavailable:', error)
    return null
  }
}

export async function persistSharedSummary(requestOrTopic = '', summaryData, options = {}) {
  const request = resolveSummaryRequest(requestOrTopic, options)
  if (!summaryData?.summary) return null

  const token = getStoredAuthToken()
  if (!token) return null

  try {
    const response = await fetch(SHARED_SUMMARY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        topic: request.topic,
        category: request.category,
        summaryData
      })
    })

    if (!response.ok) return null
    const payload = await response.json()
    return payload?.data || null
  } catch (error) {
    console.warn('Failed to persist shared summary:', error)
    return null
  }
}

/**
 * Get cached summary from localStorage
 */
export function getCachedSummary(topic = '') {
  const cacheKey = `ai_summary_${topic || 'general'}`
  const cached = localStorage.getItem(cacheKey)
  
  if (!cached) return null
  
  try {
    const data = JSON.parse(cached)
    const age = Date.now() - new Date(data.timestamp).getTime()
    
    // Cache expires after 1 hour
    if (age < 60 * 60 * 1000) {
      return data
    }
  } catch (error) {
    console.error('Error reading cached summary:', error)
  }
  
  return null
}

/**
 * Cache AI summary to localStorage
 */
export function cacheSummary(topic = '', summaryData) {
  const cacheKey = `ai_summary_${topic || 'general'}`
  try {
    localStorage.setItem(cacheKey, JSON.stringify(summaryData))
  } catch (error) {
    console.error('Error caching summary:', error)
  }
}

/**
 * Fallback summary when AI APIs are unavailable
 */
function getFallbackSummary(topic = '', category = '') {
  const generalSummary = "Today's news cycle is dominated by analysis of President Donald Trump's first year back in office, with intense focus on immigration, trade, and sweeping executive actions that are testing relationships with allies and critics alike. Social media is simplifying political polarization while also obsessing over fast-moving pop culture, new record-topping album releases to fan debates about superstar tours and awards."
  
  // Enhanced topic-specific fallback summaries
  const topicSummaries = {
    'epstein': 'The Epstein Files continue to generate intense public interest and scrutiny. Recent document releases have prompted renewed investigations and discussions about accountability, institutional failures, and the broader implications for high-profile figures involved. Legal experts, journalists, and advocates are examining the newly available information to understand the full scope of the case and its impact on ongoing legal proceedings.',
    'epstein files': 'The Epstein Files continue to generate intense public interest and scrutiny. Recent document releases have prompted renewed investigations and discussions about accountability, institutional failures, and the broader implications for high-profile figures involved. Legal experts, journalists, and advocates are examining the newly available information to understand the full scope of the case and its impact on ongoing legal proceedings.',
    'oscars': "The 2026 Oscars season is heating up with fierce competition across all categories. Industry insiders are buzzing about potential nominees, breakthrough performances, and directorial achievements that could reshape the awards landscape. Film critics and audiences alike are debating which productions will earn coveted nominations, while studios mount strategic campaigns to secure recognition for their standout projects in what's shaping up to be a memorable year for cinema.",
    'oscar': "The 2026 Oscars season is heating up with fierce competition across all categories. Industry insiders are buzzing about potential nominees, breakthrough performances, and directorial achievements that could reshape the awards landscape. Film critics and audiences alike are debating which productions will earn coveted nominations, while studios mount strategic campaigns to secure recognition for their standout projects in what's shaping up to be a memorable year for cinema.",
    'ai': 'Artificial Intelligence continues to reshape every sector of society, from healthcare and education to business and creative industries. Recent developments in large language models, computer vision, and autonomous systems are sparking both excitement and concern about the technology\'s rapid advancement. Policymakers, tech leaders, and researchers are engaging in crucial debates about AI safety, regulation, ethical deployment, and ensuring these powerful tools benefit humanity while mitigating potential risks.',
    'artificial intelligence': 'Artificial Intelligence continues to reshape every sector of society, from healthcare and education to business and creative industries. Recent developments in large language models, computer vision, and autonomous systems are sparking both excitement and concern about the technology\'s rapid advancement. Policymakers, tech leaders, and researchers are engaging in crucial debates about AI safety, regulation, ethical deployment, and ensuring these powerful tools benefit humanity while mitigating potential risks.',
    'soccer': 'The global soccer landscape is buzzing with major tournaments, transfer news, and standout performances from top leagues worldwide. Fans are tracking their favorite clubs\' pursuit of silverware while emerging talents capture attention with spectacular displays. From Premier League drama to Champions League heroics, tactical innovations and record-breaking achievements are making headlines. International competitions and qualifiers add another layer of excitement as nations prepare for upcoming major tournaments.',
    'football': 'The global soccer landscape is buzzing with major tournaments, transfer news, and standout performances from top leagues worldwide. Fans are tracking their favorite clubs\' pursuit of silverware while emerging talents capture attention with spectacular displays. From Premier League drama to Champions League heroics, tactical innovations and record-breaking achievements are making headlines. International competitions and qualifiers add another layer of excitement as nations prepare for upcoming major tournaments.',
    'trump': 'President Donald Trump\'s administration continues to dominate headlines with bold policy initiatives and controversial decisions. His approach to immigration, trade relations, and domestic policy is reshaping the political landscape. Critics and supporters remain deeply divided on his executive actions, while analysts assess the long-term implications of his governance style. The administration\'s relationship with Congress, media coverage, and public opinion polls all factor into the ongoing political narrative.',
    'politics': 'The political arena remains highly polarized as major policy debates unfold across key issues. Congressional battles, state-level initiatives, and grassroots movements are shaping the national conversation. Voters are engaging with questions about healthcare, economic policy, social justice, and America\'s role on the global stage. Campaign strategies, polling data, and electoral dynamics are constantly evolving as political figures position themselves for upcoming contests.',
    'technology': 'The technology sector is experiencing rapid transformation with breakthroughs in AI, quantum computing, and sustainable innovation. Major tech companies are unveiling new products while startups disrupt traditional industries. Cybersecurity concerns, data privacy debates, and regulatory challenges are prompting important conversations about the future of digital society. Consumer tech trends, enterprise solutions, and emerging platforms are reshaping how people work, communicate, and interact.',
    'business': 'Global markets are navigating complex economic conditions with central banks adjusting monetary policy amid inflation concerns. Corporate earnings reports reveal shifting consumer behaviors and industry dynamics. Major mergers, acquisitions, and strategic partnerships are reshaping competitive landscapes across sectors. Investors are weighing geopolitical risks, supply chain challenges, and technological disruption while identifying growth opportunities in an evolving business environment.',
    'entertainment': 'The entertainment industry is thriving with blockbuster releases, streaming wars, and viral cultural moments. Music charts reflect diverse tastes as artists break records and push creative boundaries. Television and film productions are experimenting with new storytelling formats while social media amplifies celebrity news and fan engagement. Awards season campaigns, concert tours, and franchise announcements keep audiences captivated and industry insiders buzzing.',
    'movies': 'The film industry is experiencing a creative renaissance with diverse storytelling and groundbreaking cinema. Major studios balance blockbuster franchises with original content while independent films gain recognition at prestigious festivals. Streaming platforms compete with traditional theaters for audience attention. Directors push technical and narrative boundaries, exploring new genres and representation. Movie audiences return to cinemas for immersive experiences while home viewing evolves with premium streaming releases.',
    'sports': 'Sports headlines are dominated by championship pursuits, athlete achievements, and dramatic competitions across major leagues. Teams are making strategic moves through trades and free agency while rookies and veterans deliver memorable performances. Coaching changes, injury updates, and playoff races keep fans engaged. International competitions and Olympic preparations add global dimensions to the sports narrative as athletes push human limits.',
    'health': 'Healthcare developments are addressing pressing public health challenges with new treatments, research breakthroughs, and policy initiatives. Medical professionals are advancing personalized medicine, mental health awareness, and preventive care strategies. Public health officials monitor disease trends, vaccination programs, and wellness initiatives. Innovations in biotechnology, pharmaceutical research, and healthcare delivery are improving patient outcomes and access to quality care.',
    'climate': 'Climate change remains a critical global priority as extreme weather events underscore the urgency of action. Scientists present new research on environmental impacts while policymakers debate mitigation strategies and clean energy transitions. International cooperation, corporate sustainability commitments, and grassroots activism are driving climate initiatives. Technological innovations in renewable energy, carbon capture, and sustainable practices offer hope for addressing the climate crisis.',
    'business-tech': 'Business and technology sectors are converging as digital transformation accelerates across industries. Cloud computing, AI integration, and automation are reshaping business models. Startups are attracting significant venture capital while established companies innovate to stay competitive. Cryptocurrency markets, fintech solutions, and enterprise software developments are changing how businesses operate. Economic indicators and tech stock performance reflect investor confidence in innovation-driven growth.',
    'lifestyle': 'Lifestyle trends are evolving as people prioritize wellness, work-life balance, and personal fulfillment. Health and fitness movements emphasize holistic approaches to wellbeing. Travel is rebounding with new destination trends and sustainable tourism practices gaining traction. Food culture celebrates diverse cuisines and dietary innovations. Home design, fashion, and self-care industries are responding to changing consumer preferences and values in a post-pandemic world.'
  }
  
  const normalizedTopic = topic.toLowerCase().trim()
  const normalizedCategory = normalizeCategorySlug(category)
  const fallbackLookupKey = normalizedCategory || normalizedTopic
  
  // Check for exact match or partial match in topic summaries
  let topicSummary = topicSummaries[fallbackLookupKey]
  
  if (!topicSummary) {
    // Try partial match
    for (const [key, summary] of Object.entries(topicSummaries)) {
      if (fallbackLookupKey.includes(key) || key.includes(fallbackLookupKey)) {
        topicSummary = summary
        break
      }
    }
  }
  
  // Fallback to generic topic message if no specific summary found
  if (!topicSummary && (topic || category)) {
    const target = topic || category
    topicSummary = `Latest developments regarding ${target} include ongoing discussions and analysis from various perspectives. Real-time AI analysis will provide more specific insights when API keys are configured.`
  }

  return {
    summary: topicSummary || generalSummary,
    provider: 'Static Fallback',
    timestamp: new Date().toISOString(),
    isFallback: true
  }
}

export default {
  generateAISummary,
  getSharedSummary,
  persistSharedSummary,
  getCachedSummary,
  cacheSummary
}
