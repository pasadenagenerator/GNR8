import { getSuperadminPool } from '@/src/superadmin/db'
import type { TemplateSiteRuntimeBootstrapResult } from '@/gnr8/site/site-template-runtime-bootstrap-service'

export type SiteBootstrapRecord = {
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

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export async function getSiteBootstrapRecordById(input: { siteId: string }): Promise<SiteBootstrapRecord | null> {
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
      select
        s.id::text as id,
        s.org_id::text as org_id,
        s.agency_id::text as agency_id,
        s.template_id::text as template_id,
        s.name,
        s.domain,
        s.status::text as status,
        s.created_at::text as created_at,
        s.updated_at::text as updated_at
      from public.sites s
      where s.id = $1::uuid
      limit 1
      `,
      [input.siteId],
    )
    const row = result.rows[0]
    if (!row || !row.id || !row.org_id || !row.agency_id || !row.template_id || !row.domain || !row.created_at || !row.updated_at) {
      return null
    }
    return {
      siteId: row.id,
      clientId: row.org_id,
      agencyId: row.agency_id,
      templateId: row.template_id,
      name: normalizeText(row.name),
      domain: row.domain,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } finally {
    client.release()
  }
}

export async function markSiteBootstrapStarted(input: {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
}): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      insert into public.gnr8_site_bootstrap_jobs (
        site_id,
        client_id,
        agency_id,
        template_id,
        status,
        attempts,
        queued_at,
        started_at,
        updated_at
      )
      values (
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4::uuid,
        'running',
        1,
        now(),
        now(),
        now()
      )
      on conflict (site_id)
      do update set
        client_id = excluded.client_id,
        agency_id = excluded.agency_id,
        template_id = excluded.template_id,
        status = 'running',
        attempts = public.gnr8_site_bootstrap_jobs.attempts + 1,
        started_at = now(),
        updated_at = now(),
        last_error_code = null,
        last_error_message = null
      `,
      [input.siteId, input.clientId, input.agencyId, input.templateId],
    )
  } finally {
    client.release()
  }
}

export async function markSiteBootstrapCompleted(input: {
  siteId: string
  templateId: string
  result: TemplateSiteRuntimeBootstrapResult
}): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.gnr8_site_bootstrap_jobs
      set
        status = 'completed',
        runtime_site_id = nullif($2::text, '')::uuid,
        runtime_site_version_id = nullif($3::text, '')::uuid,
        artifact_id = nullif($4::text, '')::uuid,
        section_count = $5::integer,
        completed_at = now(),
        updated_at = now(),
        last_error_code = null,
        last_error_message = null
      where site_id = $1::uuid
        and template_id = $6::uuid
      `,
      [
        input.siteId,
        input.result.runtimeSiteId,
        input.result.siteVersionId,
        input.result.artifactId ?? '',
        input.result.sectionCount,
        input.templateId,
      ],
    )
  } finally {
    client.release()
  }
}

export async function markSiteBootstrapFailed(input: {
  siteId: string
  templateId: string
  errorCode: string
  errorMessage: string
}): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.gnr8_site_bootstrap_jobs
      set
        status = 'failed',
        updated_at = now(),
        completed_at = now(),
        last_error_code = $2::text,
        last_error_message = $3::text
      where site_id = $1::uuid
        and template_id = $4::uuid
      `,
      [input.siteId, input.errorCode, input.errorMessage, input.templateId],
    )
  } finally {
    client.release()
  }
}
