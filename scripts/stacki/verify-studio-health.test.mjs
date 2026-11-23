import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAuthenticatedStudioHealth,
  verifyPublicStudioEntry, verifyAccessProtectedStudioEntry,
  verifyAccessProtectedPreviewEntry } from './verify-studio-health.mjs';

const studioOrigin = 'https://studio.example.com';
const previewOrigin = 'https://preview.example.com';
const sessionToken = `user.${'a'.repeat(43)}`;
const previewToken = `preview.${'b'.repeat(43)}`;
const previewSession = `preview.${'c'.repeat(43)}`;
const input = { studioOrigin, previewOrigin, sessionToken,
  githubId: 123, githubLogin: 'owner' };

test('public entry reaches native Stacki login without an owner session', async () => {
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options });
    return new Response('<html><svg aria-label="Stacki"></svg><p id="login-message"></p><a href="/studio/auth/login">Sign in</a></html>',
      { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  };
  assert.deepEqual(await verifyPublicStudioEntry({ studioOrigin }, transport),
    { state: 'public-studio-entry-healthy', studioOrigin });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${studioOrigin}/studio/`);
  assert.equal(calls[0].options.headers.cookie, undefined);
  assert.equal(calls[0].options.redirect, 'manual');
});

test('public entry rejects redirects, foreign pages and unavailable hosts', async () => {
  for (const response of [
    new Response(null, { status: 302, headers: { location: 'https://other.example.com' } }),
    new Response('<html>Login</html>', { headers: {
      'content-type': 'text/html', 'cache-control': 'no-store' } }),
    new Response('<html><a href="/studio/auth/login">Sign in</a></html>', { headers: {
      'content-type': 'text/html', 'cache-control': 'public' } }),
  ]) await assert.rejects(verifyPublicStudioEntry({ studioOrigin }, async () => response),
    /native_studio_public_entry_unready/);
  await assert.rejects(verifyPublicStudioEntry({ studioOrigin }, async () => {
    throw Error('network');
  }), /native_studio_public_entry_unavailable/);
});

test('Access entry observes only a challenge at the bound editor host', async () => {
  const authDomain = 'gnr8.cloudflareaccess.com';
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 302, headers: {
      location: `https://${authDomain}/cdn-cgi/access/login/test`,
    } });
  };
  assert.deepEqual(await verifyAccessProtectedStudioEntry({ studioOrigin, authDomain }, transport),
    { state: 'access-studio-challenge-observed', studioOrigin });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${studioOrigin}/studio/`);
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[0].options.headers.cookie, undefined);
});

test('Access entry rejects a public page, foreign redirect or wrong login path', async () => {
  const authDomain = 'gnr8.cloudflareaccess.com';
  for (const response of [
    new Response('<html>public</html>'),
    new Response(null, { status: 302, headers: {
      location: 'https://other.cloudflareaccess.com/cdn-cgi/access/login/test' } }),
    new Response(null, { status: 302, headers: {
      location: `https://${authDomain}/other` } }),
  ]) await assert.rejects(verifyAccessProtectedStudioEntry({ studioOrigin, authDomain },
    async () => response), /native_studio_access_entry_unready/);
});

test('Access preview entry observes a separate challenge on the exact preview host', async () => {
  const studioOrigin = 'https://site.example.com';
  const previewOrigin = 'https://preview.site.example.com';
  const authDomain = 'gnr8.cloudflareaccess.com';
  const calls = [];
  const transport = async (url, options) => {
    calls.push({ url, options });
    return new Response(null, { status: 302, headers: {
      location: `https://${authDomain}/cdn-cgi/access/login/test`,
    } });
  };
  assert.deepEqual(await verifyAccessProtectedPreviewEntry({ studioOrigin,
    previewOrigin, authDomain }, transport),
  { state: 'access-preview-challenge-observed', previewOrigin });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${previewOrigin}/`);
  assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[0].options.headers.cookie, undefined);
});

test('Access preview entry rejects public content, foreign redirects and wrong hosts', async () => {
  const input = { studioOrigin: 'https://site.example.com',
    previewOrigin: 'https://preview.site.example.com',
    authDomain: 'gnr8.cloudflareaccess.com' };
  for (const response of [
    new Response('<html>Unprotected preview</html>'),
    new Response(null, { status: 302, headers: {
      location: 'https://other.cloudflareaccess.com/cdn-cgi/access/login/test' } }),
    new Response(null, { status: 302, headers: {
      location: `https://${new URL(input.previewOrigin).hostname}/other` } }),
  ]) await assert.rejects(verifyAccessProtectedPreviewEntry(input,
    async () => response), /native_studio_access_preview_unready/);
  await assert.rejects(verifyAccessProtectedPreviewEntry({ ...input,
    previewOrigin: 'https://preview.other.example.com' },
  async () => { throw Error('unexpected_network'); }), /native_studio_health_input_invalid/);
});

function fixture(overrides = {}) {
  const seen = [];
  const responses = {
    session: Response.json({ kind: 'github', id: 123, login: 'owner' }),
    status: Response.json({ publishing: { kind: 'idle' }, github: true,
      ai: true, synchronization: { kind: 'idle' } }),
    editor: new Response('<html><body><div id="root"></div><script src="/studio/studio.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } }),
    route: Response.json({ origin: previewOrigin,
      url: `${previewOrigin}/__studio-entry?token=${previewToken}&page=%2F` }),
    handoff: new Response(null, { status: 302, headers: {
      location: '/#avb-design',
      'set-cookie': `__Host-studio-preview=${previewSession}; Path=/; HttpOnly; Secure; SameSite=Lax`,
    } }),
    preview: new Response('<html><body>Preview</body></html>',
      { headers: { 'content-type': 'text/html' } }),
    ...overrides,
  };
  const transport = async (url, options) => {
    seen.push({ url, options });
    if (url === `${studioOrigin}/studio/api/session`) return responses.session;
    if (url === `${studioOrigin}/studio/api/status`) return responses.status;
    if (url === `${studioOrigin}/studio/`) return responses.editor;
    if (url === `${studioOrigin}/studio/api/preview-url?page=%2F`) return responses.route;
    if (url.startsWith(`${previewOrigin}/__studio-entry?`)) return responses.handoff;
    if (url === `${previewOrigin}/`) return responses.preview;
    throw Error('unexpected_url');
  };
  return { transport, seen };
}

test('checks native owner session, Container status, editor and protected preview', async () => {
  const { transport, seen } = fixture();
  assert.deepEqual(await verifyAuthenticatedStudioHealth(input, transport),
    { state: 'authenticated-studio-healthy', githubId: 123, previewOrigin });
  assert.equal(seen.length, 6);
  assert.equal(seen[0].options.headers.cookie, `__Host-studio=${sessionToken}`);
  assert.equal(seen[5].options.headers.cookie,
    `__Host-studio-preview=${previewSession}`);
  assert.ok(seen.every(call => call.options.method === 'GET' &&
    call.options.redirect === 'manual'));
});

test('rejects login pages, wrong owner and a missing Container', async () => {
  for (const [overrides, code] of [
    [{ session: new Response('<html>Sign in</html>',
      { headers: { 'content-type': 'text/html' } }) },
    'native_studio_health_invalid_response'],
    [{ session: Response.json({ kind: 'github', id: 999, login: 'other' }) },
    'native_studio_health_identity_mismatch'],
    [{ status: new Response('Unavailable', { status: 503 }) },
    'native_studio_health_unavailable'],
    [{ status: Response.json({ github: false, ai: true,
      synchronization: { kind: 'idle' } }) },
    'native_studio_health_container_unready'],
    [{ status: Response.json({ github: true, ai: true,
      synchronization: { kind: 'failed' } }) },
    'native_studio_health_container_unready'],
    [{ editor: new Response('<html><body>Sign in</body></html>',
      { headers: { 'content-type': 'text/html' } }) },
    'native_studio_health_editor_unready'],
  ]) {
    const { transport } = fixture(overrides);
    await assert.rejects(verifyAuthenticatedStudioHealth(input, transport),
      { message: code });
  }
});

test('rejects a foreign preview, missing secure handoff and an unavailable page', async () => {
  for (const [overrides, code] of [
    [{ route: Response.json({ origin: previewOrigin,
      url: `https://attacker.example.com/__studio-entry?token=${previewToken}&page=%2F` }) },
    'native_studio_health_preview_unready'],
    [{ handoff: new Response(null, { status: 302, headers: {
      location: '/#avb-design',
      'set-cookie': `__Host-studio-preview=${previewSession}; Path=/; HttpOnly`,
    } }) }, 'native_studio_health_preview_unready'],
    [{ preview: new Response('Unavailable', { status: 503 }) },
    'native_studio_health_preview_unready'],
  ]) {
    const { transport } = fixture(overrides);
    await assert.rejects(verifyAuthenticatedStudioHealth(input, transport),
      { message: code });
  }
});

test('rejects invalid origins and sessions before a network request', async () => {
  const { transport, seen } = fixture();
  await assert.rejects(verifyAuthenticatedStudioHealth({ ...input,
    studioOrigin: 'http://studio.example.com' }, transport),
  { message: 'native_studio_health_input_invalid' });
  await assert.rejects(verifyAuthenticatedStudioHealth({ ...input,
    sessionToken: 'invalid' }, transport),
  { message: 'native_studio_health_input_invalid' });
  assert.equal(seen.length, 0);
});
