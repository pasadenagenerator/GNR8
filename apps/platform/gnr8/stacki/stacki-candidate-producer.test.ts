import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, symlink, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStackiLocalStorage } from './stacki-local-storage-transport';
import { SupabaseStackiDraftStore } from './stacki-draft-store';
import { createStackiRecord } from './stacki-draft-contract';
import { createStackiCandidateProducer } from './stacki-candidate-producer';
import { runAstroBuildExportProof } from '../output-adapters/astro-static-site-build-export-proof';

const root = process.env.GNR8_STACKI_RETAINED_REPLAY_ROOT;
test('retained real Stacki text and uploaded image build through the existing producer with a second route preserved', { skip: !root }, async () => {
  const original = join(root!, 'gnr8-astro-workspace-VgI07j');
  const local = createStackiLocalStorage(join(root!, 'storage-transport'));
  const drafts = new SupabaseStackiDraftStore(local.client, local.bucket);
  const retainedScope = { agencyId: '11111111-1111-4111-8111-111111111111', clientId: '22222222-2222-4222-8222-222222222222',
    siteId: '33333333-3333-4333-8333-333333333333', siteVersionId: '44444444-4444-4444-8444-444444444444' };
  const baseline = (await drafts.revision(retainedScope, 1)).files;
  const saved = (await drafts.revision(retainedScope, 2)).files;
  const about = { ...baseline.find(f => f.path === 'src/pages/index.astro')!, path: 'src/pages/about/index.astro' };
  baseline.push(about); saved.push(about);
  const scope = { agencyId: '10000000-0000-4000-8000-000000000001', clientId: '10000000-0000-4000-8000-000000000002',
    siteId: '10000000-0000-4000-8000-000000000003', siteVersionId: '10000000-0000-4000-8000-000000000004' };
  const actor = '10000000-0000-4000-8000-000000000005';
  const checkpoint = createStackiRecord(scope, actor, { expectedRevision: 2, files: saved });
  const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
  const cssFile = baseline.find(f => f.path.endsWith('/assets/styles.css'))!;
  const href = cssFile.path.slice(6);
  const pieces = href.split('/');
  const raw = await readFile(resolve('apps/platform/gnr8/validation/fixtures/real-site-01/assets/styles.css'));
  const materialized = Buffer.from(cssFile.base64, 'base64');
  const fingerprints = Object.fromEntries(baseline.filter(f => f.path.startsWith('public/api/')).map(f => [f.path.slice(6), hash(Buffer.from(f.base64, 'base64'))]));
  fingerprints[href] = hash(raw);
  const { selected, producer, inputId } = createStackiCandidateProducer({ checkpoint, scope, expectedRevision: 3, expectedSha256: checkpoint.sha256,
    baseline, sourcePaths: baseline.filter(f => !f.path.startsWith('public/') && !f.path.startsWith('.studio-state/')).map(f => f.path),
    ownedImagePaths: Object.keys(fingerprints).filter(path => path.endsWith('.svg')),
  }, { ownedAssetFingerprints: fingerprints,
    ownedStylesheetEvidence: [{ href, siteId: pieces[5]!, siteVersionId: pieces[6]!, artifactId: 'retained-fixture', filePath: pieces.slice(7).join('/'),
      mediaType: 'text/css', retainedBytes: raw, retainedSizeBytes: raw.length, retainedSha256: hash(raw),
      materializedBytes: materialized, materializedSizeBytes: materialized.length, materializedSha256: hash(materialized) }],
    runBuildExport: input => runAstroBuildExportProof({ ...input, dependencies: { ...input.dependencies,
      runCommand: async (command, args, options) => {
        // Reuse the dependencies from the previous successful local Stacki
        // proof. No package installation, network access or provider execution.
        if (command === 'pnpm' && args[0] === 'install') {
          await symlink(join(original, 'node_modules'), join(options.cwd, 'node_modules'), 'dir');
          return { stdout: 'Reused retained local dependencies', stderr: '' };
        }
        if (command === 'pnpm' && args[0] === 'build')
          return promisify(execFile)(process.execPath, [join(original, 'node_modules/astro/astro.js'), 'build'], { ...options, timeout: options.timeoutMs });
        return promisify(execFile)(command, args, { ...options, timeout: options.timeoutMs });
      },
    } }),
  });
  const candidate = await producer.produce({ candidateId: 'astro_candidate_10000000000040008000000000000006', candidateCreatedAt: '2026-10-21T10:00:00.000Z',
    ownership: { runtimeSiteId: 'retained-northstar', siteVersionId: scope.siteVersionId, ownershipSiteId: scope.siteId, agencyId: scope.agencyId, organizationId: scope.clientId },
    syntheticInput: { fixtureId: inputId } }).catch(error => {
      // Keep local deterministic diagnostics visible through producer wrapping.
      throw new Error([error.message, error.cause?.message, error.cause?.cause?.message].filter(Boolean).join(' / '), { cause: error });
    });
  assert.deepEqual(Object.keys(candidate.htmlByPath).sort(), ['/', '/about']);
  assert.match(candidate.htmlByPath['/'], /GNR8 in Stacki: lokalni preizkus deluje/);
  assert.match(candidate.htmlByPath['/about'], /Launch a clean landing page in one afternoon/);
  const uploaded = saved.find(f => f.path === 'public/gnr8-proof-logo.svg')!;
  assert.ok(candidate.htmlByPath['/'].includes('data:image/svg+xml;base64,' + uploaded.base64));
  assert.equal(candidate.assetFingerprintMap['/gnr8-proof-logo.svg'], hash(Buffer.from(uploaded.base64, 'base64')));
  assert.equal(producer.readBuildReceipt(candidate.id)?.generatedSourceSha256, selected.sourceSnapshot.aggregateSha256);
  assert.equal(producer.readBuildReceipt(candidate.id)?.execution.workspaceRemoved, true);
  if (process.env.GNR8_STACKI_EVIDENCE_DIR) {
    const { createAstroProductionCandidateRecord } = await import('../output-adapters/astro-production-candidate-record');
    const { renderAstroProductionCandidatePreview } = await import('../output-adapters/astro-production-candidate-preview-composition');
    const { chromium } = await import('playwright');
    const record = createAstroProductionCandidateRecord({ candidate, ownership: { runtimeSiteId: candidate.siteId, siteVersionId: candidate.siteVersionId,
      ownershipSiteId: scope.siteId, agencyId: scope.agencyId, organizationId: scope.clientId }, storedAt: candidate.createdAt,
      registration: { registeredByActorId: actor, producerKind: producer.kind, producerVersion: producer.version,
        producerRef: inputId, idempotencyKey: inputId, correlationId: inputId } });
    const directory = resolve(process.env.GNR8_STACKI_EVIDENCE_DIR);
    await mkdir(directory, { recursive: true });
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const blocked: string[] = [];
    try {
      for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]] as const) {
        const page = await browser.newPage({ viewport: { width, height } });
        await page.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.hostname !== 'stacki-candidate.invalid') { blocked.push(url.origin); return route.abort(); }
          if (candidate.htmlByPath[url.pathname]) return route.fulfill({ contentType: 'text/html', body: (await renderAstroProductionCandidatePreview({ record, path: url.pathname })).html });
          const file = saved.find(file => file.path === 'public' + url.pathname);
          if (file) return route.fulfill({ contentType: url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'text/css', body: Buffer.from(file.base64, 'base64') });
          return route.fulfill({ status: 404, body: '' });
        });
        await page.goto('https://stacki-candidate.invalid/');
        assert.equal(await page.locator('h1').textContent(), 'GNR8 in Stacki: lokalni preizkus deluje.');
        assert(await page.locator('.hero__visual img').evaluate(img => (img as HTMLImageElement).naturalWidth > 0));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
        await page.screenshot({ path: join(directory, `${name}.png`), fullPage: true });
        await page.goto('https://stacki-candidate.invalid/about');
        assert.match(await page.locator('h1').textContent() ?? '', /Launch a clean landing page/);
        await page.close();
      }
    } finally { await browser.close(); }
    assert.deepEqual(blocked, []);
    await writeFile(join(directory, 'evidence.json'), JSON.stringify({ kind: 'local-retained-fixture-only', sourceFixture: 'real-site-01 + retained Stacki source-preparation proof',
      retainedRevision: 2, retainedCheckpointSha256: (await drafts.revision(retainedScope, 2)).sha256,
      augmentedSecondRouteFixtureRevision: checkpoint.revision, augmentedCheckpointSha256: checkpoint.sha256,
      candidateId: candidate.id, candidateContentSha256: candidate.contentSha256, candidateStorageSha256: record.storageSha256,
      sourceSnapshotSha256: selected.sourceSnapshot.aggregateSha256, outputPaths: Object.keys(candidate.htmlByPath),
      uploadedImageSha256: candidate.assetFingerprintMap['/gnr8-proof-logo.svg'], desktopMobilePreview: true, hostedExecution: false,
      userApproval: false, publication: false, externalBrowserRequests: blocked, receipt: producer.readBuildReceipt(candidate.id) }, null, 2) + '\n');
  }
});
