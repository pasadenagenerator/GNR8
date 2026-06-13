# Reconstruction Package Contract

## Purpose

Phase 7F-14 defines the deterministic contract for the future Reconstruction Package.

The contract answers one question:

> What exact package is handed from Candidate Review into future Reconstruction?

This phase does not perform reconstruction, execute approval, generate output, persist reconstruction state, dispatch workers, or publish anything.

Canonical TypeScript contract:

- `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`

## Boundary

This phase is architecture contracts, package modeling, and documentation only.

Implemented now:

- metadata-only `ReconstructionPackage`
- approved candidate handoff shape
- reconstruction intent values
- package status values
- execution readiness values
- deterministic package builder from Candidate Review metadata
- deterministic package summary helper

Not changed:

- importer behavior
- Evidence Capture behavior
- Original Mirror behavior
- preview behavior
- candidate discovery execution
- candidate review execution
- reconstruction execution
- AI generation
- React generation
- block generation
- persistence schema
- worker execution
- publishing behavior

Not added:

- LLM calls
- semantic extraction engines
- reconstruction persistence
- reconstruction workers
- approval execution
- publishing execution
- generated React
- generated GNR8 blocks

## Inputs

The Reconstruction Package consumes only a `ReconstructionCandidateReviewPackage`.

Input fields carried forward:

- `reviewPackageId`
- `discoveryPackageId`
- `planningPackageId`
- `siteVersionId`
- `routeScope`
- `readinessLevel`
- `reviewStatus`
- `candidateReviews`
- `notes`
- `reviewedAt`

The builder does not inspect raw evidence, screenshots, DOM, storage, jobs, workers, preview output, AI output, or persisted reconstruction state.

## Outputs

Future Candidate Review may produce a metadata-only reconstruction package:

- `reconstructionPackageId`
- `reviewPackageId`
- `discoveryPackageId`
- `planningPackageId`
- `siteVersionId`
- `routeScope`
- `readinessLevel`
- `packageStatus`
- `approvedCandidates`
- `deferredCandidates`
- `unsupportedCandidates`
- `requiredEvidenceRefs`
- `limitations`
- `reconstructionInstructions`
- `executionReadiness`
- `createdAt`

Current system state maps to:

- no persisted reconstruction package
- no approval execution
- no reconstruction execution
- no generated React
- no generated GNR8 blocks

## Approved Candidate Contract

Each `ApprovedReconstructionCandidate` contains:

- `candidateId`
- `candidateType`
- `sourceRoute`
- `evidenceRefs`
- `confidenceLevel`
- `limitations`
- `reviewerNotes`
- `reconstructionIntent`

Allowed `ReconstructionIntent` values:

- `recreate_as_native_block`
- `preserve_as_embed`
- `preserve_as_external_widget`
- `convert_to_runtime_provider`
- `defer`
- `unsupported`

The Phase 7F-14 builder assigns deterministic default intents from review metadata. This is only planning metadata and does not generate or execute anything.

## Package Status Model

Allowed `ReconstructionPackageStatus` values:

- `draft`
- `ready_for_reconstruction`
- `needs_more_evidence`
- `blocked`
- `archived`

Status derivation:

- any `needs_more_evidence` review decision -> `needs_more_evidence`
- any blocker limitation -> `blocked`
- one or more approved candidates with no blocker limitation -> `ready_for_reconstruction`
- no approved candidates -> `draft`

`archived` is reserved for future lifecycle modeling and is not produced by the Phase 7F-14 builder.

## Execution Readiness Model

Allowed `ReconstructionExecutionReadiness` values:

- `not_ready`
- `ready_for_dry_run`
- `ready_for_future_execution`

Readiness derivation:

- no approved candidates -> `not_ready`
- any `needs_more_evidence` review -> `not_ready`
- approved candidates plus no blocker limitations -> `ready_for_dry_run`
- future execution remains blocked by default

The Phase 7F-14 builder does not return `ready_for_future_execution`. That value is reserved for a later explicit approval and control-plane phase.

## Package Builder Helper

`createReconstructionPackageFromReview(...)` maps Candidate Review metadata into a contract-only Reconstruction Package.

Builder behavior:

- review, discovery, planning, site version, route-scope, and readiness lineage is preserved from Candidate Review metadata
- approved review items become `approvedCandidates`
- deferred decisions become `deferredCandidates`
- unsupported decisions become `unsupportedCandidates`
- rejected decisions are excluded from candidate buckets but counted in limitations and notes
- `needs_more_evidence` forces `packageStatus = needs_more_evidence`
- required evidence refs are deduplicated from approved candidate evidence refs
- execution instructions explicitly keep execution and output generation disabled

## Summary Helper

`summarizeReconstructionPackage(...)` returns:

- approved count
- deferred count
- unsupported count
- package status
- execution readiness
- blocker count
- limitation count

The helper only summarizes an existing package. It does not review candidates, validate evidence, call AI, persist anything, approve execution, trigger reconstruction, generate React, generate blocks, or publish.

## Future Dry-Run Boundary

Phase 7F-14 stops at a metadata statement:

> This reviewed candidate package is ready for a future dry-run reconstruction.

`ready_for_dry_run` means the package is eligible for a later dry-run contract. It does not authorize reconstruction execution, approval execution, generated output, worker dispatch, persistence, or publishing.

## Flow

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
Future Dry Run
    ↓
Future Reconstruction
    ↓
Future Publish
```

Implemented boundary:

- Reconstruction Package

NOT IMPLEMENTED YET after Reconstruction Package:

- Future Dry Run
- Future Reconstruction
- Future Publish
- approval execution
- reconstruction execution
- AI reconstruction
- React generation
- block generation
- editable content model generation
- reconstruction workers
- reconstruction persistence
- publishing
