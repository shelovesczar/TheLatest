/**
 * savedArticles.js
 * Persistent article storage using localStorage.
 *
 * Schema stored at key `thelatest_saved_v1`:
 *   Array of article objects, each with:
 *     id        — stable hash of the article URL
 *     savedAt   — ISO timestamp
 *     ...rest   — full article fields (title, image, source, link, description, etc.)
 *
 * Also maintains a separate `thelatest_history_v1` key that records every
 * article the user has clicked/opened (capped at 200 items).
 */

const SAVED_KEY   = 'thelatest_saved_v1'
const HISTORY_KEY = 'thelatest_history_v1'
const HISTORY_MAX = 200

// ── Helpers ──────────────────────────────────────────────────────────────────

function stableId(article) {
  const base = article.link || article.url || article.title || ''
  // Simple char-code hash — no crypto needed
  let h = 0
  for (let i = 0; i < base.length; i++) {
    h = (Math.imul(31, h) + base.charCodeAt(i)) | 0
  }
  return String(Math.abs(h))
}

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // localStorage quota exceeded — trim and retry
    const trimmed = list.slice(0, Math.floor(list.length / 2))
    try { localStorage.setItem(key, JSON.stringify(trimmed)) } catch { /* ignore */ }
  }
}

// ── Saved articles (bookmarks) ────────────────────────────────────────────────

export function getSavedArticles() {
  return readList(SAVED_KEY)
}

export function saveArticle(article) {
  const list = readList(SAVED_KEY)
  const id = stableId(article)
  // Don't duplicate
  if (list.some(a => a.id === id)) return
  list.unshift({ ...article, id, savedAt: new Date().toISOString() })
  writeList(SAVED_KEY, list)
}

export function unsaveArticle(article) {
  const id = stableId(article)
  const list = readList(SAVED_KEY).filter(a => a.id !== id)
  writeList(SAVED_KEY, list)
}

export function isArticleSaved(article) {
  const id = stableId(article)
  return readList(SAVED_KEY).some(a => a.id === id)
}

export function clearAllSaved() {
  localStorage.removeItem(SAVED_KEY)
}

// ── History (all opened articles) ─────────────────────────────────────────────

export function getHistory() {
  return readList(HISTORY_KEY)
}

export function recordHistory(article) {
  const id = stableId(article)
  let list = readList(HISTORY_KEY).filter(a => a.id !== id) // remove old entry to re-insert at top
  list.unshift({ ...article, id, readAt: new Date().toISOString() })
  if (list.length > HISTORY_MAX) list = list.slice(0, HISTORY_MAX)
  writeList(HISTORY_KEY, list)
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

// ── Full archive search (saved + history combined) ────────────────────────────

export function searchArchive(query) {
  if (!query || query.trim().length < 2) return []
  const q = query.toLowerCase()
  const combined = new Map()

  for (const article of [...getSavedArticles(), ...getHistory()]) {
    if (!combined.has(article.id)) combined.set(article.id, article)
  }

  return [...combined.values()].filter(a =>
    (a.title     || '').toLowerCase().includes(q) ||
    (a.description || '').toLowerCase().includes(q) ||
    (a.source    || '').toLowerCase().includes(q) ||
    (a.content   || '').toLowerCase().includes(q)
  )
}
