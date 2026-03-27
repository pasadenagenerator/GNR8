import { NextRequest, NextResponse } from "next/server";

import { assignSiteToClient } from "@/gnr8/command-center/command-center-assignment-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

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

export async function POST(request: NextRequest) {
  try {
    await requireSuperadminUserId();

    const body = ((await request.json().catch(() => null)) ?? {}) as AssignSiteBody;
    const siteId = typeof body.siteId === "string" ? body.siteId : "";
    const clientId = typeof body.clientId === "string" ? body.clientId : "";

    const assignment = await assignSiteToClient({ siteId, clientId });
    return NextResponse.json({ ok: true, assignment }, { status: 200 });
  } catch (error) {
    const out = mapError(error);
    return NextResponse.json({ ok: false, error: out.message }, { status: out.status });
  }
}

