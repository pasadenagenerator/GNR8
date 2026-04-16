import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatTagsForInput,
  parseTagsInputForForm,
  parseTemplateDetailPayload,
  resolveTemplateDetailUiState,
} from '@/app/gnr8/_components/client-dashboard/template-detail-contract'

test('template detail contract parses deterministic API payload', () => {
  const parsed = parseTemplateDetailPayload({
    ok: true,
    template: {
      id: 'template-1',
      clientId: 'client-1',
      name: 'Template One',
      tags: ['Brand', 'launch'],
      status: 'ready',
      importHealth: 'clean',
      sourceType: 'zip_html',
      sourceFilename: 'template.zip',
      entryHtmlFileName: 'index.html',
      templateType: 'single_page',
      preview: {
        available: true,
        isFallback: false,
        source: 'rendered_capture',
        imagePath: '/preview.png',
      },
      createdAt: '2026-04-16T10:00:00.000Z',
      updatedAt: '2026-04-16T10:01:00.000Z',
    },
  })

  assert.ok(parsed)
  assert.equal(parsed?.id, 'template-1')
  assert.equal(parsed?.entryHtmlFileName, 'index.html')
  assert.equal(parsed?.preview.source, 'rendered_capture')
})

test('template detail contract defaults and rejects malformed payloads', () => {
  assert.equal(parseTemplateDetailPayload({ ok: true }), null)

  const parsed = parseTemplateDetailPayload({
    ok: true,
    template: {
      id: 'template-1',
      clientId: 'client-1',
      name: 'Template One',
      tags: null,
      status: 'ready',
      importHealth: 'clean',
      sourceType: 'zip_html',
      sourceFilename: 'template.zip',
      entryHtmlFileName: null,
      templateType: 'unknown',
      preview: {
        available: false,
        isFallback: true,
        source: 'fallback',
        imagePath: null,
      },
      createdAt: '2026-04-16T10:00:00.000Z',
      updatedAt: '2026-04-16T10:01:00.000Z',
    },
  })

  assert.ok(parsed)
  assert.deepEqual(parsed?.tags, [])
})

test('tag normalization keeps deterministic ordering and dedupe', () => {
  const tags = parseTagsInputForForm(' Brand, launch,brand,  multi page ')
  assert.deepEqual(tags, ['brand', 'launch', 'multi-page'])
  assert.equal(formatTagsForInput(tags), 'brand, launch, multi-page')
})

test('template detail ui state resolves deterministic loading/error/auth/not-found', () => {
  assert.equal(resolveTemplateDetailUiState({ isLoading: true, httpStatus: null, hasTemplate: false, error: null }), 'loading')
  assert.equal(resolveTemplateDetailUiState({ isLoading: false, httpStatus: 403, hasTemplate: false, error: null }), 'unauthorized')
  assert.equal(resolveTemplateDetailUiState({ isLoading: false, httpStatus: 404, hasTemplate: false, error: null }), 'not_found')
  assert.equal(resolveTemplateDetailUiState({ isLoading: false, httpStatus: 500, hasTemplate: false, error: 'failed' }), 'error')
  assert.equal(resolveTemplateDetailUiState({ isLoading: false, httpStatus: 200, hasTemplate: true, error: null }), 'ready')
})
