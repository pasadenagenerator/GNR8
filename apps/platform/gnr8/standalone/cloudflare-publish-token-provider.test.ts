import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CloudflarePublishTokenProvider } from './cloudflare-publish-token-provider';
import { ensureNativeStudioPublishToken } from './native-studio-publish-token-issuer';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const zoneId = 'b'.repeat(32);
const workerId = 'c'.repeat(32);
const tokenId = 'd'.repeat(32);
const manager = 'cfat_' + 'M'.repeat(45);
const workerReader = 'cfat_' + 'W'.repeat(45);
const value = 'cfat_' + 'V'.repeat(45);
const name = `gnr8-${scope.siteId}-native-publish`;
const worker = `gnr8-${scope.siteId}-site`;
const routesId = '28f4b596e7d643029c524985477ae49a';
const editorId = '7e79ec33834341f28dd431ab73884400';

function fixture(extraPolicy = false) {
  const saved = new Map<string, unknown>();
  const store = {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, data: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, data);
      return true;
    },
  };
  let policies: any[] | null = null;
  let creates = 0;
  const requests: { path: string; method: string; authorization: string }[] = [];
  const transport = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname + new URL(url).search;
    const method = init.method ?? 'GET';
    const authorization = new Headers(init.headers).get('authorization') ?? '';
    requests.push({ path, method, authorization });
    if (path === `/client/v4/accounts/${accountId}/workers/workers/${worker}`) {
      assert.equal(authorization, `Bearer ${workerReader}`);
      return Response.json({ success: true, result: { id: workerId, name: worker } });
    }
    if (path === `/client/v4/accounts/${accountId}/tokens?page=1&per_page=50`) {
      assert.equal(authorization, `Bearer ${manager}`);
      return Response.json({ success: true,
        result: policies ? [{ id: tokenId, name }] : [],
        result_info: { total_count: policies ? 1 : 0 } });
    }
    if (path === `/client/v4/accounts/${accountId}/tokens` && method === 'POST') {
      assert.equal(authorization, `Bearer ${manager}`);
      creates++;
      const body = JSON.parse(String(init.body));
      assert.equal(body.name, name);
      assert.deepEqual(body.policies, [
        { effect: 'allow', permission_groups: [{ id: routesId }],
          resources: { [`com.cloudflare.api.account.zone.${zoneId}`]: '*' } },
        { effect: 'allow', permission_groups: [{ id: editorId }],
          resources: { [`com.cloudflare.api.account.${accountId}`]:
            { [`com.cloudflare.edge.worker.script.${workerId}`]: '*' } } },
      ]);
      policies = body.policies;
      if (extraPolicy) policies = [...policies!, { effect: 'allow',
        permission_groups: [{ id: 'e'.repeat(32) }],
        resources: { [`com.cloudflare.api.account.${accountId}`]: '*' } }];
      return Response.json({ success: true, result: { id: tokenId, value } });
    }
    if (path === `/client/v4/accounts/${accountId}/tokens/${tokenId}`) {
      assert.equal(authorization, `Bearer ${manager}`);
      return Response.json({ success: true, result: { id: tokenId, name,
        status: 'active', policies: policies!.map(policy => ({ ...policy,
          permission_groups: policy.permission_groups.map((group: { id: string }) =>
            ({ ...group, name: group.id === routesId ? 'Workers Routes Write' :
              group.id === editorId ? 'Individual Workers Editor' : 'Workers Admin' })) })) } });
    }
    if (path === `/client/v4/accounts/${accountId}/tokens/verify`) {
      assert.equal(authorization, `Bearer ${value}`);
      return Response.json({ success: true, result: { id: tokenId, status: 'active' } });
    }
    throw Error('unexpected mocked Cloudflare request');
  }) as typeof fetch;
  return { store, saved, requests, creates: () => creates,
    provider: new CloudflarePublishTokenProvider(accountId, manager, workerReader, transport) };
}

test('issues one exact Worker and zone token through the real coordinator boundary', async () => {
  const f = fixture();
  const issued = await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, 'f'.repeat(64), f.provider, () => 1000);
  assert.equal(issued.value, value);
  assert.equal(f.creates(), 1);
  assert(!JSON.stringify([...f.saved.values()]).includes(value));
  assert.deepEqual(await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, 'f'.repeat(64), f.provider, () => 2000), issued);
  assert.equal(f.creates(), 1);
  assert(f.requests.every(request => request.authorization !== `Bearer ${value}` ||
    request.path.endsWith('/tokens/verify')));
});

test('expanded Cloudflare policy blocks storage after creation', async () => {
  const f = fixture(true);
  await assert.rejects(ensureNativeStudioPublishToken(scope, accountId, zoneId,
    f.store, 'f'.repeat(64), f.provider, () => 1000),
  /native_studio_publish_token_scope_mismatch/);
  assert.equal(f.creates(), 1);
  assert(!f.saved.has('native-studio/publish-token-v1.json'));
});
