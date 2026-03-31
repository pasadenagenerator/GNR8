import { NextRequest, NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { assignSiteToClient } from "@/gnr8/command-center/command-center-assignment-service";
import { getSuperadminPool } from "@/src/superadmin/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AssignSiteBody = {
  siteId?: unknown;
  clientId?: unknown;
};

function mapError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") return { status: 401, message };
  if (message.startsWith("Forbidden")) return { status: 403, message };
  if (
    message.includes("is required") ||
    message.includes("must be a valid UUID") ||
    message.includes("not found") ||
    message.includes("must reference") ||
    message.includes("same agency")
  ) {
    return { status: 400, message };
  }
  return { status: 500, message };
}

async function resolveAgencyIdForSite(siteId: string): Promise<string | null> {
  const normalizedSiteId = String(siteId ?? "").trim();
  if (!normalizedSiteId) return null;

  const client = await getSuperadminPool().connect();
  try {
    const result = await client.query<{ agency_id: string | null }>(
      `select agency_id::text as agency_id from public.sites where id = $1::uuid limit 1`,
      [normalizedSiteId],
    );
    const agencyId = String(result.rows[0]?.agency_id ?? "").trim();
    return agencyId || null;
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = ((await request.json().catch(() => null)) ?? {}) as AssignSiteBody;
    const siteId = typeof body.siteId === "string" ? body.siteId : "";
    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const siteAgencyId = await resolveAgencyIdForSite(siteId);
    if (!siteAgencyId) {
      return NextResponse.json({ ok: false, error: "Site agency scope could not be resolved." }, { status: 400 });
    }

    await requireAgencyActionContext({
      action: "assign_client",
      requestedAgencyId: siteAgencyId,
    });

    const assignment = await assignSiteToClient({ siteId, clientId });
    return NextResponse.json({ ok: true, assignment }, { status: 200 });
  } catch (error) {
    const mappedAuth = parseAgencyActionContextError(error);
    if (mappedAuth.status >= 400 && mappedAuth.status < 500) {
      return NextResponse.json({ ok: false, error: mappedAuth.message }, { status: mappedAuth.status });
    }
    const out = mapError(error);
    return NextResponse.json({ ok: false, error: out.message }, { status: out.status });
  }
}
