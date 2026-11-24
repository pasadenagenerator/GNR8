import 'server-only';
import { Sandbox, Snapshot, type NetworkPolicy } from '@vercel/sandbox';
import { stagePrebundledPublicDeploy } from '../../../../scripts/stacki/stage-prebundled-public-deploy.mjs';
import { stageNativeStudioPublicPackageInSandbox,
  verifyNativeStudioPublicPackageInSandbox, PUBLIC_PACKAGE } from
  './native-studio-public-deploy-sandbox-stage';
import { NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_RECEIPT,
  verifyNativeStudioPublicWorkerBundleReceipt,
  type NativeStudioWorkerBundleReceipt } from './native-studio-worker-bundle';
import { PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';
import { fingerprint } from './publication-contract';
import type { PublicationStore } from './publication-store';

const SANDBOX_INTENT = 'native-studio/first-public-sandbox-intent-v1.json';
const SANDBOX_SESSION = 'native-studio/first-public-sandbox-session-v1.json';
const ATTEMPT = 'native-studio/first-public-deploy-attempt-v1.json';
const STARTED = 'native-studio/first-public-command-started-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
type Scope = { agencyId: string; clientId: string; siteId: string };
type Site = { siteId: string; accountId: string; repository: string;
  repositoryId: string; branch: string; studioOrigin: string };
type Input = { scope: Scope; site: Site; store: PublicationStore;
  artifactProject: string; sourceId: string; commit: string;
  studioWorkerId: string; publicWorkerId: string; studioTag: string;
  snapshotId: string; networkPolicy: NetworkPolicy; sandboxTimeoutMs: number;
  wranglerPath: string; loadCredential: () => Promise<string>;
  prepareIntent: () => Promise<{ state: string; commit: string;
    publicWorkerId: string; studioTag: string }>;
  inspect: (credential: string, tag: string) => Promise<{
    state: string; workerId?: string }> };
type Session = { sourceId: string; commit: string; publicWorkerId: string;
  scope: Scope; siteId: string; accountId: string; snapshotId: string;
  sandboxName: string; sessionId: string; sandboxTimeoutMs: number;
  manifestSha256: string; config: string };
type Result = { state: 'running' | 'pending-review' | 'first-open-required';
  commit: string; observation?: string };
type Sdk = { sandbox: Pick<typeof Sandbox, 'create' | 'get'>;
  snapshot: Pick<typeof Snapshot, 'get'> };
const sdk: Sdk = { sandbox: Sandbox, snapshot: Snapshot };
const defaults = { stageLocal: stagePrebundledPublicDeploy,
  stageRemote: stageNativeStudioPublicPackageInSandbox,
  verifyRemote: verifyNativeStudioPublicPackageInSandbox,
  verifyBundle: verifyNativeStudioPublicWorkerBundleReceipt };
const fail = (): never => { throw Error('native_studio_public_detached_unverified'); };
function sandboxName(input: Input) {
  return `gnr8-public-deploy-${input.site.siteId}-${input.sourceId.slice(0, 12)}`;
}
function validate(input: Input) {
  if (!input || !input.scope || ![input.scope.agencyId,
        input.scope.clientId, input.scope.siteId].every(value => UUID.test(value)) ||
      input.site?.siteId !== input.scope.siteId ||
      !HEX32.test(input.site.accountId) || !SHA.test(input.sourceId) ||
      !COMMIT.test(input.commit) || !HEX32.test(input.studioWorkerId) ||
      !HEX32.test(input.publicWorkerId) ||
      !/^gnr8-first-[a-f0-9]{64}$/.test(input.studioTag) ||
      !SNAPSHOT.test(input.snapshotId) ||
      !EXECUTABLE.test(input.wranglerPath) ||
      input.wranglerPath.includes('..') ||
      !same(input.networkPolicy, { allow: ['api.cloudflare.com'] }) ||
      !Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 30 * 60_000 ||
      input.sandboxTimeoutMs > 90 * 60_000 ||
      !input.store || typeof input.store.read !== 'function' ||
      typeof input.store.claim !== 'function' ||
      typeof input.store.getBytes !== 'function' ||
      typeof input.loadCredential !== 'function' ||
      typeof input.prepareIntent !== 'function' ||
      typeof input.inspect !== 'function') fail();
}
function validSession(input: Input, value: unknown): value is Session {
  const item = value as Session;
  return !!item && item.sourceId === input.sourceId &&
    item.commit === input.commit && item.publicWorkerId === input.publicWorkerId &&
    same(item.scope, input.scope) && item.siteId === input.site.siteId &&
    item.accountId === input.site.accountId &&
    item.snapshotId === input.snapshotId &&
    item.sandboxName === sandboxName(input) && ID.test(item.sessionId) &&
    item.sandboxTimeoutMs === input.sandboxTimeoutMs &&
    SHA.test(item.manifestSha256) &&
    /^\.gnr8-public-[a-f0-9-]+\.json$/.test(item.config);
}
function attestation(input: Input, session: Session, sandbox: Sandbox) {
  return { siteId: input.site.siteId, accountId: input.site.accountId,
    sourceId: input.sourceId, snapshotId: input.snapshotId,
    sessionId: session.sessionId, networkPolicy: input.networkPolicy,
    sandboxTimeoutMs: input.sandboxTimeoutMs, sandbox };
}
async function exact(store: PublicationStore, key: string, value: unknown) {
  if (!await store.claim(key, value) || !same(await store.read(key), value))
    fail();
}
async function observe(input: Input, credential: string, tag: string): Promise<Result> {
  try {
    const result = await input.inspect(credential, tag);
    return { state: result.state === 'observed-control-plane' &&
        result.workerId === input.publicWorkerId ?
        'first-open-required' : 'pending-review',
      commit: input.commit, observation: result.state };
  } catch {
    return { state: 'pending-review', commit: input.commit,
      observation: 'readback-unavailable' };
  }
}

/** One durable, bounded step. The token is first loaded after the exact
 * public package has been rehashed in a fresh deploy Sandbox. */
export async function advanceNativeStudioDetachedPublicDeploy(input: Input,
  dependencies: Sdk = sdk, steps: typeof defaults = defaults): Promise<Result> {
  validate(input);
  const domain = new URL(input.site.studioOrigin).hostname;
  if (`https://${domain}` !== input.site.studioOrigin) fail();
  const identity = fingerprint({ scope: input.scope,
    accountId: input.site.accountId, sourceId: input.sourceId,
    commit: input.commit, publicWorkerId: input.publicWorkerId,
    studioTag: input.studioTag, domain, repository: input.site.repository });
  const attempt = { identity, commit: input.commit,
    publicWorkerId: input.publicWorkerId };
  const tag = `gnr8-public-first-${identity}`;
  const sandboxIntent = { sourceId: input.sourceId, commit: input.commit,
    publicWorkerId: input.publicWorkerId, siteId: input.site.siteId,
    snapshotId: input.snapshotId, sandboxName: sandboxName(input) };
  const existing = await input.store.read(SANDBOX_SESSION);
  if (!existing) {
    if (await input.store.read(SANDBOX_INTENT))
      return { state: 'pending-review', commit: input.commit };
    const bundle = await input.store.read(NATIVE_STUDIO_PUBLIC_WORKER_BUNDLE_RECEIPT) as
      NativeStudioWorkerBundleReceipt | null;
    if (!bundle) throw Error('native_studio_public_detached_bundle_missing');
    await steps.verifyBundle({ scope: input.scope, site: input.site,
      sourceId: input.sourceId, commit: input.commit,
      workerId: input.publicWorkerId, buildSnapshotId: bundle.buildSnapshotId,
      sandboxName: bundle.sandboxName, sessionId: bundle.sessionId,
      store: input.store });
    const staged = await steps.stageLocal({ artifactProject: input.artifactProject,
      store: input.store, scope: input.scope, site: input.site,
      sourceId: input.sourceId, commit: input.commit,
      studioWorkerId: input.studioWorkerId,
      publicWorkerId: input.publicWorkerId, bundleReceipt: bundle });
    try {
      const snapshot = await dependencies.snapshot.get({ snapshotId: input.snapshotId });
      if (snapshot.status !== 'created' ||
          snapshot.expiresAt && snapshot.expiresAt.getTime() <
            Date.now() + 2 * 60 * 60_000) fail();
      await exact(input.store, SANDBOX_INTENT, sandboxIntent);
      const sandbox = await dependencies.sandbox.create({ name: sandboxName(input),
        source: { type: 'snapshot', snapshotId: input.snapshotId },
        networkPolicy: input.networkPolicy, region: 'iad1', persistent: false,
        timeout: input.sandboxTimeoutMs, resources: { vcpus: 2 }, ports: [] });
      const sessionId = sandbox.currentSession().sessionId;
      if (!ID.test(sessionId)) fail();
      const provisional: Session = { ...sandboxIntent, scope: input.scope,
        accountId: input.site.accountId, sessionId,
        sandboxTimeoutMs: input.sandboxTimeoutMs,
        manifestSha256: '0'.repeat(64),
        config: '.gnr8-public-00000000-0000-4000-8000-000000000000.json' };
      const remote = await steps.stageRemote({ staged,
        ...attestation(input, provisional, sandbox) });
      const session: Session = { ...provisional,
        manifestSha256: remote.manifestSha256, config: remote.config };
      if (!validSession(input, session)) fail();
      await exact(input.store, SANDBOX_SESSION, session);
      return { state: 'running', commit: input.commit };
    } finally { await staged.cleanup(); }
  }
  if (!validSession(input, existing) ||
      !same(await input.store.read(SANDBOX_INTENT), sandboxIntent))
    return { state: 'pending-review', commit: input.commit };
  const session = existing;
  const prior = await input.store.read(ATTEMPT);
  let sandbox: Sandbox;
  try { sandbox = await dependencies.sandbox.get({ name: session.sandboxName,
    resume: false }); }
  catch {
    if (!same(prior, attempt))
      return { state: 'pending-review', commit: input.commit };
    const credential = await input.loadCredential();
    if (!TOKEN.test(credential)) fail();
    return observe(input, credential, tag);
  }
  if (sandbox.status !== 'running' && !prior)
    return { state: 'pending-review', commit: input.commit };
  if (sandbox.status === 'running')
    await steps.verifyRemote({ ...attestation(input, session, sandbox),
      manifestSha256: session.manifestSha256 });
  const credential = await input.loadCredential();
  if (!TOKEN.test(credential)) fail();
  if (prior) {
    if (!same(prior, attempt))
      return { state: 'pending-review', commit: input.commit };
    if (sandbox.status !== 'running') return observe(input, credential, tag);
    const started = await input.store.read(STARTED) as
      { attempt: typeof attempt; session: Session; cmdId: string } | null;
    if (!started || !same(started.attempt, attempt) ||
        !same(started.session, session) || !ID.test(started.cmdId))
      return observe(input, credential, tag);
    let command: { exitCode: number | null };
    try { command = await sandbox.currentSession().getCommand(started.cmdId); }
    catch { return observe(input, credential, tag); }
    if (command.exitCode === null)
      return { state: 'running', commit: input.commit };
    const result = await observe(input, credential, tag);
    try { await sandbox.stop(); } catch { /* Readback controls reconciliation. */ }
    return result;
  }
  const intent = await input.prepareIntent();
  if (intent.state !== 'prepared' || intent.commit !== input.commit ||
      intent.publicWorkerId !== input.publicWorkerId ||
      intent.studioTag !== input.studioTag ||
      !same(await input.store.read(PUBLIC_INTENT), attempt))
    return { state: 'pending-review', commit: input.commit };
  await steps.verifyRemote({ ...attestation(input, session, sandbox),
    manifestSha256: session.manifestSha256 });
  await exact(input.store, ATTEMPT, attempt);
  const running = await sandbox.currentSession().runCommand({
    cmd: input.wranglerPath,
    args: ['deploy', '--config', session.config, '--tag', tag],
    cwd: PUBLIC_PACKAGE, timeoutMs: 15 * 60_000, detached: true,
    env: { CI: '1', WRANGLER_SEND_METRICS: 'false',
      CLOUDFLARE_API_TOKEN: credential },
  });
  if (!ID.test(running.cmdId)) fail();
  await exact(input.store, STARTED, { attempt, session, cmdId: running.cmdId });
  return { state: 'running', commit: input.commit };
}
