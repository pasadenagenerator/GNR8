import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordNativeStudioFirstOpen,
  readNativeStudioLaunchForScope } from './native-studio-first-open';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.app.pasadenagenerator.com',
  accountId: 'a'.repeat(32), appId: '12', installationId: '34', clientId: 'Iv1.test' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40);
const studioWorkerId = 'd'.repeat(32), publicWorkerId = 'e'.repeat(32);
const studioVersionId = '44444444-4444-4444-8444-444444444444';
const publicVersionId = '55555555-5555-4555-8555-555555555555';
const tag = `gnr8-first-${'f'.repeat(64)}`;
const db = {} as SupabaseClient;

function fixture() {
  const saved = new Map<string, unknown>([['native-studio/build-handoff-v1.json', {
    scope, sourceId, commit, workerId: studioWorkerId,
    site: { siteId: site.siteId, repository: site.repository, branch: site.branch,
      studioOrigin: site.studioOrigin, accountId: site.accountId },
    files: [{ path: 'dist/index.html', bytes: 4, sha256: 'a'.repeat(64) }],
  }]]);
  const store = { read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
    getBytes: async () => Buffer.alloc(0),
    claim: async (key: string, value: unknown) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  const input = { scope, client: db, store, sourceId, commit, tag,
    studioWorkerId, publicWorkerId,
    studioCredential: 'g'.repeat(40), publicCredential: 'h'.repeat(40),
    githubCredential: 'ghs_' + 'i'.repeat(40) };
  const calls = { studio: 0, gateway: 0, entry: 0, github: 0 };
  const deps = {
    site: async () => site,
    source: async () => ({ receipt: { format: 'gnr8-native-studio-source:v1',
      identitySha256: sourceId } }),
    candidates: async () => [],
    accessEntry: async () => { throw Error('unexpected_access_entry'); },
    studio: async () => { calls.studio++; return { state: 'verified-source-control-plane' as const,
      workerId: studioWorkerId, versionId: studioVersionId }; },
    gateway: async () => { calls.gateway++; return { state: 'observed-control-plane' as const,
      workerId: publicWorkerId, versionId: publicVersionId,
      domainId: '66666666-6666-4666-8666-666666666666' }; },
    entry: async () => { calls.entry++; return { state: 'public-studio-entry-healthy' as const,
      studioOrigin: site.studioOrigin }; },
    githubHead: async () => { calls.github++; return { repositoryId: site.repositoryId,
      branch: site.branch, commit }; },
  };
  return { saved, store, input, deps, calls };
}

test('Access first-open verifies dual-host binding, policy and both challenges', async () => {
  const f = fixture();
  const zoneId = '7'.repeat(32);
  const appId = '8'.repeat(32);
  const aud = 'a'.repeat(64);
  const teamDomain = 'gnr8.cloudflareaccess.com';
  const admins = ['access:owner@example.com'];
  const previewOrigin = `https://preview.${new URL(site.studioOrigin).hostname}`;
  const access = { version: 2, provider: 'access', aud, teamDomain, admins };
  let entryChecks = 0;
  let sourceProof: unknown;
  const deps = { ...f.deps,
    source: async () => ({ receipt: { format: 'gnr8-native-studio-source:v2',
      identitySha256: sourceId, access } }),
    candidates: async () => admins.map(principal => ({ principal })),
    accessBinding: async ({ zoneId: receivedZone }: { zoneId: string }) => {
      if (receivedZone !== zoneId) throw Error('native_studio_first_open_access_unverified');
      return { target: { scope, accountId: site.accountId,
      studioOrigin: site.studioOrigin, repository: site.repository,
      repositoryId: Number(site.repositoryId) },
      appId, aud, teamDomain, previewOrigin }; },
    accessEntry: async () => { entryChecks++;
      return { state: 'observed-access-entry' as const, appId, aud, teamDomain,
        studioOrigin: site.studioOrigin, memberCount: 1,
        protection: 'studio-and-preview' as const, previewOrigin }; },
    studio: async (...args: unknown[]) => { sourceProof = args[8];
      return { state: 'verified-source-control-plane' as const,
        workerId: studioWorkerId, versionId: studioVersionId }; },
  };
  const input = { ...f.input, accessZoneId: zoneId,
    accessCredential: 'manager-token-' + 'a'.repeat(30) };
  await recordNativeStudioFirstOpen(input, deps as any);
  assert.equal(entryChecks, 1);
  assert.equal(f.calls.entry, 0);
  assert.deepEqual(sourceProof, { store: f.store, sourceId, commit, site });
  await assert.rejects(recordNativeStudioFirstOpen({ ...input, accessZoneId: '0'.repeat(32) },
    deps as any), /access_unverified/);
  assert.equal(entryChecks, 1);
  await assert.rejects(recordNativeStudioFirstOpen(input, {
    ...deps, candidates: async () => [{ principal: 'access:other@example.com' }],
  } as any), /access_unverified/);
  assert.equal(entryChecks, 1);
  await assert.rejects(recordNativeStudioFirstOpen(input, {
    ...deps, accessEntry: async () => ({ state: 'observed-access-entry' as const,
      appId, aud, teamDomain, studioOrigin: site.studioOrigin,
      memberCount: 1, protection: 'studio-and-preview' as const,
      previewOrigin: 'https://preview.other.example.com' }),
  } as any), /access_unverified/);
});

test('verified first-open proof gives a labelled native link without claiming ready', async () => {
  const f = fixture();
  const receipt = await recordNativeStudioFirstOpen(f.input, f.deps as any);
  assert.equal(receipt.sourceId, sourceId);
  assert.equal(receipt.studioVersionId, studioVersionId);
  assert.equal(receipt.publicVersionId, publicVersionId);
  assert.deepEqual(f.calls, { studio: 1, gateway: 1, entry: 1, github: 1 });
  const launch = await readNativeStudioLaunchForScope(scope, db,
    { GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED: '1' }, {
      site: f.deps.site as any, store: () => f.store,
      ready: async () => { throw Error('native_studio_binding_missing'); },
    });
  assert.deepEqual(launch, { kind: 'first-open', url: `${site.studioOrigin}/studio` });
  assert.deepEqual(await recordNativeStudioFirstOpen(f.input, f.deps as any), receipt);
});

test('missing build handoff or wrong active target never creates a first-open link', async () => {
  const f = fixture();
  f.saved.delete('native-studio/build-handoff-v1.json');
  await assert.rejects(recordNativeStudioFirstOpen(f.input, f.deps as any), /source_unverified/);
  assert.deepEqual(f.calls, { studio: 0, gateway: 0, entry: 0, github: 0 });
  const absent = await readNativeStudioLaunchForScope(scope, db,
    { GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED: '1' }, {
      site: f.deps.site as any, store: () => f.store,
      ready: async () => { throw Error('native_studio_binding_missing'); },
    });
  assert.equal(absent, null);
  f.deps.gateway = async () => { f.calls.gateway++; return {
    state: 'pending' as any, workerId: publicWorkerId,
    versionId: publicVersionId, domainId: '9'.repeat(32) }; };
  f.saved.set('native-studio/build-handoff-v1.json', fixture().saved.get('native-studio/build-handoff-v1.json'));
  await assert.rejects(recordNativeStudioFirstOpen(f.input, f.deps as any), /unverified/);
  assert.equal(f.saved.has('native-studio/first-open-v1.json'), false);
});

test('GitHub must expose the exact saved commit before first sign-in', async () => {
  const f = fixture();
  await assert.rejects(recordNativeStudioFirstOpen({ ...f.input,
    githubCredential: '' }, f.deps as any), /input_invalid/);
  await assert.rejects(recordNativeStudioFirstOpen({ ...f.input,
    githubCredential: 'ghs_' + 'a'.repeat(501) }, f.deps as any),
  /upstream_github_token_incompatible/);
  assert.deepEqual(f.calls, { studio: 0, gateway: 0, entry: 0, github: 0 });
  await assert.rejects(recordNativeStudioFirstOpen(f.input,
    { ...f.deps, githubHead: async () => ({ repositoryId: site.repositoryId,
      branch: site.branch, commit: '0'.repeat(40) }) } as any), /unverified/);
  assert.equal(f.saved.has('native-studio/first-open-v1.json'), false);
});

test('first-open forwards the exact public deployment tag to gateway readback', async () => {
  const f = fixture();
  const publicTag = `gnr8-public-first-${'9'.repeat(64)}`;
  let received: string | undefined;
  await recordNativeStudioFirstOpen({ ...f.input, publicTag }, {
    ...f.deps,
    gateway: async (_scope: any, _client: any, _account: any,
      _worker: any, _credential: any, _transport: any, tag: string) => {
      received = tag;
      return { state: 'observed-control-plane' as const,
        workerId: publicWorkerId, versionId: publicVersionId,
        domainId: '9'.repeat(32) };
    },
  } as any);
  assert.equal(received, publicTag);
  await assert.rejects(recordNativeStudioFirstOpen({ ...f.input,
    publicTag: 'other' }, f.deps as any), /input_invalid/);
});

test('ready binding wins; stale binding and changed receipt fail closed', async () => {
  const f = fixture();
  await recordNativeStudioFirstOpen(f.input, f.deps as any);
  const dependencies = { site: f.deps.site as any, store: () => f.store,
    ready: async () => site };
  assert.deepEqual(await readNativeStudioLaunchForScope(scope, db,
    { GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED: '1' }, dependencies),
  { kind: 'ready', url: `${site.studioOrigin}/studio` });
  assert.equal(await readNativeStudioLaunchForScope(scope, db,
    { GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED: '1' }, {
      ...dependencies, ready: async () => { throw Error('native_studio_binding_stale'); },
    }), null);
  assert.equal(await readNativeStudioLaunchForScope(scope, db, {}, {
    ...dependencies, ready: async () => { throw Error('native_studio_binding_missing'); },
  }), null);
  assert.equal(await readNativeStudioLaunchForScope(scope, db,
    { GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED: '1' }, {
      ...dependencies, site: async () => ({ ...site, repositoryId: '43' }),
      ready: async () => { throw Error('native_studio_binding_missing'); },
    }), null);
});
