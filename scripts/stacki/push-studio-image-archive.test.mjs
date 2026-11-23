import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pushStudioImageArchive } from './push-studio-image-archive.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
  workerId = 'd'.repeat(32), digest = 'e'.repeat(64);
const cloudflareCredential = 'f'.repeat(40);

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-push-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const archivePath = join(root, 'image.tar');
  const bytes = Buffer.from('checked-image-archive');
  await writeFile(archivePath, bytes);
  const receipt = { sourceId, commit, workerId, scope,
    siteId: site.siteId, accountId: site.accountId,
    archive: { bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex') } };
  const records = new Map([['native-studio/image-archive-v1.json', receipt]]);
  const store = { read: async key => records.get(key) ?? null,
    claim: async (key, value) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    } };
  return { input: { archivePath, receipt, store, trustedDocker: process.execPath,
    trustedWrangler: process.execPath, cloudflareCredential,
    sourceId, commit, workerId, scope, site }, records };
}

test('loads only verified bytes, pushes once and records the remote digest', async t => {
  const f = await fixture(t);
  const calls = [];
  const invoke = async (_file, args, options) => {
    calls.push(args);
    if (args[0] === 'containers') {
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, cloudflareCredential);
      assert.deepEqual(args.slice(0, 3), ['containers', 'push',
        `gnr8-${site.siteId}-studio:${sourceId.slice(0, 32)}`]);
      return { stdout: '' };
    }
    assert.equal(options.env.CLOUDFLARE_API_TOKEN, undefined);
    if (args[0] === 'image' && args[3] === '{{.Os}}/{{.Architecture}}')
      return { stdout: 'linux/amd64\n' };
    if (args[0] === 'image') return { stdout: JSON.stringify([
      `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${digest}`,
    ]) };
    return { stdout: '' };
  };
  const pushed = await pushStudioImageArchive(f.input, { invoke });
  assert.equal(pushed.digest, digest);
  assert.deepEqual(calls.map(args => args[0]),
    ['load', 'image', 'containers', 'image']);
  assert.deepEqual(await pushStudioImageArchive(f.input, {
    invoke: async () => { throw Error('must not repeat'); },
  }), pushed);
});

test('altered archive stops before Docker or provider use', async t => {
  const f = await fixture(t);
  await writeFile(f.input.archivePath, 'changed');
  let calls = 0;
  await assert.rejects(pushStudioImageArchive(f.input, {
    invoke: async () => { calls++; },
  }), /archive_changed/);
  assert.equal(calls, 0);
  assert.equal(f.records.has('native-studio/image-push-attempt-v1.json'), false);
});

test('a missing private archive receipt stops before Docker use', async t => {
  const f = await fixture(t);
  f.records.delete('native-studio/image-archive-v1.json');
  let calls = 0;
  await assert.rejects(pushStudioImageArchive(f.input, {
    invoke: async () => { calls++; },
  }), /archive_unverified/);
  assert.equal(calls, 0);
});

test('wrong image platform stops before a push attempt', async t => {
  const f = await fixture(t);
  let pushes = 0;
  await assert.rejects(pushStudioImageArchive(f.input, {
    invoke: async (_file, args) => {
      if (args[0] === 'image') return { stdout: 'linux/arm64\n' };
      if (args[0] === 'containers') pushes++;
      return { stdout: '' };
    },
  }), /architecture_invalid/);
  assert.equal(pushes, 0);
  assert.equal(f.records.has('native-studio/image-push-attempt-v1.json'), false);
});

test('failed push is not automatically repeated', async t => {
  const f = await fixture(t);
  let pushes = 0;
  const invoke = async (_file, args) => {
    if (args[0] === 'image') return { stdout: 'linux/amd64\n' };
    if (args[0] === 'containers') { pushes++; throw Error('provider details'); }
    return { stdout: '' };
  };
  await assert.rejects(pushStudioImageArchive(f.input, { invoke }),
    /native_studio_image_push_failed/);
  await assert.rejects(pushStudioImageArchive(f.input, { invoke }),
    /native_studio_image_push_pending_review/);
  assert.equal(pushes, 1);
});
