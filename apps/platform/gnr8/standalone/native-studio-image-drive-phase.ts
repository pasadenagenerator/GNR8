import 'server-only';
import { Drive, Sandbox, type NetworkPolicy } from '@vercel/sandbox';
import { recordStudioImageArchiveHandoff } from '../../../../scripts/stacki/studio-image-archive.mjs';
import { verifyNativeStudioDriveArchive } from './native-studio-drive-archive-verify';
import { restrictedNativeStudioImageNetwork } from './native-studio-image-drive';
import { claimNativeStudioImageDriveAttempt,
  readNativeStudioImageDriveTransfer,
  recordNativeStudioImageDriveTransfer,
  type NativeStudioImageArchiveReceipt,
  type NativeStudioImageDriveIdentity } from './native-studio-image-drive-handoff';

const MOUNT = '/gnr8-image';
const MAX_SIZE = 12 * 1024 * 1024 * 1024;
type Sdk = { drive: Pick<typeof Drive, 'get' | 'getOrCreate'>;
  sandbox: Pick<typeof Sandbox, 'create'> };
const sdk: Sdk = { drive: Drive, sandbox: Sandbox };
const gates = { verify: verifyNativeStudioDriveArchive,
  record: recordStudioImageArchiveHandoff };

/** First invocation: claim a private attempt before creating a writable
 * Drive, then record a producer transfer only after the builder has stopped. */
export async function buildNativeStudioImageDrivePhase(input:
  NativeStudioImageDriveIdentity & {
    buildNetworkPolicy: NetworkPolicy;
    build: (sandbox: Sandbox, archivePath: string) => Promise<NativeStudioImageArchiveReceipt>;
  }, dependencies: Sdk = sdk) {
  if (!input || !restrictedNativeStudioImageNetwork(input.buildNetworkPolicy) ||
      typeof input.build !== 'function')
    throw Error('native_studio_image_drive_phase_input_invalid');
  const attempt = await claimNativeStudioImageDriveAttempt(input);
  let drive: Drive | undefined;
  let builder: Sandbox | undefined;
  let recording = false;
  try {
    drive = await dependencies.drive.getOrCreate({ name: attempt.driveName,
      region: 'iad1', maxSize: MAX_SIZE });
    if (drive.name !== attempt.driveName || drive.region !== 'iad1' ||
        drive.maxSize !== MAX_SIZE || drive.currentSessionId)
      throw Error('native_studio_image_drive_phase_drive_unverified');
    builder = await dependencies.sandbox.create({
      name: `gnr8-image-build-${input.site.siteId.slice(0, 8)}`,
      source: { type: 'snapshot', snapshotId: input.buildSnapshotId },
      mounts: { [MOUNT]: drive }, networkPolicy: input.buildNetworkPolicy,
      region: 'iad1', persistent: false, timeout: 30 * 60_000,
      resources: { vcpus: 2 }, ports: [],
    });
    const receipt = await input.build(builder, `${MOUNT}/image.tar`);
    await builder.stop();
    builder = undefined;
    const detached = await dependencies.drive.get({ name: attempt.driveName });
    if (detached.driveId !== drive.driveId ||
        detached.projectId !== drive.projectId || detached.maxSize !== MAX_SIZE)
      throw Error('native_studio_image_drive_phase_drive_unverified');
    recording = true;
    return await recordNativeStudioImageDriveTransfer({ ...input,
      attempt, drive: detached, receipt });
  } catch (error) {
    try { if (builder) await builder.stop(); }
    finally {
      // A possibly claimed transfer must never point at a deleted Drive.
      if (drive && !recording) await drive.delete();
    }
    throw error;
  }
}

/** Second invocation: only the scoped private transfer names the Drive.
 * A fresh receiver sees a read-only snapshot and rehashes it before tokens. */
export async function pushNativeStudioImageDrivePhase<Result>(input:
  NativeStudioImageDriveIdentity & {
    project: string;
    pushNetworkPolicy: NetworkPolicy;
    loadCredential: () => Promise<string>;
    push: (sandbox: Sandbox, archivePath: string,
      receipt: NativeStudioImageArchiveReceipt,
      credential: string) => Promise<Result>;
  }, dependencies: Sdk = sdk, steps: typeof gates = gates): Promise<Result> {
  if (!input || !restrictedNativeStudioImageNetwork(input.pushNetworkPolicy) ||
      typeof input.project !== 'string' || !input.project.startsWith('/') ||
      typeof input.loadCredential !== 'function' ||
      typeof input.push !== 'function')
    throw Error('native_studio_image_drive_phase_input_invalid');
  const transfer = await readNativeStudioImageDriveTransfer(input);
  const drive = await dependencies.drive.get({ name: transfer.attempt.driveName });
  if (drive.name !== transfer.attempt.driveName ||
      drive.driveId !== transfer.driveId ||
      drive.projectId !== transfer.projectId || drive.region !== 'iad1' ||
      drive.maxSize !== MAX_SIZE || drive.currentSessionId)
    throw Error('native_studio_image_drive_phase_drive_unverified');
  let receiver: Sandbox | undefined;
  try {
    receiver = await dependencies.sandbox.create({
      name: `gnr8-image-push-${input.site.siteId.slice(0, 8)}`,
      source: { type: 'snapshot', snapshotId: input.pushSnapshotId },
      mounts: { [MOUNT]: drive.snapshot() },
      networkPolicy: input.pushNetworkPolicy,
      region: 'iad1', persistent: false, timeout: 30 * 60_000,
      resources: { vcpus: 2 }, ports: [],
    });
    const path = `${MOUNT}/image.tar`;
    const verified = await steps.verify(receiver, path, transfer.receipt);
    const recorded = await steps.record({ project: input.project,
      store: input.store, sourceId: input.sourceId, commit: input.commit,
      workerId: input.workerId, scope: input.scope, site: input.site,
      archivePath: path, receipt: verified }, {
      verifyArchive: async () => verified,
    });
    if (JSON.stringify(recorded) !== JSON.stringify(transfer.receipt))
      throw Error('native_studio_image_drive_phase_archive_unverified');
    const credential = await input.loadCredential();
    if (typeof credential !== 'string' || !credential)
      throw Error('native_studio_image_drive_phase_credential_unavailable');
    return await input.push(receiver, path, recorded, credential);
  } finally {
    try { if (receiver) await receiver.stop(); }
    finally { await drive.delete(); }
  }
}
