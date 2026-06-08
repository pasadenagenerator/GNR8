import {
  RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC,
  normalizeRawTemplateRouteMapPath,
  resolveRawTemplateRouteMapFile,
} from '@/gnr8/runtime/raw-template-route-map-resolver'
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
} as const

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
