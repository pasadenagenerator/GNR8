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

export type RuntimeVersionCandidateDebug = {
  ownershipSiteId: string
  directVersionIds: string[]
  bootstrapVersionIds: string[]
  renderVersionIds: string[]
  slotBackedVersionIds: string[]
  selectedSiteVersionId: string | null
  selectedReason: string
}

export type RuntimeScopeResolution = {
  scope: RuntimeScope | null
  debug: RuntimeVersionCandidateDebug
  unresolvedReasonCode?: 'CONTENT_VERSION_NOT_FOUND' | 'requested_site_version_not_in_scope'
}

export type ResolveRuntimeScopeInput = {
  clientId: string
  siteId: string
  agencyId: string
  requestedSiteVersionId?: string | null
}

type Queryable = {
  query: <T = unknown>(text: string, values: unknown[]) => Promise<{ rows: T[] }>
}

function dedupeNormalized(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized) continue
    if (out.includes(normalized)) continue
    out.push(normalized)
  }
  return out
}

function pickRequestedSiteVersionId(input: {
  requestedSiteVersionId: string | null
  selectedSiteVersionId: string | null
  selectedRuntimeSiteId: string | null
  activeSiteVersionId: string | null
  activeRuntimeSiteId: string | null
  allCandidateVersionIds: string[]
}): RuntimeScope | null {
  const requested = input.requestedSiteVersionId
  if (!requested) return null
  if (!input.allCandidateVersionIds.includes(requested)) return null

  if (requested === input.selectedSiteVersionId && input.selectedRuntimeSiteId && input.activeSiteVersionId) {
    return {
      runtimeSiteId: input.selectedRuntimeSiteId,
      siteVersionId: requested,
      activeSiteVersionId: input.activeSiteVersionId,
      reasonCode: 'requested_site_version_validated',
    }
  }

  if (!input.activeRuntimeSiteId || !input.activeSiteVersionId) return null
  return {
    runtimeSiteId: input.activeRuntimeSiteId,
    siteVersionId: requested,
    activeSiteVersionId: input.activeSiteVersionId,
    reasonCode: 'requested_site_version_validated',
  }
}

export async function resolveRuntimeScopeDetailed(
  input: ResolveRuntimeScopeInput,
  deps: { pool?: Queryable } = {},
): Promise<RuntimeScopeResolution> {
  const pool = deps.pool ?? getSuperadminPool()
  console.info('[gnr8.content-api] CONTENT_GET_VERSION_QUERY_TYPED', {
    siteIdParamType: 'uuid',
    clientIdParamType: 'uuid',
    agencyIdParamType: 'uuid',
    requestedSiteVersionIdParamType: input.requestedSiteVersionId ? 'uuid' : null,
    diagnostics: ['CONTENT_GET_VERSION_QUERY_TYPED'],
  })

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
    direct_versions as (
      select sv.id::text as site_version_id
      from public.gnr8_runtime_site_versions sv
      join scoped_site ss on sv.ownership_site_id = ss.ownership_site_id
    ),
    bootstrap_versions as (
      select sv.id::text as site_version_id
      from public.gnr8_site_bootstrap_jobs b
      join scoped_site ss on ss.ownership_site_id = b.site_id
      join public.gnr8_runtime_site_versions sv on sv.id = b.runtime_site_version_id
    ),
    render_versions as (
      select sv.id::text as site_version_id
      from public.gnr8_site_render_jobs r
      join scoped_site ss on ss.ownership_site_id = r.site_id
      join public.gnr8_runtime_site_versions sv on sv.id = r.runtime_site_version_id
    ),
    slot_backed_versions as (
      select distinct sv.id::text as site_version_id
      from public.gnr8_content_slots cs
      join public.gnr8_runtime_site_versions sv on sv.id = cs.site_version_id
      join scoped_site ss on true
      where
        sv.ownership_site_id = ss.ownership_site_id
        or exists (
          select 1
          from public.gnr8_site_bootstrap_jobs b
          where b.site_id = ss.ownership_site_id::uuid and b.runtime_site_version_id = sv.id::uuid
        )
        or exists (
          select 1
          from public.gnr8_site_render_jobs r
          where r.site_id = ss.ownership_site_id::uuid and r.runtime_site_version_id = sv.id::uuid
        )
    ),
    prioritized as (
      select sv.id::text as site_version_id, sv.site_id::text as runtime_site_id, sv.version_no, sv.updated_at, sv.created_at,
        'direct_ownership'::text as resolution_path, 10 as confidence
      from public.gnr8_runtime_site_versions sv
      join direct_versions d on d.site_version_id = sv.id::text

      union all

      select sv.id::text as site_version_id, sv.site_id::text as runtime_site_id, sv.version_no, sv.updated_at, sv.created_at,
        'bootstrap_runtime_site_version'::text as resolution_path, 20 as confidence
      from public.gnr8_runtime_site_versions sv
      join bootstrap_versions b on b.site_version_id = sv.id::text

      union all

      select sv.id::text as site_version_id, sv.site_id::text as runtime_site_id, sv.version_no, sv.updated_at, sv.created_at,
        'render_runtime_site_version'::text as resolution_path, 30 as confidence
      from public.gnr8_runtime_site_versions sv
      join render_versions r on r.site_version_id = sv.id::text

      union all

      select sv.id::text as site_version_id, sv.site_id::text as runtime_site_id, sv.version_no, sv.updated_at, sv.created_at,
        case
          when exists (select 1 from direct_versions d where d.site_version_id = sv.id::text) then 'slot_linked_direct'
          when exists (select 1 from bootstrap_versions b where b.site_version_id = sv.id::text) then 'slot_linked_bootstrap'
          when exists (select 1 from render_versions r where r.site_version_id = sv.id::text) then 'slot_linked_render'
          else 'slot_linked_runtime_version'
        end as resolution_path,
        40 as confidence
      from public.gnr8_runtime_site_versions sv
      join slot_backed_versions sb on sb.site_version_id = sv.id::text
    ),
    selected as (
      select
        p.site_version_id,
        p.runtime_site_id,
        p.resolution_path
      from prioritized p
      order by p.confidence asc, p.version_no desc nulls last, p.updated_at desc nulls last, p.created_at desc nulls last
      limit 1
    )
    select
      (select array_agg(distinct dv.site_version_id) from direct_versions dv) as direct_version_ids,
      (select array_agg(distinct bv.site_version_id) from bootstrap_versions bv) as bootstrap_version_ids,
      (select array_agg(distinct rv.site_version_id) from render_versions rv) as render_version_ids,
      (select array_agg(distinct sb.site_version_id) from slot_backed_versions sb) as slot_backed_version_ids,
      (select s.site_version_id from selected s) as selected_site_version_id,
      (select s.runtime_site_id from selected s) as selected_runtime_site_id,
      (select s.resolution_path from selected s) as selected_reason
    `,
    [input.siteId, input.clientId, input.agencyId],
  )

  const row = (candidateRes.rows[0] ?? {}) as {
    direct_version_ids?: string[] | null
    bootstrap_version_ids?: string[] | null
    render_version_ids?: string[] | null
    slot_backed_version_ids?: string[] | null
    selected_site_version_id?: string | null
    selected_runtime_site_id?: string | null
    selected_reason?: string | null
  }

  const directVersionIds = dedupeNormalized(row.direct_version_ids ?? [])
  const bootstrapVersionIds = dedupeNormalized(row.bootstrap_version_ids ?? [])
  const renderVersionIds = dedupeNormalized(row.render_version_ids ?? [])
  const slotBackedVersionIds = dedupeNormalized(row.slot_backed_version_ids ?? [])
  const selectedSiteVersionId = normalizeText(row.selected_site_version_id) || null
  const selectedRuntimeSiteId = normalizeText(row.selected_runtime_site_id) || null
  const selectedReason = normalizeText(row.selected_reason) || 'no_candidate_found'

  const debug: RuntimeVersionCandidateDebug = {
    ownershipSiteId: input.siteId,
    directVersionIds,
    bootstrapVersionIds,
    renderVersionIds,
    slotBackedVersionIds,
    selectedSiteVersionId,
    selectedReason,
  }

  const allCandidateVersionIds = dedupeNormalized([
    ...directVersionIds,
    ...bootstrapVersionIds,
    ...renderVersionIds,
    ...slotBackedVersionIds,
  ])

  if (input.requestedSiteVersionId) {
    const requested = pickRequestedSiteVersionId({
      requestedSiteVersionId: input.requestedSiteVersionId,
      selectedSiteVersionId,
      selectedRuntimeSiteId,
      activeSiteVersionId: selectedSiteVersionId,
      activeRuntimeSiteId: selectedRuntimeSiteId,
      allCandidateVersionIds,
    })
    if (!requested) return { scope: null, debug, unresolvedReasonCode: 'requested_site_version_not_in_scope' }
    return { scope: requested, debug }
  }

  if (!selectedSiteVersionId || !selectedRuntimeSiteId) {
    return { scope: null, debug, unresolvedReasonCode: 'CONTENT_VERSION_NOT_FOUND' }
  }

  const reasonCode = selectedReason === 'direct_ownership' ? 'direct_runtime_version' : `fallback_${selectedReason}`
  return {
    scope: {
      runtimeSiteId: selectedRuntimeSiteId,
      siteVersionId: selectedSiteVersionId,
      activeSiteVersionId: selectedSiteVersionId,
      reasonCode,
    },
    debug,
  }
}

export async function resolveRuntimeScope(input: ResolveRuntimeScopeInput): Promise<RuntimeScope | null> {
  const result = await resolveRuntimeScopeDetailed(input)
  return result.scope
}
