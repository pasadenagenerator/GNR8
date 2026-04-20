import fs from 'node:fs'
import path from 'node:path'

import type {
  TemplateIntakeDiagnostic,
  TemplateManifestSummary,
} from '@/gnr8/template-intake/types/template-intake-types'
import { createTemplateIntakeDiagnostic } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'
import {
  dedupeAndSortTemplateTags,
  normalizeTemplateTag,
  normalizeTemplateTagsForStorage,
} from '@/gnr8/template-intake/core/template-tag-normalization'

const MAX_NAME_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 480

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : ''))
    .join(' ')
    .trim()
}

function deriveNameFromFilename(fileName: string): string {
  const base = path.basename(normalizeText(fileName), path.extname(normalizeText(fileName)))
  const fallback = titleCase(base)
  if (fallback) return fallback.slice(0, MAX_NAME_LENGTH)
  return 'Untitled Template'
}

function deriveTagsFromFilename(fileName: string): string[] {
  const lowered = normalizeText(fileName).toLowerCase()
  const tags: string[] = []

  if (/restaurant|cafe|food/.test(lowered)) tags.push('restaurant')
  if (/portfolio/.test(lowered)) tags.push('portfolio')
  if (/shop|store/.test(lowered)) tags.push('ecommerce')
  if (/dark|night/.test(lowered)) tags.push('dark')
  if (/landing|hero/.test(lowered)) tags.push('landing-page')

  return dedupeAndSortTemplateTags(tags)
}

function normalizeManifest(raw: Record<string, unknown>, fileName: string): {
  summary: TemplateManifestSummary
  diagnostics: TemplateIntakeDiagnostic[]
} {
  const diagnostics: TemplateIntakeDiagnostic[] = []

  const normalizedName = normalizeText(raw.name).slice(0, MAX_NAME_LENGTH)
  const normalizedDescription = normalizeText(raw.description).slice(0, MAX_DESCRIPTION_LENGTH)

  const rawTags = Array.isArray(raw.tags)
    ? raw.tags
    : typeof raw.tags === 'string'
      ? raw.tags.split(',')
      : []

  const normalizedTags = dedupeAndSortTemplateTags(
    rawTags.map((value) => normalizeTemplateTag(value)).filter((value): value is string => value != null),
  )

  const name = normalizedName || deriveNameFromFilename(fileName)
  if (!normalizedName) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_NAME_DERIVED_FROM_FILENAME',
        severity: 'info',
        message: 'Template name was derived from source filename because manifest name was missing.',
        details: { fileName },
      }),
    )
  }

  if (normalizedTags.length === 0) {
    const derivedTags = deriveTagsFromFilename(fileName)
    if (derivedTags.length > 0) {
      diagnostics.push(
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_TAGS_DERIVED',
          severity: 'info',
          message: 'Template tags were deterministically derived from source filename.',
          details: { fileName, tags: derivedTags },
        }),
      )
    }

    return {
      summary: {
        source: 'derived',
        name,
        description: normalizedDescription || null,
        tags: derivedTags,
      },
      diagnostics,
    }
  }

  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_MANIFEST_NORMALIZED',
      severity: 'info',
      message: 'Template manifest fields were normalized deterministically.',
      details: {
        name,
        tagCount: normalizedTags.length,
      },
    }),
  )

  return {
    summary: {
      source: 'template.json',
      name,
      description: normalizedDescription || null,
      tags: normalizedTags,
    },
    diagnostics,
  }
}

export function slugifyTemplateName(value: string): string {
  const normalized = normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'template'
}

export function readTemplateManifest(input: {
  extractionRootDirAbs: string
  sourceFilename: string
  manifestPath: string | null
}): {
  summary: TemplateManifestSummary
  slug: string
  diagnostics: TemplateIntakeDiagnostic[]
} {
  const diagnostics: TemplateIntakeDiagnostic[] = []

  if (!input.manifestPath) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_MANIFEST_MISSING',
        severity: 'info',
        message: 'No template manifest was found in ZIP; deterministic defaults were derived.',
      }),
    )

    const name = deriveNameFromFilename(input.sourceFilename)
    const tags = deriveTagsFromFilename(input.sourceFilename)
    if (tags.length > 0) {
      diagnostics.push(
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_TAGS_DERIVED',
          severity: 'info',
          message: 'Template tags were deterministically derived from source filename.',
          details: { fileName: input.sourceFilename, tags },
        }),
      )
    }

    return {
      summary: {
        source: 'derived',
        name,
        description: null,
        tags,
      },
      slug: slugifyTemplateName(name),
      diagnostics,
    }
  }

  const absManifestPath = path.resolve(input.extractionRootDirAbs, input.manifestPath)
  let parsed: Record<string, unknown> | null = null

  try {
    const content = fs.readFileSync(absManifestPath, 'utf8')
    const json = JSON.parse(content) as unknown
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      parsed = json as Record<string, unknown>
    }
  } catch {
    parsed = null
  }

  if (!parsed) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_MANIFEST_MISSING',
        severity: 'warning',
        message: 'Template manifest could not be parsed; deterministic defaults were derived.',
        details: { manifestPath: input.manifestPath },
      }),
    )

    const name = deriveNameFromFilename(input.sourceFilename)
    const tags = deriveTagsFromFilename(input.sourceFilename)
    return {
      summary: {
        source: 'derived',
        name,
        description: null,
        tags,
      },
      slug: slugifyTemplateName(name),
      diagnostics,
    }
  }

  const foundCode = input.manifestPath.toLowerCase().endsWith('manifest.json') ? 'manifest.json' : 'template.json'
  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_MANIFEST_FOUND',
      severity: 'info',
      message: 'Template manifest found and parsed.',
      details: { manifestPath: input.manifestPath },
    }),
  )

  const normalized = normalizeManifest(parsed, input.sourceFilename)

  return {
    summary: {
      ...normalized.summary,
      source: foundCode,
    },
    slug: slugifyTemplateName(normalized.summary.name),
    diagnostics: [...diagnostics, ...normalized.diagnostics],
  }
}

export { normalizeTemplateTagsForStorage }
