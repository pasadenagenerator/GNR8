import { NextResponse } from "next/server";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { migrateImportedPageToCanonicalDraft } from "@/gnr8/runtime/migration-factory";

export const runtime = "nodejs";

type Body = {
  url?: string;
  slug?: string;
  actor?: string;
  title?: string;
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

    const url = parseHttpUrl(body.url);
    const slug = String(body.slug ?? "/").trim() || "/";
    const actor = String(body.actor ?? "system:migration").trim() || "system:migration";

    if (!url) return NextResponse.json({ error: "url must be valid http(s)" }, { status: 400 });

    const upstream = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream fetch failed (${upstream.status})` }, { status: 502 });
    }

    const html = await upstream.text();
    if (!html.trim()) return NextResponse.json({ error: "Upstream HTML empty" }, { status: 502 });

    const page = importHtmlToPage({ slug, title: body.title, html });
    const migrated = await migrateImportedPageToCanonicalDraft({
      sourceUrl: url.toString(),
      page,
      actor,
    });

    return NextResponse.json({
      ok: true,
      siteId: migrated.siteId,
      siteVersionId: migrated.siteVersionId,
      siteVersionNo: migrated.versionNo,
      lifecycleState: "DRAFT",
      next: {
        readyForReview: `/api/gnr8/runtime/versions/${migrated.siteVersionId}/ready`,
        preview: `/api/gnr8/runtime/versions/${migrated.siteVersionId}/preview`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
