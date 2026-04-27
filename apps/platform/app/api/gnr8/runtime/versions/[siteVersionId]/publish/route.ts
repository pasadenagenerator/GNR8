import { NextResponse } from "next/server";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { publishApprovedSiteVersion } from "@/gnr8/runtime/publish-activation-orchestrator";
import {
  activateDomainHostBindingsForSiteVersion,
  countNonActiveDomainHostBindingsForSite,
  listDomainHostBindingsForSite,
  updateDomainHostBindingById,
} from "@/gnr8/runtime/runtime-store";
import { checkDomainStatus } from "@/src/lib/vercel/vercel-domain-client";

function logDomainEvent(event: string, details: Record<string, unknown>): void {
  console.info(`[gnr8.domain] ${event}`, details);
}

async function reconcileDomainVerificationOnPublish(input: { siteId: string; siteVersionId: string }): Promise<void> {
  const vercelConfigured =
    String(process.env.VERCEL_API_TOKEN ?? "").trim().length > 0 &&
    String(process.env.VERCEL_PROJECT_ID_PLATFORM ?? "").trim().length > 0;
  if (!vercelConfigured) return;

  const bindings = await listDomainHostBindingsForSite({
    siteId: input.siteId,
    statuses: ["pending", "verifying"],
  });
  for (const binding of bindings) {
    try {
      const vercelStatus = await checkDomainStatus(binding.domain);
      const nextStatus = vercelStatus.status;
      await updateDomainHostBindingById({
        bindingId: binding.id,
        siteVersionId: nextStatus === "active" ? input.siteVersionId : undefined,
        status: nextStatus,
        verificationType: vercelStatus.verification?.type ?? binding.verificationType,
        verificationValue: vercelStatus.verification?.value ?? binding.verificationValue,
        verificationHost: vercelStatus.verification?.host ?? binding.verificationHost,
        vercelDomainId: vercelStatus.domainId ?? binding.vercelDomainId,
        lastCheckedAt: vercelStatus.lastCheckedAt,
      });
      if (nextStatus === "active") {
        logDomainEvent("VERCEL_DOMAIN_VERIFIED", { domain: binding.domain, siteId: input.siteId, bindingId: binding.id });
      } else {
        logDomainEvent("VERCEL_DOMAIN_VERIFICATION_REQUIRED", {
          domain: binding.domain,
          siteId: input.siteId,
          bindingId: binding.id,
          verificationType: vercelStatus.verification?.type ?? null,
        });
      }
    } catch (error) {
      await updateDomainHostBindingById({
        bindingId: binding.id,
        status: binding.status === "pending" ? "pending" : "verifying",
        lastCheckedAt: new Date().toISOString(),
      });
      logDomainEvent("VERCEL_DOMAIN_FAILED", {
        domain: binding.domain,
        siteId: input.siteId,
        bindingId: binding.id,
        error: error instanceof Error ? error.message : "domain_status_check_failed",
      });
    }
  }
}

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
    await reconcileDomainVerificationOnPublish({
      siteId: result.siteId,
      siteVersionId: result.siteVersionId,
    });
    const activatedDomainBindings = await activateDomainHostBindingsForSiteVersion({
      siteId: result.siteId,
      siteVersionId: result.siteVersionId,
    });
    const nonActiveDomainBindings = await countNonActiveDomainHostBindingsForSite(result.siteId);

    return NextResponse.json({
      ok: true,
      actor_mode: actionContext.actorMode,
      activated_domain_bindings: activatedDomainBindings,
      domain_warning:
        nonActiveDomainBindings > 0
          ? `Publish completed. ${nonActiveDomainBindings} domain binding(s) still pending verification and will activate automatically after DNS verification.`
          : null,
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
