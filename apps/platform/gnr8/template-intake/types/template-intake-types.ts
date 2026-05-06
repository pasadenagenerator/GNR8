import type { ImportManifest } from '@/gnr8/import/import-manifest'
import type { TemplateProcessingReasonCode } from '@/gnr8/template-intake/core/template-processing-reason-code'

export type TemplateSourceType = 'zip_html'
export type TemplateStatus = 'uploaded' | 'processing' | 'ready' | 'failed'
export type TemplateImportHealth = 'clean' | 'degraded' | 'failed'
export type TemplateVisibility = 'private'
export type TemplateIntakeMode = 'template_intake'

export type TemplatePreviewSource = 'rendered_capture' | 'html_snapshot' | 'fallback'
export type TemplateType = 'single_page' | 'multi_page' | 'unknown'

export type TemplateManifestSummary = {
  source: 'template.json' | 'manifest.json' | 'derived'
  name: string
  description: string | null
  tags: string[]
}

export type TemplatePreviewSummary = {
  previewAvailable: boolean
  previewIsFallback: boolean
  previewSource: TemplatePreviewSource
  previewImagePath: string | null
  previewLabel: string
  entryHtmlFileName: string | null
}

export type TemplateIntakeDiagnosticSeverity = 'info' | 'warning' | 'error' | 'fatal'

export type TemplateIntakeDiagnosticCode =
  | 'TEMPLATE_UPLOAD_RECEIVED'
  | 'TEMPLATE_UPLOAD_REJECTED_INVALID_TYPE'
  | 'TEMPLATE_UPLOAD_REJECTED_EMPTY_FILE'
  | 'TEMPLATE_UPLOAD_REJECTED_TOO_LARGE'
  | 'TEMPLATE_ZIP_UNPACK_STARTED'
  | 'TEMPLATE_ZIP_UNPACK_COMPLETED'
  | 'TEMPLATE_ZIP_PATH_TRAVERSAL_BLOCKED'
  | 'TEMPLATE_ZIP_SINGLE_ROOT_FOLDER_DETECTED'
  | 'TEMPLATE_ZIP_ROOT_NORMALIZED'
  | 'TEMPLATE_HTML_ENTRY_INDEX_FOUND'
  | 'TEMPLATE_HTML_ENTRY_FALLBACK_SINGLE_FILE'
  | 'TEMPLATE_HTML_ENTRY_AMBIGUOUS'
  | 'TEMPLATE_HTML_ENTRY_NOT_FOUND'
  | 'TEMPLATE_MANIFEST_FOUND'
  | 'TEMPLATE_MANIFEST_MISSING'
  | 'TEMPLATE_MANIFEST_NORMALIZED'
  | 'TEMPLATE_NAME_DERIVED_FROM_FILENAME'
  | 'TEMPLATE_TAGS_DERIVED'
  | 'TEMPLATE_IMPORT_STARTED'
  | 'TEMPLATE_IMPORT_COMPLETED'
  | 'TEMPLATE_IMPORT_DEGRADED'
  | 'TEMPLATE_IMPORT_FAILED'
  | 'TEMPLATE_INTAKE_NO_ASSETS'
  | 'TEMPLATE_INTAKE_NO_RENDER_CAPTURE'
  | 'TEMPLATE_INTAKE_LOW_STYLE_COVERAGE'
  | 'TEMPLATE_INTAKE_EMPTY_HTML'
  | 'TEMPLATE_INTAKE_FATAL_IMPORT_DIAGNOSTIC'
  | 'TEMPLATE_PREVIEW_RESOLVED'
  | 'TEMPLATE_PREVIEW_FALLBACK_USED'
  | 'TEMPLATE_RECORD_CREATED'
  | 'TEMPLATE_RECORD_UPDATED'

export type TemplateIntakeDiagnostic = {
  code: TemplateIntakeDiagnosticCode
  severity: TemplateIntakeDiagnosticSeverity
  message: string
  details: Record<string, unknown> | null
}

export type TemplateDiagnosticsSummary = {
  issues: TemplateIntakeDiagnostic[]
  counts: {
    info: number
    warning: number
    error: number
    fatal: number
  }
}

export type TemplateZipValidationResult = {
  ok: boolean
  extractionRootDirAbs: string
  entryHtmlPath: string | null
  entryHtmlBytes?: Uint8Array
  entryHtmlSelection: 'root_index' | 'single_file_fallback' | 'missing' | 'ambiguous'
  htmlCandidates: string[]
  extractedFilePaths?: string[]
  assetsDirPath: string | null
  manifestPath: string | null
  assetSummary: {
    fileCount: number
    imageCount: number
    stylesheetCount: number
    scriptCount: number
    otherCount: number
  }
}

export type TemplateRecord = {
  id: string
  clientId: string
  organizationId: string | null
  agencyId: string | null
  createdByUserId: string | null
  name: string
  slug: string
  sourceType: TemplateSourceType
  status: TemplateStatus
  importHealth: TemplateImportHealth
  previewImagePath: string | null
  previewAvailable: boolean
  previewIsFallback: boolean
  previewSource: TemplatePreviewSource
  tags: string[]
  sourceFilename: string
  sourceZipStorageBucket: string | null
  sourceZipStorageKey: string | null
  entryHtmlPath: string | null
  entryHtmlFileName: string | null
  templateType: TemplateType
  importSnapshotId: string | null
  durableSnapshotRootDirAbs: string | null
  templateManifestSummary: TemplateManifestSummary | null
  diagnosticsSummary: TemplateDiagnosticsSummary | null
  importManifestSummary: ImportManifest | null
  processingStartedAt?: string | null
  processingCompletedAt?: string | null
  processingError?: string | null
  reasonCode?: TemplateProcessingReasonCode | null
  processingAttempts?: number
  version: number
  visibility: TemplateVisibility
  createdAt: string
  updatedAt: string
}

export type CreateTemplateInput = {
  clientId: string
  organizationId: string | null
  agencyId: string | null
  createdByUserId: string | null
  name: string
  slug: string
  sourceFilename: string
  sourceZipStorageBucket?: string | null
  sourceZipStorageKey?: string | null
  entryHtmlPath: string | null
  entryHtmlFileName: string | null
  templateType: TemplateType
  tags: string[]
  status: TemplateStatus
  importHealth: TemplateImportHealth
  templateManifestSummary: TemplateManifestSummary | null
  diagnosticsSummary: TemplateDiagnosticsSummary | null
}

export type UpdateTemplateProcessingResultInput = {
  templateId: string
  status: TemplateStatus
  importHealth: TemplateImportHealth
  entryHtmlPath: string | null
  entryHtmlFileName: string | null
  templateType: TemplateType
  preview: TemplatePreviewSummary
  tags: string[]
  importSnapshotId: string | null
  durableSnapshotRootDirAbs: string | null
  diagnosticsSummary: TemplateDiagnosticsSummary
  templateManifestSummary: TemplateManifestSummary
  importManifestSummary: ImportManifest | null
  reasonCode?: TemplateProcessingReasonCode | null
  processingError?: string | null
}

export type UpdateTemplateSourceZipReferenceInput = {
  templateId: string
  sourceZipStorageBucket: string
  sourceZipStorageKey: string
}

export type TemplateListItem = TemplateRecord

export type UploadedZipTemplate = {
  fileName: string
  bytes: Uint8Array
}

export type TemplateIntakeResult =
  | {
      ok: true
      zipValidationOk: true
      selectedEntryHtmlPath: string | null
      template: TemplateRecord
    }
  | {
      ok: false
      zipValidationOk: boolean
      selectedEntryHtmlPath: string | null
      templateId: string | null
      status: TemplateStatus
      importHealth: TemplateImportHealth
      diagnosticsSummary: TemplateDiagnosticsSummary
      errorMessage: string
    }
