import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { normalizeUuid, successResponse, validationErrorResponse } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-api-contract'
import { listContentOverrideHistory, listContentSlots } from '@/gnr8/runtime/runtime-store'
import { friendlySlotLabel } from '@/gnr8/site/content-bindings-panel-helpers'
import { getSuperadminPool } from '@/src/superadmin/db'

async function resolveRuntimeScope(input: {
  clientId: string
  siteId: string
  agencyId: string
  siteVersionId: string
}): Promise<{ runtimeSiteId: string; ownershipSiteId: string; siteVersionId: string } | null> {
  const pool = getSuperadminPool()
  const res = await pool.query<any>(
    `
    select sv.site_id::text as runtime_site_id, s.id::text as ownership_site_id, sv.id::text as site_version_id
    from public.sites s
    join public.organizations o on o.id=s.org_id
    join public.gnr8_runtime_site_versions sv on sv.ownership_site_id=s.id
    where s.id=$1::uuid and s.org_id=$2::uuid and s.agency_id=$3::uuid and o.organization_type='client' and sv.id=$4::uuid
    limit 1
    `,
    [input.siteId, input.clientId, input.agencyId, input.siteVersionId],
  )
  const row = res.rows[0]
  if (!row) return null
  return { runtimeSiteId: row.runtime_site_id, ownershipSiteId: row.ownership_site_id, siteVersionId: row.site_version_id }
}

export async function GET(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
  const diagnostics: string[] = ['CONTENT_HISTORY_FETCH_STARTED']
  let resolvedSiteVersionId: string | null = null
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) return validationErrorResponse({ diagnostics, error: 'Invalid clientId/siteId', details: { clientId: params.clientId, siteId: params.siteId } })

    const url = new URL(req.url)
    const agencyId = normalizeUuid(url.searchParams.get('agencyId'))
    const siteVersionId = normalizeUuid(url.searchParams.get('siteVersionId'))
    const requestedLimit = Number(url.searchParams.get('limit') ?? '100')
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(500, Math.floor(requestedLimit))) : 100
    if (!agencyId || !siteVersionId) {
      return validationErrorResponse({ diagnostics, error: 'agencyId and siteVersionId are required', details: { agencyId, siteVersionId } })
    }
    resolvedSiteVersionId = siteVersionId

    await requireAgencyActionContext({ action: 'view_dashboard', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({ clientId, siteId, agencyId, siteVersionId })
    if (!scope) return successResponse({ diagnostics: [...diagnostics, 'CONTENT_HISTORY_FETCH_FAILED'], body: { rows: [], historyCount: 0 } })
    resolvedSiteVersionId = scope.siteVersionId

    const [historyRows, slots] = await Promise.all([
      listContentOverrideHistory({ siteVersionId: scope.siteVersionId, limit }),
      listContentSlots(scope.siteVersionId),
    ])
    const slotLabelMap = new Map(slots.map((slot) => [slot.slotKey, friendlySlotLabel(slot.slotKey)]))

    const groupedBySlot = historyRows.reduce<Record<string, typeof historyRows>>((acc, row) => {
      const list = acc[row.slotKey] ?? []
      list.push(row)
      acc[row.slotKey] = list
      return acc
    }, {})

    return successResponse({
      diagnostics: [...diagnostics, historyRows.length === 0 ? 'CONTENT_HISTORY_EMPTY' : 'CONTENT_HISTORY_FETCH_COMPLETED'],
      body: {
        siteVersionId: scope.siteVersionId,
        rows: historyRows.map((row) => ({ ...row, slotLabel: slotLabelMap.get(row.slotKey) ?? friendlySlotLabel(row.slotKey) })),
        historyCount: historyRows.length,
        groupedBySlot,
      },
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    diagnostics.push('CONTENT_HISTORY_FETCH_FAILED')
    console.error('[gnr8.content-api] CONTENT_HISTORY_FETCH_FAILED', { error: mapped.message, siteVersionId: resolvedSiteVersionId, diagnostics })
    return successResponse({ diagnostics, body: { siteVersionId: resolvedSiteVersionId, rows: [], historyCount: 0 } })
  }
}
