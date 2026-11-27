import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildStudioImageArchive,
  recordStudioImageArchiveHandoff,
  verifyStudioImageArchive } from './studio-image-archive.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
  workerId = 'd'.repeat(32);

test('credential-free build exports a scoped archive; altered bytes are refused', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-archive-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  await mkdir(join(project, 'studio'), { recursive: true });
  const outputDir = join(root, 'archive');
  const input = { project, outputDir, trustedDocker: process.execPath,
    store: { read: async () => null }, sourceId, commit, workerId, scope, site };
  const commands = [];
  const deps = {
    verifyHandoff: async () => ({ sourceId, commit, workerId, scope }),
    verifyImage: async () => ({ files: 2 }),
    invoke: async (_file, args, options) => {
      commands.push(args);
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, undefined);
      assert.equal(options.env.GITHUB_PRIVATE_KEY, undefined);
      if (args[0] === 'save') await writeFile(args[2], 'image-archive');
    },
  };
  const result = await buildStudioImageArchive(input, deps);
  assert.deepEqual(commands.map(args => args[0]), ['build', 'save']);
  assert.deepEqual(commands[0].slice(0, 3), ['build', '--platform', 'linux/amd64']);
  assert.equal(result.receipt.siteId, site.siteId);
  assert.equal(result.receipt.accountId, site.accountId);
  await verifyStudioImageArchive({ ...input,
    archivePath: result.archivePath, receipt: result.receipt });
  await writeFile(result.archivePath, 'changed-archive');
  await assert.rejects(verifyStudioImageArchive({ ...input,
    archivePath: result.archivePath, receipt: result.receipt }),
  /archive_changed/);
  assert.equal(await readFile(result.archivePath, 'utf8'), 'changed-archive');
});

test('failed build leaves no transferable artifact', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-build-fail-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  await mkdir(join(project, 'studio'), { recursive: true });
  const outputDir = join(root, 'archive');
  await assert.rejects(buildStudioImageArchive({ project, outputDir,
    trustedDocker: process.execPath, store: { read: async () => null },
    sourceId, commit, workerId, scope, site }, {
    verifyHandoff: async () => ({ sourceId, commit, workerId, scope }),
    verifyImage: async () => ({ files: 2 }),
    invoke: async () => { throw Error('build failed'); },
  }), /build failed/);
  await assert.rejects(readFile(join(outputDir, 'image.tar')), { code: 'ENOENT' });
});

test('source change during build removes the exported archive', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-source-change-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  await mkdir(join(project, 'studio'), { recursive: true });
  const outputDir = join(root, 'archive');
  let checks = 0;
  await assert.rejects(buildStudioImageArchive({ project, outputDir,
    trustedDocker: process.execPath, store: { read: async () => null },
    sourceId, commit, workerId, scope, site }, {
    verifyHandoff: async () => ({ sourceId,
      commit: ++checks === 1 ? commit : 'f'.repeat(40), workerId, scope }),
    verifyImage: async () => ({ files: 2 }),
    invoke: async (_file, args) => {
      if (args[0] === 'save') await writeFile(args[2], 'image-archive');
    },
  }), /source_changed/);
  await assert.rejects(readFile(join(outputDir, 'image.tar')), { code: 'ENOENT' });
});

test('trusted receiver refuses a changed source before recording an archive', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-receive-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  await mkdir(project);
  const archivePath = join(root, 'image.tar');
  await writeFile(archivePath, 'image-archive');
  const bytes = Buffer.from('image-archive');
  const receipt = { sourceId, commit, workerId, scope,
    siteId: site.siteId, accountId: site.accountId,
    archive: { bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') } };
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { saved.set(key, value); return true; } };
  await assert.rejects(recordStudioImageArchiveHandoff({ project, archivePath,
    receipt, store, sourceId, commit, workerId, scope, site }, {
    verifyHandoff: async () => ({ sourceId, commit: 'f'.repeat(40),
      workerId, scope }),
    verifyImage: async () => ({ files: 2 }),
  }), /source_unverified/);
  assert.equal(saved.size, 0);
});

test('remote archive must be rehashed before its receipt is claimed', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-drive-receive-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  await mkdir(project);
  const archivePath = '/gnr8-image/image.tar';
  const receipt = { sourceId, commit, workerId, scope,
    siteId: site.siteId, accountId: site.accountId,
    archive: { bytes: 17, sha256: 'a'.repeat(64) } };
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { saved.set(key, value); return true; } };
  const input = { project, archivePath, receipt, store,
    sourceId, commit, workerId, scope, site };
  const deps = {
    verifyHandoff: async () => ({ sourceId, commit, workerId, scope }),
    verifyImage: async () => ({ files: 2 }),
    verifyArchive: async () => { throw Error('remote digest mismatch'); },
  };
  await assert.rejects(recordStudioImageArchiveHandoff(input, deps),
    /remote digest mismatch/);
  assert.equal(saved.size, 0);
  deps.verifyArchive = async () => receipt;
  assert.equal(await recordStudioImageArchiveHandoff(input, deps), receipt);
  assert.equal(saved.size, 1);
});
