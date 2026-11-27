import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readCloudflarePublishTokenDetail } from './cloudflare-publish-token-policy';

const accountId = 'a'.repeat(32);
const tokenId = 'b'.repeat(32);
const setupToken = 'cfat_' + 'C'.repeat(45);
const groupId = 'c'.repeat(32);

test('reads exact account token policy while discarding provider credential fields', async () => {
  const transport = (async (url: string, init: RequestInit) => {
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/${tokenId}`);
    assert.equal(init.method, 'GET');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${setupToken}`);
    return Response.json({ success: true, result: { id: tokenId, name: 'gnr8-site-native-publish',
      status: 'active', value: 'must-never-return', policies: [{ effect: 'allow',
        permission_groups: [{ id: groupId, name: 'Individual Workers Editor',
          meta: { label: 'workers' } }],
        resources: { 'opaque-resource-key': { selected: 'one-worker' } },
      }] } });
  }) as typeof fetch;
  const result = await readCloudflarePublishTokenDetail(accountId, tokenId,
    setupToken, transport);
  assert.equal(result.id, tokenId);
  assert.equal(result.policies[0]?.permissionGroups[0]?.name, 'Individual Workers Editor');
  assert.deepEqual(result.policies[0]?.resources,
    { 'opaque-resource-key': { selected: 'one-worker' } });
  assert.equal(result.hasRestrictions, false);
  assert(!JSON.stringify(result).includes('must-never-return'));
});

test('reports IP and time restrictions without retaining their details', async () => {
  const transport = (async () => Response.json({ success: true, result: {
    id: tokenId, name: 'gnr8-site-native-publish', status: 'active',
    condition: { request_ip: { in: ['192.0.2.0/24'] } },
    expires_on: '2030-01-01T00:00:00Z',
    not_before: '2026-01-01T00:00:00Z',
    policies: [], value: 'must-never-return',
  } })) as typeof fetch;
  const result = await readCloudflarePublishTokenDetail(accountId, tokenId,
    setupToken, transport);
  assert.equal(result.hasRestrictions, true);
  assert(!JSON.stringify(result).includes('192.0.2.0/24'));
  assert(!JSON.stringify(result).includes('must-never-return'));
});

test('fails closed on an invalid provider response without showing its body', async () => {
  const transport = (async () => Response.json({ success: false,
    errors: [{ message: 'provider-sensitive-error' }] })) as typeof fetch;
  await assert.rejects(readCloudflarePublishTokenDetail(accountId, tokenId,
    setupToken, transport), error => {
    assert.equal((error as Error).message, 'native_studio_publish_policy_invalid');
    return true;
  });
});
