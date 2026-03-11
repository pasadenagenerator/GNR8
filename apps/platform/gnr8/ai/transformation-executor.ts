import { buildExactDuplicateCleanupNotes, cleanupExactDuplicateSections, runLayoutAgent } from "@/gnr8/ai/layout-agent";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { buildMigrationReviewSummary, type MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import type { TransformationPlan, TransformationPlanStep } from "@/gnr8/ai/transformation-planner";
import { KEYWORD_RULES, type SupportedSectionType } from "@/gnr8/ai/layout-types";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getSectionSignature(page: Gnr8Page): string {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections.map((s) => (typeof s?.type === "string" ? s.type : "unknown")).join("|");
}

function detectRequestedSectionTypes(prompt: string): SupportedSectionType[] {
  const promptLc = prompt.toLowerCase();
  const hits: Array<{ type: SupportedSectionType; index: number }> = [];

  for (const rule of KEYWORD_RULES) {
    let best = Number.POSITIVE_INFINITY;
    for (const kw of rule.keywords) {
      const idx = promptLc.indexOf(kw);
      if (idx !== -1 && idx < best) best = idx;
    }
    if (best !== Number.POSITIVE_INFINITY) hits.push({ type: rule.type, index: best });
  }

  hits.sort((a, b) => a.index - b.index);

  const out: SupportedSectionType[] = [];
  const seen = new Set<SupportedSectionType>();
  for (const h of hits) {
    if (seen.has(h.type)) continue;
    seen.add(h.type);
    out.push(h.type);
  }
  return out;
}

function wantsInsertAfterHero(promptLc: string) {
  return (
    promptLc.includes("below the hero") ||
    promptLc.includes("below hero") ||
    promptLc.includes("under the hero") ||
    promptLc.includes("under hero") ||
    promptLc.includes("after the hero") ||
    promptLc.includes("after hero")
  );
}

function promptExplicitlyRequestsHero(promptLc: string) {
  if (promptLc.includes("hero section")) return true;
  return /\b(add|create|insert|include|append|make|build)\s+(a|an|new|another)?\s*hero\b/.test(promptLc);
}

function stripHeroAnchorFromRequested(promptLc: string, requested: SupportedSectionType[]) {
  if (!requested.includes("hero.split")) return requested;
  if (!wantsInsertAfterHero(promptLc)) return requested;
  if (promptExplicitlyRequestsHero(promptLc)) return requested;
  return requested.filter((t) => t !== "hero.split");
}

function applyMoveSuggestion(page: Gnr8Page, suggestion: string): { recognized: boolean; page: Gnr8Page; notes: string[] } {
  const text = suggestion.trim();
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const notes: string[] = [];

  function moveSectionsByType(type: string, targetIndex: number): NonNullable<Gnr8Page["sections"]> {
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
    case "Move hero near top": {
      const navbarCount = sections.filter((s) => s?.type === "navbar.basic").length;
      const nextSections = moveSectionsByType("hero.split", navbarCount);
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
    case "Move legacy blocks below structured sections":
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

function parseStepNote(step: TransformationPlanStep, key: string): string | null {
  const notes = Array.isArray(step.notes) ? step.notes : [];
  for (const note of notes) {
    if (typeof note !== "string") continue;
    if (!note.startsWith(`${key}=`)) continue;
    return note.slice(`${key}=`.length).trim() || null;
  }
  return null;
}

function isStepExecutableV1(step: TransformationPlanStep): { ok: true } | { ok: false; reason: string } {
  const actionPrompt = String(step.actionPrompt ?? "").trim();
  const actionLc = actionPrompt.toLowerCase();

  switch (step.kind) {
    case "cleanup":
    case "merge":
    case "normalize":
    case "reorder":
    case "add-section":
    case "replace-section":
      break;
    default:
      return { ok: false, reason: `Step kind '${step.kind}' is not executable in v1.` };
  }

  if (step.kind === "cleanup") {
    if (!/^remove duplicate /i.test(actionPrompt)) return { ok: false, reason: "Cleanup actionPrompt is not supported in v1." };
    return { ok: true };
  }

  if (step.kind === "merge") {
    if (!/^merge duplicate /i.test(actionPrompt)) return { ok: false, reason: "Merge actionPrompt is not supported in v1." };
    return { ok: true };
  }

  if (step.kind === "normalize" || step.kind === "reorder") {
    const moveAttempt = applyMoveSuggestion({ id: "tmp", slug: "tmp", title: "tmp", sections: [] }, actionPrompt);
    if (!moveAttempt.recognized) return { ok: false, reason: "Move/normalize actionPrompt is not supported in v1." };
    return { ok: true };
  }

  if (step.kind === "replace-section") {
    if (!actionLc.includes("replace") || !actionLc.includes("legacy")) {
      return { ok: false, reason: "Replace-section is only supported for legacy replacements in v1." };
    }
    const requested = detectRequestedSectionTypes(actionPrompt);
    if (requested.length === 0) return { ok: false, reason: "No supported replacement section type found in actionPrompt." };
    if (requested.length > 1) return { ok: false, reason: "Replace-section with multiple target types is not supported in v1." };
    return { ok: true };
  }

  if (step.kind === "add-section") {
    if (!actionLc.startsWith("add ") && !actionLc.startsWith("insert ") && !actionLc.startsWith("include ") && !actionLc.startsWith("append ")) {
      return { ok: false, reason: "Add-section actionPrompt is not supported in v1." };
    }

    const bannedPlacement = /\b(above|before|ahead of|prior to|preceding)\b/i;
    if (bannedPlacement.test(actionPrompt)) {
      return { ok: false, reason: "Add-section with 'above/before' placement is not supported in v1." };
    }

    const promptLc = actionLc;
    const requestedRaw = detectRequestedSectionTypes(actionPrompt);
    const requested = stripHeroAnchorFromRequested(promptLc, requestedRaw);

    if (requested.length === 0) return { ok: false, reason: "No supported section type found in actionPrompt." };
    if (requested.length > 1) return { ok: false, reason: "Add-section that references multiple section types is not supported in v1." };

    const hasAnchor = promptLc.includes("below ") || promptLc.includes("under ") || promptLc.includes("after ");
    if (hasAnchor && !wantsInsertAfterHero(promptLc)) {
      return { ok: false, reason: "Only 'after/below hero' anchoring is supported for add-section in v1." };
    }

    return { ok: true };
  }

  return { ok: false, reason: "Unsupported transformation step in v1." };
}

async function reloadPublishedPageOrThrow(slug: string): Promise<Gnr8Page> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reloaded = await getPageBySlug(slug);
    if (reloaded) return reloaded;
  }
  throw new Error("Failed to reload published page");
}

function applyStructuralSafePipeline(
  page: Gnr8Page,
  reviewBefore: MigrationReviewSummary,
): {
  page: Gnr8Page;
  notes: string[];
  meta: {
    exactRemovedIds: Set<string>;
    mergedTypes: Map<string, number>;
    normalizedChanged: boolean;
  };
} {
  const exactNotes = buildExactDuplicateCleanupNotes(page, reviewBefore.duplicateDetails);
  const beforeIds = new Set((page.sections ?? []).map((s) => s.id).filter(Boolean));
  const afterExact = cleanupExactDuplicateSections(page, reviewBefore.duplicateDetails);
  const afterIds = new Set((afterExact.sections ?? []).map((s) => s.id).filter(Boolean));
  const exactRemovedIds = new Set<string>();
  for (const id of beforeIds) {
    if (!afterIds.has(id)) exactRemovedIds.add(id);
  }

  const reviewAfterExact = buildMigrationReviewSummary(afterExact);
  const mergeResult = mergeSupportedDuplicateSections(afterExact, reviewAfterExact.duplicateDetails);
  const mergedTypes = new Map<string, number>();
  for (const m of mergeResult.mergedTypes ?? []) {
    mergedTypes.set(m.type, m.mergedCount);
  }

  const normalized = normalizeSectionLayout(mergeResult.page);

  return {
    page: normalized.page,
    notes: [...exactNotes, ...mergeResult.notes, ...normalized.notes],
    meta: { exactRemovedIds, mergedTypes, normalizedChanged: normalized.changed },
  };
}

export async function executeTransformationSteps(input: {
  page: Gnr8Page;
  review: MigrationReviewSummary;
  transformationPlan: TransformationPlan;
  selectedStepIds: string[];
  selection?: {
    safeBatch?: boolean;
    explicitlyApprovedStepIds?: string[];
  };
}): Promise<{
  page: Gnr8Page;
  appliedSteps: string[];
  skippedSteps: string[];
  notes: string[];
}> {
  void input.review;
  const selected = Array.isArray(input.selectedStepIds) ? input.selectedStepIds.filter((id) => typeof id === "string") : [];
  const selectedSet = new Set(selected.map((id) => id.trim()).filter(Boolean));
  const explicitlyApprovedSet = new Set(
    (Array.isArray(input.selection?.explicitlyApprovedStepIds) ? input.selection?.explicitlyApprovedStepIds : [])
      .filter((id) => typeof id === "string")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  const steps = Array.isArray(input.transformationPlan.steps) ? input.transformationPlan.steps : [];
  const stepsById = new Map<string, TransformationPlanStep>();
  for (const step of steps) stepsById.set(step.id, step);

  const appliedSteps: string[] = [];
  const skippedSteps: string[] = [];
  const notes: string[] = [];

  for (const id of selectedSet) {
    if (!stepsById.has(id)) {
      skippedSteps.push(id);
      notes.push(`Skipped step ${id} because it is not present in the current transformation plan.`);
    }
  }

  if (selectedSet.size === 0) {
    return { page: input.page, appliedSteps: [], skippedSteps: [], notes: ["No transformation steps were selected."] };
  }

  let workingPage: Gnr8Page = input.page;

  for (const step of steps) {
    if (!selectedSet.has(step.id)) continue;

    const exec = isStepExecutableV1(step);
    if (!exec.ok) {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because ${exec.reason}`);
      continue;
    }

    const current = await reloadPublishedPageOrThrow(workingPage.slug);
    const reviewBefore = buildMigrationReviewSummary(current);

    const signatureBefore = getSectionSignature(current);

    const pipeline = applyStructuralSafePipeline(current, reviewBefore);
    let nextPage: Gnr8Page = pipeline.page;
    const stepNotes: string[] = [...pipeline.notes];

    if (step.kind === "reorder" || step.kind === "normalize") {
      const moveAttempt = applyMoveSuggestion(nextPage, step.actionPrompt);
      if (moveAttempt.recognized) {
        nextPage = moveAttempt.page;
        stepNotes.push(...moveAttempt.notes);
      }
    } else if (step.kind === "add-section" || step.kind === "replace-section") {
      const result = runLayoutAgent({ prompt: step.actionPrompt, page: nextPage });
      nextPage = result.page;
      stepNotes.push(...(result.plan.notes ?? []));
    } else if (step.kind === "cleanup") {
      const desiredType = parseStepNote(step, "duplicateType");
      if (desiredType) {
        const desiredDetail = (reviewBefore.duplicateDetails ?? []).find(
          (d) => isRecord(d) && d.type === desiredType && d.similarity === "exact-duplicate",
        );
        if (!desiredDetail) stepNotes.push("Cleanup step appears already satisfied.");
      }
    } else if (step.kind === "merge") {
      const desiredType = parseStepNote(step, "duplicateType");
      if (desiredType) {
        const mergedCount = pipeline.meta.mergedTypes.get(desiredType) ?? 0;
        if (mergedCount <= 0) stepNotes.push("Merge step appears already satisfied.");
      }
    }

    const signatureAfter = getSectionSignature(nextPage);
    if (signatureAfter === signatureBefore) {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because it was already satisfied (no structural change detected).`);
      if (stepNotes.length > 0) notes.push(...stepNotes);
      continue;
    }

    await savePage(nextPage.slug, nextPage);
    await publishPage(nextPage.slug);
    const published = await reloadPublishedPageOrThrow(nextPage.slug);
    workingPage = published;

    appliedSteps.push(step.id);
    const label = step.safe === true ? "safe" : "approved";
    notes.push(`Executed ${label} step ${step.id}: ${step.title || step.actionPrompt}`);
    if (stepNotes.length > 0) notes.push(...stepNotes);
  }

  const safeBatch = input.selection?.safeBatch === true;
  if (safeBatch) {
    const appliedSafe = appliedSteps.filter((id) => stepsById.get(id)?.safe === true).length;
    const appliedApprovedNonSafe = appliedSteps.filter((id) => {
      const step = stepsById.get(id);
      if (!step) return false;
      if (step.safe === true) return false;
      return explicitlyApprovedSet.has(id);
    }).length;

    if (appliedSafe > 0 && appliedApprovedNonSafe > 0) {
      notes.unshift(
        `Executed ${appliedApprovedNonSafe} approved step${appliedApprovedNonSafe === 1 ? "" : "s"} and ${appliedSafe} safe step${
          appliedSafe === 1 ? "" : "s"
        }.`,
      );
    } else if (appliedSafe > 0) {
      notes.unshift(`Executed ${appliedSafe} safe transformation step${appliedSafe === 1 ? "" : "s"}.`);
    } else if (appliedApprovedNonSafe > 0) {
      notes.unshift(`Executed ${appliedApprovedNonSafe} approved transformation step${appliedApprovedNonSafe === 1 ? "" : "s"}.`);
    } else {
      notes.unshift("No selected transformation steps were executed.");
    }
  } else if (appliedSteps.length > 0) {
    notes.unshift(`Executed ${appliedSteps.length} approved transformation step${appliedSteps.length === 1 ? "" : "s"}.`);
  } else {
    notes.unshift("No approved transformation steps were executed.");
  }

  return { page: workingPage, appliedSteps, skippedSteps, notes };
}
