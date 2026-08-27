// Plain CommonJS (this directory is "type": "commonjs") using Vitest's
// injected globals. vi.mock() does not reliably intercept require() calls
// between sibling CJS files here, so authStore's export is monkey-patched
// directly on its exports object *before* adminAccess.js requires it —
// Node's module cache means adminAccess.js picks up the same patched object.
const authStore = require('../authStore');
const originalGetAuthenticatedUser = authStore.getAuthenticatedUser;
authStore.getAuthenticatedUser = vi.fn();

const { canManageAdminActions, requireAdminAccess } = require('../adminAccess');

describe('canManageAdminActions', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  it('fails closed and denies everyone when ADMIN_EMAILS is unset', () => {
    delete process.env.ADMIN_EMAILS;
    expect(canManageAdminActions({ email: 'anyone@example.com' })).toBe(false);
  });

  it('fails closed and denies everyone when ADMIN_EMAILS is an empty string', () => {
    process.env.ADMIN_EMAILS = '';
    expect(canManageAdminActions({ email: 'anyone@example.com' })).toBe(false);
  });

  it('allows a user whose email is in the allowlist', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com, other@example.com';
    expect(canManageAdminActions({ email: 'admin@example.com' })).toBe(true);
  });

  it('is case-insensitive and trims whitespace when matching', () => {
    process.env.ADMIN_EMAILS = ' Admin@Example.com ';
    expect(canManageAdminActions({ email: 'admin@example.com' })).toBe(true);
  });

  it('denies a user whose email is not in the allowlist', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(canManageAdminActions({ email: 'someone-else@example.com' })).toBe(false);
  });

  it('denies a user with no email when an allowlist is configured', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    expect(canManageAdminActions({})).toBe(false);
  });
});

describe('requireAdminAccess', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    authStore.getAuthenticatedUser.mockReset();
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = originalAdminEmails;
  });

  afterAll(() => {
    authStore.getAuthenticatedUser = originalGetAuthenticatedUser;
  });

  it('returns 401 when there is no authenticated session', async () => {
    authStore.getAuthenticatedUser.mockResolvedValue(null);
    const result = await requireAdminAccess({});
    expect(result.response.statusCode).toBe(401);
  });

  it('returns 403 when the authenticated user is not an admin', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    authStore.getAuthenticatedUser.mockResolvedValue({ user: { email: 'someone-else@example.com' } });
    const result = await requireAdminAccess({});
    expect(result.response.statusCode).toBe(403);
  });

  it('returns no response (allowed) for an allowlisted admin', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    authStore.getAuthenticatedUser.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const result = await requireAdminAccess({});
    expect(result.response).toBeNull();
  });

  it('returns 403 for an authenticated user when ADMIN_EMAILS is unset', async () => {
    delete process.env.ADMIN_EMAILS;
    authStore.getAuthenticatedUser.mockResolvedValue({ user: { email: 'anyone@example.com' } });
    const result = await requireAdminAccess({});
    expect(result.response.statusCode).toBe(403);
  });
});
