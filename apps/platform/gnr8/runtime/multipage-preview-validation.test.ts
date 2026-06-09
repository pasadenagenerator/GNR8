import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC,
  validateLatestRawMultiPagePreviewEvidence,
  validateMultiPagePreview,
  type MultiPagePreviewLinkRewriteValidationSummary,
} from '@/gnr8/runtime/multipage-preview-validation'
import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'

function fileMap(paths: string[]) {
  return Object.fromEntries(
    paths.map((path) => [path, { path, mediaType: 'text/html', sizeBytes: 100, sha256: `sha-${path}` }]),
  )
}

function provenance(input?: {
  routeMap?: Array<{ routePath: string; rawFilePath: string; sourceUrl?: string }>
  assemblyEnabled?: boolean
  fetchedPageCount?: number
  failedPageCount?: number
}): RuntimeImportProvenanceSummary {
  const routeMap = input?.routeMap ?? [
    { routePath: '/about', rawFilePath: 'pages/about/index.html', sourceUrl: 'https://example.com/about' },
    { routePath: '/contact', rawFilePath: 'pages/contact/index.html', sourceUrl: 'https://example.com/contact' },
  ]
  const fetchedPageCount = input?.fetchedPageCount ?? routeMap.length
  const failedPageCount = input?.failedPageCount ?? 0
  return {
    multiPageDiscovery: {
      summary: {
        enabled: true,
        discoveredPageCount: routeMap.length,
        skippedLinkCount: 0,
        routeCandidateCount: routeMap.length,
        manifestRef: 'importProvenanceSummary.multiPageDiscovery.manifest',
        diagnostics: [],
        htmlAcquisition: {
          enabled: true,
          fetchedPageCount,
          failedPageCount,
          skippedPageCount: 0,
          manifestRef: 'importProvenanceSummary.multiPageDiscovery.acquisition',
          diagnostics: [],
        },
        rawArtifactAssembly: {
          enabled: input?.assemblyEnabled ?? true,
          assembledPageCount: routeMap.length,
          excludedPageCount: 0,
          routeMapRef: 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap',
          diagnostics: [],
        },
      },
      manifest: {
        kind: 'multi_page_discovery_manifest_v1',
        seedUrl: 'https://example.com',
        normalizedSeedUrl: 'https://example.com/',
        normalizedSeedRoute: '/',
        discoveredPages: [],
        skippedLinks: [],
        routeCandidates: routeMap.map((route) => route.routePath),
        normalizedUrls: [],
        depth: { seedDepth: 0, maxDiscoveredDepth: 1 },
        limitsApplied: { maxDiscoveredUrls: 10, maxDepth: 2, maxLinksPerPage: 20, maxTemplateLinksPerRoute: 20 },
        diagnostics: [],
        generatedAt: '2026-06-06T00:00:00.000Z',
      },
      acquisition: {
        kind: 'multi_page_html_acquisition_manifest_v1',
        seedUrl: 'https://example.com',
        normalizedSeedUrl: 'https://example.com/',
        pages: [],
        limitsApplied: { maxPages: 10, maxBytesPerPage: 1000000, requestTimeoutMs: 5000 },
        summary: { fetchedPageCount, failedPageCount, skippedPageCount: 0 },
        diagnostics: [],
        generatedAt: '2026-06-06T00:00:00.000Z',
      },
      rawArtifactAssembly: {
        kind: 'multi_page_raw_artifact_assembly_manifest_v1',
        enabled: (input?.assemblyEnabled ?? true) as true,
        seedUrl: 'https://example.com',
        normalizedSeedUrl: 'https://example.com/',
        assembledPageCount: routeMap.length,
        excludedPageCount: 0,
        failedPageCount,
        routeMap: routeMap.map((route) => ({
          routePath: route.routePath,
          sourceUrl: route.sourceUrl ?? `https://example.com${route.routePath}`,
          finalUrl: route.sourceUrl ?? `https://example.com${route.routePath}`,
          rawFilePath: route.rawFilePath,
          bodySha256: `sha-${route.routePath}`,
          byteSize: 100,
          status: 'assembled' as const,
        })),
        htmlPathMap: Object.fromEntries(routeMap.map((route) => [route.routePath, route.rawFilePath])),
        excludedPages: [],
        failedPages: [],
        manifestPath: null,
        diagnostics: [],
        generatedAt: '2026-06-06T00:00:00.000Z',
      },
    },
  } as unknown as RuntimeImportProvenanceSummary
}

function validate(input?: {
  provenance?: RuntimeImportProvenanceSummary | null
  paths?: string[]
  entryHtmlPath?: string
  multiPagePreviewRequested?: boolean
  linkRewriteSummary?: MultiPagePreviewLinkRewriteValidationSummary
}) {
  return validateMultiPagePreview({
    siteId: 'site-validation',
    siteVersionId: 'sv-validation',
    entryHtmlPath: input?.entryHtmlPath ?? 'index.html',
    fileMap: fileMap(input?.paths ?? ['index.html', 'pages/about/index.html', 'pages/contact/index.html']),
    importProvenanceSummary: Object.prototype.hasOwnProperty.call(input ?? {}, 'provenance') ? input?.provenance ?? null : provenance(),
    multiPagePreviewRequested: input?.multiPagePreviewRequested ?? true,
    linkRewriteSummary: input?.linkRewriteSummary ?? null,
  })
}

test('multi-page preview validation is ready when all routes resolve', () => {
  const result = validate({
    linkRewriteSummary: {
      rewritten: 2,
      skippedExternal: 0,
      skippedUnsupported: 0,
      skippedRouteMissing: 0,
      skippedAsset: 0,
      skippedHashOnly: 0,
      diagnostics: ['MULTIPAGE_LINK_REWRITTEN'],
    },
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.summary.discoveredRoutes, 2)
  assert.equal(result.summary.fetchedPages, 2)
  assert.equal(result.summary.assembledPages, 2)
  assert.equal(result.summary.validPreviewRoutes, 3)
  assert.equal(result.summary.missingPreviewRoutes, 0)
  assert.equal(result.summary.rewrittenLinks, 2)
  assert.equal(result.summary.skippedLinks, 0)
  assert.equal(result.routes.every((route) => route.status === 'valid'), true)
  assert.equal(result.diagnostics.includes(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_VALIDATION_READY), true)
})

test('multi-page preview validation uses assembled root route file when present', () => {
  const result = validate({
    paths: ['assembled/all-pages.html', 'pages/root/index.html', 'pages/project/index.html'],
    entryHtmlPath: 'assembled/all-pages.html',
    provenance: provenance({
      routeMap: [
        { routePath: '/', rawFilePath: 'pages/root/index.html', sourceUrl: 'https://example.com/' },
        { routePath: '/project', rawFilePath: 'pages/project/index.html', sourceUrl: 'https://example.com/project' },
      ],
    }),
  })

  assert.equal(result.status, 'ready')
  assert.equal(result.summary.validPreviewRoutes, 2)
  assert.equal(result.summary.missingPreviewRoutes, 0)
  assert.equal(result.routes.length, 2)
  assert.equal(result.routes.find((route) => route.routePath === '/')?.rawFilePath, 'pages/root/index.html')
  assert.equal(result.routes.find((route) => route.routePath === '/')?.status, 'valid')
  assert.equal(result.routes.find((route) => route.routePath === '/project')?.status, 'valid')
})

test('multi-page preview validation is ready_with_warnings for missing files, failed acquisition, and missing links', () => {
  const result = validate({
    paths: ['index.html', 'pages/about/index.html'],
    provenance: provenance({ failedPageCount: 1 }),
    linkRewriteSummary: {
      rewritten: 1,
      skippedExternal: 1,
      skippedUnsupported: 0,
      skippedRouteMissing: 1,
      skippedAsset: 0,
      skippedHashOnly: 0,
      missingRouteSamples: ['/missing'],
      diagnostics: ['MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED'],
    },
  })

  assert.equal(result.status, 'ready_with_warnings')
  assert.equal(result.summary.missingPreviewRoutes, 1)
  assert.equal(result.summary.skippedLinks, 2)
  assert.equal(result.routes.find((route) => route.routePath === '/contact')?.status, 'missing_file')
  assert.ok(result.warnings.some((warning) => warning.includes('missing_file:/contact')))
  assert.ok(result.warnings.some((warning) => warning.includes('acquisition_failed_pages:1')))
  assert.ok(result.warnings.some((warning) => warning.includes('missing_link_routes:/missing')))
  assert.deepEqual(
    result.links.find((link) => link.status === 'skipped_route_missing')?.sampleMissingRoutes,
    ['/missing'],
  )
})

test('multi-page preview validation is blocked when requested without a route map', () => {
  const result = validate({ provenance: null, multiPagePreviewRequested: true })

  assert.equal(result.status, 'blocked')
  assert.deepEqual(result.blockers, ['no_route_map_for_requested_multi_page_preview'])
  assert.equal(result.routes.find((route) => route.routePath === '/')?.status, 'valid')
})

test('multi-page preview validation does not block non-controlled single-page preview without a route map', () => {
  const result = validate({ provenance: null, multiPagePreviewRequested: false })

  assert.equal(result.status, 'ready')
  assert.deepEqual(result.blockers, [])
  assert.equal(result.summary.validPreviewRoutes, 1)
})

test('multi-page preview validation reports missing root raw file as a blocker', () => {
  const result = validate({ paths: ['pages/about/index.html', 'pages/contact/index.html'] })

  assert.equal(result.status, 'blocked')
  assert.equal(result.routes.find((route) => route.routePath === '/')?.status, 'missing_file')
  assert.equal(result.blockers.includes('root_file_missing'), true)
})

test('multi-page preview validation reports resolver misses explicitly', () => {
  const result = validate({
    provenance: provenance({ assemblyEnabled: false }),
  })

  assert.equal(result.status, 'blocked')
  assert.equal(result.routes.find((route) => route.routePath === '/about')?.status, 'resolver_miss')
  assert.equal(result.routes.find((route) => route.routePath === '/contact')?.status, 'resolver_miss')
  assert.equal(result.blockers.includes('route_resolver_failed_for_all_routes'), true)
  assert.equal(result.diagnostics.includes(MULTIPAGE_PREVIEW_VALIDATION_DIAGNOSTIC.MULTIPAGE_PREVIEW_ROUTE_RESOLVER_MISS), true)
})

test('multi-page preview validation status rules are deterministic', () => {
  const linkRewriteSummary = {
    rewritten: 1,
    skippedExternal: 1,
    skippedUnsupported: 1,
    skippedRouteMissing: 1,
    skippedAsset: 1,
    skippedHashOnly: 1,
    missingRouteSamples: ['/z', '/a', '/z'],
    diagnostics: ['b', 'a', 'b'],
  }
  const first = validate({ paths: ['index.html', 'pages/about/index.html'], linkRewriteSummary })
  const second = validate({ paths: ['index.html', 'pages/about/index.html'], linkRewriteSummary })

  assert.deepEqual(first, second)
  assert.deepEqual(
    first.links.find((link) => link.status === 'skipped_route_missing')?.sampleMissingRoutes,
    ['/a', '/z'],
  )
})

test('latest raw preview validation uses route-map resolution for root and selected tier one routes', () => {
  const html = [
    '<!doctype html><html><body><nav>',
    '<a href="/project">Project</a>',
    '<a href="/people">People</a>',
    '<a href="/news">News</a>',
    '</nav></body></html>',
  ].join('')
  const rawFileBytesByPath = {
    'index.html': html,
    'pages/project/index.html': html,
    'pages/people/index.html': html,
    'pages/news/index.html': html,
  }
  const rawProvenance = provenance({
    routeMap: [
      { routePath: '/project', rawFilePath: 'pages/project/index.html', sourceUrl: 'https://example.com/project' },
      { routePath: '/people', rawFilePath: 'pages/people/index.html', sourceUrl: 'https://example.com/people' },
      { routePath: '/news', rawFilePath: 'pages/news/index.html', sourceUrl: 'https://example.com/news' },
    ],
  })
  rawProvenance.multiPageDiscovery!.manifest!.routePriorityBalancing = {
    maxRoutes: 8,
    routeLimitHit: false,
    selectedRouteCount: 3,
    excludedRouteCount: 0,
    tiers: [{ tier: 'tier_1_navigation', candidateCount: 3, selectedCount: 3, excludedCount: 0 }],
    assignments: [
      { routePath: '/project', tier: 'tier_1_navigation', source: 'navigation', reason: 'header_navigation', selected: true, excludedReason: null },
      { routePath: '/people', tier: 'tier_1_navigation', source: 'navigation', reason: 'header_navigation', selected: true, excludedReason: null },
      { routePath: '/news', tier: 'tier_1_navigation', source: 'navigation', reason: 'header_navigation', selected: true, excludedReason: null },
    ],
    diagnostics: [],
  }
  const result = validateLatestRawMultiPagePreviewEvidence({
    siteId: 'site-validation',
    siteVersionId: 'sv-validation',
    artifactId: 'artifact-validation',
    entryHtmlPath: 'index.html',
    fileMap: fileMap(Object.keys(rawFileBytesByPath)),
    rawFileBytesByPath,
    capturedAt: '2026-06-09T10:00:00.000Z',
    importProvenanceSummary: rawProvenance,
  })

  assert.equal(result.previewValidation?.status, 'ready')
  assert.equal(result.previewValidation?.summary.rewrittenLinks, 12)
  assert.deepEqual(result.evidence.routeEvidence.map((route) => route.routePath), ['/', '/project', '/people', '/news'])
  for (const routePath of ['/', '/project', '/people', '/news']) {
    const evidence = result.evidence.routeEvidence.find((route) => route.routePath === routePath)
    assert.equal(evidence?.validationStatus, 'valid')
    assert.equal(evidence?.rewrittenLinksCount, 3)
  }
  assert.equal(
    result.evidence.routeEvidence.find((route) => route.routePath === '/project')?.selectedRawFilePath,
    'pages/project/index.html',
  )
})
