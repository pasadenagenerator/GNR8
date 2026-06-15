# Simulation Readiness Review

## Scope

Phase 8A-3 audits whether the current Evidence Capture foundation and Reconstruction Control Plane contain enough information to support a meaningful first Dry Run simulation.

This is audit, review, gap analysis, and documentation only.

This phase does not change importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, or publishing behavior.

This phase does not add LLM calls, dry-run execution, simulation execution, reconstruction execution, database writes, publishing logic, generated React, generated blocks, generated content models, or generated design token models.

## Review Inputs

Reviewed sources:

- `docs/architecture/EVIDENCE_CAPTURE_INVENTORY_AUDIT.md`
- `docs/architecture/CAPTURE_EXPANSION_PLAN.md`
- `docs/architecture/RECONSTRUCTION_INPUT_CONTRACT.md`
- `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md`
- `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md`
- `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md`
- `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md`
- `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md`
- `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`

## Executive Answer

The control plane is ready to plan a first Dry Run, but the current captured evidence is not yet ready for a meaningful first Dry Run execution.

The system can produce:

- Reconstruction Package metadata
- Dry Run Package metadata
- Simulation Plan metadata

The system cannot yet execute a Dry Run, and the evidence available to a future executor is still too thin for reliable section, block, content, and design token simulation.

Recommended next phase:

- Phase 8A-4 - Capture Expansion For First Dry Run

## Simulation Readiness Audit

| Area | Status | Assessment | Dry Run Implication |
|---|---|---|---|
| Evidence Capture baseline | PARTIAL | Baseline persistence exists through `evidence_capture_baseline`. Current coverage is 16/66 supported, 33/66 partial, and 17/66 missing. | Useful as provenance and basic source evidence, but not enough for meaningful simulation quality. |
| Evidence Capture enrichment | PARTIAL | Enrichment helpers can compare baseline and enriched evidence, and enriched route identity plus rendered DOM evidence can reach `MINIMUM_READY` when blockers are absent. | Valuable for readiness projection, but it does not add browser layout, runtime, widget, or full network evidence. |
| Reconstruction Readiness | IMPLEMENTED | Deterministic readiness levels, blockers, summaries, and Site Workspace read-only projection exist. Current baseline remains `NOT_READY` when required evidence is missing or blockers remain. | Good gate for preventing premature execution. |
| Planning Gate | IMPLEMENTED | Metadata-only planning eligibility exists. `NOT_READY` is blocked; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible. | Ready for planning, not execution. |
| Candidate Discovery Contract | PARTIAL | Contract, taxonomy, evidence traceability shape, confidence shape, statuses, and eligibility helper exist. Discovery execution does not exist. | Dry Run can refer to the shape, but cannot rely on actual discovered candidates yet. |
| Candidate Review Contract | PARTIAL | Review package shape, decisions, statuses, eligibility helper, and summary helper exist. Review execution and persistence do not exist. | Dry Run can consume review-shaped metadata only if supplied by the control-plane chain. |
| Reconstruction Package | IMPLEMENTED | Metadata-only package builder, approved candidate handoff, package status, execution-readiness status, and summary helper exist. | A valid `ready_for_dry_run` package can be planned, but it is still a metadata contract. |
| Dry Run Package | IMPLEMENTED | Dry Run Package creation, eligibility, validation, boundary rules, empty generated outputs, and empty simulation artifacts are implemented as contracts. | Ready for contract planning. It does not execute simulation. |
| Simulation Plan | IMPLEMENTED | Simulation Plan creation and validation exist with deterministic planned steps and planning-only statuses. | Ready to describe what a future Dry Run would attempt. It cannot prove evidence sufficiency by itself. |

## Evidence Coverage Matrix

| Category | Current Status | Dry Run Value | Gap Severity |
|---|---|---|---|
| source URL | READY | Anchors route attribution, remediation, and evidence lookup. | LOW |
| route identity | PARTIAL | Required for route model and route-scoped simulation. | HIGH |
| rendered DOM | PARTIAL | Minimum structural substrate for route, section, content, and block planning. | HIGH |
| rendered HTML hash | PARTIAL | Integrity anchor for rendered DOM evidence. | HIGH |
| screenshots | PARTIAL | Visual reference for layout review, ordering, media, and fidelity checks. | MEDIUM |
| computed styles | PARTIAL | Input for color, type, spacing, radius, shadow, and surface inference. | MEDIUM |
| layout geometry | MISSING | Core evidence for section boundaries, block grouping, above-fold content, and responsive layout. | CRITICAL |
| font inventory | PARTIAL | Improves typography fidelity and missing-font diagnosis. | MEDIUM |
| widget inventory | PARTIAL | Distinguishes maps, galleries, forms, videos, cookie banners, overlays, and chat widgets from reconstructable source content. | HIGH |
| network inventory | PARTIAL | Explains missing assets, third-party dependencies, blocked resources, and widget limitations. | HIGH |
| media inventory | PARTIAL | Supports image, background image, gallery, video, and missing-media simulation. | HIGH |
| navigation evidence | PARTIAL | Supports navigation model and multi-route relationship planning. | MEDIUM |
| section evidence | PARTIAL | Supports section model planning, but current hints are not reconstruction-grade rendered evidence. | HIGH |
| design token evidence | PARTIAL | Supports early visual-token hypotheses, but not reliable token generation. | HIGH |
| multi-route relationships | PARTIAL | Supports route grouping and navigation context from discovery provenance. | MEDIUM |
| runtime mutation evidence | MISSING | Detects late content, lazy loading, duplicate insertion, unstable DOM, and widget-driven mutations. | CRITICAL |

## First Dry Run Feasibility

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | Source URL, route discovery, route priority, and route provenance exist, although route identity still needs durable normalization per route. |
| navigation model | risky | Route discovery and navigation provenance exist, but rendered navigation layout, sticky/fixed nav geometry, and multi-breakpoint behavior are incomplete. |
| section model | risky | Raw/semantic section hints exist, but rendered section geometry, above-fold regions, and repeated-region evidence are missing. |
| block model | not_ready | Block-quality grouping needs layout boxes, widget/media inventory, section boundaries, and reviewed candidates. Current data would overfit DOM structure. |
| content model | risky | Rendered DOM and raw HTML can support experimental extraction, but there is no executed candidate discovery, content review, or durable generated model boundary. |
| design token model | not_ready | Computed style samples and style signals exist, but loaded font sources, broad style coverage, usage counts, layout context, and contract-shaped token candidates are incomplete. |

## Gap Analysis

### Critical Gaps

- No reconstruction-grade rendered layout geometry: bounding boxes, above-fold regions, repeated regions, sticky/fixed elements, and basic key-element layout refs are missing.
- No runtime mutation evidence: late content, lazy-load behavior, duplicate insertions, post-render nodes, and unstable DOM signals are missing.
- Minimum route-level handoff is not guaranteed for every captured route: artifact status, route identity, rendered DOM ref, rendered HTML hash, render status, route capture status, and blocker limitations still need deterministic normalization.
- No candidate discovery execution exists, so Dry Run would lack real discovered candidates unless supplied by contract-only metadata.

### Important Gaps

- Browser-observed network inventory is incomplete: current evidence is mostly direct asset fetch manifest rather than Playwright-level request, response, failed, and blocked request evidence.
- Widget inventory is incomplete for maps, galleries, forms, videos, accessibility overlays, cookie banners, and chat widgets.
- Media inventory lacks enough rendered dimensions, background selector hints, video refs, and missing-media selector evidence.
- Font evidence lacks loaded font source inventory and missing font source classification.
- Section evidence is not yet grounded in rendered geometry and evidence refs.
- Design token evidence is not yet contract-shaped with usage counts, roles, and evidence refs.

### Nice-To-Have Gaps

- Multi-breakpoint layout evidence.
- Complete response header and MIME inventory.
- Inline script signatures for policy/security diagnostics.
- Accessibility tree evidence.
- Shadow DOM evidence.
- Canvas raster evidence.
- Animation timeline evidence.
- Interaction-state evidence for menus, modals, hover states, and form states.

## Missing Evidence With Highest Dry Run Impact

The evidence that would most improve first Dry Run quality is:

1. Normalized minimum handoff evidence for each route.
2. Basic rendered layout boxes for key elements.
3. Browser-level failed and blocked request summaries.
4. Widget and iframe inventory.
5. Rendered media inventory with dimensions and selector hints.
6. Loaded and missing font inventory.
7. Runtime mutation summary.

## Recommended Capture Expansion

### P0

Required before first meaningful Dry Run execution:

- Normalize route-level `EvidenceCaptureArtifact.status`.
- Normalize source URL into `source.sourceUrl` and/or `route.sourceUrl`.
- Normalize route identity into `source.routePath` and/or `route.discoveredRoutePath`.
- Persist rendered DOM artifact refs in `rendered.renderedDomRef`.
- Persist rendered HTML hash in `rendered.renderedHtmlHash`.
- Normalize rendered capture status in `rendered.renderStatus`.
- Normalize route capture status in `route.captureStatus`.
- Normalize blocker fidelity limitations into route/artifact limitations.

### P1

Required to make first Dry Run output useful rather than merely eligible:

- Capture basic layout boxes for navigation, hero, headings, CTAs, images, cards, forms, maps, galleries, and footer.
- Persist screenshot refs with viewport metadata.
- Add browser-level failed and blocked request summaries.
- Add loaded font and missing font source inventory.
- Add iframe, embed, form, map, gallery, video, cookie banner, accessibility overlay, and chat widget inventory.
- Add rendered media inventory with dimensions and selector hints.
- Add computed style samples for key structural elements.
- Add console error and warning summaries.

### P2

Improves confidence after the first execution path is viable:

- Add runtime mutation summaries.
- Add above-fold region extraction.
- Add repeated-region clustering.
- Add sticky/fixed element classification.
- Add multi-breakpoint layout evidence.
- Add full browser request and response inventory.
- Add background image selector evidence.
- Add video provider/poster/source evidence.

## Readiness Score

Dry Run Readiness score: 58/100.

Deterministic calculation:

| Component | Weight | Score | Rationale |
|---|---:|---:|---|
| Control-plane contract completeness | 25 | 24 | Planning Gate, Discovery, Review, Package, Dry Run Package, and Simulation Plan contracts exist and validate metadata boundaries. |
| Safety boundary clarity | 15 | 15 | Current contracts explicitly prohibit execution, generated outputs, workers, database writes, runtime writes, and publishing. |
| Minimum evidence handoff readiness | 20 | 8 | Required evidence mostly exists somewhere, but not reliably normalized into durable route-level reconstruction handoff artifacts. |
| Optional evidence usefulness | 20 | 6 | Screenshots, computed styles, media, widgets, and network evidence are partial; layout geometry and mutation evidence are missing. |
| Candidate/review/package practical availability | 10 | 3 | Contract shapes exist, but discovery/review execution and persistence do not exist. |
| First-model feasibility | 10 | 2 | Route model is feasible, navigation/section/content are risky, and block/design token models are not ready. |
| Total | 100 | 58 | Contract readiness is strong; evidence readiness is below execution threshold. |

Interpretation:

- 0-39: not ready for planning.
- 40-64: ready for contract planning, not ready for meaningful execution.
- 65-79: limited first execution possible with high risk.
- 80-100: meaningful first Dry Run execution readiness.

The current score falls in the contract-planning-ready band.

## Readiness Decision

Current decision:

- Do not execute a Dry Run yet.
- Do not add AI generation.
- Do not generate React.
- Do not generate blocks.
- Do not implement reconstruction execution.
- Do not implement capture expansion in this phase.

Recommended next phase:

- Phase 8A-4 - Capture Expansion For First Dry Run

Phase 8A-4 should focus on P0 minimum handoff normalization plus the smallest P1 evidence bundle that makes route, navigation, section, content, and early visual-token simulation meaningfully inspectable.
