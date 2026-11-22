import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transitionLegacyPublishTokenStatus } from './cloudflare-legacy-publish-token-transition';

const target = { siteId: '11111111-1111-4111-8111-111111111111',
  accountId: 'a'.repeat(32), zoneId: 'b'.repeat(32),
  workerId: 'c'.repeat(32), tokenId: 'd'.repeat(32) };
const manager = 'cfat_' + 'M'.repeat(45);
const reader = 'cfat_' + 'R'.repeat(45);
const name = `gnr8-${target.siteId}-native-publish`;
const worker = `gnr8-${target.siteId}-site`;
const policies = [
  { id: 'e'.repeat(32), effect: 'allow',
    permission_groups: [{ id: '28f4b596e7d643029c524985477ae49a',
      name: 'Workers Routes Write' }],
    resources: { [`com.cloudflare.api.account.zone.${target.zoneId}`]: '*' } },
  { id: 'f'.repeat(32), effect: 'allow',
    permission_groups: [{ id: '7e79ec33834341f28dd431ab73884400',
      name: 'Individual Workers Editor' }],
    resources: { [`com.cloudflare.api.account.${target.accountId}`]:
      { [`com.cloudflare.edge.worker.script.${target.workerId}`]: '*' } } },
];

function fixture(extra: Record<string, unknown> = {}, badPolicy = false,
  ambiguousPut = false, tokenName = name) {
  let status: 'active' | 'disabled' = 'active';
  let puts = 0;
  const bodies: Record<string, unknown>[] = [];
  const requests: string[] = [];
  const transport = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    requests.push(`${init.method} ${path}`);
    const authorization = new Headers(init.headers).get('authorization');
    if (path.endsWith(`/workers/workers/${worker}`)) {
      assert.equal(authorization, `Bearer ${reader}`);
      return Response.json({ success: true, result: { id: target.workerId, name: worker } });
    }
    assert.equal(path, `/client/v4/accounts/${target.accountId}/tokens/${target.tokenId}`);
    assert.equal(authorization, `Bearer ${manager}`);
    if (init.method === 'PUT') {
      puts++;
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      bodies.push(body);
      status = body.status as typeof status;
      if (ambiguousPut) throw Error('lost provider response with credential');
      return Response.json({ success: true, result: { id: target.tokenId } });
    }
    return Response.json({ success: true, result: { id: target.tokenId, name: tokenName,
      status, policies: badPolicy ? [{ ...policies[0],
        resources: { [`com.cloudflare.api.account.zone.${target.zoneId}`]: '*',
          'com.cloudflare.api.account.zone.other': '*' } }, policies[1]] : policies,
      value: 'private-provider-value', ...extra } });
  }) as typeof fetch;
  return { transport, bodies, requests, puts: () => puts,
    status: () => status };
}

test('disables only the known old token and restores exact definition', async () => {
  const f = fixture({ condition: { request_ip: { in: ['192.0.2.0/24'] } },
    expires_on: '2030-01-01T00:00:00Z', not_before: '2026-01-01T00:00:00Z' });
  const disabled = await transitionLegacyPublishTokenStatus(target, 'disabled',
    manager, reader, f.transport);
  assert.equal(disabled.status, 'disabled');
  assert.equal(f.status(), 'disabled');
  const restored = await transitionLegacyPublishTokenStatus(target, 'active',
    manager, reader, f.transport, disabled.definitionSha256);
  assert.equal(restored.status, 'active');
  assert.equal(restored.definitionSha256, disabled.definitionSha256);
  assert.equal(f.puts(), 2);
  assert.deepEqual(f.bodies.map(body => body.status), ['disabled', 'active']);
  assert.deepEqual(f.bodies[0]?.condition, { request_ip: { in: ['192.0.2.0/24'] } });
  assert.equal(f.bodies[0]?.expires_on, '2030-01-01T00:00:00Z');
  assert.equal(f.bodies[0]?.not_before, '2026-01-01T00:00:00Z');
  assert(!JSON.stringify(f.bodies).includes('private-provider-value'));
  assert(f.requests.every(request => !request.includes('native-publish-v2')));
});

test('expanded old policy stops before status mutation', async () => {
  const f = fixture({}, true);
  await assert.rejects(transitionLegacyPublishTokenStatus(target, 'disabled',
    manager, reader, f.transport), /native_studio_legacy_token_scope_mismatch/);
  assert.equal(f.puts(), 0);
});

test('wrong old token name stops before status mutation', async () => {
  const f = fixture({}, false, false, `${name}-v2`);
  await assert.rejects(transitionLegacyPublishTokenStatus(target, 'disabled',
    manager, reader, f.transport), /native_studio_legacy_token_scope_mismatch/);
  assert.equal(f.puts(), 0);
});

test('restore requires the fingerprint from the successful disable', async () => {
  const f = fixture();
  const disabled = await transitionLegacyPublishTokenStatus(target, 'disabled',
    manager, reader, f.transport);
  await assert.rejects(transitionLegacyPublishTokenStatus(target, 'active',
    manager, reader, f.transport, '0'.repeat(64)),
  /native_studio_legacy_token_scope_mismatch/);
  assert.equal(f.puts(), 1);
  const restored = await transitionLegacyPublishTokenStatus(target, 'active',
    manager, reader, f.transport, disabled.definitionSha256);
  assert.equal(restored.status, 'active');
});

test('wrong input identity stops before provider access', async () => {
  const f = fixture();
  await assert.rejects(transitionLegacyPublishTokenStatus({ ...target, tokenId: '../v2' },
    'disabled', manager, reader, f.transport),
  /native_studio_legacy_token_transition_invalid/);
  assert.equal(f.requests.length, 0);
});

test('ambiguous status update remains pending and is not retried', async () => {
  const f = fixture({}, false, true);
  await assert.rejects(transitionLegacyPublishTokenStatus(target, 'disabled',
    manager, reader, f.transport),
  error => error instanceof Error &&
    error.message === 'native_studio_legacy_token_transition_pending_review');
  assert.equal(f.puts(), 1);
  assert.equal(f.status(), 'disabled');
});
