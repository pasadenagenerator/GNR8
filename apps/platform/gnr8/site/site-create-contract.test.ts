import assert from 'node:assert/strict'
import test from 'node:test'

import { isReasonableDomain, normalizeDomain, parseCreateSiteFromTemplatePayload } from '@/gnr8/site/site-create-contract'

test('normalizeDomain lowercases, strips protocol, and strips trailing slash', () => {
  assert.equal(normalizeDomain('  HTTPS://Example.COM/  '), 'example.com')
  assert.equal(normalizeDomain('http://UPPERCASE.EXAMPLE.COM'), 'uppercase.example.com')
  assert.equal(normalizeDomain('example.com///'), 'example.com')
})

test('parseCreateSiteFromTemplatePayload enforces required fields deterministically', () => {
  const missingTemplate = parseCreateSiteFromTemplatePayload({
    name: 'Site Name',
    domain: 'example.com',
  })
  assert.equal(missingTemplate.ok, false)
  if (!missingTemplate.ok) assert.equal(missingTemplate.error, 'templateId is required.')

  const missingName = parseCreateSiteFromTemplatePayload({
    templateId: '00000000-0000-4000-8000-000000000901',
    domain: 'example.com',
  })
  assert.equal(missingName.ok, false)
  if (!missingName.ok) assert.equal(missingName.error, 'name is required.')

  const missingDomain = parseCreateSiteFromTemplatePayload({
    templateId: '00000000-0000-4000-8000-000000000901',
    name: 'Site Name',
  })
  assert.equal(missingDomain.ok, false)
  if (!missingDomain.ok) assert.equal(missingDomain.error, 'domain is required.')
})

test('isReasonableDomain rejects clearly invalid values', () => {
  assert.equal(isReasonableDomain('example.com/path'), false)
  assert.equal(isReasonableDomain('-example.com'), false)
  assert.equal(isReasonableDomain('exa mple.com'), false)
})
