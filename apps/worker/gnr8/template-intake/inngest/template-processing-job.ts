import {
  type TemplateProcessingRequestedPayload,
  TEMPLATE_PROCESSING_MAX_ATTEMPTS,
  TEMPLATE_PROCESSING_REQUESTED_EVENT,
} from '@gnr8/runtime-contracts'
import { inngest } from '@/gnr8/inngest/client'
import { processTemplateZipIntakeJob } from '@/gnr8/template-intake/core/template-processing-job-service'
import {
  getTemplateByIdForClient,
  markTemplateProcessingAttemptStarted,
  markTemplateProcessingFinalFailure,
  markTemplateProcessingRetryableFailure,
  updateTemplateSourceZipReference,
} from '@/gnr8/template-intake/storage/template-repository'
import { isTemplateProcessingReasonRetryable } from '@/gnr8/template-intake/core/template-processing-reason-code'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function parseTemplateProcessingRequestedPayload(value: unknown): TemplateProcessingRequestedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const templateId = normalizeText(record.templateId)
  const clientId = normalizeText(record.clientId)
  const sourceZipStorageBucket = normalizeText(record.sourceZipStorageBucket)
  const sourceZipStorageKey = normalizeText(record.sourceZipStorageKey)
  if (!templateId || !clientId || !sourceZipStorageBucket || !sourceZipStorageKey) return null
  return {
    templateId,
    clientId,
    sourceZipStorageBucket,
    sourceZipStorageKey,
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return normalizeText(error.message) || 'Template processing failed.'
  return normalizeText(error) || 'Template processing failed.'
}

type TemplateProcessingWorkerDeps = {
  parsePayload: typeof parseTemplateProcessingRequestedPayload
  getTemplateByIdForClient: typeof getTemplateByIdForClient
  updateTemplateSourceZipReference: typeof updateTemplateSourceZipReference
  markTemplateProcessingAttemptStarted: typeof markTemplateProcessingAttemptStarted
  processTemplateZipIntakeJob: typeof processTemplateZipIntakeJob
  markTemplateProcessingRetryableFailure: typeof markTemplateProcessingRetryableFailure
  markTemplateProcessingFinalFailure: typeof markTemplateProcessingFinalFailure
}

const DEFAULT_DEPS: TemplateProcessingWorkerDeps = {
  parsePayload: parseTemplateProcessingRequestedPayload,
  getTemplateByIdForClient,
  updateTemplateSourceZipReference,
  markTemplateProcessingAttemptStarted,
  processTemplateZipIntakeJob,
  markTemplateProcessingRetryableFailure,
  markTemplateProcessingFinalFailure,
}

export const TEMPLATE_PROCESSING_JOB_ID = 'template-processing-job'
export const TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT = TEMPLATE_PROCESSING_REQUESTED_EVENT

export async function runTemplateProcessingJob(input: {
  eventData: unknown
  maxAttempts?: number
  deps?: Partial<TemplateProcessingWorkerDeps>
}): Promise<void> {
  const deps = {
    ...DEFAULT_DEPS,
    ...(input.deps ?? {}),
  }
  const payload = deps.parsePayload(input.eventData)
  if (!payload) {
    throw new Error('Invalid template processing event payload.')
  }

  const template = await deps.getTemplateByIdForClient({
    clientId: payload.clientId,
    templateId: payload.templateId,
  })
  if (!template) {
    throw new Error('Template not found for processing.')
  }

  const sourceZipStorageBucket = normalizeText(payload.sourceZipStorageBucket)
  const sourceZipStorageKey = normalizeText(payload.sourceZipStorageKey)
  if (!sourceZipStorageBucket || !sourceZipStorageKey) {
    throw new Error('Template source ZIP reference is missing from event payload.')
  }

  await deps.updateTemplateSourceZipReference({
    templateId: template.id,
    sourceZipStorageBucket,
    sourceZipStorageKey,
  })

  const started = await deps.markTemplateProcessingAttemptStarted({
    clientId: payload.clientId,
    templateId: payload.templateId,
  })
  if (!started) {
    throw new Error('Template could not be marked as processing.')
  }

  const maxAttempts = Math.max(1, Number(input.maxAttempts ?? TEMPLATE_PROCESSING_MAX_ATTEMPTS) || TEMPLATE_PROCESSING_MAX_ATTEMPTS)

  try {
    const result = await deps.processTemplateZipIntakeJob({
      clientId: payload.clientId,
      templateId: payload.templateId,
      persistFailure: false,
    })
    if (!result.ok) {
      const attempts = Number(started.processingAttempts ?? 0) || 0
      if (attempts < maxAttempts && (result.retryable || isTemplateProcessingReasonRetryable(result.reasonCode))) {
        await deps.markTemplateProcessingRetryableFailure({
          clientId: payload.clientId,
          templateId: payload.templateId,
          errorMessage: result.error,
          reasonCode: result.reasonCode,
        })
        throw new Error(result.error)
      }
      await deps.markTemplateProcessingFinalFailure({
        clientId: payload.clientId,
        templateId: payload.templateId,
        errorMessage: result.error,
        reasonCode: result.reasonCode,
      })
      return
    }
  } catch (error) {
    const message = toErrorMessage(error)
    const attempts = Number(started.processingAttempts ?? 0) || 0
    if (attempts < maxAttempts) {
      await deps.markTemplateProcessingRetryableFailure({
        clientId: payload.clientId,
        templateId: payload.templateId,
        errorMessage: message,
        reasonCode: 'TEMPLATE_IMPORT_FAILED',
      })
      throw new Error(message)
    }

    await deps.markTemplateProcessingFinalFailure({
      clientId: payload.clientId,
      templateId: payload.templateId,
      errorMessage: message,
      reasonCode: 'TEMPLATE_UNKNOWN_FAILURE',
    })
  }
}

export const templateProcessingJob = inngest.createFunction(
  {
    id: TEMPLATE_PROCESSING_JOB_ID,
    retries: 2,
  },
  {
    event: TEMPLATE_PROCESSING_JOB_TRIGGER_EVENT,
  },
  async ({ event }) => {
    await runTemplateProcessingJob({
      eventData: event.data,
      maxAttempts: TEMPLATE_PROCESSING_MAX_ATTEMPTS,
    })
  },
)
