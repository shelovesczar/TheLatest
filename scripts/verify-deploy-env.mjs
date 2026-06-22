const REQUIRED = [
  {
    key: 'SESSION_TOKEN_PEPPER',
    reason: 'Auth session tokens should be hashed with a deployment-specific pepper.'
  }
]

const RECOMMENDED = [
  {
    key: 'ADMIN_EMAILS',
    reason: 'Locks down warm-content, feed-status, trending, and source-management admin actions.'
  },
  {
    key: 'RSSHUB_BASE_URL',
    reason: 'Keeps social-feed route resolution explicit instead of relying on the default public RSSHub host.'
  },
  {
    key: 'RSS_APP_BUNDLE_FEED_URL',
    reason: 'Pins the editorial RSS bundle feed used across key sections.'
  },
  {
    key: 'RSS_APP_BUNDLE_SOURCE',
    reason: 'Provides a stable label for the editorial RSS bundle feed.'
  },
  {
    key: 'NEWS_API_KEY',
    reason: 'Enables the fetchNews serverless endpoint for NewsAPI-backed content.'
  },
  {
    key: 'GNEWS_API_KEY',
    reason: 'Enables the fetchNews serverless endpoint for GNews-backed content.'
  },
  {
    key: 'SOCIAL_RSS_FEEDS',
    reason: 'Lets you override baked-in social feed definitions per environment.'
  }
]

const AI_GROUPS = [
  {
    label: 'client AI summary provider',
    keys: ['VITE_OPENAI_API_KEY', 'VITE_ANTHROPIC_API_KEY', 'VITE_PERPLEXITY_API_KEY'],
    reason: 'Without one of these, browser-side AI summary generation will stay disabled.'
  },
  {
    label: 'server perspective model',
    keys: ['ANTHROPIC_API_KEY'],
    reason: 'Without this, server-side perspective labeling falls back to heuristic classification only.'
  }
]

function hasValue(key) {
  return String(process.env[key] || '').trim().length > 0
}

function logSection(title, rows) {
  if (rows.length === 0) return
  console.log(`\n${title}`)
  rows.forEach((row) => console.log(`- ${row}`))
}

function validateBlobPair(messages) {
  const hasSiteID = hasValue('NETLIFY_BLOBS_SITE_ID')
  const hasToken = hasValue('NETLIFY_BLOBS_TOKEN')

  if (hasSiteID !== hasToken) {
    messages.errors.push('Set both NETLIFY_BLOBS_SITE_ID and NETLIFY_BLOBS_TOKEN together for Docker/CI/manual runtimes.')
  } else if (hasSiteID && hasToken) {
    messages.info.push('Manual Netlify Blobs credentials detected for non-Netlify runtime support.')
  } else {
    messages.info.push('Manual Blob credentials not set. This is fine on Netlify; Docker/CI/manual runtimes will use graceful Blob fallbacks.')
  }
}

function main() {
  const strict = process.argv.includes('--strict')
  const messages = { errors: [], warnings: [], info: [] }

  REQUIRED.forEach(({ key, reason }) => {
    if (!hasValue(key)) {
      messages.errors.push(`${key} is missing. ${reason}`)
    }
  })

  RECOMMENDED.forEach(({ key, reason }) => {
    if (!hasValue(key)) {
      messages.warnings.push(`${key} is not set. ${reason}`)
    }
  })

  AI_GROUPS.forEach(({ label, keys, reason }) => {
    if (!keys.some(hasValue)) {
      messages.warnings.push(`No ${label} credentials found (${keys.join(', ')}). ${reason}`)
    }
  })

  validateBlobPair(messages)

  logSection('Errors', messages.errors)
  logSection('Warnings', messages.warnings)
  logSection('Notes', messages.info)

  if (messages.errors.length > 0) {
    console.error(`\nDeployment environment verification failed with ${messages.errors.length} error(s).`)
    process.exit(1)
  }

  if (strict && messages.warnings.length > 0) {
    console.error(`\nDeployment environment verification failed in strict mode with ${messages.warnings.length} warning(s).`)
    process.exit(1)
  }

  console.log('\nDeployment environment verification passed.')
}

main()