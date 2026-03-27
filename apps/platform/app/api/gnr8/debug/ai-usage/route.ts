import { NextRequest, NextResponse } from "next/server";

import { readAIUsageDebug } from "@/gnr8/billing/ai-usage-debug-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function mapError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") return { status: 401, message };
  if (message.startsWith("Forbidden")) return { status: 403, message };
  if (message.includes("must be a valid UUID")) return { status: 400, message };
  return { status: 500, message };
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperadminUserId();

    const search = request.nextUrl.searchParams;
    const result = await readAIUsageDebug({
      siteId: search.get("siteId") ?? undefined,
      agencyId: search.get("agencyId") ?? undefined,
      clientId: search.get("clientId") ?? undefined,
      featureContext: search.get("featureContext") ?? undefined,
      operationType: search.get("operationType") ?? undefined,
      limit: parseLimit(search.get("limit")),
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    const out = mapError(error);
    return NextResponse.json({ ok: false, error: out.message }, { status: out.status });
  }
}
