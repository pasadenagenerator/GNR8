import { NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { rollbackToSiteVersionArtifact } from "@/gnr8/runtime/rollback-switch";

export async function POST(_req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const agencyId = await resolveAgencyIdForSiteVersion(siteVersionId);
    if (!agencyId) {
      return NextResponse.json({ error: "Unable to resolve agency scope for site version." }, { status: 403 });
    }
    const actionContext = await requireAgencyActionContext({
      action: "publish",
      requestedAgencyId: agencyId,
    });
    const result = await rollbackToSiteVersionArtifact({ siteVersionId });
    return NextResponse.json({ ok: true, actor_mode: actionContext.actorMode, ...result });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    if (mapped.status >= 400 && mapped.status < 500) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
