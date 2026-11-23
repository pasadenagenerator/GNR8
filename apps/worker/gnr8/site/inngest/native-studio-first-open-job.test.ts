import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioFirstOpen,
  settleNativeStudioFirstOpen } from './native-studio-first-open-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444',
sourceId: 'a'.repeat(64), sourceCommit: 'b'.repeat(40) };
const receipt = { scope: request.scope, sourceId: request.sourceId,
  commit: request.sourceCommit, target: {
    studioOrigin: 'https://site.app.pasadenagenerator.com' } };

function fixture() {
  const calls: string[] = [];
  const client = {} as SupabaseClient;
  const deps = {
    enabled: () => true,
    client: async () => { calls.push('client'); return client; },
    authorize: async (received: SupabaseClient, actor: string, agencyId: string) => {
      assert.equal(received, client);
      assert.equal(actor, request.actor);
      assert.equal(agencyId, request.scope.agencyId);
      calls.push('authorize');
    },
    handoff: async (scope: typeof request.scope, received: SupabaseClient) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      calls.push('handoff');
      return { scope, sourceId: request.sourceId, commit: request.sourceCommit };
    },
    record: async (scope: typeof request.scope, received: SupabaseClient) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      calls.push('record');
      return receipt;
    },
  };
  return { calls, deps };
}

test('disabled or forged first-open event cannot reach storage', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstOpen(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioFirstOpen({ ...request,
    studioOrigin: 'https://other.example.com' }, f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioFirstOpen({ ...request,
    scope: { ...request.scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor and stale handoff cannot record a launch', async () => {
  const revoked = fixture();
  await assert.rejects(runNativeStudioFirstOpen(request, { ...revoked.deps,
    authorize: async () => { revoked.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(revoked.calls, ['client', 'authorize']);
  const stale = fixture();
  await assert.rejects(runNativeStudioFirstOpen(request, { ...stale.deps,
    handoff: async () => { stale.calls.push('handoff'); return {
      scope: request.scope, sourceId: 'c'.repeat(64), commit: request.sourceCommit }; },
  }), /handoff_unverified/);
  assert.deepEqual(stale.calls, ['client', 'authorize', 'handoff']);
});

test('exact handoff enters configured first-open recorder', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioFirstOpen(request, f.deps), receipt);
  assert.deepEqual(f.calls, ['client', 'authorize', 'handoff', 'record']);
});

test('temporary public entry network failure resumes and records one first-open', async () => {
  const calls: string[] = [];
  let count = 0;
  const steps = {
    run: async (_id: string, fn: () => Promise<unknown>) => {
      calls.push('run'); return fn(); },
    sleep: async (_id: string, duration: string) => {
      assert.equal(duration, '1m'); calls.push('sleep'); },
  };
  const result = await settleNativeStudioFirstOpen(request, steps,
    (async () => { count++;
      if (count < 3) throw Error('native_studio_public_entry_unavailable');
      return { scope: request.scope, sourceId: request.sourceId,
        commit: request.sourceCommit };
    }) as typeof runNativeStudioFirstOpen);
  assert.equal(result.sourceId, request.sourceId);
  assert.deepEqual(calls, ['run', 'sleep', 'run', 'sleep', 'run']);
});

test('wrong public entry content is terminal without another read', async () => {
  const calls: string[] = [];
  const steps = {
    run: async (_id: string, fn: () => Promise<unknown>) => {
      calls.push('run'); return fn(); },
    sleep: async () => { calls.push('sleep'); },
  };
  const wrongEntry = async () => {
    throw Error('native_studio_public_entry_unready');
  };
  await assert.rejects(settleNativeStudioFirstOpen(request, steps,
    wrongEntry as typeof runNativeStudioFirstOpen), /public_entry_unready/);
  assert.deepEqual(calls, ['run']);
});
