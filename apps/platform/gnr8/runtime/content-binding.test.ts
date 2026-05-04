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
  sections: [
    {
      id: 'sec_services',
      type: 'services',
      title: 'Services',
      intro: 'What we offer',
      items: [
        { title: 'Cut', description: 'Precision haircut', image: '/assets/cut.jpg' },
        { title: 'Color', description: 'Hair coloring' },
      ],
      images: [],
      ctas: [{ label: 'Book now', url: '/book' }],
      forms: [],
      confidence: 0.9,
      diagnostics: [],
    },
    {
      id: 'sec_gallery',
      type: 'gallery',
      title: 'Gallery',
      intro: null,
      items: [],
      images: [{ src: '/assets/g1.jpg', alt: 'Before after' }],
      ctas: [],
      forms: [],
      confidence: 0.8,
      diagnostics: [],
    },
    {
      id: 'sec_contact',
      type: 'contact',
      title: 'Contact us',
      intro: 'Email hello@site.com or call +1 555 111 2222',
      items: [{ address: '123 Main Street' }],
      images: [],
      ctas: [],
      forms: [],
      confidence: 0.8,
      diagnostics: [],
    },
  ],
  assets: { images: [], groupedByRole: { logo: [], hero_image: [], gallery_image: [], service_image: [], testimonial_avatar: [], content_image: [], icon: [], unknown: [] }, knownAssets: [] },
  diagnostics: [],
}

test('slot inference creates hero and section slots', () => {
  const html = '<!doctype html><html><body><main><section><h1>Hello</h1><p>World</p><a href="/start">Start</a></section><section><h2>Services</h2><p>What we offer</p><article><h3>Cut</h3><p>Precision haircut</p><img src="/assets/cut.jpg" /></article><article><h3>Color</h3><p>Hair coloring</p></article><a href="/book">Book now</a></section><section><h2>Gallery</h2><img src="/assets/g1.jpg" alt="Before after" /></section><section><h2>Contact us</h2><a href="mailto:hello@site.com">hello@site.com</a><a href="tel:+15551112222">+1 555 111 2222</a><p>123 Main Street</p></section></main></body></html>'
  const out = inferContentSlotsFromSemanticImport({ siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', html, semanticImport: semantic })
  assert.ok(out.slots.find((s) => s.slotKey === 'hero.title'))
  assert.ok(out.slots.find((s) => s.slotKey === 'sections.0.heading'))
  assert.ok(out.slots.find((s) => s.slotKey === 'sections.0.items.0.title'))
  assert.ok(out.slots.find((s) => s.slotKey === 'sections.1.gallery.0.image'))
  assert.ok(out.slots.find((s) => s.slotKey === 'sections.2.contact.email'))
})

test('duplicate text becomes low confidence and missing selector is safe', () => {
  const html = '<!doctype html><html><body><h2>Services</h2><h2>Services</h2></body></html>'
  const out = inferContentSlotsFromSemanticImport({ siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', html, semanticImport: semantic })
  assert.equal(out.diagnostics.includes('SECTION_SLOT_LOW_CONFIDENCE'), true)
  assert.equal(out.diagnostics.includes('SECTION_SLOT_SELECTOR_MISSING'), true)
})

test('runtime patcher applies section text/url/image and contact mailto', () => {
  const html = '<!doctype html><html><body><main><section><h2>Services</h2><article><h3>Cut</h3><p>Precision haircut</p><img src="/assets/cut.jpg" /></article><a href="/book">Book now</a></section><section><img src="/assets/g1.jpg" alt="Before after" /></section><section><a href="mailto:hello@site.com">hello@site.com</a></section></main></body></html>'
  const slots = inferContentSlotsFromSemanticImport({ siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', html, semanticImport: semantic }).slots
  const patched = applyContentOverridesToRawHtml({
    html,
    slots,
    overrides: [
      { id: '1', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'sections.0.items.0.title', valueType: 'text', valueJson: { value: 'Haircut Deluxe' }, status: 'published' },
      { id: '2', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'sections.0.items.0.description', valueType: 'text', valueJson: { value: 'Sharper style' }, status: 'published' },
      { id: '3', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'sections.1.gallery.0.image', valueType: 'image', valueJson: { value: '/assets/new.jpg' }, status: 'published' },
      { id: '4', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'sections.0.cta.href', valueType: 'url', valueJson: { value: '/book-now' }, status: 'published' },
      { id: '5', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'sections.2.contact.email', valueType: 'text', valueJson: { value: 'team@site.com' }, status: 'published' },
      { id: '6', siteId: 'site_1', siteVersionId: '11111111-1111-4111-8111-111111111111', slotKey: 'sections.9.heading', valueType: 'text', valueJson: { value: 'skip me' }, status: 'published' },
    ],
  })
  assert.match(patched.html, /Haircut Deluxe/)
  assert.match(patched.html, /Sharper style/)
  assert.match(patched.html, /src="\/assets\/new\.jpg"/)
  assert.match(patched.html, /href="\/book-now"/)
  assert.match(patched.html, /mailto:team@site.com/)
  assert.equal(patched.skippedCount > 0, true)
})
