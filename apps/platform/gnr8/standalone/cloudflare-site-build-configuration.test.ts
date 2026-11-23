import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureCloudflareSiteBuildConfiguration,
  inspectCloudflareSiteBuildPublicationSeparation,
  ensureBoundCloudflareSiteBuildConfiguration,
  type SiteBuildTarget } from './cloudflare-site-build-configuration';

const target: SiteBuildTarget = {
  scope: { agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333' },
  accountId: 'a'.repeat(32), githubOwner: 'pasadenagenerator',
  githubOwnerId: 123, repository: 'gnr8-site-3333', repositoryId: 456,
  branch: 'codex/native-stacki',
  buildTokenUuid: '44444444-4444-4444-8444-444444444444',
};
const tag = 'b'.repeat(32);
const credential = 'c'.repeat(40);
const reader = 'd'.repeat(40);

function fixture(mode: 'normal' | 'lost' | 'absent' = 'normal') {
  const saved = new Map<string, unknown>();
  let live: Record<string, unknown> | null = null;
  let creates = 0;
  const store = {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const transport = (async (url: string, options: RequestInit) => {
    const path = new URL(url).pathname;
    const auth = new Headers(options.headers).get('authorization');
    if (path.endsWith('/workers/scripts')) {
      assert.equal(auth, `Bearer ${reader}`);
      return Response.json({ success: true, result: [
        { id: `gnr8-${target.scope.siteId}-site`, tag },
      ] });
    }
    assert.equal(auth, `Bearer ${credential}`);
    if (path.endsWith(`/builds/workers/${tag}`))
      return live ? Response.json({ success: true, result: live })
        : new Response(null, { status: 404 });
    assert(path.endsWith('/builds/workers'));
    assert.equal(options.method, 'POST');
    creates++;
    const body = JSON.parse(String(options.body));
    assert.equal(body.script_tag, tag);
    assert.equal(body.git_repository.repo_id, String(target.repositoryId));
    assert.equal(body.git_repository.branch, target.branch);
    assert.equal(body.production_settings.deploy_command, 'npx wrangler versions upload');
    assert.equal(body.previews_enabled, false);
    if (mode !== 'absent') live = body;
    if (mode !== 'normal') throw Error('lost provider response');
    return Response.json({ success: true, result: body });
  }) as typeof fetch;
  return { store, transport, creates: () => creates,
    setLive: (value: Record<string, unknown>) => { live = value; } };
}

test('connects the exact site Worker once without push-triggered publication', async () => {
  const f = fixture();
  const first = await ensureCloudflareSiteBuildConfiguration(target, f.store,
    credential, reader, f.transport);
  assert.deepEqual(first, { worker: `gnr8-${target.scope.siteId}-site`, tag });
  assert.deepEqual(await ensureCloudflareSiteBuildConfiguration(target, f.store,
    credential, reader, f.transport), first);
  assert.equal(f.creates(), 1);
});

test('reconciles a lost create response but never repeats an unconfirmed create', async () => {
  const recovered = fixture('lost');
  await ensureCloudflareSiteBuildConfiguration(target, recovered.store,
    credential, reader, recovered.transport);
  assert.equal(recovered.creates(), 1);
  const pending = fixture('absent');
  await assert.rejects(ensureCloudflareSiteBuildConfiguration(target, pending.store,
    credential, reader, pending.transport), /native_studio_site_build_pending/);
  await assert.rejects(ensureCloudflareSiteBuildConfiguration(target, pending.store,
    credential, reader, pending.transport), /native_studio_site_build_pending/);
  assert.equal(pending.creates(), 1);
});

test('rejects a build configuration that would publish on GitHub Push', async () => {
  const f = fixture();
  f.setLive({ script_tag: tag, git_repository: {
    provider_type: 'github', provider_account_id: '123',
    provider_account_name: target.githubOwner, repo_id: '456',
    repo_name: target.repository, branch: target.branch,
  }, production_settings: { build_command: 'npm run build',
    deploy_command: 'npx wrangler deploy', build_token_uuid: target.buildTokenUuid,
    root_directory: '/' }, previews_enabled: false });
  await assert.rejects(ensureCloudflareSiteBuildConfiguration(target, f.store,
    credential, reader, f.transport), /native_studio_site_build_conflict/);
  assert.equal(f.creates(), 0);
});

test('production boundary reads the exact bound repository before Cloudflare access', async () => {
  const f = fixture();
  const client = { from(name: string) {
    const filters: Record<string, string> = {};
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() {
        assert.equal(filters.site_id ?? filters.id, target.scope.siteId);
        assert.equal(filters.agency_id, target.scope.agencyId);
        assert.equal(filters.client_id ?? filters.org_id, target.scope.clientId);
        return { error: null, data: name === 'sites'
          ? { domain: 'site.app.pasadenagenerator.com' }
          : { github_owner: target.githubOwner, github_owner_id: target.githubOwnerId,
              github_owner_kind: 'User', repository: target.repository,
              repository_id: target.repositoryId, binding_state: 'bound' } };
      } };
    return { select: () => query };
  } } as unknown as SupabaseClient;
  await ensureBoundCloudflareSiteBuildConfiguration(target.scope, client, f.store,
    target.accountId, target.branch, target.buildTokenUuid,
    credential, reader, f.transport);
  assert.equal(f.creates(), 1);
  let providerCalls = 0;
  const absent = { from(name: string) {
    return { select() { return { eq() { return this; },
      async maybeSingle() { return { error: null, data: name === 'sites'
        ? { domain: 'site.app.pasadenagenerator.com' } : null }; } }; } };
  } } as unknown as SupabaseClient;
  await assert.rejects(ensureBoundCloudflareSiteBuildConfiguration(target.scope,
    absent, f.store, target.accountId, target.branch, target.buildTokenUuid,
    credential, reader, (async () => { providerCalls++; throw Error('unexpected'); }) as typeof fetch),
  /native_studio_site_build_scope_unverified/);
  assert.equal(providerCalls, 0);
});

test('public cutover accepts only absent or version-only scoped Builds', async () => {
  const site = { scope: target.scope, accountId: target.accountId,
    repository: `${target.githubOwner}/${target.repository}`,
    repositoryId: String(target.repositoryId), branch: target.branch };
  const expected = { script_tag: tag, previews_enabled: false,
    git_repository: { provider_type: 'github',
      repo_id: String(target.repositoryId), repo_name: target.repository,
      provider_account_name: target.githubOwner, branch: target.branch },
    production_settings: { build_command: 'npm run build',
      deploy_command: 'npx wrangler versions upload' } };
  let config: unknown = null;
  let reads = 0;
  const transport = (async (url: string, options: RequestInit) => {
    reads++;
    assert.equal(options.method, 'GET');
    assert.equal(new Headers(options.headers).get('authorization'),
      `Bearer ${credential}`);
    if (new URL(url).pathname.endsWith('/workers/scripts'))
      return Response.json({ success: true, result: [
        { id: `gnr8-${target.scope.siteId}-site`, tag },
      ] });
    assert(new URL(url).pathname.endsWith(`/builds/workers/${tag}`));
    return config === null ? new Response(null, { status: 404 }) :
      Response.json({ success: true, result: config });
  }) as typeof fetch;
  assert.equal((await inspectCloudflareSiteBuildPublicationSeparation(site,
    credential, transport)).state, 'disconnected');
  config = expected;
  assert.equal((await inspectCloudflareSiteBuildPublicationSeparation(site,
    credential, transport)).state, 'version-only');
  config = { ...expected, production_settings: {
    ...expected.production_settings, deploy_command: 'npx wrangler deploy' } };
  await assert.rejects(inspectCloudflareSiteBuildPublicationSeparation(site,
    credential, transport), /separation_conflict/);
  config = { ...expected, git_repository: {
    ...expected.git_repository, repo_id: '999' } };
  await assert.rejects(inspectCloudflareSiteBuildPublicationSeparation(site,
    credential, transport), /separation_conflict/);
  assert.equal(reads, 8);
});
