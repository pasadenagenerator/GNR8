import assert from 'node:assert/strict'
import test from 'node:test'

import {
  __unifiedRenderPreviewTestUtils,
  SiteVersionPreviewUnavailableError,
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
    '<body><img src="/images/logo.png"><script src="scripts/app.js"></script></body>',
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
  assert.equal(rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/images/logo.png'), true)
  assert.equal(
    rewritten.includes('/api/gnr8/runtime/preview-assets/site-raw/sv-raw/nested/site/scripts/app.js'),
    true,
  )
})

test('preview override selection prefers draft and blocks cross-version overrides', () => {
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
    ],
  })

  assert.equal(selected.length, 1)
  assert.equal(selected[0]?.valueJson?.value, 'correct version draft')
})
