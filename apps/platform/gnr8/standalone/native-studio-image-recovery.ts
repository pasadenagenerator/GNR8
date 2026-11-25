import 'server-only';
import { Sandbox, type NetworkPolicy } from '@vercel/sandbox';
import type { PublicationStore } from './publication-store';
import type { NativeStudioImageDriveAttempt } from './native-studio-image-drive-handoff';

const RECOVERY = 'native-studio/image-recovery-v1.json';
const NETWORK_RECOVERY = 'native-studio/image-recovery-v2.json';
const UNRESTRICTED_RECOVERY = 'native-studio/image-recovery-v3.json';
const OLD_ATTEMPT = 'native-studio/image-drive-attempt-v2.json';
const OLD_SESSION = 'native-studio/image-build-session-v1.json';
const OLD_STARTED = 'native-studio/image-build-command-started-v1.json';
const OLD_TRANSFER = 'native-studio/image-drive-transfer-v1.json';
const OLD_RECEIPT = 'native-studio/image-build-receipt-v1.json';
const OLD_PREBUILT = 'native-studio/prebuilt-image-v1.json';
const OLD_PREFLIGHT = 'native-studio/image-preflight-command-intent-v1.json';
const OLD_PUBLIC_PREFLIGHT = 'native-studio/image-public-preflight-command-intent-v1.json';
const OLD_SAVE = 'native-studio/image-save-command-intent-v1.json';
const OLD_PROOF = 'native-studio/image-preflight-proof-v1.json';
const OLD_SOURCE_VERIFIED = 'native-studio/image-build-source-verified-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Identity = { sourceId: string; commit: string; workerId: string;
  scope: { agencyId: string; clientId: string; siteId: string };
  site: { siteId: string; accountId: string };
  buildSnapshotId: string };
type OldSession = { attempt: NativeStudioImageDriveAttempt;
  sandboxName: string; sessionId: string };
type OldStarted = { intent: { sourceId: string; commit: string;
  workerId: string; siteId: string; driveName: string;
  sandboxName: string; sessionId: string; phase: string }; cmdId: string };
type Recovery = Identity & { oldAttempt: NativeStudioImageDriveAttempt;
  oldSandboxName: string; oldSessionId: string; oldCommandId: string };
type NetworkRecovery = Identity & { oldAttempt: NativeStudioImageDriveAttempt;
  oldSandboxName: string; oldSessionId: string; oldCommandId: string;
  buildNetworkPolicy: { allow: string[] } };
type UnrestrictedRecovery = Identity & {
  previousGeneration: 'v1' | 'v2';
  oldAttempt: NativeStudioImageDriveAttempt; oldSandboxName: string;
  oldSessionId: string; oldCommandId: string;
  buildNetworkPolicy: 'allow-all' };
type Store = Pick<PublicationStore, 'read' | 'claim' | 'put' | 'getBytes' | 'putBytes'>;

function mapped(key: string, generation: 'v1' | 'v2' | 'v3'): string {
  return key !== RECOVERY && key !== NETWORK_RECOVERY &&
    key !== UNRESTRICTED_RECOVERY &&
    (key.startsWith('native-studio/image-') ||
    key === 'native-studio/prebuilt-image-v1.json' ||
    key === 'native-studio/first-deploy-dry-run-v1.json')
    ? `native-studio/recovery-${generation}/${key.slice('native-studio/'.length)}` : key;
}

function isolated(store: Store, generation: 'v1' | 'v2' | 'v3'): Store {
  return { read: <T>(key: string) => store.read<T>(mapped(key, generation)),
    claim: (key, value) => store.claim(mapped(key, generation), value),
    put: <T>(key: string, value: T) => store.put<T>(mapped(key, generation), value),
    putBytes: (hash, bytes) => store.putBytes(hash, bytes),
    getBytes: hash => store.getBytes(hash) };
}

function exactRecovery(identity: Identity, value: Recovery,
  oldAttempt: NativeStudioImageDriveAttempt | null): boolean {
  if (!value || !oldAttempt || !SNAPSHOT.test(identity.buildSnapshotId) ||
      !SNAPSHOT.test(oldAttempt.buildSnapshotId) ||
      !SNAPSHOT.test(oldAttempt.pushSnapshotId) ||
      oldAttempt.buildSnapshotId === oldAttempt.pushSnapshotId ||
      oldAttempt.buildSnapshotId === identity.buildSnapshotId ||
      value.sourceId !== identity.sourceId ||
      value.commit !== identity.commit || value.workerId !== identity.workerId ||
      !same(value.scope, identity.scope) ||
      !same(value.site, { siteId: identity.site.siteId,
        accountId: identity.site.accountId }) ||
      value.buildSnapshotId !== identity.buildSnapshotId ||
      !same(value.oldAttempt, oldAttempt) ||
      value.oldSandboxName !== `gnr8-image-build-${oldAttempt.driveName.slice(-36)}` ||
      !UUID.test(oldAttempt.driveName.slice(-36)) ||
      !ID.test(value.oldSessionId) || !ID.test(value.oldCommandId))
    return false;
  return oldAttempt.sourceId === identity.sourceId &&
    oldAttempt.commit === identity.commit &&
    oldAttempt.workerId === identity.workerId &&
    same(oldAttempt.scope, identity.scope) &&
    oldAttempt.siteId === identity.site.siteId &&
    oldAttempt.accountId === identity.site.accountId;
}

/** A stopped failed builder may be superseded in an isolated append-only
 * namespace; source and resource records remain authoritative. */
export async function nativeStudioImageRecoveryStore<T extends Store>(
  store: T, identity: Identity, options: { allowCreate?: boolean;
    sandbox?: Pick<typeof Sandbox, 'get'>;
    validateNewSnapshot?: () => Promise<void>;
    buildNetworkPolicy?: NetworkPolicy } = {},
): Promise<T> {
  const oldAttempt = await store.read<NativeStudioImageDriveAttempt>(OLD_ATTEMPT);
  let recovery = await store.read<Recovery>(RECOVERY);
  if (!recovery && options.allowCreate && oldAttempt &&
      SNAPSHOT.test(oldAttempt.buildSnapshotId) &&
      oldAttempt.buildSnapshotId !== identity.buildSnapshotId) {
    const [session, started, transfer, receipt, prebuilt,
      preflight, publicPreflight, save, proof, sourceVerified] = await Promise.all([
      store.read<OldSession>(OLD_SESSION), store.read<OldStarted>(OLD_STARTED),
      store.read(OLD_TRANSFER), store.read(OLD_RECEIPT), store.read(OLD_PREBUILT),
      store.read(OLD_PREFLIGHT), store.read(OLD_PUBLIC_PREFLIGHT),
      store.read(OLD_SAVE), store.read(OLD_PROOF), store.read(OLD_SOURCE_VERIFIED),
    ]);
    const candidate: Recovery = { sourceId: identity.sourceId,
      commit: identity.commit, workerId: identity.workerId,
      scope: identity.scope,
      site: { siteId: identity.site.siteId,
        accountId: identity.site.accountId },
      buildSnapshotId: identity.buildSnapshotId, oldAttempt,
      oldSandboxName: session?.sandboxName ?? '',
      oldSessionId: session?.sessionId ?? '',
      oldCommandId: started?.cmdId ?? '' };
    if (!exactRecovery(identity, candidate, oldAttempt) ||
        !same(session?.attempt, oldAttempt) ||
        started?.intent?.sourceId !== identity.sourceId ||
        started.intent.commit !== identity.commit ||
        started.intent.workerId !== identity.workerId ||
        started.intent.siteId !== identity.site.siteId ||
        started.intent.driveName !== oldAttempt.driveName ||
        started.intent.sandboxName !== session?.sandboxName ||
        started.intent.sessionId !== session?.sessionId ||
        started.intent.phase !== 'build' ||
        transfer || receipt || prebuilt || preflight || publicPreflight ||
        save || proof || sourceVerified)
      throw Error('native_studio_image_recovery_pending_review');
    await options.validateNewSnapshot?.();
    const sandbox = await (options.sandbox ?? Sandbox).get({
      name: candidate.oldSandboxName, resume: false });
    if (sandbox.name !== candidate.oldSandboxName ||
        sandbox.status !== 'stopped' ||
        sandbox.sourceSnapshotId !== oldAttempt.buildSnapshotId ||
        sandbox.currentSession().sessionId !== candidate.oldSessionId)
      throw Error('native_studio_image_recovery_pending_review');
    await store.claim(RECOVERY, candidate);
    recovery = await store.read<Recovery>(RECOVERY);
    if (!same(recovery, candidate))
      throw Error('native_studio_image_recovery_pending_review');
  }
  if (!recovery) return store;
  if (!exactRecovery(identity, recovery, oldAttempt))
    throw Error('native_studio_image_recovery_unverified');
  const first = isolated(store, 'v1');
  const firstAttempt = await first.read<NativeStudioImageDriveAttempt>(OLD_ATTEMPT);
  let networkRecovery = await store.read<NetworkRecovery>(NETWORK_RECOVERY);
  if (!networkRecovery && options.allowCreate &&
      options.buildNetworkPolicy && typeof options.buildNetworkPolicy === 'object' &&
      Array.isArray(options.buildNetworkPolicy.allow) &&
      firstAttempt && firstAttempt.buildSnapshotId === identity.buildSnapshotId &&
      firstAttempt.sourceId === identity.sourceId &&
      firstAttempt.commit === identity.commit &&
      firstAttempt.workerId === identity.workerId &&
      same(firstAttempt.scope, identity.scope) &&
      firstAttempt.siteId === identity.site.siteId &&
      firstAttempt.accountId === identity.site.accountId) {
    const [session, started, transfer, receipt, prebuilt, preflight,
      publicPreflight, save, proof, sourceVerified] = await Promise.all([
      first.read<OldSession>(OLD_SESSION), first.read<OldStarted>(OLD_STARTED),
      first.read(OLD_TRANSFER), first.read(OLD_RECEIPT), first.read(OLD_PREBUILT),
      first.read(OLD_PREFLIGHT), first.read(OLD_PUBLIC_PREFLIGHT),
      first.read(OLD_SAVE), first.read(OLD_PROOF), first.read(OLD_SOURCE_VERIFIED),
    ]);
    if (session && started && !transfer && !receipt && !prebuilt &&
        !preflight && !publicPreflight && !save && !proof && !sourceVerified) {
      const sandbox = await (options.sandbox ?? Sandbox).get({
        name: session.sandboxName, resume: false });
      const oldPolicy = sandbox.networkPolicy;
      const newPolicy = options.buildNetworkPolicy as { allow: string[] };
      if (sandbox.status === 'stopped' &&
          sandbox.sourceSnapshotId === identity.buildSnapshotId &&
          sandbox.currentSession().sessionId === session.sessionId &&
          same(session.attempt, firstAttempt) &&
          started.intent.sourceId === identity.sourceId &&
          started.intent.commit === identity.commit &&
          started.intent.workerId === identity.workerId &&
          started.intent.siteId === identity.site.siteId &&
          started.intent.driveName === firstAttempt.driveName &&
          started.intent.sandboxName === session.sandboxName &&
          started.intent.sessionId === session.sessionId &&
          started.intent.phase === 'build' &&
          ID.test(started.cmdId) &&
          Array.isArray((oldPolicy as { allow?: unknown })?.allow) &&
          (oldPolicy as { allow: string[] }).allow.every(host =>
            newPolicy.allow.includes(host)) &&
          newPolicy.allow.length > (oldPolicy as { allow: string[] }).allow.length) {
        const candidate: NetworkRecovery = { ...identity,
          site: { siteId: identity.site.siteId,
            accountId: identity.site.accountId },
          oldAttempt: firstAttempt, oldSandboxName: session.sandboxName,
          oldSessionId: session.sessionId, oldCommandId: started.cmdId,
          buildNetworkPolicy: newPolicy };
        await store.claim(NETWORK_RECOVERY, candidate);
        networkRecovery = await store.read<NetworkRecovery>(NETWORK_RECOVERY);
        if (!same(networkRecovery, candidate))
          throw Error('native_studio_image_recovery_pending_review');
      }
    }
  }
  if (networkRecovery && (networkRecovery.sourceId !== identity.sourceId ||
      networkRecovery.commit !== identity.commit ||
      networkRecovery.workerId !== identity.workerId ||
      !same(networkRecovery.scope, identity.scope) ||
      !same(networkRecovery.site, { siteId: identity.site.siteId,
        accountId: identity.site.accountId }) ||
      networkRecovery.buildSnapshotId !== identity.buildSnapshotId ||
      !same(networkRecovery.oldAttempt, firstAttempt) ||
      (options.buildNetworkPolicy &&
        options.buildNetworkPolicy !== 'allow-all' &&
        !same(networkRecovery.buildNetworkPolicy, options.buildNetworkPolicy))))
    throw Error('native_studio_image_recovery_unverified');
  const previousGeneration = networkRecovery ? 'v2' : 'v1';
  const previous = networkRecovery ? isolated(store, 'v2') : first;
  const previousAttempt = await previous.read<NativeStudioImageDriveAttempt>(OLD_ATTEMPT);
  let unrestricted = await store.read<UnrestrictedRecovery>(UNRESTRICTED_RECOVERY);
  if (!unrestricted && options.allowCreate &&
      options.buildNetworkPolicy === 'allow-all' && previousAttempt &&
      previousAttempt.buildSnapshotId === identity.buildSnapshotId &&
      previousAttempt.sourceId === identity.sourceId &&
      previousAttempt.commit === identity.commit &&
      previousAttempt.workerId === identity.workerId &&
      same(previousAttempt.scope, identity.scope) &&
      previousAttempt.siteId === identity.site.siteId &&
      previousAttempt.accountId === identity.site.accountId) {
    const [session, started, transfer, receipt, prebuilt, preflight,
      publicPreflight, save, proof, sourceVerified] = await Promise.all([
      previous.read<OldSession>(OLD_SESSION),
      previous.read<OldStarted>(OLD_STARTED),
      previous.read(OLD_TRANSFER), previous.read(OLD_RECEIPT),
      previous.read(OLD_PREBUILT), previous.read(OLD_PREFLIGHT),
      previous.read(OLD_PUBLIC_PREFLIGHT), previous.read(OLD_SAVE),
      previous.read(OLD_PROOF), previous.read(OLD_SOURCE_VERIFIED),
    ]);
    if (session && started && !transfer && !receipt && !prebuilt &&
        !preflight && !publicPreflight && !save && !proof && !sourceVerified) {
      const sandbox = await (options.sandbox ?? Sandbox).get({
        name: session.sandboxName, resume: false });
      if (sandbox.status === 'stopped' &&
          sandbox.sourceSnapshotId === identity.buildSnapshotId &&
          sandbox.currentSession().sessionId === session.sessionId &&
          sandbox.networkPolicy !== 'allow-all' &&
          same(session.attempt, previousAttempt) &&
          started.intent.sourceId === identity.sourceId &&
          started.intent.commit === identity.commit &&
          started.intent.workerId === identity.workerId &&
          started.intent.siteId === identity.site.siteId &&
          started.intent.driveName === previousAttempt.driveName &&
          started.intent.sandboxName === session.sandboxName &&
          started.intent.sessionId === session.sessionId &&
          started.intent.phase === 'build' && ID.test(started.cmdId)) {
        const candidate: UnrestrictedRecovery = { ...identity,
          site: { siteId: identity.site.siteId,
            accountId: identity.site.accountId },
          previousGeneration, oldAttempt: previousAttempt,
          oldSandboxName: session.sandboxName,
          oldSessionId: session.sessionId, oldCommandId: started.cmdId,
          buildNetworkPolicy: 'allow-all' };
        await store.claim(UNRESTRICTED_RECOVERY, candidate);
        unrestricted = await store.read<UnrestrictedRecovery>(UNRESTRICTED_RECOVERY);
        if (!same(unrestricted, candidate))
          throw Error('native_studio_image_recovery_pending_review');
      }
    }
  }
  if (!unrestricted) return previous as T;
  if (unrestricted.sourceId !== identity.sourceId ||
      unrestricted.commit !== identity.commit ||
      unrestricted.workerId !== identity.workerId ||
      !same(unrestricted.scope, identity.scope) ||
      !same(unrestricted.site, { siteId: identity.site.siteId,
        accountId: identity.site.accountId }) ||
      unrestricted.buildSnapshotId !== identity.buildSnapshotId ||
      unrestricted.previousGeneration !== previousGeneration ||
      !same(unrestricted.oldAttempt, previousAttempt) ||
      unrestricted.buildNetworkPolicy !== 'allow-all' ||
      (options.buildNetworkPolicy && options.buildNetworkPolicy !== 'allow-all'))
    throw Error('native_studio_image_recovery_unverified');
  return isolated(store, 'v3') as T;
}
