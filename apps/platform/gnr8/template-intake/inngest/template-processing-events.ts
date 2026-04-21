import {
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  type TemplateProcessingRequestedPayload,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
  validateTemplateProcessingEventName,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'

type TemplateProcessingEnqueueEvent = {
  name: string
  data: TemplateProcessingRequestedPayload
}

type TemplateProcessingEventDeps = {
  send: (event: TemplateProcessingEnqueueEvent) => Promise<unknown>
}

const DEFAULT_DEPS: TemplateProcessingEventDeps = {
  send: (event) => inngest.send(event),
}

export async function emitTemplateProcessingRequestedEvent(
  input: TemplateProcessingRequestedPayload,
  deps: Partial<TemplateProcessingEventDeps> = {},
): Promise<void> {
  const eventName = TEMPLATE_PROCESSING_REQUESTED_EVENT
  const matches = validateTemplateProcessingEventName({
    source: 'platform:emitTemplateProcessingRequestedEvent',
    eventName,
    expectedEventName: CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
    logger: (message, context) => console.error(`[template-intake] ${message}`, context),
  })
  if (!matches) {
    throw new Error('Template processing event name mismatch. Refusing to emit misconfigured event.')
  }

  const resolved = {
    ...DEFAULT_DEPS,
    ...deps,
  }

  await resolved.send({
    name: eventName,
    data: {
      templateId: input.templateId,
      clientId: input.clientId,
      sourceZipStorageBucket: input.sourceZipStorageBucket,
      sourceZipStorageKey: input.sourceZipStorageKey,
    },
  })

  console.info('[template-intake] TEMPLATE_PROCESSING_EVENT_EMITTED', {
    templateId: input.templateId,
    clientId: input.clientId,
    eventName,
  })
}
