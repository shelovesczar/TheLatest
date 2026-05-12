const normalizeText = (value) => String(value || '').toLowerCase()

const VIDEO_URL_MARKERS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  '/video/',
  '/videos/',
  '.m3u8',
  '.mp4'
]

const PODCAST_URL_MARKERS = [
  'podcast',
  'megaphone.fm',
  'simplecast',
  'omnycontent',
  'feeds.npr',
  'art19.com',
  'acast.com',
  'buzzsprout',
  'anchor.fm',
  '/audio/'
]

const VIDEO_TEXT_MARKERS = [
  'video',
  'watch',
  'live stream',
  'trailer',
  'highlights',
  'clip'
]

const PODCAST_TEXT_MARKERS = [
  'podcast',
  'episode',
  'listen',
  'audio',
  'radio hour',
  'daily show'
]

const scoreMarkers = (text, markers) => markers.reduce((score, marker) => (text.includes(marker) ? score + 1 : score), 0)

export const getMediaKey = (item) => {
  const url = String(item?.link || item?.url || '').trim().toLowerCase().replace(/#.*$/, '')
  if (url) return `url:${url}`

  const title = normalizeText(item?.title).replace(/\s+/g, ' ').trim()
  const source = normalizeText(item?.source).replace(/\s+/g, ' ').trim()
  return title ? `title:${source}|${title}` : ''
}

export const classifyMediaItem = (item) => {
  const typeText = normalizeText(item?.type)
  const urlText = normalizeText(item?.link || item?.url)
  const sourceText = normalizeText(item?.source)
  const categoryText = normalizeText(item?.category)
  const titleText = normalizeText(item?.title)
  const descriptionText = normalizeText(item?.description)
  const contentText = normalizeText(item?.content)
  const aggregateText = `${sourceText} ${categoryText} ${titleText} ${descriptionText} ${contentText}`

  let videoScore = 0
  let podcastScore = 0

  if (typeText === 'video') videoScore += 3
  if (typeText === 'podcast') podcastScore += 3

  videoScore += scoreMarkers(urlText, VIDEO_URL_MARKERS)
  podcastScore += scoreMarkers(urlText, PODCAST_URL_MARKERS)
  videoScore += scoreMarkers(aggregateText, VIDEO_TEXT_MARKERS)
  podcastScore += scoreMarkers(aggregateText, PODCAST_TEXT_MARKERS)

  if (videoScore === 0 && podcastScore === 0) return 'other'
  return videoScore >= podcastScore ? 'video' : 'podcast'
}

export const isVideoItem = (item) => classifyMediaItem(item) === 'video'
export const isPodcastItem = (item) => classifyMediaItem(item) === 'podcast'

export const dedupeByMediaKey = (items = []) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = getMediaKey(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const removeCrossDuplicates = (primary = [], other = []) => {
  const otherKeys = new Set((other || []).map(getMediaKey).filter(Boolean))
  return (primary || []).filter((item) => {
    const key = getMediaKey(item)
    return key && !otherKeys.has(key)
  })
}
