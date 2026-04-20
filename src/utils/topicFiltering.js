const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'about', 'into', 'over'
])

const toText = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    if (typeof value._ === 'string') return value._
    if (typeof value.text === 'string') return value.text
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return ''
}

const normalizeText = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getTopicTerms = (topic = '') => {
  const normalized = normalizeText(topic)
  if (!normalized) return []

  const terms = new Set([normalized])
  normalized.split(' ').forEach((token) => {
    if (token.length >= 3 && !STOP_WORDS.has(token)) {
      terms.add(token)
    }
  })

  return Array.from(terms)
}

const DEFAULT_TOPIC_FIELDS = ['title', 'description', 'content', 'category', 'source', 'author', 'hosts', 'platform', 'tags']

export const buildTopicSearchText = (item = {}, fields = DEFAULT_TOPIC_FIELDS) =>
  normalizeText(fields.map((field) => toText(item?.[field])).join(' '))

export const matchesTopicQuery = (item = {}, topic = '', fields = DEFAULT_TOPIC_FIELDS) => {
  const terms = getTopicTerms(topic)
  if (terms.length === 0) return true

  const searchable = buildTopicSearchText(item, fields)
  if (!searchable) return false

  return terms.some((term) => searchable.includes(term))
}

export const filterItemsByTopic = (items = [], topic = '', fields = DEFAULT_TOPIC_FIELDS) => {
  const list = Array.isArray(items) ? items : []
  if (!topic || !String(topic).trim()) return list
  return list.filter((item) => matchesTopicQuery(item, topic, fields))
}
