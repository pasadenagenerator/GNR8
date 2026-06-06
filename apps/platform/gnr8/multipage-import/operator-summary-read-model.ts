import type {
  MultiPageHtmlAcquisitionStatus,
  MultiPageRawArtifactAssemblyRouteEntry,
} from '@/gnr8/runtime/types'
import type {
  MultiPagePreviewValidation,
  MultiPagePreviewValidationStatus,
} from '@/gnr8/runtime/multipage-preview-validation'

type DiagnosticGroupName = 'Discovery' | 'Acquisition' | 'Assembly' | 'Preview' | 'Validation'

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

function routeStatusFromAcquisition(value: unknown): MultiPageImportOperatorRouteStatus {
  const status = text(value) as MultiPageHtmlAcquisitionStatus
  if (status === 'fetched' || status === 'failed' || status === 'skipped') return status
  return 'missing'
}

function routeFromAssembly(entry: Record<string, unknown>): MultiPageImportOperatorRouteRow | null {
  const routePath = normalizeRoutePath(entry.routePath)
  if (!routePath) return null
  return {
    routePath,
    status: 'assembled',
    sourceUrl: textOrNull(entry.sourceUrl),
    finalUrl: textOrNull(entry.finalUrl),
    rawFilePath: textOrNull(entry.rawFilePath),
  }
}

export function buildMultiPageImportOperatorSummary(input: BuildInput = {}): MultiPageImportOperatorSummary {
  const provenance = isRecord(input.importProvenanceSummary) ? input.importProvenanceSummary : {}
  const discoveryContainer = isRecord(provenance.multiPageDiscovery) ? provenance.multiPageDiscovery : {}
  const discoverySummary = isRecord(discoveryContainer.summary) ? discoveryContainer.summary : {}
  const discoveryManifest = isRecord(discoveryContainer.manifest) ? discoveryContainer.manifest : {}
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
  const validationStatus = previewValidation?.status ?? statusFromPreviewDiagnostics(previewDiagnostics) ?? 'not_run'
  const validationWarnings = previewValidation?.warnings ?? []
  const validationBlockers = previewValidation?.blockers ?? []
  const validationLinkDiagnostics = previewValidation?.links.flatMap((link) => textList((link as Record<string, unknown>).diagnostics)) ?? []

  return {
    overview: {
      discovery: {
        discoveredRoutes,
        skippedLinks,
      },
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
      },
    },
    routes,
    validation: {
      validPreviewRoutes: previewValidation?.summary.validPreviewRoutes ?? 0,
      missingPreviewRoutes: previewValidation?.summary.missingPreviewRoutes ?? 0,
      rewrittenLinks: previewValidation?.summary.rewrittenLinks ?? 0,
      skippedLinks: previewValidation?.summary.skippedLinks ?? 0,
      warnings: validationWarnings.length,
      blockers: validationBlockers.length,
      warningSamples: validationWarnings.slice(0, 5),
      blockerSamples: validationBlockers.slice(0, 5),
    },
    diagnostics: [
      diagnosticGroup('Discovery', textList(discoverySummary.diagnostics).concat(textList(discoveryManifest.diagnostics))),
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
