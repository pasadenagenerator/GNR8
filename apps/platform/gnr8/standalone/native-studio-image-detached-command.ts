import 'server-only';
import { createHash } from 'node:crypto';
import { Sandbox } from '@vercel/sandbox';

const SOURCE = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const WORKER = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const NAME = /^[a-z0-9][a-z0-9-]{1,127}$/;
const PHASES = ['build', 'preflight', 'public-preflight', 'save', 'load', 'push'] as const;
type Phase = typeof PHASES[number];
type Store = { read: (key: string) => Promise<unknown>;
  claim: (key: string, value: unknown) => Promise<boolean> };
type Identity = { sourceId: string; commit: string; workerId: string;
  siteId: string; driveName: string; sandboxName: string;
  phase: Phase; store: Store };
type Command = { cmd: string; args: string[]; cwd?: string;
  env?: Record<string, string>; timeoutMs: number };
type Intent = { sourceId: string; commit: string; workerId: string;
  siteId: string; driveName: string; sandboxName: string;
  phase: Phase; sessionId: string; commandSha256: string };
type Started = { intent: Intent; cmdId: string };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function keys(phase: Phase) {
  return { intent: `native-studio/image-${phase}-command-intent-v1.json`,
    started: `native-studio/image-${phase}-command-started-v1.json` };
}

function validate(input: Identity) {
  if (!input || !SOURCE.test(input.sourceId) || !COMMIT.test(input.commit) ||
      !WORKER.test(input.workerId) || !UUID.test(input.siteId) ||
      !NAME.test(input.driveName) || !NAME.test(input.sandboxName) ||
      !PHASES.includes(input.phase) || !input.store ||
      typeof input.store.read !== 'function' ||
      typeof input.store.claim !== 'function')
    throw Error('native_studio_image_command_input_invalid');
}

function common(input: Identity) {
  return { sourceId: input.sourceId, commit: input.commit,
    workerId: input.workerId, siteId: input.siteId,
    driveName: input.driveName, sandboxName: input.sandboxName,
    phase: input.phase };
}

/** Claim before starting a command. If the start or the following CAS becomes
 * ambiguous, the intent remains for review and no automatic retry can start. */
export async function startNativeStudioImageCommand(input: Identity & {
  sandbox: Pick<Sandbox, 'name' | 'status' | 'currentSession'>;
  command: Command;
}): Promise<Started> {
  validate(input);
  const { sandbox, command } = input;
  if (!sandbox || sandbox.name !== input.sandboxName ||
      sandbox.status !== 'running' || !command ||
      typeof command.cmd !== 'string' || !command.cmd ||
      !Array.isArray(command.args) ||
      !command.args.every(value => typeof value === 'string') ||
      !Number.isSafeInteger(command.timeoutMs) ||
      command.timeoutMs < 1 || command.timeoutMs > 20 * 60_000)
    throw Error('native_studio_image_command_input_invalid');
  const session = sandbox.currentSession();
  const sessionId = session.sessionId;
  if (!ID.test(sessionId))
    throw Error('native_studio_image_command_session_unverified');
  const commandSha256 = createHash('sha256').update(JSON.stringify({
    cmd: command.cmd, args: command.args, cwd: command.cwd ?? null,
    timeoutMs: command.timeoutMs,
  })).digest('hex');
  const intent: Intent = { ...common(input), sessionId, commandSha256 };
  const key = keys(input.phase);
  if (await input.store.read(key.intent))
    throw Error('native_studio_image_command_pending_review');
  if (!await input.store.claim(key.intent, intent) ||
      !same(await input.store.read(key.intent), intent))
    throw Error('native_studio_image_command_pending_review');
  const running = await session.runCommand({ ...command, detached: true });
  if (!ID.test(running.cmdId) ||
      sandbox.status !== 'running' ||
      sandbox.currentSession().sessionId !== sessionId)
    throw Error('native_studio_image_command_session_unverified');
  const started: Started = { intent, cmdId: running.cmdId };
  if (!await input.store.claim(key.started, started) ||
      !same(await input.store.read(key.started), started))
    throw Error('native_studio_image_command_pending_review');
  return started;
}

/** Bounded, read-only poll. Never resume a stopped Sandbox or rerun a command. */
export async function pollNativeStudioImageCommand(input: Identity,
  sdk: Pick<typeof Sandbox, 'get'> = Sandbox): Promise<{
    state: 'running' | 'succeeded' | 'pending-review';
    exitCode?: number }>
{
  validate(input);
  const key = keys(input.phase);
  const [intent, started] = await Promise.all([
    input.store.read(key.intent) as Promise<Intent | null>,
    input.store.read(key.started) as Promise<Started | null>,
  ]);
  if (!intent || !started || !same(started.intent, intent) ||
      !same(Object.fromEntries(Object.entries(intent).filter(([name]) =>
        !['sessionId', 'commandSha256'].includes(name))), common(input)) ||
      !ID.test(intent.sessionId) || !SOURCE.test(intent.commandSha256) ||
      !ID.test(started.cmdId))
    return { state: 'pending-review' };
  const sandbox = await sdk.get({ name: input.sandboxName, resume: false });
  if (sandbox.name !== input.sandboxName || sandbox.status !== 'running' ||
      sandbox.currentSession().sessionId !== intent.sessionId)
    return { state: 'pending-review' };
  const command = await sandbox.currentSession().getCommand(started.cmdId);
  if (sandbox.status !== 'running' ||
      sandbox.currentSession().sessionId !== intent.sessionId)
    return { state: 'pending-review' };
  if (command.exitCode === null) return { state: 'running' };
  if (command.exitCode === 0) return { state: 'succeeded', exitCode: 0 };
  return { state: 'pending-review', exitCode: command.exitCode };
}
