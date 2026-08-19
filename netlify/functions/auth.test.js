// Plain CommonJS (this directory is "type": "commonjs") using Vitest's
// injected globals. authStore/blobStore exports are monkey-patched directly
// on their exports objects *before* auth.js (and the rateLimit.js it calls)
// requires them — see adminAccess.test.js for why vi.mock() isn't used here.
// blobStore.getJson/setJson are forced to reject as "not configured" so
// enforceRateLimit's bucket reads/writes stay in-memory instead of hitting
// the real Netlify Blobs store the local .env happens to have credentials
// for (that made these tests slow and wrote test data into live infra).
const authStore = require('./authStore');
const blobStore = require('./blobStore');
const emailService = require('./emailService');

const notConfiguredError = () =>
  Promise.reject(new Error('The environment has not been configured to use Netlify Blobs.'));

const original = {
  verifyPassword: authStore.verifyPassword,
  getUserByEmail: authStore.getUserByEmail,
  createUser: authStore.createUser,
  createSession: authStore.createSession,
  getAuthenticatedUser: authStore.getAuthenticatedUser,
  createPasswordResetToken: authStore.createPasswordResetToken,
  consumePasswordResetToken: authStore.consumePasswordResetToken,
  updateUserPassword: authStore.updateUserPassword,
  deleteKey: blobStore.deleteKey,
  getJson: blobStore.getJson,
  setJson: blobStore.setJson,
  sendEmail: emailService.sendEmail
};

authStore.verifyPassword = vi.fn(() => true);
authStore.getUserByEmail = vi.fn();
authStore.createUser = vi.fn();
authStore.createSession = vi.fn();
authStore.getAuthenticatedUser = vi.fn();
authStore.createPasswordResetToken = vi.fn();
authStore.consumePasswordResetToken = vi.fn();
authStore.updateUserPassword = vi.fn();
blobStore.deleteKey = vi.fn();
blobStore.getJson = vi.fn(notConfiguredError);
blobStore.setJson = vi.fn(notConfiguredError);
emailService.sendEmail = vi.fn().mockResolvedValue({ sent: false, logged: true });

const { handler } = require('./auth');

afterAll(() => {
  Object.assign(authStore, {
    verifyPassword: original.verifyPassword,
    getUserByEmail: original.getUserByEmail,
    createUser: original.createUser,
    createSession: original.createSession,
    getAuthenticatedUser: original.getAuthenticatedUser,
    createPasswordResetToken: original.createPasswordResetToken,
    consumePasswordResetToken: original.consumePasswordResetToken,
    updateUserPassword: original.updateUserPassword
  });
  blobStore.deleteKey = original.deleteKey;
  blobStore.getJson = original.getJson;
  blobStore.setJson = original.setJson;
  emailService.sendEmail = original.sendEmail;
});

function buildRequest({ action, email, password = 'password123', token, ip }) {
  return {
    httpMethod: 'POST',
    headers: { 'x-nf-client-connection-ip': ip, host: 'example.netlify.app' },
    body: JSON.stringify({ action, email, password, token, name: 'Test User' })
  };
}

describe('auth handler rate limiting', () => {
  beforeEach(() => {
    authStore.getUserByEmail.mockReset();
    authStore.createUser.mockReset();
    authStore.createSession.mockReset();
  });

  it('blocks registration after 5 attempts from the same IP within a minute', async () => {
    authStore.getUserByEmail.mockResolvedValue(null);
    authStore.createUser.mockResolvedValue({ id: 'u1', email: 'new@example.com' });
    authStore.createSession.mockResolvedValue({ token: 'tok' });

    const ip = 'register-test-ip-1';
    const responses = [];
    for (let i = 0; i < 6; i += 1) {
      const request = buildRequest({ action: 'register', email: `new-${i}@example.com`, ip });
      responses.push(await handler(request));
    }

    const statuses = responses.map((response) => response.statusCode);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it('blocks login after 10 attempts for the same email+IP within a minute', async () => {
    authStore.getUserByEmail.mockResolvedValue({
      id: 'u2',
      email: 'existing@example.com',
      passwordSalt: 'salt',
      passwordHash: 'hash'
    });
    authStore.createSession.mockResolvedValue({ token: 'tok' });

    const ip = 'login-test-ip-1';
    const responses = [];
    for (let i = 0; i < 11; i += 1) {
      const request = buildRequest({ action: 'login', email: 'existing@example.com', ip });
      responses.push(await handler(request));
    }

    const statuses = responses.map((response) => response.statusCode);
    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it('does not let login attempts against a different email share the same limit bucket', async () => {
    authStore.getUserByEmail.mockResolvedValue({
      id: 'u3',
      email: 'shared-ip@example.com',
      passwordSalt: 'salt',
      passwordHash: 'hash'
    });
    authStore.createSession.mockResolvedValue({ token: 'tok' });

    const ip = 'login-test-ip-shared';
    for (let i = 0; i < 10; i += 1) {
      await handler(buildRequest({ action: 'login', email: 'account-a@example.com', ip }));
    }
    const blocked = await handler(buildRequest({ action: 'login', email: 'account-a@example.com', ip }));
    const otherAccount = await handler(buildRequest({ action: 'login', email: 'account-b@example.com', ip }));

    expect(blocked.statusCode).toBe(429);
    expect(otherAccount.statusCode).toBe(200);
  });
});

describe('auth handler password reset', () => {
  beforeEach(() => {
    authStore.getUserByEmail.mockReset();
    authStore.createPasswordResetToken.mockReset();
    authStore.consumePasswordResetToken.mockReset();
    authStore.updateUserPassword.mockReset();
    authStore.createSession.mockReset();
    emailService.sendEmail.mockClear();
  });

  it('sends a reset email and returns a generic message when the account exists', async () => {
    authStore.getUserByEmail.mockResolvedValue({ id: 'u4', email: 'known@example.com' });
    authStore.createPasswordResetToken.mockResolvedValue({ token: 'reset-token-abc', expiresAt: 'later' });

    const response = await handler(buildRequest({
      action: 'request-password-reset',
      email: 'known@example.com',
      ip: 'reset-request-ip-1'
    }));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toMatch(/if an account exists/i);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    const sentArgs = emailService.sendEmail.mock.calls[0][0];
    expect(sentArgs.to).toBe('known@example.com');
    expect(sentArgs.html).toContain('reset-token-abc');
  });

  it('returns the same generic message and sends no email when the account does not exist', async () => {
    authStore.getUserByEmail.mockResolvedValue(null);

    const response = await handler(buildRequest({
      action: 'request-password-reset',
      email: 'unknown@example.com',
      ip: 'reset-request-ip-2'
    }));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toMatch(/if an account exists/i);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('blocks reset requests after 5 attempts for the same email+IP within a minute', async () => {
    authStore.getUserByEmail.mockResolvedValue(null);

    const ip = 'reset-request-ip-3';
    const responses = [];
    for (let i = 0; i < 6; i += 1) {
      responses.push(await handler(buildRequest({ action: 'request-password-reset', email: 'rate@example.com', ip })));
    }

    const statuses = responses.map((response) => response.statusCode);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });

  it('resets the password and signs the user in given a valid token', async () => {
    authStore.consumePasswordResetToken.mockResolvedValue({ userId: 'u5', email: 'reset-me@example.com' });
    authStore.updateUserPassword.mockResolvedValue({ id: 'u5', email: 'reset-me@example.com' });
    authStore.createSession.mockResolvedValue({ token: 'new-session-token' });

    const response = await handler(buildRequest({
      action: 'reset-password',
      token: 'valid-token',
      password: 'newpassword123',
      ip: 'reset-complete-ip-1'
    }));

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.authenticated).toBe(true);
    expect(body.token).toBe('new-session-token');
    expect(authStore.updateUserPassword).toHaveBeenCalledWith('reset-me@example.com', 'newpassword123');
  });

  it('rejects an invalid or expired reset token', async () => {
    authStore.consumePasswordResetToken.mockResolvedValue(null);

    const response = await handler(buildRequest({
      action: 'reset-password',
      token: 'bad-token',
      password: 'newpassword123',
      ip: 'reset-complete-ip-2'
    }));

    expect(response.statusCode).toBe(400);
    expect(authStore.updateUserPassword).not.toHaveBeenCalled();
  });

  it('rejects a reset-password request with too short a password', async () => {
    const response = await handler(buildRequest({
      action: 'reset-password',
      token: 'some-token',
      password: 'short',
      ip: 'reset-complete-ip-3'
    }));

    expect(response.statusCode).toBe(400);
    expect(authStore.consumePasswordResetToken).not.toHaveBeenCalled();
  });
});
