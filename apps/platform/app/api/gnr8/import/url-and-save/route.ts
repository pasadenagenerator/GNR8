import { NextResponse } from "next/server";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { migrateImportedPageToCanonicalDraft } from "@/gnr8/runtime/migration-factory";
import { SCOPED_SITE_IMPORT_CANONICAL_PATH } from "@/gnr8/site/site-import-contract";

export const runtime = "nodejs";

type ImportUrlAndSaveBody = {
  url: string;
  slug: string;
  title?: string;
};

function parseHttpUrl(input: unknown): URL | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function isValidSlug(input: unknown): input is string {
  if (typeof input !== "string") return false;
  const slug = input.trim();
  if (!slug) return false;
  if (slug.length > 200) return false;
  if (/\s/.test(slug)) return false;
  return true;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const url = parseHttpUrl((body as ImportUrlAndSaveBody).url);
    const slugRaw = (body as ImportUrlAndSaveBody).slug;
    const titleRaw = (body as ImportUrlAndSaveBody).title;
    const title = titleRaw == null ? undefined : String(titleRaw);

    if (!url) {
      return NextResponse.json({ error: "url must be a valid http(s) URL" }, { status: 400 });
    }

    if (!isValidSlug(slugRaw)) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const slug = slugRaw.trim();

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store",
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch source URL";
      return NextResponse.json({ error: message, sourceUrl: url.toString() }, { status: 502 });
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Upstream fetch failed: ${res.status} ${res.statusText}`.trim(),
          sourceUrl: url.toString(),
        },
        { status: 502 },
      );
    }

    const html = await res.text();
    if (!html.trim()) {
      return NextResponse.json(
        { error: "Upstream response body is empty", sourceUrl: url.toString() },
        { status: 502 },
      );
    }

    const page = importHtmlToPage({ slug, title, html });
    const migrated = await migrateImportedPageToCanonicalDraft({
      sourceUrl: url.toString(),
      page,
      actor: "migration:url-import",
    });

    return NextResponse.json(
      {
        success: true,
        importPathClassification: "legacy_non_canonical",
        canonicalScopedImportPath: SCOPED_SITE_IMPORT_CANONICAL_PATH,
        sourceUrl: url.toString(),
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
