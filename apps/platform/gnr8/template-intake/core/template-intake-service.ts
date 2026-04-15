import { createImportManifest } from '@/gnr8/import/import-manifest'
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
  listTemplatesForClient,
  updateTemplateProcessingResult,
} from '@/gnr8/template-intake/storage/template-repository'
import type {
  CreateTemplateInput,
  TemplateDiagnosticsSummary,
  TemplateImportHealth,
  TemplateIntakeResult,
  TemplateRecord,
  UploadedZipTemplate,
} from '@/gnr8/template-intake/types/template-intake-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function pickImportHealth(input: {
  importStatus: 'ok' | 'failed'
  manifestStatus: 'success' | 'success_with_warnings' | 'failed'
  warningCount: number
  errorCount: number
  fatalCount: number
}): TemplateImportHealth {
  if (input.importStatus === 'failed' || input.manifestStatus === 'failed' || input.fatalCount > 0) return 'failed'
  if (input.manifestStatus === 'success_with_warnings' || input.warningCount > 0 || input.errorCount > 0) return 'degraded'
  return 'clean'
}

function mergeDiagnostics(...summaries: TemplateDiagnosticsSummary[]): TemplateDiagnosticsSummary {
  return summarizeTemplateDiagnostics(summaries.flatMap((summary) => summary.issues))
}

export type TemplateRepository = {
  createTemplate: (input: CreateTemplateInput) => Promise<TemplateRecord>
  updateTemplateProcessingResult: typeof updateTemplateProcessingResult
  listTemplatesForClient: typeof listTemplatesForClient
}

const DEFAULT_REPOSITORY: TemplateRepository = {
  createTemplate,
  updateTemplateProcessingResult,
  listTemplatesForClient,
}

export async function runTemplateZipIntake(input: {
  actorUserId: string
  clientId: string
  organizationId: string | null
  agencyId: string | null
  uploadedZip: UploadedZipTemplate
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

  const zipValidation = zipValidator({
    fileName: input.uploadedZip.fileName,
    bytes: input.uploadedZip.bytes,
    maxBytes: TEMPLATE_ZIP_MAX_BYTES,
  })
  const zipSummary = summarizeTemplateDiagnostics(zipValidation.diagnostics)

  const optimisticName = normalizeText(input.uploadedZip.fileName).replace(/\.zip$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled Template'
  const optimisticSlug = optimisticName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'template'

  const initialTemplate = await repository.createTemplate({
    clientId: input.clientId,
    organizationId: input.organizationId,
    agencyId: input.agencyId,
    createdByUserId: normalizeText(input.actorUserId) || null,
    name: optimisticName,
    slug: optimisticSlug,
    sourceFilename: input.uploadedZip.fileName,
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
      preview: {
        previewAvailable: false,
        previewIsFallback: true,
        previewSource: 'fallback',
        previewImagePath: null,
        previewLabel: 'No preview available',
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

  const entryHtmlPath = zipValidation.validation.entryHtmlPath ?? 'index.html'

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
  const importHealth = pickImportHealth({
    importStatus: importOutput.status,
    manifestStatus: importManifest.status,
    warningCount: importOutput.importDiagnostics.summary.warningCount,
    errorCount: importOutput.importDiagnostics.summary.errorCount,
    fatalCount: importOutput.importDiagnostics.summary.fatalCount,
  })

  const previewSummary = previewBuilder({ screenshotPaths: [] })

  const importDiagnostics = summarizeTemplateDiagnostics([
    ...intakeDiagnostics.issues,
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
              message: 'Template import completed with degraded fidelity diagnostics.',
              details: {
                warningCount: importOutput.importDiagnostics.summary.warningCount,
                errorCount: importOutput.importDiagnostics.summary.errorCount,
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
    status: importHealth === 'failed' ? 'failed' : 'ready',
    importHealth,
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
