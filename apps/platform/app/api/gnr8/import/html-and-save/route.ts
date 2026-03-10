import { NextResponse } from "next/server";

import { savePage, publishPage, getPageBySlug } from "@/gnr8/core/page-storage";
import { importHtmlToPage } from "@/gnr8/importer/html-to-page";

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
    await savePage(slug, page);
    await publishPage(slug);

    const publishedPage = (await getPageBySlug(slug)) ?? page;

    return NextResponse.json({ success: true, page: publishedPage }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

