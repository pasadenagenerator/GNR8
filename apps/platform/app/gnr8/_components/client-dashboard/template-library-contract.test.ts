import assert from 'node:assert/strict'
import test from 'node:test'

import {
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
