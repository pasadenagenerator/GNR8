function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export type SiteCreateUiView = 'loading_templates' | 'no_templates' | 'ready' | 'error'

export function resolveSiteCreateUiView(input: {
  isLoadingTemplates: boolean
  error: string | null | undefined
  templatesCount: number
}): SiteCreateUiView {
  if (input.isLoadingTemplates) return 'loading_templates'
  if (normalizeText(input.error)) return 'error'
  if (input.templatesCount <= 0) return 'no_templates'
  return 'ready'
}
