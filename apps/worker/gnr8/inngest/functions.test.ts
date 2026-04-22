import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANONICAL_SITE_RENDER_REQUESTED_EVENT,
  SITE_RENDER_REQUESTED_EVENT,
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { inngestFunctions, workerInngestFunctionRegistrations } from '@/gnr8/inngest/functions'
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

test('worker inngest registration exports template processing, site-bootstrap, and site-render jobs', () => {
  assert.equal(inngestFunctions.includes(templateProcessingJob), true)
  assert.equal(inngestFunctions.includes(siteTemplateBootstrapJob), true)
  assert.equal(inngestFunctions.includes(siteRenderCaptureJob), true)
})

test('worker inngest registration includes required function ids and exact trigger events', () => {
  const ids = workerInngestFunctionRegistrations.map((entry) => entry.id)
  const eventsById = new Map(workerInngestFunctionRegistrations.map((entry) => [entry.id, entry.eventName]))

  assert.equal(ids.includes(TEMPLATE_PROCESSING_JOB_ID), true)
  assert.equal(ids.includes(SITE_TEMPLATE_BOOTSTRAP_JOB_ID), true)
  assert.equal(ids.includes(SITE_RENDER_CAPTURE_JOB_ID), true)

  assert.equal(eventsById.get(TEMPLATE_PROCESSING_JOB_ID), 'template/processing.requested')
  assert.equal(eventsById.get(SITE_TEMPLATE_BOOTSTRAP_JOB_ID), 'site/bootstrap.requested')
  assert.equal(eventsById.get(SITE_RENDER_CAPTURE_JOB_ID), 'site/render.requested')
})
