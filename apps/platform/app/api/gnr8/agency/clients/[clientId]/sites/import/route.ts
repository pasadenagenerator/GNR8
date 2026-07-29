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
import { recordSingleSiteCaptureSpine, type SingleSiteCaptureSpineEvidenceRefInput } from '@/gnr8/single-site/single-site-capture-spine-adapter'

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
        assembleRawArtifactPages?: boolean
        limits?: {
          maxRoutes?: number
          maxDepth?: number
          maxLinksPerPage?: number
          maxTemplateLinksPerRoute?: number
          maxSitemaps?: number
          maxUrlsFromSitemaps?: number
          maxNestedSitemaps?: number
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

function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function captureSpineActor(actorMode: string) {
  return {
    actorType: 'system' as const,
    actorId: `agency:client-scoped-import:${actorMode}`,
    actorRole: 'capture_import_completion_adapter',
    actorDisplayLabel: 'Client-scoped import capture spine adapter',
  }
}

function captureSpineBaseInput(input: {
  importUrl: URL
  clientId: string
  agencyId: string
  actorMode: string
  runtimeSiteId: string
  siteVersionId: string
  correlationKey: string
  snapshotId: string
  snapshotRunId: string
}) {
  return {
    tenantId: input.agencyId,
    clientId: input.clientId,
    runtimeSiteId: input.runtimeSiteId,
    siteVersionId: input.siteVersionId,
    runtimeSiteVersionId: input.siteVersionId,
    sourceUrl: input.importUrl.toString(),
    canonicalSourceUrl: input.importUrl.toString(),
    intendedLaunchDomain: normalizeText(input.importUrl.host) || null,
    idempotencyKey: `single-site-capture:${input.correlationKey}`,
    migrationIdempotencyKey: `single-site-capture:${input.correlationKey}:migration`,
    correlationId: input.correlationKey,
    requestId: input.snapshotRunId,
    actor: captureSpineActor(input.actorMode),
    captureRunId: input.snapshotId,
    renderJobId: input.snapshotId,
    sourceEvidencePackageKey: `url-import-snapshot:${input.snapshotId}`,
    sourceWatermark: input.snapshotId,
    metadataJson: {
      boundary: 'client_scoped_site_import_route',
      snapshotId: input.snapshotId,
    },
  }
}

function buildCaptureCompletionEvidenceRefs(input: {
  sourceUrl: string
  snapshotId: string
  rawHtml: string
  snapshot: Awaited<ReturnType<typeof importPublicSinglePageUrlToSnapshot>>
}): SingleSiteCaptureSpineEvidenceRefInput[] {
  const refs: SingleSiteCaptureSpineEvidenceRefInput[] = [
    {
      category: 'source_url',
      sourceEvidenceRefRole: 'source_url',
      migrationRefRole: 'capture_run',
      refType: 'url',
      sourceRecordId: input.sourceUrl,
      sourceWatermark: input.snapshotId,
    },
    {
      category: 'page',
      sourceEvidenceRefRole: 'page',
      refType: 'url_single_page_snapshot',
      sourceRecordId: `${input.snapshotId}:entry-page`,
      sourceWatermark: input.snapshotId,
    },
    {
      category: 'dom',
      sourceEvidenceRefRole: 'raw_html',
      refType: 'raw_html',
      sourceRecordId: `${input.snapshotId}:raw-html`,
      sourceWatermark: input.snapshotId,
      contentHash: sha256Text(input.rawHtml),
      mediaType: 'text/html',
    },
    {
      category: 'text',
      sourceEvidenceRefRole: 'text_extract',
      refType: 'html_text_source',
      sourceRecordId: `${input.snapshotId}:raw-html-text`,
      sourceWatermark: input.snapshotId,
      contentHash: sha256Text(input.rawHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()),
      mediaType: 'text/plain',
    },
    {
      category: 'metadata',
      sourceEvidenceRefRole: 'metadata',
      refType: 'url_import_metadata',
      sourceRecordId: `${input.snapshotId}:metadata`,
      sourceWatermark: input.snapshotId,
    },
  ]

  for (const document of input.snapshot.renderedCapture.documents ?? []) {
    refs.push({
      category: 'dom',
      sourceEvidenceRefRole: 'rendered_dom',
      refType: 'rendered_dom',
      sourceRecordId: `${input.snapshotId}:rendered-dom`,
      sourceWatermark: input.snapshotId,
      contentHash: document.htmlSha256,
      mediaType: 'text/html',
      status: input.snapshot.renderedCapture.status === 'available' ? 'present' : 'present_with_warnings',
    })
  }

  for (const screenshot of input.snapshot.renderedCapture.screenshots ?? []) {
    refs.push({
      category: 'screenshot',
      sourceEvidenceRefRole: 'screenshot',
      refType: screenshot.captureType,
      sourceRecordId: `${input.snapshotId}:screenshot:${screenshot.captureType}`,
      sourceWatermark: input.snapshotId,
      mediaType: 'image/png',
      status: input.snapshot.renderedCapture.status === 'available' ? 'present' : 'present_with_warnings',
    })
  }

  const fetchedAssets = (input.snapshot.fetchManifest ?? []).filter((entry) => entry.fetchStatus === 'fetched')
  for (const [index, asset] of fetchedAssets.entries()) {
    const isImage = asset.assetKind === 'image'
    refs.push({
      category: isImage ? 'image' : 'asset',
      sourceEvidenceRefRole: isImage ? 'image_asset' : 'asset',
      refType: asset.assetKind,
      sourceRecordId: asset.resolvedUrl ?? asset.localPath ?? `${input.snapshotId}:asset:${index + 1}`,
      sourceWatermark: input.snapshotId,
      mediaType: asset.contentType,
      status: asset.httpStatus && asset.httpStatus >= 200 && asset.httpStatus < 300 ? 'present' : 'present_with_warnings',
    })
  }

  const fontFamilies = [
    ...new Set(
      (input.snapshot.renderedCapture.computedStyleSamples ?? [])
        .map((sample) => normalizeText(sample.styles.fontFamily))
        .filter(Boolean),
    ),
  ]
  for (const [index, fontFamily] of fontFamilies.entries()) {
    refs.push({
      category: 'font',
      sourceEvidenceRefRole: 'font_ref',
      refType: 'computed_font_family',
      sourceRecordId: `${input.snapshotId}:font:${index + 1}:${sha256Text(fontFamily).slice(0, 12)}`,
      sourceWatermark: input.snapshotId,
      status: 'present_with_warnings',
      metadataJson: { fontFamily },
    })
  }

  if ((input.snapshot.renderedCapture.computedStyleSamples ?? []).length > 0) {
    refs.push({
      category: 'visual_identity',
      sourceEvidenceRefRole: 'visual_identity',
      refType: 'computed_style_samples',
      sourceRecordId: `${input.snapshotId}:visual-identity`,
      sourceWatermark: input.snapshotId,
      status: input.snapshot.renderedCapture.status === 'available' ? 'present' : 'present_with_warnings',
    })
  }

  return refs
}

async function recordCaptureSpineBestEffort(input: Parameters<typeof recordSingleSiteCaptureSpine>[0]): Promise<void> {
  try {
    await recordSingleSiteCaptureSpine(input)
  } catch (error) {
    console.error('[site-import] SINGLE_SITE_CAPTURE_SPINE_RECORDING_FAILED', {
      message: error instanceof Error ? error.message : String(error),
      sourceUrl: input.sourceUrl,
      correlationId: input.correlationId,
      outcome: input.outcome,
    })
  }
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
    const captureCompletedAt =
      snapshot.renderedCaptureReliability.job?.completedAt ??
      snapshot.renderedCaptureReliability.job?.startedAt ??
      snapshot.renderedCaptureReliability.job?.createdAt ??
      null

    if (!intake?.ok && !rawHtmlUsable) {
      const reasonCode = intake?.reasonCode ?? 'fetch_failed'
      await recordCaptureSpineBestEffort({
        outcome: 'failed',
        ...captureSpineBaseInput({
          importUrl,
          clientId,
          agencyId: actionContext.agencyId,
          actorMode: actionContext.actorMode,
          runtimeSiteId: preallocatedIdentity.siteId,
          siteVersionId: preallocatedIdentity.siteVersionId,
          correlationKey: runtimeIdentity.correlationKey,
          snapshotId: snapshot.snapshotId,
          snapshotRunId: snapshot.snapshotRunId,
        }),
        captureStartedAt: snapshot.renderedCaptureReliability.job?.startedAt ?? snapshot.renderedCaptureReliability.job?.createdAt ?? null,
        captureCompletedAt,
        evidenceCapturedAt: captureCompletedAt,
        failureReason: reasonCode,
        warnings: snapshot.importDiagnostics.issues.filter((issue) => issue.severity === 'warning').map((issue) => ({ code: issue.code, message: issue.message })),
        blockers: [{ reasonCode, intake }],
        diagnosticsJson: {
          reasonCode,
          importDiagnostics: snapshot.importDiagnostics.summary,
          renderedCaptureStatus: snapshot.renderedCapture.status,
        },
      })
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
    await recordCaptureSpineBestEffort({
      outcome: 'completed',
      ...captureSpineBaseInput({
        importUrl,
        clientId,
        agencyId: actionContext.agencyId,
        actorMode: actionContext.actorMode,
        runtimeSiteId: imported.siteId,
        siteVersionId: imported.siteVersionId,
        correlationKey: runtimeIdentity.correlationKey,
        snapshotId: snapshot.snapshotId,
        snapshotRunId: snapshot.snapshotRunId,
      }),
      siteId: ownershipSiteId,
      ownershipSiteId,
      captureStartedAt: snapshot.renderedCaptureReliability.job?.startedAt ?? snapshot.renderedCaptureReliability.job?.createdAt ?? null,
      captureCompletedAt,
      evidenceCapturedAt: captureCompletedAt,
      sourceHash: snapshot.snapshotId,
      payloadHash: sha256Text(JSON.stringify({
        sourceUrl: importUrl.toString(),
        snapshotId: snapshot.snapshotId,
        renderedCaptureStatus: snapshot.renderedCapture.status,
        pipelineMode,
      })),
      evidenceRefs: buildCaptureCompletionEvidenceRefs({
        sourceUrl: importUrl.toString(),
        snapshotId: snapshot.snapshotId,
        rawHtml,
        snapshot,
      }),
      limitations:
        pipelineMode === 'degraded_html_fallback'
          ? [{ code: 'degraded_html_fallback', reason: 'Imported using raw HTML fallback after intake degradation.' }]
          : snapshot.renderedCapture.status !== 'available'
            ? [{ code: 'rendered_capture_degraded', status: snapshot.renderedCapture.status }]
            : [],
      warnings: [
        ...snapshot.importDiagnostics.issues
          .filter((issue) => issue.severity === 'warning')
          .map((issue) => ({ code: issue.code, message: issue.message })),
        ...cmsDiagnostics.map((code) => ({ code })),
      ],
      diagnosticsJson: {
        pipelineMode,
        importDiagnostics: snapshot.importDiagnostics.summary,
        renderedCaptureStatus: snapshot.renderedCapture.status,
        renderedCaptureUsed: imported.mode === 'pipeline' ? imported.reporting.renderedCaptureUsed : imported.diagnostics.sourceMode === 'rendered_dom',
        screenshotCount: snapshot.renderedCapture.screenshots.length,
        computedStyleSampleCount: snapshot.renderedCapture.computedStyleSamples.length,
      },
    })

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
