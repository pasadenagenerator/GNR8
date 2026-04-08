import fs from 'node:fs'

import { NextResponse } from 'next/server'

import { parseAgencyActionContextError, requireAgencyActionContext } from '@/app/api/gnr8/agency/_lib/agency-action-access'
import { importHtmlToPage } from '@/gnr8/importer/html-to-page'
import { migrateImportedPageToCanonicalDraft } from '@/gnr8/runtime/migration-factory'
import { SCOPED_SITE_IMPORT_CANONICAL_PATH } from '@/gnr8/site/site-import-contract'
import { importerSuccessRedirectHref } from '@/gnr8/site/site-importer-routing'
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
  agencyId?: string
  adminView?: boolean
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
        insert into public.sites (org_id, agency_id, status, domain, is_template)
        values ($1::uuid, $2::uuid, 'draft'::public.site_status_enum, $3::text, false)
        returning id::text as site_id
        `,
        [input.clientId, input.agencyId, input.domainHost],
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

    const snapshot = await importPublicSinglePageUrlToSnapshot({
      sourceUrl: importUrl.toString(),
      requestId: `client-site-import-${Date.now()}`,
    })
    if (snapshot.importDiagnostics.summary.fatalCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'URL snapshot capture failed.',
          diagnostics: snapshot.importDiagnostics,
        },
        { status: 502 },
      )
    }

    const html = fs.readFileSync(snapshot.entryHtmlPathAbs, 'utf8')
    if (!html.trim()) {
      return NextResponse.json({ ok: false, error: 'Upstream HTML empty.' }, { status: 502 })
    }

    const page = importHtmlToPage({ slug: '/', html })
    const migrated = await migrateImportedPageToCanonicalDraft({
      sourceUrl: importUrl.toString(),
      page,
      actor: `agency:client-scoped-import:${actionContext.actorMode}`,
    })

    const ownershipSiteId = await resolveOrCreateOwnershipSiteId({
      runtimeSiteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      clientId,
      agencyId: actionContext.agencyId,
      domainHost: normalizeText(importUrl.host) || null,
    })

    const redirectTo = importerSuccessRedirectHref({
      clientId,
      agencyId: actionContext.agencyId,
      siteId: ownershipSiteId,
      adminView: body.adminView,
    })

    return NextResponse.json(
      {
        ok: true,
        importPathClassification: 'canonical_scoped',
        canonicalImportPath: SCOPED_SITE_IMPORT_CANONICAL_PATH,
        siteId: ownershipSiteId,
        runtimeSiteId: migrated.siteId,
        siteVersionId: migrated.siteVersionId,
        siteVersionNo: migrated.versionNo,
        actor_mode: actionContext.actorMode,
        previewArtifacts: {
          rawImportCaptured: true,
          transformedPreviewGenerated: false,
          debugPreviewAvailable: true,
          runtimePreviewLinked: true,
        },
        redirectTo,
      },
      { status: 200 },
    )
  } catch (error) {
    const mapped = parseAgencyActionContextError(error)
    if (mapped.status >= 400 && mapped.status < 500) {
      return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
    }

    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
