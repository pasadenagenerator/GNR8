import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { failureResponse, isContentStatus, normalizeText, normalizeUuid, successResponse, validationErrorResponse } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-api-contract'
import { ensureSlotBelongsToSiteVersion, requireContentSiteVersionId } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-version-guards'
import { normalizeSingleDraftSavePayload } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/overrides/overrides-route-helpers'
import { listContentSlots, upsertContentOverrideDraft } from '@/gnr8/runtime/runtime-store'
import { getSuperadminPool } from '@/src/superadmin/db'

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
  let resolvedSiteVersionId: string | null = null
  let resolvedSlotKey: string | null = null
  try {
    const params = await ctx.params
    const clientId = normalizeUuid(params.clientId)
    const siteId = normalizeUuid(params.siteId)
    if (!clientId || !siteId) {
      return validationErrorResponse({ diagnostics, error: 'Invalid clientId/siteId', details: { clientId: params.clientId, siteId: params.siteId } })
    }
    const body = (await req.json().catch(() => null)) as any
    const agencyId = normalizeUuid(body?.agencyId)
    const siteVersionId = normalizeUuid(body?.siteVersionId)
    const slotKey = normalizeText(body?.slotKey)
    const status = normalizeText(body?.status)
    const rawValue = body?.value
    resolvedSiteVersionId = siteVersionId
    resolvedSlotKey = slotKey || null
    diagnostics.push('CONTENT_DRAFT_SAVE_STARTED')
    if (!agencyId || !slotKey || typeof rawValue !== 'string' || !isContentStatus(status) || status !== 'draft') {
      return validationErrorResponse({
        diagnostics,
        error: 'agencyId, siteVersionId, slotKey, value, and status=draft are required',
        details: {
          agencyId,
          siteVersionId,
          slotKey,
          status,
          hasStringValue: typeof rawValue === 'string',
        },
      })
    }
    const versionRequirement = requireContentSiteVersionId(siteVersionId)
    if (!versionRequirement.ok) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return validationErrorResponse({ diagnostics, error: 'siteVersionId is required', details: { siteVersionId } })
    }

    const actionContext = await requireAgencyActionContext({ action: 'run_migration', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({
      clientId,
      siteId,
      agencyId: actionContext.agencyId,
      requestedSiteVersionId: versionRequirement.siteVersionId,
    })
    resolvedSiteVersionId = scope?.siteVersionId ?? resolvedSiteVersionId
    if (!scope) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return failureResponse({ reasonCode: 'CONTENT_SITE_VERSION_SCOPE_MISMATCH', error: 'Site version is outside site scope', diagnostics, status: 404 })
    }

    const slots = await listContentSlots(scope.siteVersionId)
    const slotMembership = ensureSlotBelongsToSiteVersion({ slots, slotKey })
    if (!slotMembership.ok) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return failureResponse({ reasonCode: 'CONTENT_SLOT_VERSION_MISMATCH', error: 'slot does not belong to provided siteVersionId', diagnostics, status: 400 })
    }
    const slot = slotMembership.slot
    diagnostics.push('CONTENT_DRAFT_SAVE_SLOT_VALIDATED')
    const normalizedPayload = normalizeSingleDraftSavePayload({ slotType: slot.slotType, body })
    if (!normalizedPayload.ok || !agencyId || !slotKey) {
      diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
      return validationErrorResponse({
        diagnostics,
        error: 'agencyId, slotKey, status=draft, and value/valueJson are required',
        details: { reasonCode: normalizedPayload.ok ? 'CONTENT_DRAFT_SAVE_INVALID_PAYLOAD' : normalizedPayload.reasonCode },
      })
    }
    diagnostics.push('CONTENT_DRAFT_SAVE_PAYLOAD_NORMALIZED')
    const currentInputValue = normalizedPayload.valueJson.value
    console.info('[gnr8.content-api] CONTENT_DRAFT_SAVE_PAYLOAD_NORMALIZED', {
      siteId,
      siteVersionId: scope.siteVersionId,
      slotKey,
      valueType: normalizedPayload.ok ? normalizedPayload.valueType : null,
      normalizedValue: normalizedPayload.ok ? normalizedPayload.valueJson : null,
    })

    const result = await upsertContentOverrideDraft({
      siteId: scope.ownershipSiteId,
      siteVersionId: scope.siteVersionId,
      slotKey,
      valueType: normalizedPayload.valueType,
      valueJson: normalizedPayload.valueJson,
      actorUserId: actionContext.userId,
      source: 'manual',
    })
    console.info('[gnr8.content-api] CONTENT_DRAFT_SAVE_ROW_READBACK', {
      slotKey,
      siteVersionId: scope.siteVersionId,
      normalizedValue: result.normalizedValue,
      persistedRowCount: result.changed ? 1 : 0,
      draftOverrideCountForVersion: result.draftOverrideCountForVersion,
      savedRow: result.savedRow,
    })
    if (JSON.stringify(result.savedRow?.valueJson ?? null) !== JSON.stringify(result.normalizedValue ?? null)) {
      console.warn('[gnr8.content-api] CONTENT_DRAFT_SAVE_VALUE_MISMATCH', {
        slotKey,
        siteVersionId: scope.siteVersionId,
        normalizedValue: result.normalizedValue,
        readBackValue: result.savedRow?.valueJson ?? null,
      })
    }
    const normalizedStringValue =
      typeof (result.normalizedValue as { value?: unknown } | null)?.value === 'string'
        ? ((result.normalizedValue as { value: string }).value)
        : null
    if (normalizedStringValue !== currentInputValue) {
      console.warn('[gnr8.content-api] CONTENT_DRAFT_SAVE_NORMALIZATION_MISMATCH', {
        slotKey,
        siteVersionId: scope.siteVersionId,
        currentInputValue,
        normalizedValue: result.normalizedValue,
      })
    }
    diagnostics.push(...result.diagnostics, 'CONTENT_DRAFT_SAVE_COMPLETED')
    const responseSavedRow = result.savedRow
      ? {
          ...result.savedRow,
          value_json: result.savedRow.value_json,
          updated_at: result.savedRow.updated_at,
        }
      : null
    return successResponse({
      diagnostics,
      body: {
        slotKey,
        persistedRowCount: result.changed ? 1 : 0,
        draftOverrideCountForVersion: result.draftOverrideCountForVersion,
        siteVersionId: scope.siteVersionId,
        normalizedValue: result.normalizedValue,
        savedRow: responseSavedRow,
      },
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    diagnostics.push('CONTENT_DRAFT_SAVE_FAILED')
    const isWriteMismatch = error instanceof Error && error.message === 'CONTENT_WRITE_MISMATCH_FATAL'
    if (isWriteMismatch) diagnostics.push('CONTENT_WRITE_MISMATCH_FATAL')
    return failureResponse({
      reasonCode: isWriteMismatch ? 'CONTENT_WRITE_MISMATCH_FATAL' : 'CONTENT_DRAFT_SAVE_FAILED',
      error: isWriteMismatch ? 'Draft write verification failed' : mapped.message,
      diagnostics,
      debug: {
        siteVersionId: resolvedSiteVersionId,
        slotKey: resolvedSlotKey,
      },
      status: isWriteMismatch ? 500 : mapped.status,
    })
  }
}
