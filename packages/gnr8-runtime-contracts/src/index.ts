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
