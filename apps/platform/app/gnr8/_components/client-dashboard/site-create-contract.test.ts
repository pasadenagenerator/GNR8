import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSiteCreateUiView } from '@/app/gnr8/_components/client-dashboard/site-create-contract'

test('site create UI contract resolves loading state first', () => {
  const view = resolveSiteCreateUiView({
    isLoadingTemplates: true,
    error: null,
    templatesCount: 10,
  })

  assert.equal(view, 'loading_templates')
})

test('site create UI contract resolves no_templates state when template list is empty', () => {
  const view = resolveSiteCreateUiView({
    isLoadingTemplates: false,
    error: null,
    templatesCount: 0,
  })

  assert.equal(view, 'no_templates')
})

test('site create UI contract resolves ready and error states deterministically', () => {
  assert.equal(
    resolveSiteCreateUiView({
      isLoadingTemplates: false,
      error: null,
      templatesCount: 1,
    }),
    'ready',
  )

  assert.equal(
    resolveSiteCreateUiView({
      isLoadingTemplates: false,
      error: 'Failed to load templates',
      templatesCount: 1,
    }),
    'error',
  )
})
