import type { NextRequest } from "next/server";

import { canShowContentDebug } from "@/src/public-site/content-debug-access";
import { normalizePublicDomainHost, renderPublicPathResponse, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicRouteDependencies = {
  canShowContentDebug: typeof canShowContentDebug;
};

const publicRouteDependencies: PublicRouteDependencies = {
  canShowContentDebug,
};

export function __setPublicRouteDependenciesForTest(overrides: Partial<PublicRouteDependencies>): () => void {
  const previous = { ...publicRouteDependencies };
  Object.assign(publicRouteDependencies, overrides);
  return () => {
    Object.assign(publicRouteDependencies, previous);
  };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
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
