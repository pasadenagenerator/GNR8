import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioSandboxBuild } from './native-studio-configured-sandbox-build';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32), appId: '456', installationId: '789',
  clientId: 'Iv1.example' };
const sourceId = 'b'.repeat(64);
const env = { GNR8_NATIVE_STUDIO_BUILD_SNAPSHOT: 'snap_verified' };
const client = {} as SupabaseClient;

test('coordinator reads scoped source and passes only its bytes to the build', async () => {
  const calls: string[] = [];
  const files = [{ path: 'package.json', body: Buffer.from('{}') }];
  const store = { read: async () => null, claim: async () => true };
  const deps = {
    snapshot: async ({ snapshotId }: {snapshotId:string}) => {
      assert.equal(snapshotId, env.GNR8_NATIVE_STUDIO_BUILD_SNAPSHOT);
      calls.push('snapshot'); return { status: 'created' }; },
    site: async () => { calls.push('site'); return site; },
    store: () => store,
    source: async ({ sourceId: id, site: target }: {sourceId:string;site:typeof site}) => {
      assert.equal(id, sourceId); assert.equal(target, site);
      calls.push('source'); return { files }; },
    build: async (input: {siteId:string;sourceId:string;snapshotId:string;files:typeof files;store:typeof store}) => {
      assert.deepEqual(input, { siteId: scope.siteId, sourceId,
        snapshotId: env.GNR8_NATIVE_STUDIO_BUILD_SNAPSHOT, files, store });
      calls.push('build'); return { state: 'complete', artifactDir: '/private/tmp/fake', files: [], sourceId }; },
  } as any;
  await configuredNativeStudioSandboxBuild(scope, client, sourceId, env, deps);
  assert.deepEqual(calls, ['snapshot', 'site', 'source', 'build', 'site']);
});

test('changed authoritative binding discards the untrusted build artifact', async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-build-target-change-'));
  let reads = 0;
  const deps = {
    snapshot: async () => ({ status: 'created' }),
    site: async () => ++reads === 1 ? site : { ...site, repositoryId: '43' },
    store: () => ({}),
    source: async () => ({ files: [] }),
    build: async () => ({ state: 'complete', artifactDir, files: [], sourceId }),
  } as any;
  await assert.rejects(configuredNativeStudioSandboxBuild(scope, client,
    sourceId, env, deps), /target_changed/);
  await assert.rejects(stat(artifactDir), { code: 'ENOENT' });
});

test('failed target re-read also discards the untrusted build artifact', async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-build-target-read-'));
  let reads = 0;
  const deps = {
    snapshot: async () => ({ status: 'created' }),
    site: async () => { if (++reads === 1) return site; throw Error('store unavailable'); },
    store: () => ({}), source: async () => ({ files: [] }),
    build: async () => ({ state: 'complete', artifactDir, files: [], sourceId }),
  } as any;
  await assert.rejects(configuredNativeStudioSandboxBuild(scope, client,
    sourceId, env, deps), /target_unavailable/);
  await assert.rejects(stat(artifactDir), { code: 'ENOENT' });
});

test('missing or expired snapshot fails before reading source', async () => {
  let sourceReads = 0;
  const deps = {
    snapshot: async () => ({ status: 'created', expiresAt: new Date(0) }),
    source: async () => { sourceReads++; return { files: [] }; },
  } as any;
  await assert.rejects(configuredNativeStudioSandboxBuild(scope, client,
    sourceId, env, deps), /snapshot_unavailable/);
  assert.equal(sourceReads, 0);
  await assert.rejects(configuredNativeStudioSandboxBuild(scope, client,
    sourceId, {}, deps), /not_configured/);
  assert.equal(sourceReads, 0);
});
