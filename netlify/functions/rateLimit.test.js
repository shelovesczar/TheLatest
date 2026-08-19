// Plain CommonJS (this directory is "type": "commonjs") using Vitest's
// injected globals. blobStore's getJson/setJson are monkey-patched to always
// reject as "not configured" *before* rateLimit.js requires them, so these
// tests exercise the in-memory bucket fallback deterministically instead of
// hitting the real Netlify Blobs store the local .env happens to have live
// credentials for (that made repeated runs leak state across each other).
const blobStore = require('./blobStore');

const originalGetJson = blobStore.getJson;
const originalSetJson = blobStore.setJson;
const notConfiguredError = () =>
  Promise.reject(new Error('The environment has not been configured to use Netlify Blobs.'));

blobStore.getJson = vi.fn(notConfiguredError);
blobStore.setJson = vi.fn(notConfiguredError);

const { enforceRateLimit, getClientAddress } = require('./rateLimit');

afterAll(() => {
  blobStore.getJson = originalGetJson;
  blobStore.setJson = originalSetJson;
});

function buildEvent(ip = '127.0.0.1') {
  return { headers: { 'x-nf-client-connection-ip': ip } };
}

describe('getClientAddress', () => {
  it('prefers the Netlify client connection IP header', () => {
    const event = {
      headers: {
        'x-nf-client-connection-ip': '1.1.1.1',
        'x-forwarded-for': '2.2.2.2, 3.3.3.3'
      }
    };
    expect(getClientAddress(event)).toBe('1.1.1.1');
  });

  it('falls back to the first x-forwarded-for entry', () => {
    const event = { headers: { 'x-forwarded-for': '2.2.2.2, 3.3.3.3' } };
    expect(getClientAddress(event)).toBe('2.2.2.2');
  });

  it('defaults to anonymous when no address headers are present', () => {
    expect(getClientAddress({})).toBe('anonymous');
  });
});

describe('enforceRateLimit', () => {
  it('allows requests under the configured limit', async () => {
    const event = buildEvent('10.0.0.1');
    const result = await enforceRateLimit(event, {
      scope: 'test-allow',
      maxRequests: 3,
      windowMs: 10 * 60 * 1000
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests once the limit is exceeded within the window', async () => {
    const event = buildEvent('10.0.0.2');
    const options = { scope: 'test-block', maxRequests: 2, windowMs: 10 * 60 * 1000 };

    const first = await enforceRateLimit(event, options);
    const second = await enforceRateLimit(event, options);
    const third = await enforceRateLimit(event, options);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(Number(third.headers['Retry-After'])).toBeGreaterThanOrEqual(0);
  });

  it('scopes buckets independently per keySuffix', async () => {
    const options = { scope: 'test-suffix', maxRequests: 1, windowMs: 10 * 60 * 1000 };
    const event = buildEvent('10.0.0.3');

    const userA = await enforceRateLimit(event, { ...options, keySuffix: 'user-a@example.com' });
    const userAAgain = await enforceRateLimit(event, { ...options, keySuffix: 'user-a@example.com' });
    const userB = await enforceRateLimit(event, { ...options, keySuffix: 'user-b@example.com' });

    expect(userA.allowed).toBe(true);
    expect(userAAgain.allowed).toBe(false);
    expect(userB.allowed).toBe(true);
  });

  it('scopes buckets independently per client IP', async () => {
    const options = { scope: 'test-ip-scope', maxRequests: 1, windowMs: 10 * 60 * 1000 };

    const clientOne = await enforceRateLimit(buildEvent('10.0.0.4'), options);
    const clientTwo = await enforceRateLimit(buildEvent('10.0.0.5'), options);

    expect(clientOne.allowed).toBe(true);
    expect(clientTwo.allowed).toBe(true);
  });
});
