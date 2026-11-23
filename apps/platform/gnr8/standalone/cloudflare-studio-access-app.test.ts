import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId,
  studioOrigin: 'https://site.app.pasadenagenerator.com',
  accountId: 'a'.repeat(32) };
const appId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', aud = 'c'.repeat(64);
const credential = 'read-token-value-1234567890';
const app = { id: appId, type: 'self_hosted',
  domain: 'site.app.pasadenagenerator.com/studio', aud,
  destinations: [{ type: 'public', uri: `${site.studioOrigin}/studio` }] };
const organization = { auth_domain: 'gnr8.cloudflareaccess.com' };

function fixture(application: unknown = app, org: unknown = organization) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const transport = async (url: string | URL | Request, init?: RequestInit) => {
    const address = String(url);
    calls.push({ url: address, init: init ?? {} });
    const result = address.endsWith(`/access/apps/${appId}`) ? application : org;
    return Response.json({ success: true, result });
  };
  return { transport: transport as typeof fetch, calls };
}

test('observes one exact self-hosted Studio route without policy or login claims', async () => {
  const f = fixture();
  assert.deepEqual(await inspectCloudflareStudioAccessApp(scope, site, appId,
    credential, f.transport), { state: 'observed-access-app', scope,
    siteId: scope.siteId, studioOrigin: site.studioOrigin,
    accountId: site.accountId, appId, aud,
    teamDomain: organization.auth_domain });
  assert.deepEqual(f.calls.map(call => call.url), [
    `https://api.cloudflare.com/client/v4/accounts/${site.accountId}/access/apps/${appId}`,
    `https://api.cloudflare.com/client/v4/accounts/${site.accountId}/access/organizations`,
  ]);
  assert.ok(f.calls.every(call => call.init.method === 'GET' &&
    call.init.redirect === 'error' &&
    (call.init.headers as Record<string, string>).authorization === `Bearer ${credential}`));
});

test('rejects wider, narrower, bypassed or foreign Access applications', async () => {
  for (const changed of [
    { domain: 'site.app.pasadenagenerator.com' },
    { domain: 'site.app.pasadenagenerator.com/studio*' },
    { domain: 'site.app.pasadenagenerator.com/studio/*' },
    { id: 'd'.repeat(32) }, { type: 'bypass' }, { aud: '' },
    { destinations: [{ type: 'public', uri: 'https://preview.site.app.pasadenagenerator.com/studio' }] },
    { destinations: [app.destinations[0], { type: 'public', uri: `${site.studioOrigin}/other` }] },
    { destinations: [{ ...app.destinations[0], overrides: [{ behavior: 'public', path_pattern: '*' }] }] },
    { self_hosted_domains: [{ domain: `${site.studioOrigin}/other` }] },
  ]) {
    const f = fixture({ ...app, ...changed });
    await assert.rejects(inspectCloudflareStudioAccessApp(scope, site, appId,
      credential, f.transport), /native_studio_access_app_unverified/);
  }
});

test('fails before network for invalid binding and hides provider responses', async () => {
  const f = fixture();
  await assert.rejects(inspectCloudflareStudioAccessApp(scope,
    { ...site, siteId: '44444444-4444-4444-8444-444444444444' },
    appId, credential, f.transport), /native_studio_access_app_input_invalid/);
  assert.equal(f.calls.length, 0);
  const bad = async () => Response.json({ success: false,
    errors: [{ message: 'secret provider detail' }] }, { status: 403 });
  await assert.rejects(inspectCloudflareStudioAccessApp(scope, site, appId,
    credential, bad as typeof fetch), error => {
      assert.equal((error as Error).message, 'native_studio_access_app_readback_failed');
      return true;
    });
  await assert.rejects(inspectCloudflareStudioAccessApp(scope, site, appId,
    credential, fixture(app, { auth_domain: 'https://invalid.example.com' }).transport),
  /native_studio_access_app_unverified/);
});
