import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { inngestFunctions } from '@/gnr8/inngest/functions'
import {
  TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
  templateProcessingJob,
} from '@/gnr8/template-intake/inngest/template-processing-job'

test('worker template-processing trigger event uses shared canonical contract', () => {
  assert.equal(TEMPLATE_PROCESSING_REQUESTED_EVENT, CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT)
  assert.equal(TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT, CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT)
})

test('worker inngest registration exports template processing job', () => {
  assert.equal(inngestFunctions.includes(templateProcessingJob), true)
})
