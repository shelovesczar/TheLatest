const rawBaseUrl = process.argv[2] || process.env.SMOKE_BASE_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || ''

if (!rawBaseUrl) {
  console.error('Provide a base URL as the first argument or set SMOKE_BASE_URL.')
  process.exit(1)
}

const baseUrl = String(rawBaseUrl).replace(/\/$/, '')

function resolveUrl(pathname) {
  return `${baseUrl}${pathname}`
}

async function request(pathname, options = {}) {
  const response = await fetch(resolveUrl(pathname), options)
  const text = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    text,
  }
}

function assertStatus(name, result, allowedStatuses) {
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${name} returned ${result.status}. Expected one of: ${allowedStatuses.join(', ')}`)
  }
}

function assertJsonLike(name, result) {
  const contentType = result.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${name} did not return JSON. Content-Type was: ${contentType || 'unknown'}`)
  }
}

async function main() {
  console.log(`Smoke testing ${baseUrl}`)

  const homepage = await request('/')
  assertStatus('homepage', homepage, [200])
  if (!/<!doctype html>/i.test(homepage.text)) {
    throw new Error('Homepage did not return the app HTML shell.')
  }

  const rss = await request('/.netlify/functions/rss-aggregator?type=news')
  assertStatus('rss-aggregator', rss, [200])
  assertJsonLike('rss-aggregator', rss)
  const rssPayload = JSON.parse(rss.text)
  if (!Array.isArray(rssPayload?.data)) {
    throw new Error('rss-aggregator response did not include a data array.')
  }

  const sharedSummary = await request('/.netlify/functions/sharedSummary?topic=test&category=news')
  assertStatus('sharedSummary', sharedSummary, [200, 404, 503])
  assertJsonLike('sharedSummary', sharedSummary)

  const generatedContent = await request('/.netlify/functions/generatedContent?type=news&topic=technology&count=1')
  assertStatus('generatedContent', generatedContent, [200, 429, 503])
  assertJsonLike('generatedContent', generatedContent)

  const storySnapshot = await request('/.netlify/functions/storySnapshot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      article: {
        title: 'Smoke snapshot test',
        source: 'Smoke Test',
        publishedAt: new Date().toISOString(),
        url: `${baseUrl}/smoke-story`
      }
    })
  })
  assertStatus('storySnapshot', storySnapshot, [200])
  assertJsonLike('storySnapshot', storySnapshot)

  const auth = await request('/.netlify/functions/auth')
  assertStatus('auth', auth, [200, 401])
  assertJsonLike('auth', auth)

  const tracking = await request('/.netlify/functions/trackEngagement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      eventType: 'page-view',
      path: '/smoke-check',
      pageTitle: 'Smoke Check'
    })
  })
  assertStatus('trackEngagement', tracking, [200, 202])
  assertJsonLike('trackEngagement', tracking)

  const privacy = await request('/privacy')
  assertStatus('privacy route', privacy, [200])

  const editorialStandards = await request('/editorial-standards')
  assertStatus('editorial standards route', editorialStandards, [200])

  const siteHealth = await request('/.netlify/functions/siteHealth')
  assertStatus('siteHealth', siteHealth, [200])
  assertJsonLike('siteHealth', siteHealth)

  console.log('Smoke test passed.')
}

main().catch((error) => {
  console.error(`Smoke test failed: ${error.message}`)
  process.exit(1)
})