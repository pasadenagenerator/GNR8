# Reconstruction Candidate Review Contract

## Purpose

Phase 7F-13 defines the deterministic contract for future human/operator review of Reconstruction Candidates.

The contract answers one question:

> How will discovered reconstruction candidates be reviewed before reconstruction?

This phase does not review candidates, discover candidates, approve reconstruction, execute reconstruction, or generate any GNR8-native output.

Canonical TypeScript contract:

- `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts`

## Boundary

This phase is architecture, review modeling, and documentation only.

Implemented now:

- metadata-only `ReconstructionCandidateReviewPackage`
- per-candidate `ReconstructionCandidateReviewItem`
- review decision values
- review package status values
- deterministic review eligibility helper based only on discovery status, candidate count, and readiness level
- deterministic review summary helper

Not changed:

- importer behavior
- Evidence Capture behavior
- Original Mirror behavior
- preview behavior
- candidate discovery execution
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
- candidate persistence
- review persistence
- approval execution
- reconstruction execution
- reconstruction workers

## Inputs

Candidate Review consumes only completed Candidate Discovery package metadata:

- `discoveryPackageId`
- `planningPackageId`
- `discoveryStatus`
- `candidateCount`
- `readinessLevel`

The eligibility helper does not inspect raw evidence, candidates, AI output, screenshots, DOM, storage, jobs, workers, or persisted review state.

Eligibility rules:

| Discovery Status | Candidate Count | Candidate Review Eligibility |
|---|---:|---|
| `not_started` | any | not eligible |
| `contract_only` | any | not eligible |
| `discovery_ready` | any | not eligible until discovery output exists |
| `discovery_complete` | `0` | not eligible |
| `discovery_complete` | `> 0` | eligible |

Readiness level is carried as contract metadata for eligibility. The Review Package preserves `discoveryPackageId`, `planningPackageId`, and `readinessLevel` so the later Reconstruction Package can link backward through the control plane without recalculating readiness. Phase 7F-13 does not recalculate readiness.

## Outputs

Future Candidate Review may produce a metadata-only review package:

- `reviewPackageId`
- `discoveryPackageId`
- `planningPackageId`
- `siteVersionId`
- `routeScope`
- `readinessLevel`
- `reviewStatus`
- `candidateReviews`
- `reviewerRef`
- `reviewedAt`
- `notes`

Current system state maps to:

- no persisted review package
- no approval execution
- no reconstruction execution

## Review Item

Each `ReconstructionCandidateReviewItem` contains:

- `candidateId`
- `candidateType`
- `sourceRoute`
- `reviewDecision`
- `confidenceLevel`
- `limitations`
- `evidenceRefs`
- `reviewerNotes`

Review items are future operator review records only. They do not authorize execution.

## Review Decisions

Allowed `ReconstructionCandidateReviewDecision` values:

- `approved`
- `rejected`
- `needs_more_evidence`
- `defer`
- `unsupported`

Decision meanings:

- `approved`: the candidate is acceptable for a future reconstruction package contract.
- `rejected`: the candidate should not proceed.
- `needs_more_evidence`: additional Evidence Capture is required before deciding.
- `defer`: review is intentionally postponed.
- `unsupported`: the candidate cannot currently be handled by the reconstruction path.

## Package Status Model

Allowed `ReconstructionCandidateReviewPackageStatus` values:

- `pending`
- `partially_reviewed`
- `approved`
- `rejected`
- `needs_more_evidence`

Summary status derivation:

- no candidate reviews -> `pending`
- any `needs_more_evidence` decision -> `needs_more_evidence`
- any `defer` decision -> `partially_reviewed`
- all candidates `approved` -> `approved`
- all candidates `rejected` or `unsupported` -> `rejected`
- mixed terminal decisions -> `partially_reviewed`

`unsupported` is a candidate-level decision, not a package status.

## Review Summary Helper

`summarizeCandidateReviewPackage(...)` returns:

- total candidates
- approved count
- rejected count
- needs_more_evidence count
- deferred count
- unsupported count
- overall status

The helper only counts review decisions already present in the package. It does not review candidates, validate evidence, call AI, persist anything, or trigger reconstruction.

## Future Human Review Flow

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
Future Reconstruction
```

Candidate Review is the last implemented contract boundary in Phase 7F-13.

NOT IMPLEMENTED YET after Candidate Review:

- Reconstruction Package Contract
- approval execution
- reconstruction execution
- AI reconstruction
- React generation
- block generation
- editable content model generation
- reconstruction workers
- reconstruction persistence
- publishing

Phase 7F-13 stops at the statement:

> This discovered candidate package is eligible for human review.
