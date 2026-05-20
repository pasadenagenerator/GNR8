import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderOperationApprovalArtifact } from "@/gnr8/runtime/providers/runtime-provider-operation-approval-artifact";

export type ProviderOperationApprovalState = "pending" | "approved" | "rejected" | "expired" | "blocked";

export type ProviderOperationApprovalTransitionReport = {
  status: "applied" | "rejected";
  previousState: ProviderOperationApprovalState;
  requestedState: ProviderOperationApprovalState;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export type ProviderOperationApprovalTransitionContext = {
  approvalArtifact?: Pick<RuntimeProviderOperationApprovalArtifact, "artifactId" | "environment" | "approvalStatus">;
};

const ALLOWED_TRANSITIONS = new Set<string>([
  "pending->approved",
  "pending->rejected",
  "pending->expired",
  "pending->blocked",
]);

function transitionKey(previousState: ProviderOperationApprovalState, requestedState: ProviderOperationApprovalState): string {
  return `${previousState}->${requestedState}`;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function isLiveEnvironment(context?: ProviderOperationApprovalTransitionContext): boolean {
  return context?.approvalArtifact?.environment === "live";
}

function isBlockedArtifact(context?: ProviderOperationApprovalTransitionContext): boolean {
  return context?.approvalArtifact?.approvalStatus === "blocked";
}

export function canTransitionProviderOperationApprovalState(
  previousState: ProviderOperationApprovalState,
  requestedState: ProviderOperationApprovalState,
): boolean {
  return ALLOWED_TRANSITIONS.has(transitionKey(previousState, requestedState));
}

export function createProviderOperationApprovalTransitionReport(
  previousState: ProviderOperationApprovalState,
  requestedState: ProviderOperationApprovalState,
  context?: ProviderOperationApprovalTransitionContext,
): ProviderOperationApprovalTransitionReport {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const transitionAllowed = canTransitionProviderOperationApprovalState(previousState, requestedState);

  if (!transitionAllowed) warnings.push("invalid_transition");
  if (requestedState === "approved" && isBlockedArtifact(context)) blockers.push("blocked_artifact_cannot_be_approved");
  if (requestedState === "approved" && isLiveEnvironment(context)) blockers.push("live_environment_cannot_be_approved");

  const uniqueWarnings = uniqueSorted(warnings);
  const uniqueBlockers = uniqueSorted(blockers);
  const status: ProviderOperationApprovalTransitionReport["status"] =
    transitionAllowed && uniqueBlockers.length === 0 ? "applied" : "rejected";

  const correlationKey = createRuntimeCorrelationKey({
    artifactId: context?.approvalArtifact?.artifactId ?? "",
    environment: context?.approvalArtifact?.environment ?? "",
    approvalStatus: context?.approvalArtifact?.approvalStatus ?? "",
    previousState,
    requestedState,
    status,
    warnings: uniqueWarnings.join(","),
    blockers: uniqueBlockers.join(","),
  });

  return {
    status,
    previousState,
    requestedState,
    warnings: uniqueWarnings,
    blockers: uniqueBlockers,
    correlationKey,
  };
}

export function applyProviderOperationApprovalStateTransition(
  approvalArtifact: RuntimeProviderOperationApprovalArtifact,
  previousState: ProviderOperationApprovalState,
  requestedState: ProviderOperationApprovalState,
): ProviderOperationApprovalTransitionReport {
  return createProviderOperationApprovalTransitionReport(previousState, requestedState, {
    approvalArtifact: {
      artifactId: approvalArtifact.artifactId,
      environment: approvalArtifact.environment,
      approvalStatus: approvalArtifact.approvalStatus,
    },
  });
}
