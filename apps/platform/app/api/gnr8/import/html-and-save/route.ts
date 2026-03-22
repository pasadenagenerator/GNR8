import { NextResponse } from "next/server";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { migrateImportedPageToCanonicalDraft } from "@/gnr8/runtime/migration-factory";

export const runtime = "nodejs";

type ImportHtmlAndSaveBody = {
  slug: string;
  title?: string;
  html: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = String((body as ImportHtmlAndSaveBody).slug ?? "").trim();
    const html = String((body as ImportHtmlAndSaveBody).html ?? "");
    const titleRaw = (body as ImportHtmlAndSaveBody).title;
    const title = titleRaw == null ? undefined : String(titleRaw);

    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    if (!html.trim()) return NextResponse.json({ error: "html is required" }, { status: 400 });

    const page = importHtmlToPage({ slug, title, html });
    const migrated = await migrateImportedPageToCanonicalDraft({
      sourceUrl: "inline-html://manual-import",
      page,
      actor: "migration:html-import",
    });

    return NextResponse.json(
      {
        success: true,
        siteId: migrated.siteId,
        siteVersionId: migrated.siteVersionId,
        siteVersionNo: migrated.versionNo,
        lifecycleState: "DRAFT",
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
