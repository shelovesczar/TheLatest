const { deleteKey } = require('./blobStore');
const {
  normalizeEmail,
  normalizeName,
  buildSessionKey,
  verifyPassword,
  sanitizeUser,
  getUserByEmail,
  createUser,
  createSession,
  getAuthenticatedUser
} = require('./authStore');

function jsonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}

exports.handler = async (event) => {
  const headers = jsonHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const auth = await getAuthenticatedUser(event);
      if (!auth) {
        return { statusCode: 401, headers, body: JSON.stringify({ authenticated: false }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          authenticated: true,
          token: auth.token,
          user: sanitizeUser(auth.user)
        })
      };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'register') {
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      const name = normalizeName(body.name);

      if (!email || !password || password.length < 8) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name, email, and an 8+ character password are required.' }) };
      }

      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'An account already exists for that email.' }) };
      }

      const user = await createUser({ email, password, name });
      const session = await createSession(user);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          authenticated: true,
          token: session.token,
          user: sanitizeUser(user)
        })
      };
    }

    if (action === 'login') {
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      const user = await getUserByEmail(email);

      if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password.' }) };
      }

      const session = await createSession(user);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          authenticated: true,
          token: session.token,
          user: sanitizeUser(user)
        })
      };
    }

    if (action === 'logout') {
      const auth = await getAuthenticatedUser(event);
      if (auth) {
        await deleteKey('app-sessions', auth.sessionKey || buildSessionKey(auth.token));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ authenticated: false })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unsupported auth action.' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Unknown error' }) };
  }
};