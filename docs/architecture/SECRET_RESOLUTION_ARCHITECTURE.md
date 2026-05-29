# GNR8 Secret Resolution Architecture (Design Draft)

## Status
- Draft: canonical architecture direction
- Scope: architecture/docs only
- Non-goals: no runtime changes, no database changes, no APIs, no secret storage, no secret resolution, no provider execution, no writes

## Purpose
Secret resolution converts an approved credential reference into a temporary provider authorization context.

Canonical Authorization Context contract is defined in:
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`

Canonical Execution Approval contract is defined in:
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`

## Explicit Distinctions
- credential reference != secret
- secret resolution != credential storage
- secret resolution != provider execution
- authorization context != permission to mutate
- execution approval != secret resolution

## Future Resolver Inputs
Canonical resolver input contract:
- `credentialReferenceId`
- `providerId`
- `bindingScope`
- `ownerScope`
- `environmentScope`
- `requestedCapability`
- `requestedOperationKind`
- `correlationKey`
- `approvalContext`

## Future Resolver Outputs
Canonical resolver output contract:
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

## Required Safety Controls
Any future implementation must enforce:
- approval required
- scope matching
- provider/capability matching
- environment matching
- audit trail
- redaction
- TTL / expiry
- least privilege
- no raw secret exposure

## Boundary
Current state is design-only.

Explicitly:
- no secrets are stored
- no secrets are resolved
- no provider authorization context is created
- no provider execution is enabled

## Future Integration Points
This architecture is intended to integrate with:
- Credential Reference Registry
- Provider Fleet
- Environment Awareness
- Execution Governance
- Execution Approval Flow
- Provider Execution Workers
- AI Routing Governance

## Success Condition
GNR8 has a canonical secret resolution architecture before any secret manager or resolver implementation exists.
