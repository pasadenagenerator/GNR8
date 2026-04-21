import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getTemplateProcessingEnqueueDiagnostics,
  triggerTemplateProcessingJob,
} from '@/gnr8/template-intake/routes/template-processing-trigger'

test('triggerTemplateProcessingJob returns true when emitter succeeds', async () => {
  let emitted = false

  const triggered = await triggerTemplateProcessingJob(
    {
      clientId: 'client-1',
      templateId: 'template-1',
      sourceZipStorageBucket: 'template-zip',
      sourceZipStorageKey: 'template-1/source.zip',
    },
    {
      emit: async () => {
        emitted = true
      },
    },
  )

  assert.equal(triggered, true)
  assert.equal(emitted, true)
})

test('triggerTemplateProcessingJob returns false when emitter fails', async () => {
  const triggered = await triggerTemplateProcessingJob(
    {
      clientId: 'client-1',
      templateId: 'template-1',
      sourceZipStorageBucket: 'template-zip',
      sourceZipStorageKey: 'template-1/source.zip',
    },
    {
      emit: async () => {
        throw new Error('enqueue failed')
      },
    },
  )

  assert.equal(triggered, false)
})

test('enqueue diagnostics report env presence and do not rely on stale HTTP trigger vars', () => {
  const diagnostics = getTemplateProcessingEnqueueDiagnostics({
    INNGEST_EVENT_KEY: 'evt_test_123',
    INNGEST_BASE_URL: '',
    INNGEST_EVENT_API_BASE_URL: '',
    INNGEST_API_BASE_URL: '',
    INNGEST_SIGNING_KEY: '',
    TEMPLATE_PROCESSING_TRIGGER_URL: 'https://legacy.example.com/trigger',
  })

  assert.equal(diagnostics.hasInngestEventKey, true)
  assert.equal(diagnostics.hasInngestBaseUrl, false)
  assert.equal(diagnostics.hasInngestEventApiBaseUrl, false)
  assert.equal(diagnostics.hasInngestApiBaseUrl, false)
  assert.equal(diagnostics.hasInngestSigningKey, false)
  assert.equal(diagnostics.hasLegacyTriggerConfig, true)
  assert.equal(diagnostics.sendTarget, 'default:https://inn.gs/e/<event-key>')
})
