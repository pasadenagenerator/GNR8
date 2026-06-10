export type PreviewRouteRawTemplateTraceEvidence = {
  selectedRoutePath: string
  selectedRawFilePath: string
  rewrittenLinkCount: number
  rewrittenAssetCount?: number
  disabledScriptCount?: number
  dbReadCount?: number
  dbClientAcquisitionCount?: number
  rawPreviewAssetRewriteEvidence?: {
    assetReferencesInspected?: number
    assetReferencesRewritten?: number
    assetReferencesMissing?: number
    imageReferencesMissing?: number
    stylesheetsInspected?: number
    fontFamilyDongleDetected?: boolean
  } | null
  rawPreviewAssetGraphEvidence?: {
    stylesheetRefsFound?: unknown[]
    stylesheetRefsRewritten?: unknown[]
    stylesheetRefsMissing?: unknown[]
    imageRefsMissing?: unknown[]
    dongleEvidence?: { detected?: boolean } | null
    fontFamilyDongleDetected?: boolean
  } | null
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
    'x-gnr8-raw-assets-inspected': String(evidence?.rawPreviewAssetRewriteEvidence?.assetReferencesInspected ?? 0),
    'x-gnr8-raw-assets-rewritten': String(evidence?.rawPreviewAssetRewriteEvidence?.assetReferencesRewritten ?? evidence?.rewrittenAssetCount ?? 0),
    'x-gnr8-raw-assets-missing': String(evidence?.rawPreviewAssetRewriteEvidence?.assetReferencesMissing ?? 0),
    'x-gnr8-raw-font-dongle-detected': evidence?.rawPreviewAssetRewriteEvidence?.fontFamilyDongleDetected ? 'true' : 'false',
    'x-gnr8-raw-disabled-scripts-count': String(evidence?.disabledScriptCount ?? 0),
    'x-gnr8-raw-stylesheets-found': String(
      evidence?.rawPreviewAssetGraphEvidence?.stylesheetRefsFound?.length ??
      evidence?.rawPreviewAssetRewriteEvidence?.stylesheetsInspected ??
      0,
    ),
    'x-gnr8-raw-stylesheets-rewritten': String(evidence?.rawPreviewAssetGraphEvidence?.stylesheetRefsRewritten?.length ?? 0),
    'x-gnr8-raw-stylesheets-missing': String(evidence?.rawPreviewAssetGraphEvidence?.stylesheetRefsMissing?.length ?? 0),
    'x-gnr8-raw-images-missing': String(
      evidence?.rawPreviewAssetGraphEvidence?.imageRefsMissing?.length ??
      evidence?.rawPreviewAssetRewriteEvidence?.imageReferencesMissing ??
      0,
    ),
    'x-gnr8-raw-dongle-detected':
      evidence?.rawPreviewAssetGraphEvidence?.dongleEvidence?.detected || evidence?.rawPreviewAssetRewriteEvidence?.fontFamilyDongleDetected
        ? 'true'
        : 'false',
  }
}
