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
  entryHtmlFileName: string | null
  templateType: 'single_page' | 'multi_page' | 'unknown'
  preview: {
    available: boolean
    isFallback: boolean
    source: 'rendered_capture' | 'html_snapshot' | 'fallback'
    imagePath: string | null
  }
  processingAttempts: number
  processingError: string | null
  reasonCode: string | null
  diagnosticsSummary: TemplateRecord['diagnosticsSummary']
  importManifestSummary: TemplateRecord['importManifestSummary']
  importManifestFileCount: number | null
  importManifestEntryHtmlPath: string | null
  semanticImportSummary: string
  rawArtifactAvailable: boolean
  contentSlotCount: number | null
  createdAt: string
  updatedAt: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function mapTemplateToListCard(template: TemplateRecord): TemplateListCard {
  const importManifestFileCount = Array.isArray(template.importManifestSummary?.htmlFilePaths)
    ? template.importManifestSummary?.htmlFilePaths.length
    : null
  const importManifestEntryHtmlPath = normalizeText(template.importManifestSummary?.entryHtmlPath) || null
  const rawArtifactAvailable = Boolean(
    normalizeText(template.durableSnapshotRootDirAbs) ||
      normalizeText(template.importSnapshotId) ||
      (normalizeText(template.sourceZipStorageBucket) && normalizeText(template.sourceZipStorageKey)),
  )
  const reasonCode = template.status === 'failed' ? template.reasonCode ?? 'TEMPLATE_UNKNOWN_FAILURE' : null
  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    sourceType: template.sourceType,
    status: template.status,
    importHealth: template.importHealth,
    tags: Array.isArray(template.tags) ? template.tags : [],
    sourceFilename: template.sourceFilename,
    entryHtmlFileName: normalizeText(template.entryHtmlFileName) || null,
    templateType: template.templateType,
    preview: {
      available: Boolean(template.previewAvailable),
      isFallback: Boolean(template.previewIsFallback),
      source: template.previewSource,
      imagePath: normalizeText(template.previewImagePath) || null,
    },
    processingAttempts: Number(template.processingAttempts ?? 0) || 0,
    processingError: normalizeText(template.processingError) || null,
    reasonCode,
    diagnosticsSummary: template.diagnosticsSummary,
    importManifestSummary: template.importManifestSummary,
    importManifestFileCount,
    importManifestEntryHtmlPath,
    semanticImportSummary:
      template.importHealth === 'clean'
        ? 'Semantic import clean'
        : template.importHealth === 'degraded'
          ? 'Semantic import degraded'
          : 'Semantic import failed',
    rawArtifactAvailable,
    contentSlotCount: null,
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
