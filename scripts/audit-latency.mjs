const rawBaseUrl = process.argv[2] || process.env.AUDIT_BASE_URL || process.env.SMOKE_BASE_URL || process.env.DEPLOY_PRIME_URL || process.env.URL || ''

if (!rawBaseUrl) {
  console.error('Provide a base URL as the first argument or set AUDIT_BASE_URL.')
  process.exit(1)
}

const baseUrl = String(rawBaseUrl).replace(/\/$/, '')
const budgets = [
  { name: 'homepage', path: '/', maxMs: 2500 },
  { name: 'rss-aggregator', path: '/.netlify/functions/rss-aggregator?type=news', maxMs: 4500 },
  { name: 'sharedSummary', path: '/.netlify/functions/sharedSummary?topic=technology&category=news', maxMs: 5000 },
  { name: 'generatedContent', path: '/.netlify/functions/generatedContent?type=news&topic=technology&count=1', maxMs: 6500 },
  { name: 'siteHealth', path: '/.netlify/functions/siteHealth', maxMs: 3000 }
]

async function timeRequest(pathname) {
  const startedAt = performance.now()
  const response = await fetch(`${baseUrl}${pathname}`)
  const elapsedMs = Math.round(performance.now() - startedAt)
  return { status: response.status, elapsedMs }
}

async function main() {
  console.log(`Latency auditing ${baseUrl}`)
  const failures = []

  for (const budget of budgets) {
    const result = await timeRequest(budget.path)
    console.log(`${budget.name}: ${result.status} in ${result.elapsedMs}ms (budget ${budget.maxMs}ms)`)

    if (result.status >= 500) {
      failures.push(`${budget.name} returned ${result.status}`)
      continue
    }

    if (result.elapsedMs > budget.maxMs) {
      failures.push(`${budget.name} exceeded latency budget: ${result.elapsedMs}ms > ${budget.maxMs}ms`)
    }
  }

  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exit(1)
  }

  console.log('Latency audit passed.')
}

main().catch((error) => {
  console.error(`Latency audit failed: ${error.message}`)
  process.exit(1)
})