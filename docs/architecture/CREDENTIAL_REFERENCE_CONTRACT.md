# GNR8 Credential Reference Contract (Architecture Draft)

## Status
- Draft: canonical architecture direction
- Scope: documentation and contract language only
- Non-goals: no runtime changes, no database changes, no API changes, no secret storage, no secret resolution, no provider execution

## Purpose
Credential Reference is metadata only.

It does not contain secrets.

Credential Reference Registry Preview is now implemented as deterministic read-model metadata:
- `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.ts`

Boundary remains explicit:
- no secret storage
- no secret resolution
- no provider authorization
- no provider execution
- no writes

## Core Fields
Canonical Credential Reference fields:
- `credentialReferenceId`
- `providerId`
- `bindingScope` (`global` | `agency` | `project` | `environment`)
- `ownerScope`
- `environmentScope`
- `secretType`
- `status`
- `resolutionState`
- `executionAllowed`
- `executionBlocked`

## States
Canonical credential reference states:
- `missing`
- `configured_reference_only`
- `resolution_disabled`
- `resolution_ready`
- `execution_blocked`

## Ownership Model
Canonical ownership scopes:
- `global`
- `agency`
- `project`
- `environment`

## Security Boundary
Credential reference is not credential material and is not an authorization primitive.

Explicitly:
- credential reference != credential
- credential reference != secret
- credential reference != authorization

## Secret Resolution Architecture Alignment
Canonical secret resolution architecture is defined in:
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`

Canonical authorization context contract is defined in:
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`

Contract alignment rules:
- Credential Reference stays metadata-only.
- Secret resolution is a separate future control-plane concern.
- Any future resolver consumes approved references and returns temporary authorization context only.
- Authorization context shape/lifecycle/safety requirements must follow the canonical authorization context contract.
- No raw secret exposure is allowed.
- Authorization context does not imply mutation permission.

## Future Integration Points
This contract is the canonical architecture anchor for future integration with:
- Provider Fleet
- Environment Awareness
- Credential Boundary Preview
- Credential Boundary Advisor
- Credential Reference Registry Preview
- Secret Resolution Architecture
- Future Secret Manager
- Future Execution Plane

## Explicit Boundary
Design plus deterministic read-model preview only.

No implementation.

No storage.

No resolution.

No execution.

## Success Condition
GNR8 has a canonical credential contract defined before any registry, database, secret manager, or provider execution work begins.
