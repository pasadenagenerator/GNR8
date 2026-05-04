import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { ScopedImportPipelineFailureError } from '@/gnr8/site/scoped-import-pipeline'
import {
  TemplateSiteRuntimeBootstrapError,
  bootstrapRuntimeFromTemplateSite,
  regenerateContentSlotsForSiteVersion,
} from '@/gnr8/site/site-template-runtime-bootstrap-service'

const SITE = {
  siteId: '00000000-0000-4000-8000-000000000111',
  clientId: '00000000-0000-4000-8000-000000000201',
  agencyId: '00000000-0000-4000-8000-000000000301',
  templateId: '00000000-0000-4000-8000-000000000401',
  name: 'Template Site',
  domain: 'example.com',
  status: 'draft',
  createdAt: '2026-04-20T08:00:00.000Z',
  updatedAt: '2026-04-20T08:01:00.000Z',
}

function createTemplate(overrides?: Partial<any>) {
  return {
    id: SITE.templateId,
    sourceFilename: 'template.zip',
    sourceZipStorageBucket: null,
    sourceZipStorageKey: null,
    importSnapshotId: null,
    entryHtmlPath: 'nested/site/index.html',
    entryHtmlFileName: 'index.html',
    importManifestSummary: { assetsDirPath: 'nested/site/assets' },
    durableSnapshotRootDirAbs: null,
    ...(overrides ?? {}),
  }
}

function captureLogs() {
  const infos: Array<{ message: unknown; meta: any }> = []
  const errors: Array<{ message: unknown; meta: any }> = []
  const warns: Array<{ message: unknown; meta: any }> = []
  const originalInfo = console.info
  const originalError = console.error
  const originalWarn = console.warn
  console.info = ((message: unknown, meta: any) => {
    infos.push({ message, meta })
  }) as typeof console.info
  console.error = ((message: unknown, meta: any) => {
    errors.push({ message, meta })
  }) as typeof console.error
  console.warn = ((message: unknown, meta: any) => {
    warns.push({ message, meta })
  }) as typeof console.warn
  return {
    infos,
    errors,
    warns,
    restore: () => {
      console.info = originalInfo
      console.error = originalError
      console.warn = originalWarn
    },
  }
}

test('template bootstrap succeeds from durable processed source and emits pipeline started log with durable mode', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-durable-'))
  const entryRel = 'nested/site/index.html'
  const assetsRel = 'nested/site/assets'
  const entryAbs = path.resolve(root, entryRel)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, '<!doctype html><html><body><h1>Hello</h1></body></html>', 'utf8')
  fs.mkdirSync(path.resolve(root, assetsRel), { recursive: true })

  const logs = captureLogs()
  try {
    let ownershipLink: { siteId: string; siteVersionId: string } | null = null
    const result = await bootstrapRuntimeFromTemplateSite({
      site: SITE,
      template: createTemplate({
        durableSnapshotRootDirAbs: root,
        entryHtmlPath: entryRel,
        importManifestSummary: { assetsDirPath: assetsRel },
      }),
      deps: {
        runScopedImportPipeline: async (input) => {
          assert.equal(input.snapshot.entryHtmlPathAbs, entryAbs)
          assert.equal(input.snapshot.assetsDirAbs, path.resolve(root, assetsRel))
          assert.equal(input.snapshot.captureMode, 'raw_html_only')
          assert.equal(input.snapshot.semanticImport?.sourceMode, 'raw_html_only')
          assert.ok((input.snapshot.semanticImport?.sections.length ?? 0) >= 1)
          return {
            mode: 'pipeline',
            siteId: 'runtime-site-1',
            siteVersionId: 'runtime-version-1',
            versionNo: 1,
            artifactId: 'artifact-1',
            pipelineResult: { stages: [] },
            preparedSite: {
              documents: [{ semantic: { sections: [{ id: 's1' }] }, domOutline: { bodyChildElements: [] } }],
            },
            layoutModel: null,
            renderOutput: null,
            previewDocument: null,
            reporting: {
              executionStatus: 'success',
              consolidationApplied: true,
              renderedCaptureUsed: false,
              sourceMode: 'raw_html_fallback',
              fidelityStatus: 'degraded_import',
              fidelityDegraded: true,
              renderedCaptureStatus: 'failed',
              renderedDomQuality: 'weak',
              screenshotCount: 0,
              computedStyleSampleCount: 0,
              importDiagnosticCodes: [],
              styleSourceMode: 'computed_style_sampling',
              stylePrimaryAccent: null,
              styleBackgroundTone: 'neutral',
              styleTypography: 'sans/sans',
              styleSpacingDensity: 'balanced/comfortable',
              styleCta: 'minimal/subtle',
              styleDiagnostics: [],
              importFidelityScore: null,
              artifactGenerated: true,
              writePath: {
                createdVersionId: 'runtime-version-1',
                provenancePayloadBeforeWrite: null,
                provenanceWriteAttempted: true,
                provenanceWriteSucceeded: true,
                provenanceWriteAffectedRows: 1,
                artifactCreateAttempted: true,
                artifactCreatedId: 'artifact-1',
                artifactBindAttempted: true,
                artifactBindSucceeded: true,
                artifactBindAffectedRows: 1,
                verifiedVersionIdAfterWrite: 'runtime-version-1',
                verificationRead: {
                  versionId: 'runtime-version-1',
                  artifactId: 'artifact-1',
                  hasImportProvenanceSummary: true,
                },
              },
            },
          } as any
        },
        writeOwnershipLink: async (input) => {
          ownershipLink = input
        },
        persistRawTemplateSiteArtifact: async () => ({
          artifactId: 'raw-artifact-1',
          artifactType: 'raw_template_site',
          entryHtmlPath: entryRel,
          assetBasePath: 'nested/site',
          fileMap: {
            [entryRel]: { path: entryRel, mediaType: 'text/html; charset=utf-8', sizeBytes: 58, sha256: 'h1' },
          },
          fileCount: 1,
        }),
      },
    })

    assert.equal(result.runtimeSiteId, 'runtime-site-1')
    assert.equal(result.siteVersionId, 'runtime-version-1')
    assert.equal(result.sectionCount, 1)
    assert.deepEqual(ownershipLink, {
      siteId: SITE.siteId,
      siteVersionId: 'runtime-version-1',
    })
    const started = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STARTED'))
    assert.ok(started)
    assert.equal(started?.meta.sourceResolutionMode, 'durable')
    const resolved = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_RESOLVED'))
    assert.ok(resolved)
    assert.equal(resolved?.meta.entryHtmlPath, entryRel)
    assert.equal(resolved?.meta.assetsDirPath, assetsRel)
    const rawSelected = logs.infos.find((entry) => String(entry.message).includes('RAW_TEMPLATE_PREVIEW_SELECTED'))
    assert.ok(rawSelected)
    assert.equal(rawSelected?.meta.artifactType, 'raw_template_site')
    const slotStarted = logs.infos.find((entry) => String(entry.message).includes('CONTENT_SLOT_BOOTSTRAP_STARTED'))
    const slotPersisted = logs.infos.find((entry) => String(entry.message).includes('CONTENT_SLOT_BOOTSTRAP_PERSISTED_COUNT'))
    const slotCompleted = logs.infos.find((entry) => String(entry.message).includes('CONTENT_SLOT_BOOTSTRAP_COMPLETED'))
    assert.ok(slotStarted)
    assert.ok(slotPersisted)
    assert.ok(slotCompleted)
    assert.equal(typeof slotPersisted?.meta.persistedCount, 'number')
  } finally {
    logs.restore()
  }
})

test('regenerateContentSlotsForSiteVersion backfills slots idempotently from semantic import + raw template artifact', async () => {
  const logs = captureLogs()
  try {
    const result = await regenerateContentSlotsForSiteVersion(
      { siteVersionId: 'runtime-version-1' },
      {
        getSiteVersion: async () =>
          ({
            id: 'runtime-version-1',
            siteId: 'runtime-site-1',
            importProvenanceSummary: {
              kind: 'runtime_import_provenance_summary_v1',
              sourceMode: 'raw_html_fallback',
              importFidelityStatus: 'degraded_import',
              renderedCaptureStatus: 'failed',
              renderedDomQuality: 'weak',
              screenshotCount: 0,
              computedStyleSampleCount: 0,
              importDiagnosticCodes: [],
              captureEvidence: {
                selectedSourceHtmlPath: null,
                responseHtmlPath: null,
                entryHtmlPath: null,
                renderedCaptureManifestPath: null,
                acquisitionEvidencePath: null,
                renderedDomPath: null,
                computedStylesPath: null,
                renderedViewportScreenshotPath: null,
                renderedFullpageScreenshotPath: null,
                screenshotPaths: [],
              },
              renderedCapture: {
                used: false,
                status: 'failed',
                quality: 'weak',
                domLength: 0,
                nodeCount: 0,
                styleSampleCount: 0,
                styleCoverage: 0,
                screenshots: { viewport: false, fullPage: false },
                execution: {
                  runtimeKind: 'nodejs',
                  environmentSupported: true,
                  browserPackageAvailable: false,
                  browserBinaryAvailable: false,
                  environmentStatus: 'supported',
                  failureCategory: 'none',
                  failureCode: null,
                  browserLaunch: 'not_attempted',
                  navigation: 'not_attempted',
                  dom: 'not_attempted',
                  screenshot: 'none',
                  styleSampling: 'not_attempted',
                },
              },
              styleSignals: null,
              semanticImport: {
                sourceMode: 'raw_html_only',
                diagnostics: [],
                navigation: [],
                hero: { title: 'Hero title', subtitle: 'Hero subtitle', cta: null, image: null },
                sections: [],
                assets: { knownAssets: [], images: [], groupedByRole: { logo: [], hero: [], gallery: [], team: [], icon: [], other: [] } },
              },
            },
          }) as any,
        getRawTemplateSiteArtifact: async () =>
          ({ siteVersionId: 'runtime-version-1', siteId: 'runtime-site-1', entryHtmlPath: 'index.html' }) as any,
        getRawTemplateSiteAsset: async () =>
          ({ bytes: Buffer.from('<!doctype html><html><body><h1>Hero title</h1></body></html>', 'utf8') }) as any,
        persistContentSlots: async () => 5,
      },
    )
    assert.equal(result.skippedReason, null)
    assert.equal(result.persistedCount, 5)
    assert.equal(logs.infos.some((entry) => String(entry.message).includes('CONTENT_SLOT_BOOTSTRAP_STARTED')), true)
    assert.equal(logs.infos.some((entry) => String(entry.message).includes('CONTENT_SLOT_BOOTSTRAP_COMPLETED')), true)
    assert.equal(logs.infos.some((entry) => String(entry.message).includes('CONTENT_SLOT_BOOTSTRAP_PERSISTED_COUNT')), true)
  } finally {
    logs.restore()
  }
})

test('regenerateContentSlotsForSiteVersion skips when semantic import is missing', async () => {
  const result = await regenerateContentSlotsForSiteVersion(
    { siteVersionId: 'runtime-version-2' },
    {
      getSiteVersion: async () => ({ id: 'runtime-version-2', siteId: 'runtime-site-2', importProvenanceSummary: null } as any),
      getRawTemplateSiteArtifact: async () =>
        ({ siteVersionId: 'runtime-version-2', siteId: 'runtime-site-2', entryHtmlPath: 'index.html' }) as any,
      getRawTemplateSiteAsset: async () => ({ bytes: Buffer.from('<html></html>', 'utf8') }) as any,
    },
  )
  assert.equal(result.skippedReason, 'SEMANTIC_IMPORT_MISSING')
  assert.equal(result.persistedCount, 0)
})

test('template bootstrap resolves root-level entry HTML bootstrap input deterministically', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-root-entry-'))
  const entryRel = 'index.html'
  const assetsRel = 'assets'
  const entryAbs = path.resolve(root, entryRel)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, '<!doctype html><html><body><h1>Root Entry</h1></body></html>', 'utf8')
  fs.mkdirSync(path.resolve(root, assetsRel), { recursive: true })

  const logs = captureLogs()
  try {
    await bootstrapRuntimeFromTemplateSite({
      site: SITE,
      template: createTemplate({
        durableSnapshotRootDirAbs: root,
        entryHtmlPath: entryRel,
        importManifestSummary: { assetsDirPath: assetsRel },
      }),
      deps: {
        runScopedImportPipeline: async (input) => {
          assert.equal(input.snapshot.entryHtmlPathAbs, entryAbs)
          assert.equal(input.snapshot.assetsDirAbs, path.resolve(root, assetsRel))
          return {
            mode: 'pipeline',
            siteId: 'runtime-site-root',
            siteVersionId: 'runtime-version-root',
            versionNo: 1,
            artifactId: 'artifact-root',
            preparedSite: { documents: [] },
            layoutModel: null,
            renderOutput: null,
            previewDocument: null,
            pipelineResult: { stages: [] },
            reporting: {},
          } as any
        },
        writeOwnershipLink: async () => undefined,
        persistRawTemplateSiteArtifact: async () => ({
          artifactId: 'raw-artifact-root',
          artifactType: 'raw_template_site',
          entryHtmlPath: entryRel,
          assetBasePath: '.',
          fileMap: {
            [entryRel]: { path: entryRel, mediaType: 'text/html; charset=utf-8', sizeBytes: 63, sha256: 'h-root' },
          },
          fileCount: 1,
        }),
      },
    })

    const resolved = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_RESOLVED'))
    assert.ok(resolved)
    assert.equal(resolved?.meta.entryHtmlPath, 'index.html')
    assert.equal(resolved?.meta.assetsDirPath, 'assets')
  } finally {
    logs.restore()
  }
})

test('template bootstrap succeeds from zip reconstruction fallback and emits zip_reconstruction mode', async () => {
  const extractionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-zip-extract-'))
  const entryRel = 'nested/site/index.html'
  const entryAbs = path.resolve(extractionRoot, entryRel)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, '<!doctype html><html><body><h1>Zip source</h1></body></html>', 'utf8')
  const extractedAssetsRel = 'nested/site/assets'
  fs.mkdirSync(path.resolve(extractionRoot, extractedAssetsRel), { recursive: true })
  fs.writeFileSync(path.resolve(extractionRoot, extractedAssetsRel, 'app.css'), 'body{color:#111;}', 'utf8')

  const durableRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-zip-durable-'))
  const durableEntry = path.resolve(durableRoot, entryRel)
  fs.mkdirSync(path.dirname(durableEntry), { recursive: true })
  fs.writeFileSync(durableEntry, '<!doctype html><html><body><h1>Zip source</h1></body></html>', 'utf8')
  fs.mkdirSync(path.resolve(durableRoot, extractedAssetsRel), { recursive: true })
  fs.writeFileSync(path.resolve(durableRoot, extractedAssetsRel, 'app.css'), 'body{color:#111;}', 'utf8')

  const logs = captureLogs()
  let capturedSnapshotInput: { entryHtmlPathAbs: string; assetsDirAbs: string } | null = null
  try {
    await bootstrapRuntimeFromTemplateSite({
      site: SITE,
      template: createTemplate({
        sourceZipStorageBucket: 'bucket',
        sourceZipStorageKey: 'key',
        entryHtmlPath: 'index.html',
        importManifestSummary: { assetsDirPath: 'assets' },
      }),
      deps: {
        loadTemplateSourceZip: async () => new Uint8Array([1, 2, 3]),
        validateAndExtractTemplateZip: () =>
          ({
            ok: true,
            validation: {
              extractionRootDirAbs: extractionRoot,
              entryHtmlPath: entryRel,
              extractedFilePaths: [entryRel, `${extractedAssetsRel}/app.css`],
              assetsDirPath: extractedAssetsRel,
            },
          }) as any,
        persistTemplateDurableSourceSnapshot: () => ({
          durableSnapshotRootDirAbs: durableRoot,
          durableEntryHtmlPathAbs: durableEntry,
        }),
        runScopedImportPipeline: async (input) => {
          capturedSnapshotInput = {
            entryHtmlPathAbs: input.snapshot.entryHtmlPathAbs,
            assetsDirAbs: input.snapshot.assetsDirAbs,
          }
          return {
            mode: 'pipeline',
            siteId: 'runtime-site-zip',
            siteVersionId: 'runtime-version-zip',
            versionNo: 1,
            artifactId: 'artifact-zip',
            preparedSite: { documents: [] },
            layoutModel: null,
            renderOutput: null,
            previewDocument: null,
            pipelineResult: { stages: [] },
            reporting: {},
          } as any
        },
        writeOwnershipLink: async () => undefined,
        persistRawTemplateSiteArtifact: async () => ({
          artifactId: 'raw-artifact-zip',
          artifactType: 'raw_template_site',
          entryHtmlPath: entryRel,
          assetBasePath: 'nested/site',
          fileMap: {
            [entryRel]: { path: entryRel, mediaType: 'text/html; charset=utf-8', sizeBytes: 58, sha256: 'h-zip' },
          },
          fileCount: 1,
        }),
      },
    })

    const started = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STARTED'))
    assert.ok(started)
    assert.equal(started?.meta.sourceResolutionMode, 'zip_reconstruction')
    assert.equal(started?.meta.snapshotEntryHtmlPath, entryRel)
    assert.equal(started?.meta.snapshotAssetsDirPath, extractedAssetsRel)
    assert.equal(capturedSnapshotInput?.entryHtmlPathAbs, path.resolve(durableRoot, entryRel))
    assert.equal(capturedSnapshotInput?.assetsDirAbs, path.resolve(durableRoot, extractedAssetsRel))
  } finally {
    logs.restore()
  }
})

test('template bootstrap surfaces failing stage diagnostics when scoped pipeline fails on invalid bootstrap input', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-failure-'))
  const entryRel = 'nested/site/index.html'
  const entryAbs = path.resolve(root, entryRel)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, '<!doctype html><html><body>Broken</body></html>', 'utf8')
  fs.mkdirSync(path.resolve(root, 'nested/site/assets'), { recursive: true })

  const logs = captureLogs()
  try {
    await assert.rejects(
      bootstrapRuntimeFromTemplateSite({
        site: SITE,
        template: createTemplate({
          durableSnapshotRootDirAbs: root,
          entryHtmlPath: entryRel,
          importManifestSummary: { assetsDirPath: 'nested/site/assets' },
        }),
        deps: {
          runScopedImportPipeline: async () => {
            throw new ScopedImportPipelineFailureError({
              pipelineSummary: 'linear_migration_pipeline: failed; stages=7; success=0; failed=1; skipped=6',
              firstFailedStageId: 'import_intake',
              firstFailedStageSummary: 'import_intake: failed; importOutput.status=failed',
              firstFailedStageDiagnostics: [
                {
                  severity: 'fatal',
                  code: 'ENTRY_HTML_MISSING',
                  message: 'Entry HTML file is missing or unreadable',
                  source: 'import',
                  details: { path: 'index.html' },
                },
              ],
              pipelineDiagnosticCodes: ['ENTRY_HTML_MISSING', 'PIPELINE_BLOCKED_BY_IMPORT'],
              pipelineDiagnostics: [
                {
                  severity: 'fatal',
                  code: 'ENTRY_HTML_MISSING',
                  message: 'Entry HTML file is missing or unreadable',
                  source: 'import',
                  stageId: 'import_intake',
                  details: { entryHtmlPath: 'index.html' },
                },
                {
                  severity: 'error',
                  code: 'PIPELINE_BLOCKED_BY_IMPORT',
                  message: 'Pipeline blocked by import intake failure',
                  source: 'pipeline',
                  stageId: 'import_intake',
                  details: null,
                },
              ],
              stageSummaries: ['import_intake: failed'],
              importInput: {
                rootDir: '/tmp/bootstrap-root',
                entryHtmlPath: 'index.html',
                assetsDirPath: 'assets',
                snapshotRootDirAbs: '/tmp/bootstrap-root',
                entryHtmlPathAbs: '/tmp/bootstrap-root/nested/site/index.html',
                assetsDirAbs: '/tmp/bootstrap-root/nested/site/assets',
              },
            })
          },
          persistRawTemplateSiteArtifact: async () => ({
            artifactId: 'raw-artifact-failure',
            artifactType: 'raw_template_site',
            entryHtmlPath: entryRel,
            assetBasePath: 'nested/site',
            fileMap: {},
            fileCount: 0,
          }),
        },
      }),
      (error) => {
        assert.ok(error instanceof TemplateSiteRuntimeBootstrapError)
        assert.equal(error.code, 'TEMPLATE_SITE_BOOTSTRAP_FAILED')
        assert.match(error.message, /first_failed_stage=import_intake/)
        return true
      },
    )

    const stageFailed = logs.errors.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STAGE_FAILED'))
    assert.ok(stageFailed)
    assert.equal(stageFailed?.meta.failingStageId, 'import_intake')
    assert.equal(stageFailed?.meta.failingStageDiagnostics?.[0]?.code, 'ENTRY_HTML_MISSING')
    assert.equal(stageFailed?.meta.sourceResolutionMode, 'durable')

    const failed = logs.errors.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_PIPELINE_FAILED'))
    assert.ok(failed)
    assert.equal(failed?.meta.failingStageId, 'import_intake')
    assert.equal(failed?.meta.pipelineImportInput?.entryHtmlPath, 'index.html')

    const intakeFailed = logs.errors.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_IMPORT_INTAKE_FAILED'))
    assert.ok(intakeFailed)
    assert.ok(intakeFailed?.meta.stageDiagnosticCodes.includes('ENTRY_HTML_MISSING'))
    assert.ok(intakeFailed?.meta.pipelineDiagnosticCodes.includes('PIPELINE_BLOCKED_BY_IMPORT'))
    assert.ok(intakeFailed?.meta.stageDiagnosticMessages.includes('Entry HTML file is missing or unreadable'))
  } finally {
    logs.restore()
  }
})

test('template bootstrap allows missing assets dir and logs optional-missing preflight evidence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-preflight-missing-assets-'))
  const entryRel = 'nested/site/index.html'
  const entryAbs = path.resolve(root, entryRel)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, '<!doctype html><html><body><h1>No assets</h1></body></html>', 'utf8')

  const logs = captureLogs()
  try {
    const result = await bootstrapRuntimeFromTemplateSite({
      site: SITE,
      template: createTemplate({
        durableSnapshotRootDirAbs: root,
        entryHtmlPath: entryRel,
        importManifestSummary: { assetsDirPath: null },
      }),
      deps: {
        runScopedImportPipeline: async () =>
          ({
            mode: 'pipeline',
            siteId: 'runtime-site-no-assets',
            siteVersionId: 'runtime-version-no-assets',
            versionNo: 1,
            artifactId: 'artifact-no-assets',
            preparedSite: { documents: [] },
            layoutModel: null,
            renderOutput: null,
            previewDocument: null,
            pipelineResult: { stages: [] },
            reporting: {},
          }) as any,
        writeOwnershipLink: async () => undefined,
        persistRawTemplateSiteArtifact: async () => ({
          artifactId: 'raw-artifact-no-assets',
          artifactType: 'raw_template_site',
          entryHtmlPath: entryRel,
          assetBasePath: 'nested/site',
          fileMap: {
            [entryRel]: { path: entryRel, mediaType: 'text/html; charset=utf-8', sizeBytes: 60, sha256: 'h-na' },
          },
          fileCount: 1,
        }),
      },
    })

    assert.equal(result.runtimeSiteId, 'runtime-site-no-assets')
    const optionalMissing = logs.infos.find((entry) =>
      String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_ASSETS_DIR_OPTIONAL_MISSING'),
    )
    assert.ok(optionalMissing)
    assert.equal(optionalMissing?.meta.assetsDirPresent, false)
    assert.equal(optionalMissing?.meta.sourceResolutionMode, 'durable')

    const resolved = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_RESOLVED'))
    assert.ok(resolved)
    assert.equal(resolved?.meta.assetsDirPath, null)
    assert.equal(resolved?.meta.assetsDirPresent, false)
  } finally {
    logs.restore()
  }
})

test('template bootstrap fails pre-pipeline validation when entry html is missing', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-preflight-missing-entry-'))
  fs.mkdirSync(path.resolve(root, 'nested/site/assets'), { recursive: true })

  const logs = captureLogs()
  try {
    await assert.rejects(
      bootstrapRuntimeFromTemplateSite({
        site: SITE,
        template: createTemplate({
          durableSnapshotRootDirAbs: root,
          entryHtmlPath: 'nested/site/missing.html',
          importManifestSummary: { assetsDirPath: 'nested/site/assets' },
        }),
      }),
      (error) => {
        assert.ok(error instanceof TemplateSiteRuntimeBootstrapError)
        assert.equal(error.code, 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING')
        assert.match(error.message, /Template source is unavailable for bootstrap/)
        return true
      },
    )

    const pipelineStarted = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STARTED'))
    assert.equal(Boolean(pipelineStarted), false)
  } finally {
    logs.restore()
  }
})

test('template bootstrap fails pre-pipeline validation when provided assets dir resolves outside snapshot root', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-preflight-assets-outside-'))
  const entryRel = 'nested/site/index.html'
  const entryAbs = path.resolve(root, entryRel)
  fs.mkdirSync(path.dirname(entryAbs), { recursive: true })
  fs.writeFileSync(entryAbs, '<!doctype html><html><body><h1>Outside assets</h1></body></html>', 'utf8')
  fs.mkdirSync(path.resolve(root, '..', 'outside-assets-dir'), { recursive: true })

  const logs = captureLogs()
  try {
    await assert.rejects(
      bootstrapRuntimeFromTemplateSite({
        site: SITE,
        template: createTemplate({
          durableSnapshotRootDirAbs: root,
          entryHtmlPath: entryRel,
          importManifestSummary: { assetsDirPath: '../outside-assets-dir' },
        }),
      }),
      (error) => {
        assert.ok(error instanceof TemplateSiteRuntimeBootstrapError)
        assert.equal(error.code, 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING')
        assert.match(error.message, /ASSETS_DIR_OUTSIDE_SNAPSHOT_ROOT/)
        return true
      },
    )

    const preflightMissing = logs.errors.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_MISSING'))
    assert.ok(preflightMissing)
    assert.equal(preflightMissing?.meta.issues?.[0]?.code, 'ASSETS_DIR_OUTSIDE_SNAPSHOT_ROOT')
  } finally {
    logs.restore()
  }
})
