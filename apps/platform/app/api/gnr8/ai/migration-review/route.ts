import { NextRequest, NextResponse } from "next/server";

import { getPageBySlug } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function buildReview(page: Gnr8Page) {
  const sections = Array.isArray(page.sections) ? page.sections : [];

  const countsByType: Record<string, number> = {};
  const sectionTypes: string[] = [];
  const seenTypes = new Set<string>();

  let legacySections = 0;
  let structuredSections = 0;

  for (const section of sections) {
    const type = typeof section?.type === "string" ? section.type : "unknown";

    countsByType[type] = (countsByType[type] ?? 0) + 1;
    if (!seenTypes.has(type)) {
      seenTypes.add(type);
      sectionTypes.push(type);
    }

    if (type === "legacy.html") legacySections += 1;
    else structuredSections += 1;
  }

  return {
    totalSections: sections.length,
    structuredSections,
    legacySections,
    sectionTypes,
    countsByType,
  };
}

function buildSuggestedActionsAndNotes(review: {
  structuredSections: number;
  legacySections: number;
  countsByType: Record<string, number>;
}) {
  const suggestedActions: string[] = [];
  const notes: string[] = [];

  const hasType = (type: string) => (review.countsByType[type] ?? 0) > 0;
  const addAction = (action: string) => {
    if (!suggestedActions.includes(action)) suggestedActions.push(action);
  };
  const addNote = (note: string) => {
    if (!notes.includes(note)) notes.push(note);
  };

  if (review.legacySections >= 1) {
    addAction("Replace legacy section with CTA");
    addAction("Replace legacy section with FAQ");
  }

  if (review.legacySections >= 1 && !hasType("pricing.basic")) {
    addAction("Replace legacy section with pricing");
  }

  if (!hasType("hero.split")) {
    addAction("Add hero at the top");
  }

  if (hasType("hero.split") && !hasType("cta.simple")) {
    addAction("Add CTA below the hero");
  }

  if (!hasType("faq.basic")) {
    addAction("Add FAQ below the hero");
  }

  if (!hasType("footer.basic")) {
    addAction("Add footer at the bottom");
  }

  if (review.legacySections === 0 && review.structuredSections >= 4) {
    addNote("Page is already mostly structured.");
  }

  if (review.legacySections > review.structuredSections) {
    addNote("Page still relies heavily on legacy HTML.");
  }

  return { suggestedActions, notes };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slugRaw = typeof body.slug === "string" ? body.slug : "";
    const slug = slugRaw.trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const page = await getPageBySlug(slug);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const review = buildReview(page);
    const { suggestedActions, notes } = buildSuggestedActionsAndNotes(review);

    const response: {
      success: true;
      page: Gnr8Page;
      review: {
        totalSections: number;
        structuredSections: number;
        legacySections: number;
        sectionTypes: string[];
        countsByType: Record<string, number>;
      };
      suggestedActions: string[];
      notes: string[];
    } = {
      success: true,
      page,
      review,
      suggestedActions,
      notes,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
