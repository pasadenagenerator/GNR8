import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PreviewDbBackpressureError,
  __unifiedRenderPreviewTestUtils,
  SiteVersionPreviewUnavailableError,
  renderSiteVersionPreview,
  setUnifiedRenderPreviewDependenciesForTest,
} from '@/gnr8/runtime/unified-render-preview'
import type { SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'
import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'

function fixtureSemanticImport(): SemanticImportResult {
  return {
    sourceMode: 'raw_html_only',
    captureMode: 'raw_html_only',
    title: 'Semantic Site',
    language: 'en',
    navigation: [],
    hero: {
      title: 'Semantic Hero',
      subtitle: 'Fallback subtitle',
      cta: { label: 'Contact', url: '/contact' },
      image: { src: '/assets/hero.jpg', alt: 'Hero' },
      confidence: 1,
      diagnostics: [],
    },
    sections: [],
    assets: {
      images: [{ src: '/assets/hero.jpg', alt: 'Hero', role: 'hero_image', sectionId: null }],
      groupedByRole: {
        logo: [],
        hero_image: ['/assets/hero.jpg'],
        gallery_image: [],
        service_image: [],
        testimonial_avatar: [],
        content_image: [],
        icon: [],
        unknown: [],
      },
      knownAssets: [{ path: '/assets/hero.jpg', mediaType: 'image/jpeg' }],
    },
    diagnostics: [],
  }
}

function fixtureMultiPageAssemblyProvenance(): RuntimeImportProvenanceSummary {
  return {
    multiPageDiscovery: {
      summary: {
        enabled: true,
        discoveredPageCount: 2,
        skippedLinkCount: 0,
        routeCandidateCount: 2,
        manifestRef: 'importProvenanceSummary.multiPageDiscovery.manifest',
        diagnostics: [],
        rawArtifactAssembly: {
          enabled: true,
          assembledPageCount: 2,
          excludedPageCount: 0,
          routeMapRef: 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap',
          diagnostics: [],
        },
      },
      manifest: null,
      acquisition: null,
      rawArtifactAssembly: {
        kind: 'multi_page_raw_artifact_assembly_manifest_v1',
        enabled: true,
        seedUrl: 'https://example.com',
        normalizedSeedUrl: 'https://example.com/',
        assembledPageCount: 2,
        excludedPageCount: 0,
        failedPageCount: 0,
        routeMap: [
          {
            routePath: '/about',
            sourceUrl: 'https://example.com/about',
            finalUrl: 'https://example.com/about',
            rawFilePath: 'pages/about/index.html',
            bodySha256: 'sha-about',
            byteSize: 100,
            status: 'assembled',
          },
          {
            routePath: '/services/item',
            sourceUrl: 'https://example.com/services/item',
            finalUrl: 'https://example.com/services/item',
            rawFilePath: 'pages/services/item/index.html',
            bodySha256: 'sha-services-item',
            byteSize: 100,
            status: 'assembled',
          },
        ],
        htmlPathMap: {
          '/about': 'pages/about/index.html',
          '/services/item': 'pages/services/item/index.html',
        },
        excludedPages: [],
        failedPages: [],
        manifestPath: null,
        diagnostics: [],
        generatedAt: '2026-06-06T00:00:00.000Z',
      },
    },
  } as unknown as RuntimeImportProvenanceSummary
}

function fixtureViroidocLikeMultiPageAssemblyProvenance(): RuntimeImportProvenanceSummary {
  const routes = [
    ['/', 'pages/root/index.html'],
    ['/project', 'pages/project/index.html'],
    ['/people', 'pages/people/index.html'],
    ['/news', 'pages/news/index.html'],
  ] as const
  return {
    multiPageDiscovery: {
      summary: {
        enabled: true,
        discoveredPageCount: routes.length,
        skippedLinkCount: 0,
        routeCandidateCount: routes.length,
        manifestRef: 'importProvenanceSummary.multiPageDiscovery.manifest',
        diagnostics: [],
        htmlAcquisition: {
          enabled: true,
          fetchedPageCount: routes.length,
          failedPageCount: 0,
          skippedPageCount: 0,
          manifestRef: 'importProvenanceSummary.multiPageDiscovery.acquisition',
          diagnostics: [],
        },
        rawArtifactAssembly: {
          enabled: true,
          assembledPageCount: routes.length,
          excludedPageCount: 0,
          routeMapRef: 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap',
          diagnostics: [],
        },
      },
      manifest: {
        routeCandidates: routes.map(([routePath]) => routePath),
      },
      acquisition: {
        summary: { fetchedPageCount: routes.length, failedPageCount: 0, skippedPageCount: 0 },
        pages: [],
      },
      rawArtifactAssembly: {
        kind: 'multi_page_raw_artifact_assembly_manifest_v1',
        enabled: true,
        seedUrl: 'https://www.viroidoc.eu/',
        normalizedSeedUrl: 'https://www.viroidoc.eu/',
        assembledPageCount: routes.length,
        excludedPageCount: 0,
        failedPageCount: 0,
        routeMap: routes.map(([routePath, rawFilePath]) => ({
          routePath,
          sourceUrl: `https://www.viroidoc.eu${routePath === '/' ? '/' : routePath}`,
          finalUrl: `https://www.viroidoc.eu${routePath === '/' ? '/' : routePath}`,
          rawFilePath,
          bodySha256: `sha-${routePath}`,
          byteSize: 100,
          status: 'assembled' as const,
        })),
        htmlPathMap: Object.fromEntries(routes),
        excludedPages: [],
        failedPages: [],
        manifestPath: null,
        diagnostics: [],
        generatedAt: '2026-06-08T00:00:00.000Z',
      },
    },
  } as unknown as RuntimeImportProvenanceSummary
}

function countOccurrences(value: string, marker: string): number {
  return value.split(marker).length - 1
}

const transformedDiagnosticContentMarkers = [
  'Recovered Section',
  'raw-block:',
  'Recovered from:',
  '[missing:',
  'Missing media for final_component_',
  'Generic component fallback',
  'fallbackReason',
  'render.generic',
  'CAPTURE_DRIVEN_',
  'dominant_candidate=',
  '/tmp/gnr8/validation/',
] as const

function assertNoTransformedDiagnosticContent(html: string): void {
  for (const marker of transformedDiagnosticContentMarkers) {
    assert.equal(html.includes(marker), false, `preview html must not contain ${marker}`)
  }
}

test('preview path resolver falls back to canonical root path when requested path is missing', () => {
  const resolved = __unifiedRenderPreviewTestUtils.resolveHtmlForPath({
    htmlByPath: {
      '/': '<html>home</html>',
    },
    requestedPath: '/missing',
    diagnostics: {
      siteId: 'site-1',
      runtimeSiteId: 'site-1',
      runtimeSiteVersionId: 'sv-1',
      matchedPageId: null,
      unresolvedPathsCount: 15,
    },
  })

  assert.equal(resolved.resolvedPath, '/')
  assert.equal(resolved.html, '<html>home</html>')
})

test('transformed preview diagnostic detector blocks visible recovery text but ignores operator metadata', () => {
  const visible = __unifiedRenderPreviewTestUtils.detectTransformedPreviewVisibleDiagnosticContent(
    '<html><head><meta name="x" content="Recovered Section raw-block:/tmp/gnr8/validation/"></head><body><main><h1>Recovered Section 1</h1><p>raw-block:html&gt;body CAPTURE_DRIVEN_CTA_LIFT_APPLIED dominant_candidate=cta:0.61 runner_up=hero:0.39</p></main></body></html>',
  )
  assert.equal(visible.blocked, true)
  assert.equal(visible.matchedPatterns.includes('Recovered Section'), true)
  assert.equal(visible.matchedPatterns.includes('raw-block:'), true)
  assert.equal(visible.matchedPatterns.includes('CAPTURE_DRIVEN_'), true)
  assert.equal(visible.matchedPatterns.includes('dominant_candidate='), true)

  const metadataOnly = __unifiedRenderPreviewTestUtils.detectTransformedPreviewVisibleDiagnosticContent(
    '<html><head><meta name="x" content="Recovered Section raw-block:/tmp/gnr8/validation/"></head><body><main><h1>Actual Site</h1><section hidden>Recovered Section raw-block:</section><script>console.log("dominant_candidate=")</script></main></body></html>',
  )
  assert.equal(metadataOnly.blocked, false)
})

test('preview path resolver throws PREVIEW_PATH_NOT_FOUND only when neither requested nor root path exist', () => {
  assert.throws(
    () =>
      __unifiedRenderPreviewTestUtils.resolveHtmlForPath({
        htmlByPath: {
          '/about': '<html>about</html>',
        },
        requestedPath: '/',
        diagnostics: {
          siteId: 'site-2',
          runtimeSiteId: 'site-2',
          runtimeSiteVersionId: 'sv-2',
          matchedPageId: null,
          unresolvedPathsCount: 3,
        },
      }),
    (error: unknown) => error instanceof SiteVersionPreviewUnavailableError && error.code === 'PREVIEW_PATH_NOT_FOUND',
  )
})

test('preview resolver selects semantic fallback when rendered capture is unavailable in raw_html_only mode', () => {
  const previewTruth = __unifiedRenderPreviewTestUtils.resolveRenderedCapturePreviewTruth({
    captureMode: 'raw_html_only',
    renderedCaptureStatus: 'failed',
    screenshotCount: 0,
    renderedCapture: {
      status: 'failed',
      nodeCount: 0,
      domLength: 0,
    },
  })

  const resolved = __unifiedRenderPreviewTestUtils.resolveSemanticFallbackPreview({
    siteVersion: {
      id: 'sv-semantic',
      siteId: 'site-semantic',
      rendererCompatibilityVersion: 'gnr8-renderer-v1',
      importProvenanceSummary: {
        captureMode: 'raw_html_only',
        semanticImport: fixtureSemanticImport(),
      },
    } as any,
    requestedPath: '/',
    previewTruth,
  })

  assert.equal(Boolean(resolved), true)
  assert.equal(resolved?.previewMode, 'semantic_fallback_preview')
  assert.equal(resolved?.previewRuntimeSummary.previewDiagnostics.includes('SEMANTIC_PREVIEW_SELECTED'), true)
})

test('preview resolver no longer raises PREVIEW_PATH_NOT_FOUND for raw_html_only semantic homepage fallback', () => {
  const previewTruth = __unifiedRenderPreviewTestUtils.resolveRenderedCapturePreviewTruth({
    captureMode: 'raw_html_only',
    renderedCaptureStatus: 'failed',
    screenshotCount: 0,
    renderedCapture: {
      status: 'failed',
      nodeCount: 0,
      domLength: 0,
    },
  })

  assert.throws(
    () =>
      __unifiedRenderPreviewTestUtils.resolveHtmlForPath({
        htmlByPath: {
          '/about': '<html>about</html>',
        },
        requestedPath: '/',
      }),
    (error: unknown) => error instanceof SiteVersionPreviewUnavailableError && error.code === 'PREVIEW_PATH_NOT_FOUND',
  )

  const semantic = __unifiedRenderPreviewTestUtils.resolveSemanticFallbackPreview({
    siteVersion: {
      id: 'sv-semantic-2',
      siteId: 'site-semantic',
      rendererCompatibilityVersion: 'gnr8-renderer-v1',
      importProvenanceSummary: {
        captureMode: 'raw_html_only',
        semanticImport: fixtureSemanticImport(),
      },
    } as any,
    requestedPath: '/',
    previewTruth,
  })

  assert.equal(semantic?.path, '/')
  assert.equal(semantic?.html.includes('Semantic Hero'), true)
})

test('raw template preview rewrites local asset references to preview-assets route', () => {
  const html = [
    '<!doctype html>',
    '<html>',
    '<head><link rel="stylesheet" href="./assets/site.css"></head>',
    '<body><img src="/uploads/logo.png" srcset="/uploads/logo.png 1x, /uploads/logo@2x.png 2x"><script src="scripts/app.js"></script></body>',
    '</html>',
  ].join('')
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-raw',
    siteVersionId: 'sv-raw',
    entryHtmlPath: 'nested/site/index.html',
  })
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/nested/site/assets/site.css'),
    true,
  )
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/uploads/logo.png'), true)
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/uploads/logo@2x.png 2x'), true)
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/nested/site/scripts/app.js'),
    true,
  )
})

test('raw template preview prefers persisted fileMap match for relative stylesheet refs', () => {
  const html = '<!doctype html><html><head><link rel="stylesheet" href="assets/user-style.css"></head><body></body></html>'
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-raw',
    siteVersionId: 'sv-raw',
    entryHtmlPath: 'nested/site/index.html',
    fileMapPaths: new Set(['assets/user-style.css']),
  })
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/assets/user-style.css'),
    true,
  )
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/nested/site/assets/user-style.css'),
    false,
  )
})

test('raw template preview rewrites persisted local stylesheet links to preview-assets so native stylesheet detection stays local', () => {
  const html = '<!doctype html><html><head><link type="text/css" href="/assets/stylesheet/site.css"><link href="/assets/stylesheet/user-style.css" rel="stylesheet"></head><body><a href="#" data-req="scrollTop" class="scrollIcon hidden bottom_right">Top</a></body></html>'
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-raw',
    siteVersionId: 'sv-raw',
    entryHtmlPath: 'index.html',
    fileMapPaths: new Set(['assets/stylesheet/site.css', 'assets/stylesheet/user-style.css']),
  })
  const stylesheetHrefs = [...rewritten.matchAll(/<link[^>]*href="([^"]+)"/g)].map((match) => match[1] ?? '')
  const localStylesheetHrefs = stylesheetHrefs.filter(
    (href) =>
      href.startsWith('/api/gnr8/runtime/preview-assets/') ||
      href.startsWith('/assets/') ||
      href.startsWith('assets/'),
  )
  assert.equal(localStylesheetHrefs.length > 0, true)
  assert.equal(
    localStylesheetHrefs.every((href) =>
      href.startsWith('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/assets/stylesheet/'),
    ),
    true,
  )
})

test('raw template preview rewrites root-relative uploads URLs in inline style and style blocks', () => {
  const logs: Array<{ code: string; payload: Record<string, unknown> }> = []
  const originalInfo = console.info
  console.info = ((message?: unknown, payload?: unknown) => {
    const code = String(message ?? '')
    if (code.includes('PREVIEW_CSS_ASSET_REWRITE_APPLIED') || code.includes('PREVIEW_CSS_ASSET_REWRITE_SKIPPED')) {
      logs.push({
        code,
        payload: (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) ?? {},
      })
    }
  }) as typeof console.info
  try {
  const html = [
    '<!doctype html>',
    '<html>',
    '<head><style>.hero{background-image:url("/uploads/QBSeVQys/overlay.png");}</style></head>',
    "<body><section style=\"background-image: url('/uploads/KcGdxACT/hero-01.jpg')\"></section></body>",
    '</html>',
  ].join('')
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-maver',
    siteVersionId: 'sv-maver',
    entryHtmlPath: 'index.html',
    fileMapPaths: new Set(['uploads/QBSeVQys/overlay.png', 'uploads/KcGdxACT/hero-01.jpg']),
  })
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-maver/sv-maver/uploads/QBSeVQys/overlay.png'),
    true,
  )
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-maver/sv-maver/uploads/KcGdxACT/hero-01.jpg'),
    true,
  )
  } finally {
    console.info = originalInfo
  }
  assert.equal(logs.some((entry) => entry.code.includes('PREVIEW_CSS_ASSET_REWRITE_APPLIED')), true)
  assert.equal(logs.some((entry) => entry.code.includes('PREVIEW_CSS_ASSET_REWRITE_SKIPPED')), false)
})

test('raw template preview does not rewrite missing file-map uploads CSS URL and emits skipped diagnostic', () => {
  const logs: Array<{ code: string; payload: Record<string, unknown> }> = []
  const originalInfo = console.info
  console.info = ((message?: unknown, payload?: unknown) => {
    if (String(message ?? '').includes('PREVIEW_CSS_ASSET_REWRITE_SKIPPED')) {
      logs.push({
        code: String(message),
        payload: (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) ?? {},
      })
    }
  }) as typeof console.info
  try {
    const html = '<!doctype html><html><head><style>.hero{background-image:url(/uploads/missing.png)}</style></head><body></body></html>'
    const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
      html,
      siteId: 'site-missing',
      siteVersionId: 'sv-missing',
      entryHtmlPath: 'index.html',
      fileMapPaths: new Set(['uploads/exists.png']),
    })
    assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-missing/sv-missing/uploads/missing.png'), false)
    assert.equal(rewritten.includes('url(/uploads/missing.png)'), true)
  } finally {
    console.info = originalInfo
  }
  assert.equal(logs.length > 0, true)
  assert.equal(logs.some((entry) => entry.payload.reasonCode === 'file_map_path_not_found'), true)
  assert.equal(logs.some((entry) => entry.payload.sourceType === 'style_block'), true)
})

test('raw template preview rewrites Maver-like dual uploads hero background references', () => {
  const logs: Array<{ code: string; payload: Record<string, unknown> }> = []
  const originalInfo = console.info
  console.info = ((message?: unknown, payload?: unknown) => {
    if (String(message ?? '').includes('PREVIEW_CSS_ASSET_REWRITE_APPLIED')) {
      logs.push({
        code: String(message),
        payload: (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) ?? {},
      })
    }
  }) as typeof console.info
  try {
  const html = [
    '<!doctype html>',
    '<html>',
    '<head><style>.hero::before{background:url("/uploads/QBSeVQys/overlay.png#v1") center/cover no-repeat;}</style></head>',
    '<body><section class="hero" style="background-image:url(/uploads/KcGdxACT/hero-01.jpg?cache=1)"></section></body>',
    '</html>',
  ].join('')
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-maver-2',
    siteVersionId: 'sv-maver-2',
    entryHtmlPath: 'index.html',
    fileMapPaths: new Set(['uploads/QBSeVQys/overlay.png', 'uploads/KcGdxACT/hero-01.jpg']),
  })
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-maver-2/sv-maver-2/uploads/QBSeVQys/overlay.png#v1'),
    true,
  )
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-maver-2/sv-maver-2/uploads/KcGdxACT/hero-01.jpg?cache=1'),
    true,
  )
  } finally {
    console.info = originalInfo
  }
  assert.equal(logs.length >= 2, true)
})

test('raw template preview does not emit duplicated preview-assets prefix when source HTML is already rewritten', () => {
  const html = '<img src="/api/gnr8/runtime/preview-assets/site-maver/sv-maver/uploads/7xhKQCOl/767x0_2560x0/IMG.jpg">'
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-maver',
    siteVersionId: 'sv-maver',
    entryHtmlPath: 'index.html',
  })
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-maver/sv-maver/api/gnr8/runtime/preview-assets/'), false)
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-maver/sv-maver/uploads/7xhKQCOl/767x0_2560x0/IMG.jpg'), true)
})

test('raw template asset rewrite preserves anchor hrefs for navigation rewrite', () => {
  const html = '<html><head><link rel="stylesheet" href="/assets/site.css"></head><body><a href="/about">About</a><img src="/uploads/logo.png"></body></html>'
  const rewritten = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferences({
    html,
    siteId: 'site-nav',
    siteVersionId: 'sv-nav',
    entryHtmlPath: 'index.html',
    fileMapPaths: new Set(['assets/site.css', 'uploads/logo.png']),
  })
  assert.equal(rewritten.includes('<a href="/about">About</a>'), true)
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-nav/sv-nav/assets/site.css'), true)
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-nav/sv-nav/uploads/logo.png'), true)
})

test('raw template multipage link rewrite normalizes routes and emits deterministic counts', () => {
  const logs: Array<{ code: string; payload: Record<string, unknown> }> = []
  const originalInfo = console.info
  console.info = ((message?: unknown, payload?: unknown) => {
    const code = String(message ?? '')
    if (code.includes('MULTIPAGE_LINK_')) {
      logs.push({
        code,
        payload: (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) ?? {},
      })
    }
  }) as typeof console.info
  try {
    const html = [
      '<html><body>',
      '<a class="nav" href="/about">About</a>',
      '<a href="https://example.com/about/">Absolute</a>',
      '<a href="about/index.html" aria-label="About relative">Relative</a>',
      '<a href="/services/item">Nested</a>',
      '<a href="/">Home</a>',
      '<a href="https://outside.test/about">External</a>',
      '<a href="mailto:hello@example.com">Mail</a>',
      '<a href="tel:+15551212">Tel</a>',
      '<a href="sms:+15551212">Sms</a>',
      '<a href="#section">Hash</a>',
      '<a href="javascript:void(0)">JS</a>',
      '<a href="/files/menu.pdf">PDF</a>',
      '<a href="/download" download>Download</a>',
      '<a href="/missing">Missing</a>',
      '<a href="/about?tab=team">Query</a>',
      '</body></html>',
    ].join('')
    const result = __unifiedRenderPreviewTestUtils.rewriteRawTemplateMultiPageLinks({
      html,
      siteId: 'site-nav',
      siteVersionId: 'sv-nav',
      importProvenanceSummary: fixtureMultiPageAssemblyProvenance(),
      routeMapServingEnabled: true,
      routeMapResolution: {
        outcome: 'selected',
        diagnosticCode: 'MULTIPAGE_ROUTE_MAP_ROOT_SELECTED',
        siteVersionId: 'sv-nav',
        requestedPath: '/',
        routePath: '/',
        rawFilePath: 'index.html',
        sourceUrl: null,
        finalUrl: null,
      },
    })

    assert.equal(result.counts.rewritten, 5)
    assert.equal(result.counts.skippedExternal, 1)
    assert.equal(result.counts.skippedUnsupported, 5)
    assert.equal(result.counts.skippedHashOnly, 1)
    assert.equal(result.counts.skippedAsset, 2)
    assert.equal(result.counts.skippedRouteMissing, 1)
    assert.deepEqual(result.missingRouteSamples, ['/missing'])
    assert.equal(result.html.includes('<a class="nav" href="/api/gnr8/runtime/versions/sv-nav/preview?mode=raw_template_preview&amp;path=%2Fabout" data-gnr8-multipage-link="rewritten" data-gnr8-original-href="/about">About</a>'), true)
    assert.equal(result.html.includes('href="/api/gnr8/runtime/versions/sv-nav/preview?mode=raw_template_preview&amp;path=%2Fservices%2Fitem"'), true)
    assert.equal(result.html.includes('href="/api/gnr8/runtime/versions/sv-nav/preview?mode=raw_template_preview&amp;path=%2F"'), true)
    assert.equal(result.html.includes('<a href="https://outside.test/about">External</a>'), true)
    assert.equal(result.html.includes('<a href="/missing">Missing</a>'), true)
    assert.equal(result.html.includes('aria-label="About relative"'), true)
    assert.equal(result.html.includes('>Relative</a>'), true)
    assert.deepEqual(result.diagnostics, [
      'MULTIPAGE_LINK_REWRITE_COMPLETED',
      'MULTIPAGE_LINK_REWRITE_STARTED',
      'MULTIPAGE_LINK_REWRITTEN',
      'MULTIPAGE_LINK_SKIPPED_ASSET',
      'MULTIPAGE_LINK_SKIPPED_EXTERNAL',
      'MULTIPAGE_LINK_SKIPPED_HASH_ONLY',
      'MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED',
      'MULTIPAGE_LINK_SKIPPED_UNSUPPORTED_SCHEME',
    ])
  } finally {
    console.info = originalInfo
  }
  const completed = logs.find((entry) => entry.code.includes('MULTIPAGE_LINK_REWRITE_COMPLETED'))
  assert.equal(completed?.payload.rewritten, 5)
  assert.equal(completed?.payload.skippedRouteMissing, 1)
})

test('raw template multipage link rewrite remains disabled outside controlled route-map preview', () => {
  const html = '<html><body><a href="/about">About</a></body></html>'
  const result = __unifiedRenderPreviewTestUtils.rewriteRawTemplateMultiPageLinks({
    html,
    siteId: 'site-nav',
    siteVersionId: 'sv-nav',
    importProvenanceSummary: fixtureMultiPageAssemblyProvenance(),
    routeMapServingEnabled: false,
    routeMapResolution: {
      outcome: 'disabled',
      diagnosticCode: 'MULTIPAGE_ROUTE_MAP_DISABLED',
      siteVersionId: 'sv-nav',
      requestedPath: '/about',
      routePath: '/about',
      reasonCode: 'explicit_option_disabled',
    },
  })
  assert.equal(result.html, html)
  assert.deepEqual(result.diagnostics, [])
  assert.equal(result.counts.rewritten, 0)
})

test('raw template preview route-map serving resolves /about to assembled child HTML and rewrites child assets', async () => {
  const requestedAssets: string[] = []
  let listContentSlotsCount = 0
  const overrideStatusLookups: string[] = []
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-multi',
        siteId: 'site-multi',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: fixtureMultiPageAssemblyProvenance(),
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        artifactType: 'raw_imported_site',
        siteId: 'site-multi',
        siteVersionId: 'sv-multi',
        entryHtmlPath: 'index.html',
        assetBasePath: '/',
        fileMap: {
          'index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-home' },
          'pages/about/index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-about' },
          'pages/about/assets/about.css': { mediaType: 'text/css', sizeBytes: 30, sha256: 'sha-css' },
        },
        metadata: {
          sourceUrl: 'https://example.com',
          finalUrl: 'https://example.com/',
          htmlByteLength: 30,
          multiPage: {
            enabled: true,
            pageCount: 3,
            routeMapRef: 'importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly.routeMap',
          },
          diagnostics: { codes: [] },
          assetSummary: { persistedAssetCount: 3, externalFallbackAssetCount: 0 },
        },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      requestedAssets.push(input.filePath)
      if (input.filePath === 'pages/about/index.html') {
        return {
          bytes: Buffer.from(
            '<!doctype html><html><head><link rel="stylesheet" href="./assets/about.css"></head><body><nav><a href="/">Home</a><a href="/services/item">Service</a><a href="/missing">Missing</a><a href="https://outside.test">Outside</a></nav><h1>About child</h1></body></html>',
          ),
          sizeBytes: 224,
          mediaType: 'text/html',
        } as any
      }
      if (input.filePath === 'index.html') {
        return { bytes: Buffer.from('<html><body><h1>Home</h1></body></html>'), sizeBytes: 39, mediaType: 'text/html' } as any
      }
      return null
    },
    listContentSlots: async () => {
      listContentSlotsCount += 1
      return []
    },
    listContentOverrides: async (input) => {
      overrideStatusLookups.push(input.status)
      return []
    },
  })

  try {
    const preview = await renderSiteVersionPreview({
      siteVersionId: 'sv-multi',
      path: '/about/',
      mode: 'raw_template_preview',
      requestCorrelationKey: 'req-route-about',
    })

    assert.deepEqual(requestedAssets, ['pages/about/index.html', 'pages/about/assets/about.css'])
    assert.equal(listContentSlotsCount, 0)
    assert.deepEqual(overrideStatusLookups, [])
    assert.equal(preview.path, '/about')
    assert.match(preview.html, /About child/)
    assert.doesNotMatch(preview.html, /<h1>Home<\/h1>/)
    assert.equal(
      preview.html.includes('/api/gnr8/runtime/preview-assets/site-multi/sv-multi/pages/about/assets/about.css'),
      true,
    )
    assert.equal(
      preview.html.includes('/api/gnr8/runtime/versions/sv-multi/preview?mode=raw_template_preview&amp;path=%2Fservices%2Fitem'),
      true,
    )
    assert.equal(
      preview.html.includes('/api/gnr8/runtime/versions/sv-multi/preview?mode=raw_template_preview&amp;path=%2F'),
      true,
    )
    assert.equal(preview.html.includes('<a href="/missing">Missing</a>'), true)
    assert.equal(preview.html.includes('<a href="https://outside.test">Outside</a>'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_LINK_REWRITTEN'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_LINK_SKIPPED_ROUTE_NOT_IMPORTED'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_LINK_SKIPPED_EXTERNAL'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_ROUTE_MAP_SELECTED'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_PREVIEW_VALIDATION_READY_WITH_WARNINGS'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('RAW_TEMPLATE_PREVIEW_RENDERED'), true)
    assert.equal(preview.multiPagePreviewValidation?.status, 'ready_with_warnings')
    assert.equal(preview.multiPagePreviewValidation?.summary.validPreviewRoutes, 2)
    assert.equal(preview.multiPagePreviewValidation?.summary.missingPreviewRoutes, 1)
    assert.equal(preview.multiPagePreviewValidation?.summary.rewrittenLinks, 2)
    assert.deepEqual(
      preview.multiPagePreviewValidation?.links.find((link) => link.status === 'skipped_route_missing')?.sampleMissingRoutes,
      ['/missing'],
    )
  } finally {
    restore()
  }
})

test('raw template preview serves one Viroidoc-like assembled page per requested route', async () => {
  const requestedAssets: string[] = []
  const provenance = fixtureViroidocLikeMultiPageAssemblyProvenance()
  const htmlByFilePath: Record<string, string> = {
    'assembled/all-pages.html': [
      '<html><body>',
      '<main>ROOT_MARKER ROOT_MARKER ROOT_MARKER</main>',
      '<main>PROJECT_MARKER PEOPLE_MARKER BLOG_MARKER</main>',
      '</body></html>',
    ].join(''),
    'pages/root/index.html': [
      '<!doctype html><html><body>',
      '<nav><a href="/project">Project</a><a href="/people">People</a><a href="/news">News</a></nav>',
      '<main>ROOT_MARKER</main>',
      '</body></html>',
    ].join(''),
    'pages/project/index.html': '<!doctype html><html><body><main>PROJECT_MARKER</main></body></html>',
    'pages/people/index.html': '<!doctype html><html><body><main>PEOPLE_MARKER</main></body></html>',
    'pages/news/index.html': '<!doctype html><html><body><main>NEWS_MARKER</main></body></html>',
  }
  const fileMap = Object.fromEntries(
    Object.entries(htmlByFilePath).map(([filePath, html]) => [
      filePath,
      { mediaType: 'text/html', sizeBytes: html.length, sha256: `sha-${filePath}` },
    ]),
  )
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-viroidoc',
        siteId: 'site-viroidoc',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: provenance,
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        artifactType: 'raw_imported_site',
        siteId: 'site-viroidoc',
        siteVersionId: 'sv-viroidoc',
        entryHtmlPath: 'assembled/all-pages.html',
        assetBasePath: '/',
        fileMap,
        metadata: {
          assetSummary: { persistedAssetCount: Object.keys(fileMap).length, externalFallbackAssetCount: 0 },
        },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      requestedAssets.push(input.filePath)
      const html = htmlByFilePath[input.filePath]
      return html ? ({ bytes: Buffer.from(html), sizeBytes: html.length, mediaType: 'text/html' } as any) : null
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  })

  try {
    const expectations = [
      ['/', 'ROOT_MARKER', ['PROJECT_MARKER', 'PEOPLE_MARKER', 'NEWS_MARKER']],
      ['/project', 'PROJECT_MARKER', ['ROOT_MARKER', 'PEOPLE_MARKER', 'NEWS_MARKER']],
      ['/people', 'PEOPLE_MARKER', ['ROOT_MARKER', 'PROJECT_MARKER', 'NEWS_MARKER']],
      ['/news', 'NEWS_MARKER', ['ROOT_MARKER', 'PROJECT_MARKER', 'PEOPLE_MARKER']],
    ] as const

    for (const [routePath, expectedMarker, absentMarkers] of expectations) {
      const preview = await renderSiteVersionPreview({
        siteVersionId: 'sv-viroidoc',
        path: routePath,
        mode: 'raw_template_preview',
        requestCorrelationKey: `req-viroidoc-${routePath}`,
      })

      assert.equal(preview.path, routePath)
      assert.equal(preview.html.includes(expectedMarker), true)
      for (const absentMarker of absentMarkers) assert.equal(preview.html.includes(absentMarker), false)
      assert.equal(preview.html.includes('assembled/all-pages.html'), false)
      assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_PREVIEW_PAGE_ISOLATED'), true)
      assert.equal(preview.multiPagePreviewValidation?.summary.validPreviewRoutes, 4)
      assert.equal(preview.multiPagePreviewValidation?.summary.missingPreviewRoutes, 0)
      assert.equal(preview.rawTemplatePreviewEvidence?.selectedRoutePath, routePath)
      assert.equal(preview.rawTemplatePreviewEvidence?.disabledScriptCount, 0)
      assert.equal(preview.rawTemplatePreviewEvidence?.selectedRawFilePath, routePath === '/' ? 'pages/root/index.html' : `pages${routePath}/index.html`)
      if (routePath === '/') {
        assert.equal(countOccurrences(preview.html, 'ROOT_MARKER'), 1)
        assert.equal(preview.rawTemplatePreviewEvidence?.selectedRoutePath, '/')
        assert.equal(preview.rawTemplatePreviewEvidence?.selectedRawFilePath, 'pages/root/index.html')
        assert.equal(preview.rawTemplatePreviewEvidence?.htmlByteLengthBeforeRewrite, Buffer.byteLength(htmlByFilePath['pages/root/index.html']))
        assert.equal((preview.rawTemplatePreviewEvidence?.htmlByteLengthAfterRewrite ?? 0) > 0, true)
        assert.equal((preview.rawTemplatePreviewEvidence?.rewrittenLinkCount ?? 0) > 0, true)
        assert.equal(
          preview.html.includes('/api/gnr8/runtime/versions/sv-viroidoc/preview?mode=raw_template_preview&amp;path=%2Fproject'),
          true,
        )
        assert.equal(
          preview.html.includes('/api/gnr8/runtime/versions/sv-viroidoc/preview?mode=raw_template_preview&amp;path=%2Fpeople'),
          true,
        )
        assert.equal(
          preview.html.includes('/api/gnr8/runtime/versions/sv-viroidoc/preview?mode=raw_template_preview&amp;path=%2Fnews'),
          true,
        )
        assert.equal(preview.html.includes('data-gnr8-multipage-link="rewritten"'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_LINK_REWRITTEN'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_ROUTE_MAP_ROOT_SELECTED'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_ROOT_ROUTE_SELECTED'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_ROUTE_MAP_ENTRY_SELECTED'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_RAW_FILE_SELECTED'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_HTML_BYTES_READ'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_LINK_REWRITE_STARTED'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_LINK_REWRITE_COMPLETED'), true)
        assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('PREVIEW_LINKS_REWRITTEN_COUNT'), true)
      }
    }

    assert.deepEqual(requestedAssets, [
      'pages/root/index.html',
      'pages/project/index.html',
      'pages/people/index.html',
      'pages/news/index.html',
    ])
  } finally {
    restore()
  }
})

test('raw template preview neutralizes Viroidoc-like scripts and keeps repeated navigation bounded', async () => {
  const provenance = fixtureViroidocLikeMultiPageAssemblyProvenance()
  const rawHtmlByFilePath: Record<string, string> = {
    'pages/root/index.html': [
      '<!doctype html><html><head><link rel="stylesheet" href="assets/site.css"></head><body>',
      '<nav><a href="/news">News</a></nav>',
      '<main><section id="home-intro">HOME_INTRO</section></main>',
      '<script src="/assets/home.js"></script>',
      '</body></html>',
    ].join(''),
    'pages/project/index.html': '<!doctype html><html><body><main>Project</main></body></html>',
    'pages/people/index.html': '<!doctype html><html><body><main>People</main></body></html>',
    'pages/news/index.html': [
      '<!doctype html><html><head><link rel="stylesheet" href="assets/site.css"></head><body>',
      '<nav><a href="/">Home</a></nav>',
      '<main><section id="news-listing">NEWS_LISTING</section></main>',
      '<script>document.body.insertAdjacentHTML("afterbegin","HOME_INTRO")</script>',
      '<script type="application/ld+json">{"name":"News"}</script>',
      '</body></html>',
    ].join(''),
  }
  const fileMap = Object.fromEntries(
    Object.entries(rawHtmlByFilePath).map(([filePath, html]) => [
      filePath,
      { mediaType: 'text/html', sizeBytes: html.length, sha256: `sha-${filePath}` },
    ]),
  )
  Object.assign(fileMap, {
    'assets/site.css': { mediaType: 'text/css', sizeBytes: 10, sha256: 'sha-css' },
  })

  let acquireCount = 0
  let releaseCount = 0
  const fakeClient = { release: () => { releaseCount += 1 } } as any
  const calls = {
    getSiteVersion: 0,
    getRawImportedSiteArtifact: 0,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 0,
    listContentSlots: 0,
    listContentOverrides: 0,
  }
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    requestScopedDbClientEnabled: true,
    acquireRuntimeDbClient: async () => {
      acquireCount += 1
      return fakeClient
    },
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () => {
      calls.getSiteVersion += 1
      return {
        id: 'sv-viroidoc-raw-stable',
        siteId: 'site-viroidoc-raw-stable',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: provenance,
      } as any
    },
    getRawImportedSiteArtifact: async () => {
      calls.getRawImportedSiteArtifact += 1
      return {
        artifactType: 'raw_imported_site',
        siteId: 'site-viroidoc-raw-stable',
        siteVersionId: 'sv-viroidoc-raw-stable',
        entryHtmlPath: 'pages/root/index.html',
        assetBasePath: '/',
        fileMap,
        metadata: { assetSummary: { persistedAssetCount: Object.keys(fileMap).length, externalFallbackAssetCount: 0 } },
      } as any
    },
    getRawTemplateSiteArtifact: async () => {
      calls.getRawTemplateSiteArtifact += 1
      return null
    },
    getRawTemplateSiteAsset: async (input) => {
      calls.getRawTemplateSiteAsset += 1
      const html = rawHtmlByFilePath[input.filePath]
      return html ? ({ bytes: Buffer.from(html), sizeBytes: html.length, mediaType: 'text/html' } as any) : null
    },
    listContentSlots: async () => {
      calls.listContentSlots += 1
      return []
    },
    listContentOverrides: async () => {
      calls.listContentOverrides += 1
      return []
    },
  })

  try {
    const sequence = [
      ['/news', 'NEWS_LISTING', '<section id="home-intro">HOME_INTRO</section>', 2],
      ['/', 'HOME_INTRO', 'NEWS_LISTING', 1],
      ['/news', 'NEWS_LISTING', '<section id="home-intro">HOME_INTRO</section>', 2],
      ['/', 'HOME_INTRO', 'NEWS_LISTING', 1],
    ] as const
    const htmlByRoute: Record<string, string[]> = { '/': [], '/news': [] }

    for (const [routePath, expectedMarker, absentMarker, disabledScriptCount] of sequence) {
      const preview = await renderSiteVersionPreview({
        siteVersionId: 'sv-viroidoc-raw-stable',
        path: routePath,
        mode: 'raw_template_preview',
        requestCorrelationKey: `req-viroidoc-raw-stable-${routePath}-${htmlByRoute[routePath].length}`,
      })
      htmlByRoute[routePath].push(preview.html)

      assert.equal(preview.source, 'raw_template_site')
      assert.equal(preview.path, routePath)
      assert.equal(preview.html.includes(expectedMarker), true)
      assert.equal(preview.html.includes(absentMarker), false)
      assert.equal(countOccurrences(preview.html, '<section id="home-intro">HOME_INTRO</section>'), routePath === '/' ? 1 : 0)
      assert.equal(countOccurrences(preview.html, '<section id="news-listing">NEWS_LISTING</section>'), routePath === '/news' ? 1 : 0)
      assert.equal(/<script\b(?![^>]*\btype=["']application\/gnr8-disabled-script["'])/i.test(preview.html), false)
      assert.equal(preview.rawTemplatePreviewEvidence?.disabledScriptCount, disabledScriptCount)
      assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('RAW_PREVIEW_SCRIPTS_DISABLED'), true)
      assert.equal(preview.rawTemplatePreviewEvidence?.dbClientAcquisitionCount, 1)
      assert.equal((preview.rawTemplatePreviewEvidence?.dbReadCount ?? 99) <= 4, true)
    }

    assert.equal(htmlByRoute['/news'][0], htmlByRoute['/news'][1])
    assert.equal(htmlByRoute['/'][0], htmlByRoute['/'][1])
  } finally {
    restore()
  }

  assert.equal(acquireCount, 4)
  assert.equal(releaseCount, 4)
  assert.deepEqual(calls, {
    getSiteVersion: 4,
    getRawImportedSiteArtifact: 4,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 8,
    listContentSlots: 0,
    listContentOverrides: 0,
  })
})

test('raw template preview resolves root and child CSS/font URLs through the same file-map-aware base logic', () => {
  const fileMapPaths = new Set(['assets/site.css', 'fonts/heading.woff2'])
  const root = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferencesWithCounts({
    html: '<!doctype html><html><head><link rel="stylesheet" href="assets/site.css"><style>@font-face{font-family:Heading;src:url("fonts/heading.woff2")}</style></head><body><h1>Home</h1></body></html>',
    siteId: 'site-fonts',
    siteVersionId: 'sv-fonts',
    entryHtmlPath: 'index.html',
    fileMapPaths,
  })
  const child = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferencesWithCounts({
    html: '<!doctype html><html><head><link rel="stylesheet" href="assets/site.css"><style>@font-face{font-family:Heading;src:url("fonts/heading.woff2")}</style></head><body><h1>News</h1></body></html>',
    siteId: 'site-fonts',
    siteVersionId: 'sv-fonts',
    entryHtmlPath: 'pages/news/index.html',
    fileMapPaths,
  })

  const stylesheet = '/api/gnr8/runtime/preview-assets/site-fonts/sv-fonts/assets/site.css'
  const font = '/api/gnr8/runtime/preview-assets/site-fonts/sv-fonts/fonts/heading.woff2'
  assert.equal(root.html.includes(stylesheet), true)
  assert.equal(child.html.includes(stylesheet), true)
  assert.equal(root.html.includes(font), true)
  assert.equal(child.html.includes(font), true)
  assert.equal(root.html.includes('/pages/news/assets/site.css'), false)
  assert.equal(child.html.includes('/pages/news/assets/site.css'), false)
  assert.equal(root.rewrittenAssetCount, 2)
  assert.equal(child.rewrittenAssetCount, 2)
})

test('raw template asset evidence covers CSS URL rewrite cases and Dongle font references', () => {
  const result = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferencesWithCounts({
    html: [
      '<!doctype html><html><head>',
      '<link rel="preconnect" href="https://fonts.gstatic.com">',
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dongle:wght@400;700&display=swap">',
      '<style>',
      '@import url("https://fonts.googleapis.com/css2?family=Dongle&display=swap");',
      'h1,.button{font-family:"Dongle",sans-serif}',
      '.root{background:url(/assets/root.svg)}',
      '.nested{background:url(../img/nested.jpg?ver=1)}',
      '.remote-persisted{background:url(https://www.viroidoc.eu/assets/remote.svg?cache=1)}',
      '.remote-external{background:url(https://cdn.example.test/keep.png)}',
      '.data{background:url(data:image/png;base64,abc)}',
      '@font-face{font-family:"Dongle";src:url(/fonts/dongle.woff2)}',
      '</style></head>',
      '<body><picture><source srcset="/assets/root.svg 1x"><img src="/missing/hero.jpg" data-src="/assets/lazy.webp"></picture></body></html>',
    ].join(''),
    siteId: 'site-css-unit',
    siteVersionId: 'sv-css-unit',
    entryHtmlPath: 'pages/news/index.html',
    fileMapPaths: new Set([
      'assets/root.svg',
      'assets/remote.svg',
      'assets/lazy.webp',
      'pages/img/nested.jpg',
      'fonts/dongle.woff2',
    ]),
  })

  const evidence = result.rawPreviewAssetRewriteEvidence
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-css-unit/sv-css-unit/assets/root.svg'), true)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-css-unit/sv-css-unit/pages/img/nested.jpg?ver=1'), true)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-css-unit/sv-css-unit/assets/remote.svg?cache=1'), true)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-css-unit/sv-css-unit/fonts/dongle.woff2'), true)
  assert.equal(result.html.includes('url(data:image/png;base64,abc)'), true)
  assert.equal(result.html.includes('https://cdn.example.test/keep.png'), true)
  assert.equal(evidence.cssUrlReferencesFound, 6)
  assert.equal(evidence.cssUrlReferencesRewritten, 4)
  assert.equal(evidence.cssUrlReferencesExternalPreserved, 2)
  assert.equal(evidence.imageReferencesMissing, 1)
  assert.equal(evidence.fontStylesheetsFound, 2)
  assert.equal(evidence.fontStylesheetsPreserved, 2)
  assert.equal(evidence.fontFilesFound, 1)
  assert.equal(evidence.fontFilesRewritten, 1)
  assert.equal(evidence.fontFamilyDongleDetected, true)
  assert.equal(evidence.rootHeadingDongleEvidence.some((entry) => entry.includes('heading selector')), true)
})

test('raw template asset rewriting tolerates malformed percent URLs in HTML attributes, srcset, links, and CSS', () => {
  const result = __unifiedRenderPreviewTestUtils.rewriteRawTemplateAssetReferencesWithCounts({
    html: [
      '<!doctype html><html><head>',
      '<link rel="stylesheet" href="assets/site%ZZ.css?cache=1">',
      '<style>',
      '.hero{background:url("/uploads/bg%sk.png?x=1#top")}',
      '.missing{background:url("../uploads/missing%.png")}',
      '</style>',
      '</head><body>',
      '<img src="/uploads/hero%C5.png" srcset="/uploads/thumb%2.png 1x, /uploads/thumb%C5.png?cache=1#hero 2x">',
      '</body></html>',
    ].join(''),
    siteId: 'site-malformed-uri',
    siteVersionId: 'sv-malformed-uri',
    entryHtmlPath: 'pages/root/index.html',
    fileMapPaths: new Set([
      'assets/site%ZZ.css',
      'uploads/bg%sk.png',
      'uploads/hero%C5.png',
      'uploads/thumb%C5.png',
    ]),
  })

  const evidence = result.rawPreviewAssetRewriteEvidence
  assert.equal(result.html.includes('URI malformed'), false)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-malformed-uri/sv-malformed-uri/assets/site%ZZ.css?cache=1'), true)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-malformed-uri/sv-malformed-uri/uploads/bg%sk.png?x=1#top'), true)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-malformed-uri/sv-malformed-uri/uploads/hero%C5.png'), true)
  assert.equal(result.html.includes('/uploads/thumb%2.png 1x'), true)
  assert.equal(result.html.includes('/api/gnr8/runtime/preview-assets/site-malformed-uri/sv-malformed-uri/uploads/thumb%C5.png?cache=1#hero 2x'), true)
  assert.equal(result.html.includes('../uploads/missing%.png'), true)
  assert.equal(evidence.malformedUriDecodeFallbackCount! >= 6, true)
  assert.equal(evidence.cssUrlReferencesFound, 2)
  assert.equal(evidence.cssUrlReferencesRewritten, 1)
  assert.equal(evidence.cssUrlReferencesMissing, 1)
})

test('Viroidoc-like raw root and news previews preserve Dongle and persisted CSS assets while scripts stay disabled', async () => {
  const provenance = fixtureViroidocLikeMultiPageAssemblyProvenance()
  const rootHtml = [
    '<!doctype html><html><head>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dongle:wght@400;700&display=swap">',
    '<link rel="stylesheet" href="assets/site.css">',
    '</head><body>',
    '<nav><a href="/news">News</a></nav>',
    '<main><h1>VIROIDOC_ROOT</h1><button>Read more</button></main>',
    '<img src="/uploads/root-hero.png" data-src="/uploads/lazy-root.webp">',
    '<script>document.body.append("SHOULD_NOT_RUN")</script>',
    '</body></html>',
  ].join('')
  const newsHtml = [
    '<!doctype html><html><head>',
    '<link rel="stylesheet" href="assets/site.css">',
    '</head><body>',
    '<nav><a href="/">Home</a></nav>',
    '<main><h1>VIROIDOC_NEWS</h1><section id="news-listing">NEWS_LISTING</section></main>',
    '<script>document.body.insertAdjacentHTML("afterbegin","VIROIDOC_ROOT")</script>',
    '</body></html>',
  ].join('')
  const css = [
    'h1,button{font-family:"Dongle",sans-serif}',
    '.hero{background-image:url("../uploads/root-bg.svg?cache=1")}',
    '@font-face{font-family:"Dongle";src:url("../fonts/dongle.woff2") format("woff2")}',
  ].join('')
  const htmlByFilePath: Record<string, string> = {
    'pages/root/index.html': rootHtml,
    'pages/project/index.html': '<!doctype html><html><body><main>Project</main></body></html>',
    'pages/people/index.html': '<!doctype html><html><body><main>People</main></body></html>',
    'pages/news/index.html': newsHtml,
  }
  const fileMap: Record<string, { mediaType: string; sizeBytes: number; sha256: string }> = {
    ...Object.fromEntries(
      Object.entries(htmlByFilePath).map(([filePath, html]) => [
        filePath,
        { mediaType: 'text/html', sizeBytes: html.length, sha256: `sha-${filePath}` },
      ]),
    ),
    'assets/site.css': { mediaType: 'text/css', sizeBytes: css.length, sha256: 'sha-css' },
    'uploads/root-hero.png': { mediaType: 'image/png', sizeBytes: 1, sha256: 'sha-hero' },
    'uploads/lazy-root.webp': { mediaType: 'image/webp', sizeBytes: 1, sha256: 'sha-lazy' },
    'uploads/root-bg.svg': { mediaType: 'image/svg+xml', sizeBytes: 1, sha256: 'sha-bg' },
    'fonts/dongle.woff2': { mediaType: 'font/woff2', sizeBytes: 1, sha256: 'sha-font' },
  }
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-viroidoc-dongle',
        siteId: 'site-viroidoc-dongle',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: provenance,
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        id: 'artifact-viroidoc-dongle',
        artifactType: 'raw_imported_site',
        siteId: 'site-viroidoc-dongle',
        siteVersionId: 'sv-viroidoc-dongle',
        entryHtmlPath: 'pages/root/index.html',
        assetBasePath: '/',
        fileMap,
        metadata: { assetSummary: { persistedAssetCount: Object.keys(fileMap).length, externalFallbackAssetCount: 0 } },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      const html = htmlByFilePath[input.filePath]
      if (html) return { bytes: Buffer.from(html), sizeBytes: html.length, mediaType: 'text/html' } as any
      if (input.filePath === 'assets/site.css') return { bytes: Buffer.from(css), sizeBytes: css.length, mediaType: 'text/css' } as any
      return null
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  })

  try {
    const rootPreview = await renderSiteVersionPreview({
      siteVersionId: 'sv-viroidoc-dongle',
      path: '/',
      mode: 'raw_template_preview',
      requestCorrelationKey: 'req-viroidoc-dongle-root',
    })
    const newsPreview = await renderSiteVersionPreview({
      siteVersionId: 'sv-viroidoc-dongle',
      path: '/news',
      mode: 'raw_template_preview',
      requestCorrelationKey: 'req-viroidoc-dongle-news',
    })

    assert.equal(rootPreview.source, 'raw_template_site')
    assert.equal(rootPreview.html.includes('https://fonts.googleapis.com/css2?family=Dongle'), true)
    assert.equal(rootPreview.html.includes('/api/gnr8/runtime/preview-assets/site-viroidoc-dongle/sv-viroidoc-dongle/assets/site.css'), true)
    assert.equal(rootPreview.html.includes('/api/gnr8/runtime/preview-assets/site-viroidoc-dongle/sv-viroidoc-dongle/uploads/root-hero.png'), true)
    assert.equal(rootPreview.html.includes('/api/gnr8/runtime/preview-assets/site-viroidoc-dongle/sv-viroidoc-dongle/uploads/lazy-root.webp'), true)
    assert.equal(/<script\b(?![^>]*\btype=["']application\/gnr8-disabled-script["'])/i.test(rootPreview.html), false)
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence?.fontFamilyDongleDetected, true)
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence?.fontStylesheetsPreserved, 1)
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence?.fontFilesRewritten, 1)
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence?.imageReferencesRewritten, 3)
    assert.equal(rootPreview.previewRuntimeSummary.contentResolutionApplied, false)

    assert.equal(newsPreview.path, '/news')
    assert.equal(newsPreview.html.includes('VIROIDOC_NEWS'), true)
    assert.equal(newsPreview.html.includes('<main><h1>VIROIDOC_ROOT'), false)
    assert.equal(newsPreview.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence?.fontFamilyDongleDetected, true)
    assert.equal(/<script\b(?![^>]*\btype=["']application\/gnr8-disabled-script["'])/i.test(newsPreview.html), false)
  } finally {
    restore()
  }
})

test('Viroidoc-like raw root preview renders despite malformed asset URLs and malformed route query', async () => {
  const provenance = fixtureViroidocLikeMultiPageAssemblyProvenance()
  const rootHtml = [
    '<!doctype html><html><head>',
    '<link rel="stylesheet" href="assets/site%C5.css?cache=1">',
    '<style>.inline{background:url("../uploads/inline%sk.png?version=1#hash")}</style>',
    '</head><body>',
    '<main><h1>VIROIDOC_ROOT_RAW_URI</h1></main>',
    '<img src="/uploads/root%ZZ.png" srcset="/uploads/root-small%2.png 1x, /uploads/root-large%C5.png?cache=1 2x">',
    '<script>document.body.append("SHOULD_NOT_RUN")</script>',
    '</body></html>',
  ].join('')
  const css = '.css-bg{background:url("../uploads/css-bg%.png?cache=1")}'
  const htmlByFilePath: Record<string, string> = {
    'pages/root/index.html': rootHtml,
    'pages/project/index.html': '<!doctype html><html><body><main>Project</main></body></html>',
    'pages/people/index.html': '<!doctype html><html><body><main>People</main></body></html>',
    'pages/news/index.html': '<!doctype html><html><body><main>News</main></body></html>',
  }
  const fileMap: Record<string, { mediaType: string; sizeBytes: number; sha256: string }> = {
    ...Object.fromEntries(
      Object.entries(htmlByFilePath).map(([filePath, html]) => [
        filePath,
        { mediaType: 'text/html', sizeBytes: html.length, sha256: `sha-${filePath}` },
      ]),
    ),
    'assets/site%C5.css': { mediaType: 'text/css', sizeBytes: css.length, sha256: 'sha-css' },
    'uploads/inline%sk.png': { mediaType: 'image/png', sizeBytes: 1, sha256: 'sha-inline' },
    'uploads/root%ZZ.png': { mediaType: 'image/png', sizeBytes: 1, sha256: 'sha-root' },
    'uploads/root-large%C5.png': { mediaType: 'image/png', sizeBytes: 1, sha256: 'sha-large' },
    'uploads/css-bg%.png': { mediaType: 'image/png', sizeBytes: 1, sha256: 'sha-css-bg' },
  }
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-viroidoc-raw-uri',
        siteId: 'site-viroidoc-raw-uri',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: provenance,
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        id: 'artifact-viroidoc-raw-uri',
        artifactType: 'raw_imported_site',
        siteId: 'site-viroidoc-raw-uri',
        siteVersionId: 'sv-viroidoc-raw-uri',
        entryHtmlPath: 'pages/root/index.html',
        assetBasePath: '/',
        fileMap,
        metadata: { assetSummary: { persistedAssetCount: Object.keys(fileMap).length, externalFallbackAssetCount: 0 } },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      const html = htmlByFilePath[input.filePath]
      if (html) return { bytes: Buffer.from(html), sizeBytes: html.length, mediaType: 'text/html' } as any
      if (input.filePath === 'assets/site%C5.css') return { bytes: Buffer.from(css), sizeBytes: css.length, mediaType: 'text/css' } as any
      return null
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  })

  try {
    const preview = await renderSiteVersionPreview({
      siteVersionId: 'sv-viroidoc-raw-uri',
      path: '/?bad=%',
      mode: 'raw_template_preview',
      requestCorrelationKey: 'req-viroidoc-raw-uri-root',
    })
    const evidence = preview.rawTemplatePreviewEvidence?.rawPreviewAssetRewriteEvidence

    assert.equal(preview.source, 'raw_template_site')
    assert.equal(preview.path, '/')
    assert.equal(preview.html.includes('VIROIDOC_ROOT_RAW_URI'), true)
    assert.equal(preview.html.includes('URI malformed'), false)
    assert.equal(preview.html.includes('/api/gnr8/runtime/preview-assets/site-viroidoc-raw-uri/sv-viroidoc-raw-uri/uploads/root%ZZ.png'), true)
    assert.equal(preview.html.includes('/uploads/root-small%2.png 1x'), true)
    assert.equal(preview.html.includes('/api/gnr8/runtime/preview-assets/site-viroidoc-raw-uri/sv-viroidoc-raw-uri/uploads/root-large%C5.png?cache=1 2x'), true)
    assert.equal(/<script\b(?![^>]*\btype=["']application\/gnr8-disabled-script["'])/i.test(preview.html), false)
    assert.equal((evidence?.malformedUriDecodeFallbackCount ?? 0) >= 6, true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('RAW_PREVIEW_URI_DECODE_WARNING'), true)
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('RAW_PREVIEW_URI_DECODE_FALLBACK_USED'), true)
  } finally {
    restore()
  }
})

test('raw template preview rewrites latest Viroidoc-style menu anchors without multiplying root content', async () => {
  const requestedAssets: string[] = []
  const routeEntries = [
    ['/project', 'pages/project/index.html'],
    ['/people', 'pages/people/index.html'],
    ['/news', 'pages/news/index.html'],
    ['/learn', 'pages/learn/index.html'],
    ['/blog', 'pages/blog/index.html'],
  ] as const
  const baseProvenance = fixtureViroidocLikeMultiPageAssemblyProvenance()
  const provenance = {
    ...baseProvenance,
    multiPageDiscovery: {
      ...baseProvenance.multiPageDiscovery,
      rawArtifactAssembly: {
        ...baseProvenance.multiPageDiscovery?.rawArtifactAssembly,
        routeMap: routeEntries.map(([routePath, rawFilePath]) => ({
          routePath,
          sourceUrl: `https://viroidoc.eu${routePath}`,
          finalUrl: `https://www.viroidoc.eu${routePath}`,
          rawFilePath,
          bodySha256: `sha-${routePath}`,
          byteSize: 100,
          status: 'assembled' as const,
        })),
        htmlPathMap: Object.fromEntries(routeEntries),
      },
    },
  } as RuntimeImportProvenanceSummary
  const keyText = 'Advanced Research on Viroid Pathogenesis'
  const rootHtml = [
    '<!doctype html><html><body>',
    '<nav>',
    '<a href="/project" data-track-event="click" data-track-action="internal_link_clicked">Project</a>',
    '<a href="/people" data-track-event="click" data-track-action="internal_link_clicked">People</a>',
    '<a href="/news" data-track-event="click" data-track-action="internal_link_clicked">News</a>',
    '<a href="/learn" data-track-event="click" data-track-action="internal_link_clicked">Learn</a>',
    '<a href="/blog" data-track-event="click" data-track-action="internal_link_clicked">Blog</a>',
    '</nav>',
    `<main>${keyText}</main>`,
    '</body></html>',
  ].join('')
  const htmlByFilePath: Record<string, string> = {
    'index.html': rootHtml,
    'pages/project/index.html': '<!doctype html><html><body><main>Project page content</main></body></html>',
    'pages/people/index.html': '<!doctype html><html><body><main>People page content</main></body></html>',
    'pages/news/index.html': '<!doctype html><html><body><main>News page content</main></body></html>',
    'pages/learn/index.html': '<!doctype html><html><body><main>Learn page content</main></body></html>',
    'pages/blog/index.html': '<!doctype html><html><body><main>Blog page content</main></body></html>',
  }
  const fileMap = Object.fromEntries(
    Object.entries(htmlByFilePath).map(([filePath, html]) => [
      filePath,
      { mediaType: 'text/html', sizeBytes: html.length, sha256: `sha-${filePath}` },
    ]),
  )
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-viroidoc-live-shape',
        siteId: 'site-viroidoc-live-shape',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: provenance,
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        artifactType: 'raw_imported_site',
        siteId: 'site-viroidoc-live-shape',
        siteVersionId: 'sv-viroidoc-live-shape',
        entryHtmlPath: 'index.html',
        assetBasePath: '/',
        fileMap,
        metadata: {
          assetSummary: { persistedAssetCount: Object.keys(fileMap).length, externalFallbackAssetCount: 0 },
        },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      requestedAssets.push(input.filePath)
      const html = htmlByFilePath[input.filePath]
      return html ? ({ bytes: Buffer.from(html), sizeBytes: html.length, mediaType: 'text/html' } as any) : null
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  })

  try {
    const rootPreview = await renderSiteVersionPreview({
      siteVersionId: 'sv-viroidoc-live-shape',
      path: '/',
      mode: 'raw_template_preview',
      requestCorrelationKey: 'req-viroidoc-live-shape-root',
    })
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.selectedRoutePath, '/')
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.selectedRawFilePath, 'index.html')
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.htmlByteLengthBeforeRewrite, Buffer.byteLength(rootHtml))
    assert.equal((rootPreview.rawTemplatePreviewEvidence?.htmlByteLengthAfterRewrite ?? 0) > Buffer.byteLength(rootHtml), true)
    assert.equal(rootPreview.rawTemplatePreviewEvidence?.rewrittenLinkCount, 5)
    assert.equal(countOccurrences(rootPreview.html, keyText), 1)
    assert.equal(rootPreview.html.includes('href="/project" data-track-event'), false)
    for (const [routePath] of routeEntries) {
      assert.equal(
        rootPreview.html.includes(`/api/gnr8/runtime/versions/sv-viroidoc-live-shape/preview?mode=raw_template_preview&amp;path=%2F${routePath.slice(1)}`),
        true,
      )
      assert.equal(rootPreview.html.includes(`data-gnr8-original-href="${routePath}"`), true)
    }
    assertNoTransformedDiagnosticContent(rootPreview.html)

    for (const [routePath, rawFilePath] of routeEntries) {
      const childPreview = await renderSiteVersionPreview({
        siteVersionId: 'sv-viroidoc-live-shape',
        path: routePath,
        mode: 'raw_template_preview',
        requestCorrelationKey: `req-viroidoc-live-shape-${routePath.slice(1)}`,
      })
      assert.equal(childPreview.path, routePath)
      assert.equal(childPreview.rawTemplatePreviewEvidence?.selectedRoutePath, routePath)
      assert.equal(childPreview.rawTemplatePreviewEvidence?.selectedRawFilePath, rawFilePath)
      assert.equal(childPreview.html.includes(`${routePath.slice(1)[0]?.toUpperCase()}${routePath.slice(2)} page content`), true)
      assert.equal(childPreview.html.includes(keyText), false)
      assertNoTransformedDiagnosticContent(childPreview.html)
    }
  } finally {
    restore()
  }

  assert.deepEqual(requestedAssets, ['index.html', ...routeEntries.map(([, rawFilePath]) => rawFilePath)])
})

test('raw template preview route-map serving returns explicit miss instead of serving root', async () => {
  let rawTemplateAssetLookupCount = 0
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-missing-route',
        siteId: 'site-missing-route',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: fixtureMultiPageAssemblyProvenance(),
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        artifactType: 'raw_imported_site',
        siteId: 'site-missing-route',
        siteVersionId: 'sv-missing-route',
        entryHtmlPath: 'index.html',
        assetBasePath: '/',
        fileMap: {
          'index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-home' },
          'pages/about/index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-about' },
        },
        metadata: { assetSummary: { persistedAssetCount: 2, externalFallbackAssetCount: 0 } },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => {
      rawTemplateAssetLookupCount += 1
      return { bytes: Buffer.from('<html><body><h1>Home</h1></body></html>'), sizeBytes: 39, mediaType: 'text/html' } as any
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  })

  try {
    await assert.rejects(
      () =>
        renderSiteVersionPreview({
          siteVersionId: 'sv-missing-route',
          path: '/missing',
          mode: 'raw_template_preview',
          requestCorrelationKey: 'req-route-miss',
        }),
      (error: unknown) =>
        error instanceof SiteVersionPreviewUnavailableError &&
        error.code === 'PREVIEW_PATH_NOT_FOUND' &&
        /route-map path not found/.test(error.message),
    )
    assert.equal(rawTemplateAssetLookupCount, 0)
  } finally {
    restore()
  }
})

test('raw template preview route-map serving reports missing assembled file before reading entry HTML', async () => {
  let rawTemplateAssetLookupCount = 0
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-missing-file',
        siteId: 'site-missing-file',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: fixtureMultiPageAssemblyProvenance(),
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        artifactType: 'raw_imported_site',
        siteId: 'site-missing-file',
        siteVersionId: 'sv-missing-file',
        entryHtmlPath: 'index.html',
        assetBasePath: '/',
        fileMap: {
          'index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-home' },
        },
        metadata: { assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 } },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async () => {
      rawTemplateAssetLookupCount += 1
      return { bytes: Buffer.from('<html><body><h1>Home</h1></body></html>'), sizeBytes: 39, mediaType: 'text/html' } as any
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
  })

  try {
    await assert.rejects(
      () =>
        renderSiteVersionPreview({
          siteVersionId: 'sv-missing-file',
          path: '/about',
          mode: 'raw_template_preview',
          requestCorrelationKey: 'req-route-file-missing',
        }),
      (error: unknown) =>
        error instanceof SiteVersionPreviewUnavailableError &&
        error.code === 'PREVIEW_PATH_NOT_FOUND' &&
        /route-map file missing/.test(error.message),
    )
    assert.equal(rawTemplateAssetLookupCount, 0)
  } finally {
    restore()
  }
})

test('raw template route-map child selection remains disabled outside controlled raw template preview mode', async () => {
  const requestedAssets: string[] = []
  let transformedBindingLookupCount = 0
  let transformedArtifactLookupCount = 0
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () =>
      ({
        id: 'sv-disabled',
        siteId: 'site-disabled',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: fixtureMultiPageAssemblyProvenance(),
      }) as any,
    getRawImportedSiteArtifact: async () =>
      ({
        artifactType: 'raw_imported_site',
        siteId: 'site-disabled',
        siteVersionId: 'sv-disabled',
        entryHtmlPath: 'index.html',
        assetBasePath: '/',
        fileMap: {
          'index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-home' },
          'pages/about/index.html': { mediaType: 'text/html', sizeBytes: 30, sha256: 'sha-about' },
        },
        metadata: { assetSummary: { persistedAssetCount: 2, externalFallbackAssetCount: 0 } },
      }) as any,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      requestedAssets.push(input.filePath)
      return { bytes: Buffer.from('<html><body><a href="/about">About</a><h1>Home</h1></body></html>'), sizeBytes: 66, mediaType: 'text/html' } as any
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
    getSiteVersionArtifactBinding: async () => {
      transformedBindingLookupCount += 1
      return { siteId: 'site-disabled', artifactId: 'artifact-disabled' }
    },
    getArtifactById: async () => {
      transformedArtifactLookupCount += 1
      return {
        id: 'artifact-disabled',
        siteId: 'site-disabled',
        siteVersionId: 'sv-disabled',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        htmlByPath: {
          '/': '<html><body><h1>Transformed Home</h1></body></html>',
          '/about': '<html><body><h1>Transformed About</h1><a href="/about">About</a></body></html>',
        },
        bundleSha256: 'x',
        compiledTokenStyles: '',
        assetFingerprintMap: {},
        manifest: {},
        publishStage: 'production',
        shadowRestricted: false,
        artifactGovernance: {},
      } as any
    },
  })

  try {
    const preview = await renderSiteVersionPreview({
      siteVersionId: 'sv-disabled',
      path: '/about',
      mode: 'transformed',
      requestCorrelationKey: 'req-route-disabled',
    })

    assert.deepEqual(requestedAssets, [])
    assert.equal(transformedBindingLookupCount, 1)
    assert.equal(transformedArtifactLookupCount, 1)
    assert.match(preview.html, /<h1>Transformed About<\/h1>/)
    assert.equal(preview.html.includes('<a href="/about">About</a>'), true)
    assert.equal(preview.html.includes('data-gnr8-multipage-link="rewritten"'), false)
    assert.equal(preview.source, 'transformed_artifact')
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_ROUTE_MAP_SELECTED'), false)
  } finally {
    restore()
  }
})

test('preview override selection merges by slot with draft precedence and published fallback', () => {
  const selected = __unifiedRenderPreviewTestUtils.selectPreviewOverridesByVersion({
    siteVersionId: 'sv-2',
    draftOverrides: [
      {
        id: 'draft-1',
        siteId: 'site-1',
        siteVersionId: 'sv-1',
        slotKey: 'hero.title',
        valueType: 'text',
        valueJson: { value: 'wrong version draft' },
        status: 'draft',
      },
      {
        id: 'draft-2',
        siteId: 'site-1',
        siteVersionId: 'sv-2',
        slotKey: 'hero.title',
        valueType: 'text',
        valueJson: { value: 'correct version draft' },
        status: 'draft',
      },
    ],
    publishedOverrides: [
      {
        id: 'pub-1',
        siteId: 'site-1',
        siteVersionId: 'sv-2',
        slotKey: 'hero.title',
        valueType: 'text',
        valueJson: { value: 'published fallback' },
        status: 'published',
      },
      {
        id: 'pub-2',
        siteId: 'site-1',
        siteVersionId: 'sv-2',
        slotKey: 'hero.subtitle',
        valueType: 'text',
        valueJson: { value: 'published subtitle' },
        status: 'published',
      },
    ],
  })

  assert.equal(selected.length, 2)
  const bySlot: Record<string, any> = Object.fromEntries(selected.map((override) => [override.slotKey, override]))
  assert.equal(bySlot['hero.title']?.valueJson?.value, 'correct version draft')
  assert.equal(bySlot['hero.subtitle']?.valueJson?.value, 'published subtitle')
})

test('transformed preview isolates /news and / while disabling page-authored script reinjection', async () => {
  const siteVersion = {
    id: 'sv-transformed-nav',
    siteId: 'site-transformed-nav',
    rendererCompatibilityVersion: 'gnr8-renderer-v1',
    pages: [
      {
        pageId: 'page-home',
        path: '/',
        title: 'Home',
        structureModel: {
          sections: [
            { id: 'home-intro-a', type: 'hero', order: 0 },
            { id: 'home-intro-b', type: 'hero', order: 1 },
            { id: 'home-listing', type: 'latest-news', order: 2 },
          ],
        },
        contentModel: {
          sectionProps: {
            'home-intro-a': { heading: 'HOME_INTRO', body: 'Research overview' },
            'home-intro-b': { heading: 'HOME_INTRO', body: 'Research overview' },
            'home-listing': { heading: 'Latest News', items: [{ title: 'One' }, { title: 'Two' }] },
          },
        },
        styleTokens: {},
      },
      {
        pageId: 'page-news',
        path: '/news',
        title: 'News',
        structureModel: {
          sections: [
            { id: 'news-intro-a', type: 'hero', order: 0 },
            { id: 'news-intro-b', type: 'hero', order: 1 },
            { id: 'news-listing', type: 'news-listing', order: 2 },
          ],
        },
        contentModel: {
          sectionProps: {
            'news-intro-a': { heading: 'HOME_INTRO', body: 'Research overview' },
            'news-intro-b': { heading: 'HOME_INTRO', body: 'Research overview' },
            'news-listing': { heading: 'NEWS_LISTING', items: [{ title: 'One' }, { title: 'Two' }] },
          },
        },
        styleTokens: {},
      },
    ],
    importProvenanceSummary: {
      renderedCapture: { status: 'available', nodeCount: 10, domLength: 1000 },
      screenshotCount: 1,
      multiPageDiscovery: {
        rawArtifactAssembly: {
          routeMap: [
            { routePath: '/', rawFilePath: 'pages/root/index.html' },
            { routePath: '/news', rawFilePath: 'pages/news/index.html' },
          ],
        },
      },
    },
  } as any
  const rawLookupCalls = {
    getSiteVersion: 0,
    getSiteVersionArtifactBinding: 0,
    getArtifactById: 0,
    getRawImportedSiteArtifact: 0,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 0,
    listContentSlots: 0,
    listContentOverrides: 0,
  }
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () => {
      rawLookupCalls.getSiteVersion += 1
      return siteVersion
    },
    getRawImportedSiteArtifact: async () => {
      rawLookupCalls.getRawImportedSiteArtifact += 1
      return null
    },
    getRawTemplateSiteArtifact: async () => {
      rawLookupCalls.getRawTemplateSiteArtifact += 1
      return null
    },
    getRawTemplateSiteAsset: async () => {
      rawLookupCalls.getRawTemplateSiteAsset += 1
      return null
    },
    listContentSlots: async () => {
      rawLookupCalls.listContentSlots += 1
      return []
    },
    listContentOverrides: async () => {
      rawLookupCalls.listContentOverrides += 1
      return []
    },
    getSiteVersionArtifactBinding: async () => {
      rawLookupCalls.getSiteVersionArtifactBinding += 1
      return { siteId: 'site-transformed-nav', artifactId: 'artifact-transformed-nav' }
    },
    getArtifactById: async () => {
      rawLookupCalls.getArtifactById += 1
      return {
        id: 'artifact-transformed-nav',
        siteId: 'site-transformed-nav',
        siteVersionId: 'sv-transformed-nav',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        htmlByPath: {
          '/': '<!doctype html><html><head></head><body><main><section>HOME_INTRO</section><section>Latest News</section></main><script src="/assets/home.js"></script></body></html>',
          '/news':
            '<!doctype html><html><head></head><body><main><section>NEWS_LISTING</section></main><script>window.__appendHomeIntro=true</script></body></html>',
        },
        bundleSha256: 'x',
        compiledTokenStyles: '',
        assetFingerprintMap: {},
        manifest: {
          transformedAssemblyDiagnosticsByRoute: {
            '/': {
              selectedRoutePath: '/',
              selectedSourceRawFile: 'pages/root/index.html',
              semanticSectionCount: 3,
              transformedRouteSectionCountBeforeHydration: 2,
              duplicateRemovalCount: 1,
              clientHydrationMode: 'idempotent',
              repeatedSectionFingerprints: [],
              sharedHeaderFooterSectionCount: 0,
              listingDetection: { detected: false, sectionId: null, reason: 'not_listing_route' },
              finalSectionOrder: [
                { sectionId: 'home-intro-a', type: 'hero', order: 0 },
                { sectionId: 'home-listing', type: 'latest-news', order: 2 },
              ],
              removedDuplicateSectionIds: ['home-intro-b'],
              headingStyleSource: {
                source: 'computed_style',
                headingFontFamily: 'Source Serif 4',
                bodyFontFamily: 'Inter',
                routePath: '/',
              },
            },
            '/news': {
              selectedRoutePath: '/news',
              selectedSourceRawFile: 'pages/news/index.html',
              semanticSectionCount: 3,
              transformedRouteSectionCountBeforeHydration: 2,
              duplicateRemovalCount: 1,
              clientHydrationMode: 'idempotent',
              repeatedSectionFingerprints: [],
              sharedHeaderFooterSectionCount: 0,
              listingDetection: { detected: true, sectionId: 'news-listing', reason: 'route_listing_items' },
              finalSectionOrder: [
                { sectionId: 'news-intro-a', type: 'hero', order: 0 },
                { sectionId: 'news-listing', type: 'news-listing', order: 2 },
              ],
              removedDuplicateSectionIds: ['news-intro-b'],
              headingStyleSource: {
                source: 'computed_style',
                headingFontFamily: 'Source Serif 4',
                bodyFontFamily: 'Inter',
                routePath: '/news',
              },
            },
          },
        },
        publishStage: 'production',
        shadowRestricted: false,
        artifactGovernance: {},
      } as any
    },
  })

  try {
    const newsPreview = await renderSiteVersionPreview({
      siteVersionId: 'sv-transformed-nav',
      path: '/news',
      mode: 'transformed',
      requestCorrelationKey: 'req-transformed-news',
    })
    const homePreview = await renderSiteVersionPreview({
      siteVersionId: 'sv-transformed-nav',
      path: '/',
      mode: 'transformed',
      requestCorrelationKey: 'req-transformed-home',
    })
    const newsPreviewAgain = await renderSiteVersionPreview({
      siteVersionId: 'sv-transformed-nav',
      path: '/news',
      mode: 'transformed',
      requestCorrelationKey: 'req-transformed-news-again',
    })
    const homePreviewAgain = await renderSiteVersionPreview({
      siteVersionId: 'sv-transformed-nav',
      path: '/',
      mode: 'transformed',
      requestCorrelationKey: 'req-transformed-home-again',
    })

    assert.equal(newsPreview.path, '/news')
    assert.equal(homePreview.path, '/')
    assert.equal(newsPreviewAgain.path, '/news')
    assert.equal(homePreviewAgain.path, '/')
    assert.equal(countOccurrences(newsPreview.html, 'NEWS_LISTING'), 1)
    assert.equal(newsPreview.html.includes('<section>HOME_INTRO</section>'), false)
    assert.equal(countOccurrences(homePreview.html, '<section>HOME_INTRO</section>'), 1)
    assert.equal(countOccurrences(homePreviewAgain.html, '<section>HOME_INTRO</section>'), 1)
    assert.match(newsPreview.html, /type="application\/gnr8-disabled-preview-script"/)
    assert.match(homePreview.html, /data-gnr8-client-hydration-mode="idempotent"/)
    assert.equal(newsPreview.previewRuntimeSummary.transformedAssemblyDiagnostics?.selectedRoutePath, '/news')
    assert.equal(newsPreview.previewRuntimeSummary.transformedAssemblyDiagnostics?.selectedSourceRawFile, 'pages/news/index.html')
    assert.equal(newsPreview.previewRuntimeSummary.transformedAssemblyDiagnostics?.transformedRouteSectionCountBeforeHydration, 2)
    assert.equal(newsPreview.previewRuntimeSummary.transformedAssemblyDiagnostics?.duplicateRemovalCount, 1)
    assert.equal(homePreview.previewRuntimeSummary.previewDiagnostics.includes('TRANSFORMED_PREVIEW_HOME_ROUTE_SELECTED'), true)
    assert.equal(homePreview.previewRuntimeSummary.previewDiagnostics.includes('TRANSFORMED_PREVIEW_RAW_RESOLUTION_SKIPPED'), true)
  } finally {
    restore()
  }

  assert.deepEqual(rawLookupCalls, {
    getSiteVersion: 0,
    getSiteVersionArtifactBinding: 4,
    getArtifactById: 4,
    getRawImportedSiteArtifact: 0,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 0,
    listContentSlots: 0,
    listContentOverrides: 0,
  })
})

test('transformed preview blocks Viroidoc-style recovery diagnostics and falls back to matching raw routes', async () => {
  const provenance = fixtureViroidocLikeMultiPageAssemblyProvenance()
  const rawHtmlByFilePath: Record<string, string> = {
    'pages/root/index.html': [
      '<!doctype html><html><body>',
      '<nav><a href="/news">News</a></nav>',
      '<main><h1>VIROIDOC_HOME_VALID</h1><p>Research home content.</p></main>',
      '</body></html>',
    ].join(''),
    'pages/project/index.html': '<!doctype html><html><body><main>Project content</main></body></html>',
    'pages/people/index.html': '<!doctype html><html><body><main>People content</main></body></html>',
    'pages/news/index.html': '<!doctype html><html><body><main><h1>VIROIDOC_NEWS_VALID</h1><p>News route content.</p></main></body></html>',
  }
  const fileMap = Object.fromEntries(
    Object.entries(rawHtmlByFilePath).map(([filePath, html]) => [
      filePath,
      { mediaType: 'text/html', sizeBytes: html.length, sha256: `sha-${filePath}` },
    ]),
  )
  const transformedDiagnosticHtmlByPath: Record<string, string> = {
    '/': [
      '<!doctype html><html><head><title>home</title></head><body><main>',
      '<h1>home</h1>',
      '<p>raw-block:html&gt;body&gt;div:nth-of-type(1):0</p>',
      '<h2>[missing:final_component_home.heading]</h2>',
      '<p>Generic component fallback</p><p>fallbackReason:generic_component_kind</p>',
      '<p>Recovered from: /tmp/gnr8/validation/url-import-snapshots/imported-url-site/runs/a/index.html</p>',
      '<h2>Recovered Section 1</h2>',
      '<p>CAPTURE_DRIVEN_CTA_LIFT_APPLIED dominant_candidate=cta:0.61 runner_up=hero:0.39 avg_child_elements=3 layout_runner_up=grid layout_score=stack:0.44</p>',
      '</main></body></html>',
    ].join(''),
    '/news': [
      '<!doctype html><html><head><title>news</title></head><body><main>',
      '<h1>Recovered Section 2</h1>',
      '<p>raw-block:html&gt;body&gt;div:nth-of-type(2):0</p>',
      '<p>[missing:final_component_news.body]</p><p>Missing media for final_component_news.image</p><p>render.generic</p>',
      '<p>Recovered from: /tmp/gnr8/validation/url-import-snapshots/imported-url-site/runs/a/news.html</p>',
      '<p>CAPTURE_DRIVEN_SECTION_GROUPING_LIFT dominant_candidate=content:0.52 runner_up=hero:0.40</p>',
      '</main></body></html>',
    ].join(''),
  }
  const calls = {
    getSiteVersion: 0,
    getRawImportedSiteArtifact: 0,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 0,
    listContentSlots: 0,
    listContentOverrides: 0,
    getSiteVersionArtifactBinding: 0,
    getArtifactById: 0,
  }
  const requestedAssets: string[] = []
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () => {
      calls.getSiteVersion += 1
      return {
        id: 'sv-viroidoc-diagnostic',
        siteId: 'site-viroidoc-diagnostic',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: {
          ...provenance,
          renderedCapture: { status: 'available', nodeCount: 100, domLength: 10000 },
          screenshotCount: 1,
        },
      } as any
    },
    getRawImportedSiteArtifact: async () => {
      calls.getRawImportedSiteArtifact += 1
      return {
        artifactType: 'raw_imported_site',
        siteId: 'site-viroidoc-diagnostic',
        siteVersionId: 'sv-viroidoc-diagnostic',
        entryHtmlPath: 'pages/root/index.html',
        assetBasePath: '/',
        fileMap,
        metadata: {
          assetSummary: { persistedAssetCount: Object.keys(fileMap).length, externalFallbackAssetCount: 0 },
        },
      } as any
    },
    getRawTemplateSiteArtifact: async () => {
      calls.getRawTemplateSiteArtifact += 1
      return null
    },
    getRawTemplateSiteAsset: async (input) => {
      calls.getRawTemplateSiteAsset += 1
      requestedAssets.push(input.filePath)
      const html = rawHtmlByFilePath[input.filePath]
      return html ? ({ bytes: Buffer.from(html), sizeBytes: html.length, mediaType: 'text/html' } as any) : null
    },
    listContentSlots: async () => {
      calls.listContentSlots += 1
      return []
    },
    listContentOverrides: async () => {
      calls.listContentOverrides += 1
      return []
    },
    getSiteVersionArtifactBinding: async () => {
      calls.getSiteVersionArtifactBinding += 1
      return { siteId: 'site-viroidoc-diagnostic', artifactId: 'artifact-viroidoc-diagnostic' }
    },
    getArtifactById: async () => {
      calls.getArtifactById += 1
      return {
        id: 'artifact-viroidoc-diagnostic',
        siteId: 'site-viroidoc-diagnostic',
        siteVersionId: 'sv-viroidoc-diagnostic',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        htmlByPath: transformedDiagnosticHtmlByPath,
        bundleSha256: 'x',
        compiledTokenStyles: '',
        assetFingerprintMap: {},
        manifest: {},
        publishStage: 'production',
        shadowRestricted: false,
        artifactGovernance: {},
      } as any
    },
  })

  try {
    const sequence = [
      ['/news', 'VIROIDOC_NEWS_VALID', 'VIROIDOC_HOME_VALID'],
      ['/', 'VIROIDOC_HOME_VALID', 'VIROIDOC_NEWS_VALID'],
      ['/news', 'VIROIDOC_NEWS_VALID', 'VIROIDOC_HOME_VALID'],
      ['/', 'VIROIDOC_HOME_VALID', 'VIROIDOC_NEWS_VALID'],
    ] as const
    for (const [routePath, expectedMarker, absentMarker] of sequence) {
      const preview = await renderSiteVersionPreview({
        siteVersionId: 'sv-viroidoc-diagnostic',
        path: routePath,
        mode: 'transformed',
        requestCorrelationKey: `req-viroidoc-diagnostic-${routePath}-${calls.getSiteVersionArtifactBinding}`,
      })
      assert.equal(preview.source, 'raw_template_site')
      assert.equal(preview.fallbackUsed, true)
      assert.equal(preview.path, routePath)
      assert.equal(preview.html.includes(expectedMarker), true)
      assert.equal(preview.html.includes(absentMarker), false)
      assertNoTransformedDiagnosticContent(preview.html)
      assert.equal(
        preview.previewRuntimeSummary.previewDiagnostics.includes('TRANSFORMED_PREVIEW_DIAGNOSTIC_CONTENT_BLOCKED'),
        true,
      )
      assert.equal(
        preview.previewRuntimeSummary.previewDiagnostics.includes('TRANSFORMED_PREVIEW_RAW_ROUTE_FALLBACK_USED'),
        true,
      )
      assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('blocked_pattern=[missing:'), true)
      assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('MULTIPAGE_PREVIEW_PAGE_ISOLATED'), true)
      assert.equal(preview.rawTemplatePreviewEvidence?.selectedRoutePath, routePath)
    }
  } finally {
    restore()
  }

  assert.deepEqual(requestedAssets, [
    'pages/news/index.html',
    'pages/root/index.html',
    'pages/news/index.html',
    'pages/root/index.html',
  ])
  assert.deepEqual(calls, {
    getSiteVersion: 4,
    getRawImportedSiteArtifact: 4,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 4,
    listContentSlots: 0,
    listContentOverrides: 0,
    getSiteVersionArtifactBinding: 4,
    getArtifactById: 4,
  })
})

test('transformed diagnostic-only output fails cleanly when no raw route fallback exists', async () => {
  const calls = {
    getSiteVersion: 0,
    getRawImportedSiteArtifact: 0,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 0,
    getSiteVersionArtifactBinding: 0,
    getArtifactById: 0,
  }
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () => {
      calls.getSiteVersion += 1
      return {
        id: 'sv-diagnostic-no-raw',
        siteId: 'site-diagnostic-no-raw',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: null,
      } as any
    },
    getRawImportedSiteArtifact: async () => {
      calls.getRawImportedSiteArtifact += 1
      return null
    },
    getRawTemplateSiteArtifact: async () => {
      calls.getRawTemplateSiteArtifact += 1
      return null
    },
    getRawTemplateSiteAsset: async () => {
      calls.getRawTemplateSiteAsset += 1
      return null
    },
    listContentSlots: async () => [],
    listContentOverrides: async () => [],
    getSiteVersionArtifactBinding: async () => {
      calls.getSiteVersionArtifactBinding += 1
      return { siteId: 'site-diagnostic-no-raw', artifactId: 'artifact-diagnostic-no-raw' }
    },
    getArtifactById: async () => {
      calls.getArtifactById += 1
      return {
        id: 'artifact-diagnostic-no-raw',
        siteId: 'site-diagnostic-no-raw',
        siteVersionId: 'sv-diagnostic-no-raw',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        htmlByPath: {
          '/': '<html><body><main><h1>Recovered Section 1</h1><p>raw-block:html&gt;body</p><p>Recovered from: /tmp/gnr8/validation/url-import-snapshots/run/index.html</p></main></body></html>',
        },
        bundleSha256: 'x',
        compiledTokenStyles: '',
        assetFingerprintMap: {},
        manifest: {},
        publishStage: 'production',
        shadowRestricted: false,
        artifactGovernance: {},
      } as any
    },
  })

  try {
    await assert.rejects(
      () =>
        renderSiteVersionPreview({
          siteVersionId: 'sv-diagnostic-no-raw',
          path: '/',
          mode: 'transformed',
          requestCorrelationKey: 'req-diagnostic-no-raw',
        }),
      (error: unknown) =>
        error instanceof SiteVersionPreviewUnavailableError &&
        error.code === 'TRANSFORMED_ARTIFACT_NOT_AVAILABLE' &&
        /diagnostic recovery content/.test(error.message),
    )
  } finally {
    restore()
  }

  assert.deepEqual(calls, {
    getSiteVersion: 1,
    getRawImportedSiteArtifact: 1,
    getRawTemplateSiteArtifact: 1,
    getRawTemplateSiteAsset: 0,
    getSiteVersionArtifactBinding: 1,
    getArtifactById: 1,
  })
})

test('transformed preview annotation is idempotent for repeated hydration helper calls', () => {
  const summary = {
    previewMode: 'react_preview_degraded',
    rendererContractAvailable: true,
    finalSiteModelAvailable: true,
    familyRenderUsed: false,
    familyRenderFamilyId: null,
    familyRenderMode: 'page_fallback',
    familyRenderFallbackToPage: true,
    familyRenderDiagnosticsCount: 0,
    familyRenderDiagnostics: [],
    renderedWithFallback: false,
    matchedPageId: 'page-news',
    contentResolutionApplied: true,
    resolvedContentCount: 2,
    unresolvedContentCount: 0,
    contentResolutionDegraded: false,
    contentResolutionDiagnostics: [],
    previewDiagnostics: [],
    transformedAssemblyDiagnostics: {
      selectedRoutePath: '/news',
      selectedSourceRawFile: 'pages/news/index.html',
      semanticSectionCount: 3,
      transformedRouteSectionCountBeforeHydration: 2,
      duplicateRemovalCount: 1,
      clientHydrationMode: 'idempotent',
      repeatedSectionFingerprints: [],
      sharedHeaderFooterSectionCount: 0,
      listingDetection: { detected: true, sectionId: 'news-listing', reason: 'route_listing_items' },
      finalSectionOrder: [
        { sectionId: 'news-intro-a', type: 'hero', order: 0 },
        { sectionId: 'news-listing', type: 'news-listing', order: 2 },
      ],
      removedDuplicateSectionIds: ['news-intro-b'],
      headingStyleSource: {
        source: 'computed_style',
        headingFontFamily: 'Source Serif 4',
        bodyFontFamily: 'Inter',
        routePath: '/news',
      },
    },
  } as any
  const input = '<html><head></head><body><main><section>NEWS_LISTING</section></main><script src="/assets/site.js"></script></body></html>'
  const once = __unifiedRenderPreviewTestUtils.annotateTransformedPreviewHtml({ html: input, summary })
  const twice = __unifiedRenderPreviewTestUtils.annotateTransformedPreviewHtml({ html: once, summary })

  assert.equal(countOccurrences(twice, 'data-gnr8-transformed-preview="1"'), 1)
  assert.equal(countOccurrences(twice, 'gnr8-transformed-preview-diagnostics'), 1)
  assert.equal(countOccurrences(twice, 'application/gnr8-disabled-preview-script'), 1)
  assert.equal(countOccurrences(twice, '<section>NEWS_LISTING</section>'), 1)
})

test('transformed preview artifact path uses request-scoped db client and bypasses raw/content lookups', async () => {
  let acquireCount = 0
  let releaseCount = 0
  const fakeClient = {
    release: () => {
      releaseCount += 1
    },
  } as any
  const seenDbClients: unknown[] = []
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    requestScopedDbClientEnabled: true,
    acquireRuntimeDbClient: async () => {
      acquireCount += 1
      return fakeClient
    },
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () => {
      throw new Error('site version lookup should not run for transformed artifact hit')
    },
    getSiteVersionArtifactBinding: async (_siteVersionId: string, options?: any) => {
      seenDbClients.push(options?.dbClient)
      return { siteId: 'site-scoped-client', artifactId: 'artifact-scoped-client' }
    },
    getArtifactById: async (_artifactId: string, options?: any) => {
      seenDbClients.push(options?.dbClient)
      return {
        id: 'artifact-scoped-client',
        siteId: 'site-scoped-client',
        siteVersionId: 'sv-scoped-client',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        htmlByPath: { '/': '<html><head></head><body><main>Home</main></body></html>' },
        bundleSha256: 'x',
        compiledTokenStyles: '',
        assetFingerprintMap: {},
        manifest: {},
        publishStage: 'production',
        shadowRestricted: false,
        artifactGovernance: {},
      } as any
    },
    getRawImportedSiteArtifact: async () => {
      throw new Error('raw imported artifact lookup should not run in transformed mode')
    },
    getRawTemplateSiteArtifact: async () => {
      throw new Error('raw template artifact lookup should not run in transformed mode')
    },
    getRawTemplateSiteAsset: async () => {
      throw new Error('raw template asset lookup should not run in transformed mode')
    },
    listContentSlots: async () => {
      throw new Error('content slot lookup should not run in transformed mode')
    },
    listContentOverrides: async () => {
      throw new Error('content override lookup should not run in transformed mode')
    },
  })

  try {
    const preview = await renderSiteVersionPreview({
      siteVersionId: 'sv-scoped-client',
      path: '/',
      mode: 'transformed',
      requestCorrelationKey: 'req-scoped-client',
    })

    assert.equal(preview.source, 'transformed_artifact')
    assert.equal(preview.path, '/')
    assert.equal(acquireCount, 1)
    assert.equal(releaseCount, 1)
    assert.deepEqual(seenDbClients, [fakeClient, fakeClient])
    assert.equal(preview.previewRuntimeSummary.previewDiagnostics.includes('TRANSFORMED_PREVIEW_RAW_RESOLUTION_SKIPPED'), true)
  } finally {
    restore()
  }
})

test('transformed preview reuses request-local cache and keeps query count bounded per request', async () => {
  const calls = {
    getSiteVersion: 0,
    getRawImportedSiteArtifact: 0,
    getRawTemplateSiteArtifact: 0,
    getRawTemplateSiteAsset: 0,
    listContentSlots: 0,
    listContentOverrides: 0,
    getSiteVersionArtifactBinding: 0,
    getArtifactById: 0,
  }
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
    getSiteVersion: async () => {
      calls.getSiteVersion += 1
      return {
        id: 'sv-cache',
        siteId: 'site-cache',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        pages: [],
        importProvenanceSummary: null,
      } as any
    },
    getRawImportedSiteArtifact: async () => {
      calls.getRawImportedSiteArtifact += 1
      return {
        artifactType: 'raw_imported_site',
        siteId: 'site-cache',
        siteVersionId: 'sv-cache',
        entryHtmlPath: 'index.html',
        assetBasePath: '/',
        fileMap: { 'index.html': { mediaType: 'text/html', sizeBytes: 10, sha256: 'x' } },
        metadata: { assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 } },
      } as any
    },
    getRawTemplateSiteArtifact: async () => {
      calls.getRawTemplateSiteArtifact += 1
      return null
    },
    getRawTemplateSiteAsset: async () => {
      calls.getRawTemplateSiteAsset += 1
      return { bytes: Buffer.from('<html><body>ok</body></html>'), sizeBytes: 24, mediaType: 'text/html' } as any
    },
    listContentSlots: async () => {
      calls.listContentSlots += 1
      return []
    },
    listContentOverrides: async () => {
      calls.listContentOverrides += 1
      return []
    },
    getSiteVersionArtifactBinding: async () => {
      calls.getSiteVersionArtifactBinding += 1
      return { siteId: 'site-cache', artifactId: 'artifact-cache' }
    },
    getArtifactById: async () => {
      calls.getArtifactById += 1
      return {
        id: 'artifact-cache',
        siteId: 'site-cache',
        siteVersionId: 'sv-cache',
        rendererCompatibilityVersion: 'gnr8-renderer-v1',
        htmlByPath: { '/': '<html><body>artifact</body></html>' },
        bundleSha256: 'x',
        compiledTokenStyles: '',
        assetFingerprintMap: {},
        manifest: {},
        publishStage: 'production',
        shadowRestricted: false,
        artifactGovernance: {},
      } as any
    },
  })

  try {
    for (let index = 0; index < 20; index += 1) {
      await renderSiteVersionPreview({
        siteVersionId: 'sv-cache',
        mode: 'transformed',
        requestCorrelationKey: `req-cache-${index + 1}`,
      })
    }
  } finally {
    restore()
  }

  assert.equal(calls.getSiteVersion, 0)
  assert.equal(calls.getRawImportedSiteArtifact, 0)
  assert.equal(calls.getRawTemplateSiteArtifact, 0)
  assert.equal(calls.getRawTemplateSiteAsset, 0)
  assert.equal(calls.listContentSlots, 0)
  assert.equal(calls.listContentOverrides, 0)
  assert.equal(calls.getSiteVersionArtifactBinding, 20)
  assert.equal(calls.getArtifactById, 20)
})

test('transformed preview blocks under high pool waiting count with deterministic backpressure error', async () => {
  const restore = setUnifiedRenderPreviewDependenciesForTest({
    getPoolStatus: () => ({ totalCount: 5, idleCount: 0, waitingCount: 99 }),
  })
  try {
    await assert.rejects(
      () => renderSiteVersionPreview({ siteVersionId: 'sv-bp', mode: 'transformed', requestCorrelationKey: 'req-bp-1' }),
      (error: unknown) =>
        error instanceof PreviewDbBackpressureError &&
        error.code === 'PREVIEW_DB_BACKPRESSURE' &&
        error.requestCorrelationKey === 'req-bp-1',
    )
  } finally {
    restore()
  }
})
