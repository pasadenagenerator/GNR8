import 'server-only';
import { Drive, Sandbox, type NetworkPolicy } from '@vercel/sandbox';
import { describeNativeStudioDriveImageSource,
  inspectNativeStudioDriveImageArchive,
  NATIVE_STUDIO_IMAGE_ARCHIVE_PATH,
  NATIVE_STUDIO_IMAGE_SOURCE_ROOT,
  stageNativeStudioDriveImageSource,
  verifyNativeStudioDriveImageSource,
  type NativeStudioDriveImageFile } from './native-studio-drive-image-build';
import { pollNativeStudioImageCommand,
  startNativeStudioImageCommand } from './native-studio-image-detached-command';
import { restrictedNativeStudioImageNetwork } from './native-studio-image-drive';
import { NATIVE_STUDIO_WORKER_BUNDLE_METAFILE,
  NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR,
  NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_METAFILE,
  NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_OUTDIR,
  recordNativeStudioWorkerBundle,
  recordNativeStudioPublicWorkerBundle,
  verifyNativeStudioWorkerBundleReceipt,
  verifyNativeStudioPublicWorkerBundleReceipt } from './native-studio-worker-bundle';
import type { PublicationStore } from './publication-store';
import { claimNativeStudioImageDriveAttempt,
  readNativeStudioImageDriveTransfer,
  recordNativeStudioImageDriveTransfer,
  type NativeStudioImageArchiveReceipt,
  type NativeStudioImageDriveAttempt,
  type NativeStudioImageDriveIdentity,
  type NativeStudioImageDriveTransfer } from './native-studio-image-drive-handoff';

const SESSION = 'native-studio/image-build-session-v1.json';
const SOURCE_VERIFIED = 'native-studio/image-build-source-verified-v1.json';
const RECEIPT = 'native-studio/image-build-receipt-v1.json';
const ATTEMPT = 'native-studio/image-drive-attempt-v2.json';
const TRANSFER = 'native-studio/image-drive-transfer-v1.json';
const BUILD_INTENT = 'native-studio/image-build-command-intent-v1.json';
const PREFLIGHT_INTENT = 'native-studio/image-preflight-command-intent-v1.json';
const PUBLIC_PREFLIGHT_INTENT =
  'native-studio/image-public-preflight-command-intent-v1.json';
export const NATIVE_STUDIO_IMAGE_PREFLIGHT_PROOF =
  'native-studio/image-preflight-proof-v1.json';
const SAVE_INTENT = 'native-studio/image-save-command-intent-v1.json';
const MOUNT = '/gnr8-image';
const MAX_SIZE = 12 * 1024 * 1024 * 1024;
const DOCKER_HOST = 'unix:///var/run/docker.sock';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SHA = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Input = Omit<NativeStudioImageDriveIdentity, 'store'> & {
  publicWorkerId: string;
  store: NativeStudioImageDriveIdentity['store'] &
    Pick<PublicationStore, 'putBytes' | 'getBytes'>;
  files: NativeStudioDriveImageFile[];
  buildNetworkPolicy: NetworkPolicy;
  sandboxTimeoutMs: number;
};
type Session = { attempt: NativeStudioImageDriveAttempt;
  driveId: string; projectId: string; sandboxName: string;
  sessionId: string; manifestSha256: string; tag: string;
  publicWorkerId: string;
  sandboxTimeoutMs: number };
type SourceVerified = { sourceId: string; commit: string;
  workerId: string; driveName: string; manifestSha256: string };
type Receipt = { session: Session; receipt: NativeStudioImageArchiveReceipt };
export type DetachedImageBuildResult =
  | { state: 'running' | 'pending-review' }
  | { state: 'complete'; transfer: NativeStudioImageDriveTransfer };

type Sdk = { drive: Pick<typeof Drive, 'get' | 'getOrCreate'>;
  sandbox: Pick<typeof Sandbox, 'create' | 'get'> };
const sdk: Sdk = { drive: Drive, sandbox: Sandbox };
const defaults = {
  claimAttempt: claimNativeStudioImageDriveAttempt,
  readTransfer: readNativeStudioImageDriveTransfer,
  recordTransfer: recordNativeStudioImageDriveTransfer,
  stage: stageNativeStudioDriveImageSource,
  verifySource: verifyNativeStudioDriveImageSource,
  inspect: inspectNativeStudioDriveImageArchive,
  startCommand: startNativeStudioImageCommand,
  pollCommand: pollNativeStudioImageCommand,
  ensureDocker: ensureNativeStudioDockerDaemon,
  recordBundle: recordNativeStudioWorkerBundle,
  verifyBundle: verifyNativeStudioWorkerBundleReceipt,
  recordPublicBundle: recordNativeStudioPublicWorkerBundle,
  verifyPublicBundle: verifyNativeStudioPublicWorkerBundleReceipt,
};

/** A snapshot restores installed files, not a running dockerd process. Start
 * only a Unix-socket daemon, before staging site-controlled source or loading
 * any Cloudflare credential. A lost start is terminal for this attempt. */
export async function ensureNativeStudioDockerDaemon(
  sandbox: Pick<Sandbox, 'runCommand'>, dockerPath: string,
  pause: (ms: number) => Promise<void> = ms =>
    new Promise(resolve => setTimeout(resolve, ms)),
) {
  if (dockerPath !== 'docker' &&
      (!/^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/.test(dockerPath) ||
        dockerPath.includes('..')))
    throw Error('native_studio_docker_daemon_unconfigured');
  const ready = async () => {
    const result = await sandbox.runCommand({ cmd: dockerPath,
      args: ['info', '--format', '{{.ServerVersion}}'], timeoutMs: 5_000,
      env: { CI: '1', DOCKER_HOST } });
    return result.exitCode === 0;
  };
  try { if (await ready()) return; }
  catch { /* A read-only probe may be retried after starting dockerd. */ }
  try {
    await sandbox.runCommand({ cmd: 'dockerd',
      args: [`--host=${DOCKER_HOST}`],
      sudo: true, detached: true, env: { CI: '1' } });
  } catch { throw Error('native_studio_docker_daemon_unavailable'); }
  for (let attempt = 0; attempt < 20; attempt++) {
    try { if (await ready()) return; }
    catch { /* Bound the readiness wait; never accept an unknown daemon. */ }
    if (attempt < 19) await pause(1_000);
  }
  throw Error('native_studio_docker_daemon_unavailable');
}

function sandboxName(attempt: NativeStudioImageDriveAttempt) {
  const suffix = attempt.driveName.slice(-36);
  if (!UUID.test(suffix)) throw Error('native_studio_detached_build_attempt_unverified');
  return `gnr8-image-build-${suffix}`;
}

function validAttempt(input: Input, value: unknown): value is NativeStudioImageDriveAttempt {
  const attempt = value as NativeStudioImageDriveAttempt;
  return !!attempt && attempt.sourceId === input.sourceId &&
    attempt.commit === input.commit && attempt.workerId === input.workerId &&
    same(attempt.scope, input.scope) && attempt.siteId === input.site.siteId &&
    attempt.accountId === input.site.accountId &&
    attempt.buildSnapshotId === input.buildSnapshotId &&
    attempt.pushSnapshotId === input.pushSnapshotId &&
    typeof attempt.driveName === 'string' &&
    attempt.driveName === `gnr8-img-${input.site.siteId.slice(0, 8)}-${input.sourceId.slice(0, 8)}-${attempt.driveName.slice(-36)}` &&
    attempt.driveName.length <= 64 &&
    UUID.test(attempt.driveName.slice(-36));
}

function commandIdentity(input: Input, session: Session,
  phase: 'build' | 'preflight' | 'public-preflight' | 'save') {
  return { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.site.siteId,
    driveName: session.attempt.driveName,
    sandboxName: session.sandboxName, phase, store: input.store };
}

function preflightProof(input: Input, session: Session) {
  return { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.site.siteId,
    accountId: input.site.accountId, buildSnapshotId: input.buildSnapshotId,
    sandboxName: session.sandboxName, sessionId: session.sessionId,
    manifestSha256: session.manifestSha256 };
}

function bundleIdentity(input: Input, session: Session) {
  return { scope: input.scope, site: input.site, sourceId: input.sourceId,
    commit: input.commit, workerId: input.workerId,
    buildSnapshotId: input.buildSnapshotId,
    sandboxName: session.sandboxName, sessionId: session.sessionId,
    store: input.store };
}

function publicBundleIdentity(input: Input, session: Session) {
  return { ...bundleIdentity(input, session), workerId: input.publicWorkerId };
}

async function requirePreflightProof(input: Input, session: Session) {
  if (!same(await input.store.read(NATIVE_STUDIO_IMAGE_PREFLIGHT_PROOF),
    preflightProof(input, session)))
    throw Error('native_studio_image_preflight_unverified');
}

function attestedBuilder(input: Input, builder: Sandbox,
  attempt: NativeStudioImageDriveAttempt, expectedSessionId: string): boolean {
  const mount = builder.mounts?.[MOUNT];
  const expiresAt = builder.expiresAt;
  return builder.name === sandboxName(attempt) &&
    builder.status === 'running' &&
    builder.currentSession().sessionId === expectedSessionId &&
    builder.sourceSnapshotId === input.buildSnapshotId &&
    builder.region === 'iad1' && builder.persistent === false &&
    builder.timeout === input.sandboxTimeoutMs &&
    mount?.drive === attempt.driveName && mount.mode === 'read-write' &&
    same(builder.networkPolicy, input.buildNetworkPolicy) &&
    expiresAt instanceof Date && expiresAt.getTime() > Date.now();
}

function exactSource(input: Input, session: Session) {
  const source = describeNativeStudioDriveImageSource(
    NATIVE_STUDIO_IMAGE_ARCHIVE_PATH, { ...input, files: input.files });
  if (source.manifestSha256 !== session.manifestSha256 ||
      source.tag !== session.tag)
    throw Error('native_studio_detached_build_source_changed');
  return source;
}

async function claimExact(store: Input['store'], key: string, value: unknown) {
  if (!await store.claim(key, value) ||
      !same(await store.read(key), value))
    throw Error('native_studio_detached_build_pending_review');
}

function requireRemainingTime(sandbox: Sandbox, minimumMs: number) {
  const expiresAt = sandbox.expiresAt;
  const remainingMs = expiresAt ? expiresAt.getTime() - Date.now() : NaN;
  if (typeof remainingMs !== 'number' ||
      !Number.isFinite(remainingMs) || remainingMs < minimumMs)
    throw Error('native_studio_detached_build_time_insufficient');
}

async function finish(input: Input, session: Session,
  receipt: NativeStudioImageArchiveReceipt, dependencies: Sdk,
  steps: typeof defaults, verifiedNow = false): Promise<DetachedImageBuildResult> {
  await requirePreflightProof(input, session);
  await steps.verifyBundle(bundleIdentity(input, session));
  await steps.verifyPublicBundle(publicBundleIdentity(input, session));
  const builder = await dependencies.sandbox.get({ name: session.sandboxName,
    resume: false });
  if (builder.name !== session.sandboxName ||
      !['running', 'stopped'].includes(builder.status))
    return { state: 'pending-review' };
  if (builder.status === 'running') {
    if (!attestedBuilder(input, builder, session.attempt, session.sessionId))
      return { state: 'pending-review' };
    if (!verifiedNow) {
      // A crash may leave a writable mounted Drive after the private receipt
      // was claimed. Rehash before stopping and accepting that receipt. The
      // source was verified in the prior bounded invocation.
      const current = await steps.inspect(builder,
        NATIVE_STUDIO_IMAGE_ARCHIVE_PATH, input);
      if (!same(current, receipt)) return { state: 'pending-review' };
    }
    await builder.stop();
  }
  const drive = await dependencies.drive.get({ name: session.attempt.driveName });
  if (drive.name !== session.attempt.driveName ||
      drive.driveId !== session.driveId ||
      drive.projectId !== session.projectId ||
      drive.region !== 'iad1' || drive.maxSize !== MAX_SIZE ||
      drive.currentSessionId)
    return { state: 'pending-review' };
  const transfer = await steps.recordTransfer({ ...input,
    attempt: session.attempt, drive, receipt });
  return { state: 'complete', transfer };
}

/** One invocation advances at most one long Docker command. Every retry
 * reconstructs the same scoped source and private Sandbox/Drive identities. */
export async function advanceNativeStudioDetachedImageBuild(input: Input,
  dependencies: Sdk = sdk, steps: typeof defaults = defaults):
  Promise<DetachedImageBuildResult> {
  if (!input || !restrictedNativeStudioImageNetwork(input.buildNetworkPolicy) ||
      !HEX32.test(input.publicWorkerId) ||
      !Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 60 * 60_000 ||
      input.sandboxTimeoutMs > 90 * 60_000)
    throw Error('native_studio_detached_build_unconfigured');
  const source = describeNativeStudioDriveImageSource(
    NATIVE_STUDIO_IMAGE_ARCHIVE_PATH, { ...input, files: input.files });
  if (await input.store.read(TRANSFER)) {
    const session = await input.store.read(SESSION) as Session | null;
    if (!session || !validAttempt(input, session.attempt) ||
        session.manifestSha256 !== source.manifestSha256)
      return { state: 'pending-review' };
    await requirePreflightProof(input, session);
    await steps.verifyBundle(bundleIdentity(input, session));
    await steps.verifyPublicBundle(publicBundleIdentity(input, session));
    return { state: 'complete', transfer: await steps.readTransfer(input) };
  }
  const existingAttempt = await input.store.read(ATTEMPT);
  if (existingAttempt && !validAttempt(input, existingAttempt))
    return { state: 'pending-review' };
  const attempt = existingAttempt as NativeStudioImageDriveAttempt | null ??
    await steps.claimAttempt(input);
  const stored = await input.store.read(SESSION) as Session | null;
  if (!stored) {
    // A prior attempt without an attested session is ambiguous and cannot
    // create a second Sandbox or Drive automatically.
    if (existingAttempt) return { state: 'pending-review' };
    const drive = await dependencies.drive.getOrCreate({ name: attempt.driveName,
      region: 'iad1', maxSize: MAX_SIZE });
    if (drive.name !== attempt.driveName || drive.region !== 'iad1' ||
        drive.maxSize !== MAX_SIZE || drive.currentSessionId ||
        !ID.test(drive.driveId) || !ID.test(drive.projectId))
      return { state: 'pending-review' };
    const name = sandboxName(attempt);
    const builder = await dependencies.sandbox.create({ name,
      source: { type: 'snapshot', snapshotId: input.buildSnapshotId },
      mounts: { [MOUNT]: drive }, networkPolicy: input.buildNetworkPolicy,
      region: 'iad1', persistent: false, timeout: input.sandboxTimeoutMs,
      resources: { vcpus: 2 }, ports: [] });
    const sessionId = builder.currentSession().sessionId;
    if (!ID.test(sessionId) ||
        !attestedBuilder(input, builder, attempt, sessionId))
      return { state: 'pending-review' };
    await steps.ensureDocker(builder, 'docker');
    await steps.stage(builder, NATIVE_STUDIO_IMAGE_ARCHIVE_PATH, input);
    const session: Session = { attempt, driveId: drive.driveId,
      projectId: drive.projectId, sandboxName: name, sessionId,
      manifestSha256: source.manifestSha256, tag: source.tag,
      publicWorkerId: input.publicWorkerId,
      sandboxTimeoutMs: input.sandboxTimeoutMs };
    await claimExact(input.store, SESSION, session);
    requireRemainingTime(builder, 47 * 60_000);
    await steps.startCommand({ ...commandIdentity(input, session, 'build'),
      sandbox: builder,
      command: { cmd: 'docker', args: ['build', '--platform', 'linux/amd64',
        '--file', 'Dockerfile', '--tag', source.tag, '.'],
      cwd: `${NATIVE_STUDIO_IMAGE_SOURCE_ROOT}/studio`,
      env: { CI: '1', DOCKER_HOST }, timeoutMs: 20 * 60_000 } });
    return { state: 'running' };
  }
  if (!validAttempt(input, stored.attempt) ||
      !same(stored.attempt, attempt) ||
      stored.sandboxName !== sandboxName(attempt) ||
      stored.publicWorkerId !== input.publicWorkerId ||
      !ID.test(stored.driveId) || !ID.test(stored.projectId) ||
      !ID.test(stored.sessionId) ||
      stored.sandboxTimeoutMs !== input.sandboxTimeoutMs ||
      !SHA.test(stored.manifestSha256))
    return { state: 'pending-review' };
  exactSource(input, stored);
  const drive = await dependencies.drive.get({ name: attempt.driveName });
  if (drive.name !== attempt.driveName || drive.driveId !== stored.driveId ||
      drive.projectId !== stored.projectId || drive.region !== 'iad1' ||
      drive.maxSize !== MAX_SIZE)
    return { state: 'pending-review' };
  const saved = await input.store.read(RECEIPT) as Receipt | null;
  if (saved) {
    if (!same(saved.session, stored) ||
        !saved.receipt || saved.receipt.sourceId !== input.sourceId ||
        saved.receipt.commit !== input.commit ||
        saved.receipt.workerId !== input.workerId ||
        !same(saved.receipt.scope, input.scope) ||
        saved.receipt.siteId !== input.site.siteId ||
        saved.receipt.accountId !== input.site.accountId ||
        !Number.isSafeInteger(saved.receipt.archive?.bytes) ||
        saved.receipt.archive.bytes < 1 ||
        !SHA.test(saved.receipt.archive?.sha256))
      return { state: 'pending-review' };
    return finish(input, stored, saved.receipt, dependencies, steps);
  }
  const builder = await dependencies.sandbox.get({ name: stored.sandboxName,
    resume: false });
  if (!attestedBuilder(input, builder, attempt, stored.sessionId))
    return { state: 'pending-review' };
  if (await input.store.read(SAVE_INTENT)) {
    await requirePreflightProof(input, stored);
    await steps.verifyBundle(bundleIdentity(input, stored));
    await steps.verifyPublicBundle(publicBundleIdentity(input, stored));
    const poll = await steps.pollCommand(commandIdentity(input, stored, 'save'),
      dependencies.sandbox);
    if (poll.state !== 'succeeded')
      return { state: poll.state === 'running' ? 'running' : 'pending-review' };
    const verification: SourceVerified = { sourceId: input.sourceId,
      commit: input.commit, workerId: input.workerId,
      driveName: attempt.driveName,
      manifestSha256: stored.manifestSha256 };
    const prior = await input.store.read(SOURCE_VERIFIED);
    if (!prior) {
      await steps.verifySource(builder, stored.manifestSha256);
      await claimExact(input.store, SOURCE_VERIFIED, verification);
      return { state: 'running' };
    }
    if (!same(prior, verification)) return { state: 'pending-review' };
    const receipt = await steps.inspect(builder,
      NATIVE_STUDIO_IMAGE_ARCHIVE_PATH, input);
    await claimExact(input.store, RECEIPT, { session: stored, receipt });
    return finish(input, stored, receipt, dependencies, steps, true);
  }
  if (!await input.store.read(BUILD_INTENT))
    return { state: 'pending-review' };
  const phase = await input.store.read(PUBLIC_PREFLIGHT_INTENT)
    ? 'public-preflight' : await input.store.read(PREFLIGHT_INTENT)
      ? 'preflight' : 'build';
  const poll = await steps.pollCommand(commandIdentity(input, stored, phase),
    dependencies.sandbox);
  if (poll.state !== 'succeeded')
    return { state: poll.state === 'running' ? 'running' : 'pending-review' };
  await steps.verifySource(builder, stored.manifestSha256);
  if (phase === 'build') {
    requireRemainingTime(builder, 42 * 60_000);
    await steps.startCommand({ ...commandIdentity(input, stored, 'preflight'),
      sandbox: builder,
      command: { cmd: '/usr/local/bin/wrangler',
        args: ['deploy', '--dry-run', '--outdir',
          NATIVE_STUDIO_WORKER_BUNDLE_OUTDIR,
          '--metafile', NATIVE_STUDIO_WORKER_BUNDLE_METAFILE,
          '--config', 'cloudflare/wrangler.jsonc'],
        cwd: `${NATIVE_STUDIO_IMAGE_SOURCE_ROOT}/studio`,
        env: { CI: '1', DOCKER_HOST, WRANGLER_SEND_METRICS: 'false' },
        timeoutMs: 15 * 60_000 } });
    return { state: 'running' };
  }
  if (phase === 'preflight') {
    await steps.recordBundle({ ...bundleIdentity(input, stored),
      sandboxTimeoutMs: input.sandboxTimeoutMs,
      networkPolicy: input.buildNetworkPolicy, sandbox: builder });
    requireRemainingTime(builder, 27 * 60_000);
    await steps.startCommand({
      ...commandIdentity(input, stored, 'public-preflight'),
      sandbox: builder,
      command: { cmd: '/usr/local/bin/wrangler',
        args: ['deploy', '--dry-run', '--outdir',
          NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_OUTDIR,
          '--metafile', NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_METAFILE,
          '--config', 'wrangler.json'],
        cwd: NATIVE_STUDIO_IMAGE_SOURCE_ROOT,
        env: { CI: '1', DOCKER_HOST, WRANGLER_SEND_METRICS: 'false' },
        timeoutMs: 15 * 60_000 } });
    return { state: 'running' };
  }
  await steps.recordPublicBundle({ ...publicBundleIdentity(input, stored),
    sandboxTimeoutMs: input.sandboxTimeoutMs,
    networkPolicy: input.buildNetworkPolicy, sandbox: builder });
  await steps.verifyBundle(bundleIdentity(input, stored));
  await claimExact(input.store, NATIVE_STUDIO_IMAGE_PREFLIGHT_PROOF,
    preflightProof(input, stored));
  requireRemainingTime(builder, 12 * 60_000);
  await steps.startCommand({ ...commandIdentity(input, stored, 'save'),
    sandbox: builder,
    command: { cmd: 'docker', args: ['save', '--output',
      NATIVE_STUDIO_IMAGE_ARCHIVE_PATH, stored.tag],
    cwd: `${NATIVE_STUDIO_IMAGE_SOURCE_ROOT}/studio`,
    env: { CI: '1', DOCKER_HOST }, timeoutMs: 10 * 60_000 } });
  return { state: 'running' };
}
