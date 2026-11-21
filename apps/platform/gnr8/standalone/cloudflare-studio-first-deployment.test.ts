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
    } },
    [`/workers/workers/${worker}/versions/${versionId}`]: { id: versionId,
      annotations: { 'workers/tag': expectedTag } },
    [`/workers/scripts/${worker}/settings`]: { bindings: [
      { name: 'DRAFTS', type: 'r2_bucket', bucket_name: `gnr8-${scope.siteId}-drafts` },
      { name: 'PREVIEW', type: 'durable_object_namespace', class_name: 'PreviewContainer' },
      { name: 'ASSETS', type: 'assets' },
      { name: 'STUDIO_ORIGIN', type: 'plain_text', text: `https://${domain}` },
    ] },
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

test('reads active Worker version, current settings and Container app without writes', async () => {
  const f = fixture();
  assert.deepEqual(await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport), {
    state: 'observed-control-plane', worker, workerId, deploymentId, versionId,
    containerApplicationId: 'container-app-id',
  });
  assert.equal(f.calls.length, 5);
});

test('corroborates the exact first deploy tag on the actively serving version', async () => {
  const f = fixture();
  assert.deepEqual(await inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag), {
    state: 'verified-source-control-plane', worker, workerId, deploymentId, versionId,
    containerApplicationId: 'container-app-id',
  });
  assert.equal(f.calls.length, 6);
  assert(f.calls.includes(`/workers/workers/${worker}/versions/${versionId}`));
  const tagged = f.result[`/workers/workers/${worker}/versions/${versionId}`] as {
    annotations: Record<string, string> };
  tagged.annotations['workers/tag'] = `gnr8-first-${'e'.repeat(64)}`;
  await assert.rejects(inspectCloudflareStudioFirstDeployment(scope,
    accountId, workerId, domain, credential, f.transport, expectedTag), /source_conflict/);
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
    accountId, workerId, domain, credential, f.transport), /version_conflict/);
  f.result[`/workers/scripts/${worker}/deployments`] = { deployments: [{ id: deploymentId,
    versions: [{ version_id: versionId, percentage: 100 }] }] };
  const settings = f.result[`/workers/scripts/${worker}/settings`] as { bindings: Record<string, unknown>[] };
  settings.bindings[0].bucket_name = 'another-site-drafts';
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
