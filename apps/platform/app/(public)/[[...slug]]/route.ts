import { NextResponse, type NextRequest } from "next/server";

import { renderPublicPathResponse, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSupabaseAuthCallback(url: URL): boolean {
  const hasCode = url.searchParams.has("code");
  const type = url.searchParams.get("type");
  return hasCode || type === "recovery" || type === "invite";
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");
  const host = resolveRequestHost(req.headers);

  if (path === "/") {
    const requestUrl = new URL(req.url);
    if (isSupabaseAuthCallback(requestUrl)) {
      const target = new URL(`/reset-password${requestUrl.search}`, req.url);
      return NextResponse.redirect(target, { status: 307 });
    }
  }

  return renderPublicPathResponse({ path, host });
}
