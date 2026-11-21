import assert from 'node:assert/strict';
import test from 'node:test';
import { runFirstStudioDeployment,
  runIsolatedStudioCommand } from './first-studio-deployment.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site', branch: 'main',
  accountId: 'a'.repeat(32), studioOrigin: 'https://site.app.pasadenagenerator.com' };
const sourceId = 'b'.repeat(64);
const workerId = 'c'.repeat(32);
const token = 'd'.repeat(40);
const commit = 'e'.repeat(40);

function fixture() {
  const saved = new Map();
  const commands = [];
  let inspection = 'pending';
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  const input = { project: '/private/tmp/gnr8-test-checkout', store, sourceId,
    site, scope, accountId: site.accountId, workerId, token };
  const deps = {
    verifySource: async ({ sourceId: received, site: target }) => {
      assert.equal(received, sourceId);
      assert.equal(target, site);
      return { sourceId, commit, branch: site.branch, repository: site.repository };
    },
    inspect: async ({ scope: requested, accountId, workerId: requestedWorker,
      domain, token: requestedToken }) => {
      assert.equal(requested, scope);
      assert.equal(accountId, site.accountId);
      assert.equal(requestedWorker, workerId);
      assert.equal(domain, 'site.app.pasadenagenerator.com');
      assert.equal(requestedToken, token);
      return inspection === 'pending'
        ? { state: 'pending', reason: 'no-deployment' }
        : { state: 'observed-control-plane' };
    },
    runCommand: async command => { commands.push(command);
      if (command.token) inspection = 'observed'; },
  };
  return { input, deps, commands, saved,
    setInspection: value => { inspection = value; } };
}

test('builds without deploy credential, claims intent, deploys once and reconciles', async () => {
  const f = fixture();
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'reconcile-required', commit, observation: 'observed-control-plane',
  });
  assert.deepEqual(f.commands.map(command => [command.file.endsWith('/wrangler')
    ? 'wrangler' : command.file, command.args]), [
    ['npm', ['ci']], ['npm', ['ci']], ['npm', ['run', 'build']],
    ['npm', ['run', 'build']],
    ['wrangler', ['deploy', '--dry-run', '--config', 'cloudflare/wrangler.jsonc']],
    ['wrangler', ['deploy', '--config', 'cloudflare/wrangler.jsonc']],
  ]);
  assert(f.commands.slice(0, -1).every(command => command.token === undefined));
  assert.equal(f.commands.at(-1).token, token);
  assert.equal(f.saved.size, 1);
  assert.equal((await runFirstStudioDeployment(f.input, f.deps)).state, 'reconcile-required');
  assert.equal(f.commands.length, 6);
});

test('ambiguous deploy is not repeated even when no deployment is yet visible', async () => {
  const f = fixture();
  f.deps.runCommand = async command => {
    f.commands.push(command);
    if (command.token) throw Error('lost response');
  };
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'pending-review', commit, observation: 'pending',
  });
  assert.deepEqual(await runFirstStudioDeployment(f.input, f.deps), {
    state: 'pending-review', commit, observation: 'pending',
  });
  assert.equal(f.commands.filter(command => command.token).length, 1);
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
  assert.equal(f.commands.filter(command => command.token).length, 0);
  assert.equal(f.saved.size, 0);
});

test('real subprocess boundary excludes ambient credentials', async () => {
  const previous = process.env.GNR8_TEST_AMBIENT_SECRET;
  process.env.GNR8_TEST_AMBIENT_SECRET = 'must-not-leak';
  try {
    await runIsolatedStudioCommand({ file: process.execPath,
      args: ['-e', 'if (process.env.GNR8_TEST_AMBIENT_SECRET || process.env.CLOUDFLARE_API_TOKEN) process.exit(1)'],
      cwd: process.cwd(), home: '/private/tmp' });
    await runIsolatedStudioCommand({ file: process.execPath,
      args: ['-e', `if (process.env.GNR8_TEST_AMBIENT_SECRET || process.env.CLOUDFLARE_API_TOKEN !== '${token}') process.exit(1)`],
      cwd: process.cwd(), home: '/private/tmp', token });
  } finally {
    if (previous === undefined) delete process.env.GNR8_TEST_AMBIENT_SECRET;
    else process.env.GNR8_TEST_AMBIENT_SECRET = previous;
  }
});
