import type {
  MultiPageHtmlAcquisitionStatus,
  MultiPageRawArtifactAssemblyRouteEntry,
} from '@/gnr8/runtime/types'
import type {
  MultiPagePreviewValidation,
  MultiPagePreviewValidationStatus,
} from '@/gnr8/runtime/multipage-preview-validation'

type DiagnosticGroupName = 'Discovery' | 'Robots Discovery' | 'Sitemap Discovery' | 'Acquisition' | 'Assembly' | 'Preview' | 'Validation'

export type MultiPageImportOperatorRouteStatus = 'assembled' | 'fetched' | 'failed' | 'skipped' | 'missing'

export type MultiPageImportOperatorRouteRow = {
  routePath: string
  status: MultiPageImportOperatorRouteStatus
  sourceUrl: string | null
  finalUrl: string | null
  rawFilePath: string | null
}

export type MultiPageImportOperatorDiagnosticGroup = {
  group: DiagnosticGroupName
  count: number
  samples: string[]
}

export type MultiPageImportOperatorSummary = {
  overview: {
    discovery: {
      discoveredRoutes: number
      skippedLinks: number
    }
    sitemapDiscovery: {
      sitemapCount: number
      discoveredUrlCount: number
      skippedUrlCount: number
      warnings: string[]
    }
    robotsDiscovery: {
      status: string
      sitemapDeclarationCount: number
      allowedRoutes: number
      disallowedRoutes: number
      unknownRoutes: number
      warnings: string[]
    }
    acquisition: {
      fetchedPages: number
      failedPages: number
    }
    assembly: {
      assembledPages: number
      excludedPages: number
    }
    validation: {
      status: MultiPagePreviewValidationStatus | 'not_run'
      recommendation: string
    }
  }
  routes: MultiPageImportOperatorRouteRow[]
  validation: {
    validPreviewRoutes: number
    missingPreviewRoutes: number
    rewrittenLinks: number
    skippedLinks: number
    warnings: number
    blockers: number
    warningSamples: string[]
    blockerSamples: string[]
  }
  diagnostics: MultiPageImportOperatorDiagnosticGroup[]
}

type BuildInput = {
  importProvenanceSummary?: unknown
  previewValidation?: unknown
  previewDiagnostics?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function textOrNull(value: unknown): string | null {
  const normalized = text(value)
  return normalized || null
}

function nonNegativeInt(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((entry) => text(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((entry) => text(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function diagnosticGroup(group: DiagnosticGroupName, values: string[]): MultiPageImportOperatorDiagnosticGroup {
  const normalized = [...new Set(values.map((entry) => text(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return {
    group,
    count: normalized.length,
    samples: normalized.slice(0, 5),
  }
}

function normalizeRoutePath(value: unknown): string {
  const raw = text(value)
  if (!raw || raw === '/') return '/'
  const pathOnly = raw.split('?')[0]?.split('#')[0] ?? raw
  return `/${pathOnly.replace(/^\/+/, '').replace(/\/+$/, '')}` || '/'
}

function compareRouteRows(left: MultiPageImportOperatorRouteRow, right: MultiPageImportOperatorRouteRow): number {
  if (left.routePath === '/' && right.routePath !== '/') return -1
  if (right.routePath === '/' && left.routePath !== '/') return 1
  const routeDelta = left.routePath.localeCompare(right.routePath)
  if (routeDelta !== 0) return routeDelta
  const statusDelta = left.status.localeCompare(right.status)
  if (statusDelta !== 0) return statusDelta
  return text(left.rawFilePath).localeCompare(text(right.rawFilePath))
}

function parsePreviewValidation(value: unknown): MultiPagePreviewValidation | null {
  if (!isRecord(value)) return null
  const status = text(value.status)
  if (status !== 'ready' && status !== 'ready_with_warnings' && status !== 'blocked') return null
  const summary = isRecord(value.summary) ? value.summary : {}
  return {
    status,
    summary: {
      discoveredRoutes: nonNegativeInt(summary.discoveredRoutes),
      fetchedPages: nonNegativeInt(summary.fetchedPages),
      assembledPages: nonNegativeInt(summary.assembledPages),
      validPreviewRoutes: nonNegativeInt(summary.validPreviewRoutes),
      missingPreviewRoutes: nonNegativeInt(summary.missingPreviewRoutes),
      rewrittenLinks: nonNegativeInt(summary.rewrittenLinks),
      skippedLinks: nonNegativeInt(summary.skippedLinks),
    },
    routes: Array.isArray(value.routes) ? (value.routes as MultiPagePreviewValidation['routes']) : [],
    links: Array.isArray(value.links) ? (value.links as MultiPagePreviewValidation['links']) : [],
    blockers: textList(value.blockers),
    warnings: textList(value.warnings),
    diagnostics: textList(value.diagnostics),
  }
}

function statusFromPreviewDiagnostics(diagnostics: string[]): MultiPagePreviewValidationStatus | null {
  const codes = new Set(diagnostics.map((entry) => text(entry).toUpperCase()).filter(Boolean))
  if (codes.has('MULTIPAGE_PREVIEW_VALIDATION_BLOCKED')) return 'blocked'
  if (codes.has('MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS')) return 'ready_with_warnings'
  if (codes.has('MULTIPAGE_PREVIEW_VALIDATION_READY')) return 'ready'
  return null
}

function diagnosticCode(value: string): string {
  return text(value).split(':')[0]?.toUpperCase() ?? ''
}

function listLabel(values: string[], fallback: string): string {
  const normalized = uniqueSorted(values).slice(0, 5)
  return normalized.length > 0 ? normalized.join(', ') : fallback
}

function translateDiagnostic(value: string): string | null {
  const code = diagnosticCode(value)
  switch (code) {
    case 'MULTIPAGE_CANONICAL_HOST_EQUIVALENCE_APPLIED':
      return 'The www and apex domain variants were treated as the same website.'
    case 'MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED':
      return 'Some links point to pages that were not included in this import.'
    case 'MULTIPAGE_HTML_ACQUISITION_LIMIT_REACHED':
      return 'The page acquisition limit was reached.'
    case 'MULTIPAGE_ROUTE_LIMIT_REACHED':
      return 'The route limit prevented importing additional pages.'
    case 'MULTIPAGE_DEPTH_LIMIT_REACHED':
      return 'The discovery depth limit prevented importing additional pages.'
    case 'MULTIPAGE_EXTERNAL_LINK_SKIPPED':
      return 'Some links reference pages outside the current import scope.'
    case 'MULTIPAGE_ASSET_LINK_SKIPPED':
      return 'Some links point to files or assets and were not imported as pages.'
    case 'SITEMAP_DISCOVERY_FAILED':
      return 'Sitemap discovery encountered a malformed or unavailable sitemap.'
    case 'SITEMAP_URL_SKIPPED':
      return 'Some sitemap URLs were outside the current import scope or were not valid page routes.'
    case 'SITEMAP_LIMIT_REACHED':
      return 'A sitemap discovery limit prevented importing additional sitemap URLs.'
    case 'ROBOTS_DISCOVERY_FAILED':
      return 'Robots discovery encountered a parsing or fetch failure.'
    case 'ROBOTS_SITEMAP_DECLARATION_MISSING':
      return 'Robots references a sitemap that could not be fetched.'
    case 'ROBOTS_ROUTE_DISALLOWED':
      return 'Some discovered routes are marked disallowed by robots.txt.'
    case 'MULTIPAGE_PREVIEW_ROUTE_MISSING_FILE':
      return 'A preview route is missing its raw HTML file.'
    case 'MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS':
      return 'A preview route could not be resolved from the assembled route map.'
    default:
      return null
  }
}

function translateRuntimeWarning(value: string): string {
  const normalized = text(value)
  const [kind, ...parts] = normalized.split(':')
  const first = text(parts[0])
  const second = text(parts[1])
  if (kind === 'missing_file') {
    return `A preview route is missing its raw HTML file: ${first || 'unknown route'}${second ? ` (${second})` : ''}.`
  }
  if (kind === 'resolver_miss') return `A preview route could not be resolved: ${first || 'unknown route'}.`
  if (kind === 'duplicate_route') return `A duplicate route was found and only one copy can be previewed: ${first || 'unknown route'}.`
  if (kind === 'missing_link_routes') {
    const routes = first.split('|').map((entry) => text(entry)).filter(Boolean)
    return `Some links point to pages that were not included in this import: ${listLabel(routes, first || 'one or more routes')}.`
  }
  if (kind === 'acquisition_failed_pages') {
    const count = nonNegativeInt(first)
    return count === 1 ? '1 page could not be fetched during acquisition.' : `${count} pages could not be fetched during acquisition.`
  }
  return translateDiagnostic(normalized) ?? normalized
}

function translateRuntimeBlocker(value: string): string {
  const normalized = text(value)
  switch (normalized) {
    case 'no_route_map_for_requested_multi_page_preview':
      return 'No assembled route map is available for this multi-page preview.'
    case 'root_file_missing':
      return 'The imported homepage HTML file is missing.'
    case 'all_child_routes_missing':
      return 'All assembled child routes are missing or unavailable.'
    case 'route_resolver_failed_for_all_routes':
      return 'The preview route resolver could not resolve the assembled routes.'
    default:
      return translateRuntimeWarning(normalized)
  }
}

function recommendationForStatus(status: MultiPagePreviewValidationStatus | 'not_run'): string {
  if (status === 'ready') return 'All discovered and assembled routes are previewable. No operator action is required before manual review.'
  if (status === 'ready_with_warnings') {
    return 'The multi-page preview is usable, but some links or routes need review. Consider increasing import limits or accepting the current scope.'
  }
  if (status === 'blocked') return 'The multi-page preview is blocked. Resolve the blockers below before continuing.'
  return 'Multi-page validation has not run yet.'
}

function routeStatusFromAcquisition(value: unknown): MultiPageImportOperatorRouteStatus {
  const status = text(value) as MultiPageHtmlAcquisitionStatus
  if (status === 'fetched' || status === 'failed' || status === 'skipped') return status
  return 'missing'
}

function routeFromAssembly(entry: Record<string, unknown>): MultiPageImportOperatorRouteRow | null {
  const routePath = normalizeRoutePath(entry.routePath)
  if (!routePath) return null
  const rawFilePath = textOrNull(entry.rawFilePath)
  return {
    routePath,
    status: rawFilePath ? 'assembled' : 'missing',
    sourceUrl: textOrNull(entry.sourceUrl),
    finalUrl: textOrNull(entry.finalUrl),
    rawFilePath,
  }
}

export function buildMultiPageImportOperatorSummary(input: BuildInput = {}): MultiPageImportOperatorSummary {
  const provenance = isRecord(input.importProvenanceSummary) ? input.importProvenanceSummary : {}
  const discoveryContainer = isRecord(provenance.multiPageDiscovery) ? provenance.multiPageDiscovery : {}
  const discoverySummary = isRecord(discoveryContainer.summary) ? discoveryContainer.summary : {}
  const discoveryManifest = isRecord(discoveryContainer.manifest) ? discoveryContainer.manifest : {}
  const sitemapDiscovery = isRecord(discoveryContainer.sitemapDiscovery) ? discoveryContainer.sitemapDiscovery : {}
  const robotsDiscovery = isRecord(discoveryContainer.robotsDiscovery) ? discoveryContainer.robotsDiscovery : {}
  const acquisition = isRecord(discoveryContainer.acquisition) ? discoveryContainer.acquisition : null
  const acquisitionSummary = isRecord(acquisition?.summary)
    ? acquisition.summary
    : isRecord(discoverySummary.htmlAcquisition)
      ? discoverySummary.htmlAcquisition
      : {}
  const assembly = isRecord(discoveryContainer.rawArtifactAssembly) ? discoveryContainer.rawArtifactAssembly : null
  const assemblySummary = assembly ?? (isRecord(discoverySummary.rawArtifactAssembly) ? discoverySummary.rawArtifactAssembly : {})
  const previewValidation = parsePreviewValidation(input.previewValidation)

  const routeCandidateCount = Array.isArray(discoveryManifest.routeCandidates)
    ? discoveryManifest.routeCandidates.length
    : nonNegativeInt(discoverySummary.routeCandidateCount)
  const discoveredRoutes = Math.max(
    routeCandidateCount,
    nonNegativeInt(discoverySummary.discoveredPageCount),
    Array.isArray(discoveryManifest.discoveredPages) ? discoveryManifest.discoveredPages.length : 0,
  )
  const skippedLinks = Math.max(
    nonNegativeInt(discoverySummary.skippedLinkCount),
    Array.isArray(discoveryManifest.skippedLinks) ? discoveryManifest.skippedLinks.length : 0,
  )
  const sitemapDiagnostics = textList(sitemapDiscovery.diagnostics)
  const sitemapWarnings = uniqueSorted(sitemapDiagnostics.map(translateDiagnostic).filter((entry): entry is string => Boolean(entry)))
  const sitemapOverview = {
    sitemapCount: Math.max(
      nonNegativeInt(sitemapDiscovery.sitemapCount),
      Array.isArray(sitemapDiscovery.fetchedSitemapUrls) ? sitemapDiscovery.fetchedSitemapUrls.length : 0,
    ),
    discoveredUrlCount: Math.max(nonNegativeInt(sitemapDiscovery.discoveredUrlCount), nonNegativeInt(sitemapDiscovery.urlCount)),
    skippedUrlCount: nonNegativeInt(sitemapDiscovery.skippedUrlCount),
    warnings: sitemapWarnings.slice(0, 5),
  }
  const robotsDiagnostics = textList(robotsDiscovery.diagnostics)
  const robotsWarnings = uniqueSorted(robotsDiagnostics.map(translateDiagnostic).filter((entry): entry is string => Boolean(entry)))
  const robotsRouteGovernanceSummary = isRecord(robotsDiscovery.routeGovernanceSummary) ? robotsDiscovery.routeGovernanceSummary : {}
  const manifestRouteGovernance = Array.isArray(discoveryManifest.routeGovernance) ? discoveryManifest.routeGovernance.filter(isRecord) : []
  const robotsOverview = {
    status: text(robotsDiscovery.fetchedState) || 'unknown',
    sitemapDeclarationCount: Math.max(
      nonNegativeInt(robotsDiscovery.sitemapDeclarationCount),
      Array.isArray(robotsDiscovery.sitemapDeclarations) ? robotsDiscovery.sitemapDeclarations.length : 0,
    ),
    allowedRoutes: Math.max(
      nonNegativeInt(robotsRouteGovernanceSummary.allowed),
      manifestRouteGovernance.filter((entry) => text(entry.status) === 'allowed').length,
    ),
    disallowedRoutes: Math.max(
      nonNegativeInt(robotsRouteGovernanceSummary.disallowed),
      manifestRouteGovernance.filter((entry) => text(entry.status) === 'disallowed').length,
    ),
    unknownRoutes: Math.max(
      nonNegativeInt(robotsRouteGovernanceSummary.unknown),
      manifestRouteGovernance.filter((entry) => text(entry.status) === 'unknown').length,
    ),
    warnings: robotsWarnings.slice(0, 5),
  }

  const acquisitionPages = Array.isArray(acquisition?.pages) ? acquisition.pages : []
  const fetchedPages = Math.max(
    nonNegativeInt(acquisitionSummary.fetchedPageCount),
    acquisitionPages.filter((page) => isRecord(page) && text(page.status) === 'fetched').length,
  )
  const failedPages = Math.max(
    nonNegativeInt(acquisitionSummary.failedPageCount),
    acquisitionPages.filter((page) => isRecord(page) && text(page.status) === 'failed').length,
  )

  const routeMap = Array.isArray(assembly?.routeMap)
    ? assembly.routeMap.filter(isRecord)
    : []
  const assembledPages = Math.max(nonNegativeInt(assemblySummary.assembledPageCount), routeMap.length)
  const excludedPages = Math.max(
    nonNegativeInt(assemblySummary.excludedPageCount),
    Array.isArray(assembly?.excludedPages) ? assembly.excludedPages.length : 0,
  )

  const routesByPath = new Map<string, MultiPageImportOperatorRouteRow>()
  for (const entry of routeMap) {
    const row = routeFromAssembly(entry)
    if (row) routesByPath.set(row.routePath, row)
  }

  for (const page of acquisitionPages) {
    if (!isRecord(page)) continue
    const routePath = normalizeRoutePath(page.finalNormalizedRoutePath ?? page.normalizedRoutePath)
    if (routesByPath.has(routePath)) continue
    routesByPath.set(routePath, {
      routePath,
      status: routeStatusFromAcquisition(page.status),
      sourceUrl: textOrNull(page.normalizedUrl ?? page.originalHref),
      finalUrl: textOrNull(page.finalUrl),
      rawFilePath: textOrNull(page.bodyPath),
    })
  }

  const routeCandidates = Array.isArray(discoveryManifest.routeCandidates)
    ? discoveryManifest.routeCandidates.map((candidate) => normalizeRoutePath(candidate)).filter(Boolean)
    : []
  for (const routePath of routeCandidates) {
    if (routesByPath.has(routePath)) continue
    routesByPath.set(routePath, {
      routePath,
      status: 'missing',
      sourceUrl: null,
      finalUrl: null,
      rawFilePath: null,
    })
  }

  const routes = [...routesByPath.values()].sort(compareRouteRows)
  const previewDiagnostics = textList(input.previewDiagnostics)
  const assemblyEnabled = text((assembly as Record<string, unknown> | null)?.enabled) === 'true' || Boolean((assemblySummary as Record<string, unknown>).enabled)
  const assembledRouteRows = routes.filter((route) => route.status === 'assembled')
  const missingAssembledRouteRows = routes.filter((route) => route.status === 'missing' && routeMap.some((entry) => normalizeRoutePath(entry.routePath) === route.routePath))
  const hasRouteMapEvidence = routeMap.length > 0 || assembledPages > 0
  const allRouteMapEntriesMissing = routeMap.length > 0 && assembledRouteRows.length === 0
  const inferredBlockers = uniqueSorted([
    assemblyEnabled && routeMap.length === 0 ? 'No assembled route map is available for this multi-page preview.' : '',
    allRouteMapEntriesMissing ? 'All assembled child routes are missing or unavailable.' : '',
  ])
  const rawDiagnostics = uniqueSorted(
    textList(discoverySummary.diagnostics)
      .concat(textList(discoveryManifest.diagnostics))
      .concat(robotsDiagnostics)
      .concat(sitemapDiagnostics)
      .concat(textList(acquisitionSummary.diagnostics))
      .concat(textList(acquisition?.diagnostics))
      .concat(acquisitionPages.flatMap((page) => (isRecord(page) ? textList(page.diagnostics) : [])))
      .concat(textList(assemblySummary.diagnostics))
      .concat(textList(assembly?.diagnostics))
      .concat(previewDiagnostics)
      .concat(previewValidation?.diagnostics ?? []),
  )
  const routeLimitSamples = Array.isArray(discoveryManifest.skippedLinks)
    ? discoveryManifest.skippedLinks
        .filter((entry) => isRecord(entry) && text(entry.skippedReason) === 'route_limit')
        .map((entry) => normalizeRoutePath((entry as Record<string, unknown>).normalizedRoutePath ?? (entry as Record<string, unknown>).absoluteUrl ?? (entry as Record<string, unknown>).originalHref))
    : []
  const acquisitionLimitSamples = acquisitionPages
    .filter((page) => isRecord(page) && text(page.skippedReason) === 'acquisition_page_limit')
    .map((page) => normalizeRoutePath((page as Record<string, unknown>).finalNormalizedRoutePath ?? (page as Record<string, unknown>).normalizedRoutePath))
  const diagnosticWarnings = rawDiagnostics.map(translateDiagnostic).filter((entry): entry is string => Boolean(entry))
  const routeWarnings = uniqueSorted([
    missingAssembledRouteRows.length > 0
      ? `A preview route is missing its raw HTML file: ${listLabel(missingAssembledRouteRows.map((route) => route.routePath), 'one or more routes')}.`
      : '',
    routeLimitSamples.length > 0
      ? `The route limit prevented importing additional pages. Sample skipped routes: ${listLabel(routeLimitSamples, 'one or more routes')}.`
      : '',
    acquisitionLimitSamples.length > 0
      ? `The page acquisition limit was reached. Sample skipped routes: ${listLabel(acquisitionLimitSamples, 'one or more routes')}.`
      : '',
    skippedLinks > 0 ? 'Some links reference pages outside the current import scope.' : '',
    excludedPages > 0 ? 'Some fetched pages were excluded from the assembled preview routes.' : '',
  ])
  const validationWarnings = uniqueSorted((previewValidation?.warnings ?? []).map(translateRuntimeWarning).concat(diagnosticWarnings, routeWarnings))
  const validationBlockers = uniqueSorted((previewValidation?.blockers ?? []).map(translateRuntimeBlocker).concat(inferredBlockers))
  const diagnosticStatus = statusFromPreviewDiagnostics(previewDiagnostics.concat(previewValidation?.diagnostics ?? []))
  const validationStatus =
    previewValidation?.status ??
    diagnosticStatus ??
    (validationBlockers.length > 0
      ? 'blocked'
      : hasRouteMapEvidence
        ? validationWarnings.length > 0 || missingAssembledRouteRows.length > 0
          ? 'ready_with_warnings'
          : 'ready'
        : 'not_run')
  const validationLinkDiagnostics = previewValidation?.links.flatMap((link) => textList((link as Record<string, unknown>).diagnostics)) ?? []
  const validPreviewRoutes = previewValidation?.summary.validPreviewRoutes ?? assembledRouteRows.length
  const missingPreviewRoutes = previewValidation?.summary.missingPreviewRoutes ?? missingAssembledRouteRows.length

  return {
    overview: {
      discovery: {
        discoveredRoutes,
        skippedLinks,
      },
      sitemapDiscovery: sitemapOverview,
      robotsDiscovery: robotsOverview,
      acquisition: {
        fetchedPages,
        failedPages,
      },
      assembly: {
        assembledPages,
        excludedPages,
      },
      validation: {
        status: validationStatus,
        recommendation: recommendationForStatus(validationStatus),
      },
    },
    routes,
    validation: {
      validPreviewRoutes,
      missingPreviewRoutes,
      rewrittenLinks: previewValidation?.summary.rewrittenLinks ?? 0,
      skippedLinks: previewValidation?.summary.skippedLinks ?? skippedLinks,
      warnings: validationWarnings.length,
      blockers: validationBlockers.length,
      warningSamples: validationWarnings.slice(0, 5),
      blockerSamples: validationBlockers.slice(0, 5),
    },
    diagnostics: [
      diagnosticGroup('Discovery', textList(discoverySummary.diagnostics).concat(textList(discoveryManifest.diagnostics))),
      diagnosticGroup('Robots Discovery', robotsDiagnostics),
      diagnosticGroup('Sitemap Discovery', sitemapDiagnostics),
      diagnosticGroup('Acquisition', textList(acquisitionSummary.diagnostics).concat(textList(acquisition?.diagnostics))),
      diagnosticGroup('Assembly', textList(assemblySummary.diagnostics).concat(textList(assembly?.diagnostics))),
      diagnosticGroup('Preview', previewDiagnostics.concat(validationLinkDiagnostics)),
      diagnosticGroup('Validation', (previewValidation?.diagnostics ?? []).concat(validationWarnings, validationBlockers)),
    ],
  }
}

export function exampleViroidocMultiPageImportOperatorSummary(): MultiPageImportOperatorSummary {
  const routeMap: MultiPageRawArtifactAssemblyRouteEntry[] = [
    {
      routePath: '/',
      sourceUrl: 'https://viroidoc.example/',
      finalUrl: 'https://viroidoc.example/',
      rawFilePath: 'index.html',
      bodySha256: 'sha-root',
      byteSize: 100,
      status: 'assembled',
    },
    ...['/about', '/blog', '/careers', '/contact', '/faq', '/legal', '/people', '/services', '/work'].map((routePath) => ({
      routePath,
      sourceUrl: `https://viroidoc.example${routePath}`,
      finalUrl: `https://viroidoc.example${routePath}`,
      rawFilePath: `pages${routePath}/index.html`.replace('//', '/'),
      bodySha256: `sha-${routePath}`,
      byteSize: 100,
      status: 'assembled' as const,
    })),
  ]
  return buildMultiPageImportOperatorSummary({
    importProvenanceSummary: {
      multiPageDiscovery: {
        summary: {
          enabled: true,
          discoveredPageCount: 10,
          skippedLinkCount: 29,
          routeCandidateCount: 10,
          diagnostics: [],
          htmlAcquisition: { enabled: true, fetchedPageCount: 10, failedPageCount: 0, skippedPageCount: 0, diagnostics: [] },
          rawArtifactAssembly: { enabled: true, assembledPageCount: 10, excludedPageCount: 29, diagnostics: [] },
        },
        manifest: {
          routeCandidates: routeMap.map((route) => route.routePath),
          skippedLinks: Array.from({ length: 29 }, (_, index) => ({ originalHref: `#skip-${index}` })),
          diagnostics: ['MULTIPAGE_DISCOVERY_COMPLETED'],
        },
        acquisition: {
          summary: { fetchedPageCount: 10, failedPageCount: 0, skippedPageCount: 0 },
          pages: [],
          diagnostics: ['MULTIPAGE_HTML_ACQUISITION_COMPLETED'],
        },
        rawArtifactAssembly: {
          assembledPageCount: 10,
          excludedPageCount: 29,
          routeMap,
          excludedPages: [],
          diagnostics: ['MULTIPAGE_RAW_ARTIFACT_ASSEMBLY_COMPLETED'],
        },
      },
    },
    previewValidation: {
      status: 'ready_with_warnings',
      summary: {
        discoveredRoutes: 10,
        fetchedPages: 10,
        assembledPages: 10,
        validPreviewRoutes: 10,
        missingPreviewRoutes: 0,
        rewrittenLinks: 42,
        skippedLinks: 29,
      },
      routes: [],
      links: [],
      blockers: [],
      warnings: ['missing_link_routes:/legacy'],
      diagnostics: ['MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS'],
    },
    previewDiagnostics: ['RAW_TEMPLATE_PREVIEW_RENDERED'],
  })
}
