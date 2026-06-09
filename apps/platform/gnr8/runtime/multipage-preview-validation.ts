import {
  RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC,
  normalizeRawTemplateRouteMapPath,
  routeMapFromProvenance,
  resolveRawTemplateRouteMapFile,
} from '@/gnr8/runtime/raw-template-route-map-resolver'
import { buildSiteVersionPreviewUrl } from '@/gnr8/site/site-preview-contract'
import { normalizeInternalHref, normalizeSeedUrl } from '@/gnr8/multipage-import/normalization/route-normalization'
import type {
  RawTemplateSiteFileMeta,
  RuntimeImportProvenanceSummary,
} from '@/gnr8/runtime/types'

export const MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC = {
  MULTIPAGE_PREVIEW_VALIDATION_STARTED: 'MULTIPAGE_PREVIEW_VALIDATION_STARTED',
  MULTIPAGE_PREVIEW_ROUTE_VALID: 'MULTIPAGE_PREVIEW_ROUTE_VALID',
  MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE: 'MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE',
  MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS: 'MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS',
  MULTIPAGE_PREVIEW_LINK_SUMMARY_READY: 'MULTIPAGE_PREVIEW_LINK_SUMMARY_READY',
  MULTIPAGE_PREVIEW_VALIDATION_READY: 'MULTIPAGE_PREVIEW_VALIDATION_READY',
  MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS: 'MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS',
  MULTIPAGE_PREVIEW_VALIDATION_BLOCKED: 'MULTIPAGE_PREVIEW_VALIDATION_BLOCKED',
  RAW_PREVIEW_VALIDATION_EVIDENCE_READY: 'RAW_PREVIEW_VALIDATION_EVIDENCE_READY',
  RAW_PREVIEW_VALIDATION_EVIDENCE_READY_WITH_WARNINGS: 'RAW_PREVIEW_VALIDATION_EVIDENCE_READY_WITH_WARNINGS',
  RAW_PREVIEW_VALIDATION_EVIDENCE_BLOCKED: 'RAW_PREVIEW_VALIDATION_EVIDENCE_BLOCKED',
} as const

const RAW_PREVIEW_VALIDATION_ROUTE_CAP = 8

export type MultiPagePreviewValidationStatus = 'ready' | 'ready_with_warnings' | 'blocked'

export type MultiPagePreviewRouteValidationStatus =
  | 'valid'
  | 'missing_file'
  | 'resolver_miss'
  | 'duplicate'
  | 'skipped'

export type MultiPagePreviewValidationRoute = {
  routePath: string
  rawFilePath: string
  sourceUrl: string | null
  status: MultiPagePreviewRouteValidationStatus
  diagnostics: string[]
}

export type MultiPagePreviewValidationLink = {
  status:
    | 'rewritten'
    | 'skipped_external'
    | 'skipped_unsupported'
    | 'skipped_asset'
    | 'skipped_hash_only'
    | 'skipped_route_missing'
  count: number
  sampleMissingRoutes: string[]
  diagnostics: string[]
}

export type MultiPagePreviewLinkRewriteValidationSummary = {
  rewritten: number
  skippedExternal: number
  skippedUnsupported: number
  skippedRouteMissing: number
  skippedAsset: number
  skippedHashOnly: number
  missingRouteSamples?: string[]
  diagnostics?: string[]
}

export type MultiPagePreviewValidation = {
  status: MultiPagePreviewValidationStatus
  summary: {
    discoveredRoutes: number
    fetchedPages: number
    assembledPages: number
    validPreviewRoutes: number
    missingPreviewRoutes: number
    rewrittenLinks: number
    skippedLinks: number
  }
  routes: MultiPagePreviewValidationRoute[]
  links: MultiPagePreviewValidationLink[]
  blockers: string[]
  warnings: string[]
  diagnostics: string[]
}

export type RawMultiPagePreviewValidationRouteEvidence = {
  capturedAt: string
  siteVersionId: string
  artifactId: string
  routePath: string
  selectedRawFilePath: string | null
  validationStatus: MultiPagePreviewRouteValidationStatus
  responseStatus: number | null
  responseBytes: number | null
  htmlBytesAfterRewrite: number | null
  rewrittenLinksCount: number | null
  missingRoute: string | null
  blockers: string[]
  warnings: string[]
  diagnostics: string[]
}

export type LatestRawMultiPagePreviewValidationEvidence = {
  kind: 'raw_multi_page_preview_validation_evidence_v1'
  capturedAt: string
  siteVersionId: string
  artifactId: string
  routePath: string | null
  selectedRawFilePath: string | null
  validationStatus: MultiPagePreviewValidationStatus
  responseStatus: number | null
  responseBytes: number | null
  htmlBytesAfterRewrite: number | null
  rewrittenLinksCount: number | null
  routeEvidence: RawMultiPagePreviewValidationRouteEvidence[]
  warnings: string[]
  blockers: string[]
  diagnostics: string[]
}

export type LatestRawMultiPagePreviewValidationResult = {
  evidence: LatestRawMultiPagePreviewValidationEvidence
  previewValidation: MultiPagePreviewValidation | null
}

function normalizeRawFilePath(value: string): string {
  return String(value ?? '')
    .trim()
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.')
    .join('/')
}

function fileExists(input: { fileMap: Record<string, RawTemplateSiteFileMeta>; rawFilePath: string }): boolean {
  const rawFilePath = normalizeRawFilePath(input.rawFilePath)
  return Boolean(rawFilePath && input.fileMap[rawFilePath])
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

function currentPageUrlForRoute(input: { seedUrl: string; routePath: string; sourceUrl?: string | null; finalUrl?: string | null }): string {
  const direct = input.finalUrl ?? input.sourceUrl ?? null
  if (direct && normalizeSeedUrl(direct)) return direct
  try {
    return new URL(input.routePath, input.seedUrl).toString()
  } catch {
    return input.seedUrl
  }
}

function routeDepth(routePath: string): number {
  const normalized = normalizeRawTemplateRouteMapPath(routePath)
  if (normalized === '/') return 0
  return normalized.split('/').filter(Boolean).length
}

function selectedRawValidationRoutes(provenance: RuntimeImportProvenanceSummary | null | undefined): {
  routePaths: string[]
  warnings: string[]
} {
  const routeMap = routeMapFromProvenance(provenance)
  const assembledRoutes = new Set(routeMap.map((entry) => normalizeRawTemplateRouteMapPath(entry.routePath)))
  const ordered: string[] = ['/']
  const add = (routePath: string) => {
    const normalized = normalizeRawTemplateRouteMapPath(routePath)
    if (normalized !== '/' && !assembledRoutes.has(normalized)) return
    if (!ordered.includes(normalized)) ordered.push(normalized)
  }
  const firstChild = routeMap.map((entry) => normalizeRawTemplateRouteMapPath(entry.routePath)).find((routePath) => routePath !== '/') ?? null
  if (firstChild) add(firstChild)

  const assignments = provenance?.multiPageDiscovery?.manifest?.routePriorityBalancing?.assignments ?? []
  const tierOneRoutes = assignments
    .filter((assignment) => assignment.tier === 'tier_1_navigation' && assignment.selected)
    .map((assignment) => normalizeRawTemplateRouteMapPath(assignment.routePath))
    .filter((routePath) => routePath !== '/' && assembledRoutes.has(routePath))
  const uniqueTierOneRoutes = [...new Set(tierOneRoutes)]
  const warnings: string[] = []
  if (uniqueTierOneRoutes.length > 0) {
    const mergedCount = new Set([...ordered, ...uniqueTierOneRoutes]).size
    if (mergedCount <= RAW_PREVIEW_VALIDATION_ROUTE_CAP) {
      for (const routePath of uniqueTierOneRoutes) add(routePath)
    } else {
      warnings.push(`tier_1_route_validation_cap:${uniqueTierOneRoutes.length}:${RAW_PREVIEW_VALIDATION_ROUTE_CAP}`)
    }
  }

  if (ordered.length === 1 && routeMap.length > 0) {
    const shallowChildren = routeMap
      .map((entry) => normalizeRawTemplateRouteMapPath(entry.routePath))
      .filter((routePath) => routePath !== '/' && routeDepth(routePath) === 1)
    if (shallowChildren.length + ordered.length <= RAW_PREVIEW_VALIDATION_ROUTE_CAP) {
      for (const routePath of shallowChildren) add(routePath)
    }
  }

  return { routePaths: ordered.slice(0, RAW_PREVIEW_VALIDATION_ROUTE_CAP), warnings }
}

function countRawPreviewRewrittenLinks(input: {
  html: string
  siteVersionId: string
  routePath: string
  sourceUrl: string | null
  finalUrl: string | null
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null
}): {
  html: string
  summary: MultiPagePreviewLinkRewriteValidationSummary
  canCount: boolean
} {
  const routeMap = routeMapFromProvenance(input.importProvenanceSummary)
  const seedUrl = firstUsableSeedUrl(input.importProvenanceSummary)
  const emptySummary: MultiPagePreviewLinkRewriteValidationSummary = {
    rewritten: 0,
    skippedExternal: 0,
    skippedUnsupported: 0,
    skippedRouteMissing: 0,
    skippedAsset: 0,
    skippedHashOnly: 0,
    missingRouteSamples: [],
    diagnostics: [],
  }
  if (routeMap.length === 0 || !seedUrl) {
    return {
      html: input.html,
      summary: {
        ...emptySummary,
        diagnostics: ['RAW_PREVIEW_LINK_REWRITE_COUNT_BLOCKED_NO_ROUTE_MAP_OR_SEED'],
      },
      canCount: false,
    }
  }

  const seed = normalizeSeedUrl(seedUrl)
  if (!seed) {
    return {
      html: input.html,
      summary: {
        ...emptySummary,
        diagnostics: ['RAW_PREVIEW_LINK_REWRITE_COUNT_BLOCKED_INVALID_SEED'],
      },
      canCount: false,
    }
  }

  const importedRoutes = new Set<string>(['/'])
  for (const entry of routeMap) importedRoutes.add(normalizeRawTemplateRouteMapPath(entry.routePath))
  const missingRouteSamples = new Set<string>()
  const diagnostics = new Set<string>(['MULTIPAGE_LINK_REWRITE_STARTED'])
  const summary = { ...emptySummary }
  const currentPageUrl = currentPageUrlForRoute({
    seedUrl: seed.url,
    routePath: input.routePath,
    sourceUrl: input.sourceUrl,
    finalUrl: input.finalUrl,
  })
  const html = input.html.replace(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi, (tag: string, quote: string, rawHref: string) => {
    const href = String(rawHref ?? '').trim()
    if (!href) {
      summary.skippedUnsupported += 1
      diagnostics.add('MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME')
      return tag
    }
    if (href.startsWith('#')) {
      summary.skippedHashOnly += 1
      diagnostics.add('MULTIPAGE_LINK_SKIPPED_HASH_ONLY')
      return tag
    }
    if (new RegExp('\\sdownload(?:\\s*=|\\s|>|/)', 'i').test(tag)) {
      summary.skippedAsset += 1
      diagnostics.add('MULTIPAGE_LINK_SKIPPED_ASSET')
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
        summary.skippedExternal += 1
        diagnostics.add('MULTIPAGE_LINK_SKIPPED_EXTERNAL')
      } else if (normalized.skip === 'hash_only') {
        summary.skippedHashOnly += 1
        diagnostics.add('MULTIPAGE_LINK_SKIPPED_HASH_ONLY')
      } else if (normalized.skip === 'asset_link') {
        summary.skippedAsset += 1
        diagnostics.add('MULTIPAGE_LINK_SKIPPED_ASSET')
      } else {
        summary.skippedUnsupported += 1
        diagnostics.add('MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME')
      }
      return tag
    }
    const routePath = normalizeRawTemplateRouteMapPath(normalized.normalized.path)
    if (rawUrl?.search) {
      summary.skippedUnsupported += 1
      diagnostics.add('MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME')
      return tag
    }
    if (!importedRoutes.has(routePath)) {
      summary.skippedRouteMissing += 1
      missingRouteSamples.add(routePath)
      diagnostics.add('MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED')
      return tag
    }
    const rewrittenHref = buildSiteVersionPreviewUrl({
      siteVersionId: input.siteVersionId,
      mode: 'raw_template_preview',
      path: routePath,
    })
    summary.rewritten += 1
    diagnostics.add('MULTIPAGE_LINK_REWRITTEN')
    return tag.replace(/\bhref\s*=\s*(["'])(.*?)\1/i, `href=${quote}${rewrittenHref}${quote}`)
  })
  diagnostics.add('MULTIPAGE_LINK_REWRITE_COMPLETED')
  return {
    html,
    summary: {
      ...summary,
      missingRouteSamples: [...missingRouteSamples].sort((a, b) => a.localeCompare(b)).slice(0, 10),
      diagnostics: [...diagnostics].sort((a, b) => a.localeCompare(b)),
    },
    canCount: true,
  }
}

function mergeLinkSummaries(summaries: MultiPagePreviewLinkRewriteValidationSummary[]): MultiPagePreviewLinkRewriteValidationSummary | null {
  if (summaries.length === 0) return null
  const missingRouteSamples = new Set<string>()
  const diagnostics = new Set<string>()
  const merged: MultiPagePreviewLinkRewriteValidationSummary = {
    rewritten: 0,
    skippedExternal: 0,
    skippedUnsupported: 0,
    skippedRouteMissing: 0,
    skippedAsset: 0,
    skippedHashOnly: 0,
    missingRouteSamples: [],
    diagnostics: [],
  }
  for (const summary of summaries) {
    merged.rewritten += summary.rewritten
    merged.skippedExternal += summary.skippedExternal
    merged.skippedUnsupported += summary.skippedUnsupported
    merged.skippedRouteMissing += summary.skippedRouteMissing
    merged.skippedAsset += summary.skippedAsset
    merged.skippedHashOnly += summary.skippedHashOnly
    for (const sample of summary.missingRouteSamples ?? []) missingRouteSamples.add(sample)
    for (const diagnostic of summary.diagnostics ?? []) diagnostics.add(diagnostic)
  }
  merged.missingRouteSamples = [...missingRouteSamples].sort((a, b) => a.localeCompare(b)).slice(0, 10)
  merged.diagnostics = [...diagnostics].sort((a, b) => a.localeCompare(b))
  return merged
}

function countFetchedPages(provenance: RuntimeImportProvenanceSummary | null | undefined): number {
  const acquisition = provenance?.multiPageDiscovery?.acquisition ?? null
  if (!acquisition) return provenance?.multiPageDiscovery?.summary.htmlAcquisition?.fetchedPageCount ?? 0
  return acquisition.summary?.fetchedPageCount ?? acquisition.pages.filter((page) => page.status === 'fetched').length
}

function countDiscoveredRoutes(provenance: RuntimeImportProvenanceSummary | null | undefined): number {
  const discovery = provenance?.multiPageDiscovery ?? null
  if (!discovery) return 0
  return discovery.manifest?.routeCandidates.length ?? discovery.summary.routeCandidateCount ?? 0
}

function countAssembledPages(provenance: RuntimeImportProvenanceSummary | null | undefined): number {
  const assembly = provenance?.multiPageDiscovery?.rawArtifactAssembly ?? null
  if (!assembly) return provenance?.multiPageDiscovery?.summary.rawArtifactAssembly?.assembledPageCount ?? 0
  return assembly.assembledPageCount ?? assembly.routeMap.length
}

function linkEntries(input: MultiPagePreviewLinkRewriteValidationSummary | null | undefined): MultiPagePreviewValidationLink[] {
  const summary = input ?? {
    rewritten: 0,
    skippedExternal: 0,
    skippedUnsupported: 0,
    skippedRouteMissing: 0,
    skippedAsset: 0,
    skippedHashOnly: 0,
    missingRouteSamples: [],
    diagnostics: [],
  }
  const diagnostics = [...new Set(summary.diagnostics ?? [])].sort((a, b) => a.localeCompare(b))
  const sampleMissingRoutes = [...new Set(summary.missingRouteSamples ?? [])].sort((a, b) => a.localeCompare(b)).slice(0, 10)
  return [
    { status: 'rewritten', count: summary.rewritten, sampleMissingRoutes: [], diagnostics },
    { status: 'skipped_external', count: summary.skippedExternal, sampleMissingRoutes: [], diagnostics },
    { status: 'skipped_unsupported', count: summary.skippedUnsupported, sampleMissingRoutes: [], diagnostics },
    { status: 'skipped_asset', count: summary.skippedAsset, sampleMissingRoutes: [], diagnostics },
    { status: 'skipped_hash_only', count: summary.skippedHashOnly, sampleMissingRoutes: [], diagnostics },
    { status: 'skipped_route_missing', count: summary.skippedRouteMissing, sampleMissingRoutes, diagnostics },
  ]
}

export function validateMultiPagePreview(input: {
  siteId: string
  siteVersionId: string
  entryHtmlPath: string
  fileMap: Record<string, RawTemplateSiteFileMeta>
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null
  multiPagePreviewRequested: boolean
  linkRewriteSummary?: MultiPagePreviewLinkRewriteValidationSummary | null
}): MultiPagePreviewValidation {
  const diagnostics = new Set<string>([MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_VALIDATION_STARTED])
  const blockers: string[] = []
  const warnings: string[] = []
  const routes: MultiPagePreviewValidationRoute[] = []
  const provenance = input.importProvenanceSummary ?? null
  const assembly = provenance?.multiPageDiscovery?.rawArtifactAssembly ?? null
  const routeMap = Array.isArray(assembly?.routeMap) ? assembly.routeMap : []
  const routeMapServingEnabled = Boolean(assembly?.enabled && routeMap.length > 0)

  const rootResolution = routeMapServingEnabled
    ? resolveRawTemplateRouteMapFile({
        siteVersionId: input.siteVersionId,
        requestedPath: '/',
        entryHtmlPath: input.entryHtmlPath,
        fileMap: input.fileMap,
        importProvenanceSummary: provenance,
        routeMapServingEnabled,
      })
    : null
  const rootRawFilePath = normalizeRawFilePath(
    rootResolution && (rootResolution.outcome === 'selected' || rootResolution.outcome === 'file_missing')
      ? rootResolution.rawFilePath
      : input.entryHtmlPath,
  ) || 'index.html'
  const rootExists = rootResolution?.outcome === 'selected' || fileExists({ fileMap: input.fileMap, rawFilePath: rootRawFilePath })
  routes.push({
    routePath: '/',
    rawFilePath: rootRawFilePath,
    sourceUrl:
      rootResolution && (rootResolution.outcome === 'selected' || rootResolution.outcome === 'file_missing')
        ? rootResolution.sourceUrl
        : assembly?.normalizedSeedUrl ?? assembly?.seedUrl ?? null,
    status: rootExists ? 'valid' : 'missing_file',
    diagnostics: [
      rootExists
        ? MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_VALID
        : MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE,
    ],
  })
  diagnostics.add(
    rootExists
      ? MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_VALID
      : MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE,
  )

  if (input.multiPagePreviewRequested && routeMap.length === 0) {
    blockers.push('no_route_map_for_requested_multi_page_preview')
  }
  if (!rootExists) {
    blockers.push('root_file_missing')
  }

  const seenRoutes = new Set<string>(['/'])
  for (const entry of routeMap) {
    const routePath = normalizeRawTemplateRouteMapPath(entry.routePath)
    if (routePath === '/') continue
    const rawFilePath = normalizeRawFilePath(entry.rawFilePath)
    const entryDiagnostics: string[] = []
    let status: MultiPagePreviewRouteValidationStatus = 'valid'
    if (seenRoutes.has(routePath)) {
      status = 'duplicate'
      entryDiagnostics.push('MULTIPAGE_PREVIEW_ROUTE_DUPLICATE')
      warnings.push(`duplicate_route:${routePath}`)
    } else {
      seenRoutes.add(routePath)
      const resolution = resolveRawTemplateRouteMapFile({
        siteVersionId: input.siteVersionId,
        requestedPath: routePath,
        entryHtmlPath: input.entryHtmlPath,
        fileMap: input.fileMap,
        importProvenanceSummary: provenance,
        routeMapServingEnabled,
      })
      if (resolution.outcome === 'miss' || resolution.outcome === 'disabled') {
        status = 'resolver_miss'
        entryDiagnostics.push(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS)
        diagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS)
        warnings.push(`resolver_miss:${routePath}`)
      } else if (resolution.outcome === 'file_missing' || !fileExists({ fileMap: input.fileMap, rawFilePath })) {
        status = 'missing_file'
        entryDiagnostics.push(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE)
        diagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE)
        warnings.push(`missing_file:${routePath}:${rawFilePath}`)
      } else if (
        resolution.diagnosticCode !== RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_SELECTED ||
        normalizeRawFilePath(resolution.rawFilePath) !== rawFilePath
      ) {
        status = 'resolver_miss'
        entryDiagnostics.push(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS)
        diagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS)
        warnings.push(`resolver_miss:${routePath}`)
      } else {
        entryDiagnostics.push(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_VALID)
        diagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_VALID)
      }
    }
    routes.push({
      routePath,
      rawFilePath,
      sourceUrl: entry.sourceUrl ?? null,
      status,
      diagnostics: entryDiagnostics,
    })
  }

  const acquisitionFailedPageCount =
    provenance?.multiPageDiscovery?.acquisition?.summary.failedPageCount ??
    provenance?.multiPageDiscovery?.summary.htmlAcquisition?.failedPageCount ??
    0
  if (acquisitionFailedPageCount > 0) warnings.push(`acquisition_failed_pages:${acquisitionFailedPageCount}`)

  const links = linkEntries(input.linkRewriteSummary)
  diagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_LINK_SUMMARY_READY)
  const skippedRouteMissing = input.linkRewriteSummary?.skippedRouteMissing ?? 0
  const missingRouteSamples = [...new Set(input.linkRewriteSummary?.missingRouteSamples ?? [])].sort((a, b) => a.localeCompare(b))
  if (skippedRouteMissing > 0) warnings.push(`missing_link_routes:${missingRouteSamples.join('|') || skippedRouteMissing}`)

  const childRoutes = routes.filter((route) => route.routePath !== '/')
  const validChildRoutes = childRoutes.filter((route) => route.status === 'valid')
  const missingChildRoutes = childRoutes.filter((route) => route.status === 'missing_file' || route.status === 'resolver_miss')
  const resolverMissChildRoutes = childRoutes.filter((route) => route.status === 'resolver_miss')
  if (childRoutes.length > 0 && validChildRoutes.length === 0 && missingChildRoutes.length > 0) {
    blockers.push('all_child_routes_missing')
  }
  if (childRoutes.length > 0 && resolverMissChildRoutes.length === childRoutes.length) {
    blockers.push('route_resolver_failed_for_all_routes')
  }

  const validPreviewRoutes = routes.filter((route) => route.status === 'valid').length
  const missingPreviewRoutes = routes.filter((route) => route.status === 'missing_file' || route.status === 'resolver_miss').length
  const skippedLinks =
    (input.linkRewriteSummary?.skippedExternal ?? 0) +
    (input.linkRewriteSummary?.skippedUnsupported ?? 0) +
    (input.linkRewriteSummary?.skippedRouteMissing ?? 0) +
    (input.linkRewriteSummary?.skippedAsset ?? 0) +
    (input.linkRewriteSummary?.skippedHashOnly ?? 0)

  const uniqueBlockers = [...new Set(blockers)].sort((a, b) => a.localeCompare(b))
  const uniqueWarnings = [...new Set(warnings)].sort((a, b) => a.localeCompare(b))
  const status: MultiPagePreviewValidationStatus =
    uniqueBlockers.length > 0
      ? 'blocked'
      : uniqueWarnings.length > 0 || missingPreviewRoutes > 0
        ? 'ready_with_warnings'
        : 'ready'
  const statusDiagnostic =
    status === 'ready'
      ? MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_VALIDATION_READY
      : status === 'ready_with_warnings'
        ? MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS
        : MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_VALIDATION_BLOCKED
  diagnostics.add(statusDiagnostic)

  const validation: MultiPagePreviewValidation = {
    status,
    summary: {
      discoveredRoutes: countDiscoveredRoutes(provenance),
      fetchedPages: countFetchedPages(provenance),
      assembledPages: countAssembledPages(provenance),
      validPreviewRoutes,
      missingPreviewRoutes,
      rewrittenLinks: input.linkRewriteSummary?.rewritten ?? 0,
      skippedLinks,
    },
    routes,
    links,
    blockers: uniqueBlockers,
    warnings: uniqueWarnings,
    diagnostics: [...diagnostics].sort((a, b) => a.localeCompare(b)),
  }

  console.info(`[preview-runtime] ${MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_LINK_SUMMARY_READY}`, {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    rewrittenLinks: validation.summary.rewrittenLinks,
    skippedLinks: validation.summary.skippedLinks,
    missingRouteSamples,
  })
  console.info(`[preview-runtime] ${statusDiagnostic}`, {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    status: validation.status,
    summary: validation.summary,
    blockers: validation.blockers,
    warnings: validation.warnings,
  })

  return validation
}

export function validateLatestRawMultiPagePreviewEvidence(input: {
  siteId: string
  siteVersionId: string
  artifactId: string
  entryHtmlPath: string
  fileMap: Record<string, RawTemplateSiteFileMeta>
  rawFileBytesByPath: Record<string, Uint8Array | string>
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null
  capturedAt?: string
}): LatestRawMultiPagePreviewValidationResult {
  const capturedAt = input.capturedAt ?? new Date().toISOString()
  const provenance = input.importProvenanceSummary ?? null
  const assembly = provenance?.multiPageDiscovery?.rawArtifactAssembly ?? null
  const routeMap = routeMapFromProvenance(provenance)
  const routeMapServingEnabled = Boolean(assembly?.enabled && routeMap.length > 0)
  const selectedRoutes = selectedRawValidationRoutes(provenance)
  const warnings = new Set<string>(selectedRoutes.warnings)
  const blockers = new Set<string>()
  const diagnostics = new Set<string>([
    MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_VALIDATION_STARTED,
  ])
  if (!routeMapServingEnabled) blockers.add('raw_route_map_unavailable')

  const routeEvidence: RawMultiPagePreviewValidationRouteEvidence[] = []
  const linkSummaries: MultiPagePreviewLinkRewriteValidationSummary[] = []

  for (const routePath of selectedRoutes.routePaths) {
    const resolution = resolveRawTemplateRouteMapFile({
      siteVersionId: input.siteVersionId,
      requestedPath: routePath,
      entryHtmlPath: input.entryHtmlPath,
      fileMap: input.fileMap,
      importProvenanceSummary: provenance,
      routeMapServingEnabled,
    })
    const routeWarnings: string[] = []
    const routeBlockers: string[] = []
    const routeDiagnostics = new Set<string>([resolution.diagnosticCode])
    let selectedRawFilePath: string | null = null
    let validationStatus: MultiPagePreviewRouteValidationStatus = 'valid'
    let responseStatus: number | null = 200
    let responseBytes: number | null = null
    let htmlBytesAfterRewrite: number | null = null
    let rewrittenLinksCount: number | null = null
    let missingRoute: string | null = null

    if (resolution.outcome === 'selected' || resolution.outcome === 'file_missing') {
      selectedRawFilePath = normalizeRawFilePath(resolution.rawFilePath)
    }
    if (resolution.outcome === 'miss' || resolution.outcome === 'disabled') {
      validationStatus = 'resolver_miss'
      responseStatus = null
      missingRoute = routePath
      routeWarnings.push(`resolver_miss:${routePath}`)
      routeDiagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS)
    } else if (resolution.outcome === 'file_missing' || !selectedRawFilePath || !input.fileMap[selectedRawFilePath]) {
      validationStatus = 'missing_file'
      responseStatus = 404
      routeBlockers.push(`missing_file:${routePath}:${selectedRawFilePath ?? 'unknown'}`)
      routeDiagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE)
    } else {
      const rawBytes = input.rawFileBytesByPath[selectedRawFilePath] ?? null
      const rawHtml = typeof rawBytes === 'string' ? rawBytes : rawBytes ? Buffer.from(rawBytes).toString('utf8') : null
      if (rawHtml == null) {
        validationStatus = 'missing_file'
        responseStatus = 404
        routeBlockers.push(`missing_file:${routePath}:${selectedRawFilePath}`)
        routeDiagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE)
      } else {
        responseBytes = Buffer.byteLength(rawHtml)
        const linkRewrite = countRawPreviewRewrittenLinks({
          html: rawHtml,
          siteVersionId: input.siteVersionId,
          routePath,
          sourceUrl: resolution.sourceUrl,
          finalUrl: resolution.finalUrl,
          importProvenanceSummary: provenance,
        })
        htmlBytesAfterRewrite = Buffer.byteLength(linkRewrite.html)
        if (linkRewrite.canCount) {
          rewrittenLinksCount = linkRewrite.summary.rewritten
          linkSummaries.push(linkRewrite.summary)
        } else {
          routeWarnings.push(`link_rewrite_count_unavailable:${routePath}`)
        }
        for (const diagnostic of linkRewrite.summary.diagnostics ?? []) routeDiagnostics.add(diagnostic)
        routeDiagnostics.add(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_VALID)
      }
    }

    for (const warning of routeWarnings) warnings.add(warning)
    for (const blocker of routeBlockers) blockers.add(blocker)
    for (const diagnostic of routeDiagnostics) diagnostics.add(diagnostic)
    routeEvidence.push({
      capturedAt,
      siteVersionId: input.siteVersionId,
      artifactId: input.artifactId,
      routePath,
      selectedRawFilePath,
      validationStatus,
      responseStatus,
      responseBytes,
      htmlBytesAfterRewrite,
      rewrittenLinksCount,
      missingRoute,
      blockers: [...new Set(routeBlockers)].sort((a, b) => a.localeCompare(b)),
      warnings: [...new Set(routeWarnings)].sort((a, b) => a.localeCompare(b)),
      diagnostics: [...routeDiagnostics].sort((a, b) => a.localeCompare(b)),
    })
  }

  const mergedLinkSummary = mergeLinkSummaries(linkSummaries)
  if (!mergedLinkSummary) warnings.add('raw_preview_link_rewrite_counts_unavailable')
  const previewValidation = mergedLinkSummary
    ? validateMultiPagePreview({
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        entryHtmlPath: input.entryHtmlPath,
        fileMap: input.fileMap,
        importProvenanceSummary: provenance,
        multiPagePreviewRequested: true,
        linkRewriteSummary: mergedLinkSummary,
      })
    : null
  if (previewValidation) {
    for (const warning of previewValidation.warnings) warnings.add(warning)
    for (const blocker of previewValidation.blockers) blockers.add(blocker)
    for (const diagnostic of previewValidation.diagnostics) diagnostics.add(diagnostic)
  }

  const uniqueWarnings = [...warnings].sort((a, b) => a.localeCompare(b))
  const uniqueBlockers = [...blockers].sort((a, b) => a.localeCompare(b))
  const validationStatus: MultiPagePreviewValidationStatus =
    uniqueBlockers.length > 0
      ? 'blocked'
      : uniqueWarnings.length > 0
        ? 'ready_with_warnings'
        : 'ready'
  diagnostics.add(
    validationStatus === 'ready'
      ? MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.RAW_PREVIEW_VALIDATION_EVIDENCE_READY
      : validationStatus === 'ready_with_warnings'
        ? MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.RAW_PREVIEW_VALIDATION_EVIDENCE_READY_WITH_WARNINGS
        : MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.RAW_PREVIEW_VALIDATION_EVIDENCE_BLOCKED,
  )
  const primary = routeEvidence.find((entry) => entry.routePath === '/') ?? routeEvidence[0] ?? null

  return {
    evidence: {
      kind: 'raw_multi_page_preview_validation_evidence_v1',
      capturedAt,
      siteVersionId: input.siteVersionId,
      artifactId: input.artifactId,
      routePath: primary?.routePath ?? null,
      selectedRawFilePath: primary?.selectedRawFilePath ?? null,
      validationStatus,
      responseStatus: primary?.responseStatus ?? null,
      responseBytes: primary?.responseBytes ?? null,
      htmlBytesAfterRewrite: primary?.htmlBytesAfterRewrite ?? null,
      rewrittenLinksCount: primary?.rewrittenLinksCount ?? null,
      routeEvidence,
      warnings: uniqueWarnings,
      blockers: uniqueBlockers,
      diagnostics: [...diagnostics].sort((a, b) => a.localeCompare(b)),
    },
    previewValidation,
  }
}
