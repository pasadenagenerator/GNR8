import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSiteImportCreatePayload } from './site-import-create-payload'

test('create payload uses user supplied site name when provided', () => {
  const payload = buildSiteImportCreatePayload({
    userProvidedSiteName: '  My Imported Site  ',
    sourceUrl: 'https://example.com/path',
    documentTitle: 'Ignored Title',
    clientId: 'client-1',
    agencyId: 'agency-1',
  })

  assert.equal(payload.name, 'My Imported Site')
})

test('create payload uses hostname fallback when site name missing', () => {
  const payload = buildSiteImportCreatePayload({
    userProvidedSiteName: ' ',
    sourceUrl: 'https://brand.example.com/path',
    documentTitle: 'Ignored Title',
    clientId: 'client-1',
    agencyId: 'agency-1',
  })

  assert.equal(payload.name, 'brand.example.com')
})

test('create payload uses document title fallback when hostname unavailable', () => {
  const payload = buildSiteImportCreatePayload({
    userProvidedSiteName: null,
    sourceUrl: 'not-a-url',
    documentTitle: '  Imported From Title  ',
    clientId: 'client-1',
    agencyId: 'agency-1',
  })

  assert.equal(payload.name, 'Imported From Title')
})

test('create payload uses deterministic fallback and never emits null/empty name', () => {
  const payload = buildSiteImportCreatePayload({
    userProvidedSiteName: null,
    sourceUrl: ' ',
    documentTitle: ' ',
    clientId: 'client-1',
    agencyId: 'agency-1',
  })

  assert.equal(payload.name, 'Imported Site')
  assert.ok(typeof payload.name === 'string')
  assert.ok(payload.name.length > 0)
})
