const { STORE_NAMES, getJson, setJson, isBlobConfigurationError } = require('./blobStore');

const inMemoryBuckets = new Map();

function getClientAddress(event = {}) {
  const headers = event?.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '';
  const netlifyIp = headers['x-nf-client-connection-ip'] || headers['X-Nf-Client-Connection-Ip'] || '';
  return String(netlifyIp || forwarded.split(',')[0] || 'anonymous').trim() || 'anonymous';
}

function normalizePart(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function buildWindowKey(scope = 'default', clientId = 'anonymous', now = Date.now(), windowMs = 60000) {
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  return `${normalizePart(scope) || 'default'}/${normalizePart(clientId) || 'anonymous'}/${bucketStart}`;
}

function buildHeaders(limit, remaining, retryAfterSeconds = 0) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'Retry-After': String(Math.max(0, retryAfterSeconds))
  };
}

async function readBucket(key) {
  const memoryValue = inMemoryBuckets.get(key);
  if (memoryValue) return memoryValue;

  try {
    const stored = await getJson(STORE_NAMES.rateLimits, key);
    if (stored && typeof stored === 'object') {
      inMemoryBuckets.set(key, stored);
      return stored;
    }
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn('[rateLimit] failed to read bucket:', error.message);
    }
  }

  return null;
}

async function writeBucket(key, value) {
  inMemoryBuckets.set(key, value);

  try {
    await setJson(STORE_NAMES.rateLimits, key, value, {
      metadata: {
        updatedAt: value.updatedAt,
        scope: value.scope,
        client: value.clientId
      }
    });
  } catch (error) {
    if (!isBlobConfigurationError(error)) {
      console.warn('[rateLimit] failed to write bucket:', error.message);
    }
  }
}

async function enforceRateLimit(event, {
  scope = 'default',
  maxRequests = 60,
  windowMs = 60 * 1000,
  keySuffix = ''
} = {}) {
  const now = Date.now();
  const clientId = getClientAddress(event);
  const compositeScope = keySuffix ? `${scope}-${keySuffix}` : scope;
  const key = buildWindowKey(compositeScope, clientId, now, windowMs);
  const existing = await readBucket(key);
  const count = Number(existing?.count || 0) + 1;
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(bucketStart + windowMs).toISOString();
  const retryAfterSeconds = Math.ceil(((bucketStart + windowMs) - now) / 1000);
  const remaining = Math.max(0, maxRequests - count);

  await writeBucket(key, {
    scope: compositeScope,
    clientId,
    count,
    updatedAt: new Date(now).toISOString(),
    resetAt
  });

  return {
    allowed: count <= maxRequests,
    limit: maxRequests,
    remaining,
    retryAfterSeconds,
    headers: buildHeaders(maxRequests, remaining, retryAfterSeconds)
  };
}

module.exports = {
  enforceRateLimit,
  getClientAddress
};