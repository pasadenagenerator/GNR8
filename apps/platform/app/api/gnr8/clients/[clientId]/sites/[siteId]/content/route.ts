import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { groupedContentLooksEmpty, groupSlots } from '@/gnr8/site/content-route-grouping'
import { listContentOverrides, listContentSlots } from '@/gnr8/runtime/runtime-store'
import { getSuperadminPool } from '@/src/superadmin/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const normalizeText = (v: unknown) => String(v ?? '').trim()
const normalizeUuid = (v: unknown) => {
  const n = normalizeText(v)
  return n && UUID_RE.test(n) ? n : null
}

type RuntimeScope = {
  runtimeSiteId: string
  siteVersionId: string
  activeSiteVersionId: string
  reasonCode: string
}

type ResolveRuntimeScopeInput = {
  clientId: string
  siteId: string
  agencyId: string
  requestedSiteVersionId?: string | null
}

type ContentRouteDeps = {
  requireAgencyActionContext: typeof requireAgencyActionContext
  parseAgencyActionContextError: typeof parseAgencyActionContextError
  resolveRuntimeScope: (input: ResolveRuntimeScopeInput) => Promise<RuntimeScope | null>
  listContentSlots: typeof listContentSlots
  listContentOverrides: typeof listContentOverrides
  queryHistoryCount: (input: { runtimeSiteId: string; siteVersionId: string }) => Promise<number>
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

async function queryHistoryCount(input: { runtimeSiteId: string; siteVersionId: string }): Promise<number> {
  const pool = getSuperadminPool()
  const historyCountRes = await pool.query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_content_override_history
    where site_id = $1::text and site_version_id = $2::uuid
    `,
    [input.runtimeSiteId, input.siteVersionId],
  )
  return Number(historyCountRes.rows[0]?.count ?? '0')
}

export function createContentRouteHandlers(deps: ContentRouteDeps) {
  return {
    async GET(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
      try {
        const params = await ctx.params
        const clientId = normalizeUuid(params.clientId)
        const siteId = normalizeUuid(params.siteId)
        if (!clientId || !siteId) return NextResponse.json({ ok: false, error: 'Invalid clientId/siteId' }, { status: 400 })

        const url = new URL(req.url)
        const agencyId = normalizeUuid(url.searchParams.get('agencyId'))
        if (!agencyId) return NextResponse.json({ ok: false, error: 'agencyId is required' }, { status: 400 })
        await deps.requireAgencyActionContext({ action: 'view_dashboard', requestedAgencyId: agencyId })

        const requestedSiteVersionId = normalizeUuid(url.searchParams.get('siteVersionId'))
        console.info('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_STARTED', {
          ownershipSiteId: siteId,
          requestedSiteVersionId,
        })

        const scope = await deps.resolveRuntimeScope({ clientId, siteId, agencyId, requestedSiteVersionId })
        if (!scope) {
          console.warn('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_FAILED', {
            ownershipSiteId: siteId,
            siteVersionId: requestedSiteVersionId,
            reasonCode: requestedSiteVersionId ? 'requested_site_version_not_in_scope' : 'no_runtime_version_found',
          })
          return NextResponse.json(
            {
              ok: false,
              error: 'Content version could not be resolved for this site.',
              reasonCode: requestedSiteVersionId ? 'requested_site_version_not_in_scope' : 'no_runtime_version_found',
              diagnostics: ['CONTENT_GET_VERSION_RESOLUTION_FAILED'],
            },
            { status: 404 },
          )
        }

        console.info('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_FOUND', {
          ownershipSiteId: siteId,
          runtimeSiteId: scope.runtimeSiteId,
          siteVersionId: scope.siteVersionId,
          activeSiteVersionId: scope.activeSiteVersionId,
          reasonCode: scope.reasonCode,
        })
        if (scope.reasonCode.startsWith('fallback_')) {
          console.info('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_FALLBACK_USED', {
            ownershipSiteId: siteId,
            runtimeSiteId: scope.runtimeSiteId,
            siteVersionId: scope.siteVersionId,
            reasonCode: scope.reasonCode,
          })
        }

        const slots = await deps.listContentSlots(scope.siteVersionId)
        const draftOverrides = await deps.listContentOverrides({ siteVersionId: scope.siteVersionId, status: 'draft' })
        const publishedOverrides = await deps.listContentOverrides({ siteVersionId: scope.siteVersionId, status: 'published' })
        const historyCount = await deps.queryHistoryCount({ runtimeSiteId: scope.runtimeSiteId, siteVersionId: scope.siteVersionId })

        console.info('[gnr8.content-api] CONTENT_GET_SLOTS_LOADED', {
          ownershipSiteId: siteId,
          runtimeSiteId: scope.runtimeSiteId,
          siteVersionId: scope.siteVersionId,
          slotCount: slots.length,
          reasonCode: scope.reasonCode,
        })

        const grouped = groupSlots(slots)
        const diagnostics: string[] = ['CONTENT_GET_VERSION_RESOLUTION_FOUND', 'CONTENT_GET_SLOTS_LOADED']
        if (scope.reasonCode.startsWith('fallback_')) diagnostics.push('CONTENT_GET_VERSION_RESOLUTION_FALLBACK_USED')
        if (slots.length === 0) diagnostics.push('CONTENT_GET_SLOTS_EMPTY')
        if (!grouped.sections.length) diagnostics.push('CONTENT_SECTION_SLOTS_MISSING')
        if (groupedContentLooksEmpty(grouped) && slots.length > 0) diagnostics.push('CONTENT_GROUPING_EMPTY_WITH_FLAT_SLOTS_PRESENT')

        return NextResponse.json({
          ok: true,
          siteVersionId: scope.siteVersionId,
          activeSiteVersionId: scope.activeSiteVersionId,
          slotCount: slots.length,
          draftOverrideCount: draftOverrides.length,
          publishedOverrideCount: publishedOverrides.length,
          historyCount,
          reasonCode: scope.reasonCode,
          slots,
          grouped,
          draftOverrides,
          publishedOverrides,
          diagnostics,
        })
      } catch (error) {
        const mapped = deps.parseAgencyActionContextError(error)
        return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
      }
    },
  }
}

const handlers = createContentRouteHandlers({
  requireAgencyActionContext,
  parseAgencyActionContextError,
  resolveRuntimeScope,
  listContentSlots,
  listContentOverrides,
  queryHistoryCount,
})

export const GET = handlers.GET
