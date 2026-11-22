import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fingerprint } from '@/gnr8/standalone/publication-contract';
import { requireNativeStudioResourceReservation,
  runNativeStudioSecretSetup } from './native-studio-secret-setup-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444' };

function fixture() {
  const calls: string[] = [];
  const client = {} as SupabaseClient;
  const deps = {
    enabled: () => { calls.push('enabled'); return true; },
    client: async () => { calls.push('client'); return client; },
    authorize: async (received: SupabaseClient, actor: string, agencyId: string) => {
      assert.equal(received, client);
      assert.equal(actor, request.actor);
      assert.equal(agencyId, request.scope.agencyId);
      calls.push('authorize');
    },
    requireReservation: async () => { calls.push('reservation'); },
    install: async (scope: typeof request.scope, received: SupabaseClient) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      calls.push('install');
      return { worker: `gnr8-${scope.siteId}-studio`, secretNames: [] as readonly string[] };
    },
  };
  return { calls, deps };
}

test('disabled setup never reads storage or reaches a provider', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioSecretSetup(request,
    { ...f.deps, enabled: () => false }), /native_studio_secret_setup_disabled/);
  assert.deepEqual(f.calls, []);
});

test('event payload cannot override provider target or contain extra fields', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioSecretSetup({ ...request,
    accountId: 'another-account' }, f.deps),
  /native_studio_secret_setup_request_invalid/);
  await assert.rejects(runNativeStudioSecretSetup({ ...request,
    scope: { ...request.scope, siteId: '../another-site' } }, f.deps),
  /native_studio_secret_setup_request_invalid/);
  assert.deepEqual(f.calls, ['enabled', 'enabled']);
});

test('revoked actor stops before bucket and secret installation', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioSecretSetup(request, { ...f.deps,
    authorize: async () => { f.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(f.calls, ['enabled', 'client', 'authorize']);
});

test('authorized event enters the central scoped installer once', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioSecretSetup(request, f.deps),
    { worker: `gnr8-${request.scope.siteId}-studio`, secretNames: [] });
  assert.deepEqual(f.calls, ['enabled', 'client', 'authorize',
    'reservation', 'install']);
});

test('missing resource receipt stops before any secret provider call', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioSecretSetup(request, {
    ...f.deps,
    requireReservation: async () => { f.calls.push('reservation');
      throw Error('native_studio_secret_setup_reservation_missing'); },
  }), /reservation_missing/);
  assert.deepEqual(f.calls, ['enabled', 'client', 'authorize', 'reservation']);
});

test('stored reservation must still match current repository and domain', async t => {
  const accountId = 'a'.repeat(32);
  const previous = process.env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID;
  process.env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID = accountId;
  t.after(() => { if (previous === undefined)
    delete process.env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID;
    else process.env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID = previous; });
  let receipt = { target: { scope: request.scope, accountId,
    studioOrigin: 'https://site.app.pasadenagenerator.com',
    repository: 'example/site', repositoryId: 42 },
  draftBucket: { bucket: `gnr8-${request.scope.siteId}-drafts`,
    bucketId: 'b'.repeat(32) },
  workers: { studio: { worker: `gnr8-${request.scope.siteId}-studio`,
    id: 'c'.repeat(32) },
    publicSite: { worker: `gnr8-${request.scope.siteId}-site`,
      id: 'd'.repeat(32) } } };
  const client = {
    storage: { getBucket: async () => ({ data: { public: false }, error: null }),
      from: () => ({ download: async () => ({ data: new Blob([
        JSON.stringify({ value: receipt, sha256: fingerprint(receipt) })]),
        error: null }) }) },
    from(name: string) {
      const query = { select() { return query; }, eq() { return query; },
        async maybeSingle() { return { error: null,
          data: name === 'sites'
            ? { domain: 'site.app.pasadenagenerator.com' }
            : { github_owner: 'example', github_owner_id: 12,
                github_owner_kind: 'User', repository: 'site',
                repository_id: 42, binding_state: 'bound' } }; } };
      return query;
    },
  } as unknown as SupabaseClient;
  await requireNativeStudioResourceReservation(request.scope, client);
  receipt = { ...receipt, target: { ...receipt.target,
    repository: 'example/other' } };
  await assert.rejects(requireNativeStudioResourceReservation(request.scope,
    client), /reservation_missing/);
});
