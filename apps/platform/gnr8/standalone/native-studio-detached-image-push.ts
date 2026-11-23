import 'server-only';
import { Drive, Sandbox, type NetworkPolicy } from '@vercel/sandbox';
import { recordStudioImageArchiveHandoff,
  verifyStudioImageArchiveIdentity } from '../../../../scripts/stacki/studio-image-archive.mjs';
import { verifyNativeStudioDriveArchive } from './native-studio-drive-archive-verify';
import { restrictedNativeStudioImageNetwork } from './native-studio-image-drive';
import { readNativeStudioImageDriveTransfer,
  type NativeStudioImageDriveIdentity,
  type NativeStudioImageDriveTransfer } from './native-studio-image-drive-handoff';
import { pollNativeStudioImageCommand,
  startNativeStudioImageCommand } from './native-studio-image-detached-command';

const ARCHIVE_PATH = '/gnr8-image/image.tar';
const MOUNT = '/gnr8-image';
const MAX_SIZE = 12 * 1024 * 1024 * 1024;
const RECEIVER_INTENT = 'native-studio/image-push-receiver-intent-v1.json';
const RECEIVER_STARTED = 'native-studio/image-push-receiver-started-v1.json';
const RECEIVER_VERIFIED = 'native-studio/image-push-receiver-verified-v1.json';
const CONFIG_INTENT = 'native-studio/image-push-config-intent-v1.json';
const LOAD_VERIFIED = 'native-studio/image-load-verified-v1.json';
const CLEANUP_INTENT = 'native-studio/image-push-cleanup-intent-v1.json';
const CLEANUP_DONE = 'native-studio/image-push-cleanup-done-v1.json';
const ARCHIVE = 'native-studio/image-archive-v1.json';
const ATTEMPT = 'native-studio/image-push-attempt-v1.json';
const PREBUILT = 'native-studio/prebuilt-image-v1.json';
const LOAD_INTENT = 'native-studio/image-load-command-intent-v1.json';
const PUSH_INTENT = 'native-studio/image-push-command-intent-v1.json';
const SHA = /^[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Input = NativeStudioImageDriveIdentity & {
  project: string; pushNetworkPolicy: NetworkPolicy;
  dockerPath: string; wranglerPath: string; sandboxTimeoutMs: number;
  loadCredential: () => Promise<string>;
};
type Prebuilt = { sourceId: string; commit: string; workerId: string;
  siteId: string; accountId: string; digest: string };
type Intent = { sourceId: string; commit: string; workerId: string;
  siteId: string; accountId: string; driveName: string;
  driveId: string; projectId: string; sandboxName: string;
  pushSnapshotId: string; archiveSha256: string;
  sandboxTimeoutMs: number };
type Started = { intent: Intent; sessionId: string };
type Result = { state: 'running' | 'pending-review' } |
  { state: 'complete'; prebuilt: Prebuilt;
    cleanupState: 'complete' | 'pending-review' };
type Sdk = { drive: Pick<typeof Drive, 'get'>;
  sandbox: Pick<typeof Sandbox, 'create' | 'get'> };
const sdk: Sdk = { drive: Drive, sandbox: Sandbox };
const defaults = {
  transfer: readNativeStudioImageDriveTransfer,
  verifyArchive: verifyNativeStudioDriveArchive,
  recordArchive: recordStudioImageArchiveHandoff,
  start: startNativeStudioImageCommand,
  poll: pollNativeStudioImageCommand,
};

function validate(input: Input) {
  if (!input || typeof input.project !== 'string' ||
      !input.project.startsWith('/') ||
      !restrictedNativeStudioImageNetwork(input.pushNetworkPolicy) ||
      !EXECUTABLE.test(input.dockerPath) || input.dockerPath.includes('..') ||
      !EXECUTABLE.test(input.wranglerPath) || input.wranglerPath.includes('..') ||
      !Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 50 * 60_000 ||
      input.sandboxTimeoutMs > 60 * 60_000 ||
      typeof input.loadCredential !== 'function')
    throw Error('native_studio_detached_image_push_input_invalid');
}

function intentFor(input: Input, transfer: NativeStudioImageDriveTransfer): Intent {
  return { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.site.siteId,
    accountId: input.site.accountId, driveName: transfer.attempt.driveName,
    driveId: transfer.driveId, projectId: transfer.projectId,
    sandboxName: `gnr8-push-${transfer.attempt.driveName}`,
    pushSnapshotId: input.pushSnapshotId,
    archiveSha256: transfer.receipt.archive.sha256,
    sandboxTimeoutMs: input.sandboxTimeoutMs };
}

function commandIdentity(input: Input, intent: Intent,
  phase: 'load' | 'push') {
  return { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.site.siteId,
    driveName: intent.driveName, sandboxName: intent.sandboxName,
    phase, store: input.store };
}

function attestSandbox(sandbox: Sandbox, input: Input, started: Started) {
  const mount = sandbox.mounts?.[MOUNT];
  if (sandbox.name !== started.intent.sandboxName ||
      sandbox.status !== 'running' ||
      sandbox.currentSession().sessionId !== started.sessionId ||
      sandbox.region !== 'iad1' || sandbox.persistent !== false ||
      sandbox.sourceSnapshotId !== input.pushSnapshotId ||
      typeof sandbox.timeout !== 'number' || sandbox.timeout <= 0 ||
      sandbox.timeout > input.sandboxTimeoutMs ||
      mount?.drive !== started.intent.driveName ||
      mount.mode !== 'snapshot' ||
      !same(sandbox.networkPolicy, input.pushNetworkPolicy))
    throw Error('native_studio_detached_image_push_receiver_unverified');
}

function timeFor(sandbox: Sandbox, commandMs: number) {
  const expiresAt = sandbox.expiresAt;
  const remainingMs = expiresAt ? expiresAt.getTime() - Date.now() : NaN;
  if (typeof remainingMs !== 'number' ||
      !Number.isFinite(remainingMs) ||
      remainingMs < commandMs + 2 * 60_000)
    throw Error('native_studio_detached_image_push_time_insufficient');
}

function exactPrebuilt(input: Input, value: unknown): value is Prebuilt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prebuilt = value as Prebuilt;
  return Object.keys(prebuilt).sort().join() ===
      'accountId,commit,digest,siteId,sourceId,workerId' &&
    prebuilt.sourceId === input.sourceId &&
    prebuilt.commit === input.commit &&
    prebuilt.workerId === input.workerId &&
    prebuilt.siteId === input.site.siteId &&
    prebuilt.accountId === input.site.accountId &&
    SHA.test(prebuilt.digest);
}

async function cleanup(input: Input, intent: Intent, prebuilt: Prebuilt,
  receiver: Sandbox, drive: Drive): Promise<'complete' | 'pending-review'> {
  const record = { intent, digest: prebuilt.digest };
  if (await readExact(input, CLEANUP_DONE, record)) return 'complete';
  if (await input.store.read(CLEANUP_INTENT)) return 'pending-review';
  await claimExact(input, CLEANUP_INTENT, record);
  try {
    await receiver.stop();
    await drive.delete();
    await claimExact(input, CLEANUP_DONE, record);
    return 'complete';
  } catch {
    // Stop or delete may have succeeded despite a lost response. Do not retry.
    return 'pending-review';
  }
}

async function driveFor(input: Input, transfer: NativeStudioImageDriveTransfer,
  dependencies: Sdk) {
  const drive = await dependencies.drive.get({ name: transfer.attempt.driveName });
  if (drive.name !== transfer.attempt.driveName ||
      drive.driveId !== transfer.driveId ||
      drive.projectId !== transfer.projectId ||
      drive.region !== 'iad1' || drive.maxSize !== MAX_SIZE ||
      drive.currentSessionId)
    throw Error('native_studio_detached_image_push_drive_unverified');
  return drive;
}

async function readExact<T>(input: Input, key: string, expected: T): Promise<boolean> {
  const value = await input.store.read(key);
  if (!value) return false;
  if (!same(value, expected))
    throw Error('native_studio_detached_image_push_pending_review');
  return true;
}

async function claimExact<T>(input: Input, key: string, expected: T) {
  if (!await input.store.claim(key, expected) ||
      !same(await input.store.read(key), expected))
    throw Error('native_studio_detached_image_push_pending_review');
}

async function shortCommand(sandbox: Sandbox, cmd: string,
  args: string[], timeoutMs = 60_000) {
  const result = await sandbox.runCommand({ cmd, args, timeoutMs,
    env: { CI: '1', WRANGLER_SEND_METRICS: 'false' } });
  if (result.exitCode !== 0)
    throw Error('native_studio_detached_image_push_command_failed');
  return (await result.stdout()).trim();
}

async function inspectLoaded(input: Input, sandbox: Sandbox,
  transfer: NativeStudioImageDriveTransfer, intent: Intent) {
  const tag = `gnr8-${input.site.siteId}-studio:${input.sourceId.slice(0, 32)}`;
  const architecture = await shortCommand(sandbox, input.dockerPath,
    ['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', tag]);
  if (architecture !== 'linux/amd64')
    throw Error('native_studio_detached_image_push_architecture_invalid');
  const config = '/vercel/sandbox/gnr8-image-push/wrangler.jsonc';
  const content = JSON.stringify({ account_id: input.site.accountId }) + '\n';
  const probe = await sandbox.runCommand({ cmd: 'node', args: [
    '--input-type=module', '-e',
    `import{constants}from'node:fs';import{lstat,open}from'node:fs/promises';
const p=${JSON.stringify(config)},expected=${JSON.stringify(content)};
try{const s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size>128)process.exit(2);
const f=await open(p,constants.O_RDONLY|constants.O_NOFOLLOW);
try{if((await f.readFile()).toString('utf8')!==expected)process.exit(2)}finally{await f.close()}
console.log('same')}catch(e){if(e.code==='ENOENT')console.log('absent');else throw e}`],
    timeoutMs: 30_000, env: { CI: '1' } });
  if (probe.exitCode !== 0)
    throw Error('native_studio_detached_image_push_snapshot_dirty');
  const observed = (await probe.stdout()).trim();
  const configIntent = { intent, accountId: input.site.accountId,
    archiveSha256: transfer.receipt.archive.sha256 };
  if (!await readExact(input, CONFIG_INTENT, configIntent)) {
    if (observed !== 'absent')
      throw Error('native_studio_detached_image_push_snapshot_dirty');
    await claimExact(input, CONFIG_INTENT, configIntent);
  } else if (observed !== 'absent' && observed !== 'same') {
    throw Error('native_studio_detached_image_push_snapshot_dirty');
  }
  if (observed === 'absent')
    await sandbox.writeFiles([{ path: config, content: Buffer.from(content) }]);
  await claimExact(input, LOAD_VERIFIED, { intent,
    archiveSha256: transfer.receipt.archive.sha256,
    architecture: 'linux/amd64' });
}

async function finishPush(input: Input, sandbox: Sandbox,
  intent: Intent): Promise<Prebuilt> {
  const registryTag = `registry.cloudflare.com/${input.site.accountId}/gnr8-${input.site.siteId}-studio:${input.sourceId.slice(0, 32)}`;
  const output = await shortCommand(sandbox, input.dockerPath,
    ['image', 'inspect', '--format', '{{json .RepoDigests}}', registryTag]);
  let digests: unknown;
  try { digests = JSON.parse(output); }
  catch { throw Error('native_studio_detached_image_push_digest_unverified'); }
  const prefix = `registry.cloudflare.com/${input.site.accountId}/gnr8-${input.site.siteId}-studio@sha256:`;
  const matching = Array.isArray(digests) ? digests.filter(value =>
    typeof value === 'string' && value.startsWith(prefix) &&
    SHA.test(value.slice(prefix.length))) : [];
  if (matching.length !== 1)
    throw Error('native_studio_detached_image_push_digest_unverified');
  const prebuilt: Prebuilt = { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.site.siteId,
    accountId: input.site.accountId, digest: matching[0].slice(prefix.length) };
  if (!await readExact(input, PREBUILT, prebuilt))
    await claimExact(input, PREBUILT, prebuilt);
  return prebuilt;
}

/** One bounded phase per invocation. The receiver, Drive and command session
 * are private scoped identities; no retry starts a second load or push. */
export async function advanceNativeStudioDetachedImagePush(input: Input,
  dependencies: Sdk = sdk, steps: typeof defaults = defaults): Promise<Result> {
  validate(input);
  const transfer = await steps.transfer(input);
  verifyStudioImageArchiveIdentity({ ...input, archivePath: ARCHIVE_PATH,
    receipt: transfer.receipt });
  const intent = intentFor(input, transfer);
  const alreadyPushed = await input.store.read(PREBUILT);
  if (alreadyPushed) {
    if (!exactPrebuilt(input, alreadyPushed))
      return { state: 'pending-review' };
    const done = { intent, digest: alreadyPushed.digest };
    const cleanupState = await readExact(input, CLEANUP_DONE, done) ?
      'complete' : 'pending-review';
    return { state: 'complete', prebuilt: alreadyPushed, cleanupState };
  }
  const existingIntent = await input.store.read(RECEIVER_INTENT);
  if (!existingIntent) {
    await claimExact(input, RECEIVER_INTENT, intent);
    const drive = await driveFor(input, transfer, dependencies);
    const receiver = await dependencies.sandbox.create({
      name: intent.sandboxName,
      source: { type: 'snapshot', snapshotId: input.pushSnapshotId },
      mounts: { [MOUNT]: drive.snapshot() },
      networkPolicy: input.pushNetworkPolicy, region: 'iad1',
      persistent: false, timeout: input.sandboxTimeoutMs,
      resources: { vcpus: 2 }, ports: [],
    });
    const started: Started = { intent,
      sessionId: receiver.currentSession().sessionId };
    attestSandbox(receiver, input, started);
    await claimExact(input, RECEIVER_STARTED, started);
    return { state: 'running' };
  }
  if (!same(existingIntent, intent)) return { state: 'pending-review' };
  const started = await input.store.read(RECEIVER_STARTED) as Started | null;
  if (!started || !same(started.intent, intent))
    return { state: 'pending-review' };
  const drive = await driveFor(input, transfer, dependencies);
  const receiver = await dependencies.sandbox.get({ name: intent.sandboxName,
    resume: false });
  attestSandbox(receiver, input, started);
  const verified = { intent, sessionId: started.sessionId,
    archiveSha256: transfer.receipt.archive.sha256 };
  if (!await readExact(input, RECEIVER_VERIFIED, verified)) {
    const receipt = await steps.verifyArchive(receiver, ARCHIVE_PATH,
      transfer.receipt);
    if (!same(receipt, transfer.receipt))
      throw Error('native_studio_detached_image_push_archive_unverified');
    const recorded = await steps.recordArchive({ project: input.project,
      store: input.store, sourceId: input.sourceId, commit: input.commit,
      workerId: input.workerId, scope: input.scope, site: input.site,
      archivePath: ARCHIVE_PATH, receipt }, {
      verifyArchive: async () => receipt,
    });
    if (!same(recorded, transfer.receipt))
      throw Error('native_studio_detached_image_push_archive_unverified');
    await claimExact(input, RECEIVER_VERIFIED, verified);
    return { state: 'running' };
  }
  if (!same(await input.store.read(ARCHIVE), transfer.receipt))
    return { state: 'pending-review' };
  const loadIdentity = commandIdentity(input, intent, 'load');
  const loadIntent = await input.store.read(LOAD_INTENT);
  if (!loadIntent) {
    timeFor(receiver, 10 * 60_000);
    await steps.start({ ...loadIdentity, sandbox: receiver,
      command: { cmd: input.dockerPath, args: ['load', '--input', ARCHIVE_PATH],
        timeoutMs: 10 * 60_000, env: { CI: '1' } } });
    return { state: 'running' };
  }
  const loaded = { intent, archiveSha256: transfer.receipt.archive.sha256,
    architecture: 'linux/amd64' };
  if (!await readExact(input, LOAD_VERIFIED, loaded)) {
    const load = await steps.poll(loadIdentity, dependencies.sandbox);
    if (load.state === 'pending-review') return { state: 'pending-review' };
    if (load.state === 'running') return { state: 'running' };
    await inspectLoaded(input, receiver, transfer, intent);
    return { state: 'running' };
  }
  const pushIdentity = commandIdentity(input, intent, 'push');
  const pushIntent = await input.store.read(PUSH_INTENT);
  const pushAttempt = { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId,
    archiveSha256: transfer.receipt.archive.sha256 };
  if (!pushIntent) {
    if (await input.store.read(ATTEMPT)) return { state: 'pending-review' };
    timeFor(receiver, 20 * 60_000);
    const credential = await input.loadCredential();
    if (!TOKEN.test(credential))
      throw Error('native_studio_detached_image_push_credential_unavailable');
    await claimExact(input, ATTEMPT, pushAttempt);
    const tag = `gnr8-${input.site.siteId}-studio:${input.sourceId.slice(0, 32)}`;
    await steps.start({ ...pushIdentity, sandbox: receiver,
      command: { cmd: input.wranglerPath,
        args: ['containers', 'push', tag,
          '--path-to-docker', input.dockerPath, '--config',
          '/vercel/sandbox/gnr8-image-push/wrangler.jsonc'],
        timeoutMs: 20 * 60_000,
        env: { CI: '1', WRANGLER_SEND_METRICS: 'false',
          CLOUDFLARE_API_TOKEN: credential } } });
    return { state: 'running' };
  }
  if (!same(await input.store.read(ATTEMPT), pushAttempt))
    return { state: 'pending-review' };
  const push = await steps.poll(pushIdentity, dependencies.sandbox);
  if (push.state === 'pending-review') return { state: 'pending-review' };
  if (push.state === 'running') return { state: 'running' };
  const done = await finishPush(input, receiver, intent);
  const cleanupState = await cleanup(input, intent, done, receiver, drive);
  return { state: 'complete', prebuilt: done, cleanupState };
}
