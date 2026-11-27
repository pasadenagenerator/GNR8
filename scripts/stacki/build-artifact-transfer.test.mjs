import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { recordStudioBuildHandoff, scanStudioBuildOutputs } from './build-handoff.mjs';
import { exportStudioBuildArtifactDirectory,
  recordStudioSandboxBuildArtifact,
  restoreStudioBuildArtifactDirectory } from './build-artifact-transfer.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40), workerId = 'd'.repeat(32);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-artifact-transfer-'));
  const build = join(root, 'build'), deploy = join(root, 'deploy');
  const artifactDir = join(root, 'artifact');
  await mkdir(join(build, 'studio/dist'), { recursive: true });
  await mkdir(join(build, 'dist'));
  await mkdir(join(deploy, 'studio'), { recursive: true });
  await writeFile(join(build, 'dist/index.html'), '<main>site</main>');
  await writeFile(join(build, 'studio/dist/studio.js'), 'console.log("studio")');
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  const common = { store, sourceId, commit, scope, site, workerId };
  const deps = { verifySource: async () => ({ sourceId, commit,
    repository: site.repository, branch: site.branch }) };
  await recordStudioBuildHandoff({ ...common, project: build }, deps);
  return { root, build, deploy, artifactDir, common, deps, saved,
    cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('only receipt-listed build files cross into a fresh deploy checkout', async () => {
  const f = await fixture();
  try {
    assert.deepEqual(await exportStudioBuildArtifactDirectory({ ...f.common,
      project: f.build, artifactDir: f.artifactDir }, f.deps),
    { files: 2, sourceId, commit });
    assert.deepEqual(await restoreStudioBuildArtifactDirectory({ ...f.common,
      project: f.deploy, artifactDir: f.artifactDir }, f.deps),
    { files: 2, sourceId, commit });
    assert.equal((await readFile(join(f.deploy, 'dist/index.html'), 'utf8')),
      '<main>site</main>');
    assert.equal((await readFile(join(f.deploy, 'studio/dist/studio.js'), 'utf8')),
      'console.log("studio")');
    await assert.rejects(restoreStudioBuildArtifactDirectory({ ...f.common,
      project: f.deploy, artifactDir: f.artifactDir }, f.deps),
    /destination_conflict/);
  } finally { await f.cleanup(); }
});

test('extra files, changed bytes and symlinks cannot cross the handoff', async () => {
  const f = await fixture();
  try {
    await exportStudioBuildArtifactDirectory({ ...f.common,
      project: f.build, artifactDir: f.artifactDir }, f.deps);
    const input = { ...f.common, project: f.deploy, artifactDir: f.artifactDir };
    await writeFile(join(f.artifactDir, 'secret.txt'), 'unapproved');
    await assert.rejects(restoreStudioBuildArtifactDirectory(input, f.deps),
      /unverified/);
    await rm(join(f.artifactDir, 'secret.txt'));
    const page = join(f.artifactDir, 'dist/index.html');
    await writeFile(page, 'changed');
    await assert.rejects(restoreStudioBuildArtifactDirectory(input, f.deps),
      /unverified/);
    await rm(page);
    await symlink(join(f.build, 'dist/index.html'), page);
    await assert.rejects(restoreStudioBuildArtifactDirectory(input, f.deps),
      /symlink/);
  } finally { await f.cleanup(); }
});

test('failed final verification removes partial restored output', async () => {
  const f = await fixture();
  try {
    await exportStudioBuildArtifactDirectory({ ...f.common,
      project: f.build, artifactDir: f.artifactDir }, f.deps);
    await assert.rejects(restoreStudioBuildArtifactDirectory({ ...f.common,
      project: f.deploy, artifactDir: f.artifactDir }, {
      ...f.deps, verifyHandoff: async () => { throw Error('final check failed'); },
    }), /final check failed/);
    await assert.rejects(readFile(join(f.deploy, 'dist/index.html')),
      { code: 'ENOENT' });
  } finally { await f.cleanup(); }
});

test('finished Sandbox output becomes a source-bound receipt for a fresh checkout', async () => {
  const f = await fixture();
  try {
    await exportStudioBuildArtifactDirectory({ ...f.common,
      project: f.build, artifactDir: f.artifactDir }, f.deps);
    f.saved.delete('native-studio/build-handoff-v1.json');
    const files = await scanStudioBuildOutputs(f.artifactDir);
    const receipt = await recordStudioSandboxBuildArtifact({ ...f.common,
      project: f.deploy, artifactDir: f.artifactDir, files }, f.deps);
    assert.deepEqual(receipt.files, files);
    assert.equal(receipt.sourceId, sourceId);
    assert.deepEqual(f.saved.get('native-studio/build-handoff-v1.json'), receipt);
    assert.equal(await readFile(join(f.deploy, 'dist/index.html'), 'utf8'),
      '<main>site</main>');
  } finally { await f.cleanup(); }
});

test('Sandbox bridge rejects extra output and changed bytes before receipt', async () => {
  const f = await fixture();
  try {
    await exportStudioBuildArtifactDirectory({ ...f.common,
      project: f.build, artifactDir: f.artifactDir }, f.deps);
    const files = await scanStudioBuildOutputs(f.artifactDir);
    const input = { ...f.common, project: f.deploy,
      artifactDir: f.artifactDir, files };
    await writeFile(join(f.artifactDir, 'extra.txt'), 'bad');
    await assert.rejects(recordStudioSandboxBuildArtifact(input, f.deps),
      /unverified/);
    await rm(join(f.artifactDir, 'extra.txt'));
    await writeFile(join(f.artifactDir, 'dist/index.html'), 'changed');
    await assert.rejects(recordStudioSandboxBuildArtifact(input, f.deps),
      /unverified/);
    await assert.rejects(readFile(join(f.deploy, 'dist/index.html')),
      { code: 'ENOENT' });
  } finally { await f.cleanup(); }
});

test('Sandbox bridge removes partial output when handoff verification fails', async () => {
  const f = await fixture();
  try {
    await exportStudioBuildArtifactDirectory({ ...f.common,
      project: f.build, artifactDir: f.artifactDir }, f.deps);
    const files = await scanStudioBuildOutputs(f.artifactDir);
    await assert.rejects(recordStudioSandboxBuildArtifact({ ...f.common,
      project: f.deploy, artifactDir: f.artifactDir, files }, {
      ...f.deps, recordHandoff: async () => { throw Error('receipt unavailable'); },
    }), /receipt unavailable/);
    await assert.rejects(readFile(join(f.deploy, 'dist/index.html')),
      { code: 'ENOENT' });
    await assert.rejects(readFile(join(f.deploy, 'studio/dist/studio.js')),
      { code: 'ENOENT' });
  } finally { await f.cleanup(); }
});
