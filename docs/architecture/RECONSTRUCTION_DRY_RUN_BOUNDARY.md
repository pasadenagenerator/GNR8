# Reconstruction Dry Run Boundary

## Purpose

Phase 8A-1 defines the deterministic contract boundary between an approved Reconstruction Package and a future Reconstruction Dry Run package.

Phase 8A-2 extends that boundary with a deterministic Simulation Plan contract. The Simulation Plan answers what a future dry run would attempt to simulate, without executing simulation.

The contract answers one question:

> Can the control plane produce a valid planned Dry Run Package from reviewed reconstruction candidates?

8A-2 asks:

> What would a dry run attempt to simulate?

These phases do not perform dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, runtime content writes, worker dispatch, migration execution, domain changes, DNS changes, live website creation, approval execution, or publishing.

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
- `status`
- `simulationStatus`
- `simulationArtifacts`
- `limitations`
- `warnings`
- `blockers`
- `generatedOutputs`
- `createdAt`

The 8A-2 Simulation Plan contract preserves:

- `simulationPlanId`
- `dryRunId`
- `reconstructionPackageId`
- `siteVersionId`
- `routeScope`
- `planStatus`
- `plannedSteps`
- `requiredInputs`
- `expectedOutputs`
- `limitations`
- `blockers`
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

At dry-run package creation time, `generatedOutputs` is always an empty array. No generated outputs are required or produced by the 8A-1 builder.

At simulation-plan creation time, `expectedOutputs` contains only planned descriptors. These descriptors are not generated outputs, simulation artifacts, React, blocks, editable content, persisted data, publishable artifacts, or approved reconstruction output.

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

Allowed `ReconstructionSimulationPlanStatus` values:

- `not_started`
- `planned`
- `blocked`

Simulation Plan status has no `running`, `executed`, `completed`, `complete`, or `simulated` state.

## Package Creation Rules

`createReconstructionDryRunPackage(...)` consumes a `ReconstructionPackage` and returns a metadata-only `ReconstructionDryRunPackage`.

Deterministic creation rules:

- `executionReadiness = ready_for_dry_run` creates `status = planned`.
- A planned package starts with `simulationStatus = pending`.
- A planned package starts with `generatedOutputs = []`.
- A planned package starts with `blockers = []`.
- Any package that is not ready for dry run creates `status = blocked`.
- A blocked package starts with `simulationStatus = unavailable`.
- A blocked package includes blockers explaining why it cannot be planned.
- The builder never creates simulation artifacts.
- The builder never creates generated outputs.

The builder does not accept status, simulation status, simulation artifact, blocker, or generated output overrides.

## Simulation Plan Boundary

`createReconstructionSimulationPlan(...)` consumes a `ReconstructionDryRunPackage` and returns a metadata-only `ReconstructionSimulationPlan`.

Deterministic creation rules:

- A planned Dry Run Package creates `planStatus = planned`.
- A planned Simulation Plan includes deterministic planned steps.
- A blocked Dry Run Package creates `planStatus = blocked`.
- A blocked Simulation Plan carries blockers from the Dry Run Package.
- A blocked Simulation Plan does not create planned steps.
- The builder never creates generated outputs.
- The builder never creates simulation artifacts.
- The builder never executes simulation, reconstruction, AI generation, React generation, block generation, persistence, workers, or publishing.

## Planned Step Model

Allowed `ReconstructionSimulationStep.stepType` values:

- `validate_package`
- `load_evidence`
- `map_candidates`
- `plan_route_model`
- `plan_section_model`
- `plan_block_model`
- `plan_content_model`
- `plan_design_tokens`
- `plan_navigation`
- `produce_simulation_summary`

Each planned step includes:

- `stepId`
- `stepType`
- `status`
- `requiredInputs`
- `expectedOutputs`
- `blockers`
- `notes`

For planned Simulation Plans, each step starts with `status = planned`. Step expected outputs are planned descriptors only and do not represent generated output or simulation artifacts.

## Eligibility

`evaluateDryRunEligibility(...)` consumes a `ReconstructionPackage` and returns only `eligible` or `not_eligible` metadata.

Deterministic rules:

- `executionReadiness = ready_for_dry_run` -> eligible
- `executionReadiness = not_ready` -> not eligible
- `packageStatus = needs_more_evidence` -> not eligible
- `packageStatus = blocked` -> not eligible

Only `ready_for_dry_run` is eligible for the future Dry Run boundary. `ready_for_future_execution` is outside this dry-run boundary and still requires a later explicit approval phase.

## Validation Rules

`validateReconstructionDryRunPackage(...)` validates the creation-time package contract and returns:

- `valid`
- `errors`
- `warnings`

Validation checks:

- `dryRunId` exists.
- `reconstructionPackageId` exists.
- `siteVersionId` exists.
- `routeScope` exists.
- `status` is a known dry-run status.
- `simulationStatus` is a known simulation status.
- no generated outputs are required at creation time.
- generated outputs must be empty at creation time.
- blocked packages must include blockers.
- planned packages must not have generated outputs.
- simulation artifacts must be empty before dry-run execution exists.
- builder-created packages must not be `simulated`.
- builder-created packages must not have `simulationStatus = complete`.
- output remains informational only.
- future approval remains required.

`validateReconstructionSimulationPlan(...)` validates the planning-only Simulation Plan contract and returns:

- `valid`
- `errors`
- `warnings`

Simulation Plan validation checks:

- `simulationPlanId` exists.
- `dryRunId` exists.
- `reconstructionPackageId` exists.
- `siteVersionId` exists.
- `routeScope` exists.
- `planStatus` is one of `not_started`, `planned`, or `blocked`.
- planned Simulation Plans include planned steps.
- blocked Simulation Plans include blockers.
- each planned step has a known step type.
- each step status is planning-only.
- expected outputs are planned descriptors only.
- generated output shapes are rejected.
- simulation artifacts are rejected.
- executed, running, completed, complete, and simulated states are rejected.

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

Phase 8A-1 adds only deterministic contracts, package creation, package validation, tests, and documentation.

Phase 8A-2 adds only deterministic Simulation Plan contracts, Simulation Plan creation, Simulation Plan validation, tests, and documentation.

Safety guarantees:

- no importer behavior changes
- no Evidence Capture behavior changes
- no Original Mirror behavior changes
- no preview behavior changes
- no candidate discovery behavior changes
- no candidate review behavior changes
- no dry-run execution
- no simulation execution
- no reconstruction execution
- no AI generation
- no React generation
- no block generation
- no persistence schema changes
- no worker execution
- no publishing behavior changes
- no database writes
- no generated outputs
- no simulation artifacts
- no package can be marked `simulated` by the builder
- no package can be marked `complete` by the builder
- no Simulation Plan can be marked running, executed, completed, complete, or simulated by the builder
- future execution remains disabled and approval-gated

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
- Reconstruction Package can be converted into a planned or blocked Dry Run Package contract.
- Dry Run Package contract can be validated without executing a dry run.
- Dry Run Package can be converted into a planned or blocked Simulation Plan contract.
- Simulation Plan contract can be validated without executing simulation.
- A planned Dry Run has a deterministic Simulation Plan.

NOT IMPLEMENTED YET after 8A-2:

- Dry Run execution
- simulation execution
- simulation artifact production
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
