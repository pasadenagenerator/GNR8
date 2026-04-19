import path from 'node:path'

import { createImportManifest } from '@/gnr8/import/import-manifest'
import type { ImportOutput } from '@/gnr8/import/import-contract'
import { createTemplateIntakeDiagnostic, summarizeTemplateDiagnostics } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'
import { readTemplateManifest, normalizeTemplateTagsForStorage } from '@/gnr8/template-intake/core/template-manifest-reader'
import {
  TEMPLATE_ZIP_MAX_BYTES,
  validateAndExtractTemplateZip,
} from '@/gnr8/template-intake/core/template-zip-validator'
import { importTemplateUploadStaticSite } from '@/gnr8/template-intake/core/template-upload-import-runner'
import { buildTemplatePreviewSummary } from '@/gnr8/template-intake/preview/template-preview-summary'
import { persistTemplateDurableSourceSnapshot } from '@/gnr8/template-intake/storage/template-durable-source'
import {
  createTemplate,
  deleteTemplateByIdForClient,
  getTemplateByIdForClient,
  listTemplatesForClient,
  updateTemplateMetadataById,
  updateTemplateProcessingResult,
} from '@/gnr8/template-intake/storage/template-repository'
import type {
  CreateTemplateInput,
  TemplateImportHealth,
  TemplateIntakeDiagnostic,
  TemplateIntakeMode,
  TemplateIntakeResult,
  TemplateRecord,
  TemplateType,
  UploadedZipTemplate,
} from '@/gnr8/template-intake/types/template-intake-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

const TEMPLATE_INTAKE_MODE: TemplateIntakeMode = 'template_intake'

const LENIENT_ASSET_DIAGNOSTIC_CODES = new Set(['missing_local_asset', 'unsupported_remote_asset', 'unsupported_data_url_asset'])

type TemplateRowStatusEvent =
  | 'TEMPLATE_ROW_CREATED_INITIAL'
  | 'TEMPLATE_ROW_FINAL_STATUS_COMPUTED'
  | 'TEMPLATE_ROW_UPDATED_FINAL'
  | 'TEMPLATE_ROW_FINAL_STATUS_READY'
  | 'TEMPLATE_ROW_FINAL_STATUS_DEGRADED'
  | 'TEMPLATE_ROW_FINAL_STATUS_FAILED'

type TemplateUploadIntakeEvent =
  | 'TEMPLATE_UPLOAD_REQUEST_RECEIVED'
  | 'TEMPLATE_UPLOAD_VALIDATION_RESULT'
  | 'TEMPLATE_UPLOAD_INITIAL_ROW_WRITTEN'
  | 'TEMPLATE_UPLOAD_FINAL_RESULT_COMPUTED'
  | 'TEMPLATE_UPLOAD_FINAL_ROW_WRITTEN'

function logTemplateSourcePersistenceEvent(input: {
  templateId: string
  sourceMode: 'durable'
  sourceRef: string
  sourceLoadedSuccessfully: boolean
}) {
  console.info('[template-intake] TEMPLATE_SOURCE_PERSISTED_DURABLY', {
    templateId: input.templateId,
    sourceMode: input.sourceMode,
    sourceRef: input.sourceRef,
    sourceLoadedSuccessfully: input.sourceLoadedSuccessfully,
  })
}

function logTemplateUploadIntakeEvent(input: {
  event: TemplateUploadIntakeEvent
  templateId: string | null
  zipValidationOk: boolean | null
  selectedEntryHtmlPath: string | null
  status: TemplateRecord['status'] | null
  importHealth: TemplateRecord['importHealth'] | null
  previewSource: TemplateRecord['previewSource'] | null
  previewAvailable: boolean | null
  uploadResponseOk: boolean | null
}) {
  console.info(`[template-upload] ${input.event}`, {
    templateId: input.templateId,
    zipValidationOk: input.zipValidationOk,
    selectedEntryHtmlPath: input.selectedEntryHtmlPath,
    status: input.status,
    importHealth: input.importHealth,
    previewSource: input.previewSource,
    previewAvailable: input.previewAvailable,
    uploadResponseOk: input.uploadResponseOk,
  })
}

function logTemplateRowStatusEvent(input: {
  event: TemplateRowStatusEvent
  templateId: string
  status: TemplateRecord['status']
  importHealth: TemplateRecord['importHealth']
  previewSource: TemplateRecord['previewSource']
  previewAvailable: boolean
}) {
  console.info(`[template-intake] ${input.event}`, {
    templateId: input.templateId,
    status: input.status,
    importHealth: input.importHealth,
    previewSource: input.previewSource,
    previewAvailable: input.previewAvailable,
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

function hasInlineStyleEvidence(importOutput: ImportOutput): boolean {
  return importOutput.rawDomSnapshot.documents.some((doc) => {
    const html = normalizeText(doc.text)
    if (!html) return false
    return /<style(\s|>)/i.test(html) || /\sstyle\s*=/i.test(html)
  })
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

export type TemplateRepository = {
  createTemplate: (input: CreateTemplateInput) => Promise<TemplateRecord>
  updateTemplateProcessingResult: typeof updateTemplateProcessingResult
  listTemplatesForClient: typeof listTemplatesForClient
  getTemplateByIdForClient: typeof getTemplateByIdForClient
  updateTemplateMetadataById: typeof updateTemplateMetadataById
  deleteTemplateByIdForClient: typeof deleteTemplateByIdForClient
}

const DEFAULT_REPOSITORY: TemplateRepository = {
  createTemplate,
  updateTemplateProcessingResult,
  listTemplatesForClient,
  getTemplateByIdForClient,
  updateTemplateMetadataById,
  deleteTemplateByIdForClient,
}

export async function runTemplateZipIntake(input: {
  actorUserId: string
  clientId: string
  organizationId: string | null
  agencyId: string | null
  uploadedZip: UploadedZipTemplate
  mode?: TemplateIntakeMode
  repository?: TemplateRepository
  zipValidator?: typeof validateAndExtractTemplateZip
  importRunner?: typeof importTemplateUploadStaticSite
  importManifestBuilder?: typeof createImportManifest
  previewBuilder?: typeof buildTemplatePreviewSummary
}): Promise<TemplateIntakeResult> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  const zipValidator = input.zipValidator ?? validateAndExtractTemplateZip
  const importRunner = input.importRunner ?? importTemplateUploadStaticSite
  const importManifestBuilder = input.importManifestBuilder ?? createImportManifest
  const previewBuilder = input.previewBuilder ?? buildTemplatePreviewSummary
  const intakeMode = input.mode ?? TEMPLATE_INTAKE_MODE
  logTemplateUploadIntakeEvent({
    event: 'TEMPLATE_UPLOAD_REQUEST_RECEIVED',
    templateId: null,
    zipValidationOk: null,
    selectedEntryHtmlPath: null,
    status: null,
    importHealth: null,
    previewSource: null,
    previewAvailable: null,
    uploadResponseOk: null,
  })

  const zipValidation = zipValidator({
    fileName: input.uploadedZip.fileName,
    bytes: input.uploadedZip.bytes,
    maxBytes: TEMPLATE_ZIP_MAX_BYTES,
  })
  const zipSummary = summarizeTemplateDiagnostics(zipValidation.diagnostics)
  const selectedEntryHtmlPath = normalizeText(zipValidation.validation?.entryHtmlPath) || null
  logTemplateUploadIntakeEvent({
    event: 'TEMPLATE_UPLOAD_VALIDATION_RESULT',
    templateId: null,
    zipValidationOk: zipValidation.ok,
    selectedEntryHtmlPath,
    status: null,
    importHealth: null,
    previewSource: null,
    previewAvailable: null,
    uploadResponseOk: null,
  })

  const optimisticName = normalizeText(input.uploadedZip.fileName).replace(/\.zip$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled Template'
  const optimisticSlug = optimisticName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'template'
  const entryMetadata = resolveTemplateEntryMetadata({
    entryHtmlPath: zipValidation.validation?.entryHtmlPath ?? null,
    htmlCandidates: zipValidation.validation?.htmlCandidates ?? [],
  })

  const initialTemplate = await repository.createTemplate({
    clientId: input.clientId,
    organizationId: input.organizationId,
    agencyId: input.agencyId,
    createdByUserId: normalizeText(input.actorUserId) || null,
    name: optimisticName,
    slug: optimisticSlug,
    sourceFilename: input.uploadedZip.fileName,
    entryHtmlPath: entryMetadata.entryHtmlPath,
    entryHtmlFileName: entryMetadata.entryHtmlFileName,
    templateType: entryMetadata.templateType,
    tags: [],
    status: zipValidation.ok ? 'processing' : 'failed',
    importHealth: zipValidation.ok ? 'degraded' : 'failed',
    templateManifestSummary: null,
    diagnosticsSummary: zipSummary,
  })
  logTemplateRowStatusEvent({
    event: 'TEMPLATE_ROW_CREATED_INITIAL',
    templateId: initialTemplate.id,
    status: initialTemplate.status,
    importHealth: initialTemplate.importHealth,
    previewSource: initialTemplate.previewSource,
    previewAvailable: initialTemplate.previewAvailable,
  })
  logTemplateUploadIntakeEvent({
    event: 'TEMPLATE_UPLOAD_INITIAL_ROW_WRITTEN',
    templateId: initialTemplate.id,
    zipValidationOk: zipValidation.ok,
    selectedEntryHtmlPath,
    status: initialTemplate.status,
    importHealth: initialTemplate.importHealth,
    previewSource: initialTemplate.previewSource,
    previewAvailable: initialTemplate.previewAvailable,
    uploadResponseOk: null,
  })

  const createDiagnosticSummary = summarizeTemplateDiagnostics([
    ...zipSummary.issues,
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_RECORD_CREATED',
      severity: 'info',
      message: 'Template record created before import processing.',
      details: { templateId: initialTemplate.id },
    }),
  ])
  let durableSnapshotRootDirAbs: string | null = null

  if (!zipValidation.ok || !zipValidation.validation) {
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_COMPUTED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: 'html_snapshot',
      previewAvailable: false,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_RESULT_COMPUTED',
      templateId: initialTemplate.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: 'failed',
      importHealth: 'failed',
      previewSource: 'html_snapshot',
      previewAvailable: false,
      uploadResponseOk: false,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_FAILED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: 'html_snapshot',
      previewAvailable: false,
    })
    const updated = await repository.updateTemplateProcessingResult({
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      entryHtmlPath: entryMetadata.entryHtmlPath,
      entryHtmlFileName: entryMetadata.entryHtmlFileName,
      templateType: entryMetadata.templateType,
      preview: {
        previewAvailable: false,
        previewIsFallback: true,
        previewSource: 'html_snapshot',
        previewImagePath: null,
        previewLabel: 'No preview available',
        entryHtmlFileName: null,
      },
      tags: [],
      importSnapshotId: zipValidation.snapshotId,
      durableSnapshotRootDirAbs,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...createDiagnosticSummary.issues,
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_RECORD_UPDATED',
          severity: 'info',
          message: 'Template record marked as failed during intake validation.',
        }),
      ]),
      templateManifestSummary: {
        source: 'derived',
        name: optimisticName,
        description: null,
        tags: [],
      },
      importManifestSummary: null,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_UPDATED_FINAL',
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_ROW_WRITTEN',
      templateId: updated.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
      uploadResponseOk: false,
    })

    return {
      ok: false,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      diagnosticsSummary: updated.diagnosticsSummary ?? createDiagnosticSummary,
      errorMessage: zipValidation.errorMessage ?? 'Template ZIP upload failed.',
    }
  }

  const manifest = readTemplateManifest({
    extractionRootDirAbs: zipValidation.validation.extractionRootDirAbs,
    sourceFilename: input.uploadedZip.fileName,
    manifestPath: zipValidation.validation.manifestPath,
  })

  const manifestSummary = summarizeTemplateDiagnostics(manifest.diagnostics)

  const entryHtmlPath = zipValidation.validation.entryHtmlPath
  if (!entryHtmlPath) {
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_COMPUTED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: 'html_snapshot',
      previewAvailable: false,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_RESULT_COMPUTED',
      templateId: initialTemplate.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: 'failed',
      importHealth: 'failed',
      previewSource: 'html_snapshot',
      previewAvailable: false,
      uploadResponseOk: false,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_FAILED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: 'html_snapshot',
      previewAvailable: false,
    })
    const updated = await repository.updateTemplateProcessingResult({
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      entryHtmlPath: entryMetadata.entryHtmlPath,
      entryHtmlFileName: entryMetadata.entryHtmlFileName,
      templateType: entryMetadata.templateType,
      preview: {
        previewAvailable: false,
        previewIsFallback: true,
        previewSource: 'html_snapshot',
        previewImagePath: null,
        previewLabel: 'No preview available',
        entryHtmlFileName: null,
      },
      tags: [],
      importSnapshotId: zipValidation.snapshotId,
      durableSnapshotRootDirAbs,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...createDiagnosticSummary.issues,
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_HTML_ENTRY_NOT_FOUND',
          severity: 'fatal',
          message: 'Template intake validation did not resolve a usable HTML entry file.',
        }),
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_RECORD_UPDATED',
          severity: 'info',
          message: 'Template record marked as failed during intake validation.',
        }),
      ]),
      templateManifestSummary: {
        source: 'derived',
        name: optimisticName,
        description: null,
        tags: [],
      },
      importManifestSummary: null,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_UPDATED_FINAL',
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_ROW_WRITTEN',
      templateId: updated.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
      uploadResponseOk: false,
    })

    return {
      ok: false,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      diagnosticsSummary: updated.diagnosticsSummary ?? createDiagnosticSummary,
      errorMessage: 'Template ZIP must include one deterministic root-level HTML entry file.',
    }
  }

  const intakeDiagnostics = summarizeTemplateDiagnostics([
    ...createDiagnosticSummary.issues,
    ...manifestSummary.issues,
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_IMPORT_STARTED',
      severity: 'info',
      message: 'Template import pipeline started.',
      details: {
        templateId: initialTemplate.id,
        snapshotId: zipValidation.snapshotId,
        entryHtmlPath,
        mode: intakeMode,
      },
    }),
  ])

  const importOutput = await importRunner({
    requestId: `template-intake-${initialTemplate.id}`,
    entryHtmlPath,
    entryHtmlBytes: zipValidation.validation.entryHtmlBytes ?? new Uint8Array(),
    extractedFilePaths: zipValidation.validation.extractedFilePaths ?? [],
  })

  const importManifest = importManifestBuilder(importOutput)
  const previewSummary = previewBuilder({ screenshotPaths: [], entryHtmlPath })
  const lenientWarnings = buildLenientTemplateIntakeWarnings({
    importOutput,
  })

  const hasEmptyHtmlIssue = importOutput.importDiagnostics.issues.some((issue) => issue.code === 'HTML_EMPTY')
  if (hasEmptyHtmlIssue) {
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_COMPUTED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: previewSummary.preview.previewSource,
      previewAvailable: previewSummary.preview.previewAvailable,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_RESULT_COMPUTED',
      templateId: initialTemplate.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: 'failed',
      importHealth: 'failed',
      previewSource: previewSummary.preview.previewSource,
      previewAvailable: previewSummary.preview.previewAvailable,
      uploadResponseOk: false,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_FAILED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: previewSummary.preview.previewSource,
      previewAvailable: previewSummary.preview.previewAvailable,
    })
    const updated = await repository.updateTemplateProcessingResult({
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      entryHtmlPath: entryMetadata.entryHtmlPath,
      entryHtmlFileName: entryMetadata.entryHtmlFileName,
      templateType: entryMetadata.templateType,
      preview: previewSummary.preview,
      tags: [],
      importSnapshotId: zipValidation.snapshotId,
      durableSnapshotRootDirAbs,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...intakeDiagnostics.issues,
        ...previewSummary.diagnostics,
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_INTAKE_EMPTY_HTML',
          severity: 'fatal',
          message: 'Template entry HTML is empty and cannot be accepted.',
          details: {
            entryHtmlPath,
            mode: intakeMode,
          },
        }),
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_RECORD_UPDATED',
          severity: 'info',
          message: 'Template record marked as failed during intake validation.',
        }),
      ]),
      templateManifestSummary: manifest.summary,
      importManifestSummary: importManifest,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_UPDATED_FINAL',
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_ROW_WRITTEN',
      templateId: updated.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
      uploadResponseOk: false,
    })

    return {
      ok: false,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      diagnosticsSummary: updated.diagnosticsSummary ?? intakeDiagnostics,
      errorMessage: 'Template entry HTML is empty.',
    }
  }

  const hasFatalImportIssues = importOutput.importDiagnostics.issues.some((issue) => issue.severity === 'fatal')
  if (hasFatalImportIssues) {
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_COMPUTED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: previewSummary.preview.previewSource,
      previewAvailable: previewSummary.preview.previewAvailable,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_RESULT_COMPUTED',
      templateId: initialTemplate.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: 'failed',
      importHealth: 'failed',
      previewSource: previewSummary.preview.previewSource,
      previewAvailable: previewSummary.preview.previewAvailable,
      uploadResponseOk: false,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_FINAL_STATUS_FAILED',
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      previewSource: previewSummary.preview.previewSource,
      previewAvailable: previewSummary.preview.previewAvailable,
    })
    const updated = await repository.updateTemplateProcessingResult({
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      entryHtmlPath: entryMetadata.entryHtmlPath,
      entryHtmlFileName: entryMetadata.entryHtmlFileName,
      templateType: entryMetadata.templateType,
      preview: previewSummary.preview,
      tags: [],
      importSnapshotId: zipValidation.snapshotId,
      durableSnapshotRootDirAbs,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...intakeDiagnostics.issues,
        ...previewSummary.diagnostics,
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_INTAKE_FATAL_IMPORT_DIAGNOSTIC',
          severity: 'fatal',
          message: 'Template intake failed due to fatal import diagnostics.',
          details: {
            fatalCount: importOutput.importDiagnostics.summary.fatalCount,
            mode: intakeMode,
          },
        }),
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_RECORD_UPDATED',
          severity: 'info',
          message: 'Template record marked as failed during intake validation.',
        }),
      ]),
      templateManifestSummary: manifest.summary,
      importManifestSummary: importManifest,
    })
    logTemplateRowStatusEvent({
      event: 'TEMPLATE_ROW_UPDATED_FINAL',
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
    })
    logTemplateUploadIntakeEvent({
      event: 'TEMPLATE_UPLOAD_FINAL_ROW_WRITTEN',
      templateId: updated.id,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      status: updated.status,
      importHealth: updated.importHealth,
      previewSource: updated.previewSource,
      previewAvailable: updated.previewAvailable,
      uploadResponseOk: false,
    })

    return {
      ok: false,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      diagnosticsSummary: updated.diagnosticsSummary ?? intakeDiagnostics,
      errorMessage: 'Template import failed.',
    }
  }

  const importHealth = pickImportHealth({
    warningCount: importOutput.importDiagnostics.summary.warningCount,
    errorCount: importOutput.importDiagnostics.summary.errorCount,
    hasLenientSignals: lenientWarnings.length > 0,
  })

  const importDiagnostics = summarizeTemplateDiagnostics([
    ...intakeDiagnostics.issues,
    ...lenientWarnings,
    ...(importHealth === 'failed'
      ? [
          createTemplateIntakeDiagnostic({
            code: 'TEMPLATE_IMPORT_FAILED',
            severity: 'error',
            message: 'Template import failed due to fatal importer diagnostics.',
            details: {
              fatalCount: importOutput.importDiagnostics.summary.fatalCount,
              errorCount: importOutput.importDiagnostics.summary.errorCount,
            },
          }),
        ]
      : importHealth === 'degraded'
        ? [
            createTemplateIntakeDiagnostic({
              code: 'TEMPLATE_IMPORT_DEGRADED',
              severity: 'warning',
              message: 'Template import completed in lenient mode with degraded diagnostics.',
              details: {
                warningCount: importOutput.importDiagnostics.summary.warningCount,
                errorCount: importOutput.importDiagnostics.summary.errorCount,
                mode: intakeMode,
              },
            }),
          ]
        : [
            createTemplateIntakeDiagnostic({
              code: 'TEMPLATE_IMPORT_COMPLETED',
              severity: 'info',
              message: 'Template import completed cleanly.',
            }),
          ]),
    ...previewSummary.diagnostics,
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_RECORD_UPDATED',
      severity: 'info',
      message: 'Template record updated with import result.',
    }),
  ])

  const importedEntryHtml =
    importOutput.rawDomSnapshot.documents.find((doc) => normalizeText(doc.path) === entryHtmlPath)?.text ??
    importOutput.rawDomSnapshot.documents[0]?.text ??
    ''

  try {
    const persistedSource = persistTemplateDurableSourceSnapshot({
      templateId: initialTemplate.id,
      extractionRootDirAbs: zipValidation.validation.extractionRootDirAbs,
      entryHtmlPath,
      entryHtmlContent: importedEntryHtml,
      sourceFilePaths: zipValidation.validation.extractedFilePaths ?? [],
    })
    durableSnapshotRootDirAbs = persistedSource.durableSnapshotRootDirAbs
    logTemplateSourcePersistenceEvent({
      templateId: initialTemplate.id,
      sourceMode: 'durable',
      sourceRef: durableSnapshotRootDirAbs,
      sourceLoadedSuccessfully: true,
    })
  } catch (error) {
    const updated = await repository.updateTemplateProcessingResult({
      templateId: initialTemplate.id,
      status: 'failed',
      importHealth: 'failed',
      entryHtmlPath: entryMetadata.entryHtmlPath,
      entryHtmlFileName: entryMetadata.entryHtmlFileName,
      templateType: entryMetadata.templateType,
      preview: {
        previewAvailable: false,
        previewIsFallback: true,
        previewSource: 'html_snapshot',
        previewImagePath: null,
        previewLabel: 'No preview available',
        entryHtmlFileName: null,
      },
      tags: [],
      importSnapshotId: zipValidation.snapshotId,
      durableSnapshotRootDirAbs: null,
      diagnosticsSummary: summarizeTemplateDiagnostics([
        ...importDiagnostics.issues,
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_IMPORT_FAILED',
          severity: 'fatal',
          message: 'Template durable source snapshot could not be persisted.',
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      ]),
      templateManifestSummary: manifest.summary,
      importManifestSummary: importManifest,
    })
    return {
      ok: false,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      diagnosticsSummary: updated.diagnosticsSummary ?? importDiagnostics,
      errorMessage: 'Template source persistence failed.',
    }
  }

  const normalizedTags = normalizeTemplateTagsForStorage(manifest.summary.tags)
  const finalSnapshotId = zipValidation.snapshotId
  logTemplateRowStatusEvent({
    event: 'TEMPLATE_ROW_FINAL_STATUS_COMPUTED',
    templateId: initialTemplate.id,
    status: 'ready',
    importHealth,
    previewSource: previewSummary.preview.previewSource,
    previewAvailable: previewSummary.preview.previewAvailable,
  })
  logTemplateUploadIntakeEvent({
    event: 'TEMPLATE_UPLOAD_FINAL_RESULT_COMPUTED',
    templateId: initialTemplate.id,
    zipValidationOk: zipValidation.ok,
    selectedEntryHtmlPath,
    status: 'ready',
    importHealth,
    previewSource: previewSummary.preview.previewSource,
    previewAvailable: previewSummary.preview.previewAvailable,
    uploadResponseOk: true,
  })
  logTemplateRowStatusEvent({
    event: importHealth === 'clean' ? 'TEMPLATE_ROW_FINAL_STATUS_READY' : importHealth === 'degraded' ? 'TEMPLATE_ROW_FINAL_STATUS_DEGRADED' : 'TEMPLATE_ROW_FINAL_STATUS_FAILED',
    templateId: initialTemplate.id,
    status: 'ready',
    importHealth,
    previewSource: previewSummary.preview.previewSource,
    previewAvailable: previewSummary.preview.previewAvailable,
  })

  const updatedTemplate = await repository.updateTemplateProcessingResult({
    templateId: initialTemplate.id,
    status: 'ready',
    importHealth,
    entryHtmlPath: entryMetadata.entryHtmlPath,
    entryHtmlFileName: entryMetadata.entryHtmlFileName,
    templateType: entryMetadata.templateType,
    preview: previewSummary.preview,
    tags: normalizedTags,
    importSnapshotId: finalSnapshotId,
    durableSnapshotRootDirAbs,
    diagnosticsSummary: importDiagnostics,
    templateManifestSummary: manifest.summary,
    importManifestSummary: importManifest,
  })
  logTemplateRowStatusEvent({
    event: 'TEMPLATE_ROW_UPDATED_FINAL',
    templateId: updatedTemplate.id,
    status: updatedTemplate.status,
    importHealth: updatedTemplate.importHealth,
    previewSource: updatedTemplate.previewSource,
    previewAvailable: updatedTemplate.previewAvailable,
  })
  logTemplateUploadIntakeEvent({
    event: 'TEMPLATE_UPLOAD_FINAL_ROW_WRITTEN',
    templateId: updatedTemplate.id,
    zipValidationOk: zipValidation.ok,
    selectedEntryHtmlPath,
    status: updatedTemplate.status,
    importHealth: updatedTemplate.importHealth,
    previewSource: updatedTemplate.previewSource,
    previewAvailable: updatedTemplate.previewAvailable,
    uploadResponseOk: updatedTemplate.status !== 'failed',
  })

  if (updatedTemplate.status === 'failed') {
    return {
      ok: false,
      zipValidationOk: zipValidation.ok,
      selectedEntryHtmlPath,
      templateId: updatedTemplate.id,
      status: updatedTemplate.status,
      importHealth: updatedTemplate.importHealth,
      diagnosticsSummary: updatedTemplate.diagnosticsSummary ?? importDiagnostics,
      errorMessage: 'Template import failed.',
    }
  }

  return {
    ok: true,
    zipValidationOk: zipValidation.ok,
    selectedEntryHtmlPath,
    template: updatedTemplate,
  }
}
