import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { listContentSlots, rollbackContentOverride } from '@/gnr8/runtime/runtime-store'
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

export async function POST(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
  const diagnostics: string[] = ['CONTENT_ROLLBACK_STARTED']
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) return NextResponse.json({ ok: false, error: 'Invalid clientId/siteId' }, { status: 400 })

    const body = (await req.json().catch(() => null)) as any
    const agencyId = normalizeUuid(body?.agencyId)
    const siteVersionId = normalizeUuid(body?.siteVersionId)
    const historyId = normalizeUuid(body?.historyId)
    const slotKey = normalizeText(body?.slotKey)
    const targetStatus = normalizeText(body?.targetStatus) === 'published' ? 'published' : 'draft'

    if (!agencyId || !siteVersionId || !historyId || !slotKey) {
      return NextResponse.json({ ok: false, error: 'agencyId, siteVersionId, slotKey, historyId are required' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({ action: 'run_migration', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({ clientId, siteId, agencyId, siteVersionId })
    if (!scope) return NextResponse.json({ ok: false, error: 'Site scope not found' }, { status: 404 })

    const slots = await listContentSlots(scope.siteVersionId)
    const slot = slots.find((item) => item.slotKey === slotKey)
    if (!slot) return NextResponse.json({ ok: false, error: 'slot does not exist' }, { status: 400 })

    const result = await rollbackContentOverride({
      siteId: scope.runtimeSiteId,
      siteVersionId: scope.siteVersionId,
      slotKey,
      historyId,
      targetStatus,
      actorUserId: actionContext.userId,
      source: 'manual',
    })
    diagnostics.push(...result.diagnostics)
    if (!result.restored) {
      diagnostics.push('CONTENT_ROLLBACK_FAILED')
      return NextResponse.json({ ok: false, error: 'Rollback could not be applied', diagnostics }, { status: 400 })
    }
    diagnostics.push('CONTENT_ROLLBACK_APPLIED')
    return NextResponse.json({ ok: true, diagnostics })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    diagnostics.push('CONTENT_ROLLBACK_FAILED')
    return NextResponse.json({ ok: false, error: mapped.message, diagnostics }, { status: mapped.status })
  }
}
