import { NextRequest, NextResponse } from "next/server";

import { runLayoutAgent, type LayoutAgentPlan } from "@/gnr8/ai/layout-agent";
import {
  buildMigrationReviewSummary,
  buildSuggestedActionsAndNotes,
} from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
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
    const { suggestedActions, notes: reviewNotes } = buildSuggestedActionsAndNotes(review);

    const chosenAction = suggestedActions[0] ?? null;
    if (!chosenAction) {
      const response: {
        success: true;
        chosenAction: null;
        page: Gnr8Page;
        review: typeof review;
        plan: null;
        notes: string[];
      } = {
        success: true,
        chosenAction: null,
        page,
        review,
        plan: null,
        notes: [...reviewNotes, "No autofix action available."],
      };

      return NextResponse.json(response, { status: 200 });
    }

    const result = runLayoutAgent({
      prompt: chosenAction,
      page,
    });

    await savePage(result.page.slug, result.page);
    await publishPage(result.page.slug);

    const publishedPage = (await getPageBySlug(result.page.slug)) ?? result.page;

    const response: {
      success: true;
      chosenAction: string;
      page: Gnr8Page;
      review: typeof review;
      plan: (LayoutAgentPlan & { mode: "update" }) | null;
      notes: string[];
    } = {
      success: true,
      chosenAction,
      page: publishedPage,
      review,
      plan: { ...result.plan, mode: "update" },
      notes: [`Applied autofix action: ${chosenAction}.`, ...reviewNotes],
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

