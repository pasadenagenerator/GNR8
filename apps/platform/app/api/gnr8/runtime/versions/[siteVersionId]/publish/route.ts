import { NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { publishApprovedSiteVersion } from "@/gnr8/runtime/publish-activation-orchestrator";

export async function POST(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
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
    const body = (await req.json().catch(() => ({}))) as { actor?: string; stage?: "shadow" | "canary" | "production" };
    const actor = String(body.actor ?? "operator:publish").trim() || "operator:publish";
    const stage = body.stage === "shadow" || body.stage === "canary" || body.stage === "production" ? body.stage : undefined;

    const result = await publishApprovedSiteVersion({ siteVersionId, actor, stage });

    return NextResponse.json({
      ok: true,
      actor_mode: actionContext.actorMode,
      ...result,
    });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    if (mapped.status >= 400 && mapped.status < 500) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
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
    if (message.startsWith("PUBLISH_")) {
      const [code, payloadRaw] = message.split(":", 2);
      const payload = payloadRaw ? (JSON.parse(payloadRaw) as { message?: string; details?: Record<string, unknown> }) : {};
      return NextResponse.json(
        {
          ok: false,
          error: code,
          message: payload.message ?? "Publish activation denied",
          details: payload.details ?? {},
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
