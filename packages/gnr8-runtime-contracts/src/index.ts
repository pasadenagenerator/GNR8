export const TEMPLATE_PROCESSING_REQUESTED_EVENT = 'template/processing.requested'
export const TEMPLATE_PROCESSING_MAX_ATTEMPTS = 3
export const TEMPLATE_PROCESSING_STUCK_AFTER_MINUTES = 10

export type TemplateProcessingRequestedPayload = {
  templateId: string
  clientId: string
  sourceZipStorageBucket: string
  sourceZipStorageKey: string
}

export type TemplateRuntimeStatus = 'uploaded' | 'processing' | 'ready' | 'failed'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
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

export function isTemplateRuntimeStatus(value: unknown): value is TemplateRuntimeStatus {
  return value === 'uploaded' || value === 'processing' || value === 'ready' || value === 'failed'
}
