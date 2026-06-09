export type PreviewRouteRawTemplateTraceEvidence = {
  selectedRoutePath: string
  selectedRawFilePath: string
  rewrittenLinkCount: number
  rewrittenAssetCount?: number
  disabledScriptCount?: number
  dbReadCount?: number
  dbClientAcquisitionCount?: number
}

export function resolveRawTemplatePreviewTraceEvidence(input: {
  previewMode: string
  previewRuntimeSummary?: {
    rawTemplatePreviewEvidence?: PreviewRouteRawTemplateTraceEvidence | null
  } | null
  rawTemplatePreviewEvidence?: PreviewRouteRawTemplateTraceEvidence | null
}): PreviewRouteRawTemplateTraceEvidence | null {
  if (input.previewMode !== 'raw_template_preview') return null
  return input.previewRuntimeSummary?.rawTemplatePreviewEvidence ?? input.rawTemplatePreviewEvidence ?? null
}

export function rawTemplatePreviewTraceHeaders(input: {
  previewMode: string
  previewRuntimeSummary?: {
    rawTemplatePreviewEvidence?: PreviewRouteRawTemplateTraceEvidence | null
  } | null
  rawTemplatePreviewEvidence?: PreviewRouteRawTemplateTraceEvidence | null
}): Record<string, string> {
  const evidence = resolveRawTemplatePreviewTraceEvidence(input)
  return {
    'x-gnr8-preview-selected-route': evidence?.selectedRoutePath ?? '',
    'x-gnr8-preview-selected-raw-file': evidence?.selectedRawFilePath ?? '',
    'x-gnr8-preview-rewritten-links-count': String(evidence?.rewrittenLinkCount ?? 0),
    'x-gnr8-preview-rewritten-assets-count': String(evidence?.rewrittenAssetCount ?? 0),
    'x-gnr8-preview-disabled-scripts-count': String(evidence?.disabledScriptCount ?? 0),
    'x-gnr8-preview-db-read-count': String(evidence?.dbReadCount ?? 0),
    'x-gnr8-preview-db-client-acquisition-count': String(evidence?.dbClientAcquisitionCount ?? 0),
  }
}
