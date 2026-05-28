# GNR8 Provider Orchestration Contract (Architecture Draft)

## Status
- Draft: canonical architecture direction
- Scope: documentation and contract language only
- Non-goals: no runtime changes, no API changes, no provider execution changes

## Purpose
Define the first canonical contract for how GNR8 should evolve into a multi-provider orchestration and control-plane layer across domain, DNS, availability, and execution provider surfaces.

## Provider Capability
Provider capability expresses what a provider can do at the contract level.

Canonical capability vocabulary:
- `domains`
- `dns`
- `availability`
- `registration`
- `transfer`
- `renewal`
- `execution`

Notes:
- Capability presence does not imply execution permission.
- Capability flags are discovery and routing inputs for orchestration.

## Provider Readiness
Provider readiness expresses operational confidence and lifecycle maturity for a provider/capability pair.

Canonical readiness states:
- `sandbox_verified`
- `production_verified`
- `read_only`
- `execution_enabled`
- `control_plane_only`

Notes:
- Readiness is declarative evidence, not an implicit permission grant.
- `execution_enabled` is future-state only and must remain governed.

## Provider Boundary
Provider boundary expresses what is currently allowed for a provider/capability path.

Canonical boundary states:
- `read_only`
- `mutation_allowed`
- `approval_required`
- `execution_blocked`

Notes:
- Boundaries are enforceable policy constraints.
- Boundary evaluation should fail closed when state is incomplete or contradictory.

## Provider Execution Governance
Future execution governance is approval-driven and evidence-first.

Required governance concepts:
- Approval flow:
  - explicit operator and governance checkpoints before any mutation-capable execution
- Execution plans:
  - deterministic, inspectable plan artifacts before execution intent
- Dry-run/simulation:
  - simulation-first path that can be inspected without provider mutation
- Rollback expectations:
  - defined compensation/rollback posture per provider capability
- Audit trail:
  - immutable event trail for decisions, intents, and outcomes
- Provider mutation review:
  - pre-mutation review surface with boundary/readiness/governance evidence

## Provider Orchestration
Future orchestration should normalize heterogeneous providers behind canonical contracts.

Required orchestration concepts:
- Provider abstraction:
  - provider-specific behavior behind a canonical orchestration interface
- Capability normalization:
  - common capability semantics across providers
- Provider routing:
  - deterministic provider selection by capability, readiness, policy, and priority
- Failover:
  - controlled fallback when a primary provider is unavailable or degraded
- Provider priority:
  - ordered routing strategy with explicit tie-break rules
- Capability discovery:
  - runtime-discoverable capability/readiness/boundary metadata

## Provider Identity
Canonical provider identity model:

```ts
type ProviderIdentity = {
  providerId: string;
  providerType: "domain" | "dns" | "availability" | "execution" | "multi";
  environment: "sandbox" | "production";
  capabilities: string[];
  readiness: string[];
  boundaries: string[];
};
```

Identity semantics:
- `providerId`: stable unique identifier in GNR8 control plane
- `providerType`: primary functional category
- `environment`: contract context for readiness and boundary interpretation
- `capabilities`: declared contract surface
- `readiness`: verified maturity states
- `boundaries`: enforceable execution/mutation limits

## Current Reality (2026-05-28)
- Openprovider is the current reference implementation.
- Current provider surfaces are read-only.
- Execution remains blocked.
- No mutation orchestration exists yet.
- Multi-provider routing/failover abstraction is not implemented yet.

## Future Direction
GNR8 should evolve into a provider orchestration and control-plane layer above multiple infrastructure providers.

Direction principles:
- Vendor-neutral capability contracts
- Explicit readiness and boundary policy
- Approval-governed execution
- Deterministic routing and failover behavior
- Auditability by default

This document is an architecture draft and does not promise implementation timelines.
