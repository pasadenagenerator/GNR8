import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioArtifactGitHubRestore } from './native-studio-configured-artifact-github-restore';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki' };
const sourceCommit = 'a'.repeat(40), artifactCommit = 'b'.repeat(40);
const sourceId = 'c'.repeat(64), workerId = 'd'.repeat(32);
const branch = `gnr8-build-${sourceCommit}`;
const input = { scope, client: {} as SupabaseClient, project: '/tmp/project',
  sourceId, sourceCommit, workerId, trustedGit: '/usr/bin/git' };

test('configured restore checks exact bound GitHub artifact before fetching', async () => {
  const calls: string[] = [];
  const deps = {
    site: async () => { calls.push('site'); return site; },
    store: () => ({ read: async () => ({ sourceId, sourceCommit,
      workerId, branch, artifactCommit }) }),
    token: async () => { calls.push('token'); return { repositoryId: '42',
      token: 'ghs_' + 'x'.repeat(40) }; },
    head: async (target: any) => { calls.push('head');
      assert.equal(target.branch, branch);
      return { repositoryId: '42', branch, commit: artifactCommit }; },
    restore: async (value: any) => { calls.push('restore');
      assert.equal(value.sourceCommit, sourceCommit);
      return { files: 2 }; },
  } as any;
  assert.deepEqual(await configuredNativeStudioArtifactGitHubRestore(input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  { files: 2 });
  assert.deepEqual(calls, ['site', 'token', 'head', 'site', 'restore', 'site']);
});

test('changed artifact branch stops before download', async () => {
  let downloaded = false;
  const deps = {
    site: async () => site,
    store: () => ({ read: async () => ({ sourceId, sourceCommit,
      workerId, branch, artifactCommit }) }),
    token: async () => ({ repositoryId: '42', token: 'ghs_' + 'x'.repeat(40) }),
    head: async () => ({ repositoryId: '42', branch,
      commit: 'f'.repeat(40) }),
    restore: async () => { downloaded = true; },
  } as any;
  await assert.rejects(configuredNativeStudioArtifactGitHubRestore(input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /remote_changed/);
  assert.equal(downloaded, false);
});
