/** Reconcile the first-deploy receipts without a local Git checkout. */
import { createHash } from 'node:crypto';
import { scanStudioBuildOutputs } from './build-handoff.mjs';

const HANDOFF = 'native-studio/build-handoff-v1.json';
const ARTIFACT = 'native-studio/build-artifact-github-push-v1.json';
const PREFLIGHT = 'native-studio/first-deploy-dry-run-v1.json';
const PREBUILT = 'native-studio/prebuilt-image-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = value => createHash('sha256').update(JSON.stringify(value))
  .digest('hex');
const fail = () => { throw Error('native_studio_stored_first_deploy_unverified'); };

export async function verifyStoredFirstDeployHandoff(input) {
  const { store, scope, site, sourceId, commit, workerId,
    artifactProject } = input ?? {};
  if (!store || typeof store.read !== 'function' || !scope || !site ||
      ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
        typeof value === 'string' && UUID.test(value)) ||
      site.siteId !== scope.siteId || !HEX32.test(site.accountId) ||
      !SHA.test(sourceId) || !COMMIT.test(commit) ||
      !HEX32.test(workerId)) fail();
  const [handoff, artifact, preflight, prebuilt] = await Promise.all([
    store.read(HANDOFF), store.read(ARTIFACT), store.read(PREFLIGHT),
    store.read(PREBUILT),
  ]);
  const boundSite = { siteId: site.siteId, repository: site.repository,
    branch: site.branch, studioOrigin: site.studioOrigin,
    accountId: site.accountId };
  if (!handoff || handoff.sourceId !== sourceId ||
      handoff.commit !== commit || handoff.workerId !== workerId ||
      !same(handoff.scope, scope) || !same(handoff.site, boundSite) ||
      !Array.isArray(handoff.files) || handoff.files.length < 2 ||
      !handoff.files.some(file => file.path?.startsWith('dist/')) ||
      !handoff.files.some(file => file.path?.startsWith('studio/dist/')) ||
      !artifact || artifact.sourceId !== sourceId ||
      artifact.sourceCommit !== commit || artifact.workerId !== workerId ||
      artifact.branch !== `gnr8-build-${commit}` ||
      !COMMIT.test(artifact.artifactCommit) ||
      !COMMIT.test(artifact.tree) ||
      !prebuilt || Object.keys(prebuilt).sort().join() !==
        'accountId,commit,digest,siteId,sourceId,workerId' ||
      prebuilt.siteId !== site.siteId ||
      prebuilt.accountId !== site.accountId ||
      prebuilt.sourceId !== sourceId || prebuilt.commit !== commit ||
      prebuilt.workerId !== workerId || !SHA.test(prebuilt.digest)) fail();
  const expected = { identity: hash({ sourceId, commit, scope, site,
    workerId, files: handoff.files,
    artifactCommit: artifact.artifactCommit }),
    sourceId, commit, workerId, files: handoff.files.length };
  if (!same(preflight, expected)) fail();
  if (artifactProject !== undefined &&
      !same(await scanStudioBuildOutputs(artifactProject), handoff.files))
    fail();
  return { handoff, preflight: { sourceId, commit, workerId,
    files: handoff.files.length }, artifact, prebuilt };
}
