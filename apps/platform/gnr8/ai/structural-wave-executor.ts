import type { StrategicExecutionOrchestrationWave } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan, type StrategicSemanticPlanStep } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { buildMigrationReviewSummary, type MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { cleanupExactDuplicateSections } from "@/gnr8/ai/layout-agent";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { getPageTransformationSignature } from "@/gnr8/ai/content-layout-transformer";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export type StructuralWaveExecutionMode = "preview" | "applied";
export type StructuralActionClassV1 = "cleanup" | "merge" | "normalize";

export type StructuralWaveDiffSummary = {
  changed: boolean;
  summary: string;
  changes: string[];
  metrics: {
    sectionsBefore: number;
    sectionsAfter: number;
    structuredBefore: number;
    structuredAfter: number;
    legacyBefore: number;
    legacyAfter: number;
    confidenceBefore: number;
    confidenceAfter: number;
  };
};

export type StrategicStructuralWaveExecutionResult = {
  waveId: string;
  mode: StructuralWaveExecutionMode;

  executable: boolean;
  executionScope: "structural-only";

  targetedPages: string[];
  executablePages: string[];
  blockedPages: string[];
  skippedPages: string[];

  appliedPageResults: Array<{
    slug: string;
    appliedStructuralActions: string[];
    skippedStructuralActions: string[];
    diffSummary: StructuralWaveDiffSummary;
  }>;

  blockedReasons: string[];
  summary: string;
  notes: string[];
};

type StrategicStructuralWaveExecuteInput = {
  pages: Array<
    | { slug: string }
    | {
        slug: string;
        page: Gnr8Page;
      }
  >;
  waveId: string;
  apply?: boolean;
};

const ACTION_ORDER: StructuralActionClassV1[] = ["cleanup", "merge", "normalize"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function uniqStable(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const value = typeof v === "string" ? v.trim() : "";
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function bySlug(a: string, b: string): number {
  return a.localeCompare(b);
}

function isGnr8Page(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections)) return false;
  if (typeof value.title !== "undefined" && typeof value.title !== "string") return false;
  return true;
}

function normalizePurpose(purpose: string): string {
  return String(purpose ?? "")
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toSafeInt(value: unknown): number {
  const n = typeof value === "number" ? value : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function computeDiffSummary(input: {
  pageBefore: Gnr8Page | null;
  pageAfter: Gnr8Page | null;
  reviewBefore: MigrationReviewSummary | null;
  reviewAfter: MigrationReviewSummary | null;
  appliedStructuralActions: StructuralActionClassV1[];
  skippedStructuralActions: StructuralActionClassV1[];
  mode: StructuralWaveExecutionMode;
  reasonIfNotApplied?: string;
}): StructuralWaveDiffSummary {
  const pageBefore = input.pageBefore;
  const pageAfter = input.pageAfter;

  const sectionsBefore = pageBefore?.sections?.length ?? 0;
  const sectionsAfter = pageAfter?.sections?.length ?? sectionsBefore;

  const structuredBefore = toSafeInt(input.reviewBefore?.structuredSections);
  const structuredAfter = toSafeInt(input.reviewAfter?.structuredSections);

  const legacyBefore = toSafeInt(input.reviewBefore?.legacySections);
  const legacyAfter = toSafeInt(input.reviewAfter?.legacySections);

  const confidenceBefore = toSafeInt(input.reviewBefore?.confidenceScore);
  const confidenceAfter = toSafeInt(input.reviewAfter?.confidenceScore);

  const signatureBefore = pageBefore ? getPageTransformationSignature(pageBefore) : "";
  const signatureAfter = pageAfter ? getPageTransformationSignature(pageAfter) : signatureBefore;

  const changed = !!pageBefore && !!pageAfter && signatureBefore !== signatureAfter;
  const changes: string[] = [];

  if (changed) {
    const applied = input.appliedStructuralActions;
    if (applied.includes("cleanup")) changes.push("Removed exact duplicate sections.");
    if (applied.includes("merge")) changes.push("Merged supported duplicate sections.");
    if (applied.includes("normalize")) changes.push("Normalized section layout.");

    if (sectionsAfter < sectionsBefore) changes.push(`Section count decreased from ${sectionsBefore} to ${sectionsAfter}.`);
    else if (sectionsAfter > sectionsBefore) changes.push(`Section count increased from ${sectionsBefore} to ${sectionsAfter}.`);

    if (structuredAfter > structuredBefore) changes.push(`Structured sections increased from ${structuredBefore} to ${structuredAfter}.`);
    else if (structuredAfter < structuredBefore) changes.push(`Structured sections decreased from ${structuredBefore} to ${structuredAfter}.`);

    if (legacyAfter < legacyBefore) changes.push(`Legacy sections reduced from ${legacyBefore} to ${legacyAfter}.`);
    else if (legacyAfter > legacyBefore) changes.push(`Legacy sections increased from ${legacyBefore} to ${legacyAfter}.`);

    if (confidenceAfter > confidenceBefore) changes.push(`Confidence score improved from ${confidenceBefore} to ${confidenceAfter}.`);
    else if (confidenceAfter < confidenceBefore) changes.push(`Confidence score dropped from ${confidenceBefore} to ${confidenceAfter}.`);
  }

  const hasMeasurableImprovement =
    confidenceAfter > confidenceBefore || legacyAfter < legacyBefore || structuredAfter > structuredBefore;
  const hasMeasurableRegression =
    confidenceAfter < confidenceBefore || legacyAfter > legacyBefore || structuredAfter < structuredBefore;

  const summary = (() => {
    if (input.mode === "preview") return "Preview only; no structural diffs were applied.";
    if (!pageBefore || !pageAfter) return input.reasonIfNotApplied ?? "Not applied.";
    if (!changed) {
      if (input.appliedStructuralActions.length > 0) return "Structural actions resulted in no page changes.";
      if (input.skippedStructuralActions.length > 0) return "No eligible structural actions changed the page.";
      return "No structural page changes were applied.";
    }
    if (hasMeasurableImprovement && !hasMeasurableRegression) return "Structural actions applied successfully with measurable improvement.";
    return "Structural actions applied successfully.";
  })();

  return {
    changed,
    summary,
    changes,
    metrics: {
      sectionsBefore,
      sectionsAfter,
      structuredBefore,
      structuredAfter,
      legacyBefore,
      legacyAfter,
      confidenceBefore,
      confidenceAfter,
    },
  };
}

function hasUnsupportedStructuralSuggestions(review: MigrationReviewSummary): boolean {
  const actions = Array.isArray(review.suggestedActions) ? review.suggestedActions : [];
  for (const a of actions) {
    const action = String(a ?? "").trim();
    if (!action) continue;
    if (/^Add /i.test(action)) return true;
    if (/^Replace /i.test(action)) return true;
    if (/^(Reconstruct|Convert|Consolidate|Reduce|Introduce|Improve page structure|Improve product discovery|Redefine|Optimize hierarchy)/i.test(action)) {
      return true;
    }
  }
  return false;
}

function isPageTooUnstableForStructuralV1(input: { review: MigrationReviewSummary }): boolean {
  const legacy = input.review.legacySections ?? 0;
  const structured = input.review.structuredSections ?? 0;
  const legacyHeavy = legacy > structured;
  const lowConfidence = (input.review.confidenceLabel ?? "low") === "low";
  return lowConfidence && legacyHeavy && hasUnsupportedStructuralSuggestions(input.review);
}

function simulateStructuralActionsV1(input: { page: Gnr8Page }): {
  pageBefore: Gnr8Page;
  pageAfter: Gnr8Page;
  applicableActions: StructuralActionClassV1[];
  skippedActions: StructuralActionClassV1[];
  reviewBefore: MigrationReviewSummary;
  reviewAfter: MigrationReviewSummary;
} {
  const pageBefore = input.page;
  const reviewBefore = buildMigrationReviewSummary(pageBefore);

  const applicable: StructuralActionClassV1[] = [];
  const skipped: StructuralActionClassV1[] = [];

  let working: Gnr8Page = pageBefore;
  let sig = getPageTransformationSignature(working);

  // cleanup
  {
    const review = buildMigrationReviewSummary(working);
    const after = cleanupExactDuplicateSections(working, review.duplicateDetails);
    const sigAfter = getPageTransformationSignature(after);
    if (sigAfter !== sig) {
      applicable.push("cleanup");
      working = after;
      sig = sigAfter;
    } else {
      skipped.push("cleanup");
    }
  }

  // merge
  {
    const review = buildMigrationReviewSummary(working);
    const merged = mergeSupportedDuplicateSections(working, review.duplicateDetails);
    const sigAfter = getPageTransformationSignature(merged.page);
    if (sigAfter !== sig) {
      applicable.push("merge");
      working = merged.page;
      sig = sigAfter;
    } else {
      skipped.push("merge");
    }
  }

  // normalize
  {
    const normalized = normalizeSectionLayout(working);
    const sigAfter = getPageTransformationSignature(normalized.page);
    if (normalized.changed || sigAfter !== sig) {
      applicable.push("normalize");
      working = normalized.page;
      sig = sigAfter;
    } else {
      skipped.push("normalize");
    }
  }

  const reviewAfter = buildMigrationReviewSummary(working);

  return {
    pageBefore,
    pageAfter: working,
    applicableActions: applicable,
    skippedActions: skipped,
    reviewBefore,
    reviewAfter,
  };
}

async function reloadPublishedPageOrNull(slug: string): Promise<Gnr8Page | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loaded = await getPageBySlug(slug).catch(() => null);
    if (loaded) return loaded;
  }
  return null;
}

function buildWaveEligibility(input: {
  wave: StrategicExecutionOrchestrationWave | null;
  waveSteps: StrategicSemanticPlanStep[];
}): { executable: true } | { executable: false; blockedReasons: string[] } {
  const blockedReasons: string[] = [];

  if (!input.wave) {
    blockedReasons.push("Wave not found.");
    return { executable: false, blockedReasons };
  }

  if (input.wave.readiness !== "ready") {
    blockedReasons.push("Wave is not execution-ready.");
  }

  const purpose = normalizePurpose(input.wave.purpose);
  const purposeOk = purpose === "stabilization" || purpose === "consistency normalization";
  if (!purposeOk) {
    blockedReasons.push("Only stabilization or consistency normalization waves are executable in structural v1.");
  }

  const steps = Array.isArray(input.waveSteps) ? input.waveSteps : [];
  if (steps.length === 0) blockedReasons.push("Wave has no executable steps.");

  const hasSemantic = steps.some((s) => s.type === "page-semantic-improvement");
  if (hasSemantic) blockedReasons.push("Page-semantic-improvement steps are not executable in structural v1.");

  const hasAutomation = steps.some((s) => s.type === "automation-readiness");
  if (hasAutomation) blockedReasons.push("Automation-readiness steps are not executable in structural v1.");

  const deduped = uniqStable(blockedReasons).slice(0, 8);
  if (deduped.length > 0) return { executable: false, blockedReasons: deduped };

  return { executable: true };
}

function buildSummary(input: {
  mode: StructuralWaveExecutionMode;
  executable: boolean;
  appliedPagesCount: number;
  blockedPagesCount: number;
}): string {
  if (!input.executable) return "Strategic wave is not executable in structural v1.";
  if (input.mode === "preview") return "Strategic wave is ready for structural-only preview.";

  if (input.appliedPagesCount <= 0) {
    return "Strategic wave could not be executed because no eligible structural targets remained.";
  }

  if (input.blockedPagesCount > 0) {
    return "Strategic wave executed structural improvements on eligible pages (partial execution).";
  }
  return "Strategic wave executed structural improvements on eligible pages.";
}

function buildNotes(input: {
  mode: StructuralWaveExecutionMode;
  unresolvedCount: number;
  blockedPagesCount: number;
  skippedPagesCount: number;
  purpose: string;
}): string[] {
  const notes: string[] = [];
  notes.push("Strategic wave execution only; semantic changes are not applied in structural v1.");

  if (input.mode === "preview") notes.push("Preview only; no pages were mutated.");
  if (normalizePurpose(input.purpose) === "stabilization") {
    notes.push("Structural v1 does not remediate site coverage gaps (add/replace actions are not executed).");
  }

  if (input.unresolvedCount > 0) notes.push(`Unresolved pages: ${input.unresolvedCount}.`);
  if (input.blockedPagesCount > 0) notes.push(`Blocked pages: ${input.blockedPagesCount}.`);
  if (input.skippedPagesCount > 0) notes.push(`Skipped pages: ${input.skippedPagesCount}.`);

  return notes.slice(0, 6);
}

export async function executeStrategicStructuralWaveExecutionV1(
  raw: StrategicStructuralWaveExecuteInput,
): Promise<{ strategicStructuralWaveExecution: StrategicStructuralWaveExecutionResult }> {
  const waveId = String(raw?.waveId ?? "").trim();
  const apply = raw?.apply === true;

  const pagesRaw = Array.isArray(raw?.pages) ? raw.pages : [];
  const normalizedInputPages: Array<{ slug: string; page?: Gnr8Page }> = [];
  for (const item of pagesRaw) {
    const slug = normalizeSlug(isRecord(item) && typeof item.slug === "string" ? item.slug : "");
    if (!slug) continue;
    const page = isRecord(item) && "page" in item ? (item as any).page : undefined;
    normalizedInputPages.push({
      slug,
      page: isGnr8Page(page) ? (page as Gnr8Page) : undefined,
    });
  }

  const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
  const unresolvedPages: string[] = [];

  for (const p of normalizedInputPages) {
    if (p.page) {
      resolvedPages.push({ slug: p.slug, page: { ...p.page, slug: p.slug } });
      continue;
    }
    const loaded = await getPageBySlug(p.slug).catch(() => null);
    if (!loaded) {
      unresolvedPages.push(p.slug);
      continue;
    }
    resolvedPages.push({ slug: p.slug, page: { ...loaded, slug: p.slug } });
  }

  const siteSemanticIntelligence = buildSiteSemanticIntelligence({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
  });

  const siteSemanticConsistency = buildSiteSemanticConsistency({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
  });

  const strategicSemanticReasoning = buildStrategicSemanticReasoning({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
  });

  const strategicSemanticPlan = buildStrategicSemanticPlan({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
  });

  const strategicSemanticExecutionReadiness = buildStrategicSemanticExecutionReadiness({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
    strategicSemanticPlan,
  });

  const strategicExecutionOrchestration = buildStrategicExecutionOrchestration({
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticPlan,
    strategicSemanticExecutionReadiness,
  });

  const wave = strategicExecutionOrchestration.waves.find((w) => w.id === waveId) ?? null;
  const stepIdSet = new Set<string>(wave?.stepIds ?? []);
  const waveSteps = (strategicSemanticPlan.steps ?? []).filter((s) => stepIdSet.has(s.id));

  const eligibility = buildWaveEligibility({ wave, waveSteps });
  const executable = eligibility.executable === true;

  const targetedPages = uniqStable((wave?.targetPages ?? []).map(normalizeSlug)).sort(bySlug);

  const pageBySlug = new Map<string, Gnr8Page>();
  for (const p of resolvedPages) pageBySlug.set(p.slug, p.page);

  const blockedPages: string[] = [];
  const skippedPages: string[] = [];
  const executablePages: string[] = [];
  const appliedPageResults: StrategicStructuralWaveExecutionResult["appliedPageResults"] = [];

  const pagesInOrder = targetedPages.slice().sort(bySlug);
  const shouldApply = apply === true && executable === true;
  const mode: StructuralWaveExecutionMode = shouldApply ? "applied" : "preview";

  for (const slug of pagesInOrder) {
    const basePage = pageBySlug.get(slug);
    if (!basePage) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: ACTION_ORDER.slice(),
        diffSummary: computeDiffSummary({
          pageBefore: null,
          pageAfter: null,
          reviewBefore: null,
          reviewAfter: null,
          appliedStructuralActions: [],
          skippedStructuralActions: ACTION_ORDER.slice(),
          mode,
          reasonIfNotApplied: "Not applied; page could not be resolved.",
        }),
      });
      continue;
    }

    const reviewNow = buildMigrationReviewSummary(basePage);
    const unstable = isPageTooUnstableForStructuralV1({ review: reviewNow });

    if (!executable) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: ACTION_ORDER.slice(),
        diffSummary: computeDiffSummary({
          pageBefore: basePage,
          pageAfter: basePage,
          reviewBefore: reviewNow,
          reviewAfter: reviewNow,
          appliedStructuralActions: [],
          skippedStructuralActions: ACTION_ORDER.slice(),
          mode,
          reasonIfNotApplied: "Not applied; wave is not executable in structural v1.",
        }),
      });
      continue;
    }

    if (unstable) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: ACTION_ORDER.slice(),
        diffSummary: computeDiffSummary({
          pageBefore: basePage,
          pageAfter: basePage,
          reviewBefore: reviewNow,
          reviewAfter: reviewNow,
          appliedStructuralActions: [],
          skippedStructuralActions: ACTION_ORDER.slice(),
          mode,
          reasonIfNotApplied: "Not applied; page requires higher-risk structural changes than v1 allows.",
        }),
      });
      continue;
    }

    if (!shouldApply) {
      const sim = simulateStructuralActionsV1({ page: basePage });
      if (sim.applicableActions.length === 0) skippedPages.push(slug);
      else executablePages.push(slug);

      appliedPageResults.push({
        slug,
        appliedStructuralActions: sim.applicableActions,
        skippedStructuralActions: ACTION_ORDER.filter((a) => !sim.applicableActions.includes(a)),
        diffSummary: computeDiffSummary({
          pageBefore: basePage,
          pageAfter: basePage,
          reviewBefore: sim.reviewBefore,
          reviewAfter: sim.reviewBefore,
          appliedStructuralActions: sim.applicableActions,
          skippedStructuralActions: ACTION_ORDER.filter((a) => !sim.applicableActions.includes(a)),
          mode,
        }),
      });
      continue;
    }

    const currentPage = await reloadPublishedPageOrNull(slug);
    if (!currentPage) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: ACTION_ORDER.slice(),
        diffSummary: computeDiffSummary({
          pageBefore: null,
          pageAfter: null,
          reviewBefore: null,
          reviewAfter: null,
          appliedStructuralActions: [],
          skippedStructuralActions: ACTION_ORDER.slice(),
          mode,
          reasonIfNotApplied: "Not applied; page could not be resolved.",
        }),
      });
      continue;
    }

    const reviewCurrent = buildMigrationReviewSummary(currentPage);
    const unstableNow = isPageTooUnstableForStructuralV1({ review: reviewCurrent });
    if (unstableNow) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: ACTION_ORDER.slice(),
        diffSummary: computeDiffSummary({
          pageBefore: currentPage,
          pageAfter: currentPage,
          reviewBefore: reviewCurrent,
          reviewAfter: reviewCurrent,
          appliedStructuralActions: [],
          skippedStructuralActions: ACTION_ORDER.slice(),
          mode,
          reasonIfNotApplied: "Not applied; page requires higher-risk structural changes than v1 allows.",
        }),
      });
      continue;
    }

    const sim = simulateStructuralActionsV1({ page: currentPage });
    if (sim.applicableActions.length === 0) {
      skippedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: ACTION_ORDER.slice(),
        diffSummary: computeDiffSummary({
          pageBefore: currentPage,
          pageAfter: currentPage,
          reviewBefore: sim.reviewBefore,
          reviewAfter: sim.reviewBefore,
          appliedStructuralActions: [],
          skippedStructuralActions: ACTION_ORDER.slice(),
          mode,
          reasonIfNotApplied: "Not applied; no supported structural actions remained for this page.",
        }),
      });
      continue;
    }

    executablePages.push(slug);

    const signatureBefore = getPageTransformationSignature(currentPage);
    const signatureAfter = getPageTransformationSignature(sim.pageAfter);
    const changed = signatureAfter !== signatureBefore;

    let publishedPage: Gnr8Page = currentPage;
    if (changed) {
      await savePage(slug, sim.pageAfter);
      await publishPage(slug);
      const reloaded = await reloadPublishedPageOrNull(slug);
      if (reloaded) publishedPage = reloaded;
      else publishedPage = sim.pageAfter;
    }

    const reviewAfter = buildMigrationReviewSummary(publishedPage);

    appliedPageResults.push({
      slug,
      appliedStructuralActions: sim.applicableActions,
      skippedStructuralActions: ACTION_ORDER.filter((a) => !sim.applicableActions.includes(a)),
      diffSummary: computeDiffSummary({
        pageBefore: currentPage,
        pageAfter: publishedPage,
        reviewBefore: sim.reviewBefore,
        reviewAfter,
        appliedStructuralActions: sim.applicableActions,
        skippedStructuralActions: ACTION_ORDER.filter((a) => !sim.applicableActions.includes(a)),
        mode,
      }),
    });
  }

  const blockedReasons: string[] = [];
  if (eligibility.executable === false) blockedReasons.push(...eligibility.blockedReasons);
  if (unresolvedPages.length > 0) blockedReasons.push("Unresolved pages cannot be executed.");
  if (blockedPages.some((slug) => !!slug && unresolvedPages.includes(slug))) blockedReasons.push("Page could not be resolved.");
  if (blockedPages.length > 0) blockedReasons.push("Some pages are blocked for structural execution.");
  const blockedReasonsFinal = uniqStable(blockedReasons).slice(0, 8);

  const appliedPagesCount =
    mode === "applied"
      ? appliedPageResults.filter((r) => (r.appliedStructuralActions?.length ?? 0) > 0 && r.diffSummary?.changed === true).length
      : 0;

  const summary = buildSummary({
    mode,
    executable,
    appliedPagesCount,
    blockedPagesCount: blockedPages.length,
  });

  const notes = buildNotes({
    mode,
    unresolvedCount: unresolvedPages.length,
    blockedPagesCount: blockedPages.length,
    skippedPagesCount: skippedPages.length,
    purpose: wave?.purpose ?? "",
  });

  return {
    strategicStructuralWaveExecution: {
      waveId,
      mode,
      executable,
      executionScope: "structural-only",
      targetedPages,
      executablePages: uniqStable(executablePages).sort(bySlug),
      blockedPages: uniqStable(blockedPages).sort(bySlug),
      skippedPages: uniqStable(skippedPages).sort(bySlug),
      appliedPageResults,
      blockedReasons: blockedReasonsFinal,
      summary,
      notes,
    },
  };
}

