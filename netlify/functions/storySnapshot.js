const { STORE_NAMES, getJson, setJson, isBlobConfigurationError } = require('./blobStore');

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeStorySlug(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'story';
}

function stableHash(value = '') {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildStorySlug(article = {}) {
  const title = cleanText(article.title || article.source || article.url || 'story');
  const base = normalizeStorySlug(title);
  const fingerprint = stableHash(`${article.url || article.link || ''}|${article.source || ''}|${article.publishedAt || ''}`);
  return `${base}-${fingerprint}`;
}

function normalizeArticle(article = {}) {
  const url = cleanText(article.url || article.link || '');
  const title = cleanText(article.title || '');
  if (!url && !title) return null;

  const normalized = {
    title,
    description: cleanText(article.description || ''),
    content: cleanText(article.content || ''),
    source: cleanText(article.source || article.siteName || ''),
    author: cleanText(article.author || article.byline || ''),
    image: cleanText(article.image || article.urlToImage || ''),
    category: cleanText(article.category || ''),
    publishedAt: cleanText(article.publishedAt || article.pubDate || article.date || article.time || ''),
    url,
    link: url,
    provider: cleanText(article.provider || ''),
    generatedId: cleanText(article.generatedId || ''),
    fallbackLabel: cleanText(article.fallbackLabel || ''),
    contentKind: cleanText(article.contentKind || article.type || ''),
    isGenerated: Boolean(article.isGenerated || article.generatedId)
  };

  normalized.storySlug = cleanText(article.storySlug || buildStorySlug(normalized));
  return normalized;
}

function storyKey(slug = '') {
  return `stories/${cleanText(slug)}`;
}

async function saveStorySnapshot(article = {}) {
  const normalized = normalizeArticle(article);
  if (!normalized) return null;

  const now = new Date().toISOString();
  const payload = {
    ...normalized,
    storedAt: now,
    updatedAt: now
  };

  try {
    await setJson(STORE_NAMES.articles, storyKey(payload.storySlug), payload, {
      metadata: {
        storySlug: payload.storySlug,
        source: payload.source.slice(0, 80),
        updatedAt: now
      }
    });
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      throw error;
    }
  }

  return payload;
}

async function getStorySnapshot(slug = '') {
  if (!slug) return null;

  try {
    const story = await getJson(STORE_NAMES.articles, storyKey(slug));
    return story && typeof story === 'object' ? story : null;
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      throw error;
    }
    return null;
  }
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const slug = cleanText(event.queryStringParameters?.slug || '');
      if (!slug) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing slug' }) };
      }

      const snapshot = await getStorySnapshot(slug);
      if (!snapshot) {
        return { statusCode: 404, headers, body: JSON.stringify({ found: false, slug }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ found: true, story: snapshot }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const story = await saveStorySnapshot(body.article || body.story || body);
      if (!story) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing article payload' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ saved: true, slug: story.storySlug, story }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Unknown error' }) };
  }
};

module.exports = {
  handler: exports.handler,
  saveStorySnapshot,
  getStorySnapshot,
  normalizeArticle,
  buildStorySlug
};