import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Sandbox } from '@vercel/sandbox';
import { nativeStudioBuildManifestScript } from './native-studio-sandbox-build';

const ROOT = '/vercel/sandbox/gnr8-native-build';
const MANIFEST = '/vercel/sandbox/gnr8-native-build-manifest.json';
const ATTEMPT = 'native-studio/source-build-attempt-v1.json';
const SESSION = 'native-studio/source-build-session-v1.json';
const COMPLETE = 'native-studio/source-build-complete-v1.json';
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const TIMEOUT = 60 * 60_000;
const RETENTION = 7 * 24 * 60 * 60_000;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const phases = ['install-root', 'install-studio', 'build-root',
  'build-studio', 'scan'] as const;
type Phase = typeof phases[number];
type File = { path: string; body: Buffer };
type Output = { path: string; bytes: number; sha256: string };
type Store = { read: (key: string) => Promise<unknown>;
  claim: (key: string, value: unknown) => Promise<boolean> };
export type NativeStudioDetachedSourceBuildInput = {
  siteId: string; sourceId: string; snapshotId: string; files: File[];
  store: Store;
};
type Attempt = { siteId: string; sourceId: string; snapshotId: string;
  inputSha256: string; sandboxName: string };
type Session = Attempt & { sessionId: string };
type Complete = { session: Session; files: Output[];
  manifestSha256: string };
type Intent = Session & { phase: Phase; commandSha256: string };
type Started = { intent: Intent; cmdId: string };
export type NativeStudioDetachedSourceBuildResult =
  | { state: 'running' | 'pending-review' }
  | { state: 'complete'; artifactDir: string; files: Output[]; sourceId: string };
type Sdk = Pick<typeof Sandbox, 'create' | 'get'>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const hash = (value: Buffer | string) =>
  createHash('sha256').update(value).digest('hex');

function safePath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length <= 300 &&
    !path.includes('\\') && !path.includes('\0') && !path.startsWith('/') &&
    path.split('/').every(part => part && part !== '.' && part !== '..' &&
      part !== '.git' && part !== 'node_modules');
}

function describe(input: NativeStudioDetachedSourceBuildInput): Attempt {
  if (!input || !UUID.test(input.siteId) || !SHA.test(input.sourceId) ||
      !SNAPSHOT.test(input.snapshotId) || !input.store ||
      typeof input.store.read !== 'function' ||
      typeof input.store.claim !== 'function' ||
      !Array.isArray(input.files) || input.files.length < 1 ||
      input.files.length > MAX_FILES)
    throw Error('native_studio_detached_source_input_invalid');
  const seen = new Set<string>();
  const fingerprint = createHash('sha256');
  let total = 0;
  for (const file of input.files) {
    if (!file || !safePath(file.path) || !Buffer.isBuffer(file.body) ||
        file.body.length > MAX_FILE_BYTES || seen.has(file.path))
      throw Error('native_studio_detached_source_input_invalid');
    seen.add(file.path);
    total += file.body.length;
    if (total > MAX_TOTAL_BYTES)
      throw Error('native_studio_detached_source_input_invalid');
    fingerprint.update(JSON.stringify([file.path, file.body.length,
      hash(file.body)]));
  }
  return { siteId: input.siteId, sourceId: input.sourceId,
    snapshotId: input.snapshotId, inputSha256: fingerprint.digest('hex'),
    sandboxName: `gnr8-source-build-${hash(`${input.siteId}:${input.sourceId}`).slice(0,32)}` };
}

function networkPolicy() {
  return { allow: { 'registry.npmjs.org': [
    { match: { method: ['GET', 'HEAD'] }, transform: [] },
    { response: { statusCode: 403 } },
  ] } };
}

function attested(sandbox: Sandbox, session: Session): boolean {
  return sandbox.name === session.sandboxName &&
    sandbox.status === 'running' &&
    sandbox.currentSession().sessionId === session.sessionId &&
    sandbox.sourceSnapshotId === session.snapshotId &&
    sandbox.region === 'iad1' && sandbox.persistent === true &&
    sandbox.timeout === TIMEOUT &&
    same(sandbox.networkPolicy, networkPolicy()) &&
    sandbox.expiresAt instanceof Date &&
    sandbox.expiresAt.getTime() > Date.now();
}

function requireTime(sandbox: Sandbox, minimumMs: number) {
  if (!(sandbox.expiresAt instanceof Date) ||
      sandbox.expiresAt.getTime() - Date.now() < minimumMs)
    throw Error('native_studio_detached_source_time_insufficient');
}

async function claimExact(store: Store, key: string, value: unknown) {
  if (!await store.claim(key, value) ||
      !same(await store.read(key), value))
    throw Error('native_studio_detached_source_pending_review');
}

async function readBounded(sandbox: Sandbox, path: string,
  limit: number): Promise<Buffer> {
  const stream = await sandbox.readFile({ path },
    { signal: AbortSignal.timeout(30_000) });
  if (!stream) throw Error('native_studio_detached_source_output_missing');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const bytes = Buffer.from(chunk);
    size += bytes.length;
    if (size > limit)
      throw Error('native_studio_detached_source_output_limit');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

async function verifySource(sandbox: Sandbox, files: File[]) {
  for (const file of files) {
    const current = await readBounded(sandbox, `${ROOT}/${file.path}`,
      file.body.length);
    if (!current.equals(file.body))
      throw Error('native_studio_detached_source_changed');
  }
}

function outputs(value: unknown): Output[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_FILES)
    throw Error('native_studio_detached_source_manifest_invalid');
  const seen = new Set<string>();
  let total = 0;
  const files: Output[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw Error('native_studio_detached_source_manifest_invalid');
    const file = entry as Record<string, unknown>;
    if (typeof file.path !== 'string' || !safePath(file.path) ||
        !(file.path.startsWith('dist/') || file.path.startsWith('studio/dist/')) ||
        !Number.isSafeInteger(file.bytes) || Number(file.bytes) < 0 ||
        Number(file.bytes) > MAX_FILE_BYTES ||
        typeof file.sha256 !== 'string' || !SHA.test(file.sha256) ||
        seen.has(file.path))
      throw Error('native_studio_detached_source_manifest_invalid');
    seen.add(file.path);
    total += Number(file.bytes);
    if (total > MAX_TOTAL_BYTES)
      throw Error('native_studio_detached_source_manifest_invalid');
    files.push({ path: file.path, bytes: Number(file.bytes),
      sha256: file.sha256 });
  }
  if (!files.some(file => file.path.startsWith('dist/')) ||
      !files.some(file => file.path.startsWith('studio/dist/')))
    throw Error('native_studio_detached_source_manifest_invalid');
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function command(phase: Phase) {
  if (phase === 'scan') return { cmd: 'node',
    args: ['--input-type=module', '-e',
      nativeStudioBuildManifestScript(ROOT, MANIFEST)],
    cwd: ROOT, env: { CI: '1' }, timeoutMs: 60_000 };
  return { cmd: 'npm',
    args: phase.startsWith('install')
      ? ['ci', '--no-audit', '--no-fund'] : ['run', 'build'],
    cwd: phase.endsWith('studio') ? `${ROOT}/studio` : ROOT,
    env: { CI: '1' }, timeoutMs: 10 * 60_000 };
}

function keys(phase: Phase) {
  return { intent: `native-studio/source-build-${phase}-intent-v1.json`,
    started: `native-studio/source-build-${phase}-started-v1.json` };
}

async function start(input: NativeStudioDetachedSourceBuildInput,
  session: Session, phase: Phase, sandbox: Sandbox) {
  const identity = { ...session, phase,
    commandSha256: hash(JSON.stringify(command(phase))) };
  const key = keys(phase);
  if (await input.store.read(key.intent))
    throw Error('native_studio_detached_source_pending_review');
  await claimExact(input.store, key.intent, identity);
  const run = await sandbox.currentSession().runCommand({
    ...command(phase), detached: true });
  if (!ID.test(run.cmdId) || !attested(sandbox, session))
    throw Error('native_studio_detached_source_pending_review');
  await claimExact(input.store, key.started,
    { intent: identity, cmdId: run.cmdId });
}

async function poll(input: NativeStudioDetachedSourceBuildInput,
  session: Session, phase: Phase, sandbox: Sandbox): Promise<'running' | 'succeeded' | 'pending-review'> {
  const key = keys(phase);
  const intent = await input.store.read(key.intent) as Intent | null;
  const started = await input.store.read(key.started) as Started | null;
  if (!same(intent, { ...session, phase,
    commandSha256: hash(JSON.stringify(command(phase))) }) ||
      !started || !same(started.intent, intent) || !ID.test(started.cmdId))
    return 'pending-review';
  const result = await sandbox.currentSession().getCommand(started.cmdId);
  if (!attested(sandbox, session)) return 'pending-review';
  if (result.exitCode === null) return 'running';
  return result.exitCode === 0 ? 'succeeded' : 'pending-review';
}

async function extract(input: NativeStudioDetachedSourceBuildInput,
  session: Session, sandbox: Sandbox,
  completed?: Complete): Promise<NativeStudioDetachedSourceBuildResult> {
  await verifySource(sandbox, input.files);
  const manifest = await readBounded(sandbox, MANIFEST, 8 * 1024 * 1024);
  const listed = outputs(JSON.parse(manifest.toString()));
  const proof: Complete = { session, files: listed,
    manifestSha256: hash(manifest) };
  if (completed && !same(completed, proof))
    throw Error('native_studio_detached_source_output_changed');
  const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-native-build-artifact-'));
  try {
    for (const file of listed) {
      const body = await readBounded(sandbox, `${ROOT}/${file.path}`,
        file.bytes);
      if (body.length !== file.bytes || hash(body) !== file.sha256)
        throw Error('native_studio_detached_source_output_changed');
      const path = join(artifactDir, file.path);
      await mkdir(dirname(path), { recursive: true });
      const handle = await open(path, 'wx', 0o600);
      try { await handle.writeFile(body); }
      finally { await handle.close(); }
    }
    if (!completed) await claimExact(input.store, COMPLETE, proof);
    await sandbox.stop();
    return { state: 'complete', artifactDir, files: listed,
      sourceId: input.sourceId };
  } catch (error) {
    await rm(artifactDir, { recursive: true, force: true });
    throw error;
  }
}

/** One long npm command begins per invocation. An ambiguous create or command
 * start leaves a durable intent and cannot start another Sandbox or command. */
export async function advanceNativeStudioDetachedSourceBuild(
  input: NativeStudioDetachedSourceBuildInput, sdk: Sdk = Sandbox):
  Promise<NativeStudioDetachedSourceBuildResult> {
  const expected = describe(input);
  const completed = await input.store.read(COMPLETE) as Complete | null;
  if (completed) {
    if (!same(completed.session && Object.fromEntries(
      Object.entries(completed.session).filter(([key]) => key !== 'sessionId')),
      expected) || !ID.test(completed.session.sessionId) ||
      !SHA.test(completed.manifestSha256) ||
      !Array.isArray(completed.files))
      return { state: 'pending-review' };
    const sandbox = await sdk.get({ name: expected.sandboxName,
      resume: true });
    if (sandbox.name !== expected.sandboxName ||
        sandbox.status !== 'running' || sandbox.persistent !== true ||
        sandbox.region !== 'iad1' || sandbox.timeout !== TIMEOUT ||
        !same(sandbox.networkPolicy, networkPolicy()))
      return { state: 'pending-review' };
    return extract(input, completed.session, sandbox, completed);
  }
  const prior = await input.store.read(ATTEMPT);
  if (prior && !same(prior, expected))
    return { state: 'pending-review' };
  if (!prior) {
    await claimExact(input.store, ATTEMPT, expected);
    const sandbox = await sdk.create({ name: expected.sandboxName,
      source: { type: 'snapshot', snapshotId: input.snapshotId },
      persistent: true, timeout: TIMEOUT, resources: { vcpus: 2 },
      snapshotExpiration: RETENTION,
      keepLastSnapshots: { count: 1, expiration: RETENTION },
      ports: [], region: 'iad1', networkPolicy: networkPolicy() });
    const sessionId = sandbox.currentSession().sessionId;
    const session: Session = { ...expected, sessionId };
    if (!ID.test(sessionId) || !attested(sandbox, session))
      return { state: 'pending-review' };
    const version = await sandbox.runCommand({ cmd: 'node',
      args: ['--version'], timeoutMs: 30_000 });
    if (version.exitCode !== 0 || (await version.stdout()).trim() !== 'v26.13.0')
      throw Error('native_studio_detached_source_toolchain_mismatch');
    const clean = await sandbox.runCommand({ cmd: 'node',
      args: ['--input-type=module', '-e',
        `import{lstat}from'node:fs/promises';for(const p of ${JSON.stringify([ROOT, MANIFEST])}){try{await lstat(p);process.exit(2)}catch(e){if(e.code!=='ENOENT')throw e}}`],
      timeoutMs: 30_000 });
    if (clean.exitCode !== 0)
      throw Error('native_studio_detached_source_snapshot_dirty');
    await sandbox.writeFiles(input.files.map(file => ({
      path: `${ROOT}/${file.path}`, content: file.body })));
    await verifySource(sandbox, input.files);
    await claimExact(input.store, SESSION, session);
    requireTime(sandbox, 45 * 60_000);
    await start(input, session, phases[0], sandbox);
    return { state: 'running' };
  }
  const session = await input.store.read(SESSION) as Session | null;
  if (!session || !same({ siteId: session.siteId,
    sourceId: session.sourceId, snapshotId: session.snapshotId,
    inputSha256: session.inputSha256, sandboxName: session.sandboxName },
  expected) || !ID.test(session.sessionId))
    return { state: 'pending-review' };
  const sandbox = await sdk.get({ name: session.sandboxName, resume: false });
  if (!attested(sandbox, session)) return { state: 'pending-review' };
  for (let index = 0; index < phases.length; index++) {
    const phase = phases[index];
    const key = keys(phase);
    if (!await input.store.read(key.intent)) {
      if (index === 0) return { state: 'pending-review' };
      await verifySource(sandbox, input.files);
      requireTime(sandbox, (phases.length - index) * 11 * 60_000);
      await start(input, session, phase, sandbox);
      return { state: 'running' };
    }
    const state = await poll(input, session, phase, sandbox);
    if (state !== 'succeeded') return { state };
  }
  return extract(input, session, sandbox);
}
