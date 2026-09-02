import { GET as runtimePreviewGET } from "@/app/api/gnr8/runtime/versions/[siteVersionId]/preview/route";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function isConnectionSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("EMAXCONNSESSION");
}

function connectionSessionRetryResponse() {
  return new Response(
    `<!doctype html>
<html>
  <body style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fffbeb;color:#92400e;">
    <main style="min-height:100vh;display:grid;place-content:center;padding:24px;text-align:center;">
      <section style="max-width:440px;border:1px solid #fbbf24;border-radius:8px;background:#fff7ed;padding:16px;">
        <h1 style="margin:0 0 8px;font-size:16px;line-height:1.25;color:#78350f;">Preview temporarily unavailable</h1>
        <p style="margin:0;font-size:13px;line-height:1.5;">The internal preview could not get a database session. Refresh Airship and try again; local draft editing is still available.</p>
      </section>
    </main>
  </body>
</html>`,
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    await requireSuperadminUserId();
    return runtimePreviewGET(req, ctx);
  } catch (error) {
    if (isConnectionSessionError(error)) {
      return connectionSessionRetryResponse();
    }
    const message = error instanceof Error ? error.message : "Internal preview failed";
    return Response.json({ error: message }, { status: errorStatus(error), headers: { "cache-control": "no-store" } });
  }
}
