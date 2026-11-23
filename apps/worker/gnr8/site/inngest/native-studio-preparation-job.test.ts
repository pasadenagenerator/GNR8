import assert from 'node:assert/strict';
import test from 'node:test';
import { fingerprint } from '../../../../platform/gnr8/standalone/publication-contract';
import { authorizeNativeStudioSourceEventBeforeAccess,
  prepareNativeStudioSourceEvent } from './native-studio-preparation-job';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const actor = '44444444-4444-4444-8444-444444444444';
const selected = '55555555-5555-4555-8555-555555555555';
const artifact = '66666666-6666-4666-8666-666666666666';
const capture = '77777777-7777-4777-8777-777777777777';
const input = { selection: { scope: { ...scope, siteVersionId: selected } } };
const confirmationSha256 = 'a'.repeat(64);
const request = { mode: 'source', scope, actor, input,
  requestId: fingerprint({ input, confirmationSha256 }),
  attemptId: '88888888-8888-4888-8888-888888888888' };

function fixture() {
  const calls: string[] = [];
  const client = {};
  const deps = {
    client: async () => { calls.push('client'); return client; },
    actor: async () => { calls.push('actor'); },
    ownership: async (id: string) => { calls.push(`owner:${id}`);
      return { agencyId: scope.agencyId, organizationId: scope.clientId,
        ownershipSiteId: scope.siteId }; },
    confirmed: async () => { calls.push('confirmed');
      return { confirmationSha256, artifactVersionId: artifact, captureVersionId: capture }; },
    parse: (value: unknown) => value as typeof input,
    fingerprint,
  };
  return { calls, client, deps };
}

test('source event rechecks actor, confirmation and all owned versions before Access setup', async () => {
  const f = fixture();
  assert.deepEqual(await authorizeNativeStudioSourceEventBeforeAccess(request, f.deps),
    { client: f.client, scope });
  assert.deepEqual(f.calls, ['client', 'actor', 'confirmed',
    `owner:${selected}`, `owner:${artifact}`, `owner:${capture}`]);
});

test('stale event and foreign captured source stop before any Access setup', async () => {
  const stale = fixture();
  await assert.rejects(authorizeNativeStudioSourceEventBeforeAccess({ ...request,
    requestId: 'b'.repeat(64) }, stale.deps), /request_stale/);
  assert.equal(stale.calls.some(call => call.startsWith('owner:')), false);
  const foreign = fixture();
  foreign.deps.ownership = async id => {
    foreign.calls.push(`owner:${id}`);
    return { agencyId: scope.agencyId, organizationId: scope.clientId,
      ownershipSiteId: id === capture ? '99999999-9999-4999-8999-999999999999' : scope.siteId };
  };
  await assert.rejects(authorizeNativeStudioSourceEventBeforeAccess(request, foreign.deps),
    /ownership_mismatch/);
  await assert.rejects(authorizeNativeStudioSourceEventBeforeAccess({ ...request,
    attemptId: '../foreign' }, fixture().deps), /request_invalid/);
});

test('provider setup follows authorization and precedes source preparation', async () => {
  const calls: string[] = [];
  const client = {};
  assert.equal(await prepareNativeStudioSourceEvent(request, {
    authorize: async () => { calls.push('authorize'); return { client, scope }; },
    prerequisite: async (receivedScope, receivedClient) => {
      assert.equal(receivedScope, scope); assert.equal(receivedClient, client);
      calls.push('prerequisite');
    },
    prepare: async received => { assert.equal(received, request); calls.push('prepare');
      return 'prepared'; },
  }), 'prepared');
  assert.deepEqual(calls, ['authorize', 'prerequisite', 'prepare']);
  calls.length = 0;
  await assert.rejects(prepareNativeStudioSourceEvent(request, {
    authorize: async () => { calls.push('authorize'); throw Error('revoked'); },
    prerequisite: async () => { calls.push('prerequisite'); },
    prepare: async () => { calls.push('prepare'); },
  }), /revoked/);
  assert.deepEqual(calls, ['authorize']);
});
