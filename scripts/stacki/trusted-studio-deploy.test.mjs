import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { runTrustedStudioDeploy } from './trusted-studio-deploy.mjs';

const token = 'b'.repeat(40);
const secrets = { AI_API_KEY: 'a'.repeat(32), CONTAINER_TOKEN: 'b'.repeat(32),
  GITHUB_CLIENT_SECRET: 'c'.repeat(32), GITHUB_PRIVATE_KEY: 'd'.repeat(32),
  PUBLISH_CLOUDFLARE_API_TOKEN: 'e'.repeat(40), SESSION_SECRET: 'f'.repeat(32) };
const root = await mkdtemp(join(tmpdir(), 'gnr8-trusted-deploy-test-'));
await mkdir(join(root, 'studio'));
after(async () => rm(root, { recursive: true, force: true }));
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const workerId = 'c'.repeat(32);
const sourceId = 'd'.repeat(64);
const commit = 'e'.repeat(40);
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'main',
  accountId, studioOrigin: 'https://site.app.pasadenagenerator.com' };
const secretIdentity = createHmac('sha256', token)
  .update(JSON.stringify(secrets)).digest('hex');
const tag = `gnr8-first-${createHash('sha256').update(JSON.stringify({
  scope, accountId, workerId, sourceId, site, secretIdentity, commit,
})).digest('hex')}`;
const intentKey = 'native-studio/first-deploy-intent-v1.json';
const attemptKey = 'native-studio/first-deploy-attempt-v1.json';
const approvedStore = () => {
  const saved = new Map([[intentKey, { identity: tag.slice('gnr8-first-'.length), commit }]]);
  return { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
};
const input = { file: process.execPath, cwd: join(root, 'studio'), token, secrets,
  args: ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag', tag],
  scope, accountId, workerId, sourceId, site, commit };
const verified = { sourceId, commit, branch: site.branch, repository: site.repository };
const verifySource = async ({ project, store: received, sourceId: receivedId,
  site: receivedSite, allowBuildOutputs }) => {
  assert.equal(project, await realpath(root));
  assert.equal(typeof received.read, 'function');
  assert.equal(receivedId, sourceId);
  assert.equal(receivedSite, site);
  assert.equal(allowBuildOutputs, true);
  return verified;
};
const inspectGitHubHead = async () => ({ repositoryId: site.repositoryId,
  branch: site.branch, commit });
const verifyHandoff = async () => ({ sourceId, commit, scope, workerId });
const verifyImage = async () => ({ files: 2 });
const withInvoke = invoke => ({ verifySource, verifyHandoff, verifyImage,
  inspectGitHubHead, invoke });

test('dedicated deploy receives only the exact command and a temporary private secret file', async () => {
  let secretFile;
  const approved = { ...input, store: approvedStore() };
  await runTrustedStudioDeploy(approved, withInvoke(async (file, args, options) => {
    secretFile = args.at(-1);
    assert.equal(file, process.execPath);
    assert.deepEqual(args.slice(0, -2), approved.args);
    assert.equal(args.at(-2), '--secrets-file');
    assert.deepEqual(JSON.parse(await readFile(secretFile, 'utf8')), secrets);
    assert.equal((await stat(secretFile)).mode & 0o777, 0o600);
    assert.equal(options.shell, false);
    assert.equal(options.env.CLOUDFLARE_API_TOKEN, token);
    assert.equal(options.env.GNR8_TEST_AMBIENT_SECRET, undefined);
  }));
  assert.deepEqual(await approved.store.read(attemptKey),
    { identity: tag.slice('gnr8-first-'.length), commit });
  await assert.rejects(readFile(secretFile), { code: 'ENOENT' });
});

test('refuses altered deploy arguments before invoking a process', async () => {
  let calls = 0;
  const invoke = async () => { calls++; };
  await assert.rejects(runTrustedStudioDeploy({ ...input,
    args: [...input.args, '--name', 'foreign-worker'] }, withInvoke(invoke)), /input_invalid/);
  await assert.rejects(runTrustedStudioDeploy({ ...input,
    secrets: { ...secrets, EXTRA: 'wrong' } }, withInvoke(invoke)), /input_invalid/);
  assert.equal(calls, 0);
});

test('refuses a site-owned executable before invoking a process', async () => {
  const local = join(root, 'studio', 'wrangler');
  await writeFile(local, 'untrusted');
  let calls = 0;
  await assert.rejects(runTrustedStudioDeploy({ ...input, file: local,
    store: approvedStore() },
    withInvoke(async () => { calls++; })), /executable_invalid/);
  assert.equal(calls, 0);
});

test('provider failures are sanitized and the secret file is removed', async () => {
  let secretFile;
  const approved = { ...input, store: approvedStore() };
  await assert.rejects(runTrustedStudioDeploy(approved, withInvoke(async (_file, args) => {
    secretFile = args.at(-1);
    throw Error('sensitive provider output');
  })), error => error instanceof Error && error.message === 'native_studio_trusted_deploy_failed');
  await assert.rejects(readFile(secretFile), { code: 'ENOENT' });
  await assert.rejects(runTrustedStudioDeploy(approved,
    withInvoke(async () => { throw Error('should not retry'); })), /already_attempted/);
});

test('refuses a changed source, commit, site or tag before invoking Wrangler', async () => {
  let calls = 0;
  const invoke = async () => { calls++; };
  const changed = [
    { ...input, commit: 'f'.repeat(40) },
    { ...input, site: { ...site, repository: 'example/other' } },
    { ...input, args: [...input.args.slice(0, 4), `gnr8-first-${'f'.repeat(64)}`] },
    { ...input, workerId: 'f'.repeat(32) },
  ];
  for (const candidate of changed)
    await assert.rejects(runTrustedStudioDeploy({ ...candidate, store: approvedStore() },
      { invoke, verifySource: async () => verified, verifyHandoff, verifyImage,
        inspectGitHubHead }), /target_mismatch/);
  await assert.rejects(runTrustedStudioDeploy({ ...input, store: approvedStore() },
    { invoke, inspectGitHubHead, verifyHandoff, verifyImage,
      verifySource: async () => ({ ...verified, commit: 'f'.repeat(40) }) }),
  /source_unverified/);
  await assert.rejects(runTrustedStudioDeploy({ ...input, store: approvedStore() },
    { invoke, inspectGitHubHead, verifyHandoff, verifyImage,
      verifySource: async () => { throw Error('checkout changed'); } }),
  /source_unverified/);
  assert.equal(calls, 0);
});

test('requires the exact durable intent and refuses a second invocation', async () => {
  const approved = { ...input, store: approvedStore() };
  let calls = 0;
  const deps = withInvoke(async () => { calls++; });
  const absent = { ...input, store: { ...approvedStore(), read: async () => null } };
  await assert.rejects(runTrustedStudioDeploy(absent, deps), /intent_mismatch/);
  const wrong = approvedStore();
  wrong.read = async () => ({ identity: 'f'.repeat(64), commit });
  await assert.rejects(runTrustedStudioDeploy({ ...input, store: wrong }, deps),
    /intent_mismatch/);
  await runTrustedStudioDeploy(approved, deps);
  await assert.rejects(runTrustedStudioDeploy(approved, deps), /already_attempted/);
  assert.equal(calls, 1);
});

test('changed build output is refused before the one deploy attempt is claimed', async () => {
  const store = approvedStore();
  let invoked = false;
  await assert.rejects(runTrustedStudioDeploy({ ...input, store }, {
    ...withInvoke(async () => { invoked = true; }),
    verifyHandoff: async () => { throw Error('changed artifact bytes'); },
  }), /handoff_unverified/);
  assert.equal(invoked, false);
  assert.equal(await store.read(attemptKey), null);
});

test('changed Docker context is refused before the deploy attempt', async () => {
  const store = approvedStore();
  await assert.rejects(runTrustedStudioDeploy({ ...input, store }, {
    ...withInvoke(async () => { throw Error('must not deploy'); }),
    verifyImage: async () => { throw Error('stale manifest'); },
  }), /image_unverified/);
  assert.equal(await store.read(attemptKey), null);
});
