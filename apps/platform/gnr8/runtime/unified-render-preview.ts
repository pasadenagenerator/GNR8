import path from 'node:path'

import { normalizePagePath } from '@/gnr8/runtime/deterministic'
import {
  getArtifactById,
  listContentOverrides,
  listContentSlots,
  getRawTemplateSiteArtifact,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  getSiteVersion,
  getSiteVersionArtifactBinding,
} from '@/gnr8/runtime/runtime-store'
import { getSuperadminPool } from '@/src/superadmin/db'
import { applyContentOverridesToRawHtml } from '@/src/public-site/content-override-runtime'
import type { ContentOverride } from '@/gnr8/runtime/content-binding'
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
  | 'raw_template_site'

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
  sourceMode: 'rendered_capture' | 'raw_html' | 'raw_template'
  contentDebug?: {
    siteVersionId: string
    rawTemplateArtifactFound: boolean
    draftOverrideCount: number
    publishedOverrideCount: number
    mergedOverrideCount: number
    appliedCount: number
    skippedCount: number
    skippedDiagnostics: Array<{ slotKey: string; reason: string }>
    slotKeys: string[]
  }
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

export class PreviewDbBackpressureError extends Error {
  readonly code = 'PREVIEW_DB_BACKPRESSURE'
  readonly requestCorrelationKey: string
  readonly poolWaitingCount: number

  constructor(input: { requestCorrelationKey: string; poolWaitingCount: number }) {
    super('Preview database pool is under backpressure.')
    this.name = 'PreviewDbBackpressureError'
    this.requestCorrelationKey = input.requestCorrelationKey
    this.poolWaitingCount = input.poolWaitingCount
  }
}

type PoolStatus = {
  totalCount: number
  idleCount: number
  waitingCount: number
}

type PreviewReadDependencies = {
  getPoolStatus: () => PoolStatus
  getSiteVersion: typeof getSiteVersion
  getSiteVersionArtifactBinding: typeof getSiteVersionArtifactBinding
  getArtifactById: typeof getArtifactById
  getRawTemplateSiteArtifact: typeof getRawTemplateSiteArtifact
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact
  getRawTemplateSiteAsset: typeof getRawTemplateSiteAsset
  listContentSlots: typeof listContentSlots
  listContentOverrides: typeof listContentOverrides
}

const defaultPreviewReadDependencies: PreviewReadDependencies = {
  getPoolStatus: () => {
    const pool = getSuperadminPool()
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    }
  },
  getSiteVersion,
  getSiteVersionArtifactBinding,
  getArtifactById,
  getRawTemplateSiteArtifact,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  listContentSlots,
  listContentOverrides,
}

let previewReadDependencies: PreviewReadDependencies = defaultPreviewReadDependencies

export function setUnifiedRenderPreviewDependenciesForTest(overrides: Partial<PreviewReadDependencies>): () => void {
  const previous = previewReadDependencies
  previewReadDependencies = {
    ...previewReadDependencies,
    ...overrides,
  }
  return () => {
    previewReadDependencies = previous
  }
}

type PreviewReadContext = {
  requestCorrelationKey: string
  queryCount: number
  uniqueLookupCount: number
  siteVersionById: Map<string, Promise<CanonicalSiteVersionSnapshot | null>>
  artifactBindingBySiteVersionId: Map<string, Promise<{ siteId: string; artifactId: string | null } | null>>
  artifactById: Map<string, Promise<Awaited<ReturnType<typeof getArtifactById>>>>
  rawTemplateArtifactBySiteVersionId: Map<string, Promise<Awaited<ReturnType<typeof getRawTemplateSiteArtifact>>>>
  rawImportedArtifactBySiteVersionId: Map<string, Promise<Awaited<ReturnType<typeof getRawImportedSiteArtifact>>>>
  rawTemplateAssetByKey: Map<string, Promise<Awaited<ReturnType<typeof getRawTemplateSiteAsset>>>>
  slotsBySiteVersionId: Map<string, Promise<Awaited<ReturnType<typeof listContentSlots>>>>
  overridesBySiteVersionAndStatus: Map<string, Promise<Awaited<ReturnType<typeof listContentOverrides>>>>
}

const PREVIEW_DB_POOL_WAITING_THRESHOLD = 8

function createPreviewReadContext(requestCorrelationKey: string): PreviewReadContext {
  return {
    requestCorrelationKey,
    queryCount: 0,
    uniqueLookupCount: 0,
    siteVersionById: new Map(),
    artifactBindingBySiteVersionId: new Map(),
    artifactById: new Map(),
    rawTemplateArtifactBySiteVersionId: new Map(),
    rawImportedArtifactBySiteVersionId: new Map(),
    rawTemplateAssetByKey: new Map(),
    slotsBySiteVersionId: new Map(),
    overridesBySiteVersionAndStatus: new Map(),
  }
}

function cacheLookup<T>(input: {
  context: PreviewReadContext
  cache: Map<string, Promise<T>>
  key: string
  loader: () => Promise<T>
}): Promise<T> {
  const existing = input.cache.get(input.key)
  if (existing) return existing
  input.context.uniqueLookupCount += 1
  const created = (async () => {
    input.context.queryCount += 1
    return input.loader()
  })()
  input.cache.set(input.key, created)
  return created
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

function normalizeTemplateAssetPath(value: string): string | null {
  const normalized = String(value ?? '').trim().replaceAll('\\', '/').replace(/^\/+/, '')
  if (!normalized || normalized === '.' || normalized === '..') return null
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.')
  if (segments.some((segment) => segment === '..')) return null
  return segments.join('/')
}

function rewriteRawTemplateAssetReferences(input: {
  html: string
  siteId: string
  siteVersionId: string
  entryHtmlPath: string
  fileMapPaths?: ReadonlySet<string>
}): string {
  const assetRoot = `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.siteId)}/${encodeURIComponent(input.siteVersionId)}`
  const entryDir = path.posix.dirname(input.entryHtmlPath)
  const baseDir = entryDir === '.' ? '' : entryDir
  const correlationKey = `${input.siteId}:${input.siteVersionId}:${input.entryHtmlPath}`
  const cssUrlPattern = /url\(\s*(['"]?)([^"')]+)\1\s*\)/gi
  const duplicatePreviewPrefixPattern = new RegExp(`^${assetRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/gnr8/runtime/preview-assets/`, 'i')

  const emitCssAssetRewriteApplied = (originalUrl: string, rewrittenUrl: string, sourceType: 'inline_style' | 'style_block' | 'stylesheet' | 'script_detected') => {
    console.info('[preview-runtime] PREVIEW_CSS_ASSET_REWRITE_APPLIED', {
      originalUrl,
      rewrittenUrl,
      sourceType,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      correlationKey,
    })
  }

  const emitCssAssetRewriteSkipped = (originalUrl: string, reasonCode: string, sourceType: 'inline_style' | 'style_block' | 'stylesheet' | 'script_detected') => {
    console.info('[preview-runtime] PREVIEW_CSS_ASSET_REWRITE_SKIPPED', {
      originalUrl,
      reasonCode,
      sourceType,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      correlationKey,
    })
  }

  const rewriteCssUrlTokens = (cssValue: string, sourceType: 'inline_style' | 'style_block' | 'stylesheet' | 'script_detected'): string =>
    String(cssValue ?? '').replace(cssUrlPattern, (full, quote: string, rawValue: string) => {
      const originalUrl = String(rawValue ?? '').trim()
      if (!originalUrl) return full
      const lower = originalUrl.toLowerCase()
      if (
        !lower.startsWith('/uploads/') ||
        lower.startsWith('/api/gnr8/runtime/preview-assets/')
      ) {
        if (lower.startsWith('/api/gnr8/runtime/preview-assets/')) {
          emitCssAssetRewriteSkipped(originalUrl, 'already_rewritten', sourceType)
        }
        return full
      }
      const [pathname, suffix = ''] = originalUrl.split(/(?=[?#])/)
      const normalized = normalizeTemplateAssetPath(pathname)
      if (!normalized) {
        emitCssAssetRewriteSkipped(originalUrl, 'invalid_path', sourceType)
        return full
      }
      if (input.fileMapPaths && !input.fileMapPaths.has(normalized)) {
        emitCssAssetRewriteSkipped(originalUrl, 'file_map_path_not_found', sourceType)
        return full
      }
      const rewrittenUrl = `${assetRoot}/${normalized}${suffix}`
      emitCssAssetRewriteApplied(originalUrl, rewrittenUrl, sourceType)
      const safeQuote = quote || ''
      return `url(${safeQuote}${rewrittenUrl}${safeQuote})`
    })

  const rewriteReference = (rawRef: string): string => {
    const ref = String(rawRef ?? '').trim()
    if (!ref) return ref
    const lower = ref.toLowerCase()
    if (
      ref.startsWith('#') ||
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('//') ||
      lower.startsWith('data:') ||
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:')
    ) {
      return ref
    }
    if (ref.startsWith('/')) {
      if (ref.toLowerCase().startsWith('/api/gnr8/runtime/preview-assets/')) {
        const deduped = ref.replace(duplicatePreviewPrefixPattern, `${assetRoot}/`)
        return deduped
      }
      const [pathname, suffix = ''] = ref.split(/(?=[?#])/)
      const normalized = normalizeTemplateAssetPath(pathname)
      return normalized ? `${assetRoot}/${normalized}${suffix}` : ref
    }
    const [pathname, queryHash = ''] = ref.split(/(?=[?#])/)
    const joined = path.posix.join('/', baseDir, pathname)
    const normalizedJoined = normalizeTemplateAssetPath(joined)
    const normalizedRootLike = normalizeTemplateAssetPath(pathname)
    const normalizedCandidates = [normalizedJoined, normalizedRootLike].filter((candidate): candidate is string => Boolean(candidate))
    const existingCandidate =
      input.fileMapPaths && normalizedCandidates.length > 0
        ? normalizedCandidates.find((candidate) => input.fileMapPaths!.has(candidate)) ?? null
        : null
    const normalized = existingCandidate ?? normalizedJoined ?? normalizedRootLike
    if (!normalized) return ref
    return `${assetRoot}/${normalized}${queryHash}`
  }

  const rewriteSrcset = (srcset: string): string =>
    srcset
      .split(',')
      .map((entry) => {
        const trimmed = entry.trim()
        if (!trimmed) return trimmed
        const [url, descriptor] = trimmed.split(/\s+/, 2)
        const rewritten = rewriteReference(url)
        return descriptor ? `${rewritten} ${descriptor}` : rewritten
      })
      .join(', ')

  return input.html
    .replace(
      /\b(href|src|poster)\s*=\s*(["'])(.*?)\2/gi,
      (_full, attr: string, quote: string, value: string) => `${attr}=${quote}${rewriteReference(value)}${quote}`,
    )
    .replace(
      /\bsrcset\s*=\s*(["'])(.*?)\1/gi,
      (_full, quote: string, value: string) => `srcset=${quote}${rewriteSrcset(value)}${quote}`,
    )
    .replace(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_full, quote: string, value: string) => {
      const rewritten = rewriteCssUrlTokens(value, 'inline_style')
      return `style=${quote}${rewritten}${quote}`
    })
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_full, attrs: string, css: string) => {
      const rewritten = rewriteCssUrlTokens(css, 'style_block')
      return `<style${attrs}>${rewritten}</style>`
    })
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (full, scriptBody: string) => {
      if (/\/uploads\/[^"'\s<)]+/i.test(String(scriptBody ?? ''))) {
        emitCssAssetRewriteSkipped('/uploads/*', 'script_generated_css_detected', 'script_detected')
      }
      return full
    })
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

function buildRawTemplatePreviewRuntimeSummary(input: {
  baseSummary?: PreviewRuntimeSummary | null
  fileCount: number
  persistedAssetCount?: number
  externalFallbackAssetCount?: number
}): PreviewRuntimeSummary {
  const base = input.baseSummary ?? defaultPreviewRuntimeSummary()
  const baseDiagnostics = (base.previewDiagnostics ?? []).filter(
    (entry) =>
      entry !== PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED &&
      entry !== PREVIEW_RUNTIME_DIAGNOSTIC.SEMANTIC_PREVIEW_SELECTED,
  )
  return {
    ...base,
    previewMode: 'raw_template_preview',
    rendererContractAvailable: false,
    finalSiteModelAvailable: false,
    familyRenderUsed: false,
    familyRenderFamilyId: null,
    familyRenderMode: null,
    familyRenderFallbackToPage: false,
    familyRenderDiagnosticsCount: 0,
    familyRenderDiagnostics: [],
    renderedWithFallback: false,
    contentResolutionApplied: false,
    resolvedContentCount: input.fileCount,
    unresolvedContentCount: 0,
    contentResolutionDegraded: false,
    persistedAssetCount: input.persistedAssetCount,
    externalFallbackAssetCount: input.externalFallbackAssetCount,
    previewDiagnostics: withSortedDiagnostics([
      ...baseDiagnostics,
      PREVIEW_RUNTIME_DIAGNOSTIC.RAW_TEMPLATE_PREVIEW_SELECTED,
      PREVIEW_RUNTIME_DIAGNOSTIC.RAW_TEMPLATE_PREVIEW_RENDERED,
    ]),
  }
}

function selectPreviewOverridesByVersion(input: {
  siteVersionId: string
  draftOverrides: ContentOverride[]
  publishedOverrides: ContentOverride[]
}): ContentOverride[] {
  const sameVersionDraftOverrides = input.draftOverrides.filter((override) => override.siteVersionId === input.siteVersionId)
  const sameVersionPublishedOverrides = input.publishedOverrides.filter((override) => override.siteVersionId === input.siteVersionId)
  const mergedBySlot = new Map<string, ContentOverride>()
  for (const override of sameVersionPublishedOverrides) mergedBySlot.set(override.slotKey, override)
  for (const override of sameVersionDraftOverrides) mergedBySlot.set(override.slotKey, override)
  return [...mergedBySlot.values()]
}

async function renderRawTemplateSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  previewTruth: RenderedCapturePreviewTruth
  fallbackSummary?: PreviewRuntimeSummary | null
  context: PreviewReadContext
}): Promise<ResolvedSiteVersionPreview | null> {
  const importedArtifact = await cacheLookup({
    context: input.context,
    cache: input.context.rawImportedArtifactBySiteVersionId,
    key: input.siteVersionId,
    loader: () => previewReadDependencies.getRawImportedSiteArtifact(input.siteVersionId),
  })
  const artifact =
    importedArtifact ??
    (await cacheLookup({
      context: input.context,
      cache: input.context.rawTemplateArtifactBySiteVersionId,
      key: input.siteVersionId,
      loader: () => previewReadDependencies.getRawTemplateSiteArtifact(input.siteVersionId),
    }))
  if (!artifact) return null
  const entryAsset = await cacheLookup({
    context: input.context,
    cache: input.context.rawTemplateAssetByKey,
    key: `${input.siteVersionId}:${artifact.entryHtmlPath}`,
    loader: () =>
      previewReadDependencies.getRawTemplateSiteAsset({
        siteVersionId: input.siteVersionId,
        filePath: artifact.entryHtmlPath,
      }),
  })
  if (!entryAsset) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
      message: 'Raw template entry HTML is unavailable for this site version.',
    })
  }

  const html = rewriteRawTemplateAssetReferences({
    html: entryAsset.bytes.toString('utf8'),
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    entryHtmlPath: artifact.entryHtmlPath,
    fileMapPaths: new Set(Object.keys(artifact.fileMap ?? {})),
  })
  const slots = await cacheLookup({
    context: input.context,
    cache: input.context.slotsBySiteVersionId,
    key: artifact.siteVersionId,
    loader: () => previewReadDependencies.listContentSlots(artifact.siteVersionId),
  })
  console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDES_LOAD_STARTED', {
    siteVersionId: artifact.siteVersionId,
  })
  const draftOverrides = await cacheLookup({
    context: input.context,
    cache: input.context.overridesBySiteVersionAndStatus,
    key: `${artifact.siteVersionId}:draft`,
    loader: () => previewReadDependencies.listContentOverrides({ siteVersionId: artifact.siteVersionId, status: 'draft' }),
  })
  const publishedOverrides = await cacheLookup({
    context: input.context,
    cache: input.context.overridesBySiteVersionAndStatus,
    key: `${artifact.siteVersionId}:published`,
    loader: () => previewReadDependencies.listContentOverrides({ siteVersionId: artifact.siteVersionId, status: 'published' }),
  })
  console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDES_LOADED', {
    siteVersionId: artifact.siteVersionId,
    draftCount: draftOverrides.length,
    publishedCount: publishedOverrides.length,
    slotKeys: slots.map((slot) => slot.slotKey),
  })
  const sameVersionDraftOverrides = draftOverrides.filter((override) => override.siteVersionId === artifact.siteVersionId)
  const sameVersionPublishedOverrides = publishedOverrides.filter((override) => override.siteVersionId === artifact.siteVersionId)
  if (sameVersionDraftOverrides.length !== draftOverrides.length || sameVersionPublishedOverrides.length !== publishedOverrides.length) {
    console.info('[gnr8.content-runtime] CONTENT_RUNTIME_VERSION_MISMATCH_BLOCKED', {
      siteId: artifact.siteId,
      expectedSiteVersionId: artifact.siteVersionId,
      blockedCount:
        (draftOverrides.length - sameVersionDraftOverrides.length) +
        (publishedOverrides.length - sameVersionPublishedOverrides.length),
      mode: 'preview',
    })
  }
  console.info('[gnr8.content-runtime] CONTENT_RUNTIME_VERSION_RESOLVED', {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    mode: 'preview',
  })
  const selectedOverrides = selectPreviewOverridesByVersion({
    siteVersionId: artifact.siteVersionId,
    draftOverrides,
    publishedOverrides,
  })
  console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDES_APPLY_STARTED', {
    siteVersionId: artifact.siteVersionId,
    draftCount: sameVersionDraftOverrides.length,
    publishedCount: sameVersionPublishedOverrides.length,
    mergedOverrideCount: selectedOverrides.length,
    slotKeys: selectedOverrides.map((override) => override.slotKey),
  })
  if (selectedOverrides.length === 0) {
    console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDES_EMPTY', {
      siteVersionId: artifact.siteVersionId,
      draftCount: sameVersionDraftOverrides.length,
      publishedCount: sameVersionPublishedOverrides.length,
      mergedOverrideCount: 0,
      slotKeys: [],
    })
  }
  const patched = applyContentOverridesToRawHtml({
    html,
    slots,
    overrides: selectedOverrides,
  })
  console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDES_APPLIED', {
    siteVersionId: artifact.siteVersionId,
    draftCount: sameVersionDraftOverrides.length,
    publishedCount: sameVersionPublishedOverrides.length,
    mergedOverrideCount: selectedOverrides.length,
    appliedCount: patched.appliedCount,
    skippedCount: patched.skippedCount,
    slotKeys: selectedOverrides.map((override) => override.slotKey),
  })
  if (selectedOverrides.length > 0 && patched.appliedCount === 0) {
    const selectorBySlot = new Map(slots.map((slot) => [slot.slotKey, slot.sourceSelector]))
    console.error('[gnr8.content-runtime] CONTENT_OVERRIDE_APPLY_FAILED', {
      siteVersionId: artifact.siteVersionId,
      slotKeys: selectedOverrides.map((override) => override.slotKey),
      selectors: selectedOverrides.map((override) => selectorBySlot.get(override.slotKey) ?? null),
      htmlLength: html.length,
      mergedOverrideCount: selectedOverrides.length,
      appliedCount: patched.appliedCount,
    })
  }
  for (const skipped of patched.skippedDiagnostics) {
    if (skipped.reason === 'selector_missing') {
      console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDE_SELECTOR_MISSING', {
        siteVersionId: artifact.siteVersionId,
        slotKeys: [skipped.slotKey],
      })
    }
    if (skipped.reason === 'value_empty') {
      console.info('[gnr8.content-runtime] CONTENT_PREVIEW_OVERRIDE_VALUE_EMPTY', {
        siteVersionId: artifact.siteVersionId,
        slotKeys: [skipped.slotKey],
      })
    }
  }
  const summary = buildRawTemplatePreviewRuntimeSummary({
    baseSummary: input.fallbackSummary,
    fileCount: Object.keys(artifact.fileMap).length,
    persistedAssetCount: importedArtifact?.metadata.assetSummary.persistedAssetCount,
    externalFallbackAssetCount: importedArtifact?.metadata.assetSummary.externalFallbackAssetCount,
  })
  console.info('[preview-runtime] RAW_TEMPLATE_PREVIEW_SELECTED', {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: normalizePagePath(input.requestedPath),
    entryHtmlPath: artifact.entryHtmlPath,
    fileCount: Object.keys(artifact.fileMap).length,
  })
  if (importedArtifact) {
    console.info('[preview-runtime] RAW_IMPORT_PREVIEW_SELECTED', {
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      requestedPath: normalizePagePath(input.requestedPath),
      entryHtmlPath: artifact.entryHtmlPath,
      persistedAssetCount: importedArtifact.metadata.assetSummary.persistedAssetCount,
      externalFallbackAssetCount: importedArtifact.metadata.assetSummary.externalFallbackAssetCount,
    })
  }
  console.info('[preview-runtime] RAW_TEMPLATE_PREVIEW_RENDERED', {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: normalizePagePath(input.requestedPath),
    bytes: entryAsset.sizeBytes,
  })
  return {
    ...withPreviewTruth({
      preview: {
        siteId: artifact.siteId,
        siteVersionId: artifact.siteVersionId,
        path: normalizePagePath(input.requestedPath),
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        html: patched.html,
        source: 'raw_template_site',
        previewMode: 'raw_template_preview',
        previewRuntimeSummary: summary,
      },
      previewTruth: input.previewTruth,
      fallbackUsedOverride: false,
    }),
    sourceMode: 'raw_template',
    contentDebug: {
      siteVersionId: artifact.siteVersionId,
      rawTemplateArtifactFound: true,
      draftOverrideCount: sameVersionDraftOverrides.length,
      publishedOverrideCount: sameVersionPublishedOverrides.length,
      mergedOverrideCount: selectedOverrides.length,
      appliedCount: patched.appliedCount,
      skippedCount: patched.skippedCount,
      skippedDiagnostics: patched.skippedDiagnostics,
      slotKeys: selectedOverrides.map((override) => override.slotKey).slice(0, 10),
    },
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
  context: PreviewReadContext
}): Promise<ResolvedSiteVersionPreview> {
  const binding = await cacheLookup({
    context: input.context,
    cache: input.context.artifactBindingBySiteVersionId,
    key: input.siteVersionId,
    loader: () => previewReadDependencies.getSiteVersionArtifactBinding(input.siteVersionId),
  })
  if (!binding || !binding.artifactId) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
      message: 'No transformed runtime artifact is available for this site version.',
    })
  }

  const artifact = await cacheLookup({
    context: input.context,
    cache: input.context.artifactById,
    key: binding.artifactId,
    loader: () => previewReadDependencies.getArtifactById(binding.artifactId!),
  })
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
  siteVersion: CanonicalSiteVersionSnapshot
  requestedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
  previewTruth: RenderedCapturePreviewTruth
}): Promise<ResolvedSiteVersionPreview> {
  const { buildDeterministicArtifactBundle } = await import('@/gnr8/runtime/artifact-builder')
  const artifact = buildDeterministicArtifactBundle({
    siteVersion: input.siteVersion,
    renderMode: 'PREVIEW',
  })

  const previewRuntimeSummary = input.fallbackSummary ?? defaultPreviewRuntimeSummary()

  const resolved = resolveHtmlForPath({
    htmlByPath: artifact.htmlByPath,
    requestedPath: input.requestedPath,
    diagnostics: {
      siteId: input.siteVersion.siteId,
      runtimeSiteId: input.siteVersion.siteId,
      runtimeSiteVersionId: input.siteVersion.id,
      matchedPageId: previewRuntimeSummary.matchedPageId,
      unresolvedPathsCount: previewRuntimeSummary.unresolvedContentCount,
    },
  })

  return {
    ...withPreviewTruth({
      preview: {
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
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
  siteVersion: CanonicalSiteVersionSnapshot
  requestedPath: string
  previewTruth: RenderedCapturePreviewTruth
}): Promise<{
  preview: ResolvedSiteVersionPreview | null
  fallbackSummary: PreviewRuntimeSummary
}> {
  const { preparePreviewRuntime } = await import('@/gnr8/preview-runtime/preview-runtime-preparation')
  const preparation = preparePreviewRuntime({
    siteVersion: input.siteVersion,
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
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        path: input.requestedPath,
        rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
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

export async function renderSiteVersionPreview(input: {
  siteVersionId: string
  path?: string
  mode?: unknown
  requestCorrelationKey?: string
}) {
  const requestCorrelationKey =
    String(input.requestCorrelationKey ?? '').trim() || `preview:${input.siteVersionId}:${Date.now().toString(36)}`
  const context = createPreviewReadContext(requestCorrelationKey)
  const poolAtStart = previewReadDependencies.getPoolStatus()
  console.info('[gnr8.runtime.preview] PREVIEW_DB_QUERY_BATCH_STARTED', {
    requestCorrelationKey,
    queryCount: context.queryCount,
    uniqueLookupCount: context.uniqueLookupCount,
    poolTotalCount: poolAtStart.totalCount,
    poolIdleCount: poolAtStart.idleCount,
    poolWaitingCount: poolAtStart.waitingCount,
  })
  if (poolAtStart.waitingCount >= PREVIEW_DB_POOL_WAITING_THRESHOLD) {
    console.warn('[gnr8.runtime.preview] PREVIEW_DB_POOL_EXHAUSTION_PREVENTED', {
      requestCorrelationKey,
      queryCount: context.queryCount,
      uniqueLookupCount: context.uniqueLookupCount,
      poolTotalCount: poolAtStart.totalCount,
      poolIdleCount: poolAtStart.idleCount,
      poolWaitingCount: poolAtStart.waitingCount,
      reasonCode: 'POOL_WAITING_COUNT_HIGH',
    })
    throw new PreviewDbBackpressureError({
      requestCorrelationKey,
      poolWaitingCount: poolAtStart.waitingCount,
    })
  }

  const requestedPath = normalizePagePath(input.path ?? '/')
  const mode: SiteVersionPreviewMode = normalizeSiteVersionPreviewMode(input.mode)
  try {
    console.info('[gnr8.runtime.preview] PREVIEW_DB_POOL_STATUS', {
      requestCorrelationKey,
      queryCount: context.queryCount,
      uniqueLookupCount: context.uniqueLookupCount,
      poolTotalCount: poolAtStart.totalCount,
      poolIdleCount: poolAtStart.idleCount,
      poolWaitingCount: poolAtStart.waitingCount,
      phase: 'before_preview_reads',
    })
    const siteVersion = await cacheLookup({
      context,
      cache: context.siteVersionById,
      key: input.siteVersionId,
      loader: () => previewReadDependencies.getSiteVersion(input.siteVersionId),
    })
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
    if (mode !== 'debug') {
      const rawTemplatePreview = await renderRawTemplateSiteVersionPreview({
        siteVersionId: input.siteVersionId,
        requestedPath,
        previewTruth,
        context,
      })
      if (rawTemplatePreview) return rawTemplatePreview
      if (mode === 'raw_template_preview') {
        throw new SiteVersionPreviewUnavailableError({
          code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
          message: 'Raw template preview is not available for this site version.',
        })
      }
    }

    if (mode === 'transformed') {
      const reactPreview = await renderReactRuntimeSiteVersionPreview({
        siteVersion,
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
          context,
        })
      } catch (error) {
        if (error instanceof SiteVersionPreviewUnavailableError && error.code === 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE') {
          return renderDebugSiteVersionPreview({
            siteVersion,
            requestedPath,
            fallbackSummary,
            previewTruth,
          })
        }
        throw error
      }
    }

    return renderDebugSiteVersionPreview({
      siteVersion,
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
  } finally {
    const poolAtEnd = previewReadDependencies.getPoolStatus()
    console.info('[gnr8.runtime.preview] PREVIEW_DB_QUERY_BATCH_COMPLETED', {
      requestCorrelationKey,
      queryCount: context.queryCount,
      uniqueLookupCount: context.uniqueLookupCount,
      poolTotalCount: poolAtEnd.totalCount,
      poolIdleCount: poolAtEnd.idleCount,
      poolWaitingCount: poolAtEnd.waitingCount,
    })
  }
}

export const __unifiedRenderPreviewTestUtils = {
  resolveHtmlForPath,
  resolveSemanticFallbackPreview,
  resolveRenderedCapturePreviewTruth,
  rewriteRawTemplateAssetReferences,
  selectPreviewOverridesByVersion,
  createPreviewReadContext,
  cacheLookup,
}
