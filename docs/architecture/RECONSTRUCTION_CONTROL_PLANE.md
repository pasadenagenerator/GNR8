# Reconstruction Control Plane

## Purpose

Phase 7F-15 closes the deterministic Reconstruction Control Plane from Evidence Capture through Reconstruction Package.

This document answers:

> Do we have a complete deterministic control-plane contract from Evidence Capture to Future Dry Run?

Answer: yes, through the metadata-only Reconstruction Package. Future Dry Run, Future Reconstruction, and Future Publish are not implemented yet.

This closure does not execute reconstruction, approve execution, call AI systems, generate React, generate GNR8 blocks, persist reconstruction state, dispatch workers, change capture, change preview, change importer behavior, or publish anything.

## Full Control-Plane Diagram

```text
Evidence Capture
    |
    v
Original Mirror Fidelity
    |
    v
Reconstruction Readiness
    |
    v
Planning Gate
    |
    v
Candidate Discovery
    |
    v
Candidate Review
    |
    v
Reconstruction Package
    |
    v
Future Dry Run              NOT IMPLEMENTED YET
    |
    v
Future Reconstruction       NOT IMPLEMENTED YET
    |
    v
Future Publish              NOT IMPLEMENTED YET
```

## Contract Chain

| Layer | Canonical Contract | Current Implementation Status | Handoff Fields |
|---|---|---|---|
| Evidence Capture | `EvidenceCaptureArtifact` | Contract exists; baseline persistence exists through `evidence_capture_baseline`; full reconstruction-grade artifact is still partial. | `status`, `source`, `route`, `rendered`, `fidelityLimitations`, evidence refs. |
| Reconstruction Input | `ReconstructionInputArtifact` | Contract exists as maximum allowed evidence input; no reconstruction consumes it yet. | Required/optional evidence, readiness assessment, confidence input definitions, unsupported field list. |
| Planning Gate | `ReconstructionPlanningPackage` | Metadata-only builder and eligibility helper exist. | `packageId`, `siteVersionId`, `routeScope`, `readinessLevel`, blockers, limitations, evidence summary, `reviewStatus`. |
| Candidate Discovery | `ReconstructionCandidateDiscoveryPackage` | Metadata-only builder and eligibility helper exist; discovery execution does not exist. | `packageId`, `planningPackageId`, `siteVersionId`, `routeScope`, `readinessLevel`, `discoveryStatus`, candidates, limitations. |
| Candidate Review | `ReconstructionCandidateReviewPackage` | Metadata-only builder, eligibility helper, and summary helper exist; review execution and persistence do not exist. | `reviewPackageId`, `discoveryPackageId`, `planningPackageId`, `siteVersionId`, `routeScope`, `readinessLevel`, `reviewStatus`, candidate reviews. |
| Reconstruction Package | `ReconstructionPackage` | Metadata-only builder and summary helper exist; dry-run and reconstruction execution do not exist. | `reconstructionPackageId`, `reviewPackageId`, `discoveryPackageId`, `planningPackageId`, `siteVersionId`, `routeScope`, `readinessLevel`, `packageStatus`, candidates, limitations, execution lock, `executionReadiness`. |

## Chain Audit

| Check | Result |
|---|---|
| IDs line up | PASS. Planning has `packageId`; Discovery links with `planningPackageId`; Review links with `discoveryPackageId` and now carries `planningPackageId`; Package links with `reviewPackageId`, `discoveryPackageId`, and `planningPackageId`. |
| `siteVersionId` is carried consistently | PASS from Planning onward. Evidence Capture baseline records carry `siteVersionId`; `EvidenceCaptureArtifact` and `ReconstructionInputArtifact` remain route/evidence shapes keyed by surrounding baseline or package context rather than embedding version identity. |
| `routeScope` is carried consistently | PASS from Planning onward. Evidence Capture and Reconstruction Input are route-level evidence contracts; Planning introduces `routeScope`, and Discovery, Review, and Package preserve it. |
| `readinessLevel` is carried consistently | PASS from Planning through Discovery, Review, and Package. Review and Package preserve the readiness level as metadata and do not recalculate it. |
| Limitations/blockers are represented consistently | PASS with layer-specific shape. Readiness uses blocker objects; Planning carries blockers and string limitations; Discovery carries string limitations and limitation refs; Review carries candidate limitations; Package normalizes review limitations into severity-tagged package limitations. |
| Confidence/status naming is consistent | PASS with field-qualified names. Confidence is `LOW`, `MEDIUM`, `HIGH`; status fields are explicitly scoped as `status`, `reviewStatus`, `discoveryStatus`, `packageStatus`, and `executionReadiness`. |
| No contract claims execution exists | PASS. Package instructions keep `executionAllowed: false` and `outputGenerationAllowed: false`; current package builder can produce `ready_for_dry_run` but not `ready_for_future_execution`. |

## Status Taxonomy

| Area | Field | Values | Notes |
|---|---|---|---|
| Evidence Capture status | `EvidenceCaptureArtifact.status` and `route.captureStatus` | `available`, `partial`, `unavailable`, `failed` | Gates reconstruction readiness. `available` and `partial` are acceptable for minimum readiness when other required fields exist. |
| Original Mirror fidelity status | `OriginalMirrorArtifact.status`; surface badge/readiness | Status: `not_started`, `available`, `available_with_limitations`, `unavailable`, `failed`; badge: `HIGH`, `MEDIUM`, `LOW`; readiness: `READY`, `PARTIAL`, `NOT_READY` | Diagnostic only. It does not approve reconstruction. |
| Reconstruction readiness level | `readinessLevel` | `NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, `HIGH_CONFIDENCE` | Deterministic evidence-readiness result. |
| Planning review status | `ReconstructionPlanningPackage.reviewStatus` | `pending`, `approved`, `rejected`, `needs_more_evidence` | Human planning state only; it does not execute reconstruction. |
| Candidate discovery status | `ReconstructionCandidateDiscoveryPackage.discoveryStatus` | `not_started`, `contract_only`, `discovery_ready`, `discovery_complete` | Current state is contract-only; discovery execution is absent. |
| Candidate review status | `ReconstructionCandidateReviewPackage.reviewStatus` | `pending`, `partially_reviewed`, `approved`, `rejected`, `needs_more_evidence` | Review package state. Candidate-level decisions additionally include `defer` and `unsupported`. |
| Reconstruction package status | `ReconstructionPackage.packageStatus` | `draft`, `ready_for_reconstruction`, `needs_more_evidence`, `blocked`, `archived` | Metadata packaging state. `ready_for_reconstruction` does not authorize execution. |
| Execution readiness status | `ReconstructionPackage.executionReadiness` | `not_ready`, `ready_for_dry_run`, `ready_for_future_execution` | Current builders may reach `ready_for_dry_run`; they do not produce `ready_for_future_execution`. |

## Naming Conflicts And Ambiguities

- `approved` appears in Planning review, Candidate Review decisions, and Candidate Review package status. It must always be read with the field name and layer.
- `needs_more_evidence` appears in Planning, Candidate Review, and Package status. It always means the current layer is blocked by evidence insufficiency, not that capture has run.
- `ready_for_reconstruction` and `ready_for_dry_run` are package metadata states. Neither state permits execution, AI generation, worker dispatch, persistence, or publishing.
- Evidence Capture `available`/`partial` are not the same as Reconstruction Readiness. They are inputs into readiness, not readiness levels.

## Implemented

- Evidence Capture artifact contract.
- Evidence Capture baseline persistence as `evidence_capture_baseline`.
- Original Mirror Fidelity read-only projection.
- Reconstruction Input Contract.
- Reconstruction Readiness evaluation and read-only surface.
- Reconstruction Planning Gate contract and eligibility helper.
- Reconstruction Candidate Discovery contract and eligibility helper.
- Reconstruction Candidate Review contract, eligibility helper, and summary helper.
- Reconstruction Package contract, package builder, execution lock, and summary helper.
- Contract-only tests for package lineage and execution-readiness boundaries.

## Not Implemented

- Future Dry Run.
- Future Reconstruction.
- Future Publish.
- Candidate discovery execution.
- Candidate review execution or review persistence.
- Reconstruction execution.
- Approval execution.
- Dry-run execution.
- Reconstruction jobs.
- Reconstruction workers.
- LLM calls.
- Semantic extraction engines.
- AI generation.
- React generation.
- GNR8 block generation.
- Editable content model generation.
- Design token generation.
- Reconstruction persistence.
- Publishing behavior.

## Boundary Rules

- Evidence Capture is the only source of future reconstruction evidence.
- Original Mirror is read-only source mirroring and diagnostics. It is not reconstruction evidence by itself.
- Reconstruction Readiness is deterministic and evidence-based.
- Planning, Discovery, Review, and Package contracts are metadata-only control-plane contracts.
- `ready_for_dry_run` means eligible for a future dry-run design phase only.
- `ready_for_future_execution` is reserved and must not be emitted by current builders.
- `executionAllowed` and `outputGenerationAllowed` remain `false`.
- No current contract authorizes AI calls, reconstruction execution, generated output, worker dispatch, persistence, or publishing.

## Future Dry-Run Entry Point

The future dry-run design phase should start from `ReconstructionPackage` only when:

- `packageStatus` is `ready_for_reconstruction`;
- `executionReadiness` is `ready_for_dry_run`;
- `executionAllowed` is still `false`;
- `outputGenerationAllowed` is still `false`;
- approved candidates, required evidence refs, limitations, `siteVersionId`, `routeScope`, `readinessLevel`, and all backward package IDs are present.

The recommended next major phase is:

- Phase 8A-0 - Dry-Run Boundary Planning

The alternative, if the boundary is accepted as already sufficiently explicit, is:

- Phase 8A - First Reconstruction Dry-Run Design

## Explicit Non-Goals

- Do not start Phase 8A from this closure.
- Do not add reconstruction execution.
- Do not add AI generation.
- Do not add React generation.
- Do not add GNR8 block generation.
- Do not add semantic extraction.
- Do not add candidate discovery execution.
- Do not add review execution.
- Do not add approval execution.
- Do not add dry-run execution.
- Do not add worker execution.
- Do not change importer, capture, Original Mirror, preview, persistence schema, publishing, or public rendering behavior.
