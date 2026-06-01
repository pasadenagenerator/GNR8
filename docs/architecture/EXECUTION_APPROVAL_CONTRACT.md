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

## Success Condition
GNR8 has a complete governance chain from provider contract to execution approval before implementing execution.
