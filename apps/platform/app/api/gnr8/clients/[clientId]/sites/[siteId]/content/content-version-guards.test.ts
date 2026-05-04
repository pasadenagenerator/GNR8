import assert from 'node:assert/strict'
import test from 'node:test'

import { ensureSlotBelongsToSiteVersion, requireContentSiteVersionId } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-version-guards'

test('requireContentSiteVersionId rejects missing site version', () => {
  const result = requireContentSiteVersionId(null)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'CONTENT_SITE_VERSION_REQUIRED')
})

test('requireContentSiteVersionId accepts explicit site version', () => {
  const result = requireContentSiteVersionId('sv_123')
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.siteVersionId, 'sv_123')
})

test('ensureSlotBelongsToSiteVersion rejects unknown slot', () => {
  const result = ensureSlotBelongsToSiteVersion({
    slots: [{ slotKey: 'hero.title', slotType: 'text' } as any],
    slotKey: 'hero.subtitle',
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'CONTENT_SLOT_VERSION_MISMATCH')
})

test('ensureSlotBelongsToSiteVersion returns matching slot', () => {
  const result = ensureSlotBelongsToSiteVersion({
    slots: [{ slotKey: 'hero.title', slotType: 'text' } as any],
    slotKey: 'hero.title',
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.slot.slotKey, 'hero.title')
})
