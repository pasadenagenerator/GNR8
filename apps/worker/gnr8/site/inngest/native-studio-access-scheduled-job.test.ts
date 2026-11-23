import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioScheduledAccessReconciliation } from
  './native-studio-access-scheduled-job';

const scope = (n: number) => ({
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: `33333333-3333-4333-8333-${n.toString(16).padStart(12, '0')}`,
});
const sourceId = 'a'.repeat(64);
const entry = (n: number) => ({ scope: scope(n), sourceId });
const client = {} as SupabaseClient;

test('disabled cron has no storage or provider side effects', async () => {
  let calls = 0;
  const result = await runNativeStudioScheduledAccessReconciliation({
    enabled: () => false,
    client: async () => { calls++; return client; },
    inventory: async () => { calls++; return { entries: [], errors: [], nextCursor: null }; },
    reconcile: async () => { calls++; throw Error('unexpected'); },
    log: () => { calls++; },
  } as any);
  assert.equal(result.state, 'disabled');
  assert.equal(calls, 0);
});

test('reads every page before writes and reports per-site failures without starving later sites', async () => {
  const order: string[] = [];
  const logs: Array<{ state: string; code?: string;
    scanned?: number; failures?: number; pending?: number }> = [];
  const pages = [
    { entries: [entry(1)], errors: [{ siteId: scope(2).siteId,
      code: 'source_invalid' }], nextCursor: scope(2).siteId },
    { entries: [entry(3), entry(4)], errors: [], nextCursor: null },
  ];
  const deps = {
    enabled: () => true,
    client: async () => client,
    inventory: async (_client: SupabaseClient, cursor?: string) => {
      order.push(`page:${cursor ?? 'first'}`);
      return pages.shift()!;
    },
    reconcile: async (value: ReturnType<typeof entry> & { client: SupabaseClient }) => {
      assert.equal(value.client, client);
      order.push(`write:${value.scope.siteId}`);
      if (value.scope.siteId === scope(3).siteId) throw Error('provider unavailable');
      return { actorType: 'system' as const, scope: value.scope,
        sourceId: value.sourceId, state: 'verified' as const };
    },
    log: (record: { state: string; code?: string;
      scanned?: number; failures?: number; pending?: number }) => {
      logs.push(record); },
  };
  await assert.rejects(runNativeStudioScheduledAccessReconciliation(deps as any),
    /needs_attention/);
  assert.deepEqual(order, [
    'page:first', `page:${scope(2).siteId}`,
    `write:${scope(1).siteId}`, `write:${scope(3).siteId}`,
    `write:${scope(4).siteId}`,
  ]);
  assert.deepEqual(logs.map(record => record.state),
    ['failed', 'verified', 'failed', 'verified', 'needs-attention']);
  assert.equal(logs[0].code, 'source_invalid');
  assert.deepEqual(logs.at(-1), { state: 'needs-attention',
    scanned: 4, failures: 2, pending: 0 });
});

test('hard page cap fails visibly before any provider mutation', async () => {
  let pages = 0, writes = 0;
  const deps = {
    enabled: () => true,
    client: async () => client,
    inventory: async () => {
      pages++;
      return { entries: [entry(pages)], errors: [],
        nextCursor: scope(pages).siteId };
    },
    reconcile: async () => { writes++; throw Error('unexpected'); },
    log: () => undefined,
  };
  await assert.rejects(runNativeStudioScheduledAccessReconciliation(deps as any),
    /inventory_limit/);
  assert.equal(pages, 10);
  assert.equal(writes, 0);
});

test('fully verified scan returns a system result without an event payload', async () => {
  const logs: unknown[] = [];
  const deps = {
    enabled: () => true,
    client: async () => client,
    inventory: async () => ({ entries: [entry(1)], errors: [], nextCursor: null }),
    reconcile: async (value: ReturnType<typeof entry>) => ({
      actorType: 'system' as const, scope: value.scope, sourceId: value.sourceId,
      state: 'verified' as const, policyId: '55555555-5555-4555-8555-555555555555',
      commit: 'b'.repeat(40), principals: ['access:owner@example.com'],
      sessions: 'unchanged', removedCount: 0,
    }),
    log: (record: unknown) => { logs.push(record); },
  };
  const result = await runNativeStudioScheduledAccessReconciliation(deps as any);
  assert.deepEqual({ state: result.state, scanned: result.scanned,
    verified: result.verified, pending: result.pending, failures: result.failures },
  { state: 'verified', scanned: 1, verified: 1, pending: 0, failures: 0 });
  assert.deepEqual(logs, [{ scope: scope(1), sourceId, state: 'verified',
    policyId: '55555555-5555-4555-8555-555555555555',
    commit: 'b'.repeat(40), principalCount: 1, removedCount: 0,
    sessionState: 'unchanged' }]);
});
