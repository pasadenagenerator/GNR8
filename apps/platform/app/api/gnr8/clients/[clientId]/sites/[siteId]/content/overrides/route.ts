import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { ensureSlotBelongsToSiteVersion, requireContentSiteVersionId } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-version-guards'
import { normalizeSingleDraftSavePayload } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/overrides-route-helpers'
import { listContentSlots, upsertContentOverrideDraft } from '@/gnr8/runtime/runtime-store'
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
  requestedSiteVersionId: string
}): Promise<{ runtimeSiteId: string; ownershipSiteId: string; siteVersionId: string } | null> {
  const pool = getSuperadminPool()
  const res = await pool.query<any>(
    `select sv.site_id::text as runtime_site_id, s.id::text as ownership_site_id, sv.id::text as site_version_id from public.sites s join public.organizations o on o.id=s.org_id join public.gnr8_runtime_site_versions sv on sv.ownership_site_id=s.id where s.id=$1::uuid and s.org_id=$2::uuid and s.agency_id=$3::uuid and o.organization_type='client' and sv.id=$4::uuid limit 1`,
    [input.siteId, input.clientId, input.agencyId, input.requestedSiteVersionId],
  )
  const row = res.rows[0]
  if (!row) return null
  return { runtimeSiteId: row.runtime_site_id, ownershipSiteId: row.ownership_site_id, siteVersionId: row.site_version_id }
}

export async function POST(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
  const diagnostics: string[] = []
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) return NextResponse.json({ ok: false, error: 'Invalid clientId/siteId' }, { status: 400 })
    const body = (await req.json().catch(() => null)) as any
    const agencyId = normalizeUuid(body?.agencyId)
    const siteVersionId = normalizeUuid(body?.siteVersionId)
    const slotKey = normalizeText(body?.slotKey)
    diagnostics.push('CONTENT_DRAFT_SAVE_STARTED')
    const versionRequirement = requireContentSiteVersionId(siteVersionId)
    if (!versionRequirement.ok) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return NextResponse.json(
        { ok: false, error: 'siteVersionId is required', code: 'CONTENT_SITE_VERSION_REQUIRED', diagnostics },
        { status: 400 },
      )
    }

    const actionContext = await requireAgencyActionContext({ action: 'run_migration', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({ clientId, siteId, agencyId, requestedSiteVersionId: versionRequirement.siteVersionId })
    if (!scope) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return NextResponse.json(
        { ok: false, error: 'Site version is outside site scope', code: 'CONTENT_SITE_VERSION_SCOPE_MISMATCH', diagnostics },
        { status: 404 },
      )
    }

    const slots = await listContentSlots(scope.siteVersionId)
    const slotMembership = ensureSlotBelongsToSiteVersion({ slots, slotKey })
    if (!slotMembership.ok) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return NextResponse.json(
        { ok: false, error: 'slot does not belong to provided siteVersionId', code: 'CONTENT_SLOT_VERSION_MISMATCH', diagnostics },
        { status: 400 },
      )
    }
    const slot = slotMembership.slot
    diagnostics.push('CONTENT_DRAFT_SAVE_SLOT_VALIDATED')
    const normalizedPayload = normalizeSingleDraftSavePayload({ slotType: slot.slotType, body })
    if (!normalizedPayload.ok || !agencyId || !slotKey) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return NextResponse.json(
        {
          ok: false,
          reasonCode: normalizedPayload.ok ? 'CONTENT_DRAFT_SAVE_INVALID_PAYLOAD' : normalizedPayload.reasonCode,
          error: 'agencyId, slotKey, status=draft, and value/valueJson are required',
          diagnostics,
        },
        { status: 400 },
      )
    }
    diagnostics.push('CONTENT_DRAFT_SAVE_PAYLOAD_NORMALIZED')

    const result = await upsertContentOverrideDraft({
      siteId: scope.ownershipSiteId,
      siteVersionId: scope.siteVersionId,
      slotKey,
      valueType: normalizedPayload.valueType,
      valueJson: normalizedPayload.valueJson,
      actorUserId: actionContext.userId,
      source: 'manual',
    })
    diagnostics.push(...result.diagnostics, 'CONTENT_DRAFT_SAVE_COMPLETED')
    return NextResponse.json({
      ok: true,
      slotKey,
      persistedRowCount: result.changed ? 1 : 0,
      draftOverrideCountForVersion: result.draftOverrideCountForVersion,
      siteVersionId: scope.siteVersionId,
      diagnostics,
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
    return NextResponse.json({ ok: false, error: mapped.message, diagnostics }, { status: mapped.status })
  }
}
