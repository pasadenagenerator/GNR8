import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectCloudflarePublicStudioGateway,
  inspectBoundCloudflarePublicStudioGateway } from './cloudflare-public-studio-gateway';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32), workerId = 'b'.repeat(32);
const credential = 'c'.repeat(40), domain = 'site.app.pasadenagenerator.com';
const worker = `gnr8-${scope.siteId}-site`, studio = `gnr8-${scope.siteId}-studio`;
const deploymentId = '44444444-4444-4444-8444-444444444444';
const versionId = '55555555-5555-4555-8555-555555555555';

function fixture() {
  const calls: string[] = [];
  const result: Record<string, unknown> = {
    [`/workers/workers/${worker}`]: { name: worker, id: workerId,
      subdomain: { enabled: false, previews_enabled: false } },
    [`/workers/scripts/${worker}/deployments`]: { deployments: [{ id: deploymentId,
      versions: [{ version_id: versionId, percentage: 100 }] }] },
    [`/workers/scripts/${worker}/versions/${versionId}`]: { id: versionId, resources: {
      script: { handlers: ['fetch'] }, bindings: [
        { name: 'ASSETS', type: 'assets' },
        { name: 'STUDIO', type: 'service', service: studio },
        { name: 'SITE_VERSION', type: 'json', json: { tag: '' } },
      ],
    } },
    '/workers/domains': [{ id: 'd'.repeat(32), hostname: domain,
      service: worker, enabled: true, previews_enabled: false }],
  };
  const transport = (async (url: string, options: RequestInit) => {
    assert.equal(options.method, 'GET');
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${credential}`);
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://api.cloudflare.com');
    assert(parsed.pathname.startsWith(`/client/v4/accounts/${accountId}`));
    const path = parsed.pathname.slice(`/client/v4/accounts/${accountId}`.length);
    calls.push(path);
    if (path === '/workers/domains') assert.equal(parsed.searchParams.get('hostname'), domain);
    const value = result[path];
    return value === undefined ? new Response(null, { status: 404 })
      : Response.json({ success: true, result: value });
  }) as typeof fetch;
  return { calls, result, transport };
}

test('checks the active public Worker, exact Studio binding and routed domain', async () => {
  const f = fixture();
  assert.deepEqual(await inspectCloudflarePublicStudioGateway(scope, accountId,
    workerId, domain, credential, f.transport), {
    state: 'observed-control-plane', worker, workerId, deploymentId, versionId,
    domainId: 'd'.repeat(32),
  });
  assert.equal(f.calls.length, 4);
});

test('an empty reservation or unattached domain stays pending', async () => {
  const f = fixture();
  delete f.result[`/workers/scripts/${worker}/deployments`];
  assert.deepEqual(await inspectCloudflarePublicStudioGateway(scope, accountId,
    workerId, domain, credential, f.transport), {
    state: 'pending', reason: 'no-deployment', worker,
  });
  f.result[`/workers/scripts/${worker}/deployments`] = { deployments: [{ id: deploymentId,
    versions: [{ version_id: versionId, percentage: 100 }] }] };
  f.result['/workers/domains'] = [];
  assert.deepEqual(await inspectCloudflarePublicStudioGateway(scope, accountId,
    workerId, domain, credential, f.transport), {
    state: 'pending', reason: 'domain-unattached', worker,
  });
});

test('rejects split traffic, wrong Studio target and foreign domain', async () => {
  const f = fixture();
  const deployment = f.result[`/workers/scripts/${worker}/deployments`] as {
    deployments: { versions: { version_id: string; percentage: number }[] }[] };
  deployment.deployments[0].versions[0].percentage = 50;
  await assert.rejects(inspectCloudflarePublicStudioGateway(scope, accountId,
    workerId, domain, credential, f.transport), /version_conflict/);
  deployment.deployments[0].versions[0].percentage = 100;
  const version = f.result[`/workers/scripts/${worker}/versions/${versionId}`] as {
    resources: { bindings: { name: string; service?: string }[] } };
  version.resources.bindings.find(binding => binding.name === 'STUDIO')!.service = 'another-studio';
  await assert.rejects(inspectCloudflarePublicStudioGateway(scope, accountId,
    workerId, domain, credential, f.transport), /binding_conflict/);
  version.resources.bindings.find(binding => binding.name === 'STUDIO')!.service = studio;
  (f.result['/workers/domains'] as { service: string }[])[0].service = 'another-site';
  await assert.rejects(inspectCloudflarePublicStudioGateway(scope, accountId,
    workerId, domain, credential, f.transport), /domain_conflict/);
});

test('scoped wrapper refuses missing repository before any provider read', async () => {
  let calls = 0;
  const client = { from(name: string) {
    return { select() { return { eq() { return this; }, async maybeSingle() {
      return { error: null, data: name === 'sites' ? { domain } : null };
    } }; } };
  } } as unknown as SupabaseClient;
  await assert.rejects(inspectBoundCloudflarePublicStudioGateway(scope, client,
    accountId, workerId, credential,
    (async () => { calls++; throw Error('unexpected provider call'); }) as typeof fetch),
  /target_unverified/);
  assert.equal(calls, 0);
});

test('scoped wrapper rejects a domain changed during provider readback', async () => {
  const f = fixture();
  let currentDomain = domain;
  const client = { from(name: string) {
    return { select() { return { eq() { return this; }, async maybeSingle() {
      return { error: null, data: name === 'sites' ? { domain: currentDomain } : {
        github_owner: 'example', github_owner_id: 1, github_owner_kind: 'User',
        repository: 'site', repository_id: 2, binding_state: 'bound',
      } };
    } }; } };
  } } as unknown as SupabaseClient;
  const transport = (async (url: string, options: RequestInit) => {
    const response = await f.transport(url, options);
    currentDomain = 'changed.app.pasadenagenerator.com';
    return response;
  }) as typeof fetch;
  await assert.rejects(inspectBoundCloudflarePublicStudioGateway(scope, client,
    accountId, workerId, credential, transport), /target_changed/);
});
