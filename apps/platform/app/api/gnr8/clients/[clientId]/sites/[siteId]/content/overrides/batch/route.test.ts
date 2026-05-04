import assert from 'node:assert/strict'
import test from 'node:test'

import { planBatchDraftUpserts } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/batch/batch-overrides-route-helpers'

test('batch override plan accepts multiple valid slots in one pass', () => {
  const result = planBatchDraftUpserts({
    slots: [
      { slotKey: 'hero.title', slotType: 'text' },
      { slotKey: 'hero.cta.href', slotType: 'url' },
    ],
    overrides: [
      { slotKey: 'hero.title', value: 'New Hero', status: 'draft' },
      { slotKey: 'hero.cta.href', value: '/book', status: 'draft' },
    ],
  })

  assert.equal(result.valid.length, 2)
  assert.equal(result.skippedCount, 0)
  assert.deepEqual(result.diagnostics, [])
})

test('batch override plan skips invalid slot keys and non-draft statuses', () => {
  const result = planBatchDraftUpserts({
    slots: [{ slotKey: 'hero.title', slotType: 'text' }],
    overrides: [
      { slotKey: 'hero.subtitle', value: 'No slot', status: 'draft' },
      { slotKey: 'hero.title', value: 'Ignored publish status', status: 'published' },
      { slotKey: 'hero.title', value: 'Saved', status: 'draft' },
    ],
  })

  assert.equal(result.valid.length, 1)
  assert.equal(result.skippedCount, 2)
  assert.ok(result.diagnostics.includes('CONTENT_BATCH_SLOT_INVALID'))
  assert.ok(result.diagnostics.includes('CONTENT_BATCH_SLOT_SKIPPED'))
})

test('batch override plan accepts rich_text and skips unsupported list slots', () => {
  const result = planBatchDraftUpserts({
    slots: [
      { slotKey: 'hero.body', slotType: 'rich_text' },
      { slotKey: 'faq.items', slotType: 'list' },
    ],
    overrides: [
      { slotKey: 'hero.body', value: '<p>Updated body</p>', status: 'draft' },
      { slotKey: 'faq.items', value: '["one","two"]', status: 'draft' },
    ],
  })

  assert.equal(result.valid.length, 1)
  assert.equal(result.valid[0]?.valueType, 'rich_text')
  assert.equal(result.skippedCount, 1)
  assert.ok(result.diagnostics.includes('CONTENT_BATCH_SLOT_SKIPPED_UNSUPPORTED_TYPE'))
})
