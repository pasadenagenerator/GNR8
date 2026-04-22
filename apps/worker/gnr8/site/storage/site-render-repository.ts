import { getSuperadminPool } from '@/src/superadmin/db'

export type SiteRenderJobStatus = 'queued' | 'running' | 'completed' | 'failed'

type SiteRenderJobRow = {
  status: SiteRenderJobStatus
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export async function queueSiteRenderJob(input: {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
  runtimeSiteId: string
  runtimeSiteVersionId: string
}): Promise<{ shouldEmit: boolean; status: SiteRenderJobStatus | null }> {
  const client = await getSuperadminPool().connect()
  try {
    const existing = await client.query<SiteRenderJobRow>(
      `
      select status::text as status
      from public.gnr8_site_render_jobs
      where runtime_site_version_id = $1::uuid
      limit 1
      `,
      [input.runtimeSiteVersionId],
    )
    const currentStatus = normalizeText(existing.rows[0]?.status) as SiteRenderJobStatus | ''

    if (!currentStatus) {
      await client.query(
        `
        insert into public.gnr8_site_render_jobs (
          runtime_site_version_id,
          runtime_site_id,
          site_id,
          client_id,
          agency_id,
          template_id,
          status,
          requested_count,
          queued_at,
          updated_at
        )
        values (
          $1::uuid,
          nullif($2::text, ''),
          $3::uuid,
          $4::uuid,
          $5::uuid,
          $6::uuid,
          'queued',
          1,
          now(),
          now()
        )
        `,
        [
          input.runtimeSiteVersionId,
          input.runtimeSiteId,
          input.siteId,
          input.clientId,
          input.agencyId,
          input.templateId,
        ],
      )
      return { shouldEmit: true, status: 'queued' }
    }

    if (currentStatus === 'failed') {
      await client.query(
        `
        update public.gnr8_site_render_jobs
        set
          status = 'queued',
          requested_count = requested_count + 1,
          queued_at = now(),
          updated_at = now(),
          last_error_code = null,
          last_error_message = null
        where runtime_site_version_id = $1::uuid
        `,
        [input.runtimeSiteVersionId],
      )
      return { shouldEmit: true, status: 'queued' }
    }

    await client.query(
      `
      update public.gnr8_site_render_jobs
      set
        requested_count = requested_count + 1,
        updated_at = now()
      where runtime_site_version_id = $1::uuid
      `,
      [input.runtimeSiteVersionId],
    )
    return {
      shouldEmit: false,
      status: currentStatus === 'queued' || currentStatus === 'running' || currentStatus === 'completed' ? currentStatus : null,
    }
  } finally {
    client.release()
  }
}

export async function markSiteRenderStarted(input: {
  siteVersionId: string
}): Promise<{ started: boolean; currentStatus: SiteRenderJobStatus | null }> {
  const client = await getSuperadminPool().connect()
  try {
    const existing = await client.query<SiteRenderJobRow>(
      `
      select status::text as status
      from public.gnr8_site_render_jobs
      where runtime_site_version_id = $1::uuid
      limit 1
      `,
      [input.siteVersionId],
    )
    const currentStatus = normalizeText(existing.rows[0]?.status) as SiteRenderJobStatus | ''
    if (currentStatus === 'completed' || currentStatus === 'running') {
      return { started: false, currentStatus: currentStatus as SiteRenderJobStatus }
    }
    if (!currentStatus) {
      return { started: false, currentStatus: null }
    }

    await client.query(
      `
      update public.gnr8_site_render_jobs
      set
        status = 'running',
        attempts = attempts + 1,
        started_at = now(),
        completed_at = null,
        updated_at = now()
      where runtime_site_version_id = $1::uuid
      `,
      [input.siteVersionId],
    )
    return { started: true, currentStatus: 'running' }
  } finally {
    client.release()
  }
}

export async function markSiteRenderCompleted(input: {
  siteVersionId: string
  renderedDomPath: string | null
  computedStylesPath: string | null
  acquisitionEvidencePath: string | null
  screenshotCount: number
  computedStyleSampleCount: number
  domNodeCount: number
}): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.gnr8_site_render_jobs
      set
        status = 'completed',
        rendered_dom_path = nullif($2::text, ''),
        computed_styles_path = nullif($3::text, ''),
        acquisition_evidence_path = nullif($4::text, ''),
        screenshot_count = $5::integer,
        computed_style_sample_count = $6::integer,
        dom_node_count = $7::integer,
        completed_at = now(),
        updated_at = now(),
        last_error_code = null,
        last_error_message = null
      where runtime_site_version_id = $1::uuid
      `,
      [
        input.siteVersionId,
        input.renderedDomPath ?? '',
        input.computedStylesPath ?? '',
        input.acquisitionEvidencePath ?? '',
        Math.max(0, Math.floor(input.screenshotCount)),
        Math.max(0, Math.floor(input.computedStyleSampleCount)),
        Math.max(0, Math.floor(input.domNodeCount)),
      ],
    )
  } finally {
    client.release()
  }
}

export async function markSiteRenderFailed(input: {
  siteVersionId: string
  errorCode: string
  errorMessage: string
}): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.gnr8_site_render_jobs
      set
        status = 'failed',
        completed_at = now(),
        updated_at = now(),
        last_error_code = $2::text,
        last_error_message = $3::text
      where runtime_site_version_id = $1::uuid
      `,
      [input.siteVersionId, input.errorCode, input.errorMessage],
    )
  } finally {
    client.release()
  }
}
