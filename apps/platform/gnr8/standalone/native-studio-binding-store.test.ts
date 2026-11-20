import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeStudioSiteFromRow, readNativeStudioBindingForScope } from './native-studio-binding-store';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const row = { site_id: scope.siteId, agency_id: scope.agencyId, client_id: scope.clientId,
  studio_origin: 'https://site.app.pasadenagenerator.com', repository: 'example/site',
  repository_id: 123, branch: 'codex/native-stacki', cloudflare_account_id: 'a'.repeat(32),
  github_app_id: '456', github_installation_id: '789', github_client_id: 'Iv1.example',
  studio_worker: `gnr8-${scope.siteId}-studio`, site_worker: `gnr8-${scope.siteId}-site`,
  draft_bucket: `gnr8-${scope.siteId}-drafts`, verified_at: new Date().toISOString() };

function client(result: { data: unknown; error: unknown }) {
  const filters: Array<[string, string]> = [];
  const query = { eq(key: string, value: string) { filters.push([key, value]); return query; },
    async maybeSingle() { return result; } };
  return { from(name: string) { assert.equal(name, 'gnr8_native_studio_bindings');
    return { select(columns: string) { assert(columns.includes('studio_origin')); return query; } }; },
    filters };
}

test('a verified exact-scope row is the launch and preparation binding', async () => {
  const db = client({ data: row, error: null });
  const site = await readNativeStudioBindingForScope(scope, db as any, '{}');
  assert.equal(site.repository, 'example/site');
  assert.equal(site.studioOrigin, row.studio_origin);
  assert.deepEqual(db.filters, [['agency_id', scope.agencyId], ['client_id', scope.clientId], ['site_id', scope.siteId]]);
});

test('cross-site and malformed receipts fail closed, rather than falling back to another site', async () => {
  for (const changed of [
    { ...row, site_id: '44444444-4444-4444-8444-444444444444' },
    { ...row, studio_worker: 'gnr8-other-studio' },
    { ...row, studio_origin: 'https://foreign.example.com/studio' },
    { ...row, repository_id: 0 },
  ]) {
    assert.throws(() => nativeStudioSiteFromRow(scope, changed), /native_studio_binding_invalid/);
    await assert.rejects(readNativeStudioBindingForScope(scope,
      client({ data: changed, error: null }) as any, JSON.stringify({ [scope.siteId]: {
        siteId: scope.siteId, repository: 'example/fallback', repositoryId: '124',
        branch: 'main', studioOrigin: 'https://fallback.example.com', accountId: 'a'.repeat(32),
        appId: '456', installationId: '789', clientId: 'Iv1.example',
      } })), /native_studio_binding_invalid/);
  }
});

test('existing deployment map remains available until per-site receipts are installed', async () => {
  const source = JSON.stringify({ [scope.siteId]: { siteId: scope.siteId,
    repository: 'example/legacy', repositoryId: '124', branch: 'main',
    studioOrigin: 'https://legacy.example.com', accountId: 'a'.repeat(32),
    appId: '456', installationId: '789', clientId: 'Iv1.example' } });
  const site = await readNativeStudioBindingForScope(scope,
    client({ data: null, error: null }) as any, source);
  assert.equal(site.repository, 'example/legacy');
  await assert.rejects(readNativeStudioBindingForScope(scope,
    client({ data: null, error: { message: 'unavailable' } }) as any, undefined),
  /native_studio_binding_unavailable/);
});
