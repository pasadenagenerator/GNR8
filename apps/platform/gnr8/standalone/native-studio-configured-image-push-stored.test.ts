import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioImagePushStored } from './native-studio-configured-image-push-stored';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki',
  studioOrigin: 'https://site.example.com', accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64), sourceCommit = 'c'.repeat(40);
const workerId = 'd'.repeat(32), artifactCommit = 'e'.repeat(40);
const request = { scope, client: {} as SupabaseClient, sourceId,
  sourceCommit, workerId };
const env = { GNR8_NATIVE_STUDIO_IMAGE_PUSH_ENABLED: '1',
  GNR8_NATIVE_STUDIO_IMAGE_BUILD_SNAPSHOT: 'snap_build',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_SNAPSHOT: 'snap_push',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_NETWORK_HOSTS:
    'api.cloudflare.com,registry.cloudflare.com',
  GNR8_NATIVE_STUDIO_IMAGE_DOCKER_PATH: '/usr/bin/docker',
  GNR8_NATIVE_STUDIO_IMAGE_WRANGLER_PATH: '/usr/local/bin/wrangler',
  GNR8_NATIVE_STUDIO_IMAGE_PUSH_SANDBOX_TIMEOUT_MS: String(60 * 60_000),
  GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID: site.accountId,
  GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER: 'f'.repeat(48) };

test('image push checks exact source and artifact refs without host Git', async () => {
  const records = new Map<string, any>([
    ['native-studio/resources-reserved-v1.json', { target: { scope,
      accountId: site.accountId, repository: site.repository,
      repositoryId: 42 }, workers: { studio: { id: workerId } } }],
    ['native-studio/first-github-push-intent-v1.json', { commit: sourceCommit }],
    ['native-studio/build-handoff-v1.json', { sourceId,
      commit: sourceCommit, workerId, scope }],
    ['native-studio/build-artifact-github-push-v1.json', { sourceId,
      sourceCommit, workerId, branch: `gnr8-build-${sourceCommit}`,
      artifactCommit }],
  ]);
  const store = { read: async (key: string) => records.get(key) ?? null };
  const calls: string[] = [];
  const deps = { site: async () => site, store: () => store,
    token: async () => ({ repositoryId: site.repositoryId,
      token: `ghs_${'a'.repeat(40)}` }),
    head: async (target: typeof site) => ({ repositoryId: site.repositoryId,
      branch: target.branch, commit: target.branch === site.branch ?
        sourceCommit : artifactCommit }),
    snapshot: async ({ snapshotId }: { snapshotId: string }) => {
      calls.push(`snapshot:${snapshotId}`);
      return { status: 'created', expiresAt: new Date(Date.now() + 3 * 60 * 60_000) };
    },
    advance: async (input: any) => {
      calls.push('advance');
      assert.equal('project' in input, false);
      assert.equal(input.site, site);
      assert.equal(input.store, store);
      assert.deepEqual(input.pushNetworkPolicy,
        { allow: ['api.cloudflare.com', 'registry.cloudflare.com'] });
      assert.equal(await input.loadCredential(),
        env.GNR8_NATIVE_STUDIO_CLOUDFLARE_DEPLOYER);
      return { state: 'running' };
    } };
  assert.deepEqual(await configuredNativeStudioImagePushStored(request,
    env, (async () => { throw Error('no provider call'); }) as typeof fetch,
    deps as any), { state: 'running' });
  assert.deepEqual(calls, ['snapshot:snap_build', 'snapshot:snap_push', 'advance']);
});
