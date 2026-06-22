const { getStore } = require('@netlify/blobs');

const STORE_NAMES = {
  summaries: 'shared-ai-summaries',
  articles: 'article-snapshots',
  feeds: 'feed-health',
  sources: 'feed-sources',
  analytics: 'site-analytics',
  follows: 'user-follows',
  users: 'app-users',
  sessions: 'app-sessions'
};

function getBlobAuthOptions() {
  const siteID = String(process.env.NETLIFY_BLOBS_SITE_ID || '').trim();
  const token = String(process.env.NETLIFY_BLOBS_TOKEN || '').trim();

  if (!siteID || !token) {
    return {};
  }

  return { siteID, token };
}

function isBlobConfigurationError(error) {
  const message = String(error?.message || error || '');
  return message.includes('has not been configured to use Netlify Blobs');
}

function getJsonStore(name, options = {}) {
  return getStore({
    name,
    consistency: options.consistency || 'strong',
    ...getBlobAuthOptions()
  });
}

async function getJson(name, key, options = {}) {
  const store = getJsonStore(name, options);
  return store.get(key, { type: 'json', consistency: options.consistency || 'strong' });
}

async function getJsonWithMetadata(name, key, options = {}) {
  const store = getJsonStore(name, options);
  return store.getWithMetadata(key, { type: 'json', consistency: options.consistency || 'strong' });
}

async function setJson(name, key, value, options = {}) {
  const store = getJsonStore(name, options);
  return store.setJSON(key, value, {
    metadata: options.metadata,
    onlyIfMatch: options.onlyIfMatch,
    onlyIfNew: options.onlyIfNew
  });
}

async function listJson(name, options = {}) {
  const store = getJsonStore(name, options);
  return store.list({ prefix: options.prefix || '' });
}

async function deleteKey(name, key, options = {}) {
  const store = getJsonStore(name, options);
  return store.delete(key);
}

module.exports = {
  STORE_NAMES,
  getJsonStore,
  getJson,
  getJsonWithMetadata,
  setJson,
  listJson,
  deleteKey,
  isBlobConfigurationError
};