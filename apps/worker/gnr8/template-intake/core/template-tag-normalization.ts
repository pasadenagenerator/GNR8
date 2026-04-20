const MAX_TAG_LENGTH = 32
const MAX_TAG_COUNT = 8

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeTemplateTag(value: unknown): string | null {
  const raw = normalizeText(value).toLowerCase()
  if (!raw) return null
  const normalized = raw
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_TAG_LENGTH)
  return normalized || null
}

export function dedupeAndSortTemplateTags(values: string[]): string[] {
  const unique = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return unique.slice(0, MAX_TAG_COUNT)
}

export function normalizeTemplateTagsForStorage(tags: string[]): string[] {
  return dedupeAndSortTemplateTags(tags.map((value) => normalizeTemplateTag(value)).filter((value): value is string => value != null))
}
