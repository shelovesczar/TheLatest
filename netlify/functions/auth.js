const { deleteKey } = require('./blobStore');
const { enforceRateLimit } = require('./rateLimit');
const { sendEmail } = require('./emailService');
const {
  normalizeEmail,
  normalizeName,
  buildSessionKey,
  verifyPassword,
  sanitizeUser,
  getUserByEmail,
  createUser,
  createSession,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPassword,
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

// Best-effort reconstruction of the site origin from the request itself, so
// the reset link works on whichever host actually served the request
// (custom domain, the raw *.netlify.app URL, a deploy preview, or local dev)
// without depending on an env var that may not be set for every context.
function getSiteOrigin(event = {}) {
  const headers = event.headers || {};
  const host = headers['x-forwarded-host'] || headers.host || headers.Host;
  const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(host || ''));
  const proto = headers['x-forwarded-proto'] || (isLocalHost ? 'http' : 'https');

  if (host) {
    return `${proto}://${host}`;
  }

  return String(process.env.VITE_SITE_URL || '').trim() || 'https://thelatest.com';
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
      const registerRateLimit = await enforceRateLimit(event, {
        scope: 'auth-register',
        maxRequests: 5,
        windowMs: 60 * 1000
      });

      if (!registerRateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...headers, ...registerRateLimit.headers },
          body: JSON.stringify({ error: 'Too many registration attempts. Try again shortly.' })
        };
      }

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

      const loginRateLimit = await enforceRateLimit(event, {
        scope: 'auth-login',
        maxRequests: 10,
        windowMs: 60 * 1000,
        keySuffix: email
      });

      if (!loginRateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...headers, ...loginRateLimit.headers },
          body: JSON.stringify({ error: 'Too many login attempts. Try again shortly.' })
        };
      }

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

    if (action === 'request-password-reset') {
      const email = normalizeEmail(body.email);

      const resetRateLimit = await enforceRateLimit(event, {
        scope: 'auth-request-reset',
        maxRequests: 5,
        windowMs: 60 * 1000,
        keySuffix: email
      });

      if (!resetRateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...headers, ...resetRateLimit.headers },
          body: JSON.stringify({ error: 'Too many reset requests. Try again shortly.' })
        };
      }

      // Always respond the same way whether or not the account exists, so
      // this endpoint can't be used to enumerate registered emails.
      const genericResponse = {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'If an account exists for that email, a reset link is on its way.'
        })
      };

      if (!email) {
        return genericResponse;
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return genericResponse;
      }

      const { token } = await createPasswordResetToken(user);
      const resetUrl = `${getSiteOrigin(event)}/reset-password?token=${encodeURIComponent(token)}`;

      await sendEmail({
        to: user.email,
        subject: 'Reset your The Latest password',
        html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p><p>If you didn't request this, you can ignore this email.</p>`,
        text: `We received a request to reset your password. Visit ${resetUrl} to choose a new password. This link expires in 1 hour. If you didn't request this, you can ignore this email.`
      });

      return genericResponse;
    }

    if (action === 'reset-password') {
      const token = String(body.token || '').trim();
      const password = String(body.password || '');

      const resetRateLimit = await enforceRateLimit(event, {
        scope: 'auth-reset-password',
        maxRequests: 10,
        windowMs: 60 * 1000
      });

      if (!resetRateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...headers, ...resetRateLimit.headers },
          body: JSON.stringify({ error: 'Too many attempts. Try again shortly.' })
        };
      }

      if (!token || !password || password.length < 8) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'A valid reset link and an 8+ character password are required.' }) };
      }

      const resetRecord = await consumePasswordResetToken(token);
      if (!resetRecord) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'This reset link is invalid or has expired.' }) };
      }

      const updatedUser = await updateUserPassword(resetRecord.email, password);
      if (!updatedUser) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'This reset link is invalid or has expired.' }) };
      }

      const session = await createSession(updatedUser);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          authenticated: true,
          token: session.token,
          user: sanitizeUser(updatedUser)
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