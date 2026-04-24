import { NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { upsertDomainHostBinding } from "@/gnr8/runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized || !UUID_RE.test(normalized)) return null;
  return normalized;
}

function normalizeDomain(value: unknown): string | null {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return null;
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  const authority = withoutProtocol.split("/")[0] ?? "";
  const domain = (authority.split(":")[0] ?? "").replace(/\.+$/, "").trim();
  if (!domain || !DOMAIN_RE.test(domain)) return null;
  return domain;
}

type ConnectDomainBody = {
  agencyId?: unknown;
  domain?: unknown;
  siteVersionId?: unknown;
};

export async function POST(
  request: Request,
  ctx: { params: Promise<{ clientId?: string; siteId?: string }> },
) {
  try {
    const params = await ctx.params;
    const clientId = normalizeUuid(params.clientId);
    const siteId = normalizeUuid(params.siteId);
    if (!clientId || !siteId) {
      return NextResponse.json({ ok: false, error: "clientId and siteId must be valid UUIDs." }, { status: 400 });
    }

    const body = ((await request.json().catch(() => null)) ?? {}) as ConnectDomainBody;
    const requestedAgencyId = normalizeUuid(body.agencyId);
    const siteVersionId = normalizeUuid(body.siteVersionId);
    const domain = normalizeDomain(body.domain);
    if (!requestedAgencyId) {
      return NextResponse.json({ ok: false, error: "agencyId is required." }, { status: 400 });
    }
    if (!siteVersionId) {
      return NextResponse.json({ ok: false, error: "siteVersionId is required." }, { status: 400 });
    }
    if (!domain) {
      return NextResponse.json({ ok: false, error: "A valid domain is required (for example: site.example.com)." }, { status: 400 });
    }

    const actionContext = await requireAgencyActionContext({
      action: "publish",
      requestedAgencyId,
    });
    if (actionContext.agencyId !== requestedAgencyId) {
      return NextResponse.json({ ok: false, error: "Agency scope mismatch for site domain settings." }, { status: 403 });
    }

    const pool = getSuperadminPool();
    const client = await pool.connect();
    let runtimeSiteId: string | null = null;
    try {
      const scope = await client.query<{
        site_id: string;
      }>(
        `
        select s.id::text as site_id
        from public.sites s
        join public.organizations o on o.id = s.org_id
        where s.id = $1::uuid
          and s.org_id = $2::uuid
          and s.agency_id = $3::uuid
          and o.organization_type = 'client'
        limit 1
        `,
        [siteId, clientId, actionContext.agencyId],
      );
      if (!scope.rows[0]) {
        return NextResponse.json({ ok: false, error: "Site scope is invalid for this agency/client context." }, { status: 404 });
      }

      const runtimeSite = await client.query<{ runtime_site_id: string }>(
        `
        select sv.site_id::text as runtime_site_id
        from public.gnr8_runtime_site_versions sv
        where sv.id = $1::uuid
          and sv.ownership_site_id = $2::uuid
        limit 1
        `,
        [siteVersionId, siteId],
      );
      runtimeSiteId = runtimeSite.rows[0]?.runtime_site_id ?? null;
      if (!runtimeSiteId) {
        return NextResponse.json(
          { ok: false, error: "Selected runtime version is not available for this site yet." },
          { status: 409 },
        );
      }

      await client.query(
        `
        update public.sites
        set domain = $2::text, updated_at = now()
        where id = $1::uuid
        `,
        [siteId, domain],
      );
    } finally {
      client.release();
    }

    const binding = await upsertDomainHostBinding({
      siteId: runtimeSiteId,
      siteVersionId,
      domain,
      status: "pending",
    });

    return NextResponse.json({
      ok: true,
      domain: binding.domain,
      binding,
      vercelSetupRequired: true,
      vercelSetupChecklist: [
        "Add this domain to your Vercel project settings.",
        "Point your DNS records to Vercel.",
      ],
    });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
}
