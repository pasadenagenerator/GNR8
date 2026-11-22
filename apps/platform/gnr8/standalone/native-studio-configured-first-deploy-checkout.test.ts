import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40);
const workerId = 'c'.repeat(32), accountId = 'd'.repeat(32);
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki', accountId,
  studioOrigin: 'https://site.example.com' };
const reserved = { target: { scope, repository: site.repository,
  repositoryId: 42, accountId, studioOrigin: site.studioOrigin },
  workers: { studio: { worker: `gnr8-${scope.siteId}-studio`, id: workerId },
    publicSite: { worker: `gnr8-${scope.siteId}-site`, id: 'e'.repeat(32) } },
  draftBucket: { bucket: `gnr8-${scope.siteId}-drafts`,
    bucketId: 'f'.repeat(32) } };
const input = { scope, client: {} as SupabaseClient, sourceId, sourceCommit,
  workerId, trustedGit: '/usr/bin/git' };

test('fresh source and artifact are verified before trusted consumer runs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  const calls: string[] = [];
  const deps = {
    site: async () => { calls.push('site'); return site; },
    store: () => ({ read: async () => reserved }),
    checkout: async () => { calls.push('checkout');
      return { root, project: join(root, 'project'), commit: sourceCommit }; },
    restore: async () => { calls.push('restore');
      return { sourceId, commit: sourceCommit, files: 2 }; },
    materialize: async () => { calls.push('materialize');
      return { sourceId, commit: sourceCommit, files: 2 }; },
    dispose: async (path: string) => { calls.push('dispose');
      await rm(path, { recursive: true, force: true }); },
  } as any;
  const result = await withConfiguredNativeStudioFirstDeployCheckout(input,
    async prepared => { calls.push('use');
      assert.equal(prepared.commit, sourceCommit);
      assert.equal(prepared.workerId, workerId);
      return prepared.files; }, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps);
  assert.equal(result, 2);
  assert.deepEqual(calls, ['site', 'checkout', 'restore', 'materialize',
    'site', 'use', 'dispose']);
  await assert.rejects(stat(root), { code: 'ENOENT' });
});

test('failed artifact check cleans checkout and never calls consumer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  let used = false;
  const deps = {
    site: async () => site,
    store: () => ({ read: async () => reserved }),
    checkout: async () => ({ root, project: join(root, 'project'),
      commit: sourceCommit }),
    restore: async () => { throw Error('artifact_changed'); },
    dispose: async (path: string) => rm(path, { recursive: true, force: true }),
  } as any;
  await assert.rejects(withConfiguredNativeStudioFirstDeployCheckout(input,
    async () => { used = true; }, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /artifact_changed/);
  assert.equal(used, false);
  await assert.rejects(stat(root), { code: 'ENOENT' });
});

test('changed reserved Worker prevents even the source checkout', async () => {
  let checkedOut = false;
  const deps = {
    site: async () => site,
    store: () => ({ read: async () => ({ ...reserved,
      workers: { ...reserved.workers,
        studio: { ...reserved.workers.studio, id: '0'.repeat(32) } } }) }),
    checkout: async () => { checkedOut = true; },
  } as any;
  await assert.rejects(withConfiguredNativeStudioFirstDeployCheckout(input,
    async () => {}, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /resources_unverified/);
  assert.equal(checkedOut, false);
});
