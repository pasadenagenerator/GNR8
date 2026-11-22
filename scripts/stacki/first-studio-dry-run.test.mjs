import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { recordStudioFirstDeployDryRun,
  verifyStudioFirstDeployDryRun } from './first-studio-dry-run.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  branch: 'codex/native-stacki', accountId: 'a'.repeat(32),
  studioOrigin: 'https://site.example.com' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
  workerId = 'd'.repeat(32);

async function fixture(t) {
  const project = await mkdtemp(join(tmpdir(), 'gnr8-dry-run-test-'));
  await mkdir(join(project, 'studio'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const records = new Map([['native-studio/build-artifact-github-push-v1.json',
    { sourceId, sourceCommit: commit, workerId,
      branch: `gnr8-build-${commit}`, artifactCommit: 'e'.repeat(40) }]]);
  const store = { read: async key => records.get(key) ?? null,
    claim: async (key, value) => { if (records.has(key)) return false;
      records.set(key, value); return true; } };
  const input = { project, store, sourceId, commit, scope, site, workerId,
    trustedWrangler: process.execPath };
  let calls = 0;
  const deps = { verifyHandoff: async () => ({ sourceId, commit,
    scope, workerId, site: { siteId: site.siteId,
      repository: site.repository, branch: site.branch,
      studioOrigin: site.studioOrigin, accountId: site.accountId },
    files: [{ path: 'dist/index.html', bytes: 4, sha256: 'f'.repeat(64) },
      { path: 'studio/dist/app.js', bytes: 4, sha256: 'a'.repeat(64) }] }),
  verifyImage: async () => ({ files: 2 }),
  run: async () => { calls++; } };
  return { input, deps, records, calls: () => calls };
}

test('credential-free dry run records one exact, reusable receipt', async t => {
  const f = await fixture(t);
  const expected = { sourceId, commit, workerId, files: 2 };
  assert.deepEqual(await recordStudioFirstDeployDryRun(f.input, f.deps), expected);
  assert.deepEqual(await verifyStudioFirstDeployDryRun(f.input, f.deps), expected);
  assert.deepEqual(await recordStudioFirstDeployDryRun(f.input, f.deps), expected);
  assert.equal(f.calls(), 1);
});

test('a changed artifact identity prevents reuse and a new dry run', async t => {
  const f = await fixture(t);
  await recordStudioFirstDeployDryRun(f.input, f.deps);
  f.records.set('native-studio/build-artifact-github-push-v1.json', {
    sourceId, sourceCommit: commit, workerId,
    branch: `gnr8-build-${commit}`, artifactCommit: '0'.repeat(40) });
  await assert.rejects(verifyStudioFirstDeployDryRun(f.input, f.deps),
    /receipt_unverified/);
  await assert.rejects(recordStudioFirstDeployDryRun(f.input, f.deps),
    /receipt_conflict/);
  assert.equal(f.calls(), 1);
});

test('failed dry run does not record success', async t => {
  const f = await fixture(t);
  await assert.rejects(recordStudioFirstDeployDryRun(f.input, {
    ...f.deps, run: async () => { throw Error('Docker failed'); },
  }), /native_studio_dry_run_failed/);
  assert.equal(f.records.has('native-studio/first-deploy-dry-run-v1.json'), false);
});
