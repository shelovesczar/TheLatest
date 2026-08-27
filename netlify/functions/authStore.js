const crypto = require('crypto');
const { STORE_NAMES, getJson, setJson, deleteKey } = require('./blobStore');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name = '') {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function stableHash(value = '') {
  const source = String(value || '');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (Math.imul(31, hash) + source.charCodeAt(index)) | 0;
  }
  return String(Math.abs(hash));
}

function buildUserKey(email = '') {
  return `users/${stableHash(normalizeEmail(email))}`;
}

function digestToken(token = '') {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return '';

  const pepper = String(process.env.SESSION_TOKEN_PEPPER || '').trim();
  if (pepper) {
    return crypto.createHmac('sha256', pepper).update(normalizedToken).digest('hex');
  }

  return crypto.createHash('sha256').update(normalizedToken).digest('hex');
}

function digestSessionToken(token = '') {
  return digestToken(token);
}

function buildLegacySessionKey(token = '') {
  return `sessions/${String(token || '').trim()}`;
}

function buildSessionKey(token = '') {
  return `sessions/${digestToken(token)}`;
}

function buildPasswordResetKey(token = '') {
  return `password-resets/${digestToken(token)}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = crypto.scryptSync(String(password || ''), salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeUser(user = {}, { isAdmin = false } = {}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isAdmin
  };
}

function getSessionToken(event = {}) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  if (/^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  return String(event.headers?.['x-session-token'] || event.headers?.['X-Session-Token'] || '').trim();
}

async function getUserByEmail(email = '') {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return getJson(STORE_NAMES.users, buildUserKey(normalizedEmail));
}

async function createUser({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name) || normalizedEmail.split('@')[0] || 'Member';
  const now = new Date().toISOString();
  const { salt, hash } = hashPassword(password);

  const user = {
    id: `user_${stableHash(`${normalizedEmail}:${now}`)}`,
    email: normalizedEmail,
    name: normalizedName,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now
  };

  await setJson(STORE_NAMES.users, buildUserKey(normalizedEmail), user, {
    onlyIfNew: true,
    metadata: {
      email: normalizedEmail,
      name: normalizedName
    }
  });

  await setJson(STORE_NAMES.follows, `follows/${user.id}`, {
    userId: user.id,
    categories: [],
    topics: [],
    sources: [],
    updatedAt: now
  }, { onlyIfNew: true });

  return user;
}

async function createSession(user = {}) {
  const token = createSessionToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const session = {
    userId: user.id,
    email: user.email,
    createdAt,
    expiresAt,
    sessionVersion: 2,
    tokenHash: digestSessionToken(token)
  };

  await setJson(STORE_NAMES.sessions, buildSessionKey(token), session, {
    metadata: {
      userId: user.id,
      email: user.email,
      expiresAt
    }
  });

  return {
    token,
    userId: user.id,
    email: user.email,
    createdAt,
    expiresAt
  };
}

async function getSessionByToken(token = '') {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;

  const hashedKey = buildSessionKey(normalizedToken);
  const legacyKey = buildLegacySessionKey(normalizedToken);

  const hashedSession = await getJson(STORE_NAMES.sessions, hashedKey);
  if (hashedSession) {
    return {
      session: hashedSession,
      sessionKey: hashedKey,
      legacyKey: null
    };
  }

  if (legacyKey === hashedKey) {
    return null;
  }

  const legacySession = await getJson(STORE_NAMES.sessions, legacyKey);
  if (!legacySession) {
    return null;
  }

  const migratedSession = {
    ...legacySession,
    sessionVersion: legacySession.sessionVersion || 2,
    tokenHash: legacySession.tokenHash || digestSessionToken(normalizedToken)
  };

  delete migratedSession.token;

  try {
    await setJson(STORE_NAMES.sessions, hashedKey, migratedSession, {
      metadata: {
        userId: migratedSession.userId,
        email: migratedSession.email,
        expiresAt: migratedSession.expiresAt
      }
    });
    await deleteKey(STORE_NAMES.sessions, legacyKey);
    return {
      session: migratedSession,
      sessionKey: hashedKey,
      legacyKey
    };
  } catch {
    return {
      session: legacySession,
      sessionKey: legacyKey,
      legacyKey
    };
  }
}

async function createPasswordResetToken(user = {}) {
  const token = createSessionToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString();

  const record = {
    userId: user.id,
    email: user.email,
    createdAt,
    expiresAt
  };

  await setJson(STORE_NAMES.passwordResets, buildPasswordResetKey(token), record, {
    metadata: { userId: user.id, email: user.email, expiresAt }
  });

  return { token, expiresAt };
}

// Single-use: the record is deleted whether or not it turns out to be valid,
// so a token can never be replayed after this call.
async function consumePasswordResetToken(token = '') {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;

  const key = buildPasswordResetKey(normalizedToken);
  const record = await getJson(STORE_NAMES.passwordResets, key);
  if (!record) return null;

  await deleteKey(STORE_NAMES.passwordResets, key);

  if (Date.parse(record.expiresAt || '') <= Date.now()) {
    return null;
  }

  return record;
}

async function updateUserPassword(email = '', newPassword = '') {
  const normalizedEmail = normalizeEmail(email);
  const user = await getUserByEmail(normalizedEmail);
  if (!user) return null;

  const { salt, hash } = hashPassword(newPassword);
  const updatedUser = {
    ...user,
    passwordHash: hash,
    passwordSalt: salt,
    updatedAt: new Date().toISOString()
  };

  await setJson(STORE_NAMES.users, buildUserKey(normalizedEmail), updatedUser, {
    metadata: { email: normalizedEmail, name: updatedUser.name }
  });

  return updatedUser;
}

async function getAuthenticatedUser(event = {}) {
  const token = getSessionToken(event);
  if (!token) return null;

  const sessionRecord = await getSessionByToken(token);
  if (!sessionRecord) return null;

  const { session, sessionKey } = sessionRecord;

  if (Date.parse(session.expiresAt || '') <= Date.now()) {
    await deleteKey(STORE_NAMES.sessions, sessionKey);
    return null;
  }

  const user = await getUserByEmail(session.email);
  if (!user) return null;

  return {
    token,
    sessionKey,
    session,
    user
  };
}

module.exports = {
  SESSION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  normalizeEmail,
  normalizeName,
  digestSessionToken,
  buildUserKey,
  buildLegacySessionKey,
  buildSessionKey,
  buildPasswordResetKey,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  getSessionToken,
  getUserByEmail,
  createUser,
  createSession,
  createPasswordResetToken,
  consumePasswordResetToken,
  updateUserPassword,
  getAuthenticatedUser
};