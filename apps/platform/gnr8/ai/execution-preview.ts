import type { MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { getTransformationStepExecutabilityV1 } from "@/gnr8/ai/transformation-executor";
import type { TransformationPlan, TransformationPlanStep } from "@/gnr8/ai/transformation-planner";
import type { Gnr8Page } from "@/gnr8/types/page";

export type ExecutionPreview = {
  ready: boolean;
  summary: string;
  counts: {
    totalSteps: number;
    safeSteps: number;
    approvalRequiredSteps: number;
    executableNowSteps: number;
    unsupportedSteps: number;
  };
  safeStepIds: string[];
  approvalRequiredStepIds: string[];
  executableNowStepIds: string[];
  unsupportedStepIds: string[];
  suggestedExecutionMode: "none" | "single-step" | "safe-batch" | "manual-approval";
  expectedChangeHints: string[];
  notes: string[];
};

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

function isExecutableNow(step: TransformationPlanStep): boolean {
  return getTransformationStepExecutabilityV1(step).ok;
}

function buildExpectedChangeHints(steps: TransformationPlanStep[]): string[] {
  const hasKind = (k: TransformationPlanStep["kind"]) => steps.some((s) => s.kind === k);
  const hasAddPrompt = (pattern: RegExp) => steps.some((s) => s.kind === "add-section" && pattern.test(String(s.actionPrompt ?? "")));

  const hints: string[] = [];

  if (hasKind("reorder") || hasKind("normalize")) hints.push("Section order may change.");
  if (hasKind("cleanup")) hints.push("Duplicate sections may be removed.");
  if (hasKind("merge")) hints.push("Similar sections may be merged.");

  if (hasAddPrompt(/\bcta\b/i)) hints.push("A CTA may be added.");
  if (hasAddPrompt(/\bpricing\b/i)) hints.push("A pricing section may be added.");
  if (hasAddPrompt(/\blogo\b/i) || hasAddPrompt(/\blogo cloud\b/i)) hints.push("A logo cloud may be added.");

  if (hasKind("replace-section")) hints.push("A section may be replaced.");
  if (hasKind("redesign")) hints.push("Structural page changes may be proposed.");
  if (hasKind("content-improvement")) hints.push("Content-focused improvements may be suggested.");

  return uniqStable(hints).slice(0, 5);
}

function buildSuggestedExecutionMode(input: {
  totalSteps: number;
  executableNowSteps: TransformationPlanStep[];
}): ExecutionPreview["suggestedExecutionMode"] {
  if (input.totalSteps === 0) return "none";

  if (input.executableNowSteps.length === 0) return "manual-approval";

  const hasApprovalRequiredExecutable = input.executableNowSteps.some((s) => s.requiresApproval === true);
  if (hasApprovalRequiredExecutable) return "manual-approval";

  const allExecutableSafe = input.executableNowSteps.every((s) => s.safe === true);
  if (allExecutableSafe && input.executableNowSteps.length > 1) return "safe-batch";

  return "single-step";
}

function buildSummary(input: {
  totalSteps: number;
  approvalRequiredSteps: number;
  executableNowSteps: number;
}): string {
  if (input.totalSteps === 0) return "No transformation steps are currently needed.";
  if (input.executableNowSteps === 0) return "Transformation plan exists, but no steps are executable in v1.";
  if (input.approvalRequiredSteps > 0) return "Page has transformation opportunities that require approval.";
  return "Page is ready for safe transformation execution.";
}

function buildNotes(input: {
  totalSteps: number;
  safeSteps: number;
  executableNowSteps: number;
  approvalRequiredSteps: number;
  unsupportedSteps: number;
  suggestedExecutionMode: ExecutionPreview["suggestedExecutionMode"];
}): string[] {
  const notes: string[] = ["Preview only; no changes are applied."];

  if (input.totalSteps > 0 && input.executableNowSteps === 0) {
    notes.push("No planned steps are executable in v1 yet.");
  }

  if (input.suggestedExecutionMode === "safe-batch") {
    notes.push("Safe steps can be executed in batch mode.");
  }

  if (input.approvalRequiredSteps > 0) {
    notes.push("Some steps require explicit approval.");
  }

  if (input.unsupportedSteps > 0) {
    notes.push("Some planned steps are not executable in v1 yet.");
  }

  return uniqStable(notes);
}

export function buildExecutionPreview(input: {
  page: Gnr8Page;
  review: MigrationReviewSummary;
  transformationPlan: TransformationPlan;
}): ExecutionPreview {
  void input.page;
  void input.review;

  const steps = Array.isArray(input.transformationPlan.steps) ? input.transformationPlan.steps : [];

  const safeStepIds: string[] = [];
  const approvalRequiredStepIds: string[] = [];
  const executableNowStepIds: string[] = [];
  const unsupportedStepIds: string[] = [];
  const executableNowSteps: TransformationPlanStep[] = [];

  for (const step of steps) {
    if (step.safe === true) safeStepIds.push(step.id);
    if (step.requiresApproval === true) approvalRequiredStepIds.push(step.id);

    if (isExecutableNow(step)) {
      executableNowStepIds.push(step.id);
      executableNowSteps.push(step);
    } else {
      unsupportedStepIds.push(step.id);
    }
  }

  const totalSteps = steps.length;
  const safeSteps = safeStepIds.length;
  const approvalRequiredSteps = approvalRequiredStepIds.length;
  const executableNowStepsCount = executableNowStepIds.length;
  const unsupportedSteps = unsupportedStepIds.length;

  const ready = totalSteps > 0 && executableNowStepsCount > 0;
  const suggestedExecutionMode = buildSuggestedExecutionMode({ totalSteps, executableNowSteps });
  const summary = buildSummary({ totalSteps, approvalRequiredSteps, executableNowSteps: executableNowStepsCount });
  const expectedChangeHints = buildExpectedChangeHints(steps);
  const notes = buildNotes({
    totalSteps,
    safeSteps,
    executableNowSteps: executableNowStepsCount,
    approvalRequiredSteps,
    unsupportedSteps,
    suggestedExecutionMode,
  });

  return {
    ready,
    summary,
    counts: {
      totalSteps,
      safeSteps,
      approvalRequiredSteps,
      executableNowSteps: executableNowStepsCount,
      unsupportedSteps,
    },
    safeStepIds,
    approvalRequiredStepIds,
    executableNowStepIds,
    unsupportedStepIds,
    suggestedExecutionMode,
    expectedChangeHints,
    notes,
  };
}
