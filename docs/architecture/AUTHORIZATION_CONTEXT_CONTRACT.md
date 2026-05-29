# GNR8 Authorization Context Contract (Architecture Draft)

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no database changes, no APIs, no secret storage, no secret resolution, no provider execution, no writes

## Purpose
Authorization Context is a temporary, scoped, redacted provider access context.

It is produced by future secret resolution.

It does NOT expose raw secrets.

It does NOT itself authorize mutation unless governance separately allows execution.

Canonical Execution Approval contract is defined in:
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`

## Core Fields
Canonical Authorization Context fields:
- `authorizationContextId`
- `credentialReferenceId`
- `providerId`
- `providerCategory`
- `environmentScope`
- `bindingScope`
- `allowedCapabilities`
- `allowedOperationKinds`
- `expiresAt`
- `issuedAt`
- `issuedBy`
- `correlationKey`
- `redactedEvidence`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

## Safety Requirements
Any future implementation must enforce:
- temporary
- scoped
- least privilege
- redacted
- auditable
- approval-bound
- environment-bound
- provider-bound
- operation-bound

## Explicit Boundaries
- authorization context != secret
- authorization context != provider execution
- authorization context != mutation approval
- authorization context != permanent credential
- authorization context != execution approval

## Lifecycle
Canonical lifecycle states:
- `requested`
- `validated`
- `issued`
- `expired`
- `revoked`
- `rejected`

## Future Integration Points
This contract is intended to integrate with:
- Secret Resolution Architecture
- Provider Execution Workers
- AI Routing Governance
- Credential Reference Registry
- Execution Approval Flow
- Audit Trail

## Current State
Design only.

Explicitly:
- no authorization contexts are created
- no secrets are resolved
- no provider execution is enabled

## Success Condition
GNR8 has a canonical authorization context contract before secret resolution or provider execution is implemented.
