const { STORE_NAMES, getJsonWithMetadata, setJson, isBlobConfigurationError } = require('./blobStore');
const { requireAdminAccess } = require('./adminAccess');

const SUMMARY_TTL_MS = 60 * 60 * 1000;
const STALE_TTL_MS = 24 * 60 * 60 * 1000;

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

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const { topic = '', category = '', allowStale = '0' } = event.queryStringParameters || {};
      const key = buildSummaryKey(topic, category);
      const cached = await getJsonWithMetadata(STORE_NAMES.summaries, key);

      if (!cached || !cached.data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ found: false, key })
        };
      }

      const maxAge = String(allowStale) === '1' ? STALE_TTL_MS : SUMMARY_TTL_MS;
      if (!isFresh(cached.data.timestamp, maxAge)) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ found: false, stale: true, key })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          found: true,
          cached: true,
          key,
          data: cached.data,
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
        timestamp: summary.timestamp || new Date().toISOString(),
        persistedAt: new Date().toISOString()
      };

      await setJson(STORE_NAMES.summaries, key, payload, {
        metadata: {
          topic: normalizePart(topic) || 'general',
          category: normalizePart(category) || 'general',
          provider: String(payload.provider || 'Unknown').slice(0, 80)
        }
      });

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