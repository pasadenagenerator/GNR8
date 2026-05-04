import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { listContentOverrides, listContentSlots } from '@/gnr8/runtime/runtime-store'
import { groupedContentLooksEmpty, groupSlots } from '@/gnr8/site/content-route-grouping'
import {
  normalizeUuid,
  resolveRuntimeScopeDetailed,
  type ResolveRuntimeScopeInput,
  type RuntimeScopeResolution,
} from '@/gnr8/site/content-route-version-resolution'
import { getSuperadminPool } from '@/src/superadmin/db'

export type ContentRouteDeps = {
  requireAgencyActionContext: typeof requireAgencyActionContext
  parseAgencyActionContextError: typeof parseAgencyActionContextError
  resolveRuntimeScopeDetailed: (input: ResolveRuntimeScopeInput) => Promise<RuntimeScopeResolution>
  listContentSlots: typeof listContentSlots
  listContentOverrides: typeof listContentOverrides
  queryHistoryCount: (input: { runtimeSiteId: string; siteVersionId: string }) => Promise<number>
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

        const resolution = await deps.resolveRuntimeScopeDetailed({ clientId, siteId, agencyId, requestedSiteVersionId })
        const scope = resolution.scope
        console.info('[gnr8.content-api] CONTENT_GET_VERSION_CANDIDATES', resolution.debug)
        if (!scope) {
          console.warn('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_FAILED', {
            ownershipSiteId: siteId,
            siteVersionId: requestedSiteVersionId,
            reasonCode: resolution.unresolvedReasonCode ?? (requestedSiteVersionId ? 'requested_site_version_not_in_scope' : 'CONTENT_VERSION_NOT_FOUND'),
            debug: resolution.debug,
          })
          return NextResponse.json(
            {
              ok: false,
              error: 'Content version could not be resolved for this site.',
              reasonCode: resolution.unresolvedReasonCode ?? (requestedSiteVersionId ? 'requested_site_version_not_in_scope' : 'CONTENT_VERSION_NOT_FOUND'),
              debug: resolution.debug,
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

export const contentRouteHandlers = createContentRouteHandlers({
  requireAgencyActionContext,
  parseAgencyActionContextError,
  resolveRuntimeScopeDetailed,
  listContentSlots,
  listContentOverrides,
  queryHistoryCount,
})
