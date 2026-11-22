import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { restoreStudioBuildArtifactGit } from './build-artifact-github-restore.mjs';

const gitBin = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
const git = (dir, ...args) => execFileSync(gitBin, ['-C', dir, ...args],
  { encoding: 'utf8' }).trim();
const sourceId = 'a'.repeat(64), workerId = 'b'.repeat(32);
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki' };

test('fresh job restores exact Git artifact bytes without executing site code', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-git-restore-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git'), seed = join(root, 'seed');
  execFileSync(gitBin, ['init', '--bare', '-q', '-b', 'main', remote]);
  execFileSync(gitBin, ['init', '-q', '-b', 'main', seed]);
  await writeFile(join(seed, 'README.md'), 'base');
  git(seed, 'add', 'README.md');
  git(seed, '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-q', '-m', 'base');
  git(seed, 'checkout', '-q', '-b', site.branch);
  await writeFile(join(seed, 'source.txt'), 'source');
  git(seed, 'add', 'source.txt');
  git(seed, '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-q', '-m', 'source');
  const sourceCommit = git(seed, 'rev-parse', 'HEAD');
  const branch = `gnr8-build-${sourceCommit}`;
  const bytes = Buffer.from('unicode output žaba');
  const file = { path: 'dist/žaba.html', bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex') };
  git(seed, 'checkout', '-q', '-b', branch);
  await mkdir(join(seed, 'dist'));
  await writeFile(join(seed, file.path), bytes);
  git(seed, 'rm', '-r', '-q', '--cached', '.');
  git(seed, 'add', '-f', file.path);
  git(seed, '-c', 'user.name=Test', '-c', 'user.email=test@example.com',
    'commit', '-q', '-m', 'artifact');
  const artifactCommit = git(seed, 'rev-parse', 'HEAD');
  const tree = git(seed, 'rev-parse', 'HEAD^{tree}');
  git(seed, 'remote', 'add', 'origin', remote);
  git(seed, 'push', '-q', 'origin', branch);
  git(seed, 'push', '-q', 'origin', site.branch);
  const project = join(root, 'deploy');
  execFileSync(gitBin, ['clone', '-q', '-b', site.branch, remote, project]);
  const records = {
    'native-studio/build-artifact-github-push-v1.json': {
      sourceId, sourceCommit, workerId, branch, artifactCommit, tree },
    'native-studio/build-handoff-v1.json': {
      sourceId, commit: sourceCommit, workerId, files: [file] },
  };
  const store = { read: async key => records[key] };
  const result = await restoreStudioBuildArtifactGit({ project, store, scope,
    site, sourceId, sourceCommit, workerId, trustedGit: gitBin,
    credential: 'ghs_' + 'c'.repeat(40) }, {
    fetchUrl: () => remote,
    restore: async ({ artifactDir }) => {
      assert.deepEqual(await readFile(join(artifactDir, file.path)), bytes);
      return { files: 1 };
    },
  });
  assert.deepEqual(result, { files: 1 });
  assert.equal(git(project, 'rev-parse', 'HEAD'), sourceCommit);
});
