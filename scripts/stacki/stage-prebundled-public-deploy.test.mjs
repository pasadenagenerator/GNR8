import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanStudioBuildOutputs } from './build-handoff.mjs';
import { configuration } from './prepare-native-studio.mjs';
import { stagePrebundledPublicDeploy } from './stage-prebundled-public-deploy.mjs';

const sha = body => createHash('sha256').update(body).digest('hex');
const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'main',
  studioOrigin: 'https://site.example.com', accountId: 'd'.repeat(32),
  appId: '123', installationId: '456', clientId: 'Iv1.example' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40);
const studioWorkerId = 'c'.repeat(32), publicWorkerId = 'e'.repeat(32);

test('stages only verified public assets, bundle, and derived config', async () => {
  const artifactProject = await mkdtemp(join(tmpdir(), 'gnr8-public-stage-test-'));
  let staged;
  try {
    await mkdir(join(artifactProject, 'dist'), { recursive: true });
    await mkdir(join(artifactProject, 'studio/dist'), { recursive: true });
    await writeFile(join(artifactProject, 'dist/index.html'), 'public');
    await writeFile(join(artifactProject, 'studio/dist/index.html'), 'studio');
    const files = await scanStudioBuildOutputs(artifactProject);
    const config = Buffer.from(configuration(site).files.get('wrangler.json'));
    const bundle = Buffer.from('export default {fetch(){return new Response("ok")}}');
    const bundleReceipt = { scope, siteId: site.siteId,
      accountId: site.accountId, sourceId, commit, workerId: publicWorkerId,
      entryPath: 'index.js', files: [{ path: 'index.js', bytes: bundle.length,
        sha256: sha(bundle), chunks: [{ bytes: bundle.length,
          sha256: sha(bundle) }] }] };
    const records = new Map([
      ['native-studio/build-handoff-v1.json', { sourceId, commit,
        workerId: studioWorkerId, scope, files,
        site: { siteId: site.siteId, repository: site.repository,
          branch: site.branch, studioOrigin: site.studioOrigin,
          accountId: site.accountId } }],
      ['native-studio/public-worker-bundle-v1.json', bundleReceipt],
    ]);
    const store = { read: async key => records.get(key) ?? null,
      getBytes: async key => key === sha(bundle) ? bundle : Buffer.alloc(0) };
    staged = await stagePrebundledPublicDeploy({ artifactProject, store,
      scope, site, sourceId, commit, studioWorkerId, publicWorkerId,
      bundleReceipt }, { readSource: async () => ({
        receipt: { files: [{ path: 'wrangler.json', bytes: config.length,
          sha256: sha(config) }] },
        files: [{ path: 'wrangler.json', body: config }],
      }) });
    assert.equal(await readFile(join(staged.deploymentRoot, 'dist/index.html'),
      'utf8'), 'public');
    assert.deepEqual(await readFile(staged.entry), bundle);
    const derived = JSON.parse(await readFile(join(staged.deploymentRoot,
      staged.config), 'utf8'));
    assert.equal(derived.no_bundle, true);
    assert.equal(derived.main, staged.entry);
    assert.equal(derived.routes[0].pattern, 'site.example.com');
  } finally {
    await staged?.cleanup();
    await rm(artifactProject, { recursive: true, force: true });
  }
});
