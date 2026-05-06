import type { NextRequest } from "next/server";

import { normalizePublicDomainHost, renderPublicPathResponse, resolveRequestHost } from "@/src/public-site/public-runtime-render";
import { getPublicRouteDependencies } from "./public-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const publicRouteDependencies = getPublicRouteDependencies();
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");
  const debugParam = new URL(req.url).searchParams.get("__debug");
  const debugRequested = debugParam === "1" || debugParam === "content";
  const contentDebugRequested = debugParam === "content";
  let debugAllowed = false;
  if (contentDebugRequested) {
    console.info("[gnr8.content-runtime] CONTENT_DEBUG_REQUESTED", { path });
    debugAllowed = await publicRouteDependencies.canShowContentDebug(req);
    console.info(`[gnr8.content-runtime] ${debugAllowed ? "CONTENT_DEBUG_ACCESS_GRANTED" : "CONTENT_DEBUG_ACCESS_DENIED"}`, {
      path,
    });
  }
  const contentDebugMode = contentDebugRequested && debugAllowed;
  const debugMode = (debugParam === "1" && debugRequested) || contentDebugMode;
  const rawHost = resolveRequestHost(req.headers);
  const host = normalizePublicDomainHost(rawHost);
  return renderPublicPathResponse({ path, host, rawHost, debugMode, contentDebugMode });
}
