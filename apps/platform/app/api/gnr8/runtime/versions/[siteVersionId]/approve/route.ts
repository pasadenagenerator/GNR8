import { NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";

export async function POST(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const agencyId = await resolveAgencyIdForSiteVersion(siteVersionId);
    if (!agencyId) {
      return NextResponse.json({ error: "Unable to resolve agency scope for site version." }, { status: 403 });
    }
    const actionContext = await requireAgencyActionContext({
      action: "approve_migration",
      requestedAgencyId: agencyId,
    });
    const body = (await req.json().catch(() => ({}))) as { actor?: string };
    const actor = String(body.actor ?? "operator:approval").trim() || "operator:approval";

    const result = await transitionSiteVersionState({
      siteVersionId,
      nextState: "APPROVED",
      actor,
      source: "manual",
    });

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
