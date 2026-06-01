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
- no approvals exist
- no execution is enabled

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

Execution Plan Preview Runtime v1 dependency checkpoint (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-execution-plan-preview.ts`
  - `apps/platform/gnr8/runtime/twin/twin-execution-plan-preview.test.ts`
- function:
  - `generateTwinExecutionPlanPreviews(approvalPreviews)`
- verified deployed Execution Plan Preview artifacts for `Transporti Maver`:
  1. `Improve Homepage Conversion Flow`
     - `executionState`: `preview_only`
     - planned actions:
       - `analyze_homepage_conversion_flow`
       - `identify_primary_conversion_path`
       - `prepare_conversion_improvement_plan`
  2. `Improve Homepage Quality and Messaging`
     - `executionState`: `preview_only`
     - planned actions:
       - `analyze_homepage_content`
       - `identify_messaging_improvements`
       - `prepare_content_improvement_plan`
  3. `Maintain Read-Only Validation Mode`
     - `executionState`: `preview_only`
     - planned actions:
       - `maintain_read_only_runtime`
       - `continue_validation_observation`
- governance values:
  - `executionBlocked`: `true`
  - `providerExecutionAllowed`: `false`
  - `publishingAllowed`: `false`
  - `mutationAllowed`: `false`
  - `governanceState`: `preview_non_executable`
- diagnostics:
  - `TWIN_EXECUTION_PLAN_PREVIEW_STARTED`
  - `TWIN_EXECUTION_PLAN_PREVIEW_COMPLETED`
- preserved execution boundary:
  - no execution
  - no approval workflow
  - no provider execution
  - no publishing
  - no mutation execution
  - no AI model calls

## Success Condition
GNR8 has a complete governance chain from provider contract to execution approval before implementing execution.
