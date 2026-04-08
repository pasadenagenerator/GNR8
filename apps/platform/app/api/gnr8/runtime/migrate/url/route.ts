import { NextResponse } from "next/server";
import fs from "node:fs";

import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { migrateImportedPageToCanonicalDraft } from "@/gnr8/runtime/migration-factory";
import { SCOPED_SITE_IMPORT_CANONICAL_PATH } from "@/gnr8/site/site-import-contract";
import { importPublicSinglePageUrlToSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";

export const runtime = "nodejs";

type Body = {
  url?: string;
  slug?: string;
  actor?: string;
  title?: string;
  agencyId?: string;
};

function parseHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const actionContext = await requireAgencyActionContext({
      action: "run_migration",
      requestedAgencyId: body.agencyId,
    });

    const url = parseHttpUrl(body.url);
    const slug = String(body.slug ?? "/").trim() || "/";
    const actor = String(body.actor ?? "system:migration").trim() || "system:migration";

    if (!url) return NextResponse.json({ error: "url must be valid http(s)" }, { status: 400 });

    const snapshot = await importPublicSinglePageUrlToSnapshot({
      sourceUrl: url.toString(),
      requestId: `runtime-migrate-url-${Date.now()}`,
    });
    if (snapshot.importDiagnostics.summary.fatalCount > 0) {
      return NextResponse.json(
        {
          error: "URL snapshot capture failed",
          diagnostics: snapshot.importDiagnostics,
        },
        { status: 502 },
      );
    }

    const html = fs.readFileSync(snapshot.entryHtmlPathAbs, "utf8");
    if (!html.trim()) return NextResponse.json({ error: "Upstream HTML empty" }, { status: 502 });

    const page = importHtmlToPage({ slug, title: body.title, html });
    const migrated = await migrateImportedPageToCanonicalDraft({
      sourceUrl: url.toString(),
      page,
      actor,
    });

    return NextResponse.json({
      ok: true,
      importPathClassification: "legacy_non_canonical",
      canonicalScopedImportPath: SCOPED_SITE_IMPORT_CANONICAL_PATH,
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      siteVersionNo: migrated.versionNo,
      actor_mode: actionContext.actorMode,
      lifecycleState: "DRAFT",
      next: {
        readyForReview: `/api/gnr8/runtime/versions/${migrated.siteVersionId}/ready`,
        preview: `/api/gnr8/runtime/versions/${migrated.siteVersionId}/preview`,
      },
    });
  } catch (error) {
    const mapped = parseAgencyActionContextError(error);
    if (mapped.status >= 400 && mapped.status < 500) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
