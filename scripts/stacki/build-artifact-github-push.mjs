/** Publish one deterministic build-artifact ref without changing Stacki's
 * editable source branch. The ref commit contains only receipt-listed output.
 */
import { createHash } from 'node:crypto';
import { prepareStudioBuildArtifactGitCommit } from './build-artifact-git-commit.mjs';
import { pushVerifiedStudioCommit,
  verifyStudioCommitParent } from './first-studio-github-push.mjs';

const KEY = 'native-studio/build-artifact-github-push-v1.json';
const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const TOKEN = /^ghs_[A-Za-z0-9._-]{20,4092}$/;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function publishStudioBuildArtifactGit(input, deps) {
  const { project, store, scope, site, sourceId, sourceCommit, workerId,
    credential, trustedGit } = input ?? {};
  if (!project || !store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function' || !scope ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
        typeof value === 'string' && UUID.test(value)) ||
      site?.siteId !== scope.siteId || !SOURCE.test(sourceId) ||
      !SHA.test(sourceCommit) || !HEX32.test(workerId) ||
      typeof credential !== 'string' || !TOKEN.test(credential) ||
      !deps || typeof deps.readSite !== 'function' ||
      typeof deps.inspectRemote !== 'function')
    throw Error('native_studio_build_git_push_input_invalid');
  if (!same(await deps.readSite(scope), site))
    throw Error('native_studio_build_git_push_target_changed');
  const prepared = await (deps.prepare ?? prepareStudioBuildArtifactGitCommit)({
    project, store, sourceId, commit: sourceCommit, site, scope,
    workerId, trustedGit });
  const branch = `gnr8-build-${sourceCommit}`;
  if (prepared.sourceCommit !== sourceCommit ||
      prepared.ref !== `refs/heads/${branch}` ||
      !SHA.test(prepared.commit) || !SHA.test(prepared.tree))
    throw Error('native_studio_build_git_push_commit_unverified');
  const artifactSite = { ...site, branch };
  const expected = { identity: hash({ scope, site, sourceId, sourceCommit,
    workerId, artifactCommit: prepared.commit, tree: prepared.tree }),
    sourceId, sourceCommit, workerId, artifactCommit: prepared.commit,
    tree: prepared.tree, branch };
  const prior = await store.read(KEY);
  if (prior && !same(prior, expected))
    throw Error('native_studio_build_git_push_intent_conflict');
  const observed = async () => {
    const remote = await deps.inspectRemote(artifactSite, credential);
    if (remote.repositoryId !== site.repositoryId || remote.branch !== branch ||
        (remote.commit !== null && !SHA.test(remote.commit)))
      throw Error('native_studio_build_git_push_remote_unverified');
    return remote.commit;
  };
  const before = await observed();
  if (before === prepared.commit)
    return { state: 'verified', branch, commit: prepared.commit,
      sourceCommit };
  if (before !== null)
    throw Error('native_studio_build_git_push_branch_conflict');
  if (prior) return { state: 'pending-review', branch,
    commit: prepared.commit, sourceCommit };
  await (deps.verifyParent ?? verifyStudioCommitParent)({ project,
    site: artifactSite, commit: prepared.commit, baseCommit: sourceCommit,
    credential, trustedGit });
  const won = await store.claim(KEY, expected);
  if (!same(await store.read(KEY), expected))
    throw Error('native_studio_build_git_push_intent_conflict');
  if (!won) return { state: 'pending-review', branch,
    commit: prepared.commit, sourceCommit };
  if (!same(await deps.readSite(scope), site))
    throw Error('native_studio_build_git_push_target_changed');
  try {
    await (deps.transfer ?? pushVerifiedStudioCommit)({ project,
      site: artifactSite, commit: prepared.commit, baseCommit: sourceCommit,
      credential, trustedGit });
  } catch (error) {
    if (error instanceof Error && [
      'native_studio_github_push_object_path_invalid',
      'native_studio_github_push_commit_missing',
      'native_studio_github_push_parent_conflict',
    ].includes(error.message)) throw error;
    // Lost response may follow a successful push; read back once.
  }
  let after;
  try { after = await observed(); }
  catch { return { state: 'pending-review', branch,
    commit: prepared.commit, sourceCommit }; }
  if (after === prepared.commit)
    return { state: 'verified', branch, commit: prepared.commit,
      sourceCommit };
  if (after !== null)
    throw Error('native_studio_build_git_push_branch_conflict');
  return { state: 'pending-review', branch,
    commit: prepared.commit, sourceCommit };
}
