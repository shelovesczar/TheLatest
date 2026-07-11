import fs from 'node:fs'
import path from 'node:path'

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
  },
  {
    key: 'ANTHROPIC_SUMMARY_MODEL',
    reason: 'Pins the summary model used for shared AI briefings instead of relying on code defaults.'
  },
  {
    key: 'ANTHROPIC_CONTENT_FALLBACK_MODEL',
    reason: 'Pins the generated-content fallback model used when RSS coverage is thin.'
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

let localEnvCache = null

function loadLocalEnv() {
  if (localEnvCache !== null) {
    return localEnvCache
  }

  localEnvCache = {}

  try {
    const envPath = path.resolve(process.cwd(), '.env')
    const content = fs.readFileSync(envPath, 'utf8')
    content
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        const trimmed = String(line || '').trim()
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return

        const separatorIndex = trimmed.indexOf('=')
        const key = trimmed.slice(0, separatorIndex).trim()
        const value = trimmed.slice(separatorIndex + 1).trim()

        if (key) {
          localEnvCache[key] = value
        }
      })
  } catch {
    localEnvCache = {}
  }

  return localEnvCache
}

function hasValue(key) {
  return getValue(key).length > 0
}

function getValue(key) {
  return String(process.env[key] || loadLocalEnv()[key] || '').trim()
}

function looksLikePlaceholder(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return !normalized || normalized.includes('your_') || normalized.includes('replace_me') || normalized.includes('example')
}

function validateAnthropicConfig(messages) {
  const serverKey = getValue('ANTHROPIC_API_KEY')
  const browserKey = getValue('VITE_ANTHROPIC_API_KEY')

  if (serverKey) {
    if (looksLikePlaceholder(serverKey)) {
      messages.errors.push('ANTHROPIC_API_KEY looks like a placeholder. Set a real server-side Anthropic key.')
    }

    if (!serverKey.startsWith('sk-ant-')) {
      messages.warnings.push('ANTHROPIC_API_KEY does not start with the expected Anthropic prefix. Double-check for typos or an outdated key.')
    }

    if (/\s/.test(serverKey)) {
      messages.errors.push('ANTHROPIC_API_KEY contains whitespace. Paste the key as a single uninterrupted value.')
    }
  }

  if (browserKey) {
    if (looksLikePlaceholder(browserKey)) {
      messages.warnings.push('VITE_ANTHROPIC_API_KEY is set but still looks like a placeholder.')
    } else {
      messages.warnings.push('VITE_ANTHROPIC_API_KEY is set. This exposes an Anthropic key to the browser bundle; prefer server-side ANTHROPIC_API_KEY only.')
    }
  }
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
    messages.info.push('Manual Blob credentials not set. This is fine on Netlify; Docker/CI/manual runtimes will use graceful Blob fallbacks, but story persistence, rate-limit buckets, and generated-content caching will be partial or disabled.')
  }
}

function main() {
  const strict = process.argv.includes('--strict')
  const requireBlobs = process.argv.includes('--require-blobs')
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

  validateAnthropicConfig(messages)
  validateBlobPair(messages)

  if (requireBlobs) {
    if (!hasValue('NETLIFY_BLOBS_SITE_ID') || !hasValue('NETLIFY_BLOBS_TOKEN')) {
      messages.errors.push('Blob credentials are required in this mode. Set NETLIFY_BLOBS_SITE_ID and NETLIFY_BLOBS_TOKEN to avoid local/CI Blob warnings and disabled persistence.')
    }
  }

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