import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureCloudflareNativeWorkerReservation,
  ensureBoundCloudflareNativeWorkerReservations } from './cloudflare-studio-worker-reservation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const credential = 'c'.repeat(40);
const workerId = 'b'.repeat(32);

function fixture(mode: 'normal' | 'lost' | 'absent' = 'normal') {
  const saved = new Map<string, unknown>();
  const workers = new Map<string, Record<string, unknown>>();
  let creates = 0;
  const store = {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const transport = (async (url: string, options: RequestInit) => {
    const path = new URL(url).pathname;
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${credential}`);
    assert(path.startsWith(`/client/v4/accounts/${accountId}/workers/workers`));
    if (options.method === 'GET') {
      const worker = path.split('/').at(-1)!;
      const result = workers.get(worker);
      return result ? Response.json({ success: true, result })
        : new Response(null, { status: 404 });
    }
    assert.equal(options.method, 'POST');
    assert(path.endsWith('/workers/workers'));
    creates++;
    const body = JSON.parse(String(options.body));
    assert.deepEqual(body.subdomain, { enabled: false, previews_enabled: false });
    assert.match(body.name, /^gnr8-33333333-3333-4333-8333-333333333333-(studio|site)$/);
    if (mode !== 'absent') workers.set(body.name, { id: workerId,
      name: body.name, subdomain: body.subdomain });
    if (mode !== 'normal') throw Error('lost provider response');
    return Response.json({ success: true, result: workers.get(body.name) });
  }) as typeof fetch;
  return { store, transport, workers, creates: () => creates };
}

test('reserves both exact Workers without a deployment or public subdomain', async () => {
  const f = fixture();
  const studio = await ensureCloudflareNativeWorkerReservation(scope, accountId,
    'studio', credential, f.store, f.transport);
  const site = await ensureCloudflareNativeWorkerReservation(scope, accountId,
    'site', credential, f.store, f.transport);
  assert.deepEqual(studio, { worker: `gnr8-${scope.siteId}-studio`, id: workerId });
  assert.deepEqual(site, { worker: `gnr8-${scope.siteId}-site`, id: workerId });
  await ensureCloudflareNativeWorkerReservation(scope, accountId,
    'studio', credential, f.store, f.transport);
  assert.equal(f.creates(), 2);
});

test('lost response is reconciled; unconfirmed creation is not repeated', async () => {
  const recovered = fixture('lost');
  await ensureCloudflareNativeWorkerReservation(scope, accountId,
    'site', credential, recovered.store, recovered.transport);
  assert.equal(recovered.creates(), 1);
  const pending = fixture('absent');
  await assert.rejects(ensureCloudflareNativeWorkerReservation(scope, accountId,
    'studio', credential, pending.store, pending.transport),
  /native_studio_worker_reservation_pending/);
  await assert.rejects(ensureCloudflareNativeWorkerReservation(scope, accountId,
    'studio', credential, pending.store, pending.transport),
  /native_studio_worker_reservation_pending/);
  assert.equal(pending.creates(), 1);
});

test('existing public Worker or changed account fails closed before a create', async () => {
  const f = fixture();
  const worker = `gnr8-${scope.siteId}-site`;
  f.workers.set(worker, { name: worker, id: workerId,
    subdomain: { enabled: true, previews_enabled: false } });
  await assert.rejects(ensureCloudflareNativeWorkerReservation(scope, accountId,
    'site', credential, f.store, f.transport),
  /native_studio_worker_reservation_conflict/);
  assert.equal(f.creates(), 0);
  f.workers.set(worker, { name: worker, id: workerId,
    subdomain: { enabled: false, previews_enabled: false } });
  await ensureCloudflareNativeWorkerReservation(scope, accountId,
    'site', credential, f.store, f.transport);
  await assert.rejects(ensureCloudflareNativeWorkerReservation(scope,
    'd'.repeat(32), 'site', credential, f.store,
    (async () => { throw Error('unexpected provider call'); }) as typeof fetch),
  /native_studio_worker_reservation_conflict/);
  assert.equal(f.creates(), 0);
});

test('production boundary reads site and bound repository before creating Workers', async () => {
  const f = fixture();
  const client = { from(name: string) {
    const filters: Record<string, string> = {};
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() {
        assert.equal(filters.site_id ?? filters.id, scope.siteId);
        assert.equal(filters.agency_id, scope.agencyId);
        assert.equal(filters.client_id ?? filters.org_id, scope.clientId);
        return { error: null, data: name === 'sites'
          ? { domain: 'site.app.pasadenagenerator.com' }
          : { github_owner: 'pasadenagenerator', github_owner_id: 123,
              github_owner_kind: 'User', repository: 'gnr8-site-3333',
              repository_id: 456, binding_state: 'bound' } };
      } };
    return { select: () => query };
  } } as unknown as SupabaseClient;
  const result = await ensureBoundCloudflareNativeWorkerReservations(scope,
    client, accountId, credential, f.store, f.transport);
  assert.equal(result.studio.worker, `gnr8-${scope.siteId}-studio`);
  assert.equal(result.publicSite.worker, `gnr8-${scope.siteId}-site`);
  assert.equal(f.creates(), 2);
  let providerCalls = 0;
  const absent = { from(name: string) {
    return { select() { return { eq() { return this; },
      async maybeSingle() { return { error: null, data: name === 'sites'
        ? { domain: 'site.app.pasadenagenerator.com' } : null }; } }; } };
  } } as unknown as SupabaseClient;
  await assert.rejects(ensureBoundCloudflareNativeWorkerReservations(scope,
    absent, accountId, credential, fixture().store,
    (async () => { providerCalls++; throw Error('unexpected provider call'); }) as typeof fetch),
  /native_studio_worker_reservation_scope_unverified/);
  assert.equal(providerCalls, 0);
});
