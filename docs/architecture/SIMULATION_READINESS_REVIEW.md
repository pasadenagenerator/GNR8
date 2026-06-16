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

The control plane is ready to plan a first Dry Run. Phase 8A-6 materially improved captured evidence by adding real persisted layout geometry, Phase 8A-8 added deterministic persisted section boundary evidence, and Phase 8A-10 added deterministic persisted navigation evidence. The current evidence is now strong enough for route, navigation, and section model planning, and it is strong enough to design a first limited static Dry Run. It is still not ready for meaningful broad Dry Run execution.

The system can produce:

- Reconstruction Package metadata
- Dry Run Package metadata
- Simulation Plan metadata

The system cannot yet execute a Dry Run, and the evidence available to a future executor is still too thin for reliable runtime-stable, block, content, and design token simulation.

Recommended next phase:

- Phase 8A-12 - First Limited Dry Run Design

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

## Post 8A-8 Re-Assessment

Phase 8A-8 improved Dry Run readiness at the model-input level by adding deterministic persisted `SectionBoundaryEvidence` derived from existing `LayoutGeometryEvidence` and rendered DOM structure.

Previous 8A-7 scores:

- Conceptual Dry Run Readiness: 72/100
- Execution Dry Run Readiness: 63/100

Updated scores after 8A-8:

| Readiness Type | Score | Assessment |
|---|---:|---|
| Conceptual Dry Run Readiness | 77/100 | Higher because the route and section model inputs are now explicitly represented by implemented evidence, not only planned contracts. Layout geometry gives the rendered substrate, and section boundaries classify usable route regions with confidence. |
| Execution Dry Run Readiness | 68/100 | Higher because section evidence is now captured, persisted in the existing Evidence Capture baseline artifact, exposed through summary-only read paths, and used by capture-expansion readiness. It remains high-risk because navigation extraction, runtime mutation evidence, candidate discovery execution, candidate review execution, simulation execution, and reconstruction execution are still absent. |

Explanation:

8A-6 and 8A-8 together move Dry Run readiness from contract-planning-only toward limited first-model planning. The route model remains ready because route-scoped geometry exists. The section model becomes ready because section boundary evidence now classifies rendered regions with confidence and durable selectors. This does not make the overall Dry Run execution path ready: navigation is still inferred only from layout/section hints unless explicit navigation evidence exists, runtime stability is unknown, and there is still no executed candidate discovery, candidate review, simulation, reconstruction, generated output, worker path, or publishing path.

### Post 8A-8 Evidence Coverage Matrix

| Evidence Type | Contract Exists | Capture Implemented | Persisted | Used By Readiness | Status |
|---|---|---|---|---|---|
| layout geometry | yes | yes | yes | yes | READY |
| section boundaries | yes | yes | yes | yes | READY |
| navigation evidence | yes | no | no | yes, when supplied | MISSING |
| runtime mutation evidence | yes | no | no | yes, as presence/stability context | MISSING |

### Post 8A-8 Feasibility Matrix

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | Route-scoped evidence and persisted layout geometry remain available, so route-level planning has a rendered substrate. |
| navigation model | risky | Navigation regions may be visible through layout or section evidence, but there is still no explicit navigation item extraction, href/label ordering model, source evidence refs, sticky/fixed behavior, or multi-breakpoint navigation behavior. |
| section model | feasible | Section boundary evidence now classifies rendered regions with selectors, bounding boxes, region types, and confidence. Runtime stability and repeated-region refinement are still future improvements, but the core section model input is present. |
| block model | not_ready | Block-quality planning still needs section boundaries plus media/widget classification, candidate discovery execution, reviewed reconstruction intent, and block/content mapping boundaries. Section evidence alone does not choose or generate blocks. |
| content model | risky | Rendered DOM, raw HTML, geometry, and section boundaries provide better extraction context, but there is no executed candidate discovery, content review, or durable generated content model boundary. |
| design token model | not_ready | Section boundaries do not solve token extraction. Computed style samples remain partial and still lack broad usage counts, roles, loaded font confidence, and layout-context-aware token candidates. |

### Section Boundary Impact Analysis

Improved because of `SectionBoundaryEvidence`:

- The section model can now use deterministic classified regions instead of relying on raw DOM shape or unclassified major-region geometry.
- Section readiness can distinguish `READY` section evidence from geometry-only `PARTIAL` support.
- Future candidate discovery can start from route-scoped section refs with selectors, boxes, region types, and confidence.
- Block planning has a better upstream grouping substrate, even though block discovery and review still do not execute.
- Readiness scoring can now credit section model feasibility separately from route geometry feasibility.

Did not improve:

- Navigation extraction did not change.
- Runtime mutation observation did not change.
- Candidate discovery and candidate review still do not execute.
- Block, content, and design token generation remain out of scope.
- Dry Run, simulation, reconstruction, AI generation, React generation, block generation, worker execution, database writes, and publishing behavior did not change.

Remaining blockers:

- No explicit navigation evidence extraction.
- No runtime mutation evidence.
- No candidate discovery execution.
- No candidate review execution or persisted reviewed reconstruction intent.
- No reconstruction execution, simulation execution, generated outputs, or publishing path.
- No block model generation or block mapping boundary.
- No design token model generation or high-confidence token candidate inventory.
- Layout and section evidence remain single-slice evidence, without multi-breakpoint behavior, sticky/fixed classification, repeated-region clustering, or runtime stability context.

Recommended next phase:

- Phase 8A-10 - Navigation Capture

Rationale:

Navigation Capture is the highest-value next slice because route and section inputs are now ready, while the navigation model is still risky for lack of explicit labels, hrefs, ordering, counts, source refs, and layout context. Runtime Mutation Capture is still important, but navigation evidence is more directly required to make first Dry Run route relationships, menus, and cross-route structure inspectable before simulation or reconstruction execution.

## Post 8A-10 Re-Assessment

Phase 8A-10 improved Dry Run readiness at the model-planning level by adding deterministic persisted `NavigationEvidence` from the existing rendered DOM, `LayoutGeometryEvidence`, and `SectionBoundaryEvidence`.

Previous 8A-9 scores:

- Conceptual Dry Run Readiness: 77/100
- Execution Dry Run Readiness: 68/100

Updated scores after 8A-10:

| Readiness Type | Score | Assessment |
|---|---:|---|
| Conceptual Dry Run Readiness | 82/100 | Higher because the route, section, and navigation model inputs are now implemented evidence rather than inferred or contract-only shapes. The control plane can reason about route structure, rendered sections, and navigation relationships from persisted baseline evidence. |
| Execution Dry Run Readiness | 73/100 | Higher because navigation evidence is now captured, persisted in the existing Evidence Capture baseline artifact, exposed through summary-only read paths, and used by capture-expansion readiness. It remains high-risk because runtime mutation evidence, candidate discovery execution, candidate review execution, simulation execution, and reconstruction execution are still absent. |

Explanation:

8A-10 closes the largest remaining first-model planning gap. A future first limited Dry Run can now be designed around persisted route, section, and navigation evidence rather than guessing navigation from DOM or section hints. This makes a narrow static dry-run design viable. It does not make broad Dry Run execution ready: runtime stability remains unknown, no candidate discovery or review execution exists, and there is still no simulation, reconstruction, generated output, worker, database-write, or publishing path.

### Post 8A-10 Evidence Coverage Matrix

| Evidence Type | Contract Exists | Capture Implemented | Persisted | Used By Readiness | Status |
|---|---|---|---|---|---|
| layout geometry | yes | yes | yes | yes | READY |
| section boundaries | yes | yes | yes | yes | READY |
| navigation evidence | yes | yes | yes | yes | READY |
| runtime mutation evidence | yes | no | no | yes, as presence/stability context | MISSING |

### Post 8A-10 Feasibility Matrix

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | Route-scoped evidence, rendered layout geometry, section evidence, and navigation-discovered routes give route-level planning a persisted rendered substrate. |
| navigation model | feasible | `NavigationEvidence` now provides persisted labels, hrefs, stable positions, confidence, and route relationships. Sticky/fixed behavior, interaction states, and multi-breakpoint navigation remain future refinements. |
| section model | feasible | Section boundary evidence still provides classified rendered regions with selectors, boxes, region types, and confidence, now with better navigation disambiguation from explicit navigation evidence. |
| block model | not_ready | Block-quality planning still needs candidate discovery execution, reviewed reconstruction intent, media/widget classification, and block/content mapping boundaries. Route, section, and navigation evidence provide upstream context but do not choose or generate blocks. |
| content model | risky | Rendered DOM, raw HTML, geometry, sections, and navigation evidence provide better extraction context, but there is no executed candidate discovery, content review, or durable generated content model boundary. |
| design token model | not_ready | Navigation evidence does not solve token extraction. Computed style samples remain partial and still lack broad usage counts, roles, loaded font confidence, and layout-context-aware token candidates. |

### Navigation Impact Analysis

Improved because of `NavigationEvidence`:

- Navigation Model readiness can now be credited from real evidence rather than inferred navigation-like layout or section regions.
- Route relationships are more inspectable through persisted labels, hrefs, stable positions, confidence, item counts, and discovered route counts.
- Section planning can better distinguish navigation regions from content sections.
- A first limited Dry Run can now be designed around explicit route, section, and navigation inputs.
- Readiness scoring can separate runtime-stability risk from navigation-model availability.

Did not improve:

- Runtime mutation observation did not change.
- Candidate discovery and candidate review still do not execute.
- Block, content, and design token generation remain out of scope.
- Sticky/fixed navigation behavior, menu interaction states, hover/open states, and multi-breakpoint navigation behavior remain incomplete.
- Dry Run, simulation, reconstruction, AI generation, React generation, block generation, worker execution, database writes, and publishing behavior did not change.

Remaining blockers:

- No runtime mutation evidence.
- No candidate discovery execution.
- No candidate review execution or persisted reviewed reconstruction intent.
- No reconstruction execution, simulation execution, generated outputs, or publishing path.
- No block model generation or block mapping boundary.
- No design token model generation or high-confidence token candidate inventory.
- Layout, section, and navigation evidence remain single-slice evidence, without multi-breakpoint behavior, sticky/fixed classification, interaction-state capture, repeated-region clustering, or runtime stability context.

Recommended next phase:

- B. First Limited Dry Run Design

Rationale:

Navigation capture makes the first limited Dry Run design viable because the route, section, and navigation models now have persisted evidence and readiness integration. Runtime Mutation Capture is still required before meaningful or broad Dry Run execution, especially for dynamic sites, lazy-loaded content, client-rendered navigation changes, duplicate insertions, and unstable DOM behavior. However, it is no longer required before designing the first limited static Dry Run boundary. The next phase should define the narrow route scope, evidence prerequisites, candidate discovery expectations, allowed static assumptions, explicit runtime-mutation exclusions, and stop conditions before any execution implementation is attempted.

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

| Evidence Type | Contract Exists | Capture Implemented | Persisted | Used By Readiness | Status |
|---|---|---|---|---|---|
| layout geometry | yes | yes | yes | yes | READY |
| section boundaries | yes | yes | yes | yes | READY |
| navigation evidence | yes | yes | yes | yes | READY |
| runtime mutation evidence | yes | no | no | yes, as presence/stability context | MISSING |

## First Dry Run Feasibility

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | Source URL, route discovery, route priority, route provenance, persisted major-region layout geometry, section boundaries, and navigation-discovered route relationships make route-level planning feasible. |
| navigation model | feasible | Persisted `NavigationEvidence` now provides item labels, hrefs, stable positions, confidence, and discovered route counts. Sticky/fixed behavior, interaction states, and multi-breakpoint behavior remain future refinements. |
| section model | feasible | Persisted section boundary evidence now provides classified selectors, boxes, region types, and confidence for rendered sections, with explicit navigation evidence improving navigation/content disambiguation. |
| block model | not_ready | Block-quality grouping needs section evidence plus widget/media classification, candidate discovery execution, reviewed reconstruction intent, and block/content mapping boundaries. Current data would still overfit DOM structure. |
| content model | risky | Rendered DOM, raw HTML, geometry, and section boundaries can support experimental extraction context, but there is no executed candidate discovery, content review, or durable generated model boundary. |
| design token model | not_ready | Computed style samples and style signals exist, but loaded font sources, broad style coverage, usage counts, layout-context-aware token extraction, and contract-shaped token candidates are incomplete. |

## Gap Analysis

### Critical Gaps

- No runtime mutation evidence: late content, lazy-load behavior, duplicate insertions, post-render nodes, and unstable DOM signals are missing.
- Minimum route-level handoff is not guaranteed for every captured route: artifact status, route identity, rendered DOM ref, rendered HTML hash, render status, route capture status, and blocker limitations still need deterministic normalization.
- No candidate discovery execution exists, so Dry Run would lack real discovered candidates unless supplied by contract-only metadata.

### Important Gaps

- Browser-observed network inventory is incomplete: current evidence is mostly direct asset fetch manifest rather than Playwright-level request, response, failed, and blocked request evidence.
- Widget inventory is incomplete for maps, galleries, forms, videos, accessibility overlays, cookie banners, and chat widgets.
- Media inventory lacks enough rendered dimensions, background selector hints, video refs, and missing-media selector evidence.
- Font evidence lacks loaded font source inventory and missing font source classification.
- Section evidence now has classified section refs, but it still lacks multi-breakpoint behavior, sticky/fixed classification, repeated-region clustering, and runtime stability context.
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
2. Runtime mutation summary.
3. Candidate discovery execution over route, section, and navigation evidence.
4. Browser-level failed and blocked request summaries.
5. Widget and iframe inventory.
6. Rendered media inventory with dimensions and selector hints.
7. Loaded font and missing font source inventory.

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

- Use persisted Navigation Evidence for labels, hrefs, ordering, counts, confidence, discovered route counts, and layout context in the first limited Dry Run design.
- Extend layout geometry beyond major structural regions for headings, CTAs, images, cards, forms, maps, galleries, and footer detail.
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

Dry Run Readiness score: 73/100.

Deterministic calculation:

| Component | Weight | Score | Rationale |
|---|---:|---:|---|
| Control-plane contract completeness | 25 | 24 | Planning Gate, Discovery, Review, Package, Dry Run Package, and Simulation Plan contracts exist and validate metadata boundaries. |
| Safety boundary clarity | 15 | 15 | Current contracts explicitly prohibit execution, generated outputs, workers, database writes, runtime writes, and publishing. |
| Minimum evidence handoff readiness | 20 | 8 | Required evidence mostly exists somewhere, but not reliably normalized into durable route-level reconstruction handoff artifacts. |
| Optional evidence usefulness | 20 | 15 | Screenshots, computed styles, media, widgets, and network evidence are partial; major-region layout geometry, section boundary evidence, and navigation evidence are now persisted, while runtime mutation evidence remains missing. |
| Candidate/review/package practical availability | 10 | 3 | Contract shapes exist, but discovery/review execution and persistence do not exist. |
| First-model feasibility | 10 | 8 | Route, navigation, and section models are feasible; content remains risky; and block/design token models are not ready. |
| Total | 100 | 73 | Contract readiness is strong and evidence readiness is now enough for first limited static Dry Run design, but execution remains high risk. |

Interpretation:

- 0-39: not ready for planning.
- 40-64: ready for contract planning, not ready for meaningful execution.
- 65-79: limited first execution possible with high risk.
- 80-100: meaningful first Dry Run execution readiness.

The current score falls in the limited-first-execution-possible-with-high-risk band. This is not approval to execute a Dry Run; it means a first limited Dry Run design is now viable, with runtime mutation evidence and candidate discovery/review execution still gating meaningful execution.

## Readiness Decision

Current decision:

- Do not execute a broad or meaningful Dry Run yet.
- First limited static Dry Run design is now viable.
- Do not add AI generation.
- Do not generate React.
- Do not generate blocks.
- Do not implement reconstruction execution.
- Do not implement additional capture expansion in this phase.

Recommended next phase:

- Phase 8A-12 - First Limited Dry Run Design

Phase 8A-12 should define the first limited static Dry Run design using persisted route, layout geometry, section boundary, and navigation evidence. It should specify narrow scope, evidence prerequisites, static-site assumptions, explicit exclusions for runtime mutation-dependent pages, candidate discovery expectations, stop conditions, and validation gates. It should not add runtime mutation capture, simulation execution, reconstruction execution, AI generation, React generation, block generation, generated outputs, database writes, or publishing behavior.

## Post 8B-3 Re-Assessment

Phase 8B-3 improved first limited Dry Run readiness at the deterministic builder level by implementing `buildFirstLimitedDryRunOutput(...)` for Route Model, Navigation Model, and Section Model only.

Previous 8A-11 scores:

- Conceptual Dry Run Readiness: 82/100
- Execution Dry Run Readiness: 73/100

Updated scores after 8B-3:

| Readiness Type | Score | Assessment |
|---|---:|---|
| Conceptual Dry Run Readiness | 86/100 | Higher because the first limited Dry Run is no longer only a design and contract boundary. It now has a deterministic builder that maps approved dry-run package scope and existing Evidence Capture baseline evidence into reviewable route, navigation, and section models with validation and limitations. |
| Execution Dry Run Readiness | 77/100 | Higher because a pure builder can now produce valid limited output in existing builder tests without AI, runtime mutation, database writes, workers, publishing, or generated site output. It remains below broad execution readiness because persistence, runtime/API trigger, operator surface, approval flow, sample real-site run, runtime mutation evidence, and candidate discovery/review execution are still missing. |

Explanation:

8B-3 answers the core static-builder question positively: the deterministic builder is sufficient to justify moving toward a controlled runtime dry-run surface. The next surface should remain narrow and non-publishing. The immediate gap is durability and reviewability, not model construction. A runtime/API trigger or UI surface would be premature until the limited output has a persistence boundary.

### Post 8B-3 Feasibility Matrix

| Target Model | Feasibility | Rationale |
|---|---|---|
| route model | feasible | The builder creates route models from explicit dry-run route scope and captured source URLs only, with section/navigation refs and propagated limitations. |
| navigation model | feasible | The builder consumes persisted `NavigationEvidence` for labels, hrefs, stable positions, confidence, source refs, deterministic ordering, and dedupe. |
| section model | feasible | The builder consumes `SectionBoundaryEvidence` and preserves selectors, bounding boxes, region types, confidence, source refs, and limitations without recomputing geometry. |
| content model | risky | Existing rendered DOM and section context can support later exploration, but the first limited builder deliberately excludes generated content models, candidate discovery execution, and reviewed content boundaries. |
| block model | not_ready | Block modeling still needs candidate discovery execution, reviewed reconstruction intent, media/widget classification, block/content mapping, and a later generation boundary. |
| design token model | not_ready | Design token modeling still lacks token candidate contracts, loaded font confidence, broad style usage counts, role mapping, and layout-context-aware token extraction. |

### Runtime Readiness Matrix

| Capability | Status | Gap |
|---|---|---|
| contract | implemented | None for the first limited Route/Navigation/Section output boundary. |
| builder | implemented | Needs persistence before it can become a controlled runtime artifact. |
| validation | implemented | Validation exists for allowed output shape and forbidden output containers; runtime validation wiring is still absent. |
| persistence | missing | No durable storage exists for first limited dry-run outputs. |
| API trigger | missing | No admin or runtime trigger exists for invoking the builder. |
| UI display | missing | No operator or Site Workspace surface exists for inspecting output. |
| worker execution | missing | No worker job should exist yet; worker execution remains out of scope. |
| approval | missing | No approval workflow exists for dry-run outputs. |
| publish | missing | Publishing remains forbidden and out of scope. |

### Next Step Recommendation

Recommended next phase:

- A. Add persistence for first limited dry-run outputs

Rationale:

Persistence is the smallest controlled step after the builder. It would make the deterministic output durable and reviewable without introducing API/runtime triggers, UI surface area, workers, approval execution, publishing, AI, React/block/content/design-token generation, or runtime mutation capture. API and UI work should follow only after the output has a narrow storage boundary.
