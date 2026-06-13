# Reconstruction Candidate Discovery Contract

## Purpose

Phase 7F-12 defines the deterministic contract for future Reconstruction Candidate Discovery from Evidence Capture.

The contract answers one question:

> What kinds of reconstruction candidates can be discovered from evidence?

This phase does not discover candidates. It defines the control-plane package shape, candidate taxonomy, evidence traceability model, confidence shape, discovery status values, and readiness-based eligibility helper.

Canonical TypeScript contract:

- `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts`

## Boundary

This phase is architecture, contract, discovery modeling, and documentation only.

Implemented now:

- metadata-only `ReconstructionCandidateDiscoveryPackage`
- normalized `ReconstructionCandidateType` taxonomy
- evidence traceability shape
- confidence shape with `LOW`, `MEDIUM`, and `HIGH`
- discovery statuses
- deterministic eligibility helper based only on Planning Gate readiness level

Not changed:

- importer behavior
- Evidence Capture behavior
- Original Mirror behavior
- preview behavior
- reconstruction execution
- AI generation
- React generation
- block generation
- route discovery
- asset rewriting
- persistence schema
- worker execution
- publishing behavior

Not added:

- LLM calls
- semantic extraction engines
- candidate persistence
- candidate approval execution
- reconstruction execution
- reconstruction workers

## Inputs

Candidate Discovery consumes only the existing Reconstruction Planning Gate output and existing readiness levels:

- `NOT_READY`
- `MINIMUM_READY`
- `RECOMMENDED`
- `HIGH_CONFIDENCE`

The eligibility helper does not recalculate readiness and does not inspect raw evidence. It only maps readiness:

| Readiness Level | Candidate Discovery Eligibility |
|---|---|
| `NOT_READY` | not eligible |
| `MINIMUM_READY` | eligible |
| `RECOMMENDED` | eligible |
| `HIGH_CONFIDENCE` | eligible |

## Outputs

Future Candidate Discovery may produce a metadata-only discovery package:

- `packageId`
- `siteVersionId`
- `planningPackageId`
- `readinessLevel`
- `routeScope`
- `discoveryStatus`
- `candidateCount`
- `candidates`
- `limitations`
- `notes`

Current system state maps to:

- `contract_only`

No generated React, generated blocks, editable content model, semantic extraction, worker job, persisted candidate, persisted reconstruction, approval execution, or publishable artifact is produced.

## Candidate Taxonomy

Allowed `ReconstructionCandidateType` values:

- `page`
- `navigation`
- `hero`
- `section`
- `content_collection`
- `article_listing`
- `article_detail`
- `card_group`
- `gallery`
- `form`
- `map`
- `widget`
- `footer`
- `layout_region`
- `design_token_group`
- `unknown`

The taxonomy is descriptive only. Phase 7F-12 does not infer, rank, extract, or generate candidates.

## Evidence Traceability Rules

Every future candidate must point back to source evidence through `ReconstructionCandidateEvidence`:

- `evidenceRefs`
- `routeRefs`
- `widgetRefs`
- `mediaRefs`
- `fontRefs`
- `limitationRefs`

Traceability rules:

- A candidate must never be treated as reconstruction-ready without evidence refs.
- Route-specific candidates should include route refs.
- Widget, map, form, gallery, and embed-like candidates should include widget refs when available.
- Media-heavy candidates should include media refs when available.
- Typography or design-token candidates should include font refs when available.
- Known fidelity gaps must remain attached through limitation refs.

These are contract rules only. No evidence lookup or validation engine is implemented in this phase.

## Confidence Model

`ReconstructionCandidateConfidence` contains:

- `confidenceLevel`
- `confidenceReasoning`
- `evidenceCoverageStatus`

Allowed confidence levels:

- `LOW`
- `MEDIUM`
- `HIGH`

Evidence coverage statuses:

- `unknown`
- `insufficient`
- `partial`
- `sufficient`

Confidence is a future explanatory contract. Phase 7F-12 does not score confidence, call AI, evaluate semantics, or approve reconstruction.

## Discovery Status Values

Allowed `ReconstructionCandidateDiscoveryStatus` values:

- `not_started`
- `contract_only`
- `discovery_ready`
- `discovery_complete`

Current system state is `contract_only`.

## Future Discovery Flow

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

NOT IMPLEMENTED YET after Candidate Discovery:

- Candidate Review
- candidate approval execution
- semantic extraction
- AI reconstruction
- React generation
- block generation
- editable content model generation
- reconstruction workers
- reconstruction persistence
- publishing

Phase 7F-12 stops at the statement:

> This site is eligible for candidate discovery.
