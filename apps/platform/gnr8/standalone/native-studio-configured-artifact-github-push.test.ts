import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioArtifactGitHubPush } from './native-studio-configured-artifact-github-push';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki' };
const sourceCommit = 'a'.repeat(40), token = 'ghs_' + 'b'.repeat(40);

test('artifact publication receives only a repository-scoped write token', async () => {
  const calls: string[] = [];
  const deps = { site: async () => site,
    token: async (...args: any[]) => {
      calls.push('token'); assert.equal(args[6], 'write');
      return { token, repositoryId: site.repositoryId }; },
    head: async (target: any, key: string) => {
      calls.push('head'); assert.equal(key, token);
      assert.equal(target.branch, `gnr8-build-${sourceCommit}`);
      return { repositoryId: site.repositoryId,
        branch: target.branch, commit: null }; },
    prepare: async () => ({}), verifyParent: async () => ({}),
    transfer: async () => ({}),
    publish: async (value: any, inner: any) => {
      calls.push('publish'); assert.equal(value.credential, token);
      assert.equal(value.site.repository, site.repository);
      await inner.inspectRemote({ ...site,
        branch: `gnr8-build-${sourceCommit}` }, token);
      return { state: 'verified', sourceCommit, branch: `gnr8-build-${sourceCommit}`,
        commit: 'c'.repeat(40) }; },
  } as any;
  const result = await configuredNativeStudioArtifactGitHubPush({ scope,
    client: {} as SupabaseClient, store: {} as any,
    project: '/verified', sourceId: 'd'.repeat(64), sourceCommit,
    workerId: 'e'.repeat(32), trustedGit: '/usr/bin/git' }, {},
  (async () => { throw Error('unexpected provider call'); }) as typeof fetch, deps);
  assert.equal(result.state, 'verified');
  assert.deepEqual(calls, ['token', 'publish', 'head']);
});
