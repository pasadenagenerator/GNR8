import {
  CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT,
  CANONICAL_SITE_RENDER_REQUESTED_EVENT,
  CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
  CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
  validateDomainVerificationCheckEventName,
  validateSiteRenderEventName,
  validateSiteTemplateBootstrapEventName,
  validateTemplateProcessingEventName,
} from '@gnr8/runtime-contracts'
import {
  DOMAIN_VERIFICATION_CHECK_JOB_ID,
  DOMAIN_VERIFICATION_CHECK_JOB_TRIGGER_EVENT,
  DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID,
  domainVerificationCheckJob,
  domainVerificationCheckSchedulerJob,
} from '@/gnr8/domain/inngest/domain-verification-job'
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

export type WorkerInngestFunctionRegistration = {
  id: string
  eventName?: string
  fn:
    | typeof templateProcessingJob
    | typeof siteTemplateBootstrapJob
    | typeof siteRenderCaptureJob
    | typeof domainVerificationCheckJob
    | typeof domainVerificationCheckSchedulerJob
}

export const workerInngestFunctionRegistrations: WorkerInngestFunctionRegistration[] = [
  {
    id: TEMPLATE_PROCESSING_JOB_ID,
    eventName: TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
    fn: templateProcessingJob,
  },
  {
    id: SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
    eventName: SITE_TEMPLATE_BOOTSTRAP_JOB_TRIGGER_EVENT,
    fn: siteTemplateBootstrapJob,
  },
  {
    id: SITE_RENDER_CAPTURE_JOB_ID,
    eventName: SITE_RENDER_CAPTURE_JOB_TRIGGER_EVENT,
    fn: siteRenderCaptureJob,
  },
  {
    id: DOMAIN_VERIFICATION_CHECK_SCHEDULER_JOB_ID,
    fn: domainVerificationCheckSchedulerJob,
  },
  {
    id: DOMAIN_VERIFICATION_CHECK_JOB_ID,
    eventName: DOMAIN_VERIFICATION_CHECK_JOB_TRIGGER_EVENT,
    fn: domainVerificationCheckJob,
  },
]

export const inngestFunctions = workerInngestFunctionRegistrations.map((entry) => entry.fn)

const templateProcessingRegistration = workerInngestFunctionRegistrations.find(
  (entry) => entry.id === TEMPLATE_PROCESSING_JOB_ID,
)

if (!templateProcessingRegistration) {
  console.error('[worker] TEMPLATE_PROCESSING_FUNCTION_MISSING', {
    functionId: TEMPLATE_PROCESSING_JOB_ID,
    registeredFunctionCount: workerInngestFunctionRegistrations.length,
  })
} else {
  const hasTemplateProcessingEventMismatch = !validateTemplateProcessingEventName({
    source: 'worker:inngestFunctions',
    eventName: templateProcessingRegistration.eventName,
    expectedEventName: CANONICAL_TEMPLATE_PROCESSING_REQUESTED_EVENT,
    logger: (message, context) => console.error(`[worker] ${message}`, context),
  })

  if (!hasTemplateProcessingEventMismatch) {
    console.info('[worker] TEMPLATE_PROCESSING_FUNCTION_REGISTERED', {
      functionId: templateProcessingRegistration.id,
      eventName: templateProcessingRegistration.eventName,
      registeredFunctionCount: workerInngestFunctionRegistrations.length,
    })
  }
}

const siteBootstrapRegistration = workerInngestFunctionRegistrations.find(
  (entry) => entry.id === SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
)

if (!siteBootstrapRegistration) {
  console.error('[worker] SITE_TEMPLATE_BOOTSTRAP_FUNCTION_MISSING', {
    functionId: SITE_TEMPLATE_BOOTSTRAP_JOB_ID,
    registeredFunctionCount: workerInngestFunctionRegistrations.length,
  })
} else {
  const hasSiteBootstrapEventMismatch = !validateSiteTemplateBootstrapEventName({
    source: 'worker:inngestFunctions',
    eventName: siteBootstrapRegistration.eventName,
    expectedEventName: CANONICAL_SITE_TEMPLATE_BOOTSTRAP_REQUESTED_EVENT,
    logger: (message, context) => console.error(`[worker] ${message}`, context),
  })

  if (!hasSiteBootstrapEventMismatch) {
    console.info('[worker] SITE_TEMPLATE_BOOTSTRAP_FUNCTION_REGISTERED', {
      functionId: siteBootstrapRegistration.id,
      eventName: siteBootstrapRegistration.eventName,
      registeredFunctionCount: workerInngestFunctionRegistrations.length,
    })
  }
}

const siteRenderRegistration = workerInngestFunctionRegistrations.find(
  (entry) => entry.id === SITE_RENDER_CAPTURE_JOB_ID,
)

if (!siteRenderRegistration) {
  console.error('[worker] SITE_RENDER_CAPTURE_FUNCTION_MISSING', {
    functionId: SITE_RENDER_CAPTURE_JOB_ID,
    registeredFunctionCount: workerInngestFunctionRegistrations.length,
  })
} else {
  const hasSiteRenderEventMismatch = !validateSiteRenderEventName({
    source: 'worker:inngestFunctions',
    eventName: siteRenderRegistration.eventName,
    expectedEventName: CANONICAL_SITE_RENDER_REQUESTED_EVENT,
    logger: (message, context) => console.error(`[worker] ${message}`, context),
  })

  if (!hasSiteRenderEventMismatch) {
    console.info('[worker] SITE_RENDER_CAPTURE_FUNCTION_REGISTERED', {
      functionId: siteRenderRegistration.id,
      eventName: siteRenderRegistration.eventName,
      registeredFunctionCount: workerInngestFunctionRegistrations.length,
    })
  }
}

const domainVerificationRegistration = workerInngestFunctionRegistrations.find(
  (entry) => entry.id === DOMAIN_VERIFICATION_CHECK_JOB_ID,
)

if (!domainVerificationRegistration) {
  console.error('[worker] DOMAIN_VERIFICATION_CHECK_FUNCTION_MISSING', {
    functionId: DOMAIN_VERIFICATION_CHECK_JOB_ID,
    registeredFunctionCount: workerInngestFunctionRegistrations.length,
  })
} else {
  const hasDomainVerificationEventMismatch = !validateDomainVerificationCheckEventName({
    source: 'worker:inngestFunctions',
    eventName: domainVerificationRegistration.eventName,
    expectedEventName: CANONICAL_DOMAIN_VERIFICATION_CHECK_EVENT,
    logger: (message, context) => console.error(`[worker] ${message}`, context),
  })

  if (!hasDomainVerificationEventMismatch) {
    console.info('[worker] DOMAIN_VERIFICATION_CHECK_FUNCTION_REGISTERED', {
      functionId: domainVerificationRegistration.id,
      eventName: domainVerificationRegistration.eventName,
      registeredFunctionCount: workerInngestFunctionRegistrations.length,
    })
  }
}
