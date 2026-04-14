import type { PreviewRuntimeMode, PreviewRuntimeSummary } from "@/gnr8/preview-runtime/preview-runtime-types";

export type SitePreviewType = 'raw_imported' | 'transformed' | 'debug_inspect'

export type SiteWorkspacePreviewReadiness =
  | 'preview_available'
  | 'preview_unavailable'
  | 'debug_only_artifact_available'
  | 'import_captured_not_transformed'

export type SiteVersionPreviewMode = 'transformed' | 'debug'

export const DEFAULT_SITE_VERSION_PREVIEW_MODE: SiteVersionPreviewMode = 'debug'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeSiteVersionPreviewMode(value: unknown): SiteVersionPreviewMode {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === 'transformed') return 'transformed'
  return 'debug'
}

export function buildSiteVersionPreviewUrl(input: {
  siteVersionId: string
  mode: SiteVersionPreviewMode
}): string {
  const params = new URLSearchParams()
  params.set('mode', input.mode)
  return `/api/gnr8/runtime/versions/${encodeURIComponent(input.siteVersionId)}/preview?${params.toString()}`
}

export type SiteWorkspacePreviewResolution = {
  status: SiteWorkspacePreviewReadiness
  sourceType: SitePreviewType | null
  mainPreviewUrl: string | null
  transformedPreviewUrl: string | null
  debugPreviewUrl: string | null
  previewMode: PreviewRuntimeMode | null
  previewRuntimeSummary: PreviewRuntimeSummary | null
  diagnostics: string[]
}

export function resolveSiteWorkspacePreview(input: {
  siteVersionId: string | null
  transformedPreviewAvailable: boolean
  debugPreviewAvailable: boolean
  importCaptured: boolean
  previewRuntimeSummary?: PreviewRuntimeSummary | null
}): SiteWorkspacePreviewResolution {
  const summary = input.previewRuntimeSummary ?? null
  const modeDiagnostic = summary ? `Preview runtime mode: ${summary.previewMode}.` : null

  if (!input.siteVersionId) {
    return {
      status: input.importCaptured ? 'import_captured_not_transformed' : 'preview_unavailable',
      sourceType: null,
      mainPreviewUrl: null,
      transformedPreviewUrl: null,
      debugPreviewUrl: null,
      previewMode: summary?.previewMode ?? null,
      previewRuntimeSummary: summary,
      diagnostics: [
        input.importCaptured
          ? 'Import capture exists, but no runtime site version was selected for transformed preview.'
          : 'No runtime site version is available for preview.',
        ...(modeDiagnostic ? [modeDiagnostic] : []),
      ],
    }
  }

  const transformedPreviewUrl = input.transformedPreviewAvailable
    ? buildSiteVersionPreviewUrl({ siteVersionId: input.siteVersionId, mode: 'transformed' })
    : null
  const debugPreviewUrl = input.debugPreviewAvailable
    ? buildSiteVersionPreviewUrl({ siteVersionId: input.siteVersionId, mode: 'debug' })
    : null

  if (transformedPreviewUrl) {
    return {
      status: 'preview_available',
      sourceType: 'transformed',
      mainPreviewUrl: transformedPreviewUrl,
      transformedPreviewUrl,
      debugPreviewUrl,
      previewMode: summary?.previewMode ?? null,
      previewRuntimeSummary: summary,
      diagnostics: [
        'Transformed preview artifact is available and selected as the primary Site Workspace preview source.',
        ...(modeDiagnostic ? [modeDiagnostic] : []),
      ],
    }
  }

  if (debugPreviewUrl) {
    return {
      status: 'debug_only_artifact_available',
      sourceType: 'debug_inspect',
      mainPreviewUrl: null,
      transformedPreviewUrl: null,
      debugPreviewUrl,
      previewMode: summary?.previewMode ?? null,
      previewRuntimeSummary: summary,
      diagnostics: [
        'Only debug/inspect preview is currently available. Transformed preview artifact is not ready yet.',
        ...(modeDiagnostic ? [modeDiagnostic] : []),
      ],
    }
  }

  return {
    status: input.importCaptured ? 'import_captured_not_transformed' : 'preview_unavailable',
    sourceType: null,
    mainPreviewUrl: null,
    transformedPreviewUrl: null,
    debugPreviewUrl: null,
    previewMode: summary?.previewMode ?? null,
    previewRuntimeSummary: summary,
    diagnostics: [
      input.importCaptured
        ? 'Import capture exists, but no transformed artifact or debug render could be resolved.'
        : 'No preview artifacts are available for the selected site version.',
      ...(modeDiagnostic ? [modeDiagnostic] : []),
    ],
  }
}
