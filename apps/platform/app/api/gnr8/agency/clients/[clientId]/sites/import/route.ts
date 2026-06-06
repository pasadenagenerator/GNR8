import { NextResponse } from 'next/server'
import fs from 'node:fs'
import crypto from 'node:crypto'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { SCOPED_SITE_IMPORT_CANONICAL_PATH } from '@/gnr8/site/site-import-contract'
import { buildSiteImportCreatePayload } from '@/gnr8/site/site-import-create-payload'
import { importerSuccessRedirectHref } from '@/gnr8/site/site-importer-routing'
import { resolveImportPreview } from '@/gnr8/site/import-preview-resolution'
import { extractTitleFromHtmlDocument, resolveImportedSiteName } from '@/gnr8/site/site-import-site-name'
import { runScopedImportPipeline } from '@/gnr8/site/scoped-import-pipeline'
import { deterministicId } from '@/gnr8/runtime/deterministic'
import { RENDERER_COMPATIBILITY_VERSION } from '@/gnr8/runtime/types'
import { getArtifactById, preallocateSiteVersionIdentity } from '@/gnr8/runtime/runtime-store'
import { importPublicSinglePageUrlToSnapshot } from '@/gnr8/validation/runtime/url-single-page-import'
import { getSuperadminPool } from '@/src/superadmin/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Params = {
  clientId: string
}

type Body = {
  url?: string
  siteName?: string
  agencyId?: string
  adminView?: boolean
  multiPageDiscovery?:
    | boolean
    | {
        enabled?: boolean
        acquireHtml?: boolean
        limits?: {
          maxRoutes?: number
          maxDepth?: number
          maxLinksPerPage?: number
          maxTemplateLinksPerRoute?: number
        }
        htmlAcquisitionLimits?: {
          maxPages?: number
          maxBytesPerPage?: number
          requestTimeoutMs?: number
        }
      }
}


function mapSiteImportReasonToMessage(reasonCode: string): string {
  if (reasonCode === 'fetch_failed') return 'Import failed: could not fetch URL.'
  if (reasonCode === 'empty_html') return 'Import failed: empty HTML response.'
  if (reasonCode === 'invalid_url') return 'Import failed: invalid URL.'
  if (reasonCode === 'blocked_by_cors_or_network') return 'Import failed: blocked by CORS/network.'
  if (reasonCode === 'unsupported_response_content_type') return 'Import failed: unsupported response content type.'
  return 'Import failed during intake.'
}

type ClientScopeRow = {
  client_id: string
  client_name: string | null
  agency_id: string
  organization_type: string
}

type ExistingSiteRow = {
  site_id: string
  org_id: string
  agency_id: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value)
  if (!normalized || !UUID_RE.test(normalized)) return null
  return normalized
}

function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed
  } catch {
    return null
  }
}

function buildScopedImportRuntimeIdentity(input: { sourceUrl: string; clientId: string; agencyId: string }): {
  siteId: string
  siteVersionId: string
  correlationKey: string
} {
  const siteId = deterministicId('site', `${input.sourceUrl}|/`)
  const correlationKey = deterministicId('runtime-import-correlation', `${input.agencyId}|${input.clientId}|${input.sourceUrl}|${siteId}`)
  const digest = crypto.createHash('sha256').update(`${correlationKey}|site-version`).digest()
  const bytes = Uint8Array.from(digest.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Buffer.from(bytes).toString('hex')
  const siteVersionId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  return { siteId, siteVersionId, correlationKey }
}


async function assertClientScope(input: {
  clientId: string
  agencyId: string
}): Promise<{ clientId: string; clientName: string | null; agencyId: string }> {
  const pool = getSuperadminPool()
  const client = await pool.connect()

  try {
    const result = await client.query<ClientScopeRow>(
      `
      select
        o.id::text as client_id,
        o.name::text as client_name,
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

    return {
      clientId: row.client_id,
      clientName: row.client_name,
      agencyId: row.agency_id,
    }
  } finally {
    client.release()
  }
}

async function resolveOrCreateOwnershipSiteId(input: {
  runtimeSiteId: string
  siteVersionId: string
  clientId: string
  agencyId: string
  siteName: string
  domainHost: string | null
}): Promise<string> {
  const pool = getSuperadminPool()
  const client = await pool.connect()

  try {
    await client.query('begin')

    const latestBoundSiteResult = await client.query<ExistingSiteRow>(
      `
      select
        s.id::text as site_id,
        s.org_id::text as org_id,
        s.agency_id::text as agency_id
      from public.gnr8_runtime_site_versions sv
      join public.sites s on s.id = sv.ownership_site_id
      where sv.site_id = $1::text
      order by sv.version_no desc, sv.updated_at desc, sv.created_at desc, sv.id::text desc
      limit 1
      `,
      [input.runtimeSiteId],
    )

    let ownershipSiteId = normalizeText(latestBoundSiteResult.rows[0]?.site_id)
    if (ownershipSiteId) {
      const row = latestBoundSiteResult.rows[0]!
      if (row.org_id !== input.clientId || row.agency_id !== input.agencyId) {
        throw new Error('Import scope mismatch: runtime site is already linked to a different client context.')
      }
    }

    if (!ownershipSiteId && input.domainHost) {
      const existingDomainSite = await client.query<ExistingSiteRow>(
        `
        select
          s.id::text as site_id,
          s.org_id::text as org_id,
          s.agency_id::text as agency_id
        from public.sites s
        where s.org_id = $1::uuid
          and s.agency_id = $2::uuid
          and lower(coalesce(s.domain, '')) = lower($3::text)
        order by s.updated_at desc, s.id::text desc
        limit 1
        `,
        [input.clientId, input.agencyId, input.domainHost],
      )

      ownershipSiteId = normalizeText(existingDomainSite.rows[0]?.site_id)
    }

    if (!ownershipSiteId) {
      const inserted = await client.query<{ site_id: string }>(
        `
        insert into public.sites (org_id, agency_id, name, status, domain, is_template)
        values ($1::uuid, $2::uuid, $3::text, 'draft'::public.site_status_enum, $4::text, false)
        returning id::text as site_id
        `,
        [input.clientId, input.agencyId, input.siteName, input.domainHost],
      )
      ownershipSiteId = normalizeText(inserted.rows[0]?.site_id)
      if (!ownershipSiteId) {
        throw new Error('Unable to create client site ownership record for imported runtime site.')
      }
    }

    const ownershipLink = await client.query<{ id: string }>(
      `
      update public.gnr8_runtime_site_versions
      set ownership_site_id = $2::uuid
      where id = $1::uuid
        and (ownership_site_id is null or ownership_site_id = $2::uuid)
      returning id::text as id
      `,
      [input.siteVersionId, ownershipSiteId],
    )

    if (!ownershipLink.rows[0]) {
      throw new Error('Unable to link imported runtime version to scoped site ownership.')
    }

    await client.query('commit')
    return ownershipSiteId
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  try {
    const { clientId: rawClientId } = await ctx.params
    const clientId = normalizeUuid(rawClientId)
    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'clientId must be a valid UUID.' }, { status: 400 })
    }

    const body = ((await req.json().catch(() => null)) ?? {}) as Body
    const importUrl = parseHttpUrl(body.url)
    if (!importUrl) {
      return NextResponse.json({ ok: false, error: 'url must be valid http(s).' }, { status: 400 })
    }

    const actionContext = await requireAgencyActionContext({
      action: 'run_migration',
      requestedAgencyId: body.agencyId,
    })

    await assertClientScope({
      clientId,
      agencyId: actionContext.agencyId,
    })
    const diagnostics: string[] = ['SITE_IMPORT_SITE_NAME_RESOLVED']

    const runtimeIdentity = buildScopedImportRuntimeIdentity({
      sourceUrl: importUrl.toString(),
      clientId,
      agencyId: actionContext.agencyId,
    })
    const preallocatedIdentity = await preallocateSiteVersionIdentity({
      siteId: runtimeIdentity.siteId,
      siteVersionId: runtimeIdentity.siteVersionId,
      sourceUrl: importUrl.toString(),
      actor: `agency:client-scoped-import:${actionContext.actorMode}`,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
      correlationKey: runtimeIdentity.correlationKey,
    }).catch((error) => {
      diagnostics.push('RUNTIME_IMPORT_IDENTITY_PREALLOCATION_FAILED')
      console.error('[site-import] RUNTIME_IMPORT_IDENTITY_PREALLOCATION_FAILED', {
        orgId: actionContext.agencyId,
        agencyId: actionContext.agencyId,
        clientId,
        siteId: runtimeIdentity.siteId,
        siteVersionId: runtimeIdentity.siteVersionId,
        sourceUrl: importUrl.toString(),
        correlationKey: runtimeIdentity.correlationKey,
        reasonCode: error instanceof Error ? error.message : 'preallocation_failed',
      })
      throw error
    })
    diagnostics.push(preallocatedIdentity.reused ? 'RUNTIME_IMPORT_IDENTITY_REUSED' : 'RUNTIME_IMPORT_IDENTITY_PREALLOCATED')
    console.info(`[site-import] ${preallocatedIdentity.reused ? 'RUNTIME_IMPORT_IDENTITY_REUSED' : 'RUNTIME_IMPORT_IDENTITY_PREALLOCATED'}`, {
      orgId: actionContext.agencyId,
      agencyId: actionContext.agencyId,
      clientId,
      siteId: preallocatedIdentity.siteId,
      siteVersionId: preallocatedIdentity.siteVersionId,
      sourceUrl: importUrl.toString(),
      correlationKey: runtimeIdentity.correlationKey,
      reasonCode: preallocatedIdentity.reused ? 'preallocated_identity_exists' : 'preallocated_identity_created',
    })

    const snapshot = await importPublicSinglePageUrlToSnapshot({
      sourceUrl: importUrl.toString(),
      requestId: `client-site-import-${Date.now()}`,
      siteId: preallocatedIdentity.siteId,
      siteVersionId: preallocatedIdentity.siteVersionId,
    })
    const rawHtml = fs.readFileSync(snapshot.entryHtmlPathAbs, 'utf8')
    const documentTitle = extractTitleFromHtmlDocument(rawHtml)
    const siteNameResolution = resolveImportedSiteName({
      userProvidedName: body.siteName,
      sourceUrl: importUrl.toString(),
      documentTitle,
    })
    const createPayload = buildSiteImportCreatePayload({
      userProvidedSiteName: body.siteName,
      sourceUrl: importUrl.toString(),
      documentTitle,
      clientId,
      agencyId: actionContext.agencyId,
    })
    if (siteNameResolution.source !== 'user_provided') {
      diagnostics.push('SITE_IMPORT_SITE_NAME_FALLBACK_USED')
      console.info('[site-import] SITE_IMPORT_SITE_NAME_FALLBACK_USED', {
        source: siteNameResolution.source,
        resolvedName: createPayload.name,
        sourceUrl: createPayload.sourceUrl,
        clientId: createPayload.clientId,
        agencyId: createPayload.agencyId,
      })
    }
    diagnostics.push('SITE_IMPORT_SITE_CREATE_STARTED')
    console.info('[site-import] SITE_IMPORT_SITE_NAME_RESOLVED', {
      source: siteNameResolution.source,
      resolvedName: createPayload.name,
      sourceUrl: createPayload.sourceUrl,
      clientId: createPayload.clientId,
      agencyId: createPayload.agencyId,
    })
    const intake = snapshot.importIntake ?? null
    const rawHtmlUsable = Boolean((intake?.rawHtmlAvailable ?? false) && (intake?.htmlByteLength ?? 0) > 0)
    const pipelineMode: 'strict' | 'degraded_html_fallback' = !intake?.ok && rawHtmlUsable ? 'degraded_html_fallback' : 'strict'

    if (!intake?.ok && !rawHtmlUsable) {
      const reasonCode = intake?.reasonCode ?? 'fetch_failed'
      return NextResponse.json(
        {
          ok: false,
          reasonCode,
          error: mapSiteImportReasonToMessage(reasonCode),
          intake,
          diagnostics: snapshot.importDiagnostics,
        },
        { status: 502 },
      )
    }

    const imported = await runScopedImportPipeline({
      snapshot,
      sourceUrl: importUrl.toString(),
      actor: `agency:client-scoped-import:${actionContext.actorMode}`,
      fallbackToLegacyOnPipelineFailure: false,
      runtimeIdentity: {
        siteId: preallocatedIdentity.siteId,
        siteVersionId: preallocatedIdentity.siteVersionId,
      },
      multiPageDiscovery: body.multiPageDiscovery,
    })

    const ownershipSiteId = await resolveOrCreateOwnershipSiteId({
      runtimeSiteId: imported.siteId,
      siteVersionId: imported.siteVersionId,
      clientId: createPayload.clientId,
      agencyId: createPayload.agencyId,
      siteName: createPayload.name,
      domainHost: normalizeText(importUrl.host) || null,
    })
    diagnostics.push('SITE_IMPORT_SITE_CREATE_COMPLETED')
    console.info('[site-import] SITE_IMPORT_SITE_CREATE_COMPLETED', {
      siteId: ownershipSiteId,
      resolvedName: siteNameResolution.resolvedName,
      sourceUrl: importUrl.toString(),
      clientId,
      agencyId: actionContext.agencyId,
    })

    const redirectTo = importerSuccessRedirectHref({
      clientId,
      agencyId: actionContext.agencyId,
      siteId: ownershipSiteId,
      adminView: body.adminView,
    })

    const rawHtmlLength = rawHtml.trim().length
    let structuredHtmlLength = 0
    if (imported.mode === 'pipeline') {
      const artifact = await getArtifactById(imported.artifactId)
      if (artifact) {
        const structuredHtml = artifact.htmlByPath['/'] ?? Object.values(artifact.htmlByPath)[0] ?? ''
        structuredHtmlLength = String(structuredHtml).trim().length
      }
    }
    const preview = resolveImportPreview({
      pipelineMode,
      preparedSite: imported.mode === 'pipeline' ? imported.preparedSite : null,
      renderOutput: imported.mode === 'pipeline' ? imported.renderOutput : null,
      structuredHtmlLength,
      rawHtmlLength,
    })
    const cmsContentSlots = imported.mode === 'pipeline' ? imported.reporting.cmsContentSlots : null
    const cmsDiagnostics = cmsContentSlots?.diagnostics ?? []
    const multiPageDiscovery = imported.mode === 'pipeline' ? imported.reporting.multiPageDiscovery : imported.diagnostics.multiPageDiscovery

    return NextResponse.json(
      {
        ok: true,
        importPathClassification: 'canonical_scoped',
        canonicalImportPath: SCOPED_SITE_IMPORT_CANONICAL_PATH,
        siteId: ownershipSiteId,
        runtimeSiteId: imported.siteId,
        siteVersionId: imported.siteVersionId,
        siteVersionNo: imported.versionNo,
        actor_mode: actionContext.actorMode,
        fallbackUsed: imported.mode === 'legacy_fallback',
        previewMode: preview.previewMode,
        htmlLength: preview.htmlLength,
        appliedTransformationsCount: preview.appliedTransformationsCount,
        diagnostics: [...new Set([...preview.diagnostics, ...diagnostics, ...cmsDiagnostics])],
        contentSlotMaterialization: cmsContentSlots,
        ...(multiPageDiscovery.enabled ? { multiPageDiscovery } : {}),
        siteName: siteNameResolution.resolvedName,
        siteNameSource: siteNameResolution.source,
        preview,
        importManifest: {
          status: pipelineMode === 'degraded_html_fallback' ? 'degraded' : 'success',
          intakeReasonCode: intake?.reasonCode ?? null,
          fallbackUsed: pipelineMode === 'degraded_html_fallback',
        },
        warning:
          pipelineMode === 'degraded_html_fallback'
            ? 'Imported using raw HTML fallback. Some structure may be incomplete.'
            : null,
        previewArtifacts: {
          rawImportCaptured: true,
          transformedPreviewGenerated: imported.mode === 'pipeline',
          debugPreviewAvailable: true,
          runtimePreviewLinked: imported.mode === 'pipeline' && imported.reporting.writePath.artifactBindSucceeded,
        },
        pipeline: {
          pipelineMode,
          executionStatus: imported.mode === 'pipeline' ? imported.reporting.executionStatus : imported.diagnostics.pipelineStatus,
          consolidationApplied: imported.mode === 'pipeline' ? imported.reporting.consolidationApplied : false,
          renderedCaptureUsed: imported.mode === 'pipeline' ? imported.reporting.renderedCaptureUsed : imported.diagnostics.sourceMode === 'rendered_dom',
          artifactGenerated: imported.mode === 'pipeline' ? imported.reporting.artifactGenerated : false,
          sourceMode: imported.mode === 'pipeline' ? imported.reporting.sourceMode : imported.diagnostics.sourceMode,
          fidelityStatus: imported.mode === 'pipeline' ? imported.reporting.fidelityStatus : imported.diagnostics.fidelityStatus,
          fidelityDegraded: imported.mode === 'pipeline' ? imported.reporting.fidelityDegraded : imported.diagnostics.fidelityDegraded,
          renderedCaptureStatus: imported.mode === 'pipeline' ? imported.reporting.renderedCaptureStatus : imported.diagnostics.renderedCaptureStatus,
          renderedDomQuality: imported.mode === 'pipeline' ? imported.reporting.renderedDomQuality : imported.diagnostics.renderedDomQuality,
          screenshotCount: imported.mode === 'pipeline' ? imported.reporting.screenshotCount : imported.diagnostics.screenshotCount,
          computedStyleSampleCount:
            imported.mode === 'pipeline' ? imported.reporting.computedStyleSampleCount : imported.diagnostics.computedStyleSampleCount,
          importDiagnosticCodes: imported.mode === 'pipeline' ? imported.reporting.importDiagnosticCodes : imported.diagnostics.importDiagnosticCodes,
          ...(multiPageDiscovery.enabled ? { multiPageDiscovery } : {}),
          cmsContentSlots,
          fallbackReason: imported.mode === 'legacy_fallback' ? imported.fallbackReason : null,
          diagnostics:
            imported.mode === 'legacy_fallback'
              ? {
                  stageSummaries: imported.diagnostics.stageSummaries,
                  pipelineDiagnosticCodes: [
                    ...new Set([
                      ...imported.diagnostics.pipelineDiagnosticCodes,
                      ...(pipelineMode === 'degraded_html_fallback'
                        ? ['SITE_IMPORT_FALLBACK_ACTIVATED', 'SITE_IMPORT_FALLBACK_REASON', 'SITE_IMPORT_PIPELINE_CONTINUED_WITH_RAW_HTML']
                        : []),
                      ...cmsDiagnostics,
                    ]),
                  ].sort((a, b) => a.localeCompare(b)),
                  writePath: imported.diagnostics.writePath,
                }
              : {
                  stageSummaries: imported.pipelineResult.stages.map((stage) => stage.summary),
                  pipelineDiagnosticCodes: [
                    ...new Set([
                      ...imported.pipelineResult.diagnostics.map((issue) => issue.code),
                      ...(pipelineMode === 'degraded_html_fallback'
                        ? ['SITE_IMPORT_FALLBACK_ACTIVATED', 'SITE_IMPORT_FALLBACK_REASON', 'SITE_IMPORT_PIPELINE_CONTINUED_WITH_RAW_HTML']
                        : []),
                      ...cmsDiagnostics,
                    ]),
                  ].sort((a, b) => a.localeCompare(b)),
                  writePath: imported.reporting.writePath,
                },
        },
        redirectTo,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('[site-import] SITE_IMPORT_SITE_CREATE_FAILED', {
      message: error instanceof Error ? error.message : String(error),
    })
    const mapped = parseAgencyActionContextError(error)
    if (mapped.status >= 400 && mapped.status < 500) {
      return NextResponse.json({ ok: false, error: mapped.message, diagnostics: ['SITE_IMPORT_SITE_CREATE_FAILED'] }, { status: mapped.status })
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ ok: false, error: message, diagnostics: ['SITE_IMPORT_SITE_CREATE_FAILED'] }, { status: 500 })
  }
}
