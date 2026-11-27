import assert from 'node:assert/strict';
import test from 'node:test';
import { pushNativeStudioDriveImage } from './native-studio-drive-image-push';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const receipt = { sourceId: 'a'.repeat(64), commit: 'b'.repeat(40),
  workerId: 'c'.repeat(32), scope,
  siteId: scope.siteId, accountId: 'd'.repeat(32),
  archive: { bytes: 17, sha256: 'e'.repeat(64) } };
const archiveKey = 'native-studio/image-archive-v1.json';
const attemptKey = 'native-studio/image-push-attempt-v1.json';
const prebuiltKey = 'native-studio/prebuilt-image-v1.json';
const token = 'f'.repeat(48);

function fixture(failPush = false, dirtySnapshot = false) {
  const records = new Map<string, unknown>([[archiveKey, receipt]]);
  const events: string[] = [];
  const commands: { cmd: string; args: string[]; env?: Record<string, string> }[] = [];
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: unknown) => {
      events.push(`claim:${key}`);
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  const sandbox = {
    writeFiles: async () => { events.push('config'); },
    runCommand: async (call: { cmd: string; args: string[]; env?: Record<string, string> }) => {
      commands.push(call); events.push(call.args[0] ?? call.cmd);
      if (call.cmd.endsWith('/wrangler') && failPush)
        return { exitCode: 1, stdout: async () => 'secret-bearing error' };
      if (call.cmd === 'node' && dirtySnapshot)
        return { exitCode: 2, stdout: async () => '' };
      if (call.args[0] === 'image' && call.args[3] === '{{.Os}}/{{.Architecture}}')
        return { exitCode: 0, stdout: async () => 'linux/amd64' };
      if (call.args[0] === 'image')
        return { exitCode: 0, stdout: async () => JSON.stringify([
          `registry.cloudflare.com/${receipt.accountId}/gnr8-${receipt.siteId}-studio@sha256:${'1'.repeat(64)}`]) };
      return { exitCode: 0, stdout: async () => '' };
    },
  };
  const input = { archivePath: '/gnr8-image/image.tar', receipt,
    store, cloudflareCredential: token, dockerPath: '/usr/bin/docker',
    wranglerPath: '/usr/local/bin/wrangler',
    site: { siteId: receipt.siteId, accountId: receipt.accountId } };
  return { records, events, commands, sandbox, input };
}

test('receiver claims one attempt and gives token only to Wrangler push', async () => {
  const f = fixture();
  const pushed = await pushNativeStudioDriveImage(f.sandbox as any, f.input);
  assert.equal(pushed.digest, '1'.repeat(64));
  assert.equal(f.records.has(prebuiltKey), true);
  assert.deepEqual(f.commands.map(call => call.args[0]),
    ['load', 'image', '--input-type=module', 'containers', 'image']);
  assert.equal(f.events.indexOf(`claim:${attemptKey}`) <
    f.events.indexOf('containers'), true);
  assert.equal(f.commands.filter(call => call.env?.CLOUDFLARE_API_TOKEN).length, 1);
  assert.equal(f.commands.find(call => call.env?.CLOUDFLARE_API_TOKEN)?.args[0],
    'containers');
});

test('failed push is not retried and leaves a reviewable attempt', async () => {
  const f = fixture(true);
  await assert.rejects(pushNativeStudioDriveImage(f.sandbox as any, f.input),
    /native_studio_drive_image_push_failed/);
  assert.equal(f.records.has(attemptKey), true);
  assert.equal(f.records.has(prebuiltKey), false);
  await assert.rejects(pushNativeStudioDriveImage(f.sandbox as any, f.input),
    /pending_review/);
  assert.equal(f.commands.filter(call => call.args[0] === 'containers').length, 1);
});

test('unverified archive cannot load Docker or receive credentials', async () => {
  const f = fixture();
  f.records.delete(archiveKey);
  await assert.rejects(pushNativeStudioDriveImage(f.sandbox as any, f.input),
    /archive_unverified/);
  assert.equal(f.commands.length, 0);
});

test('dirty receiver snapshot does not consume the single push attempt', async () => {
  const f = fixture(false, true);
  await assert.rejects(pushNativeStudioDriveImage(f.sandbox as any, f.input),
    /snapshot_dirty/);
  assert.equal(f.records.has(attemptKey), false);
  assert.equal(f.commands.some(call => call.env?.CLOUDFLARE_API_TOKEN), false);
});
