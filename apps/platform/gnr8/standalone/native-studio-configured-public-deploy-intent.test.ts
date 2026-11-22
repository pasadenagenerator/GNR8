import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { prepareConfiguredNativeStudioPublicDeployIntent,
  PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40);
const workerId = 'c'.repeat(32), publicWorkerId = 'd'.repeat(32);
const site = { siteId: scope.siteId, accountId: 'e'.repeat(32),
  repository: 'example/site', repositoryId: '42', branch: 'codex/native-stacki',
  studioOrigin: 'https://site.app.pasadenagenerator.com' };
const token = 'f'.repeat(40), secrets = { AI_API_KEY: 'g'.repeat(20) };
const studio = firstStudioDeployIdentity({ scope, accountId: site.accountId,
  workerId, sourceId, site, token, secrets, commit: sourceCommit });

function fixture() {
  const calls: string[] = [];
  const saved = new Map<string, unknown>([
    ['native-studio/resources-reserved-v1.json', {
      workers: { publicSite: { worker: `gnr8-${scope.siteId}-site`,
        id: publicWorkerId } },
    }],
    ['native-studio/first-deploy-intent-v1.json',
      { identity: studio.identity, commit: sourceCommit }],
    ['native-studio/first-deploy-attempt-v1.json',
      { identity: studio.identity, commit: sourceCommit }],
  ]);
  const store = {
    read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const deps = {
    site: async () => { calls.push('site'); return site; },
    withCheckout: async (_input: unknown, use: any) => { calls.push('checkout');
      return use({ store, site, sourceId, commit: sourceCommit, workerId }); },
    credentials: async () => { calls.push('credentials');
      return { cloudflareCredential: token, secrets }; },
    studio: async () => { calls.push('studio');
      return { state: 'verified-source-control-plane', workerId }; },
    vacancy: async () => { calls.push('vacancy');
      return { state: 'vacant', workerId: publicWorkerId,
        domain: 'site.app.pasadenagenerator.com' }; },
  } as any;
  const input = { scope, client: {} as SupabaseClient, sourceId,
    sourceCommit, workerId, trustedGit: '/usr/bin/git' };
  return { calls, saved, deps, input };
}

test('public intent follows active Studio and vacant hostname evidence', async () => {
  const f = fixture();
  const first = await prepareConfiguredNativeStudioPublicDeployIntent(f.input,
    {}, fetch, f.deps);
  assert.deepEqual(first, { state: 'prepared', sourceId,
    commit: sourceCommit, publicWorkerId, studioTag: studio.tag });
  assert.deepEqual(f.calls, ['checkout', 'credentials', 'studio', 'vacancy', 'site']);
  assert.equal(f.saved.size, 4);
  assert.deepEqual(await prepareConfiguredNativeStudioPublicDeployIntent(f.input,
    {}, fetch, f.deps), first);
  assert.equal(f.saved.size, 4);
});

test('missing Studio attempt or occupied domain cannot claim public intent', async () => {
  const f = fixture();
  f.saved.delete('native-studio/first-deploy-attempt-v1.json');
  await assert.rejects(prepareConfiguredNativeStudioPublicDeployIntent(f.input,
    {}, fetch, f.deps), /studio_unverified/);
  assert.equal(f.saved.has(PUBLIC_INTENT), false);
  const occupied = fixture();
  occupied.deps.vacancy = async () => { occupied.calls.push('vacancy');
    throw Error('native_studio_public_gateway_domain_conflict'); };
  await assert.rejects(prepareConfiguredNativeStudioPublicDeployIntent(occupied.input,
    {}, fetch, occupied.deps), /domain_conflict/);
  assert.equal(occupied.saved.has(PUBLIC_INTENT), false);
});
