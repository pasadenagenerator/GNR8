import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { fingerprint } from './publication-contract';
import { PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';
import { runConfiguredNativeStudioPublicDeploy } from './native-studio-configured-public-deploy-run';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40);
const workerId = 'c'.repeat(32), publicWorkerId = 'd'.repeat(32);
const site = { siteId: scope.siteId, accountId: 'e'.repeat(32),
  repository: 'example/site', repositoryId: '42', branch: 'codex/native-stacki',
  studioOrigin: 'https://site.app.pasadenagenerator.com' };
const token = 'f'.repeat(40), secrets = { AI_API_KEY: 'g'.repeat(20) };
const studioTag = firstStudioDeployIdentity({ scope,
  accountId: site.accountId, workerId, sourceId, site,
  token, secrets, commit }).tag;
const domain = new URL(site.studioOrigin).hostname;
const receipt = { identity: fingerprint({ scope, accountId: site.accountId,
  sourceId, commit, publicWorkerId, studioTag, domain,
  repository: site.repository }), commit, publicWorkerId };

function fixture() {
  const calls: string[] = [];
  const saved = new Map<string, unknown>([
    ['native-studio/resources-reserved-v1.json', { workers: {
      publicSite: { worker: `gnr8-${scope.siteId}-site`, id: publicWorkerId } } }],
    [PUBLIC_INTENT, receipt],
  ]);
  const store = {
    read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
  };
  const deps = {
    withCheckout: async (_input: unknown, use: any) => { calls.push('checkout');
      return use({ store, site, project: '/tmp/verified',
        sourceId, commit, workerId }); },
    credentials: async () => { calls.push('credentials');
      return { cloudflareCredential: token, secrets }; },
    deploy: async () => { calls.push('deploy');
      saved.set('native-studio/first-public-deploy-attempt-v1.json', receipt); },
    inspect: async () => { calls.push('readback');
      return { state: 'observed-control-plane' }; },
  } as any;
  const input = { scope, client: {} as SupabaseClient, sourceId,
    sourceCommit: commit, workerId, trustedGit: '/usr/bin/git',
    trustedWrangler: '/usr/bin/wrangler' };
  return { calls, saved, deps, input };
}

test('configured public deploy reads exact intent and returns first-open handoff', async () => {
  const f = fixture();
  assert.deepEqual(await runConfiguredNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), { state: 'first-open-required', commit,
    observation: 'observed-control-plane' });
  assert.deepEqual(f.calls, ['checkout', 'credentials', 'deploy', 'readback']);
  assert.deepEqual(await runConfiguredNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), { state: 'first-open-required', commit,
    observation: 'observed-control-plane' });
  assert.equal(f.calls.filter(call => call === 'deploy').length, 1);
});

test('lost deploy response reconciles once; foreign intent cannot deploy', async () => {
  const f = fixture();
  f.deps.deploy = async () => { f.calls.push('deploy');
    f.saved.set('native-studio/first-public-deploy-attempt-v1.json', receipt);
    throw Error('lost provider response'); };
  assert.equal((await runConfiguredNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps)).state, 'first-open-required');
  const wrong = fixture();
  wrong.saved.set(PUBLIC_INTENT, { ...receipt, identity: '0'.repeat(64) });
  await assert.rejects(runConfiguredNativeStudioPublicDeploy(wrong.input,
    {}, fetch, wrong.deps), /intent_unverified/);
  assert.equal(wrong.calls.includes('deploy'), false);
});
