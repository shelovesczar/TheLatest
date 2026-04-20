const normalizeDedupeUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw, 'https://thelatest.local')
    parsed.hash = ''
    parsed.search = ''

    const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.origin}${pathname}`.toLowerCase()
  } catch {
    return raw
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
      .toLowerCase()
  }
}

const normalizeDedupeText = (value) => String(value || '')
  .toLowerCase()
  .replace(/&amp;/g, 'and')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const dedupeContentItems = (items = []) => {
  const seen = new Set()

  return items.filter((item) => {
    if (!item) return false

    const normalizedUrl = normalizeDedupeUrl(item.url || item.link)
    const normalizedSource = normalizeDedupeText(item.source)
    const normalizedTitle = normalizeDedupeText(item.title)
    const titleKey = normalizedTitle ? `title:${normalizedSource}|${normalizedTitle}` : ''

    if (!normalizedUrl && !titleKey) {
      return false
    }

    if ((normalizedUrl && seen.has(`url:${normalizedUrl}`)) || (titleKey && seen.has(titleKey))) {
      return false
    }

    if (normalizedUrl) {
      seen.add(`url:${normalizedUrl}`)
    }

    if (titleKey) {
      seen.add(titleKey)
    }

    return true
  })
}
