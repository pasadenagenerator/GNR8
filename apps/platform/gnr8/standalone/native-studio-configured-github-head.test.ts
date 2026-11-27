import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inspectConfiguredNativeStudioGitHubHead } from './native-studio-configured-github-head';

const scope = { agencyId: 'agency', clientId: 'client', siteId: 'site' };
const site = { siteId: 'site', repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32), appId: '456', installationId: '789',
  clientId: 'Iv1.example' };
const client = {} as SupabaseClient;

test('final head check requests read-only permission for the bound repository', async () => {
  let reads = 0;
  const deps = {
    site: async () => { reads++; return site; },
    token: async (_scope: unknown, _client: unknown, _env: unknown,
      _transport: unknown, _reader: unknown, _now: unknown, permission: string) => {
      assert.equal(permission, 'read');
      return { token: 'ghs_' + 'a'.repeat(40), repositoryId: '42',
        expiresAt: new Date(Date.now() + 300_000).toISOString() };
    },
    head: async () => ({ repositoryId: '42', branch: site.branch,
      commit: 'b'.repeat(40) }),
  } as any;
  assert.equal((await inspectConfiguredNativeStudioGitHubHead(scope, client,
    {}, fetch, deps)).commit, 'b'.repeat(40));
  assert.equal(reads, 2);
});

test('changed site binding after GitHub read fails closed', async () => {
  let reads = 0;
  const deps = {
    site: async () => ++reads === 1 ? site : { ...site, repositoryId: '43' },
    token: async () => ({ token: 'ghs_' + 'a'.repeat(40),
      repositoryId: '42', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
    head: async () => ({ repositoryId: '42', branch: site.branch,
      commit: 'b'.repeat(40) }),
  } as any;
  await assert.rejects(inspectConfiguredNativeStudioGitHubHead(scope, client,
    {}, fetch, deps), /target_changed/);
});

test('token for another repository is rejected before head read', async () => {
  let headReads = 0;
  const deps = {
    site: async () => site,
    token: async () => ({ token: 'ghs_' + 'a'.repeat(40),
      repositoryId: '43', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
    head: async () => { headReads++; return { repositoryId: '42',
      branch: site.branch, commit: 'b'.repeat(40) }; },
  } as any;
  await assert.rejects(inspectConfiguredNativeStudioGitHubHead(scope, client,
    {}, fetch, deps), /unverified/);
  assert.equal(headReads, 0);
});

test('long token blocks deployment verification for the unchanged Stacki pin', async () => {
  let headReads = 0;
  const deps = {
    site: async () => site,
    token: async () => ({ token: 'ghs_' + 'a'.repeat(501),
      repositoryId: '42', expiresAt: new Date(Date.now() + 300_000).toISOString() }),
    head: async () => { headReads++; return { repositoryId: '42',
      branch: site.branch, commit: 'b'.repeat(40) }; },
  } as any;
  await assert.rejects(inspectConfiguredNativeStudioGitHubHead(scope, client,
    {}, fetch, deps), /upstream_github_token_incompatible/);
  assert.equal(headReads, 0);
});
