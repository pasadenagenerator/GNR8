import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseTemplateUploadResponse,
  resolveTemplateUploadUiState,
  resolveTemplateEditHref,
  resolveTemplateLibraryCards,
  resolveTemplateLibraryUiView,
} from '@/app/gnr8/_components/client-dashboard/template-library-contract'

function hasFunctionValue(value: unknown): boolean {
  if (typeof value === 'function') return true
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => hasFunctionValue(item))
  return Object.values(value).some((item) => hasFunctionValue(item))
}

test('template library UI contract shows empty state for valid scope with no templates', () => {
  const view = resolveTemplateLibraryUiView({
    isLoading: false,
    error: null,
    templatesCount: 0,
  })

  assert.equal(view, 'empty')
})

test('template library UI contract shows error state when scope access fails', () => {
  const view = resolveTemplateLibraryUiView({
    isLoading: false,
    error: 'No client membership found for current account.',
    templatesCount: 0,
  })

  assert.equal(view, 'error')
})

test('template library UI contract prioritizes loading and list states deterministically', () => {
  assert.equal(
    resolveTemplateLibraryUiView({
      isLoading: true,
      error: null,
      templatesCount: 0,
    }),
    'loading',
  )
  assert.equal(
    resolveTemplateLibraryUiView({
      isLoading: false,
      error: null,
      templatesCount: 2,
    }),
    'list',
  )
})

test('template library contract deterministically resolves edit href', () => {
  const editHref = resolveTemplateEditHref({
    templateId: 'template 123',
    templateRouteBase: '/gnr8/agency/clients/client-1/templates',
    templateRouteQuery: '?agency=agency-1&admin_view=1',
  })

  assert.equal(
    editHref,
    '/gnr8/agency/clients/client-1/templates/template%20123?agency=agency-1&admin_view=1',
  )
})

test('template library card contract includes editHref and remains serializable', () => {
  const cards = resolveTemplateLibraryCards({
    templateRouteBase: '/gnr8/agency/clients/client-1/templates',
    templateRouteQuery: 'agency=agency-1',
    templates: [
      {
        id: 'template-older',
        name: 'Older',
        slug: 'older',
        sourceType: 'zip_html',
        status: 'ready',
        importHealth: 'clean',
        tags: ['a'],
        sourceFilename: 'older.zip',
        entryHtmlFileName: 'index.html',
        templateType: 'single_page',
        preview: {
          available: true,
          isFallback: false,
          source: 'rendered_capture',
          imagePath: '/preview/older.png',
        },
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'template-newer',
        name: 'Newer',
        slug: 'newer',
        sourceType: 'zip_html',
        status: 'uploaded',
        importHealth: 'degraded',
        tags: ['b'],
        sourceFilename: 'newer.zip',
        entryHtmlFileName: null,
        templateType: 'multi_page',
        preview: {
          available: false,
          isFallback: true,
          source: 'fallback',
          imagePath: null,
        },
        createdAt: '2026-04-02T00:00:00.000Z',
      },
    ],
  })

  assert.equal(cards[0]?.id, 'template-newer')
  assert.equal(cards[0]?.editHref, '/gnr8/agency/clients/client-1/templates/template-newer?agency=agency-1')
  assert.equal(cards[1]?.id, 'template-older')
  assert.equal(cards[1]?.editHref, '/gnr8/agency/clients/client-1/templates/template-older?agency=agency-1')
  assert.equal(hasFunctionValue(cards), false)
  assert.doesNotThrow(() => JSON.stringify(cards))
})

test('upload contract accepts degraded no-preview html_snapshot success payload', () => {
  const parsed = parseTemplateUploadResponse({
    httpStatus: 200,
    payload: {
      ok: true,
      id: 'template-1',
      templateId: 'template-1',
      sourceType: 'zip_html',
      status: 'ready',
      name: 'Landing Template',
      tags: ['landing'],
      importHealth: 'degraded',
      entryHtmlFileName: 'index.html',
      templateType: 'single_page',
      preview: {
        available: false,
        isFallback: true,
        source: 'html_snapshot',
        imagePath: null,
      },
    },
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.value.id, 'template-1')
  assert.equal(parsed.value.health, 'degraded')
  assert.equal(parsed.value.importHealth, 'degraded')
  assert.equal(parsed.value.preview.source, 'html_snapshot')
  assert.equal(parsed.value.preview.available, false)
})

test('upload contract accepts health alias when importHealth field is missing', () => {
  const parsed = parseTemplateUploadResponse({
    httpStatus: 200,
    payload: {
      ok: true,
      templateId: 'template-health-only',
      sourceType: 'zip_html',
      status: 'ready',
      name: 'Health Alias',
      tags: [],
      health: 'degraded',
      entryHtmlFileName: 'index.html',
      templateType: 'single_page',
      preview: {
        available: false,
        isFallback: true,
        source: 'html_snapshot',
        imagePath: null,
      },
    },
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.value.id, 'template-health-only')
  assert.equal(parsed.value.importHealth, 'degraded')
  assert.equal(parsed.value.health, 'degraded')
})

test('upload contract allows 2xx success fallback when status/health are usable', () => {
  const parsed = parseTemplateUploadResponse({
    httpStatus: 200,
    payload: {
      ok: false,
      templateId: 'template-2',
      sourceType: 'zip_html',
      status: 'ready',
      name: 'Fallback Success',
      tags: [],
      importHealth: 'degraded',
      entryHtmlFileName: null,
      templateType: 'unknown',
      preview: {
        available: false,
        isFallback: true,
        source: 'html_snapshot',
        imagePath: null,
      },
    },
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.value.templateId, 'template-2')
})

test('upload contract preserves true failure for invalid ZIP response', () => {
  const parsed = parseTemplateUploadResponse({
    httpStatus: 400,
    payload: {
      ok: false,
      error: 'ZIP file could not be processed.',
    },
  })

  assert.equal(parsed.ok, false)
  if (parsed.ok) return
  assert.equal(parsed.error, 'ZIP file could not be processed.')
})

test('client upload branch treats degraded success as success and clears upload error', () => {
  const parsed = parseTemplateUploadResponse({
    httpStatus: 200,
    payload: {
      ok: true,
      id: 'template-ui-1',
      templateId: 'template-ui-1',
      sourceType: 'zip_html',
      status: 'ready',
      name: 'UI Success',
      tags: [],
      importHealth: 'degraded',
      entryHtmlFileName: 'index.html',
      templateType: 'single_page',
      preview: {
        available: false,
        isFallback: true,
        source: 'html_snapshot',
        imagePath: null,
      },
    },
  })

  const uiState = resolveTemplateUploadUiState(parsed)
  assert.equal(uiState.isSuccess, true)
  assert.equal(uiState.uploadError, null)
})

test('client upload branch keeps invalid ZIP error in upload state', () => {
  const parsed = parseTemplateUploadResponse({
    httpStatus: 400,
    payload: {
      ok: false,
      error: 'ZIP file could not be processed.',
    },
  })

  const uiState = resolveTemplateUploadUiState(parsed)
  assert.equal(uiState.isSuccess, false)
  assert.equal(uiState.uploadError, 'ZIP file could not be processed.')
})
