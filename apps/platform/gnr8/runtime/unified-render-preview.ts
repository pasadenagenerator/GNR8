import { buildDeterministicArtifactBundle } from '@/gnr8/runtime/artifact-builder'
import { normalizePagePath } from '@/gnr8/runtime/deterministic'
import { getArtifactById, getSiteVersion, getSiteVersionArtifactBinding } from '@/gnr8/runtime/runtime-store'
import { normalizeSiteVersionPreviewMode, type SiteVersionPreviewMode } from '@/gnr8/site/site-preview-contract'
import { PREVIEW_RUNTIME_DIAGNOSTIC } from '@/gnr8/preview-runtime/preview-runtime-diagnostics'
import { preparePreviewRuntime } from '@/gnr8/preview-runtime/preview-runtime-preparation'
import type { PreviewRuntimeMode, PreviewRuntimeSummary } from '@/gnr8/preview-runtime/preview-runtime-types'

export type SiteVersionPreviewSource = 'react_runtime_renderer' | 'transformed_artifact' | 'debug_preview_bundle'

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

function resolveHtmlForPath(input: { htmlByPath: Record<string, string>; requestedPath: string }): { html: string; resolvedPath: string } {
  const exact = input.htmlByPath[input.requestedPath]
  if (exact) return { html: exact, resolvedPath: input.requestedPath }

  const root = input.htmlByPath['/']
  if (root) return { html: root, resolvedPath: '/' }

  throw new SiteVersionPreviewUnavailableError({
    code: 'PREVIEW_PATH_NOT_FOUND',
    message: `Preview path not found: ${input.requestedPath}`,
  })
}

async function renderTransformedSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
}): Promise<{
  siteId: string
  siteVersionId: string
  path: string
  rendererCompatibilityVersion: string
  html: string
  source: SiteVersionPreviewSource
  previewMode: PreviewRuntimeMode
  previewRuntimeSummary: PreviewRuntimeSummary
}> {
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

  const resolved = resolveHtmlForPath({
    htmlByPath: artifact.htmlByPath,
    requestedPath: input.requestedPath,
  })

  return {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    path: resolved.resolvedPath,
    rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    html: resolved.html,
    source: 'transformed_artifact',
    previewMode: 'fallback_preview',
    previewRuntimeSummary: input.fallbackSummary ?? {
      previewMode: 'fallback_preview',
      rendererContractAvailable: false,
      finalSiteModelAvailable: false,
      renderedWithFallback: false,
      matchedPageId: null,
      previewDiagnostics: [PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED],
    },
  }
}

async function renderDebugSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
}): Promise<{
  siteId: string
  siteVersionId: string
  path: string
  rendererCompatibilityVersion: string
  html: string
  source: SiteVersionPreviewSource
  previewMode: PreviewRuntimeMode
  previewRuntimeSummary: PreviewRuntimeSummary
}> {
  const siteVersion = await getSiteVersion(input.siteVersionId)
  if (!siteVersion) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'SITE_VERSION_NOT_FOUND',
      message: 'SiteVersion not found',
    })
  }

  const artifact = buildDeterministicArtifactBundle({
    siteVersion,
    renderMode: 'PREVIEW',
  })

  const resolved = resolveHtmlForPath({
    htmlByPath: artifact.htmlByPath,
    requestedPath: input.requestedPath,
  })

  return {
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    path: resolved.resolvedPath,
    rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    html: resolved.html,
    source: 'debug_preview_bundle',
    previewMode: 'fallback_preview',
    previewRuntimeSummary: input.fallbackSummary ?? {
      previewMode: 'fallback_preview',
      rendererContractAvailable: false,
      finalSiteModelAvailable: false,
      renderedWithFallback: false,
      matchedPageId: null,
      previewDiagnostics: [PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED],
    },
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
}): Promise<{
  preview: {
    siteId: string
    siteVersionId: string
    path: string
    rendererCompatibilityVersion: string
    html: string
    source: SiteVersionPreviewSource
    previewMode: PreviewRuntimeMode
    previewRuntimeSummary: PreviewRuntimeSummary
  } | null
  fallbackSummary: PreviewRuntimeSummary
}> {
  const siteVersion = await getSiteVersion(input.siteVersionId)
  if (!siteVersion) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'SITE_VERSION_NOT_FOUND',
      message: 'SiteVersion not found',
    })
  }

  const preparation = preparePreviewRuntime({
    siteVersion,
    routePath: input.requestedPath,
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
    fallbackSummary: preparation.summary,
  }
}

export async function renderSiteVersionPreview(input: { siteVersionId: string; path?: string; mode?: unknown }) {
  const requestedPath = normalizePagePath(input.path ?? '/')
  const mode: SiteVersionPreviewMode = normalizeSiteVersionPreviewMode(input.mode)

  if (mode === 'transformed') {
    const reactPreview = await renderReactRuntimeSiteVersionPreview({
      siteVersionId: input.siteVersionId,
      requestedPath,
    })
    if (reactPreview.preview) return reactPreview.preview

    try {
      return await renderTransformedSiteVersionPreview({
        siteVersionId: input.siteVersionId,
        requestedPath,
        fallbackSummary: reactPreview.fallbackSummary,
      })
    } catch (error) {
      if (error instanceof SiteVersionPreviewUnavailableError && error.code === 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE') {
        return renderDebugSiteVersionPreview({
          siteVersionId: input.siteVersionId,
          requestedPath,
          fallbackSummary: reactPreview.fallbackSummary,
        })
      }
      throw error
    }
  }

  return renderDebugSiteVersionPreview({
    siteVersionId: input.siteVersionId,
    requestedPath,
  })
}
