import type { MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { getExecutionCapability, type ExecutionCapability } from "@/gnr8/ai/execution-capability-matrix";
import { evaluateExecutionPolicy } from "@/gnr8/ai/execution-policy";
import { getTransformationStepExecutabilityV1 } from "@/gnr8/ai/transformation-executor";
import type { TransformationPlan, TransformationPlanStep } from "@/gnr8/ai/transformation-planner";
import type { Gnr8Page } from "@/gnr8/types/page";

export type ExecutionPreviewStepPolicy = {
  stepId: string;
  title: string;
  actionPrompt: string;
  policyDecision: "auto-allowed" | "approval-required" | "blocked" | "deferred";
  policyReason: string;
  policyExplanation: string;
};

export type ExecutionPreview = {
  ready: boolean;
  summary: string;
  executionPolicySummary: {
    autoAllowed: number;
    approvalRequired: number;
    blocked: number;
    deferred: number;
  };
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
  stepPolicies: ExecutionPreviewStepPolicy[];
  semanticPreviewHints?: Array<{ stepId: string; hints: string[] }>;
  semanticApprovalRationaleHints?: Array<{ stepId: string; hints: string[] }>;
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

function isExecutableNowFallback(step: TransformationPlanStep): boolean {
  return getTransformationStepExecutabilityV1(step).ok;
}

function getExecutionCapabilityForPolicy(step: TransformationPlanStep): ExecutionCapability | null {
  if (step.kind === "cleanup") return getExecutionCapability("Remove exact duplicate sections");
  if (step.kind === "merge") return getExecutionCapability("Merge highly similar sections");
  if (step.kind === "normalize") return getExecutionCapability("Normalize section layout");
  return getExecutionCapability(String(step.actionPrompt ?? ""));
}

function getExecutableNowFromPlanStep(step: TransformationPlanStep): boolean {
  if (typeof step.executableNow === "boolean") return step.executableNow;
  return isExecutableNowFallback(step);
}

function getStepPolicyFromPlanStep(
  step: TransformationPlanStep,
  fallback: { review: MigrationReviewSummary },
): Pick<ExecutionPreviewStepPolicy, "policyDecision" | "policyReason" | "policyExplanation"> {
  if (step.policyDecision && step.policyReason && typeof step.policyExplanation === "string") {
    return {
      policyDecision: step.policyDecision,
      policyReason: step.policyReason,
      policyExplanation: step.policyExplanation,
    };
  }

  const executionCapability = getExecutionCapabilityForPolicy(step);
  const policy = evaluateExecutionPolicy(step, { review: fallback.review, executionCapability });
  return {
    policyDecision: policy.decision,
    policyReason: policy.reason,
    policyExplanation: policy.explanation,
  };
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
  executableNowActionableStepPolicies: ExecutionPreviewStepPolicy[];
  executableNowActionableAutoAllowed: number;
  executableNowActionableApprovalRequired: number;
}): ExecutionPreview["suggestedExecutionMode"] {
  if (input.totalSteps === 0) return "none";

  const actionableExecutableCount = input.executableNowActionableStepPolicies.length;
  if (actionableExecutableCount === 0) return "manual-approval";

  if (input.executableNowActionableApprovalRequired > 0) return "manual-approval";

  if (input.executableNowActionableAutoAllowed > 1 && input.executableNowActionableAutoAllowed === actionableExecutableCount) {
    return "safe-batch";
  }

  if (actionableExecutableCount === 1) return "single-step";

  return "manual-approval";
}

function buildSummary(input: {
  totalSteps: number;
  hasAnyActionableExecutableStep: boolean;
  policyAutoAllowed: number;
  policyApprovalRequired: number;
}): string {
  if (input.totalSteps === 0) return "No transformation steps are currently needed.";
  if (!input.hasAnyActionableExecutableStep) return "Transformation plan exists, but no steps are currently executable under policy.";
  if (input.policyApprovalRequired > 0) return "Page has transformation opportunities that require approval.";
  if (input.policyAutoAllowed > 0) return "Page is ready for safe transformation execution.";
  return "Page is ready for safe transformation execution.";
}

function buildNotes(input: {
  totalSteps: number;
  safeSteps: number;
  executableNowSteps: number;
  executableNowActionableSteps: number;
  policyBlocked: number;
  policyDeferred: number;
  policyApprovalRequired: number;
  unsupportedSteps: number;
  suggestedExecutionMode: ExecutionPreview["suggestedExecutionMode"];
}): string[] {
  const notes: string[] = ["Preview only; no changes are applied."];

  if (input.totalSteps > 0 && input.executableNowSteps === 0) {
    notes.push("No planned steps are executable in v1 yet.");
  }

  if (input.totalSteps > 0 && input.executableNowActionableSteps === 0) {
    notes.push("No planned steps are currently executable under policy.");
  }

  if (input.suggestedExecutionMode === "safe-batch") {
    notes.push("Safe steps can be executed in batch mode.");
  }

  if (input.policyApprovalRequired > 0) {
    notes.push("Some steps require explicit human approval.");
  }

  if (input.policyBlocked > 0) {
    notes.push("Some steps are blocked by execution policy.");
  }

  if (input.policyDeferred > 0) {
    notes.push("Some steps are deferred by execution policy.");
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

  const steps = Array.isArray(input.transformationPlan.steps) ? input.transformationPlan.steps : [];
  const semanticPreviewHints = steps
    .map((s) => {
      const hints = Array.isArray(s.previewHints) ? s.previewHints.filter((h) => typeof h === "string" && h.trim().length > 0) : [];
      return hints.length > 0 ? { stepId: s.id, hints } : null;
    })
    .filter((v): v is { stepId: string; hints: string[] } => v !== null);

  const semanticApprovalRationaleHints = steps
    .map((s) => {
      const hints = Array.isArray(s.approvalRationaleHints)
        ? s.approvalRationaleHints.filter((h) => typeof h === "string" && h.trim().length > 0)
        : [];
      return hints.length > 0 ? { stepId: s.id, hints } : null;
    })
    .filter((v): v is { stepId: string; hints: string[] } => v !== null);

  const safeStepIds: string[] = [];
  const approvalRequiredStepIds: string[] = [];
  const executableNowStepIds: string[] = [];
  const unsupportedStepIds: string[] = [];
  const stepPolicies: ExecutionPreviewStepPolicy[] = [];
  const executableNowActionableStepPolicies: ExecutionPreviewStepPolicy[] = [];
  let executableNowActionableAutoAllowed = 0;
  let executableNowActionableApprovalRequired = 0;
  let policyAutoAllowed = 0;
  let policyApprovalRequired = 0;
  let policyBlocked = 0;
  let policyDeferred = 0;

  const planPolicySummary = input.transformationPlan.policySummary;
  const shouldDerivePolicySummaryFromPlanSteps = !planPolicySummary;

  for (const step of steps) {
    const policy = getStepPolicyFromPlanStep(step, { review: input.review });
    const stepPolicy: ExecutionPreviewStepPolicy = {
      stepId: step.id,
      title: step.title,
      actionPrompt: step.actionPrompt,
      policyDecision: policy.policyDecision,
      policyReason: policy.policyReason,
      policyExplanation: policy.policyExplanation,
    };
    stepPolicies.push(stepPolicy);

    if (step.safe === true) safeStepIds.push(step.id);
    if (step.requiresApproval === true) approvalRequiredStepIds.push(step.id);

    const executableNow = getExecutableNowFromPlanStep(step);
    if (executableNow) {
      executableNowStepIds.push(step.id);
      if (stepPolicy.policyDecision === "auto-allowed") executableNowActionableAutoAllowed += 1;
      if (stepPolicy.policyDecision === "approval-required") executableNowActionableApprovalRequired += 1;
      if (stepPolicy.policyDecision === "auto-allowed" || stepPolicy.policyDecision === "approval-required") {
        executableNowActionableStepPolicies.push(stepPolicy);
      }
    } else {
      unsupportedStepIds.push(step.id);
    }

    if (shouldDerivePolicySummaryFromPlanSteps) {
      if (stepPolicy.policyDecision === "auto-allowed") policyAutoAllowed += 1;
      if (stepPolicy.policyDecision === "approval-required") policyApprovalRequired += 1;
      if (stepPolicy.policyDecision === "blocked") policyBlocked += 1;
      if (stepPolicy.policyDecision === "deferred") policyDeferred += 1;
    }
  }

  const totalSteps = steps.length;
  const safeSteps = safeStepIds.length;
  const approvalRequiredSteps = approvalRequiredStepIds.length;
  const executableNowStepsCount = executableNowStepIds.length;
  const unsupportedSteps = unsupportedStepIds.length;

  const hasAnyActionableExecutableStep = executableNowActionableStepPolicies.length > 0;
  const ready =
    totalSteps > 0 &&
    executableNowStepsCount > 0 &&
    executableNowActionableStepPolicies.some((s) => s.policyDecision === "auto-allowed" || s.policyDecision === "approval-required");
  const suggestedExecutionMode = buildSuggestedExecutionMode({
    totalSteps,
    executableNowActionableStepPolicies,
    executableNowActionableAutoAllowed,
    executableNowActionableApprovalRequired,
  });
  const summary = buildSummary({
    totalSteps,
    hasAnyActionableExecutableStep,
    policyAutoAllowed: planPolicySummary?.autoAllowed ?? policyAutoAllowed,
    policyApprovalRequired: planPolicySummary?.approvalRequired ?? policyApprovalRequired,
  });
  const expectedChangeHints = buildExpectedChangeHints(steps);
  const notes = buildNotes({
    totalSteps,
    safeSteps,
    executableNowSteps: executableNowStepsCount,
    executableNowActionableSteps: executableNowActionableStepPolicies.length,
    policyBlocked: planPolicySummary?.blocked ?? policyBlocked,
    policyDeferred: planPolicySummary?.deferred ?? policyDeferred,
    policyApprovalRequired: planPolicySummary?.approvalRequired ?? policyApprovalRequired,
    unsupportedSteps,
    suggestedExecutionMode,
  });

  return {
    ready,
    summary,
    executionPolicySummary: {
      autoAllowed: planPolicySummary?.autoAllowed ?? policyAutoAllowed,
      approvalRequired: planPolicySummary?.approvalRequired ?? policyApprovalRequired,
      blocked: planPolicySummary?.blocked ?? policyBlocked,
      deferred: planPolicySummary?.deferred ?? policyDeferred,
    },
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
    stepPolicies,
    ...(semanticPreviewHints.length > 0 ? { semanticPreviewHints } : {}),
    ...(semanticApprovalRationaleHints.length > 0 ? { semanticApprovalRationaleHints } : {}),
    suggestedExecutionMode,
    expectedChangeHints,
    notes,
  };
}
