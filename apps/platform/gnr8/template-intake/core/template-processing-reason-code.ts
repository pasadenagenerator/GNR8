export const TEMPLATE_PROCESSING_REASON_CODES = [
  'TEMPLATE_ZIP_INVALID',
  'TEMPLATE_ZIP_EMPTY',
  'TEMPLATE_ZIP_UNREADABLE',
  'TEMPLATE_IMPORT_FAILED',
  'TEMPLATE_IMPORT_NO_HTML',
  'TEMPLATE_IMPORT_MULTIPLE_ENTRY_HTML',
  'TEMPLATE_ENTRY_HTML_UNRESOLVED',
  'TEMPLATE_SNAPSHOT_FAILED',
  'TEMPLATE_FILE_MAP_EMPTY',
  'TEMPLATE_BOOTSTRAP_ENQUEUE_FAILED',
  'TEMPLATE_STORAGE_WRITE_FAILED',
  'TEMPLATE_UNKNOWN_FAILURE',
] as const

export type TemplateProcessingReasonCode = (typeof TEMPLATE_PROCESSING_REASON_CODES)[number]

const RETRYABLE_REASON_CODES = new Set<TemplateProcessingReasonCode>([
  'TEMPLATE_IMPORT_FAILED',
  'TEMPLATE_SNAPSHOT_FAILED',
  'TEMPLATE_BOOTSTRAP_ENQUEUE_FAILED',
])

export function isTemplateProcessingReasonCode(value: unknown): value is TemplateProcessingReasonCode {
  return typeof value === 'string' && TEMPLATE_PROCESSING_REASON_CODES.includes(value as TemplateProcessingReasonCode)
}

export function normalizeTemplateProcessingReasonCode(value: unknown): TemplateProcessingReasonCode {
  return isTemplateProcessingReasonCode(value) ? value : 'TEMPLATE_UNKNOWN_FAILURE'
}

export function isTemplateProcessingReasonRetryable(value: unknown): boolean {
  return RETRYABLE_REASON_CODES.has(normalizeTemplateProcessingReasonCode(value))
}

export function resolveTemplateFailureMessage(reasonCode: unknown): string {
  const code = normalizeTemplateProcessingReasonCode(reasonCode)
  if (code === 'TEMPLATE_ZIP_INVALID') return 'Uploaded file is not a valid ZIP archive.'
  if (code === 'TEMPLATE_ZIP_EMPTY') return 'Uploaded ZIP archive is empty.'
  if (code === 'TEMPLATE_ZIP_UNREADABLE') return 'ZIP archive could not be read.'
  if (code === 'TEMPLATE_IMPORT_FAILED') return 'Template import pipeline failed.'
  if (code === 'TEMPLATE_IMPORT_NO_HTML') return 'No HTML file found in uploaded template.'
  if (code === 'TEMPLATE_IMPORT_MULTIPLE_ENTRY_HTML') return 'Multiple HTML entry files found; entry is ambiguous.'
  if (code === 'TEMPLATE_ENTRY_HTML_UNRESOLVED') return "Could not determine entry HTML for '/' route."
  if (code === 'TEMPLATE_SNAPSHOT_FAILED') return 'Template snapshot generation failed.'
  if (code === 'TEMPLATE_FILE_MAP_EMPTY') return 'Template contains no usable files.'
  if (code === 'TEMPLATE_BOOTSTRAP_ENQUEUE_FAILED') return 'Template processing could not be enqueued.'
  if (code === 'TEMPLATE_STORAGE_WRITE_FAILED') return 'Template processing results could not be persisted.'
  return 'Template processing failed due to an unknown error.'
}
