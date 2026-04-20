import assert from 'node:assert/strict'
import test from 'node:test'

import { processTemplateZipIntakeJob } from '@/gnr8/template-intake/core/template-processing-job-service'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function createTemplate(seed: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: seed.id ?? '00000000-0000-4000-8000-000000000901',
    clientId: seed.clientId ?? '00000000-0000-4000-8000-000000000201',
    organizationId: seed.organizationId ?? '00000000-0000-4000-8000-000000000201',
    agencyId: seed.agencyId ?? '00000000-0000-4000-8000-000000000301',
    createdByUserId: seed.createdByUserId ?? '00000000-0000-4000-8000-000000000101',
    name: seed.name ?? 'Template One',
    slug: seed.slug ?? 'template-one',
    sourceType: 'zip_html',
    status: seed.status ?? 'processing',
    importHealth: seed.importHealth ?? 'degraded',
    previewImagePath: seed.previewImagePath ?? null,
    previewAvailable: seed.previewAvailable ?? false,
    previewIsFallback: seed.previewIsFallback ?? true,
    previewSource: seed.previewSource ?? 'html_snapshot',
    tags: seed.tags ?? [],
    sourceFilename: seed.sourceFilename ?? 'template.zip',
    sourceZipStorageBucket: seed.sourceZipStorageBucket ?? 'template-source-zips',
    sourceZipStorageKey: seed.sourceZipStorageKey ?? 'client/x/template/y/template.zip',
    entryHtmlPath: seed.entryHtmlPath ?? null,
    entryHtmlFileName: seed.entryHtmlFileName ?? null,
    templateType: seed.templateType ?? 'unknown',
    importSnapshotId: seed.importSnapshotId ?? null,
    durableSnapshotRootDirAbs: seed.durableSnapshotRootDirAbs ?? null,
    templateManifestSummary: seed.templateManifestSummary ?? null,
    diagnosticsSummary: seed.diagnosticsSummary ?? null,
    importManifestSummary: seed.importManifestSummary ?? null,
    version: seed.version ?? 1,
    visibility: 'private',
    createdAt: seed.createdAt ?? '2026-04-16T10:00:00.000Z',
    updatedAt: seed.updatedAt ?? '2026-04-16T10:01:00.000Z',
  }
}

test('processTemplateZipIntakeJob produces ready template on valid zip', async () => {
  const template = createTemplate()

  const result = await processTemplateZipIntakeJob({
    clientId: template.clientId,
    templateId: template.id,
    deps: {
      createImportManifest: () => ({ kind: 'import_manifest_v1', pages: [] } as never),
      getTemplateByIdForClient: async () => template,
      loadTemplateSourceZip: async () => new Uint8Array([1, 2, 3]),
      validateAndExtractTemplateZip: () => ({
        ok: true,
        diagnostics: [],
        snapshotId: 'template-zip-aaaaaaaaaaaaaaaa',
        validation: {
          ok: true,
          extractionRootDirAbs: '/tmp/template',
          entryHtmlPath: 'index.html',
          entryHtmlBytes: new Uint8Array([60, 104, 116, 109, 108, 62]),
          entryHtmlSelection: 'root_index',
          htmlCandidates: ['index.html'],
          extractedFilePaths: ['index.html', 'assets/styles.css'],
          assetsDirPath: 'assets',
          manifestPath: null,
          assetSummary: {
            fileCount: 2,
            imageCount: 0,
            stylesheetCount: 1,
            scriptCount: 0,
            otherCount: 0,
          },
        },
      }),
      readTemplateManifest: () => ({
        summary: {
          source: 'derived',
          name: 'Template One',
          description: null,
          tags: ['marketing'],
        },
        diagnostics: [],
      }),
      importTemplateUploadStaticSite: async () =>
        ({
          importDiagnostics: {
            issues: [],
            summary: {
              infoCount: 0,
              warningCount: 0,
              errorCount: 0,
              fatalCount: 0,
            },
          },
          assetRegistry: {
            files: [{ normalizedPath: 'assets/styles.css' }],
            references: [],
          },
          rawDomSnapshot: {
            documents: [{ path: 'index.html', text: '<html><body>Hello</body></html>' }],
          },
        }) as never,
      buildTemplatePreviewSummary: () => ({
        preview: {
          previewAvailable: false,
          previewIsFallback: true,
          previewSource: 'html_snapshot',
          previewImagePath: null,
          previewLabel: 'No preview available',
          entryHtmlFileName: 'index.html',
        },
        diagnostics: [],
      }),
      persistTemplateDurableSourceSnapshot: () => ({
        durableSnapshotRootDirAbs: '/durable/template/snapshot',
        durableEntryHtmlPathAbs: '/durable/template/snapshot/index.html',
      }),
      updateTemplateProcessingResult: async (input) =>
        createTemplate({
          id: template.id,
          status: input.status,
          importHealth: input.importHealth,
          entryHtmlPath: input.entryHtmlPath,
          entryHtmlFileName: input.entryHtmlFileName,
          templateType: input.templateType,
          tags: input.tags,
          importSnapshotId: input.importSnapshotId,
          durableSnapshotRootDirAbs: input.durableSnapshotRootDirAbs,
          diagnosticsSummary: input.diagnosticsSummary,
          templateManifestSummary: input.templateManifestSummary,
          importManifestSummary: input.importManifestSummary,
        }),
    },
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.status, 'ready')
  assert.equal(result.template.importHealth, 'degraded')
})

test('processTemplateZipIntakeJob marks template failed on invalid zip', async () => {
  const template = createTemplate()

  const result = await processTemplateZipIntakeJob({
    clientId: template.clientId,
    templateId: template.id,
    deps: {
      createImportManifest: () => ({ kind: 'import_manifest_v1', pages: [] } as never),
      getTemplateByIdForClient: async () => template,
      loadTemplateSourceZip: async () => new Uint8Array([9, 9, 9]),
      validateAndExtractTemplateZip: () => ({
        ok: false,
        diagnostics: [],
        snapshotId: 'template-zip-bbbbbbbbbbbbbbbb',
        validation: null,
        errorMessage: 'Invalid ZIP archive.',
      }),
      updateTemplateProcessingResult: async (input) =>
        createTemplate({
          status: input.status,
          importHealth: input.importHealth,
          diagnosticsSummary: input.diagnosticsSummary,
        }),
    },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.template?.status, 'failed')
  assert.equal(result.template?.importHealth, 'failed')
})
