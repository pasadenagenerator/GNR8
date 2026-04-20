import { emitTemplateProcessingRequestedEvent } from '@/gnr8/template-intake/inngest/template-processing-events'

export function triggerTemplateProcessingJob(input: {
  clientId: string
  templateId: string
  sourceZipStorageBucket: string
  sourceZipStorageKey: string
}): Promise<boolean> {
  return emitTemplateProcessingRequestedEvent({
    clientId: input.clientId,
    templateId: input.templateId,
    sourceZipStorageBucket: input.sourceZipStorageBucket,
    sourceZipStorageKey: input.sourceZipStorageKey,
  })
    .then(() => true)
    .catch((error) => {
      console.error('[template-intake] TEMPLATE_PROCESSOR_EVENT_TRIGGER_FAILED', {
        clientId: input.clientId,
        templateId: input.templateId,
        sourceZipStorageBucket: input.sourceZipStorageBucket,
        sourceZipStorageKey: input.sourceZipStorageKey,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    })
}
