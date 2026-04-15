import 'server-only'

import type { PoolClient } from 'pg'

import type {
  CreateTemplateInput,
  TemplateListItem,
  TemplateRecord,
  UpdateTemplateProcessingResultInput,
} from '@/gnr8/template-intake/types/template-intake-types'
import { getSuperadminPool } from '@/src/superadmin/db'

export type TemplateRepositoryErrorCode = 'TEMPLATE_TABLE_NOT_FOUND' | 'TEMPLATE_REPOSITORY_FAILURE'

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
  import_snapshot_id: string | null
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

function mapTemplateRow(row: TemplateRow): TemplateRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    organizationId: normalizeOptionalText(row.organization_id),
    agencyId: normalizeOptionalText(row.agency_id),
    createdByUserId: normalizeOptionalText(row.created_by_user_id),
    name: row.name,
    slug: row.slug,
    sourceType: row.source_type === 'zip_html' ? 'zip_html' : 'zip_html',
    status: row.status === 'uploaded' || row.status === 'processing' || row.status === 'ready' || row.status === 'failed' ? row.status : 'failed',
    importHealth: row.import_health === 'clean' || row.import_health === 'degraded' || row.import_health === 'failed' ? row.import_health : 'failed',
    previewImagePath: normalizeOptionalText(row.preview_image_path),
    previewAvailable: Boolean(row.preview_available),
    previewIsFallback: Boolean(row.preview_is_fallback),
    previewSource: row.preview_source === 'rendered_capture' ? 'rendered_capture' : 'fallback',
    tags: Array.isArray(row.tags) ? row.tags.map((value) => normalizeText(value)).filter(Boolean) : [],
    sourceFilename: row.source_filename,
    importSnapshotId: normalizeOptionalText(row.import_snapshot_id),
    templateManifestSummary: (row.template_manifest_summary ?? null) as TemplateRecord['templateManifestSummary'],
    diagnosticsSummary: (row.diagnostics_summary ?? null) as TemplateRecord['diagnosticsSummary'],
    importManifestSummary: (row.import_manifest_summary ?? null) as TemplateRecord['importManifestSummary'],
    version: Number(row.version ?? 1) || 1,
    visibility: row.visibility === 'private' ? 'private' : 'private',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
        import_snapshot_id,
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
        'fallback'::text,
        $9::text[],
        $10::text,
        null,
        $11::jsonb,
        $12::jsonb,
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
        import_snapshot_id,
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
        diagnostics_summary = $10::jsonb,
        template_manifest_summary = $11::jsonb,
        import_manifest_summary = $12::jsonb,
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
        import_snapshot_id,
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

export async function listTemplatesForClient(input: { clientId: string; limit?: number }): Promise<TemplateListItem[]> {
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
        import_snapshot_id,
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

      return result.rows.map((row) => mapTemplateRow(row))
    } catch (error) {
      throw toTemplateRepositoryError(error)
    }
  })
}
