import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildStudioImageArchive,
  recordStudioImageArchiveHandoff } from './studio-image-archive.mjs';
import { pushStudioImageArchive } from './push-studio-image-archive.mjs';
import { preparePrebuiltStudioDeployConfig } from './prebuilt-studio-deploy-config.mjs';

test('one scoped image moves from credential-free build to deploy config', async t => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-image-pipeline-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, 'project');
  const studio = join(project, 'studio');
  await mkdir(join(studio, 'cloudflare'), { recursive: true });
  const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
    clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333' };
  const site = { siteId: scope.siteId, accountId: 'a'.repeat(32) };
  const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
    workerId = 'd'.repeat(32), digest = 'e'.repeat(64);
  const config = { account_id: site.accountId,
    name: `gnr8-${site.siteId}-studio`,
    containers: [{ class_name: 'PreviewContainer', image: '../Dockerfile' }] };
  const original = join(studio, 'cloudflare', 'wrangler.jsonc');
  await writeFile(original, JSON.stringify(config));
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    } };
  const common = { project, store, sourceId, commit, workerId, scope, site };
  const verified = {
    verifyHandoff: async () => ({ sourceId, commit, workerId, scope }),
    verifyImage: async () => ({ files: 2 }),
  };
  const built = await buildStudioImageArchive({ ...common,
    outputDir: join(root, 'archive'), trustedDocker: process.execPath }, {
    ...verified, invoke: async (_file, args, options) => {
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, undefined);
      if (args[0] === 'save') await writeFile(args[2], 'image-archive');
    },
  });
  await recordStudioImageArchiveHandoff({ ...common,
    archivePath: built.archivePath, receipt: built.receipt }, verified);
  assert.deepEqual(saved.get('native-studio/image-archive-v1.json'), built.receipt);
  const pushed = await pushStudioImageArchive({ ...common,
    archivePath: built.archivePath, receipt: built.receipt,
    trustedDocker: process.execPath, trustedWrangler: process.execPath,
    cloudflareCredential: 'f'.repeat(40) }, {
    invoke: async (_file, args, options) => {
      if (args[0] === 'containers') {
        assert.equal(options.env.CLOUDFLARE_API_TOKEN, 'f'.repeat(40));
        return { stdout: '' };
      }
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, undefined);
      if (args[0] === 'image' && args[3] === '{{.Os}}/{{.Architecture}}')
        return { stdout: 'linux/amd64' };
      if (args[0] === 'image') return { stdout: JSON.stringify([
        `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${digest}`,
      ]) };
      return { stdout: '' };
    },
  });
  assert.equal(pushed.digest, digest);
  const deploy = await preparePrebuiltStudioDeployConfig({ studio, store,
    sourceId, commit, workerId, site });
  try {
    const derived = JSON.parse(await readFile(join(studio, deploy.relative), 'utf8'));
    assert.equal(derived.containers[0].image,
      `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${digest}`);
    assert.deepEqual(JSON.parse(await readFile(original, 'utf8')), config);
  } finally { await deploy.cleanup(); }
});
