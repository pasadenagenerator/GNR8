import 'server-only';
import { randomUUID } from 'node:crypto';
import { Drive, Sandbox, type NetworkPolicy } from '@vercel/sandbox';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const MOUNT = '/gnr8-image';

function restricted(policy: NetworkPolicy): boolean {
  if (policy === 'deny-all') return true;
  if (!policy || policy === 'allow-all' || typeof policy !== 'object' ||
      policy.subnets?.allow?.length) return false;
  const allowed = policy.allow;
  const hosts = Array.isArray(allowed) ? allowed : Object.keys(allowed ?? {});
  return hosts.length > 0 && hosts.every(host => host !== '*' &&
    !host.startsWith('*.') && /^[a-z0-9.-]+$/.test(host));
}

type Sdk = { drive: Pick<typeof Drive, 'getOrCreate'>;
  sandbox: Pick<typeof Sandbox, 'create'> };
const sdk: Sdk = { drive: Drive, sandbox: Sandbox };

/** Two fresh Sandboxes share only an artifact Drive. The credential loader is
 * not called until the build VM has stopped; the receiving VM mounts a
 * point-in-time read-only snapshot of the Drive.
 */
export async function withNativeStudioImageDrive<Receipt, Verified, Result>(input: {
  siteId: string; sourceId: string;
  buildSnapshotId: string; pushSnapshotId: string;
  buildNetworkPolicy: NetworkPolicy; pushNetworkPolicy: NetworkPolicy;
  build: (sandbox: Sandbox, archivePath: string) => Promise<Receipt>;
  verify: (sandbox: Sandbox, archivePath: string,
    receipt: Receipt) => Promise<Verified>;
  loadCredential: () => Promise<string>;
  push: (sandbox: Sandbox, archivePath: string, verified: Verified,
    credential: string) => Promise<Result>;
}, dependencies: Sdk = sdk): Promise<Result> {
  if (!input || !UUID.test(input.siteId) || !SHA.test(input.sourceId) ||
      !SNAPSHOT.test(input.buildSnapshotId) ||
      !SNAPSHOT.test(input.pushSnapshotId) ||
      !restricted(input.buildNetworkPolicy) ||
      !restricted(input.pushNetworkPolicy) ||
      typeof input.build !== 'function' ||
      typeof input.verify !== 'function' ||
      typeof input.loadCredential !== 'function' ||
      typeof input.push !== 'function')
    throw Error('native_studio_image_drive_input_invalid');
  const drive = await dependencies.drive.getOrCreate({
    name: `gnr8-img-${input.siteId}-${input.sourceId.slice(0, 8)}-${randomUUID()}`,
    region: 'iad1', maxSize: 12 * 1024 * 1024 * 1024,
  });
  let builder: Sandbox | undefined;
  let receiver: Sandbox | undefined;
  try {
    builder = await dependencies.sandbox.create({
      name: `gnr8-image-build-${input.siteId.slice(0, 8)}`,
      source: { type: 'snapshot', snapshotId: input.buildSnapshotId },
      mounts: { [MOUNT]: drive },
      networkPolicy: input.buildNetworkPolicy,
      region: 'iad1', persistent: false, timeout: 30 * 60_000,
      resources: { vcpus: 2 }, ports: [],
    });
    const receipt = await input.build(builder, `${MOUNT}/image.tar`);
    await builder.stop();
    builder = undefined;
    receiver = await dependencies.sandbox.create({
      name: `gnr8-image-push-${input.siteId.slice(0, 8)}`,
      source: { type: 'snapshot', snapshotId: input.pushSnapshotId },
      mounts: { [MOUNT]: drive.snapshot() },
      networkPolicy: input.pushNetworkPolicy,
      region: 'iad1', persistent: false, timeout: 30 * 60_000,
      resources: { vcpus: 2 }, ports: [],
    });
    const verified = await input.verify(receiver, `${MOUNT}/image.tar`, receipt);
    const credential = await input.loadCredential();
    if (typeof credential !== 'string' || !credential)
      throw Error('native_studio_image_drive_credential_unavailable');
    return await input.push(receiver, `${MOUNT}/image.tar`, verified, credential);
  } finally {
    try { if (receiver) await receiver.stop(); }
    finally {
      try { if (builder) await builder.stop(); }
      finally { await drive.delete(); }
    }
  }
}
