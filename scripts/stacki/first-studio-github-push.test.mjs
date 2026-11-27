import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pushVerifiedStudioCommit, runFirstStudioGitHubPush,
  verifyStudioCommitParent } from './first-studio-github-push.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki' };
const sourceId = 'a'.repeat(64);
const commit = 'b'.repeat(40);
const baseCommit = 'e'.repeat(40);
const credential = 'ghs_' + 'c'.repeat(40);

function fixture() {
  const records = new Map();
  const store = { read: async key => records.get(key) ?? null,
    claim: async (key, value) => {
      if (records.has(key)) return false;
      records.set(key, value);
      return true;
    } };
  let remote = null;
  let transfers = 0;
  let readSite = site;
  const deps = {
    verifySource: async () => ({ sourceId, repository: site.repository,
      branch: site.branch, commit }),
    verifyParent: async args => { assert.equal(args.baseCommit, baseCommit); },
    readSite: async () => readSite,
    inspectRemote: async () => ({ repositoryId: site.repositoryId,
      branch: site.branch, commit: remote,
      ...(remote === null ? { baseCommit } : {}) }),
    transfer: async args => { assert.equal(args.baseCommit, baseCommit);
      transfers++; remote = commit; },
  };
  const input = { project: '/unused', store, sourceId, site, scope,
    credential, trustedGit: '/usr/bin/git' };
  return { input, deps, records,
    setRemote: value => { remote = value; },
    setSite: value => { readSite = value; },
    transfers: () => transfers };
}

test('claims once, pushes exact commit, and confirms the remote head', async () => {
  const f = fixture();
  assert.deepEqual(await runFirstStudioGitHubPush(f.input, f.deps),
    { state: 'verified', commit });
  assert.equal(f.transfers(), 1);
  assert.deepEqual(await runFirstStudioGitHubPush(f.input, f.deps),
    { state: 'verified', commit });
  assert.equal(f.transfers(), 1);
  assert.equal(f.records.size, 1);
});

test('lost push response reconciles; absent head stays pending without retry', async () => {
  const success = fixture();
  success.deps.transfer = async () => { success.setRemote(commit); throw Error('lost response'); };
  assert.equal((await runFirstStudioGitHubPush(success.input, success.deps)).state,
    'verified');
  const pending = fixture();
  pending.deps.transfer = async () => { throw Error('timeout'); };
  assert.equal((await runFirstStudioGitHubPush(pending.input, pending.deps)).state,
    'pending-review');
  pending.deps.transfer = async () => { throw Error('must not retry'); };
  assert.equal((await runFirstStudioGitHubPush(pending.input, pending.deps)).state,
    'pending-review');
});

test('refuses wrong branch, repository identity and changed binding', async () => {
  const conflict = fixture();
  conflict.setRemote('d'.repeat(40));
  await assert.rejects(runFirstStudioGitHubPush(conflict.input, conflict.deps),
    /branch_conflict/);
  assert.equal(conflict.transfers(), 0);
  const wrongRepo = fixture();
  wrongRepo.deps.inspectRemote = async () => ({ repositoryId: '43',
    branch: site.branch, commit: null });
  await assert.rejects(runFirstStudioGitHubPush(wrongRepo.input, wrongRepo.deps),
    /remote_unverified/);
  const rebound = fixture();
  rebound.setSite({ ...site, repositoryId: '43' });
  await assert.rejects(runFirstStudioGitHubPush(rebound.input, rebound.deps),
    /target_changed/);
});

test('invalid commit parent cannot claim a push intent', async () => {
  const f = fixture();
  f.deps.verifyParent = async () => { throw Error('native_studio_github_push_parent_conflict'); };
  await assert.rejects(runFirstStudioGitHubPush(f.input, f.deps), /parent_conflict/);
  assert.equal(f.records.size, 0);
  assert.equal(f.transfers(), 0);
});

test('stale Access roles block transfer before the durable intent', async () => {
  const stale = fixture();
  stale.deps.verifyAccess = async () => { throw Error('native_access_roles_snapshot_stale'); };
  await assert.rejects(runFirstStudioGitHubPush(stale.input, stale.deps),
    /native_access_roles_snapshot_stale/);
  assert.equal(stale.records.size, 0);
  assert.equal(stale.transfers(), 0);
  stale.deps.verifyAccess = async () => {};
  assert.equal((await runFirstStudioGitHubPush(stale.input, stale.deps)).state,
    'verified');
  assert.equal(stale.transfers(), 1);
});

test('changed remote base conflicts with an already claimed intent', async () => {
  const f = fixture();
  f.deps.transfer = async () => { throw Error('timeout'); };
  assert.equal((await runFirstStudioGitHubPush(f.input, f.deps)).state,
    'pending-review');
  f.deps.inspectRemote = async () => ({ repositoryId: site.repositoryId,
    branch: site.branch, commit: null, baseCommit: 'f'.repeat(40) });
  await assert.rejects(runFirstStudioGitHubPush(f.input, f.deps),
    /intent_conflict/);
  f.deps.inspectRemote = async () => ({ repositoryId: site.repositoryId,
    branch: site.branch, commit });
  assert.equal((await runFirstStudioGitHubPush(f.input, f.deps)).state,
    'verified');
});

test('credentialed Git command runs from fresh bare repository with literal destination', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-push-test-'));
  const source = join(root, 'source');
  const receiver = join(root, 'receiver.git');
  const wrapper = join(root, 'git-wrapper');
  const trace = join(root, 'trace');
  const git = (...args) => execFileSync('/usr/bin/git', args,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git('init', '-q', source);
    git('-C', source, 'config', 'user.name', 'Test');
    git('-C', source, 'config', 'user.email', 'test@example.com');
    await writeFile(join(source, 'README.md'), 'remote base');
    git('-C', source, 'add', 'README.md');
    git('-C', source, 'commit', '-qm', 'base');
    const base = git('-C', source, 'rev-parse', 'HEAD');
    await writeFile(join(source, 'index.html'), 'verified source');
    git('-C', source, 'add', 'index.html');
    git('-C', source, 'commit', '-qm', 'source');
    const exact = git('-C', source, 'rev-parse', 'HEAD');
    git('init', '--bare', '-q', receiver);
    git('-C', source, 'config', 'remote.origin.pushurl', 'https://evil.example/other');
    git('-C', source, 'config', 'url.https://evil.example/.insteadOf', 'https://github.com/');
    // The wrapper replaces only the literal GitHub URL with a local receiver.
    // It records the actual working Git directory and never records the token.
    await writeFile(wrapper, `#!/bin/sh\nif [ "$1" = "-C" ] && [ "$7" = "push" ]; then\n  printf '%s\\n' "$2" "${'${10}'}" > '${trace}'\n  exec /usr/bin/git "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" '${receiver}' "${'${11}'}"\nfi\nexec /usr/bin/git "$@"\n`, { mode: 0o700 });
    await assert.rejects(verifyStudioCommitParent({ project: source, site,
      commit: exact, baseCommit: 'f'.repeat(40), credential, trustedGit: wrapper }),
    /parent_conflict/);
    assert.throws(() => git('-C', receiver, 'rev-parse', `refs/heads/${site.branch}`));
    await verifyStudioCommitParent({ project: source, site, commit: exact,
      baseCommit: base, credential, trustedGit: wrapper });
    await pushVerifiedStudioCommit({ project: source, site, commit: exact,
      baseCommit: base,
      credential, trustedGit: wrapper });
    assert.equal(git('-C', receiver, 'rev-parse', `refs/heads/${site.branch}`), exact);
    const [bare, url] = (await readFile(trace, 'utf8')).trim().split('\n');
    assert.notEqual(bare, source);
    assert.equal(url, `https://github.com/${site.repository}.git`);
  } finally { await rm(root, { recursive: true, force: true }); }
});
