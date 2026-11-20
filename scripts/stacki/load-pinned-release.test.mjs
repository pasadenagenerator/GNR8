import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadPinnedRelease } from './load-pinned-release.mjs';
import { STACKI_RELEASE_PIN } from './prepare-native-studio.mjs';
const releaseFile = process.env.STACKI_RELEASE_FILE;
test('pinned native release is fetched once, verified, and safely reused', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gnr8-pinned-release-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bytes = await readFile(releaseFile);
  let calls = 0;
  const transport = async (url, options) => {
    calls++;
    assert.equal(url, STACKI_RELEASE_PIN.url);
    assert.equal(options.redirect, 'manual');
    return new Response(bytes, { status: 200 });
  };
  const path = await loadPinnedRelease({ directory, transport });
  assert.deepEqual(await readFile(path), bytes);
  assert.equal(await loadPinnedRelease({ directory, transport }), path);
  assert.equal(calls, 1);
  await writeFile(path, 'bad cache');
  assert.equal(await loadPinnedRelease({ directory, transport }), path);
  assert.deepEqual(await readFile(path), bytes);
  assert.equal(calls, 2);
  await assert.rejects(loadPinnedRelease({ directory: join(directory, 'bad'), transport: async () => new Response('tampered') }), /unavailable/);
});


test('release redirects are restricted and bounded before any destination request', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gnr8-redirect-release-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const destination of ['http://release-assets.githubusercontent.com/file', 'https://evil.example/file', 'http://127.0.0.1/file', 'https://user@release-assets.githubusercontent.com/file']) {
    let calls = 0;
    await assert.rejects(loadPinnedRelease({ directory, transport: async () => {
      calls++; return new Response(null, { status: 302, headers: { location: destination } });
    } }), /unavailable/);
    assert.equal(calls, 1);
  }
  let calls = 0;
  await assert.rejects(loadPinnedRelease({ directory, transport: async () => {
    calls++; return new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/loop' } });
  } }), /unavailable/);
  assert.equal(calls, 4);
});

test('signed GitHub asset redirect still requires the pinned bytes', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async t => {
  const directory = await mkdtemp(join(tmpdir(), 'gnr8-release-asset-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bytes = await readFile(releaseFile);
  const destination = 'https://release-assets.githubusercontent.com/asset?signature=example';
  const transport = async url => url === STACKI_RELEASE_PIN.url
    ? new Response(null, { status: 302, headers: { location: destination } })
    : (assert.equal(url, destination), new Response(bytes));
  assert.deepEqual(await readFile(await loadPinnedRelease({ directory, transport })), bytes);
  await assert.rejects(loadPinnedRelease({ directory: join(directory, 'tampered'), transport: async url =>
    url === STACKI_RELEASE_PIN.url ? transport(url) : new Response('tampered') }), /unavailable/);
});
