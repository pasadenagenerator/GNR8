import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { failureResponse, normalizeUuid, successResponse, validationErrorResponse } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-api-contract'
import { requireContentSiteVersionId } from '@/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/content-version-guards'
import { publishDraftContentOverrides } from '@/gnr8/runtime/runtime-store'
import { getSuperadminPool } from '@/src/superadmin/db'

async function resolveRuntimeScope(input: { clientId: string; siteId: string; agencyId: string; siteVersionId: string }): Promise<{ runtimeSiteId: string; ownershipSiteId: string; siteVersionId: string } | null> {
  const pool = getSuperadminPool()
  const res = await pool.query<any>(`select sv.site_id::text as runtime_site_id, s.id::text as ownership_site_id, sv.id::text as site_version_id from public.sites s join public.organizations o on o.id=s.org_id join public.gnr8_runtime_site_versions sv on sv.ownership_site_id=s.id where s.id=$1::uuid and s.org_id=$2::uuid and s.agency_id=$3::uuid and o.organization_type='client' and sv.id=$4::uuid limit 1`, [input.siteId, input.clientId, input.agencyId, input.siteVersionId])
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
    if (!clientId || !siteId) return validationErrorResponse({ diagnostics, error: 'Invalid clientId/siteId', details: { clientId: params.clientId, siteId: params.siteId } })

    const body = (await req.json().catch(() => null)) as any
    const agencyId = normalizeUuid(body?.agencyId)
    const siteVersionId = normalizeUuid(body?.siteVersionId)
    if (!agencyId) return validationErrorResponse({ diagnostics, error: 'agencyId is required', details: { agencyId: body?.agencyId } })
    const versionRequirement = requireContentSiteVersionId(siteVersionId)
    if (!versionRequirement.ok) {
      diagnostics.push('CONTENT_PUBLISH_FAILED')
      return validationErrorResponse({ diagnostics, error: 'siteVersionId is required', details: { siteVersionId } })
    }

    const actionContext = await requireAgencyActionContext({ action: 'publish', requestedAgencyId: agencyId })
    const scope = await resolveRuntimeScope({
      clientId,
      siteId,
      agencyId: actionContext.agencyId,
      siteVersionId: versionRequirement.siteVersionId,
    })
    if (!scope) {
      diagnostics.push('CONTENT_PUBLISH_FAILED')
      return failureResponse({ reasonCode: 'CONTENT_SITE_VERSION_SCOPE_MISMATCH', error: 'Site version is outside site scope', diagnostics, status: 404 })
    }

    diagnostics.push('CONTENT_PUBLISH_STARTED')
    const result = await publishDraftContentOverrides({
      siteId: scope.ownershipSiteId,
      siteVersionId: scope.siteVersionId,
      actorUserId: actionContext.userId,
      source: 'manual',
    })
    diagnostics.push(...result.diagnostics)
    if (result.publishedCount === 0) diagnostics.push('CONTENT_PUBLISH_NO_DRAFTS_FOUND')
    diagnostics.push('CONTENT_PUBLISH_COMPLETED')
    return successResponse({
      diagnostics,
      body: {
        publishedCount: result.publishedCount,
        draftCount: result.draftCount,
        siteVersionId: scope.siteVersionId,
      },
    })
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    diagnostics.push('CONTENT_PUBLISH_FAILED')
    return failureResponse({ reasonCode: 'CONTENT_PUBLISH_FAILED', error: mapped.message, diagnostics, status: mapped.status })
  }
}
