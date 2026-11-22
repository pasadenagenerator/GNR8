import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { prepareStudioBuildArtifactGitCommit } from './build-artifact-git-commit.mjs';

const trustedGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64), workerId = 'c'.repeat(32);
const git = (root, ...args) => execFileSync(trustedGit, ['-C', root, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-build-git-test-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  git(project, 'init', '-q', '-b', site.branch);
  await writeFile(join(project, 'README.md'), '# source\n');
  git(project, 'add', 'README.md');
  git(project, '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-q', '-m', 'source');
  const commit = git(project, 'rev-parse', 'HEAD');
  await mkdir(join(project, 'dist'));
  await mkdir(join(project, 'dist/gartner®-magic™'));
  await mkdir(join(project, 'studio/dist'), { recursive: true });
  await writeFile(join(project, 'dist/index.html'), '<main>site</main>');
  await writeFile(join(project, 'dist/gartner®-magic™/index.html'),
    '<main>Unicode route</main>');
  await writeFile(join(project, 'studio/dist/studio.js'), 'built');
  const files = await scanStudioBuildOutputs(project);
  const receipt = { sourceId, commit, workerId, scope, site, files };
  const input = { project, store: { read: async () => receipt },
    sourceId, commit, site, scope, workerId, trustedGit };
  const deps = { verifyHandoff: async () => receipt };
  return { project, commit, input, deps, receipt };
}

test('artifact commit contains only verified output and has source as sole parent', async t => {
  const f = await fixture(t);
  const first = await prepareStudioBuildArtifactGitCommit(f.input, f.deps);
  const again = await prepareStudioBuildArtifactGitCommit(f.input, f.deps);
  assert.deepEqual(again, first);
  assert.equal(git(f.project, 'rev-parse', 'HEAD'), f.commit);
  assert.equal(git(f.project, 'rev-list', '--parents', '-n', '1', first.commit),
    `${first.commit} ${f.commit}`);
  assert.deepEqual(git(f.project, 'ls-tree', '-r', '--name-only', '-z', first.commit)
    .split('\0').filter(Boolean), ['dist/gartner®-magic™/index.html', 'dist/index.html',
      'studio/dist/studio.js']);
});

test('changed output cannot match the recorded artifact tree', async t => {
  const f = await fixture(t);
  await writeFile(join(f.project, 'dist/index.html'), '<main>changed</main>');
  await assert.rejects(prepareStudioBuildArtifactGitCommit(f.input, f.deps),
    /native_studio_build_git_tree_invalid/);
});
