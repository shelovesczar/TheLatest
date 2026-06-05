const { STORE_NAMES, getJson, listJson } = require('./blobStore');

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
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

  try {
    const { prefix = 'feeds/' } = event.queryStringParameters || {};
    const { blobs } = await listJson(STORE_NAMES.feeds, { prefix });
    const items = [];

    for (const blob of blobs) {
      const item = await getJson(STORE_NAMES.feeds, blob.key);
      if (item) {
        items.push(item);
      }
    }

    items.sort((left, right) => {
      const leftFailure = Number(left.failureCount || 0);
      const rightFailure = Number(right.failureCount || 0);
      if (rightFailure !== leftFailure) {
        return rightFailure - leftFailure;
      }
      return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ items, count: items.length })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};