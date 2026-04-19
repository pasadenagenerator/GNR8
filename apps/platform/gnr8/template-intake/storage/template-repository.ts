import 'server-only'

import type { PoolClient } from 'pg'

import type {
  CreateTemplateInput,
  TemplateListItem,
  TemplateRecord,
  TemplateType,
  UpdateTemplateProcessingResultInput,
} from '@/gnr8/template-intake/types/template-intake-types'
import { getSuperadminPool } from '@/src/superadmin/db'

export type TemplateRepositoryErrorCode = 'TEMPLATE_TABLE_NOT_FOUND' | 'TEMPLATE_REPOSITORY_FAILURE'
export type TemplateListReadDiagnostics = {
  normalizedRowCount: number
  skippedRowCount: number
}

export class TemplateRepositoryError extends Error {
  readonly code: TemplateRepositoryErrorCode

  constructor(code: TemplateRepositoryErrorCode, message: string) {
    super(message)
    this.name = 'TemplateRepositoryError'
    this.code = code
  }
}

type PgLikeError = {
  code?: unknown
  message?: unknown
  table?: unknown
}

function normalizeErrorText(value: unknown): string {
  return String(value ?? '').trim()
}

function isTemplateTableNotFoundError(error: unknown): boolean {
  const pgError = error as PgLikeError | null
  const code = normalizeErrorText(pgError?.code)
  if (code !== '42P01') return false

  const message = normalizeErrorText(pgError?.message).toLowerCase()
  const table = normalizeErrorText(pgError?.table).toLowerCase()
  return message.includes('gnr8_templates') || table === 'gnr8_templates'
}

function toTemplateRepositoryError(error: unknown): TemplateRepositoryError {
  if (error instanceof TemplateRepositoryError) return error
  if (isTemplateTableNotFoundError(error)) {
    return new TemplateRepositoryError(
      'TEMPLATE_TABLE_NOT_FOUND',
      'Template storage is not provisioned. Run DB migrations and retry.',
    )
  }
  return new TemplateRepositoryError('TEMPLATE_REPOSITORY_FAILURE', 'Template storage request failed.')
}

export function parseTemplateRepositoryError(
  error: unknown,
): { status: number; code: TemplateRepositoryErrorCode; message: string } | null {
  const mapped = error instanceof TemplateRepositoryError ? error : isTemplateTableNotFoundError(error) ? toTemplateRepositoryError(error) : null
  if (!mapped) return null

  if (mapped.code === 'TEMPLATE_TABLE_NOT_FOUND') {
    return {
      status: 500,
      code: mapped.code,
      message: mapped.message,
    }
  }

  return {
    status: 500,
    code: mapped.code,
    message: mapped.message,
  }
}

type TemplateRow = {
  id: string
  client_id: string
  organization_id: string | null
  agency_id: string | null
  created_by_user_id: string | null
  name: string
  slug: string
  source_type: string
  status: string
  import_health: string
  preview_image_path: string | null
  preview_available: boolean
  preview_is_fallback: boolean
  preview_source: string
  tags: string[] | null
  source_filename: string
  entry_html_path: string | null
  entry_html_file_name: string | null
  template_type: string | null
  import_snapshot_id: string | null
  durable_snapshot_root_dir_abs: string | null
  template_manifest_summary: unknown | null
  diagnostics_summary: unknown | null
  import_manifest_summary: unknown | null
  version: number
  visibility: string
  created_at: string
  updated_at: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeOptionalText(value: unknown): string | null {
  const normalized = normalizeText(value)
  return normalized || null
}

export function normalizeTemplateTypeForStorage(value: unknown): TemplateType {
  const normalized = normalizeText(value)
  if (normalized === 'single_page' || normalized === 'multi_page' || normalized === 'unknown') return normalized
  if (!normalized) return 'unknown'
  throw new TemplateRepositoryError(
    'TEMPLATE_REPOSITORY_FAILURE',
    `Invalid template_type value "${normalized}".`,
  )
}

type ReadNormalizedTemplateRow = {
  status: TemplateRecord['status']
  importHealth: TemplateRecord['importHealth']
  previewSource: TemplateRecord['previewSource']
  previewAvailable: boolean
  templateType: TemplateRecord['templateType']
  normalizedFields: string[]
}

function normalizeTemplateRowForRead(row: TemplateRow): ReadNormalizedTemplateRow {
  const normalizedFields: string[] = []
  const status =
    row.status === 'uploaded' || row.status === 'processing' || row.status === 'ready' || row.status === 'failed'
      ? row.status
      : 'failed'
  if (status !== row.status) normalizedFields.push('status')
  const importHealth =
    row.import_health === 'clean' ||
    row.import_health === 'degraded' ||
    row.import_health === 'failed'
      ? row.import_health
      : 'failed'
  if (importHealth !== row.import_health) normalizedFields.push('import_health')
  const previewSource =
    row.preview_source === 'rendered_capture' ||
    row.preview_source === 'html_snapshot' ||
    row.preview_source === 'fallback'
      ? row.preview_source
      : 'fallback'
  if (previewSource !== row.preview_source) normalizedFields.push('preview_source')
  const previewAvailable =
    typeof row.preview_available === 'boolean'
      ? row.preview_available
      : false
  if (previewAvailable !== row.preview_available) normalizedFields.push('preview_available')
  const templateType =
    row.template_type === 'single_page' || row.template_type === 'multi_page' || row.template_type === 'unknown'
      ? row.template_type
      : 'unknown'
  if (templateType !== row.template_type) normalizedFields.push('template_type')

  if (normalizedFields.length > 0) {
    console.info('[template-intake] TEMPLATE_LIST_ROW_NORMALIZED', {
      templateId: row.id,
      normalizedFields,
      original: {
        status: row.status,
        importHealth: row.import_health,
        previewSource: row.preview_source,
        previewAvailable: row.preview_available,
        templateType: row.template_type,
      },
      normalized: {
        status,
        importHealth,
        previewSource,
        previewAvailable,
        templateType,
      },
    })
  }

  return {
    status,
    importHealth,
    previewSource,
    previewAvailable,
    templateType,
    normalizedFields,
  }
}

function mapTemplateRowFromNormalizedRead(row: TemplateRow, normalizedRead: ReadNormalizedTemplateRow): TemplateRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: normalizeOptionalText(row.organization_id),
    agencyId: normalizeOptionalText(row.agency_id),
    createdByUserId: normalizeOptionalText(row.created_by_user_id),
    name: row.name,
    slug: row.slug,
    sourceType: row.source_type === 'zip_html' ? 'zip_html' : 'zip_html',
    status: normalizedRead.status,
    importHealth: normalizedRead.importHealth,
    previewImagePath: normalizeOptionalText(row.preview_image_path),
    previewAvailable: normalizedRead.previewAvailable,
    previewIsFallback: Boolean(row.preview_is_fallback),
    previewSource: normalizedRead.previewSource,
    tags: Array.isArray(row.tags) ? row.tags.map((value) => normalizeText(value)).filter(Boolean) : [],
    sourceFilename: row.source_filename,
    entryHtmlPath: normalizeOptionalText(row.entry_html_path),
    entryHtmlFileName: normalizeOptionalText(row.entry_html_file_name),
    templateType: normalizedRead.templateType,
    importSnapshotId: normalizeOptionalText(row.import_snapshot_id),
    durableSnapshotRootDirAbs: normalizeOptionalText(row.durable_snapshot_root_dir_abs),
    templateManifestSummary: (row.template_manifest_summary ?? null) as TemplateRecord['templateManifestSummary'],
    diagnosticsSummary: (row.diagnostics_summary ?? null) as TemplateRecord['diagnosticsSummary'],
    importManifestSummary: (row.import_manifest_summary ?? null) as TemplateRecord['importManifestSummary'],
    version: Number(row.version ?? 1) || 1,
    visibility: row.visibility === 'private' ? 'private' : 'private',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapTemplateRow(row: TemplateRow): TemplateRecord {
  const normalizedRead = normalizeTemplateRowForRead(row)
  return mapTemplateRowFromNormalizedRead(row, normalizedRead)
}

export function mapTemplateRowWithReadDiagnostics(row: TemplateRow): {
  template: TemplateRecord
  diagnostics: {
    normalized: boolean
    normalizedFields: string[]
  }
} {
  const normalizedRead = normalizeTemplateRowForRead(row)
  const template = mapTemplateRowFromNormalizedRead(row, normalizedRead)
  return {
    template,
    diagnostics: {
      normalized: normalizedRead.normalizedFields.length > 0,
      normalizedFields: normalizedRead.normalizedFields,
    },
  }
}

async function withConnection<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getSuperadminPool().connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export async function createTemplate(input: CreateTemplateInput): Promise<TemplateRecord> {
  return withConnection(async (client) => {
    try {
      const result = await client.query<TemplateRow>(
        `
      insert into public.gnr8_templates (
        client_id,
        organization_id,
        agency_id,
        created_by_user_id,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility
      )
      values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        $5::text,
        $6::text,
        'zip_html'::text,
        $7::text,
        $8::text,
        null,
        false,
        true,
        'html_snapshot'::text,
        $9::text[],
        $10::text,
        $11::text,
        $12::text,
        $13::text,
        null,
        null,
        $14::jsonb,
        $15::jsonb,
        null,
        1,
        'private'::text
      )
      returning
        id::text,
        client_id::text,
        organization_id::text,
        agency_id::text,
        created_by_user_id::text,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility,
        created_at::text,
        updated_at::text
      `,
      [
        input.clientId,
        input.organizationId,
        input.agencyId,
        input.createdByUserId,
        input.name,
        input.slug,
        input.status,
        input.importHealth,
        input.tags,
        input.sourceFilename,
        input.entryHtmlPath,
        input.entryHtmlFileName,
        normalizeTemplateTypeForStorage(input.templateType),
        input.templateManifestSummary,
        input.diagnosticsSummary,
      ],
      )

      const row = result.rows[0]
      if (!row) {
        throw new TemplateRepositoryError('TEMPLATE_REPOSITORY_FAILURE', 'Template record creation failed.')
      }

      return mapTemplateRow(row)
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}

export async function updateTemplateProcessingResult(input: UpdateTemplateProcessingResultInput): Promise<TemplateRecord> {
  return withConnection(async (client) => {
    try {
      const result = await client.query<TemplateRow>(
        `
      update public.gnr8_templates
      set
        status = $2::text,
        import_health = $3::text,
        preview_image_path = $4::text,
        preview_available = $5::boolean,
        preview_is_fallback = $6::boolean,
        preview_source = $7::text,
        tags = $8::text[],
        import_snapshot_id = $9::text,
        durable_snapshot_root_dir_abs = $10::text,
        entry_html_path = $11::text,
        entry_html_file_name = $12::text,
        template_type = $13::text,
        diagnostics_summary = $14::jsonb,
        template_manifest_summary = $15::jsonb,
        import_manifest_summary = $16::jsonb,
        updated_at = now()
      where id = $1::uuid
      returning
        id::text,
        client_id::text,
        organization_id::text,
        agency_id::text,
        created_by_user_id::text,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility,
        created_at::text,
        updated_at::text
      `,
      [
        input.templateId,
        input.status,
        input.importHealth,
        input.preview.previewImagePath,
        input.preview.previewAvailable,
        input.preview.previewIsFallback,
        input.preview.previewSource,
        input.tags,
        input.importSnapshotId,
        input.durableSnapshotRootDirAbs,
        input.entryHtmlPath,
        input.entryHtmlFileName,
        normalizeTemplateTypeForStorage(input.templateType),
        input.diagnosticsSummary,
        input.templateManifestSummary,
        input.importManifestSummary,
      ],
      )

      const row = result.rows[0]
      if (!row) {
        throw new TemplateRepositoryError('TEMPLATE_REPOSITORY_FAILURE', 'Template record update failed.')
      }

      return mapTemplateRow(row)
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}

export async function listTemplatesForClientWithDiagnostics(input: {
  clientId: string
  limit?: number
}): Promise<{ templates: TemplateListItem[]; diagnostics: TemplateListReadDiagnostics }> {
  return withConnection(async (client) => {
    const limit = Math.min(Math.max(Number(input.limit ?? 120) || 120, 1), 500)

    try {
      const result = await client.query<TemplateRow>(
        `
      select
        id::text,
        client_id::text,
        organization_id::text,
        agency_id::text,
        created_by_user_id::text,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility,
        created_at::text,
        updated_at::text
      from public.gnr8_templates
      where client_id = $1::uuid
      order by created_at desc, id desc
      limit $2
      `,
      [input.clientId, limit],
      )

      const mapped: TemplateListItem[] = []
      let normalizedRowCount = 0
      let skippedRowCount = 0
      for (const row of result.rows) {
        try {
          const mappedRow = mapTemplateRowWithReadDiagnostics(row)
          if (mappedRow.diagnostics.normalized) normalizedRowCount += 1
          mapped.push(mappedRow.template)
        } catch (error) {
          skippedRowCount += 1
          console.warn('[template-intake] TEMPLATE_LIST_ROW_SKIPPED', {
            templateId: normalizeOptionalText(row.id),
            cause: error instanceof Error ? error.message : String(error),
            errorClass: error instanceof Error ? error.constructor.name : typeof error,
          })
        }
      }

      return {
        templates: mapped,
        diagnostics: {
          normalizedRowCount,
          skippedRowCount,
        },
      }
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}

export async function listTemplatesForClient(input: { clientId: string; limit?: number }): Promise<TemplateListItem[]> {
  const result = await listTemplatesForClientWithDiagnostics(input)
  return result.templates
}

export async function getTemplateByIdForClient(input: {
  clientId: string
  templateId: string
}): Promise<TemplateRecord | null> {
  return withConnection(async (client) => {
    try {
      const result = await client.query<TemplateRow>(
        `
      select
        id::text,
        client_id::text,
        organization_id::text,
        agency_id::text,
        created_by_user_id::text,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility,
        created_at::text,
        updated_at::text
      from public.gnr8_templates
      where client_id = $1::uuid
        and id = $2::uuid
      limit 1
      `,
        [input.clientId, input.templateId],
      )

      const row = result.rows[0]
      return row ? mapTemplateRow(row) : null
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}

export async function updateTemplateMetadataById(input: {
  clientId: string
  templateId: string
  name: string
  tags: string[]
}): Promise<TemplateRecord | null> {
  return withConnection(async (client) => {
    try {
      const result = await client.query<TemplateRow>(
        `
      update public.gnr8_templates
      set
        name = $3::text,
        tags = $4::text[],
        updated_at = now()
      where client_id = $1::uuid
        and id = $2::uuid
      returning
        id::text,
        client_id::text,
        organization_id::text,
        agency_id::text,
        created_by_user_id::text,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility,
        created_at::text,
        updated_at::text
      `,
        [input.clientId, input.templateId, input.name, input.tags],
      )

      const row = result.rows[0]
      return row ? mapTemplateRow(row) : null
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}

export async function deleteTemplateByIdForClient(input: {
  clientId: string
  templateId: string
}): Promise<TemplateRecord | null> {
  return withConnection(async (client) => {
    try {
      const result = await client.query<TemplateRow>(
        `
      delete from public.gnr8_templates
      where client_id = $1::uuid
        and id = $2::uuid
      returning
        id::text,
        client_id::text,
        organization_id::text,
        agency_id::text,
        created_by_user_id::text,
        name,
        slug,
        source_type,
        status,
        import_health,
        preview_image_path,
        preview_available,
        preview_is_fallback,
        preview_source,
        tags,
        source_filename,
        entry_html_path,
        entry_html_file_name,
        template_type,
        import_snapshot_id,
        durable_snapshot_root_dir_abs,
        template_manifest_summary,
        diagnostics_summary,
        import_manifest_summary,
        version,
        visibility,
        created_at::text,
        updated_at::text
      `,
        [input.clientId, input.templateId],
      )

      const row = result.rows[0]
      return row ? mapTemplateRow(row) : null
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}
