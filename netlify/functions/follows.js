const { getJson, setJson } = require('./blobStore');
const { getAuthenticatedUser } = require('./authStore');

const VALID_GROUPS = new Set(['categories', 'topics', 'sources']);

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function normalizeValue(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

async function getFollowState(userId) {
  return (await getJson('user-follows', `follows/${userId}`)) || {
    userId,
    categories: [],
    topics: [],
    sources: [],
    updatedAt: null
  };
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const auth = await getAuthenticatedUser(event);
  if (!auth) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required.' }) };
  }

  try {
    if (event.httpMethod === 'GET') {
      const follows = await getFollowState(auth.user.id);
      return { statusCode: 200, headers, body: JSON.stringify({ follows }) };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const action = String(body.action || 'toggle').trim().toLowerCase();
    const group = String(body.group || '').trim().toLowerCase();
    const value = normalizeValue(body.value);
    const values = Array.isArray(body.values) ? body.values.map(normalizeValue).filter(Boolean) : [];

    if (!VALID_GROUPS.has(group)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid follow group.' }) };
    }

    const follows = await getFollowState(auth.user.id);
    let nextValues = [...new Set((follows[group] || []).map(normalizeValue).filter(Boolean))];

    if (action === 'replace') {
      nextValues = [...new Set(values)];
    } else if (!value) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing follow value.' }) };
    } else if (action === 'follow') {
      if (!nextValues.includes(value)) nextValues.push(value);
    } else if (action === 'unfollow') {
      nextValues = nextValues.filter((entry) => entry !== value);
    } else {
      nextValues = nextValues.includes(value)
        ? nextValues.filter((entry) => entry !== value)
        : [...nextValues, value];
    }

    const updated = {
      ...follows,
      [group]: nextValues,
      updatedAt: new Date().toISOString()
    };

    await setJson('user-follows', `follows/${auth.user.id}`, updated, {
      metadata: {
        userId: auth.user.id,
        updatedAt: updated.updatedAt
      }
    });

    return { statusCode: 200, headers, body: JSON.stringify({ follows: updated }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Unknown error' }) };
  }
};