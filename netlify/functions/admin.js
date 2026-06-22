const { jsonHeaders, requireAdminAccess } = require('./adminAccess');
const { runWarmContent, runWarmSummaries } = require('./warmContent');

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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        actions: ['warm-content', 'warm-summaries'],
        user: {
          email: auth.user.email,
          name: auth.user.name
        }
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const body = parseBody(event.body);
  const action = String(body.action || 'warm-content').trim().toLowerCase();

  try {
    if (action === 'warm-content') {
      const payload = await runWarmContent();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          action,
          ...payload
        })
      };
    }

    if (action === 'warm-summaries') {
      await runWarmSummaries();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          action,
          warmed: true,
          timestamp: new Date().toISOString()
        })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported admin action.' }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Unknown error' })
    };
  }
};