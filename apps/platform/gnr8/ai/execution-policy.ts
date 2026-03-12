import type { ExecutionCapability } from "@/gnr8/ai/execution-capability-matrix";
import type { MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { TransformationPlanStep as TransformationStep } from "@/gnr8/ai/transformation-planner";

export type ExecutionPolicyDecision = "auto-allowed" | "approval-required" | "blocked" | "deferred";

export type ExecutionPolicyReason =
  | "safe-structural-change"
  | "layout-normalization"
  | "duplicate-cleanup"
  | "merge-safe"
  | "content-risk"
  | "structural-risk"
  | "unknown-operation"
  | "requires-human-review"
  | "policy-disabled"
  | "missing-context";

export type ExecutionPolicyResult = {
  decision: ExecutionPolicyDecision;
  reason: ExecutionPolicyReason;
  explanation: string;
};

export function evaluateExecutionPolicy(
  step: TransformationStep,
  context: {
    review: MigrationReviewSummary;
    executionCapability: ExecutionCapability | null;
  },
): ExecutionPolicyResult {
  void context.review;

  if (step.kind === "redesign") {
    return {
      decision: "blocked",
      reason: "structural-risk",
      explanation: "Step proposes a redesign and is blocked due to structural risk.",
    };
  }

  if (step.kind === "content-improvement") {
    return {
      decision: "blocked",
      reason: "content-risk",
      explanation: "Step changes content and is blocked due to content risk.",
    };
  }

  if (context.executionCapability === null) {
    return {
      decision: "blocked",
      reason: "unknown-operation",
      explanation: "Unknown operation not supported by execution capability matrix.",
    };
  }

  if (step.kind === "cleanup" && step.safe === true) {
    return {
      decision: "auto-allowed",
      reason: "duplicate-cleanup",
      explanation: "Safe duplicate cleanup can run automatically.",
    };
  }

  if (step.kind === "merge" && step.safe === true) {
    return {
      decision: "auto-allowed",
      reason: "merge-safe",
      explanation: "Safe merge can run automatically.",
    };
  }

  if (step.kind === "reorder" && step.safe === true) {
    return {
      decision: "auto-allowed",
      reason: "layout-normalization",
      explanation: "Safe layout normalization can run automatically.",
    };
  }

  if (step.kind === "add-section") {
    return {
      decision: "approval-required",
      reason: "structural-risk",
      explanation: "Step modifies page structure and requires human approval.",
    };
  }

  if (step.kind === "replace-section") {
    return {
      decision: "approval-required",
      reason: "structural-risk",
      explanation: "Step modifies page structure and requires human approval.",
    };
  }

  if (step.source === "optimization" && step.kind !== "cleanup") {
    return {
      decision: "approval-required",
      reason: "content-risk",
      explanation: "Optimization-sourced step may change meaning and requires human approval.",
    };
  }

  return {
    decision: "approval-required",
    reason: "requires-human-review",
    explanation: "Step requires human approval by default.",
  };
}

