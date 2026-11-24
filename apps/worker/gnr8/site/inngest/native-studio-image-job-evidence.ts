import { createHash } from 'node:crypto';

export type Scope = { agencyId: string; clientId: string; siteId: string };
export type Request = { scope: Scope; actor: string; sourceId: string;
  sourceCommit: string; workerId: string; artifactCommit: string };
export type Evidence = { artifact: any; preflight: any; resources: any;
  transfer?: any; attempt?: any; prebuilt?: any; pushAttempt?: any };

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const DRIVE = /^[A-Za-z0-9_-]{1,128}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function imageNextEventId(stage: 'push' | 'deploy', request: Request): string {
  const identity = [request.scope.agencyId, request.scope.clientId,
    request.scope.siteId, request.sourceId, request.sourceCommit,
    request.workerId, request.artifactCommit];
  return `gnr8-native-studio-image-${stage}-${createHash('sha256')
    .update(JSON.stringify(identity)).digest('hex')}`;
}

export function imageRequest(value: unknown): Request {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join() !==
        'actor,artifactCommit,scope,sourceCommit,sourceId,workerId')
    throw Error('native_studio_image_request_invalid');
  const request = value as Request;
  const { scope, actor, sourceId, sourceCommit, workerId, artifactCommit } = request;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) ||
      Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      ![scope.agencyId, scope.clientId, scope.siteId, actor]
        .every(v => typeof v === 'string' && UUID.test(v)) ||
      !SHA.test(sourceId) || !COMMIT.test(sourceCommit) ||
      !HEX32.test(workerId) || !COMMIT.test(artifactCommit))
    throw Error('native_studio_image_request_invalid');
  return request;
}

export function verifyBaseEvidence(request: Request, evidence: Evidence,
  requirePreflight = true): string {
  const { scope, sourceId, sourceCommit, workerId, artifactCommit } = request;
  const { artifact, preflight, resources } = evidence;
  const accountId = resources?.target?.accountId;
  if (artifact?.sourceId !== sourceId || artifact.sourceCommit !== sourceCommit ||
      artifact.workerId !== workerId || artifact.artifactCommit !== artifactCommit ||
      artifact.branch !== `gnr8-build-${sourceCommit}` ||
      (requirePreflight && (preflight?.sourceId !== sourceId ||
        preflight.commit !== sourceCommit ||
        preflight.workerId !== workerId || !SHA.test(preflight.identity) ||
        !Number.isSafeInteger(preflight.files) || preflight.files < 2)) ||
      !resources || !same(resources.target?.scope, scope) ||
      !HEX32.test(accountId) || resources.workers?.studio?.id !== workerId)
    throw Error('native_studio_image_evidence_unverified');
  return accountId;
}

export function verifyTransfer(request: Request, evidence: Evidence,
  accountId: string): void {
  const { transfer, attempt } = evidence;
  const claimed = transfer?.attempt;
  const receipt = transfer?.receipt;
  try { verifyImageAttempt(request, attempt, accountId); }
  catch { throw Error('native_studio_image_transfer_unverified'); }
  if (!claimed || !same(claimed, attempt) ||
      !DRIVE.test(transfer.driveId) || !DRIVE.test(transfer.projectId) ||
      transfer.region !== 'iad1' ||
      receipt?.sourceId !== request.sourceId ||
      receipt.commit !== request.sourceCommit ||
      receipt.workerId !== request.workerId ||
      !same(receipt.scope, request.scope) ||
      receipt.siteId !== request.scope.siteId ||
      receipt.accountId !== accountId ||
      !Number.isSafeInteger(receipt.archive?.bytes) ||
      receipt.archive.bytes < 1 || !SHA.test(receipt.archive?.sha256))
    throw Error('native_studio_image_transfer_unverified');
}

export function verifyImageAttempt(request: Request, claimed: any,
  accountId: string): void {
  const prefix = `gnr8-img-${request.scope.siteId}-${request.sourceId.slice(0, 8)}-`;
  if (!claimed ||
      claimed.sourceId !== request.sourceId ||
      claimed.commit !== request.sourceCommit ||
      claimed.workerId !== request.workerId ||
      !same(claimed.scope, request.scope) ||
      claimed.siteId !== request.scope.siteId ||
      claimed.accountId !== accountId ||
      typeof claimed.driveName !== 'string' ||
      !claimed.driveName.startsWith(prefix) ||
      !UUID.test(claimed.driveName.slice(prefix.length)) ||
      !SNAPSHOT.test(claimed.buildSnapshotId) ||
      !SNAPSHOT.test(claimed.pushSnapshotId) ||
      claimed.buildSnapshotId === claimed.pushSnapshotId)
    throw Error('native_studio_image_attempt_unverified');
}

export function verifyPrebuilt(request: Request, prebuilt: any,
  accountId: string): void {
  if (!prebuilt || Object.keys(prebuilt).sort().join() !==
      'accountId,commit,digest,siteId,sourceId,workerId' ||
      prebuilt.accountId !== accountId ||
      prebuilt.siteId !== request.scope.siteId ||
      prebuilt.sourceId !== request.sourceId ||
      prebuilt.commit !== request.sourceCommit ||
      prebuilt.workerId !== request.workerId || !SHA.test(prebuilt.digest))
    throw Error('native_studio_image_prebuilt_unverified');
}

export function verifyImagePushAttempt(request: Request, evidence: Evidence): void {
  const attempt = evidence.pushAttempt;
  if (!attempt) return;
  if (Object.keys(attempt).sort().join() !==
      'archiveSha256,commit,sourceId,workerId' ||
      attempt.sourceId !== request.sourceId ||
      attempt.commit !== request.sourceCommit ||
      attempt.workerId !== request.workerId ||
      attempt.archiveSha256 !== evidence.transfer?.receipt?.archive?.sha256)
    throw Error('native_studio_image_push_attempt_unverified');
}
