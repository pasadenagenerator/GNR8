import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSiteVersionPreviewUrl,
  normalizeSiteVersionPreviewMode,
  resolveSiteWorkspacePreview,
} from '@/gnr8/site/site-preview-contract'

test('normalizeSiteVersionPreviewMode defaults safely to debug', () => {
  assert.equal(normalizeSiteVersionPreviewMode('transformed'), 'transformed')
  assert.equal(normalizeSiteVersionPreviewMode('raw_template_preview'), 'raw_template_preview')
  assert.equal(normalizeSiteVersionPreviewMode('debug'), 'debug')
  assert.equal(normalizeSiteVersionPreviewMode('unknown'), 'debug')
})

test('buildSiteVersionPreviewUrl keeps transformed/debug paths explicit', () => {
  assert.equal(
    buildSiteVersionPreviewUrl({
      siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
      mode: 'transformed',
    }),
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=transformed',
  )
  assert.equal(
    buildSiteVersionPreviewUrl({
      siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
      mode: 'debug',
    }),
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=debug',
  )
  assert.equal(
    buildSiteVersionPreviewUrl({
      siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
      mode: 'raw_template_preview',
    }),
    '/api/gnr8/runtime/versions/8ce51f31-92ff-4ef4-a543-e1177dfe780d/preview?mode=raw_template_preview',
  )
})

test('resolveSiteWorkspacePreview prefers transformed preview as primary source', () => {
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    transformedPreviewAvailable: true,
    debugPreviewAvailable: true,
    importCaptured: true,
    previewRuntimeSummary: {
      previewMode: 'react_preview_degraded',
      rendererContractAvailable: true,
      finalSiteModelAvailable: true,
      familyRenderUsed: true,
      familyRenderFamilyId: 'family_marketing_root',
      familyRenderMode: 'hybrid_family_page',
      familyRenderFallbackToPage: false,
      familyRenderDiagnosticsCount: 1,
      familyRenderDiagnostics: ['FAMILY_RENDER_MODE_SELECTED'],
      renderedWithFallback: true,
      matchedPageId: 'page-home',
      contentResolutionApplied: true,
      resolvedContentCount: 12,
      unresolvedContentCount: 2,
      contentResolutionDegraded: true,
      contentResolutionDiagnostics: ['CONTENT_RESOLUTION_DEGRADED'],
      previewDiagnostics: ['PREVIEW_REAL_REACT_RENDER_DEGRADED'],
    },
  })

  assert.equal(resolved.status, 'preview_available')
  assert.equal(resolved.sourceType, 'transformed')
  assert.equal(resolved.previewMode, 'react_preview_degraded')
  assert.equal(resolved.previewRuntimeSummary?.matchedPageId, 'page-home')
  assert.equal(resolved.familyRenderUsed, true)
  assert.equal(resolved.familyRenderMode, 'hybrid_family_page')
  assert.equal(resolved.familyRenderFamilyId, 'family_marketing_root')
  assert.equal(resolved.familyRenderFallbackToPage, false)
  assert.equal(resolved.familyRenderDiagnosticsCount, 1)
  assert.deepEqual(resolved.familyRenderDiagnostics, ['FAMILY_RENDER_MODE_SELECTED'])
  assert.equal(resolved.mainPreviewUrl, resolved.transformedPreviewUrl)
  assert.ok(resolved.debugPreviewUrl)
})

test('resolveSiteWorkspacePreview keeps debug preview separate from transformed preview', () => {
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    transformedPreviewAvailable: false,
    debugPreviewAvailable: true,
    importCaptured: true,
  })

  assert.equal(resolved.status, 'debug_only_artifact_available')
  assert.equal(resolved.sourceType, 'debug_inspect')
  assert.equal(resolved.mainPreviewUrl, null)
  assert.equal(resolved.transformedPreviewUrl, null)
  assert.ok(resolved.debugPreviewUrl)
})

test('resolveSiteWorkspacePreview reports import-captured-no-transform fallback clearly', () => {
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    transformedPreviewAvailable: false,
    debugPreviewAvailable: false,
    importCaptured: true,
  })

  assert.equal(resolved.status, 'import_captured_not_transformed')
  assert.equal(resolved.mainPreviewUrl, null)
  assert.ok(resolved.diagnostics.length > 0)
})

test('resolveSiteWorkspacePreview handles no-preview state safely', () => {
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: null,
    transformedPreviewAvailable: false,
    debugPreviewAvailable: false,
    importCaptured: false,
  })

  assert.equal(resolved.status, 'preview_unavailable')
  assert.equal(resolved.mainPreviewUrl, null)
  assert.equal(resolved.debugPreviewUrl, null)
  assert.equal(resolved.familyRenderUsed, false)
  assert.equal(resolved.familyRenderMode, null)
  assert.equal(resolved.familyRenderFamilyId, null)
  assert.equal(resolved.familyRenderFallbackToPage, false)
  assert.equal(resolved.familyRenderDiagnosticsCount, 0)
  assert.deepEqual(resolved.familyRenderDiagnostics, [])
})

test('resolveSiteWorkspacePreview safely defaults family truth when legacy summary lacks family fields', () => {
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    transformedPreviewAvailable: true,
    debugPreviewAvailable: false,
    importCaptured: true,
    previewRuntimeSummary: {
      previewMode: 'react_preview',
      rendererContractAvailable: true,
      finalSiteModelAvailable: true,
      renderedWithFallback: false,
      matchedPageId: 'page-home',
      contentResolutionApplied: true,
      resolvedContentCount: 1,
      unresolvedContentCount: 0,
      contentResolutionDegraded: false,
      contentResolutionDiagnostics: [],
      previewDiagnostics: ['PREVIEW_MODE_PERSISTED'],
    } as any,
  })

  assert.equal(resolved.familyRenderUsed, false)
  assert.equal(resolved.familyRenderMode, null)
  assert.equal(resolved.familyRenderFamilyId, null)
  assert.equal(resolved.familyRenderFallbackToPage, false)
  assert.equal(resolved.familyRenderDiagnosticsCount, 0)
  assert.deepEqual(resolved.familyRenderDiagnostics, [])
})

test('resolveSiteWorkspacePreview never returns missing-runtime diagnostic when seeded site version exists', () => {
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: '8ce51f31-92ff-4ef4-a543-e1177dfe780d',
    transformedPreviewAvailable: true,
    debugPreviewAvailable: false,
    importCaptured: true,
  })

  assert.equal(resolved.status, 'preview_available')
  assert.equal(
    resolved.diagnostics.some((entry) => entry.includes('No runtime site version is available for preview')),
    false,
  )
})
