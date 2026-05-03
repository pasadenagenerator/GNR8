import assert from 'node:assert/strict'
import test from 'node:test'

import { applyContentOverridesToRawHtml, inferContentSlotsFromSemanticImport } from '@/gnr8/runtime/content-binding'
import type { SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'

const semantic: SemanticImportResult = {
  sourceMode: 'raw_html_only',
  captureMode: 'raw_html_only',
  title: null,
  language: 'en',
  navigation: [],
  hero: { title: 'Hello', subtitle: 'World', cta: { label: 'Start', url: '/start' }, image: null, confidence: 0.9, diagnostics: [] },
  sections: [],
  assets: { images: [], groupedByRole: { logo: [], hero_image: [], gallery_image: [], service_image: [], testimonial_avatar: [], content_image: [], icon: [], unknown: [] }, knownAssets: [] },
  diagnostics: [],
}

test('slot inference creates hero slots', () => {
  const html = '<!doctype html><html><body><main><section><h1>Hello</h1><p>World</p><a href="/start">Start</a></section></main></body></html>'
  const out = inferContentSlotsFromSemanticImport({ siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', html, semanticImport: semantic })
  assert.ok(out.slots.find((s) => s.slotKey === 'hero.title'))
  assert.ok(out.slots.find((s) => s.slotKey === 'hero.subtitle'))
  assert.ok(out.slots.find((s) => s.slotKey === 'hero.cta.label'))
  assert.ok(out.slots.find((s) => s.slotKey === 'hero.cta.href'))
})

test('runtime patcher applies text and href', () => {
  const html = '<!doctype html><html><body><main><section><h1>Hello</h1><a href="/start">Start</a></section></main></body></html>'
  const slots = inferContentSlotsFromSemanticImport({ siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', html, semanticImport: semantic }).slots
  const patched = applyContentOverridesToRawHtml({
    html,
    slots,
    overrides: [
      { id: '1', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'hero.title', valueType: 'text', valueJson: { value: 'New Title' }, status: 'published' },
      { id: '2', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'hero.cta.href', valueType: 'url', valueJson: { value: '/book' }, status: 'published' },
    ],
  })
  assert.match(patched.html, /New Title/)
  assert.match(patched.html, /href="\/book"/)
})
