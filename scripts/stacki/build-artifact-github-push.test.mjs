import assert from 'node:assert/strict';
import test from 'node:test';
import { publishStudioBuildArtifactGit } from './build-artifact-github-push.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki' };
const sourceId = 'a'.repeat(64), sourceCommit = 'b'.repeat(40);
const artifactCommit = 'c'.repeat(40), tree = 'd'.repeat(40);
const workerId = 'e'.repeat(32);
const branch = `gnr8-build-${sourceCommit}`;

function fixture() {
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    } };
  let remote = null, transfers = 0;
  const deps = {
    readSite: async () => site,
    prepare: async () => ({ sourceCommit, ref: `refs/heads/${branch}`,
      commit: artifactCommit, tree }),
    inspectRemote: async target => ({ repositoryId: site.repositoryId,
      branch: target.branch, commit: remote }),
    verifyParent: async value => {
      assert.equal(value.commit, artifactCommit);
      assert.equal(value.baseCommit, sourceCommit);
    },
    transfer: async value => {
      transfers++; assert.equal(value.site.branch, branch);
      assert.equal(value.baseCommit, sourceCommit);
      remote = artifactCommit;
    },
  };
  const input = { project: '/verified', store, scope, site, sourceId,
    sourceCommit, workerId, credential: 'ghs_' + 'f'.repeat(40),
    trustedGit: '/usr/bin/git' };
  return { input, deps, saved, transfers: () => transfers,
    setRemote: value => { remote = value; } };
}

test('one claimed artifact push is read back at its deterministic branch', async () => {
  const f = fixture();
  assert.deepEqual(await publishStudioBuildArtifactGit(f.input, f.deps),
    { state: 'verified', branch, commit: artifactCommit, sourceCommit });
  assert.equal(f.transfers(), 1);
  assert.equal(f.saved.size, 1);
  assert.equal((await publishStudioBuildArtifactGit(f.input, f.deps)).state,
    'verified');
  assert.equal(f.transfers(), 1);
});

test('ambiguous push reconciles once and never retries an absent ref', async () => {
  const success = fixture();
  success.deps.transfer = async () => {
    success.setRemote(artifactCommit); throw Error('lost response'); };
  assert.equal((await publishStudioBuildArtifactGit(success.input,
    success.deps)).state, 'verified');
  const pending = fixture();
  pending.deps.transfer = async () => { throw Error('timeout'); };
  assert.equal((await publishStudioBuildArtifactGit(pending.input,
    pending.deps)).state, 'pending-review');
  pending.deps.transfer = async () => { throw Error('duplicate push'); };
  assert.equal((await publishStudioBuildArtifactGit(pending.input,
    pending.deps)).state, 'pending-review');
});

test('wrong artifact parent cannot claim the push intent', async () => {
  const f = fixture();
  f.deps.verifyParent = async () => {
    throw Error('native_studio_github_push_parent_conflict'); };
  await assert.rejects(publishStudioBuildArtifactGit(f.input, f.deps),
    /parent_conflict/);
  assert.equal(f.saved.size, 0);
  assert.equal(f.transfers(), 0);
});
