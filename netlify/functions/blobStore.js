const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');

const STORE_NAMES = {
  summaries: 'shared-ai-summaries',
  generated: 'generated-content',
  articles: 'article-snapshots',
  rateLimits: 'rate-limits',
  feeds: 'feed-health',
  sources: 'feed-sources',
  analytics: 'site-analytics',
  follows: 'user-follows',
  users: 'app-users',
  sessions: 'app-sessions'
};

let localEnvCache = null;

function cleanText(value = '') {
  return String(value || '').trim();
}

function readLocalEnvValue(name = '') {
  if (localEnvCache === null) {
    localEnvCache = {};
    try {
      const envPath = path.resolve(__dirname, '..', '..', '.env');
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
    } catch {
      localEnvCache = {};
    }
  }

  return cleanText(localEnvCache[name] || '');
}

function getConfigValue(name = '') {
  return cleanText(process.env[name] || '') || readLocalEnvValue(name);
}

function getBlobAuthOptions() {
  const siteID = getConfigValue('NETLIFY_BLOBS_SITE_ID');
  const token = getConfigValue('NETLIFY_BLOBS_TOKEN');

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
  const writeOptions = {};

  if (options.metadata !== undefined) {
    writeOptions.metadata = options.metadata;
  }

  if (options.onlyIfMatch !== undefined) {
    writeOptions.onlyIfMatch = options.onlyIfMatch;
  }

  if (options.onlyIfNew !== undefined) {
    writeOptions.onlyIfNew = options.onlyIfNew;
  }

  return store.setJSON(key, value, writeOptions);
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