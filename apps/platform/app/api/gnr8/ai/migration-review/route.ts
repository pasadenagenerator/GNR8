import { NextRequest, NextResponse } from "next/server";

import {
  buildMigrationReviewSummary,
  buildSuggestedActionsAndNotes,
} from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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

    const review = buildMigrationReviewSummary(page);
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
        layoutIssues?: {
          navbarNotFirst?: boolean;
          footerNotLast?: boolean;
          heroNotTop?: boolean;
          ctaMisplaced?: boolean;
          legacyMisplaced?: boolean;
        };
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
