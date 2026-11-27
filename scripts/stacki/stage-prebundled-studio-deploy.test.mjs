import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { stagePrebundledStudioDeploy } from './stage-prebundled-studio-deploy.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32),
  repository: 'pasadenagenerator/example', branch: 'main',
  studioOrigin: 'https://example.app.pasadenagenerator.com' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40),
  workerId = 'd'.repeat(32);

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'gnr8-stage-test-')));
  const artifactProject = join(root, 'artifact');
  await mkdir(join(artifactProject, 'dist'), { recursive: true });
  await mkdir(join(artifactProject, 'studio/dist'), { recursive: true });
  await writeFile(join(artifactProject, 'dist/index.html'), '<main>site</main>');
  await writeFile(join(artifactProject, 'studio/dist/app.js'), 'studio-app');
  const files = await scanStudioBuildOutputs(artifactProject);
  const config = Buffer.from(JSON.stringify({
    account_id: site.accountId, name: `gnr8-${site.siteId}-studio`,
    main: '../src/cloudflare/worker.ts',
    assets: { directory: '../dist', binding: 'ASSETS' },
    containers: [{ class_name: 'PreviewContainer', image: '../Dockerfile' }],
  }));
  const bundleBody = Buffer.from('export default {fetch(){return Response.ok()}}');
  const bundleFile = { path: 'worker.js', bytes: bundleBody.length,
    sha256: hash(bundleBody), chunks: [{ bytes: bundleBody.length,
      sha256: hash(bundleBody) }] };
  const bundleReceipt = { scope, siteId: site.siteId,
    accountId: site.accountId, sourceId, commit, workerId,
    entryPath: 'worker.js',
    manifestSha256: hash(JSON.stringify([{ path: bundleFile.path,
      bytes: bundleFile.bytes, sha256: bundleFile.sha256 }])),
    files: [bundleFile] };
  const handoff = { sourceId, commit, workerId, scope,
    site: { siteId: site.siteId, repository: site.repository,
      branch: site.branch, studioOrigin: site.studioOrigin,
      accountId: site.accountId }, files };
  const source = { receipt: { files: [{
    path: 'studio/cloudflare/wrangler.jsonc',
    bytes: config.length, sha256: hash(config) }] },
  files: [{ path: 'studio/cloudflare/wrangler.jsonc', body: config }] };
  const image = { accountId: site.accountId, siteId: site.siteId,
    sourceId, commit, workerId, digest: 'e'.repeat(64) };
  const bytes = new Map([[bundleFile.sha256, bundleBody]]);
  const receipts = new Map([
    ['native-studio/build-handoff-v1.json', handoff],
    ['native-studio/worker-bundle-v1.json', bundleReceipt],
    ['native-studio/prebuilt-image-v1.json', image],
  ]);
  const store = { read: async key => receipts.get(key) ?? null,
    getBytes: async digest => bytes.get(digest) ?? null };
  const input = { artifactProject, store, sourceId, commit,
    workerId, site, scope, bundleReceipt };
  const deps = { readSource: async () => source };
  return { root, artifactProject, input, deps, receipts };
}

test('stages only verified Studio deploy inputs and temporary config', async () => {
  const f = await fixture();
  try {
    const staged = await stagePrebundledStudioDeploy(f.input, f.deps);
    assert.deepEqual((await readdir(staged.deploymentRoot)).sort(),
      ['studio', 'worker-bundle']);
    assert.deepEqual((await readdir(staged.studio)).sort(),
      ['cloudflare', 'dist']);
    assert.equal(await readFile(join(staged.studio, 'dist/app.js'), 'utf8'),
      'studio-app');
    const deployed = JSON.parse(await readFile(join(staged.studio,
      staged.config.relative), 'utf8'));
    assert.equal(deployed.no_bundle, true);
    assert.equal(deployed.find_additional_modules, false);
    assert.equal(deployed.main, join(staged.bundleRoot, 'worker.js'));
    await staged.cleanup();
    await assert.rejects(readFile(join(staged.studio, 'dist/app.js')),
      { code: 'ENOENT' });
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('rejects changed artifact and forged bundle receipt before staging', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.artifactProject, 'studio/dist/app.js'), 'changed');
    await assert.rejects(stagePrebundledStudioDeploy(f.input, f.deps),
      /unverified|changed/);
    await writeFile(join(f.artifactProject, 'studio/dist/app.js'), 'studio-app');
    await assert.rejects(stagePrebundledStudioDeploy({ ...f.input,
      bundleReceipt: { ...f.input.bundleReceipt, workerId: 'f'.repeat(32) } },
    f.deps), /unverified/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});
