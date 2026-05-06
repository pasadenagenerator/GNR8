import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { failureResponse, normalizeText, successResponse, validationErrorResponse } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-api-contract'
import { getRawTemplateSiteArtifact, getRawTemplateSiteAsset, listContentOverrides, listContentSlots } from '@/gnr8/runtime/runtime-store'
import { getOverrideDisplayValue, getSlotOriginalDisplayValue } from '@/gnr8/site/content-override-display-value'
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
  queryHistoryCount: (input: { siteVersionId: string }) => Promise<number>
  querySiteScopeContext: (input: { siteId: string }) => Promise<{ siteId: string; siteClientId: string | null; siteAgencyId: string | null } | null>
}

async function queryHistoryCount(input: { siteVersionId: string }): Promise<number> {
  const pool = getSuperadminPool()
  const historyCountRes = await pool.query<{ count: string }>(
    `
    select count(*)::text as count
    from public.gnr8_content_override_history
    where site_version_id = $1::uuid
    `,
    [input.siteVersionId],
  )
  return Number(historyCountRes.rows[0]?.count ?? '0')
}

async function querySiteScopeContext(input: { siteId: string }): Promise<{ siteId: string; siteClientId: string | null; siteAgencyId: string | null } | null> {
  const pool = getSuperadminPool()
  const result = await pool.query<{ site_id: string; site_client_id: string | null; site_agency_id: string | null }>(
    `
    select s.id::text as site_id, s.org_id::text as site_client_id, s.agency_id::text as site_agency_id
    from public.sites s
    where s.id = $1::uuid
    limit 1
    `,
    [input.siteId],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    siteId: row.site_id,
    siteClientId: row.site_client_id,
    siteAgencyId: row.site_agency_id,
  }
}

function getSelectorValidation(input: { html: string; slots: Array<{ slotKey: string; sourceSelector: string | null }> }) {
  const invalid: Array<{ slotKey: string; selector: string }> = []
  for (const slot of input.slots) {
    const selector = normalizeText(slot.sourceSelector)
    if (!selector) continue
    if (!input.html.includes(selector)) {
      invalid.push({ slotKey: slot.slotKey, selector })
      console.error('[gnr8.content-api] CONTENT_SLOT_SELECTOR_INVALID', { slotKey: slot.slotKey, selector })
    }
  }
  return invalid
}

export function createContentRouteHandlers(deps: ContentRouteDeps) {
  return {
    async GET(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
      try {
        const diagnostics: string[] = []
        const params = await ctx.params
        const clientId = normalizeUuid(params.clientId)
        const siteId = normalizeUuid(params.siteId)
        if (!clientId || !siteId) return validationErrorResponse({ diagnostics, error: 'Invalid clientId/siteId', details: { clientId: params.clientId, siteId: params.siteId } })

        const url = new URL(req.url)
        const agencyId = normalizeUuid(url.searchParams.get('agencyId'))
        const agencyQuery = normalizeUuid(url.searchParams.get('agency'))
        const agencyHeader = normalizeUuid(req.headers.get('x-gnr8-agency-id'))
        const effectiveAgencyId = agencyId ?? agencyQuery ?? agencyHeader
        console.info('[gnr8.content-api] CONTENT_GET_PARAMS_RECEIVED', {
          clientId,
          siteId,
          agencyIdQuery: agencyId,
          agencyQuery,
          agencyHeader,
          effectiveAgencyId,
        })
        if (!effectiveAgencyId) return validationErrorResponse({ diagnostics, error: 'agencyId (or agency) is required' })
        console.info('[gnr8.content-api] CONTENT_GET_SCOPE_VALIDATION_STARTED', {
          clientId,
          siteId,
          effectiveAgencyId,
        })
        console.info('[gnr8.content-api] CONTENT_GET_SCOPE_QUERY_TYPED', {
          siteIdParamType: 'uuid',
          diagnostics: ['CONTENT_GET_SCOPE_QUERY_TYPED'],
        })
        let scopeContext: Awaited<ReturnType<typeof deps.querySiteScopeContext>> = null
        try {
          scopeContext = await deps.querySiteScopeContext({ siteId })
        } catch {
          scopeContext = null
        }
        await deps.requireAgencyActionContext({ action: 'view_dashboard', requestedAgencyId: effectiveAgencyId })
        console.info('[gnr8.content-api] CONTENT_GET_SCOPE_VALIDATION_RESULT', {
          success: true,
          reasonCode: 'agency_action_context_valid',
          siteClientId: scopeContext?.siteClientId ?? null,
          siteAgencyId: scopeContext?.siteAgencyId ?? null,
        })

        const requestedSiteVersionId = normalizeUuid(url.searchParams.get('siteVersionId'))
        console.info('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_STARTED', {
          ownershipSiteId: siteId,
          requestedSiteVersionId,
        })

        const resolution = await deps.resolveRuntimeScopeDetailed({ clientId, siteId, agencyId: effectiveAgencyId, requestedSiteVersionId })
        const scope = resolution.scope
        console.info('[gnr8.content-api] CONTENT_GET_VERSION_CANDIDATES', resolution.debug)
        if (!scope) {
          console.warn('[gnr8.content-api] CONTENT_GET_VERSION_RESOLUTION_FAILED', {
            ownershipSiteId: siteId,
            siteVersionId: requestedSiteVersionId,
            reasonCode: resolution.unresolvedReasonCode ?? (requestedSiteVersionId ? 'requested_site_version_not_in_scope' : 'CONTENT_VERSION_NOT_FOUND'),
            debug: resolution.debug,
          })
          return failureResponse({
            reasonCode: resolution.unresolvedReasonCode ?? (requestedSiteVersionId ? 'requested_site_version_not_in_scope' : 'CONTENT_VERSION_NOT_FOUND'),
            error: 'Content version could not be resolved for this site.',
            debug: resolution.debug,
            diagnostics: ['CONTENT_GET_VERSION_RESOLUTION_FAILED'],
            status: 404,
          })
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
        const historyCount = await deps.queryHistoryCount({ siteVersionId: scope.siteVersionId })

        console.info('[gnr8.content-api] CONTENT_GET_SLOTS_LOADED', {
          ownershipSiteId: siteId,
          runtimeSiteId: scope.runtimeSiteId,
          siteVersionId: scope.siteVersionId,
          slotCount: slots.length,
          reasonCode: scope.reasonCode,
        })

        const draftOverridesBySlot = new Map(draftOverrides.map((override) => [override.slotKey, override]))
        const publishedOverridesBySlot = new Map(publishedOverrides.map((override) => [override.slotKey, override]))
        const hydratedSlots = slots.map((slot) => {
          const draftValue = getOverrideDisplayValue(draftOverridesBySlot.get(slot.slotKey), slot.slotType)
          const publishedValue = getOverrideDisplayValue(publishedOverridesBySlot.get(slot.slotKey), slot.slotType)
          const originalValue = getSlotOriginalDisplayValue(slot)
          const effectiveEditorValue = draftValue ?? publishedValue ?? originalValue
          return {
            ...slot,
            originalValue,
            draftValue,
            publishedValue,
            effectiveEditorValue,
          }
        })
        const grouped = groupSlots(hydratedSlots)
        diagnostics.push(
          'CONTENT_GET_SQL_TYPE_GUARD_APPLIED',
          'CONTENT_GET_SCOPE_QUERY_TYPED',
          'CONTENT_GET_VERSION_QUERY_TYPED',
          'CONTENT_GET_VERSION_RESOLUTION_FOUND',
          'CONTENT_GET_SLOTS_LOADED',
          'CONTENT_OVERRIDES_HYDRATED',
          'CONTENT_SLOT_EFFECTIVE_VALUE_RESOLVED',
        )
        const artifact = await getRawTemplateSiteArtifact(scope.siteVersionId)
        let invalidSlotSelectors: Array<{ slotKey: string; selector: string }> = []
        if (artifact) {
          const htmlAsset = await getRawTemplateSiteAsset({ siteVersionId: scope.siteVersionId, filePath: artifact.entryHtmlPath })
          if (htmlAsset) {
            invalidSlotSelectors = getSelectorValidation({
              html: htmlAsset.bytes.toString('utf8'),
              slots: hydratedSlots.map((slot) => ({ slotKey: slot.slotKey, sourceSelector: slot.sourceSelector })),
            })
          }
        }
        if (invalidSlotSelectors.length > 0) diagnostics.push('CONTENT_SLOT_SELECTOR_INVALID')
        if (scope.reasonCode.startsWith('fallback_')) diagnostics.push('CONTENT_GET_VERSION_RESOLUTION_FALLBACK_USED')
        if (slots.length === 0) diagnostics.push('CONTENT_GET_SLOTS_EMPTY')
        if (!grouped.sections.length) diagnostics.push('CONTENT_SECTION_SLOTS_MISSING')
        if (groupedContentLooksEmpty(grouped) && slots.length > 0) diagnostics.push('CONTENT_GROUPING_EMPTY_WITH_FLAT_SLOTS_PRESENT')

        return successResponse({
          diagnostics,
          body: {
            siteVersionId: scope.siteVersionId,
            activeSiteVersionId: scope.activeSiteVersionId,
            slotCount: slots.length,
            draftOverrideCount: draftOverrides.length,
            publishedOverrideCount: publishedOverrides.length,
            historyCount,
            reasonCode: scope.reasonCode,
            slots: hydratedSlots,
            grouped,
            draftOverrides,
            publishedOverrides,
            debug: invalidSlotSelectors.length > 0 ? { invalidSlotSelectors } : undefined,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn('[gnr8.content-api] CONTENT_GET_SCOPE_VALIDATION_RESULT', {
          success: false,
          reasonCode: 'agency_action_context_invalid',
          error: message,
        })
        const mapped = deps.parseAgencyActionContextError(error)
        return failureResponse({ reasonCode: 'CONTENT_GET_FAILED', error: mapped.message, diagnostics: ['CONTENT_GET_FAILED'], status: mapped.status })
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
  querySiteScopeContext,
})
