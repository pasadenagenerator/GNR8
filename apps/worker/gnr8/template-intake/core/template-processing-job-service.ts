import path from 'node:path'

import { createImportManifest } from '@/gnr8/import/import-manifest'
import type { ImportOutput } from '@/gnr8/import/import-contract'
import { runSemanticImportEngine } from '@/gnr8/import-semantic/semantic-import-engine'
import { createTemplateIntakeDiagnostic, summarizeTemplateDiagnostics } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'
import { normalizeTemplateTagsForStorage, readTemplateManifest } from '@/gnr8/template-intake/core/template-manifest-reader'
import {
  TEMPLATE_ZIP_MAX_BYTES,
  validateAndExtractTemplateZip,
} from '@/gnr8/template-intake/core/template-zip-validator'
import { importTemplateUploadStaticSite } from '@/gnr8/template-intake/core/template-upload-import-runner'
import {
  resolveTemplateFailureMessage,
  isTemplateProcessingReasonRetryable,
  type TemplateProcessingReasonCode,
} from '@/gnr8/template-intake/core/template-processing-reason-code'
import { buildTemplatePreviewSummary } from '@/gnr8/template-intake/preview/template-preview-summary'
import { persistTemplateDurableSourceSnapshot } from '@/gnr8/template-intake/storage/template-durable-source'
import {
  getTemplateByIdForClient,
  updateTemplateProcessingResult,
} from '@/gnr8/template-intake/storage/template-repository'
import { loadTemplateSourceZip } from '@/gnr8/template-intake/storage/template-source-zip-storage'
import type {
  TemplateDiagnosticsSummary,
  TemplateImportHealth,
  TemplateIntakeDiagnostic,
  TemplateRecord,
  TemplateType,
} from '@/gnr8/template-intake/types/template-intake-types'

const LENIENT_ASSET_DIAGNOSTIC_CODES = new Set(['missing_local_asset', 'unsupported_remote_asset', 'unsupported_data_url_asset'])

type TemplateProcessingDeps = {
  createImportManifest: typeof createImportManifest
  getTemplateByIdForClient: typeof getTemplateByIdForClient
  updateTemplateProcessingResult: typeof updateTemplateProcessingResult
  loadTemplateSourceZip: typeof loadTemplateSourceZip
  validateAndExtractTemplateZip: typeof validateAndExtractTemplateZip
  readTemplateManifest: typeof readTemplateManifest
  importTemplateUploadStaticSite: typeof importTemplateUploadStaticSite
  buildTemplatePreviewSummary: typeof buildTemplatePreviewSummary
  persistTemplateDurableSourceSnapshot: typeof persistTemplateDurableSourceSnapshot
  runSemanticImportEngine: typeof runSemanticImportEngine
}

const DEFAULT_DEPS: TemplateProcessingDeps = {
  createImportManifest,
  getTemplateByIdForClient,
  updateTemplateProcessingResult,
  loadTemplateSourceZip,
  validateAndExtractTemplateZip,
  readTemplateManifest,
  importTemplateUploadStaticSite,
  buildTemplatePreviewSummary,
  persistTemplateDurableSourceSnapshot,
  runSemanticImportEngine,
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function hasInlineStyleEvidence(importOutput: ImportOutput): boolean {
  return importOutput.rawDomSnapshot.documents.some((doc) => {
    const html = normalizeText(doc.text)
    if (!html) return false
    return /<style(\s|>)/i.test(html) || /\sstyle\s*=\s*/i.test(html)
  })
}

function pickImportHealth(input: {
  warningCount: number
  errorCount: number
  hasLenientSignals: boolean
}): TemplateImportHealth {
  if (input.warningCount > 0 || input.errorCount > 0 || input.hasLenientSignals) return 'degraded'
  return 'clean'
}

function resolveTemplateEntryMetadata(input: {
  entryHtmlPath: string | null
  htmlCandidates: string[]
}): {
  entryHtmlPath: string | null
  entryHtmlFileName: string | null
  templateType: TemplateType
} {
  const entryHtmlPath = normalizeText(input.entryHtmlPath) || null
  const entryHtmlFileName = entryHtmlPath ? path.posix.basename(entryHtmlPath.replaceAll('\\', '/')) : null
  const hasExactlyOneRootHtml = Array.isArray(input.htmlCandidates) && input.htmlCandidates.length === 1
  return {
    entryHtmlPath,
    entryHtmlFileName,
    templateType: entryHtmlPath && hasExactlyOneRootHtml ? 'single_page' : 'unknown',
  }
}

function buildLenientTemplateIntakeWarnings(input: {
  importOutput: ImportOutput
}): TemplateIntakeDiagnostic[] {
  const diagnostics: TemplateIntakeDiagnostic[] = []

  const referencedLocalAssetCount = new Set(
    input.importOutput.assetRegistry.references
      .filter((reference) => reference.validationStatus === 'ok' && reference.existence === 'exists')
      .map((reference) => reference.resolvedPath)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  ).size
  const localAssetCount = Math.max(input.importOutput.assetRegistry.files.length, referencedLocalAssetCount)
  const hasAssetValidationIssues = input.importOutput.importDiagnostics.issues.some((issue) => LENIENT_ASSET_DIAGNOSTIC_CODES.has(issue.code))
  if (localAssetCount === 0 || hasAssetValidationIssues) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_INTAKE_NO_ASSETS',
        severity: 'warning',
        message: 'No local assets were resolved during template intake; template remains usable in degraded mode.',
        details: {
          localAssetCount,
          hasAssetValidationIssues,
        },
      }),
    )
  }

  const hasInlineStyles = hasInlineStyleEvidence(input.importOutput)
  const stylesheetRefCount = input.importOutput.assetRegistry.references.filter((reference) => reference.assetKind === 'stylesheet').length
  if (!hasInlineStyles && stylesheetRefCount === 0) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_INTAKE_LOW_STYLE_COVERAGE',
        severity: 'warning',
        message: 'Style coverage is low because no inline or local stylesheet evidence was detected.',
        details: {
          hasInlineStyles,
          stylesheetRefCount,
        },
      }),
    )
  }

  return diagnostics
}

async function persistFailedTemplateResult(input: {
  deps: Pick<TemplateProcessingDeps, 'updateTemplateProcessingResult'>
  template: TemplateRecord
  entryMetadata: {
    entryHtmlPath: string | null
    entryHtmlFileName: string | null
    templateType: TemplateType
  }
  diagnosticsSummary: TemplateDiagnosticsSummary
  reasonCode: TemplateProcessingReasonCode
  errorMessage?: string
  importSnapshotId: string | null
  templateManifestSummary: TemplateRecord['templateManifestSummary']
  importManifestSummary: TemplateRecord['importManifestSummary']
}): Promise<TemplateRecord> {
  const message = normalizeText(input.errorMessage) || resolveTemplateFailureMessage(input.reasonCode)
  return input.deps.updateTemplateProcessingResult({
    templateId: input.template.id,
    status: 'failed',
    importHealth: 'failed',
    entryHtmlPath: input.entryMetadata.entryHtmlPath,
    entryHtmlFileName: input.entryMetadata.entryHtmlFileName,
    templateType: input.entryMetadata.templateType,
    preview: {
      previewAvailable: false,
      previewIsFallback: true,
      previewSource: 'html_snapshot',
      previewImagePath: null,
      previewLabel: 'No preview available',
      entryHtmlFileName: input.entryMetadata.entryHtmlFileName,
    },
    tags: [],
    importSnapshotId: input.importSnapshotId,
    durableSnapshotRootDirAbs: null,
    diagnosticsSummary: summarizeTemplateDiagnostics([
      ...input.diagnosticsSummary.issues,
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_IMPORT_FAILED',
        severity: 'fatal',
        message,
        details: {
          reasonCode: input.reasonCode,
        },
      }),
    ]),
    templateManifestSummary: input.templateManifestSummary ?? {
      source: 'derived',
      name: input.template.name,
      description: null,
      tags: [],
    },
    importManifestSummary: input.importManifestSummary,
    reasonCode: input.reasonCode,
    processingError: message,
  })
}

export async function processTemplateZipIntakeJob(input: {
  clientId: string
  templateId: string
  persistFailure?: boolean
  deps?: Partial<TemplateProcessingDeps>
}): Promise<{ ok: true; template: TemplateRecord } | { ok: false; template: TemplateRecord | null; error: string; reasonCode: TemplateProcessingReasonCode; retryable: boolean }> {
  const deps = {
    ...DEFAULT_DEPS,
    ...(input.deps ?? {}),
  }
  const persistFailure = input.persistFailure !== false

  const template = await deps.getTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
  if (!template) {
      return {
        ok: false,
        template: null,
        error: 'Template was not found for processing.',
        reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
        retryable: false,
      }
  }

  const sourceZipStorageBucket = normalizeText(template.sourceZipStorageBucket)
  const sourceZipStorageKey = normalizeText(template.sourceZipStorageKey)
  if (!sourceZipStorageBucket || !sourceZipStorageKey) {
    if (!persistFailure) {
      return {
        ok: false,
        template,
        error: 'Template source ZIP reference is missing.',
        reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
        retryable: false,
      }
    }
    const failed = await persistFailedTemplateResult({
      template,
      deps,
      entryMetadata: {
        entryHtmlPath: template.entryHtmlPath,
        entryHtmlFileName: template.entryHtmlFileName,
        templateType: template.templateType,
      },
      diagnosticsSummary: summarizeTemplateDiagnostics([
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_IMPORT_STARTED',
          severity: 'info',
          message: 'Template processing job started.',
        }),
      ]),
      reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
      errorMessage: 'Template source ZIP reference is missing.',
      importSnapshotId: template.importSnapshotId,
      templateManifestSummary: template.templateManifestSummary,
      importManifestSummary: template.importManifestSummary,
    })
    return {
      ok: false,
      template: failed,
      error: 'Template source ZIP reference is missing.',
      reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
      retryable: false,
    }
  }

  let uploadedZipBytes: Uint8Array
  try {
    uploadedZipBytes = await deps.loadTemplateSourceZip({
      bucket: sourceZipStorageBucket,
      key: sourceZipStorageKey,
    })
  } catch (error) {
    if (!persistFailure) {
      return {
        ok: false,
        template,
        error: error instanceof Error ? error.message : 'Failed to load template source ZIP.',
        reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
        retryable: false,
      }
    }
    const failed = await persistFailedTemplateResult({
      template,
      deps,
      entryMetadata: {
        entryHtmlPath: template.entryHtmlPath,
        entryHtmlFileName: template.entryHtmlFileName,
        templateType: template.templateType,
      },
      diagnosticsSummary: summarizeTemplateDiagnostics([
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_IMPORT_STARTED',
          severity: 'info',
          message: 'Template processing job started.',
        }),
      ]),
      reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to load template source ZIP.',
      importSnapshotId: template.importSnapshotId,
      templateManifestSummary: template.templateManifestSummary,
      importManifestSummary: template.importManifestSummary,
    })
    return {
      ok: false,
      template: failed,
      error: 'Failed to load template source ZIP.',
      reasonCode: 'TEMPLATE_STORAGE_WRITE_FAILED',
      retryable: false,
    }
  }

  const zipValidation = deps.validateAndExtractTemplateZip({
    fileName: template.sourceFilename,
    bytes: uploadedZipBytes,
    maxBytes: TEMPLATE_ZIP_MAX_BYTES,
  })

  const entryMetadata = resolveTemplateEntryMetadata({
    entryHtmlPath: zipValidation.validation?.entryHtmlPath ?? null,
    htmlCandidates: zipValidation.validation?.htmlCandidates ?? [],
  })

  const baseDiagnostics = summarizeTemplateDiagnostics([
    ...zipValidation.diagnostics,
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_IMPORT_STARTED',
      severity: 'info',
      message: 'Template processing job started.',
      details: {
        templateId: template.id,
      },
    }),
  ])

  const zipFailureReasonCode: TemplateProcessingReasonCode =
    zipValidation.errorMessage === 'ZIP file is empty.'
      ? 'TEMPLATE_ZIP_EMPTY'
      : zipValidation.errorMessage === 'ZIP must include one HTML file.'
        ? 'TEMPLATE_IMPORT_NO_HTML'
        : zipValidation.errorMessage === 'ZIP has multiple HTML files; entry file is ambiguous.'
          ? 'TEMPLATE_IMPORT_MULTIPLE_ENTRY_HTML'
          : zipValidation.errorMessage === 'Template entry HTML could not be resolved.'
            ? 'TEMPLATE_ENTRY_HTML_UNRESOLVED'
            : zipValidation.errorMessage === 'Template entry HTML could not be processed.'
              ? 'TEMPLATE_ZIP_UNREADABLE'
              : 'TEMPLATE_ZIP_INVALID'

  if (!zipValidation.ok || !zipValidation.validation || !zipValidation.validation.entryHtmlPath) {
    if (!persistFailure) {
      return {
        ok: false,
        template,
        error: zipValidation.errorMessage ?? 'Template ZIP validation failed.',
        reasonCode: zipFailureReasonCode,
        retryable: isTemplateProcessingReasonRetryable(zipFailureReasonCode),
      }
    }
    const failed = await persistFailedTemplateResult({
      template,
      deps,
      entryMetadata,
      diagnosticsSummary: baseDiagnostics,
      reasonCode: zipFailureReasonCode,
      errorMessage: zipValidation.errorMessage ?? 'Template ZIP validation failed.',
      importSnapshotId: zipValidation.snapshotId,
      templateManifestSummary: {
        source: 'derived',
        name: template.name,
        description: null,
        tags: [],
      },
      importManifestSummary: null,
    })
    return {
      ok: false,
      template: failed,
      error: zipValidation.errorMessage ?? 'Template ZIP validation failed.',
      reasonCode: zipFailureReasonCode,
      retryable: isTemplateProcessingReasonRetryable(zipFailureReasonCode),
    }
  }

  const manifest = deps.readTemplateManifest({
    extractionRootDirAbs: zipValidation.validation.extractionRootDirAbs,
    sourceFilename: template.sourceFilename,
    manifestPath: zipValidation.validation.manifestPath,
  })

  const importOutput = await deps.importTemplateUploadStaticSite({
    requestId: `template-intake-${template.id}`,
    entryHtmlPath: zipValidation.validation.entryHtmlPath,
    entryHtmlBytes: zipValidation.validation.entryHtmlBytes ?? new Uint8Array(),
    extractedFilePaths: zipValidation.validation.extractedFilePaths ?? [],
  })

  const hasEmptyHtmlIssue = importOutput.importDiagnostics.issues.some((issue) => issue.code === 'HTML_EMPTY')
  const hasFatalImportIssues = importOutput.importDiagnostics.issues.some((issue) => issue.severity === 'fatal')

  const previewSummary = deps.buildTemplatePreviewSummary({
    screenshotPaths: [],
    entryHtmlPath: zipValidation.validation.entryHtmlPath,
  })

  if (hasEmptyHtmlIssue || hasFatalImportIssues) {
    if (!persistFailure) {
      return {
        ok: false,
        template,
        error: hasEmptyHtmlIssue ? 'Template entry HTML is empty.' : 'Template import failed due to fatal diagnostics.',
        reasonCode: hasEmptyHtmlIssue ? 'TEMPLATE_IMPORT_NO_HTML' : 'TEMPLATE_IMPORT_FAILED',
        retryable: !hasEmptyHtmlIssue,
      }
    }
    const failed = await persistFailedTemplateResult({
      template,
      deps,
      entryMetadata,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...baseDiagnostics.issues,
        ...manifest.diagnostics,
        ...previewSummary.diagnostics,
      ]),
      reasonCode: hasEmptyHtmlIssue ? 'TEMPLATE_IMPORT_NO_HTML' : 'TEMPLATE_IMPORT_FAILED',
      errorMessage: hasEmptyHtmlIssue ? 'Template entry HTML is empty.' : 'Template import failed due to fatal diagnostics.',
      importSnapshotId: zipValidation.snapshotId,
      templateManifestSummary: manifest.summary,
      importManifestSummary: deps.createImportManifest(importOutput),
    })
    return {
      ok: false,
      template: failed,
      error: hasEmptyHtmlIssue ? 'Template entry HTML is empty.' : 'Template import failed due to fatal diagnostics.',
      reasonCode: hasEmptyHtmlIssue ? 'TEMPLATE_IMPORT_NO_HTML' : 'TEMPLATE_IMPORT_FAILED',
      retryable: !hasEmptyHtmlIssue,
    }
  }

  const lenientWarnings = buildLenientTemplateIntakeWarnings({ importOutput })
  const importHealth = pickImportHealth({
    warningCount: importOutput.importDiagnostics.summary.warningCount,
    errorCount: importOutput.importDiagnostics.summary.errorCount,
    hasLenientSignals: lenientWarnings.length > 0,
  })

  const importedEntryHtml =
    importOutput.rawDomSnapshot.documents.find((doc) => normalizeText(doc.path) === zipValidation.validation?.entryHtmlPath)?.text ??
    importOutput.rawDomSnapshot.documents[0]?.text ??
    ''

  let durableSnapshotRootDirAbs: string | null = null
  try {
    const persistedSource = deps.persistTemplateDurableSourceSnapshot({
      templateId: template.id,
      extractionRootDirAbs: zipValidation.validation.extractionRootDirAbs,
      entryHtmlPath: zipValidation.validation.entryHtmlPath,
      entryHtmlContent: importedEntryHtml,
      sourceFilePaths: zipValidation.validation.extractedFilePaths ?? [],
    })
    durableSnapshotRootDirAbs = persistedSource.durableSnapshotRootDirAbs
  } catch (error) {
    if (!persistFailure) {
      return {
        ok: false,
        template,
        error: error instanceof Error ? error.message : 'Template durable source snapshot could not be persisted.',
        reasonCode: 'TEMPLATE_SNAPSHOT_FAILED',
        retryable: true,
      }
    }
    const failed = await persistFailedTemplateResult({
      template,
      deps,
      entryMetadata,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...baseDiagnostics.issues,
        ...manifest.diagnostics,
        ...previewSummary.diagnostics,
      ]),
      reasonCode: 'TEMPLATE_SNAPSHOT_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Template durable source snapshot could not be persisted.',
      importSnapshotId: zipValidation.snapshotId,
      templateManifestSummary: manifest.summary,
      importManifestSummary: deps.createImportManifest(importOutput),
    })
    return {
      ok: false,
      template: failed,
      error: 'Template durable source snapshot could not be persisted.',
      reasonCode: 'TEMPLATE_SNAPSHOT_FAILED',
      retryable: true,
    }
  }

  const semanticImport = deps.runSemanticImportEngine({
    normalizedHtml: importedEntryHtml,
    entryHtmlPath: entryMetadata.entryHtmlPath ?? zipValidation.validation.entryHtmlPath,
    sourceFilename: template.sourceFilename,
    captureMode: 'raw_html_only',
    assetManifest: {
      files: importOutput.assetRegistry.files as unknown as Array<Record<string, unknown>>,
      references: importOutput.assetRegistry.references as unknown as Array<Record<string, unknown>>,
    },
  })

  const importManifestSummary = {
    ...deps.createImportManifest(importOutput),
    semanticImport,
  }
  const diagnosticsSummary = summarizeTemplateDiagnostics([
    ...baseDiagnostics.issues,
    ...manifest.diagnostics,
    ...lenientWarnings,
    ...previewSummary.diagnostics,
    createTemplateIntakeDiagnostic({
      code: importHealth === 'clean' ? 'TEMPLATE_IMPORT_COMPLETED' : 'TEMPLATE_IMPORT_DEGRADED',
      severity: importHealth === 'clean' ? 'info' : 'warning',
      message: importHealth === 'clean' ? 'Template import completed cleanly.' : 'Template import completed with degraded diagnostics.',
    }),
  ])

  const hasBootstrapSourceTruth = Boolean(
    normalizeText(entryMetadata.entryHtmlPath) &&
      (normalizeText(durableSnapshotRootDirAbs) || (sourceZipStorageBucket && sourceZipStorageKey)),
  )
  if (!hasBootstrapSourceTruth) {
    console.error('[template-intake] TEMPLATE_READY_WITHOUT_BOOTSTRAP_SOURCE', {
      templateId: template.id,
      durableSnapshotRootDirAbs: durableSnapshotRootDirAbs || null,
      sourceZipStorageBucket: sourceZipStorageBucket || null,
      sourceZipStorageKey: sourceZipStorageKey || null,
      entryHtmlPath: entryMetadata.entryHtmlPath,
    })
    if (!persistFailure) {
      return {
        ok: false,
        template,
        error: 'Template cannot be marked ready without bootstrap source truth.',
        reasonCode: 'TEMPLATE_FILE_MAP_EMPTY',
        retryable: false,
      }
    }
    const failed = await persistFailedTemplateResult({
      template,
      deps,
      entryMetadata,
      diagnosticsSummary,
      reasonCode: 'TEMPLATE_FILE_MAP_EMPTY',
      errorMessage: 'Template cannot be marked ready without bootstrap source truth.',
      importSnapshotId: zipValidation.snapshotId,
      templateManifestSummary: manifest.summary,
      importManifestSummary,
    })
    return {
      ok: false,
      template: failed,
      error: 'Template cannot be marked ready without bootstrap source truth.',
      reasonCode: 'TEMPLATE_FILE_MAP_EMPTY',
      retryable: false,
    }
  }

  const updated = await deps.updateTemplateProcessingResult({
    templateId: template.id,
    status: 'ready',
    importHealth,
    entryHtmlPath: entryMetadata.entryHtmlPath,
    entryHtmlFileName: entryMetadata.entryHtmlFileName,
    templateType: entryMetadata.templateType,
    preview: previewSummary.preview,
    tags: normalizeTemplateTagsForStorage(manifest.summary.tags),
    importSnapshotId: zipValidation.snapshotId,
    durableSnapshotRootDirAbs,
    diagnosticsSummary,
    templateManifestSummary: manifest.summary,
    importManifestSummary,
  })

  return {
    ok: true,
    template: updated,
  }
}
