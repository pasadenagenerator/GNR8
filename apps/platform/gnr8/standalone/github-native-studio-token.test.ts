import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import type { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';

const scope = { agencyId: 'agency', clientId: 'client', siteId: 'site' };
const site = { siteId: 'site', repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32), appId: '456', installationId: '789',
  clientId: 'Iv1.example' };
const now = Date.parse('2026-11-22T12:00:00.000Z');
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const env = { GNR8_NATIVE_STUDIO_GITHUB_PRIVATE_KEY: privateKey.export({
  type: 'pkcs8', format: 'pem' }).toString() };
const token = 'ghs_' + 'a'.repeat(1000);
const client = {} as SupabaseClient;
const reader = (async () => site) as typeof configuredNativeStudioBootstrapSite;

function fixture(contentsPermission: 'read' | 'write' = 'write') {
  const result: Record<string, unknown> = { token,
    expires_at: new Date(now + 3_000_000).toISOString(),
    repositories: [{ id: 42 }],
    permissions: { contents: contentsPermission, metadata: 'read' } };
  const calls: string[] = [];
  const transport = (async (url: string, options: RequestInit) => {
    calls.push(url);
    assert.equal(url, 'https://api.github.com/app/installations/789/access_tokens');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(String(options.body)), {
      repository_ids: [42], permissions: { contents: contentsPermission } });
    const jwt = new Headers(options.headers).get('authorization')?.replace(/^Bearer /, '') ?? '';
    const [header, payload, signature] = jwt.split('.');
    assert.deepEqual(JSON.parse(Buffer.from(header!, 'base64url').toString()),
      { alg: 'RS256', typ: 'JWT' });
    assert.deepEqual(JSON.parse(Buffer.from(payload!, 'base64url').toString()), {
      iat: Math.floor(now / 1000) - 60, exp: Math.floor(now / 1000) + 540, iss: '456' });
    assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`),
      publicKey, Buffer.from(signature!, 'base64url')), true);
    return Response.json(result);
  }) as typeof fetch;
  return { calls, result, transport };
}

test('mints a short-lived token for the single bound repository', async () => {
  const f = fixture();
  assert.deepEqual(await issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, reader, now), {
    token, repositoryId: '42', expiresAt: f.result.expires_at });
  assert.equal(f.calls.length, 1);
});

test('can mint a repository-only read token for deployment verification', async () => {
  const f = fixture('read');
  assert.equal((await issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, reader, now, 'read')).repositoryId, '42');
});

test('rejects broad response scopes and changed site binding', async () => {
  const f = fixture();
  f.result.repositories = [{ id: 42 }, { id: 43 }];
  await assert.rejects(issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, reader, now), /token_repository_invalid/);
  f.result.repositories = [{ id: 42 }];
  f.result.permissions = { contents: 'write', administration: 'write' };
  await assert.rejects(issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, reader, now), /token_permissions_invalid/);
  f.result.permissions = { contents: 'write', metadata: 'read' };
  let reads = 0;
  const changedReader = (async () => (++reads === 1 ? site :
    { ...site, repositoryId: '43' })) as typeof configuredNativeStudioBootstrapSite;
  await assert.rejects(issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, changedReader, now), /target_changed/);
});

test('accepts a token created shortly after the request starts', async () => {
  const f = fixture();
  f.result.expires_at = new Date(now + 60 * 60 * 1000 + 30_000).toISOString();
  assert.equal((await issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, reader, now)).repositoryId, '42');
  f.result.expires_at = new Date(now + 63 * 60 * 1000).toISOString();
  await assert.rejects(issueConfiguredNativeStudioGitHubToken(scope, client,
    env, f.transport, reader, now), /token_expiry_invalid/);
});

test('fails before provider call when central key is absent', async () => {
  const f = fixture();
  await assert.rejects(issueConfiguredNativeStudioGitHubToken(scope, client,
    {}, f.transport, reader, now), /not_configured/);
  assert.equal(f.calls.length, 0);
});
