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
  const bySlot = Object.fromEntries(selected.map((override) => [override.slotKey, override]))
  assert.equal(bySlot['hero.title']?.valueJson?.value, 'correct version draft')
  assert.equal(bySlot['hero.subtitle']?.valueJson?.value, 'published subtitle')
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

  assert.equal(calls.getSiteVersion, 20)
  assert.equal(calls.getRawImportedSiteArtifact, 20)
  assert.equal(calls.getRawTemplateSiteArtifact, 0)
  assert.equal(calls.getRawTemplateSiteAsset, 20)
  assert.equal(calls.listContentSlots, 20)
  assert.equal(calls.listContentOverrides, 40)
  assert.equal(calls.getSiteVersionArtifactBinding, 0)
  assert.equal(calls.getArtifactById, 0)
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
