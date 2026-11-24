/** Credential-free Docker/Worker dry run in a disposable preflight job. */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, sep } from 'node:path';
import { promisify } from 'node:util';
import { verifyStudioBuildHandoff } from './build-handoff.mjs';
import { verifyStudioImageSite } from './materialize-studio-image-site.mjs';

const exec = promisify(execFile);
const KEY = 'native-studio/first-deploy-dry-run-v1.json';
const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hash = value => createHash('sha256').update(JSON.stringify(value))
  .digest('hex');

async function expected(input, verifyHandoff, verifyImage) {
  const { project, store, sourceId, commit, scope, site, workerId } = input ?? {};
  if (!project || !store || typeof store.read !== 'function' || !scope ||
      site?.siteId !== scope.siteId || !SOURCE.test(sourceId) ||
      !SHA.test(commit) || !HEX32.test(workerId))
    throw Error('native_studio_dry_run_input_invalid');
  const handoff = await verifyHandoff({ project, store, sourceId, commit,
    scope, site, workerId });
  const image = await verifyImage({ project });
  const artifact = await store.read('native-studio/build-artifact-github-push-v1.json');
  if (handoff?.sourceId !== sourceId || handoff.commit !== commit ||
      handoff.workerId !== workerId || !Array.isArray(handoff.files) ||
      !same(handoff.scope, scope) || !same(handoff.site,
        { siteId: site.siteId, repository: site.repository,
          branch: site.branch, studioOrigin: site.studioOrigin,
          accountId: site.accountId }) || image?.files !== 2 ||
      artifact?.sourceId !== sourceId ||
      artifact.sourceCommit !== commit || artifact.workerId !== workerId ||
      artifact.branch !== `gnr8-build-${commit}` ||
      !SHA.test(artifact.artifactCommit))
    throw Error('native_studio_dry_run_handoff_unverified');
  const identity = hash({ sourceId, commit, scope, site, workerId,
    files: handoff.files, artifactCommit: artifact.artifactCommit });
  return { identity, sourceId, commit, workerId, files: handoff.files.length };
}

export async function verifyStudioFirstDeployDryRun(input, deps = {}) {
  const receipt = await expected(input,
    deps.verifyHandoff ?? verifyStudioBuildHandoff,
    deps.verifyImage ?? verifyStudioImageSite);
  if (!same(await input.store.read(KEY), receipt))
    throw Error('native_studio_dry_run_receipt_unverified');
  return { sourceId: receipt.sourceId, commit: receipt.commit,
    workerId: receipt.workerId, files: receipt.files };
}

/** Accept a credential-free Wrangler dry run only after the attested Docker
 * builder has stopped and its archive has crossed the private Drive boundary.
 * No host executable or deployment credential is used by this receipt writer.
 */
export async function recordStudioFirstDeployDryRunFromImage(input, deps = {}) {
  const { store, sourceId, commit, workerId, site, buildSnapshotId } = input ?? {};
  if (!store || typeof store.claim !== 'function' ||
      !/^snap_[A-Za-z0-9]+$/.test(buildSnapshotId))
    throw Error('native_studio_dry_run_input_invalid');
  const [proof, transfer, session] = await Promise.all([
    store.read('native-studio/image-preflight-proof-v1.json'),
    store.read('native-studio/image-drive-transfer-v1.json'),
    store.read('native-studio/image-build-session-v1.json'),
  ]);
  if (!proof || Object.keys(proof).sort().join() !==
      'accountId,buildSnapshotId,commit,manifestSha256,sandboxName,sessionId,siteId,sourceId,workerId' ||
      proof.sourceId !== sourceId || proof.commit !== commit ||
      proof.workerId !== workerId || proof.siteId !== site?.siteId ||
      proof.accountId !== site?.accountId ||
      proof.buildSnapshotId !== buildSnapshotId ||
      !SOURCE.test(proof.manifestSha256) ||
      typeof proof.sandboxName !== 'string' ||
      !/^gnr8-image-build-[a-f0-9-]{36}$/.test(proof.sandboxName) ||
      typeof proof.sessionId !== 'string' || !proof.sessionId ||
      session?.sandboxName !== proof.sandboxName ||
      session.sessionId !== proof.sessionId ||
      session.manifestSha256 !== proof.manifestSha256 ||
      !same(session.attempt, transfer?.attempt) ||
      transfer?.attempt?.sourceId !== sourceId ||
      transfer.attempt.commit !== commit ||
      transfer.attempt.workerId !== workerId ||
      transfer.attempt.siteId !== site.siteId ||
      transfer.attempt.accountId !== site.accountId ||
      transfer.attempt.buildSnapshotId !== buildSnapshotId ||
      transfer.receipt?.sourceId !== sourceId ||
      transfer.receipt.commit !== commit ||
      transfer.receipt.workerId !== workerId ||
      transfer.receipt.siteId !== site.siteId ||
      transfer.receipt.accountId !== site.accountId ||
      !SOURCE.test(transfer.receipt.archive?.sha256))
    throw Error('native_studio_dry_run_image_proof_unverified');
  const receipt = await expected(input,
    deps.verifyHandoff ?? verifyStudioBuildHandoff,
    deps.verifyImage ?? verifyStudioImageSite);
  const prior = await store.read(KEY);
  if (prior && !same(prior, receipt))
    throw Error('native_studio_dry_run_receipt_conflict');
  if (!prior) await store.claim(KEY, receipt);
  if (!same(await store.read(KEY), receipt))
    throw Error('native_studio_dry_run_receipt_conflict');
  return { sourceId: receipt.sourceId, commit: receipt.commit,
    workerId: receipt.workerId, files: receipt.files };
}

export async function recordStudioFirstDeployDryRun(input, deps = {}) {
  const { project, store, trustedWrangler } = input ?? {};
  if (!store || typeof store.claim !== 'function' ||
      typeof trustedWrangler !== 'string' || !isAbsolute(trustedWrangler))
    throw Error('native_studio_dry_run_input_invalid');
  const checkout = await realpath(project);
  const wrangler = await realpath(trustedWrangler);
  if (wrangler === checkout || wrangler.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_dry_run_untrusted_wrangler');
  await access(wrangler, constants.X_OK);
  const receipt = await expected(input,
    deps.verifyHandoff ?? verifyStudioBuildHandoff,
    deps.verifyImage ?? verifyStudioImageSite);
  const prior = await store.read(KEY);
  if (prior) {
    if (!same(prior, receipt)) throw Error('native_studio_dry_run_receipt_conflict');
    return { sourceId: receipt.sourceId, commit: receipt.commit,
      workerId: receipt.workerId, files: receipt.files };
  }
  const home = await mkdtemp(join(tmpdir(), 'gnr8-studio-dry-run-'));
  try {
    try {
      await (deps.run ?? (async () => {
        await exec(wrangler,
          ['deploy', '--dry-run', '--config', 'cloudflare/wrangler.jsonc'], {
            cwd: join(checkout, 'studio'), shell: false,
            timeout: 15 * 60_000, maxBuffer: 2 * 1024 * 1024,
            windowsHide: true, env: { PATH: '/usr/bin:/bin', HOME: home,
              TMPDIR: tmpdir(), CI: '1', WRANGLER_SEND_METRICS: 'false' },
          });
      }))({ wrangler, checkout, home });
    } catch { throw Error('native_studio_dry_run_failed'); }
    if (!same(await expected(input,
      deps.verifyHandoff ?? verifyStudioBuildHandoff,
      deps.verifyImage ?? verifyStudioImageSite), receipt))
      throw Error('native_studio_dry_run_source_changed');
    await store.claim(KEY, receipt);
    if (!same(await store.read(KEY), receipt))
      throw Error('native_studio_dry_run_receipt_conflict');
    return { sourceId: receipt.sourceId, commit: receipt.commit,
      workerId: receipt.workerId, files: receipt.files };
  } finally { await rm(home, { recursive: true, force: true }); }
}
