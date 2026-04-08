import { buildDeterministicArtifactBundle } from '@/gnr8/runtime/artifact-builder'
import { normalizePagePath } from '@/gnr8/runtime/deterministic'
import { getArtifactById, getSiteVersion, getSiteVersionArtifactBinding } from '@/gnr8/runtime/runtime-store'
import { normalizeSiteVersionPreviewMode, type SiteVersionPreviewMode } from '@/gnr8/site/site-preview-contract'

export type SiteVersionPreviewSource = 'transformed_artifact' | 'debug_preview_bundle'

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
}): Promise<{
  siteId: string
  siteVersionId: string
  path: string
  rendererCompatibilityVersion: string
  html: string
  source: SiteVersionPreviewSource
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
  }
}

async function renderDebugSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
}): Promise<{
  siteId: string
  siteVersionId: string
  path: string
  rendererCompatibilityVersion: string
  html: string
  source: SiteVersionPreviewSource
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
  }
}

export async function renderSiteVersionPreview(input: { siteVersionId: string; path?: string; mode?: unknown }) {
  const requestedPath = normalizePagePath(input.path ?? '/')
  const mode: SiteVersionPreviewMode = normalizeSiteVersionPreviewMode(input.mode)

  if (mode === 'transformed') {
    return renderTransformedSiteVersionPreview({
      siteVersionId: input.siteVersionId,
      requestedPath,
    })
  }

  return renderDebugSiteVersionPreview({
    siteVersionId: input.siteVersionId,
    requestedPath,
  })
}
