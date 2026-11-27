import 'server-only';
import { randomUUID } from 'node:crypto';
import { verifyStudioImageArchiveIdentity } from '../../../../scripts/stacki/studio-image-archive.mjs';

const ATTEMPT = 'native-studio/image-drive-attempt-v2.json';
const LEGACY_ATTEMPT = 'native-studio/image-drive-attempt-v1.json';
const TRANSFER = 'native-studio/image-drive-transfer-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const DRIVE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export type NativeStudioImageDriveScope = { agencyId: string; clientId: string; siteId: string };
export type NativeStudioImageDriveSite = { siteId: string; accountId: string };
export type NativeStudioImageDriveStore = { read: (key: string) => Promise<unknown>;
  claim: (key: string, value: unknown) => Promise<boolean> };
export type NativeStudioImageDriveIdentity = { sourceId: string; commit: string; workerId: string;
  scope: NativeStudioImageDriveScope; site: NativeStudioImageDriveSite;
  buildSnapshotId: string; pushSnapshotId: string;
  store: NativeStudioImageDriveStore };
export type NativeStudioImageArchiveReceipt = { sourceId: string; commit: string; workerId: string;
  scope: NativeStudioImageDriveScope; siteId: string; accountId: string;
  archive: { bytes: number; sha256: string } };
export type NativeStudioImageDriveAttempt = { sourceId: string; commit: string; workerId: string;
  scope: NativeStudioImageDriveScope; siteId: string; accountId: string; driveName: string;
  buildSnapshotId: string; pushSnapshotId: string };
export type NativeStudioImageDriveTransfer = { attempt: NativeStudioImageDriveAttempt;
  driveId: string; projectId: string; region: 'iad1';
  receipt: NativeStudioImageArchiveReceipt };

type Identity = NativeStudioImageDriveIdentity;
type Attempt = NativeStudioImageDriveAttempt;
type Transfer = NativeStudioImageDriveTransfer;
type ArchiveReceipt = NativeStudioImageArchiveReceipt;

function validate(input: Identity): void {
  if (!input || !SHA.test(input.sourceId) || !COMMIT.test(input.commit) ||
      !HEX32.test(input.workerId) || !input.scope ||
      ![input.scope.agencyId, input.scope.clientId, input.scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !input.site || input.site.siteId !== input.scope.siteId ||
      !HEX32.test(input.site.accountId) ||
      !SNAPSHOT.test(input.buildSnapshotId) ||
      !SNAPSHOT.test(input.pushSnapshotId) ||
      input.buildSnapshotId === input.pushSnapshotId ||
      !input.store || typeof input.store.read !== 'function' ||
      typeof input.store.claim !== 'function')
    throw Error('native_studio_image_drive_handoff_input_invalid');
}

function expected(input: Identity, driveName: string): Attempt {
  return { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, scope: input.scope,
    siteId: input.site.siteId, accountId: input.site.accountId,
    driveName, buildSnapshotId: input.buildSnapshotId,
    pushSnapshotId: input.pushSnapshotId };
}

function validName(input: Identity, name: string): boolean {
  const prefix = `gnr8-img-${input.site.siteId.slice(0, 8)}-${input.sourceId.slice(0, 8)}-`;
  return typeof name === 'string' && name.length <= 64 && name.startsWith(prefix) &&
    UUID.test(name.slice(prefix.length));
}

async function legacyRejectedBeforeCreation(input: Identity): Promise<boolean> {
  const legacy = await input.store.read(LEGACY_ATTEMPT) as Attempt | null;
  if (!legacy) return true;
  const prefix = `gnr8-img-${input.site.siteId}-${input.sourceId.slice(0, 8)}-`;
  if (typeof legacy.driveName !== 'string' ||
      legacy.driveName !== `${prefix}${legacy.driveName.slice(-36)}` ||
      !UUID.test(legacy.driveName.slice(-36)) ||
      legacy.driveName.length <= 64 ||
      !same(legacy, expected(input, legacy.driveName))) return false;
  const [session, transfer, command] = await Promise.all([
    input.store.read('native-studio/image-build-session-v1.json'),
    input.store.read(TRANSFER),
    input.store.read('native-studio/image-build-command-intent-v1.json'),
  ]);
  return !session && !transfer && !command;
}

/** Claim a unique, scoped Drive name before creating external resources.
 * An ambiguous claim is reviewable and never starts another build. */
export async function claimNativeStudioImageDriveAttempt(input: Identity,
  id: () => string = randomUUID): Promise<Attempt> {
  validate(input);
  if (!await legacyRejectedBeforeCreation(input))
    throw Error('native_studio_image_drive_attempt_pending_review');
  if (await input.store.read(ATTEMPT))
    throw Error('native_studio_image_drive_attempt_pending_review');
  const driveName = `gnr8-img-${input.site.siteId.slice(0, 8)}-${input.sourceId.slice(0, 8)}-${id()}`;
  if (!validName(input, driveName))
    throw Error('native_studio_image_drive_handoff_input_invalid');
  const attempt = expected(input, driveName);
  if (!await input.store.claim(ATTEMPT, attempt) ||
      !same(await input.store.read(ATTEMPT), attempt))
    throw Error('native_studio_image_drive_attempt_pending_review');
  return attempt;
}

/** Record only a producer claim. The receiver must still rehash the Drive
 * snapshot and claim the separate private archive receipt. */
export async function recordNativeStudioImageDriveTransfer(input: Identity & {
  attempt: Attempt; drive: { name: string; driveId: string;
    projectId: string; region: string; currentSessionId?: string };
  receipt: ArchiveReceipt;
}): Promise<Transfer> {
  validate(input);
  if (!input.attempt || !validName(input, input.attempt.driveName) ||
      !same(input.attempt, expected(input, input.attempt.driveName)) ||
      !same(await input.store.read(ATTEMPT), input.attempt) ||
      !input.drive || input.drive.name !== input.attempt.driveName ||
      !DRIVE_ID.test(input.drive.driveId) ||
      !DRIVE_ID.test(input.drive.projectId) ||
      input.drive.region !== 'iad1' || input.drive.currentSessionId)
    throw Error('native_studio_image_drive_transfer_unverified');
  verifyStudioImageArchiveIdentity({ ...input,
    archivePath: '/gnr8-image/image.tar', receipt: input.receipt });
  const transfer: Transfer = { attempt: input.attempt,
    driveId: input.drive.driveId, projectId: input.drive.projectId,
    region: 'iad1', receipt: input.receipt };
  const prior = await input.store.read(TRANSFER);
  if (prior && !same(prior, transfer))
    throw Error('native_studio_image_drive_transfer_conflict');
  if (!prior) await input.store.claim(TRANSFER, transfer);
  if (!same(await input.store.read(TRANSFER), transfer))
    throw Error('native_studio_image_drive_transfer_conflict');
  return transfer;
}

/** Never accept a drive name or receipt from an event. Read the exact
 * attempt and transfer from the scoped private store on every invocation. */
export async function readNativeStudioImageDriveTransfer(
  input: Identity): Promise<Transfer> {
  validate(input);
  const transfer = await input.store.read(TRANSFER) as Transfer | null;
  if (!transfer || !transfer.attempt ||
      !validName(input, transfer.attempt.driveName) ||
      !same(transfer.attempt, expected(input, transfer.attempt.driveName)) ||
      !same(await input.store.read(ATTEMPT), transfer.attempt) ||
      !DRIVE_ID.test(transfer.driveId) ||
      !DRIVE_ID.test(transfer.projectId) || transfer.region !== 'iad1')
    throw Error('native_studio_image_drive_transfer_unverified');
  verifyStudioImageArchiveIdentity({ ...input,
    archivePath: '/gnr8-image/image.tar', receipt: transfer.receipt });
  return transfer;
}
