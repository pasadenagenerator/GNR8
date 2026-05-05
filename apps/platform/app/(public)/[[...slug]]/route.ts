import type { NextRequest } from "next/server";

import { normalizePublicDomainHost, renderPublicPathResponse, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");
  const debugParam = new URL(req.url).searchParams.get("__debug");
  const debugMode = debugParam === "1" || debugParam === "content";
  const contentDebugMode = debugParam === "content";
  const rawHost = resolveRequestHost(req.headers);
  const host = normalizePublicDomainHost(rawHost);
  return renderPublicPathResponse({ path, host, rawHost, debugMode, contentDebugMode });
}
