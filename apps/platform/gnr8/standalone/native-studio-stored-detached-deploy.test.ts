import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioStoredDetachedDeploy } from './native-studio-stored-detached-deploy';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40),
  workerId = 'c'.repeat(32);
const site = { siteId: scope.siteId, accountId: 'd'.repeat(32),
  repository: 'pasadenagenerator/example', repositoryId: '42', branch: 'main',
  studioOrigin: 'https://example.app.pasadenagenerator.com' };
const env = { GNR8_NATIVE_STUDIO_DEPLOY_SNAPSHOT: 'snap_deploy',
  GNR8_NATIVE_STUDIO_DEPLOY_WRANGLER_PATH: '/opt/gnr8-deploy/wrangler',
  GNR8_NATIVE_STUDIO_DEPLOY_SANDBOX_TIMEOUT_MS: String(60 * 60_000) };
const input = { scope, client: {} as SupabaseClient,
  sourceId, sourceCommit, workerId };
const resources = { target: { scope, accountId: site.accountId,
  repository: site.repository, repositoryId: 42,
  studioOrigin: site.studioOrigin },
  workers: { studio: { worker: `gnr8-${scope.siteId}-studio`, id: workerId },
    publicSite: { worker: `gnr8-${scope.siteId}-site`, id: 'e'.repeat(32) } },
  draftBucket: { bucket: `gnr8-${scope.siteId}-drafts`,
    bucketId: 'f'.repeat(32) } };

for (const resumed of [false, true]) {
  test(resumed ? 'resumes without restoring build bytes' :
    'restores build bytes for first staging', async () => {
    const calls: string[] = [];
    const store = { read: async (key: string) => {
      if (key.endsWith('resources-reserved-v1.json')) return resources;
      if (resumed && key.endsWith('first-deploy-sandbox-session-v1.json'))
        return { existing: true };
      return null;
    } };
    const credentials = { cloudflareCredential: 'x'.repeat(40),
      secrets: { AI_API_KEY: 'y'.repeat(16) } };
    const deps = {
      site: async () => site,
      store: () => store,
      verify: async () => ({ handoff: { files: [{ path: 'dist/index.html' }] },
        preflight: { sourceId, commit: sourceCommit, workerId, files: 1 } }),
      restore: async () => { calls.push('restore'); return {
        artifactDir: '/tmp/verified-output',
        files: [{ path: 'dist/index.html' }],
        cleanup: async () => { calls.push('cleanup'); } }; },
      credentials: async () => credentials,
      prepareIntent: async () => ({ state: 'prepared',
        commit: sourceCommit, tag: 'tag' }),
      inspect: async () => ({ state: 'pending' }),
      advance: async (value: any) => {
        calls.push('advance');
        assert.equal(value.artifactProject,
          resumed ? '/vercel/sandbox' : '/tmp/verified-output');
        assert.deepEqual(value.networkPolicy, { allow: ['api.cloudflare.com'] });
        assert.equal((await value.loadCredentials()).cloudflareCredential,
          credentials.cloudflareCredential);
        assert.equal((await value.prepareIntent(credentials)).state, 'prepared');
        return { state: 'running', commit: sourceCommit };
      },
    } as any;
    assert.deepEqual(await configuredNativeStudioStoredDetachedDeploy(input,
      env, fetch, deps), { state: 'running', commit: sourceCommit });
    assert.deepEqual(calls, resumed ? ['advance'] :
      ['restore', 'advance', 'cleanup']);
  });
}
