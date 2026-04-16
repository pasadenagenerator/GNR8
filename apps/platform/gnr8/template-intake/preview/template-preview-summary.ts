import fs from 'node:fs'
import path from 'node:path'

import type { TemplateIntakeDiagnostic, TemplatePreviewSummary } from '@/gnr8/template-intake/types/template-intake-types'
import { createTemplateIntakeDiagnostic } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function resolvePreviewFromScreenshotPaths(paths: string[]): string | null {
  for (const screenshotPath of paths) {
    const normalized = normalizeText(screenshotPath)
    if (!normalized) continue
    try {
      const stat = fs.statSync(normalized)
      if (stat.isFile() && stat.size > 0) return normalized
    } catch {
      continue
    }
  }
  return null
}

export function buildTemplatePreviewSummary(input: {
  screenshotPaths: string[]
  entryHtmlPath?: string | null
}): {
  preview: TemplatePreviewSummary
  diagnostics: TemplateIntakeDiagnostic[]
} {
  const screenshotPath = resolvePreviewFromScreenshotPaths(input.screenshotPaths)
  const entryHtmlPath = normalizeText(input.entryHtmlPath)
  const entryHtmlFileName = entryHtmlPath ? path.posix.basename(entryHtmlPath.replaceAll('\\', '/')) : null

  if (screenshotPath) {
    return {
      preview: {
        previewAvailable: true,
        previewIsFallback: false,
        previewSource: 'rendered_capture',
        previewImagePath: screenshotPath,
        previewLabel: 'Rendered preview capture available',
        entryHtmlFileName,
      },
      diagnostics: [
        createTemplateIntakeDiagnostic({
          code: 'TEMPLATE_PREVIEW_RESOLVED',
          severity: 'info',
          message: 'Template preview resolved from rendered capture evidence.',
          details: { previewImagePath: screenshotPath },
        }),
      ],
    }
  }

  return {
    preview: {
      previewAvailable: false,
      previewIsFallback: true,
      previewSource: 'html_snapshot',
      previewImagePath: null,
      previewLabel: 'No preview available',
      entryHtmlFileName,
    },
    diagnostics: [
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_INTAKE_NO_RENDER_CAPTURE',
        severity: 'warning',
        message: 'Rendered preview capture is unavailable; template remains usable with HTML snapshot fallback.',
      }),
    ],
  }
}
