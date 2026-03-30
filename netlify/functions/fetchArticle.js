/**
 * fetchArticle — Netlify Function
 *
 * Proxies a news article URL through the server to avoid CORS restrictions,
 * then extracts the main readable text content so the client can display it
 * in the on-site article reader without redirecting the user.
 *
 * Query params:
 *   ?url=<encoded article URL>
 *
 * Returns JSON:
 *   { title, byline, content, image, siteName, url, error? }
 */

const https = require('https')
const http  = require('http')
const { URL } = require('url')

// ── Lightweight HTML content extractor ────────────────────────────────────────
// No heavy dependencies (no jsdom/cheerio) — just regex-based extraction
// targeting the patterns most news sites use.

function extractMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

function extractPageTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].replace(/\s*[|\-–—].*$/, '').trim() : ''
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractMainContent(html) {
  // Priority content containers used by major news sites:
  const selectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+class="[^"]*article[-_]?body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*story[-_]?body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*post[-_]?content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+class="[^"]*entry[-_]?content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]+itemprop="articleBody"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ]

  for (const re of selectors) {
    const m = html.match(re)
    if (m && m[1].length > 200) {
      const text = stripTags(m[1])
      if (text.length > 100) return text
    }
  }

  // Fallback: strip everything and return what's left
  return stripTags(html).slice(0, 3000)
}

// ── HTTP fetch helper (no axios — keep Lambda bundle tiny) ────────────────────

function fetchUrl(urlStr, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'))

    let parsed
    try { parsed = new URL(urlStr) } catch (e) { return reject(e) }

    const lib = parsed.protocol === 'https:' ? https : http
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'GET',
      headers:  {
        'User-Agent': 'Mozilla/5.0 (compatible; TheLatestBot/1.0; +https://thelatest.news)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    }

    const req = lib.request(options, (res) => {
      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, redirectCount + 1))
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }

      const chunks = []
      res.on('data', chunk => {
        chunks.push(chunk)
        // Limit to 2 MB
        if (chunks.reduce((s, c) => s + c.length, 0) > 2 * 1024 * 1024) req.destroy()
      })
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })

    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')) })
    req.end()
  })
}

// ── Handler ────────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const rawUrl = event.queryStringParameters?.url
  if (!rawUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing ?url param' }) }
  }

  let articleUrl
  try {
    articleUrl = decodeURIComponent(rawUrl)
    new URL(articleUrl) // validate
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid URL' }) }
  }

  try {
    const html = await fetchUrl(articleUrl)

    // Extract metadata
    const title   = extractMeta(html, 'og:title') || extractPageTitle(html)
    const image   = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image')
    const byline  = extractMeta(html, 'author') || extractMeta(html, 'article:author')
    const siteName = extractMeta(html, 'og:site_name')
    const content = extractMainContent(html)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ title, byline, content, image, siteName, url: articleUrl }),
    }
  } catch (err) {
    // Return a partial result so the reader can still show data from the feed
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: err.message, url: articleUrl }),
    }
  }
}
