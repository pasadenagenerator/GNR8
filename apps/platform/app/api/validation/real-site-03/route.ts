import { NextResponse } from "next/server";

import { runValidationShellRealSite03 } from "@/src/validation-shell/real-site-03";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Temporary phase-1 validation shell API.
 * Returns deterministic validation artifacts for fixture: real-site-03.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestId = (url.searchParams.get("requestId") ?? "").trim() || undefined;

  const res = await runValidationShellRealSite03({ requestId });
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
