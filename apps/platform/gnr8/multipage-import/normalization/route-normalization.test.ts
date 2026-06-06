import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateMultipageSameSiteUrl } from './route-normalization'

test('same-site evaluation accepts apex and www when canonical seed evidence matches', () => {
  const result = evaluateMultipageSameSiteUrl({
    seedUrl: 'https://www.example.com/',
    candidateUrl: 'https://example.com/about',
    evidenceUrls: ['https://example.com/about'],
  })

  assert.equal(result.accepted, true)
  assert.equal(result.canonicalHostEquivalent, true)
  assert.equal(result.normalizedHost, 'example.com')
  assert.equal(result.finalHost, 'example.com')
})

test('same-site evaluation accepts www final URL for canonicalized apex discovered URL', () => {
  const result = evaluateMultipageSameSiteUrl({
    seedUrl: 'https://www.example.com/',
    candidateUrl: 'https://www.example.com/about',
    evidenceUrls: ['https://example.com/about', 'https://www.example.com/about'],
  })

  assert.equal(result.accepted, true)
  assert.equal(result.canonicalHostEquivalent, false)
  assert.equal(result.exactOrigin, true)
})

test('same-site evaluation rejects sibling subdomains', () => {
  const result = evaluateMultipageSameSiteUrl({
    seedUrl: 'https://www.example.com/',
    candidateUrl: 'https://blog.example.com/about',
    evidenceUrls: ['https://blog.example.com/about'],
  })

  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'different_canonical_host')
})

test('same-site evaluation rejects different domains', () => {
  const result = evaluateMultipageSameSiteUrl({
    seedUrl: 'https://www.example.com/',
    candidateUrl: 'https://example.net/about',
    evidenceUrls: ['https://example.net/about'],
  })

  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'different_canonical_host')
})

test('same-site evaluation keeps scheme deterministic', () => {
  const result = evaluateMultipageSameSiteUrl({
    seedUrl: 'https://www.example.com/',
    candidateUrl: 'http://example.com/about',
    evidenceUrls: ['http://example.com/about'],
  })

  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'different_scheme')
})

test('same-site evaluation keeps ports strict', () => {
  const result = evaluateMultipageSameSiteUrl({
    seedUrl: 'https://www.example.com:8443/',
    candidateUrl: 'https://example.com/about',
    evidenceUrls: ['https://example.com/about'],
  })

  assert.equal(result.accepted, false)
  assert.equal(result.reason, 'different_port')
})
