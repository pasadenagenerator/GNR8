# Reconstruction Dry Run Boundary

## Purpose

Phase 8A-0 defines the deterministic boundary between a completed Reconstruction Package and a future Reconstruction Dry Run.

The contract answers one question:

> What is a future Reconstruction Dry Run allowed to do?

This phase does not perform dry-run execution, reconstruction execution, AI generation, React generation, block generation, runtime content writes, worker dispatch, migration execution, domain changes, DNS changes, live website creation, approval execution, or publishing.

Canonical TypeScript contract:

- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`

## Inputs

A future Dry Run may read:

- `ReconstructionPackage`
- Evidence Capture artifacts referenced by the package
- Reconstruction Candidates referenced by the package lineage
- Candidate Review decisions referenced by the package lineage

The boundary contract preserves:

- `dryRunId`
- `reconstructionPackageId`
- `siteVersionId`
- `routeScope`
- `packageStatus`
- `executionStatus`
- `simulationStatus`
- `simulationArtifacts`
- `limitations`
- `warnings`
- `blockers`
- `generatedOutputs`
- `createdAt`

## Outputs

A future Dry Run may produce simulation artifacts only.

Allowed generated output shape types:

- `route_model`
- `section_model`
- `block_model`
- `content_model`
- `design_token_model`
- `navigation_model`
- `unknown`

These output types are metadata shapes for future simulated outputs. They are not generated React, generated blocks, generated content, persisted runtime content, publishable artifacts, or approved reconstruction output.

## Status Models

Allowed `ReconstructionDryRunStatus` values:

- `not_started`
- `planned`
- `simulation_ready`
- `simulated`
- `blocked`

Allowed `ReconstructionSimulationStatus` values:

- `unavailable`
- `pending`
- `complete`
- `failed`

These statuses describe only a future dry-run boundary. They do not authorize reconstruction execution, publishing, worker dispatch, persistence, AI calls, React generation, or block generation.

## Eligibility

`evaluateDryRunEligibility(...)` consumes a `ReconstructionPackage` and returns only `eligible` or `not_eligible` metadata.

Deterministic rules:

- `executionReadiness = ready_for_dry_run` -> eligible
- `executionReadiness = not_ready` -> not eligible
- `packageStatus = needs_more_evidence` -> not eligible
- `packageStatus = blocked` -> not eligible

Only `ready_for_dry_run` is eligible for the future Dry Run boundary. `ready_for_future_execution` is outside this dry-run boundary and still requires a later explicit approval phase.

## Restrictions

Dry Run MAY:

- read Reconstruction Package
- read Evidence Capture artifacts
- read Reconstruction Candidates
- read Review decisions
- produce simulation artifacts

Dry Run MUST NOT:

- publish
- modify source site
- modify production content
- execute migrations
- create live websites
- modify domains
- modify DNS
- write runtime content

## Safety Guarantees

Phase 8A-0 adds only deterministic contracts, status models, an eligibility helper, tests, and documentation.

Safety guarantees:

- no importer behavior changes
- no Evidence Capture behavior changes
- no Original Mirror behavior changes
- no preview behavior changes
- no candidate discovery behavior changes
- no candidate review behavior changes
- no reconstruction execution
- no AI generation
- no React generation
- no block generation
- no persistence schema changes
- no worker execution
- no publishing behavior changes
- no database writes

## Approval Requirements

Dry Run output is informational.

Dry Run output is not approved output.

Future approval remains required before any reconstruction execution, AI generation, React generation, block generation, runtime content write, migration execution, live website creation, domain change, DNS change, or publishing action.

## Future Flow

```text
Evidence Capture
    ↓
Readiness
    ↓
Planning Gate
    ↓
Candidate Discovery
    ↓
Candidate Review
    ↓
Reconstruction Package
    ↓
Dry Run
    ↓
Future Approval
    ↓
Future Reconstruction
    ↓
Future Publish
```

Current implemented boundary:

- Reconstruction Package can be evaluated for future Dry Run eligibility.
- Dry Run package shape is defined as contract-only metadata.

NOT IMPLEMENTED YET after Dry Run:

- Future Approval
- Future Reconstruction
- Future Publish
- reconstruction execution
- approval execution
- AI reconstruction
- React generation
- block generation
- editable content model generation
- design token generation
- navigation model generation
- reconstruction workers
- runtime content writes
- publishing
