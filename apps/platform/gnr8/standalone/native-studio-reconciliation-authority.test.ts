import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SCHEDULED_NATIVE_STUDIO_RECONCILIATION,
  isNativeStudioReconciliationActor,
  requireNativeStudioReconciliationAuthority } from './native-studio-reconciliation-authority';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const actor = '44444444-4444-4444-8444-444444444444';
const client = {} as SupabaseClient;

test('scheduled authority needs the exact in-process token and current scoped admin', async () => {
  const calls: string[] = [];
  const deps = { scheduledEnabled: () => true,
    candidates: async (received: typeof scope, receivedClient: SupabaseClient) => {
      assert.deepEqual(received, scope);
      assert.equal(receivedClient, client);
      calls.push('candidates');
      return [{ userId: actor, principal: 'access:owner@example.com',
        role: 'owner' as const }];
    },
    human: async () => { calls.push('human'); return { userId: actor }; },
  };
  assert.equal(isNativeStudioReconciliationActor(
    SCHEDULED_NATIVE_STUDIO_RECONCILIATION), true);
  assert.equal(isNativeStudioReconciliationActor(Symbol.for(
    'scheduled-native-studio-reconciliation')), false);
  assert.equal(isNativeStudioReconciliationActor('system'), false);
  assert.deepEqual(await requireNativeStudioReconciliationAuthority(client,
    { actor: SCHEDULED_NATIVE_STUDIO_RECONCILIATION, scope }, deps as any),
  { kind: 'system' });
  assert.deepEqual(calls, ['candidates']);
  await assert.rejects(requireNativeStudioReconciliationAuthority(client,
    { actor: Symbol.for('scheduled-native-studio-reconciliation') as any,
      scope }, deps as any), /authority_invalid/);
  assert.deepEqual(calls, ['candidates']);
});

test('disabled schedule and absent current admin cannot authorize system work', async () => {
  const disabled = { scheduledEnabled: () => false,
    candidates: async () => { throw Error('unexpected'); },
    human: async () => { throw Error('unexpected'); } };
  await assert.rejects(requireNativeStudioReconciliationAuthority(client,
    { actor: SCHEDULED_NATIVE_STUDIO_RECONCILIATION, scope }, disabled as any),
  /schedule_disabled/);
  await assert.rejects(requireNativeStudioReconciliationAuthority(client,
    { actor: SCHEDULED_NATIVE_STUDIO_RECONCILIATION, scope }, {
      ...disabled, scheduledEnabled: () => true,
      candidates: async () => [],
    } as any), /admin_missing/);
});

test('human actor remains subject to the existing publish permission check', async () => {
  let checked = false;
  const deps = { scheduledEnabled: () => false,
    candidates: async () => { throw Error('unexpected'); },
    human: async (_client: SupabaseClient, input: Record<string, unknown>) => {
      assert.deepEqual(input, { userId: actor,
        agencyId: scope.agencyId, action: 'publish' });
      checked = true;
      return { userId: actor };
    } };
  assert.deepEqual(await requireNativeStudioReconciliationAuthority(client,
    { actor, scope }, deps as any), { kind: 'human', userId: actor });
  assert.equal(checked, true);
});
