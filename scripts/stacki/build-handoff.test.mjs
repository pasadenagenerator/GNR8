import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { recordStudioBuildHandoff, verifyStudioBuildHandoff } from './build-handoff.mjs';

const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40);
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: '33333333-3333-4333-8333-333333333333',
  repository: 'example/site', branch: 'codex/native-stacki',
  studioOrigin: 'https://site.app.pasadenagenerator.com', accountId: 'c'.repeat(32) };

async function fixture() {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-build-handoff-'));
  await mkdir(join(project, 'studio/dist'), { recursive: true });
  await mkdir(join(project, 'dist'));
  await writeFile(join(project, 'dist/index.html'), '<main>site</main>');
  await writeFile(join(project, 'studio/dist/studio.js'), 'console.log("studio")');
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  const input = { project, store, sourceId, commit, site, scope,
    workerId: 'd'.repeat(32) };
  const deps = { verifySource: async () => ({ sourceId, commit,
    repository: site.repository, branch: site.branch }) };
  return { input, deps, saved, cleanup: () => rm(project, { recursive: true, force: true }) };
}

test('durable handoff binds only generated files to verified source and target', async () => {
  const f = await fixture();
  try {
    const receipt = await recordStudioBuildHandoff(f.input, f.deps);
    assert.deepEqual(receipt.files.map(file => file.path),
      ['dist/index.html', 'studio/dist/studio.js']);
    assert(receipt.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
    assert.deepEqual(await recordStudioBuildHandoff(f.input, f.deps), receipt);
    assert.deepEqual(await verifyStudioBuildHandoff(f.input, f.deps), receipt);
    assert.equal(f.saved.size, 1);
    await assert.rejects(verifyStudioBuildHandoff({ ...f.input,
      site: { ...site, repository: 'example/other' } }, f.deps), /conflict|source_unverified/);
    await assert.rejects(verifyStudioBuildHandoff({ ...f.input,
      workerId: 'e'.repeat(32) }, f.deps), /conflict/);
  } finally { await f.cleanup(); }
});

test('fresh deploy verification rejects changed, extra or linked build output', async () => {
  const f = await fixture();
  try {
    await recordStudioBuildHandoff(f.input, f.deps);
    const page = join(f.input.project, 'dist/index.html');
    const original = await readFile(page);
    await writeFile(page, '<main>different</main>');
    await assert.rejects(verifyStudioBuildHandoff(f.input, f.deps), /changed/);
    await writeFile(page, original);
    const extra = join(f.input.project, 'studio/dist/extra.js');
    await writeFile(extra, 'unexpected');
    await assert.rejects(verifyStudioBuildHandoff(f.input, f.deps), /changed/);
    await rm(extra);
    await symlink(page, extra);
    await assert.rejects(verifyStudioBuildHandoff(f.input, f.deps), /symlink/);
  } finally { await f.cleanup(); }
});
