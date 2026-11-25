import assert from 'node:assert/strict';
import test from 'node:test';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { advanceNativeStudioDetachedDeploy } from './native-studio-detached-deploy';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32),
  repository: 'pasadenagenerator/example', repositoryId: '123',
  branch: 'main', studioOrigin: 'https://example.app.pasadenagenerator.com' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
  workerId = 'd'.repeat(32);
const secrets = Object.fromEntries(['AI_API_KEY', 'CONTAINER_TOKEN',
  'GITHUB_CLIENT_SECRET', 'GITHUB_PRIVATE_KEY',
  'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET']
  .map(key => [key, 's'.repeat(32)]));
const token = 't'.repeat(40);

function fixture() {
  const records = new Map<string, unknown>();
  const calls: string[] = [];
  let exitCode: number | null = null, inspection = 'pending';
  let startFails = false, remoteFails = false, pollFails = false,
    getFails = false;
  let status = 'running';
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    }, getBytes: async () => Buffer.from('unused') };
  records.set('native-studio/worker-bundle-v1.json', {
    buildSnapshotId: 'snap_build', sandboxName: 'gnr8-image-build-44444444-4444-4444-8444-444444444444',
    sessionId: 'source_session' });
  const session = { sessionId: 'deploy_session',
    runCommand: async (command: any) => {
      calls.push('wrangler-start');
      assert.equal(command.cmd, '/usr/local/bin/wrangler');
      assert.equal(command.env.CLOUDFLARE_API_TOKEN, token);
      assert.equal(command.detached, true);
      assert.deepEqual(command.args.slice(0, 4), ['deploy', '--config',
        'cloudflare/.gnr8-deploy-44444444-4444-4444-8444-444444444444.jsonc',
        '--tag']);
      if (startFails) throw Error('connection lost');
      return { cmdId: 'command_1' };
    },
    getCommand: async () => {
      if (pollFails) throw Error('command read lost');
      return { exitCode }; } };
  const sandbox = { name: `gnr8-deploy-${scope.siteId}-${sourceId.slice(0, 12)}`,
    get status() { return status; },
    currentSession: () => session,
    runCommand: async () => ({ exitCode: 0 }),
    writeFiles: async (files: any[]) => { calls.push('secrets-written');
      assert.equal(files[0].path, '/vercel/sandbox/gnr8-deploy-secrets.json'); },
    stop: async () => { calls.push('stop'); status = 'stopped'; } };
  const sdk = { snapshot: { get: async () => ({ status: 'created' }) },
    sandbox: { create: async () => { calls.push('sandbox-create'); return sandbox; },
      get: async () => {
        if (getFails) throw Error('Sandbox expired');
        return sandbox; } } };
  const credentials = { cloudflareCredential: token, secrets };
  const { tag, identity } = firstStudioDeployIdentity({ scope,
    accountId: site.accountId, workerId, sourceId, site,
    token, secrets, commit });
  const input = { scope, site, store, artifactProject: '/tmp/artifact',
    sourceId, commit, workerId, snapshotId: 'snap_deploy',
    networkPolicy: { allow: ['api.cloudflare.com'] },
    sandboxTimeoutMs: 60 * 60_000, wranglerPath: '/usr/local/bin/wrangler',
    loadCredentials: async () => { calls.push('credentials-loaded');
      return credentials; },
    prepareIntent: async () => { calls.push('intent-prepared');
      const prior = await store.read('native-studio/first-deploy-intent-v1.json');
      await store.claim('native-studio/first-deploy-intent-v1.json',
        { identity, commit });
      return { state: prior ? 'pending-review' : 'prepared', commit, tag }; },
    inspect: async () => { calls.push('observe');
      return { state: inspection, workerId }; } };
  const steps = { verifyBundle: async () => { calls.push('bundle-verified'); },
    stageLocal: async () => { calls.push('local-staged');
      return { cleanup: async () => { calls.push('local-cleaned'); } }; },
    stageRemote: async () => { calls.push('remote-staged');
      return { manifestSha256: 'e'.repeat(64),
        config: 'cloudflare/.gnr8-deploy-44444444-4444-4444-8444-444444444444.jsonc' }; },
    verifyRemote: async () => { calls.push('remote-verified');
      if (remoteFails) throw Error('remote changed'); } };
  const advance = () => advanceNativeStudioDetachedDeploy(input as any,
    sdk as any, steps as any);
  return { advance, calls, records, sandbox,
    completeCommand: () => { exitCode = 0; },
    inspected: (value: string) => { inspection = value; },
    failStart: () => { startFails = true; },
    failPoll: () => { pollFails = true; },
    failGet: () => { getFails = true; },
    failRemote: () => { remoteFails = true; } };
}

test('stages without credentials, starts once, and handles delayed readback', async () => {
  const f = fixture();
  assert.deepEqual(await f.advance(), { state: 'running', commit });
  assert.equal(f.calls.includes('credentials-loaded'), false);
  assert.equal(f.calls.indexOf('bundle-verified') < f.calls.indexOf('sandbox-create'), true);
  assert.equal(f.calls.indexOf('local-staged') < f.calls.indexOf('sandbox-create'), true);
  assert.deepEqual(await f.advance(), { state: 'running', commit });
  assert.equal(f.calls.indexOf('remote-verified') < f.calls.indexOf('credentials-loaded'), true);
  assert.equal(f.calls.indexOf('remote-verified') < f.calls.indexOf('wrangler-start'), true);
  assert.deepEqual(await f.advance(), { state: 'running', commit });
  f.completeCommand();
  assert.deepEqual(await f.advance(), { state: 'pending-review', commit,
    observation: 'pending' });
  assert.equal(f.calls.filter(value => value === 'stop').length, 1);
  f.inspected('verified-source-control-plane');
  assert.deepEqual(await f.advance(), { state: 'reconcile-required', commit,
    observation: 'verified-source-control-plane' });
  assert.equal(f.calls.filter(value => value === 'wrangler-start').length, 1);
  assert.equal(f.calls.filter(value => value === 'stop').length, 1);
  assert.deepEqual(await f.advance(), { state: 'reconcile-required', commit,
    observation: 'verified-source-control-plane' });
});

test('verified Cloudflare release proceeds while Wrangler process is alive', async () => {
  const f = fixture();
  await f.advance(); await f.advance();
  f.inspected('verified-source-control-plane');
  assert.deepEqual(await f.advance(), { state: 'reconcile-required', commit,
    observation: 'verified-source-control-plane' });
  assert.equal(f.calls.filter(value => value === 'wrangler-start').length, 1);
  assert.equal(f.calls.filter(value => value === 'stop').length, 0);
});

test('changed remote package blocks credentials and Cloudflare attempt', async () => {
  const f = fixture();
  await f.advance(); f.failRemote();
  await assert.rejects(f.advance(), /remote changed/);
  assert.equal(f.calls.includes('credentials-loaded'), false);
  assert.equal(f.records.has('native-studio/first-deploy-attempt-v1.json'), false);
});

test('ambiguous Wrangler start cannot redeploy', async () => {
  const f = fixture();
  await f.advance(); f.failStart();
  await assert.rejects(f.advance(), /connection lost/);
  assert.equal(f.records.has('native-studio/first-deploy-attempt-v1.json'), true);
  assert.deepEqual(await f.advance(), { state: 'pending-review', commit,
    observation: 'pending' });
  assert.equal(f.calls.filter(value => value === 'wrangler-start').length, 1);
});

test('exact prior intent resumes before first Cloudflare attempt', async () => {
  const f = fixture();
  await f.advance();
  const { identity } = firstStudioDeployIdentity({ scope,
    accountId: site.accountId, workerId, sourceId, site,
    token, secrets, commit });
  f.records.set('native-studio/first-deploy-intent-v1.json',
    { identity, commit });
  assert.deepEqual(await f.advance(), { state: 'running', commit });
  assert.equal(f.calls.filter(value => value === 'wrangler-start').length, 1);
  assert.equal(f.records.has('native-studio/first-deploy-attempt-v1.json'), true);
});

test('lost command read reconciles by tag without redeploy', async () => {
  const f = fixture();
  await f.advance(); await f.advance(); f.failPoll();
  assert.deepEqual(await f.advance(), { state: 'pending-review', commit,
    observation: 'pending' });
  assert.equal(f.calls.filter(value => value === 'wrangler-start').length, 1);
  f.inspected('verified-source-control-plane');
  assert.deepEqual(await f.advance(), { state: 'reconcile-required', commit,
    observation: 'verified-source-control-plane' });
});

test('expired Sandbox after attempt still reconciles by tag', async () => {
  const f = fixture();
  await f.advance(); await f.advance(); f.failGet();
  f.inspected('verified-source-control-plane');
  assert.deepEqual(await f.advance(), { state: 'reconcile-required', commit,
    observation: 'verified-source-control-plane' });
  assert.equal(f.calls.filter(value => value === 'wrangler-start').length, 1);
});
