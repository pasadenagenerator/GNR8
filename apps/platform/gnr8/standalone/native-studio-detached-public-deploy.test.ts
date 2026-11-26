import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceNativeStudioDetachedPublicDeploy } from
  './native-studio-detached-public-deploy';
import { fingerprint } from './publication-contract';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'd'.repeat(32),
  repository: 'example/site', repositoryId: '42', branch: 'main',
  studioOrigin: 'https://site.example.com' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40),
  studioWorkerId = 'c'.repeat(32), publicWorkerId = 'e'.repeat(32),
  studioTag = `gnr8-first-${'f'.repeat(64)}`;
const identity = fingerprint({ scope, accountId: site.accountId, sourceId,
  commit, publicWorkerId, studioTag, domain: 'site.example.com',
  repository: site.repository });
const expectedAttempt = { identity, commit, publicWorkerId };

test('stages verified public package then deploys once and observes tag', async () => {
  const records = new Map<string, unknown>();
  records.set('native-studio/public-worker-bundle-v1.json', {
    buildSnapshotId: 'snap_build', sandboxName: 'gnr8-image-build-' +
      '44444444-4444-4444-8444-444444444444', sessionId: 'sess_build' });
  const calls: string[] = [];
  let exit: number | null = null;
  let observed = false;
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true; },
    getBytes: async () => Buffer.alloc(0) };
  const sandbox = { name: `gnr8-public-deploy-${site.siteId}-${sourceId.slice(0, 12)}`,
    status: 'running', sourceSnapshotId: 'snap_deploy', region: 'iad1',
    persistent: false, timeout: 30 * 60_000,
    networkPolicy: { allow: ['api.cloudflare.com'] }, mounts: {},
    expiresAt: new Date(Date.now() + 30 * 60_000),
    currentSession: () => ({ sessionId: 'sess_public',
      runCommand: async (value: any) => {
        calls.push('deploy');
        assert.equal(value.cmd, '/usr/local/bin/wrangler');
        assert.equal(value.cwd, '/vercel/sandbox/gnr8-public-deploy-package');
        assert.equal(value.args[4], `gnr8-public-first-${identity}`);
        return { cmdId: 'cmd_1' }; },
      getCommand: async () => ({ exitCode: exit }) }),
    stop: async () => { calls.push('stop'); } };
  const sdk = { snapshot: { get: async () => ({ status: 'created' }) },
    sandbox: { create: async () => { calls.push('sandbox-create'); return sandbox; },
      get: async () => sandbox } };
  const steps = {
    verifyBundle: async () => { calls.push('bundle-verify'); },
    stageLocal: async () => ({ cleanup: async () => { calls.push('cleanup'); } }),
    stageRemote: async () => ({ manifestSha256: '1'.repeat(64),
      config: '.gnr8-public-00000000-0000-4000-8000-000000000000.json' }),
    verifyRemote: async () => { calls.push('package-verify'); },
  };
  const input = { scope, site, store, artifactProject: '/private/tmp/artifact',
    sourceId, commit, studioWorkerId, publicWorkerId, studioTag,
    snapshotId: 'snap_deploy', networkPolicy: { allow: ['api.cloudflare.com'] },
    sandboxTimeoutMs: 30 * 60_000, wranglerPath: '/usr/local/bin/wrangler',
    loadCredential: async () => 'A'.repeat(40),
    prepareIntent: async () => { records.set('native-studio/first-public-deploy-intent-v1.json',
      expectedAttempt); return { state: 'prepared', commit,
      publicWorkerId, studioTag }; },
    inspect: async () => observed
      ? { state: 'observed-control-plane', workerId: publicWorkerId }
      : { state: 'pending' },
  };
  assert.equal((await advanceNativeStudioDetachedPublicDeploy(input as any,
    sdk as any, steps as any)).state, 'running');
  assert.equal((await advanceNativeStudioDetachedPublicDeploy(input as any,
    sdk as any, steps as any)).state, 'running');
  assert.equal((await advanceNativeStudioDetachedPublicDeploy(input as any,
    sdk as any, steps as any)).state, 'running');
  observed = true;
  assert.deepEqual(await advanceNativeStudioDetachedPublicDeploy(input as any,
    sdk as any, steps as any), { state: 'first-open-required', commit,
    observation: 'observed-control-plane' });
  assert.equal(calls.filter(call => call === 'sandbox-create').length, 1);
  assert.equal(calls.filter(call => call === 'deploy').length, 1);
  assert.equal(calls.indexOf('package-verify') < calls.indexOf('deploy'), true);
  assert.equal(calls.filter(call => call === 'stop').length, 1);
});
