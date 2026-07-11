const { STORE_NAMES, getJsonWithMetadata, setJson, isBlobConfigurationError } = require('./blobStore');
const { requireAdminAccess } = require('./adminAccess');
const rssAggregator = require('./rss-aggregator');
const { enforceRateLimit } = require('./rateLimit');
const fs = require('fs');
const path = require('path');

const SUMMARY_TTL_MS = 60 * 60 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SUMMARY_CHARACTERS = 700;

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function normalizePart(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildSummaryKey(topic = '', category = '') {
  const normalizedTopic = normalizePart(topic) || 'general';
  const normalizedCategory = normalizePart(category) || 'general';
  return `summary/${normalizedCategory}/${normalizedTopic}`;
}

function isFresh(timestamp, ttlMs = SUMMARY_TTL_MS) {
  const parsed = Date.parse(timestamp || '');
  if (Number.isNaN(parsed)) return false;
  return (Date.now() - parsed) < ttlMs;
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

let localEnvCache = null;

function readLocalEnvValue(name = '') {
  if (localEnvCache === null) {
    localEnvCache = {};
    const candidatePaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(__dirname, '..', '..', '.env')
    ];

    for (const envPath of candidatePaths) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content
          .split(/\r?\n/)
          .filter(Boolean)
          .forEach((line) => {
            const trimmed = String(line || '').trim();
            if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
            const separatorIndex = trimmed.indexOf('=');
            const key = trimmed.slice(0, separatorIndex).trim();
            const value = trimmed.slice(separatorIndex + 1).trim();
            if (key) {
              localEnvCache[key] = value;
            }
          });

        break;
      } catch {
        // try the next candidate path
      }
    }
  }

  return cleanText(localEnvCache[name] || '');
}

function getConfigValue(name = '') {
  const localValue = readLocalEnvValue(name);
  if (localValue) return localValue;
  return cleanText(process.env[name] || '');
}

function logSummaryIssue(message, details = null) {
  if (details === null || details === undefined || details === '') {
    console.warn(`[sharedSummary] ${message}`);
    return;
  }

  console.warn(`[sharedSummary] ${message}: ${details}`);
}

function toTitleCase(value = '') {
  return cleanText(value)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractAnthropicTextBlocks(payload) {
  const blocks = Array.isArray(payload?.content) ? payload.content : [];
  return blocks
    .filter((block) => block?.type === 'text' && typeof block?.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

function truncateText(value = '', max = 220) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim().replace(/[,:;-]+$/, '')}...`;
}

function capSummaryText(value = '', max = MAX_SUMMARY_CHARACTERS) {
  const text = cleanText(value);
  if (text.length <= max) return text;

  const sliceLength = Math.max(0, max - 3);
  return `${text.slice(0, sliceLength).trim().replace(/[,:;-]+$/, '')}...`;
}

function normalizeSummaryPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;

  return {
    ...payload,
    summary: capSummaryText(payload.summary || '')
  };
}

async function getLiveSummaryItems({ topic = '', category = '' } = {}) {
  const response = await rssAggregator.handler({
    httpMethod: 'GET',
    queryStringParameters: {
      type: 'news',
      ...(cleanText(category) ? { category: cleanText(category) } : {}),
      ...(cleanText(topic)
        ? { search: cleanText(topic), strictSearch: '0', relaxSearchFallback: '1', minStrictResults: '4' }
        : {})
    }
  }, {});

  if (response?.statusCode !== 200) {
    logSummaryIssue('rss-aggregator returned non-200 for summary context', response?.statusCode);
    return [];
  }

  const payload = JSON.parse(response.body || '{}');
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return items.filter(Boolean).slice(0, 8);
}

function buildCoverageContext(items = []) {
  return items
    .map((item, index) => {
      const title = truncateText(item?.title || '', 140);
      const source = truncateText(item?.source || item?.category || 'Unknown Source', 40);
      const description = truncateText(item?.description || item?.content || '', 220);
      const publishedAt = cleanText(item?.publishedAt || item?.date || item?.pubDate || '');

      return `${index + 1}. Source: ${source}\nTitle: ${title}\nPublished: ${publishedAt || 'Unknown'}\nDetail: ${description || 'No additional detail provided.'}`;
    })
    .join('\n\n');
}

function collectSummarySources(items = [], max = 4) {
  const uniqueSources = [];
  const seen = new Set();

  items.forEach((item) => {
    const source = cleanText(item?.source || item?.category || '');
    if (!source) return;

    const normalized = source.toLowerCase();
    if (seen.has(normalized)) return;

    seen.add(normalized);
    uniqueSources.push(source);
  });

  return uniqueSources.slice(0, max);
}

function buildSummaryPrompt(topic = '', category = '', items = []) {
  const cleanTopic = cleanText(topic);
  const cleanCategory = cleanText(category);
  const scope = cleanTopic && cleanCategory
    ? `topic "${cleanTopic}" within the ${toTitleCase(cleanCategory)} news category`
    : cleanTopic
      ? `topic "${cleanTopic}"`
      : cleanCategory
        ? `${toTitleCase(cleanCategory)} news coverage`
        : 'today\'s top global news coverage';

  return [
    'You are writing a concise homepage briefing for a news aggregation app.',
    `Summarize the latest major developments for ${scope} using only the coverage notes below.`,
    'Return JSON only in the form {"headline":"...","summary":"...","suggestedTopics":["...","..."]}.',
    'Constraints:',
    '- headline: under 90 characters',
    '- summary: 2 to 4 sentences, maximum 700 characters total',
    '- suggestedTopics: 5 to 7 short topic labels, each 1 to 3 words, ideal for a homepage topic rail',
    '- neutral, factual tone',
    '- no markdown, no bullets, no preamble',
    '- do not say that you lack browsing, real-time access, or external context',
    '',
    'Coverage notes:',
    buildCoverageContext(items)
  ].join('\n');
}

function sanitizeSuggestedTopics(values = [], fallbackItems = []) {
  const cleaned = [];
  const seen = new Set();

  const addTopic = (value = '') => {
    const topic = cleanText(value)
      .replace(/[|/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!topic) return;
    if (topic.length < 3 || topic.length > 32) return;
    if (topic.split(' ').length > 3) return;

    const lowered = topic.toLowerCase();
    if (seen.has(lowered)) return;

    seen.add(lowered);
    cleaned.push(topic);
  };

  if (Array.isArray(values)) {
    values.forEach((value) => addTopic(value));
  }

  if (cleaned.length >= 5) {
    return cleaned.slice(0, 7);
  }

  fallbackItems.forEach((item) => {
    const title = cleanText(item?.title || '');
    if (!title) return;

    title
      .split(/[:\-;,]|\band\b/i)
      .map((part) => cleanText(part))
      .filter(Boolean)
      .forEach((part) => {
        const compact = part
          .replace(/[^a-zA-Z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((token) => token.length > 2)
          .slice(0, 3)
          .join(' ');

        addTopic(compact);
      });
  });

  return cleaned.slice(0, 7);
}

async function generateAnthropicSummary({ topic = '', category = '' } = {}) {
  const apiKey = getConfigValue('ANTHROPIC_API_KEY');
  if (!apiKey) {
    logSummaryIssue('ANTHROPIC_API_KEY is missing');
    return null;
  }

  const items = await getLiveSummaryItems({ topic, category });
  if (items.length === 0) {
    logSummaryIssue('no live summary items were available');
    return null;
  }

  const model = getConfigValue('ANTHROPIC_SUMMARY_MODEL') || 'claude-sonnet-5';
  const prompt = buildSummaryPrompt(topic, category, items);
  const leadItem = items[0] || {};

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = cleanText(await response.text().catch(() => ''));
      logSummaryIssue(
        `Anthropic request failed with status ${response.status}`,
        truncateText(errorText || response.statusText || 'Unknown response error', 260)
      );
      return null;
    }

    const payload = await response.json().catch(() => null);
    const text = cleanText(extractAnthropicTextBlocks(payload));
    if (!text) {
      logSummaryIssue('Anthropic response did not include any text blocks');
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      logSummaryIssue('Anthropic response was not valid JSON', truncateText(text, 260));
      return null;
    }

    const summary = capSummaryText(parsed?.summary || '');
    if (!summary) {
      logSummaryIssue('Anthropic JSON response did not include summary text');
      return null;
    }

    const suggestedTopics = sanitizeSuggestedTopics(parsed?.suggestedTopics, items);
    const sources = collectSummarySources(items);

    return {
      headline: cleanText(parsed?.headline || leadItem?.title || ''),
      summary,
      suggestedTopics,
      sources,
      sourceCount: sources.length,
      provider: `Claude (${model})`,
      timestamp: new Date().toISOString(),
      topic: cleanText(topic),
      category: cleanText(category),
      url: cleanText(leadItem?.link || ''),
      image: cleanText(leadItem?.image || ''),
      source: cleanText(leadItem?.source || '')
    };
  } catch (error) {
    logSummaryIssue('Anthropic summary generation threw an exception', error?.message || 'Unknown error');
    return null;
  }
}

async function tryPersistGeneratedSummary(key, payload) {
  try {
    await setJson(STORE_NAMES.summaries, key, payload, {
      metadata: {
        topic: normalizePart(payload.topic) || 'general',
        category: normalizePart(payload.category) || 'general',
        provider: String(payload.provider || 'Unknown').slice(0, 80)
      }
    });
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      throw error;
    }
  }
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    const rateLimit = await enforceRateLimit(event, {
      scope: 'shared-summary',
      maxRequests: 40,
      windowMs: 60 * 1000
    });

    if (!rateLimit.allowed) {
      return {
        statusCode: 429,
        headers: { ...headers, ...rateLimit.headers },
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      };
    }
  }

  try {
    if (event.httpMethod === 'GET') {
      const { topic = '', category = '', allowStale = '0', refresh = '0' } = event.queryStringParameters || {};
      const key = buildSummaryKey(topic, category);
      const shouldRefresh = String(refresh) === '1';
      let cached = null;
      let cacheUnavailable = false;

      try {
        cached = await getJsonWithMetadata(STORE_NAMES.summaries, key);
      } catch (error) {
        if (!isBlobConfigurationError(error)) {
          throw error;
        }
        cacheUnavailable = true;
      }

      const maxAge = String(allowStale) === '1' ? STALE_TTL_MS : SUMMARY_TTL_MS;
      if (!shouldRefresh && cached?.data && isFresh(cached.data.timestamp, maxAge)) {
        const cachedData = normalizeSummaryPayload({
          ...cached.data,
          sources: Array.isArray(cached.data.sources) && cached.data.sources.length > 0
            ? cached.data.sources
            : (cleanText(cached.data.source) ? [cleanText(cached.data.source)] : [])
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            found: true,
            cached: true,
            key,
            data: cachedData,
            metadata: cached.metadata || null
          })
        };
      }

      const generated = await generateAnthropicSummary({ topic, category });
      if (generated) {
        const normalizedGenerated = normalizeSummaryPayload(generated);

        await tryPersistGeneratedSummary(key, {
          ...normalizedGenerated,
          persistedAt: new Date().toISOString()
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            found: true,
            cached: false,
            key,
            data: normalizedGenerated,
            metadata: null
          })
        };
      }

      if (!cached || !cached.data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ found: false, key, unavailable: cacheUnavailable })
        };
      }

      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          found: false,
          stale: true,
          key,
          data: normalizeSummaryPayload({
            ...cached.data,
            sources: Array.isArray(cached.data.sources) && cached.data.sources.length > 0
              ? cached.data.sources
              : (cleanText(cached.data.source) ? [cleanText(cached.data.source)] : [])
          }),
          metadata: cached.metadata || null
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const access = await requireAdminAccess(event);
      if (access.response) {
        return access.response;
      }

      const body = JSON.parse(event.body || '{}');
      const topic = body.topic || '';
      const category = body.category || '';
      const summary = body.summaryData || body.data;

      if (!summary || !summary.summary) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing summaryData.summary' })
        };
      }

      const key = buildSummaryKey(topic, category);
      const payload = {
        ...summary,
        topic,
        category,
        summary: capSummaryText(summary.summary || ''),
        timestamp: summary.timestamp || new Date().toISOString(),
        persistedAt: new Date().toISOString()
      };

      await tryPersistGeneratedSummary(key, payload);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ saved: true, key, data: payload })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    if (isBlobConfigurationError(error)) {
      return {
        statusCode: event.httpMethod === 'GET' ? 404 : 503,
        headers,
        body: JSON.stringify({
          found: false,
          unavailable: true,
          error: 'Netlify Blobs are not configured in this environment'
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};