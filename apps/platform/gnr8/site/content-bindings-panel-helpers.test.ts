import assert from 'node:assert/strict'
import test from 'node:test'

import { detectFieldDraftState, friendlySlotLabel, sectionTitle, slotGroupKey } from '@/gnr8/site/content-bindings-panel-helpers'

test('friendlySlotLabel maps known slot keys to editor-friendly labels', () => {
  assert.equal(friendlySlotLabel('hero.cta.href'), 'Button link')
  assert.equal(friendlySlotLabel('sections.2.items.1.title'), 'Item 2 title')
  assert.equal(friendlySlotLabel('sections.3.gallery.0.alt'), 'Gallery image 1 alt text')
  assert.equal(friendlySlotLabel('sections.4.contact.phone'), 'Phone')
  assert.equal(friendlySlotLabel('footer.links.0.href'), 'Footer link 1 URL')
})

test('sectionTitle renders readable section heading', () => {
  assert.equal(sectionTitle({ index: 2, type: 'services' }), 'Section 3 · Services')
  assert.equal(sectionTitle({ index: 1, type: 'unknown_type' }), 'Section 2')
})

test('slotGroupKey groups item/gallery/contact slot paths', () => {
  assert.equal(slotGroupKey('sections.0.items.1.title'), 'sections.0.items.1')
  assert.equal(slotGroupKey('sections.0.gallery.2.alt'), 'sections.0.gallery.2')
  assert.equal(slotGroupKey('sections.1.contact.email'), 'sections.1.contact')
  assert.equal(slotGroupKey('hero.title'), 'hero.title')
})

test('detectFieldDraftState identifies original, draft pending, and published states', () => {
  assert.equal(detectFieldDraftState({ slotKey: 'hero.title', draftValue: undefined, publishedValue: undefined }), 'using_original')
  assert.equal(detectFieldDraftState({ slotKey: 'hero.title', draftValue: 'A', publishedValue: 'B' }), 'draft_pending')
  assert.equal(detectFieldDraftState({ slotKey: 'hero.title', draftValue: 'A', publishedValue: 'A' }), 'published')
  assert.equal(detectFieldDraftState({ slotKey: 'hero.title', draftValue: undefined, publishedValue: 'A' }), 'published_override')
})

