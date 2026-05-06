import assert from 'node:assert/strict'
import test from 'node:test'

import { extractTitleFromHtmlDocument, resolveImportedSiteName } from './site-import-site-name'

test('uses user supplied site name when provided', () => {
  const result = resolveImportedSiteName({
    userProvidedName: '  My Site  ',
    sourceUrl: 'https://example.com',
    documentTitle: 'Doc Title',
  })
  assert.equal(result.resolvedName, 'My Site')
  assert.equal(result.source, 'user_provided')
})

test('uses hostname fallback when user supplied site name is missing', () => {
  const result = resolveImportedSiteName({
    sourceUrl: 'https://subdomain.example.com/path',
    documentTitle: 'Doc Title',
  })
  assert.equal(result.resolvedName, 'subdomain.example.com')
  assert.equal(result.source, 'url_hostname')
})

test('uses document title fallback when hostname is unavailable', () => {
  const result = resolveImportedSiteName({
    sourceUrl: 'not-a-url',
    documentTitle: '  Imported From Document  ',
  })
  assert.equal(result.resolvedName, 'Imported From Document')
  assert.equal(result.source, 'document_title')
})

test('uses deterministic fallback and never resolves to null/empty', () => {
  const result = resolveImportedSiteName({
    userProvidedName: ' ',
    sourceUrl: ' ',
    documentTitle: ' ',
  })
  assert.equal(result.resolvedName, 'Imported Site')
  assert.equal(result.source, 'deterministic_fallback')
  assert.ok(result.resolvedName.length > 0)
})

test('extracts document title from html', () => {
  assert.equal(
    extractTitleFromHtmlDocument('<!doctype html><html><head><title>  Hello   World  </title></head></html>'),
    'Hello World',
  )
})
