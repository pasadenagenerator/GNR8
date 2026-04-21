import {
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  validateTemplateProcessingEventName,
} from '@gnr8/runtime-contracts'
import {
  TEMPLATE_PROCESSING_JOB_ID,
  TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
  templateProcessingJob,
} from '@/gnr8/template-intake/inngest/template-processing-job'

export const inngestFunctions = [templateProcessingJob]

const hasTemplateProcessingEventMismatch = !validateTemplateProcessingEventName({
  source: 'worker:inngestFunctions',
  eventName: TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
  expectedEventName: CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  logger: (message, context) => console.error(`[worker] ${message}`, context),
})

if (!hasTemplateProcessingEventMismatch) {
  console.info('[worker] TEMPLATE_PROCESSING_FUNCTION_REGISTERED', {
    functionId: TEMPLATE_PROCESSING_JOB_ID,
    eventName: TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
    registeredFunctionCount: inngestFunctions.length,
  })
}
