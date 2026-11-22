import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectNativeStudioRecoveryBindings,
  installNativeStudioSecrets } from './cloudflare-studio-secrets';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

const scope = {
  agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333',
};
const account = 'a'.repeat(32);
const token = 'central-cloudflare-setup-token';
const secrets: NativeStudioRuntimeSecrets = {
  AI_API_KEY: 'ai-key', CONTAINER_TOKEN: 'container-token',
  GITHUB_CLIENT_SECRET: 'github-client-secret', GITHUB_PRIVATE_KEY: 'private-key',
  PUBLISH_CLOUDFLARE_API_TOKEN: 'publish-token', SESSION_SECRET: 'session-secret',
};
const metadata = Object.keys(secrets).map(name => ({ name, type: 'secret_text' }));
const versionId = '44444444-4444-4444-8444-444444444444';
const previousVersionId = '33333333-3333-4333-8333-333333333333';
const worker = `gnr8-${scope.siteId}-studio`;
const expected = { workerId: 'b'.repeat(32),
  domain: 'site.app.pasadenagenerator.com', repository: 'example/site' };
const workerIdentity = { name: worker, id: expected.workerId,
  subdomain: { enabled: false, previews_enabled: false } };
const siteBindings = [
  { name: 'DRAFTS', type: 'r2_bucket', bucket_name: `gnr8-${scope.siteId}-drafts` },
  { name: 'PREVIEW', type: 'durable_object_namespace', class_name: 'PreviewContainer' },
  { name: 'ASSETS', type: 'assets' },
  { name: 'STUDIO_ORIGIN', type: 'plain_text', text: `https://${expected.domain}` },
  { name: 'PREVIEW_ORIGIN', type: 'plain_text', text: `https://preview.${expected.domain}` },
  { name: 'SITE_DEPLOYMENT_URL', type: 'plain_text',
    text: `https://${expected.domain}/__studio-deployment` },
  { name: 'EDITOR_ACCESS', type: 'plain_text', text: 'repository' },
  { name: 'EDITOR_GITHUB_IDS', type: 'plain_text', text: '' },
  { name: 'GITHUB_REPOSITORY', type: 'plain_text', text: expected.repository },
];

test('patches only the exact Worker then confirms secret names and types', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let patched = false;
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (init.method === 'PATCH') patched = true;
    const result = url.endsWith('/deployments?per_page=1')
      ? { deployments: [{ versions: [{ version_id: patched ? versionId : previousVersionId,
        percentage: 100 }] }] }
      : url.endsWith(`/versions/${previousVersionId}`)
        ? { id: previousVersionId, resources: { bindings: [] } }
      : url.endsWith(`/versions/${versionId}`)
        ? { id: versionId, resources: { bindings: metadata } } : {};
    return Response.json({ success: true, result });
  }) as typeof fetch;
  const result = await installNativeStudioSecrets(scope, account, token, secrets, fetcher);
  assert.equal(result.worker, `gnr8-${scope.siteId}-studio`);
  assert.deepEqual(result.secretNames, Object.keys(secrets).sort());
  assert.equal(result.versionId, versionId);
  assert.equal(result.previousVersionId, previousVersionId);
  assert.equal(calls.length, 5);
  assert.equal(calls[2].url,
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${result.worker}/secrets-bulk`);
  assert.equal(calls[0].url, calls[2].url.replace('/secrets-bulk', '/deployments?per_page=1'));
  assert.equal(calls[1].url, calls[2].url.replace('/secrets-bulk', `/versions/${previousVersionId}`));
  assert.equal(calls[3].url, calls[0].url);
  assert.equal(calls[4].url, calls[2].url.replace('/secrets-bulk', `/versions/${versionId}`));
  assert.equal(calls[2].init.method, 'PATCH');
  const body = JSON.parse(String(calls[2].init.body));
  assert.deepEqual(Object.keys(body), ['secrets']);
  assert.deepEqual(Object.keys(body.secrets).sort(), Object.keys(secrets).sort());
  for (const [name, value] of Object.entries(secrets))
    assert.deepEqual(body.secrets[name], { name, text: value, type: 'secret_text' });
});

test('fails closed when Cloudflare readback is incomplete', async () => {
  let patched = false;
  const fetcher = (async (url: string, init: RequestInit) => {
    if (init.method === 'PATCH') patched = true;
    return Response.json({ success: true,
    result: url.endsWith('/deployments?per_page=1')
      ? { deployments: [{ versions: [{ version_id: patched ? versionId : previousVersionId,
        percentage: 100 }] }] }
      : url.endsWith(`/versions/${previousVersionId}`)
        ? { id: previousVersionId, resources: { bindings: [] } }
      : url.endsWith(`/versions/${versionId}`)
        ? { id: versionId, resources: { bindings: metadata.slice(1) } } : {},
    });
  }) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_secret_readback_failed/);
});

test('an existing publish secret blocks replacement before any PATCH', async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method} ${new URL(url).pathname}`);
    if (init.method === 'PATCH') throw Error('must not replace old secret');
    return Response.json({ success: true, result:
      url.endsWith('/deployments?per_page=1')
        ? { deployments: [{ versions: [{ version_id: previousVersionId,
          percentage: 100 }] }] }
        : { id: previousVersionId, resources: { bindings: [
          { name: 'PUBLISH_CLOUDFLARE_API_TOKEN', type: 'secret_text' },
        ] } } });
  }) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_existing_publish_secret_requires_cutover/);
  assert.equal(calls.length, 2);
  assert(calls.every(call => call.startsWith('GET ')));
});

test('latest secret list cannot hide an inactive or split deployment', async () => {
  const fetcher = (async (url: string) => Response.json({ success: true,
    result: url.endsWith('/deployments?per_page=1')
      ? { deployments: [{ versions: [{ version_id: versionId, percentage: 50 },
        { version_id: '55555555-5555-4555-8555-555555555555', percentage: 50 }] }] }
      : metadata,
  })) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_secret_readback_failed/);
});

test('secret upload without a new active version is not reported as installed', async () => {
  const fetcher = (async (url: string) => Response.json({ success: true,
    result: url.endsWith('/deployments?per_page=1')
      ? { deployments: [{ versions: [{ version_id: previousVersionId,
        percentage: 100 }] }] }
      : { id: previousVersionId, resources: { bindings: [] } },
  })) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_secret_readback_failed/);
});

test('provider failures never expose returned credentials', async () => {
  const fetcher = (async (url: string, init: RequestInit) => Response.json(
    init.method === 'PATCH'
      ? { success: false, errors: [{ message: 'private-key' }] }
      : { success: true, result: url.endsWith('/deployments?per_page=1')
        ? { deployments: [{ versions: [{ version_id: previousVersionId,
          percentage: 100 }] }] }
        : { id: previousVersionId, resources: { bindings: [] } } },
  )) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    error => error instanceof Error && error.message === 'native_studio_secret_install_failed');
});

test('invalid identities fail before a provider request', async () => {
  let called = false;
  const fetcher = (async () => { called = true; throw Error('unexpected'); }) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token,
    { ...secrets, EXTRA: 'wrong' } as NativeStudioRuntimeSecrets, fetcher),
  /native_studio_secret_install_invalid/);
  await assert.rejects(installNativeStudioSecrets({ ...scope, agencyId: '../foreign' },
    account, token, secrets, fetcher), /native_studio_secret_install_invalid/);
  assert.equal(called, false);
});

test('read-only inspection identifies a complete previous version without exposing values', async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    calls.push(path);
    assert.equal(init.method, 'GET');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${token}`);
    return Response.json({ success: true,
      result: path.endsWith(`/workers/workers/${worker}`) ? workerIdentity
        : { id: previousVersionId,
          resources: { bindings: [...siteBindings, ...metadata.map(binding =>
            ({ ...binding, text: 'provider-private-value' }))] } } });
  }) as typeof fetch;
  const result = await inspectNativeStudioRecoveryBindings(scope, account,
    token, previousVersionId, expected, fetcher);
  assert.equal(result.state, 'complete-bindings');
  assert.deepEqual(result.missingSecretNames, []);
  assert.deepEqual(result.missingBindingNames, []);
  assert.deepEqual(calls, [
    `/client/v4/accounts/${account}/workers/workers/${worker}`,
    `/client/v4/accounts/${account}/workers/scripts/${worker}/versions/${previousVersionId}`,
  ]);
  assert(!JSON.stringify(result).includes('provider-private-value'));
});

test('inspection reports missing or duplicate bindings without calling it a recovery proof', async () => {
  const fetcher = (async (url: string) => Response.json({ success: true,
    result: url.endsWith(`/workers/workers/${worker}`) ? workerIdentity
      : { id: previousVersionId, resources: { bindings: [
        ...siteBindings.filter(binding => binding.name !== 'ASSETS'),
        { ...siteBindings.find(binding => binding.name === 'STUDIO_ORIGIN')!,
          text: 'https://wrong.example.com' },
        ...metadata.filter(binding => binding.name !== 'SESSION_SECRET'),
        metadata[0],
      ] } } })) as typeof fetch;
  const result = await inspectNativeStudioRecoveryBindings(scope, account,
    token, previousVersionId, expected, fetcher);
  assert.equal(result.state, 'incomplete-bindings');
  assert.deepEqual(result.missingSecretNames, ['AI_API_KEY', 'SESSION_SECRET']);
  assert.deepEqual(result.missingBindingNames, ['ASSETS', 'STUDIO_ORIGIN']);
});

test('missing recovery references and deleted versions are explicit', async () => {
  let calls = 0;
  const fetcher = (async (url: string) => {
    calls++;
    return url.endsWith(`/workers/workers/${worker}`)
      ? Response.json({ success: true, result: workerIdentity })
      : new Response(null, { status: 404 });
  }) as typeof fetch;
  const noReference = await inspectNativeStudioRecoveryBindings(scope, account,
    token, null, expected, fetcher);
  assert.equal(noReference.state, 'no-reference');
  assert.equal(calls, 0);
  const missing = await inspectNativeStudioRecoveryBindings(scope, account,
    token, previousVersionId, expected, fetcher);
  assert.equal(missing.state, 'version-missing');
  assert.equal(calls, 2);
});

test('inspection fails closed on wrong version identity and hides provider errors', async () => {
  let calls = 0;
  const fetcher = (async (url: string) => {
    calls++;
    return Response.json({ success: true, result:
      url.endsWith(`/workers/workers/${worker}`) ? workerIdentity
        : { id: versionId, resources: { bindings: [...siteBindings, ...metadata] },
          value: 'provider-private-value' } });
  }) as typeof fetch;
  await assert.rejects(inspectNativeStudioRecoveryBindings(scope, account,
    token, previousVersionId, expected, fetcher),
  error => error instanceof Error &&
    error.message === 'native_studio_recovery_inspection_failed');
  await assert.rejects(inspectNativeStudioRecoveryBindings(
    { ...scope, siteId: '../foreign' }, account, token,
    previousVersionId, expected, fetcher), /native_studio_recovery_inspection_invalid/);
  assert.equal(calls, 2);
});

test('recovery inspection rejects a Worker with the wrong immutable identity', async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return Response.json({ success: true,
      result: { ...workerIdentity, id: 'c'.repeat(32) } });
  }) as typeof fetch;
  await assert.rejects(inspectNativeStudioRecoveryBindings(scope, account,
    token, previousVersionId, expected, fetcher),
  /native_studio_recovery_inspection_failed/);
  assert.equal(calls, 1);
});
