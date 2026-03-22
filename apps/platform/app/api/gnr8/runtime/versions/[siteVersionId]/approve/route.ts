import { NextResponse } from "next/server";

import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";

export async function POST(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { actor?: string };
    const actor = String(body.actor ?? "operator:approval").trim() || "operator:approval";

    const result = await transitionSiteVersionState({
      siteVersionId,
      nextState: "APPROVED",
      actor,
      source: "manual",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
