import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioResourceReservation,
  NATIVE_STUDIO_RESOURCE_RECEIPT, readNativeStudioBootstrapTarget,
  reserveConfiguredNativeStudioResources,
} from './native-studio-configured-resource-reservation';

const valid = {
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER: 'r'.repeat(40),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR: 'w'.repeat(40),
};

test('resource reservation requires both central provider capabilities', () => {
  for (const key of Object.keys(valid)) {
    const env = { ...valid } as Record<string, string>;
    delete env[key];
    assert.throws(() => configuredNativeStudioResourceReservation(env),
      /native_studio_resource_reservation_not_configured/);
  }
  assert.deepEqual(configuredNativeStudioResourceReservation(valid), {
    accountId: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    r2Manager: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER,
    workerCreator: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR,
  });
});

test('one approved account token can back both reservation roles', () => {
  const central = 'z'.repeat(40);
  const env = { GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_TOKEN: central };
  assert.deepEqual(configuredNativeStudioResourceReservation(env), {
    accountId: env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    r2Manager: central, workerCreator: central,
  });
  assert.equal(configuredNativeStudioResourceReservation({ ...env,
    GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER }).r2Manager,
  valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER);
});

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };

function currentTarget() {
  let domain = 'site.app.pasadenagenerator.com';
  let state = 'bound';
  const client = { from(name: string) {
    const filters: Record<string, string> = {};
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() {
        assert.equal(filters.site_id ?? filters.id, scope.siteId);
        assert.equal(filters.agency_id, scope.agencyId);
        assert.equal(filters.client_id ?? filters.org_id, scope.clientId);
        return { error: null, data: name === 'sites' ? { domain } : {
          github_owner: 'pasadenagenerator', github_owner_id: 123,
          github_owner_kind: 'User', repository: 'gnr8-site-3333',
          repository_id: state === 'bound' ? 456 : null, binding_state: state,
        } };
      } };
    return { select: () => query };
  } } as unknown as SupabaseClient;
  return { client, changeDomain: (value: string) => { domain = value; },
    changeState: (value: string) => { state = value; } };
}

test('bootstrap target comes from the current scoped site and bound repository', async () => {
  const f = currentTarget();
  assert.deepEqual(await readNativeStudioBootstrapTarget(scope, f.client, valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID), {
    scope, accountId: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    studioOrigin: 'https://site.app.pasadenagenerator.com',
    repository: 'pasadenagenerator/gnr8-site-3333', repositoryId: 456,
  });
  f.changeState('reserved');
  await assert.rejects(readNativeStudioBootstrapTarget(scope, f.client,
    valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID), /site_github_binding_pending/);
});

test('reservation returns the verified target and rejects drift during provider work', async () => {
  const f = currentTarget();
  const draft = { bucket: `gnr8-${scope.siteId}-drafts`, bucketId: 'b'.repeat(32) };
  const workers = { studio: { worker: `gnr8-${scope.siteId}-studio`, id: 'c'.repeat(32) },
    publicSite: { worker: `gnr8-${scope.siteId}-site`, id: 'd'.repeat(32) } };
  const deps = { draft: async () => draft, workers: async () => workers };
  const saved = new Map<string, unknown>();
  const store = { read: async (key: string) => saved.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    } };
  const makeStore = () => store as any;
  const result = await reserveConfiguredNativeStudioResources(scope, f.client,
    valid, (async () => { throw Error('unexpected provider call'); }) as typeof fetch,
    deps, makeStore);
  assert.deepEqual(result, { draftBucket: draft, workers, target: {
    scope, accountId: valid.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    studioOrigin: 'https://site.app.pasadenagenerator.com',
    repository: 'pasadenagenerator/gnr8-site-3333', repositoryId: 456,
  } });
  assert.deepEqual(saved.get(NATIVE_STUDIO_RESOURCE_RECEIPT), result);
  assert.deepEqual(await reserveConfiguredNativeStudioResources(scope, f.client,
    valid, (async () => { throw Error('unexpected provider call'); }) as typeof fetch,
    deps, makeStore), result);
  await assert.rejects(reserveConfiguredNativeStudioResources(scope, f.client,
    valid, (async () => { throw Error('unexpected provider call'); }) as typeof fetch,
    { ...deps, workers: async () => ({ ...workers,
      studio: { ...workers.studio, id: 'e'.repeat(32) } }) }, makeStore),
  /native_studio_resource_receipt_conflict/);
  const drifting = { ...deps, draft: async () => { f.changeDomain('changed.example.com'); return draft; } };
  await assert.rejects(reserveConfiguredNativeStudioResources(scope, f.client,
    valid, (async () => { throw Error('unexpected provider call'); }) as typeof fetch,
    drifting, makeStore), /native_studio_bootstrap_target_changed/);
});
