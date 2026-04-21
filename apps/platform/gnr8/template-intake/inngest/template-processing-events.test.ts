import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { emitTemplateProcessingRequestedEvent } from '@/gnr8/template-intake/inngest/template-processing-events'

test('platform emitter constant matches canonical template processing event name', () => {
  assert.equal(TEMPLATE_PROCESSING_REQUESTED_EVENT, CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT)
})

test('emitTemplateProcessingRequestedEvent sends canonical event name and payload', async () => {
  const calls: Array<{ name: string; data: Record<string, unknown> }> = []

  await emitTemplateProcessingRequestedEvent(
    {
      templateId: 'template-1',
      clientId: 'client-1',
      sourceZipStorageBucket: 'template-zip',
      sourceZipStorageKey: 'template-1/source.zip',
    },
    {
      send: async (event) => {
        calls.push(event as { name: string; data: Record<string, unknown> })
      },
    },
  )

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], {
    name: TEMPLATE_PROCESSING_REQUESTED_EVENT,
    data: {
      templateId: 'template-1',
      clientId: 'client-1',
      sourceZipStorageBucket: 'template-zip',
      sourceZipStorageKey: 'template-1/source.zip',
    },
  })
})
