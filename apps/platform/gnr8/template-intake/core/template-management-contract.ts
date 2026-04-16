import { normalizeTemplateTagsForStorage } from '@/gnr8/template-intake/core/template-tag-normalization'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export type TemplateDetailCard = {
  id: string
  clientId: string
  name: string
  tags: string[]
  sourceType: 'zip_html'
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  importHealth: 'clean' | 'degraded' | 'failed'
  sourceFilename: string
  entryHtmlFileName: string | null
  templateType: 'single_page' | 'multi_page' | 'unknown'
  preview: {
    available: boolean
    isFallback: boolean
    source: 'rendered_capture' | 'fallback'
    imagePath: string | null
  }
  createdAt: string
  updatedAt: string
  templateManifestSummary: TemplateRecord['templateManifestSummary']
  diagnosticsSummary: TemplateRecord['diagnosticsSummary']
}

export type NormalizedTemplateMetadataPatch = {
  name: string
  tags: string[]
}

export function mapTemplateToDetailCard(template: TemplateRecord): TemplateDetailCard {
  return {
    id: template.id,
    clientId: template.clientId,
    name: template.name,
    tags: Array.isArray(template.tags) ? template.tags : [],
    sourceType: template.sourceType,
    status: template.status,
    importHealth: template.importHealth,
    sourceFilename: template.sourceFilename,
    entryHtmlFileName: normalizeText(template.entryHtmlFileName) || null,
    templateType: template.templateType,
    preview: {
      available: Boolean(template.previewAvailable),
      isFallback: Boolean(template.previewIsFallback),
      source: template.previewSource,
      imagePath: normalizeText(template.previewImagePath) || null,
    },
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    templateManifestSummary: template.templateManifestSummary,
    diagnosticsSummary: template.diagnosticsSummary,
  }
}

export function normalizeTemplateMetadataPatchPayload(
  payload: unknown,
):
  | {
      ok: true
      value: NormalizedTemplateMetadataPatch
    }
  | {
      ok: false
      code: 'TEMPLATE_INVALID_PAYLOAD'
      error: string
    } {
  if (!isPlainRecord(payload)) {
    return {
      ok: false,
      code: 'TEMPLATE_INVALID_PAYLOAD',
      error: 'Template update payload must be an object.',
    }
  }

  const keys = Object.keys(payload)
  const hasOnlyAllowedKeys = keys.every((key) => key === 'name' || key === 'tags')
  if (!hasOnlyAllowedKeys || !keys.includes('name') || !keys.includes('tags')) {
    return {
      ok: false,
      code: 'TEMPLATE_INVALID_PAYLOAD',
      error: 'Template update payload must include only name and tags.',
    }
  }

  const nameRaw = payload.name
  const tagsRaw = payload.tags

  if (typeof nameRaw !== 'string') {
    return {
      ok: false,
      code: 'TEMPLATE_INVALID_PAYLOAD',
      error: 'Template name must be a string.',
    }
  }

  const name = normalizeText(nameRaw)
  if (!name) {
    return {
      ok: false,
      code: 'TEMPLATE_INVALID_PAYLOAD',
      error: 'Template name is required.',
    }
  }

  if (!Array.isArray(tagsRaw) || tagsRaw.some((tag) => typeof tag !== 'string')) {
    return {
      ok: false,
      code: 'TEMPLATE_INVALID_PAYLOAD',
      error: 'Template tags must be an array of strings.',
    }
  }

  return {
    ok: true,
    value: {
      name,
      tags: normalizeTemplateTagsForStorage(tagsRaw),
    },
  }
}

export function parseTagsInputForForm(value: string): string[] {
  const split = value
    .split(',')
    .map((entry) => normalizeText(entry))
    .filter(Boolean)

  return normalizeTemplateTagsForStorage(split)
}

export function formatTagsForInput(tags: string[]): string {
  return (Array.isArray(tags) ? tags : []).join(', ')
}
