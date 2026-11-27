import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { preparePrebundledStudioDeployConfig } from './prebundled-studio-deploy-config.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const site = { siteId: '33333333-3333-4333-8333-333333333333',
  accountId: 'a'.repeat(32) };
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: site.siteId };
const sourceId = 'b'.repeat(64);
const commit = 'c'.repeat(40);
const workerId = 'd'.repeat(32);
const digest = 'e'.repeat(64);

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'gnr8-prebundled-config-')));
  const studio = join(root, 'studio');
  const deploymentRoot = join(root, 'clean-deployment');
  const bundleRoot = join(deploymentRoot, 'worker-bundle');
  const assetsDirectory = join(studio, 'dist');
  await mkdir(join(studio, 'cloudflare'), { recursive: true });
  await mkdir(assetsDirectory);
  await mkdir(bundleRoot, { recursive: true });
  const original = { account_id: site.accountId,
    name: `gnr8-${site.siteId}-studio`, main: '../src/cloudflare/worker.ts',
    assets: { directory: '../dist', binding: 'ASSETS' },
    containers: [{ class_name: 'PreviewContainer', image: '../Dockerfile',
      max_instances: 1 }] };
  const originalBytes = Buffer.from(JSON.stringify(original));
  const originalPath = join(studio, 'cloudflare', 'wrangler.jsonc');
  await writeFile(originalPath, originalBytes);
  const body = Buffer.from('export default {fetch(){return new Response("ok")}};');
  await writeFile(join(bundleRoot, 'worker.js'), body);
  const files = [{ path: 'worker.js', bytes: body.length, sha256: hash(body),
    chunks: [{ bytes: body.length, sha256: hash(body) }] }];
  const bundleReceipt = { scope, siteId: site.siteId,
    accountId: site.accountId, sourceId, commit, workerId,
    entryPath: 'worker.js', files,
    manifestSha256: hash(JSON.stringify(files.map(({ path, bytes, sha256 }) =>
      ({ path, bytes, sha256 })))) };
  const imageReceipt = { accountId: site.accountId, siteId: site.siteId,
    sourceId, commit, workerId, digest };
  const input = { studio, deploymentRoot, bundleRoot, assetsDirectory,
    site, scope, sourceId, commit, workerId, bundleReceipt,
    originalConfigSha256: hash(originalBytes),
    store: { read: async key => key === 'native-studio/prebuilt-image-v1.json'
      ? imageReceipt : null } };
  return { root, input, original, originalBytes, originalPath, body };
}

test('uses verified bundle and assets with a disposable deploy-only config', async () => {
  const f = await fixture();
  try {
    const result = await preparePrebundledStudioDeployConfig(f.input);
    const deployPath = join(f.input.studio, result.relative);
    const config = JSON.parse(await readFile(deployPath, 'utf8'));
    assert.equal(config.main, join(f.input.bundleRoot, 'worker.js'));
    assert.equal(config.no_bundle, true);
    assert.equal(config.find_additional_modules, false);
    assert.equal(config.assets.directory, f.input.assetsDirectory);
    assert.equal(config.assets.binding, 'ASSETS');
    assert.equal(config.containers[0].image,
      `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${digest}`);
    assert.equal(config.account_id, site.accountId);
    assert.equal(config.name, `gnr8-${site.siteId}-studio`);
    assert.equal('build' in config || 'rules' in config || 'site' in config, false);
    assert.deepEqual(await readFile(f.originalPath), f.originalBytes);
    await result.cleanup();
    await assert.rejects(readFile(deployPath), { code: 'ENOENT' });
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('rejects changed original, mismatched scope, and changed bundle bytes', async () => {
  const f = await fixture();
  try {
    await assert.rejects(preparePrebundledStudioDeployConfig({ ...f.input,
      originalConfigSha256: '0'.repeat(64) }), /unverified/);
    await assert.rejects(preparePrebundledStudioDeployConfig({ ...f.input,
      bundleReceipt: { ...f.input.bundleReceipt, workerId: 'f'.repeat(32) } }),
    /unverified/);
    await writeFile(join(f.input.bundleRoot, 'worker.js'), 'changed');
    await assert.rejects(preparePrebundledStudioDeployConfig(f.input), /unverified/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('rejects extra bundle files and build rules in the original', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.input.bundleRoot, 'unexpected.js'), 'export {};');
    await assert.rejects(preparePrebundledStudioDeployConfig(f.input), /unverified/);
    await rm(join(f.input.bundleRoot, 'unexpected.js'));
    const altered = { ...f.original, build: { command: 'npm run build' } };
    const bytes = Buffer.from(JSON.stringify(altered));
    await writeFile(f.originalPath, bytes);
    await assert.rejects(preparePrebundledStudioDeployConfig({ ...f.input,
      originalConfigSha256: hash(bytes) }), /unverified/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
