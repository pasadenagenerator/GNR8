import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyDomainType,
  computeDomainDnsInstructions,
  normalizeDomainForDns,
} from '@/src/lib/vercel/domain-dns-instructions'

test('classifyDomainType identifies apex domains', () => {
  assert.equal(classifyDomainType('example.com'), 'apex_domain')
  assert.equal(classifyDomainType('pasadenagenerator.com'), 'apex_domain')
})

test('classifyDomainType identifies subdomains', () => {
  assert.equal(classifyDomainType('www.example.com'), 'subdomain')
  assert.equal(classifyDomainType('beauty-clinic.pasadenagenerator.com'), 'subdomain')
  assert.equal(classifyDomainType('shop.client.com'), 'subdomain')
})

test('classifyDomainType identifies wildcard domains', () => {
  assert.equal(classifyDomainType('*.example.com'), 'wildcard_domain')
})

test('computeDomainDnsInstructions recommends CNAME for subdomains when Vercel config is absent', () => {
  const out = computeDomainDnsInstructions({
    domain: 'beauty-clinic.pasadenagenerator.com',
    vercelStatus: {
      verification: null,
      routing: null,
    },
  })

  assert.equal(out.domainType, 'subdomain')
  assert.equal(out.primaryInstruction?.type, 'cname')
  assert.equal(out.primaryInstruction?.host, 'beauty-clinic')
  assert.equal(out.primaryInstruction?.value, 'cname.vercel-dns.com')
  assert.ok(out.diagnostics.includes('DNS_INSTRUCTIONS_INFERRED'))
})

test('computeDomainDnsInstructions recommends A for apex domains when Vercel config is absent', () => {
  const out = computeDomainDnsInstructions({
    domain: 'example.com',
    vercelStatus: {
      verification: null,
      routing: null,
    },
  })

  assert.equal(out.domainType, 'apex_domain')
  assert.equal(out.primaryInstruction?.type, 'a')
  assert.equal(out.primaryInstruction?.host, '@')
  assert.equal(out.primaryInstruction?.value, '76.76.21.21')
})

test('computeDomainDnsInstructions prioritizes TXT verification and keeps routing separately', () => {
  const out = computeDomainDnsInstructions({
    domain: 'www.example.com',
    vercelStatus: {
      verification: {
        type: 'txt',
        host: '_vercel',
        value: 'vc-domain-verify=token',
      },
      routing: {
        type: 'cname',
        host: 'www',
        value: 'cname.vercel-dns.com',
      },
    },
  })

  assert.equal(out.instructions.length, 2)
  assert.equal(out.instructions[0]?.type, 'txt')
  assert.equal(out.instructions[0]?.purpose, 'verification')
  assert.equal(out.instructions[1]?.type, 'cname')
  assert.equal(out.instructions[1]?.purpose, 'routing')
  assert.ok(out.diagnostics.includes('DNS_VERIFICATION_RECORD_REQUIRED'))
  assert.ok(out.diagnostics.includes('DNS_ROUTING_RECORD_REQUIRED'))
})

test('computeDomainDnsInstructions uses Vercel routing over inferred fallback', () => {
  const out = computeDomainDnsInstructions({
    domain: 'example.com',
    vercelStatus: {
      verification: null,
      routing: {
        type: 'a',
        host: '@',
        value: '203.0.113.10',
      },
    },
  })

  assert.equal(out.primaryInstruction?.type, 'a')
  assert.equal(out.primaryInstruction?.value, '203.0.113.10')
  assert.ok(out.diagnostics.includes('DNS_INSTRUCTIONS_FROM_VERCEL'))
  assert.equal(out.diagnostics.includes('DNS_INSTRUCTIONS_INFERRED'), false)
})

test('normalizeDomainForDns accepts wildcard and strips protocol/path', () => {
  assert.equal(normalizeDomainForDns('https://*.Example.com/path'), '*.example.com')
})
