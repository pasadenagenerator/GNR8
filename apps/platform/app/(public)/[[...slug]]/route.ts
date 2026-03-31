import type { NextRequest } from "next/server";

import { renderPublicPathResponse, resolveRequestHost } from "@/src/public-site/public-runtime-render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const { slug } = await props.params;
  const path = "/" + (slug?.join("/") ?? "");
  const host = resolveRequestHost(req.headers);
  return renderPublicPathResponse({ path, host });
}
