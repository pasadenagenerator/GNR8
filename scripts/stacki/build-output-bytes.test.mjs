import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { NATIVE_STUDIO_BUILD_OUTPUT_BYTES,
  recordNativeStudioBuildOutputBytes,
  restoreNativeStudioBuildOutputBytes } from './build-output-bytes.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'd'.repeat(32),
  repository: 'pasadenagenerator/example', branch: 'main',
  studioOrigin: 'https://example.app.pasadenagenerator.com' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40),
  workerId = 'c'.repeat(32);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('stores and restores exact private build bytes without a Git checkout', async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-output-bytes-test-'));
  const records = new Map(), bytes = new Map();
  const store = { read: async key => records.get(key) ?? null,
    claim: async (key, value) => { if (records.has(key)) return false;
      records.set(key, value); return true; },
    putBytes: async (key, value) => { assert.equal(hash(value), key);
      bytes.set(key, Buffer.from(value)); },
    getBytes: async key => bytes.get(key) ?? (() => { throw Error('missing'); })(),
  };
  const input = { artifactDir, store, scope, site, sourceId, commit, workerId };
  let restored;
  try {
    await mkdir(join(artifactDir, 'dist'));
    await mkdir(join(artifactDir, 'studio/dist'), { recursive: true });
    await writeFile(join(artifactDir, 'dist/index.html'), '<main>site</main>');
    await writeFile(join(artifactDir, 'studio/dist/app.js'), 'built');
    input.files = await scanStudioBuildOutputs(artifactDir);
    const receipt = await recordNativeStudioBuildOutputBytes(input);
    assert.deepEqual(records.get(NATIVE_STUDIO_BUILD_OUTPUT_BYTES), receipt);
    restored = await restoreNativeStudioBuildOutputBytes(input);
    assert.deepEqual(restored.files, input.files);
    assert.equal(await readFile(join(restored.artifactDir, 'dist/index.html'), 'utf8'),
      '<main>site</main>');
    assert.equal(await readFile(join(restored.artifactDir, 'studio/dist/app.js'), 'utf8'),
      'built');
    const first = receipt.files[0].chunks[0].sha256;
    bytes.set(first, Buffer.from('damaged'));
    await assert.rejects(restoreNativeStudioBuildOutputBytes(input),
      /unverified/);
  } finally {
    if (restored) await restored.cleanup();
    await rm(artifactDir, { recursive: true, force: true });
  }
});
