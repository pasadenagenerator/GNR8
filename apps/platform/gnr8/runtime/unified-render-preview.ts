import { normalizePagePath } from '@/gnr8/runtime/deterministic'
import { getArtifactById, getSiteVersion, getSiteVersionArtifactBinding } from '@/gnr8/runtime/runtime-store'
import type { CanonicalSiteVersionSnapshot } from '@/gnr8/runtime/types'
import { normalizeSiteVersionPreviewMode, type SiteVersionPreviewMode } from '@/gnr8/site/site-preview-contract'
import { PREVIEW_RUNTIME_DIAGNOSTIC } from '@/gnr8/preview-runtime/preview-runtime-diagnostics'
import type { PreviewRuntimeMode, PreviewRuntimeSummary } from '@/gnr8/preview-runtime/preview-runtime-types'
import {
  renderSemanticPreview,
  SEMANTIC_PREVIEW_DIAGNOSTIC,
  shouldUseSemanticFallbackPreview,
} from '@/gnr8/preview-semantic/semantic-preview-renderer'

export type SiteVersionPreviewSource =
  | 'react_runtime_renderer'
  | 'transformed_artifact'
  | 'debug_preview_bundle'
  | 'semantic_fallback_renderer'

type RenderedCapturePreviewTruth = {
  renderedCaptureUsed: boolean
  domSize: number
  screenshotCount: number
}

type ResolvedSiteVersionPreview = {
  siteId: string
  siteVersionId: string
  path: string
  rendererCompatibilityVersion: string
  html: string
  source: SiteVersionPreviewSource
  previewMode: PreviewRuntimeMode
  previewRuntimeSummary: PreviewRuntimeSummary
  renderedCaptureUsed: boolean
  fallbackUsed: boolean
  domSize: number
  screenshotCount: number
  sourceMode: 'rendered_capture' | 'raw_html'
}

export class SiteVersionPreviewUnavailableError extends Error {
  readonly code: 'SITE_VERSION_NOT_FOUND' | 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE' | 'PREVIEW_PATH_NOT_FOUND'

  constructor(input: {
    code: 'SITE_VERSION_NOT_FOUND' | 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE' | 'PREVIEW_PATH_NOT_FOUND'
    message: string
  }) {
    super(input.message)
    this.name = 'SiteVersionPreviewUnavailableError'
    this.code = input.code
  }
}

type PreviewPathResolutionLogInput = {
  siteId: string
  runtimeSiteId: string
  runtimeSiteVersionId: string
  requestedPath: string
  candidatePaths: string[]
  selectedPath: string | null
  matchedPageId: string | null
  unresolvedPathsCount: number
}

function logPreviewPathResolution(event: string, input: PreviewPathResolutionLogInput): void {
  console.info(`[preview-runtime] ${event}`, {
    siteId: input.siteId,
    runtimeSiteId: input.runtimeSiteId,
    runtimeSiteVersionId: input.runtimeSiteVersionId,
    requestedPath: input.requestedPath,
    candidatePaths: input.candidatePaths,
    selectedPath: input.selectedPath,
    matchedPage: input.matchedPageId ? { id: input.matchedPageId } : null,
    unresolvedPathsCount: input.unresolvedPathsCount,
  })
}

function resolveHtmlForPath(input: {
  htmlByPath: Record<string, string>
  requestedPath: string
  diagnostics?: {
    siteId: string
    runtimeSiteId: string
    runtimeSiteVersionId: string
    matchedPageId: string | null
    unresolvedPathsCount: number
  }
}): { html: string; resolvedPath: string } {
  const candidatePaths = Object.keys(input.htmlByPath)
    .map((pathValue) => normalizePagePath(pathValue))
    .sort((a, b) => a.localeCompare(b))

  const exact = input.htmlByPath[input.requestedPath]
  if (exact) {
    if (input.diagnostics) {
      logPreviewPathResolution('RAW_HTML_PREVIEW_PATH_RESOLVED', {
        siteId: input.diagnostics.siteId,
        runtimeSiteId: input.diagnostics.runtimeSiteId,
        runtimeSiteVersionId: input.diagnostics.runtimeSiteVersionId,
        requestedPath: input.requestedPath,
        candidatePaths,
        selectedPath: input.requestedPath,
        matchedPageId: input.diagnostics.matchedPageId,
        unresolvedPathsCount: input.diagnostics.unresolvedPathsCount,
      })
    }
    return { html: exact, resolvedPath: input.requestedPath }
  }

  const root = input.htmlByPath['/']
  if (root) {
    if (input.diagnostics) {
      logPreviewPathResolution('RAW_HTML_PREVIEW_PATH_RESOLVED', {
        siteId: input.diagnostics.siteId,
        runtimeSiteId: input.diagnostics.runtimeSiteId,
        runtimeSiteVersionId: input.diagnostics.runtimeSiteVersionId,
        requestedPath: input.requestedPath,
        candidatePaths,
        selectedPath: '/',
        matchedPageId: input.diagnostics.matchedPageId,
        unresolvedPathsCount: input.diagnostics.unresolvedPathsCount,
      })
    }
    return { html: root, resolvedPath: '/' }
  }

  if (input.diagnostics) {
    logPreviewPathResolution('RAW_HTML_PREVIEW_PATH_MISSING', {
      siteId: input.diagnostics.siteId,
      runtimeSiteId: input.diagnostics.runtimeSiteId,
      runtimeSiteVersionId: input.diagnostics.runtimeSiteVersionId,
      requestedPath: input.requestedPath,
      candidatePaths,
      selectedPath: null,
      matchedPageId: input.diagnostics.matchedPageId,
      unresolvedPathsCount: input.diagnostics.unresolvedPathsCount,
    })
  }

  throw new SiteVersionPreviewUnavailableError({
    code: 'PREVIEW_PATH_NOT_FOUND',
    message: `Preview path not found: ${input.requestedPath}`,
  })
}

function withSortedDiagnostics(diagnostics: string[]): string[] {
  return [...new Set(diagnostics.filter((value) => value.trim().length > 0))].sort((a, b) => a.localeCompare(b))
}

function resolveRenderedCapturePreviewTruth(importSummary: unknown): RenderedCapturePreviewTruth {
  const summary =
    importSummary && typeof importSummary === 'object' && !Array.isArray(importSummary)
      ? (importSummary as {
          renderedCapture?: { status?: string; nodeCount?: number; domLength?: number }
          screenshotCount?: number
          renderedCaptureStatus?: string
        })
      : null
  const status = String(summary?.renderedCapture?.status ?? summary?.renderedCaptureStatus ?? '').trim().toLowerCase()
  const domSize = Math.max(0, Math.floor(Number(summary?.renderedCapture?.nodeCount ?? summary?.renderedCapture?.domLength ?? 0)))
  const screenshotCount = Math.max(0, Math.floor(Number(summary?.screenshotCount ?? 0)))
  const renderedEvidenceUsable = domSize > 0 || screenshotCount > 0
  return {
    renderedCaptureUsed: (status === 'available' || status === 'partial') && renderedEvidenceUsable,
    domSize,
    screenshotCount,
  }
}

function withPreviewTruth(input: {
  preview: Omit<ResolvedSiteVersionPreview, 'renderedCaptureUsed' | 'fallbackUsed' | 'domSize' | 'screenshotCount' | 'sourceMode'>
  previewTruth: RenderedCapturePreviewTruth
  fallbackUsedOverride?: boolean
}): ResolvedSiteVersionPreview {
  const fallbackUsed =
    typeof input.fallbackUsedOverride === 'boolean'
      ? input.fallbackUsedOverride
      : input.preview.previewRuntimeSummary.renderedWithFallback ||
        input.preview.previewMode === 'fallback_preview' ||
        input.preview.previewMode === 'semantic_fallback_preview'
  return {
    ...input.preview,
    renderedCaptureUsed: input.previewTruth.renderedCaptureUsed,
    fallbackUsed,
    domSize: input.previewTruth.domSize,
    screenshotCount: input.previewTruth.screenshotCount,
    sourceMode: input.previewTruth.renderedCaptureUsed ? 'rendered_capture' : 'raw_html',
  }
}

function defaultPreviewRuntimeSummary(): PreviewRuntimeSummary {
  return {
    previewMode: 'fallback_preview',
    rendererContractAvailable: false,
    finalSiteModelAvailable: false,
    familyRenderUsed: false,
    familyRenderFamilyId: null,
    familyRenderMode: 'page_fallback',
    familyRenderFallbackToPage: true,
    familyRenderDiagnosticsCount: 0,
    familyRenderDiagnostics: [],
    renderedWithFallback: false,
    matchedPageId: null,
    contentResolutionApplied: false,
    resolvedContentCount: 0,
    unresolvedContentCount: 0,
    contentResolutionDegraded: false,
    contentResolutionDiagnostics: [],
    previewDiagnostics: [PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED],
  }
}

function buildSemanticPreviewRuntimeSummary(input: {
  fallbackSummary?: PreviewRuntimeSummary | null
  sectionCount: number
  imageCount: number
  ctaCount: number
  diagnostics: string[]
}): PreviewRuntimeSummary {
  const base = input.fallbackSummary ?? defaultPreviewRuntimeSummary()
  return {
    ...base,
    previewMode: 'semantic_fallback_preview',
    renderedWithFallback: true,
    contentResolutionApplied: true,
    resolvedContentCount: Math.max(base.resolvedContentCount, input.sectionCount + input.imageCount + input.ctaCount),
    unresolvedContentCount: 0,
    contentResolutionDegraded: false,
    previewDiagnostics: withSortedDiagnostics([
      ...base.previewDiagnostics,
      ...input.diagnostics,
      PREVIEW_RUNTIME_DIAGNOSTIC.SEMANTIC_PREVIEW_SELECTED,
    ]),
    semanticSectionCount: input.sectionCount,
    semanticImageCount: input.imageCount,
    semanticCtaCount: input.ctaCount,
  }
}

function resolveSemanticFallbackPreview(input: {
  siteVersion: CanonicalSiteVersionSnapshot
  requestedPath: string
  previewTruth: RenderedCapturePreviewTruth
  fallbackSummary?: PreviewRuntimeSummary | null
}): ResolvedSiteVersionPreview | null {
  const semanticImport = input.siteVersion.importProvenanceSummary?.semanticImport ?? null
  if (
    !shouldUseSemanticFallbackPreview({
      captureMode: input.siteVersion.importProvenanceSummary?.captureMode,
      renderedCaptureUsed: input.previewTruth.renderedCaptureUsed,
      semanticImport,
    }) ||
    !semanticImport
  ) {
    return null
  }

  const rendered = renderSemanticPreview({
    siteId: input.siteVersion.siteId,
    runtimeSiteId: input.siteVersion.siteId,
    runtimeSiteVersionId: input.siteVersion.id,
    path: normalizePagePath(input.requestedPath),
    semanticImport,
    diagnostics: [SEMANTIC_PREVIEW_DIAGNOSTIC.RENDER_STARTED],
  })
  const summary = buildSemanticPreviewRuntimeSummary({
    fallbackSummary: input.fallbackSummary,
    sectionCount: rendered.sectionCount,
    imageCount: rendered.imageCount,
    ctaCount: rendered.ctaCount,
    diagnostics: rendered.diagnostics,
  })

  return withPreviewTruth({
    preview: {
      siteId: input.siteVersion.siteId,
      siteVersionId: input.siteVersion.id,
      path: '/',
      rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
      html: rendered.html,
      source: 'semantic_fallback_renderer',
      previewMode: rendered.previewMode,
      previewRuntimeSummary: summary,
    },
    previewTruth: input.previewTruth,
    fallbackUsedOverride: true,
  })
}

async function renderTransformedSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
  previewTruth: RenderedCapturePreviewTruth
}): Promise<ResolvedSiteVersionPreview> {
  const binding = await getSiteVersionArtifactBinding(input.siteVersionId)
  if (!binding || !binding.artifactId) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
      message: 'No transformed runtime artifact is available for this site version.',
    })
  }

  const artifact = await getArtifactById(binding.artifactId)
  if (!artifact) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
      message: 'Transformed runtime artifact reference exists, but the artifact payload is missing.',
    })
  }

  const previewRuntimeSummary = input.fallbackSummary ?? defaultPreviewRuntimeSummary()

  const resolved = resolveHtmlForPath({
    htmlByPath: artifact.htmlByPath,
    requestedPath: input.requestedPath,
    diagnostics: {
      siteId: artifact.siteId,
      runtimeSiteId: artifact.siteId,
      runtimeSiteVersionId: artifact.siteVersionId,
      matchedPageId: previewRuntimeSummary.matchedPageId,
      unresolvedPathsCount: previewRuntimeSummary.unresolvedContentCount,
    },
  })

  return {
    ...withPreviewTruth({
      preview: {
        siteId: artifact.siteId,
        siteVersionId: artifact.siteVersionId,
        path: resolved.resolvedPath,
        rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
        html: resolved.html,
        source: 'transformed_artifact',
        previewMode: previewRuntimeSummary.previewMode,
        previewRuntimeSummary,
      },
      previewTruth: input.previewTruth,
      fallbackUsedOverride: !input.previewTruth.renderedCaptureUsed,
    }),
  }
}

async function renderDebugSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
  previewTruth: RenderedCapturePreviewTruth
}): Promise<ResolvedSiteVersionPreview> {
  const siteVersion = await getSiteVersion(input.siteVersionId)
  if (!siteVersion) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'SITE_VERSION_NOT_FOUND',
      message: 'SiteVersion not found',
    })
  }

  const { buildDeterministicArtifactBundle } = await import('@/gnr8/runtime/artifact-builder')
  const artifact = buildDeterministicArtifactBundle({
    siteVersion,
    renderMode: 'PREVIEW',
  })

  const previewRuntimeSummary = input.fallbackSummary ?? defaultPreviewRuntimeSummary()

  const resolved = resolveHtmlForPath({
    htmlByPath: artifact.htmlByPath,
    requestedPath: input.requestedPath,
    diagnostics: {
      siteId: siteVersion.siteId,
      runtimeSiteId: siteVersion.siteId,
      runtimeSiteVersionId: siteVersion.id,
      matchedPageId: previewRuntimeSummary.matchedPageId,
      unresolvedPathsCount: previewRuntimeSummary.unresolvedContentCount,
    },
  })

  return {
    ...withPreviewTruth({
      preview: {
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        path: resolved.resolvedPath,
        rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
        html: resolved.html,
        source: 'debug_preview_bundle',
        previewMode: previewRuntimeSummary.previewMode,
        previewRuntimeSummary,
      },
      previewTruth: input.previewTruth,
      fallbackUsedOverride: !input.previewTruth.renderedCaptureUsed,
    }),
  }
}

function wrapReactPreviewHtml(input: {
  renderedSiteHtml: string
  routePath: string
  summary: PreviewRuntimeSummary
}): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <meta name="robots" content="noindex, nofollow" />',
    `  <meta name="gnr8-preview-mode" content="${input.summary.previewMode}" />`,
    '  <title>GNR8 Preview</title>',
    '</head>',
    `<body data-gnr8-preview-mode="${input.summary.previewMode}" data-gnr8-route-path="${input.routePath}" data-gnr8-rendered-with-fallback="${
      input.summary.renderedWithFallback ? 'true' : 'false'
    }">`,
    input.renderedSiteHtml,
    '</body>',
    '</html>',
  ].join('\n')
}

async function renderReactRuntimeSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  previewTruth: RenderedCapturePreviewTruth
}): Promise<{
  preview: ResolvedSiteVersionPreview | null
  fallbackSummary: PreviewRuntimeSummary
}> {
  const siteVersion = await getSiteVersion(input.siteVersionId)
  if (!siteVersion) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'SITE_VERSION_NOT_FOUND',
      message: 'SiteVersion not found',
    })
  }

  const { preparePreviewRuntime } = await import('@/gnr8/preview-runtime/preview-runtime-preparation')
  const preparation = preparePreviewRuntime({
    siteVersion,
    routePath: input.requestedPath,
    renderedCaptureAvailable: input.previewTruth.renderedCaptureUsed,
  })

  if (preparation.mode === 'fallback_preview' || !preparation.rendererInput || !preparation.renderedSiteElement) {
    return {
      preview: null,
      fallbackSummary: preparation.summary,
    }
  }

  const reactDomServer = await import('react-dom/server')
  const renderedSite = reactDomServer.renderToStaticMarkup(preparation.renderedSiteElement)

  return {
    preview: withPreviewTruth({
      preview: {
        siteId: siteVersion.siteId,
        siteVersionId: siteVersion.id,
        path: input.requestedPath,
        rendererCompatibilityVersion: siteVersion.rendererCompatibilityVersion,
        html: wrapReactPreviewHtml({
          renderedSiteHtml: renderedSite,
          routePath: input.requestedPath,
          summary: preparation.summary,
        }),
        source: 'react_runtime_renderer',
        previewMode: preparation.mode,
        previewRuntimeSummary: preparation.summary,
      },
      previewTruth: input.previewTruth,
      fallbackUsedOverride: preparation.summary.renderedWithFallback,
    }),
    fallbackSummary: preparation.summary,
  }
}

export async function renderSiteVersionPreview(input: { siteVersionId: string; path?: string; mode?: unknown }) {
  const requestedPath = normalizePagePath(input.path ?? '/')
  const mode: SiteVersionPreviewMode = normalizeSiteVersionPreviewMode(input.mode)
  const siteVersion = await getSiteVersion(input.siteVersionId)
  if (!siteVersion) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'SITE_VERSION_NOT_FOUND',
      message: 'SiteVersion not found',
    })
  }
  const previewTruth = resolveRenderedCapturePreviewTruth(siteVersion.importProvenanceSummary)
  logPreviewPathResolution('PREVIEW_PATH_RESOLUTION_STARTED', {
    siteId: siteVersion.siteId,
    runtimeSiteId: siteVersion.siteId,
    runtimeSiteVersionId: siteVersion.id,
    requestedPath,
    candidatePaths: [],
    selectedPath: null,
    matchedPageId: null,
    unresolvedPathsCount: 0,
  })

  try {
    if (mode === 'transformed') {
      const reactPreview = await renderReactRuntimeSiteVersionPreview({
        siteVersionId: input.siteVersionId,
        requestedPath,
        previewTruth,
      })
      if (reactPreview.preview) return reactPreview.preview

      const fallbackBlocked = previewTruth.renderedCaptureUsed && previewTruth.domSize > 0
      const fallbackSummary = fallbackBlocked
        ? {
            ...reactPreview.fallbackSummary,
            previewMode: 'react_preview_degraded' as const,
            renderedWithFallback: false,
            previewDiagnostics: withSortedDiagnostics([
              ...reactPreview.fallbackSummary.previewDiagnostics,
              PREVIEW_RUNTIME_DIAGNOSTIC.PREVIEW_MODE_FROM_RENDERED_CAPTURE,
              PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_BLOCKED_RENDER_AVAILABLE,
            ]),
          }
        : reactPreview.fallbackSummary

      const semanticFallback = resolveSemanticFallbackPreview({
        siteVersion,
        requestedPath,
        previewTruth,
        fallbackSummary,
      })
      if (semanticFallback) return semanticFallback

      try {
        return await renderTransformedSiteVersionPreview({
          siteVersionId: input.siteVersionId,
          requestedPath,
          fallbackSummary,
          previewTruth,
        })
      } catch (error) {
        if (error instanceof SiteVersionPreviewUnavailableError && error.code === 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE') {
          return renderDebugSiteVersionPreview({
            siteVersionId: input.siteVersionId,
            requestedPath,
            fallbackSummary,
            previewTruth,
          })
        }
        throw error
      }
    }

    return renderDebugSiteVersionPreview({
      siteVersionId: input.siteVersionId,
      requestedPath,
      previewTruth,
    })
  } catch (error) {
    if (error instanceof SiteVersionPreviewUnavailableError && error.code === 'PREVIEW_PATH_NOT_FOUND') {
      const semanticFallback = resolveSemanticFallbackPreview({
        siteVersion,
        requestedPath,
        previewTruth,
      })
      if (semanticFallback) return semanticFallback
      logPreviewPathResolution('PREVIEW_PATH_RESOLUTION_FAILED', {
        siteId: siteVersion.siteId,
        runtimeSiteId: siteVersion.siteId,
        runtimeSiteVersionId: siteVersion.id,
        requestedPath,
        candidatePaths: [],
        selectedPath: null,
        matchedPageId: null,
        unresolvedPathsCount: 0,
      })
    }
    throw error
  }
}

export const __unifiedRenderPreviewTestUtils = {
  resolveHtmlForPath,
  resolveSemanticFallbackPreview,
  resolveRenderedCapturePreviewTruth,
}
