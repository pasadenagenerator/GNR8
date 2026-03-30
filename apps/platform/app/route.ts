import { NextResponse, type NextRequest } from "next/server";

import { renderPublicPathResponse, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSupabaseAuthCallback(url: URL): boolean {
  const type = url.searchParams.get("type");
  return type === "recovery";
}

export async function GET(req: NextRequest): Promise<Response> {
  const host = resolveRequestHost(req.headers);
  const requestUrl = new URL(req.url);

  if (isSupabaseAuthCallback(requestUrl)) {
    const target = new URL(`/reset-password${requestUrl.search}`, req.url);
    return NextResponse.redirect(target, { status: 307 });
  }

  return renderPublicPathResponse({ path: "/", host });
}
