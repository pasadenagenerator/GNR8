import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { ScopedImportPipelineFailureError } from '@/gnr8/site/scoped-import-pipeline'
import {
  TemplateSiteRuntimeBootstrapError,
  bootstrapRuntimeFromTemplateSite,
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
  const originalInfo = console.info
  const originalError = console.error
  console.info = ((message: unknown, meta: any) => {
    infos.push({ message, meta })
  }) as typeof console.info
  console.error = ((message: unknown, meta: any) => {
    errors.push({ message, meta })
  }) as typeof console.error
  return {
    infos,
    errors,
    restore: () => {
      console.info = originalInfo
      console.error = originalError
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

  const durableRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'template-bootstrap-zip-durable-'))
  const durableEntry = path.resolve(durableRoot, entryRel)
  fs.mkdirSync(path.dirname(durableEntry), { recursive: true })
  fs.writeFileSync(durableEntry, '<!doctype html><html><body><h1>Zip source</h1></body></html>', 'utf8')

  const logs = captureLogs()
  try {
    await bootstrapRuntimeFromTemplateSite({
      site: SITE,
      template: createTemplate({
        sourceZipStorageBucket: 'bucket',
        sourceZipStorageKey: 'key',
        entryHtmlPath: entryRel,
      }),
      deps: {
        loadTemplateSourceZip: async () => new Uint8Array([1, 2, 3]),
        validateAndExtractTemplateZip: () =>
          ({
            ok: true,
            validation: {
              extractionRootDirAbs: extractionRoot,
              entryHtmlPath: entryRel,
              extractedFilePaths: [entryRel],
            },
          }) as any,
        persistTemplateDurableSourceSnapshot: () => ({
          durableSnapshotRootDirAbs: durableRoot,
          durableEntryHtmlPathAbs: durableEntry,
        }),
        runScopedImportPipeline: async () =>
          ({
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
          }) as any,
        writeOwnershipLink: async () => undefined,
      },
    })

    const started = logs.infos.find((entry) => String(entry.message).includes('TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STARTED'))
    assert.ok(started)
    assert.equal(started?.meta.sourceResolutionMode, 'zip_reconstruction')
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
  } finally {
    logs.restore()
  }
})
