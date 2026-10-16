import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT,
  DOMAIN_VERIFICATION_CHECK_EVENT,
  SITE_ASTRO_GENERATION_REQUESTED_EVENT,
  CANONICAL_SITE_RENDER_REQUESTED_EVENT,
  SITE_RENDER_REQUESTED_EVENT,
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import {
  inngestFunctions,
  resolveWorkerInngestFunctionRegistrations,
  workerInngestFunctionRegistrations,
} from '@/gnr8/inngest/functions'
import {
  DOMAIN_VERIFICATION_CHECK_JOB_ID,
  DOMAIN_VERIFICATION_CHECK_JOB_TRIGGER_EVENT,
  DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID,
  domainVerificationCheckJob,
  domainVerificationCheckSchedulerJob,
} from '@/gnr8/domain/inngest/domain-verification-job'
import {
  SITE_ASTRO_GENERATION_JOB_ID,
  SITE_ASTRO_GENERATION_JOB_TRIGGER_EVENT,
  siteAstroGenerationJob,
} from '@/gnr8/site/inngest/site-astro-generation-job'
import {
  SITE_RENDER_CAPTURE_JOB_ID,
  SITE_RENDER_CAPTURE_JOB_TRIGGER_EVENT,
  siteRenderCaptureJob,
} from '@/gnr8/site/inngest/site-render-capture-job'
import {
  SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
  SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT,
  siteTemplateBootstrapJob,
} from '@/gnr8/site/inngest/site-template-bootstrap-job'
import {
  TEMPLATE_PROCESSING_JOB_ID,
  TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
  templateProcessingJob,
} from '@/gnr8/template-intake/inngest/template-processing-job'

test('worker template-processing trigger event uses shared canonical contract', () => {
  assert.equal(TEMPLATE_PROCESSING_REQUESTED_EVENT, CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT)
  assert.equal(TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT, CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT)
})

test('worker site-bootstrap trigger event uses shared canonical contract', () => {
  assert.equal(SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT, CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT)
  assert.equal(SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT, CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT)
})

test('worker site-render trigger event uses shared canonical contract', () => {
  assert.equal(SITE_RENDER_REQUESTED_EVENT, CANONICAL_SITE_RENDER_REQUESTED_EVENT)
  assert.equal(SITE_RENDER_CAPTURE_JOB_TRIGGER_EVENT, CANONICAL_SITE_RENDER_REQUESTED_EVENT)
})

test('worker Astro generation trigger event uses shared canonical contract', () => {
  assert.equal(SITE_ASTRO_GENERATION_JOB_TRIGGER_EVENT, SITE_ASTRO_GENERATION_REQUESTED_EVENT)
})

test('worker domain verification trigger event uses shared canonical contract', () => {
  assert.equal(DOMAIN_VERIFICATION_CHECK_EVENT, CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT)
  assert.equal(DOMAIN_VERIFICATION_CHECK_JOB_TRIGGER_EVENT, CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT)
})

test('worker non-production inngest registration preserves all existing jobs and Astro generation', () => {
  assert.equal(inngestFunctions.includes(templateProcessingJob), true)
  assert.equal(inngestFunctions.includes(siteTemplateBootstrapJob), true)
  assert.equal(inngestFunctions.includes(siteAstroGenerationJob), true)
  assert.equal(inngestFunctions.includes(siteRenderCaptureJob), true)
  assert.equal(inngestFunctions.includes(domainVerificationCheckSchedulerJob), true)
  assert.equal(inngestFunctions.includes(domainVerificationCheckJob), true)
})

test('worker inngest registration includes required function ids and exact trigger events', () => {
  const ids = workerInngestFunctionRegistrations.map((entry) => entry.id)
  const eventsById = new Map(workerInngestFunctionRegistrations.map((entry) => [entry.id, entry.eventName]))

  assert.equal(ids.includes(TEMPLATE_PROCESSING_JOB_ID), true)
  assert.equal(ids.includes(SITE_TEMPLATE_BOOTSTRAP_JOB_ID), true)
  assert.equal(ids.includes(SITE_ASTRO_GENERATION_JOB_ID), true)
  assert.equal(ids.includes(SITE_RENDER_CAPTURE_JOB_ID), true)
  assert.equal(ids.includes(DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID), true)
  assert.equal(ids.includes(DOMAIN_VERIFICATION_CHECK_JOB_ID), true)

  assert.equal(eventsById.get(TEMPLATE_PROCESSING_JOB_ID), 'template/processing.requested')
  assert.equal(eventsById.get(SITE_TEMPLATE_BOOTSTRAP_JOB_ID), 'site/bootstrap.requested')
  assert.equal(eventsById.get(SITE_ASTRO_GENERATION_JOB_ID), 'site/astro-generation.requested')
  assert.equal(eventsById.get(SITE_RENDER_CAPTURE_JOB_ID), 'site/render.requested')
  assert.equal(eventsById.get(DOMAIN_VERIFICATION_CHECK_JOB_ID), 'domain/verification.check')
})

test('worker production inngest registration exposes exactly the safe four-function manifest', () => {
  const registrations = resolveWorkerInngestFunctionRegistrations({ vercelEnvironment: 'production' })

  assert.deepEqual(
    registrations.map((entry) => entry.id),
    [
      SITE_ASTRO_GENERATION_JOB_ID,
      TEMPLATE_PROCESSING_JOB_ID,
      SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
      SITE_RENDER_CAPTURE_JOB_ID,
    ],
  )
  assert.equal(registrations.some((entry) => entry.id === DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID), false)
  assert.equal(registrations.some((entry) => entry.id === DOMAIN_VERIFICATION_CHECK_JOB_ID), false)
})

test('worker Preview and Development registrations retain domain verification behavior', () => {
  for (const vercelEnvironment of ['preview', 'development']) {
    const ids = resolveWorkerInngestFunctionRegistrations({ vercelEnvironment }).map((entry) => entry.id)
    assert.equal(ids.includes(DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID), true)
    assert.equal(ids.includes(DOMAIN_VERIFICATION_CHECK_JOB_ID), true)
  }
})
