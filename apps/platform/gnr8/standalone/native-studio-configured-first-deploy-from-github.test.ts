import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareConfiguredNativeStudioFirstDeployFromGitHub } from './native-studio-configured-first-deploy-from-github';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40);
const workerId = 'c'.repeat(32);

test('deployment credentials load only after verified GitHub handoff', async () => {
  const calls: string[] = [];
  const store = { read: async () => null, claim: async () => true };
  const client = {} as SupabaseClient;
  const result = await prepareConfiguredNativeStudioFirstDeployFromGitHub({
    scope, client, sourceId, sourceCommit, workerId, trustedGit: '/usr/bin/git',
    loadDeploymentCredentials: async () => { calls.push('credentials');
      return { cloudflareCredential: 'x'.repeat(40), secrets: {} as any }; },
  }, {}, (async () => { throw Error('no provider call'); }) as typeof fetch, {
    withCheckout: async (_input: any, use: any) => {
      calls.push('verified-handoff');
      return use({ project: '/tmp/verified', store,
        sourceId, commit: sourceCommit, workerId });
    },
    prepareIntent: async (input: any) => {
      calls.push('intent');
      assert.equal(input.project, '/tmp/verified');
      assert.equal(input.store, store);
      assert.equal(input.commit, sourceCommit);
      return { state: 'prepared', commit: sourceCommit };
    },
  } as any);
  assert.deepEqual(calls, ['verified-handoff', 'credentials', 'intent']);
  assert.deepEqual(result, { state: 'prepared', commit: sourceCommit });
});
