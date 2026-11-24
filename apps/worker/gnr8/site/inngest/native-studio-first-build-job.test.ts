import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runNativeStudioFirstBuild,
  settleNativeStudioFirstBuild } from './native-studio-first-build-job';

const request = { scope: {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
}, actor: '44444444-4444-4444-8444-444444444444',
requestId: 'a'.repeat(64), sourceId: 'b'.repeat(64) };
const result = { requestId: request.requestId, sourceId: request.sourceId,
  sourceManifestSha256: 'c'.repeat(64), studioVersion: '1.4.8', files: 42,
  hosted: false as const };
const commit = 'd'.repeat(40);
const built = { sourceId: request.sourceId, commit,
  workerId: 'e'.repeat(32), artifactBranch: `gnr8-build-${commit}`,
  artifactCommit: 'f'.repeat(40) };

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
    sourceResult: async (scope: typeof request.scope, received: SupabaseClient,
      requestId: string, attemptId?: string) => {
      assert.deepEqual(scope, request.scope);
      assert.equal(received, client);
      assert.equal(requestId, request.requestId);
      assert.equal(attemptId, undefined);
      calls.push('source');
      return result;
    },
    build: async () => { calls.push('build'); return built; },
    chainEnabled: () => false,
    enqueuePreflight: async () => { calls.push('enqueue'); },
  };
  return { calls, deps };
}

test('disabled or forged build event cannot reach storage or provider', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstBuild(request,
    { ...f.deps, enabled: () => false }), /disabled/);
  await assert.rejects(runNativeStudioFirstBuild({ ...request, repository: 'other/site' },
    f.deps), /request_invalid/);
  await assert.rejects(runNativeStudioFirstBuild({ ...request,
    scope: { ...request.scope, siteId: '../other' } }, f.deps), /request_invalid/);
  assert.deepEqual(f.calls, []);
});

test('revoked actor stops before source lookup and build', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstBuild(request, { ...f.deps,
    authorize: async () => { f.calls.push('authorize'); throw Error('revoked'); },
  }), /revoked/);
  assert.deepEqual(f.calls, ['client', 'authorize']);
});

test('source result must match exact request and source identity', async () => {
  for (const invalid of [null, { ...result, sourceId: 'd'.repeat(64) },
    { ...result, hosted: true }, { ...result, files: 0 }]) {
    const f = fixture();
    await assert.rejects(runNativeStudioFirstBuild(request, { ...f.deps,
      sourceResult: async () => { f.calls.push('source'); return invalid as typeof result; },
    }), /source_unverified/);
    assert.deepEqual(f.calls, ['client', 'authorize', 'source']);
  }
});

test('authorized prepared source enters build once', async () => {
  const f = fixture();
  assert.deepEqual(await runNativeStudioFirstBuild(request, f.deps),
    built);
  assert.deepEqual(f.calls, ['client', 'authorize', 'source', 'build']);
});

test('running build waits across invocations and queues only after completion', async () => {
  const f = fixture();
  let polls = 0;
  const result = await settleNativeStudioFirstBuild(request, {
    run: async (_id, fn) => fn(),
    sleep: async () => undefined,
  }, (async () => {
    polls++;
    return polls < 3 ? { state: 'running' } : built;
  }) as typeof runNativeStudioFirstBuild);
  assert.deepEqual(result, built);
  assert.equal(polls, 3);
  assert.deepEqual(await runNativeStudioFirstBuild(request, {
    ...f.deps, build: async () => ({ state: 'pending-review' }) as any,
  }), { state: 'pending-review' });
  assert(!f.calls.includes('enqueue'));
});

test('attempt-scoped source result cannot reuse an earlier preparation', async () => {
  const f = fixture();
  const attemptId = '55555555-5555-4555-8555-555555555555';
  const attempted = { ...request, attemptId };
  await assert.rejects(runNativeStudioFirstBuild(attempted, {
    ...f.deps, sourceResult: async (_scope, _client, _requestId, receivedAttempt) => {
      assert.equal(receivedAttempt, attemptId);
      f.calls.push('source');
      return result;
    },
  }), /source_unverified/);
  assert.deepEqual(f.calls, ['client', 'authorize', 'source']);
  const accepted = fixture();
  assert.deepEqual(await runNativeStudioFirstBuild(attempted, {
    ...accepted.deps, sourceResult: async (_scope, _client, _requestId, receivedAttempt) => {
      assert.equal(receivedAttempt, attemptId);
      accepted.calls.push('source');
      return { ...result, attemptId };
    },
  }), built);
});

test('verified build queues only scoped artifact identities for preflight', async () => {
  const f = fixture();
  await runNativeStudioFirstBuild(request, { ...f.deps,
    chainEnabled: () => true,
    enqueuePreflight: async value => {
      assert.deepEqual(value, { scope: request.scope, actor: request.actor,
        sourceId: request.sourceId, sourceCommit: built.commit,
        workerId: built.workerId, artifactCommit: built.artifactCommit });
      f.calls.push('enqueue');
    },
  });
  assert.deepEqual(f.calls, ['client', 'authorize', 'source', 'build', 'enqueue']);
});

test('invalid build result cannot queue preflight', async () => {
  const f = fixture();
  await assert.rejects(runNativeStudioFirstBuild(request, { ...f.deps,
    chainEnabled: () => true,
    build: async () => { f.calls.push('build');
      return { ...built, artifactCommit: 'invalid' }; },
  }), /result_unverified/);
  assert.deepEqual(f.calls, ['client', 'authorize', 'source', 'build']);
});

test('source preparation waits for its separate resource reservation', async () => {
  const calls: string[] = [];
  let count = 0;
  const settled = await settleNativeStudioFirstBuild(request, {
    run: async (id: string, fn: () => Promise<unknown>) => {
      calls.push(id); return fn(); },
    sleep: async (id: string, duration: string) => {
      assert.equal(duration, '1m'); calls.push(id); },
  }, (async () => {
    count++;
    if (count < 3) throw Error('native_studio_first_build_resources_pending');
    return built;
  }) as typeof runNativeStudioFirstBuild);
  assert.deepEqual(settled, built);
  assert.deepEqual(calls, [
    'first-build-resource-observe-0', 'first-build-resource-wait-0',
    'first-build-resource-observe-1', 'first-build-resource-wait-1',
    'first-build-resource-observe-2',
  ]);
});

test('mismatched reservation cannot repeat the build step', async () => {
  const calls: string[] = [];
  await assert.rejects(settleNativeStudioFirstBuild(request, {
    run: async (id: string, fn: () => Promise<unknown>) => {
      calls.push(id); return fn(); },
    sleep: async (id: string) => { calls.push(id); },
  }, (async () => {
    throw Error('native_studio_first_build_resources_unverified');
  }) as typeof runNativeStudioFirstBuild), /resources_unverified/);
  assert.deepEqual(calls, ['first-build-resource-observe-0']);
});
