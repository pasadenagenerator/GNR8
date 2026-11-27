import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioFirstDeployDryRun } from './native-studio-configured-first-deploy-dry-run';

test('preflight receives a verified checkout and no deployment credential', async () => {
  const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333' };
  const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40);
  const workerId = 'c'.repeat(32), site = { siteId: scope.siteId };
  const result = await configuredNativeStudioFirstDeployDryRun({ scope,
    client: {} as SupabaseClient, sourceId, sourceCommit, workerId,
    trustedGit: '/usr/bin/git', trustedWrangler: '/usr/bin/wrangler',
  }, {}, (async () => { throw Error('no provider call'); }) as typeof fetch, {
    withCheckout: async (_input: any, use: any) => use({
      project: '/tmp/verified', store: {}, site,
      sourceId, commit: sourceCommit, workerId, files: 2 }),
    record: async (value: any) => {
      assert.equal(value.project, '/tmp/verified');
      assert.equal(value.site, site);
      assert.equal(value.trustedWrangler, '/usr/bin/wrangler');
      assert.equal(value.cloudflareCredential, undefined);
      return { sourceId, commit: sourceCommit, workerId, files: 2 };
    },
  } as any);
  assert.deepEqual(result, { sourceId, commit: sourceCommit, workerId, files: 2 });
});
