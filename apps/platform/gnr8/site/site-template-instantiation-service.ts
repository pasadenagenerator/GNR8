import { getSuperadminPool } from '@/src/superadmin/db'

export type CreateSiteFromTemplateRecordInput = {
  clientId: string
  agencyId: string
  templateId: string
  name: string
  domain: string
}

export type CreatedSiteRecord = {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
  name: string
  domain: string
  status: string
  createdAt: string
  updatedAt: string
}

export type SiteTemplateInstantiationErrorCode =
  | 'SITE_TABLE_NOT_FOUND'
  | 'SITE_TEMPLATE_LINKAGE_NOT_AVAILABLE'
  | 'SITE_NAME_COLUMN_NOT_AVAILABLE'
  | 'SITE_TEMPLATE_INSTANTIATION_FAILED'

export class SiteTemplateInstantiationError extends Error {
  readonly code: SiteTemplateInstantiationErrorCode

  constructor(code: SiteTemplateInstantiationErrorCode, message: string) {
    super(message)
    this.name = 'SiteTemplateInstantiationError'
    this.code = code
  }
}

type PgLikeError = {
  code?: unknown
  message?: unknown
  table?: unknown
  column?: unknown
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toServiceError(error: unknown): SiteTemplateInstantiationError {
  if (error instanceof SiteTemplateInstantiationError) return error
  const pgError = error as PgLikeError | null
  const code = normalizeText(pgError?.code)
  const message = normalizeText(pgError?.message).toLowerCase()
  const table = normalizeText(pgError?.table).toLowerCase()
  const column = normalizeText(pgError?.column).toLowerCase()

  if (code === '42P01' && (table === 'sites' || message.includes('public.sites'))) {
    return new SiteTemplateInstantiationError(
      'SITE_TABLE_NOT_FOUND',
      'Site storage is not provisioned. Run DB migrations and retry.',
    )
  }
  if (code === '42703' && (column === 'template_id' || message.includes('template_id'))) {
    return new SiteTemplateInstantiationError(
      'SITE_TEMPLATE_LINKAGE_NOT_AVAILABLE',
      'Site template linkage column is missing. Run DB migrations and retry.',
    )
  }
  if (code === '42703' && (column === 'name' || message.includes(' name '))) {
    return new SiteTemplateInstantiationError(
      'SITE_NAME_COLUMN_NOT_AVAILABLE',
      'Site name column is missing. Run DB migrations and retry.',
    )
  }
  return new SiteTemplateInstantiationError('SITE_TEMPLATE_INSTANTIATION_FAILED', 'Site creation request failed.')
}

export function parseSiteTemplateInstantiationError(
  error: unknown,
): { status: number; code: SiteTemplateInstantiationErrorCode; message: string } | null {
  const mapped = error instanceof SiteTemplateInstantiationError ? error : null
  if (!mapped) return null
  return {
    status: 500,
    code: mapped.code,
    message: mapped.message,
  }
}

export async function createSiteFromTemplateRecord(input: CreateSiteFromTemplateRecordInput): Promise<CreatedSiteRecord> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<{
      id: string
      org_id: string
      agency_id: string
      template_id: string | null
      name: string
      domain: string | null
      status: string
      created_at: string
      updated_at: string
    }>(
      `
      insert into public.sites (
        org_id,
        agency_id,
        status,
        domain,
        is_template,
        name,
        template_id
      )
      values (
        $1::uuid,
        $2::uuid,
        'draft'::public.site_status_enum,
        $3::text,
        false,
        $4::text,
        $5::uuid
      )
      returning
        id::text,
        org_id::text,
        agency_id::text,
        template_id::text,
        name,
        domain,
        status::text,
        created_at::text,
        updated_at::text
      `,
      [input.clientId, input.agencyId, input.domain, input.name, input.templateId],
    )

    const row = result.rows[0]
    if (!row || !row.id || !row.template_id || !row.domain || !row.created_at || !row.updated_at) {
      throw new SiteTemplateInstantiationError(
        'SITE_TEMPLATE_INSTANTIATION_FAILED',
        'Site creation returned incomplete row data.',
      )
    }

    return {
      siteId: row.id,
      clientId: row.org_id,
      agencyId: row.agency_id,
      templateId: row.template_id,
      name: row.name,
      domain: row.domain,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (error) {
    throw toServiceError(error)
  } finally {
    client.release()
  }
}
