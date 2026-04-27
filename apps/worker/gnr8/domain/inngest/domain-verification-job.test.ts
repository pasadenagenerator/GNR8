import assert from 'node:assert/strict'
import test from 'node:test'

import { DOMAIN_ACTIVATED_EVENT } from '@gnr8/runtime-contracts'
import { runDomainVerificationCheckJob, type RuntimeDomainHostBinding } from '@/gnr8/domain/inngest/domain-verification-job'

function makeBinding(input: {
  id: string
  domain: string
  status: RuntimeDomainHostBinding['status']
}): RuntimeDomainHostBinding {
  return {
    id: input.id,
    siteId: 'site_1',
    siteVersionId: '11111111-1111-4111-8111-111111111111',
    domain: input.domain,
    status: input.status,
    verificationType: null,
    verificationValue: null,
    verificationHost: null,
    lastCheckedAt: null,
    vercelDomainId: null,
    createdAt: '2026-04-27T00:00:00.000Z',
    updatedAt: '2026-04-27T00:00:00.000Z',
  }
}

test('domain verification job marks verified bindings active and emits domain/activated', async () => {
  const sentEvents: Array<{ name: string; data: unknown }> = []
  const updates: Array<{ bindingId: string; status: string }> = []

  const result = await runDomainVerificationCheckJob({
    eventData: { source: 'manual' },
    deps: {
      listDomainHostBindingsForVerification: async () => [makeBinding({ id: 'binding_1', domain: 'active.example.com', status: 'pending' })],
      checkDomainStatus: async () => ({
        domain: 'active.example.com',
        domainId: 'dom_1',
        verified: true,
        status: 'active',
        verification: null,
        lastCheckedAt: '2026-04-27T10:00:00.000Z',
      }),
      updateDomainHostBindingById: async (input) => {
        updates.push({ bindingId: input.bindingId, status: input.status })
        return makeBinding({ id: input.bindingId, domain: 'active.example.com', status: 'active' })
      },
      send: async (event) => {
        sentEvents.push(event)
      },
      sleep: async () => undefined,
      now: () => new Date('2026-04-27T10:00:00.000Z'),
    },
  })

  assert.equal(result.checkedCount, 1)
  assert.equal(result.activeCount, 1)
  assert.equal(result.activatedEventCount, 1)
  assert.deepEqual(updates, [{ bindingId: 'binding_1', status: 'active' }])
  assert.equal(sentEvents[0]?.name, DOMAIN_ACTIVATED_EVENT)
})

test('domain verification job keeps binding verifying when verification record is present', async () => {
  const updates: Array<{ bindingId: string; status: string }> = []

  const result = await runDomainVerificationCheckJob({
    eventData: { source: 'manual' },
    deps: {
      listDomainHostBindingsForVerification: async () => [makeBinding({ id: 'binding_2', domain: 'verify.example.com', status: 'pending' })],
      checkDomainStatus: async () => ({
        domain: 'verify.example.com',
        domainId: 'dom_2',
        verified: false,
        status: 'verifying',
        verification: {
          type: 'cname',
          host: 'verify',
          value: 'cname.vercel-dns.com',
        },
        lastCheckedAt: '2026-04-27T10:01:00.000Z',
      }),
      updateDomainHostBindingById: async (input) => {
        updates.push({ bindingId: input.bindingId, status: input.status })
        return makeBinding({ id: input.bindingId, domain: 'verify.example.com', status: 'verifying' })
      },
      send: async () => undefined,
      sleep: async () => undefined,
      now: () => new Date('2026-04-27T10:01:00.000Z'),
    },
  })

  assert.equal(result.checkedCount, 1)
  assert.equal(result.verifyingCount, 1)
  assert.equal(result.failedCount, 0)
  assert.deepEqual(updates, [{ bindingId: 'binding_2', status: 'verifying' }])
})

test('domain verification job marks binding failed when verification is missing', async () => {
  const updates: Array<{ bindingId: string; status: string }> = []

  const result = await runDomainVerificationCheckJob({
    eventData: { source: 'manual' },
    deps: {
      listDomainHostBindingsForVerification: async () => [makeBinding({ id: 'binding_3', domain: 'failed.example.com', status: 'verifying' })],
      checkDomainStatus: async () => ({
        domain: 'failed.example.com',
        domainId: 'dom_3',
        verified: false,
        status: 'verifying',
        verification: null,
        lastCheckedAt: '2026-04-27T10:02:00.000Z',
      }),
      updateDomainHostBindingById: async (input) => {
        updates.push({ bindingId: input.bindingId, status: input.status })
        return makeBinding({ id: input.bindingId, domain: 'failed.example.com', status: 'failed' })
      },
      send: async () => undefined,
      sleep: async () => undefined,
      now: () => new Date('2026-04-27T10:02:00.000Z'),
    },
  })

  assert.equal(result.checkedCount, 1)
  assert.equal(result.failedCount, 1)
  assert.deepEqual(updates, [{ bindingId: 'binding_3', status: 'failed' }])
})
