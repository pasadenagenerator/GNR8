import "server-only";

import type { ImplementationAuthorizationSelectedRecommendationRef, ImplementationAuthorizationSourceRef } from "./implementation-authorization-bridge";
import type { ImprovementExecutionAafValidationResult } from "./improvement-execution-aaf-validator";
import {
  SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_TYPES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_MODES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES,
  type SingleSiteImprovementExecutionItemType,
  type SingleSiteImprovementExecutionMode,
  type SingleSiteImprovementExecutionStatus,
  type SingleSiteJsonObject,
} from "./single-site-state-contracts";

export {
  SINGLE_SITE_IMPROVEMENT_EXECUTION_ITEM_TYPES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_MODES,
  SINGLE_SITE_IMPROVEMENT_EXECUTION_STATUSES,
  type SingleSiteImprovementExecutionItemType,
  type SingleSiteImprovementExecutionMode,
  type SingleSiteImprovementExecutionStatus,
};

export type ImprovementExecutionAttemptRef = {
  attemptId: string;
  migrationId: string;
  proposalPlanId: string;
  implementationAuthorizationDecisionId: string;
  semanticInputWatermark: string;
};

export type ImprovementExecutionLimitationCarryForward = {
  source:
    | "proposal"
    | "proposal_approval"
    | "implementation_authorization"
    | "execution_time_aaf_validation"
    | "clone_review"
    | "source_evidence_review"
    | "manual";
  limitation: unknown;
  sourceRef?: string | null;
};

export type ImprovementExecutionAuthorizationValidationContract = {
  required: true;
  mustBeExecutionTime: true;
  acceptedModes: readonly ["allowed", "allowed_with_limitations"];
  rejectedModes: readonly ["blocked"];
  result: ImprovementExecutionAafValidationResult;
};

export type ImprovementExecutionIdempotencyDriftContract = {
  correlationId: string;
  idempotencyKey: string;
  semanticInputWatermark: string;
  driftDetected: boolean;
  driftedFields: readonly string[];
};

export type ImprovementExecutionNonApprovalBoundary = {
  contentApprovalGranted: false;
  clientApprovalGranted: false;
  launchApprovalGranted: false;
  publishActivationApprovalGranted: false;
  implementationCompletionIsContentApproval: false;
  implementationCompletionIsClientApproval: false;
  implementationCompletionIsLaunchApproval: false;
  implementationCompletionIsPublishApproval: false;
};

export type ImprovementExecutionMutationBoundary = {
  mutatesRuntimeArtifacts: false;
  mutatesRuntimeSiteVersions: false;
  mutatesActivePointer: false;
  publishes: false;
  callsAiProviders: false;
  callsExternalProviders: false;
  createsGeneratedProposalBundles: false;
};

export type ImprovementExecutionExecutorInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  attempt: ImprovementExecutionAttemptRef;
  mode: SingleSiteImprovementExecutionMode;
  proposalPlanRef: ImplementationAuthorizationSourceRef;
  cloneReviewRef: ImplementationAuthorizationSourceRef;
  cloneSiteVersionRef: ImplementationAuthorizationSourceRef;
  cloneRuntimeArtifactRef: ImplementationAuthorizationSourceRef;
  sourceEvidenceReviewRef: ImplementationAuthorizationSourceRef;
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  limitations: ImprovementExecutionLimitationCarryForward[];
  implementationScopeSummary: string;
  implementationScopeWatermark: string;
  validation: ImprovementExecutionAuthorizationValidationContract;
  idempotency: ImprovementExecutionIdempotencyDriftContract;
  nonApprovalBoundary: ImprovementExecutionNonApprovalBoundary;
  mutationBoundary: ImprovementExecutionMutationBoundary;
  metadataJson?: SingleSiteJsonObject;
};

export type ImprovementExecutionExecutorOutput = {
  status: Extract<SingleSiteImprovementExecutionStatus, "completed" | "completed_with_limitations" | "failed" | "retry_required" | "blocked">;
  semanticOutputWatermark?: string | null;
  outputRefs?: SingleSiteJsonObject;
  improvedCandidateSiteVersionRef?: string | null;
  improvedRuntimeArtifactRef?: string | null;
  limitations?: ImprovementExecutionLimitationCarryForward[];
  warnings?: unknown[];
  failure?: SingleSiteJsonObject;
  evidenceRefs?: SingleSiteJsonObject;
  nonApprovalBoundary: ImprovementExecutionNonApprovalBoundary;
  mutationBoundary: ImprovementExecutionMutationBoundary;
};

export interface FutureSingleSiteImprovementExecutor {
  readonly executorId: string;
  readonly executorName: string;
  readonly executorVersion: string;
  execute(input: ImprovementExecutionExecutorInput): Promise<ImprovementExecutionExecutorOutput>;
}

export const IMPROVEMENT_EXECUTION_REQUIRED_VALIDATION: Omit<ImprovementExecutionAuthorizationValidationContract, "result"> = {
  required: true,
  mustBeExecutionTime: true,
  acceptedModes: ["allowed", "allowed_with_limitations"],
  rejectedModes: ["blocked"],
};

export const IMPROVEMENT_EXECUTION_NON_APPROVAL_BOUNDARY: ImprovementExecutionNonApprovalBoundary = {
  contentApprovalGranted: false,
  clientApprovalGranted: false,
  launchApprovalGranted: false,
  publishActivationApprovalGranted: false,
  implementationCompletionIsContentApproval: false,
  implementationCompletionIsClientApproval: false,
  implementationCompletionIsLaunchApproval: false,
  implementationCompletionIsPublishApproval: false,
};

export const IMPROVEMENT_EXECUTION_NO_RUNTIME_MUTATION_BOUNDARY: ImprovementExecutionMutationBoundary = {
  mutatesRuntimeArtifacts: false,
  mutatesRuntimeSiteVersions: false,
  mutatesActivePointer: false,
  publishes: false,
  callsAiProviders: false,
  callsExternalProviders: false,
  createsGeneratedProposalBundles: false,
};
