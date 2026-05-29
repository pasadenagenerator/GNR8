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

## Success Condition
GNR8 has a complete governance chain from provider contract to execution approval before implementing execution.
