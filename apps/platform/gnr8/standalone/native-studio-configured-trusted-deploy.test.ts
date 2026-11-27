import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioTrustedDeploy } from './native-studio-configured-trusted-deploy';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki',
  accountId: 'a'.repeat(32), studioOrigin: 'https://site.example.com' };
const commit = 'b'.repeat(40);

test('trusted deploy receives only the bound site and exact GitHub inspector', async () => {
  const calls: string[] = [];
  const input = { scope, client: {} as SupabaseClient,
    store: { read: async () => null, claim: async () => true },
    project: '/tmp/verified', sourceId: 'c'.repeat(64), commit,
    workerId: 'd'.repeat(32), trustedWrangler: '/usr/bin/wrangler',
    args: ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag',
      'gnr8-first-' + 'e'.repeat(64)],
    cloudflareCredential: 'f'.repeat(40), secrets: {} as any };
  const result = await configuredNativeStudioTrustedDeploy(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, {
      site: async () => { calls.push('site'); return site; },
      head: async () => { calls.push('head'); return { repositoryId: '42',
        branch: site.branch, commit }; },
      deploy: async (value: any, deps: any) => {
        calls.push('deploy');
        assert.equal(value.site, site);
        assert.equal(value.cwd, '/tmp/verified/studio');
        assert.equal(value.accountId, site.accountId);
        assert.deepEqual(await deps.inspectGitHubHead(), {
          repositoryId: '42', branch: site.branch, commit });
        return { state: 'invoked' };
      },
    } as any);
  assert.deepEqual(result, { state: 'invoked' });
  assert.deepEqual(calls, ['site', 'deploy', 'site', 'head']);
});

test('site drift blocks head inspection inside the final gate', async () => {
  let reads = 0, headCalls = 0;
  await assert.rejects(configuredNativeStudioTrustedDeploy({
    scope, client: {} as SupabaseClient,
    store: { read: async () => null, claim: async () => true },
    project: '/tmp/verified', sourceId: 'c'.repeat(64), commit,
    workerId: 'd'.repeat(32), trustedWrangler: '/usr/bin/wrangler',
    args: [], cloudflareCredential: 'f'.repeat(40), secrets: {} as any,
  }, {}, (async () => { throw Error('no provider call'); }) as typeof fetch, {
    site: async () => ++reads === 1 ? site : { ...site, accountId: '0'.repeat(32) },
    head: async () => { headCalls++; },
    deploy: async (_value: any, deps: any) => deps.inspectGitHubHead(),
  } as any), /target_changed/);
  assert.equal(headCalls, 0);
});
