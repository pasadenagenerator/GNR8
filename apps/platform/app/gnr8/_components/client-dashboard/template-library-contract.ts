function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export type TemplateLibraryUiView = 'loading' | 'error' | 'list' | 'empty'

export type TemplateListApiCard = {
  id: string
  name: string
  slug: string
  sourceType: 'zip_html'
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  importHealth: 'clean' | 'degraded' | 'failed'
  tags: string[]
  sourceFilename: string
  entryHtmlFileName: string | null
  templateType: 'single_page' | 'multi_page' | 'unknown'
  preview: {
    available: boolean
    isFallback: boolean
    source: 'rendered_capture' | 'html_snapshot' | 'fallback'
    imagePath: string | null
    entryHtmlFileName?: string | null
    templateType?: 'single_page' | 'multi_page' | 'unknown'
  }
  createdAt: string
}

export type TemplateLibraryCard = TemplateListApiCard & {
  editHref: string | null
}

export type TemplateUploadApiSuccess = {
  ok: true
  id: string
  templateId: string
  sourceType: 'zip_html'
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  name: string
  tags: string[]
  health: 'clean' | 'degraded' | 'failed'
  importHealth: 'clean' | 'degraded' | 'failed'
  entryHtmlFileName: string | null
  templateType: 'single_page' | 'multi_page' | 'unknown'
  preview: {
    available: boolean
    isFallback: boolean
    source: 'rendered_capture' | 'html_snapshot' | 'fallback'
    imagePath: string | null
    entryHtmlFileName?: string | null
    templateType?: 'single_page' | 'multi_page' | 'unknown'
  }
}

export type ParsedTemplateUploadResult =
  | { ok: true; value: TemplateUploadApiSuccess }
  | { ok: false; error: string }

export function resolveTemplateUploadUiState(parsed: ParsedTemplateUploadResult): {
  isSuccess: boolean
  uploadError: string | null
} {
  if (!parsed.ok) {
    return {
      isSuccess: false,
      uploadError: parsed.error,
    }
  }

  return {
    isSuccess: true,
    uploadError: null,
  }
}

function normalizePreviewSource(value: unknown): TemplateUploadApiSuccess['preview']['source'] {
  const normalized = normalizeText(value)
  if (normalized === 'rendered_capture' || normalized === 'html_snapshot') return normalized
  return 'fallback'
}

function normalizeTemplateStatus(value: unknown): TemplateUploadApiSuccess['status'] | null {
  const normalized = normalizeText(value)
  if (normalized === 'uploaded' || normalized === 'processing' || normalized === 'ready' || normalized === 'failed') return normalized
  return null
}

function normalizeImportHealth(value: unknown): TemplateUploadApiSuccess['importHealth'] | null {
  const normalized = normalizeText(value)
  if (normalized === 'clean' || normalized === 'degraded' || normalized === 'failed') return normalized
  return null
}

function normalizeTemplateType(value: unknown): TemplateUploadApiSuccess['templateType'] | null {
  const normalized = normalizeText(value)
  if (normalized === 'single_page' || normalized === 'multi_page' || normalized === 'unknown') return normalized
  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeText(item))
    .filter(Boolean)
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function coerceUploadSuccessPayload(value: unknown): TemplateUploadApiSuccess | null {
  if (!isPlainRecord(value)) return null

  const id = normalizeText(value.id)
  const templateId = normalizeText(value.templateId)
  const name = normalizeText(value.name)
  const status = normalizeTemplateStatus(value.status)
  const importHealth = normalizeImportHealth(value.importHealth ?? value.health)
  const templateType = normalizeTemplateType(value.templateType)
  const preview = isPlainRecord(value.preview) ? value.preview : null
  const sourceTypeRaw = normalizeText(value.sourceType)
  const sourceType = sourceTypeRaw === 'zip_html' ? 'zip_html' : 'zip_html'

  if (!templateId || !name || !status || !importHealth || !templateType || !preview) return null
  if (typeof value.ok !== 'boolean') return null

  return {
    ok: true,
    id: id || templateId,
    templateId,
    sourceType,
    status,
    name,
    tags: asStringArray(value.tags),
    health: importHealth,
    importHealth,
    entryHtmlFileName: normalizeText(value.entryHtmlFileName) || null,
    templateType,
    preview: {
      available: Boolean(preview.available),
      isFallback: Boolean(preview.isFallback),
      source: normalizePreviewSource(preview.source),
      imagePath: normalizeText(preview.imagePath) || null,
      entryHtmlFileName: normalizeText(preview.entryHtmlFileName) || null,
      templateType,
    },
  }
}

export function parseTemplateUploadResponse(input: {
  httpStatus: number
  payload: unknown
}): ParsedTemplateUploadResult {
  const payload = coerceUploadSuccessPayload(input.payload)
  if (payload) {
    if (input.httpStatus >= 200 && input.httpStatus < 300 && payload.status !== 'failed' && payload.importHealth !== 'failed') {
      return {
        ok: true,
        value: {
          ...payload,
          ok: true,
        },
      }
    }
  }

  const failure = isPlainRecord(input.payload) ? input.payload : null
  const errorText = normalizeText(failure?.error)
  if (errorText) return { ok: false, error: errorText }
  return { ok: false, error: `Upload failed (HTTP ${input.httpStatus})` }
}

export function resolveTemplateEditHref(input: {
  templateId: string
  templateRouteBase?: string | null
  templateRouteQuery?: string | null
}): string | null {
  const templateId = normalizeText(input.templateId)
  const templateRouteBase = normalizeText(input.templateRouteBase)
  const templateRouteQuery = normalizeText(input.templateRouteQuery)
  if (!templateId || !templateRouteBase) return null

  const normalizedBase = templateRouteBase.replace(/\/+$/, '')
  const href = `${normalizedBase}/${encodeURIComponent(templateId)}`
  if (!templateRouteQuery) return href
  return `${href}?${templateRouteQuery.replace(/^\?/, '')}`
}

export function resolveTemplateLibraryCards(input: {
  templates: TemplateListApiCard[]
  templateRouteBase?: string | null
  templateRouteQuery?: string | null
}): TemplateLibraryCard[] {
  const sorted = [...input.templates].sort((a, b) => {
    const tsA = Number(new Date(a.createdAt).getTime()) || 0
    const tsB = Number(new Date(b.createdAt).getTime()) || 0
    if (tsA !== tsB) return tsB - tsA
    return b.id.localeCompare(a.id)
  })

  return sorted.map((template) => ({
    ...template,
    editHref: resolveTemplateEditHref({
      templateId: template.id,
      templateRouteBase: input.templateRouteBase,
      templateRouteQuery: input.templateRouteQuery,
    }),
  }))
}

export function resolveTemplateLibraryUiView(input: {
  isLoading: boolean
  error: string | null | undefined
  templatesCount: number
}): TemplateLibraryUiView {
  if (input.isLoading) return 'loading'
  if (normalizeText(input.error)) return 'error'
  if (input.templatesCount > 0) return 'list'
  return 'empty'
}
