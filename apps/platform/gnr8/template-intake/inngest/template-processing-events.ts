import { inngest } from '@/gnr8/inngest/client'

export const TEMPLATE_PROCESSING_REQUESTED_EVENT = 'template/processing.requested'
export const TEMPLATE_PROCESSING_MAX_ATTEMPTS = 3
export const TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES = 10

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export type TemplateProcessingRequestedPayload = {
  templateId: string
  clientId: string
  sourceZipStorageBucket: string
  sourceZipStorageKey: string
}

export function parseTemplateProcessingRequestedPayload(value: unknown): TemplateProcessingRequestedPayload | null {
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

