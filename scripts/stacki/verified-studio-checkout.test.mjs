import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { disposeVerifiedStudioCheckout,
  prepareVerifiedStudioCheckout } from './verified-studio-checkout.mjs';

const site = { siteId: '33333333-3333-4333-8333-333333333333',
  repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki' };
const sourceId = 'a'.repeat(64), credential = 'ghs_' + 'c'.repeat(40);
const trustedGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
const git = (project, ...args) => execFileSync(trustedGit, ['-C', project, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-checkout-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git'), seed = join(root, 'seed');
  execFileSync(trustedGit, ['init', '--bare', '-q', '-b', 'main', remote]);
  execFileSync(trustedGit, ['init', '-q', '-b', 'main', seed]);
  await writeFile(join(seed, 'README.md'), '# existing site\n');
  git(seed, 'add', 'README.md');
  git(seed, '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-q', '-m', 'base');
  const baseCommit = git(seed, 'rev-parse', 'HEAD');
  git(seed, 'remote', 'add', 'origin', remote);
  git(seed, 'push', '-q', 'origin', 'main');
  let preparedCommit;
  const deps = { fetchUrl: () => remote,
    commitSource: async ({ project }) => {
      await writeFile(join(project, 'page.txt'), 'prepared source');
      git(project, 'add', 'page.txt');
      git(project, '-c', 'user.name=GNR8', '-c',
        'user.email=gnr8@example.com', 'commit', '-q', '-m', 'prepare');
      preparedCommit = git(project, 'rev-parse', 'HEAD');
      return { commit: preparedCommit };
    },
    verifySource: async ({ project }) => {
      assert.equal(git(project, 'remote', 'get-url', 'origin'),
        `https://github.com/${site.repository}.git`);
      assert.equal(git(project, 'branch', '--show-current'), site.branch);
      assert.equal(git(project, 'status', '--porcelain'), '');
      return { sourceId, commit: git(project, 'rev-parse', 'HEAD'),
        repository: site.repository, branch: site.branch };
    } };
  return { remote, baseCommit, deps };
}

test('private base becomes an exact credential-free source checkout', async t => {
  const f = await fixture(t);
  const result = await prepareVerifiedStudioCheckout({ site, sourceId,
    baseCommit: f.baseCommit, store: { read: async () => null }, credential,
    trustedGit, author: { name: 'GNR8', email: 'gnr8@example.com' } }, f.deps);
  assert.equal(git(result.project, 'rev-list', '--parents', '-n', '1',
    result.commit), `${result.commit} ${f.baseCommit}`);
  assert.equal(await readFile(join(result.project, 'page.txt'), 'utf8'),
    'prepared source');
  await assert.rejects(stat(join(result.root, 'askpass')), { code: 'ENOENT' });
  assert(!String(await readFile(join(result.project, '.git/config'))).includes(credential));
  await disposeVerifiedStudioCheckout(result.root);
  await assert.rejects(stat(result.root), { code: 'ENOENT' });
});

test('changed remote base stops before preparing source', async t => {
  const f = await fixture(t);
  let prepared = false;
  await assert.rejects(prepareVerifiedStudioCheckout({ site, sourceId,
    baseCommit: 'f'.repeat(40), store: { read: async () => null }, credential,
    trustedGit, author: { name: 'GNR8', email: 'gnr8@example.com' } }, {
      ...f.deps, commitSource: async () => { prepared = true; },
    }), /native_studio_checkout_base_changed/);
  assert.equal(prepared, false);
});
