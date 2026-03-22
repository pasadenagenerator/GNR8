import { renderSiteVersionPreview } from "@/gnr8/runtime/unified-render-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    const { siteVersionId } = await ctx.params;
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
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
