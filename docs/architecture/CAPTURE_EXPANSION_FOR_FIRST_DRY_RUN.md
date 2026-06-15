# Capture Expansion For First Dry Run

## Scope

Phase 8A-4 adds contract shapes for the minimum additional evidence needed before a first meaningful Dry Run can be reassessed.

This phase is Evidence Capture expansion only. It does not implement browser capture, runtime observers, extraction engines, Dry Run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing, database writes, route discovery changes, candidate discovery changes, or candidate review changes.

## Why These Evidence Types Matter

The Phase 8A-3 Simulation Readiness Review found the control plane ready for planning, but the captured evidence too thin for meaningful first Dry Run execution. The highest-value missing or risky areas were rendered layout geometry, section boundary evidence, navigation evidence, and runtime mutation evidence.

Phase 8A-4 defines four contract-only evidence types:

| Evidence Type | Why It Matters |
|---|---|
| Layout Geometry Evidence | Describes route-scoped viewport, document height, and bounded regions. This is the minimum substrate for route-scoped layout reasoning and later section grouping. |
| Section Boundary Evidence | Describes candidate section boxes, selectors, region type, and confidence. This makes section model readiness inspectable without inferring or generating sections. |
| Navigation Evidence | Describes route-scoped navigation labels, hrefs, ordering, count, confidence, and source evidence refs. This gives a future Dry Run a stable navigation model input. |
| Runtime Mutation Evidence | Describes whether post-render mutations were observed, how many occurred, their broad type, and selectors affected. This helps future Dry Run planning distinguish stable DOM from runtime-shaped DOM. |

## Relationship To Route, Navigation, And Section Models

Route model readiness needs route-scoped evidence. A route path in any of the new evidence contracts can support route model planning.

Navigation model readiness needs explicit navigation items. Layout or section evidence can identify that navigation likely exists, but explicit `NavigationEvidence.navigationItems` is the contract required to mark navigation model support as ready.

Section model readiness needs geometry and deterministic boundaries. Geometry alone says where regions are. Section boundary evidence says what those regions likely are. Runtime mutation evidence remains a later stability context input, but it is not required for the section model to report boundary evidence as ready.

## Boundary Diagram

```text
Evidence Capture
    ↓
Layout Geometry
    ↓
Section Evidence
    ↓
Navigation Evidence
    ↓
Dry Run Readiness
```

## Block Generation Remains Out Of Scope

These contracts describe evidence only. They do not choose blocks, generate blocks, map DOM to blocks, call AI, produce React, write generated output, execute reconstruction, or publish anything.

Block model readiness remains not ready after this phase because block generation requires more than evidence shapes. It needs executed candidate discovery, reviewed reconstruction intent, content boundaries, media/widget classification, design-token confidence, and a separate execution boundary.

## Relationship To Future Dry Run

The future Dry Run can read these evidence types as inputs after capture implementation exists. Phase 8A-4 only makes the input vocabulary explicit and testable:

- `LayoutGeometryEvidence`
- `SectionBoundaryEvidence`
- `NavigationEvidence`
- `RuntimeMutationEvidence`
- `evaluateCaptureExpansionReadiness(...)`

The readiness helper returns `READY`, `PARTIAL`, or `MISSING` for route, navigation, and section model support. It is a presence helper, not a scoring engine and not a permission to execute a Dry Run.

## Implemented

- Layout Geometry Capture
- Section Boundary Capture
- Navigation Capture

## Still Missing

- Runtime Mutation Capture

## Current Result

Phase 8A-10 implements deterministic `NavigationEvidence` from rendered DOM links, existing `LayoutGeometryEvidence`, and existing `SectionBoundaryEvidence`. Navigation capture records labels, hrefs, stable positions, allowed confidence levels, counts, and source evidence refs using reproducible DOM and evidence rules only.

Layout geometry, section boundary evidence, and navigation evidence are persisted inside the existing Evidence Capture baseline artifact. The baseline read path exposes summary-only geometry presence, summary-only section evidence presence/count/types, and summary-only navigation presence/item count/discovered route count. Runtime mutation capture, reconstruction execution, dry-run execution, AI generation, React generation, block generation, publishing behavior, and database schema changes remain out of scope.

Recommended next phase:

- Phase 8A-11 - Dry Run Readiness Re-Assessment
