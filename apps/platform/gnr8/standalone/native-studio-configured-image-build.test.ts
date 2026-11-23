import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioImageBuild } from './native-studio-configured-image-build';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40),
  workerId = 'c'.repeat(32), accountId = 'd'.repeat(32);
const site = { siteId: scope.siteId, accountId,
  repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  appId: '456', installationId: '789', clientId: 'Iv1.example' };
const input = { scope, client: {} as SupabaseClient, sourceId,
  sourceCommit, workerId, trustedGit: '/usr/bin/git' };
const env = { GNR8_NATIVE_STUDIO_IMAGE_BUILD_ENABLED: '1',
  GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT: 'snap_build',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT: 'snap_push',
  GNR8_NATIVE_STUDIO_IMAGE_BUILD_NETWORK_HOSTS:
    'registry-1.docker.io,auth.docker.io,production.cloudfront.docker.com' };

function fixture() {
  const events: string[] = [];
  const store = { read: async () => null, claim: async () => true };
  const files = [{ path: 'studio/Dockerfile', body: Buffer.from('trusted') }];
  const receipt = { sourceId, commit: sourceCommit, workerId, scope,
    siteId: scope.siteId, accountId,
    archive: { bytes: 17, sha256: 'e'.repeat(64) } };
  const deps = {
    snapshot: async ({ snapshotId }: { snapshotId: string }) => {
      events.push(`snapshot:${snapshotId}`); return { status: 'created' }; },
    withCheckout: async (_request: typeof input, use: (value: any) => Promise<any>) => {
      events.push('checkout');
      return use({ project: '/verified/checkout', store, site,
        sourceId, commit: sourceCommit, workerId, files: 2 });
    },
    source: async ({ store: actual, sourceId: id, site: target }: any) => {
      events.push('source'); assert.equal(actual, store);
      assert.equal(id, sourceId); assert.equal(target, site);
      return { files };
    },
    phase: async (value: any) => {
      events.push('phase');
      assert.deepEqual(value.buildNetworkPolicy, {
        allow: ['registry-1.docker.io', 'auth.docker.io',
          'production.cloudfront.docker.com'] });
      assert.equal(value.store, store);
      assert.equal(value.commit, sourceCommit);
      assert.equal(value.buildSnapshotId, 'snap_build');
      assert.equal(value.pushSnapshotId, 'snap_push');
      return value.build({} as any, '/gnr8-image/image.tar');
    },
    build: async (_sandbox: any, archivePath: string, value: any) => {
      events.push('build');
      assert.equal(archivePath, '/gnr8-image/image.tar');
      assert.equal(value.files, files);
      assert.equal(value.commit, sourceCommit);
      return receipt;
    },
  } as any;
  return { deps, events, receipt };
}

test('only verified stored source bytes reach the isolated build phase', async () => {
  const f = fixture();
  assert.equal(await configuredNativeStudioImageBuild(input, env,
    (async () => { throw Error('provider call'); }) as typeof fetch, f.deps),
  f.receipt);
  assert.deepEqual(f.events, ['snapshot:snap_build', 'snapshot:snap_push',
    'checkout', 'source', 'phase', 'build']);
});

test('unconfigured switch or unsafe network fails before any checkout', async () => {
  const f = fixture();
  await assert.rejects(configuredNativeStudioImageBuild(input,
    { ...env, GNR8_NATIVE_STUDIO_IMAGE_BUILD_ENABLED: '0' },
    fetch, f.deps), /not_configured/);
  await assert.rejects(configuredNativeStudioImageBuild(input,
    { ...env, GNR8_NATIVE_STUDIO_IMAGE_BUILD_NETWORK_HOSTS: '*.example.com' },
    fetch, f.deps), /network_unconfigured/);
  assert.deepEqual(f.events, []);
});

test('expired snapshot or mismatched checkout blocks source read', async () => {
  const expired = fixture();
  expired.deps.snapshot = async () => ({ status: 'created', expiresAt: new Date(0) });
  await assert.rejects(configuredNativeStudioImageBuild(input, env, fetch,
    expired.deps), /snapshot_unavailable/);
  assert.equal(expired.events.includes('source'), false);
  const changed = fixture();
  changed.deps.withCheckout = async (_request: typeof input,
    use: (value: any) => Promise<any>) => use({
      sourceId, commit: 'f'.repeat(40), workerId, site,
      store: { read: async () => null, claim: async () => true }, files: 2 });
  await assert.rejects(configuredNativeStudioImageBuild(input, env, fetch,
    changed.deps), /checkout_unverified/);
  assert.equal(changed.events.includes('source'), false);
});
