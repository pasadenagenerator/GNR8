import { NextResponse } from "next/server";

import { publishApprovedSiteVersion } from "@/gnr8/runtime/publish-activation-orchestrator";

export async function POST(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { actor?: string; stage?: "shadow" | "canary" | "production" };
    const actor = String(body.actor ?? "operator:publish").trim() || "operator:publish";
    const stage = body.stage === "shadow" || body.stage === "canary" || body.stage === "production" ? body.stage : undefined;

    const result = await publishApprovedSiteVersion({ siteVersionId, actor, stage });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.startsWith("publish_enforcement_denied:")) {
      const payload = message.slice("publish_enforcement_denied:".length);
      return NextResponse.json({ ok: false, error: "publish_enforcement_denied", enforcement: JSON.parse(payload) }, { status: 409 });
    }
    if (message.startsWith("publish_enforcement_review_only_shadow_required:")) {
      const payload = message.slice("publish_enforcement_review_only_shadow_required:".length);
      return NextResponse.json(
        { ok: false, error: "publish_enforcement_review_only_shadow_required", enforcement: JSON.parse(payload) },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
