import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { failureResponse, normalizeUuid, successResponse, validationErrorResponse } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-api-contract'
import { requireContentSiteVersionId } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-version-guards'
import { planBatchDraftUpserts } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/batch/batch-overrides-route-helpers'
import { listContentSlots, upsertContentOverrideDraftBatch } from '@/gnr8/runtime/runtime-store'
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

export async function POST(req: Request, ctx: { params: Promise<{ clientId?: string; siteId?: string }> }) {
  const diagnostics: string[] = ['CONTENT_BATCH_UPDATE_STARTED']
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) return validationErrorResponse({ diagnostics, error: 'Invalid clientId/siteId', details: { clientId: params.clientId, siteId: params.siteId } })

    const body = (await req.json().catch(() => null)) as any
    const agencyId = normalizeUuid(body?.agencyId)
    const siteVersionId = normalizeUuid(body?.siteVersionId)
    const overrides = Array.isArray(body?.overrides) ? body.overrides : []
    if (!agencyId) return validationErrorResponse({ diagnostics, error: 'agencyId is required', details: { agencyId: body?.agencyId } })
    const versionRequirement = requireContentSiteVersionId(siteVersionId)
    if (!versionRequirement.ok) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return validationErrorResponse({ diagnostics, error: 'siteVersionId is required', details: { siteVersionId } })
    }
    if (!Array.isArray(body?.overrides)) {
      return validationErrorResponse({ diagnostics, error: 'overrides must be an array', details: { overridesType: typeof body?.overrides } })
    }

    const actionContext = await requireAgencyActionContext({ action: 'run_migration', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({
      clientId,
      siteId,
      agencyId: actionContext.agencyId,
      siteVersionId: versionRequirement.siteVersionId,
    })
    if (!scope) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return failureResponse({ reasonCode: 'CONTENT_SITE_VERSION_SCOPE_MISMATCH', error: 'Site version is outside site scope', diagnostics, status: 404 })
    }

    const slots = await listContentSlots(scope.siteVersionId)
    const planned = planBatchDraftUpserts({ slots, overrides })
    const valid = planned.valid
    const skippedCount = planned.skippedCount
    diagnostics.push('CONTENT_BATCH_PAYLOAD_NORMALIZED')
    diagnostics.push(...planned.diagnostics)
    if (valid.length > 0) diagnostics.push('CONTENT_BATCH_SLOT_VALIDATED')

    const saveResult = await upsertContentOverrideDraftBatch({
      siteId: scope.ownershipSiteId,
      siteVersionId: scope.siteVersionId,
      overrides: valid,
      actorUserId: actionContext.userId,
      source: 'batch',
    })
    const updatedCount = saveResult.updatedCount
    diagnostics.push(...saveResult.diagnostics)
    if (valid.length === 0) diagnostics.push('CONTENT_BATCH_NO_VALID_OVERRIDES')
    diagnostics.push('CONTENT_BATCH_UPDATE_COMPLETED')
    return successResponse({
      diagnostics,
      body: {
        updatedCount,
        skippedCount,
        siteVersionId: scope.siteVersionId,
      },
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    diagnostics.push('CONTENT_BATCH_UPDATE_FAILED')
    const isWriteMismatch = error instanceof Error && error.message === 'CONTENT_WRITE_MISMATCH_FATAL'
    if (isWriteMismatch) diagnostics.push('CONTENT_WRITE_MISMATCH_FATAL')
    return failureResponse({
      reasonCode: isWriteMismatch ? 'CONTENT_WRITE_MISMATCH_FATAL' : 'CONTENT_BATCH_SAVE_FAILED',
      error: isWriteMismatch ? 'Batch draft write verification failed' : mapped.message,
      diagnostics,
      debug: { updatedCount: 0, skippedCount: 0 },
      status: isWriteMismatch ? 500 : mapped.status,
    })
  }
}
