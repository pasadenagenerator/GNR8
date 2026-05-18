import { NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { upsertDomainHostBinding } from "@/gnr8/runtime/runtime-store";
import { classifyDomainType, computeDomainDnsInstructions, normalizeDomainForDns } from "@/src/lib/vercel/domain-dns-instructions";
import { checkDomainStatus, addDomainToVercel } from "@/src/lib/vercel/vercel-domain-client";
import { getSuperadminPool } from "@/src/superadmin/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeUuid(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized || !UUID_RE.test(normalized)) return null;
  return normalized;
}

function normalizeDomain(value: unknown): string | null {
  const domain = normalizeDomainForDns(value);
  return domain || null;
}

function logDomainEvent(event: string, details: Record<string, unknown>): void {
  console.info(`[gnr8.domain] ${event}`, details);
}

function logDnsDiagnostics(input: {
  diagnostics: string[];
  domain: string;
  runtimeSiteId: string;
  siteVersionId: string;
}): void {
  for (const diagnostic of input.diagnostics) {
    logDomainEvent(diagnostic, {
      domain: input.domain,
      runtimeSiteId: input.runtimeSiteId,
      siteVersionId: input.siteVersionId,
    });
  }
}

function toPublicErrorMessage(raw: string): string {
  const prefixes = ["VERCEL_DOMAIN_ADD_FAILED:", "VERCEL_DOMAIN_STATUS_FAILED:"];
  const prefix = prefixes.find((candidate) => raw.startsWith(candidate));
  if (!prefix) return raw;
  try {
    const payload = JSON.parse(raw.slice(prefix.length)) as { message?: string };
    const message = normalizeText(payload.message);
    return message || "Vercel domain automation failed.";
  } catch {
    return "Vercel domain automation failed.";
  }
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
    } finally {
      client.release();
    }

    if (!runtimeSiteId) {
      return NextResponse.json({ ok: false, error: "Runtime site is not available." }, { status: 409 });
    }

    logDomainEvent("VERCEL_DOMAIN_ADD_REQUESTED", {
      agencyId: actionContext.agencyId,
      clientId,
      siteId,
      siteVersionId,
      runtimeSiteId,
      domain,
    });

    try {
      const classifiedDomainType = classifyDomainType(domain);
      logDomainEvent("DOMAIN_TYPE_CLASSIFIED", { domain, runtimeSiteId, siteVersionId, domainType: classifiedDomainType });
      if (classifiedDomainType === "wildcard_domain") {
        const wildcardBinding = await upsertDomainHostBinding({
          siteId: runtimeSiteId,
          siteVersionId,
          domain,
          status: "failed",
          domainType: classifiedDomainType,
          lastCheckedAt: new Date().toISOString(),
        });
        logDomainEvent("DNS_WILDCARD_UNSUPPORTED", { domain, runtimeSiteId, siteVersionId, bindingId: wildcardBinding.id });
        return NextResponse.json({
          ok: true,
          domain: wildcardBinding.domain,
          binding: wildcardBinding,
          dnsInstruction: null,
          dnsInstructions: [],
          warning: "Wildcard domains are not supported yet in this flow.",
        });
      }

      const addResult = await addDomainToVercel(domain);
      if (addResult.outcome === "already_exists") {
        logDomainEvent("VERCEL_DOMAIN_ALREADY_EXISTS", { domain, runtimeSiteId, siteVersionId });
      } else {
        logDomainEvent("VERCEL_DOMAIN_ADDED", { domain, runtimeSiteId, siteVersionId, vercelDomainId: addResult.domainId });
      }

      const vercelStatus = await checkDomainStatus(domain);
      const dnsComputation = computeDomainDnsInstructions({
        domain,
        vercelStatus,
      });
      logDnsDiagnostics({
        diagnostics: dnsComputation.diagnostics.filter((code) => code !== "DOMAIN_TYPE_CLASSIFIED"),
        domain,
        runtimeSiteId,
        siteVersionId,
      });
      const binding = await upsertDomainHostBinding({
        siteId: runtimeSiteId,
        siteVersionId,
        domain,
        status: vercelStatus.status,
        domainType: dnsComputation.domainType,
        verificationType:
          dnsComputation.verificationInstruction?.type === "cname" || dnsComputation.verificationInstruction?.type === "txt"
            ? dnsComputation.verificationInstruction.type
            : null,
        verificationValue: dnsComputation.verificationInstruction?.value ?? null,
        verificationHost: dnsComputation.verificationInstruction?.host ?? null,
        dnsRecordType: dnsComputation.primaryInstruction?.type ?? null,
        dnsRecordHost: dnsComputation.primaryInstruction?.host ?? null,
        dnsRecordValue: dnsComputation.primaryInstruction?.value ?? null,
        dnsRecordPurpose: dnsComputation.primaryInstruction?.purpose ?? null,
        dnsInstructions: dnsComputation.instructions,
        vercelDomainId: vercelStatus.domainId ?? addResult.domainId,
        lastCheckedAt: vercelStatus.lastCheckedAt,
      });

      await pool.query(
        `
        update public.sites
        set domain = $2::text, updated_at = now()
        where id = $1::uuid
        `,
        [siteId, domain],
      );

      if (binding.status === "active") {
        logDomainEvent("VERCEL_DOMAIN_VERIFIED", { domain, runtimeSiteId, siteVersionId, bindingId: binding.id });
      } else {
        logDomainEvent("VERCEL_DOMAIN_VERIFICATION_REQUIRED", {
          domain,
          runtimeSiteId,
          siteVersionId,
          bindingId: binding.id,
          verificationType: binding.verificationType,
          verificationHost: binding.verificationHost,
        });
      }

      return NextResponse.json({
        ok: true,
        domain: binding.domain,
        binding,
        dnsInstruction:
          binding.status !== "active" && binding.dnsRecordType && binding.dnsRecordValue && binding.dnsRecordHost
            ? {
                type: binding.dnsRecordType,
                host: binding.dnsRecordHost,
                value: binding.dnsRecordValue,
              }
            : null,
        dnsInstructions: binding.dnsInstructions ?? [],
      });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Domain connection failed";
      const isDomainConflict = rawMessage.includes("DOMAIN_ALREADY_BOUND_TO_ANOTHER_SITE");
      const message = isDomainConflict ? "Domain is already connected to another site." : toPublicErrorMessage(rawMessage);
      const failedBinding = await upsertDomainHostBinding({
        siteId: runtimeSiteId,
        siteVersionId,
        domain,
        status: "failed",
        domainType: classifyDomainType(domain),
        lastCheckedAt: new Date().toISOString(),
      }).catch(() => null);
      if (!isDomainConflict) {
        await pool.query(
          `
          update public.sites
          set domain = $2::text, updated_at = now()
          where id = $1::uuid
          `,
          [siteId, domain],
        ).catch(() => null);
      }

      logDomainEvent("VERCEL_DOMAIN_FAILED", {
        domain,
        runtimeSiteId,
        siteVersionId,
        error: rawMessage,
        bindingId: failedBinding?.id ?? null,
      });

      return NextResponse.json(
        {
          ok: false,
          error: message,
          binding: failedBinding,
        },
        { status: isDomainConflict ? 409 : 502 },
      );
    }
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status });
  }
}
