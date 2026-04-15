function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export type TemplateLibraryUiView = 'loading' | 'error' | 'list' | 'empty'

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
