import { NextResponse } from "next/server";

import { rollbackToSiteVersionArtifact } from "@/gnr8/runtime/rollback-switch";

export async function POST(_req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const result = await rollbackToSiteVersionArtifact({ siteVersionId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
