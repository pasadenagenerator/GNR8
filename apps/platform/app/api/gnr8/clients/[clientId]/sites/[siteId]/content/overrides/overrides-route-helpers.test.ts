import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSingleDraftSavePayload } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/overrides-route-helpers'

test('single save normalizes valueJson payload shape', () => {
  const result = normalizeSingleDraftSavePayload({
    slotType: 'text',
    body: { valueType: 'text', valueJson: { value: 'Hello world' }, status: 'draft' },
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.valueJson, { value: 'Hello world' })
})

test('single save normalizes primitive value payload shape', () => {
  const result = normalizeSingleDraftSavePayload({
    slotType: 'text',
    body: { value: 'Hello world', status: 'draft' },
  })
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.valueJson, { value: 'Hello world' })
})

test('single save rejects mismatched valueType', () => {
  const result = normalizeSingleDraftSavePayload({
    slotType: 'text',
    body: { valueType: 'url', valueJson: { value: '/about' }, status: 'draft' },
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.reasonCode, 'CONTENT_DRAFT_SAVE_VALUE_TYPE_MISMATCH')
})
