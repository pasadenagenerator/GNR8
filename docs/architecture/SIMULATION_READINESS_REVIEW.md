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

The control plane is ready to plan a first Dry Run, and Phase 8A-6 materially improved captured evidence by adding real persisted layout geometry. The current evidence is still not ready for meaningful first Dry Run execution.

The system can produce:

- Reconstruction Package metadata
- Dry Run Package metadata
- Simulation Plan metadata

The system cannot yet execute a Dry Run, and the evidence available to a future executor is still too thin for reliable section, block, content, and design token simulation.

Recommended next phase:

- Phase 8A-8 - Section Boundary Capture

## Post 8A-4 Re-Assessment

Phase 8A-4 improved Dry Run readiness at the contract and roadmap level, not at the execution level.

Previous 8A-3 score:

- Dry Run Readiness: 58/100

Updated scores after 8A-4:

| Readiness Type | Score | Assessment |
|---|---:|---|
| Conceptual Dry Run Readiness | 68/100 | Higher because the missing evidence shapes for layout geometry, section boundaries, navigation evidence, and runtime mutation evidence are now explicitly defined. The roadmap can now name the required inputs, evaluate their presence, and explain which route/navigation/section model inputs are missing. |
| Execution Dry Run Readiness | 58/100 | Still limited because capture implementation does not yet populate the new evidence shapes. No browser layout capture, section boundary extraction, navigation extraction, runtime mutation observation, persistence, candidate discovery execution, or simulation execution was added in 8A-4. |

Explanation:

8A-4 turns several former unknowns into contract-level known gaps. That improves planning quality, scoring clarity, and implementation sequencing. It does not materially improve the evidence available to a future Dry Run executor because the contracts are not yet populated by Evidence Capture and are not persisted as part of the current capture artifacts.

### Post 8A-4 Feasibility Matrix

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | Route-scoped evidence can now be represented through the new capture-expansion contracts, and earlier source URL / route identity evidence already makes route planning possible. Execution still depends on populated route-level evidence. |
| navigation model | risky | Navigation evidence now has a contract, but capture does not yet extract navigation items, ordering, source evidence refs, sticky/fixed behavior, or multi-breakpoint layout. |
| section model | risky | Section boundary and layout geometry contracts now define the needed inputs, but capture does not yet produce rendered section boxes or runtime-stability context. |
| block model | not_ready | Block-quality planning still needs populated layout geometry, section boundaries, media/widget classification, candidate discovery execution, and reviewed reconstruction intent. |
| content model | risky | Rendered DOM and raw HTML can support limited content extraction planning, but there is still no executed candidate discovery, content review, or persisted generated content boundary. |
| design token model | not_ready | Computed styles remain partial, and 8A-4 did not add token candidate contracts, style usage counts, loaded font confidence, or layout-context-aware token extraction. |

### Post 8A-4 Implementation Gap Matrix

| Evidence Type | Contract Exists | Capture Implemented | Persisted | Used By Readiness | Gap |
|---|---|---|---|---|---|
| layout geometry | yes | no | no | contract-level helper only | Implement browser capture of bounded regions, viewport/document dimensions, key selectors, and route-scoped geometry refs. |
| section boundary evidence | yes | no | no | contract-level helper only | Implement section boundary extraction from rendered geometry, classify section region types, assign confidence, and attach evidence refs. |
| navigation evidence | yes | no | no | contract-level helper only | Implement navigation extraction for labels, hrefs, ordering, counts, source refs, and eventually sticky/fixed/multi-breakpoint behavior. |
| runtime mutation evidence | yes | no | no | contract-level helper only | Implement bounded runtime observation for mutation presence, counts, broad mutation types, affected selectors, and stability summary. |

### Recommended 8A-6 Path

Phase 8A-6 should implement layout geometry capture first.

Recommended path:

- A. layout geometry capture first

Rationale:

Layout geometry is the substrate for the other new evidence types. Section boundaries need rendered boxes before they can be reconstruction-grade. Navigation can be more reliable when nav candidates are tied to rendered geometry. Runtime mutation evidence is important, but it is most useful after there is a stable geometry snapshot to compare against. A first layout geometry slice should stay narrow: route-scoped viewport/document dimensions, bounded key regions, selectors, and screenshot-aligned metadata, without simulation, reconstruction, generated output, or publishing behavior.

## Post 8A-6 Re-Assessment

Phase 8A-6 improved Dry Run readiness at the evidence-availability level by adding real persisted layout geometry for rendered major structural regions.

Previous 8A-5 scores:

- Conceptual Dry Run Readiness: 68/100
- Execution Dry Run Readiness: 58/100

Updated scores after 8A-6:

| Readiness Type | Score | Assessment |
|---|---:|---|
| Conceptual Dry Run Readiness | 72/100 | Higher because the layout-geometry contract is no longer only a planned shape. The system now has a concrete route-scoped geometry substrate for later section boundary, navigation, and block grouping work. |
| Execution Dry Run Readiness | 63/100 | Higher because rendered major-region geometry is captured, persisted as `rendered/layout-geometry.json`, attached to the baseline artifact, and used by capture-expansion readiness. It remains below limited-execution readiness because section boundaries, navigation extraction, runtime mutation evidence, candidate discovery execution, and candidate review execution are still absent. |

Explanation:

8A-6 converts the highest-value missing evidence slice from contract-only to real persisted evidence. This materially improves the route model and gives the section model a partial geometric substrate. The gain is intentionally bounded: captured geometry covers major structural regions only and does not infer section boundaries, classify navigation structure, observe runtime mutations, discover candidates, execute simulation, or generate reconstruction outputs.

### Post 8A-6 Evidence Implementation Matrix

| Evidence Type | Contract Exists | Capture Implemented | Persisted | Used By Readiness | Remaining Gap |
|---|---|---|---|---|---|
| layout geometry | yes | yes | yes | yes | Capture is limited to route-scoped viewport/document dimensions and major structural regions. It does not yet provide section boundary classification, repeated-region clustering, sticky/fixed classification, multi-breakpoint behavior, or runtime stability context. |
| section boundary evidence | yes | no | no | contract-level helper only | Implement section boundary extraction from rendered geometry, classify section region types, assign confidence, and attach evidence refs. |
| navigation evidence | yes | no | no | contract-level helper only | Implement navigation extraction for labels, hrefs, ordering, counts, source refs, and eventually sticky/fixed/multi-breakpoint behavior. |
| runtime mutation evidence | yes | no | no | contract-level helper only | Implement bounded runtime observation for mutation presence, counts, broad mutation types, affected selectors, and stability summary. |

### Post 8A-6 Feasibility Matrix

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | Route-scoped geometry now exists and is persisted with viewport/document dimensions and major region refs, so route-level planning has a real rendered layout substrate. |
| navigation model | risky | Navigation layout may be visible inside captured `nav` or `header` regions, but there is still no navigation extraction, item ordering model, href/label evidence, sticky/fixed behavior, or multi-breakpoint nav behavior. |
| section model | risky | The section model improved from ungrounded risky toward partial because major rendered boxes now exist. It remains risky until section boundary evidence classifies regions, assigns confidence, and ties sections to stable evidence refs. |
| block model | not_ready | Geometry helps future grouping, but block-quality planning still needs section boundaries, media/widget classification, candidate discovery execution, and reviewed reconstruction intent. |
| content model | risky | Rendered DOM, raw HTML, and geometry can support better context for experimental extraction, but there is still no executed candidate discovery, content review, or durable generated content boundary. |
| design token model | not_ready | Geometry does not solve token extraction. Computed style samples remain partial and still lack broad usage counts, roles, loaded font confidence, and layout-context-aware token candidates. |

### Dry Run Readiness Impact

Improved because of geometry:

- The route model now has persisted rendered viewport/document dimensions and major structural region boxes.
- Section planning can now start from real rendered boxes instead of only raw/semantic hints.
- Future section boundary capture has the substrate it needs for region classification and evidence refs.
- Future block grouping can use region geometry once section boundaries and candidate review exist.
- Readiness helpers can distinguish layout geometry presence from missing section boundary and navigation evidence.

Did not improve:

- Navigation extraction did not change.
- Section boundary classification did not change.
- Runtime mutation observation did not change.
- Candidate discovery and candidate review still do not execute.
- Dry Run, simulation, reconstruction, AI generation, React generation, block generation, worker execution, persistence schema, and publishing behavior did not change.
- Design token readiness did not materially improve.

Remaining blockers:

- No section boundary evidence.
- No navigation evidence extraction.
- No runtime mutation evidence.
- No candidate discovery execution.
- No candidate review execution or persisted reviewed reconstruction intent.
- No reconstruction execution, simulation execution, generated outputs, or publishing path.
- Layout geometry is single-slice major-region evidence only; above-fold extraction, repeated regions, sticky/fixed behavior, and multi-breakpoint geometry remain missing.

Recommended next phase:

- Phase 8A-8 - Section Boundary Capture

Rationale:

Section Boundary Capture is the best next implementation slice because layout geometry now exists as the substrate. It should convert rendered region boxes into classified section boundary evidence with confidence and evidence refs, without adding navigation capture, runtime mutation capture, simulation, reconstruction execution, generated output, database writes, or publishing behavior.

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
| layout geometry | PARTIAL | Real persisted major-region geometry now supports route layout context and future section boundary capture. It does not yet include above-fold extraction, repeated-region clustering, sticky/fixed classification, or multi-breakpoint behavior. | HIGH |
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
| route model | feasible | Source URL, route discovery, route priority, route provenance, and persisted major-region layout geometry make route-level planning feasible. |
| navigation model | risky | Route discovery and navigation provenance exist, and some nav regions may now have geometry, but there is no extracted navigation item model, sticky/fixed behavior, or multi-breakpoint behavior. |
| section model | risky | Rendered major-region geometry now gives section planning a partial substrate, but classified section boundary evidence, above-fold regions, repeated-region evidence, and runtime stability remain missing. |
| block model | not_ready | Block-quality grouping needs layout boxes plus section boundaries, widget/media inventory, candidate discovery execution, and reviewed candidates. Current data would still overfit DOM structure. |
| content model | risky | Rendered DOM, raw HTML, and geometry can support experimental extraction context, but there is no executed candidate discovery, content review, or durable generated model boundary. |
| design token model | not_ready | Computed style samples and style signals exist, but loaded font sources, broad style coverage, usage counts, layout-context-aware token extraction, and contract-shaped token candidates are incomplete. |

## Gap Analysis

### Critical Gaps

- No section boundary evidence: rendered major-region geometry exists, but the system does not yet classify section regions, assign confidence, or attach section evidence refs.
- No runtime mutation evidence: late content, lazy-load behavior, duplicate insertions, post-render nodes, and unstable DOM signals are missing.
- Minimum route-level handoff is not guaranteed for every captured route: artifact status, route identity, rendered DOM ref, rendered HTML hash, render status, route capture status, and blocker limitations still need deterministic normalization.
- No candidate discovery execution exists, so Dry Run would lack real discovered candidates unless supplied by contract-only metadata.

### Important Gaps

- Browser-observed network inventory is incomplete: current evidence is mostly direct asset fetch manifest rather than Playwright-level request, response, failed, and blocked request evidence.
- Widget inventory is incomplete for maps, galleries, forms, videos, accessibility overlays, cookie banners, and chat widgets.
- Media inventory lacks enough rendered dimensions, background selector hints, video refs, and missing-media selector evidence.
- Font evidence lacks loaded font source inventory and missing font source classification.
- Section evidence can now be grounded in rendered geometry, but section boundary capture has not yet created classified section refs.
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
2. Section boundary evidence derived from persisted layout geometry.
3. Navigation extraction with labels, hrefs, ordering, source refs, and layout context.
4. Runtime mutation summary.
5. Browser-level failed and blocked request summaries.
6. Widget and iframe inventory.
7. Rendered media inventory with dimensions and selector hints.

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

Dry Run Readiness score: 63/100.

Deterministic calculation:

| Component | Weight | Score | Rationale |
|---|---:|---:|---|
| Control-plane contract completeness | 25 | 24 | Planning Gate, Discovery, Review, Package, Dry Run Package, and Simulation Plan contracts exist and validate metadata boundaries. |
| Safety boundary clarity | 15 | 15 | Current contracts explicitly prohibit execution, generated outputs, workers, database writes, runtime writes, and publishing. |
| Minimum evidence handoff readiness | 20 | 8 | Required evidence mostly exists somewhere, but not reliably normalized into durable route-level reconstruction handoff artifacts. |
| Optional evidence usefulness | 20 | 9 | Screenshots, computed styles, media, widgets, and network evidence are partial; major-region layout geometry is now persisted, while mutation evidence remains missing. |
| Candidate/review/package practical availability | 10 | 3 | Contract shapes exist, but discovery/review execution and persistence do not exist. |
| First-model feasibility | 10 | 4 | Route model is feasible, section support has a partial geometry substrate, navigation/content remain risky, and block/design token models are not ready. |
| Total | 100 | 63 | Contract readiness is strong and evidence readiness improved, but the system remains below the limited-execution threshold. |

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
- Do not implement additional capture expansion in this phase.

Recommended next phase:

- Phase 8A-8 - Section Boundary Capture

Phase 8A-8 should use the newly persisted layout geometry as substrate for classified section boundary evidence with confidence and evidence refs. It should not add navigation capture, runtime mutation capture, simulation, reconstruction execution, generated outputs, database writes, or publishing behavior.
