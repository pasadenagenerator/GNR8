import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectCloudflareStudioFirstDeployment,
  inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const workerId = 'b'.repeat(32);
const credential = 'c'.repeat(40);
const domain = 'site.app.pasadenagenerator.com';
const worker = `gnr8-${scope.siteId}-studio`;
const deploymentId = '44444444-4444-4444-8444-444444444444';
const versionId = '55555555-5555-4555-8555-555555555555';
const container = 'gnr8-studio-preview-container';
const expectedTag = `gnr8-first-${'d'.repeat(64)}`;
const expectedRepository = 'example/site';

function fixture() {
  const calls: string[] = [];
  const result: Record<string, unknown> = {
    [`/workers/workers/${worker}`]: { name: worker, id: workerId,
      subdomain: { enabled: false, previews_enabled: false } },
    [`/workers/scripts/${worker}/deployments`]: { deployments: [{ id: deploymentId,
      versions: [{ version_id: versionId, percentage: 100 }] }] },
    [`/workers/scripts/${worker}/versions/${versionId}`]: { id: versionId, resources: {
      script: { handlers: ['fetch'] }, script_runtime: { migration_tag: 'v1',
        exports: { PreviewContainer: { type: 'durable-object', storage: 'sqlite', container } } },
      bindings: [
      { name: 'DRAFTS', type: 'r2_bucket', bucket_name: `gnr8-${scope.siteId}-drafts` },
      { name: 'PREVIEW', type: 'durable_object_namespace', class_name: 'PreviewContainer' },
      { name: 'ASSETS', type: 'assets' },
      { name: 'STUDIO_ORIGIN', type: 'plain_text', text: `https://${domain}` },
      { name: 'PREVIEW_ORIGIN', type: 'plain_text', text: `https://preview.${domain}` },
      { name: 'SITE_DEPLOYMENT_URL', type: 'plain_text', text: `https://${domain}/__studio-deployment` },
      { name: 'EDITOR_ACCESS', type: 'plain_text', text: 'repository' },
      { name: 'EDITOR_GITHUB_IDS', type: 'plain_text', text: '' },
      { name: 'GITHUB_REPOSITORY', type: 'plain_text', text: expectedRepository },
      ...['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
        'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET']
        .map(name => ({ name, type: 'secret_text' })),
      ],
    } },
    [`/workers/workers/${worker}/versions/${versionId}`]: { id: versionId,
      annotations: { 'workers/tag': expectedTag } },
    '/containers/applications': [{ id: 'container-app-id', name: container,
      account_id: accountId, scheduling_policy: 'durable_object' }],
  };
  const transport = (async (url: string, options: RequestInit) => {
    assert.equal(options.method, 'GET');
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${credential}`);
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://api.cloudflare.com');
    assert(parsed.pathname.startsWith(`/client/v4/accounts/${accountId}`));
    const path = parsed.pathname.slice(`/client/v4/accounts/${accountId}`.length);
    calls.push(path);
    const value = result[path];
    return value === undefined ? new Response(null, { status: 404 })
      : Response.json({ success: true, result: value });
  }) as typeof fetch;
  return { calls, result, transport };
}

test('reads active Worker version bindings and Container app without writes', async () => {
  const f = fixture();
  assert.deepEqual(await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), {
    state: 'observed-control-plane', worker, workerId, deploymentId, versionId,
    containerApplicationId: 'container-app-id',
  });
  assert.equal(f.calls.length, 4);
  assert(!f.calls.includes(`/workers/scripts/${worker}/settings`));
});

test('reports a safe transport category without exposing a request', async () => {
  const failed = (async () => { throw Error('network detail'); }) as typeof fetch;
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, failed),
  /native_studio_first_deployment_transport_failed/);
});

test('accepts optional version metadata absent from Cloudflare readback', async () => {
  const f = fixture();
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { script?: { handlers: string[] }; script_runtime: {
      migration_tag?: string } } };
  delete version.resources.script;
  delete version.resources.script_runtime.migration_tag;
  assert.equal((await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true)).state, 'verified-source-control-plane');
});

test('rejects explicitly conflicting migration and handler metadata', async () => {
  const f = fixture();
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { script: { handlers: string[] }; script_runtime: {
      migration_tag: string } } };
  version.resources.script_runtime.migration_tag = 'foreign';
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /migration_conflict/);
  version.resources.script_runtime.migration_tag = 'v1';
  version.resources.script.handlers = ['scheduled'];
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /handler_conflict/);
});

test('identifies the exact conflicting export property without exposing metadata', async () => {
  const f = fixture();
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { script_runtime: { exports: { PreviewContainer: {
      type: string; storage: string } } } } };
  version.resources.script_runtime.exports.PreviewContainer.storage = 'legacy-kv';
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /export_storage_conflict/);
});

test('corroborates an omitted exports map through the active namespace', async () => {
  const f = fixture();
  const namespaceId = '9'.repeat(32);
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { script_runtime: { exports?: unknown }; bindings: {
      name: string; namespace_id?: string }[] } };
  delete version.resources.script_runtime.exports;
  version.resources.bindings.find(binding => binding.name === 'PREVIEW')!
    .namespace_id = namespaceId;
  f.result['/containers/applications'] = [
    { id: 'other', name: 'other', account_id: accountId,
      scheduling_policy: 'durable_object',
      durable_objects: { namespace_id: '8'.repeat(32) } },
    { id: 'container-app-id', name: 'generated-name', account_id: accountId,
      scheduling_policy: 'durable_object',
      durable_objects: { namespace_id: namespaceId } },
  ];
  assert.equal((await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true)).state, 'verified-source-control-plane');
  assert(f.calls.includes('/containers/applications'));
  version.resources.bindings.find(binding => binding.name === 'PREVIEW')!
    .namespace_id = '7'.repeat(32);
  assert.equal((await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport)).state, 'pending');
});

test('corroborates the exact first deploy tag on the actively serving version', async () => {
  const f = fixture();
  assert.deepEqual(await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag, expectedRepository), {
    state: 'verified-source-control-plane', worker, workerId, deploymentId, versionId,
    containerApplicationId: 'container-app-id',
  });
  assert.equal(f.calls.length, 5);
  assert(f.calls.includes(`/workers/workers/${worker}/versions/${versionId}`));
  const tagged = f.result[`/workers/workers/${worker}/versions/${versionId}`] as {
    annotations: Record<string, string> };
  tagged.annotations['workers/tag'] = `gnr8-first-${'e'.repeat(64)}`;
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag), /source_conflict/);
});

test('first deployment requires all six secrets on the active version', async () => {
  const f = fixture();
  assert.equal((await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true)).state, 'verified-source-control-plane');
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { bindings: { name: string }[] } };
  version.resources.bindings = version.resources.bindings.filter(binding =>
    binding.name !== 'SESSION_SECRET');
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true), /secret_conflict/);
});

test('rejects wrong preview, repository or editor access configuration', async () => {
  for (const [name, wrong] of [
    ['PREVIEW_ORIGIN', 'https://wrong.example.com'],
    ['GITHUB_REPOSITORY', 'another/site'],
    ['EDITOR_ACCESS', 'public'],
  ]) {
    const f = fixture();
    const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
      resources: { bindings: { name: string; text?: string }[] } };
    version.resources.bindings.find(binding => binding.name === name)!.text = wrong;
    await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
      accountId, workerId, domain, credential, f.transport, expectedTag, expectedRepository),
    /binding_conflict/);
  }
});

test('refuses an active version without bindings even if latest settings exist', async () => {
  const f = fixture();
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { bindings?: unknown[] } };
  f.result[`/workers/scripts/${worker}/settings`] = { bindings: version.resources.bindings };
  delete version.resources.bindings;
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /provider_invalid/);
  assert(!f.calls.includes(`/workers/scripts/${worker}/settings`));
});

test('reserved Worker or delayed Container application remains pending', async () => {
  const f = fixture();
  delete f.result[`/workers/scripts/${worker}/deployments`];
  assert.deepEqual(await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), {
    state: 'pending', worker, reason: 'no-deployment',
  });
  f.result[`/workers/scripts/${worker}/deployments`] = { deployments: [{ id: deploymentId,
    versions: [{ version_id: versionId, percentage: 100 }] }] };
  f.result['/containers/applications'] = [];
  assert.deepEqual(await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), {
    state: 'pending', worker, reason: 'container-application-missing',
  });
});

test('foreign Worker, wrong bindings and split traffic fail closed', async () => {
  const f = fixture();
  f.result[`/workers/workers/${worker}`] = { name: worker, id: 'd'.repeat(32),
    subdomain: { enabled: false, previews_enabled: false } };
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /worker_conflict/);
  f.result[`/workers/workers/${worker}`] = { name: worker, id: workerId,
    subdomain: { enabled: false, previews_enabled: false } };
  f.result[`/workers/scripts/${worker}/deployments`] = { deployments: [{ id: deploymentId,
    versions: [{ version_id: versionId, percentage: 50 },
      { version_id: '66666666-6666-4666-8666-666666666666', percentage: 50 }] }] };
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /traffic_conflict/);
  f.result[`/workers/scripts/${worker}/deployments`] = { deployments: [{ id: deploymentId,
    versions: [{ version_id: versionId, percentage: 100 }] }] };
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { bindings: Record<string, unknown>[] } };
  version.resources.bindings[0].bucket_name = 'another-site-drafts';
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), /binding_conflict/);
});

test('hosted inspection requires current scoped site and bound GitHub repository', async () => {
  let providerCalls = 0;
  const absent = { from(name: string) {
    return { select() { return { eq() { return this; }, async maybeSingle() {
      return { error: null, data: name === 'sites' ? { domain } : null };
    } }; } };
  } } as unknown as SupabaseClient;
  await assert.rejects(inspectBoundCloudflareStudioFirstDeployment(scope,
    absent, accountId, workerId, credential,
    (async () => { providerCalls++; throw Error('unexpected provider call'); }) as typeof fetch),
  /scope_unverified/);
  assert.equal(providerCalls, 0);
});

test('hosted inspection compares Worker repository with the current site binding', async () => {
  const f = fixture();
  const client = { from(name: string) {
    return { select() { return { eq() { return this; }, async maybeSingle() {
      return { error: null, data: name === 'sites' ? { domain } : {
        github_owner: 'example', github_owner_id: 1, github_owner_kind: 'User',
        repository: 'site', repository_id: 2, binding_state: 'bound',
      } };
    } }; } };
  } } as unknown as SupabaseClient;
  assert.equal((await inspectBoundCloudflareStudioFirstDeployment(scope, client,
    accountId, workerId, credential, f.transport)).state, 'observed-control-plane');
  await assert.rejects(inspectBoundCloudflareStudioFirstDeployment(scope, client,
    accountId, workerId, credential, f.transport, undefined, false, {
      store: { read: async () => null, getBytes: async () => Buffer.alloc(0) } as any,
      sourceId: 'a'.repeat(64),
      site: { siteId: scope.siteId, accountId, studioOrigin: `https://${domain}`,
        repository: 'foreign/site', repositoryId: '2' } as any,
    }), /source_unverified/);
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { bindings: { name: string; text?: string }[] } };
  version.resources.bindings.find(binding => binding.name === 'GITHUB_REPOSITORY')!.text = 'foreign/site';
  await assert.rejects(inspectBoundCloudflareStudioFirstDeployment(scope, client,
    accountId, workerId, credential, f.transport), /binding_conflict/);
});

test('Access source expects its exact native Worker authentication bindings', async () => {
  const f = fixture();
  const access = { version: 2 as const, provider: 'access' as const,
    aud: 'e'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com',
    admins: ['access:admin@example.com'] };
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { bindings: { name: string; type: string; text?: string }[] } };
  const bindings = version.resources.bindings;
  bindings.find(item => item.name === 'EDITOR_ACCESS')!.text = 'roles';
  bindings.push(...[
    ['AUTH_PROVIDER', 'access'], ['ACCESS_TEAM_DOMAIN', access.teamDomain],
    ['ACCESS_AUD', access.aud], ['AUTH_BOOTSTRAP_ADMIN', access.admins[0]],
  ].map(([name, text]) => ({ name, type: 'plain_text', text })));
  assert.equal((await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true, access)).state, 'verified-source-control-plane');
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true), /binding_conflict/);
  bindings.find(item => item.name === 'EDITOR_ACCESS')!.text = 'repository';
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true), /binding_conflict/);
  bindings.find(item => item.name === 'EDITOR_ACCESS')!.text = 'roles';
  bindings.find(item => item.name === 'ACCESS_AUD')!.text = 'f'.repeat(64);
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag,
    expectedRepository, true, access), /binding_conflict/);
});
