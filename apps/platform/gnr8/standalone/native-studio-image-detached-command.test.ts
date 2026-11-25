import assert from 'node:assert/strict';
import test from 'node:test';
import { pollNativeStudioImageCommand,
  startNativeStudioImageCommand } from './native-studio-image-detached-command';

const base = { sourceId: 'a'.repeat(64), commit: 'b'.repeat(40),
  workerId: 'c'.repeat(32),
  siteId: '33333333-3333-4333-8333-333333333333',
  driveName: 'gnr8-img-scoped', sandboxName: 'gnr8-image-build',
  phase: 'build' as const };

function fixture() {
  const events: string[] = [];
  const records = new Map<string, unknown>();
  let sessionId = 'sess_123';
  let status = 'running';
  let exitCode: number | null = null;
  let startedAt = Date.now();
  let killFails = false;
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      events.push(`claim:${key}`);
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  const session = {
    get sessionId() { return sessionId; },
    runCommand: async (value: any) => {
      events.push('run'); assert.equal(value.detached, true);
      return { cmdId: 'cmd_123' };
    },
    getCommand: async (id: string) => {
      events.push('get-command'); assert.equal(id, 'cmd_123');
      return { exitCode, startedAt,
        kill: async (signal: string) => {
          events.push(`kill:${signal}`);
          if (killFails) throw Error('command not found');
          exitCode = 137;
        } };
    },
  };
  const sandbox = { name: base.sandboxName,
    get status() { return status; },
    currentSession: () => session,
  };
  const sdk = { get: async ({ name, resume }: any) => {
    events.push('get-sandbox'); assert.equal(name, base.sandboxName);
    assert.equal(resume, false); return sandbox;
  } } as any;
  return { events, records, sandbox, sdk, store,
    setSession: (value: string) => { sessionId = value; },
    setStatus: (value: string) => { status = value; },
    setExit: (value: number | null) => { exitCode = value; },
    setStartedAt: (value: number) => { startedAt = value; },
    setKillFails: (value: boolean) => { killFails = value; } };
}

test('claim precedes detached start; later polls never start another command', async () => {
  const f = fixture();
  const input = { ...base, store: f.store };
  const started = await startNativeStudioImageCommand({ ...input,
    sandbox: f.sandbox as any,
    command: { cmd: 'docker', args: ['build', '.'], timeoutMs: 20 * 60_000,
      env: { CI: '1' } },
  });
  assert.equal(started.cmdId, 'cmd_123');
  assert.equal(f.events.indexOf('run') > f.events.indexOf(
    'claim:native-studio/image-build-command-intent-v1.json'), true);
  assert.equal(JSON.stringify([...f.records.values()]).includes('"CI"'), false);
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'running' });
  f.setExit(0);
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'succeeded', exitCode: 0 });
  f.setExit(1);
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review', exitCode: 1 });
  await assert.rejects(startNativeStudioImageCommand({ ...input,
    sandbox: f.sandbox as any,
    command: { cmd: 'docker', args: ['build', '.'], timeoutMs: 60_000 },
  }), /pending_review/);
  assert.equal(f.events.filter(event => event === 'run').length, 1);
});

test('stopped or replaced session is never resumed by the poller', async () => {
  const f = fixture();
  const input = { ...base, store: f.store };
  await startNativeStudioImageCommand({ ...input, sandbox: f.sandbox as any,
    command: { cmd: 'docker', args: ['save'], timeoutMs: 60_000 } });
  f.setStatus('stopped');
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review' });
  assert.equal(f.events.includes('get-command'), false);
  f.setStatus('running'); f.setSession('sess_foreign');
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review' });
  assert.equal(f.events.includes('get-command'), false);
});

test('expired detached command is killed once and never restarted', async () => {
  const f = fixture();
  const input = { ...base, store: f.store };
  await startNativeStudioImageCommand({ ...input, sandbox: f.sandbox as any,
    command: { cmd: 'docker', args: ['build', '.'],
      timeoutMs: 20 * 60_000 } });
  f.setStartedAt(Date.now() - 21 * 60_000);
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review', reason: 'command-timeout' });
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review', exitCode: 137 });
  assert.equal(f.events.filter(event => event === 'kill:SIGKILL').length, 1);
  assert.equal(f.events.filter(event => event === 'run').length, 1);
});

test('unverified command timestamp never triggers a kill', async () => {
  const f = fixture();
  const input = { ...base, store: f.store };
  await startNativeStudioImageCommand({ ...input, sandbox: f.sandbox as any,
    command: { cmd: 'docker', args: ['build', '.'],
      timeoutMs: 20 * 60_000 } });
  f.setStartedAt(Math.floor(Date.now() / 1000));
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review' });
  assert.equal(f.events.some(event => event.startsWith('kill:')), false);
});

test('lost provider command still ends in review without a retry', async () => {
  const f = fixture();
  const input = { ...base, store: f.store };
  await startNativeStudioImageCommand({ ...input, sandbox: f.sandbox as any,
    command: { cmd: 'docker', args: ['build', '.'],
      timeoutMs: 20 * 60_000 } });
  f.setStartedAt(Date.now() - 21 * 60_000);
  f.setKillFails(true);
  assert.deepEqual(await pollNativeStudioImageCommand(input, f.sdk),
    { state: 'pending-review', reason: 'command-timeout' });
  assert.equal(f.events.filter(event => event === 'run').length, 1);
});

test('ambiguous start leaves a private intent and cannot retry', async () => {
  const f = fixture();
  const input = { ...base, store: f.store };
  const session = f.sandbox.currentSession();
  const sandbox = { ...f.sandbox,
    currentSession: () => ({ ...session,
      runCommand: async () => { f.events.push('run');
        throw Error('connection lost'); } }) };
  await assert.rejects(startNativeStudioImageCommand({ ...input,
    sandbox: sandbox as any,
    command: { cmd: 'docker', args: ['build'], timeoutMs: 60_000 },
  }), /connection lost/);
  assert.equal(f.records.has('native-studio/image-build-command-intent-v1.json'), true);
  await assert.rejects(startNativeStudioImageCommand({ ...input,
    sandbox: sandbox as any,
    command: { cmd: 'docker', args: ['build'], timeoutMs: 60_000 },
  }), /pending_review/);
  assert.equal(f.events.filter(event => event === 'run').length, 1);
});
