import { buildPreviewForensicsReportForRoute } from "@/gnr8/runtime/preview-forensics";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePathParams(url: URL): string[] {
  const paths = url.searchParams.getAll("path").map((value) => value.trim()).filter(Boolean);
  return paths.length > 0 ? paths : ["/"];
}

function parseCaptureFlag(url: URL): boolean {
  const value = String(url.searchParams.get("captureBrowserDom") ?? url.searchParams.get("capture") ?? "true").trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "off";
}

function parseWaitMs(url: URL): number {
  const value = Number(url.searchParams.get("waitMs") ?? 5_000);
  if (!Number.isFinite(value)) return 5_000;
  return Math.max(0, Math.min(30_000, Math.floor(value)));
}

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Forbidden")) return 403;
  if (message.startsWith("Unauthorized")) return 401;
  return 500;
}

export async function GET(req: Request) {
  try {
    await requireSuperadminUserId();
    const url = new URL(req.url);
    const siteVersionId = String(url.searchParams.get("siteVersionId") ?? "").trim();
    if (!siteVersionId) {
      return Response.json({ error: "siteVersionId is required" }, { status: 400 });
    }

    const reports = await Promise.all(
      normalizePathParams(url).map((routePath) =>
        buildPreviewForensicsReportForRoute({
          siteVersionId,
          routePath,
          origin: url.origin,
          cookieHeader: req.headers.get("cookie"),
          includeBrowserDom: parseCaptureFlag(url),
          waitMs: parseWaitMs(url),
        }),
      ),
    );

    return Response.json(
      {
        ok: true,
        siteVersionId,
        generatedAt: new Date().toISOString(),
        reports,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview forensics failed";
    return Response.json({ error: message }, { status: errorStatus(error) });
  }
}
