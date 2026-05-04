import { getSuperadminPool } from '@/src/superadmin/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeText(v: unknown) {
  return String(v ?? '').trim()
}

export function normalizeUuid(v: unknown) {
  const n = normalizeText(v)
  return n && UUID_RE.test(n) ? n : null
}

export type RuntimeScope = {
  runtimeSiteId: string
  siteVersionId: string
  activeSiteVersionId: string
  reasonCode: string
}

export type ResolveRuntimeScopeInput = {
  clientId: string
  siteId: string
  agencyId: string
  requestedSiteVersionId?: string | null
}

export async function resolveRuntimeScope(input: ResolveRuntimeScopeInput): Promise<RuntimeScope | null> {
  const pool = getSuperadminPool()

  const candidateRes = await pool.query<any>(
    `
    with scoped_site as (
      select s.id::uuid as ownership_site_id
      from public.sites s
      join public.organizations o on o.id = s.org_id
      where s.id = $1::uuid
        and s.org_id = $2::uuid
        and s.agency_id = $3::uuid
        and o.organization_type = 'client'
      limit 1
    ),
    runtime_site_candidates as (
      select nullif(b.runtime_site_id::text, '') as runtime_site_id
      from public.gnr8_site_bootstrap_jobs b
      join scoped_site ss on ss.ownership_site_id = b.site_id
      union
      select nullif(r.runtime_site_id::text, '') as runtime_site_id
      from public.gnr8_site_render_jobs r
      join scoped_site ss on ss.ownership_site_id = r.site_id
    ),
    version_candidates as (
      select
        sv.id::text as site_version_id,
        sv.site_id::text as runtime_site_id,
        'direct_ownership'::text as resolution_path,
        sv.version_no,
        sv.updated_at,
        sv.created_at
      from public.gnr8_runtime_site_versions sv
      join scoped_site ss on sv.ownership_site_id = ss.ownership_site_id

      union all

      select
        sv.id::text as site_version_id,
        sv.site_id::text as runtime_site_id,
        'bootstrap_runtime_site_version'::text as resolution_path,
        sv.version_no,
        sv.updated_at,
        sv.created_at
      from public.gnr8_site_bootstrap_jobs b
      join scoped_site ss on ss.ownership_site_id = b.site_id
      join public.gnr8_runtime_site_versions sv on sv.id = b.runtime_site_version_id

      union all

      select
        sv.id::text as site_version_id,
        sv.site_id::text as runtime_site_id,
        'render_runtime_site_version'::text as resolution_path,
        sv.version_no,
        sv.updated_at,
        sv.created_at
      from public.gnr8_site_render_jobs r
      join scoped_site ss on ss.ownership_site_id = r.site_id
      join public.gnr8_runtime_site_versions sv on sv.id = r.runtime_site_version_id

      union all

      select
        sv.id::text as site_version_id,
        sv.site_id::text as runtime_site_id,
        'runtime_site_lookup'::text as resolution_path,
        sv.version_no,
        sv.updated_at,
        sv.created_at
      from public.gnr8_runtime_site_versions sv
      join runtime_site_candidates c on c.runtime_site_id = sv.site_id

      union all

      select
        sv.id::text as site_version_id,
        sv.site_id::text as runtime_site_id,
        'raw_template_artifact_lookup'::text as resolution_path,
        sv.version_no,
        sv.updated_at,
        sv.created_at
      from public.gnr8_runtime_raw_template_artifacts a
      join public.gnr8_runtime_site_versions sv on sv.id = a.site_version_id
      join runtime_site_candidates c on c.runtime_site_id = sv.site_id
    ),
    deduped as (
      select distinct on (site_version_id)
        site_version_id,
        runtime_site_id,
        resolution_path,
        version_no,
        updated_at,
        created_at
      from version_candidates
      where site_version_id is not null
      order by site_version_id, version_no desc nulls last, updated_at desc nulls last, created_at desc nulls last
    )
    select
      site_version_id,
      runtime_site_id,
      resolution_path,
      version_no,
      updated_at,
      created_at
    from deduped
    order by version_no desc nulls last, updated_at desc nulls last, created_at desc nulls last
    `,
    [input.siteId, input.clientId, input.agencyId],
  )

  const candidates = candidateRes.rows as Array<{
    site_version_id: string | null
    runtime_site_id: string | null
    resolution_path: string | null
  }>

  if (!candidates.length) return null

  const active = candidates[0]
  const activeSiteVersionId = normalizeText(active?.site_version_id)
  const activeRuntimeSiteId = normalizeText(active?.runtime_site_id)
  if (!activeSiteVersionId || !activeRuntimeSiteId) return null

  if (input.requestedSiteVersionId) {
    const scoped = candidates.find((candidate) => normalizeText(candidate.site_version_id) === input.requestedSiteVersionId)
    if (!scoped) return null
    const scopedRuntimeSiteId = normalizeText(scoped.runtime_site_id)
    const scopedSiteVersionId = normalizeText(scoped.site_version_id)
    if (!scopedRuntimeSiteId || !scopedSiteVersionId) return null
    return {
      runtimeSiteId: scopedRuntimeSiteId,
      siteVersionId: scopedSiteVersionId,
      activeSiteVersionId,
      reasonCode: 'requested_site_version_validated',
    }
  }

  const resolutionPath = normalizeText(active.resolution_path) || 'unknown_resolution_path'
  return {
    runtimeSiteId: activeRuntimeSiteId,
    siteVersionId: activeSiteVersionId,
    activeSiteVersionId,
    reasonCode: resolutionPath === 'direct_ownership' ? 'direct_runtime_version' : `fallback_${resolutionPath}`,
  }
}
