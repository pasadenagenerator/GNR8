import assert from 'node:assert/strict'
import test from 'node:test'

import { inferSiteLabel, normalizeSiteStatus, toSiteEntity } from '@/gnr8/site/site-entity'

test('toSiteEntity returns null for missing site row', () => {
  assert.equal(toSiteEntity(null), null)
})

test('normalizeSiteStatus maps known states and falls back to unknown', () => {
  assert.equal(normalizeSiteStatus('live'), 'live')
  assert.equal(normalizeSiteStatus('preview-ready'), 'preview_ready')
  assert.equal(normalizeSiteStatus('something_unexpected'), 'unknown')
})

test('inferSiteLabel prioritizes explicit label then domain then short id', () => {
  assert.equal(inferSiteLabel({ id: 'abcdef12-aaaa-bbbb-cccc-abcdef123456', explicitLabel: 'Primary Site' }), 'Primary Site')
  assert.equal(inferSiteLabel({ id: 'abcdef12-aaaa-bbbb-cccc-abcdef123456', domain: 'example.com' }), 'example.com')
  assert.match(inferSiteLabel({ id: 'abcdef12-aaaa-bbbb-cccc-abcdef123456' }), /^Site /)
})
