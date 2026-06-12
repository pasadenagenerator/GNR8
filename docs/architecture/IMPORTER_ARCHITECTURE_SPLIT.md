# Importer Architecture Split

Phase: 7F

Status: Complete through Phase 7F-10. The implemented architecture state is Evidence Capture -> Original Mirror -> Reconstruction.

## Purpose

GNR8 no longer treats website import as one combined HTML/CSS/JS rewrite pipeline. The importer architecture is split into three separate layers:

1. Evidence Capture Layer
2. Original Mirror Layer
3. Reconstruction Layer

These layers have different purposes, outputs, labels, and product guarantees. Raw preview inspection remains useful for operator diagnosis and mirror behavior, but Evidence Capture is the foundation for future GNR8-native Reconstruction.

## Implemented

- Architecture split between Evidence Capture, Original Mirror, and Reconstruction.
- Evidence Capture Artifact Contract and inventory audit.
- Baseline artifact persistence as `evidence_capture_baseline`.
- Original Mirror Fidelity surface derived from the persisted baseline.
- Reconstruction Input Contract.
- Minimum Evidence Handoff Normalization.
- Evidence Capture enrichment layer for readiness comparison.
- Reconstruction Readiness evaluation.
- Reconstruction Readiness surface in Site Workspace.

## Not Implemented

- Reconstruction execution.
- AI reconstruction.
- React/block generation from imported evidence.
- Reconstruction workers.
- Reconstruction approvals.
- Reconstruction publishing.

## Layer 1: Evidence Capture Layer

Purpose:
- Capture the source website as a browser/user sees it.
- Produce evidence for archive, operator inspection, Original Mirror Preview, and future Reconstruction.
- Avoid creating editable GNR8 output directly.

Implemented:
- Evidence Capture contracts and type scaffolding.
- Evidence Capture inventory audit.
- Persisted `evidence_capture_baseline`.
- Current baseline coverage projection.
- Minimum handoff normalization for reconstruction input.
- Enrichment helpers used to compare baseline evidence against expanded evidence.

Partially implemented:
- Current persisted baseline includes raw HTML, rendered DOM refs where available, viewport/full-page screenshots where available, computed style samples where available, direct asset fetch manifests, acquisition evidence, diagnostics, worker job state, worker health, and multi-page route discovery evidence.
- Some browser-observed evidence exists through rendered capture, but full reconstruction-grade coverage is not complete.

Future:
- Broader browser network inventory.
- Rendered layout geometry.
- Script/runtime observation.
- Rich media and widget inventories.
- Additional normalized fidelity limitation evidence.

Primary capture provider:
- Chrome / Playwright.

Research-only provider:
- Servo. Servo is not part of the active roadmap, not a fallback provider, and not required for Reconstruction Readiness.

Layer rule:
- Evidence Capture produces evidence artifacts, not semantic GNR8 blocks, not editable content models, and not reconstructed React.

## Layer 2: Original Mirror Layer

Purpose:
- Provide a read-only preview/archive/mirror of the imported site.
- Preserve source behavior and source references where safe.
- Give operators and customers a clear way to inspect what was captured without implying editability.

Implemented:
- Original Mirror Preview terminology and boundary.
- Original Mirror Fidelity projection from `evidence_capture_baseline`.
- Operator-facing fidelity badge, coverage summary, readiness state, known limitations, and route-level limitations when persisted route evidence exists.

Rules:
- It is not editable.
- It is not semantic.
- It is not AI reconstructed.
- It should preserve source refs where safe.
- It should not aggressively transform HTML.
- It should not be used as the GNR8 block model.
- It can have known fidelity limitations when a source site depends on complex runtime behavior.

Required label:
- Original Mirror Preview

Known limitations must be surfaced, not hidden. Examples include builder runtime dependence, lazy loading, third-party widgets, external maps, galleries, form scripts, font loading, accessibility overlays, blocked resources, consent gates, and post-render DOM mutation.

Layer rule:
- Original Mirror may display Evidence Capture artifacts, but it must not be mistaken for GNR8-native Reconstruction and is not itself reconstruction evidence.

## Layer 3: Reconstruction Layer

Purpose:
- Create future GNR8-native editable output from evidence.
- Convert evidence into structured product truth: routes, sections, blocks, content, tokens, and optional CMS bindings.

Implemented:
- Reconstruction Input Contract.
- Deterministic Reconstruction Readiness levels: `NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE`.
- Readiness blocker model.
- Readiness evaluation helpers.
- Readiness projection surfaced in Site Workspace.
- Future candidate artifact shape only.

Partially implemented:
- Evidence can now be normalized and evaluated for readiness.
- Enriched evidence can be compared with baseline evidence to show whether minimum readiness could be reached.

Future:
- Reconstruction execution.
- AI reconstruction.
- GNR8 React/block generation.
- Editable content model generation.
- Design token generation.
- Structured route model generation.
- Reconstruction workers, approvals, and publishing.

Required future label:
- GNR8 Reconstruction Preview

Layer rule:
- Reconstruction must not be treated as the same thing as Original Mirror Preview. Reconstruction can use Evidence Capture as input and may use the mirror for inspection context, but its output is a separate GNR8-native candidate.

## Terminology

Evidence Capture:
- The process of observing and recording a source site as rendered by a browser/user.

Capture Provider:
- The runtime used to capture evidence. The primary provider is Chrome / Playwright. Servo remains research only.

Original Mirror Preview:
- A read-only, non-semantic preview/archive of the source site based on raw/captured source artifacts.

Original Mirror Fidelity:
- The operator-facing projection that explains Evidence Capture baseline coverage, known limitations, and whether the Original Mirror has fidelity blockers.

Reconstruction:
- The future process of generating editable GNR8-native output from Evidence Capture. No execution exists yet.

Reconstruction Readiness:
- The deterministic projection that evaluates whether captured evidence is sufficient for future Reconstruction.

GNR8 Reconstruction Preview:
- A future preview of editable GNR8-native output reconstructed from evidence.

Known Fidelity Limitation:
- An explicitly surfaced reason the Original Mirror or future Reconstruction may differ from the source site, such as a blocked widget, missing runtime, external map, lazy-loaded gallery, post-render mutation, or inaccessible asset.

Reconstruction Candidate:
- A proposed GNR8-native model derived from evidence. It is not source truth until reviewed, accepted, or promoted by future product workflow.

## Boundary With Existing Import Contracts

The deterministic static import contract remains valid for local HTML/assets import. It should not be expanded into a browser capture, mirror, and Reconstruction contract all at once.

The rendered capture contract remains a foundation for browser-observed evidence.

The canonical import model remains the long-term product truth target for editable GNR8 output. HTML remains evidence/source material. React/block output remains a downstream GNR8-native representation, not an importer output.

## Current Unresolved Cases

ViroiDoc blog/news duplication:
- Not solved by raw preview patching.
- Should be treated as a Reconstruction/modeling issue where evidence must distinguish source duplication, listing semantics, route behavior, and reusable content patterns.

Mono/Maver map rendering:
- Requires evidence capture plus widget reconstruction before it can become a GNR8-native map model.
- A source map widget should be captured as widget evidence, then reconstructed as a GNR8 map block through an approved runtime provider when appropriate.

Dongle issue:
- Showed an importer source-reference preservation problem.
- Original Mirror should preserve source refs where safe instead of aggressively transforming source HTML.
- Reconstruction should separately decide whether refs become editable assets, content bindings, or runtime provider inputs.

DB lifecycle issue:
- Fixed before this phase.
- Not part of the importer architecture split except as a reminder that runtime lifecycle defects should not be confused with import-layer boundaries.

## Non-Goals Still In Force

- Do not add Servo as an active provider.
- Do not add reconstruction execution.
- Do not add AI reconstruction.
- Do not generate React/blocks from importer evidence.
- Do not add reconstruction workers.
- Do not add reconstruction approvals.
- Do not add reconstruction publishing.
- Do not merge Original Mirror and Reconstruction concepts.

## Completed Phase 7F Chain

- 7F-1: Architecture Split.
- 7F-2: Evidence Capture Artifact Contract.
- 7F-2.5: Evidence Capture Inventory Audit.
- 7F-3: Persist Current Evidence Capture Baseline.
- 7F-4: Original Mirror Fidelity Surface.
- 7F-5: Reconstruction Input Contract.
- 7F-6: Capture Expansion Planning.
- 7F-7: Minimum Evidence Handoff Normalization.
- 7F-8: Evidence Capture Enrichment.
- 7F-9: Reconstruction Readiness Evaluation.
- 7F-10: Reconstruction Readiness Surface.

## Recommended Next Phase

7F-11: Reconstruction Planning Gate
- Decide whether the existing Evidence Capture, Original Mirror Fidelity, and Reconstruction Readiness foundations are sufficient to plan a bounded Reconstruction execution phase.
- Keep execution, AI generation, workers, approvals, and publishing out of scope unless explicitly authorized by a future phase.
