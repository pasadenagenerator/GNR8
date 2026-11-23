import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listVerifiedNativeStudioAccessV2Scopes } from './native-studio-access-v2-inventory';

const agencyId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const sites = [
  '33333333-3333-4333-8333-333333333331',
  '33333333-3333-4333-8333-333333333332',
  '33333333-3333-4333-8333-333333333333',
];
const sourceId = 'a'.repeat(64);
const row = (siteId: string, id: number | string) => ({ site_id: siteId,
  agency_id: agencyId, client_id: clientId, github_owner: 'owner',
  repository: `site-${id}`, repository_id: id, binding_state: 'bound' });
const rows = sites.map((siteId, index) => row(siteId,
  index === 1 ? String(index + 1) : index + 1));

function fixture(options: { corruptSite?: string; corruptSource?: string;
  v2Sites?: string[] } = {}) {
  const formats = new Map(sites.map((id, i) => [id,
    options.v2Sites?.includes(id) ? 'gnr8-native-studio-source:v2' :
      i === 1 ? 'gnr8-native-studio-source:v1' : 'missing']));
  const verified: string[] = [];
  const requests: Array<{ after: string | null; limit: number }> = [];
  let after: string | null = null;
  const query = { select(columns: string) {
    assert.equal(columns,
      'site_id,agency_id,client_id,github_owner,repository,repository_id,binding_state');
    return query;
  }, eq(column: string, value: string) {
    assert.deepEqual([column, value], ['binding_state', 'bound']); return query;
  }, order(column: string, value: unknown) {
    assert.equal(column, 'site_id');
    assert.deepEqual(value, { ascending: true }); return query;
  }, gt(column: string, value: string) {
    assert.equal(column, 'site_id'); after = value; return query;
  }, async limit(limit: number) {
    requests.push({ after, limit });
    return { error: null, data: rows.filter(item =>
      after === null || item.site_id > after).slice(0, limit) };
  } };
  const client = { from(name: string) {
    assert.equal(name, 'gnr8_site_github_repository_bindings');
    after = null; return query;
  } } as unknown as SupabaseClient;
  const deps = { site: async (scope: {siteId: string}) => {
    const record = rows.find(item => item.site_id === scope.siteId)!;
    return { siteId: scope.siteId,
      repository: options.corruptSite === scope.siteId ? 'other/repo' :
        `${record.github_owner}/${record.repository}`,
      repositoryId: String(record.repository_id), branch: 'codex/native-stacki',
      studioOrigin: `https://${scope.siteId}.example.com`,
      accountId: 'a'.repeat(32), appId: '1', installationId: '1', clientId: 'client' };
  }, store: (_client: SupabaseClient, scope: {siteId: string}) => ({
    read: async (key: string) => {
      const format = formats.get(scope.siteId);
      if (format === 'missing') return null;
      if (key === 'native-studio/build-handoff-v1.json') {
        const site = await deps.site(scope);
        return { scope: { agencyId, clientId, siteId: scope.siteId },
          sourceId, commit: 'b'.repeat(40), workerId: 'c'.repeat(32), files: [{}],
          site: { siteId: site.siteId, repository: site.repository,
            branch: site.branch, studioOrigin: site.studioOrigin,
            accountId: site.accountId } };
      }
      if (key === `native-sources/${sourceId}.json`) return {
        format, identitySha256: options.corruptSource === scope.siteId ? 'bad' : sourceId };
      throw Error('unexpected key');
    }, getBytes: async () => Buffer.alloc(0),
  }), source: async ({ sourceId: id, site }: {sourceId: string; site: {siteId: string}}) => {
    assert.equal(id, sourceId); verified.push(site.siteId);
    return { receipt: { format: formats.get(site.siteId),
      identitySha256: sourceId } };
  } };
  return { client, deps, verified, requests };
}

test('pages by bound site ID and includes only fully checked Access v2 sources', async () => {
  const f = fixture({ v2Sites: [sites[0]] });
  const first = await listVerifiedNativeStudioAccessV2Scopes({ client: f.client,
    limit: 2 }, {}, f.deps as any);
  assert.deepEqual(first, { entries: [{ scope: { agencyId, clientId,
    siteId: sites[0] }, sourceId }], errors: [], nextCursor: sites[1] });
  const second = await listVerifiedNativeStudioAccessV2Scopes({ client: f.client,
    cursor: first.nextCursor!, limit: 2 }, {}, f.deps as any);
  assert.deepEqual(second, { entries: [], errors: [], nextCursor: null });
  assert.deepEqual(f.verified, [sites[0], sites[1]]);
  assert.deepEqual(f.requests, [{ after: null, limit: 3 },
    { after: sites[1], limit: 3 }]);
});

test('source or current repository mismatch is reported without starving later sites', async () => {
  const source = fixture({ v2Sites: [sites[0]], corruptSource: sites[0] });
  assert.deepEqual(await listVerifiedNativeStudioAccessV2Scopes({ client: source.client,
    limit: 1 }, {}, source.deps as any), { entries: [],
    errors: [{ siteId: sites[0], code: 'source_invalid' }], nextCursor: sites[0] });
  assert.deepEqual(source.verified, []);
  const target = fixture({ v2Sites: [sites[0], sites[1]], corruptSite: sites[0] });
  assert.deepEqual(await listVerifiedNativeStudioAccessV2Scopes({ client: target.client,
    limit: 2 }, {}, target.deps as any), { entries: [{ scope: { agencyId,
      clientId, siteId: sites[1] }, sourceId }],
    errors: [{ siteId: sites[0], code: 'target_invalid' }], nextCursor: sites[1] });
});

test('a retained site without a handoff does not block later Access v2 sites', async () => {
  const f = fixture({ v2Sites: [sites[1]], corruptSite: sites[0] });
  const result = await listVerifiedNativeStudioAccessV2Scopes({ client: f.client,
    limit: 3 }, {}, f.deps as any);
  assert.deepEqual(result.entries, [{ scope: { agencyId, clientId,
    siteId: sites[1] }, sourceId }]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.nextCursor, null);
});

test('rejects invalid pagination input before querying storage', async () => {
  const f = fixture();
  await assert.rejects(listVerifiedNativeStudioAccessV2Scopes({ client: f.client,
    limit: 101 }, {}, f.deps as any), /input_invalid/);
  await assert.rejects(listVerifiedNativeStudioAccessV2Scopes({ client: f.client,
    cursor: '../other' }, {}, f.deps as any), /input_invalid/);
  assert.deepEqual(f.requests, []);
});
