import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  buildMultiPageImportOperatorSummary,
  exampleViroidocMultiPageImportOperatorSummary,
} from '@/gnr8/multipage-import/operator-summary-read-model'

function provenance(input?: {
  routeCandidates?: string[]
  skippedLinkCount?: number
  acquisitionPages?: Array<{
    originalHref: string
    normalizedUrl?: string | null
    finalUrl?: string | null
    normalizedRoutePath: string
    finalNormalizedRoutePath?: string | null
    status: 'fetched' | 'failed' | 'skipped'
    bodyPath?: string | null
    diagnostics?: string[]
    skippedReason?: string | null
    failureReason?: string | null
  }>
  routeMap?: Array<{
    routePath: string
    sourceUrl: string
    finalUrl: string
    rawFilePath: string
  }>
  excludedPageCount?: number
  sitemapDiscovery?: {
    fetchedSitemapUrls: string[]
    urlCount: number
    skippedUrlCount: number
    diagnostics: string[]
  }
  canonicalDiscovery?: {
    canonicalEntries: Array<Record<string, unknown>>
    alternateLanguageEntries: Array<Record<string, unknown>>
    duplicates: Array<Record<string, unknown>>
    conflicts: Array<Record<string, unknown>>
    hreflangGroups: Array<Record<string, unknown>>
    diagnostics: string[]
  }
  redirectDiscovery?: {
    redirectEntries: Array<Record<string, unknown>>
    crossOriginRedirects: Array<Record<string, unknown>>
    counts: {
      redirectCount: number
      crossOriginRedirectCount: number
      canonicalHostRedirectCount: number
    }
    diagnostics: string[]
  }
  aliasDiscovery?: {
    aliasGroups: Array<Record<string, unknown>>
    routeCollisions: Array<Record<string, unknown>>
    conflicts: Array<Record<string, unknown>>
    counts: {
      aliasGroupCount: number
      routeCollisionCount: number
    }
    diagnostics: string[]
  }
  robotsDiscovery?: {
    fetchedState: string
    sitemapDeclarations: string[]
    routeGovernanceSummary: {
      allowed: number
      disallowed: number
      unknown: number
    }
    diagnostics: string[]
  }
  routePriorityBalancing?: Record<string, unknown>
}) {
  const routeCandidates = input?.routeCandidates ?? ['/']
  const acquisitionPages = input?.acquisitionPages ?? []
  const routeMap = input?.routeMap ?? []
  return {
    kind: 'runtime_import_provenance_summary_v1',
    multiPageDiscovery: {
      summary: {
        enabled: true,
        discoveredPageCount: routeCandidates.length,
        skippedLinkCount: input?.skippedLinkCount ?? 0,
        routeCandidateCount: routeCandidates.length,
        diagnostics: ['DISCOVERY_SUMMARY_DIAG'],
        htmlAcquisition: {
          enabled: acquisitionPages.length > 0,
          fetchedPageCount: acquisitionPages.filter((page) => page.status === 'fetched').length,
          failedPageCount: acquisitionPages.filter((page) => page.status === 'failed').length,
          skippedPageCount: acquisitionPages.filter((page) => page.status === 'skipped').length,
          diagnostics: ['ACQUISITION_SUMMARY_DIAG'],
        },
        rawArtifactAssembly: {
          enabled: routeMap.length > 0,
          assembledPageCount: routeMap.length,
          excludedPageCount: input?.excludedPageCount ?? 0,
          diagnostics: ['ASSEMBLY_SUMMARY_DIAG'],
        },
      },
      manifest: {
        kind: 'multi_page_discovery_manifest_v1',
        routeCandidates,
        discoveredPages: routeCandidates.map((routePath) => ({ normalizedRoutePath: routePath })),
        skippedLinks: Array.from({ length: input?.skippedLinkCount ?? 0 }, (_, index) => ({ originalHref: `#skip-${index}` })),
        routePriorityBalancing: input?.routePriorityBalancing,
        diagnostics: ['DISCOVERY_MANIFEST_DIAG'],
      },
      canonicalDiscovery: input?.canonicalDiscovery ?? null,
      redirectDiscovery: input?.redirectDiscovery ?? null,
      aliasDiscovery: input?.aliasDiscovery ?? null,
      robotsDiscovery: input?.robotsDiscovery ?? null,
      sitemapDiscovery: input?.sitemapDiscovery ?? null,
      acquisition: {
        kind: 'multi_page_html_acquisition_manifest_v1',
        pages: acquisitionPages.map((page) => ({
          originalHref: page.originalHref,
          normalizedUrl: page.normalizedUrl ?? page.originalHref,
          finalUrl: page.finalUrl ?? page.normalizedUrl ?? page.originalHref,
          normalizedRoutePath: page.normalizedRoutePath,
          finalNormalizedRoutePath: page.finalNormalizedRoutePath ?? page.normalizedRoutePath,
          status: page.status,
          bodyPath: page.bodyPath ?? null,
          diagnostics: page.diagnostics ?? [],
          skippedReason: page.skippedReason ?? null,
          failureReason: page.failureReason ?? null,
        })),
        summary: {
          fetchedPageCount: acquisitionPages.filter((page) => page.status === 'fetched').length,
          failedPageCount: acquisitionPages.filter((page) => page.status === 'failed').length,
          skippedPageCount: acquisitionPages.filter((page) => page.status === 'skipped').length,
        },
        diagnostics: ['ACQUISITION_MANIFEST_DIAG'],
      },
      rawArtifactAssembly: {
        kind: 'multi_page_raw_artifact_assembly_manifest_v1',
        assembledPageCount: routeMap.length,
        excludedPageCount: input?.excludedPageCount ?? 0,
        routeMap: routeMap.map((route) => ({
          ...route,
          bodySha256: `sha-${route.routePath}`,
          byteSize: 100,
          status: 'assembled',
        })),
        excludedPages: Array.from({ length: input?.excludedPageCount ?? 0 }, (_, index) => ({ reason: `excluded-${index}` })),
        diagnostics: ['ASSEMBLY_MANIFEST_DIAG'],
      },
    },
  }
}

test('multi-page operator summary returns a safe empty summary', () => {
  const summary = buildMultiPageImportOperatorSummary()

  assert.deepEqual(summary.overview.discovery, { discoveredRoutes: 0, skippedLinks: 0 })
  assert.deepEqual(summary.overview.sitemapDiscovery, { sitemapCount: 0, discoveredUrlCount: 0, skippedUrlCount: 0, warnings: [] })
  assert.deepEqual(summary.overview.canonicalDiscovery, { canonicalUrlCount: 0, conflictCount: 0, duplicateRouteCount: 0, hreflangGroupCount: 0, warnings: [] })
  assert.deepEqual(summary.overview.redirectAliasDiscovery, {
    redirectCount: 0,
    aliasGroupCount: 0,
    crossOriginRedirectCount: 0,
    routeCollisionCount: 0,
    aliasGroupSamples: [],
    warnings: [],
  })
  assert.deepEqual(summary.overview.robotsDiscovery, {
    status: 'unknown',
    sitemapDeclarationCount: 0,
    allowedRoutes: 0,
    disallowedRoutes: 0,
    unknownRoutes: 0,
    warnings: [],
  })
  assert.deepEqual(summary.overview.discoveryPriorityBalancing, {
    routeLimitHit: false,
    selectedRouteCount: 0,
    excludedRouteCount: 0,
    tiers: [],
    warnings: [],
  })
  assert.deepEqual(summary.overview.acquisition, { fetchedPages: 0, failedPages: 0 })
  assert.deepEqual(summary.overview.assembly, { assembledPages: 0, excludedPages: 0 })
  assert.equal(summary.overview.validation.status, 'not_run')
  assert.equal(summary.overview.validation.recommendation, 'Multi-page validation has not run yet.')
  assert.deepEqual(summary.routes, [])
  assert.equal(summary.validation.warnings, 0)
  assert.equal(summary.validation.blockers, 0)
})

test('multi-page operator summary displays canonical discovery evidence', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about', '/about-copy'],
      canonicalDiscovery: {
        canonicalEntries: [
          { pageRoutePath: '/about', canonicalUrl: 'https://example.com/about', normalizedCanonicalRoutePath: '/about' },
          { pageRoutePath: '/about-copy', canonicalUrl: 'https://example.com/about', normalizedCanonicalRoutePath: '/about' },
        ],
        alternateLanguageEntries: [
          { pageRoutePath: '/about', hreflang: 'en', url: 'https://example.com/about', normalizedRoutePath: '/about' },
          { pageRoutePath: '/about', hreflang: 'sl', url: 'https://example.com/sl/about', normalizedRoutePath: '/sl/about' },
        ],
        duplicates: [{ normalizedCanonicalRoutePath: '/about', pageRoutePaths: ['/about', '/about-copy'] }],
        conflicts: [{ pageRoutePath: '/about-copy', normalizedCanonicalRoutePaths: ['/about', '/company'] }],
        hreflangGroups: [{ pageRoutePath: '/about', entries: [] }],
        diagnostics: [
          'CANONICAL_DISCOVERY_FOUND:/about:/about',
          'CANONICAL_DISCOVERY_DUPLICATE:/about:/about|/about-copy',
          'CANONICAL_DISCOVERY_CONFLICT:/about-copy:/about|/company',
          'HREFLANG_DISCOVERY_FOUND:/about:sl:/sl/about',
        ],
      },
    }),
  })

  assert.deepEqual(summary.overview.canonicalDiscovery, {
    canonicalUrlCount: 2,
    conflictCount: 1,
    duplicateRouteCount: 1,
    hreflangGroupCount: 1,
    warnings: [
      'Multiple discovered pages point to the same canonical route.',
      'Some pages declare conflicting canonical URLs.',
    ],
  })
  assert.equal(summary.diagnostics.find((group) => group.group === 'Canonical Discovery')?.count, 4)
  assert.equal(summary.validation.warningSamples.includes('Multiple discovered pages point to the same canonical route.'), true)
  assert.equal(summary.validation.warningSamples.includes('Some pages declare conflicting canonical URLs.'), true)
})

test('multi-page operator summary displays redirect and alias evidence', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about'],
      redirectDiscovery: {
        redirectEntries: [
          {
            originalUrl: 'http://www.example.com/about',
            finalUrl: 'https://example.com/about',
            classification: 'canonical_host_redirect',
          },
          {
            originalUrl: 'https://example.com/old',
            finalUrl: 'https://external.example/new',
            classification: 'cross_origin_redirect',
          },
        ],
        crossOriginRedirects: [
          {
            originalUrl: 'https://example.com/old',
            finalUrl: 'https://external.example/new',
            classification: 'cross_origin_redirect',
          },
        ],
        counts: { redirectCount: 2, crossOriginRedirectCount: 1, canonicalHostRedirectCount: 1 },
        diagnostics: [
          'REDIRECT_DISCOVERY_CANONICAL_HOST:http://www.example.com/about->https://example.com/about',
          'REDIRECT_DISCOVERY_CROSS_ORIGIN:https://example.com/old->https://external.example/new',
        ],
      },
      aliasDiscovery: {
        aliasGroups: [
          {
            canonicalRoute: '/about',
            aliases: ['https://example.com/about', 'https://example.com/about/', 'https://example.com/about/index.html'],
            sources: ['link', 'sitemap', 'canonical'],
          },
        ],
        routeCollisions: [
          {
            canonicalRoute: '/about',
            sourceRoutes: ['/about-copy', '/about'],
            aliases: ['https://example.com/about-copy', 'https://example.com/about'],
            sources: ['canonical'],
          },
        ],
        conflicts: [],
        counts: { aliasGroupCount: 1, routeCollisionCount: 1 },
        diagnostics: ['ALIAS_GROUP_CREATED:/about:3', 'ALIAS_ROUTE_COLLISION:/about:/about-copy|/about'],
      },
    }),
  })

  assert.deepEqual(summary.overview.redirectAliasDiscovery, {
    redirectCount: 2,
    aliasGroupCount: 1,
    crossOriginRedirectCount: 1,
    routeCollisionCount: 1,
    aliasGroupSamples: [
      {
        canonicalRoute: '/about',
        aliases: ['https://example.com/about', 'https://example.com/about/', 'https://example.com/about/index.html'],
        sources: ['canonical', 'link', 'sitemap'],
      },
    ],
    warnings: [
      'Multiple discovered URL identities collapse onto the same canonical route.',
      'Some discovered URLs redirect between canonical host or scheme variants.',
      'Some discovered URLs redirect outside the current website.',
    ],
  })
  assert.equal(summary.diagnostics.find((group) => group.group === 'Redirect Discovery')?.count, 2)
  assert.equal(summary.diagnostics.find((group) => group.group === 'Alias Discovery')?.count, 2)
  assert.equal(summary.validation.warningSamples.includes('Some discovered URLs redirect outside the current website.'), true)
})

test('multi-page operator summary displays robots discovery evidence', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about', '/private'],
      robotsDiscovery: {
        fetchedState: 'fetched',
        sitemapDeclarations: ['https://example.com/sitemap.xml', 'https://example.com/news.xml'],
        routeGovernanceSummary: { allowed: 1, disallowed: 1, unknown: 0 },
        diagnostics: [
          'ROBOTS_DISCOVERY_SUCCEEDED:1:1:2',
          'ROBOTS_SITEMAP_DECLARATION_FOUND:https://example.com/sitemap.xml',
          'ROBOTS_SITEMAP_DECLARATION_MISSING:https://example.com/news.xml',
          'ROBOTS_ROUTE_DISALLOWED:/private',
        ],
      },
    }),
  })

  assert.deepEqual(summary.overview.robotsDiscovery, {
    status: 'fetched',
    sitemapDeclarationCount: 2,
    allowedRoutes: 1,
    disallowedRoutes: 1,
    unknownRoutes: 0,
    warnings: [
      'Robots references a sitemap that could not be fetched.',
      'Some discovered routes are marked disallowed by robots.txt.',
    ],
  })
  assert.equal(summary.diagnostics.find((group) => group.group === 'Robots Discovery')?.count, 4)
  assert.equal(summary.validation.warningSamples.includes('Some discovered routes are marked disallowed by robots.txt.'), true)
})

test('multi-page operator summary displays sitemap discovery evidence', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/hidden'],
      sitemapDiscovery: {
        fetchedSitemapUrls: ['https://example.com/sitemap.xml'],
        urlCount: 1,
        skippedUrlCount: 2,
        diagnostics: ['SITEMAP_DISCOVERY_SUCCEEDED:1', 'SITEMAP_URL_SKIPPED:external_host:https://external.example/page'],
      },
    }),
  })

  assert.deepEqual(summary.overview.sitemapDiscovery, {
    sitemapCount: 1,
    discoveredUrlCount: 1,
    skippedUrlCount: 2,
    warnings: ['Some sitemap URLs were outside the current import scope or were not valid page routes.'],
  })
  assert.equal(summary.diagnostics.find((group) => group.group === 'Sitemap Discovery')?.count, 2)
  assert.equal(summary.validation.warningSamples.includes('Some sitemap URLs were outside the current import scope or were not valid page routes.'), true)
})

test('multi-page operator summary displays discovery-only imports', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/people', '/', '/blog'],
      skippedLinkCount: 29,
    }),
  })

  assert.equal(summary.overview.discovery.discoveredRoutes, 3)
  assert.equal(summary.overview.discovery.skippedLinks, 29)
  assert.deepEqual(
    summary.routes.map((route) => `${route.routePath}:${route.status}`),
    ['/:missing', '/blog:missing', '/people:missing'],
  )
  assert.equal(summary.overview.validation.status, 'not_run')
  assert.match(summary.overview.validation.recommendation, /has not run/)
  assert.equal(summary.diagnostics.find((group) => group.group === 'Discovery')?.count, 2)
})

test('multi-page operator summary displays acquisition-only imports', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/', '/about', '/missing'],
      acquisitionPages: [
        { originalHref: 'https://example.com/about', normalizedRoutePath: '/about', status: 'fetched', bodyPath: 'pages/about/index.html' },
        { originalHref: 'https://example.com/missing', normalizedRoutePath: '/missing', status: 'failed' },
      ],
    }),
  })

  assert.equal(summary.overview.acquisition.fetchedPages, 1)
  assert.equal(summary.overview.acquisition.failedPages, 1)
  assert.deepEqual(
    summary.routes.map((route) => `${route.routePath}:${route.status}:${route.rawFilePath ?? 'none'}`),
    ['/:missing:none', '/about:fetched:pages/about/index.html', '/missing:failed:none'],
  )
  assert.equal(summary.overview.validation.status, 'not_run')
})

test('multi-page operator summary displays assembled route maps', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/', '/people', '/missing'],
      routeMap: [
        { routePath: '/people', sourceUrl: 'https://example.com/people', finalUrl: 'https://example.com/people', rawFilePath: 'pages/people/index.html' },
        { routePath: '/', sourceUrl: 'https://example.com/', finalUrl: 'https://example.com/', rawFilePath: 'index.html' },
      ],
      excludedPageCount: 1,
    }),
  })

  assert.equal(summary.overview.assembly.assembledPages, 2)
  assert.equal(summary.overview.assembly.excludedPages, 1)
  assert.deepEqual(
    summary.routes.map((route) => `${route.routePath}:${route.status}:${route.sourceUrl ?? 'none'}:${route.rawFilePath ?? 'none'}`),
    [
      '/:assembled:https://example.com/:index.html',
      '/missing:missing:none:none',
      '/people:assembled:https://example.com/people:pages/people/index.html',
    ],
  )
  assert.notEqual(summary.overview.validation.status, 'not_run')
})

test('multi-page operator summary upgrades validated root entry instead of showing skipped seed route', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/', '/project'],
      acquisitionPages: [
        {
          originalHref: 'https://example.com/',
          normalizedRoutePath: '/',
          status: 'skipped',
          skippedReason: 'acquisition_discovery_seed_route',
        },
        {
          originalHref: 'https://example.com/project',
          normalizedRoutePath: '/project',
          status: 'fetched',
          bodyPath: 'pages/project/index.html',
        },
      ],
      routeMap: [
        { routePath: '/project', sourceUrl: 'https://example.com/project', finalUrl: 'https://example.com/project', rawFilePath: 'pages/project/index.html' },
      ],
    }),
    previewValidation: {
      status: 'ready',
      summary: {
        discoveredRoutes: 2,
        fetchedPages: 2,
        assembledPages: 2,
        validPreviewRoutes: 2,
        missingPreviewRoutes: 0,
        rewrittenLinks: 3,
        skippedLinks: 0,
      },
      routes: [
        { routePath: '/', rawFilePath: 'pages/root/index.html', sourceUrl: 'https://example.com/', status: 'valid', diagnostics: [] },
        { routePath: '/project', rawFilePath: 'pages/project/index.html', sourceUrl: 'https://example.com/project', status: 'valid', diagnostics: [] },
      ],
      links: [],
      warnings: [],
      blockers: [],
      diagnostics: ['MULTIPAGE_PREVIEW_VALIDATION_READY'],
    },
  })

  const root = summary.routes.find((route) => route.routePath === '/')
  assert.equal(root?.status, 'assembled')
  assert.equal(root?.rawFilePath, 'pages/root/index.html')
  assert.equal(root?.selectionReason, 'root_entry')
  assert.equal(root?.skippedReason, null)
})

test('multi-page operator summary infers ready from assembled route-map evidence', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about'],
      routeMap: [
        { routePath: '/about', sourceUrl: 'https://example.com/about', finalUrl: 'https://example.com/about', rawFilePath: 'multipage/about.html' },
      ],
    }),
  })

  assert.equal(summary.overview.validation.status, 'ready')
  assert.equal(summary.validation.validPreviewRoutes, 1)
  assert.equal(summary.validation.missingPreviewRoutes, 0)
  assert.equal(summary.overview.validation.recommendation, 'All discovered and assembled routes are previewable. No operator action is required before manual review.')
})

test('multi-page operator summary respects ready preview validation payloads', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about'],
      routeMap: [
        { routePath: '/about', sourceUrl: 'https://example.com/about', finalUrl: 'https://example.com/about', rawFilePath: 'multipage/about.html' },
      ],
    }),
    previewValidation: {
      status: 'ready',
      summary: {
        discoveredRoutes: 1,
        fetchedPages: 1,
        assembledPages: 1,
        validPreviewRoutes: 1,
        missingPreviewRoutes: 0,
        rewrittenLinks: 2,
        skippedLinks: 0,
      },
      warnings: [],
      blockers: [],
      diagnostics: ['MULTIPAGE_PREVIEW_VALIDATION_READY'],
      links: [],
    },
  })

  assert.equal(summary.overview.validation.status, 'ready')
  assert.equal(summary.validation.warnings, 0)
  assert.equal(summary.validation.blockers, 0)
})

test('multi-page operator summary displays validation status and accurate warning/blocker counts', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({ routeCandidates: ['/', '/about'] }),
    previewValidation: {
      status: 'ready_with_warnings',
      summary: {
        discoveredRoutes: 2,
        fetchedPages: 2,
        assembledPages: 2,
        validPreviewRoutes: 1,
        missingPreviewRoutes: 1,
        rewrittenLinks: 3,
        skippedLinks: 4,
      },
      warnings: ['missing_file:/about:pages/about/index.html', 'missing_link_routes:/missing'],
      blockers: ['root_file_missing'],
      diagnostics: ['MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS'],
      links: [{ status: 'skipped_route_missing', count: 1, sampleMissingRoutes: ['/missing'], diagnostics: ['MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED'] }],
    },
    previewDiagnostics: ['RAW_TEMPLATE_PREVIEW_RENDERED'],
  })

  assert.equal(summary.overview.validation.status, 'ready_with_warnings')
  assert.deepEqual(summary.validation, {
    validPreviewRoutes: 1,
    missingPreviewRoutes: 1,
    rewrittenLinks: 3,
    skippedLinks: 4,
    warnings: 2,
    blockers: 1,
    warningSamples: [
      'A preview route is missing its raw HTML file: /about (pages/about/index.html).',
      'Some links point to pages that were not included in this import: /missing.',
    ],
    blockerSamples: ['The imported homepage HTML file is missing.'],
  })
  assert.equal(summary.diagnostics.find((group) => group.group === 'Preview')?.count, 2)
  assert.equal(summary.diagnostics.find((group) => group.group === 'Validation')?.count, 4)
  assert.match(summary.overview.validation.recommendation, /usable/)
})

test('multi-page operator summary infers validation status from preview diagnostics when payload is absent', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({ routeCandidates: ['/', '/about'] }),
    previewDiagnostics: ['MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS'],
  })

  assert.equal(summary.overview.validation.status, 'ready_with_warnings')
  assert.equal(summary.validation.warnings, 0)
  assert.equal(summary.validation.blockers, 0)
})

test('multi-page operator summary blocks when assembly ran without a route map', () => {
  const input = provenance({ routeCandidates: ['/', '/about'] }) as any
  input.multiPageDiscovery.summary.rawArtifactAssembly.enabled = true
  input.multiPageDiscovery.rawArtifactAssembly.enabled = true

  const summary = buildMultiPageImportOperatorSummary({ importProvenanceSummary: input })

  assert.equal(summary.overview.validation.status, 'blocked')
  assert.equal(summary.validation.blockers, 1)
  assert.deepEqual(summary.validation.blockerSamples, ['No assembled route map is available for this multi-page preview.'])
  assert.equal(summary.overview.validation.recommendation, 'The multi-page preview is blocked. Resolve the blockers below before continuing.')
})

test('multi-page operator summary blocks when every assembled route file is missing', () => {
  const input = provenance({
    routeCandidates: ['/about'],
    routeMap: [
      { routePath: '/about', sourceUrl: 'https://example.com/about', finalUrl: 'https://example.com/about', rawFilePath: 'multipage/about.html' },
    ],
  }) as any
  input.multiPageDiscovery.rawArtifactAssembly.routeMap[0].rawFilePath = null

  const summary = buildMultiPageImportOperatorSummary({ importProvenanceSummary: input })

  assert.equal(summary.overview.validation.status, 'blocked')
  assert.equal(summary.validation.missingPreviewRoutes, 1)
  assert.equal(summary.validation.blockerSamples.includes('All assembled child routes are missing or unavailable.'), true)
})

test('multi-page operator summary translates common diagnostics into operator text', () => {
  const input = provenance({
    routeCandidates: ['/about'],
    routeMap: [
      { routePath: '/about', sourceUrl: 'https://www.example.com/about', finalUrl: 'https://example.com/about', rawFilePath: 'multipage/about.html' },
    ],
  }) as any
  input.multiPageDiscovery.acquisition.diagnostics = [
    'MULTIPAGE_CANONICAL_HOST_EQUIVALENCE_APPLIED:seed=example.com',
    'MULTIPAGE_HTML_ACQUISITION_LIMIT_REACHED',
  ]

  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: input,
    previewDiagnostics: ['MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED'],
  })

  assert.equal(summary.validation.warningSamples.includes('The www and apex domain variants were treated as the same website.'), true)
  assert.equal(summary.validation.warningSamples.includes('The page acquisition limit was reached.'), true)
  assert.equal(summary.validation.warningSamples.includes('Some links point to pages that were not included in this import.'), true)
})

test('multi-page operator summary recommendation text is deterministic by status', () => {
  const ready = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about'],
      routeMap: [
        { routePath: '/about', sourceUrl: 'https://example.com/about', finalUrl: 'https://example.com/about', rawFilePath: 'multipage/about.html' },
      ],
    }),
  })
  const warned = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about'],
      skippedLinkCount: 1,
      routeMap: [
        { routePath: '/about', sourceUrl: 'https://example.com/about', finalUrl: 'https://example.com/about', rawFilePath: 'multipage/about.html' },
      ],
    }),
  })
  const blocked = buildMultiPageImportOperatorSummary({
    previewDiagnostics: ['MULTIPAGE_PREVIEW_VALIDATION_BLOCKED'],
  })

  assert.equal(ready.overview.validation.recommendation, 'All discovered and assembled routes are previewable. No operator action is required before manual review.')
  assert.equal(
    warned.overview.validation.recommendation,
    'The multi-page preview is usable, but some links or routes need review. Consider increasing import limits or accepting the current scope.',
  )
  assert.equal(blocked.overview.validation.recommendation, 'The multi-page preview is blocked. Resolve the blockers below before continuing.')
})

test('multi-page operator route table generation is deterministic', () => {
  const input = {
    importProvenanceSummary: provenance({
      routeCandidates: ['/z', '/a', '/', '/a'],
      acquisitionPages: [
        { originalHref: 'https://example.com/z', normalizedRoutePath: '/z', status: 'fetched', bodyPath: 'pages/z/index.html' },
      ],
      routeMap: [
        { routePath: '/a', sourceUrl: 'https://example.com/a', finalUrl: 'https://example.com/a', rawFilePath: 'pages/a/index.html' },
      ],
    }),
  }

  const first = buildMultiPageImportOperatorSummary(input)
  const second = buildMultiPageImportOperatorSummary(input)

  assert.deepEqual(first.routes, second.routes)
  assert.deepEqual(
    first.routes.map((route) => `${route.routePath}:${route.status}`),
    ['/:missing', '/a:assembled', '/z:fetched'],
  )
})

test('multi-page operator route table preserves priority order and explains skipped routes', () => {
  const routePriorityBalancing = {
    maxRoutes: 60,
    routeLimitHit: false,
    selectedRouteCount: 4,
    excludedRouteCount: 1,
    tiers: [
      { tier: 'tier_1_navigation', candidateCount: 3, selectedCount: 3, excludedCount: 0 },
      { tier: 'tier_2_canonical', candidateCount: 0, selectedCount: 0, excludedCount: 0 },
      { tier: 'tier_3_shallow', candidateCount: 0, selectedCount: 0, excludedCount: 0 },
      { tier: 'tier_4_deep', candidateCount: 2, selectedCount: 1, excludedCount: 1 },
    ],
    assignments: [
      { routePath: '/blog', tier: 'tier_1_navigation', reason: 'header_navigation', selected: true, excludedReason: null },
      { routePath: '/people', tier: 'tier_1_navigation', reason: 'header_navigation', selected: true, excludedReason: null },
      { routePath: '/project', tier: 'tier_1_navigation', reason: 'header_navigation', selected: true, excludedReason: null },
      { routePath: '/b/article-001', tier: 'tier_4_deep', reason: 'deep_content_tree', selected: true, excludedReason: null },
      { routePath: '/b/article-002', tier: 'tier_4_deep', reason: 'deep_content_tree', selected: false, excludedReason: 'route_limit' },
    ],
    diagnostics: ['DISCOVERY_PRIORITY_BUDGET_APPLIED:4:1:60'],
  }
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/blog', '/people', '/project', '/b/article-001'],
      routePriorityBalancing,
      acquisitionPages: [
        { originalHref: 'https://example.com/blog', normalizedRoutePath: '/blog', status: 'fetched', bodyPath: 'pages/blog.html' },
        { originalHref: 'https://example.com/people', normalizedRoutePath: '/people', status: 'fetched', bodyPath: 'pages/people.html' },
        { originalHref: 'https://example.com/project', normalizedRoutePath: '/project', status: 'fetched', bodyPath: 'pages/project.html' },
        { originalHref: 'https://example.com/b/article-001', normalizedRoutePath: '/b/article-001', status: 'skipped', skippedReason: 'acquisition_page_limit' },
      ],
      routeMap: [
        { routePath: '/blog', sourceUrl: 'https://example.com/blog', finalUrl: 'https://example.com/blog', rawFilePath: 'pages/blog/index.html' },
        { routePath: '/people', sourceUrl: 'https://example.com/people', finalUrl: 'https://example.com/people', rawFilePath: 'pages/people/index.html' },
        { routePath: '/project', sourceUrl: 'https://example.com/project', finalUrl: 'https://example.com/project', rawFilePath: 'pages/project/index.html' },
      ],
    }),
  })

  assert.deepEqual(
    summary.routes.map((route) => `${route.routePath}:${route.priorityTier}:${route.status}:${route.skippedReason ?? route.selectionReason ?? 'none'}`),
    [
      '/blog:tier_1_navigation:assembled:header_navigation',
      '/people:tier_1_navigation:assembled:header_navigation',
      '/project:tier_1_navigation:assembled:header_navigation',
      '/b/article-001:tier_4_deep:skipped:acquisition_page_limit',
      '/b/article-002:tier_4_deep:skipped:route_limit',
    ],
  )
})

test('multi-page developer diagnostics are sampled for collapsed UI display', () => {
  const diagnostics = Array.from({ length: 12 }, (_, index) => `MULTIPAGE_HTML_FETCH_SKIPPED:${index}`)
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/blog'],
      acquisitionPages: [
        {
          originalHref: 'https://example.com/blog',
          normalizedRoutePath: '/blog',
          status: 'fetched',
          bodyPath: 'pages/blog.html',
          diagnostics,
        },
      ],
    }),
  })

  const acquisitionDiagnostics = summary.diagnostics.find((group) => group.group === 'Acquisition')
  assert.equal((acquisitionDiagnostics?.count ?? 0) > 5, true)
  assert.equal(acquisitionDiagnostics?.samples.length, 5)
  assert.equal(summary.validation.warningSamples.length <= 5, true)
})

test('Site Workspace keeps raw multi-page diagnostics behind collapsed developer details', () => {
  const source = fs.readFileSync(
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../app/gnr8/agency/clients/[clientId]/sites/[siteId]/SiteWorkspacePage.tsx'),
    'utf8',
  )

  assert.equal(source.includes('<details'), true)
  assert.equal(source.includes('Show developer diagnostics'), true)
  assert.equal(source.includes('operator warnings and blockers above are the primary readiness surface'), true)
})

test('example Viroidoc operator summary renders the smoke counts', () => {
  const summary = exampleViroidocMultiPageImportOperatorSummary()

  assert.equal(summary.overview.discovery.discoveredRoutes, 10)
  assert.equal(summary.overview.discovery.skippedLinks, 29)
  assert.equal(summary.overview.acquisition.fetchedPages, 10)
  assert.equal(summary.overview.acquisition.failedPages, 0)
  assert.equal(summary.overview.assembly.assembledPages, 10)
  assert.equal(summary.overview.assembly.excludedPages, 29)
  assert.equal(summary.overview.validation.status, 'ready_with_warnings')
  assert.equal(summary.validation.blockers, 0)
  assert.equal(summary.validation.warningSamples.some((sample) => sample.includes('not included in this import')), true)
})

test('Viroidoc-like persisted read model infers ready_with_warnings without preview payload', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about', '/contact'],
      skippedLinkCount: 3,
      routeMap: [
        { routePath: '/about', sourceUrl: 'https://www.viroidoc.eu/about', finalUrl: 'https://viroidoc.eu/about', rawFilePath: 'multipage/about.html' },
        { routePath: '/contact', sourceUrl: 'https://www.viroidoc.eu/contact', finalUrl: 'https://viroidoc.eu/contact', rawFilePath: 'multipage/contact.html' },
      ],
    }),
    previewDiagnostics: ['MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED'],
  })

  assert.equal(summary.overview.validation.status, 'ready_with_warnings')
  assert.equal(summary.validation.blockers, 0)
  assert.equal(summary.validation.warningSamples.some((sample) => sample.includes('not included in this import')), true)
})

test('Paul-Graham-like route-limit summary explains the limit in operator wording', () => {
  const input = provenance({
    routeCandidates: ['/articles', '/rss'],
    routeMap: [
      { routePath: '/articles', sourceUrl: 'https://www.paulgraham.com/articles.html', finalUrl: 'https://www.paulgraham.com/articles.html', rawFilePath: 'multipage/articles.html' },
      { routePath: '/rss', sourceUrl: 'https://www.paulgraham.com/rss.html', finalUrl: 'https://www.paulgraham.com/rss.html', rawFilePath: 'multipage/rss.html' },
    ],
  }) as any
  input.multiPageDiscovery.manifest.diagnostics = ['MULTIPAGE_ROUTE_LIMIT_REACHED:20']
  input.multiPageDiscovery.manifest.skippedLinks = [
    {
      originalHref: 'https://www.paulgraham.com/greatwork.html',
      absoluteUrl: 'https://www.paulgraham.com/greatwork.html',
      normalizedRoutePath: '/greatwork',
      skippedReason: 'route_limit',
    },
  ]

  const summary = buildMultiPageImportOperatorSummary({ importProvenanceSummary: input })

  assert.equal(summary.overview.validation.status, 'ready_with_warnings')
  assert.equal(summary.validation.warningSamples.some((sample) => sample.includes('route limit prevented importing additional pages')), true)
  assert.equal(summary.validation.warningSamples.some((sample) => sample.includes('/greatwork')), true)
})

test('multi-page operator summary displays discovery priority balancing evidence', () => {
  const summary = buildMultiPageImportOperatorSummary({
    importProvenanceSummary: provenance({
      routeCandidates: ['/about', '/contact', '/blog/post-001'],
      routePriorityBalancing: {
        maxRoutes: 3,
        routeLimitHit: true,
        selectedRouteCount: 3,
        excludedRouteCount: 2,
        tiers: [
          { tier: 'tier_1_navigation', candidateCount: 2, selectedCount: 2, excludedCount: 0 },
          { tier: 'tier_2_canonical', candidateCount: 0, selectedCount: 0, excludedCount: 0 },
          { tier: 'tier_3_shallow', candidateCount: 1, selectedCount: 1, excludedCount: 0 },
          { tier: 'tier_4_deep', candidateCount: 2, selectedCount: 0, excludedCount: 2 },
        ],
        assignments: [
          { routePath: '/about', tier: 'tier_1_navigation', selected: true },
          { routePath: '/contact', tier: 'tier_1_navigation', selected: true },
          { routePath: '/blog/post-001', tier: 'tier_4_deep', selected: false },
        ],
        diagnostics: [
          'DISCOVERY_PRIORITY_BUDGET_APPLIED:3:2:3',
          'DISCOVERY_PRIORITY_ROUTE_EXCLUDED:/blog/post-002:tier_4_deep:route_limit',
        ],
      },
    }),
  })

  assert.equal(summary.overview.discoveryPriorityBalancing.routeLimitHit, true)
  assert.equal(summary.overview.discoveryPriorityBalancing.selectedRouteCount, 3)
  assert.equal(summary.overview.discoveryPriorityBalancing.excludedRouteCount, 2)
  assert.deepEqual(summary.overview.discoveryPriorityBalancing.tiers.map((tier) => [tier.tier, tier.selectedCount, tier.excludedCount]), [
    ['tier_1_navigation', 2, 0],
    ['tier_2_canonical', 0, 0],
    ['tier_3_shallow', 1, 0],
    ['tier_4_deep', 0, 2],
  ])
  assert.equal(summary.validation.warningSamples.some((sample) => sample.includes('Priority balancing excluded lower-priority routes')), true)
})
