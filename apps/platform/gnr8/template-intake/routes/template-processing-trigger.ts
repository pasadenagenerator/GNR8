import { TEMPLATE_PROCESSING_REQUESTED_EVENT } from '@gnr8/runtime-contracts'
import { emitTemplateProcessingRequestedEvent } from '@/gnr8/template-intake/inngest/template-processing-events'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toErrorDetails(error: unknown): { name: string; message: string; code: string | null } {
  if (error instanceof Error) {
    return {
      name: normalizeText(error.name) || 'Error',
      message: normalizeText(error.message) || 'Unknown enqueue error.',
      code: normalizeText((error as { code?: unknown }).code) || null,
    }
  }

  return {
    name: 'UnknownError',
    message: normalizeText(error) || 'Unknown enqueue error.',
    code: null,
  }
}

type TemplateProcessingEnqueueDiagnostics = {
  eventName: string
  sendTarget: string
  hasInngestEventKey: boolean
  hasInngestSigningKey: boolean
  hasInngestBaseUrl: boolean
  hasInngestEventApiBaseUrl: boolean
  hasInngestApiBaseUrl: boolean
  hasLegacyTriggerConfig: boolean
}

export function getTemplateProcessingEnqueueDiagnostics(env: NodeJS.ProcessEnv = process.env): TemplateProcessingEnqueueDiagnostics {
  const eventApiBaseUrl = normalizeText(env.INNGEST_EVENT_API_BASE_URL)
  const baseUrl = normalizeText(env.INNGEST_BASE_URL)
  const eventKey = normalizeText(env.INNGEST_EVENT_KEY)
  const sendTarget = eventApiBaseUrl || baseUrl || 'default:https://inn.gs/e/<event-key>'

  return {
    eventName: TEMPLATE_PROCESSING_REQUESTED_EVENT,
    sendTarget,
    hasInngestEventKey: Boolean(eventKey),
    hasInngestSigningKey: Boolean(normalizeText(env.INNGEST_SIGNING_KEY)),
    hasInngestBaseUrl: Boolean(baseUrl),
    hasInngestEventApiBaseUrl: Boolean(eventApiBaseUrl),
    hasInngestApiBaseUrl: Boolean(normalizeText(env.INNGEST_API_BASE_URL)),
    hasLegacyTriggerConfig: Boolean(
      normalizeText(env.GNR8_TEMPLATE_PROCESSING_TRIGGER_URL) ||
        normalizeText(env.TEMPLATE_PROCESSING_TRIGGER_URL) ||
        normalizeText(env.GNR8_TEMPLATE_PROCESSOR_WEBHOOK_URL),
    ),
  }
}

type TriggerTemplateProcessingJobDeps = {
  emit: typeof emitTemplateProcessingRequestedEvent
}

const DEFAULT_DEPS: TriggerTemplateProcessingJobDeps = {
  emit: emitTemplateProcessingRequestedEvent,
}

export function triggerTemplateProcessingJob(input: {
  clientId: string
  templateId: string
  sourceZipStorageBucket: string
  sourceZipStorageKey: string
}, deps: Partial<TriggerTemplateProcessingJobDeps> = {}): Promise<boolean> {
  const resolved = {
    ...DEFAULT_DEPS,
    ...deps,
  }
  const diagnostics = getTemplateProcessingEnqueueDiagnostics()

  console.info('[template-intake] TEMPLATE_PROCESSING_ENQUEUE_STARTED', {
    clientId: input.clientId,
    templateId: input.templateId,
    sourceZipStorageBucket: input.sourceZipStorageBucket,
    sourceZipStorageKey: input.sourceZipStorageKey,
    ...diagnostics,
  })

  return resolved
    .emit({
      clientId: input.clientId,
      templateId: input.templateId,
      sourceZipStorageBucket: input.sourceZipStorageBucket,
      sourceZipStorageKey: input.sourceZipStorageKey,
    })
    .then(() => true)
    .then((triggered) => {
      console.info('[template-intake] TEMPLATE_PROCESSING_ENQUEUE_SUCCEEDED', {
        clientId: input.clientId,
        templateId: input.templateId,
        ...diagnostics,
      })
      return triggered
    })
    .catch((error) => {
      const details = toErrorDetails(error)
      console.error('[template-intake] TEMPLATE_PROCESSING_ENQUEUE_FAILED', {
        clientId: input.clientId,
        templateId: input.templateId,
        sourceZipStorageBucket: input.sourceZipStorageBucket,
        sourceZipStorageKey: input.sourceZipStorageKey,
        ...diagnostics,
        errorName: details.name,
        errorCode: details.code,
        errorMessage: details.message,
      })
      return false
    })
}
