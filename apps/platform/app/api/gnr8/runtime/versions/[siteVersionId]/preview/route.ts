import { renderSiteVersionPreview } from "@/gnr8/runtime/unified-render-preview";
import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
    const agencyId = await resolveAgencyIdForSiteVersion(siteVersionId);
    if (!agencyId) {
      return new Response(JSON.stringify({ error: "Unable to resolve agency scope for site version." }), {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    await requireAgencyActionContext({
      action: "view_dashboard",
      requestedAgencyId: agencyId,
    });
    const path = new URL(req.url).searchParams.get("path") ?? "/";

    const preview = await renderSiteVersionPreview({
      siteVersionId,
      path,
    });

    return new Response(preview.html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    if (mapped.status >= 400 && mapped.status < 500) {
      return new Response(JSON.stringify({ error: mapped.message }), {
        status: mapped.status,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
