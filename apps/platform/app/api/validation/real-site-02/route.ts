import { NextResponse } from "next/server";

import { runValidationShellRealSite02 } from "@/src/validation-shell/real-site-02";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Temporary phase-1 validation shell API.
 * Returns deterministic validation artifacts for fixture: real-site-02.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const requestId = (url.searchParams.get("requestId") ?? "").trim() || undefined;

  const res = await runValidationShellRealSite02({ requestId });
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
