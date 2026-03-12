import { buildExactDuplicateCleanupNotes, cleanupExactDuplicateSections } from "@/gnr8/ai/layout-agent";
import {
  applyContentLayoutActionV1,
  getContentLayoutActionForPromptV1,
  getPageStructureSignature,
} from "@/gnr8/ai/content-layout-transformer";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { buildMigrationReviewSummary, type MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import { getExecutionCapability, type ExecutionCapability } from "@/gnr8/ai/execution-capability-matrix";
import { evaluateExecutionPolicy } from "@/gnr8/ai/execution-policy";
import type { TransformationPlan, TransformationPlanStep } from "@/gnr8/ai/transformation-planner";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getTypeSequenceSignature(page: Gnr8Page): string {
  return getPageStructureSignature(page).typeSequence;
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
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
        notes.push("Moved footer to bottom.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move navbar to the top": {
      const navbars = sections.filter((s) => s?.type === "navbar.basic");
      const without = sections.filter((s) => s?.type !== "navbar.basic");
      const nextSections = navbars.length > 0 ? [...navbars, ...without] : sections;
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
        notes.push("Moved navbar to top.");
      }
      return { recognized: true, page: { ...page, sections: nextSections }, notes };
    }
    case "Move hero near top": {
      const navbarCount = sections.filter((s) => s?.type === "navbar.basic").length;
      const nextSections = moveSectionsByType("hero.split", navbarCount);
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
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
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
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
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
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
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
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
      if (getTypeSequenceSignature({ ...page, sections: nextSections }) !== getTypeSequenceSignature(page)) {
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

function getExecutionCapabilityForPolicy(step: TransformationPlanStep): ExecutionCapability | null {
  if (step.kind === "cleanup") return getExecutionCapability("Remove exact duplicate sections");
  if (step.kind === "merge") return getExecutionCapability("Merge highly similar sections");
  if (step.kind === "normalize") return getExecutionCapability("Normalize section layout");
  return getExecutionCapability(String(step.actionPrompt ?? ""));
}

function isStepExecutableV1(step: TransformationPlanStep): { ok: true } | { ok: false; reason: string } {
  const actionPrompt = String(step.actionPrompt ?? "").trim();

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
    const cap = getExecutionCapability(actionPrompt);
    if (!cap || cap.supported !== true || cap.kind !== "move-section") {
      return { ok: false, reason: "Move/normalize actionPrompt is not supported in v1." };
    }
    return { ok: true };
  }

  if (step.kind === "replace-section") {
    const cap = getExecutionCapability(actionPrompt);
    if (!cap || cap.supported !== true || cap.kind !== "replace-section") {
      return { ok: false, reason: "Replace-section actionPrompt is not supported in v1." };
    }
    const support = getContentLayoutActionForPromptV1({ kind: "replace-section", actionPrompt });
    if (!support.ok) return { ok: false, reason: support.reason };
    return { ok: true };
  }

  if (step.kind === "add-section") {
    const cap = getExecutionCapability(actionPrompt);
    if (!cap || cap.supported !== true || cap.kind !== "add-section") {
      return { ok: false, reason: "Add-section actionPrompt is not supported in v1." };
    }
    const support = getContentLayoutActionForPromptV1({ kind: "add-section", actionPrompt });
    if (!support.ok) return { ok: false, reason: support.reason };
    return { ok: true };
  }

  return { ok: false, reason: "Unsupported transformation step in v1." };
}

export function getTransformationStepExecutabilityV1(step: TransformationPlanStep): { ok: true } | { ok: false; reason: string } {
  return isStepExecutableV1(step);
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
    exactRemovedCountsByType: Map<string, number>;
    mergedTypes: Map<string, number>;
    normalizedChanged: boolean;
  };
} {
  const exactNotes = buildExactDuplicateCleanupNotes(page, reviewBefore.duplicateDetails);
  const beforeSections = Array.isArray(page.sections) ? page.sections : [];
  const beforeIds = new Set(beforeSections.map((s) => s.id).filter(Boolean));
  const idToType = new Map<string, string>();
  for (const s of beforeSections) {
    if (typeof s?.id !== "string" || !s.id) continue;
    idToType.set(s.id, typeof s?.type === "string" ? s.type : "unknown");
  }
  const afterExact = cleanupExactDuplicateSections(page, reviewBefore.duplicateDetails);
  const afterIds = new Set((afterExact.sections ?? []).map((s) => s.id).filter(Boolean));
  const exactRemovedIds = new Set<string>();
  for (const id of beforeIds) {
    if (!afterIds.has(id)) exactRemovedIds.add(id);
  }
  const exactRemovedCountsByType = new Map<string, number>();
  for (const id of exactRemovedIds) {
    const type = idToType.get(id);
    if (!type) continue;
    exactRemovedCountsByType.set(type, (exactRemovedCountsByType.get(type) ?? 0) + 1);
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
    meta: { exactRemovedIds, exactRemovedCountsByType, mergedTypes, normalizedChanged: normalized.changed },
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
  let anyPublishedChanges = false;

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

    const policy = evaluateExecutionPolicy(step, {
      review: input.review,
      executionCapability: getExecutionCapabilityForPolicy(step),
    });

    if (policy.decision === "blocked") {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because policy blocked it (${policy.reason}): ${policy.explanation}`);
      continue;
    }

    if (policy.decision === "deferred") {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because policy deferred it (${policy.reason}): ${policy.explanation}`);
      continue;
    }

    if (policy.decision === "approval-required" && !explicitlyApprovedSet.has(step.id)) {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because it requires explicit approval: ${policy.explanation}`);
      continue;
    }

    const exec = isStepExecutableV1(step);
    if (!exec.ok) {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because ${exec.reason}`);
      continue;
    }

    const current = await reloadPublishedPageOrThrow(workingPage.slug);
    const reviewBefore = buildMigrationReviewSummary(current);

    const signatureBefore = getTypeSequenceSignature(current);

    const pipeline = applyStructuralSafePipeline(current, reviewBefore);
    const basePage: Gnr8Page = pipeline.page;
    const signatureAfterPipeline = getTypeSequenceSignature(basePage);
    let nextPage: Gnr8Page = basePage;
    const stepNotes: string[] = [...pipeline.notes];
    let stepApplied = false;

    if (step.kind === "reorder" || step.kind === "normalize") {
      const moveAttempt = applyMoveSuggestion(nextPage, step.actionPrompt);
      if (moveAttempt.recognized) {
        nextPage = moveAttempt.page;
        stepNotes.push(...moveAttempt.notes);
      }
      const signatureAfterMove = getTypeSequenceSignature(nextPage);
      stepApplied = signatureAfterMove !== signatureAfterPipeline || pipeline.meta.normalizedChanged;
    } else if (step.kind === "add-section" || step.kind === "replace-section") {
      const support = getContentLayoutActionForPromptV1({
        kind: step.kind === "add-section" ? "add-section" : "replace-section",
        actionPrompt: step.actionPrompt,
      });
      if (!support.ok) {
        stepNotes.push(`Unsupported in v1: ${support.reason}`);
      } else {
        const result = applyContentLayoutActionV1({ page: nextPage, action: support.action });
        nextPage = result.page;
        stepApplied = result.applied;
        stepNotes.push(...result.notes);
      }
    } else if (step.kind === "cleanup") {
      const desiredType = parseStepNote(step, "duplicateType");
      if (desiredType) {
        const desiredDetail = (reviewBefore.duplicateDetails ?? []).find(
          (d) => isRecord(d) && d.type === desiredType && d.similarity === "exact-duplicate",
        );
        if (!desiredDetail) stepNotes.push("Cleanup step appears already satisfied.");
        stepApplied = (pipeline.meta.exactRemovedCountsByType.get(desiredType) ?? 0) > 0;
      } else {
        stepApplied = pipeline.meta.exactRemovedIds.size > 0;
      }
    } else if (step.kind === "merge") {
      const desiredType = parseStepNote(step, "duplicateType");
      if (desiredType) {
        const mergedCount = pipeline.meta.mergedTypes.get(desiredType) ?? 0;
        if (mergedCount <= 0) stepNotes.push("Merge step appears already satisfied.");
        stepApplied = mergedCount > 0;
      } else {
        stepApplied = [...pipeline.meta.mergedTypes.values()].some((c) => c > 0);
      }
    }

    const signatureAfter = getTypeSequenceSignature(nextPage);
    const structuralChanged = signatureAfter !== signatureBefore;

    if (!structuralChanged) {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because it was already satisfied (no structural change detected).`);
      if (stepNotes.length > 0) notes.push(...stepNotes);
      continue;
    }

    await savePage(nextPage.slug, nextPage);
    await publishPage(nextPage.slug);
    anyPublishedChanges = true;
    const published = await reloadPublishedPageOrThrow(nextPage.slug);
    workingPage = published;

    if (stepApplied) {
      appliedSteps.push(step.id);
      const label = step.safe === true ? "safe" : "approved";
      notes.push(`Executed ${label} step ${step.id}: ${step.title || step.actionPrompt}`);
      if (stepNotes.length > 0) notes.push(...stepNotes);
    } else {
      skippedSteps.push(step.id);
      notes.push(`Skipped step ${step.id} because it had no additional effect beyond safe structural changes.`);
      if (stepNotes.length > 0) notes.push(...stepNotes);
    }
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
      notes.unshift(anyPublishedChanges ? "Applied safe structural changes; no selected steps required additional changes." : "No selected transformation steps were executed.");
    }
  } else if (appliedSteps.length > 0) {
    notes.unshift(`Executed ${appliedSteps.length} approved transformation step${appliedSteps.length === 1 ? "" : "s"}.`);
  } else {
    notes.unshift(anyPublishedChanges ? "Applied safe structural changes; no approved steps required additional changes." : "No approved transformation steps were executed.");
  }

  return { page: workingPage, appliedSteps, skippedSteps, notes };
}
