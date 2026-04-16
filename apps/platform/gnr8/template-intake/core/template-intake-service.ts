import path from 'node:path'

import { createImportManifest } from '@/gnr8/import/import-manifest'
import type { ImportOutput } from '@/gnr8/import/import-contract'
import { importStaticSite } from '@/gnr8/import/runtime/import-static-site'
import { createTemplateIntakeDiagnostic, summarizeTemplateDiagnostics } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'
import { readTemplateManifest, normalizeTemplateTagsForStorage } from '@/gnr8/template-intake/core/template-manifest-reader'
import {
  TEMPLATE_ZIP_MAX_BYTES,
  validateAndExtractTemplateZip,
} from '@/gnr8/template-intake/core/template-zip-validator'
import { buildTemplatePreviewSummary } from '@/gnr8/template-intake/preview/template-preview-summary'
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

  const localAssetCount = input.importOutput.assetRegistry.files.length
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
  importRunner?: typeof importStaticSite
  importManifestBuilder?: typeof createImportManifest
  previewBuilder?: typeof buildTemplatePreviewSummary
}): Promise<TemplateIntakeResult> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  const zipValidator = input.zipValidator ?? validateAndExtractTemplateZip
  const importRunner = input.importRunner ?? importStaticSite
  const importManifestBuilder = input.importManifestBuilder ?? createImportManifest
  const previewBuilder = input.previewBuilder ?? buildTemplatePreviewSummary
  const intakeMode = input.mode ?? TEMPLATE_INTAKE_MODE

  const zipValidation = zipValidator({
    fileName: input.uploadedZip.fileName,
    bytes: input.uploadedZip.bytes,
    maxBytes: TEMPLATE_ZIP_MAX_BYTES,
  })
  const zipSummary = summarizeTemplateDiagnostics(zipValidation.diagnostics)

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

  const createDiagnosticSummary = summarizeTemplateDiagnostics([
    ...zipSummary.issues,
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_RECORD_CREATED',
      severity: 'info',
      message: 'Template record created before import processing.',
      details: { templateId: initialTemplate.id },
    }),
  ])

  if (!zipValidation.ok || !zipValidation.validation) {
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

    return {
      ok: false,
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

    return {
      ok: false,
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
    rootDir: zipValidation.validation.extractionRootDirAbs,
    requestId: `template-intake-${initialTemplate.id}`,
    source: {
      kind: 'single-entry-html',
      entryHtmlPath,
      assetsDirPath: zipValidation.validation.assetsDirPath ?? undefined,
    },
  })

  const importManifest = importManifestBuilder(importOutput)
  const previewSummary = previewBuilder({ screenshotPaths: [], entryHtmlPath })
  const lenientWarnings = buildLenientTemplateIntakeWarnings({
    importOutput,
  })

  const hasEmptyHtmlIssue = importOutput.importDiagnostics.issues.some((issue) => issue.code === 'HTML_EMPTY')
  if (hasEmptyHtmlIssue) {
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

    return {
      ok: false,
      templateId: updated.id,
      status: updated.status,
      importHealth: updated.importHealth,
      diagnosticsSummary: updated.diagnosticsSummary ?? intakeDiagnostics,
      errorMessage: 'Template entry HTML is empty.',
    }
  }

  const hasFatalImportIssues = importOutput.importDiagnostics.issues.some((issue) => issue.severity === 'fatal')
  if (hasFatalImportIssues) {
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

    return {
      ok: false,
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

  const normalizedTags = normalizeTemplateTagsForStorage(manifest.summary.tags)
  const finalSnapshotId = zipValidation.snapshotId

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
    diagnosticsSummary: importDiagnostics,
    templateManifestSummary: manifest.summary,
    importManifestSummary: importManifest,
  })

  if (updatedTemplate.status === 'failed') {
    return {
      ok: false,
      templateId: updatedTemplate.id,
      status: updatedTemplate.status,
      importHealth: updatedTemplate.importHealth,
      diagnosticsSummary: updatedTemplate.diagnosticsSummary ?? importDiagnostics,
      errorMessage: 'Template import failed.',
    }
  }

  return {
    ok: true,
    template: updatedTemplate,
  }
}

export async function listClientTemplates(input: {
  clientId: string
  limit?: number
  repository?: TemplateRepository
}): Promise<TemplateRecord[]> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.listTemplatesForClient({
    clientId: input.clientId,
    limit: input.limit,
  })
}

export async function getClientTemplateById(input: {
  clientId: string
  templateId: string
  repository?: TemplateRepository
}): Promise<TemplateRecord | null> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.getTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
}

export async function updateClientTemplateMetadata(input: {
  clientId: string
  templateId: string
  name: string
  tags: string[]
  repository?: TemplateRepository
}): Promise<TemplateRecord | null> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.updateTemplateMetadataById({
    clientId: input.clientId,
    templateId: input.templateId,
    name: input.name,
    tags: input.tags,
  })
}

export async function deleteClientTemplateById(input: {
  clientId: string
  templateId: string
  repository?: TemplateRepository
}): Promise<TemplateRecord | null> {
  const repository = input.repository ?? DEFAULT_REPOSITORY
  return repository.deleteTemplateByIdForClient({
    clientId: input.clientId,
    templateId: input.templateId,
  })
}
