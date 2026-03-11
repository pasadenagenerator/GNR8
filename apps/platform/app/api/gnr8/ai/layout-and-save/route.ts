import { NextRequest, NextResponse } from "next/server";

import {
  buildExactDuplicateCleanupNotes,
  cleanupExactDuplicateSections,
  runLayoutAgent,
  type LayoutAgentPlan,
} from "@/gnr8/ai/layout-agent";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

type LayoutAndSaveRequestBody = {
  prompt: string;
  slug?: string;
  title?: string;
  page?: Gnr8Page;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidPage(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.slug !== "string") return false;
  if (value.title != null && typeof value.title !== "string") return false;
  if (!Array.isArray(value.sections)) return false;
  for (const s of value.sections) {
    if (!isRecord(s)) return false;
    if (typeof s.id !== "string" || typeof s.type !== "string") return false;
    if (s.props != null && !isRecord(s.props)) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    if (!prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const slugRaw = typeof body.slug === "string" ? body.slug : undefined;
    const titleRaw = typeof body.title === "string" ? body.title : undefined;
    const slug = slugRaw?.trim() ? slugRaw : undefined;
    const title = titleRaw?.trim() ? titleRaw : undefined;

    const page = body.page == null ? undefined : body.page;
    if (page != null && !isValidPage(page)) {
      return NextResponse.json({ error: "page is invalid" }, { status: 400 });
    }

    const result = runLayoutAgent({ prompt, slug, title, page });

    const reviewBefore = buildMigrationReviewSummary(result.page);
    const exactNotes = buildExactDuplicateCleanupNotes(result.page, reviewBefore.duplicateDetails);
    const afterExact = cleanupExactDuplicateSections(result.page, reviewBefore.duplicateDetails);

    const reviewAfterExact = buildMigrationReviewSummary(afterExact);
    const mergeResult = mergeSupportedDuplicateSections(afterExact, reviewAfterExact.duplicateDetails);

    const normalized = normalizeSectionLayout(mergeResult.page);
    const finalPage = normalized.changed ? normalized.page : mergeResult.page;

    const cleanupNotes = [...exactNotes, ...mergeResult.notes, ...normalized.notes];
    const plan: LayoutAgentPlan = { ...result.plan, notes: [...(result.plan.notes ?? []), ...cleanupNotes] };

    await savePage(finalPage.slug, finalPage);
    await publishPage(finalPage.slug);

    const publishedPage = (await getPageBySlug(finalPage.slug)) ?? finalPage;

    const response: { success: true; page: Gnr8Page; plan: LayoutAgentPlan } = {
      success: true,
      page: publishedPage,
      plan,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
