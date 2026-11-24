import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { verifyStoredFirstDeployHandoff } from './verify-stored-first-deploy.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value))
  .digest('hex');
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32),
  repository: 'pasadenagenerator/test', branch: 'main',
  studioOrigin: 'https://test.app.pasadenagenerator.com' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
  workerId = 'd'.repeat(32), artifactCommit = 'e'.repeat(40);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-stored-deploy-'));
  await mkdir(join(root, 'dist'), { recursive: true });
  await mkdir(join(root, 'studio/dist'), { recursive: true });
  await writeFile(join(root, 'dist/index.html'), '<main>site</main>');
  await writeFile(join(root, 'studio/dist/app.js'), 'studio');
  const files = await scanStudioBuildOutputs(root);
  const handoff = { sourceId, commit, workerId, scope,
    site: { siteId: site.siteId, repository: site.repository,
      branch: site.branch, studioOrigin: site.studioOrigin,
      accountId: site.accountId }, files };
  const artifact = { sourceId, sourceCommit: commit, workerId,
    artifactCommit, branch: `gnr8-build-${commit}`, tree: 'f'.repeat(40) };
  const preflight = { identity: hash({ sourceId, commit, scope, site,
    workerId, files, artifactCommit }), sourceId, commit, workerId,
    files: files.length };
  const prebuilt = { accountId: site.accountId, siteId: site.siteId,
    sourceId, commit, workerId, digest: '1'.repeat(64) };
  const records = new Map([
    ['native-studio/build-handoff-v1.json', handoff],
    ['native-studio/build-artifact-github-push-v1.json', artifact],
    ['native-studio/first-deploy-dry-run-v1.json', preflight],
    ['native-studio/prebuilt-image-v1.json', prebuilt],
  ]);
  const input = { store: { read: async key => records.get(key) ?? null },
    scope, site, sourceId, commit, workerId, artifactProject: root };
  return { root, input, records, files };
}

test('accepts exact stored first-deploy receipts and restored files', async () => {
  const f = await fixture();
  try {
    const result = await verifyStoredFirstDeployHandoff(f.input);
    assert.deepEqual(result.preflight, { sourceId, commit, workerId,
      files: f.files.length });
    assert.equal(result.artifact.artifactCommit, artifactCommit);
    await verifyStoredFirstDeployHandoff({ ...f.input,
      artifactProject: undefined });
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('rejects changed restored bytes and mismatched deploy receipts', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.root, 'studio/dist/app.js'), 'changed');
    await assert.rejects(verifyStoredFirstDeployHandoff(f.input),
      /unverified/);
    f.records.set('native-studio/first-deploy-dry-run-v1.json', {
      identity: '0'.repeat(64), sourceId, commit, workerId,
      files: f.files.length });
    await assert.rejects(verifyStoredFirstDeployHandoff({ ...f.input,
      artifactProject: undefined }), /unverified/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
