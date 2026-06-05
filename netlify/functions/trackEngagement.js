const { STORE_NAMES, getJson, setJson } = require('./blobStore');

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    .slice(0, 120);
}

function stableHash(value = '') {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}

function buildDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function incrementAggregate(prefix, id, seed = {}) {
  const key = `${prefix}/${id}`;
  const existing = await getJson(STORE_NAMES.analytics, key);
  const nextValue = {
    ...seed,
    ...(existing || {}),
    views: Number(existing?.views || 0) + 1,
    lastViewedAt: new Date().toISOString()
  };
  await setJson(STORE_NAMES.analytics, key, nextValue, {
    metadata: {
      kind: prefix.split('/')[0],
      updatedAt: nextValue.lastViewedAt
    }
  });
  return nextValue;
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const eventType = normalizePart(body.eventType || 'page-view') || 'page-view';
    const path = body.path || '/';
    const article = body.article || null;
    const source = article?.source || body.source || '';
    const title = article?.title || body.title || '';
    const canonicalUrl = article?.link || article?.url || body.url || path;
    const dayKey = buildDateKey();
    const pageId = stableHash(path);
    const articleId = stableHash(canonicalUrl);
    const sourceId = normalizePart(source) || 'unknown-source';

    const writes = [
      incrementAggregate(`pages/${dayKey}`, pageId, {
        eventType,
        path,
        title: body.pageTitle || title || path
      })
    ];

    if (title || canonicalUrl !== path) {
      writes.push(
        incrementAggregate(`articles/${dayKey}`, articleId, {
          eventType,
          title,
          source,
          url: canonicalUrl,
          category: article?.category || body.category || ''
        })
      );
    }

    if (source) {
      writes.push(
        incrementAggregate(`sources/${dayKey}`, sourceId, {
          eventType,
          source,
          category: article?.category || body.category || ''
        })
      );
    }

    await Promise.all(writes);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ tracked: true, eventType, dayKey })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};