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

export async function GET(req: Request, ctx: { params: Promise<{ siteVersionId: string }> }) {
  try {
    await requireSuperadminUserId();
    return runtimePreviewGET(req, ctx);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal preview failed";
    return Response.json({ error: message }, { status: errorStatus(error), headers: { "cache-control": "no-store" } });
  }
}
