import { NextResponse } from "next/server";

import { publishApprovedSiteVersion } from "@/gnr8/runtime/publish-activation-orchestrator";

export async function POST(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { actor?: string };
    const actor = String(body.actor ?? "operator:publish").trim() || "operator:publish";

    const result = await publishApprovedSiteVersion({ siteVersionId, actor });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
