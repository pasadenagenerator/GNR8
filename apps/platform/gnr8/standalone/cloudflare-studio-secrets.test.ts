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

test('patches only the exact Worker then confirms secret names and types', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Response.json({ success: true, result: init.method === 'GET' ? metadata : {} });
  }) as typeof fetch;
  const result = await installNativeStudioSecrets(scope, account, token, secrets, fetcher);
  assert.equal(result.worker, `gnr8-${scope.siteId}-studio`);
  assert.deepEqual(result.secretNames, Object.keys(secrets).sort());
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url,
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${result.worker}/secrets-bulk`);
  assert.equal(calls[1].url, calls[0].url.replace('/secrets-bulk', '/secrets'));
  assert.equal(calls[0].init.method, 'PATCH');
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(Object.keys(body), ['secrets']);
  assert.deepEqual(Object.keys(body.secrets).sort(), Object.keys(secrets).sort());
  for (const [name, value] of Object.entries(secrets))
    assert.deepEqual(body.secrets[name], { name, text: value, type: 'secret_text' });
});

test('fails closed when Cloudflare readback is incomplete', async () => {
  const fetcher = (async (_url: string, init: RequestInit) => Response.json({
    success: true, result: init.method === 'GET' ? metadata.slice(1) : {},
  })) as typeof fetch;
  await assert.rejects(installNativeStudioSecrets(scope, account, token, secrets, fetcher),
    /native_studio_secret_readback_failed/);
});

test('provider failures never expose returned credentials', async () => {
  const fetcher = (async () => Response.json({
    success: false, errors: [{ message: 'private-key' }],
  })) as typeof fetch;
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
