import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { runConfiguredNativeStudioFirstDeploy } from './native-studio-configured-first-deploy-run';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40);
const workerId = 'c'.repeat(32);
const site = { accountId: 'e'.repeat(32) };
const token = 'f'.repeat(40), secrets = {};
const { identity, tag } = firstStudioDeployIdentity({ scope,
  accountId: site.accountId, workerId, sourceId, site,
  token, secrets, commit });
const args = ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag', tag];

function fixture() {
  const calls: string[] = [];
  const saved = new Map<string, unknown>();
  const store = { read: async (key: string) => saved.get(key) ?? null };
  const input = { scope, client: {} as SupabaseClient, sourceId,
    sourceCommit: commit, workerId, trustedGit: '/usr/bin/git',
    trustedWrangler: '/usr/bin/wrangler',
    verifyPreflight: async (expected: any) => { calls.push('preflight');
      return expected; },
    loadDeploymentCredentials: async () => { calls.push('credentials');
      return { cloudflareCredential: token, secrets: secrets as any }; },
  };
  const deps = {
    credentials: async (_scope: any, _store: any, accountId: string) => {
      assert.equal(accountId, site.accountId);
      calls.push('central-credentials');
      return { cloudflareCredential: token, secrets: secrets as any };
    },
    withCheckout: async (_value: any, use: any) => { calls.push('checkout');
      return use({ project: '/tmp/verified', store, site,
        sourceId, commit, workerId, files: 2 }); },
    prepareIntent: async () => { calls.push('intent'); return {
      state: 'prepared', commit, tag, args }; },
    deploy: async () => { calls.push('deploy');
      saved.set('native-studio/first-deploy-attempt-v1.json',
        { identity, commit }); },
    inspect: async () => { calls.push('readback');
      return { state: 'verified-source-control-plane' }; },
  } as any;
  return { input, deps, calls, saved };
}

test('configured path loads credentials after the verified preflight', async () => {
  const f = fixture();
  const { loadDeploymentCredentials: _manual, ...input } = f.input;
  assert.deepEqual(await runConfiguredNativeStudioFirstDeploy(input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), { state: 'reconcile-required', commit,
      observation: 'verified-source-control-plane' });
  assert.deepEqual(f.calls, ['checkout', 'preflight', 'central-credentials',
    'intent', 'deploy', 'readback']);
});

test('one verified checkout proceeds through preflight, intent, deploy and readback', async () => {
  const f = fixture();
  assert.deepEqual(await runConfiguredNativeStudioFirstDeploy(f.input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), { state: 'reconcile-required', commit,
      observation: 'verified-source-control-plane' });
  assert.deepEqual(f.calls, ['checkout', 'preflight', 'credentials',
    'intent', 'deploy', 'readback']);
});

test('preflight mismatch blocks credentials and any deploy intent', async () => {
  const f = fixture();
  f.input.verifyPreflight = async () => { f.calls.push('preflight');
    return { sourceId, commit: '0'.repeat(40), workerId, files: 2 }; };
  await assert.rejects(runConfiguredNativeStudioFirstDeploy(f.input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), /preflight_unverified/);
  assert.deepEqual(f.calls, ['checkout', 'preflight']);
});

test('ambiguous provider response is inspected once and never repeats deploy', async () => {
  const f = fixture();
  f.deps.deploy = async () => { f.calls.push('deploy');
    f.saved.set('native-studio/first-deploy-attempt-v1.json',
      { identity, commit });
    throw Error('lost provider response'); };
  f.deps.inspect = async () => { f.calls.push('readback');
    return { state: 'pending' }; };
  assert.deepEqual(await runConfiguredNativeStudioFirstDeploy(f.input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), { state: 'pending-review', commit, observation: 'pending' });
  assert.equal(f.calls.filter(call => call === 'deploy').length, 1);
});

test('existing matching intent reconciles without another deploy', async () => {
  const f = fixture();
  f.saved.set('native-studio/first-deploy-intent-v1.json',
    { identity, commit });
  assert.deepEqual(await runConfiguredNativeStudioFirstDeploy(f.input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), { state: 'reconcile-required', commit,
      observation: 'verified-source-control-plane' });
  assert.deepEqual(f.calls, ['checkout', 'preflight', 'credentials', 'readback']);
});

test('local failure before claimed attempt stays an error', async () => {
  const f = fixture();
  f.deps.deploy = async () => { f.calls.push('deploy');
    throw Error('local package invalid'); };
  await assert.rejects(runConfiguredNativeStudioFirstDeploy(f.input,
    {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
    f.deps), /local package invalid/);
  assert.equal(f.calls.includes('readback'), false);
});
