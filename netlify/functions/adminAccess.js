const { getAuthenticatedUser } = require('./authStore');

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function getAllowedAdminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function canManageAdminActions(user = {}) {
  const allowlist = getAllowedAdminEmails();
  if (allowlist.length === 0) {
    return true;
  }

  const email = String(user.email || '').trim().toLowerCase();
  return Boolean(email) && allowlist.includes(email);
}

async function requireAdminAccess(event) {
  const headers = jsonHeaders();
  const auth = await getAuthenticatedUser(event);

  if (!auth) {
    return {
      headers,
      auth: null,
      response: {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required.' })
      }
    };
  }

  if (!canManageAdminActions(auth.user)) {
    return {
      headers,
      auth,
      response: {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required.' })
      }
    };
  }

  return {
    headers,
    auth,
    response: null
  };
}

module.exports = {
  jsonHeaders,
  getAllowedAdminEmails,
  canManageAdminActions,
  requireAdminAccess
};