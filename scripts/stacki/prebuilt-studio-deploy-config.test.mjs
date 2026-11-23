import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { preparePrebuiltStudioDeployConfig } from './prebuilt-studio-deploy-config.mjs';

const site = { siteId: '33333333-3333-4333-8333-333333333333',
  accountId: 'a'.repeat(32) };
const sourceId = 'b'.repeat(64);
const commit = 'c'.repeat(40);
const workerId = 'd'.repeat(32);
const digest = 'e'.repeat(64);
const receipt = { accountId: site.accountId, siteId: site.siteId,
  sourceId, commit, workerId, digest };

test('derives a disposable deploy config with only the pinned image changed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-prebuilt-config-'));
  const studio = join(root, 'studio');
  const configDir = join(studio, 'cloudflare');
  await mkdir(configDir, { recursive: true });
  const original = { account_id: site.accountId,
    name: `gnr8-${site.siteId}-studio`, main: '../src/cloudflare/worker.ts',
    assets: { directory: '../dist' },
    containers: [{ class_name: 'PreviewContainer', image: '../Dockerfile',
      max_instances: 1 }] };
  const sourcePath = join(configDir, 'wrangler.jsonc');
  await writeFile(sourcePath, JSON.stringify(original));
  const input = { studio, site, sourceId, commit, workerId,
    store: { read: async () => receipt } };
  try {
    const prepared = await preparePrebuiltStudioDeployConfig(input);
    const derivedPath = join(studio, prepared.relative);
    const derived = JSON.parse(await readFile(derivedPath, 'utf8'));
    assert.deepEqual(derived, { ...original, containers: [{
      ...original.containers[0], image:
        `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${digest}`,
    }] });
    assert.deepEqual(JSON.parse(await readFile(sourcePath, 'utf8')), original);
    await prepared.cleanup();
    await assert.rejects(readFile(derivedPath), { code: 'ENOENT' });
    await assert.rejects(preparePrebuiltStudioDeployConfig({ ...input,
      store: { read: async () => ({ ...receipt, commit: 'f'.repeat(40) }) } }),
    /image_unverified/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
