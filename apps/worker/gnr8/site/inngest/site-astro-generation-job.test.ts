import assert from 'node:assert/strict'
import test from 'node:test'

import { SITE_ASTRO_GENERATION_REQUESTED_EVENT } from '@gnr8/runtime-contracts'

import {
  parseSiteAstroGenerationPayload,
  resolveBundledPnpmCliPath,
  runSiteAstroGenerationJob,
  SITE_ASTRO_GENERATION_JOB_TRIGGER_EVENT,
} from './site-astro-generation-job'

test('worker resolves the bundled pnpm CLI without relying on a system pnpm executable', () => {
  assert.match(resolveBundledPnpmCliPath() ?? '', /pnpm\/bin\/pnpm\.cjs$/)
})

const payload = {
  actionId: '11111111-1111-4111-8111-111111111111',
  requestedAt: '2026-10-02T09:15:00.000Z',
  ownershipSiteId: '22222222-2222-4222-8222-222222222222',
  runtimeSiteId: 'runtime-site',
  sourceSiteVersionId: '33333333-3333-4333-8333-333333333333',
  sourceArtifactId: '44444444-4444-4444-8444-444444444444',
  actor: 'user:test',
  strategy: 'balanced',
}

test('Astro generation worker uses the canonical event and passes a validated payload to one generation service', async () => {
  assert.equal(SITE_ASTRO_GENERATION_JOB_TRIGGER_EVENT, SITE_ASTRO_GENERATION_REQUESTED_EVENT)
  assert.deepEqual(parseSiteAstroGenerationPayload(payload), payload)
  let calls = 0
  const result = await runSiteAstroGenerationJob({
    eventData: payload,
    runGeneration: async (actual) => {
      calls += 1
      assert.deepEqual(actual, payload)
      return {
        generationSiteVersionId: 'generated-version',
        candidateId: 'candidate',
        artifactId: 'artifact',
        artifactBundleSha256: 'a'.repeat(64),
        routePaths: ['/', '/about'],
        variantId: 'variant',
      }
    },
  })
  assert.equal(calls, 1)
  assert.deepEqual(result.routePaths, ['/', '/about'])
})

test('invalid or unsupported adapter payloads fail before generation and never fall back', async () => {
  assert.equal(parseSiteAstroGenerationPayload({ ...payload, requestedAdapterId: 'other' }), null)
  assert.equal(parseSiteAstroGenerationPayload({
    ...payload,
    acceptedFunctionalReductions: {
      kind: 'legacy-forms-to-disclosed-links-v1',
      contactEmail: 'not-an-email',
      commentLinks: 'source-article',
    },
  }), null)
  await assert.rejects(
    runSiteAstroGenerationJob({ eventData: { ...payload, sourceArtifactId: '' }, runGeneration: async () => { throw new Error('must not run') } }),
    /Invalid site Astro generation event payload/,
  )
})

test('worker preserves an explicit per-generation form reduction without making it a default', () => {
  assert.deepEqual(parseSiteAstroGenerationPayload(payload), payload)
  const withReduction = {
    ...payload,
    acceptedFunctionalReductions: {
      kind: 'legacy-forms-to-disclosed-links-v1',
      contactEmail: 'MAILTO@CHS.SI',
      commentLinks: 'source-article',
    },
  }
  assert.deepEqual(parseSiteAstroGenerationPayload(withReduction), {
    ...payload,
    acceptedFunctionalReductions: {
      kind: 'legacy-forms-to-disclosed-links-v1',
      contactEmail: 'mailto@chs.si',
      commentLinks: 'source-article',
    },
  })
})
