const { STORE_NAMES, setJson } = require('./blobStore');
const { jsonHeaders, requireAdminAccess } = require('./adminAccess');
const { getManagedSources, buildManagedSourceKey } = require('./rss-aggregator');

function parseBody(body = '') {
  try {
    return JSON.parse(body || '{}');
  } catch {
    return {};
  }
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const access = await requireAdminAccess(event);
  if (access.response) {
    return access.response;
  }

  const { auth } = access;

  if (event.httpMethod === 'GET') {
    const feedKey = String(event.queryStringParameters?.feedKey || '').trim().toLowerCase();
    const sources = await getManagedSources(feedKey ? [feedKey] : undefined);
    return { statusCode: 200, headers, body: JSON.stringify({ sources, count: sources.length }) };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const body = parseBody(event.body);
  const sourceId = String(body.sourceId || '').trim();
  const active = typeof body.active === 'boolean' ? body.active : null;

  if (!sourceId || active === null) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'sourceId and boolean active are required.' }) };
  }

  const sources = await getManagedSources();
  const target = sources.find((item) => item.id === sourceId);
  if (!target) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Source not found.' }) };
  }

  const updated = {
    id: target.id,
    feedKey: target.feedKey,
    source: target.source,
    url: target.url,
    active,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.user.email || auth.user.id || 'unknown'
  };

  await setJson(STORE_NAMES.sources, buildManagedSourceKey(target.id), updated, {
    metadata: {
      feedKey: target.feedKey,
      source: String(target.source || '').slice(0, 80),
      active: String(active),
      updatedAt: updated.updatedAt
    }
  });

  return { statusCode: 200, headers, body: JSON.stringify({ source: { ...target, active, updatedAt: updated.updatedAt } }) };
};