import 'server-only';
import { Sandbox, Snapshot, type NetworkPolicy } from '@vercel/sandbox';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { stagePrebundledStudioDeploy } from '../../../../scripts/stacki/stage-prebundled-studio-deploy.mjs';
import { stageNativeStudioDeployPackageInSandbox,
  verifyNativeStudioDeployPackageInSandbox,
  NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT } from './native-studio-deploy-sandbox-stage';
import { verifyNativeStudioWorkerBundleReceipt,
  NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT,
  type NativeStudioWorkerBundleReceipt } from './native-studio-worker-bundle';
import type { PublicationStore } from './publication-store';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

const SANDBOX_INTENT = 'native-studio/first-deploy-sandbox-intent-v1.json';
const SANDBOX_SESSION = 'native-studio/first-deploy-sandbox-session-v1.json';
const INTENT = 'native-studio/first-deploy-intent-v1.json';
const ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
const STARTED = 'native-studio/first-deploy-command-started-v1.json';
const SECRETS = '/vercel/sandbox/gnr8-deploy-secrets.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const SECRET_NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Scope = { agencyId: string; clientId: string; siteId: string };
type Site = { siteId: string; accountId: string; repository: string;
  repositoryId: string; branch: string; studioOrigin: string };
type Credentials = { cloudflareCredential: string;
  secrets: NativeStudioRuntimeSecrets };
type Input = { scope: Scope; site: Site; store: PublicationStore;
  artifactProject: string; sourceId: string; commit: string;
  workerId: string; snapshotId: string; networkPolicy: NetworkPolicy;
  sandboxTimeoutMs: number; wranglerPath: string;
  loadCredentials: () => Promise<Credentials>;
  prepareIntent: (credentials: Credentials) => Promise<{
    state: 'prepared' | 'pending-review'; commit: string; tag: string }>;
  inspect: (credential: string, tag: string) => Promise<{
    state: string; workerId?: string }>;
};
type Session = { sourceId: string; commit: string; workerId: string;
  scope: Scope; siteId: string; accountId: string; snapshotId: string;
  sandboxName: string; sessionId: string; sandboxTimeoutMs: number;
  manifestSha256: string; config: string };
type Start = { attempt: { identity: string; commit: string };
  session: Session; cmdId: string };
type Result = { state: 'running' | 'pending-review' | 'reconcile-required';
  commit: string; observation?: string };
type Sdk = { sandbox: Pick<typeof Sandbox, 'create' | 'get'>;
  snapshot: Pick<typeof Snapshot, 'get'> };
const sdk: Sdk = { sandbox: Sandbox, snapshot: Snapshot };
const defaults = { stageLocal: stagePrebundledStudioDeploy,
  stageRemote: stageNativeStudioDeployPackageInSandbox,
  verifyRemote: verifyNativeStudioDeployPackageInSandbox,
  verifyBundle: verifyNativeStudioWorkerBundleReceipt };

function fail(): never { throw Error('native_studio_detached_deploy_unverified'); }
function sandboxName(input: Input) {
  return `gnr8-deploy-${input.site.siteId}-${input.sourceId.slice(0, 12)}`;
}
function validate(input: Input) {
  if (!input || !input.scope || ![input.scope.agencyId,
        input.scope.clientId, input.scope.siteId].every(value => UUID.test(value)) ||
      input.site?.siteId !== input.scope.siteId ||
      !HEX32.test(input.site.accountId) ||
      !SHA.test(input.sourceId) || !COMMIT.test(input.commit) ||
      !HEX32.test(input.workerId) || !SNAPSHOT.test(input.snapshotId) ||
      !EXECUTABLE.test(input.wranglerPath) ||
      input.wranglerPath.includes('..') ||
      !input.networkPolicy || !same(input.networkPolicy,
        { allow: ['api.cloudflare.com'] }) ||
      !Number.isSafeInteger(input.sandboxTimeoutMs) ||
      input.sandboxTimeoutMs < 30 * 60_000 ||
      input.sandboxTimeoutMs > 90 * 60_000 ||
      !input.store || typeof input.store.read !== 'function' ||
      typeof input.store.claim !== 'function' ||
      typeof input.store.getBytes !== 'function' ||
      typeof input.loadCredentials !== 'function' ||
      typeof input.prepareIntent !== 'function' ||
      typeof input.inspect !== 'function') fail();
}
function validSession(input: Input, value: unknown): value is Session {
  const item = value as Session;
  return !!item && item.sourceId === input.sourceId &&
    item.commit === input.commit && item.workerId === input.workerId &&
    same(item.scope, input.scope) && item.siteId === input.site.siteId &&
    item.accountId === input.site.accountId &&
    item.snapshotId === input.snapshotId &&
    item.sandboxName === sandboxName(input) && ID.test(item.sessionId) &&
    item.sandboxTimeoutMs === input.sandboxTimeoutMs &&
    SHA.test(item.manifestSha256) &&
    /^cloudflare\/\.gnr8-deploy-[a-f0-9-]+\.jsonc$/.test(item.config);
}
function attestation(input: Input, session: Session, sandbox: Sandbox) {
  return { siteId: input.site.siteId, accountId: input.site.accountId,
    sourceId: input.sourceId, snapshotId: input.snapshotId,
    sessionId: session.sessionId, networkPolicy: input.networkPolicy,
    sandboxTimeoutMs: input.sandboxTimeoutMs, sandbox };
}
function credentialsValid(value: Credentials) {
  return value && TOKEN.test(value.cloudflareCredential) &&
    value.secrets && typeof value.secrets === 'object' &&
    !Array.isArray(value.secrets) &&
    Object.keys(value.secrets).sort().join() === SECRET_NAMES.join() &&
    SECRET_NAMES.every(name => typeof value.secrets[name as keyof NativeStudioRuntimeSecrets] === 'string' &&
      value.secrets[name as keyof NativeStudioRuntimeSecrets].length >= 16);
}
async function observe(input: Input, credentials: Credentials, tag: string): Promise<Result> {
  try {
    const result = await input.inspect(credentials.cloudflareCredential, tag);
    return { state: result.state === 'verified-source-control-plane' &&
        result.workerId === input.workerId ? 'reconcile-required' : 'pending-review',
      commit: input.commit, observation: result.state };
  } catch {
    return { state: 'pending-review', commit: input.commit,
      observation: 'readback-unavailable' };
  }
}
async function claimExact(store: PublicationStore, key: string, value: unknown) {
  if (!await store.claim(key, value) ||
      !same(await store.read(key), value))
    throw Error('native_studio_detached_deploy_pending_review');
}

/** One bounded step per invocation. The exact package crosses into the
 * credentialed Sandbox before any token or Studio secret is loaded. */
export async function advanceNativeStudioDetachedDeploy(input: Input,
  dependencies: Sdk = sdk, steps: typeof defaults = defaults): Promise<Result> {
  validate(input);
  const existing = await input.store.read(SANDBOX_SESSION);
  const sandboxIntent = { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.site.siteId,
    snapshotId: input.snapshotId, sandboxName: sandboxName(input) };
  if (!existing) {
    // A lost Sandbox create or staging result is ambiguous. Never create a
    // second VM for the same release automatically.
    if (await input.store.read(SANDBOX_INTENT))
      return { state: 'pending-review', commit: input.commit };
    const bundle = await input.store.read(NATIVE_STUDIO_WORKER_BUNDLE_RECEIPT) as
      NativeStudioWorkerBundleReceipt | null;
    if (!bundle) fail();
    await steps.verifyBundle({ scope: input.scope, site: input.site,
      sourceId: input.sourceId, commit: input.commit,
      workerId: input.workerId, buildSnapshotId: bundle.buildSnapshotId,
      sandboxName: bundle.sandboxName, sessionId: bundle.sessionId,
      store: input.store });
    const staged = await steps.stageLocal({ artifactProject: input.artifactProject,
      store: input.store, sourceId: input.sourceId, commit: input.commit,
      workerId: input.workerId, site: input.site, scope: input.scope,
      bundleReceipt: bundle });
    try {
      const snapshot = await dependencies.snapshot.get({ snapshotId: input.snapshotId });
      if (snapshot.status !== 'created' ||
          snapshot.expiresAt && snapshot.expiresAt.getTime() <
            Date.now() + 2 * 60 * 60_000) fail();
      await claimExact(input.store, SANDBOX_INTENT, sandboxIntent);
      const sandbox = await dependencies.sandbox.create({ name: sandboxName(input),
        source: { type: 'snapshot', snapshotId: input.snapshotId },
        networkPolicy: input.networkPolicy, region: 'iad1', persistent: false,
        timeout: input.sandboxTimeoutMs, resources: { vcpus: 2 }, ports: [] });
      const sessionId = sandbox.currentSession().sessionId;
      if (!ID.test(sessionId)) fail();
      const provisional: Session = { ...sandboxIntent, scope: input.scope,
        accountId: input.site.accountId, sessionId,
        sandboxTimeoutMs: input.sandboxTimeoutMs, manifestSha256: '0'.repeat(64),
        config: 'cloudflare/.gnr8-deploy-00000000-0000-4000-8000-000000000000.jsonc' };
      const remote = await steps.stageRemote({ staged,
        ...attestation(input, provisional, sandbox) });
      const session: Session = { ...provisional,
        manifestSha256: remote.manifestSha256, config: remote.config };
      if (!validSession(input, session)) fail();
      await claimExact(input.store, SANDBOX_SESSION, session);
      return { state: 'running', commit: input.commit };
    } finally { await staged.cleanup(); }
  }
  if (!validSession(input, existing) ||
      !same(await input.store.read(SANDBOX_INTENT), sandboxIntent))
    return { state: 'pending-review', commit: input.commit };
  const session = existing;
  const existingAttempt = await input.store.read(ATTEMPT);
  let sandbox: Sandbox;
  try { sandbox = await dependencies.sandbox.get({ name: session.sandboxName,
    resume: false }); }
  catch {
    // An expired Sandbox cannot be resumed. After an exact deploy attempt,
    // only the tagged Cloudflare control-plane readback is safe.
    if (!existingAttempt)
      return { state: 'pending-review', commit: input.commit };
    const credentials = await input.loadCredentials();
    if (!credentialsValid(credentials)) fail();
    const { identity, tag } = firstStudioDeployIdentity({ scope: input.scope,
      accountId: input.site.accountId, workerId: input.workerId,
      sourceId: input.sourceId, site: input.site,
      token: credentials.cloudflareCredential,
      secrets: credentials.secrets, commit: input.commit });
    if (!same(existingAttempt, { identity, commit: input.commit }))
      return { state: 'pending-review', commit: input.commit };
    return observe(input, credentials, tag);
  }
  if (sandbox.status !== 'running' && !existingAttempt)
    return { state: 'pending-review', commit: input.commit };
  if (sandbox.status === 'running')
    await steps.verifyRemote({ ...attestation(input, session, sandbox),
      manifestSha256: session.manifestSha256 });
  const credentials = await input.loadCredentials();
  if (!credentialsValid(credentials)) fail();
  const { identity, tag } = firstStudioDeployIdentity({ scope: input.scope,
    accountId: input.site.accountId, workerId: input.workerId,
    sourceId: input.sourceId, site: input.site,
    token: credentials.cloudflareCredential,
    secrets: credentials.secrets, commit: input.commit });
  const attempt = { identity, commit: input.commit };
  const prior = existingAttempt;
  if (prior) {
    if (!same(prior, attempt))
      return { state: 'pending-review', commit: input.commit };
    if (sandbox.status !== 'running')
      return observe(input, credentials, tag);
    const started = await input.store.read(STARTED) as Start | null;
    if (!started || !same(started.attempt, attempt) ||
        !same(started.session, session) || !ID.test(started.cmdId))
      return observe(input, credentials, tag);
    let command: { exitCode: number | null };
    try { command = await sandbox.currentSession().getCommand(started.cmdId); }
    catch { return observe(input, credentials, tag); }
    if (command.exitCode === null)
      return { state: 'running', commit: input.commit };
    const observed = await observe(input, credentials, tag);
    try { await sandbox.stop(); }
    catch { /* A later readback can reconcile an ambiguous cleanup. */ }
    return observed;
  }
  const intent = await input.prepareIntent(credentials);
  if (intent.commit !== input.commit || intent.tag !== tag ||
      !['prepared', 'pending-review'].includes(intent.state) ||
      !same(await input.store.read(INTENT), attempt))
    return { state: 'pending-review', commit: input.commit };
  // The intent preparer rechecks GitHub head, Cloudflare vacancy and site on
  // every call. An exact prior intent can therefore resume before ATTEMPT.
  // A pre-existing secret file in the trusted snapshot is never overwritten.
  const absent = await sandbox.runCommand({ cmd: 'node',
    args: ['--input-type=module', '-e',
      `import{lstat}from'node:fs/promises';try{await lstat(${JSON.stringify(SECRETS)});process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}`],
    timeoutMs: 10_000, env: { CI: '1' } });
  if (absent.exitCode !== 0) fail();
  await sandbox.writeFiles([{ path: SECRETS,
    content: Buffer.from(JSON.stringify(credentials.secrets)) }]);
  await steps.verifyRemote({ ...attestation(input, session, sandbox),
    manifestSha256: session.manifestSha256 });
  await claimExact(input.store, ATTEMPT, attempt);
  const running = await sandbox.currentSession().runCommand({
    cmd: input.wranglerPath,
    args: ['deploy', '--config', session.config, '--tag', tag,
      '--secrets-file', SECRETS],
    cwd: `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio`,
    timeoutMs: 15 * 60_000, detached: true,
    env: { CI: '1', WRANGLER_SEND_METRICS: 'false',
      CLOUDFLARE_API_TOKEN: credentials.cloudflareCredential },
  });
  if (!ID.test(running.cmdId)) fail();
  await claimExact(input.store, STARTED, { attempt, session,
    cmdId: running.cmdId });
  return { state: 'running', commit: input.commit };
}
