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
    source: 'rendered_capture' | 'fallback'
    imagePath: string | null
    entryHtmlFileName?: string | null
    templateType?: 'single_page' | 'multi_page' | 'unknown'
  }
  createdAt: string
}

export type TemplateLibraryCard = TemplateListApiCard & {
  editHref: string | null
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
