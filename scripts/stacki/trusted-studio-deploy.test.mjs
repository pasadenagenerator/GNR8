import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { runTrustedStudioDeploy } from './trusted-studio-deploy.mjs';

const tag = `gnr8-first-${'a'.repeat(64)}`;
const token = 'b'.repeat(40);
const secrets = { AI_API_KEY: 'a'.repeat(32), CONTAINER_TOKEN: 'b'.repeat(32),
  GITHUB_CLIENT_SECRET: 'c'.repeat(32), GITHUB_PRIVATE_KEY: 'd'.repeat(32),
  PUBLISH_CLOUDFLARE_API_TOKEN: 'e'.repeat(40), SESSION_SECRET: 'f'.repeat(32) };
const root = await mkdtemp(join(tmpdir(), 'gnr8-trusted-deploy-test-'));
await mkdir(join(root, 'studio'));
after(async () => rm(root, { recursive: true, force: true }));
const input = { file: process.execPath, cwd: join(root, 'studio'), token, secrets,
  args: ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag', tag] };

test('dedicated deploy receives only the exact command and a temporary private secret file', async () => {
  let secretFile;
  await runTrustedStudioDeploy(input, async (file, args, options) => {
    secretFile = args.at(-1);
    assert.equal(file, process.execPath);
    assert.deepEqual(args.slice(0, -2), input.args);
    assert.equal(args.at(-2), '--secrets-file');
    assert.deepEqual(JSON.parse(await readFile(secretFile, 'utf8')), secrets);
    assert.equal((await stat(secretFile)).mode & 0o777, 0o600);
    assert.equal(options.shell, false);
    assert.equal(options.env.CLOUDFLARE_API_TOKEN, token);
    assert.equal(options.env.GNR8_TEST_AMBIENT_SECRET, undefined);
  });
  await assert.rejects(readFile(secretFile), { code: 'ENOENT' });
});

test('refuses altered deploy arguments before invoking a process', async () => {
  let calls = 0;
  const invoke = async () => { calls++; };
  await assert.rejects(runTrustedStudioDeploy({ ...input,
    args: [...input.args, '--name', 'foreign-worker'] }, invoke), /input_invalid/);
  await assert.rejects(runTrustedStudioDeploy({ ...input,
    secrets: { ...secrets, EXTRA: 'wrong' } }, invoke), /input_invalid/);
  assert.equal(calls, 0);
});

test('refuses a site-owned executable before invoking a process', async () => {
  const local = join(root, 'studio', 'wrangler');
  await writeFile(local, 'untrusted');
  let calls = 0;
  await assert.rejects(runTrustedStudioDeploy({ ...input, file: local },
    async () => { calls++; }), /executable_invalid/);
  assert.equal(calls, 0);
});

test('provider failures are sanitized and the secret file is removed', async () => {
  let secretFile;
  await assert.rejects(runTrustedStudioDeploy(input, async (_file, args) => {
    secretFile = args.at(-1);
    throw Error('sensitive provider output');
  }), error => error instanceof Error && error.message === 'native_studio_trusted_deploy_failed');
  await assert.rejects(readFile(secretFile), { code: 'ENOENT' });
});
