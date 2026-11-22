import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioSourceCheckout } from './native-studio-configured-source-checkout';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const client = {} as SupabaseClient;
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki' };
const sourceId = 'a'.repeat(64), baseCommit = 'b'.repeat(40);
const token = 'ghs_' + 'c'.repeat(40);
const input = { scope, client, sourceId, trustedGit: '/usr/bin/git',
  author: { name: 'GNR8', email: 'gnr8@example.com' } };

test('scoped read token and exact missing branch prepare the first checkout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  try {
    const calls: string[] = [];
    const store = { read: async () => null };
    const deps = {
      site: async () => { calls.push('site'); return site; },
      token: async (...args: any[]) => {
        calls.push('token'); assert.equal(args[6], 'read');
        return { token, repositoryId: site.repositoryId }; },
      head: async () => { calls.push('head'); return { repositoryId: site.repositoryId,
        branch: site.branch, commit: null, baseCommit }; },
      store: () => store,
      checkout: async (value: any) => {
        calls.push('checkout');
        assert.deepEqual(value, { site, sourceId, baseCommit, store,
          credential: token, trustedGit: input.trustedGit, author: input.author });
        return { root, project: join(root, 'project'), commit: 'd'.repeat(40) }; },
    } as any;
    const result = await configuredNativeStudioSourceCheckout(input, {},
      (async () => { throw Error('no provider call'); }) as typeof fetch, deps);
    assert.equal(result.root, root);
    assert.deepEqual(calls, ['site', 'token', 'head', 'site', 'checkout', 'site']);
    assert(!('token' in result));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('changed target after checkout removes it before any build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  let reads = 0;
  const deps = { site: async () => ++reads === 3 ? { ...site,
      repositoryId: '43' } : site,
    token: async () => ({ token, repositoryId: site.repositoryId }),
    head: async () => ({ repositoryId: site.repositoryId,
      branch: site.branch, commit: null, baseCommit }),
    store: () => ({}),
    checkout: async () => ({ root, project: join(root, 'project') }),
  } as any;
  await assert.rejects(configuredNativeStudioSourceCheckout(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /target_changed/);
  await assert.rejects(stat(root), { code: 'ENOENT' });
});
