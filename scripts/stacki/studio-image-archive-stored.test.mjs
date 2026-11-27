import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { recordStudioImageArchiveHandoffFromStored } from './studio-image-archive.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40);
const baseCommit = 'd'.repeat(40), workerId = 'e'.repeat(32);
const files = [
  { path: 'dist/index.html', bytes: 1, sha256: '1'.repeat(64) },
  { path: 'studio/dist/app.js', bytes: 1, sha256: '2'.repeat(64) },
];
const digest = value => createHash('sha256').update(JSON.stringify(value))
  .digest('hex');

test('records receiver archive using bound stored receipts', async () => {
  const receipt = { sourceId, commit, workerId, scope,
    siteId: site.siteId, accountId: site.accountId,
    archive: { bytes: 10, sha256: 'f'.repeat(64) } };
  const records = new Map([
    ['native-studio/first-github-push-intent-v1.json', {
      commit, baseCommit, identity: digest({ scope, sourceId, site,
        commit, baseCommit }) }],
    ['native-studio/build-handoff-v1.json', { sourceId, commit,
      workerId, scope, site: { siteId: site.siteId,
        repository: site.repository, branch: site.branch,
        studioOrigin: site.studioOrigin, accountId: site.accountId }, files }],
    ['native-studio/build-output-bytes-v1.json', { sourceId, commit,
      workerId, scope, site: { siteId: site.siteId,
        accountId: site.accountId, repository: site.repository,
        branch: site.branch, studioOrigin: site.studioOrigin },
      files: files.map(file => ({ ...file, chunks: [] })) }],
    ['native-studio/build-artifact-github-push-v1.json', { sourceId,
      sourceCommit: commit, workerId, branch: `gnr8-build-${commit}`,
      artifactCommit: '3'.repeat(40) }],
  ]);
  const store = { read: async key => records.get(key) ?? null,
    claim: async (key, value) => { records.set(key, value); return true; } };
  assert.deepEqual(await recordStudioImageArchiveHandoffFromStored({
    store, receipt, sourceId, commit, workerId, scope, site,
    archivePath: '/sandbox/image.tar',
  }, { verifyArchive: async () => receipt }), receipt);
  assert.deepEqual(records.get('native-studio/image-archive-v1.json'), receipt);
});
