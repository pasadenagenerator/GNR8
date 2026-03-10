import { NextRequest, NextResponse } from "next/server";
import { importHtmlToPage } from "@/gnr8/importer/html-to-page";

export const runtime = "nodejs";

type ImportHtmlBody = {
  slug: string;
  title?: string;
  html: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = String((body as ImportHtmlBody).slug ?? "").trim();
    const html = String((body as ImportHtmlBody).html ?? "");
    const titleRaw = (body as ImportHtmlBody).title;
    const title = titleRaw == null ? undefined : String(titleRaw);

    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    if (!html.trim()) return NextResponse.json({ error: "html is required" }, { status: 400 });

    const page = importHtmlToPage({ slug, title, html });
    return NextResponse.json(page, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

