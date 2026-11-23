import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioImagePush } from './native-studio-configured-image-push';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const request = { scope, client: {} as SupabaseClient,
  sourceId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40),
  workerId: 'c'.repeat(32), trustedGit: '/usr/bin/git' };
const accountId = 'd'.repeat(32);
const site = { siteId: scope.siteId, accountId };
const configured = {
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED: '1',
  GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT: 'snap_build',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT: 'snap_push',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_NETWORK_HOSTS:
    'api.cloudflare.com,registry.cloudflare.com',
  GNR8_NATIVE_STUDIO_IMAGE_DOCKER_PATH: '/usr/bin/docker',
  GNR8_NATIVE_STUDIO_IMAGE_WRANGLER_PATH: '/usr/local/bin/wrangler',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_SANDBOX_TIMEOUT_MS: String(60 * 60_000),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: accountId,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER: 'e'.repeat(48),
};

function fixture() {
  const calls: string[] = [];
  const records = new Map<string, unknown>();
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async () => true };
  const deps = {
    snapshot: async ({ snapshotId }: { snapshotId: string }) => {
      calls.push(`snapshot:${snapshotId}`);
      return { status: 'created', expiresAt: new Date(Date.now() + 3 * 60 * 60_000) };
    },
    withCheckout: async (input: typeof request, use: (value: any) => Promise<any>) => {
      calls.push('checkout'); assert.deepEqual(input, request);
      return use({ project: '/tmp/verified', store, site,
        sourceId: request.sourceId, commit: request.sourceCommit,
        workerId: request.workerId, files: 2 });
    },
    advance: async (input: any) => {
      calls.push('advance');
      assert.deepEqual(input.pushNetworkPolicy,
        { allow: ['api.cloudflare.com', 'registry.cloudflare.com'] });
      assert.equal(input.project, '/tmp/verified');
      assert.equal(input.site, site);
      assert.equal(input.store, store);
      assert.equal(input.cloudflareCredential, undefined);
      assert.equal(input.sandboxTimeoutMs, 60 * 60_000);
      assert.equal(input.dockerPath, '/usr/bin/docker');
      assert.equal(input.wranglerPath, '/usr/local/bin/wrangler');
      const credential = await input.loadCredential();
      calls.push('credential');
      assert.equal(credential, configured.GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER);
      return { state: 'running' };
    },
  };
  return { calls, deps, records };
}

test('configured push uses verified checkout and central token only after phase gate', async () => {
  const f = fixture();
  const result = await configuredNativeStudioImagePush(request, configured,
    (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps as any);
  assert.deepEqual(result, { state: 'running' });
  assert.deepEqual(f.calls, ['checkout', 'snapshot:snap_build',
    'snapshot:snap_push', 'advance', 'credential']);
});

test('missing setup stops before checkout or token access', async () => {
  const f = fixture();
  await assert.rejects(configuredNativeStudioImagePush(request, {
    ...configured, GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED: '0',
  }, fetch, f.deps as any), /not_configured/);
  await assert.rejects(configuredNativeStudioImagePush(request, {
    ...configured, GNR8_NATIVE_STUDIO_IMAGE_PUSH_NETWORK_HOSTS: '*',
  }, fetch, f.deps as any), /not_configured/);
  assert.deepEqual(f.calls, []);
});

test('foreign Cloudflare account stops before Drive phase', async () => {
  const f = fixture();
  await assert.rejects(configuredNativeStudioImagePush(request, {
    ...configured, GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'f'.repeat(32),
  }, fetch, f.deps as any), /target_changed/);
  assert.equal(f.calls.includes('advance'), false);
});

test('an existing receiver bypasses the new snapshot TTL gate', async () => {
  const f = fixture();
  f.records.set('native-studio/image-push-receiver-intent-v1.json',
    { scoped: true });
  f.deps.snapshot = async () => { throw Error('snapshot expired'); };
  assert.deepEqual(await configuredNativeStudioImagePush(request, configured,
    fetch, f.deps as any), { state: 'running' });
  assert.deepEqual(f.calls, ['checkout', 'advance', 'credential']);
});
