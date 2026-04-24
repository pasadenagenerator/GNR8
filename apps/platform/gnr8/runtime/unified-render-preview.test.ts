import assert from 'node:assert/strict'
import test from 'node:test'

import {
  __unifiedRenderPreviewTestUtils,
  SiteVersionPreviewUnavailableError,
} from '@/gnr8/runtime/unified-render-preview'

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
