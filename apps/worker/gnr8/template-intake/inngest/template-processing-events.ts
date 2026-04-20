import {
  type TemplateProcessingRequestedPayload,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'

export async function emitTemplateProcessingRequestedEvent(input: TemplateProcessingRequestedPayload): Promise<void> {
  await inngest.send({
    name: TEMPLATE_PROCESSING_REQUESTED_EVENT,
    data: {
      templateId: input.templateId,
      clientId: input.clientId,
      sourceZipStorageBucket: input.sourceZipStorageBucket,
      sourceZipStorageKey: input.sourceZipStorageKey,
    },
  })
}
