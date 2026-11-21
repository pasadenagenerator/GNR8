import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const env = { GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
  GNR8_NATIVE_STUDIO_GITHUB_APP_ID: '456',
  GNR8_NATIVE_STUDIO_GITHUB_INSTALLATION_ID: '789',
  GNR8_NATIVE_STUDIO_GITHUB_CLIENT_ID: 'Iv1.example' };

function fixture() {
  let domain = 'site.app.pasadenagenerator.com';
  let state = 'bound';
  let reads = 0;
  const client = { from(name: string) {
    const filters: Record<string, string> = {};
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() {
        reads++;
        assert.equal(filters.site_id ?? filters.id, scope.siteId);
        assert.equal(filters.agency_id, scope.agencyId);
        assert.equal(filters.client_id ?? filters.org_id, scope.clientId);
        return { error: null, data: name === 'sites' ? { domain } : {
          github_owner: 'pasadenagenerator', github_owner_id: 123,
          github_owner_kind: 'User', repository: 'gnr8-site-3333',
          repository_id: state === 'bound' ? 456 : null, binding_state: state,
        } };
      } };
    return { select: () => query };
  } } as unknown as SupabaseClient;
  return { client, changeDomain: (value: string) => { domain = value; },
    changeState: (value: string) => { state = value; }, reads: () => reads };
}

test('new Studio site uses current scoped bindings and one central App installation', async () => {
  const f = fixture();
  assert.deepEqual(await configuredNativeStudioBootstrapSite(scope, f.client, env), {
    siteId: scope.siteId, repository: 'pasadenagenerator/gnr8-site-3333',
    repositoryId: '456', branch: 'codex/native-stacki',
    studioOrigin: 'https://site.app.pasadenagenerator.com',
    accountId: env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID,
    appId: env.GNR8_NATIVE_STUDIO_GITHUB_APP_ID,
    installationId: env.GNR8_NATIVE_STUDIO_GITHUB_INSTALLATION_ID,
    clientId: env.GNR8_NATIVE_STUDIO_GITHUB_CLIENT_ID,
  });
  assert.equal(f.reads(), 2);
});

test('missing central App settings and an unbound repository fail before preparation', async () => {
  const f = fixture();
  for (const key of Object.keys(env)) {
    const invalid = { ...env } as Record<string, string>;
    delete invalid[key];
    await assert.rejects(configuredNativeStudioBootstrapSite(scope, f.client, invalid),
      /native_studio_bootstrap_site_not_configured/);
  }
  assert.equal(f.reads(), 0);
  f.changeState('reserved');
  await assert.rejects(configuredNativeStudioBootstrapSite(scope, f.client, env),
    /site_github_binding_pending/);
  f.changeState('bound');
  f.changeDomain('other.example.com');
  assert.equal((await configuredNativeStudioBootstrapSite(scope, f.client, env)).studioOrigin,
    'https://other.example.com');
});
