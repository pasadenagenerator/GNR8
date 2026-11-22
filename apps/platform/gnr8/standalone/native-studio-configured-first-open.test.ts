import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { fingerprint } from './publication-contract';
import { recordConfiguredNativeStudioFirstOpen } from './native-studio-configured-first-open';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32),
  repository: 'example/site', repositoryId: '42', branch: 'codex/native-stacki',
  studioOrigin: 'https://site.app.pasadenagenerator.com',
  appId: '10', installationId: '11', clientId: 'Iv1.example' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40);
const studioWorkerId = 'd'.repeat(32), publicWorkerId = 'e'.repeat(32);
const cloudflareCredential = 'f'.repeat(40), secrets = { AI_API_KEY: 'g'.repeat(20) };
const { identity, tag } = firstStudioDeployIdentity({ scope,
  accountId: site.accountId, workerId: studioWorkerId, sourceId, site,
  token: cloudflareCredential, secrets, commit });
const publicReceipt = { identity: fingerprint({ scope,
  accountId: site.accountId, sourceId, commit, publicWorkerId,
  studioTag: tag, domain: new URL(site.studioOrigin).hostname,
  repository: site.repository }), commit, publicWorkerId };

function fixture() {
  const calls: string[] = [];
  const saved = new Map<string, unknown>([
    ['native-studio/resources-reserved-v1.json', {
      target: { scope, accountId: site.accountId,
        repository: site.repository, repositoryId: Number(site.repositoryId),
        studioOrigin: site.studioOrigin },
      draftBucket: { bucket: `gnr8-${scope.siteId}-drafts`,
        bucketId: '1'.repeat(32) },
      workers: { studio: { worker: `gnr8-${scope.siteId}-studio`, id: studioWorkerId },
        publicSite: { worker: `gnr8-${scope.siteId}-site`, id: publicWorkerId } },
    }],
    ['native-studio/build-handoff-v1.json', {
      scope, sourceId, commit, workerId: studioWorkerId,
      site: { siteId: site.siteId, repository: site.repository,
        branch: site.branch, studioOrigin: site.studioOrigin,
        accountId: site.accountId }, files: [{ path: 'dist/index.html' }],
    }],
    ['native-studio/first-deploy-intent-v1.json', { identity, commit }],
    ['native-studio/first-deploy-attempt-v1.json', { identity, commit }],
    ['native-studio/first-public-deploy-intent-v1.json', publicReceipt],
    ['native-studio/first-public-deploy-attempt-v1.json', publicReceipt],
  ]);
  const store = { read: async <T>(key: string) => (saved.get(key) ?? null) as T | null };
  const deps = {
    site: async () => { calls.push('site'); return site; },
    store: () => store,
    credentials: async () => { calls.push('credentials');
      return { cloudflareCredential, secrets }; },
    githubToken: async () => { calls.push('github-token');
      return { token: 'ghs_' + 'h'.repeat(40), repositoryId: site.repositoryId }; },
    record: async (input: any) => { calls.push('record');
      assert.equal(input.tag, tag);
      assert.equal(input.sourceId, sourceId);
      assert.equal(input.commit, commit);
      assert.equal(input.studioWorkerId, studioWorkerId);
      assert.equal(input.publicWorkerId, publicWorkerId);
      assert.equal(input.publicTag,
        `gnr8-public-first-${publicReceipt.identity}`);
      assert.equal(input.studioCredential, cloudflareCredential);
      assert.equal(input.publicCredential, cloudflareCredential);
      return { state: 'first-open-recorded' }; },
  } as any;
  return { calls, saved, deps };
}

test('configured handoff supplies the first-open recorder from scoped receipts', async () => {
  const f = fixture();
  assert.deepEqual(await recordConfiguredNativeStudioFirstOpen(scope,
    {} as SupabaseClient, {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), { state: 'first-open-recorded' });
  assert.deepEqual(f.calls, ['site', 'credentials', 'github-token', 'site', 'record']);
});

test('missing deploy attempt or changed target blocks first-open before GitHub access', async () => {
  const f = fixture();
  f.saved.delete('native-studio/first-deploy-attempt-v1.json');
  await assert.rejects(recordConfiguredNativeStudioFirstOpen(scope,
    {} as SupabaseClient, {}, fetch, f.deps), /deploy_unverified/);
  assert.deepEqual(f.calls, ['site', 'credentials']);
  const changed = fixture();
  const reserved = changed.saved.get('native-studio/resources-reserved-v1.json') as any;
  changed.saved.set('native-studio/resources-reserved-v1.json',
    { ...reserved, target: { ...reserved.target, repository: 'example/other' } });
  await assert.rejects(recordConfiguredNativeStudioFirstOpen(scope,
    {} as SupabaseClient, {}, fetch, changed.deps), /evidence_unverified/);
  assert.deepEqual(changed.calls, ['site']);
});

test('public gateway attempt is required before first-open', async () => {
  const f = fixture();
  f.saved.delete('native-studio/first-public-deploy-attempt-v1.json');
  await assert.rejects(recordConfiguredNativeStudioFirstOpen(scope,
    {} as SupabaseClient, {}, fetch, f.deps), /public_unverified/);
  assert.equal(f.calls.includes('record'), false);
});
