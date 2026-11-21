import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installNativeStudioSecrets } from './cloudflare-studio-secrets';
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

test('patches only the exact Worker then confirms secret names and types', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let patched = false;
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (init.method === 'PATCH') patched = true;
    const result = url.endsWith('/deployments?per_page=1')
      ? { deployments: [{ versions: [{ version_id: patched ? versionId : previousVersionId,
        percentage: 100 }] }] }
      : url.endsWith(`/versions/${versionId}`)
        ? { id: versionId, resources: { bindings: metadata } } : {};
    return Response.json({ success: true, result });
  }) as typeof fetch;
  const result = await installNativeStudioSecrets(scope, account, token, secrets, fetcher);
  assert.equal(result.worker, `gnr8-${scope.siteId}-studio`);
  assert.deepEqual(result.secretNames, Object.keys(secrets).sort());
  assert.equal(result.versionId, versionId);
  assert.equal(calls.length, 4);
  assert.equal(calls[1].url,
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${result.worker}/secrets-bulk`);
  assert.equal(calls[0].url, calls[1].url.replace('/secrets-bulk', '/deployments?per_page=1'));
  assert.equal(calls[2].url, calls[0].url);
  assert.equal(calls[3].url, calls[1].url.replace('/secrets-bulk', `/versions/${versionId}`));
  assert.equal(calls[1].init.method, 'PATCH');
  const body = JSON.parse(String(calls[1].init.body));
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
      : url.endsWith(`/versions/${versionId}`)
        ? { id: versionId, resources: { bindings: metadata.slice(1) } } : {},
    });
  }) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_secret_readback_failed/);
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
        percentage: 100 }] }] } : {},
  })) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_secret_readback_failed/);
});

test('provider failures never expose returned credentials', async () => {
  const fetcher = (async (_url: string, init: RequestInit) => Response.json(
    init.method === 'GET'
      ? { success: true, result: { deployments: [{ versions: [{ version_id: previousVersionId,
        percentage: 100 }] }] } }
      : { success: false, errors: [{ message: 'private-key' }] },
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
