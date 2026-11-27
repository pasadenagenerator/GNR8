import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioDetachedDeploy } from './native-studio-configured-detached-deploy';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40),
  workerId = 'c'.repeat(32);
const site = { siteId: scope.siteId, accountId: 'd'.repeat(32),
  repository: 'pasadenagenerator/example', repositoryId: '42',
  branch: 'main', studioOrigin: 'https://example.app.pasadenagenerator.com' };
const input = { scope, client: {} as SupabaseClient, sourceId,
  sourceCommit, workerId, trustedGit: '/usr/bin/git' };
const env = { GNR8_NATIVE_STUDIO_DEPLOY_SNAPSHOT: 'snap_deploy',
  GNR8_NATIVE_STUDIO_DEPLOY_WRANGLER_PATH: '/usr/local/bin/wrangler',
  GNR8_NATIVE_STUDIO_DEPLOY_SANDBOX_TIMEOUT_MS: String(60 * 60_000) };

test('passes exact verified checkout and lazy credentials to detached deploy', async () => {
  const calls: string[] = [];
  const store = { read: async () => null, claim: async () => true };
  const credentials = { cloudflareCredential: 'e'.repeat(40),
    secrets: { AI_API_KEY: 'a'.repeat(16) } };
  const deps = {
    withCheckout: async (_request: unknown, use: (value: unknown) => Promise<unknown>) => {
      calls.push('checkout');
      return use({ project: '/verified/project', store, site,
        sourceId, commit: sourceCommit, workerId, files: 3 });
    },
    verifyPreflight: async (value: any) => {
      calls.push('preflight');
      assert.equal(value.project, '/verified/project');
      return { sourceId, commit: sourceCommit, workerId, files: 3 };
    },
    credentials: async () => { calls.push('credentials'); return credentials; },
    prepareIntent: async () => { calls.push('intent'); return {
      state: 'prepared', commit: sourceCommit, tag: 'gnr8-first-' + 'f'.repeat(64) }; },
    inspect: async () => { calls.push('inspect'); return {
      state: 'pending', workerId }; },
    advance: async (value: any) => {
      calls.push('advance');
      assert.equal(value.artifactProject, '/verified/project');
      assert.equal(value.snapshotId, 'snap_deploy');
      assert.equal(value.wranglerPath, '/usr/local/bin/wrangler');
      assert.deepEqual(value.networkPolicy, { allow: ['api.cloudflare.com'] });
      assert.equal(value.store, store);
      assert.equal(value.commit, sourceCommit);
      assert.deepEqual(calls, ['checkout', 'preflight', 'advance']);
      assert.equal((await value.loadCredentials()).cloudflareCredential,
        credentials.cloudflareCredential);
      await value.prepareIntent(credentials);
      await value.inspect(credentials.cloudflareCredential, 'tag');
      return { state: 'running', commit: sourceCommit };
    },
  } as any;
  assert.deepEqual(await configuredNativeStudioDetachedDeploy(input, env,
    (async () => { throw Error('provider call'); }) as typeof fetch, deps),
  { state: 'running', commit: sourceCommit });
  assert.deepEqual(calls, ['checkout', 'preflight', 'advance',
    'credentials', 'intent', 'inspect']);
});

test('missing deploy snapshot and altered preflight stop before credentials', async () => {
  let checkout = 0;
  const deps = { withCheckout: async (_request: unknown,
    use: (value: unknown) => Promise<unknown>) => {
    checkout++;
    return use({ project: '/verified/project', store: {}, site,
      sourceId, commit: sourceCommit, workerId, files: 3 });
  }, verifyPreflight: async () => ({ sourceId, commit: '0'.repeat(40),
    workerId, files: 3 }), credentials: async () => {
    throw Error('credentials reached'); }, advance: async () => {
    throw Error('deploy reached'); } } as any;
  await assert.rejects(configuredNativeStudioDetachedDeploy(input,
    { ...env, GNR8_NATIVE_STUDIO_DEPLOY_SNAPSHOT: '' }, fetch, deps),
  /not_configured/);
  assert.equal(checkout, 0);
  await assert.rejects(configuredNativeStudioDetachedDeploy(input, env,
    fetch, deps), /preflight_unverified/);
  assert.equal(checkout, 1);
});
