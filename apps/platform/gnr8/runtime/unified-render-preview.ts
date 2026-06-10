import path from 'node:path'

import { normalizePagePath } from '@/gnr8/runtime/deterministic'
import { createRuntimeCorrelationKey } from '@/gnr8/runtime/identity/runtime-identity'
import {
  RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC,
  normalizeRawTemplateRouteMapPath,
  resolveRawTemplateRouteMapFile,
  routeMapFromProvenance,
  type RawTemplateRouteMapResolution,
} from '@/gnr8/runtime/raw-template-route-map-resolver'
import {
  RAW_PREVIEW_URI_DECODE_DIAGNOSTIC,
  safeDecodeURIComponent,
} from '@/gnr8/runtime/raw-preview-uri-decoding'
import {
  getArtifactById,
  listContentOverrides,
  listContentSlots,
  getRawTemplateSiteArtifact,
  getRawImportedSiteArtifact,
  getRawTemplateSiteAsset,
  getSiteVersion,
  getSiteVersionArtifactBinding,
  type RuntimeStoreDbClient,
} from '@/gnr8/runtime/runtime-store'
import { getSuperadminPool } from '@/src/superadmin/db'
import type { ContentOverride } from '@/gnr8/runtime/content-binding'
import type { CanonicalSiteVersionSnapshot, RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import {
  validateMultiPagePreview,
  type MultiPagePreviewValidation,
} from '@/gnr8/runtime/multipage-preview-validation'
import { buildSiteVersionPreviewUrl, normalizeSiteVersionPreviewMode, type SiteVersionPreviewMode } from '@/gnr8/site/site-preview-contract'
import { normalizeInternalHref, normalizeSeedUrl } from '@/gnr8/multipage-import/normalization/route-normalization'
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

type RawTemplatePreviewEvidence = NonNullable<PreviewRuntimeSummary['rawTemplatePreviewEvidence']>

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
  multiPagePreviewValidation?: MultiPagePreviewValidation
  rawTemplatePreviewEvidence?: RawTemplatePreviewEvidence
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
  acquireRuntimeDbClient: () => Promise<RuntimeStoreDbClient>
  requestScopedDbClientEnabled: boolean
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
  acquireRuntimeDbClient: () => getSuperadminPool().connect(),
  requestScopedDbClientEnabled: true,
}

let previewReadDependencies: PreviewReadDependencies = defaultPreviewReadDependencies

export function setUnifiedRenderPreviewDependenciesForTest(overrides: Partial<PreviewReadDependencies>): () => void {
  const previous = previewReadDependencies
  previewReadDependencies = {
    ...previewReadDependencies,
    ...overrides,
    requestScopedDbClientEnabled:
      overrides.requestScopedDbClientEnabled ??
      (Object.prototype.hasOwnProperty.call(overrides, 'acquireRuntimeDbClient')
        ? previewReadDependencies.requestScopedDbClientEnabled
        : false),
  }
  return () => {
    previewReadDependencies = previous
  }
}

type PreviewReadContext = {
  requestCorrelationKey: string
  queryCount: number
  uniqueLookupCount: number
  dbClient: RuntimeStoreDbClient | null
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
    dbClient: null,
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
  diagnostics?: {
    hitEvent?: string
    missEvent?: string
    resource: string
  }
}): Promise<T> {
  const existing = input.cache.get(input.key)
  if (existing) {
    if (input.diagnostics?.hitEvent) {
      console.info(`[gnr8.runtime.preview] ${input.diagnostics.hitEvent}`, {
        requestCorrelationKey: input.context.requestCorrelationKey,
        resource: input.diagnostics.resource,
        queryCount: input.context.queryCount,
        uniqueLookupCount: input.context.uniqueLookupCount,
      })
    }
    return existing
  }
  if (input.diagnostics?.missEvent) {
    console.info(`[gnr8.runtime.preview] ${input.diagnostics.missEvent}`, {
      requestCorrelationKey: input.context.requestCorrelationKey,
      resource: input.diagnostics.resource,
      queryCount: input.context.queryCount,
      uniqueLookupCount: input.context.uniqueLookupCount + 1,
    })
  }
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

function escapeHtmlAttribute(value: string): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
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

function parseUrlWithSafeEscapes(value: string): URL | null {
  const raw = String(value ?? '')
  try {
    return new URL(raw)
  } catch {
    try {
      return new URL(raw.replace(/%(?![0-9a-fA-F]{2})/g, '%25'))
    } catch {
      return null
    }
  }
}

export const MULTIPAGE_LINK_REWRITE_DIAGNOSTIC = {
  MULTIPAGE_LINK_REWRITE_STARTED: 'MULTIPAGE_LINK_REWRITE_STARTED',
  MULTIPAGE_LINK_REWRITTEN: 'MULTIPAGE_LINK_REWRITTEN',
  MULTIPAGE_LINK_SKIPPED_EXTERNAL: 'MULTIPAGE_LINK_SKIPPED_EXTERNAL',
  MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME: 'MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME',
  MULTIPAGE_LINK_SKIPPED_HASH_ONLY: 'MULTIPAGE_LINK_SKIPPED_HASH_ONLY',
  MULTIPAGE_LINK_SKIPPED_ASSET: 'MULTIPAGE_LINK_SKIPPED_ASSET',
  MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED: 'MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED',
  MULTIPAGE_LINK_REWRITE_COMPLETED: 'MULTIPAGE_LINK_REWRITE_COMPLETED',
} as const

export const MULTIPAGE_PREVIEW_ISOLATION_DIAGNOSTIC = {
  MULTIPAGE_PREVIEW_PAGE_ISOLATED: 'MULTIPAGE_PREVIEW_PAGE_ISOLATED',
} as const

export const RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC = {
  PREVIEW_ROOT_ROUTE_SELECTED: 'PREVIEW_ROOT_ROUTE_SELECTED',
  PREVIEW_ROUTE_MAP_ENTRY_SELECTED: 'PREVIEW_ROUTE_MAP_ENTRY_SELECTED',
  PREVIEW_RAW_FILE_SELECTED: 'PREVIEW_RAW_FILE_SELECTED',
  PREVIEW_HTML_BYTES_READ: 'PREVIEW_HTML_BYTES_READ',
  PREVIEW_LINK_REWRITE_STARTED: 'PREVIEW_LINK_REWRITE_STARTED',
  PREVIEW_LINK_REWRITE_COMPLETED: 'PREVIEW_LINK_REWRITE_COMPLETED',
  PREVIEW_LINKS_REWRITTEN_COUNT: 'PREVIEW_LINKS_REWRITTEN_COUNT',
  RAW_PREVIEW_SCRIPTS_DISABLED: 'RAW_PREVIEW_SCRIPTS_DISABLED',
  RAW_PREVIEW_SCRIPT_POLICY_APPLIED: 'RAW_PREVIEW_SCRIPT_POLICY_APPLIED',
  RAW_PREVIEW_URI_DECODE_WARNING: RAW_PREVIEW_URI_DECODE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_WARNING,
  RAW_PREVIEW_URI_DECODE_FALLBACK_USED: RAW_PREVIEW_URI_DECODE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_FALLBACK_USED,
} as const

export const TRANSFORMED_PREVIEW_DIAGNOSTIC = {
  TRANSFORMED_PREVIEW_DB_READ_STARTED: 'TRANSFORMED_PREVIEW_DB_READ_STARTED',
  TRANSFORMED_PREVIEW_DB_READ_COMPLETED: 'TRANSFORMED_PREVIEW_DB_READ_COMPLETED',
  TRANSFORMED_PREVIEW_DB_READ_COUNT: 'TRANSFORMED_PREVIEW_DB_READ_COUNT',
  TRANSFORMED_PREVIEW_ARTIFACT_CACHE_HIT: 'TRANSFORMED_PREVIEW_ARTIFACT_CACHE_HIT',
  TRANSFORMED_PREVIEW_ARTIFACT_CACHE_MISS: 'TRANSFORMED_PREVIEW_ARTIFACT_CACHE_MISS',
  TRANSFORMED_PREVIEW_HOME_ROUTE_SELECTED: 'TRANSFORMED_PREVIEW_HOME_ROUTE_SELECTED',
  TRANSFORMED_PREVIEW_RAW_RESOLUTION_SKIPPED: 'TRANSFORMED_PREVIEW_RAW_RESOLUTION_SKIPPED',
  TRANSFORMED_PREVIEW_DIAGNOSTIC_CONTENT_BLOCKED: 'TRANSFORMED_PREVIEW_DIAGNOSTIC_CONTENT_BLOCKED',
  TRANSFORMED_PREVIEW_RAW_ROUTE_FALLBACK_USED: 'TRANSFORMED_PREVIEW_RAW_ROUTE_FALLBACK_USED',
  TRANSFORMED_PREVIEW_DIAGNOSTIC_FALLBACK_UNAVAILABLE: 'TRANSFORMED_PREVIEW_DIAGNOSTIC_FALLBACK_UNAVAILABLE',
} as const

class TransformedPreviewDiagnosticContentError extends Error {
  readonly code = TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DIAGNOSTIC_CONTENT_BLOCKED
  readonly siteId: string
  readonly siteVersionId: string
  readonly requestedPath: string
  readonly resolvedPath: string
  readonly matchedPatterns: string[]

  constructor(input: {
    siteId: string
    siteVersionId: string
    requestedPath: string
    resolvedPath: string
    matchedPatterns: string[]
  }) {
    super('Transformed preview output contained diagnostic recovery content.')
    this.name = 'TransformedPreviewDiagnosticContentError'
    this.siteId = input.siteId
    this.siteVersionId = input.siteVersionId
    this.requestedPath = input.requestedPath
    this.resolvedPath = input.resolvedPath
    this.matchedPatterns = input.matchedPatterns
  }
}

type MultiPageLinkRewriteCounts = {
  rewritten: number
  skippedExternal: number
  skippedUnsupported: number
  skippedRouteMissing: number
  skippedAsset: number
  skippedHashOnly: number
}

type MultiPageLinkRewriteResult = {
  html: string
  diagnostics: string[]
  counts: MultiPageLinkRewriteCounts
  missingRouteSamples: string[]
}

type RawPreviewAssetRewriteEvidence = NonNullable<RawTemplatePreviewEvidence['rawPreviewAssetRewriteEvidence']>
type RawPreviewAssetGraphEvidence = NonNullable<RawTemplatePreviewEvidence['rawPreviewAssetGraphEvidence']>
type RawPreviewScriptPolicyEvidence = NonNullable<RawTemplatePreviewEvidence['rawPreviewScriptPolicyEvidence']>
type RawPreviewAssetGraphFoundRef = RawPreviewAssetGraphEvidence['stylesheetRefsFound'][number]
type RawPreviewAssetGraphMissingRef = RawPreviewAssetGraphEvidence['stylesheetRefsMissing'][number]
type RawPreviewCssCascadeEntry = RawPreviewAssetGraphEvidence['cssCascadeOrderBefore'][number]
type RawPreviewAssetReferenceEvidenceItem = NonNullable<RawPreviewAssetRewriteEvidence['assetReferenceEvidence']>[number]
type RawPreviewMissingAssetReferenceItem = NonNullable<RawPreviewAssetRewriteEvidence['missingAssetReferences']>[number]

type RawPreviewAssetRewriteSource = 'html_attr' | 'srcset' | 'lazy_attr' | 'inline_style' | 'style_block' | 'stylesheet' | 'script_detected'

type RawPreviewAssetReferenceKind = 'css' | 'font' | 'image' | 'svg' | 'iframe' | 'external' | 'data' | 'unsupported' | 'unknown' | 'stylesheet' | 'other'

type RawPreviewAssetReferenceResolution = {
  originalUrl: string
  normalizedReference: string | null
  resolvedCandidate: string | null
  rewrittenUrl: string | null
  normalizedPath: string | null
  reason: string
  externalPreserved: boolean
  missing: boolean
  alreadyRewritten: boolean
  isDataUrl: boolean
  kind: RawPreviewAssetReferenceKind
}

function defaultRawPreviewAssetRewriteEvidence(): RawPreviewAssetRewriteEvidence {
  return {
    stylesheetsInspected: 0,
    cssUrlReferencesFound: 0,
    cssUrlReferencesRewritten: 0,
    cssUrlReferencesExternalPreserved: 0,
    cssUrlReferencesMissing: 0,
    imageReferencesFound: 0,
    imageReferencesRewritten: 0,
    imageReferencesMissing: 0,
    fontStylesheetsFound: 0,
    fontStylesheetsPreserved: 0,
    fontFilesFound: 0,
    fontFilesRewritten: 0,
    fontFamilyDongleDetected: false,
    rootHeadingDongleEvidence: [],
    malformedUriDecodeFallbackCount: 0,
    assetReferencesInspected: 0,
    assetReferencesRewritten: 0,
    assetReferencesMissing: 0,
    assetReferencesExternalPreserved: 0,
    assetReferenceEvidence: [],
    missingAssetReferences: [],
  }
}

function mergeRawPreviewAssetRewriteEvidence(
  left: RawPreviewAssetRewriteEvidence,
  right: RawPreviewAssetRewriteEvidence,
): RawPreviewAssetRewriteEvidence {
  return {
    stylesheetsInspected: left.stylesheetsInspected + right.stylesheetsInspected,
    cssUrlReferencesFound: left.cssUrlReferencesFound + right.cssUrlReferencesFound,
    cssUrlReferencesRewritten: left.cssUrlReferencesRewritten + right.cssUrlReferencesRewritten,
    cssUrlReferencesExternalPreserved: left.cssUrlReferencesExternalPreserved + right.cssUrlReferencesExternalPreserved,
    cssUrlReferencesMissing: left.cssUrlReferencesMissing + right.cssUrlReferencesMissing,
    imageReferencesFound: left.imageReferencesFound + right.imageReferencesFound,
    imageReferencesRewritten: left.imageReferencesRewritten + right.imageReferencesRewritten,
    imageReferencesMissing: left.imageReferencesMissing + right.imageReferencesMissing,
    fontStylesheetsFound: left.fontStylesheetsFound + right.fontStylesheetsFound,
    fontStylesheetsPreserved: left.fontStylesheetsPreserved + right.fontStylesheetsPreserved,
    fontFilesFound: left.fontFilesFound + right.fontFilesFound,
    fontFilesRewritten: left.fontFilesRewritten + right.fontFilesRewritten,
    fontFamilyDongleDetected: left.fontFamilyDongleDetected || right.fontFamilyDongleDetected,
    rootHeadingDongleEvidence: [...new Set([...left.rootHeadingDongleEvidence, ...right.rootHeadingDongleEvidence])].slice(0, 12),
    malformedUriDecodeFallbackCount: (left.malformedUriDecodeFallbackCount ?? 0) + (right.malformedUriDecodeFallbackCount ?? 0),
    assetReferencesInspected: (left.assetReferencesInspected ?? 0) + (right.assetReferencesInspected ?? 0),
    assetReferencesRewritten: (left.assetReferencesRewritten ?? 0) + (right.assetReferencesRewritten ?? 0),
    assetReferencesMissing: (left.assetReferencesMissing ?? 0) + (right.assetReferencesMissing ?? 0),
    assetReferencesExternalPreserved: (left.assetReferencesExternalPreserved ?? 0) + (right.assetReferencesExternalPreserved ?? 0),
    assetReferenceEvidence: [...(left.assetReferenceEvidence ?? []), ...(right.assetReferenceEvidence ?? [])],
    missingAssetReferences: [...(left.missingAssetReferences ?? []), ...(right.missingAssetReferences ?? [])],
  }
}

function uniqByReference<T extends { originalReference: string; sourceType: string; reason: string }>(items: T[], limit = 40): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const key = `${item.originalReference}\n${item.sourceType}\n${item.reason}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

function toGraphFoundRef(item: RawPreviewAssetReferenceEvidenceItem): RawPreviewAssetGraphFoundRef {
  return {
    originalReference: item.originalReference,
    matchedFilePath: item.matchedFilePath,
    servedPreviewUrl: item.servedPreviewUrl,
    reason: item.reason,
    sourceType: item.sourceType,
  }
}

function toGraphMissingRef(item: RawPreviewMissingAssetReferenceItem): RawPreviewAssetGraphMissingRef {
  return {
    originalReference: item.originalReference,
    resolvedCandidate: item.resolvedCandidate,
    reason: item.reason,
    sourceType: item.sourceType,
  }
}

function isGraphStylesheetRef(item: { assetKind: string; originalReference: string; sourceType: string }): boolean {
  if (isFontAssetPath(item.originalReference)) return false
  return item.assetKind === 'stylesheet' || isGoogleFontsStylesheetUrl(item.originalReference) || /\.css(?:[?#].*)?$/i.test(item.originalReference)
}

function isGraphImageRef(item: { assetKind: string }): boolean {
  return item.assetKind === 'image' || item.assetKind === 'svg'
}

function isGraphFontRef(item: { assetKind: string; originalReference: string }): boolean {
  return item.assetKind === 'font' || isGoogleFontsStylesheetUrl(item.originalReference) || containsDongleFontSignal(item.originalReference)
}

function buildPrimaryCssCandidates(stylesheetRefs: RawPreviewAssetGraphFoundRef[]): string[] {
  const scored = stylesheetRefs
    .map((ref) => {
      const value = ref.matchedFilePath ?? ref.originalReference
      const lower = value.toLowerCase()
      let score = 0
      if (/\.css(?:[?#].*)?$/i.test(value)) score += 4
      if (/(?:^|\/)(?:site|main|style|styles|user-style|stylesheet|theme|app|bundle)(?:[-_.][a-z0-9]+)?\.css(?:[?#].*)?$/i.test(value)) score += 6
      if (lower.includes('font') || lower.includes('googleapis')) score -= 3
      if (ref.servedPreviewUrl) score += 2
      if (ref.reason.includes('matched_persisted_file')) score += 2
      return { value, score }
    })
    .filter((entry) => entry.value && !isGoogleFontsStylesheetUrl(entry.value))
    .sort((left, right) => right.score - left.score || left.value.localeCompare(right.value))
  return [...new Set(scored.map((entry) => entry.value))].slice(0, 8)
}

function parseHtmlTagAttributes(value: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const source = String(value ?? '')
  const attrPattern = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  for (const match of source.matchAll(attrPattern)) {
    const name = String(match[1] ?? '').trim().toLowerCase()
    if (!name) continue
    attrs[name] = decodeBasicHtmlEntities(String(match[2] ?? match[3] ?? match[4] ?? '')).trim()
  }
  return attrs
}

function relTokens(value: string | null | undefined): Set<string> {
  return new Set(String(value ?? '').toLowerCase().split(/\s+/).filter(Boolean))
}

function linkTagReferencesStylesheet(tag: string, href: string): boolean {
  const attrs = parseHtmlTagAttributes(String(tag ?? '').replace(/^<link\b/i, '').replace(/\/?>$/i, ''))
  const rel = relTokens(attrs.rel)
  const asValue = String(attrs.as ?? '').trim().toLowerCase()
  const type = String(attrs.type ?? '').trim().toLowerCase()
  if (isFontAssetPath(href)) return false
  if (rel.has('stylesheet')) return true
  if (rel.has('preload') && asValue === 'style') return true
  if (isGoogleFontsStylesheetUrl(href)) return true
  if (type === 'text/css') return true
  return /\.css(?:[?#].*)?$/i.test(href)
}

function extractCssImportReferences(css: string): Array<{ reference: string; media: string | null }> {
  const refs: Array<{ reference: string; media: string | null }> = []
  const source = String(css ?? '')
  const urlPattern = /@import\s+url\(\s*(["']?)([^"')\s]+)\1\s*\)([^;]*)(?:;|$)/gi
  const stringPattern = /@import\s+(["'])([^"']+)\1([^;]*)(?:;|$)/gi
  for (const match of source.matchAll(urlPattern)) {
    const reference = String(match[2] ?? '').trim()
    if (!reference) continue
    refs.push({ reference, media: String(match[3] ?? '').trim() || null })
  }
  for (const match of source.matchAll(stringPattern)) {
    const reference = String(match[2] ?? '').trim()
    if (!reference) continue
    refs.push({ reference, media: String(match[3] ?? '').trim() || null })
  }
  return refs
}

function extractRawPreviewCssCascadeOrder(html: string): RawPreviewCssCascadeEntry[] {
  const entries: RawPreviewCssCascadeEntry[] = []
  const source = String(html ?? '')
  const tagPattern = /<link\b[^>]*>|<style\b([^>]*)>([\s\S]*?)<\/style>/gi
  let index = 0
  let styleBlockIndex = 0
  for (const match of source.matchAll(tagPattern)) {
    const full = String(match[0] ?? '')
    if (/^<link\b/i.test(full)) {
      const attrs = parseHtmlTagAttributes(full.replace(/^<link\b/i, '').replace(/\/?>$/i, ''))
      const href = attrs.href ?? ''
      if (!href || !linkTagReferencesStylesheet(full, href)) continue
      const rel = attrs.rel || null
      const asValue = attrs.as || null
      entries.push({
        index: index++,
        tagName: 'link',
        reference: href,
        rel,
        as: asValue,
        media: attrs.media || null,
        type: attrs.type || null,
        sourceType: relTokens(rel).has('preload') && String(asValue ?? '').toLowerCase() === 'style' ? 'preload_style' : 'link_stylesheet',
      })
      continue
    }

    styleBlockIndex += 1
    const attrs = parseHtmlTagAttributes(String(match[1] ?? ''))
    entries.push({
      index: index++,
      tagName: 'style',
      reference: `inline-style-block:${styleBlockIndex}`,
      rel: null,
      as: null,
      media: attrs.media || null,
      type: attrs.type || null,
      sourceType: 'style_block',
    })
    for (const importRef of extractCssImportReferences(String(match[2] ?? ''))) {
      entries.push({
        index: index++,
        tagName: '@import',
        reference: importRef.reference,
        rel: null,
        as: null,
        media: importRef.media,
        type: null,
        sourceType: 'style_block_import',
      })
    }
  }
  return entries
}

function cssCascadeOrderSignature(entries: RawPreviewCssCascadeEntry[]): string[] {
  return entries.map((entry) =>
    [
      entry.tagName,
      entry.rel ?? '',
      entry.as ?? '',
      entry.media ?? '',
      entry.type ?? '',
      entry.sourceType,
    ].join('|'),
  )
}

function buildRawPreviewAssetGraphEvidence(input: {
  routePath: string
  rawFilePath: string
  evidence: RawPreviewAssetRewriteEvidence
  cssCascadeOrderBefore: RawPreviewCssCascadeEntry[]
  cssCascadeOrderAfter: RawPreviewCssCascadeEntry[]
}): RawPreviewAssetGraphEvidence {
  const references = input.evidence.assetReferenceEvidence ?? []
  const missingReferences = input.evidence.missingAssetReferences ?? []
  const stylesheetRefsFound = uniqByReference(references.filter(isGraphStylesheetRef).map(toGraphFoundRef))
  const imageRefsFound = uniqByReference(references.filter(isGraphImageRef).map(toGraphFoundRef))
  const fontRefsFound = uniqByReference(references.filter(isGraphFontRef).map(toGraphFoundRef))
  const stylesheetRefsMissing = uniqByReference(missingReferences.filter(isGraphStylesheetRef).map(toGraphMissingRef), 20)
  const imageRefsMissing = uniqByReference(missingReferences.filter(isGraphImageRef).map(toGraphMissingRef), 20)
  const fontRefsMissing = uniqByReference(missingReferences.filter(isGraphFontRef).map(toGraphMissingRef), 20)
  const stylesheetRefsRewritten = stylesheetRefsFound.filter((ref) => Boolean(ref.servedPreviewUrl))
  const stylesheetRefsPreservedExternal = stylesheetRefsFound.filter(
    (ref) => !ref.servedPreviewUrl && (ref.reason === 'external_reference_preserved' || /^(?:https?:)?\/\//i.test(ref.originalReference)),
  )
  const imageRefsRewritten = imageRefsFound.filter((ref) => Boolean(ref.servedPreviewUrl))
  const fontRefsRewritten = fontRefsFound.filter((ref) => Boolean(ref.servedPreviewUrl))
  const dongleRef =
    references.find((entry) => containsDongleFontSignal(entry.originalReference) || containsDongleFontSignal(entry.matchedFilePath ?? '')) ??
    null
  const dongleSource = input.evidence.rootHeadingDongleEvidence[0] ?? (dongleRef ? dongleRef.sourceType : null)

  return {
    routePath: input.routePath,
    rawFilePath: input.rawFilePath,
    cssCascadeOrderBefore: input.cssCascadeOrderBefore,
    cssCascadeOrderAfter: input.cssCascadeOrderAfter,
    stylesheetRefsFound,
    stylesheetRefsRewritten,
    stylesheetRefsPreservedExternal,
    stylesheetRefsMissing,
    imageRefsFound,
    imageRefsRewritten,
    imageRefsMissing,
    fontRefsFound,
    fontRefsRewritten,
    fontRefsMissing,
    dongleEvidence: {
      detected: input.evidence.fontFamilyDongleDetected,
      source: dongleSource,
      ref: dongleRef?.originalReference ?? input.evidence.rootHeadingDongleEvidence[0] ?? null,
    },
    primaryCssCandidates: buildPrimaryCssCandidates(stylesheetRefsFound),
    topMissingStylesheetRefs: stylesheetRefsMissing.map((ref) => ref.originalReference).slice(0, 10),
    topMissingImageRefs: imageRefsMissing.map((ref) => ref.originalReference).slice(0, 10),
    stylesheetRefsFoundCount: stylesheetRefsFound.length,
    stylesheetRefsRewrittenCount: stylesheetRefsRewritten.length,
    stylesheetRefsPreservedExternalCount: stylesheetRefsPreservedExternal.length,
    stylesheetRefsMissingCount: stylesheetRefsMissing.length,
    inlineStyleBlockCount: input.cssCascadeOrderAfter.filter((entry) => entry.tagName === 'style').length,
    mediaStylesheetCount: input.cssCascadeOrderAfter.filter((entry) => Boolean(entry.media)).length,
    preloadStyleCount: input.cssCascadeOrderAfter.filter((entry) => entry.sourceType === 'preload_style').length,
    missingStylesheetRefs: stylesheetRefsMissing.map((ref) => ref.originalReference).slice(0, 20),
    cssOrderChanged:
      JSON.stringify(cssCascadeOrderSignature(input.cssCascadeOrderBefore)) !==
      JSON.stringify(cssCascadeOrderSignature(input.cssCascadeOrderAfter)),
  }
}

function splitPreviewAssetUrlSuffix(value: string): { pathname: string; suffix: string } {
  const trimmed = String(value ?? '').trim()
  const queryStart = trimmed.indexOf('?')
  const hashStart = trimmed.indexOf('#')
  const cutoff =
    queryStart < 0
      ? hashStart < 0
        ? -1
        : hashStart
      : hashStart < 0
        ? queryStart
        : Math.min(queryStart, hashStart)
  if (cutoff < 0) return { pathname: trimmed, suffix: '' }
  return { pathname: trimmed.slice(0, cutoff), suffix: trimmed.slice(cutoff) }
}

function isGoogleFontsStylesheetUrl(value: string): boolean {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized.includes('fonts.googleapis.com/css') || normalized.includes('fonts.googleapis.com/icon')
}

function containsDongleFontSignal(value: string): boolean {
  const decoded = safeDecodeURIComponent(String(value ?? '').replaceAll('+', ' ')).value
  return /\bdongle\b/i.test(decoded)
}

function isFontAssetPath(value: string): boolean {
  return /\.(?:woff2?|ttf|otf|eot)(?:[?#].*)?$/i.test(String(value ?? ''))
}

function isImageAssetPath(value: string): boolean {
  return /\.(?:apng|avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)(?:[?#].*)?$/i.test(String(value ?? ''))
}

function canonicalRawPreviewImageStem(value: string): string {
  const decoded = safeDecodeURIComponent(String(value ?? '').replaceAll('+', ' ')).value
  const withoutExtension = decoded.replace(/\.(?:apng|avif|bmp|gif|ico|jpe?g|png|svg|tiff?|webp)$/i, '')
  return withoutExtension
    .replace(/__msi___(?:jpe?g|png|webp|gif|svg)$/i, '')
    .replace(/[-_\s]+/g, '')
    .toLowerCase()
}

function findUploadSiblingImageVariant(input: {
  candidate: string
  fileMapPaths: ReadonlySet<string>
}): string | null {
  const normalized = normalizeTemplateAssetPath(input.candidate)
  if (!normalized || !isImageAssetPath(normalized) || !normalized.startsWith('uploads/')) return null
  const parts = normalized.split('/')
  if (parts.length < 3) return null
  const uploadFolder = `${parts[0]}/${parts[1]}/`
  const requestedStem = canonicalRawPreviewImageStem(path.posix.basename(normalized))
  if (!requestedStem) return null
  const matches = [...input.fileMapPaths]
    .filter((filePath) => filePath.startsWith(uploadFolder) && isImageAssetPath(filePath))
    .map((filePath) => ({
      filePath,
      stem: canonicalRawPreviewImageStem(path.posix.basename(filePath)),
      depth: filePath.split('/').length,
      webp: /\.webp(?:[?#].*)?$/i.test(filePath),
    }))
    .filter((entry) => entry.stem === requestedStem)
    .sort((left, right) => {
      if (left.depth !== right.depth) return right.depth - left.depth
      if (left.webp !== right.webp) return left.webp ? -1 : 1
      return left.filePath.localeCompare(right.filePath)
    })
  return matches[0]?.filePath ?? null
}

function cssLikelyAppliesDongleToRootHeading(css: string): string[] {
  const evidence: string[] = []
  const source = String(css ?? '')
  const rulePattern = /([^{}]+)\{([^{}]*font-family\s*:[^{}]*dongle[^{}]*)\}/gi
  for (const match of source.matchAll(rulePattern)) {
    const selector = String(match[1] ?? '').trim().replace(/\s+/g, ' ')
    if (!selector) continue
    if (/\bh[1-6]\b/i.test(selector)) evidence.push(`heading selector ${selector}`)
    if (/\bbutton\b|\.btn\b|\.button\b|\[role=["']?button/i.test(selector)) evidence.push(`button selector ${selector}`)
  }
  return evidence.slice(0, 8)
}

function defaultMultiPageLinkRewriteCounts(): MultiPageLinkRewriteCounts {
  return {
    rewritten: 0,
    skippedExternal: 0,
    skippedUnsupported: 0,
    skippedRouteMissing: 0,
    skippedAsset: 0,
    skippedHashOnly: 0,
  }
}

function firstUsableSeedUrl(provenance: RuntimeImportProvenanceSummary | null | undefined): string | null {
  const assembly = provenance?.multiPageDiscovery?.rawArtifactAssembly ?? null
  const looseProvenance = provenance as unknown as { sourceUrl?: unknown; finalUrl?: unknown } | null | undefined
  const candidates = [
    assembly?.normalizedSeedUrl,
    assembly?.seedUrl,
    looseProvenance?.sourceUrl,
    looseProvenance?.finalUrl,
  ]
  for (const candidate of candidates) {
    const raw = String(candidate ?? '').trim()
    if (raw && normalizeSeedUrl(raw)) return raw
  }
  return null
}

function currentPageUrlForRoute(input: {
  seedUrl: string
  resolution: RawTemplateRouteMapResolution
}): string {
  if (input.resolution.outcome === 'selected') {
    const direct = input.resolution.finalUrl ?? input.resolution.sourceUrl
    if (direct && normalizeSeedUrl(direct)) return direct
  }
  try {
    return new URL(input.resolution.routePath, input.seedUrl).toString()
  } catch {
    return input.seedUrl
  }
}

function hasAttribute(tag: string, attrName: string): boolean {
  return new RegExp(`\\s${attrName}(?:\\s*=|\\s|>|/)`, 'i').test(tag)
}

function appendAnchorRewriteAttributes(input: {
  tag: string
  originalHref: string
}): string {
  const marker = hasAttribute(input.tag, 'data-gnr8-multipage-link') ? '' : ' data-gnr8-multipage-link="rewritten"'
  const original = hasAttribute(input.tag, 'data-gnr8-original-href')
    ? ''
    : ` data-gnr8-original-href="${escapeHtmlAttribute(input.originalHref)}"`
  if (!marker && !original) return input.tag
  return input.tag.replace(/\s*\/?>$/, (suffix) => {
    const slash = suffix.includes('/') ? ' /' : ''
    return `${marker}${original}${slash}>`
  })
}

function rewriteRawTemplateMultiPageLinks(input: {
  html: string
  siteId: string
  siteVersionId: string
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null
  routeMapServingEnabled: boolean
  routeMapResolution: RawTemplateRouteMapResolution
}): MultiPageLinkRewriteResult {
  const counts = defaultMultiPageLinkRewriteCounts()
  const diagnostics = new Set<string>()
  const missingRouteSamples = new Set<string>()
  const routeMap = routeMapFromProvenance(input.importProvenanceSummary)
  const seedUrl = firstUsableSeedUrl(input.importProvenanceSummary)
  if (!input.routeMapServingEnabled || routeMap.length === 0 || !seedUrl || input.routeMapResolution.outcome !== 'selected') {
    return { html: input.html, diagnostics: [], counts, missingRouteSamples: [] }
  }

  diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_REWRITE_STARTED)
  const seed = normalizeSeedUrl(seedUrl)
  if (!seed) return { html: input.html, diagnostics: [], counts, missingRouteSamples: [] }
  const currentPageUrl = currentPageUrlForRoute({ seedUrl: seed.url, resolution: input.routeMapResolution })
  const importedRoutes = new Set<string>(['/'])
  for (const entry of routeMap) importedRoutes.add(normalizeRawTemplateRouteMapPath(entry.routePath))

  console.info('[preview-runtime] MULTIPAGE_LINK_REWRITE_STARTED', {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    routePath: input.routeMapResolution.routePath,
    routeCount: importedRoutes.size,
  })

  const emitSkipped = (code: string, href: string, routePath?: string) => {
    console.info(`[preview-runtime] ${code}`, {
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      href,
      routePath: routePath ?? null,
    })
  }

  const html = input.html.replace(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi, (tag: string, quote: string, rawHref: string) => {
    const href = String(rawHref ?? '').trim()
    if (!href) {
      counts.skippedUnsupported += 1
      diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME)
      emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME, href)
      return tag
    }
    if (href.startsWith('#')) {
      counts.skippedHashOnly += 1
      diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_HASH_ONLY)
      emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_HASH_ONLY, href)
      return tag
    }
    if (hasAttribute(tag, 'download')) {
      counts.skippedAsset += 1
      diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_ASSET)
      emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_ASSET, href)
      return tag
    }
    let rawUrl: URL | null = null
    try {
      rawUrl = new URL(href, currentPageUrl)
    } catch {
      rawUrl = null
    }

    const normalized = normalizeInternalHref({
      href,
      currentPageUrl,
      canonicalHost: seed.canonicalHost,
    })
    if ('skip' in normalized) {
      if (normalized.skip === 'external_host') {
        counts.skippedExternal += 1
        diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_EXTERNAL)
        emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_EXTERNAL, href)
      } else if (normalized.skip === 'hash_only') {
        counts.skippedHashOnly += 1
        diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_HASH_ONLY)
        emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_HASH_ONLY, href)
      } else if (normalized.skip === 'asset_link') {
        counts.skippedAsset += 1
        diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_ASSET)
        emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_ASSET, href)
      } else {
        counts.skippedUnsupported += 1
        diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME)
        emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME, href)
      }
      return tag
    }
    if (rawUrl?.search) {
      counts.skippedUnsupported += 1
      diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME)
      emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME, href, normalizeRawTemplateRouteMapPath(normalized.normalized.path))
      return tag
    }

    const routePath = normalizeRawTemplateRouteMapPath(normalized.normalized.path)
    if (!importedRoutes.has(routePath)) {
      counts.skippedRouteMissing += 1
      missingRouteSamples.add(routePath)
      diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED)
      emitSkipped(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED, href, routePath)
      return tag
    }

    const rewrittenHref = buildSiteVersionPreviewUrl({
      siteVersionId: input.siteVersionId,
      mode: 'raw_template_preview',
      path: routePath,
    })
    counts.rewritten += 1
    diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_REWRITTEN)
    console.info('[preview-runtime] MULTIPAGE_LINK_REWRITTEN', {
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      href,
      routePath,
      rewrittenHref,
    })
    const withHref = tag.replace(/\bhref\s*=\s*(["'])(.*?)\1/i, `href=${quote}${escapeHtmlAttribute(rewrittenHref)}${quote}`)
    return appendAnchorRewriteAttributes({ tag: withHref, originalHref: href })
  })

  diagnostics.add(MULTIPAGE_LINK_REWRITE_DIAGNOSTIC.MULTIPAGE_LINK_REWRITE_COMPLETED)
  console.info('[preview-runtime] MULTIPAGE_LINK_REWRITE_COMPLETED', {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    routePath: input.routeMapResolution.routePath,
    ...counts,
  })
  return {
    html,
    diagnostics: [...diagnostics].sort((a, b) => a.localeCompare(b)),
    counts,
    missingRouteSamples: [...missingRouteSamples].sort((a, b) => a.localeCompare(b)).slice(0, 10),
  }
}

function rewriteRawTemplateAssetReferences(input: {
  html: string
  siteId: string
  siteVersionId: string
  entryHtmlPath: string
  routePath?: string
  fileMapPaths?: ReadonlySet<string>
}): string {
  return rewriteRawTemplateAssetReferencesWithCounts(input).html
}

function rewriteRawTemplateAssetReferencesWithCounts(input: {
  html: string
  siteId: string
  siteVersionId: string
  entryHtmlPath: string
  routePath?: string
  fileMapPaths?: ReadonlySet<string>
}): { html: string; rewrittenAssetCount: number; rawPreviewAssetRewriteEvidence: RawPreviewAssetRewriteEvidence; stylesheetAssetPaths: string[] } {
  const assetRoot = `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.siteId)}/${encodeURIComponent(input.siteVersionId)}`
  const entryDir = path.posix.dirname(input.entryHtmlPath)
  const baseDir = entryDir === '.' ? '' : entryDir
  const correlationKey = createRuntimeCorrelationKey({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    entryHtmlPath: input.entryHtmlPath,
  })
  const cssUrlPattern = /url\(\s*(['"]?)([^"')]+)\1\s*\)/gi
  const cssImportUrlPattern = /@import\s+url\(\s*(["']?)([^"')\s]+)\1\s*\)([^;]*)(;?)/gi
  const cssImportStringPattern = /@import\s+(["'])([^"']+)\1([^;]*)(;?)/gi
  const duplicatePreviewPrefixPattern = new RegExp(`^${assetRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/gnr8/runtime/preview-assets/`, 'i')
  const evidence = defaultRawPreviewAssetRewriteEvidence()
  const stylesheetAssetPaths = new Set<string>()
  const routePathForEvidence = normalizePagePath(input.routePath ?? '/')
  let rewrittenAssetCount = 0

  const noteDecodeResult = (rawValue: string, sourceType: RawPreviewAssetRewriteSource | 'route_path' | 'script_detected') => {
    const result = safeDecodeURIComponent(rawValue)
    if (result.warning) {
      evidence.malformedUriDecodeFallbackCount = (evidence.malformedUriDecodeFallbackCount ?? 0) + 1
      console.warn(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_WARNING}`, {
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        sourceType,
        value: rawValue,
        reasonCode: RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_FALLBACK_USED,
        correlationKey,
      })
    }
    return result
  }

  const noteDongle = (value: string, source: string) => {
    if (!containsDongleFontSignal(value)) return
    evidence.fontFamilyDongleDetected = true
    if (source) evidence.rootHeadingDongleEvidence = [...new Set([...evidence.rootHeadingDongleEvidence, source])].slice(0, 12)
  }

  const emitCssAssetRewriteApplied = (originalUrl: string, rewrittenUrl: string, sourceType: RawPreviewAssetRewriteSource | 'script_detected') => {
    console.info('[preview-runtime] PREVIEW_CSS_ASSET_REWRITE_APPLIED', {
      originalUrl,
      rewrittenUrl,
      sourceType,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      correlationKey,
    })
  }

  const emitCssAssetRewriteSkipped = (originalUrl: string, reasonCode: string, sourceType: RawPreviewAssetRewriteSource | 'script_detected') => {
    console.info('[preview-runtime] PREVIEW_CSS_ASSET_REWRITE_SKIPPED', {
      originalUrl,
      reasonCode,
      sourceType,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      correlationKey,
    })
  }

  const addResizedImageFallbackCandidates = (candidate: string): string[] => {
    const normalized = normalizeTemplateAssetPath(candidate)
    if (!normalized) return []
    const ext = path.posix.extname(normalized)
    if (!ext || !isImageAssetPath(normalized)) return []
    const dir = path.posix.dirname(normalized)
    const basename = path.posix.basename(normalized, ext)
    const fallbackBasenames = [
      basename.replace(/-\d{2,5}x\d{2,5}(?:_\d{2,5}x\d{2,5})?$/i, ''),
      basename.replace(/-scaled$/i, ''),
    ].filter((value) => value && value !== basename)
    return fallbackBasenames
      .map((name) => normalizeTemplateAssetPath(path.posix.join(dir === '.' ? '' : dir, `${name}${ext}`)))
      .filter((value): value is string => Boolean(value))
  }

  const findFileMapCandidate = (candidates: Array<string | null>): string | null => {
    const normalizedCandidates = candidates.filter((candidate): candidate is string => Boolean(candidate))
    if (normalizedCandidates.length === 0) return null
    if (!input.fileMapPaths) return normalizedCandidates[0] ?? null
    const expandedCandidates = [...new Set(normalizedCandidates.flatMap((candidate) => [candidate, ...addResizedImageFallbackCandidates(candidate)]))]
    for (const candidate of expandedCandidates) {
      if (input.fileMapPaths.has(candidate)) return candidate
    }
    for (const candidate of expandedCandidates) {
      const suffix = `/${candidate}`
      const match = [...input.fileMapPaths].find((filePath) => filePath.endsWith(suffix))
      if (match) return match
    }
    for (const candidate of expandedCandidates) {
      const match = findUploadSiblingImageVariant({ candidate, fileMapPaths: input.fileMapPaths })
      if (match) return match
    }
    return null
  }

  const candidatePathsForReference = (ref: string, sourceType: RawPreviewAssetRewriteSource): string[] => {
    const { pathname } = splitPreviewAssetUrlSuffix(ref)
    const candidates: Array<string | null> = []
    let parsed: URL | null = null
    const decodedPathname = noteDecodeResult(pathname, sourceType).value
    const pathnameVariants = [...new Set([pathname, decodedPathname].filter(Boolean))]
    const parserPathname = decodedPathname
    parsed = /^\/\//.test(parserPathname)
      ? parseUrlWithSafeEscapes(`https:${parserPathname}`)
      : /^[a-z][a-z0-9+.-]*:/i.test(parserPathname)
        ? parseUrlWithSafeEscapes(parserPathname)
        : null
    if (parsed) {
      const hostnames = new Set([parsed.hostname])
      if (parsed.hostname.startsWith('www.')) hostnames.add(parsed.hostname.slice(4))
      else hostnames.add(`www.${parsed.hostname}`)
      for (const host of hostnames) {
        candidates.push(normalizeTemplateAssetPath(`${host}${parsed.pathname}`))
      }
      const pathOnly = normalizeTemplateAssetPath(parsed.pathname)
      candidates.push(pathOnly)
      if (pathOnly) {
        candidates.push(normalizeTemplateAssetPath(path.posix.join('/', baseDir, pathOnly)))
      }
      return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))]
    }
    for (const variant of pathnameVariants) {
      if (variant.startsWith('/')) {
        candidates.push(normalizeTemplateAssetPath(variant))
      } else {
        candidates.push(normalizeTemplateAssetPath(path.posix.join('/', baseDir, variant)))
        candidates.push(normalizeTemplateAssetPath(variant))
      }
    }
    return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))]
  }

  const resolveReference = (
    rawRef: string,
    kindHint: RawPreviewAssetReferenceKind,
    sourceType: RawPreviewAssetRewriteSource,
  ): RawPreviewAssetReferenceResolution => {
    const ref = String(rawRef ?? '').trim()
    const lower = ref.toLowerCase()
    const kind: RawPreviewAssetReferenceKind =
      kindHint === 'other'
        ? isFontAssetPath(ref)
          ? 'font'
          : isImageAssetPath(ref)
            ? /\.svg(?:[?#].*)?$/i.test(ref)
              ? 'svg'
              : 'image'
            : 'other'
        : kindHint
    const candidatePaths = ref ? candidatePathsForReference(ref, sourceType) : []
    const resolvedCandidate = candidatePaths[0] ?? null
    const normalizedReference = splitPreviewAssetUrlSuffix(ref).pathname || null
    if (!ref) {
      return {
        originalUrl: ref,
        normalizedReference,
        resolvedCandidate,
        rewrittenUrl: null,
        normalizedPath: null,
        reason: 'empty_reference',
        externalPreserved: false,
        missing: true,
        alreadyRewritten: false,
        isDataUrl: false,
        kind: 'unknown',
      }
    }
    if (ref.startsWith('#') || lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('javascript:')) {
      return {
        originalUrl: ref,
        normalizedReference,
        resolvedCandidate,
        rewrittenUrl: null,
        normalizedPath: null,
        reason: 'unsupported_or_fragment_reference_preserved',
        externalPreserved: true,
        missing: false,
        alreadyRewritten: false,
        isDataUrl: false,
        kind: 'unsupported',
      }
    }
    if (lower.startsWith('data:')) {
      return {
        originalUrl: ref,
        normalizedReference,
        resolvedCandidate,
        rewrittenUrl: null,
        normalizedPath: null,
        reason: 'data_url_preserved',
        externalPreserved: true,
        missing: false,
        alreadyRewritten: false,
        isDataUrl: true,
        kind: 'data',
      }
    }
    if (lower.startsWith('/api/gnr8/runtime/preview-assets/')) {
      const deduped = ref.replace(duplicatePreviewPrefixPattern, `${assetRoot}/`)
      return {
        originalUrl: ref,
        normalizedReference,
        resolvedCandidate,
        rewrittenUrl: deduped,
        normalizedPath: null,
        reason: deduped === ref ? 'already_preview_asset_url' : 'deduplicated_preview_asset_url',
        externalPreserved: false,
        missing: false,
        alreadyRewritten: true,
        isDataUrl: false,
        kind,
      }
    }
    const isRemote = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('//')
    const { suffix } = splitPreviewAssetUrlSuffix(ref)
    const normalized = findFileMapCandidate(candidatePaths)
    if (!normalized) {
      return {
        originalUrl: ref,
        normalizedReference,
        resolvedCandidate,
        rewrittenUrl: null,
        normalizedPath: null,
        reason: isRemote ? 'external_reference_preserved' : input.fileMapPaths ? 'file_map_path_not_found' : 'invalid_path',
        externalPreserved: isRemote,
        missing: !isRemote,
        alreadyRewritten: false,
        isDataUrl: false,
        kind: isRemote && kind !== 'stylesheet' ? 'external' : kind,
      }
    }
    return {
      originalUrl: ref,
      normalizedReference,
      resolvedCandidate,
      rewrittenUrl: `${assetRoot}/${normalized}${suffix}`,
      normalizedPath: normalized,
      reason: normalized === resolvedCandidate ? 'matched_persisted_file' : 'matched_persisted_file_variant',
      externalPreserved: false,
      missing: false,
      alreadyRewritten: false,
      isDataUrl: false,
      kind,
    }
  }

  const recordAssetReferenceEvidence = (resolution: RawPreviewAssetReferenceResolution, sourceType: RawPreviewAssetRewriteSource) => {
    evidence.assetReferencesInspected = (evidence.assetReferencesInspected ?? 0) + 1
    if (resolution.rewrittenUrl && !resolution.alreadyRewritten) {
      evidence.assetReferencesRewritten = (evidence.assetReferencesRewritten ?? 0) + 1
    }
    if (resolution.missing) {
      evidence.assetReferencesMissing = (evidence.assetReferencesMissing ?? 0) + 1
    }
    if (resolution.externalPreserved) {
      evidence.assetReferencesExternalPreserved = (evidence.assetReferencesExternalPreserved ?? 0) + 1
    }
    const item = {
      originalReference: resolution.originalUrl,
      normalizedReference: resolution.normalizedReference,
      resolvedCandidate: resolution.resolvedCandidate,
      matchedFilePath: resolution.normalizedPath,
      servedPreviewUrl: resolution.rewrittenUrl,
      reason: resolution.reason,
      assetKind: resolution.kind,
      sourceType,
      routePath: routePathForEvidence,
      rawFilePath: input.entryHtmlPath,
    }
    evidence.assetReferenceEvidence = [...(evidence.assetReferenceEvidence ?? []), item]
    if (resolution.missing) {
      evidence.missingAssetReferences = [
        ...(evidence.missingAssetReferences ?? []),
        {
          originalReference: item.originalReference,
          normalizedReference: item.normalizedReference,
          resolvedCandidate: item.resolvedCandidate,
          reason: item.reason,
          assetKind: item.assetKind,
          sourceType: item.sourceType,
          routePath: item.routePath,
          rawFilePath: item.rawFilePath,
        },
      ]
    }
  }

  const recordScriptDependentMediaReference = (rawRef: string) => {
    const resolution = resolveReference(rawRef, isImageAssetPath(rawRef) ? 'image' : 'unknown', 'script_detected')
    const warningResolution: RawPreviewAssetReferenceResolution = {
      ...resolution,
      rewrittenUrl: null,
      reason: resolution.normalizedPath ? 'script_dependent_media_reference_matched_but_not_rewritten' : 'script_dependent_media_reference_unmatched',
    }
    recordAssetReferenceEvidence(warningResolution, 'script_detected')
  }

  const recordHtmlReferenceEvidence = (resolution: RawPreviewAssetReferenceResolution, sourceType: RawPreviewAssetRewriteSource) => {
    recordAssetReferenceEvidence(resolution, sourceType)
    if (resolution.kind === 'image' || resolution.kind === 'svg') {
      evidence.imageReferencesFound += 1
      if (resolution.rewrittenUrl && !resolution.alreadyRewritten) evidence.imageReferencesRewritten += 1
      if (resolution.missing) evidence.imageReferencesMissing += 1
    }
    if (resolution.kind === 'font') {
      evidence.fontFilesFound += 1
      if (resolution.rewrittenUrl && !resolution.alreadyRewritten) evidence.fontFilesRewritten += 1
    }
    if (resolution.kind === 'stylesheet') {
      evidence.stylesheetsInspected += 1
      if (isGoogleFontsStylesheetUrl(resolution.originalUrl)) {
        evidence.fontStylesheetsFound += 1
        if (resolution.externalPreserved || resolution.rewrittenUrl) evidence.fontStylesheetsPreserved += 1
        noteDongle(resolution.originalUrl, 'Google Fonts stylesheet link references Dongle')
      }
      if (resolution.normalizedPath) stylesheetAssetPaths.add(resolution.normalizedPath)
    }
    if (resolution.missing) {
      emitCssAssetRewriteSkipped(resolution.originalUrl, input.fileMapPaths ? 'file_map_path_not_found' : 'invalid_path', sourceType)
    }
    if (resolution.rewrittenUrl && !resolution.alreadyRewritten) {
      rewrittenAssetCount += 1
    }
  }

  const recordStylesheetReferenceEvidence = (resolution: RawPreviewAssetReferenceResolution, sourceType: RawPreviewAssetRewriteSource) => {
    recordAssetReferenceEvidence(resolution, sourceType)
    if (resolution.kind === 'stylesheet') {
      if (isGoogleFontsStylesheetUrl(resolution.originalUrl)) {
        evidence.fontStylesheetsFound += 1
        if (resolution.externalPreserved || resolution.rewrittenUrl) evidence.fontStylesheetsPreserved += 1
        noteDongle(resolution.originalUrl, 'CSS @import references Google Fonts Dongle')
      }
      if (resolution.normalizedPath) stylesheetAssetPaths.add(resolution.normalizedPath)
    }
    if (resolution.kind === 'font') {
      evidence.fontFilesFound += 1
      if (resolution.rewrittenUrl && !resolution.alreadyRewritten) evidence.fontFilesRewritten += 1
    }
    if (resolution.missing) {
      emitCssAssetRewriteSkipped(resolution.originalUrl, input.fileMapPaths ? 'file_map_path_not_found' : 'invalid_path', sourceType)
    }
    if (resolution.rewrittenUrl && !resolution.alreadyRewritten) {
      emitCssAssetRewriteApplied(resolution.originalUrl, resolution.rewrittenUrl, sourceType)
      rewrittenAssetCount += 1
    }
  }

  const recordCssReferenceEvidence = (resolution: RawPreviewAssetReferenceResolution, sourceType: RawPreviewAssetRewriteSource) => {
    recordAssetReferenceEvidence(resolution, sourceType)
    evidence.cssUrlReferencesFound += 1
    if (resolution.kind === 'image' || resolution.kind === 'svg') evidence.imageReferencesFound += 1
    if (resolution.kind === 'font') evidence.fontFilesFound += 1
    if (resolution.rewrittenUrl && !resolution.alreadyRewritten) {
      evidence.cssUrlReferencesRewritten += 1
      if (resolution.kind === 'image' || resolution.kind === 'svg') evidence.imageReferencesRewritten += 1
      if (resolution.kind === 'font') evidence.fontFilesRewritten += 1
      emitCssAssetRewriteApplied(resolution.originalUrl, resolution.rewrittenUrl, sourceType)
      rewrittenAssetCount += 1
      return
    }
    if (resolution.externalPreserved) {
      evidence.cssUrlReferencesExternalPreserved += 1
      return
    }
    if (resolution.missing) {
      evidence.cssUrlReferencesMissing += 1
      if (resolution.kind === 'image' || resolution.kind === 'svg') evidence.imageReferencesMissing += 1
      emitCssAssetRewriteSkipped(resolution.originalUrl, input.fileMapPaths ? 'file_map_path_not_found' : 'invalid_path', sourceType)
    }
  }

  const rewriteCssImportReference = (rawValue: string, sourceType: RawPreviewAssetRewriteSource): string | null => {
    const value = String(rawValue ?? '').trim()
    if (!value) return null
    const resolution = resolveReference(value, isFontAssetPath(value) ? 'font' : 'stylesheet', sourceType)
    recordStylesheetReferenceEvidence(resolution, sourceType)
    return resolution.rewrittenUrl
  }

  const rewriteCssImportTokens = (cssValue: string, sourceType: RawPreviewAssetRewriteSource): string => {
    const rewriteUrlImport = (full: string, quote: string, rawValue: string, media: string, semicolon: string) => {
      const rewritten = rewriteCssImportReference(rawValue, sourceType)
      if (!rewritten) return full
      const safeQuote = quote || ''
      return `@import url(${safeQuote}${rewritten}${safeQuote})${media ?? ''}${semicolon ?? ''}`
    }
    const rewriteStringImport = (full: string, quote: string, rawValue: string, media: string, semicolon: string) => {
      const rewritten = rewriteCssImportReference(rawValue, sourceType)
      if (!rewritten) return full
      return `@import ${quote}${rewritten}${quote}${media ?? ''}${semicolon ?? ''}`
    }
    return String(cssValue ?? '')
      .replace(cssImportUrlPattern, rewriteUrlImport)
      .replace(cssImportStringPattern, rewriteStringImport)
  }

  const rewriteCssUrlTokens = (cssValue: string, sourceType: RawPreviewAssetRewriteSource): string => {
    const css = String(cssValue ?? '')
    if (containsDongleFontSignal(css)) {
      noteDongle(css, 'CSS declares Dongle font family')
      for (const item of cssLikelyAppliesDongleToRootHeading(css)) noteDongle('Dongle', item)
    }
    const withImports = rewriteCssImportTokens(css, sourceType)
    return withImports.replace(cssUrlPattern, (full, quote: string, rawValue: string) => {
      const resolution = resolveReference(String(rawValue ?? ''), isFontAssetPath(String(rawValue ?? '')) ? 'font' : isImageAssetPath(String(rawValue ?? '')) ? 'image' : 'other', sourceType)
      recordCssReferenceEvidence(resolution, sourceType)
      if (resolution.isDataUrl) return full
      if (!resolution.rewrittenUrl) return full
      const safeQuote = quote || ''
      return `url(${safeQuote}${resolution.rewrittenUrl}${safeQuote})`
    })
  }

  const rewriteReference = (rawRef: string, kindHint: RawPreviewAssetReferenceKind, sourceType: RawPreviewAssetRewriteSource): string => {
    const resolution = resolveReference(rawRef, kindHint, sourceType)
    recordHtmlReferenceEvidence(resolution, sourceType)
    if (!resolution.rewrittenUrl) return String(rawRef ?? '').trim()
    return resolution.rewrittenUrl
  }

  const classifyTagAttribute = (tagName: string, attr: string, value: string, tag: string): RawPreviewAssetReferenceKind => {
    const normalizedTagName = tagName.toLowerCase()
    const normalizedAttr = attr.toLowerCase()
    if (normalizedTagName === 'link' && normalizedAttr === 'href') {
      if (isFontAssetPath(value)) return 'font'
      if (linkTagReferencesStylesheet(tag, value)) return 'stylesheet'
      return 'other'
    }
    if (normalizedTagName === 'source' || normalizedTagName === 'img' || normalizedAttr === 'poster') return 'image'
    if (/^(?:data-src|data-lazy-src|data-original|data-background|data-bg)$/i.test(normalizedAttr)) {
      return isImageAssetPath(value) ? 'image' : 'other'
    }
    return isImageAssetPath(value) ? 'image' : isFontAssetPath(value) ? 'font' : 'other'
  }

  const rewriteSrcset = (srcset: string): string =>
    srcset
      .split(',')
      .map((entry) => {
        const trimmed = entry.trim()
        if (!trimmed) return trimmed
        const [url, descriptor] = trimmed.split(/\s+/, 2)
        const rewritten = rewriteReference(url, 'image', 'srcset')
        return descriptor ? `${rewritten} ${descriptor}` : rewritten
      })
      .join(', ')

  const html = input.html
    .replace(/<([a-zA-Z][^\s/>]*)(\s[^>]*)?>/g, (full: string, tagName: string) => {
      const normalizedTagName = String(tagName ?? '').toLowerCase()
      return full
        .replace(
          /\b(href|src|poster|data-src|data-srcset|data-lazy-src|data-original|data-background|data-bg|data-bgset)\s*=\s*(["'])(.*?)\2/gi,
          (attrFull: string, attr: string, quote: string, value: string) => {
            const normalizedAttr = String(attr ?? '').toLowerCase()
            if (normalizedTagName === 'a' && normalizedAttr === 'href') return attrFull
            if (normalizedAttr === 'srcset' || normalizedAttr === 'data-srcset' || normalizedAttr === 'data-bgset') {
              return `${attr}=${quote}${rewriteSrcset(value)}${quote}`
            }
            const kind = classifyTagAttribute(normalizedTagName, normalizedAttr, value, full)
            return `${attr}=${quote}${rewriteReference(value, kind, normalizedAttr.startsWith('data-') ? 'lazy_attr' : 'html_attr')}${quote}`
          },
        )
    })
    .replace(
      /\bsrcset\s*=\s*(["'])(.*?)\1/gi,
      (_full, quote: string, value: string) => `srcset=${quote}${rewriteSrcset(value)}${quote}`,
    )
    .replace(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi, (_full, quote: string, value: string) => {
      const rewritten = rewriteCssUrlTokens(value, 'inline_style')
      return `style=${quote}${rewritten}${quote}`
    })
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_full, attrs: string, css: string) => {
      evidence.stylesheetsInspected += 1
      const rewritten = rewriteCssUrlTokens(css, 'style_block')
      return `<style${attrs}>${rewritten}</style>`
    })
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (full, scriptBody: string) => {
      const body = String(scriptBody ?? '')
      const scriptRefs = [...body.matchAll(/(?:"|')((?:https?:)?\/\/[^"']+\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#][^"']*)?|\/(?:uploads|assets)\/[^"'\s<)]+\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#][^"'\s<)]*)?)(?:"|')/gi)]
        .map((match) => String(match[1] ?? '').trim())
        .filter(Boolean)
      for (const ref of [...new Set(scriptRefs)]) recordScriptDependentMediaReference(ref)
      if (/\/uploads\/[^"'\s<)]+/i.test(body)) {
        emitCssAssetRewriteSkipped('/uploads/*', 'script_generated_css_detected', 'script_detected')
      }
      return full
    })
  return {
    html,
    rewrittenAssetCount,
    rawPreviewAssetRewriteEvidence: evidence,
    stylesheetAssetPaths: [...stylesheetAssetPaths].sort((a, b) => a.localeCompare(b)),
  }
}

function rawPreviewHasUsableDongleFontSource(html: string): boolean {
  const source = String(html ?? '')
  return (
    /fonts\.googleapis\.com\/css[^"'<>\s]*family=[^"'<>\s]*Dongle/i.test(source) ||
    /@font-face\s*\{[^{}]*font-family\s*:\s*["']?Dongle["']?/i.test(source)
  )
}

function restoreDongleStylesheetFromRawCssEvidence(input: {
  html: string
  evidence: RawPreviewAssetRewriteEvidence
}): { html: string; restored: boolean } {
  if (!input.evidence.fontFamilyDongleDetected) return { html: input.html, restored: false }
  if (rawPreviewHasUsableDongleFontSource(input.html)) return { html: input.html, restored: false }
  const link =
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dongle:wght@300;400;700&display=swap" data-gnr8-restored-font="Dongle">'
  const html = /<\/head>/i.test(input.html)
    ? input.html.replace(/<\/head>/i, `${link}</head>`)
    : `${link}${input.html}`
  input.evidence.fontStylesheetsFound += 1
  input.evidence.fontStylesheetsPreserved += 1
  input.evidence.rootHeadingDongleEvidence = [
    ...new Set([
      ...input.evidence.rootHeadingDongleEvidence,
      'Restored Google Fonts Dongle stylesheet because raw CSS declares Dongle without a font source',
    ]),
  ].slice(0, 12)
  input.evidence.assetReferencesInspected = (input.evidence.assetReferencesInspected ?? 0) + 1
  input.evidence.assetReferencesExternalPreserved = (input.evidence.assetReferencesExternalPreserved ?? 0) + 1
  input.evidence.assetReferenceEvidence = [
    ...(input.evidence.assetReferenceEvidence ?? []),
    {
      originalReference: 'https://fonts.googleapis.com/css2?family=Dongle:wght@300;400;700&display=swap',
      normalizedReference: 'https://fonts.googleapis.com/css2?family=Dongle:wght@300;400;700&display=swap',
      resolvedCandidate: null,
      matchedFilePath: null,
      servedPreviewUrl: null,
      reason: 'restored_external_font_stylesheet_from_raw_css_evidence',
      assetKind: 'stylesheet',
      sourceType: 'stylesheet',
      routePath: '/',
      rawFilePath: '',
    },
  ]
  return { html, restored: true }
}

function defaultRawPreviewScriptPolicyEvidence(): RawPreviewScriptPolicyEvidence {
  return {
    totalScriptsFound: 0,
    scriptsPreserved: 0,
    scriptsBlocked: 0,
    scriptsRewrittenToControlledPreviewAssetUrls: 0,
    scriptsExternalPreserved: 0,
    scriptsBlockedByReason: {},
    topBlockedRefs: [],
    galleryCandidateScriptsDetected: false,
    mapCandidateScriptsDetected: false,
    formCandidateScriptsDetected: false,
    lazyloadCandidateScriptsDetected: false,
  }
}

function isPreviewAssetScriptUrl(value: string): boolean {
  return /^\/api\/gnr8\/runtime\/preview-assets\/[^/?#]+\/[^/?#]+\/.+/i.test(String(value ?? '').trim())
}

function scriptRefForEvidence(input: { src: string | null; body: string; index: number }): string {
  if (input.src) return input.src.slice(0, 160)
  const compact = input.body.replace(/\s+/g, ' ').trim()
  return `inline:${input.index}:${compact.slice(0, 100)}`
}

function noteScriptCandidateSignals(evidence: RawPreviewScriptPolicyEvidence, ref: string, body: string): void {
  const value = `${ref}\n${body}`.toLowerCase()
  if (/\b(?:swiper|slick|carousel|fancybox|glightbox|gallery|slider|splide|owl\.carousel|magnific)\b/i.test(value)) {
    evidence.galleryCandidateScriptsDetected = true
  }
  if (/\b(?:google\.maps|maps\.googleapis|leaflet|mapbox|openlayers|ol\.js|initmap)\b/i.test(value)) {
    evidence.mapCandidateScriptsDetected = true
  }
  if (/\b(?:contact[-_]?form|wpcf7|recaptcha|grecaptcha|jquery\.validate|ajaxform|formdata|submit)\b/i.test(value)) {
    evidence.formCandidateScriptsDetected = true
  }
  if (/\b(?:lazyload|lazysizes|lozad|data-src|data-lazy-src|intersectionobserver)\b/i.test(value)) {
    evidence.lazyloadCandidateScriptsDetected = true
  }
}

function trackingScriptReason(value: string): string | null {
  const normalized = String(value ?? '').toLowerCase()
  if (
    /(?:\bgoogle-analytics\b|\bgoogletagmanager\b|\bgtag\/js\b|\bgtag\s*\(|\bdataLayer\s*\.\s*push|\banalytics\.js\b|\bga\.js\b|\bdoubleclick\b|\bgooglesyndication\b|\bfacebook\.net\b|\bconnect\.facebook\b|\bfbq\s*\(|\bhotjar\b|\bclarity\.ms\b|\bsegment\.com\b|\bsegment\.io\b|\bmixpanel\b|\bamplitude\b|\bmatomo\b|\bplausible\b|\bfullstory\b|\bintercom\b|\bhubspot\b|\bhs-scripts\b|\bcookiebot\b)/i.test(
      normalized,
    )
  ) {
    return 'tracking_or_analytics_script_blocked'
  }
  return null
}

function inlineRawPreviewScriptBlockReason(body: string): string | null {
  const source = String(body ?? '')
  const compact = source.replace(/\s+/g, ' ')
  if (trackingScriptReason(compact)) return 'tracking_or_analytics_script_blocked'
  if (/\bnavigator\.sendBeacon\s*\(/i.test(source)) return 'beacon_call_blocked'
  if (/\b(?:window\.)?(?:top|parent)\.location(?:\b|\.|=)/i.test(source)) return 'hostile_top_navigation_blocked'
  if (/\b(?:location\.href|location\.replace|location\.assign|window\.location)\s*(?:=|\()/i.test(source) && /https?:\/\//i.test(source)) {
    return 'redirect_script_blocked'
  }
  if (/\bdocument\.(?:documentElement|body)\.innerHTML\s*=/i.test(source)) return 'route_level_html_replacement_blocked'
  if (/\bdocument\.body\.(?:outerHTML|replaceChildren)\s*(?:=|\()/i.test(source)) return 'route_level_html_replacement_blocked'
  if (/\bdocument\.(?:open|write|writeln)\s*\(/i.test(source) && /<\s*(?:html|body|main|section|header|footer)\b/i.test(source)) {
    return 'document_write_html_replacement_blocked'
  }
  if (/\b(?:document\.body|document\.querySelector\(["']body["']\))\.insertAdjacentHTML\s*\(/i.test(source)) {
    if (
      /<\s*(?:html|body|main|section|header|footer|nav)\b/i.test(source) ||
      /\b(?:HOME_INTRO|VIROIDOC_ROOT|ROOT_MARKER|NEWS_LISTING|PROJECT_MARKER|PEOPLE_MARKER|BLOG_MARKER)\b/i.test(source)
    ) {
      return 'duplicate_dom_injection_blocked'
    }
  }
  if (/\bfetch\s*\(\s*(?:["']\/["']|location\.href|window\.location\.href|document\.location)/i.test(source) && /\binnerHTML\s*=/i.test(source)) {
    return 'route_level_html_replacement_blocked'
  }
  return null
}

function externalRawPreviewScriptBlockReason(src: string): string | null {
  return trackingScriptReason(src)
}

function appendBlockedScriptReason(evidence: RawPreviewScriptPolicyEvidence, reason: string, ref: string): void {
  evidence.scriptsBlocked += 1
  evidence.scriptsBlockedByReason = {
    ...evidence.scriptsBlockedByReason,
    [reason]: (evidence.scriptsBlockedByReason[reason] ?? 0) + 1,
  }
  if (!evidence.topBlockedRefs.includes(ref) && evidence.topBlockedRefs.length < 10) {
    evidence.topBlockedRefs = [...evidence.topBlockedRefs, ref]
  }
}

function applyRawPreviewScriptPolicy(html: string): { html: string; disabledScriptCount: number; rawPreviewScriptPolicyEvidence: RawPreviewScriptPolicyEvidence } {
  const evidence = defaultRawPreviewScriptPolicyEvidence()
  let scriptIndex = 0
  const rewritten = String(html ?? '').replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attributes: string, body: string) => {
    scriptIndex += 1
    evidence.totalScriptsFound += 1
    if (/\btype\s*=\s*(['"])application\/gnr8-disabled-script\1/i.test(full)) {
      appendBlockedScriptReason(evidence, 'already_disabled_preview_script', scriptRefForEvidence({ src: null, body: String(body ?? ''), index: scriptIndex }))
      return full
    }

    const attrs = parseHtmlTagAttributes(String(attributes ?? ''))
    const type = String(attrs.type ?? '').trim().toLowerCase()
    const src = attrs.src ? String(attrs.src).trim() : null
    const ref = scriptRefForEvidence({ src, body: String(body ?? ''), index: scriptIndex })
    noteScriptCandidateSignals(evidence, ref, String(body ?? ''))

    const nonExecutableType =
      type &&
      !['text/javascript', 'application/javascript', 'module', 'application/ecmascript', 'text/ecmascript'].includes(type) &&
      !/javascript|ecmascript/i.test(type)
    if (nonExecutableType) {
      evidence.scriptsPreserved += 1
      return full
    }

    const reason = src ? externalRawPreviewScriptBlockReason(src) : inlineRawPreviewScriptBlockReason(String(body ?? ''))
    if (reason) {
      appendBlockedScriptReason(evidence, reason, ref)
      return `<script type="application/gnr8-disabled-script" data-gnr8-disabled-preview-script="raw" data-gnr8-script-policy-reason="${escapeHtmlAttribute(
        reason,
      )}" data-gnr8-original-script-attrs="${escapeHtmlAttribute(String(attributes ?? '').trim())}">${body}</script>`
    }

    evidence.scriptsPreserved += 1
    if (src) {
      if (isPreviewAssetScriptUrl(src)) {
        evidence.scriptsRewrittenToControlledPreviewAssetUrls += 1
      } else if (/^(?:https?:)?\/\//i.test(src)) {
        evidence.scriptsExternalPreserved += 1
      }
    }
    return full
  })
  return {
    html: rewritten,
    disabledScriptCount: evidence.scriptsBlocked,
    rawPreviewScriptPolicyEvidence: evidence,
  }
}

function neutralizeRawPreviewScripts(html: string): { html: string; disabledScriptCount: number } {
  const policy = applyRawPreviewScriptPolicy(html)
  return { html: policy.html, disabledScriptCount: policy.disabledScriptCount }
}

async function inspectRawPreviewStylesheetAssets(input: {
  stylesheetAssetPaths: string[]
  artifactId?: string | null
  siteVersionId: string
  siteId: string
  routePath?: string
  fileMapPaths: ReadonlySet<string>
  context: PreviewReadContext
}): Promise<RawPreviewAssetRewriteEvidence> {
  let evidence = defaultRawPreviewAssetRewriteEvidence()
  for (const stylesheetPath of input.stylesheetAssetPaths) {
    const asset = await cacheLookup({
      context: input.context,
      cache: input.context.rawTemplateAssetByKey,
      key: `${input.siteVersionId}:${stylesheetPath}`,
      loader: () =>
        previewReadDependencies.getRawTemplateSiteAsset({
          siteVersionId: input.siteVersionId,
          artifactId: input.artifactId ?? undefined,
          filePath: stylesheetPath,
          dbClient: input.context.dbClient ?? undefined,
        }),
    })
    if (!asset) continue
    const css = asset.bytes.toString('utf8')
    const inspected = rewriteRawTemplateAssetReferencesWithCounts({
      html: `<style>${css}</style>`,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      entryHtmlPath: stylesheetPath,
      routePath: input.routePath,
      fileMapPaths: input.fileMapPaths,
    })
    evidence = mergeRawPreviewAssetRewriteEvidence(evidence, inspected.rawPreviewAssetRewriteEvidence)
  }
  return evidence
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
  routeMapDiagnostics?: string[]
  rawTemplatePreviewEvidence?: RawTemplatePreviewEvidence
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
      ...(input.routeMapDiagnostics ?? []),
      ...((input.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence?.malformedUriDecodeFallbackCount ?? 0) > 0
        ? [
            RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_WARNING,
            RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_FALLBACK_USED,
          ]
        : []),
    ]),
    rawTemplatePreviewEvidence: input.rawTemplatePreviewEvidence,
  }
}

function logRawTemplateRouteMapResolution(input: {
  resolution: RawTemplateRouteMapResolution
  siteId: string
  entryHtmlPath: string
}): void {
  console.info(`[preview-runtime] ${input.resolution.diagnosticCode}`, {
    siteId: input.siteId,
    siteVersionId: input.resolution.siteVersionId,
    requestedPath: input.resolution.requestedPath,
    routePath: input.resolution.routePath,
    rawFilePath:
      input.resolution.outcome === 'selected' || input.resolution.outcome === 'file_missing'
        ? input.resolution.rawFilePath
        : null,
    sourceUrl:
      input.resolution.outcome === 'selected' || input.resolution.outcome === 'file_missing'
        ? input.resolution.sourceUrl
        : null,
    finalUrl:
      input.resolution.outcome === 'selected' || input.resolution.outcome === 'file_missing'
        ? input.resolution.finalUrl
        : null,
    entryHtmlPath: input.entryHtmlPath,
    reasonCode: input.resolution.outcome === 'disabled' ? input.resolution.reasonCode : null,
    routeMapSelected: input.resolution.diagnosticCode === RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_SELECTED,
  })
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
  siteVersion: CanonicalSiteVersionSnapshot
  siteVersionId: string
  requestedPath: string
  routeMapServingEnabled: boolean
  previewTruth: RenderedCapturePreviewTruth
  fallbackSummary?: PreviewRuntimeSummary | null
  context: PreviewReadContext
}): Promise<ResolvedSiteVersionPreview | null> {
  const importedArtifact = await cacheLookup({
    context: input.context,
    cache: input.context.rawImportedArtifactBySiteVersionId,
    key: input.siteVersionId,
    loader: () => previewReadDependencies.getRawImportedSiteArtifact(input.siteVersionId, { dbClient: input.context.dbClient ?? undefined }),
  })
  const artifact =
    importedArtifact ??
    (await cacheLookup({
      context: input.context,
      cache: input.context.rawTemplateArtifactBySiteVersionId,
      key: input.siteVersionId,
      loader: () => previewReadDependencies.getRawTemplateSiteArtifact(input.siteVersionId, { dbClient: input.context.dbClient ?? undefined }),
    }))
  if (!artifact) return null
  const routeMapResolution = resolveRawTemplateRouteMapFile({
    siteVersionId: artifact.siteVersionId,
    requestedPath: input.requestedPath,
    entryHtmlPath: artifact.entryHtmlPath,
    fileMap: artifact.fileMap,
    importProvenanceSummary: input.siteVersion.importProvenanceSummary,
    routeMapServingEnabled: input.routeMapServingEnabled,
  })
  logRawTemplateRouteMapResolution({
    resolution: routeMapResolution,
    siteId: artifact.siteId,
    entryHtmlPath: artifact.entryHtmlPath,
  })
  if (input.routeMapServingEnabled && routeMapResolution.outcome === 'miss') {
    throw new SiteVersionPreviewUnavailableError({
      code: 'PREVIEW_PATH_NOT_FOUND',
      message: `Raw template route-map path not found: ${routeMapResolution.routePath}`,
    })
  }
  if (input.routeMapServingEnabled && routeMapResolution.outcome === 'file_missing') {
    throw new SiteVersionPreviewUnavailableError({
      code: 'PREVIEW_PATH_NOT_FOUND',
      message: `Raw template route-map file missing: ${routeMapResolution.rawFilePath}`,
    })
  }
  const selectedHtmlPath = routeMapResolution.outcome === 'selected' ? routeMapResolution.rawFilePath : artifact.entryHtmlPath
  const selectedRoutePath = routeMapResolution.outcome === 'selected' ? routeMapResolution.routePath : normalizePagePath(input.requestedPath)
  if (routeMapResolution.outcome === 'selected') {
    if (routeMapResolution.routePath === '/') {
      console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_ROOT_ROUTE_SELECTED}`, {
        siteId: artifact.siteId,
        siteVersionId: artifact.siteVersionId,
        requestedPath: normalizePagePath(input.requestedPath),
        selectedRoutePath,
        selectedRawFilePath: selectedHtmlPath,
      })
    }
    console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_ROUTE_MAP_ENTRY_SELECTED}`, {
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      requestedPath: normalizePagePath(input.requestedPath),
      selectedRoutePath,
      selectedRawFilePath: selectedHtmlPath,
      routeMapDiagnostic: routeMapResolution.diagnosticCode,
    })
  }
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_RAW_FILE_SELECTED}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: normalizePagePath(input.requestedPath),
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
  })
  const entryAsset = await cacheLookup({
    context: input.context,
    cache: input.context.rawTemplateAssetByKey,
    key: `${input.siteVersionId}:${selectedHtmlPath}`,
    loader: () =>
      previewReadDependencies.getRawTemplateSiteAsset({
        siteVersionId: input.siteVersionId,
        filePath: selectedHtmlPath,
        dbClient: input.context.dbClient ?? undefined,
      }),
  })
  if (!entryAsset) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
      message: 'Raw template entry HTML is unavailable for this site version.',
    })
  }

  const rawHtml = entryAsset.bytes.toString('utf8')
  const htmlByteLengthBeforeRewrite = Buffer.byteLength(rawHtml)
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_HTML_BYTES_READ}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
    htmlByteLengthBeforeRewrite,
    reportedSizeBytes: entryAsset.sizeBytes,
  })
  const assetRewrite = rewriteRawTemplateAssetReferencesWithCounts({
    html: rawHtml,
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    entryHtmlPath: selectedHtmlPath,
    routePath: selectedRoutePath,
    fileMapPaths: new Set(Object.keys(artifact.fileMap ?? {})),
  })
  const stylesheetEvidence = await inspectRawPreviewStylesheetAssets({
    stylesheetAssetPaths: assetRewrite.stylesheetAssetPaths,
    artifactId: artifact.id,
    siteVersionId: artifact.siteVersionId,
    siteId: artifact.siteId,
    routePath: selectedRoutePath,
    fileMapPaths: new Set(Object.keys(artifact.fileMap ?? {})),
    context: input.context,
  })
  const rawPreviewAssetRewriteEvidence = mergeRawPreviewAssetRewriteEvidence(
    assetRewrite.rawPreviewAssetRewriteEvidence,
    stylesheetEvidence,
  )
  for (const item of rawPreviewAssetRewriteEvidence.assetReferenceEvidence ?? []) {
    item.routePath = item.routePath || selectedRoutePath
    item.rawFilePath = item.rawFilePath || selectedHtmlPath
  }
  const requestedPathDecode = safeDecodeURIComponent(input.requestedPath)
  if (requestedPathDecode.warning) {
    rawPreviewAssetRewriteEvidence.malformedUriDecodeFallbackCount = (rawPreviewAssetRewriteEvidence.malformedUriDecodeFallbackCount ?? 0) + 1
    console.warn(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_WARNING}`, {
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      selectedRoutePath,
      selectedRawFilePath: selectedHtmlPath,
      requestedPath: input.requestedPath,
      reasonCode: RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_URI_DECODE_FALLBACK_USED,
    })
  }
  let html = assetRewrite.html
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_LINK_REWRITE_STARTED}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
    htmlByteLengthBeforeRewrite,
  })
  const linkRewrite = rewriteRawTemplateMultiPageLinks({
    html,
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    importProvenanceSummary: input.siteVersion.importProvenanceSummary,
    routeMapServingEnabled: input.routeMapServingEnabled,
    routeMapResolution,
  })
  html = linkRewrite.html
  const dongleFontRestoration = restoreDongleStylesheetFromRawCssEvidence({
    html,
    evidence: rawPreviewAssetRewriteEvidence,
  })
  html = dongleFontRestoration.html
  if (dongleFontRestoration.restored) {
    const restoredEntries = rawPreviewAssetRewriteEvidence.assetReferenceEvidence ?? []
    const last = restoredEntries[restoredEntries.length - 1]
    if (last?.reason === 'restored_external_font_stylesheet_from_raw_css_evidence') {
      last.routePath = selectedRoutePath
      last.rawFilePath = selectedHtmlPath
    }
    console.info('[preview-runtime] RAW_PREVIEW_DONGLE_FONT_STYLESHEET_RESTORED', {
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      selectedRoutePath,
      selectedRawFilePath: selectedHtmlPath,
      reasonCode: 'raw_css_declares_dongle_without_font_source',
    })
  }
  const scriptPolicy = applyRawPreviewScriptPolicy(html)
  html = scriptPolicy.html
  const rawPreviewAssetGraphEvidence = buildRawPreviewAssetGraphEvidence({
    routePath: selectedRoutePath,
    rawFilePath: selectedHtmlPath,
    evidence: rawPreviewAssetRewriteEvidence,
    cssCascadeOrderBefore: extractRawPreviewCssCascadeOrder(rawHtml),
    cssCascadeOrderAfter: extractRawPreviewCssCascadeOrder(html),
  })
  const rawTemplatePreviewEvidence: RawTemplatePreviewEvidence = {
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
    htmlByteLengthBeforeRewrite,
    htmlByteLengthAfterRewrite: Buffer.byteLength(html),
    rewrittenLinkCount: linkRewrite.counts.rewritten,
    rewrittenAssetCount: assetRewrite.rewrittenAssetCount,
    rawPreviewAssetRewriteEvidence,
    rawPreviewAssetGraphEvidence,
    rawPreviewScriptPolicyEvidence: scriptPolicy.rawPreviewScriptPolicyEvidence,
    disabledScriptCount: scriptPolicy.disabledScriptCount,
    dbReadCount: input.context.queryCount,
    dbClientAcquisitionCount: input.context.dbClient ? 1 : 0,
  }
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_SCRIPT_POLICY_APPLIED}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
    rawPreviewScriptPolicyEvidence: scriptPolicy.rawPreviewScriptPolicyEvidence,
  })
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_SCRIPTS_DISABLED}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
    rawPreviewDisabledScriptCount: scriptPolicy.disabledScriptCount,
  })
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_LINK_REWRITE_COMPLETED}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    ...rawTemplatePreviewEvidence,
  })
  console.info(`[preview-runtime] ${RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_LINKS_REWRITTEN_COUNT}`, {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    selectedRoutePath,
    selectedRawFilePath: selectedHtmlPath,
    rewrittenLinkCount: linkRewrite.counts.rewritten,
  })
  const multiPagePreviewValidation = validateMultiPagePreview({
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    entryHtmlPath: artifact.entryHtmlPath,
    fileMap: artifact.fileMap,
    importProvenanceSummary: input.siteVersion.importProvenanceSummary,
    multiPagePreviewRequested: input.routeMapServingEnabled,
    linkRewriteSummary: {
      ...linkRewrite.counts,
      missingRouteSamples: linkRewrite.missingRouteSamples,
      diagnostics: linkRewrite.diagnostics,
    },
  })
  const summary = buildRawTemplatePreviewRuntimeSummary({
    baseSummary: input.fallbackSummary,
    fileCount: Object.keys(artifact.fileMap).length,
    persistedAssetCount: importedArtifact?.metadata.assetSummary.persistedAssetCount,
    externalFallbackAssetCount: importedArtifact?.metadata.assetSummary.externalFallbackAssetCount,
    routeMapDiagnostics: [
      routeMapResolution.diagnosticCode,
      MULTIPAGE_PREVIEW_ISOLATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_PAGE_ISOLATED,
      ...(routeMapResolution.outcome === 'selected' && routeMapResolution.routePath === '/'
        ? [RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_ROOT_ROUTE_SELECTED]
        : []),
      ...(routeMapResolution.outcome === 'selected'
        ? [RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_ROUTE_MAP_ENTRY_SELECTED]
        : []),
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_RAW_FILE_SELECTED,
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_HTML_BYTES_READ,
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_LINK_REWRITE_STARTED,
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_LINK_REWRITE_COMPLETED,
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.PREVIEW_LINKS_REWRITTEN_COUNT,
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_SCRIPT_POLICY_APPLIED,
      RAW_TEMPLATE_PREVIEW_EVIDENCE_DIAGNOSTIC.RAW_PREVIEW_SCRIPTS_DISABLED,
      ...linkRewrite.diagnostics,
      ...multiPagePreviewValidation.diagnostics,
    ],
    rawTemplatePreviewEvidence,
  })
  console.info('[preview-runtime] RAW_TEMPLATE_PREVIEW_SELECTED', {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: normalizePagePath(input.requestedPath),
    entryHtmlPath: artifact.entryHtmlPath,
    resolvedFilePath: selectedHtmlPath,
    routePath: routeMapResolution.routePath,
    routeMapDiagnostic: routeMapResolution.diagnosticCode,
    fileCount: Object.keys(artifact.fileMap).length,
  })
  if (importedArtifact) {
    console.info('[preview-runtime] RAW_IMPORT_PREVIEW_SELECTED', {
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      requestedPath: normalizePagePath(input.requestedPath),
      entryHtmlPath: artifact.entryHtmlPath,
      resolvedFilePath: selectedHtmlPath,
      routePath: routeMapResolution.routePath,
      routeMapDiagnostic: routeMapResolution.diagnosticCode,
      persistedAssetCount: importedArtifact.metadata.assetSummary.persistedAssetCount,
      externalFallbackAssetCount: importedArtifact.metadata.assetSummary.externalFallbackAssetCount,
    })
  }
  console.info('[preview-runtime] RAW_TEMPLATE_PREVIEW_RENDERED', {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: normalizePagePath(input.requestedPath),
    routePath: routeMapResolution.routePath,
    rawFilePath: selectedHtmlPath,
    bytes: entryAsset.sizeBytes,
  })
  console.info('[preview-runtime] MULTIPAGE_PREVIEW_PAGE_ISOLATED', {
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: normalizePagePath(input.requestedPath),
    routePath: routeMapResolution.routePath,
    rawFilePath: selectedHtmlPath,
  })
  return {
    ...withPreviewTruth({
      preview: {
        siteId: artifact.siteId,
        siteVersionId: artifact.siteVersionId,
        path: routeMapResolution.outcome === 'selected' ? routeMapResolution.routePath : normalizePagePath(input.requestedPath),
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        html,
        source: 'raw_template_site',
        previewMode: 'raw_template_preview',
        previewRuntimeSummary: summary,
        multiPagePreviewValidation,
        rawTemplatePreviewEvidence,
      },
      previewTruth: input.previewTruth,
      fallbackUsedOverride: false,
    }),
    sourceMode: 'raw_template',
    contentDebug: {
      siteVersionId: artifact.siteVersionId,
      rawTemplateArtifactFound: true,
      draftOverrideCount: 0,
      publishedOverrideCount: 0,
      mergedOverrideCount: 0,
      appliedCount: 0,
      skippedCount: 0,
      skippedDiagnostics: [],
      slotKeys: [],
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

function transformedPreviewDiagnosticAttributes(summary: PreviewRuntimeSummary): Record<string, string> {
  const diagnostics = summary.transformedAssemblyDiagnostics
  return {
    'data-gnr8-transformed-preview': '1',
    'data-gnr8-selected-route-path': diagnostics?.selectedRoutePath ?? '',
    'data-gnr8-selected-raw-file-path': diagnostics?.selectedSourceRawFile ?? '',
    'data-gnr8-transformed-route-section-count-before-hydration': String(
      diagnostics?.transformedRouteSectionCountBeforeHydration ?? 0,
    ),
    'data-gnr8-duplicate-removal-count': String(diagnostics?.duplicateRemovalCount ?? 0),
    'data-gnr8-client-hydration-mode': diagnostics?.clientHydrationMode ?? 'disabled',
  }
}

function serializeAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeHtmlAttribute(value)}"`)
    .join(' ')
}

function disableTransformedPreviewAuthoredScripts(html: string): string {
  return html.replace(/<script\b(?![^>]*\bdata-gnr8-preview-runtime\b)([^>]*)>/gi, (tag, attributes: string) => {
    if (/\btype\s*=\s*(['"])application\/gnr8-disabled-preview-script\1/i.test(tag)) return tag
    return `<script type="application/gnr8-disabled-preview-script" data-gnr8-disabled-preview-script="transformed" data-gnr8-original-script-attrs="${escapeHtmlAttribute(
      String(attributes ?? '').trim(),
    )}">`
  })
}

const TRANSFORMED_PREVIEW_VISIBLE_DIAGNOSTIC_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Recovered Section', pattern: /\bRecovered\s+Section\b/i },
  { label: 'Recovered from:', pattern: /\bRecovered\s+from\s*:/i },
  { label: 'raw-block:', pattern: /\braw-block\s*:/i },
  { label: '[missing:', pattern: /\[missing\s*:/i },
  { label: 'Missing media for final_component_', pattern: /\bMissing\s+media\s+for\s+final_component_/i },
  { label: 'Generic component fallback', pattern: /\bGeneric\s+component\s+fallback\b/i },
  { label: 'fallbackReason', pattern: /\bfallbackReason\b/i },
  { label: 'render.generic', pattern: /\brender\.generic\b/i },
  { label: 'CAPTURE_DRIVEN_', pattern: /\bCAPTURE_DRIVEN_[A-Z0-9_]+\b/i },
  { label: 'dominant_candidate=', pattern: /\bdominant_candidate\s*=/i },
  { label: 'runner_up=', pattern: /\brunner_up\s*=/i },
  { label: 'avg_child_elements=', pattern: /\bavg_child_elements\s*=/i },
  { label: 'layout_runner_up=', pattern: /\blayout_runner_up\s*=/i },
  { label: 'layout_score=', pattern: /\blayout_score\s*=/i },
  { label: '/tmp/gnr8/validation/', pattern: /\/tmp\/gnr8\/validation\//i },
]

function decodeBasicHtmlEntities(value: string): string {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_match, code: string) => {
      const parsed = Number(code)
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : ''
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => {
      const parsed = Number.parseInt(code, 16)
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 0x10ffff ? String.fromCodePoint(parsed) : ''
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function extractVisiblePreviewText(html: string): string {
  const bodyMatch = String(html ?? '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
  let visible = bodyMatch ? bodyMatch[1] ?? '' : String(html ?? '')
  visible = visible
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<head\b[\s\S]*?<\/head>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<([a-z0-9:-]+)\b(?=[^>]*(?:\shidden\b|\baria-hidden\s*=\s*["']?true["']?|\bstyle\s*=\s*["'][^"']*display\s*:\s*none))[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodeBasicHtmlEntities(visible).replace(/\s+/g, ' ').trim()
}

function detectTransformedPreviewVisibleDiagnosticContent(html: string): { blocked: boolean; matchedPatterns: string[]; visibleText: string } {
  const visibleText = extractVisiblePreviewText(html)
  const matchedPatterns = TRANSFORMED_PREVIEW_VISIBLE_DIAGNOSTIC_PATTERNS
    .filter((entry) => entry.pattern.test(visibleText))
    .map((entry) => entry.label)
  return {
    blocked: matchedPatterns.length > 0,
    matchedPatterns,
    visibleText,
  }
}

function annotateTransformedPreviewHtml(input: { html: string; summary: PreviewRuntimeSummary }): string {
  const attributes = transformedPreviewDiagnosticAttributes(input.summary)
  const serialized = serializeAttributes(attributes)
  let html = disableTransformedPreviewAuthoredScripts(input.html)
  if (/<body\b/i.test(html)) {
    html = html.replace(/<body\b([^>]*)>/i, (tag, bodyAttributes: string) => {
      const current = String(bodyAttributes ?? '')
      const additions = Object.entries(attributes)
        .filter(([key]) => !new RegExp(`\\b${key}\\s*=`, 'i').test(current))
        .map(([key, value]) => `${key}="${escapeHtmlAttribute(value)}"`)
        .join(' ')
      return additions ? `<body${current} ${additions}>` : tag
    })
  } else {
    html = `<body ${serialized}>${html}</body>`
  }
  const marker = `<meta name="gnr8-transformed-preview-diagnostics" content="${escapeHtmlAttribute(
    JSON.stringify({
      selectedRoutePath: attributes['data-gnr8-selected-route-path'],
      selectedRawFilePath: attributes['data-gnr8-selected-raw-file-path'],
      transformedRouteSectionCountBeforeHydration: Number(attributes['data-gnr8-transformed-route-section-count-before-hydration']),
      duplicateRemovalCount: Number(attributes['data-gnr8-duplicate-removal-count']),
      clientHydrationMode: attributes['data-gnr8-client-hydration-mode'],
    }),
  )}" />`
  if (/<head\b[^>]*>/i.test(html) && !/name=["']gnr8-transformed-preview-diagnostics["']/i.test(html)) {
    return html.replace(/<head\b([^>]*)>/i, (tag) => `${tag}${marker}`)
  }
  return html
}

function transformedPreviewSummaryFromArtifactManifest(input: {
  artifactManifest: Record<string, unknown>
  requestedPath: string
  resolvedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
}): PreviewRuntimeSummary {
  const base = input.fallbackSummary ?? defaultPreviewRuntimeSummary()
  const manifestDiagnostics =
    input.artifactManifest &&
    typeof input.artifactManifest === 'object' &&
    !Array.isArray(input.artifactManifest) &&
    'transformedAssemblyDiagnosticsByRoute' in input.artifactManifest
      ? (input.artifactManifest as { transformedAssemblyDiagnosticsByRoute?: unknown }).transformedAssemblyDiagnosticsByRoute
      : null
  const byRoute =
    manifestDiagnostics && typeof manifestDiagnostics === 'object' && !Array.isArray(manifestDiagnostics)
      ? (manifestDiagnostics as Record<string, unknown>)
      : {}
  const candidate = byRoute[input.resolvedPath] ?? byRoute[normalizePagePath(input.requestedPath)] ?? null
  const transformedAssemblyDiagnostics =
    candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? (candidate as PreviewRuntimeSummary['transformedAssemblyDiagnostics'])
      : undefined
  return {
    ...base,
    previewMode: base.previewMode === 'fallback_preview' ? 'react_preview_degraded' : base.previewMode,
    renderedWithFallback: false,
    previewDiagnostics: withSortedDiagnostics([
      ...(base.previewDiagnostics ?? []).filter((entry) => entry !== PREVIEW_RUNTIME_DIAGNOSTIC.FALLBACK_RENDER_SELECTED),
      TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_RAW_RESOLUTION_SKIPPED,
      ...(input.resolvedPath === '/' ? [TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_HOME_ROUTE_SELECTED] : []),
    ]),
    ...(transformedAssemblyDiagnostics ? { transformedAssemblyDiagnostics } : {}),
  }
}

async function renderTransformedSiteVersionPreview(input: {
  siteVersionId: string
  requestedPath: string
  fallbackSummary?: PreviewRuntimeSummary | null
  previewTruth?: RenderedCapturePreviewTruth
  context: PreviewReadContext
}): Promise<ResolvedSiteVersionPreview> {
  const binding = await cacheLookup({
    context: input.context,
    cache: input.context.artifactBindingBySiteVersionId,
    key: input.siteVersionId,
    loader: () => previewReadDependencies.getSiteVersionArtifactBinding(input.siteVersionId, { dbClient: input.context.dbClient ?? undefined }),
    diagnostics: {
      hitEvent: TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_ARTIFACT_CACHE_HIT,
      missEvent: TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_ARTIFACT_CACHE_MISS,
      resource: 'site_version_artifact_binding',
    },
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
    loader: () => previewReadDependencies.getArtifactById(binding.artifactId!, { dbClient: input.context.dbClient ?? undefined }),
    diagnostics: {
      hitEvent: TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_ARTIFACT_CACHE_HIT,
      missEvent: TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_ARTIFACT_CACHE_MISS,
      resource: 'runtime_artifact',
    },
  })
  if (!artifact) {
    throw new SiteVersionPreviewUnavailableError({
      code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
      message: 'Transformed runtime artifact reference exists, but the artifact payload is missing.',
    })
  }

  const resolved = resolveHtmlForPath({
    htmlByPath: artifact.htmlByPath,
    requestedPath: input.requestedPath,
    diagnostics: {
      siteId: artifact.siteId,
      runtimeSiteId: artifact.siteId,
      runtimeSiteVersionId: artifact.siteVersionId,
      matchedPageId: input.fallbackSummary?.matchedPageId ?? null,
      unresolvedPathsCount: input.fallbackSummary?.unresolvedContentCount ?? 0,
    },
  })
  const previewRuntimeSummary = transformedPreviewSummaryFromArtifactManifest({
    artifactManifest: artifact.manifest,
    requestedPath: input.requestedPath,
    resolvedPath: resolved.resolvedPath,
    fallbackSummary: input.fallbackSummary,
  })
  if (resolved.resolvedPath === '/') {
    console.info(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_HOME_ROUTE_SELECTED}`, {
      requestCorrelationKey: input.context.requestCorrelationKey,
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      requestedPath: input.requestedPath,
      selectedPath: resolved.resolvedPath,
    })
  }
  console.info(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_RAW_RESOLUTION_SKIPPED}`, {
    requestCorrelationKey: input.context.requestCorrelationKey,
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    requestedPath: input.requestedPath,
    selectedPath: resolved.resolvedPath,
  })
  const diagnosticContent = detectTransformedPreviewVisibleDiagnosticContent(resolved.html)
  if (diagnosticContent.blocked) {
    console.warn(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DIAGNOSTIC_CONTENT_BLOCKED}`, {
      requestCorrelationKey: input.context.requestCorrelationKey,
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      requestedPath: input.requestedPath,
      selectedPath: resolved.resolvedPath,
      matchedPatterns: diagnosticContent.matchedPatterns,
    })
    throw new TransformedPreviewDiagnosticContentError({
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      requestedPath: input.requestedPath,
      resolvedPath: resolved.resolvedPath,
      matchedPatterns: diagnosticContent.matchedPatterns,
    })
  }

  return {
    ...withPreviewTruth({
      preview: {
        siteId: artifact.siteId,
        siteVersionId: artifact.siteVersionId,
        path: resolved.resolvedPath,
        rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
        html: annotateTransformedPreviewHtml({ html: resolved.html, summary: previewRuntimeSummary }),
        source: 'transformed_artifact',
        previewMode: previewRuntimeSummary.previewMode,
        previewRuntimeSummary,
      },
      previewTruth: input.previewTruth ?? {
        renderedCaptureUsed: false,
        domSize: 0,
        screenshotCount: 0,
      },
      fallbackUsedOverride: false,
    }),
  }
}

async function resolveTransformedDiagnosticContentFallback(input: {
  diagnosticError: TransformedPreviewDiagnosticContentError
  siteVersion: CanonicalSiteVersionSnapshot
  requestedPath: string
  previewTruth: RenderedCapturePreviewTruth
  fallbackSummary?: PreviewRuntimeSummary | null
  context: PreviewReadContext
}): Promise<ResolvedSiteVersionPreview | null> {
  const blockedDiagnostics = [
    TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DIAGNOSTIC_CONTENT_BLOCKED,
    ...input.diagnosticError.matchedPatterns.map((pattern) => `blocked_pattern=${pattern}`),
  ]
  try {
    const rawPreview = await renderRawTemplateSiteVersionPreview({
      siteVersion: input.siteVersion,
      siteVersionId: input.siteVersion.id,
      requestedPath: input.requestedPath,
      routeMapServingEnabled: true,
      previewTruth: input.previewTruth,
      fallbackSummary: input.fallbackSummary,
      context: input.context,
    })
    if (!rawPreview) {
      console.warn(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DIAGNOSTIC_FALLBACK_UNAVAILABLE}`, {
        requestCorrelationKey: input.context.requestCorrelationKey,
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        requestedPath: input.requestedPath,
        reasonCode: 'RAW_ROUTE_PREVIEW_UNAVAILABLE',
      })
      return null
    }
    const rawDiagnosticContent = detectTransformedPreviewVisibleDiagnosticContent(rawPreview.html)
    if (rawDiagnosticContent.blocked) {
      console.warn(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DIAGNOSTIC_FALLBACK_UNAVAILABLE}`, {
        requestCorrelationKey: input.context.requestCorrelationKey,
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        requestedPath: input.requestedPath,
        reasonCode: 'RAW_ROUTE_PREVIEW_CONTAINED_DIAGNOSTIC_CONTENT',
        matchedPatterns: rawDiagnosticContent.matchedPatterns,
      })
      return null
    }
    console.info(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_RAW_ROUTE_FALLBACK_USED}`, {
      requestCorrelationKey: input.context.requestCorrelationKey,
      siteId: input.siteVersion.siteId,
      siteVersionId: input.siteVersion.id,
      requestedPath: input.requestedPath,
      selectedPath: rawPreview.path,
      blockedTransformedPath: input.diagnosticError.resolvedPath,
    })
    return {
      ...rawPreview,
      fallbackUsed: true,
      previewRuntimeSummary: {
        ...rawPreview.previewRuntimeSummary,
        previewDiagnostics: withSortedDiagnostics([
          ...(input.fallbackSummary?.previewDiagnostics ?? []),
          ...rawPreview.previewRuntimeSummary.previewDiagnostics,
          ...blockedDiagnostics,
          TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_RAW_ROUTE_FALLBACK_USED,
        ]),
      },
    }
  } catch (error) {
    if (error instanceof SiteVersionPreviewUnavailableError) {
      console.warn(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DIAGNOSTIC_FALLBACK_UNAVAILABLE}`, {
        requestCorrelationKey: input.context.requestCorrelationKey,
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        requestedPath: input.requestedPath,
        reasonCode: error.code,
      })
      return null
    }
    throw error
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
  const attrs = serializeAttributes(transformedPreviewDiagnosticAttributes(input.summary))
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
    }" ${attrs}>`,
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

  let renderedSite: string
  try {
    const reactDomServer = await import('react-dom/server')
    renderedSite = reactDomServer.renderToStaticMarkup(preparation.renderedSiteElement)
  } catch (error) {
    console.warn('[gnr8.runtime.preview] REACT_PREVIEW_STATIC_RENDER_UNAVAILABLE', {
      siteVersionId: input.siteVersion.id,
      requestedPath: input.requestedPath,
      reasonCode: 'REACT_DOM_SERVER_IMPORT_FAILED',
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      preview: null,
      fallbackSummary: {
        ...preparation.summary,
        previewMode: 'react_preview_degraded',
        renderedWithFallback: false,
        previewDiagnostics: withSortedDiagnostics([
          ...preparation.summary.previewDiagnostics,
          PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_RUNTIME_FAILED,
        ]),
      },
    }
  }

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
    String(input.requestCorrelationKey ?? '').trim() ||
    createRuntimeCorrelationKey({
      type: 'preview_request',
      siteVersionId: input.siteVersionId,
      path: String(input.path ?? '/'),
      mode: String(input.mode ?? 'none'),
    })
  const context = createPreviewReadContext(requestCorrelationKey)
  const requestedPath = normalizePagePath(input.path ?? '/')
  const mode: SiteVersionPreviewMode = normalizeSiteVersionPreviewMode(input.mode)
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

  try {
    if (previewReadDependencies.requestScopedDbClientEnabled) {
      context.dbClient = await previewReadDependencies.acquireRuntimeDbClient()
    }
    if (mode === 'transformed') {
      console.info(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DB_READ_STARTED}`, {
        requestCorrelationKey,
        queryCount: context.queryCount,
        uniqueLookupCount: context.uniqueLookupCount,
        requestedPath,
      })
      try {
        return await renderTransformedSiteVersionPreview({
          siteVersionId: input.siteVersionId,
          requestedPath,
          context,
        })
      } catch (error) {
        if (error instanceof TransformedPreviewDiagnosticContentError) {
          // Continue into the site-version path so transformed diagnostic output can use
          // an explicit raw route fallback instead of broadening normal artifact hits.
        } else if (!(error instanceof SiteVersionPreviewUnavailableError) || error.code !== 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE') {
          throw error
        }
      }
    }
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
      loader: () => previewReadDependencies.getSiteVersion(input.siteVersionId, { dbClient: context.dbClient ?? undefined }),
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
    if (mode !== 'debug' && mode !== 'transformed') {
      const rawTemplatePreview = await renderRawTemplateSiteVersionPreview({
        siteVersion,
        siteVersionId: input.siteVersionId,
        requestedPath,
        routeMapServingEnabled: mode === 'raw_template_preview',
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
        if (error instanceof TransformedPreviewDiagnosticContentError) {
          const fallback = await resolveTransformedDiagnosticContentFallback({
            diagnosticError: error,
            siteVersion,
            requestedPath,
            previewTruth,
            fallbackSummary,
            context,
          })
          if (fallback) return fallback
          throw new SiteVersionPreviewUnavailableError({
            code: 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE',
            message: 'Transformed preview output was blocked because it contained diagnostic recovery content.',
          })
        }
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
    if (context.dbClient) {
      context.dbClient.release()
      context.dbClient = null
    }
    const poolAtEnd = previewReadDependencies.getPoolStatus()
    if (mode === 'transformed') {
      console.info(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DB_READ_COUNT}`, {
        requestCorrelationKey,
        queryCount: context.queryCount,
        uniqueLookupCount: context.uniqueLookupCount,
        requestedPath,
      })
      console.info(`[gnr8.runtime.preview] ${TRANSFORMED_PREVIEW_DIAGNOSTIC.TRANSFORMED_PREVIEW_DB_READ_COMPLETED}`, {
        requestCorrelationKey,
        queryCount: context.queryCount,
        uniqueLookupCount: context.uniqueLookupCount,
        requestedPath,
        poolTotalCount: poolAtEnd.totalCount,
        poolIdleCount: poolAtEnd.idleCount,
        poolWaitingCount: poolAtEnd.waitingCount,
      })
    }
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
  detectTransformedPreviewVisibleDiagnosticContent,
  resolveSemanticFallbackPreview,
  resolveRenderedCapturePreviewTruth,
  rewriteRawTemplateAssetReferences,
  rewriteRawTemplateAssetReferencesWithCounts,
  rewriteRawTemplateMultiPageLinks,
  applyRawPreviewScriptPolicy,
  neutralizeRawPreviewScripts,
  annotateTransformedPreviewHtml,
  selectPreviewOverridesByVersion,
  createPreviewReadContext,
  cacheLookup,
}
