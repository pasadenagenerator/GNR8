import { NextRequest, NextResponse } from "next/server";

import { buildExactDuplicateCleanupNotes, cleanupExactDuplicateSections, runLayoutAgent } from "@/gnr8/ai/layout-agent";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { buildOptimizationActionPlans } from "@/gnr8/ai/optimization-action-engine";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import { buildMigrationReviewSummary, type MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

function getSectionSignature(page: Gnr8Page): string {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.map((s) => (typeof s?.type === "string" ? s.type : "unknown")).join("|");
}

function moveSectionsByType(
  sections: NonNullable<Gnr8Page["sections"]>,
  type: string,
  targetIndex: number,
): NonNullable<Gnr8Page["sections"]> {
  const extracted: NonNullable<Gnr8Page["sections"]> = [];
  const kept: NonNullable<Gnr8Page["sections"]> = [];
  for (const s of sections) {
    if (s?.type === type) extracted.push(s);
    else kept.push(s);
  }
  if (extracted.length === 0) return sections;
  const clampedIndex = Math.max(0, Math.min(kept.length, targetIndex));
  return [...kept.slice(0, clampedIndex), ...extracted, ...kept.slice(clampedIndex)];
}

function applyMoveSuggestion(page: Gnr8Page, suggestion: string): { recognized: boolean; page: Gnr8Page; notes: string[] } {
  const text = suggestion.trim();
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const notes: string[] = [];

  switch (text) {
    case "Move footer to the bottom": {
      const withoutFooter = sections.filter((s) => s?.type !== "footer.basic");
      const footers = sections.filter((s) => s?.type === "footer.basic");
      const nextSections = footers.length > 0 ? [...withoutFooter, ...footers] : sections;
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved footer to bottom.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move navbar to the top": {
      const navbars = sections.filter((s) => s?.type === "navbar.basic");
      const without = sections.filter((s) => s?.type !== "navbar.basic");
      const nextSections = navbars.length > 0 ? [...navbars, ...without] : sections;
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved navbar to top.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move hero near the top": {
      const navbarCount = sections.filter((s) => s?.type === "navbar.basic").length;
      const nextSections = moveSectionsByType(sections, "hero.split", navbarCount);
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved hero near top.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move CTA below FAQ": {
      const kept = sections.filter((s) => s?.type !== "cta.simple");
      const ctas = sections.filter((s) => s?.type === "cta.simple");
      if (ctas.length === 0) return { recognized: true, page, notes: ["No CTA section found; move skipped."] };
      const lastFaqIdx = (() => {
        for (let i = kept.length - 1; i >= 0; i -= 1) if (kept[i]?.type === "faq.basic") return i;
        return -1;
      })();
      if (lastFaqIdx === -1) return { recognized: true, page, notes: ["No FAQ section found; CTA move skipped."] };
      const nextSections = [...kept.slice(0, lastFaqIdx + 1), ...ctas, ...kept.slice(lastFaqIdx + 1)];
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved CTA below FAQ.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move CTA below pricing": {
      const kept = sections.filter((s) => s?.type !== "cta.simple");
      const ctas = sections.filter((s) => s?.type === "cta.simple");
      if (ctas.length === 0) return { recognized: true, page, notes: ["No CTA section found; move skipped."] };
      const lastPricingIdx = (() => {
        for (let i = kept.length - 1; i >= 0; i -= 1) if (kept[i]?.type === "pricing.basic") return i;
        return -1;
      })();
      if (lastPricingIdx === -1) return { recognized: true, page, notes: ["No pricing section found; CTA move skipped."] };
      const nextSections = [...kept.slice(0, lastPricingIdx + 1), ...ctas, ...kept.slice(lastPricingIdx + 1)];
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved CTA below pricing.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move CTA near the bottom": {
      const kept = sections.filter((s) => s?.type !== "cta.simple");
      const ctas = sections.filter((s) => s?.type === "cta.simple");
      if (ctas.length === 0) return { recognized: true, page, notes: ["No CTA section found; move skipped."] };
      const firstFooterIdx = kept.findIndex((s) => s?.type === "footer.basic");
      const insertAt = firstFooterIdx === -1 ? kept.length : firstFooterIdx;
      const nextSections = [...kept.slice(0, insertAt), ...ctas, ...kept.slice(insertAt)];
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved CTA near bottom.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move legacy HTML blocks below structured sections": {
      const legacy = sections.filter((s) => s?.type === "legacy.html");
      if (legacy.length === 0) return { recognized: true, page, notes: ["No legacy.html blocks found; move skipped."] };
      const kept = sections.filter((s) => s?.type !== "legacy.html");
      const firstFooterIdx = kept.findIndex((s) => s?.type === "footer.basic");
      const insertAt = firstFooterIdx === -1 ? kept.length : firstFooterIdx;
      const nextSections = [...kept.slice(0, insertAt), ...legacy, ...kept.slice(insertAt)];
      if (getSectionSignature({ ...page, sections: nextSections }) !== getSectionSignature(page)) {
        notes.push("Moved legacy blocks below structured sections.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    default:
      return { recognized: false, page, notes: [] };
  }
}

async function reloadPublishedPageOrThrow(slug: string): Promise<Gnr8Page> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reloaded = await getPageBySlug(slug);
    if (reloaded) return reloaded;
  }
  throw new Error("Failed to reload published page");
}

function applySafeCleanupSmartMergeNormalizePipeline(
  page: Gnr8Page,
  reviewBefore: MigrationReviewSummary,
): { page: Gnr8Page; notes: string[] } {
  const exactNotes = buildExactDuplicateCleanupNotes(page, reviewBefore.duplicateDetails);
  const afterExact = cleanupExactDuplicateSections(page, reviewBefore.duplicateDetails);

  const reviewAfterExact = buildMigrationReviewSummary(afterExact);
  const mergeResult = mergeSupportedDuplicateSections(afterExact, reviewAfterExact.duplicateDetails);

  const normalized = normalizeSectionLayout(mergeResult.page);

  return {
    page: normalized.page,
    notes: [...exactNotes, ...mergeResult.notes, ...normalized.notes],
  };
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

    const apply = parseBoolean(body.apply);
    const safeAutoFix = parseBoolean(body.safeAutoFix);

    const page = await reloadPublishedPageOrThrow(slug).catch(() => null);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const review = buildMigrationReviewSummary(page);
    const actionPlans = buildOptimizationActionPlans(review);

    if (!apply) {
      return NextResponse.json(
        {
          success: true,
          page,
          review,
          actionPlans,
        },
        { status: 200 },
      );
    }

    const appliedActions: string[] = [];
    const skippedActions: string[] = [];
    const notes: string[] = [];

    const plansToApply = safeAutoFix ? actionPlans.filter((p) => p.safe) : actionPlans.slice(0, 1);

    const reviewBefore: MigrationReviewSummary = review;

    const cleanup = applySafeCleanupSmartMergeNormalizePipeline(page, reviewBefore);
    let workingPage: Gnr8Page = cleanup.page;
    notes.push(...cleanup.notes);

    for (const plan of plansToApply) {
      const beforeSig = getSectionSignature(workingPage);

      const moveAttempt = applyMoveSuggestion(workingPage, plan.suggestion);
      if (moveAttempt.recognized) {
        workingPage = moveAttempt.page;
        notes.push(...moveAttempt.notes);
      } else {
        const result = runLayoutAgent({ prompt: plan.actionPrompt, page: workingPage });
        workingPage = result.page;
        notes.push(...(result.plan.notes ?? []));
      }

      const afterSig = getSectionSignature(workingPage);
      if (afterSig === beforeSig) {
        skippedActions.push(plan.suggestion);
      } else {
        appliedActions.push(plan.suggestion);
      }
    }

    await savePage(workingPage.slug, workingPage);
    await publishPage(workingPage.slug);

    const publishedPage = await reloadPublishedPageOrThrow(workingPage.slug);
    const reviewAfter = buildMigrationReviewSummary(publishedPage);

    return NextResponse.json(
      {
        success: true,
        appliedActions,
        skippedActions,
        page: publishedPage,
        reviewBefore,
        reviewAfter,
        notes: [
          `Applied ${appliedActions.length} optimization action${appliedActions.length === 1 ? "" : "s"}.`,
          ...notes,
        ],
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
