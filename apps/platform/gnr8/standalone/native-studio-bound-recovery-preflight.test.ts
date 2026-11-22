import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectBoundNativeStudioRecoveryCandidate } from './native-studio-bound-recovery-preflight';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const workerId = 'b'.repeat(32);
const credential = 'c'.repeat(40);
const versionId = '44444444-4444-4444-8444-444444444444';
const domain = 'site.app.pasadenagenerator.com';
const worker = `gnr8-${scope.siteId}-studio`;
const repositoryName = 'example/site';
const secrets = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];
const bindings = [
  { name: 'DRAFTS', type: 'r2_bucket', bucket_name: `gnr8-${scope.siteId}-drafts` },
  { name: 'PREVIEW', type: 'durable_object_namespace', class_name: 'PreviewContainer' },
  { name: 'ASSETS', type: 'assets' },
  { name: 'STUDIO_ORIGIN', type: 'plain_text', text: `https://${domain}` },
  { name: 'PREVIEW_ORIGIN', type: 'plain_text', text: `https://preview.${domain}` },
  { name: 'SITE_DEPLOYMENT_URL', type: 'plain_text',
    text: `https://${domain}/__studio-deployment` },
  { name: 'EDITOR_ACCESS', type: 'plain_text', text: 'repository' },
  { name: 'EDITOR_GITHUB_IDS', type: 'plain_text', text: '' },
  { name: 'GITHUB_REPOSITORY', type: 'plain_text', text: repositoryName },
  ...secrets.map(name => ({ name, type: 'secret_text' })),
];

function fixture(siteDomain: string | null = domain, bindingState = 'bound') {
  const queries: { table: string; filters: Record<string, string> }[] = [];
  const client = { from(table: string) {
    const filters: Record<string, string> = {};
    queries.push({ table, filters });
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() { return { error: null, data: table === 'sites'
        ? siteDomain === null ? null : { domain: siteDomain }
        : { github_owner: 'example', github_owner_id: 123,
            github_owner_kind: 'Organization', repository: 'site',
            repository_id: 456, binding_state: bindingState } }; } };
    return { select: () => query };
  } } as unknown as SupabaseClient;
  const paths: string[] = [];
  const transport = (async (url: string, init: RequestInit) => {
    assert.equal(init.method, 'GET');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${credential}`);
    const path = new URL(url).pathname;
    paths.push(path);
    const result = path.endsWith(`/workers/workers/${worker}`)
      ? { name: worker, id: workerId,
          subdomain: { enabled: false, previews_enabled: false } }
      : { id: versionId, resources: { bindings } };
    return Response.json({ success: true, result });
  }) as typeof fetch;
  return { client, transport, paths, queries };
}

test('derives the site and repository from scoped bindings before read-only version inspection', async () => {
  const f = fixture();
  const result = await inspectBoundNativeStudioRecoveryCandidate(scope,
    f.client, accountId, credential, versionId, f.transport);
  assert.equal(result.state, 'complete-bindings');
  assert.equal(result.workerId, workerId);
  assert.equal(result.domain, domain);
  assert.equal(result.repository, repositoryName);
  assert.deepEqual(f.queries.map(query => query.table).sort(),
    ['gnr8_site_github_repository_bindings', 'sites']);
  for (const query of f.queries) {
    assert.equal(query.filters.agency_id, scope.agencyId);
    assert.equal(query.filters.site_id ?? query.filters.id, scope.siteId);
    assert.equal(query.filters.client_id ?? query.filters.org_id, scope.clientId);
  }
  assert.deepEqual(f.paths, [
    `/client/v4/accounts/${accountId}/workers/workers/${worker}`,
    `/client/v4/accounts/${accountId}/workers/workers/${worker}`,
    `/client/v4/accounts/${accountId}/workers/scripts/${worker}/versions/${versionId}`,
  ]);
});

test('missing site or pending repository stops before Cloudflare reads', async () => {
  for (const f of [fixture(null), fixture(domain, 'creating')]) {
    await assert.rejects(inspectBoundNativeStudioRecoveryCandidate(scope,
      f.client, accountId, credential, versionId, f.transport),
    /native_studio_recovery_scope_unverified/);
    assert.deepEqual(f.paths, []);
  }
});

test('wrong account or scope stops before any read', async () => {
  const f = fixture();
  await assert.rejects(inspectBoundNativeStudioRecoveryCandidate(
    { ...scope, siteId: '../foreign' }, f.client, accountId,
    credential, versionId, f.transport), /native_studio_recovery_preflight_invalid/);
  await assert.rejects(inspectBoundNativeStudioRecoveryCandidate(scope,
    f.client, 'not-an-account', credential, versionId, f.transport),
  /native_studio_recovery_preflight_invalid/);
  assert.deepEqual(f.queries, []);
  assert.deepEqual(f.paths, []);
});

test('provider worker identity conflict fails before inspecting a version', async () => {
  const f = fixture();
  const transport = (async (url: string, init: RequestInit) => {
    f.paths.push(new URL(url).pathname);
    assert.equal(init.method, 'GET');
    return Response.json({ success: true, result: { name: worker, id: 'x'.repeat(32) } });
  }) as typeof fetch;
  await assert.rejects(inspectBoundNativeStudioRecoveryCandidate(scope,
    f.client, accountId, credential, versionId, transport),
  /native_studio_recovery_worker_unverified/);
  assert.equal(f.paths.length, 1);
});

test('provider transport exceptions never expose credentials or response text', async () => {
  for (const failingCall of [1, 3]) {
    const f = fixture();
    let calls = 0;
    const transport = (async (url: string, init: RequestInit) => {
      calls++;
      if (calls === failingCall)
        throw Error(`provider-private-error ${credential}`);
      return f.transport(url, init);
    }) as typeof fetch;
    await assert.rejects(inspectBoundNativeStudioRecoveryCandidate(scope,
      f.client, accountId, credential, versionId, transport), error => {
      assert(error instanceof Error);
      assert(!error.message.includes(credential));
      assert(!error.message.includes('provider-private-error'));
      return true;
    });
    assert.equal(calls, failingCall);
  }
});
