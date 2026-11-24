import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanStudioBuildOutputs } from '../../../../scripts/stacki/build-handoff.mjs';
import { stagePrebundledStudioDeploy } from '../../../../scripts/stacki/stage-prebundled-studio-deploy.mjs';
import { NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT,
  stageNativeStudioDeployPackageInSandbox } from './native-studio-deploy-sandbox-stage';

const siteId = '33333333-3333-4333-8333-333333333333';
const accountId = 'a'.repeat(32), sourceId = 'b'.repeat(64);
const digest = 'c'.repeat(64);
const hash = (body: Buffer) => createHash('sha256').update(body).digest('hex');

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'gnr8-deploy-transfer-')));
  const studio = join(root, 'studio');
  const bundleRoot = join(root, 'worker-bundle');
  await mkdir(join(studio, 'cloudflare'), { recursive: true });
  await mkdir(join(studio, 'dist'), { recursive: true });
  await mkdir(bundleRoot);
  await writeFile(join(studio, 'dist/app.js'), 'built');
  await writeFile(join(bundleRoot, 'worker.js'), 'export default {}');
  const original = { account_id: accountId,
    name: `gnr8-${siteId}-studio`, main: '../src/cloudflare/worker.ts',
    assets: { directory: '../dist', binding: 'ASSETS' },
    containers: [{ class_name: 'PreviewContainer', image: '../Dockerfile' }] };
  await writeFile(join(studio, 'cloudflare/wrangler.jsonc'),
    JSON.stringify(original));
  const relative = 'cloudflare/.gnr8-deploy-44444444-4444-4444-8444-444444444444.jsonc';
  const entry = join(bundleRoot, 'worker.js');
  const image = `registry.cloudflare.com/${accountId}/gnr8-${siteId}-studio@sha256:${digest}`;
  await writeFile(join(studio, relative), JSON.stringify({ ...original,
    main: entry, no_bundle: true, find_additional_modules: false,
    assets: { ...original.assets, directory: join(studio, 'dist') },
    containers: [{ ...original.containers[0], image }] }) + '\n');
  const written = new Map<string, Buffer>();
  const networkPolicy = { allow: ['api.cloudflare.com'] };
  const sandbox = { name: `gnr8-deploy-${siteId}-${sourceId.slice(0, 12)}`,
    status: 'running', sourceSnapshotId: 'snap_deploy', region: 'iad1',
    persistent: false, timeout: 60 * 60_000, networkPolicy,
    mounts: {}, expiresAt: new Date(Date.now() + 60 * 60_000),
    currentSession: () => ({ sessionId: 'session_1' }),
    runCommand: async ({ args }: { args: string[] }) => {
      if (args[2].includes('for(const p of'))
        return { exitCode: written.size ? 2 : 0 };
      const manifest = JSON.parse(written.get(
        '/vercel/sandbox/gnr8-deploy-package-manifest.json')!.toString());
      const actual = [...written].filter(([path]) =>
        path.startsWith(`${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/`))
        .map(([path, body]) => ({ path: path.slice(
          NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT.length + 1),
          bytes: body.length, sha256: hash(body) }))
        .sort((a, b) => a.path.localeCompare(b.path));
      return { exitCode: JSON.stringify(actual) === JSON.stringify(manifest)
        ? 0 : 2, stdout: async () => 'verified' };
    },
    writeFiles: async (files: Array<{ path: string; content: Buffer }>) => {
      for (const file of files) written.set(file.path, Buffer.from(file.content));
    } };
  const input = { staged: { deploymentRoot: root, studio, bundleRoot,
    config: { relative, entry, image } }, siteId, accountId, sourceId,
    snapshotId: 'snap_deploy', sessionId: 'session_1', networkPolicy,
    sandboxTimeoutMs: 60 * 60_000, sandbox };
  return { root, studio, written, input };
}

test('transfers only the clean package and rewrites deploy paths for Sandbox', async () => {
  const f = await fixture();
  try {
    const staged = await stageNativeStudioDeployPackageInSandbox(f.input as any);
    assert.equal(staged.config, f.input.staged.config.relative);
    assert.equal(staged.entry,
      `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/worker-bundle/worker.js`);
    const remote = JSON.parse(f.written.get(
      `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio/${staged.config}`)!.toString());
    assert.equal(remote.main, staged.entry);
    assert.equal(remote.assets.directory,
      `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio/dist`);
    assert.equal(remote.no_bundle, true);
    assert.equal(remote.find_additional_modules, false);
    assert.equal(f.written.size, 5);
    assert.equal((await readFile(join(f.studio, staged.config), 'utf8'))
      .includes(f.root), true);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('blocks changed config, dirty snapshot, and foreign Sandbox before transfer', async () => {
  const f = await fixture();
  try {
    f.input.sandbox.sourceSnapshotId = 'snap_other';
    await assert.rejects(stageNativeStudioDeployPackageInSandbox(f.input as any),
      /unverified/);
    assert.equal(f.written.size, 0);
    f.input.sandbox.sourceSnapshotId = 'snap_deploy';
    f.written.set(NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT, Buffer.from('dirty'));
    await assert.rejects(stageNativeStudioDeployPackageInSandbox(f.input as any),
      /unverified/);
    f.written.clear();
    const config = join(f.studio, f.input.staged.config.relative);
    const altered = JSON.parse(await readFile(config, 'utf8'));
    altered.vars = { PUBLISH_CLOUDFLARE_API_TOKEN: 'bad' };
    await writeFile(config, JSON.stringify(altered));
    await assert.rejects(stageNativeStudioDeployPackageInSandbox(f.input as any),
      /unverified/);
    assert.equal(f.written.size, 0);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('transfers the package produced by the real clean staging step', async () => {
  const f = await fixture();
  let staged: Awaited<ReturnType<typeof stagePrebundledStudioDeploy>> | undefined;
  try {
    const artifactProject = join(f.root, 'artifact');
    await mkdir(join(artifactProject, 'dist'), { recursive: true });
    await mkdir(join(artifactProject, 'studio/dist'), { recursive: true });
    await writeFile(join(artifactProject, 'dist/index.html'), '<main>site</main>');
    await writeFile(join(artifactProject, 'studio/dist/app.js'), 'built');
    const buildFiles = await scanStudioBuildOutputs(artifactProject);
    const original = await readFile(join(f.studio, 'cloudflare/wrangler.jsonc'));
    const worker = Buffer.from('export default {}');
    const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
      clientId: '22222222-2222-4222-8222-222222222222', siteId };
    const site = { siteId, accountId,
      repository: 'pasadenagenerator/example', branch: 'main',
      studioOrigin: 'https://example.app.pasadenagenerator.com' };
    const commit = 'd'.repeat(40), workerId = 'e'.repeat(32);
    const bundleFile = { path: 'worker.js', bytes: worker.length,
      sha256: hash(worker), chunks: [{ bytes: worker.length,
        sha256: hash(worker) }] };
    const bundleReceipt = { scope, siteId, accountId, sourceId, commit,
      workerId, entryPath: 'worker.js', files: [bundleFile],
      manifestSha256: hash(Buffer.from(JSON.stringify([{
        path: bundleFile.path, bytes: bundleFile.bytes,
        sha256: bundleFile.sha256 }]))), };
    const handoff = { sourceId, commit, workerId, scope,
      site: { siteId, repository: site.repository, branch: site.branch,
        studioOrigin: site.studioOrigin, accountId }, files: buildFiles };
    const receipts = new Map<string, unknown>([
      ['native-studio/build-handoff-v1.json', handoff],
      ['native-studio/worker-bundle-v1.json', bundleReceipt],
      ['native-studio/prebuilt-image-v1.json', { accountId, siteId,
        sourceId, commit, workerId, digest }],
    ]);
    const store = { read: async (key: string) => receipts.get(key) ?? null,
      getBytes: async (sha256: string) => sha256 === hash(worker)
        ? worker : Buffer.alloc(0) };
    const source = { receipt: { files: [{
      path: 'studio/cloudflare/wrangler.jsonc', bytes: original.length,
      sha256: hash(original) }] }, files: [{
      path: 'studio/cloudflare/wrangler.jsonc', body: original }] };
    staged = await stagePrebundledStudioDeploy({ artifactProject, store,
      sourceId, commit, workerId, site, scope, bundleReceipt },
    { readSource: async () => source });
    const result = await stageNativeStudioDeployPackageInSandbox({
      ...f.input, staged: staged as any } as any);
    const remote = JSON.parse(f.written.get(
      `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio/${result.config}`)!.toString());
    assert.equal(remote.main, result.entry);
    assert.equal(remote.assets.directory,
      `${NATIVE_STUDIO_DEPLOY_PACKAGE_ROOT}/studio/dist`);
  } finally {
    if (staged) await staged.cleanup();
    await rm(f.root, { recursive: true, force: true });
  }
});
