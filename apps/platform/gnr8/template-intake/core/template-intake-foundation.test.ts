import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { mapTemplateToListCard, sortTemplateCardsDeterministically } from '@/gnr8/template-intake/core/template-list-contract'
import { readTemplateManifest } from '@/gnr8/template-intake/core/template-manifest-reader'
import {
  deleteClientTemplateById,
  getClientTemplateById,
  runTemplateZipIntake,
  updateClientTemplateMetadata,
} from '@/gnr8/template-intake/core/template-intake-service'
import type { ImportDiagnosticIssue, ImportOutput } from '@/gnr8/import/import-contract'
import { validateZipEntryPaths } from '@/gnr8/template-intake/core/template-zip-validator'
import { buildTemplatePreviewSummary } from '@/gnr8/template-intake/preview/template-preview-summary'
import type { TemplateDiagnosticsSummary, TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function createTemplateRecord(seed: Partial<TemplateRecord> & { id: string; clientId: string; name: string; slug: string; sourceFilename: string }): TemplateRecord {
  return {
    id: seed.id,
    clientId: seed.clientId,
    organizationId: seed.organizationId ?? seed.clientId,
    agencyId: seed.agencyId ?? null,
    createdByUserId: seed.createdByUserId ?? null,
    name: seed.name,
    slug: seed.slug,
    sourceType: 'zip_html',
    status: seed.status ?? 'processing',
    importHealth: seed.importHealth ?? 'degraded',
    previewImagePath: seed.previewImagePath ?? null,
    previewAvailable: seed.previewAvailable ?? false,
    previewIsFallback: seed.previewIsFallback ?? true,
    previewSource: seed.previewSource ?? 'fallback',
    tags: seed.tags ?? [],
    sourceFilename: seed.sourceFilename,
    sourceZipStorageBucket: seed.sourceZipStorageBucket ?? null,
    sourceZipStorageKey: seed.sourceZipStorageKey ?? null,
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
    createdAt: seed.createdAt ?? '2026-04-15T10:00:00.000Z',
    updatedAt: seed.updatedAt ?? '2026-04-15T10:00:00.000Z',
  }
}

function createRepositoryStub() {
  const records = new Map<string, TemplateRecord>()
  let counter = 1

  return {
    repository: {
      async createTemplate(input: {
        clientId: string
        organizationId: string | null
        agencyId: string | null
        createdByUserId: string | null
        name: string
        slug: string
        sourceFilename: string
        entryHtmlPath: string | null
        entryHtmlFileName: string | null
        templateType: 'single_page' | 'multi_page' | 'unknown'
        tags: string[]
        status: 'uploaded' | 'processing' | 'ready' | 'failed'
        importHealth: 'clean' | 'degraded' | 'failed'
        templateManifestSummary: TemplateRecord['templateManifestSummary']
        diagnosticsSummary: TemplateDiagnosticsSummary | null
      }) {
        const id = `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`
        counter += 1
        const record = createTemplateRecord({
          id,
          clientId: input.clientId,
          organizationId: input.organizationId,
          agencyId: input.agencyId,
          createdByUserId: input.createdByUserId,
          name: input.name,
          slug: input.slug,
          sourceFilename: input.sourceFilename,
          entryHtmlPath: input.entryHtmlPath,
          entryHtmlFileName: input.entryHtmlFileName,
          templateType: input.templateType,
          tags: input.tags,
          status: input.status,
          importHealth: input.importHealth,
          templateManifestSummary: input.templateManifestSummary,
          diagnosticsSummary: input.diagnosticsSummary,
        })
        records.set(id, record)
        return record
      },
      async updateTemplateProcessingResult(input: {
        templateId: string
        status: 'uploaded' | 'processing' | 'ready' | 'failed'
        importHealth: 'clean' | 'degraded' | 'failed'
        entryHtmlPath: string | null
        entryHtmlFileName: string | null
        templateType: 'single_page' | 'multi_page' | 'unknown'
        preview: {
          previewAvailable: boolean
          previewIsFallback: boolean
          previewSource: 'rendered_capture' | 'html_snapshot' | 'fallback'
          previewImagePath: string | null
        }
        tags: string[]
        importSnapshotId: string | null
        durableSnapshotRootDirAbs: string | null
        diagnosticsSummary: TemplateDiagnosticsSummary
        templateManifestSummary: TemplateRecord['templateManifestSummary']
        importManifestSummary: TemplateRecord['importManifestSummary']
      }) {
        const existing = records.get(input.templateId)
        if (!existing) throw new Error('missing template for update')
        const updated: TemplateRecord = {
          ...existing,
          status: input.status,
          importHealth: input.importHealth,
          previewAvailable: input.preview.previewAvailable,
          previewIsFallback: input.preview.previewIsFallback,
          previewSource: input.preview.previewSource,
          previewImagePath: input.preview.previewImagePath,
          entryHtmlPath: input.entryHtmlPath,
          entryHtmlFileName: input.entryHtmlFileName,
          templateType: input.templateType,
          tags: input.tags,
          importSnapshotId: input.importSnapshotId,
          durableSnapshotRootDirAbs: input.durableSnapshotRootDirAbs,
          diagnosticsSummary: input.diagnosticsSummary,
          templateManifestSummary: input.templateManifestSummary,
          importManifestSummary: input.importManifestSummary,
          updatedAt: '2026-04-15T10:01:00.000Z',
        }
        records.set(input.templateId, updated)
        return updated
      },
      async listTemplatesForClient(input: { clientId: string; limit?: number }) {
        const filtered = [...records.values()].filter((row) => row.clientId === input.clientId)
        const sorted = filtered.sort((a, b) => {
          if (a.createdAt !== b.createdAt) return b.createdAt.localeCompare(a.createdAt)
          return b.id.localeCompare(a.id)
        })
        return sorted.slice(0, input.limit ?? 120)
      },
      async getTemplateByIdForClient(input: { clientId: string; templateId: string }) {
        const record = records.get(input.templateId)
        if (!record) return null
        return record.clientId === input.clientId ? record : null
      },
      async updateTemplateMetadataById(input: { clientId: string; templateId: string; name: string; tags: string[] }) {
        const existing = records.get(input.templateId)
        if (!existing || existing.clientId !== input.clientId) return null
        const updated: TemplateRecord = {
          ...existing,
          name: input.name,
          tags: input.tags,
          updatedAt: '2026-04-15T10:02:00.000Z',
        }
        records.set(input.templateId, updated)
        return updated
      },
      async deleteTemplateByIdForClient(input: { clientId: string; templateId: string }) {
        const existing = records.get(input.templateId)
        if (!existing || existing.clientId !== input.clientId) return null
        records.delete(input.templateId)
        return existing
      },
    },
    records,
  }
}

function createImportOutput(input: {
  status: 'ok' | 'failed'
  warningCount?: number
  errorCount?: number
  fatalCount?: number
  entryHtmlText?: string
  issues?: ImportDiagnosticIssue[]
  assetFiles?: Array<{ path: string; kind: 'image' | 'stylesheet' | 'script' | 'unknown' }>
  assetReferences?: ImportOutput['assetRegistry']['references']
}) {
  const issues = input.issues ?? []
  const assetFiles = input.assetFiles ?? []
  const assetReferences = input.assetReferences ?? []

  return {
    contractVersion: '1.1.1' as const,
    status: input.status,
    documentMeta: {
      execution: { requestId: 'template-intake-test' },
      source: {
        kind: 'single-entry-html' as const,
        entryHtmlPath: 'index.html',
        assetsDirPath: null,
      },
      fingerprints: {
        inputSpecSha256: 'spec',
        inputContentSha256: 'content',
      },
    },
    rawDomSnapshot: {
      documents: [
        {
          path: 'index.html',
          contentSha256: 'content',
          byteLength: 10,
          decoding: { encoding: 'utf-8' as const, hadDecodingErrors: false },
          text: input.entryHtmlText ?? '<!doctype html><html><body>Hello</body></html>',
          dom: {
            serializedDom: '<html><body>Hello</body></html>',
            nodeCount: 3,
            parseWarnings: [],
          },
        },
      ],
    },
    assetRegistry: {
      assetsDirPath: null,
      files: assetFiles.map((file) => ({
        path: file.path,
        kind: file.kind,
        mediaType: null,
        byteLength: 100,
        contentSha256: 'asset-sha',
      })),
      references: assetReferences,
    },
    importDiagnostics: {
      issues,
      summary: {
        infoCount: 0,
        warningCount: input.warningCount ?? issues.filter((issue) => issue.severity === 'warning').length,
        errorCount: input.errorCount ?? issues.filter((issue) => issue.severity === 'error').length,
        fatalCount: input.fatalCount ?? issues.filter((issue) => issue.severity === 'fatal').length,
      },
    },
  }
}

test('ZIP upload with valid index.html creates template record', async () => {
  const { repository } = createRepositoryStub()
  const extractionRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), 'template-intake-durable-source-'))
  const durableRootDirAbs = fs.mkdtempSync(path.join(os.tmpdir(), 'template-intake-durable-root-'))
  const previousDurableRoot = process.env.GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS
  process.env.GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS = durableRootDirAbs
  fs.writeFileSync(path.join(extractionRootDirAbs, 'index.html'), '<!doctype html><html><body>Template</body></html>', 'utf8')

  try {
    const result = await runTemplateZipIntake({
      actorUserId: '00000000-0000-4000-8000-000000000101',
      clientId: '00000000-0000-4000-8000-000000000201',
      organizationId: '00000000-0000-4000-8000-000000000201',
      agencyId: '00000000-0000-4000-8000-000000000301',
      uploadedZip: {
        fileName: 'portfolio-template.zip',
        bytes: new Uint8Array([1, 2, 3]),
      },
      repository,
      zipValidator: () => ({
        ok: true,
        diagnostics: [],
        errorMessage: null,
        snapshotId: 'template-zip-abc123',
        zipFileAbsPath: '/tmp/template.zip',
        validation: {
          ok: true,
          extractionRootDirAbs,
          entryHtmlPath: 'index.html',
          entryHtmlSelection: 'root_index',
          htmlCandidates: ['index.html'],
          assetsDirPath: 'assets',
          manifestPath: null,
          assetSummary: {
            fileCount: 1,
            imageCount: 0,
            stylesheetCount: 0,
            scriptCount: 0,
            otherCount: 1,
          },
        },
      }),
      importRunner: async () => createImportOutput({ status: 'ok' }),
      importManifestBuilder: () => ({
        manifestVersion: '1.0.0' as const,
        contractVersion: '1.1.1' as const,
        status: 'success',
        outputStatus: 'ok',
        rootDirPath: null,
        entryHtmlPath: 'index.html',
        sourceKind: 'single-entry-html',
        htmlFilePaths: [],
        assetsDirPath: 'assets',
        fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
        diagnostics: { totalCount: 0, infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0, codes: [] },
        dom: {
          documentCount: 1,
          documentsWithDomCount: 1,
          nodeCount: 10,
          parseWarningCount: 0,
          decodingErrorCount: 0,
          effectivelyEmpty: false,
          documentPaths: ['index.html'],
        },
        assets: {
          totalAssetFiles: 0,
          totalAssets: 0,
          referencesByAssetKind: { image: 0, stylesheet: 0, script: 0, unknown: 0 },
          referencesByReferenceKind: {
            relative_local: 0,
            root_relative: 0,
            absolute_url: 0,
            data_url: 0,
            empty_invalid: 0,
          },
          referencesByValidationStatus: {
            ok: 0,
            invalid_asset_reference: 0,
            unsupported_remote_asset: 0,
            unsupported_data_url_asset: 0,
            path_traversal_blocked: 0,
            missing_local_asset: 0,
          },
          existingLocalCount: 0,
          missingLocalCount: 0,
          references: [],
        },
      }),
    })

    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.template.status, 'ready')
    assert.equal(result.template.importSnapshotId, 'template-zip-abc123')
    assert.equal(result.template.entryHtmlPath, 'index.html')
    assert.equal(result.template.entryHtmlFileName, 'index.html')
    assert.equal(result.template.templateType, 'single_page')
    assert.equal(Boolean(result.template.durableSnapshotRootDirAbs), true)
    assert.equal(result.template.durableSnapshotRootDirAbs?.startsWith(durableRootDirAbs), true)
    const durableEntryPath = path.resolve(result.template.durableSnapshotRootDirAbs ?? '', 'index.html')
    assert.equal(fs.existsSync(durableEntryPath), true)
  } finally {
    if (previousDurableRoot === undefined) delete process.env.GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS
    else process.env.GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS = previousDurableRoot
    fs.rmSync(extractionRootDirAbs, { recursive: true, force: true })
    fs.rmSync(durableRootDirAbs, { recursive: true, force: true })
  }
})

test('Missing manifest derives name from filename', () => {
  const result = readTemplateManifest({
    extractionRootDirAbs: '/tmp/unused',
    sourceFilename: 'restaurant-landing.zip',
    manifestPath: null,
  })

  assert.equal(result.summary.source, 'derived')
  assert.equal(result.summary.name, 'Restaurant Landing')
})

test('Manifest tags normalize and dedupe deterministically', () => {
  const tmp = fs.mkdtempSync(path.resolve(os.tmpdir(), 'template-manifest-test-'))
  try {
    fs.writeFileSync(
      path.resolve(tmp, 'template.json'),
      JSON.stringify({
        name: '  Sample Theme  ',
        tags: [' Portfolio ', 'portfolio', 'PORTFOLIO', 'dark mode'],
      }),
      'utf8',
    )

    const result = readTemplateManifest({
      extractionRootDirAbs: tmp,
      sourceFilename: 'sample-theme.zip',
      manifestPath: 'template.json',
    })

    assert.deepEqual(result.summary.tags, ['dark-mode', 'portfolio'])
    assert.equal(result.slug, 'sample-theme')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('Unsafe ZIP path traversal is blocked', () => {
  const validation = validateZipEntryPaths(['index.html', '../etc/passwd', '/tmp/file'])
  assert.deepEqual(validation.safeEntries, ['index.html'])
  assert.deepEqual(validation.unsafeEntries, ['../etc/passwd', '/tmp/file'])
})

test('Missing HTML fails truthfully', async () => {
  const { repository } = createRepositoryStub()
  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'broken.zip',
      bytes: new Uint8Array([9]),
    },
    repository,
    zipValidator: () => ({
      ok: false,
      diagnostics: [],
      errorMessage: 'ZIP must include at least one HTML file (preferably index.html).',
      snapshotId: 'template-zip-broken',
      zipFileAbsPath: '/tmp/broken.zip',
      validation: null,
    }),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 'failed')
  assert.match(result.errorMessage, /HTML file/i)
})

test('Import degraded maps template health to degraded', async () => {
  const { repository } = createRepositoryStub()

  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'shop-template.zip',
      bytes: new Uint8Array([1, 1, 1]),
    },
    repository,
    zipValidator: () => ({
      ok: true,
      diagnostics: [],
      errorMessage: null,
      snapshotId: 'template-zip-shop',
      zipFileAbsPath: '/tmp/template.zip',
      validation: {
        ok: true,
        extractionRootDirAbs: '/tmp/template',
        entryHtmlPath: 'index.html',
        entryHtmlSelection: 'root_index',
        htmlCandidates: ['index.html'],
        assetsDirPath: 'assets',
        manifestPath: null,
        assetSummary: {
          fileCount: 1,
          imageCount: 0,
          stylesheetCount: 0,
          scriptCount: 0,
          otherCount: 1,
        },
      },
    }),
    importRunner: async () => createImportOutput({ status: 'ok', warningCount: 1 }),
    importManifestBuilder: () => ({
      manifestVersion: '1.0.0' as const,
      contractVersion: '1.1.1' as const,
      status: 'success_with_warnings',
      outputStatus: 'ok',
      rootDirPath: null,
      entryHtmlPath: 'index.html',
      sourceKind: 'single-entry-html',
      htmlFilePaths: [],
      assetsDirPath: 'assets',
      fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
      diagnostics: { totalCount: 1, infoCount: 0, warningCount: 1, errorCount: 0, fatalCount: 0, codes: ['INPUT_INVALID'] },
      dom: {
        documentCount: 1,
        documentsWithDomCount: 1,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingErrorCount: 0,
        effectivelyEmpty: false,
        documentPaths: ['index.html'],
      },
      assets: {
        totalAssetFiles: 0,
        totalAssets: 0,
        referencesByAssetKind: { image: 0, stylesheet: 0, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          relative_local: 0,
          root_relative: 0,
          absolute_url: 0,
          data_url: 0,
          empty_invalid: 0,
        },
        referencesByValidationStatus: {
          ok: 0,
          invalid_asset_reference: 0,
          unsupported_remote_asset: 0,
          unsupported_data_url_asset: 0,
          path_traversal_blocked: 0,
          missing_local_asset: 0,
        },
        existingLocalCount: 0,
        missingLocalCount: 0,
        references: [],
      },
    }),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.importHealth, 'degraded')
})

test('Import clean persists ready/clean status truth', async () => {
  const { repository, records } = createRepositoryStub()

  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'clean-template.zip',
      bytes: new Uint8Array([1, 2, 3]),
    },
    repository,
    zipValidator: () => ({
      ok: true,
      diagnostics: [],
      errorMessage: null,
      snapshotId: 'template-zip-clean',
      zipFileAbsPath: '/tmp/template.zip',
      validation: {
        ok: true,
        extractionRootDirAbs: '/tmp/template',
        entryHtmlPath: 'index.html',
        entryHtmlSelection: 'root_index',
        htmlCandidates: ['index.html'],
        assetsDirPath: 'assets',
        manifestPath: null,
        assetSummary: {
          fileCount: 2,
          imageCount: 0,
          stylesheetCount: 1,
          scriptCount: 0,
          otherCount: 1,
        },
      },
    }),
    importRunner: async () =>
      createImportOutput({
        status: 'ok',
        assetFiles: [{ path: 'assets/site.css', kind: 'stylesheet' }],
        assetReferences: [
          {
            id: 'asset-ref-1',
            fromDocumentPath: 'index.html',
            tag: 'link',
            occurrence: 0,
            attribute: 'href',
            rawRef: './assets/site.css',
            assetKind: 'stylesheet',
            referenceKind: 'relative_local',
            resolvedPath: 'assets/site.css',
            existence: 'exists',
            validationStatus: 'ok',
          },
        ],
      }),
    importManifestBuilder: () => ({
      manifestVersion: '1.0.0' as const,
      contractVersion: '1.1.1' as const,
      status: 'success',
      outputStatus: 'ok',
      rootDirPath: null,
      entryHtmlPath: 'index.html',
      sourceKind: 'single-entry-html',
      htmlFilePaths: ['index.html'],
      assetsDirPath: 'assets',
      fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
      diagnostics: { totalCount: 0, infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0, codes: [] },
      dom: {
        documentCount: 1,
        documentsWithDomCount: 1,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingErrorCount: 0,
        effectivelyEmpty: false,
        documentPaths: ['index.html'],
      },
      assets: {
        totalAssetFiles: 1,
        totalAssets: 1,
        referencesByAssetKind: { image: 0, stylesheet: 1, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          relative_local: 1,
          root_relative: 0,
          absolute_url: 0,
          data_url: 0,
          empty_invalid: 0,
        },
        referencesByValidationStatus: {
          ok: 1,
          invalid_asset_reference: 0,
          unsupported_remote_asset: 0,
          unsupported_data_url_asset: 0,
          path_traversal_blocked: 0,
          missing_local_asset: 0,
        },
        existingLocalCount: 1,
        missingLocalCount: 0,
        references: [],
      },
    }),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.status, 'ready')
  assert.equal(result.template.importHealth, 'clean')

  const persisted = records.get(result.template.id)
  assert.ok(persisted)
  assert.equal(persisted?.status, 'ready')
  assert.equal(persisted?.importHealth, 'clean')
})

test('A. Valid HTML-only template remains ready and degraded in template intake mode', async () => {
  const { repository } = createRepositoryStub()

  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'html-only.zip',
      bytes: new Uint8Array([1, 1, 1]),
    },
    repository,
    zipValidator: () => ({
      ok: true,
      diagnostics: [],
      errorMessage: null,
      snapshotId: 'template-zip-html-only',
      zipFileAbsPath: '/tmp/template.zip',
      validation: {
        ok: true,
        extractionRootDirAbs: '/tmp/template',
        entryHtmlPath: 'index.html',
        entryHtmlSelection: 'root_index',
        htmlCandidates: ['index.html'],
        assetsDirPath: null,
        manifestPath: null,
        assetSummary: {
          fileCount: 1,
          imageCount: 0,
          stylesheetCount: 0,
          scriptCount: 0,
          otherCount: 1,
        },
      },
    }),
    importRunner: async () => createImportOutput({ status: 'ok' }),
    importManifestBuilder: () => ({
      manifestVersion: '1.0.0' as const,
      contractVersion: '1.1.1' as const,
      status: 'success',
      outputStatus: 'ok',
      rootDirPath: null,
      entryHtmlPath: 'index.html',
      sourceKind: 'single-entry-html',
      htmlFilePaths: ['index.html'],
      assetsDirPath: null,
      fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
      diagnostics: { totalCount: 0, infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0, codes: [] },
      dom: {
        documentCount: 1,
        documentsWithDomCount: 1,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingErrorCount: 0,
        effectivelyEmpty: false,
        documentPaths: ['index.html'],
      },
      assets: {
        totalAssetFiles: 0,
        totalAssets: 0,
        referencesByAssetKind: { image: 0, stylesheet: 0, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          relative_local: 0,
          root_relative: 0,
          absolute_url: 0,
          data_url: 0,
          empty_invalid: 0,
        },
        referencesByValidationStatus: {
          ok: 0,
          invalid_asset_reference: 0,
          unsupported_remote_asset: 0,
          unsupported_data_url_asset: 0,
          path_traversal_blocked: 0,
          missing_local_asset: 0,
        },
        existingLocalCount: 0,
        missingLocalCount: 0,
        references: [],
      },
    }),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.status, 'ready')
  assert.equal(result.template.importHealth, 'degraded')
  assert.equal(result.template.previewAvailable, false)
  assert.equal(result.template.previewSource, 'html_snapshot')
})

test('A. Beauty Clinic nested single-entry ZIP persists ready/degraded and keeps html_snapshot no-preview truth', async () => {
  const { repository } = createRepositoryStub()

  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'Beauty Clinic & Salon Landing Page.html.zip',
      bytes: new Uint8Array([2, 2, 2]),
    },
    repository,
    zipValidator: () => ({
      ok: true,
      diagnostics: [],
      errorMessage: null,
      snapshotId: 'template-zip-beauty-clinic',
      zipFileAbsPath: '/tmp/template.zip',
      validation: {
        ok: true,
        extractionRootDirAbs: '/tmp/template',
        entryHtmlPath: 'Beauty Clinic & Salon Landing Page.html',
        entryHtmlSelection: 'single_file_fallback',
        htmlCandidates: ['Beauty Clinic & Salon Landing Page.html'],
        assetsDirPath: null,
        manifestPath: null,
        assetSummary: {
          fileCount: 1,
          imageCount: 0,
          stylesheetCount: 0,
          scriptCount: 0,
          otherCount: 1,
        },
      },
    }),
    importRunner: async () => createImportOutput({ status: 'ok', warningCount: 1 }),
    importManifestBuilder: () => ({
      manifestVersion: '1.0.0' as const,
      contractVersion: '1.1.1' as const,
      status: 'success_with_warnings',
      outputStatus: 'ok',
      rootDirPath: null,
      entryHtmlPath: 'Beauty Clinic & Salon Landing Page.html',
      sourceKind: 'single-entry-html',
      htmlFilePaths: ['Beauty Clinic & Salon Landing Page.html'],
      assetsDirPath: null,
      fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
      diagnostics: { totalCount: 1, infoCount: 0, warningCount: 1, errorCount: 0, fatalCount: 0, codes: ['INPUT_INVALID'] },
      dom: {
        documentCount: 1,
        documentsWithDomCount: 1,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingErrorCount: 0,
        effectivelyEmpty: false,
        documentPaths: ['Beauty Clinic & Salon Landing Page.html'],
      },
      assets: {
        totalAssetFiles: 0,
        totalAssets: 0,
        referencesByAssetKind: { image: 0, stylesheet: 0, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          relative_local: 0,
          root_relative: 0,
          absolute_url: 0,
          data_url: 0,
          empty_invalid: 0,
        },
        referencesByValidationStatus: {
          ok: 0,
          invalid_asset_reference: 0,
          unsupported_remote_asset: 0,
          unsupported_data_url_asset: 0,
          path_traversal_blocked: 0,
          missing_local_asset: 0,
        },
        existingLocalCount: 0,
        missingLocalCount: 0,
        references: [],
      },
    }),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.status, 'ready')
  assert.equal(result.template.importHealth, 'degraded')
  assert.equal(result.template.previewSource, 'html_snapshot')
  assert.equal(result.template.previewAvailable, false)
  assert.equal(result.template.sourceType, 'zip_html')
})

test('B. Inline CSS template remains non-failed (degraded allowed)', async () => {
  const { repository } = createRepositoryStub()

  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'inline-style.zip',
      bytes: new Uint8Array([1, 1, 1]),
    },
    repository,
    zipValidator: () => ({
      ok: true,
      diagnostics: [],
      errorMessage: null,
      snapshotId: 'template-zip-inline-style',
      zipFileAbsPath: '/tmp/template.zip',
      validation: {
        ok: true,
        extractionRootDirAbs: '/tmp/template',
        entryHtmlPath: 'index.html',
        entryHtmlSelection: 'root_index',
        htmlCandidates: ['index.html'],
        assetsDirPath: null,
        manifestPath: null,
        assetSummary: {
          fileCount: 1,
          imageCount: 0,
          stylesheetCount: 0,
          scriptCount: 0,
          otherCount: 1,
        },
      },
    }),
    importRunner: async () =>
      createImportOutput({
        status: 'ok',
        entryHtmlText: '<!doctype html><html><head><style>body{color:red;}</style></head><body>Hi</body></html>',
      }),
    importManifestBuilder: () => ({
      manifestVersion: '1.0.0' as const,
      contractVersion: '1.1.1' as const,
      status: 'success',
      outputStatus: 'ok',
      rootDirPath: null,
      entryHtmlPath: 'index.html',
      sourceKind: 'single-entry-html',
      htmlFilePaths: ['index.html'],
      assetsDirPath: null,
      fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
      diagnostics: { totalCount: 0, infoCount: 0, warningCount: 0, errorCount: 0, fatalCount: 0, codes: [] },
      dom: {
        documentCount: 1,
        documentsWithDomCount: 1,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingErrorCount: 0,
        effectivelyEmpty: false,
        documentPaths: ['index.html'],
      },
      assets: {
        totalAssetFiles: 0,
        totalAssets: 0,
        referencesByAssetKind: { image: 0, stylesheet: 0, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          relative_local: 0,
          root_relative: 0,
          absolute_url: 0,
          data_url: 0,
          empty_invalid: 0,
        },
        referencesByValidationStatus: {
          ok: 0,
          invalid_asset_reference: 0,
          unsupported_remote_asset: 0,
          unsupported_data_url_asset: 0,
          path_traversal_blocked: 0,
          missing_local_asset: 0,
        },
        existingLocalCount: 0,
        missingLocalCount: 0,
        references: [],
      },
    }),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.status, 'ready')
  assert.equal(result.template.importHealth, 'degraded')
})

test('C. Remote-only assets map to degraded (not failed)', async () => {
  const { repository } = createRepositoryStub()

  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'remote-assets.zip',
      bytes: new Uint8Array([1, 1, 1]),
    },
    repository,
    zipValidator: () => ({
      ok: true,
      diagnostics: [],
      errorMessage: null,
      snapshotId: 'template-zip-remote-assets',
      zipFileAbsPath: '/tmp/template.zip',
      validation: {
        ok: true,
        extractionRootDirAbs: '/tmp/template',
        entryHtmlPath: 'index.html',
        entryHtmlSelection: 'root_index',
        htmlCandidates: ['index.html'],
        assetsDirPath: null,
        manifestPath: null,
        assetSummary: {
          fileCount: 1,
          imageCount: 0,
          stylesheetCount: 0,
          scriptCount: 0,
          otherCount: 1,
        },
      },
    }),
    importRunner: async () =>
      createImportOutput({
        status: 'ok',
        issues: [
          {
            id: 'diag-1',
            severity: 'warning',
            code: 'unsupported_remote_asset',
            message: 'remote stylesheet unsupported',
            location: null,
            details: null,
          },
        ],
        assetReferences: [
          {
            id: 'asset-ref-1',
            fromDocumentPath: 'index.html',
            tag: 'link',
            occurrence: 0,
            attribute: 'href',
            rawRef: 'https://cdn.example.com/styles.css',
            assetKind: 'stylesheet',
            referenceKind: 'absolute_url',
            resolvedPath: null,
            existence: 'unknown',
            validationStatus: 'unsupported_remote_asset',
          },
        ],
      }),
    importManifestBuilder: () => ({
      manifestVersion: '1.0.0' as const,
      contractVersion: '1.1.1' as const,
      status: 'success_with_warnings',
      outputStatus: 'ok',
      rootDirPath: null,
      entryHtmlPath: 'index.html',
      sourceKind: 'single-entry-html',
      htmlFilePaths: ['index.html'],
      assetsDirPath: null,
      fingerprints: { inputSpecSha256: 'spec', inputContentSha256: 'content' },
      diagnostics: { totalCount: 1, infoCount: 0, warningCount: 1, errorCount: 0, fatalCount: 0, codes: ['unsupported_remote_asset'] },
      dom: {
        documentCount: 1,
        documentsWithDomCount: 1,
        nodeCount: 10,
        parseWarningCount: 0,
        decodingErrorCount: 0,
        effectivelyEmpty: false,
        documentPaths: ['index.html'],
      },
      assets: {
        totalAssetFiles: 0,
        totalAssets: 0,
        referencesByAssetKind: { image: 0, stylesheet: 1, script: 0, unknown: 0 },
        referencesByReferenceKind: {
          relative_local: 0,
          root_relative: 0,
          absolute_url: 1,
          data_url: 0,
          empty_invalid: 0,
        },
        referencesByValidationStatus: {
          ok: 0,
          invalid_asset_reference: 0,
          unsupported_remote_asset: 1,
          unsupported_data_url_asset: 0,
          path_traversal_blocked: 0,
          missing_local_asset: 0,
        },
        existingLocalCount: 0,
        missingLocalCount: 0,
        references: [],
      },
    }),
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.template.status, 'ready')
  assert.equal(result.template.importHealth, 'degraded')
})

test('D. Missing HTML fails template intake', async () => {
  const { repository } = createRepositoryStub()
  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'missing-html.zip',
      bytes: new Uint8Array([1]),
    },
    repository,
    zipValidator: () => ({
      ok: false,
      diagnostics: [],
      errorMessage: 'ZIP must include one HTML file.',
      snapshotId: 'template-zip-missing-html',
      zipFileAbsPath: '/tmp/template.zip',
      validation: null,
    }),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 'failed')
  assert.equal(result.importHealth, 'failed')
})

test('E. Multiple root HTML files fail template intake', async () => {
  const { repository } = createRepositoryStub()
  const result = await runTemplateZipIntake({
    actorUserId: '00000000-0000-4000-8000-000000000101',
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    uploadedZip: {
      fileName: 'ambiguous-entry.zip',
      bytes: new Uint8Array([1]),
    },
    repository,
    zipValidator: () => ({
      ok: false,
      diagnostics: [],
      errorMessage: 'ZIP has multiple HTML files; entry file is ambiguous.',
      snapshotId: 'template-zip-ambiguous',
      zipFileAbsPath: '/tmp/template.zip',
      validation: null,
    }),
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.status, 'failed')
  assert.equal(result.importHealth, 'failed')
})

test('Preview fallback is used when rendered screenshot is unavailable', () => {
  const preview = buildTemplatePreviewSummary({ screenshotPaths: [], entryHtmlPath: 'landing.html' })
  assert.equal(preview.preview.previewAvailable, false)
  assert.equal(preview.preview.previewIsFallback, true)
  assert.equal(preview.preview.previewSource, 'html_snapshot')
  assert.equal(preview.preview.entryHtmlFileName, 'landing.html')
})

test('Template list ordering is deterministic (newest first, id tie-break)', () => {
  const cards = sortTemplateCardsDeterministically([
    {
      id: 'a',
      name: 'A',
      slug: 'a',
      sourceType: 'zip_html',
      status: 'ready',
      importHealth: 'clean',
      tags: [],
      sourceFilename: 'a.zip',
      entryHtmlFileName: null,
      templateType: 'unknown',
      preview: { available: false, isFallback: true, source: 'fallback', imagePath: null },
      createdAt: '2026-04-14T10:00:00.000Z',
      updatedAt: '2026-04-14T10:00:00.000Z',
    },
    {
      id: 'c',
      name: 'C',
      slug: 'c',
      sourceType: 'zip_html',
      status: 'ready',
      importHealth: 'clean',
      tags: [],
      sourceFilename: 'c.zip',
      entryHtmlFileName: null,
      templateType: 'unknown',
      preview: { available: false, isFallback: true, source: 'fallback', imagePath: null },
      createdAt: '2026-04-15T10:00:00.000Z',
      updatedAt: '2026-04-15T10:00:00.000Z',
    },
    {
      id: 'b',
      name: 'B',
      slug: 'b',
      sourceType: 'zip_html',
      status: 'ready',
      importHealth: 'clean',
      tags: [],
      sourceFilename: 'b.zip',
      entryHtmlFileName: null,
      templateType: 'unknown',
      preview: { available: false, isFallback: true, source: 'fallback', imagePath: null },
      createdAt: '2026-04-15T10:00:00.000Z',
      updatedAt: '2026-04-15T10:00:00.000Z',
    },
  ])

  assert.deepEqual(
    cards.map((card) => card.id),
    ['c', 'b', 'a'],
  )
})

test('Read/list contract returns safe defaults when preview/tags are absent', () => {
  const mapped = mapTemplateToListCard(
    createTemplateRecord({
      id: 'x',
      clientId: '00000000-0000-4000-8000-000000000201',
      name: 'No Preview',
      slug: 'no-preview',
      sourceFilename: 'no-preview.zip',
      tags: undefined as unknown as string[],
      previewImagePath: '',
      previewAvailable: false,
      previewIsFallback: true,
      previewSource: 'html_snapshot',
      status: 'ready',
      importHealth: 'degraded',
    }),
  )

  assert.deepEqual(mapped.tags, [])
  assert.equal(mapped.preview.imagePath, null)
  assert.equal(mapped.preview.available, false)
  assert.equal(mapped.preview.isFallback, true)
  assert.equal(mapped.preview.source, 'html_snapshot')
  assert.equal(mapped.status, 'ready')
  assert.equal(mapped.importHealth, 'degraded')
  assert.equal(mapped.entryHtmlFileName, null)
  assert.equal(mapped.templateType, 'unknown')
})

test('Repository layer supports deterministic get template by id', async () => {
  const { repository } = createRepositoryStub()

  const created = await repository.createTemplate({
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    createdByUserId: '00000000-0000-4000-8000-000000000101',
    name: 'Initial',
    slug: 'initial',
    sourceFilename: 'initial.zip',
    entryHtmlPath: 'index.html',
    entryHtmlFileName: 'index.html',
    templateType: 'single_page',
    tags: ['alpha'],
    status: 'ready',
    importHealth: 'clean',
    templateManifestSummary: null,
    diagnosticsSummary: null,
  })

  const found = await getClientTemplateById({
    clientId: created.clientId,
    templateId: created.id,
    repository,
  })

  assert.ok(found)
  assert.equal(found?.id, created.id)
  assert.equal(found?.name, 'Initial')
})

test('Repository layer supports deterministic metadata update', async () => {
  const { repository } = createRepositoryStub()

  const created = await repository.createTemplate({
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    createdByUserId: '00000000-0000-4000-8000-000000000101',
    name: 'Old Name',
    slug: 'old-name',
    sourceFilename: 'old.zip',
    entryHtmlPath: 'index.html',
    entryHtmlFileName: 'index.html',
    templateType: 'single_page',
    tags: ['alpha'],
    status: 'ready',
    importHealth: 'clean',
    templateManifestSummary: null,
    diagnosticsSummary: null,
  })

  const updated = await updateClientTemplateMetadata({
    clientId: created.clientId,
    templateId: created.id,
    name: 'New Name',
    tags: ['brand', 'marketing'],
    repository,
  })

  assert.ok(updated)
  assert.equal(updated?.name, 'New Name')
  assert.deepEqual(updated?.tags, ['brand', 'marketing'])
})

test('Repository layer supports deterministic delete by id', async () => {
  const { repository } = createRepositoryStub()

  const created = await repository.createTemplate({
    clientId: '00000000-0000-4000-8000-000000000201',
    organizationId: '00000000-0000-4000-8000-000000000201',
    agencyId: '00000000-0000-4000-8000-000000000301',
    createdByUserId: '00000000-0000-4000-8000-000000000101',
    name: 'To Delete',
    slug: 'to-delete',
    sourceFilename: 'delete.zip',
    entryHtmlPath: 'index.html',
    entryHtmlFileName: 'index.html',
    templateType: 'single_page',
    tags: ['obsolete'],
    status: 'ready',
    importHealth: 'clean',
    templateManifestSummary: null,
    diagnosticsSummary: null,
  })

  const deleted = await deleteClientTemplateById({
    clientId: created.clientId,
    templateId: created.id,
    repository,
  })

  assert.ok(deleted)
  assert.equal(deleted?.id, created.id)

  const foundAfterDelete = await getClientTemplateById({
    clientId: created.clientId,
    templateId: created.id,
    repository,
  })
  assert.equal(foundAfterDelete, null)
})
