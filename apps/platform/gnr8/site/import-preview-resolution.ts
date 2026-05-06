export type ImportPreviewMode = 'structured' | 'raw_html_fallback'

export type ImportPreviewResolution = {
  previewMode: ImportPreviewMode
  htmlLength: number
  appliedTransformationsCount: number
  diagnostics: string[]
}

function hasPreparedModelContent(preparedSite: unknown): boolean {
  if (!preparedSite || typeof preparedSite !== 'object') return false
  const candidate = preparedSite as {
    documents?: unknown[]
    siteSummary?: { effectivelyEmpty?: boolean }
  }
  if (candidate.siteSummary?.effectivelyEmpty === true) return false
  return Array.isArray(candidate.documents) && candidate.documents.length > 0
}

export function resolveImportPreview(input: {
  pipelineMode: 'strict' | 'degraded_html_fallback'
  preparedSite: unknown
  renderOutput: unknown
  structuredHtmlLength: number
  rawHtmlLength: number
}): ImportPreviewResolution {
  const diagnostics: string[] = []
  const preparedModelHasContent = hasPreparedModelContent(input.preparedSite)
  const renderOutputAvailable = Boolean(input.renderOutput)
  const shouldUseRawHtmlFallback =
    input.pipelineMode === 'degraded_html_fallback' || !preparedModelHasContent || !renderOutputAvailable

  if (!shouldUseRawHtmlFallback && input.structuredHtmlLength > 0) {
    diagnostics.push('SITE_IMPORT_PREVIEW_STRUCTURED_USED')
    return {
      previewMode: 'structured',
      htmlLength: input.structuredHtmlLength,
      appliedTransformationsCount: input.structuredHtmlLength > 0 ? 1 : 0,
      diagnostics: diagnostics.sort((a, b) => a.localeCompare(b)),
    }
  }

  if (input.rawHtmlLength > 0) {
    diagnostics.push('SITE_IMPORT_PREVIEW_FALLBACK_USED')
    return {
      previewMode: 'raw_html_fallback',
      htmlLength: input.rawHtmlLength,
      appliedTransformationsCount: 0,
      diagnostics: diagnostics.sort((a, b) => a.localeCompare(b)),
    }
  }

  diagnostics.push('SITE_IMPORT_PREVIEW_FAILED_NO_HTML')
  throw new Error('SITE_IMPORT_PREVIEW_FAILED_NO_HTML')
}
