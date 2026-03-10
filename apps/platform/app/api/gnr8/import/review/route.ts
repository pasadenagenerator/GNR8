import { NextRequest, NextResponse } from "next/server";
import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

type ImportReviewBody = {
  slug: string;
  title?: string;
  html: string;
};

type ImportReviewResponse = {
  page: Gnr8Page;
  review: {
    totalSections: number;
    structuredSections: number;
    legacySections: number;
    sectionTypes: string[];
    countsByType: Record<string, number>;
  };
  sections: Array<{
    id: string;
    type: string;
    structured: boolean;
  }>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slug = String((body as ImportReviewBody).slug ?? "").trim();
    const html = String((body as ImportReviewBody).html ?? "");
    const titleRaw = (body as ImportReviewBody).title;
    const title = titleRaw == null ? undefined : String(titleRaw);

    if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    if (!html.trim()) return NextResponse.json({ error: "html is required" }, { status: 400 });

    const page = importHtmlToPage({ slug, title, html });
    const sections = (page.sections ?? []).map((s) => ({
      id: s.id,
      type: s.type,
      structured: s.type !== "legacy.html",
    }));

    const countsByType: Record<string, number> = {};
    const sectionTypes: string[] = [];
    const seenTypes = new Set<string>();
    for (const s of sections) {
      countsByType[s.type] = (countsByType[s.type] ?? 0) + 1;
      if (!seenTypes.has(s.type)) {
        seenTypes.add(s.type);
        sectionTypes.push(s.type);
      }
    }

    const totalSections = sections.length;
    const legacySections = sections.filter((s) => !s.structured).length;
    const structuredSections = totalSections - legacySections;

    const response: ImportReviewResponse = {
      page,
      review: {
        totalSections,
        structuredSections,
        legacySections,
        sectionTypes,
        countsByType,
      },
      sections,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
