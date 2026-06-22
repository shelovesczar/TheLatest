const { STORE_NAMES, getJson, listJson } = require('./blobStore');
const { jsonHeaders, requireAdminAccess } = require('./adminAccess');

function getDateKeys(days = 1) {
  const keys = [];
  for (let index = 0; index < days; index += 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - index);
    keys.push(day.toISOString().slice(0, 10));
  }
  return keys;
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const access = await requireAdminAccess(event);
  if (access.response) {
    return access.response;
  }

  try {
    const { type = 'articles', days = '7', limit = '10' } = event.queryStringParameters || {};
    const windowDays = Math.max(1, Math.min(parseInt(days, 10) || 7, 30));
    const maxItems = Math.max(1, Math.min(parseInt(limit, 10) || 10, 50));
    const dateKeys = getDateKeys(windowDays);
    const aggregate = new Map();

    for (const dateKey of dateKeys) {
      const prefix = `${type}/${dateKey}`;
      const { blobs } = await listJson(STORE_NAMES.analytics, { prefix });
      for (const blob of blobs) {
        const item = await getJson(STORE_NAMES.analytics, blob.key);
        if (!item) continue;
        const id = blob.key.split('/').pop();
        const existing = aggregate.get(id) || { ...item, views: 0 };
        existing.views += Number(item.views || 0);
        if (!existing.lastViewedAt || String(item.lastViewedAt || '') > String(existing.lastViewedAt || '')) {
          existing.lastViewedAt = item.lastViewedAt;
        }
        aggregate.set(id, existing);
      }
    }

    const items = Array.from(aggregate.values())
      .sort((left, right) => Number(right.views || 0) - Number(left.views || 0))
      .slice(0, maxItems);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ type, days: windowDays, limit: maxItems, items })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};