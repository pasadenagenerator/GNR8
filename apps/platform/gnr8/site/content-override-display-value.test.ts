import assert from 'node:assert/strict'
import test from 'node:test'

import { getOverrideDisplayValue, getSlotOriginalDisplayValue } from '@/gnr8/site/content-override-display-value'

test('getOverrideDisplayValue supports { value: string }', () => {
  assert.equal(getOverrideDisplayValue({ valueJson: { value: 'Hello' } } as never, 'text'), 'Hello')
})

test('getOverrideDisplayValue preserves updated draft text from normalized payload shape', () => {
  assert.equal(getOverrideDisplayValue({ valueJson: { value: 'Updated draft copy' } } as never, 'rich_text'), 'Updated draft copy')
})

test('getOverrideDisplayValue supports raw string payload', () => {
  assert.equal(getOverrideDisplayValue({ valueJson: '/book' } as never, 'url'), '/book')
})

test('getOverrideDisplayValue supports image src payload shapes', () => {
  assert.equal(getOverrideDisplayValue({ valueJson: { src: '/a.jpg', alt: 'A' } } as never, 'image'), '/a.jpg')
  assert.equal(getOverrideDisplayValue({ valueJson: { value: { src: '/b.jpg', alt: 'B' } } } as never, 'image'), '/b.jpg')
})

test('getOverrideDisplayValue supports url href payload shape', () => {
  assert.equal(getOverrideDisplayValue({ valueJson: { href: '/contact' } } as never, 'url'), '/contact')
})

test('getSlotOriginalDisplayValue resolves source fallback', () => {
  assert.equal(getSlotOriginalDisplayValue({ sourceText: 'Title', sourceAssetPath: null } as never), 'Title')
  assert.equal(getSlotOriginalDisplayValue({ sourceText: null, sourceAssetPath: '/img.jpg' } as never), '/img.jpg')
})
