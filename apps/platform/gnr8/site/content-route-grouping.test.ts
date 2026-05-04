import assert from 'node:assert/strict'
import test from 'node:test'

import type { ContentSlot } from '@/gnr8/runtime/content-binding'
import { groupedContentLooksEmpty, groupSlots } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/route'

function slot(slotKey: string, sourceText: string | null = 'x'): ContentSlot {
  return {
    id: `slot-${slotKey}`,
    siteId: 'runtime-site-1',
    siteVersionId: '00000000-0000-4000-8000-000000000001',
    slotKey,
    slotType: 'text',
    sourceSelector: '[data-test]',
    sourceText,
    sourceAssetPath: null,
    confidence: 1,
    diagnostics: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

test('groupSlots produces hero and sections when slots exist', () => {
  const grouped = groupSlots([
    slot('hero.title', 'Hero heading'),
    slot('hero.subtitle', 'Hero subtitle'),
    slot('sections.0.type', 'services'),
    slot('sections.0.heading', 'Our services'),
    slot('sections.0.items.0.title', 'Service A'),
  ])

  assert.equal(grouped.hero.length >= 1, true)
  assert.equal(grouped.sections.length, 1)
  assert.equal(grouped.sections[0]?.titleSlot?.slotKey, 'sections.0.heading')
})

test('groupSlots keeps section rows for unknown section types', () => {
  const grouped = groupSlots([
    slot('sections.0.type', 'weird_custom_type'),
    slot('sections.0.heading', 'Custom heading'),
  ])

  assert.equal(grouped.sections.length, 1)
  assert.equal(grouped.sections[0]?.type, 'weird_custom_type')
})

test('groupedContentLooksEmpty only true when all grouped buckets are empty', () => {
  assert.equal(groupedContentLooksEmpty({ hero: [], sections: [], footer: [] }), true)
  assert.equal(groupedContentLooksEmpty({ hero: [slot('hero.title')], sections: [], footer: [] }), false)
})

