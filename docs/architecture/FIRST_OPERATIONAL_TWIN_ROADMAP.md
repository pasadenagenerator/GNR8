# First Operational Twin Roadmap

## Status
- Milestone update: Twin Runtime Types and Deterministic Builder completed (2026-05-30)
- Scope: roadmap + completion checkpoint
- Non-goals unchanged: no APIs, no UI implementation, no database changes

Completed in runtime:
- `apps/platform/gnr8/runtime/twin/twin-types.ts`
- `apps/platform/gnr8/runtime/twin/twin-builder.ts`
- `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`

## Purpose
Define the shortest path from architecture to the first visible Website Digital Twin inside GNR8.

Canonical runtime source for implementation:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

## Target Outcome
A website can be imported and represented as a Twin.

The Twin is visible in Workspace Overview.

## Required Runtime Components
1. Twin Identity
2. Twin Status
3. Twin Snapshot
4. Twin Metadata
5. Twin Builder
6. Twin Store
7. Twin Viewer
8. Workspace Overview Integration

## Contract Baseline
First operational contract baseline is defined in:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

Baseline guarantees:
- per-site-version twin identity
- deterministic twin status lifecycle (`building`, `ready`, `stale`, `failed`)
- summary/read-model snapshot domains (`contentState`, `designState`, `experienceState`, `governanceState`, `operationalState`)
- metadata + diagnostics for generation provenance and failure reporting
- immutable v1 twin storage by site version
- viewer payload for Workspace Overview (`identity`, `status`, `snapshot`, `metadata`, `diagnostics`)

## Inputs
Canonical first-operational inputs:
- Import Pipeline
- Canonical Models
- Site Version
- Provider State

## Outputs
Canonical first-operational outputs:
- Twin Identity
- Twin Status
- Twin Snapshot
- Twin Metadata
- Twin Diagnostics

## Out of Scope
- Website Health scoring
- Content/Design/Experience scoring
- AI recommendations
- Optimization opportunities
- Proposal generation
- Runtime observation engine
- Runtime optimization engine
- AI Editing
- Publish execution
- Publish automation

## Success Criteria
- website imported
- twin generated
- twin stored
- twin displayed

Milestone validation:
- twin-builder tests passed
- next build passed

Implementation readiness checkpoint from this roadmap + contract:
- TypeScript twin runtime types can be implemented without architectural invention
- deterministic builder/store/viewer can be implemented against the contract
- tests can be authored against existing site/version fixtures

## Dependencies
- Phase A: Website Workspace Foundation
- Phase B: Canonical Model Runtime
- Phase C: Digital Twin Runtime

## Risks
- model incompleteness
- state synchronization
- version drift

## Recommended Sequence
1. Twin runtime types (contract-exact)
2. Deterministic Twin Builder (contract-exact)
3. Twin Store (immutable per site version)
4. Twin Viewer payload projection
5. Workspace Overview integration
6. Fixture-based runtime tests

## Success
GNR8 gains the first operational runtime representation of a website.

Current completion checkpoint:
- first runtime Website Digital Twin object implemented
- deterministic builder implemented
- persistence/API/UI still intentionally not implemented

Recommended next milestone:
- Twin In-Memory Store / Read-Model Store

## Related Canonical Documents
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/WEBSITE_OS_IMPLEMENTATION_ROADMAP.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
