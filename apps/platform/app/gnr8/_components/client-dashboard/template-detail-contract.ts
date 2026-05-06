import { formatTagsForInput, parseTagsInputForForm } from '@/gnr8/template-intake/core/template-management-contract'
import {
  isRetryableTemplateFailure,
  templateFailureReasonMessage,
} from '@/app/gnr8/_components/client-dashboard/template-library-contract'

export type TemplateDetailUiState = 'loading' | 'not_found' | 'unauthorized' | 'error' | 'ready'

export type TemplateDetailView = {
  id: string
  clientId: string
  name: string
  tags: string[]
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  importHealth: 'clean' | 'degraded' | 'failed'
  sourceType: 'zip_html'
  sourceFilename: string
  entryHtmlFileName: string | null
  templateType: 'single_page' | 'multi_page' | 'unknown'
  preview: {
    available: boolean
    isFallback: boolean
    source: 'rendered_capture' | 'html_snapshot' | 'fallback'
    imagePath: string | null
  }
  templateManifestSummary: Record<string, unknown> | null
  diagnosticsSummary: {
    issues: Array<{ code: string; severity: string; message: string }>
    counts?: { info?: number; warning?: number; error?: number; fatal?: number }
  } | null
  importManifestSummary: {
    entryHtmlPath?: string | null
    htmlFilePaths?: string[]
    status?: string
    diagnostics?: { totalCount?: number; warningCount?: number; errorCount?: number; fatalCount?: number }
  } | null
  processingError: string | null
  reasonCode: string | null
  rawArtifactAvailable: boolean
  importManifestFileCount: number | null
  semanticImportSummary: string
  contentSlotReadinessPreview: string
  createdAt: string
  updatedAt: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
}

function normalizePreviewSource(value: unknown): TemplateDetailView['preview']['source'] {
  const normalized = normalizeText(value)
  if (normalized === 'rendered_capture' || normalized === 'html_snapshot') return normalized
  return 'fallback'
}

export function parseTemplateDetailPayload(payload: unknown): TemplateDetailView | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const maybeTemplate = (payload as { template?: unknown }).template
  if (!maybeTemplate || typeof maybeTemplate !== 'object' || Array.isArray(maybeTemplate)) return null

  const template = maybeTemplate as Record<string, unknown>
  const id = normalizeText(template.id)
  const clientId = normalizeText(template.clientId)
  const name = normalizeText(template.name)
  const sourceFilename = normalizeText(template.sourceFilename)
  const createdAt = normalizeText(template.createdAt)
  const updatedAt = normalizeText(template.updatedAt)
  const sourceType = normalizeText(template.sourceType) === 'zip_html' ? 'zip_html' : null
  const status =
    normalizeText(template.status) === 'uploaded' ||
    normalizeText(template.status) === 'processing' ||
    normalizeText(template.status) === 'ready' ||
    normalizeText(template.status) === 'failed'
      ? (normalizeText(template.status) as TemplateDetailView['status'])
      : null
  const importHealth =
    normalizeText(template.importHealth) === 'clean' ||
    normalizeText(template.importHealth) === 'degraded' ||
    normalizeText(template.importHealth) === 'failed'
      ? (normalizeText(template.importHealth) as TemplateDetailView['importHealth'])
      : null
  const templateType =
    normalizeText(template.templateType) === 'single_page' ||
    normalizeText(template.templateType) === 'multi_page' ||
    normalizeText(template.templateType) === 'unknown'
      ? (normalizeText(template.templateType) as TemplateDetailView['templateType'])
      : null

  const previewRaw = template.preview
  const preview =
    previewRaw && typeof previewRaw === 'object' && !Array.isArray(previewRaw)
      ? (previewRaw as Record<string, unknown>)
      : null

  if (!id || !clientId || !name || !sourceFilename || !createdAt || !updatedAt || !sourceType || !status || !importHealth || !templateType || !preview) {
    return null
  }

  return {
    id,
    clientId,
    name,
    tags: asStringArray(template.tags),
    status,
    importHealth,
    sourceType,
    sourceFilename,
    entryHtmlFileName: normalizeText(template.entryHtmlFileName) || null,
    templateType,
    preview: {
      available: Boolean(preview.available),
      isFallback: Boolean(preview.isFallback),
      source: normalizePreviewSource(preview.source),
      imagePath: normalizeText(preview.imagePath) || null,
    },
    templateManifestSummary:
      template.templateManifestSummary && typeof template.templateManifestSummary === 'object' && !Array.isArray(template.templateManifestSummary)
        ? (template.templateManifestSummary as Record<string, unknown>)
        : null,
    diagnosticsSummary:
      template.diagnosticsSummary && typeof template.diagnosticsSummary === 'object' && !Array.isArray(template.diagnosticsSummary)
        ? (template.diagnosticsSummary as TemplateDetailView['diagnosticsSummary'])
        : null,
    importManifestSummary:
      template.importManifestSummary && typeof template.importManifestSummary === 'object' && !Array.isArray(template.importManifestSummary)
        ? (template.importManifestSummary as TemplateDetailView['importManifestSummary'])
        : null,
    processingError: normalizeText(template.processingError) || null,
    reasonCode: status === 'failed' ? normalizeText(template.reasonCode) || 'TEMPLATE_UNKNOWN_FAILURE' : null,
    rawArtifactAvailable: Boolean(template.rawArtifactAvailable),
    importManifestFileCount: Number(template.importManifestFileCount ?? 0) || null,
    semanticImportSummary: normalizeText(template.semanticImportSummary) || 'Unavailable',
    contentSlotReadinessPreview: normalizeText(template.contentSlotReadinessPreview) || 'Unavailable',
    createdAt,
    updatedAt,
  }
}

export function resolveTemplateDetailUiState(input: {
  isLoading: boolean
  httpStatus: number | null
  hasTemplate: boolean
  error: string | null
}): TemplateDetailUiState {
  if (input.isLoading) return 'loading'
  if (input.httpStatus === 401 || input.httpStatus === 403) return 'unauthorized'
  if (input.httpStatus === 404) return 'not_found'
  if (input.error || !input.hasTemplate) return 'error'
  return 'ready'
}

export { parseTagsInputForForm, formatTagsForInput }
export { isRetryableTemplateFailure, templateFailureReasonMessage }
