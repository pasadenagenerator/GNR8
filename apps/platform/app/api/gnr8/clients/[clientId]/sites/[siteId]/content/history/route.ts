import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { listContentOverrideHistory, listContentSlots } from '@/gnr8/runtime/runtime-store'
import { friendlySlotLabel } from '@/gnr8/site/content-bindings-panel-helpers'
import { getSuperadminPool } from '@/src/superadmin/db'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const normalizeText = (v: unknown) => String(v ?? '').trim()
const normalizeUuid = (v: unknown) => {
  const n = normalizeText(v)
  return n && UUID_RE.test(n) ? n : null
}

async function resolveRuntimeScope(input: {
  clientId: string
  siteId: string
  agencyId: string
  siteVersionId: string
}): Promise<{ runtimeSiteId: string; siteVersionId: string } | null> {
  const pool = getSuperadminPool()
  const res = await pool.query<any>(
    `
    select sv.site_id::text as runtime_site_id, sv.id::text as site_version_id
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
  return { runtimeSiteId: row.runtime_site_id, siteVersionId: row.site_version_id }
}

export async function GET(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) return NextResponse.json({ ok: false, error: 'Invalid clientId/siteId' }, { status: 400 })

    const url = new URL(req.url)
    const agencyId = normalizeUuid(url.searchParams.get('agencyId'))
    const siteVersionId = normalizeUuid(url.searchParams.get('siteVersionId'))
    const requestedLimit = Number(url.searchParams.get('limit') ?? '100')
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(500, Math.floor(requestedLimit))) : 100
    if (!agencyId || !siteVersionId) return NextResponse.json({ ok: false, error: 'agencyId and siteVersionId are required' }, { status: 400 })

    await requireAgencyActionContext({ action: 'view_dashboard', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({ clientId, siteId, agencyId, siteVersionId })
    if (!scope) return NextResponse.json({ ok: false, error: 'Site scope not found' }, { status: 404 })

    const [historyRows, slots] = await Promise.all([
      listContentOverrideHistory({ siteId: scope.runtimeSiteId, siteVersionId: scope.siteVersionId, limit }),
      listContentSlots(scope.siteVersionId),
    ])
    const slotLabelMap = new Map(slots.map((slot) => [slot.slotKey, friendlySlotLabel(slot.slotKey)]))

    const groupedBySlot = historyRows.reduce<Record<string, typeof historyRows>>((acc, row) => {
      const list = acc[row.slotKey] ?? []
      list.push(row)
      acc[row.slotKey] = list
      return acc
    }, {})

    return NextResponse.json({
      ok: true,
      siteVersionId: scope.siteVersionId,
      rows: historyRows.map((row) => ({ ...row, slotLabel: slotLabelMap.get(row.slotKey) ?? friendlySlotLabel(row.slotKey) })),
      groupedBySlot,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
