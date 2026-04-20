import { createTemplateIntakeDiagnostic, summarizeTemplateDiagnostics } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'
import { TEMPLATE_ZIP_MAX_BYTES } from '@/gnr8/template-intake/core/template-zip-validator'
import {
  createTemplate,
  updateTemplateProcessingResult,
  updateTemplateSourceZipReference,
} from '@/gnr8/template-intake/storage/template-repository'
import { persistTemplateSourceZip } from '@/gnr8/template-intake/storage/template-source-zip-storage'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function deriveTemplateNameFromFilename(fileName: string): string {
  return normalizeText(fileName).replace(/\.zip$/i, '').replace(/[_-]+/g, ' ').trim() || 'Untitled Template'
}

function deriveTemplateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'template'
  return `${base}-${Date.now().toString(36)}`
}

export function validateTemplateZipUploadInput(input: {
  fileName: string
  contentType: string
  bytes: Uint8Array
}): { ok: true } | { ok: false; status: number; error: string } {
  const fileName = normalizeText(input.fileName)
  const contentType = normalizeText(input.contentType).toLowerCase()

  if (!fileName.toLowerCase().endsWith('.zip') && contentType !== 'application/zip' && contentType !== 'application/x-zip-compressed') {
    return {
      ok: false,
      status: 400,
      error: 'Template upload only accepts ZIP files.',
    }
  }

  if (!(input.bytes instanceof Uint8Array) || input.bytes.byteLength <= 0) {
    return {
      ok: false,
      status: 400,
      error: 'Uploaded ZIP file is empty.',
    }
  }

  if (input.bytes.byteLength > TEMPLATE_ZIP_MAX_BYTES) {
    return {
      ok: false,
      status: 400,
      error: `ZIP file exceeds maximum upload size (${Math.floor(TEMPLATE_ZIP_MAX_BYTES / (1024 * 1024))} MB).`,
    }
  }

  return { ok: true }
}

async function markTemplateFailedForSourceUpload(input: {
  template: TemplateRecord
  message: string
}): Promise<TemplateRecord> {
  return updateTemplateProcessingResult({
    templateId: input.template.id,
    status: 'failed',
    importHealth: 'failed',
    entryHtmlPath: null,
    entryHtmlFileName: null,
    templateType: 'unknown',
    preview: {
      previewAvailable: false,
      previewIsFallback: true,
      previewSource: 'html_snapshot',
      previewImagePath: null,
      previewLabel: 'No preview available',
      entryHtmlFileName: null,
    },
    tags: [],
    importSnapshotId: null,
    durableSnapshotRootDirAbs: null,
    diagnosticsSummary: summarizeTemplateDiagnostics([
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_RECEIVED',
        severity: 'info',
        message: 'Template upload accepted and template row created.',
      }),
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_IMPORT_FAILED',
        severity: 'fatal',
        message: input.message,
      }),
    ]),
    templateManifestSummary: {
      source: 'derived',
      name: input.template.name,
      description: null,
      tags: [],
    },
    importManifestSummary: null,
  })
}

export async function createProcessingTemplateFromZipUpload(input: {
  actorUserId: string
  clientId: string
  organizationId: string | null
  agencyId: string | null
  fileName: string
  bytes: Uint8Array
}): Promise<TemplateRecord> {
  const name = deriveTemplateNameFromFilename(input.fileName)
  const created = await createTemplate({
    clientId: input.clientId,
    organizationId: input.organizationId,
    agencyId: input.agencyId,
    createdByUserId: normalizeText(input.actorUserId) || null,
    name,
    slug: deriveTemplateSlug(name),
    sourceFilename: input.fileName,
    sourceZipStorageBucket: null,
    sourceZipStorageKey: null,
    entryHtmlPath: null,
    entryHtmlFileName: null,
    templateType: 'unknown',
    tags: [],
    status: 'processing',
    importHealth: 'degraded',
    templateManifestSummary: {
      source: 'derived',
      name,
      description: null,
      tags: [],
    },
    diagnosticsSummary: summarizeTemplateDiagnostics([
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_RECEIVED',
        severity: 'info',
        message: 'Template upload accepted and processing started.',
      }),
    ]),
  })

  try {
    const zipRef = await persistTemplateSourceZip({
      clientId: input.clientId,
      templateId: created.id,
      sourceFilename: input.fileName,
      bytes: input.bytes,
    })

    return updateTemplateSourceZipReference({
      templateId: created.id,
      sourceZipStorageBucket: zipRef.bucket,
      sourceZipStorageKey: zipRef.key,
    })
  } catch (error) {
    return markTemplateFailedForSourceUpload({
      template: created,
      message: error instanceof Error ? error.message : 'Failed to persist template ZIP source.',
    })
  }
}
