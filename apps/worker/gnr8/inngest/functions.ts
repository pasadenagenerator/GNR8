import {
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  validateSiteTemplateBootstrapEventName,
  validateTemplateProcessingEventName,
} from '@gnr8/runtime-contracts'
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

export const inngestFunctions = [templateProcessingJob, siteTemplateBootstrapJob]

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
    registeredFunctionCount: 1,
  })
}

const hasSiteBootstrapEventMismatch = !validateSiteTemplateBootstrapEventName({
  source: 'worker:inngestFunctions',
  eventName: SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT,
  expectedEventName: CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  logger: (message, context) => console.error(`[worker] ${message}`, context),
})

if (!hasSiteBootstrapEventMismatch) {
  console.info('[worker] SITE_TEMPLATE_BOOTSTRAP_FUNCTION_REGISTERED', {
    functionId: SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
    eventName: SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT,
    registeredFunctionCount: 1,
  })
}
