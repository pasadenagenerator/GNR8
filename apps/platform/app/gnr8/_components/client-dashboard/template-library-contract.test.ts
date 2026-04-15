import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveTemplateLibraryUiView } from '@/app/gnr8/_components/client-dashboard/template-library-contract'

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
