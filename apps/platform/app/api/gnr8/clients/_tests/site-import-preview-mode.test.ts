import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveImportPreview } from '@/gnr8/site/import-preview-resolution'

test('degraded import resolves preview to raw_html_fallback', () => {
  const out = resolveImportPreview({
    pipelineMode: 'degraded_html_fallback',
    preparedSite: { documents: [{ id: 'doc-1' }], siteSummary: { effectivelyEmpty: false } },
    renderOutput: { kind: 'render_output_v1' },
    structuredHtmlLength: 120,
    rawHtmlLength: 88,
  })

  assert.equal(out.previewMode, 'raw_html_fallback')
  assert.equal(out.htmlLength, 88)
  assert.equal(out.diagnostics.includes('SITE_IMPORT_PREVIEW_FALLBACK_USED'), true)
})

test('structured import resolves preview to structured', () => {
  const out = resolveImportPreview({
    pipelineMode: 'strict',
    preparedSite: { documents: [{ id: 'doc-1' }], siteSummary: { effectivelyEmpty: false } },
    renderOutput: { kind: 'render_output_v1' },
    structuredHtmlLength: 240,
    rawHtmlLength: 64,
  })

  assert.equal(out.previewMode, 'structured')
  assert.equal(out.htmlLength, 240)
  assert.equal(out.diagnostics.includes('SITE_IMPORT_PREVIEW_STRUCTURED_USED'), true)
})

test('preview resolution fails when no HTML is available', () => {
  assert.throws(
    () =>
      resolveImportPreview({
        pipelineMode: 'degraded_html_fallback',
        preparedSite: null,
        renderOutput: null,
        structuredHtmlLength: 0,
        rawHtmlLength: 0,
      }),
    /SITE_IMPORT_PREVIEW_FAILED_NO_HTML/,
  )
})
