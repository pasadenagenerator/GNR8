import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

export type TemplateListCard = {
  id: string
  name: string
  slug: string
  sourceType: 'zip_html'
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  importHealth: 'clean' | 'degraded' | 'failed'
  tags: string[]
  sourceFilename: string
  preview: {
    available: boolean
    isFallback: boolean
    source: 'rendered_capture' | 'fallback'
    imagePath: string | null
  }
  createdAt: string
  updatedAt: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function mapTemplateToListCard(template: TemplateRecord): TemplateListCard {
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    sourceType: template.sourceType,
    status: template.status,
    importHealth: template.importHealth,
    tags: Array.isArray(template.tags) ? template.tags : [],
    sourceFilename: template.sourceFilename,
    preview: {
      available: Boolean(template.previewAvailable),
      isFallback: Boolean(template.previewIsFallback),
      source: template.previewSource,
      imagePath: normalizeText(template.previewImagePath) || null,
    },
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export function sortTemplateCardsDeterministically(cards: TemplateListCard[]): TemplateListCard[] {
  return [...cards].sort((a, b) => {
    const tsA = Number(new Date(a.createdAt).getTime()) || 0
    const tsB = Number(new Date(b.createdAt).getTime()) || 0
    if (tsA !== tsB) return tsB - tsA
    return b.id.localeCompare(a.id)
  })
}
