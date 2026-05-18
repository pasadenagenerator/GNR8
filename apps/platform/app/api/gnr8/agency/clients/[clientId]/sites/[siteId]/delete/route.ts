import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { SiteDeprovisioningError, deprovisionSite } from '@/gnr8/site/site-deprovisioning-service'
import { getSuperadminPool } from '@/src/superadmin/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Params = {
  clientId?: string
  siteId?: string
}

type Body = {
  agencyId?: unknown
  confirmation?: unknown
  adminView?: unknown
}

type ClientScopeRow = {
  client_id: string
  agency_id: string
  organization_type: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value)
  if (!normalized || !UUID_RE.test(normalized)) return null
  return normalized
}

async function assertClientScope(input: { clientId: string; agencyId: string }): Promise<void> {
  const pool = getSuperadminPool()
  const client = await pool.connect()
  try {
    const result = await client.query<ClientScopeRow>(
      `
      select
        o.id::text as client_id,
        o.agency_id::text as agency_id,
        o.organization_type::text as organization_type
      from public.organizations o
      where o.id = $1::uuid
      limit 1
      `,
      [input.clientId],
    )

    const row = result.rows[0]
    if (!row || row.organization_type !== 'client' || row.agency_id !== input.agencyId) {
      throw new Error('Client scope is invalid for this agency context.')
    }
  } finally {
    client.release()
  }
}

function mapDeleteError(error: SiteDeprovisioningError): { status: number; message: string } {
  if (error.code === 'INVALID_INPUT') return { status: 400, message: error.message }
  if (error.code === 'SITE_NOT_FOUND') return { status: 404, message: error.message }
  if (error.code === 'DEPENDENCY_BLOCK') return { status: 409, message: error.message }
  return { status: 500, message: error.message }
}

export async function POST(request: Request, ctx: { params: Promise<Params> }) {
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) {
      return NextResponse.json({ ok: false, error: 'clientId and siteId must be valid UUIDs.' }, { status: 400 })
    }

    const body = ((await request.json().catch(() => null)) ?? {}) as Body
    const requestedAgencyId = normalizeUuid(body.agencyId)
    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'agencyId is required.' }, { status: 400 })
    }

    const confirmation = normalizeText(body.confirmation)
    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { ok: false, error: 'Type DELETE to confirm permanent site deletion.' },
        { status: 400 },
      )
    }

    const actionContext = await requireAgencyActionContext({
      action: 'delete_site',
      requestedAgencyId,
    })
    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: 'Agency scope mismatch for site deletion.' }, { status: 403 })
    }

    await assertClientScope({
      clientId,
      agencyId: actionContext.agencyId,
    })

    let deleted: Awaited<ReturnType<typeof deprovisionSite>>
    try {
      deleted = await deprovisionSite({
        siteId,
        clientId,
        agencyId: actionContext.agencyId,
      })
    } catch (error) {
      if (error instanceof SiteDeprovisioningError) {
        const mapped = mapDeleteError(error)
        return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
      }
      throw error
    }

    const adminView = normalizeText(body.adminView) === '1' || normalizeText(body.adminView).toLowerCase() === 'true'
    const query = new URLSearchParams()
    query.set('agency', actionContext.agencyId)
    if (adminView || actionContext.actorMode === 'admin_view') query.set('admin_view', '1')
    query.set('client_tab', 'sites')

    return NextResponse.json({
      ok: true,
      deletedSiteId: deleted.siteId,
      runtimeSiteIds: deleted.runtimeSiteIds,
      deletedCounts: deleted.deletedCounts,
      redirectTo: `/gnr8/agency/clients/${encodeURIComponent(clientId)}/dashboard?${query.toString()}`,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
