import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runFirstStudioDeployment,
  runIsolatedStudioCommand } from './first-studio-deployment.mjs';
import { runTrustedStudioDeploy } from './trusted-studio-deploy.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'main',
  accountId: 'a'.repeat(32), studioOrigin: 'https://site.app.pasadenagenerator.com' };
const sourceId = 'b'.repeat(64);
const workerId = 'c'.repeat(32);
const token = 'd'.repeat(40);
const secrets = { AI_API_KEY: 'a'.repeat(32), CONTAINER_TOKEN: 'b'.repeat(32),
  GITHUB_CLIENT_SECRET: 'c'.repeat(32), GITHUB_PRIVATE_KEY: 'd'.repeat(32),
  PUBLISH_CLOUDFLARE_API_TOKEN: 'e'.repeat(40), SESSION_SECRET: 'f'.repeat(32) };
const commit = 'e'.repeat(40);
const tag = /^gnr8-first-[a-f0-9]{64}$/;
const secretIdentity = createHmac('sha256', token).update(JSON.stringify(secrets)).digest('hex');
const intendedTag = `gnr8-first-${createHash('sha256').update(JSON.stringify({
  scope, accountId: site.accountId, workerId, sourceId, site, secretIdentity, commit,
})).digest('hex')}`;

function fixture() {
  const saved = new Map();
  const commands = [];
  const deploys = [];
  let inspection = 'pending';
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  const input = { project: process.cwd(), store, sourceId,
    site, scope, accountId: site.accountId, workerId, token, secrets };
  const deps = {
    trustedWrangler: process.execPath,
    verifySource: async ({ sourceId: received, site: target }) => {
      assert.equal(received, sourceId);
      assert.equal(target, site);
      return { sourceId, commit, branch: site.branch, repository: site.repository };
    },
    inspectGitHubHead: async ({ scope: requested, site: target, commit: expected }) => {
      assert.equal(requested, scope);
      assert.equal(target, site);
      assert.equal(expected, commit);
      return { repositoryId: site.repositoryId, branch: site.branch, commit };
    },
    inspect: async ({ scope: requested, accountId, workerId: requestedWorker,
      domain, token: requestedToken, repository, expectedTag, requireSecrets }) => {
      assert.equal(requested, scope);
      assert.equal(accountId, site.accountId);
      assert.equal(requestedWorker, workerId);
      assert.equal(domain, 'site.app.pasadenagenerator.com');
      assert.equal(requestedToken, token);
      assert.equal(repository, site.repository);
      if (expectedTag !== undefined) assert.match(expectedTag, tag);
      assert.equal(requireSecrets, expectedTag ? true : undefined);
      return inspection === 'pending'
        ? { state: 'pending', reason: 'no-deployment' }
        : { state: 'verified-source-control-plane' };
    },
    runCommand: async command => { commands.push(command); },
    deploy: async command => { deploys.push(command);
      assert.equal(command.token, token);
      assert.deepEqual(command.secrets, secrets);
      assert.equal(command.scope, scope);
      assert.equal(command.accountId, site.accountId);
      assert.equal(command.workerId, workerId);
      assert.equal(command.sourceId, sourceId);
      assert.equal(command.site, site);
      assert.equal(command.store, store);
      assert.equal(command.commit, commit);
      inspection = 'observed'; },
  };
  return { input, deps, commands, deploys, saved,
    setInspection: value => { inspection = value; } };
}

test('builds without deploy credential, claims intent, deploys once and reconciles', async () => {
  const f = fixture();
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'reconcile-required', commit, observation: 'verified-source-control-plane',
  });
  assert.deepEqual(f.commands.map(command => [command.file === process.execPath
    ? 'wrangler' : command.file, command.args]), [
    ['npm', ['ci']], ['npm', ['ci']], ['npm', ['run', 'build']],
    ['npm', ['run', 'build']],
    ['wrangler', ['deploy', '--dry-run', '--config', 'cloudflare/wrangler.jsonc']],
  ]);
  assert.deepEqual(f.deploys[0].args,
    ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag', intendedTag]);
  assert.match(f.deploys[0].args.at(-1), tag);
  assert(f.commands.every(command => command.token === undefined && command.secrets === undefined));
  assert.equal(f.saved.size, 1);
  assert.equal((await runFirstStudioDeployment(f.input, f.deps)).state, 'reconcile-required');
  assert.equal(f.commands.length, 5);
  assert.equal(f.deploys.length, 1);
});

test('producer command passes the dedicated deploy gate before provider invocation', async () => {
  const f = fixture();
  const project = await mkdtemp(join(tmpdir(), 'gnr8-deploy-handoff-'));
  await mkdir(join(project, 'studio'));
  f.input.project = project;
  const originalDeploy = f.deps.deploy;
  let invoked = 0;
  let deployError;
  f.deps.deploy = async command => {
    try {
      await runTrustedStudioDeploy(command, { verifySource: f.deps.verifySource,
        verifyHandoff: async () => ({ sourceId, commit, scope, workerId }),
        verifyImage: async () => ({ files: 2 }),
        prepareConfig: async () => ({ relative: 'cloudflare/.gnr8-deploy-1234.jsonc',
          cleanup: async () => {} }),
        inspectGitHubHead: f.deps.inspectGitHubHead,
        invoke: async () => { invoked++; } });
    } catch (error) { deployError = error; throw error; }
    await originalDeploy(command);
  };
  try {
    const result = await runFirstStudioDeployment(f.input, f.deps);
    assert.equal(deployError, undefined);
    assert.equal(result.state, 'reconcile-required');
    assert.equal(invoked, 1);
  } finally { await rm(project, { recursive: true, force: true }); }
});

test('ambiguous deploy is not repeated even when no deployment is yet visible', async () => {
  const f = fixture();
  f.deps.deploy = async command => { f.deploys.push(command); throw Error('lost response'); };
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'pending-review', commit, observation: 'pending',
  });
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'pending-review', commit, observation: 'pending',
  });
  assert.equal(f.deploys.length, 1);
});

test('first deployment refuses to claim intent until GitHub has the exact source head', async () => {
  const f = fixture();
  f.deps.inspectGitHubHead = async () => ({ repositoryId: site.repositoryId,
    branch: site.branch, commit: 'f'.repeat(40) });
  await assert.rejects(runFirstStudioDeployment(f.input, f.deps),
    /github_head_unverified/);
  assert.equal(f.saved.size, 0);
  assert.equal(f.deploys.length, 0);
});

test('trusted deploy gate rechecks GitHub before invoking Cloudflare', async () => {
  const f = fixture();
  const project = await mkdtemp(join(tmpdir(), 'gnr8-github-deploy-gate-'));
  await mkdir(join(project, 'studio'));
  f.input.project = project;
  let gateError;
  let invoked = 0;
  f.deps.deploy = async command => {
    try {
      await runTrustedStudioDeploy(command, { verifySource: f.deps.verifySource,
        verifyHandoff: async () => ({ sourceId, commit, scope, workerId }),
        verifyImage: async () => ({ files: 2 }),
        prepareConfig: async () => ({ relative: 'cloudflare/.gnr8-deploy-1234.jsonc',
          cleanup: async () => {} }),
        inspectGitHubHead: async () => ({ repositoryId: site.repositoryId,
          branch: site.branch, commit: 'f'.repeat(40) }),
        invoke: async () => { invoked++; } });
    } catch (error) { gateError = error; throw error; }
  };
  try {
    await runFirstStudioDeployment(f.input, f.deps);
    assert.match(gateError?.message ?? '', /github_head_unverified/);
    assert.equal(invoked, 0);
  } finally { await rm(project, { recursive: true, force: true }); }
});

test('unverified readback cannot be reported as reconciled or trigger another deploy', async () => {
  const f = fixture();
  const inspect = f.deps.inspect;
  f.deps.inspect = async request => request.expectedTag
    ? { state: 'observed-control-plane' } : inspect(request);
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'pending-review', commit, observation: 'observed-control-plane',
  });
  assert.equal((await runFirstStudioDeployment(f.input, f.deps)).state, 'pending-review');
  assert.equal(f.deploys.length, 1);
});

test('changed runtime secrets conflict with the first deploy intent', async () => {
  const f = fixture();
  await runFirstStudioDeployment(f.input, f.deps);
  const changed = { ...f.input, secrets: { ...secrets, AI_API_KEY: 'z'.repeat(32) } };
  await assert.rejects(runFirstStudioDeployment(changed, f.deps), /intent_conflict/);
  assert.equal(f.deploys.length, 1);
});

test('preexisting deployment or failed local build cannot claim a deploy intent', async () => {
  const existing = fixture();
  existing.setInspection('observed');
  await assert.rejects(runFirstStudioDeployment(existing.input, existing.deps),
    /existing_deployment/);
  assert.equal(existing.commands.length, 0);
  assert.equal(existing.saved.size, 0);
  const broken = fixture();
  broken.deps.runCommand = async () => { throw Error('build failed'); };
  await assert.rejects(runFirstStudioDeployment(broken.input, broken.deps), /build failed/);
  assert.equal(broken.saved.size, 0);
});

test('a build that changes the approved checkout stops before a deploy intent', async () => {
  const f = fixture();
  let reads = 0;
  f.deps.verifySource = async () => ({ sourceId, branch: site.branch,
    repository: site.repository, commit: ++reads === 1 ? commit : 'f'.repeat(40) });
  await assert.rejects(runFirstStudioDeployment(f.input, f.deps), /source_unverified/);
  assert.equal(f.deploys.length, 0);
  assert.equal(f.saved.size, 0);
});

test('rejects Wrangler inside the site checkout, including an external symlink to it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-untrusted-wrangler-'));
  try {
    const project = join(root, 'site');
    const local = join(project, 'studio', 'node_modules', '.bin', 'wrangler');
    const alias = join(root, 'outside-wrangler');
    await mkdir(join(project, 'studio', 'node_modules', '.bin'), { recursive: true });
    await writeFile(local, 'untrusted');
    await symlink(local, alias);
    for (const trustedWrangler of [local, alias]) {
      const f = fixture();
      f.input.project = project;
      f.deps.trustedWrangler = trustedWrangler;
      await assert.rejects(runFirstStudioDeployment(f.input, f.deps),
        /untrusted_wrangler/);
      assert.equal(f.commands.length, 0);
      assert.equal(f.saved.size, 0);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('real subprocess boundary excludes ambient credentials', async () => {
  const previous = process.env.GNR8_TEST_AMBIENT_SECRET;
  const previousCloudflare = process.env.CLOUDFLARE_API_TOKEN;
  process.env.GNR8_TEST_AMBIENT_SECRET = 'must-not-leak';
  process.env.CLOUDFLARE_API_TOKEN = token;
  try {
    await runIsolatedStudioCommand({ file: process.execPath,
      args: ['-e', 'if (process.env.GNR8_TEST_AMBIENT_SECRET || process.env.CLOUDFLARE_API_TOKEN) process.exit(1)'],
      cwd: process.cwd(), home: '/private/tmp' });
  } finally {
    if (previous === undefined) delete process.env.GNR8_TEST_AMBIENT_SECRET;
    else process.env.GNR8_TEST_AMBIENT_SECRET = previous;
    if (previousCloudflare === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousCloudflare;
  }
});
