import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioResourceReservation } from './native-studio-resource-reservation-job';

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
    reserve: async (scope: typeof request.scope, received: SupabaseClient) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      calls.push('reserve');
      return { draftBucket: { bucket: 'private' } };
    },
    chainEnabled: () => false,
    enqueueSecretSetup: async () => { calls.push('enqueue'); },
  };
  return { calls, deps };
}

test('disabled reservation never opens storage or reaches a provider', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioResourceReservation(request,
    { ...f.deps, enabled: () => false }), /native_studio_resource_reservation_disabled/);
  assert.deepEqual(f.calls, []);
});

test('event cannot choose Cloudflare targets or another site', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioResourceReservation({ ...request,
    accountId: 'another-account' }, f.deps),
  /native_studio_resource_reservation_request_invalid/);
  await assert.rejects(runNativeStudioResourceReservation({ ...request,
    scope: { ...request.scope, siteId: '../another-site' } }, f.deps),
  /native_studio_resource_reservation_request_invalid/);
  assert.deepEqual(f.calls, ['enabled', 'enabled']);
});

test('revoked actor stops before resource reservation', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioResourceReservation(request, { ...f.deps,
    authorize: async () => { f.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(f.calls, ['enabled', 'client', 'authorize']);
});

test('authorized event enters the central scoped reservation once', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioResourceReservation(request, f.deps),
    { draftBucket: { bucket: 'private' } });
  assert.deepEqual(f.calls, ['enabled', 'client', 'authorize', 'reserve']);
});

test('verified reservation queues scoped secret setup when both stages are enabled', async () => {
  const f = fixture();
  await runNativeStudioResourceReservation(request, {
    ...f.deps, chainEnabled: () => true,
    enqueueSecretSetup: async (scope, actor) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(actor, request.actor);
      f.calls.push('enqueue');
    },
  });
  assert.deepEqual(f.calls, ['enabled', 'client', 'authorize',
    'reserve', 'enqueue']);
});

test('failed reservation cannot queue a following provider stage', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioResourceReservation(request, {
    ...f.deps, chainEnabled: () => true,
    reserve: async () => { throw Error('reservation pending'); },
  }), /reservation pending/);
  assert.equal(f.calls.includes('enqueue'), false);
});
