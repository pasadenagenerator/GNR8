# GNR8 Execution Approval Contract (Architecture Draft)

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no database changes, no APIs, no provider execution, no writes

## Purpose
Execution Approval represents a governed authorization decision allowing a specific operation to proceed.

## Core Fields
Canonical Execution Approval fields:
- `approvalId`
- `approvalType`
- `providerId`
- `providerCategory`
- `environmentScope`
- `operationKind`
- `requestedCapability`
- `authorizationContextId`
- `correlationKey`
- `reason`
- `requestedBy`
- `approvedBy`
- `approvedAt`
- `expiresAt`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

## Approval Types
Canonical approval types:
- `manual`
- `policy`
- `system`
- `emergency`

## Safety Requirements
Any future implementation must enforce:
- approval required
- provider-bound
- environment-bound
- capability-bound
- operation-bound
- time-bound
- auditable
- revocable

## Explicit Boundaries
- approval != execution
- approval != authorization context
- approval != secret resolution

## Lifecycle
Canonical lifecycle states:
- `requested`
- `reviewed`
- `approved`
- `rejected`
- `expired`
- `revoked`
- `executed`

## Current State
Design only.

Explicitly:
- no executable approvals exist
- no execution is enabled

Approval State Runtime v1 dependency checkpoint (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-approval-state.ts`
  - `apps/platform/gnr8/runtime/twin/twin-approval-state.test.ts`
- function:
  - `generateTwinApprovalStateRecords(approvalRecords)`
- approval state model:
  - `TwinApprovalState`
  - `approval_required`
  - `pending_review`
  - `ready_for_future_approval`
- current runtime emission:
  - `pending_review` only
  - future state support exists through typing/contracts only
- approval state record fields:
  - `approvalId`
  - `proposalId`
  - `proposalTitle`
  - `approvalState`
  - `requiredApprovals`
  - `receivedApprovals`
  - `approvalComplete`
  - `executionAllowed`
  - `mutationAllowed`
  - `publishingAllowed`
  - `providerExecutionAllowed`
  - `governanceState`
  - `summary`
- verified deployed approval state records for `Transporti Maver`:
  - `proposalTitle`: `Improve Homepage Conversion Flow`
  - `approvalState`: `pending_review`
  - `requiredApprovals`: `1`
  - `receivedApprovals`: `0`
  - `approvalComplete`: `false`
  - `governanceState`: `approval_state_preview_only`
  - all deployed approval state records currently share identical `governanceState`
- diagnostics:
  - `TWIN_APPROVAL_STATE_STARTED`
  - `TWIN_APPROVAL_STATE_COMPLETED`
- preserved execution boundary:
  - no approval workflow
  - no approve action
  - no reject action
  - no request-review action
  - no execution
  - no provider execution
  - no publishing
  - no mutation execution
  - no AI model calls
  - read-only deterministic state modeling only

Approval Queue Preview Runtime v1 dependency checkpoint (`2026-06-02`):
- completion date:
  - `2026-06-02`
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.ts`
  - `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.test.ts`
- function:
  - `generateTwinApprovalQueueItems(approvalStates, proposalCandidates)`
- approval queue item fields:
  - `queueId`
  - `proposalId`
  - `proposalTitle`
  - `approvalState`
  - `queueRank`
  - `queuePriority`
  - `optimizationScore`
  - `governanceState`
  - `executionAllowed`
  - `mutationAllowed`
  - `publishingAllowed`
  - `providerExecutionAllowed`
  - `summary`
- verified deployed Approval Queue for `Transporti Maver`:
  - `#1 Improve Homepage Conversion Flow`
    - `queuePriority`: `high`
    - `optimizationScore`: `390`
    - `approvalState`: `pending_review`
  - `#2 Improve Homepage Quality and Messaging`
    - `queuePriority`: `medium`
    - `optimizationScore`: `340`
    - `approvalState`: `pending_review`
  - `#3 Maintain Read-Only Validation Mode`
    - `queuePriority`: `medium`
    - `optimizationScore`: `320`
    - `approvalState`: `pending_review`
- governance values:
  - `executionAllowed`: `false`
  - `mutationAllowed`: `false`
  - `publishingAllowed`: `false`
  - `providerExecutionAllowed`: `false`
  - `governanceState`: `approval_queue_preview_only`
- diagnostics:
  - `TWIN_APPROVAL_QUEUE_PREVIEW_STARTED`
  - `TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED`
- preserved execution boundary:
  - no approval workflow
  - no approval state changes
  - no approve action
  - no reject action
  - no review action
  - no request approval action
  - no execution
  - no publishing
  - no provider execution
  - no mutation execution
  - no AI model calls
  - read-only deterministic queue preview only
- conclusion:
  - Workspace Planning Console now displays a deterministic Approval Queue derived from Approval State records and ranked Proposal Candidates.
- recommended next milestone:
  - `Execution Readiness Runtime v1`

Website OS Proposal Candidate Runtime v1 dependency checkpoint (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`
- function:
  - `generateTwinProposalCandidates(input)`
- current proposal candidate execution state:
  - all candidates are `executionState=blocked`
- verified deployed Proposal Candidates for `Transporti Maver`:
  - `#1 Improve Homepage Conversion Flow status=proposal_candidate executionState=blocked rank=1 score=390`
  - `#2 Improve Homepage Quality and Messaging status=proposal_candidate executionState=blocked rank=2 score=340`
  - `#3 Maintain Read-Only Validation Mode status=proposal_candidate executionState=blocked rank=3 score=320`
- preserved execution boundary:
  - non-executable read-only candidates only
  - no provider execution
  - no approval workflow yet

Execution Artifact Preview Runtime v1 dependency checkpoint (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.ts`
  - `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.test.ts`
- function:
  - `generateTwinExecutionArtifactPreviews(executionPlanPreviews)`
- verified deployed Execution Artifact Preview artifacts for `Transporti Maver`:
  1. `Improve Homepage Conversion Flow`
     - `artifactType`: `conversion_improvement_plan`
     - affected areas:
       - `homepage`
       - `primary_conversion_path`
     - planned outputs:
       - `conversion_review_document`
       - `conversion_improvement_plan`
  2. `Improve Homepage Quality and Messaging`
     - `artifactType`: `content_improvement_plan`
     - affected areas:
       - `homepage_hero`
       - `homepage_messaging`
     - planned outputs:
       - `messaging_review_document`
       - `content_improvement_plan`
  3. `Maintain Read-Only Validation Mode`
     - `artifactType`: `validation_continuation_plan`
     - affected areas:
       - `runtime_governance`
     - planned outputs:
       - `validation_status_report`
- governance values:
  - `executionState`: `preview_only`
  - `mutationBlocked`: `true`
  - `governanceState`: `preview_non_executable`
- diagnostics:
  - `TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED`
  - `TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED`
- preserved execution boundary:
  - no execution
  - no artifact generation
  - no approval workflow
  - no provider execution
  - no publishing
  - no mutation execution
  - no AI model calls

## Success Condition
GNR8 has a complete governance chain from provider contract to execution approval before implementing execution.
