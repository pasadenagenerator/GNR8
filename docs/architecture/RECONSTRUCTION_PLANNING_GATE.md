# Reconstruction Planning Gate

## Purpose

Phase 7F-11 defines the deterministic gate between Reconstruction Readiness and future AI Reconstruction.

The gate answers one question:

> When is a site eligible to enter reconstruction planning?

The answer is based only on the existing Reconstruction Readiness projection. No new readiness logic, scoring engine, semantic extraction, reconstruction execution, React generation, block generation, worker execution, approvals execution, or publishing behavior is introduced.

Canonical TypeScript contract:

- `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts`

## Boundary

This phase is architecture, contract, and documentation only.

Implemented now:

- metadata-only `ReconstructionPlanningPackage`
- metadata-only `ReconstructionCandidate`
- conceptual confidence levels: `LOW`, `MEDIUM`, `HIGH`
- human planning review states: `pending`, `approved`, `rejected`, `needs_more_evidence`
- deterministic planning eligibility helper based on existing readiness level

Not changed:

- importer behavior
- Evidence Capture behavior
- Chrome / Playwright behavior
- Original Mirror behavior
- preview behavior
- reconstruction execution
- AI generation
- route discovery
- asset rewriting
- persistence schema
- worker execution
- publishing behavior

## Inputs

The Planning Gate consumes the existing Reconstruction Readiness projection:

- `NOT_READY`
- `MINIMUM_READY`
- `RECOMMENDED`
- `HIGH_CONFIDENCE`

It may carry through readiness metadata such as blockers, required evidence presence, optional evidence presence, and the readiness explanation. It does not recalculate readiness.

## Outputs

The Planning Gate may produce a metadata-only planning package:

- `packageId`
- `siteVersionId`
- `routeScope`
- `readinessLevel`
- `readinessSummary`
- `blockers`
- `limitations`
- `evidenceSummary`
- `reconstructionCandidates`
- `confidenceLevel`
- `reviewStatus`

No generated React, generated blocks, editable model, semantic extraction, worker job, persisted reconstruction, approval execution, or publishable artifact is produced.

## Eligibility Rules

Planning eligibility is deterministic:

| Readiness Level | Planning Eligibility |
|---|---|
| `NOT_READY` | not eligible |
| `MINIMUM_READY` | eligible |
| `RECOMMENDED` | eligible |
| `HIGH_CONFIDENCE` | eligible |

`NOT_READY` remains blocked because minimum reconstruction readiness has not been reached. Every other readiness level may enter metadata-only reconstruction planning.

## Reconstruction Candidates

`ReconstructionCandidate` is a planning placeholder only. It identifies possible future reconstruction targets and links them to evidence refs. It does not perform candidate discovery, semantic extraction, or generation.

Candidate types:

- `page`
- `section`
- `component`
- `widget`
- `navigation`
- `content_collection`
- `form`
- `gallery`
- `map`
- `footer`
- `unknown`

## Future Flow

```text
Evidence Capture
    ↓
Original Mirror
    ↓
Readiness
    ↓
Planning Gate
    ↓
Future Reconstruction
    ↓
Future Approval
    ↓
Future Publish
```

## Not Implemented Yet

Everything after the Planning Gate is NOT IMPLEMENTED YET:

- future candidate discovery
- future semantic extraction
- future AI reconstruction
- future React generation
- future block generation
- future editable content model generation
- future reconstruction workers
- future reconstruction persistence
- future approval execution
- future publishing

Phase 7F-11 stops at the statement:

> This site is eligible for reconstruction planning.
