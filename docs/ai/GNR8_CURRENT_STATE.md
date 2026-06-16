# GNR8 CURRENT STATE SNAPSHOT

## Snapshot Date
2026-06-16

## Migration Platform MVP Buildout

Website OS runtime expansion remains paused.

Completed migration-first chain:
- Import
- CMS
- Renderer
- Durable Jobs
- Durable Batches
- Batch Execution
- Batch Execution Observability
- Command Center Integration
- Hosting Operations
- Hosting Hardening
- Multi-Page Import MVP
- Discovery Expansion

Migration Runtime + Command Center MVP is operational and smoke-tested.
Phase 6 is COMPLETE.
Phase 7B — Multi-Page Import MVP is COMPLETE.
Phase 7B classification is SUCCESSFUL.
Phase 7B operator classification is A. Operator Ready.
Phase 7C — Discovery Expansion is COMPLETE.
Phase 7C classification is A/B successful.
Phase 7C has no architectural blockers.
Discovery expansion is operational.
Phase 7D — Multi-Page Raw Preview Correctness + Observability is COMPLETE through 7D-9.
Phase 7D has no runtime behavior changes outstanding.
Phase 7F — Importer Architecture Evolution is COMPLETE through 7F-15.
Importer architecture direction is now Evidence Capture -> Original Mirror -> Reconstruction.
Phase 7F completed the architecture split, Evidence Capture artifact contract, inventory audit, baseline artifact persistence, Original Mirror Fidelity surface, Reconstruction Input Contract, Capture Expansion Planning, Minimum Evidence Handoff Normalization, Evidence Capture enrichment layer, Reconstruction Readiness evaluation, Reconstruction Readiness surface, Reconstruction Planning Gate, Reconstruction Candidate Discovery Contract, Reconstruction Candidate Review Contract, Reconstruction Package Contract, and Reconstruction Control Plane Closure.
No reconstruction execution, AI reconstruction, React/block generation, reconstruction workers, reconstruction approvals, reconstruction publishing, capture behavior change, preview behavior change, route discovery change, asset rewriting change, script policy change, public rendering change, API change, or DB schema change exists in Phase 7F.
Phase 8A-0 — Dry Run Boundary Planning is COMPLETE.
Phase 8A-0 defined the deterministic boundary between Reconstruction Package and a future Dry Run, including dry-run package shape, status models, generated output shape types, boundary rules, human approval requirements, and dry-run eligibility evaluation.
No dry-run execution, reconstruction execution, AI reconstruction, React/block generation, reconstruction workers, reconstruction approvals, reconstruction publishing, capture behavior change, preview behavior change, route discovery change, asset rewriting change, script policy change, public rendering change, API change, database write, or DB schema change exists in Phase 8A-0.
Phase 8A-1 — First Dry Run Contract Validation is COMPLETE.
Phase 8A-1 validates that an approved Reconstruction Package can produce a valid planned Dry Run Package contract. Ready packages create `status = planned`, `simulationStatus = pending`, `generatedOutputs = []`, and no blockers. Not-ready packages create `status = blocked`, `simulationStatus = unavailable`, and blockers explaining why.
Phase 8A-1 adds `validateReconstructionDryRunPackage(...)` for creation-time contract validation, including required IDs, route scope, blocked-package blockers, empty generated outputs, non-simulated status, non-complete simulation status, informational-only output, and future approval gating.
No dry-run execution, reconstruction execution, AI reconstruction, React/block generation, reconstruction workers, reconstruction approvals, reconstruction publishing, capture behavior change, preview behavior change, route discovery change, asset rewriting change, script policy change, public rendering change, API change, database write, or DB schema change exists in Phase 8A-1.
Phase 8A-2 — Dry Run Simulation Planning Contract is COMPLETE.
Phase 8A-2 defines the deterministic `ReconstructionSimulationPlan` contract for what a future dry run would attempt to simulate. Planned Dry Run Packages create `planStatus = planned` with a fixed ordered planned step list. Blocked Dry Run Packages create `planStatus = blocked` with blockers and no planned steps.
Phase 8A-2 adds `createReconstructionSimulationPlan(...)` and `validateReconstructionSimulationPlan(...)` for contract-only planning. Simulation Plan status values are `not_started`, `planned`, and `blocked`; no running, executed, completed, complete, or simulated plan states exist.
No simulation execution, dry-run execution, reconstruction execution, AI reconstruction, React/block generation, reconstruction workers, reconstruction approvals, reconstruction publishing, capture behavior change, preview behavior change, route discovery change, asset rewriting change, script policy change, public rendering change, API change, database write, generated output, simulation artifact production, or DB schema change exists in Phase 8A-2.
Phase 8A-3 — Simulation Readiness Review is COMPLETE.
Phase 8A-3 audits whether the current Evidence Capture foundation and Reconstruction Control Plane contain enough information to support a meaningful first Dry Run. Result: the control plane is ready to plan a Dry Run, but current captured evidence is not yet ready for meaningful Dry Run execution.
Phase 8A-3 creates `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the readiness audit, evidence coverage matrix, first-model feasibility assessment, gap analysis, recommended capture expansion, and deterministic Dry Run Readiness score.
Dry Run Readiness score is 58/100. Current state is contract-planning-ready, not execution-ready. Critical gaps are minimum route-level handoff normalization, rendered layout geometry, runtime mutation evidence, and actual candidate discovery/review availability.
Phase 8A-4 — Capture Expansion For First Dry Run is COMPLETE.
Phase 8A-4 adds contract-only evidence shapes for layout geometry, section boundaries, navigation evidence, and runtime mutation evidence, plus `evaluateCaptureExpansionReadiness(...)` for `READY` / `PARTIAL` / `MISSING` support checks across route, navigation, and section models.
Phase 8A-4 creates `docs/architecture/CAPTURE_EXPANSION_FOR_FIRST_DRY_RUN.md` and `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts`.
No importer behavior, capture behavior, Original Mirror behavior, candidate discovery behavior, candidate review behavior, reconstruction execution, dry-run execution, simulation execution, AI generation, React generation, block generation, publishing behavior, API behavior, database write, or DB schema change exists in Phase 8A-4.
Phase 8A-5 — Dry Run Readiness Re-Assessment is COMPLETE.
Phase 8A-5 updates `docs/architecture/SIMULATION_READINESS_REVIEW.md` with a post-8A-4 reassessment. Result: conceptual Dry Run readiness improved to 68/100 because missing evidence shapes are now defined; execution Dry Run readiness remains 58/100 because capture implementation does not yet populate layout geometry, section boundary, navigation, or runtime mutation evidence.
Phase 8A-5 recommends Phase 8A-6 — First Capture Implementation Slice, with layout geometry capture as the first primary path.
No importer behavior, capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, browser instrumentation, generated output, database write, or publishing logic exists in Phase 8A-5.
Phase 8A-6 — Layout Geometry Capture is COMPLETE.
Phase 8A-6 implements deterministic rendered layout geometry capture for major structural regions only. `LayoutGeometryEvidence` now persists route path, viewport dimensions, document height, and major `body` / `main` / `header` / `nav` / `footer` / `aside` / `section` regions with selectors, roles, normalized bounding boxes, and child counts inside the existing Evidence Capture baseline artifact.
Phase 8A-6 exposes summary-only geometry presence in the Evidence Capture baseline read path and updates capture-expansion readiness so layout geometry makes the route model ready and the section model partial while section boundary evidence remains missing. Navigation readiness behavior remains unchanged.
No section inference, navigation extraction, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, candidate discovery execution, candidate review execution, database schema change, LLM call, or new persistence table exists in Phase 8A-6.
Phase 8A-7 — Dry Run Readiness Re-Assessment is COMPLETE.
Phase 8A-7 updates `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the post-8A-6 assessment. Result: conceptual Dry Run readiness improved from 68/100 to 72/100, and execution Dry Run readiness improved from 58/100 to 63/100 because real persisted layout geometry now exists and is used by readiness. The system remains contract-planning-ready, not meaningful-execution-ready.
Phase 8A-7 recommends Phase 8A-8 — Section Boundary Capture because layout geometry now exists as the substrate for classified section boundary evidence.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, generated output, database write, navigation capture, runtime mutation capture, or section boundary capture exists in Phase 8A-7.
Phase 8A-8 — Section Boundary Capture is COMPLETE.
Phase 8A-8 implements deterministic `SectionBoundaryEvidence` from existing `LayoutGeometryEvidence` plus rendered DOM structure. Evidence is classified into allowed region types only: `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
Phase 8A-8 persists section boundary evidence inside the existing Evidence Capture baseline artifact under `captureExpansionEvidence.sectionBoundaryEvidence`, exposes summary-only section evidence presence/count/types, and updates capture-expansion readiness so the Section Model is READY when section boundary evidence exists. Route Model remains READY from route/geometry evidence, and Navigation Model behavior is unchanged.
No importer behavior, Original Mirror behavior, preview behavior, navigation extraction, runtime mutation capture, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, LLM call, generated output, database schema change, new persistence table, or publishing logic exists in Phase 8A-8.
Phase 8A-9 — Dry Run Readiness Re-Assessment is COMPLETE.
Phase 8A-9 updates `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the post-8A-8 assessment. Result: conceptual Dry Run readiness improved from 72/100 to 77/100, and execution Dry Run readiness improved from 63/100 to 68/100 because real persisted section boundary evidence now exists and is used by readiness. Route Model remains READY, Section Model is READY, Navigation Model remains RISKY, Block Model remains NOT_READY, and Design Token Model remains NOT_READY.
Phase 8A-9 recommends Phase 8A-10 — Navigation Capture because route and section evidence are now ready while explicit navigation labels, hrefs, ordering, counts, confidence, source refs, and layout context are still missing.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, navigation capture, runtime mutation capture, generated output, database write, or publishing logic exists in Phase 8A-9.
Phase 8A-10 — Navigation Capture is COMPLETE.
Phase 8A-10 implements deterministic `NavigationEvidence` from the existing rendered DOM, `LayoutGeometryEvidence`, and `SectionBoundaryEvidence`. Navigation items include label, href, stable position, and `LOW` / `MEDIUM` / `HIGH` confidence only.
Phase 8A-10 persists navigation evidence inside the existing Evidence Capture baseline artifact under `captureExpansionEvidence.navigationEvidence`, exposes summary-only navigation presence/item count/discovered route count, and keeps `evaluateCaptureExpansionReadiness(...)` at Navigation Model READY when real `NavigationEvidence` exists.
No importer behavior, Original Mirror behavior, preview behavior, section boundary capture, runtime mutation capture, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, LLM call, generated output, database schema change, new persistence table, or publishing logic exists in Phase 8A-10.
Phase 8A-11 — Dry Run Readiness Re-Assessment is COMPLETE.
Phase 8A-11 updates `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the post-8A-10 assessment. Result: conceptual Dry Run readiness improved from 77/100 to 82/100, and execution Dry Run readiness improved from 68/100 to 73/100 because real persisted navigation evidence now exists and is used by readiness. Route Model, Navigation Model, and Section Model are feasible; Content Model remains risky; Block Model and Design Token Model remain NOT_READY.
Phase 8A-11 concludes that navigation capture makes first limited static Dry Run design viable, while meaningful or broad Dry Run execution still requires runtime mutation evidence and candidate discovery/review execution.
Phase 8A-11 recommends Phase 8B-0 — First Limited Dry Run Design.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, runtime mutation capture, generated output, database write, or publishing logic exists in Phase 8A-11.
Phase 8B-0 — First Limited Dry Run Design is COMPLETE.
Phase 8B-0 creates `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md` and defines the first useful limited Dry Run output scope as Route Model, Navigation Model, and Section Model only. It defines the input boundary, documentation-only output model shapes, success criteria, failure criteria, human review boundary, and safest first target site type.
Phase 8B-0 explicitly forbids Block Model, Content Model, Design Token Model, React, GNR8 blocks, CMS bindings, CMS/content models, publishing artifacts, generated site output, editable blocks, rewritten content, reconstruction workers, runtime mutations, and database writes.
Phase 8B-0 recommends Phase 8B-1 — First Limited Dry Run Contract.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture implementation, runtime mutation capture, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic exists in Phase 8B-0.
Phase 8B-1 — First Limited Dry Run Contract is COMPLETE.
Phase 8B-1 creates `apps/platform/gnr8/architecture/first-limited-dry-run-contract.ts` and defines the formal `FirstLimitedDryRunOutput` contract for Route Model, Navigation Model, and Section Model only. Output status values are `planned`, `valid`, `invalid`, and `blocked`; no executed, completed, or published statuses exist.
Phase 8B-1 adds `validateFirstLimitedDryRunOutput(...)` to reject forbidden output payloads including Block Model, Content Model, Design Token Model, React output, CMS bindings, publishing artifacts, and generated output containers.
Phase 8B-1 adds `createEmptyFirstLimitedDryRunOutput(...)`, which carries IDs, route scope, limitations, and created timestamp from `ReconstructionDryRunPackage`, initializes status as `planned`, creates no route/navigation/section models, and does not execute simulation.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic exists in Phase 8B-1.
Phase 8B-2 — First Limited Dry Run Builder Design is COMPLETE.
Phase 8B-2 creates `docs/architecture/FIRST_LIMITED_DRY_RUN_BUILDER_DESIGN.md` and defines exact deterministic mapping rules for constructing `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel` from existing Evidence Capture baseline data, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, and `NavigationEvidence`.
Phase 8B-2 defines route mapping from explicit dry-run route scope and captured source URLs only; navigation mapping from `NavigationEvidence` with deterministic confidence, dedupe, ordering, and evidence refs; section mapping from `SectionBoundaryEvidence` and `LayoutGeometryEvidence` with deterministic ordering, selector handling, bounding box handling, confidence propagation, and limitation propagation.
Phase 8B-2 defines limitation flow from Evidence Capture, section evidence, navigation evidence, and existing dry-run package limitations into `FirstLimitedDryRunOutput.limitations`; traceability requirements for model refs and top-level evidence refs; and determinism rules requiring same input to produce same output with no randomness, AI, live network reads, preview reads, Original Mirror product-truth reads, selector generation, or bounding box recomputation.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, generated route model output, generated navigation model output, generated section model output, or publishing logic exists in Phase 8B-2.
Phase 8B-3 — First Limited Dry Run Builder Implementation is COMPLETE.
Phase 8B-3 creates `apps/platform/gnr8/architecture/first-limited-dry-run-builder.ts` and implements `buildFirstLimitedDryRunOutput(...)` as a pure deterministic builder from `ReconstructionDryRunPackage`, Evidence Capture baseline records, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, and `NavigationEvidence`.
Phase 8B-3 builds only `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel` inside `FirstLimitedDryRunOutput`. It uses explicit `routeScope.routes` only, captured source URLs only, navigation evidence labels/hrefs/confidence only, section boundary selectors/bounding boxes/confidence only, and layout geometry only for traceability/consistency limitations.
Phase 8B-3 propagates dry-run package limitations and deterministic missing navigation evidence, missing section evidence, missing source URL, and route/evidence mismatch limitations. Builder output validates with `validateFirstLimitedDryRunOutput(...)`.
No importer behavior, Evidence Capture capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution runtime, simulation execution runtime, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic exists in Phase 8B-3.
Phase 8B-4 — First Limited Dry Run Builder Re-Assessment is COMPLETE.
Phase 8B-4 updates `docs/architecture/SIMULATION_READINESS_REVIEW.md` and `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md` with the post-8B-3 reassessment. Result: conceptual Dry Run readiness improved from 82/100 to 86/100, and execution Dry Run readiness improved from 73/100 to 77/100 because a deterministic builder now produces validated Route Model, Navigation Model, and Section Model output from existing evidence only.
Phase 8B-4 concludes that the deterministic builder is sufficient to justify moving toward a controlled runtime dry-run surface, but persistence should come first. Feasibility remains route model feasible, navigation model feasible, section model feasible, content model risky, block model not_ready, and design token model not_ready.
Phase 8B-4 recommends Phase 8B-5 — First Limited Dry Run Output Persistence.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run runtime execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, runtime API, UI surface, approval workflow, or publishing logic exists in Phase 8B-4.
Phase 8B-5 — First Limited Dry Run Output Persistence is COMPLETE.
Phase 8B-5 creates `apps/platform/gnr8/architecture/first-limited-dry-run-output-persistence.ts` and persists validated `FirstLimitedDryRunOutput` payloads as durable provenance artifacts using artifact kind `first_limited_dry_run_output` in the existing runtime site-version `import_provenance_summary` boundary.
Phase 8B-5 adds `persistFirstLimitedDryRunOutput(...)`, which validates the output with `validateFirstLimitedDryRunOutput(...)`, rejects forbidden generated output shapes before write, checks `siteVersionId` and `dryRunId` consistency, persists validation metadata and diagnostics, and returns artifact reference metadata.
Phase 8B-5 adds `loadLatestFirstLimitedDryRunOutput(...)`, which reads the latest valid persisted output for a `siteVersionId` and optional `dryRunId` without executing a dry run.
No importer behavior, Evidence Capture capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run runtime execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, runtime API, UI surface, approval workflow, publishing behavior, generated React, generated GNR8 blocks, CMS bindings, or publishing logic exists in Phase 8B-5.
Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design is COMPLETE.
Phase 8B-6 creates `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md` and defines the superadmin-only trigger boundary for safely creating and persisting a `FirstLimitedDryRunOutput`. The trigger may load the latest Evidence Capture baseline, load the matching `ReconstructionDryRunPackage`, run the deterministic builder, validate output, persist a valid artifact, and return artifact metadata and model counts.
Phase 8B-6 defines fail-closed access control, a request shape with required `siteVersionId` and `dryRunId`, forbidden `routeScope` and `force` overrides, a response shape with artifact metadata, output/validation status, model counts, limitations counts, and diagnostics, deterministic failure cases, deterministic append-with-latest-pointer idempotency, and audit fields including `triggeredBy`, `triggeredAt`, input refs, validation result, artifact ref, and limitations count.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, dry-run execution runtime, simulation execution runtime, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, API route, UI button, queue execution, publishing behavior, source content mutation, domain/DNS mutation, CMS mutation, generated React, generated GNR8 blocks, CMS bindings, or publishing logic exists in Phase 8B-6.
Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation is COMPLETE.
Phase 8B-7 creates `apps/platform/app/api/gnr8/admin/first-limited-dry-run/route.ts` and wires the deterministic first limited dry-run builder behind a fail-closed superadmin-only POST API. The route validates `siteVersionId` and `dryRunId`, rejects `routeScope`, `force`, evidence payloads, generated outputs, and other extra request fields, loads the runtime site version, reads the latest Evidence Capture baseline, loads the matching `ReconstructionDryRunPackage`, builds and validates `FirstLimitedDryRunOutput`, persists valid output as `first_limited_dry_run_output`, and returns metadata only.
Phase 8B-7 implements deterministic append-with-latest-pointer idempotency at the trigger boundary: when the rebuilt output is equivalent to the latest valid artifact for the same `siteVersionId` and `dryRunId`, the route reuses that artifact; when the output differs, it appends a new artifact and advances the latest pointer through existing persistence.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run worker execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, publishing behavior, worker jobs, queues, UI button, approval workflow, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic exists in Phase 8B-7.
Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design is COMPLETE.
Phase 8B-8 updates `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md` with a post-8B-7 reassessment and creates `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`.
Phase 8B-8 concludes that the API-only trigger is sufficient for the next UI phase because it persists or reuses a validated `first_limited_dry_run_output` and returns the metadata needed for read-only inspection. It designs a dedicated admin dry-run page titled "First Limited Dry Run" that displays artifact status, output status, validation status, idempotency result, route/navigation/section model counts, limitations count, blocker limitations count, diagnostics, model details, evidence refs, and empty states.
Phase 8B-8 requires the surface to remain read-only, initially superadmin/admin-only, with no publish controls, approve controls, reconstruction controls, AI controls, edit controls, trigger controls, worker jobs, queues, CMS bindings, public/client-user access, tenant-admin access, generated React, generated GNR8 blocks, generated content, design token generation, or publishing logic.
Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation is COMPLETE.
Phase 8B-9 creates `apps/platform/gnr8/architecture/first-limited-dry-run-surface-projection.ts` and `apps/platform/app/gnr8/admin/first-limited-dry-run/[siteVersionId]/page.tsx`.
Phase 8B-9 adds `loadLatestFirstLimitedDryRunSurfaceProjection(...)`, a defensive read-model projection for the latest persisted `first_limited_dry_run_output` artifact. The projection includes artifact ref/kind, dry-run and site-version IDs, output/validation status, route/navigation/section counts, limitations and blocker counts, diagnostics, timestamps, and Route/Navigation/Section Model arrays. It represents missing, invalid, and blocked latest output states without executing any dry-run work.
Phase 8B-9 adds a dedicated superadmin-only admin page at `/gnr8/admin/first-limited-dry-run/[siteVersionId]` titled "First Limited Dry Run". The page displays overview metadata, diagnostics, route models, navigation models, section models grouped by route, limitations, and empty states for no output, invalid output, blocked output, no route models, and output limitations.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, trigger UI, approval workflow, worker jobs, queues, public/client-user access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic exists in Phase 8B-9.
Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification is COMPLETE.
Phase 8B-10 adds focused integration-style admin verification for the limited dry-run diagnostic chain. The test creates fake runtime site-version provenance with an Evidence Capture baseline, layout geometry evidence, section boundary evidence, navigation evidence, and a valid `ReconstructionDryRunPackage`; calls the superadmin API trigger handler; asserts a persisted `first_limited_dry_run_output` artifact is created; loads the latest persisted output; builds the read-only surface projection; and verifies route, navigation, and section model counts and page labels.
Phase 8B-10 verifies idempotency: the first equivalent call creates an artifact, the second equivalent call reuses the latest artifact without a second write, and changed navigation evidence creates a new latest artifact when the rebuilt output differs.
Phase 8B-10 verifies safety: unauthorized requests are rejected, forbidden request fields are rejected, trigger responses contain metadata only, persisted output does not contain forbidden generated-output fields, and the read-only admin page source contains no trigger, rebuild, approve, publish, edit, AI, form, button, input, textarea, or select controls.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence schema, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, publishing behavior, new API routes, UI controls, worker jobs, queues, generated React, GNR8 blocks, CMS bindings, or publishing logic was added in Phase 8B-10.
Current Phase: Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification is complete.
Next recommended major phase: Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary. Do not execute Dry Run workers, simulation, reconstruction, AI generation, React generation, block generation, content generation, design token generation, workers, UI write controls, approval workflow, publishing, source content mutation, domain/DNS mutation, or CMS mutation without a separate explicit phase.

## Current Importer Architecture

Evidence Capture Layer:
- Implemented: Evidence Capture contracts, inventory audit, persisted `evidence_capture_baseline`, baseline coverage projection, Minimum Evidence Handoff Normalization, enrichment helpers for readiness comparison, Phase 8A-4 contract-only capture expansion shapes for layout geometry, section boundaries, navigation evidence, and runtime mutation evidence, Phase 8A-6 deterministic layout geometry capture for rendered major structural regions, Phase 8A-7 post-geometry Dry Run readiness reassessment, Phase 8A-8 deterministic section boundary capture, Phase 8A-9 post-section-boundary Dry Run readiness reassessment, Phase 8A-10 deterministic navigation capture, and Phase 8A-11 post-navigation Dry Run readiness reassessment.
- Partially implemented: current persisted evidence includes raw HTML, rendered DOM refs where available, viewport/full-page screenshots where available, computed style samples where available, rendered layout geometry where available, deterministic section boundary evidence where geometry exists, deterministic navigation evidence where rendered navigation links exist, direct asset fetch manifests, acquisition evidence, diagnostics, worker job state, worker health, and multi-page route discovery evidence.
- Future: runtime mutation capture, broader browser network inventory, script/runtime observation, rich media and widget inventories, and additional normalized fidelity limitation evidence.
- Provider strategy: Chrome / Playwright is the primary capture provider. Servo is research only, not an active provider, not a fallback provider, and not required for Reconstruction Readiness.

Original Mirror Layer:
- Implemented: Original Mirror Preview boundary, Original Mirror Fidelity projection, operator-facing coverage summary, fidelity badge, readiness state, known limitations, and route-level limitations when persisted route evidence exists.
- Partially implemented: Original Mirror Fidelity explains the current persisted baseline and its limitations; it does not remediate capture gaps or change rendering.
- Future: richer limitation evidence as Evidence Capture expands.

Reconstruction Layer:
- Implemented: Reconstruction Input Contract, deterministic readiness levels (`NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, `HIGH_CONFIDENCE`), blocker model, readiness evaluation helpers, Site Workspace Reconstruction Readiness projection, metadata-only Reconstruction Planning Gate, metadata-only Reconstruction Candidate Discovery Contract, metadata-only Reconstruction Candidate Review Contract, metadata-only Reconstruction Package Contract, Reconstruction Control Plane Closure, metadata-only Dry Run Boundary Contract, dry-run package contract validation, deterministic Dry Run Simulation Plan contract, Simulation Readiness Review, post-8A-4 Dry Run readiness reassessment, post-8A-6 Dry Run readiness reassessment, post-8A-8 Dry Run readiness reassessment, post-8A-10 Dry Run readiness reassessment, capture-expansion readiness integration for section boundary and navigation evidence, 8B-0 first limited Dry Run design, 8B-1 first limited Dry Run output contract, 8B-2 first limited Dry Run builder design, 8B-3 deterministic first limited Dry Run builder implementation, 8B-4 first limited Dry Run builder reassessment, 8B-5 first limited Dry Run output persistence, 8B-6 admin-only first limited Dry Run trigger design, 8B-7 admin-only first limited Dry Run API trigger implementation, 8B-8 read-only first limited Dry Run surface design, 8B-9 dedicated read-only first limited Dry Run admin surface, and 8B-10 end-to-end admin verification.
- Partially implemented: evidence can be normalized and evaluated for readiness, enriched evidence can be compared with baseline evidence, capture-expansion evidence can be evaluated for route/navigation/section model support, readiness can be evaluated for planning eligibility, planning output can be evaluated for candidate discovery eligibility, completed discovery package metadata can be evaluated for human review eligibility, reviewed candidate metadata can be packaged for future dry-run reconstruction, a Reconstruction Package can be evaluated for future Dry Run eligibility, an approved Reconstruction Package can produce a valid planned Dry Run Package contract without execution, a planned Dry Run Package can produce a deterministic Simulation Plan without simulation execution, a `ReconstructionDryRunPackage` can build a valid first limited output containing route/navigation/section models from existing evidence only, and that `FirstLimitedDryRunOutput` can now be persisted, triggered through a superadmin-only API, inspected through a dedicated read-only superadmin page, and verified end to end as an admin-only diagnostic flow. The current state now has real layout geometry evidence, deterministic section boundary evidence, deterministic navigation evidence, an 8B-1 contract-only first limited Dry Run output shape, an 8B-2 mapping design, an 8B-3 pure builder for constructing route/navigation/section models from existing evidence, an 8B-5 persistence boundary, an 8B-6 trigger design, an 8B-7 API trigger, an 8B-8 read-only surface design, an 8B-9 read-only admin diagnostics page, and 8B-10 end-to-end admin verification. Meaningful Dry Run execution still requires runtime mutation evidence and candidate discovery/review execution.
- Future: reconstruction execution, AI reconstruction, GNR8 React/block generation, editable content model generation, design token generation, reconstruction workers, approvals, and publishing.
Phase 6A — Hosting Operations MVP is complete.
Phase 6B — Hosting Operations Workflow Review is complete.
Phase 6C-A — Readiness & Domain Operations MVP is complete.
Phase 6C-A2 — Internal vs Custom Domain Visibility is complete.
Phase 6C-B — Asset Diagnostics Drilldown is complete.
Hosting Operations MVP is complete.
Hosting Hardening is complete.
Imported Runtime Reconciliation is complete.
Canonical Active Serving Resolution is complete.
Raw imported production serving is complete.
Compatibility-based runtime adaptation has been validated in production.

Completed capabilities:
- CMS slot materialization
- CMS public render proof
- MVP renderer path validated
- durable migration job store
- durable migration job admin runtime
- durable migration batch model
- operator-driven sequential batch execution
- durable batch execution events
- batch status transitions
- batch observability read model
- batch execution summary model
- batch execution timeline model
- failure reporting
- diagnostics surfaces
- Command Center migration batch section
- migration batch list page
- migration batch detail page
- batch summary surface
- batch diagnostics surface
- batch failure surface
- batch timeline surface
- Run Batch control
- Resume Batch control
- migration batch service layer
- migration batch view model layer
- Hosting Operations
- hosting overview page
- hosting detail page
- active version visibility
- active artifact visibility
- publish history visibility
- runtime readiness visibility
- domain readiness visibility
- readiness drilldown
- internal/working domain visibility
- external/custom domain visibility
- DNS instruction visibility
- domain recheck workflow
- asset diagnostics visibility
- asset diagnostics summary
- asset diagnostics drilldown
- asset diagnostics severity classification
- asset diagnostics remediation guidance
- asset diagnostics empty-state handling
- runtime diagnostics visibility
- Active Serving Consistency
- Imported Runtime Reconciliation
- Governance Reconciliation
- Publish Lineage Reconciliation
- Host-Binding Raw Template Serving
- Mono Map Compatibility Restoration
- Maver Production Validation
- Multi-Page Discovery Integration
- Multi-Page HTML Acquisition
- Multi-Page Raw Artifact Assembly
- Controlled Route-Map Preview
- Internal Link Rewriting
- Multi-Page Validation Engine
- Multi-Page Operator Visibility
- Multi-Page Operator Validation Completion
- Sitemap Discovery Integration
- Robots Discovery
- Canonical Discovery
- Redirect / Alias Discovery
- Discovery Quality Validation
- Discovery Priority Balancing
- Multi-Page Raw Preview Correctness
- Multi-Page Raw Preview Observability
- Raw Multi-Page Route Inspection
- Raw Preview Route Coverage Verification
- Raw/Transformed Preview Boundary Clarification
- Importer Architecture Split

Current migration runtime capabilities:
- durable jobs
- durable batches
- batch execution
- batch observability
- batch diagnostics
- batch failure reporting
- Command Center integration
- operator batch controls
- Hosting Operations observability
- hosting overview visibility
- hosting detail visibility
- active version visibility
- active artifact visibility
- publish history visibility
- runtime readiness visibility
- domain readiness visibility
- readiness drilldown visibility
- internal/working domain visibility
- external/custom domain visibility
- DNS instruction visibility
- domain recheck workflow visibility
- asset diagnostics visibility
- asset diagnostics summary visibility
- asset diagnostics drilldown visibility
- asset diagnostics severity classification visibility
- asset diagnostics remediation guidance visibility
- asset diagnostics empty-state handling
- runtime diagnostics visibility
- canonical active serving resolution
- raw imported production serving
- imported runtime reconciliation
- compatibility-based runtime adaptation
- OpenStreetMap compatibility fallback
- internal page discovery
- multi-page acquisition
- route-map assembly
- child-page preview rendering
- internal navigation rewriting
- route validation
- link validation
- operator diagnostics
- static website import readiness evaluation
- sitemap.xml discovery
- sitemap_index.xml discovery
- nested sitemap traversal
- sitemap provenance
- sitemap operator visibility
- robots.txt parsing
- sitemap declarations from robots.txt
- allow/disallow evidence
- route governance evidence
- canonical URL extraction
- hreflang extraction
- canonical conflict detection
- canonical provenance
- redirect evidence
- alias groups
- route collision evidence
- redirect provenance
- tiered route prioritization
- seed-visible navigation protection
- route-budget balancing
- sitemap-heavy site protection
- raw multi-page preview route correctness
- raw multi-page preview observability
- deterministic siteVersionId reuse verification
- raw preview route coverage verification
- raw preview link rewrite verification
- root route assembly as `root_entry` from `index.html`
- raw multi-page preview links separated from transformed preview
- importer architecture split into Evidence Capture, Original Mirror, and Reconstruction
- evidence capture inventory audit baseline documented
- current evidence coverage measured as 16 supported, 33 partial, and 17 missing contract fields
- reconstruction input contract boundary documented
- deterministic reconstruction readiness model defined
- current reconstruction readiness remains NOT_READY
- reconstruction control-plane closure documented through Future Dry Run boundary
- dry-run package contract builder and validator
- importer architecture terminology:
  - Evidence Capture
  - Capture Provider
  - Original Mirror Preview
  - GNR8 Reconstruction Preview
  - Known Fidelity Limitation
  - Reconstruction Candidate
  - Reconstruction Input Artifact
  - Reconstruction Candidate Artifact

Hosting Operations now exposes:
- Hosting Overview
- Hosting Detail
- Runtime Readiness
- Readiness Drilldown
- Internal / Working Domains
- External / Custom Domains
- DNS visibility
- Domain recheck workflow
- Asset Diagnostics Drilldown

## Phase 7B Multi-Page Import MVP

Status:
- COMPLETE.

Classification:
- SUCCESSFUL.

Operator classification:
- A. Operator Ready.

Delivered:
- Discovery-only integration with `multiPageDiscovery`, route candidate discovery, and manifest persistence in provenance.
- Controlled child-page acquisition with acquisition manifest, diagnostics, and fetched-page evidence persistence.
- Deterministic route-map assembly with multi-page raw artifact evidence, `routeMap` persistence, and `htmlPathMap` persistence.
- Preview-only route-map resolver with nested route support, explicit route misses, and route-map diagnostics.
- Controlled preview link rewriting with route-aware navigation, route normalization reuse, and deterministic diagnostics.
- Multi-page preview validation with readiness classification, route validation, link validation, warnings, and blockers.
- Operator summary, route tables, discovery visibility, acquisition visibility, assembly visibility, and validation visibility.
- Operator-readable validation status alignment, recommendations, warning/blocker visibility, diagnostics, and developer diagnostics isolation.

Validation statuses:
- ready
- ready_with_warnings
- blocked

Real website validation:
- Viroidoc: discovery successful, acquisition successful, assembly successful, preview successful.
- Paul Graham: discovery successful, acquisition successful, assembly successful, route-limit warnings surfaced correctly.

Phase 7B finding resolved:
- Initial assembly blocker from apex/www canonical-host mismatch was discovered and fixed.

Explicitly not included in Phase 7B:
- sitemap.xml discovery
- robots.txt discovery
- canonical URL expansion
- dynamic content import
- CMS page-scoped materialization
- commerce import
- compatibility-provider extraction
- public production multi-page serving
- automatic publish activation

## Phase 7C Discovery Expansion

Status:
- COMPLETE.

Classification:
- A/B successful.
- No architectural blockers.
- Discovery expansion operational.

Delivered:
- 7C-1 Sitemap Discovery Integration: `sitemap.xml` discovery, `sitemap_index.xml` discovery, nested sitemap traversal, sitemap provenance, and sitemap operator visibility.
- 7C-2 Robots Discovery: `robots.txt` parsing, sitemap declarations, allow/disallow evidence, route governance evidence, and operator visibility.
- 7C-3 Canonical Discovery: canonical URL extraction, hreflang extraction, canonical conflict detection, canonical provenance, and operator visibility.
- 7C-4 Redirect / Alias Discovery: redirect evidence, alias groups, route collision evidence, redirect provenance, and operator visibility.
- 7C-5 Discovery Quality Validation: Viroidoc validation, MDN validation, GOV.UK validation, Paul Graham validation, Slovenia.info validation, and discovery quality assessment.
- 7C-6 Discovery Priority Balancing: tiered route prioritization, seed-visible navigation protection, route-budget balancing, sitemap-heavy site protection, and operator diagnostics.

Key real-world outcome:
- Top-level navigation remains represented even under route limits on sitemap-heavy sites.

Explicitly not yet implemented:
- dynamic route discovery
- authenticated/private areas
- JavaScript click-path crawling
- e-commerce discovery
- CMS page materialization
- production multi-page serving
- dynamic content extraction

Current Phase:
- Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification is complete.

Next Phase:
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary.

## Phase 7D Multi-Page Raw Preview Correctness + Observability

Status:
- COMPLETE through 7D-9.

Production Viroidoc verification:
- latest import run: `client-site-import-1780996748493`
- siteVersionId reused deterministically: `e9257245-0256-4291-9989-66a33ee6741e`
- artifactId: `f44a3f28-5635-4237-b73a-a33af993c73d`
- acquired pages: 20
- valid preview routes: 21
- missing preview routes: 0
- rewritten links: 39

Confirmed behavior:
- The root route is assembled as `root_entry` using `index.html`.
- Raw multi-page preview links are separated from transformed preview.
- Transformed preview remains semantic/fallback.
- Transformed preview is not the source of truth for route-level inspection.

Boundary:
- No runtime behavior changed.
- No import logic changed.
- No public activation changes.
- No CMS changes.
- No commerce work.

## Phase 7F Importer Architecture Evolution

Status:
- COMPLETE through 7F-15.

Canonical architecture doc:
- `docs/architecture/IMPORTER_ARCHITECTURE_SPLIT.md`

Type scaffolding:
- `apps/platform/gnr8/architecture/importer-architecture-split-contract.ts`

Layer split:
- Evidence Capture Layer captures source-site evidence as a browser/user sees it.
- Original Mirror Layer provides a read-only, non-semantic, non-AI mirror/archive preview labeled `Original Mirror Preview`.
- Reconstruction Layer will create future GNR8-native editable output from evidence and is labeled `GNR8 Reconstruction Preview` when implemented.

Completed:
- Architecture Split.
- Evidence Capture Artifact Contract.
- Evidence Capture Inventory Audit.
- Current Evidence Capture Baseline persistence as `evidence_capture_baseline`.
- Original Mirror Fidelity surface.
- Reconstruction Input Contract.
- Capture Expansion Planning.
- Minimum Evidence Handoff Normalization.
- Evidence Capture Enrichment.
- Reconstruction Readiness Evaluation.
- Reconstruction Readiness Surface.
- Reconstruction Planning Gate.
- Reconstruction Candidate Discovery Contract.
- Reconstruction Candidate Review Contract.
- Reconstruction Package Contract.
- Reconstruction Control Plane Closure.
- Dry Run Boundary Contract.
- First Dry Run Contract Validation.

Explicit unresolved cases:
- ViroiDoc blog/news duplication is not solved by raw preview patching.
- Mono/Maver map behavior likely requires evidence capture plus widget reconstruction.
- Dongle showed source-reference preservation risk in importer/mirror behavior.
- DB lifecycle issue was fixed before this phase.
- Raw preview remains useful for route inspection and Original Mirror behavior, but Evidence Capture is the foundation for future Reconstruction.

Not included:
- no ViroiDoc fix
- no Maver/Mono map fix
- no active Servo provider
- no AI reconstruction
- no reconstruction execution
- no React/block generation
- no reconstruction workers
- no reconstruction approvals
- no reconstruction publishing
- no preview renderer rewrite
- no import-limit changes
- no script-policy changes

Next recommended major phase:
- 8B-11: First Limited Dry Run Re-Assessment / Next Safe Boundary.

## Production Validation

Maver (`transportimaver.si`) successfully serves through the GNR8 runtime.

Validated:
- active pointer resolution
- host binding resolution
- raw imported artifact serving
- governance enforcement
- publish activation
- imported runtime reconciliation
- asset serving
- compatibility rendering
- OpenStreetMap compatibility fallback

Result:
- Pixel-perfect production clone successfully served through GNR8 runtime.

## Provider Architecture

Canonical provider architecture:
1. Infrastructure Providers
2. Runtime Service Providers
3. Compatibility Providers

Compatibility Providers convert source-system functionality into GNR8-native blocks rendered through approved runtime providers.

Example:
- Mono Map
- extract address/coords
- generate GNR8 Map Block
- render through Leaflet/OpenStreetMap Runtime Provider

Production smoke test:
- `/gnr8/command-center/migration-batches` loaded successfully.
- `/gnr8/command-center/migration-batches/migration_batch_smoke_test_demo_v1` loaded successfully.
- `/gnr8/command-center/hosting` loaded successfully.
- `/gnr8/command-center/hosting/[siteId]` loaded successfully.
- summary, diagnostics, failures, timeline, completed jobs, pending jobs, and failed jobs rendered.
- Active Version, Active Artifact, Publish Timestamp, Runtime Readiness, Domain Readiness, Readiness Drilldown, Internal/Working Domains, External/Custom Domains, DNS Instructions, Domain Recheck, Asset Diagnostics Summary, and Runtime Diagnostics rendered.
- hosting detail page now renders asset diagnostics summary, severity classification, remediation guidance, and empty-state handling.
- DB connection pressure fix validated.
- EMAXCONNSESSION issue resolved through composed server read path.
- production hosting smoke test completed successfully.
- production readiness and domain operations smoke verification completed successfully.
- production asset diagnostics drilldown smoke verification completed successfully.
- Maver production validation completed successfully for `transportimaver.si`.
- compatibility rendering and OpenStreetMap fallback validated in production.

Execution boundary:
- execution remains operator-driven
- hosting execution remains read-only
- no publish execution controls added
- publish workflow remains read-only from Hosting Operations
- rollback UI remains intentionally excluded
- no domain execution controls added
- no DNS/provider execution was introduced
- queue/worker orchestration does not exist yet
- unattended orchestration does not exist yet

Remaining critical path:
- Phase 8A-2 — Dry Run Simulation Planning Contract
- Billing

Current Hosting Operations status:
- Hosting Operations MVP is functionally complete.
- Hosting Hardening is complete.
- Phase 6 is complete.
- Phase 7B is complete.
- Phase 7C is complete.
- Phase 7D is complete through 7D-9.
- Phase 7F is complete through 7F-15 as importer architecture evolution and reconstruction control-plane closure.
- Phase 8A-0 is complete as dry-run boundary planning.
- Phase 8A-1 is complete as first dry-run contract validation.

Next recommended milestone:
- Phase 8A-2 — Dry Run Simulation Planning Contract

Phase 7F recommended focus:
- Preserve the Evidence Capture -> Original Mirror -> Reconstruction boundary.
- Keep Original Mirror Preview separate from GNR8 Reconstruction Preview.
- Use Reconstruction Readiness as the gate before planning any reconstruction execution.

## Bootstrap Runtime State (2026-06-03)

- Observation Runtime v1 completed.
- Insight Runtime v1 completed.
- Recommendation Runtime v1 completed.
- Optimization Runtime v1 completed.
- Optimization Scoring Runtime v1 completed.
- Proposal Candidate Runtime v1 completed.
- Proposal Approval Runtime v1 completed.
- Approval State Runtime v1 completed.
- Approval Queue Preview Runtime v1 completed.
- Execution Readiness Runtime v1 completed.
- Execution Package Preview Runtime v1 completed.
- Execution Package Readiness Runtime v1 completed.
- Execution Contract Preview Runtime v1 completed.
- Execution Authorization Readiness Runtime v1 completed.
- Execution Authorization Package Runtime v1 completed.
- Execution Plan Readiness Runtime v1 completed.
- Execution Candidate Runtime v1 completed.
- Execution Candidate Readiness Runtime v1 completed.
- Execution Candidate Package Runtime v1 completed.
- Execution Candidate Authorization Runtime v1 completed.
- Execution Candidate Authorization Readiness Runtime v1 completed.
- Execution Candidate Authorization Package Runtime v1 completed.
- Proposal Candidate Operator UX Cleanup v1 completed.

## Website OS Candidate Authorization Branch Closure (2026-06-03)

Website OS Candidate Authorization branch is complete.

Completed Website OS runtime chain:
- Execution Candidate Runtime v1
- Execution Candidate Readiness Runtime v1
- Execution Candidate Package Runtime v1
- Execution Candidate Authorization Runtime v1
- Execution Candidate Authorization Readiness Runtime v1
- Execution Candidate Authorization Package Runtime v1

Latest completed Website OS milestone:
- Execution Candidate Authorization Package Runtime v1

Website OS runtime expansion status:
- PAUSED

Governance remains:
- read-only
- non-executable
- no mutations
- no publishing
- no provider execution
- no AI actions

Migration-first reprioritization:
- Website OS runtime expansion is intentionally paused.
- The current business objective is production migration across website migration, renderer, CMS, hosting, domains, and billing.
- Future continuation point is the Execution Artifact Runtime family.
- The Execution Artifact Runtime family is not currently part of the migration-critical path.

Current migration platform continuation:
- Phase 7B — Multi-Page Import MVP is complete.
- Phase 7C — Discovery Expansion is complete.
- Phase 7D — Multi-Page Raw Preview Correctness + Observability is complete through 7D-9.
- Phase 7F — Importer Architecture Evolution is complete through 7F-15.
- Phase 8A-0 — Dry Run Boundary Planning is complete.
- Phase 8A-1 — First Dry Run Contract Validation is complete.
- Phase 8A-2 — Dry Run Simulation Planning Contract is complete.
- Phase 8A-3 — Simulation Readiness Review is complete.
- Phase 8A-4 — Capture Expansion For First Dry Run is complete.
- Phase 8A-5 — Dry Run Readiness Re-Assessment is complete.
- Phase 8A-6 — Layout Geometry Capture is complete.
- Phase 8A-7 — Dry Run Readiness Re-Assessment is complete.
- Phase 8A-8 — Section Boundary Capture is complete.
- Phase 8A-9 — Dry Run Readiness Re-Assessment is complete.
- Phase 8A-10 — Navigation Capture is complete.
- Phase 8A-11 — Dry Run Readiness Re-Assessment is complete.
- Phase 8B-0 — First Limited Dry Run Design is complete.
- Phase 8B-1 — First Limited Dry Run Contract is complete.
- Phase 8B-2 — First Limited Dry Run Builder Design is complete.
- Phase 8B-3 — First Limited Dry Run Builder Implementation is complete.
- Phase 8B-4 — First Limited Dry Run Builder Re-Assessment is complete.
- Phase 8B-5 — First Limited Dry Run Output Persistence is complete.
- Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design is complete.
- Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation is complete.
- Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design is complete.
- Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation is complete.
- Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification is complete.
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary is the next recommended phase.
- Website OS runtime expansion remains paused.
- Execution Artifact Runtime family remains outside the migration-critical path.

## Execution Candidate Authorization Family v1 Milestone (2026-06-03)

Execution Candidate Authorization Family completed.

Completed milestones:
- Execution Candidate Authorization Runtime v1
- Execution Candidate Authorization Readiness Runtime v1
- Execution Candidate Authorization Package Runtime v1

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization-readiness.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization-package.ts`

Readiness outputs:
- `authorizationPresent`
- `authorizationRequirementsPresent`
- `blockedReasons`
- `readinessState`
- `readinessScore`

Package outputs:
- `packageState`
- `includedComponents`
- `missingComponents`
- `authorizationState`
- `authorizationType`

Governance states:
- `execution_candidate_authorization_preview_only`
- `execution_candidate_authorization_readiness_preview_only`
- `execution_candidate_authorization_package_preview_only`

Maver verified outputs:
1. `Homepage Conversion Flow`
   - `Authorization`: `blocked`
   - `Authorization Readiness`: `incomplete`
   - `Authorization Package`: `package_incomplete`
2. `Homepage Quality & Messaging`
   - `Authorization`: `authorization_ready_preview`
   - `Authorization Readiness`: `nearly_ready`
   - `Authorization Package`: `package_ready`
3. `Validation Runtime`
   - `Authorization`: `authorization_ready_preview`
   - `Authorization Readiness`: `ready`
   - `Authorization Package`: `package_ready`

Current architecture chain:
- `Proposal → Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Candidate → Execution Candidate Readiness → Execution Candidate Package → Execution Candidate Authorization → Execution Candidate Authorization Readiness → Execution Candidate Authorization Package`

Preserved boundaries:
- No execution introduced.
- No mutation introduced.
- No publishing introduced.
- No provider execution introduced.

Conclusion:
- Execution Candidate Authorization Family completed successfully.
- Governance graph extended.
- All governance boundaries preserved.
- Execution remains blocked.
- Mutation remains blocked.
- Publishing remains blocked.
- Provider execution remains blocked.

Future continuation:
- Execution Artifact Runtime family
- Status: paused.
- Not currently part of the migration-critical path.

Current migration platform continuation:
- Phase 7B — Multi-Page Import MVP is complete.
- Phase 7C — Discovery Expansion is complete.
- Phase 7D — Multi-Page Raw Preview Correctness + Observability is complete through 7D-9.
- Phase 7F — Importer Architecture Evolution is complete through 7F-15.
- Phase 8A-0 — Dry Run Boundary Planning is complete.
- Phase 8A-1 — First Dry Run Contract Validation is complete.
- Phase 8A-2 — Dry Run Simulation Planning Contract is complete.
- Phase 8A-3 — Simulation Readiness Review is complete.
- Phase 8A-4 — Capture Expansion For First Dry Run is complete.
- Phase 8A-5 — Dry Run Readiness Re-Assessment is complete.
- Phase 8A-6 — Layout Geometry Capture is complete.
- Phase 8A-7 — Dry Run Readiness Re-Assessment is complete.
- Phase 8A-8 — Section Boundary Capture is complete.
- Phase 8A-9 — Dry Run Readiness Re-Assessment is complete.
- Phase 8A-10 — Navigation Capture is complete.
- Phase 8A-11 — Dry Run Readiness Re-Assessment is complete.
- Phase 8B-0 — First Limited Dry Run Design is complete.
- Phase 8B-1 — First Limited Dry Run Contract is complete.
- Phase 8B-2 — First Limited Dry Run Builder Design is complete.
- Phase 8B-3 — First Limited Dry Run Builder Implementation is complete.
- Phase 8B-4 — First Limited Dry Run Builder Re-Assessment is complete.
- Phase 8B-5 — First Limited Dry Run Output Persistence is complete.
- Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design is complete.
- Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation is complete.
- Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design is complete.
- Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation is complete.
- Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification is complete.
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary is the next recommended phase.
- Website OS runtime expansion remains paused.

## Execution Candidate Runtime Family v1 Milestone (2026-06-03)

Milestone family is complete and documented.

Completed milestones:
- Execution Candidate Runtime v1
- Execution Candidate Readiness Runtime v1
- Execution Candidate Package Runtime v1

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-candidate.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-candidate-readiness.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-candidate-package.ts`

Runtime summary:
- Website OS now supports deterministic preview-only candidate generation, candidate qualification evaluation, and candidate package assembly.
- All runtime outputs remain governance blocked.
- No execution capability exists.
- No mutation capability exists.
- No provider execution capability exists.
- No publishing capability exists.

Verified Maver output:
1. `Homepage Conversion Flow`
   - `Candidate`: `blocked_candidate`
   - `Candidate Readiness`: `incomplete`
   - `Candidate Package`: `package_incomplete`
2. `Homepage Quality & Messaging`
   - `Candidate`: `candidate_ready_preview`
   - `Candidate Readiness`: `nearly_ready`
   - `Candidate Package`: `package_ready`
3. `Validation Runtime`
   - `Candidate`: `candidate_ready_preview`
   - `Candidate Readiness`: `ready`
   - `Candidate Package`: `package_ready`

Governance lock:
- `executionAllowed=false`
- `mutationAllowed=false`
- `publishingAllowed=false`
- `providerExecutionAllowed=false`
- `governanceState=execution_candidate_preview_only`
- `governanceState=execution_candidate_readiness_preview_only`
- `governanceState=execution_candidate_package_preview_only`

Preserved boundaries:
- no execution
- no mutations
- no publishing
- no provider execution
- no AI actions
- no jobs
- no queues
- no workers
- no API changes
- no database schema changes
- no UI changes

Current architecture chain:
- `Proposal → Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Candidate → Execution Candidate Readiness → Execution Candidate Package`

Future continuation:
- Execution Artifact Runtime family.
- Status: paused.
- Not currently part of the migration-critical path.

## Execution Plan Readiness Runtime v1 Milestone (2026-06-03)

Milestone is complete and documented.

Runtime file:
- `apps/platform/gnr8/runtime/twin/twin-execution-plan-readiness.ts`

Implemented function:
- `buildExecutionPlanReadinessRecords(...)`

Emitted records:
- `executionPlanReadinessRecords`

Record fields:
- `readinessState`
- `readinessScore`
- `requirementsMet`
- `requirementsMissing`
- `executionPlanPresent`
- `planningArtifactsPresent`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`

Verified Maver output:
1. `Homepage Conversion Flow`
   - `readinessState`: `incomplete`
   - `readinessScore`: `80`
2. `Homepage Quality & Messaging`
   - `readinessState`: `nearly_ready`
   - `readinessScore`: `90`
3. `Validation Runtime`
   - `readinessState`: `ready`
   - `readinessScore`: `100`

Governance lock:
- `executionAllowed=false`
- `mutationAllowed=false`
- `publishingAllowed=false`
- `providerExecutionAllowed=false`
- `governanceState=execution_plan_readiness_preview_only`

Preserved boundaries:
- no execution
- no approval workflow
- no mutation execution
- no publishing
- no provider execution
- no queues or workers
- no API changes
- no database schema changes
- no UI changes
- no AI model calls
- deterministic read-only plan readiness modeling only

Plan Readiness architecture chain:
- `Planning Candidates → Governance Review → Approval Records → Approval States → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Artifact Preview`

Conclusion:
- Workspace Overview now exposes deterministic read-only Execution Plan Readiness records derived from Execution Plan Preview and planning artifact presence.
- No execution capability exists.

Next dependency milestone now completed:
- Execution Candidate Authorization Family

## Execution Authorization Package Runtime v1 Milestone (2026-06-03)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-authorization-package.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-authorization-package.test.ts`

Implemented function:
- `generateTwinExecutionAuthorizationPackageRecords(authorizationPreviews, authorizationReadinessRecords)`

Model:
- `TwinExecutionAuthorizationPackageRecord`

Model fields:
- `proposalId`
- `proposalTitle`
- `packageState`
- `readinessState`
- `readinessScore`
- `authorizationType`
- `includedComponents`
- `missingComponents`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`
- `summary`

Package states:
- `package_incomplete`
- `package_ready`

Verified deployed Transporti Maver execution authorization package records:
1. `Improve Homepage Conversion Flow`
   - `packageState`: `package_incomplete`
   - `readinessState`: `not_ready`
   - `readinessScore`: `85`
   - `authorizationType`: `conversion_authorization`
   - `missingComponents`: `conversion_baseline`, `design_evidence`
2. `Improve Homepage Quality and Messaging`
   - `packageState`: `package_ready`
   - `readinessState`: `nearly_ready`
   - `readinessScore`: `95`
   - `authorizationType`: `content_authorization`
   - `missingComponents`: `design_evidence`
3. `Maintain Read-Only Validation Mode`
   - `packageState`: `package_ready`
   - `readinessState`: `ready`
   - `readinessScore`: `100`
   - `authorizationType`: `governance_validation_authorization`
   - `missingComponents`: `[]`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `execution_authorization_package_preview_only`

Diagnostics:
- `TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED`
- `TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED`

Preserved boundaries:
- no authorization workflow
- no approval workflow
- no execution workflow
- no operator actions
- no publishing
- no provider execution
- no mutations
- no AI model calls
- no background jobs
- no API routes
- no database schema changes
- read-only deterministic package modeling only

Architecture chain:
- `Proposal Candidate → Proposal Approval Preview → Proposal Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Plan Preview`

Conclusion:
- Workspace Planning Console now exposes deterministic read-only Execution Authorization Package records derived from Execution Authorization Preview and Execution Authorization Readiness records.
- No execution capability exists.

Next dependency milestone now completed:
- Execution Plan Readiness Runtime v1

## Execution Authorization Readiness Runtime v1 Milestone (2026-06-03)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-authorization-readiness.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-authorization-readiness.test.ts`

Implemented function:
- `generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews)`

Model:
- `TwinExecutionAuthorizationReadinessRecord`

Model fields:
- `proposalId`
- `proposalTitle`
- `readinessState`
- `readinessScore`
- `requirementsMet`
- `requirementsMissing`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`
- `summary`

Readiness states:
- `not_ready`
- `nearly_ready`
- `ready`

Verified deployed Transporti Maver execution authorization readiness records:
1. `Improve Homepage Conversion Flow`
   - `readinessState`: `not_ready`
   - `readinessScore`: `85`
   - `requirementsMissing`: `conversion_baseline`, `design_evidence`
2. `Improve Homepage Quality and Messaging`
   - `readinessState`: `nearly_ready`
   - `readinessScore`: `95`
   - `requirementsMissing`: `design_evidence`
3. `Maintain Read-Only Validation Mode`
   - `readinessState`: `ready`
   - `readinessScore`: `100`
   - `requirementsMissing`: `[]`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `execution_authorization_readiness_preview_only`

Diagnostics:
- `TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED`
- `TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED`

Preserved boundaries:
- no authorization workflow
- no approval workflow
- no execution workflow
- no operator actions
- no publishing
- no provider execution
- no mutations
- no AI model calls
- read-only deterministic runtime only

Architecture chain:
- `Proposal Candidate → Proposal Approval Preview → Proposal Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Plan Preview`

Conclusion:
- Workspace Planning Console now exposes deterministic read-only Execution Authorization Readiness records derived from Execution Authorization Preview records.
- No execution capability exists.

Next dependency milestone now completed:
- Execution Authorization Package Runtime v1

## Execution Contract Preview Runtime v1 Milestone (2026-06-02)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-contract-preview.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-contract-preview.test.ts`

Implemented function:
- `generateTwinExecutionContractPreviews(packageReadinessRecords)`

Model:
- `TwinExecutionContractPreview`

Contract preview states:
- `contract_preview_ready`
- `contract_preview_incomplete`
- `contract_preview_blocked`

Verified deployed Transporti Maver execution contract previews:
1. `Improve Homepage Conversion Flow`
   - `contractPreviewState`: `contract_preview_incomplete`
   - `readinessScore`: `70`
   - `contractType`: `conversion_execution_contract`
2. `Improve Homepage Quality and Messaging`
   - `contractPreviewState`: `contract_preview_ready`
   - `readinessScore`: `90`
   - `contractType`: `content_execution_contract`
3. `Maintain Read-Only Validation Mode`
   - `contractPreviewState`: `contract_preview_ready`
   - `readinessScore`: `100`
   - `contractType`: `governance_validation_contract`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `execution_contract_preview_only`

Diagnostics:
- `TWIN_EXECUTION_CONTRACT_PREVIEW_STARTED`
- `TWIN_EXECUTION_CONTRACT_PREVIEW_COMPLETED`

Preserved boundaries:
- no execution
- no approval workflow
- no mutation execution
- no publishing
- no provider execution
- no AI model calls
- deterministic preview modeling only

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Planning Console now displays deterministic Execution Contract Preview artifacts derived from Execution Package Readiness Runtime records.
- Execution contract preview remains governance-blocked and non-executable.

Recommended next milestone:
- Execution Contract Readiness Runtime v1

## Execution Package Readiness Runtime v1 Milestone (2026-06-02)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-package-readiness.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-package-readiness.test.ts`

Implemented function:
- `generateTwinExecutionPackageReadinessRecords(packagePreviews)`

Execution Package Readiness model fields:
- `packageId`
- `proposalId`
- `proposalTitle`
- `readinessState`
- `readinessScore`
- `requirementsMet`
- `requirementsMissing`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`
- `summary`

Readiness states:
- `incomplete`
- `nearly_ready`
- `ready`

Verified deployed Transporti Maver package readiness records:
1. `Improve Homepage Conversion Flow`
   - `readinessState`: `incomplete`
   - `readinessScore`: `70`
   - `requirementsMet`: `execution_package_present`, `planning_artifacts_present`, `homepage_detected`
   - `requirementsMissing`: `conversion_baseline`, `design_evidence`
2. `Improve Homepage Quality and Messaging`
   - `readinessState`: `nearly_ready`
   - `readinessScore`: `90`
   - `requirementsMet`: `execution_package_present`, `planning_artifacts_present`, `messaging_surface_identified`, `homepage_detected`
   - `requirementsMissing`: `design_evidence`
3. `Maintain Read-Only Validation Mode`
   - `readinessState`: `ready`
   - `readinessScore`: `100`
   - `requirementsMet`: `execution_package_present`, `governance_boundary_present`, `validation_runtime_active`
   - `requirementsMissing`: `none`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `execution_package_readiness_preview_only`

Diagnostics:
- `TWIN_EXECUTION_PACKAGE_READINESS_STARTED`
- `TWIN_EXECUTION_PACKAGE_READINESS_COMPLETED`

Preserved boundaries:
- no execution
- no workflow
- no approvals
- no artifact generation
- no publishing
- no provider execution
- no mutation execution
- no AI model calls
- deterministic read-only package readiness modeling only

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Planning Console now displays deterministic Execution Package Readiness records derived from Execution Package Preview records.
- Execution package readiness remains governance-blocked and non-executable.

Recommended next milestone:
- Execution Contract Readiness Runtime v1

## Execution Package Preview Runtime v1 Milestone (2026-06-02)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-package-preview.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-package-preview.test.ts`

Implemented function:
- `generateTwinExecutionPackagePreviews({ readinessRecords, executionPlanPreviews, executionArtifactPreviews })`

Execution Package Preview model fields:
- `packageId`
- `proposalId`
- `proposalTitle`
- `packageState`
- `readinessState`
- `readinessScore`
- `includedArtifacts`
- `includedPlans`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`
- `summary`

Package states:
- `preview_ready`
- `preview_incomplete`

Verified deployed Transporti Maver package previews:
1. `Improve Homepage Conversion Flow`
   - `packageState`: `preview_ready`
   - `readinessState`: `partially_ready`
   - `readinessScore`: `60`
   - `includedPlans`: `analyze_homepage_conversion_flow`, `identify_primary_conversion_path`, `prepare_conversion_improvement_plan`
   - `includedArtifacts`: `conversion_review_document`, `conversion_improvement_plan`
2. `Improve Homepage Quality and Messaging`
   - `packageState`: `preview_ready`
   - `readinessState`: `ready_for_future_planning`
   - `readinessScore`: `80`
   - `includedPlans`: `analyze_homepage_content`, `identify_messaging_improvements`, `prepare_content_improvement_plan`
   - `includedArtifacts`: `messaging_review_document`, `content_improvement_plan`
3. `Maintain Read-Only Validation Mode`
   - `packageState`: `preview_ready`
   - `readinessState`: `ready_for_future_planning`
   - `readinessScore`: `100`
   - `includedPlans`: `maintain_read_only_runtime`, `continue_validation_observation`
   - `includedArtifacts`: `validation_status_report`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `execution_package_preview_only`

Diagnostics:
- `TWIN_EXECUTION_PACKAGE_PREVIEW_STARTED`
- `TWIN_EXECUTION_PACKAGE_PREVIEW_COMPLETED`

Preserved boundaries:
- no execution
- no artifact generation
- no approval workflow
- no approval state changes
- no publishing
- no provider execution
- no mutation execution
- no AI model calls
- deterministic read-only package preview only

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Planning Console now displays deterministic Execution Package Preview records assembled from Execution Readiness, Execution Plan Preview, and Execution Artifact Preview runtime layers.
- Execution package modeling remains governance-blocked and non-executable.

Recommended next milestone:
- Execution Contract Readiness Runtime v1

## Execution Readiness Runtime v1 Milestone (2026-06-02)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-readiness.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-readiness.test.ts`

Implemented function:
- `generateTwinExecutionReadinessRecords({ approvalQueueItems, executionPlanPreviews, executionArtifactPreviews })`

Execution Readiness model fields:
- `readinessId`
- `proposalId`
- `proposalTitle`
- `readinessState`
- `readinessScore`
- `requirementsMet`
- `requirementsMissing`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`
- `summary`

Readiness states:
- `not_ready`
- `partially_ready`
- `ready_for_future_planning`

Verified deployed Transporti Maver readiness records:
1. `Improve Homepage Conversion Flow`
   - `readinessState`: `partially_ready`
   - `readinessScore`: `60`
   - `requirementsMet`: `homepage_detected`, `approval_queue_ranked`, `execution_plan_available`
   - `requirementsMissing`: `conversion_baseline`, `design_evidence`
2. `Improve Homepage Quality and Messaging`
   - `readinessState`: `ready_for_future_planning`
   - `readinessScore`: `80`
   - `requirementsMet`: `homepage_detected`, `messaging_surface_identified`, `execution_plan_available`, `artifact_preview_available`
   - `requirementsMissing`: `design_evidence`
3. `Maintain Read-Only Validation Mode`
   - `readinessState`: `ready_for_future_planning`
   - `readinessScore`: `100`
   - `requirementsMet`: `governance_boundary_present`, `validation_runtime_active`, `execution_plan_available`, `artifact_preview_available`
   - `requirementsMissing`: `none`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `execution_readiness_preview_only`

Diagnostics:
- `TWIN_EXECUTION_READINESS_STARTED`
- `TWIN_EXECUTION_READINESS_COMPLETED`

Preserved boundaries:
- no execution
- no execution planning execution
- no publishing
- no provider execution
- no mutation execution
- no approval actions
- no workflow execution
- no AI model calls
- deterministic read-only readiness modeling only

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Planning Console now displays deterministic Execution Readiness records derived from Approval Queue items, Execution Plan Preview artifacts, and Execution Artifact Preview artifacts.
- Execution readiness modeling remains governance-blocked and non-executable.

Recommended next milestone:
- Execution Contract Readiness Runtime v1

## Approval Queue Preview Runtime v1 Milestone (2026-06-02)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.ts`
- `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.test.ts`

Implemented function:
- `generateTwinApprovalQueueItems(approvalStates, proposalCandidates)`

Approval Queue Item fields:
- `queueId`
- `proposalId`
- `proposalTitle`
- `approvalState`
- `queueRank`
- `queuePriority`
- `optimizationScore`
- `governanceState`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `summary`

Verified deployed Approval Queue for `Transporti Maver`:
1. `Improve Homepage Conversion Flow`
   - `queuePriority`: `high`
   - `optimizationScore`: `390`
   - `approvalState`: `pending_review`
2. `Improve Homepage Quality and Messaging`
   - `queuePriority`: `medium`
   - `optimizationScore`: `340`
   - `approvalState`: `pending_review`
3. `Maintain Read-Only Validation Mode`
   - `queuePriority`: `medium`
   - `optimizationScore`: `320`
   - `approvalState`: `pending_review`

Governance values:
- `executionAllowed`: `false`
- `mutationAllowed`: `false`
- `publishingAllowed`: `false`
- `providerExecutionAllowed`: `false`
- `governanceState`: `approval_queue_preview_only`

Diagnostics:
- `TWIN_APPROVAL_QUEUE_PREVIEW_STARTED`
- `TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED`

Preserved boundaries:
- no approval workflow
- no approval state changes
- no approve action
- no reject action
- no review action
- no request approval action
- no execution
- no publishing
- no provider execution
- no mutation execution
- no AI model calls
- read-only deterministic queue preview only

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Planning Console now displays a deterministic Approval Queue derived from Approval State records and ranked Proposal Candidates.

Recommended next milestone:
- Execution Contract Readiness Runtime v1

## Approval State Runtime v1 Milestone (2026-06-01)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-approval-state.ts`
- `apps/platform/gnr8/runtime/twin/twin-approval-state.test.ts`

Implemented function:
- `generateTwinApprovalStateRecords(approvalRecords)`

Approval state model:
- `TwinApprovalState`
- `approval_required`
- `pending_review`
- `ready_for_future_approval`

Current runtime emission:
- `pending_review` only
- future state support exists through typing/contracts only

Approval State Record fields:
- `approvalId`
- `proposalId`
- `proposalTitle`
- `approvalState`
- `requiredApprovals`
- `receivedApprovals`
- `approvalComplete`
- `executionAllowed`
- `mutationAllowed`
- `publishingAllowed`
- `providerExecutionAllowed`
- `governanceState`
- `summary`

Verified deployed approval state records for `Transporti Maver`:
- `proposalTitle`: `Improve Homepage Conversion Flow`
- `approvalState`: `pending_review`
- `requiredApprovals`: `1`
- `receivedApprovals`: `0`
- `approvalComplete`: `false`
- `governanceState`: `approval_state_preview_only`
- all deployed approval state records currently share identical `governanceState`

Diagnostics:
- `TWIN_APPROVAL_STATE_STARTED`
- `TWIN_APPROVAL_STATE_COMPLETED`

Preserved boundaries:
- no approval workflow
- no approve action
- no reject action
- no request-review action
- no execution
- no provider execution
- no publishing
- no mutation execution
- no AI model calls
- read-only deterministic state modeling only

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Planning Console now displays deterministic Approval State records derived from Proposal Approval Records.
- Approval governance modeling now exists independently from approval workflow execution.

Next dependency milestone now completed:
- Approval Queue Preview Runtime v1

## Execution Artifact Preview Runtime v1 Milestone (2026-06-01)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.ts`
- `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.test.ts`

Implemented function:
- `generateTwinExecutionArtifactPreviews(executionPlanPreviews)`

Verified deployed Execution Artifact Preview artifacts for `Transporti Maver`:
1. `Improve Homepage Conversion Flow`
   - `artifactType`: `conversion_improvement_plan`
   - affected areas:
     - `homepage`
     - `primary_conversion_path`
   - planned outputs:
     - `conversion_review_document`
     - `conversion_improvement_plan`
2. `Improve Homepage Quality and Messaging`
   - `artifactType`: `content_improvement_plan`
   - affected areas:
     - `homepage_hero`
     - `homepage_messaging`
   - planned outputs:
     - `messaging_review_document`
     - `content_improvement_plan`
3. `Maintain Read-Only Validation Mode`
   - `artifactType`: `validation_continuation_plan`
   - affected areas:
     - `runtime_governance`
   - planned outputs:
     - `validation_status_report`

Governance values:
- `executionState`: `preview_only`
- `mutationBlocked`: `true`
- `governanceState`: `preview_non_executable`

Diagnostics:
- `TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED`
- `TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED`

Preserved boundaries:
- no execution
- no artifact generation
- no approval workflow
- no provider execution
- no publishing
- no mutation execution
- no AI model calls

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Overview now displays deterministic, read-only Execution Artifact Preview artifacts derived from Execution Plan Preview artifacts.

Recommended next milestone:
- Workspace Planning Console UX Cleanup v1

## Proposal Candidate Operator UX Cleanup v1 Milestone (2026-06-01)

Milestone is complete and documented.

Workspace Overview hierarchy is now:
- Overview
- Proposal Candidates
- Optimization Ranking
- Validation Surfaces
- Provider Governance Snapshot
- Explicit Boundaries
- Advanced Runtime Analysis

Operator-first behavior:
- `Proposal Candidates` is now the primary operator-facing section.
- `Advanced Runtime Analysis` is collapsed by default.
- `Advanced Runtime Analysis` contains:
  - `Observations`
  - `Insights`
  - `Recommendations`
  - `Optimization Opportunities`
  - `Debug Diagnostics`
  - `Twin Source chain`

Visible operator-facing deployed sections for `Transporti Maver`:
- `Proposal Candidates`
- `Optimization Ranking`
- `Provider Governance Snapshot`
- `Explicit Boundaries`

Preserved boundaries:
- no runtime logic changes
- no proposal generation changes
- no approval workflow
- no API changes
- no database changes
- no execution controls
- no approve/reject controls
- no publish controls
- no AI action controls

Validation:
- workspace overview tests passed
- next build passed

Conclusion:
- Workspace Overview now behaves as an operator-first Website OS console rather than a runtime/debug transcript.

Recommended next milestone:
- Proposal Approval Preview Runtime v1

Success criteria:
- Future bootstrap resumes from Proposal Candidate Operator UX Cleanup v1 as the canonical Workspace Overview UX baseline.

## Proposal Candidate Runtime v1 Milestone (2026-06-01)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`

Implemented function:
- `generateTwinProposalCandidates(input)`

Proposal Candidate fields:
- `proposalId`
- `status`
- `executionState`
- `title`
- `summary`
- `priority`
- `expectedImpact`
- `expectedEffort`
- `risk`
- `optimizationRank`
- `optimizationScore`
- `sourceOpportunityId`
- `supportingRecommendations`
- `reason`
- `boundaries`

Verified deployed Proposal Candidates for `Transporti Maver`:
- `#1 Improve Homepage Conversion Flow status=proposal_candidate executionState=blocked rank=1 score=390`
- `#2 Improve Homepage Quality and Messaging status=proposal_candidate executionState=blocked rank=2 score=340`
- `#3 Maintain Read-Only Validation Mode status=proposal_candidate executionState=blocked rank=3 score=320`

Top-rank selection behavior:
- Proposal Candidate Runtime v1 generates candidates from top-ranked optimization opportunities.
- default limit: `3`
- `Design Evidence Collection` remains an optimization opportunity and is not promoted to Proposal Candidate Runtime v1 because it is ranked `#4`.

Preserved boundaries:
- read-only
- non-executable
- no content mutation
- no design mutation
- no publishing
- no provider execution
- no approval workflow yet
- no AI model calls

Architecture chain:
- `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`

Conclusion:
- Workspace Overview now displays read-only, non-executable Proposal Candidates derived from ranked Optimization Opportunities.

Recommended next milestone:
- Proposal Candidate Operator UX Cleanup v1
- followed by: Proposal Approval Preview Runtime v1

## Optimization Scoring Runtime v1 Milestone (2026-06-01)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.ts`
- `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.test.ts`

Implemented function:
- `scoreOptimizationOpportunities(opportunities)`

Scoring fields:
- `impactScore`
- `effortScore`
- `confidenceScore`
- `evidenceQualityScore`
- `totalScore`
- `rank`

Scoring mappings:
- Impact:
  - `high=100`
  - `medium=60`
  - `low=20`
- Effort:
  - `low=100`
  - `medium=60`
  - `high=20`
- Confidence:
  - `default=100`
- Evidence Quality:
  - `Homepage Conversion Review=90`
  - `Homepage Quality Improvement=80`
  - `Design Evidence Collection=50`
  - `Validation Stability Preservation=100`

Verified deployed ranking for `Transporti Maver`:
- `#1 Homepage Conversion Review totalScore=390`
- `#2 Homepage Quality Improvement totalScore=340`
- `#3 Validation Stability Preservation totalScore=320`
- `#4 Design Evidence Collection totalScore=270`

Diagnostics:
- `TWIN_OPTIMIZATION_SCORING_STARTED`
- `TWIN_OPTIMIZATION_SCORING_COMPLETED`

Preserved boundaries:
- no AI model calls
- no proposal generation
- no optimization execution
- no editing
- no publishing
- deterministic scoring only

Conclusion:
- Workspace Overview now displays deterministic ranked optimization opportunities derived from optimization scoring.

Recommended next milestone:
- Proposal Candidate Runtime v1

## Twin Optimization Runtime v1 Milestone (2026-06-01)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-optimizations.ts`
- `apps/platform/gnr8/runtime/twin/twin-optimizations.test.ts`

Implemented function:
- `generateTwinOptimizationOpportunities(recommendations)`

Implemented deterministic optimization opportunities:
- `Homepage Quality Improvement`
- `Homepage Conversion Review`
- `Design Evidence Collection`
- `Validation Stability Preservation`

Verified deployed optimization opportunities for `Transporti Maver`:
- `HIGH`: `Homepage Quality Improvement`
- `HIGH`: `Homepage Conversion Review`
- `MEDIUM`: `Design Evidence Collection`
- `LOW`: `Validation Stability Preservation`

Recommendation-to-optimization mapping:
- `Prioritize Core Page Quality` -> `Homepage Quality Improvement`
- `Evaluate Homepage Conversion Flow` -> `Homepage Conversion Review`
- `Collect Additional Design Evidence` -> `Design Evidence Collection`
- `Maintain Read-Only Validation Mode` -> `Validation Stability Preservation`

Diagnostics:
- `TWIN_OPTIMIZATIONS_STARTED`
- `TWIN_OPTIMIZATIONS_COMPLETED`

Optimization fields:
- `impact`
- `effort`
- `priority`
- `supportingRecommendations`

Preserved boundaries:
- no AI model calls
- no optimization engine
- no mutation execution
- no editing
- no publishing
- deterministic read-only optimization opportunities only

Conclusion:
- Workspace Overview now displays deterministic optimization opportunities derived from deterministic recommendations.

Recommended next milestone:
- Proposal Candidate Runtime v1

## Twin Recommendation Runtime v1 Milestone (2026-06-01)

Milestone is complete and documented.

Runtime files:
- `apps/platform/gnr8/runtime/twin/twin-recommendations.ts`
- `apps/platform/gnr8/runtime/twin/twin-recommendations.test.ts`

Implemented function:
- `generateTwinRecommendations(insights)`

Implemented deterministic recommendation rules:
- `Prioritize Core Page Quality`
- `Evaluate Homepage Conversion Flow`
- `Collect Additional Design Evidence`
- `Maintain Read-Only Validation Mode`

Verified deployed recommendations for `Transporti Maver`:
- `Prioritize Core Page Quality`
- `Evaluate Homepage Conversion Flow`
- `Collect Additional Design Evidence`
- `Maintain Read-Only Validation Mode`

Insight-to-recommendation relationships:
- `Focused Website Footprint` -> `Prioritize Core Page Quality`
- `Primary Entry Experience Detected` -> `Evaluate Homepage Conversion Flow`
- `Limited Design Evidence Available` -> `Collect Additional Design Evidence`
- `Governance Boundary Enforced` -> `Maintain Read-Only Validation Mode`

Diagnostics:
- `TWIN_RECOMMENDATIONS_STARTED`
- `TWIN_RECOMMENDATIONS_COMPLETED`

Preserved boundaries:
- no AI model calls
- no optimization engine
- no proposal generation
- no editing
- no publishing
- deterministic read-only recommendations only

Conclusion:
- Workspace Overview now displays deterministic Website OS recommendations derived from deterministic insights.

Recommended next milestone:
- Proposal Candidate Runtime v1

## Persisted Migration OS Evidence -> Website OS Workspace Overview Milestone (2026-06-01)

Milestone is complete and documented.

Verified runtime chain:
- Persisted Migration OS runtime evidence
- `buildWebsiteDigitalTwin()`
- `generateTwinObservations(twin)`
- `generateTwinInsights(observations)`
- `generateTwinRecommendations(insights)`
- `generateTwinOptimizationOpportunities(recommendations)`
- `scoreOptimizationOpportunities(opportunities)`
- Workspace Overview UI

Verified deployed runtime values:
- `selectedSource`: `persisted_runtime_import_evidence`
- `persistedEvidenceSelected`: `true`
- `persistedEvidenceReason`: `persisted_runtime_evidence_selected`
- `persistedEvidenceShapeStatus`: `valid`
- `providerState`: `persisted/runtime-import-evidence`

Verified imported site:
- `title`: `Transporti Maver d.o.o.`
- `siteVersionId`: `88253466-783e-4484-8b68-df6c83b8a11c`
- `importId`: `maver-reimport-1778654629704-63c7fcad`
- evidence-derived summaries: `pages=2`, `sections=1`, `homepagePath=index.html`

Successful diagnostics:
- `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED`
- `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID`
- `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED`

State clarification:
- Website OS no longer depends exclusively on fixtures.
- Workspace Overview can hydrate from persisted Migration OS evidence.

Conclusion:
- Future bootstrap resumes from `Persisted Migration OS Evidence -> Website OS Workspace Overview` as a completed canonical runtime milestone.

Recommended next milestone:
- Workspace Overview Operator UX Cleanup
- followed by: Proposal Candidate Runtime v1

## Workspace Overview Bundled Stable Import Snapshot Milestone (2026-05-31)

Milestone is complete and documented:
- fixture:
  - `apps/platform/gnr8/runtime/twin/fixtures/stable-import-snapshot.ts`

Workspace Overview source resolution order:
1. stable artifact on filesystem
2. imported-url snapshot directory
3. bundled stable import snapshot fixture
4. fallback `No imported site available.`

Verified deployed values:
- `selectedSource`: `bundled_stable_import_snapshot`
- `fallbackReason`: `none`
- `pages`: `18`
- `sections`: `74`
- `detectedTitle`: `GNR8 Validation Site`
- `homepagePath`: `index.html`
- `assets`: `133`
- `navigationEvidence`: `available`
- `homepageDetected`: `true`
- `environmentScope`: `preview`
- `providerState`: `preview/runtime-only`

Verified diagnostics:
- `WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED`
- `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED`
- `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING`
- `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED`
- `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0`
- `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED`
- `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED`

Explicit boundaries remain:
- read-only
- no DB/schema changes
- no API
- no AI
- no scoring
- no recommendations
- no editing
- no publishing

Conclusion:
- Workspace Overview is now useful in deployed environments even without local validation snapshot files.

Recommended next milestone:
- Real Imported Runtime Evidence Persistence Path

## Workspace Navigation Wiring v1 Milestone (2026-05-31)

Milestone is complete and documented:
- connected surfaces:
  - `/gnr8/admin/providers`
  - `/gnr8/admin/workspace-overview`
  - `/gnr8/admin/twin-preview`
  - `/gnr8/admin/twin-preview-real`

Navigation sections:
- `Website OS`
- `Validation Surfaces`
- `Website OS Navigation`

Preserved boundaries:
- UI/navigation only
- read-only links only
- no runtime changes
- no API changes
- no database changes
- no Twin changes
- no Provider changes
- no forms/actions/editing/publish/AI controls

Validation:
- admin test suite passed (`148/148`)
- next build passed

Conclusion:
- Website OS runtime surfaces are now discoverable through navigation instead of requiring direct URL knowledge.

Recommended next milestone:
- Real Imported Site Workspace Overview Runtime

## Twin Snapshot Hydration from Imported Site Model Milestone (2026-05-31)

Milestone is complete and documented:
- route: `/gnr8/admin/twin-preview-real`
- source: `fixtureId=real-site-01`

Runtime chain:
- `real-site-01 fixture`
- `buildWebsiteDigitalTwin()`
- `InMemoryTwinStore`
- `getTwinBySiteVersion()`
- `createTwinOverview()`
- browser-rendered read-only preview

Verified values:
- `title`: `Website Digital Twin Runtime Preview (Real Site)`
- `sourceSiteVersionId`: `site_version_real-site-01_072929becae7`
- `sourceImportId`: `import_real-site-01_c167859409d8`
- `status`: `ready`
- `environmentScope`: `preview`
- `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
- `designSummary`: `assets=5; layoutEvidence=available`
- `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
- `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
- `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`

Implemented evidence fields:
- `pageCount`
- `sectionCount`
- `assetCount`
- `detectedTitle`
- `detectedHomepagePath`
- `providerStateSummary`

Verified diagnostics:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`
- `TWIN_STORE_SAVE_SUCCEEDED`
- `TWIN_STORE_GET_SUCCEEDED`
- `TWIN_STORE_LIST_SUCCEEDED`
- `TWIN_OVERVIEW_CREATED`

Explicit boundaries remain:
- read-only validation surface
- no editing
- no optimization
- no publish
- no AI
- no scoring
- no recommendations
- no DB/schema changes

Conclusion:
- Digital Twin snapshots now contain imported-site evidence instead of placeholder-only summaries.

Recommended next milestone:
- Workspace Navigation Wiring

## Workspace Overview Twin Preview UI Milestone (2026-05-30)

Milestone is complete and documented:
- route: `/gnr8/admin/twin-preview`

Runtime chain:
- `buildWebsiteDigitalTwin()`
- `InMemoryTwinStore`
- `getTwinBySiteVersion()`
- `createTwinOverview()`
- browser-rendered read-only preview

Verified deployed values:
- `title`: `Website Digital Twin Runtime Preview`
- `subtitle`: `Read-only validation surface`
- `status`: `ready`
- `environmentScope`: `preview`
- `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
- `designSummary`: `assets=5; layoutEvidence=available`
- `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
- `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
- `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`

Verified diagnostics:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`
- `TWIN_STORE_SAVE_SUCCEEDED`
- `TWIN_STORE_GET_SUCCEEDED`
- `TWIN_STORE_LIST_SUCCEEDED`
- `TWIN_OVERVIEW_CREATED`

Explicit boundaries remain:
- read-only validation surface
- no editing
- no actions
- no forms
- no publish
- no AI
- no scoring
- no recommendations

Conclusion:
- GNR8 now has the first browser-visible Website Digital Twin runtime surface.

Recommended next milestone:
- Workspace Navigation Wiring

## Twin Viewer Read-Model Helper Milestone (2026-05-30)

Milestone is complete and implemented:
- `apps/platform/gnr8/runtime/twin/twin-viewer.ts`
- `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`

Implemented type:
- `TwinOverview`

Implemented function:
- `createTwinOverview(twin)`

Mapped fields:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `contentSummary`
- `designSummary`
- `experienceSummary`
- `governanceSummary`
- `operationalSummary`
- `lastUpdated`
- `diagnostics`

Implemented diagnostic:
- `TWIN_OVERVIEW_CREATED`

Explicit boundaries remain:
- no Workspace UI yet
- no React
- no database
- no API
- no AI
- no optimization
- no scoring
- no recommendations

Validation:
- twin-viewer tests passed
- next build passed

Conclusion:
- GNR8 now has a Workspace-ready Twin Overview read-model capable of presenting Website Digital Twin state before UI implementation.

Recommended next milestone:
- Workspace Overview Twin Preview UI

## Twin In-Memory Store and Read-Model Repository Milestone (2026-05-30)

Milestone is complete and implemented:
- `apps/platform/gnr8/runtime/twin/twin-store.ts`
- `apps/platform/gnr8/runtime/twin/twin-store.test.ts`

Implemented interface:
- `TwinStore`

Methods:
- `saveTwin(twin)`
- `getTwin(twinId)`
- `getTwinBySiteVersion(siteVersionId)`
- `listTwins()`
- `clear()`

Implemented implementation:
- `InMemoryTwinStore`

Implemented diagnostics:
- `TWIN_STORE_SAVE_SUCCEEDED`
- `TWIN_STORE_GET_SUCCEEDED`
- `TWIN_STORE_LIST_SUCCEEDED`

Implemented behavior:
- map-based storage
- latest twin per `siteVersionId` tracking
- multiple twins supported
- twin payloads are not mutated
- runtime-memory only

Explicit boundaries remain:
- no database
- no Supabase
- no persistence
- no API routes
- no Workspace UI
- no scoring
- no recommendations
- no AI

Validation:
- twin-store tests passed
- next build passed

Conclusion:
- GNR8 now has the first runtime Twin Repository layer capable of storing and retrieving Website Digital Twins in memory.

Recommended next milestone:
- Workspace Overview Twin Preview UI

## Twin Runtime Types and Deterministic Builder Milestone (2026-05-30)

Milestone is complete and implemented:
- `apps/platform/gnr8/runtime/twin/twin-types.ts`
- `apps/platform/gnr8/runtime/twin/twin-builder.ts`
- `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`

Implemented types:
- `TwinIdentity`
- `TwinStatus` (`building`, `ready`, `stale`, `failed`)
- `TwinSnapshot`
- `TwinMetadata`
- `WebsiteDigitalTwin`
- `TwinViewerPayload`

Implemented functions:
- `buildWebsiteDigitalTwin(input)`
- `toTwinViewerPayload(twin)`

Implemented deterministic behavior:
- `twinId` derived from `siteId + siteVersionId + environmentScope`
- controlled timestamps via `nowIso` or `clock`
- `ready` status for valid input
- deterministic throw for missing `siteId`/`siteVersionId`

Implemented diagnostics:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`

Explicit boundaries remain:
- no DB persistence yet
- no API yet
- no UI yet
- no scoring
- no recommendations
- no AI
- no optimization
- no publish execution

Validation:
- twin-builder tests passed
- next build passed

Conclusion:
- GNR8 now has the first runtime Website Digital Twin object and deterministic builder while remaining persistence/API/UI-free.

Recommended next milestone:
- Workspace Overview Twin Preview UI

## Twin Runtime Contract Baseline (2026-05-30)

Twin Runtime Contract is now defined as the canonical first operational implementation contract:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

Purpose and boundary are explicit:
- smallest runtime contract for first operational Website Digital Twin
- documentation/runtime-contract baseline now backed by first implemented runtime types/builder
- no APIs
- no database changes
- no UI implementation
- no Workspace UI implementation yet

Canonical identity fields are documented as:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `createdAt`
- `updatedAt`

Canonical status states are documented as:
- `building`
- `ready`
- `stale`
- `failed`

Canonical snapshot fields are documented as:
- `contentState`
- `designState`
- `experienceState`
- `governanceState`
- `operationalState`

Canonical metadata fields are documented as:
- `sourceImportId`
- `sourceSiteVersionId`
- `sourceModels`
- `generatedAt`
- `generatedBy`
- `diagnostics`

Canonical v1 storage rules are documented as:
- twin exists per site version
- twin v1 immutable once generated
- new site version creates new twin
- stale allowed without destructive overwrite
- failed generation returns diagnostics

Canonical viewer payload for Workspace Overview is documented as:
- `identity`
- `status`
- `snapshot`
- `metadata`
- `diagnostics`

Out-of-scope boundary is explicit:
- Website Health scoring
- Content/Design/Experience scoring
- AI recommendations
- optimization opportunities
- proposal generation
- publish execution
- runtime observation engine
- runtime optimization engine

Implementation readiness target is explicit:
- TypeScript twin runtime types
- deterministic twin builder
- in-memory or read-model store
- workspace overview viewer surface
- tests proving twin generation from existing site/version fixtures

## First Operational Twin Roadmap Baseline (2026-05-30)

First Operational Twin Roadmap Draft is now defined as canonical implementation-slice documentation:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`

Purpose and boundary are explicit:
- shortest path from architecture to first visible runtime Twin
- documentation only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Target outcome is explicit:
- website can be imported and represented as a Twin
- Twin is visible in Workspace Overview

Required runtime components for this first slice are documented as:
- `Twin Identity`
- `Twin Snapshot`
- `Twin Builder`
- `Twin Store`
- `Twin Viewer`
- `Workspace Overview Integration`

Canonical inputs are documented as:
- `Import Pipeline`
- `Canonical Models`
- `Site Version`
- `Provider State`

Canonical outputs are documented as:
- `Twin Snapshot`
- `Twin Metadata`
- `Twin State Summary`

Out-of-scope boundary is explicit:
- scoring
- recommendations
- optimization
- AI editing
- publish automation

Success criteria are explicit:
- website imported
- twin generated
- twin stored
- twin displayed

Dependencies are explicit:
- Phase A
- Phase B
- Phase C

Risks are explicit:
- model incompleteness
- state synchronization
- version drift

## Twin Observation Architecture Baseline (2026-05-30)

Twin Observation Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`

Purpose and boundary are explicit:
- observation converts raw signals into operational understanding
- architecture/docs only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Canonical observation inputs are documented as:
- `Content Signals`
- `Design Signals`
- `Experience Signals`
- `Governance Signals`
- `Operational Signals`

Canonical observation types are documented as:
- `Warning`
- `Risk`
- `Insight`
- `Recommendation`
- `Optimization Opportunity`
- `Proposal Candidate`

Canonical observation flow is documented as:
- `Signals -> Observations`
- `Observations -> Insights`
- `Insights -> Recommendations`
- `Recommendations -> Optimization Opportunities`
- `Optimization Opportunities -> Proposal Candidates`

Canonical observation severity levels are documented as:
- `informational`
- `low`
- `medium`
- `high`
- `critical`

Canonical governance sequencing is documented as:
- `evidence before observation`
- `observation before recommendation`
- `recommendation before proposal`
- `proposal before mutation`

AI boundary is explicit:
- AI may assist interpretation
- AI may assist recommendation generation
- AI may not bypass governance

Current state is explicit:
- architecture only
- no observation runtime
- no recommendation runtime

Future integration points are anchored as:
- Twin Generation
- Website Intelligence
- Digital Twin
- Workspace Overview
- AI Editor

Success condition is explicit:
- GNR8 gains the canonical observation layer that transforms website evidence into actionable intelligence

## Twin Optimization Architecture Baseline (2026-05-30)

Twin Optimization Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

Purpose and boundary are explicit:
- optimization converts understanding into improvement opportunities
- architecture/docs only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Canonical optimization inputs are documented as:
- `Observations`
- `Insights`
- `Recommendations`
- `Website Goals`
- `Governance Constraints`
- `Provider Constraints`

Canonical optimization types are documented as:
- `Content Optimization`
- `Design Optimization`
- `Experience Optimization`
- `Governance Optimization`
- `Operational Optimization`

Canonical optimization opportunity structure is documented as:
- `Identity`
- `Description`
- `Expected Impact`
- `Confidence`
- `Priority`
- `Source Observation`

Canonical prioritization dimensions are documented as:
- `Impact`
- `Effort`
- `Risk`
- `Confidence`
- `Governance Compatibility`

Canonical optimization progression is documented as:
- `Optimization Opportunity -> Proposal Candidate`

Canonical governance sequencing is documented as:
- `understand before optimize`
- `optimize before propose`
- `proposal before mutation`
- `approval before publish`

AI boundary is explicit:
- AI may assist optimization generation
- AI may assist prioritization
- AI may not directly execute changes

Current state is explicit:
- architecture only
- no optimization runtime
- no prioritization engine

Future integration points are anchored as:
- Twin Observation
- Digital Twin
- AI Editor
- Governance
- Website Evolution Lifecycle

Success condition is explicit:
- GNR8 gains the canonical optimization architecture behind website evolution

## Twin Generation Architecture Baseline (2026-05-30)

Twin Generation Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`

Purpose and boundary are explicit:
- defines how websites are transformed into Website Digital Twins
- architecture/docs only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Canonical twin generation inputs are documented as:
- `Import Pipeline Output`
- `Content Model`
- `Design Model`
- `Experience Model`
- `Provider State`
- `Governance State`
- `Environment State`

Canonical twin generation stages are documented as:
- `Import`
- `Evidence Extraction`
- `Model Construction`
- `Signal Generation`
- `Observation Generation`
- `Scoring`
- `Recommendation Generation`
- `Twin Assembly`

Canonical Twin components produced are documented as:
- `Content State`
- `Design State`
- `Experience State`
- `Governance State`
- `Operational State`
- `Intelligence State`

Canonical signal families are documented as:
- `Content Signals`
- `Design Signals`
- `Experience Signals`
- `Governance Signals`
- `Operational Signals`

Canonical observation families are documented as:
- `Warnings`
- `Risks`
- `Insights`
- `Recommendations`
- `Optimization Opportunities`
- `Proposal Candidates`

Canonical Twin refresh model is documented as:
- `Initial Generation`
- `Manual Refresh`
- `Scheduled Refresh`
- `Event-driven Refresh`

Canonical governance sequencing is documented as:
- `evidence before observation`
- `observation before recommendation`
- `recommendation before proposal`
- `proposal before mutation`

AI boundary is explicit:
- AI may assist signal generation
- AI may assist interpretation
- AI may assist recommendations
- AI does not directly mutate the Twin
- AI does not bypass governance

Current state is explicit:
- no twin generation runtime implemented
- no scoring engine implemented
- no observation engine implemented
- no recommendation runtime implemented

Future integration points are anchored as:
- Import Pipeline
- Twin Observation Architecture
- Digital Twin Architecture
- Website Intelligence Architecture
- Workspace UI
- AI Editor Architecture
- Website Evolution Lifecycle

Success condition is explicit:
- GNR8 gains the canonical architecture describing how websites become Digital Twins

## Website Digital Twin Architecture Baseline (2026-05-30)

Website Digital Twin Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`

Purpose and boundary are explicit:
- the Website Digital Twin is the continuously updated operational representation of a website inside GNR8
- the twin is not HTML
- the twin is not the deployed frontend
- the twin is the operational understanding of the website
- architecture/docs only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Canonical core twin domains are documented as:
- `Content State`
- `Design State`
- `Experience State`
- `Governance State`
- `Operational State`
- `Intelligence State`

Canonical twin identity fields are documented as:
- `twinId`
- `siteId`
- `workspaceId`
- `environmentScope`
- `versionId`
- `status`
- `updatedAt`

Canonical twin relationships are documented as:
- `Digital Twin -> Content Model`
- `Digital Twin -> Design Model`
- `Digital Twin -> Experience Model`
- `Digital Twin -> Workspace`
- `Digital Twin -> Intelligence Layer`
- `Digital Twin -> Governance Layer`
- `Digital Twin -> Operations Layer`

Canonical twin observations are documented as:
- `Warnings`
- `Risks`
- `Insights`
- `Recommendations`
- `Optimization Opportunities`
- `Proposal Candidates`

Canonical twin score surfaces are documented as:
- `Website Health`
- `Content Score`
- `Design Score`
- `Experience Score`
- `Governance Score`
- `Operations Score`

AI boundary is explicit:
- AI consumes Twin observations
- AI generates recommendations
- AI generates proposal candidates
- AI cannot bypass governance
- AI cannot publish directly

Workspace relationship is explicit:
- Website Overview represents the Website Digital Twin
- Overview is the primary visualization of the Twin

Canonical twin governance principles are documented as:
- `evidence before observation`
- `observation before recommendation`
- `recommendation before proposal`
- `proposal before mutation`
- `approval before publish`
- `audit before execution`

Current state is explicit:
- no twin runtime is implemented
- no scoring engine is implemented
- no recommendation engine is implemented
- no observation engine is implemented
- no recommendation runtime is implemented

Future integration points are anchored as:
- Twin Observation Architecture
- Website Intelligence Architecture
- Workspace UI Concept
- Workspace Wireframes
- Content Model
- Design Model
- Experience Model
- Provider Governance
- Website Evolution Lifecycle

Success condition is explicit:
- GNR8 gains the canonical Website Digital Twin architecture that becomes the central object of the Website Operating System

## Website Intelligence Architecture Baseline (2026-05-30)

Website Intelligence Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`

Purpose and boundary are explicit:
- Website Intelligence is the observation and understanding layer of GNR8
- foundation behind the Website Overview Digital Twin
- architecture/docs only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Canonical intelligence domains are documented as:
- `Content Health`
- `Design Health`
- `Experience Health`
- `Governance Health`
- `Operational Health`

Canonical intelligence signals are documented as:
- `Content Signals`
- `Design Signals`
- `Experience Signals`
- `Governance Signals`
- `Operational Signals`

Canonical score surfaces are documented as:
- `Website Health`
- `Content Score`
- `Design Score`
- `Experience Score`
- `Governance Score`
- `Operations Score`

Canonical recommendation progression is documented as:
- `Observation`
- `Recommendation`
- `Optimization Opportunity`
- `Proposal Candidate`

AI boundary is explicit:
- AI may generate recommendations
- AI may not directly publish changes

Current state is explicit:
- no scoring engine is implemented
- no recommendation engine is implemented

Success condition is explicit:
- GNR8 gains the intelligence foundation behind the Website Digital Twin

## Workspace Wireframes v1 Baseline (2026-05-30)

Workspace Wireframes v1 Draft is now defined as canonical product wireframe documentation:
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`

Purpose and boundary are explicit:
- first structural wireframe specification for GNR8 Workspace
- screen structure and information hierarchy only
- documentation only
- no runtime changes
- no UI implementation
- no APIs
- no database changes

Canonical workspace screen set is documented as:
- `Website Overview`
- `Content Workspace`
- `Design Workspace`
- `Experience Workspace`
- `Governance Workspace`
- `AI Workspace`
- `Operations Workspace`

For each workspace screen, canonical wireframe fields are documented as:
- `Purpose`
- `Primary Objects`
- `Information Hierarchy`
- `Left Navigation`
- `Center Area`
- `Right Context Panel`
- `Actions`
- `AI Surfaces`

Wireframe governance and AI boundaries are explicit:
- proposal-first and approval-aware workspace structure
- AI is governed and assistive
- AI cannot publish directly

Success condition is explicit:
- GNR8 gains the first complete workspace screen blueprint before visual design begins

## Workspace UI Concept Architecture Baseline (2026-05-30)

Workspace UI Concept Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`

Purpose and boundary are explicit:
- workspace is the primary operating environment of a website
- users do not manage pages
- users manage website evolution
- architecture/docs only
- no runtime changes
- no APIs
- no UI implementation
- no database changes

Canonical core philosophy is documented as:
- `Website-first`
- `Governance-first`
- `AI-assisted`
- `Version-aware`
- `Lifecycle-aware`

Canonical primary workspace areas are documented as:
- `Overview`
- `Content`
- `Design`
- `Experience`
- `AI`
- `Governance`
- `Operations`

Canonical overview concept and surfaces are documented as:
- `Overview = homepage of workspace`
- `Overview = Digital Twin of the Website`
- `Website Health`
- `Website Status`
- `Recent Activity`
- `Pending Proposals`
- `Pending Approvals`
- `Latest Publish`
- `Optimization Opportunities`
- `AI Recommendations`
- `Environment Status`
- `Provider Status`

Canonical boundaries for AI, governance, and operations are documented as:
- AI is a governed editor and not a chatbot
- AI suggestions enter proposal workflows
- AI cannot publish directly
- Governance includes `Proposals`, `Versions`, `Approvals`, `Publishing`, `Rollback`, `Audit Trail`
- Operations includes `Providers`, `Environments`, `Credentials`, `Deployments`, `Execution Governance`

Success condition is explicit:
- GNR8 gains the conceptual product blueprint required before creating and validating Workspace wireframe specifications

## Website Evolution Lifecycle Architecture Baseline (2026-05-30)

Website Evolution Lifecycle Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`

Purpose and boundary are explicit:
- GNR8 manages continuous website evolution
- a website is never finished
- lifecycle stages are governed
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no database changes

Canonical lifecycle stages are documented as:
- `Import`
- `Modeling`
- `Editing`
- `Proposal Review`
- `Approval`
- `Version Creation`
- `Publishing`
- `Observation`
- `Optimization`
- `Evolution`

Canonical lifecycle relationships are documented as:
- `Import -> Content/Design/Experience Models`
- `Models -> Workspace`
- `Workspace -> Editing`
- `Editing -> Proposals`
- `Proposals -> Approvals`
- `Approvals -> Versions`
- `Versions -> Publishing`
- `Publishing -> Observation`
- `Observation -> Optimization`
- `Optimization -> New Editing Cycle`

Canonical lifecycle governance principles are documented as:
- `understand before change`
- `proposal before mutation`
- `approval before publish`
- `version before overwrite`
- `rollback before risk`
- `observe before optimize`

AI participation boundaries are explicit:
- AI may assist every stage
- AI may not bypass governance
- AI may not bypass approval
- AI may not publish directly

Current state and architecture boundary are explicit:
- lifecycle runtime is not implemented
- observation layer is not implemented
- optimization layer is not implemented

Future integration points are now anchored as:
- Import Pipeline
- Content Model
- Design Model
- Experience Model
- AI Editor
- Versioning & Rollback
- Publish Governance
- Provider Governance
- Workspace Architecture

## Experience Workspace Architecture Baseline (2026-05-30)

Experience Workspace Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`

Purpose and boundary are explicit:
- workspace is the operational home of a website
- users manage website evolution through the workspace
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no editor implementation
- no database changes

Canonical workspace areas are documented as:
- `Overview`
- `Content`
- `Design`
- `Experience`
- `AI`
- `Governance`
- `Operations`

Canonical workspace responsibilities are documented as:
- `view state`
- `edit state`
- `review proposals`
- `approve changes`
- `publish versions`
- `rollback versions`
- `audit history`

Canonical workspace identity fields are documented as:
- `workspaceId`
- `siteId`
- `ownerScope`
- `environmentScope`
- `status`

Canonical workspace relationships are documented as:
- `Workspace -> Content Model`
- `Workspace -> Design Model`
- `Workspace -> Experience Model`
- `Workspace -> AI (Governed Editor)`
- `Workspace -> Governance`
- `Workspace -> Operations`

Current state and architecture boundary are explicit:
- no workspace runtime implemented
- no workspace UI implemented

Future integration points are now anchored as:
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- AI Editor Architecture
- Versioning & Rollback
- Publish Governance
- Provider Governance

## Workspace Information Architecture Baseline (2026-05-30)

Workspace Information Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`

Purpose and boundary are explicit:
- define how users navigate and understand websites inside GNR8
- architecture/docs only
- no runtime changes
- no UI implementation
- no editor implementation
- no APIs
- no database changes

Canonical primary workspace areas are documented as:
- `Overview`
- `Content`
- `Design`
- `Experience`
- `AI`
- `Governance`
- `Operations`

Canonical navigation model is documented as:
- `Global Navigation`
- `Workspace Navigation`
- `Context Navigation`

Canonical workspace homepage areas are documented as:
- `Website Health`
- `Website Status`
- `Recent Activity`
- `Pending Proposals`
- `Pending Approvals`
- `Latest Publish`
- `Optimization Opportunities`
- `AI Recommendations`
- `Environment Status`
- `Provider Status`

Canonical information domains by area are documented as:
- Content: `Pages`, `Collections`, `Products`, `Media`, `SEO`
- Design: `Themes`, `Tokens`, `Components`, `Templates`, `Layouts`
- Experience: `Journeys`, `Funnels`, `Navigation`, `Personalization`
- Governance: `Proposals`, `Versions`, `Approvals`, `Publishing`, `Rollback`, `Audit Trail`
- AI: `Governed Editing`, `Suggestions`, `Proposal Queue`, `Optimization Opportunities`, `Recommendation History`
- Operations: `Providers`, `Environments`, `Credentials`, `Deployments`, `Execution Governance`

Current state and architecture boundary are explicit:
- no workspace runtime implemented
- no workspace UI implemented
- no editor implementation
- no API implementation
- no database implementation

Success condition is explicit:
- GNR8 gains the conceptual product blueprint required before creating and validating Workspace wireframe specifications

## Content & Experience Governance Parent Architecture Baseline (2026-05-29)

Content & Experience Governance Architecture Draft is now defined as canonical parent architecture documentation:
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`

Purpose and boundary are explicit:
- GNR8 manages websites as operational systems
- website != page collection
- website == governed digital experience
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no editor implementation

Canonical architecture layers are documented as:
- `Workspace Layer`
- `Content Layer`
- `Design Layer`
- `Experience Layer`
- `Editing Layer`
- `Publish Layer`

Canonical website representation is documented as:
- `Website -> Workspace, Content, Design, Experience, Business Logic, Operations, Governance`

Future child architecture responsibilities are now anchored as:
- Experience Workspace Architecture
- Canonical Content Model
- Canonical Design Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture

## Canonical Content Model Architecture Baseline (2026-05-30)

Canonical Content Model Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/CANONICAL_CONTENT_MODEL.md`

Purpose and boundary are explicit:
- content in GNR8 is not page HTML
- content is structured, governed, versionable website knowledge
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no editor implementation
- no database changes

Canonical core content entities are documented as:
- `Site`
- `Page`
- `Section`
- `Content Block`
- `Collection`
- `Collection Item`
- `Media Asset`
- `Product`
- `SEO Metadata`
- `Navigation Label`
- `Translation Variant`

Canonical content identity fields are documented as:
- `contentId`
- `contentType`
- `stableKey`
- `source`
- `ownerScope`
- `locale`
- `versionId`
- `status`

Canonical governance principles are documented as:
- `content before layout`
- `identity before mutation`
- `version before publish`
- `rollback before overwrite`
- `AI suggestions before AI mutations`

Current state and architecture boundary are explicit:
- no canonical content model runtime implemented yet
- no editor implemented yet
- no content DB schema implemented yet

Future integration points are now anchored as:
- Canonical Design Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture
- Import Pipeline
- Preview Renderer

## Canonical Design Model Architecture Baseline (2026-05-30)

Canonical Design Model Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/CANONICAL_DESIGN_MODEL.md`

Purpose and boundary are explicit:
- design in GNR8 is not page HTML
- design is reusable experience structure
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no editor implementation
- no database changes

Canonical core design entities are documented as:
- `Design System`
- `Theme`
- `Token`
- `Component`
- `Component Variant`
- `Section Template`
- `Layout`
- `Template`
- `Brand Profile`

Canonical design responsibilities are documented as:
- `visual language`
- `spacing`
- `typography`
- `colors`
- `layout`
- `components`
- `responsiveness`
- `accessibility`

Canonical design identity fields are documented as:
- `designId`
- `designType`
- `stableKey`
- `ownerScope`
- `versionId`
- `status`

Canonical governance principles are documented as:
- `design before rendering`
- `tokens before CSS`
- `components before pages`
- `version before publish`
- `rollback before overwrite`

Current state and architecture boundary are explicit:
- no canonical design model runtime implemented
- no editor implemented
- no design database schema implemented

Future integration points are now anchored as:
- Canonical Content Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture
- Import Pipeline
- Preview Renderer

## Canonical Experience Model Architecture Baseline (2026-05-30)

Canonical Experience Model Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`

Purpose and boundary are explicit:
- experience in GNR8 is not content
- experience in GNR8 is not design
- experience defines how users move through a digital system
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no editor implementation
- no database changes

Canonical core experience entities are documented as:
- `Experience`
- `Journey`
- `Step`
- `Intent`
- `Goal`
- `Conversion Point`
- `Interaction`
- `Personalization Rule`
- `Trigger`
- `Outcome`

Canonical experience types are documented as:
- `marketing journey`
- `lead generation journey`
- `commerce journey`
- `onboarding journey`
- `support journey`
- `account journey`

Canonical experience identity fields are documented as:
- `experienceId`
- `experienceType`
- `stableKey`
- `ownerScope`
- `versionId`
- `status`

Canonical governance principles are documented as:
- `intent before flow`
- `journey before page`
- `outcome before interaction`
- `version before publish`
- `rollback before overwrite`

Current state and architecture boundary are explicit:
- no experience runtime implemented
- no journey engine implemented
- no personalization engine implemented

Future integration points are now anchored as:
- Canonical Content Model
- Canonical Design Model
- AI Editor Architecture
- Versioning & Rollback Architecture
- Publish Governance Architecture
- AI Optimization Layer

## AI Editor Architecture Baseline (2026-05-30)

AI Editor Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`

Purpose and boundary are explicit:
- editing is a governed operation
- editing is not direct mutation
- editing produces proposed changes
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no editor implementation
- no database changes

Canonical editor types are documented as:
- `Human Editor`
- `AI Editor`
- `Collaborative Editor`
- `Automated Editor`

Canonical editing targets are documented as:
- `Content Model`
- `Design Model`
- `Experience Model`

Canonical editing operations are documented as:
- `create`
- `modify`
- `remove`
- `transform`
- `optimize`
- `translate`
- `personalize`

Canonical editing proposal model fields are documented as:
- `proposalId`
- `editorType`
- `targetModel`
- `targetEntity`
- `reason`
- `proposedChanges`
- `status`

Canonical proposal lifecycle states are documented as:
- `draft`
- `generated`
- `reviewed`
- `approved`
- `rejected`
- `versioned`
- `superseded`

Canonical governance principles are documented as:
- `proposal before mutation`
- `approval before publish`
- `version before overwrite`
- `rollback before mutation`
- `audit before execution`

Current state and architecture boundary are explicit:
- no editor runtime implemented
- no proposal engine implemented
- no approval workflow implemented

Future integration points are now anchored as:
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- Versioning & Rollback Architecture
- Publish Governance Architecture
- AI Routing Architecture

## Versioning & Rollback Architecture Baseline (2026-05-30)

Versioning & Rollback Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`

Purpose and boundary are explicit:
- versioning protects governed website evolution
- rollback is a first-class safety mechanism
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no database changes
- no editor implementation

Canonical versioned models are documented as:
- `Content Model`
- `Design Model`
- `Experience Model`
- `Editing Proposals`
- `Publish Artifacts`

Canonical version identity fields are documented as:
- `versionId`
- `entityId`
- `entityType`
- `modelType`
- `createdAt`
- `createdBy`
- `source`
- `reason`
- `parentVersionId`
- `status`

Canonical change set fields are documented as:
- `changeSetId`
- `versionId`
- `targetModel`
- `targetEntities`
- `changes`
- `reason`
- `createdBy`
- `reviewStatus`

Canonical rollback fields are documented as:
- `rollbackId`
- `fromVersionId`
- `toVersionId`
- `scope`
- `reason`
- `requestedBy`
- `approvedBy`
- `status`

Canonical version lifecycle states are documented as:
- `draft`
- `proposed`
- `reviewed`
- `approved`
- `published`
- `superseded`
- `rolled_back`
- `archived`

Canonical rollback lifecycle states are documented as:
- `requested`
- `validated`
- `approved`
- `executed`
- `failed`
- `cancelled`

Canonical governance principles are documented as:
- `version before publish`
- `rollback before mutation`
- `diff before approval`
- `audit before execution`
- `no destructive overwrite`

Canonical AI editing relationship is documented as:
- AI proposals create change sets
- change sets create versions
- versions can be reviewed, published, or rolled back

Current state and architecture boundary are explicit:
- no versioning runtime implemented
- no rollback runtime implemented

Future integration points are now anchored as:
- Canonical Content Model
- Canonical Design Model
- Canonical Experience Model
- AI Editor Architecture
- Publish Governance Architecture
- Preview Renderer
- Execution Governance

## Publish Governance Architecture Baseline (2026-05-30)

Publish Governance Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

Purpose and boundary are explicit:
- publishing is governed promotion of approved versions into an environment
- publish is not direct mutation
- architecture/docs only
- no runtime changes
- no APIs
- no UI
- no database changes
- no publish implementation

Canonical publish targets are documented as:
- `preview`
- `staging`
- `production`

Canonical publish inputs are documented as:
- `approved version`
- `approved change set`
- `approval evidence`
- `target environment`
- `rollback target`
- `publish reason`

Canonical publish plan fields are documented as:
- `publishPlanId`
- `targetEnvironment`
- `includedVersions`
- `includedChangeSets`
- `riskLevel`
- `rollbackPlanId`
- `approvalId`
- `executionAllowed`
- `executionBlocked`

Canonical publish lifecycle states are documented as:
- `draft`
- `validated`
- `approved`
- `queued`
- `executed`
- `failed`
- `rolled_back`

Canonical environment promotion path is documented as:
- `preview -> staging -> production`

Canonical governance principles are documented as:
- `approval before publish`
- `rollback plan before publish`
- `environment before execution`
- `diff before promotion`
- `audit before mutation`

Canonical AI editing relationship is documented as:
- AI suggestions do not publish directly
- AI proposals must become approved versions before publish

Current state and architecture boundary are explicit:
- no publish runtime implemented
- no environment promotion runtime implemented

Future integration points are now anchored as:
- Versioning & Rollback Architecture
- AI Editor Architecture
- Execution Approval Contract
- Provider Execution Governance
- Preview Renderer
- Deployment Providers

## Canonical Execution Approval Contract Baseline (2026-05-29)

Execution Approval Contract Draft is now defined as canonical architecture documentation:
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`

Purpose and boundary are explicit:
- execution approval is a governed authorization decision allowing a specific operation to proceed
- approval required, provider-bound, environment-bound, capability-bound, operation-bound, time-bound, auditable, revocable
- approval != execution
- approval != authorization context
- approval != secret resolution
- design/docs only
- no runtime changes
- no database changes
- no APIs
- no provider execution
- no writes

Canonical execution approval fields are documented as:
- `approvalId`
- `approvalType`
- `providerId`
- `providerCategory`
- `environmentScope`
- `operationKind`
- `requestedCapability`
- `authorizationContextId`
- `correlationKey`
- `reason`
- `requestedBy`
- `approvedBy`
- `approvedAt`
- `expiresAt`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

Canonical execution approval types are documented as:
- `manual`
- `policy`
- `system`
- `emergency`

Canonical execution approval lifecycle states are documented as:
- `requested`
- `reviewed`
- `approved`
- `rejected`
- `expired`
- `revoked`
- `executed`

## Canonical Authorization Context Contract Baseline (2026-05-29)

Authorization Context Contract Draft is now defined as canonical architecture documentation:
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`

Purpose and boundary are explicit:
- authorization context is a temporary, scoped, redacted provider access context
- produced by future secret resolution
- does not expose raw secrets
- does not itself authorize mutation unless governance separately allows execution
- authorization context != secret
- authorization context != provider execution
- authorization context != mutation approval
- authorization context != permanent credential
- design/docs only
- no runtime changes
- no database changes
- no APIs
- no secret storage
- no secret resolution
- no provider execution
- no writes

Canonical authorization context fields are documented as:
- `authorizationContextId`
- `credentialReferenceId`
- `providerId`
- `providerCategory`
- `environmentScope`
- `bindingScope`
- `allowedCapabilities`
- `allowedOperationKinds`
- `expiresAt`
- `issuedAt`
- `issuedBy`
- `correlationKey`
- `redactedEvidence`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

Canonical authorization context lifecycle states are documented as:
- `requested`
- `validated`
- `issued`
- `expired`
- `revoked`
- `rejected`

## Canonical Secret Resolution Architecture Baseline (2026-05-29)

Secret Resolution Architecture Draft is now defined as canonical architecture documentation:
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`

Purpose and boundary are explicit:
- secret resolution converts an approved credential reference into a temporary provider authorization context
- credential reference != secret
- secret resolution != credential storage
- secret resolution != provider execution
- authorization context != permission to mutate
- design/docs only
- no runtime changes
- no database changes
- no APIs
- no secret storage
- no secret resolution
- no provider authorization context creation
- no provider execution

Future canonical resolver inputs are documented as:
- `credentialReferenceId`
- `providerId`
- `bindingScope`
- `ownerScope`
- `environmentScope`
- `requestedCapability`
- `requestedOperationKind`
- `correlationKey`
- `approvalContext`

Future canonical resolver outputs are documented as:
- `authorizationContextId`
- `providerId`
- `environmentScope`
- `allowedCapabilities`
- `expiresAt`
- `redactedEvidence`
- `executionAllowed`
- `executionBlocked`
- `diagnostics`

Required future safety controls are documented as:
- approval required
- scope matching
- provider/capability matching
- environment matching
- audit trail
- redaction
- TTL / expiry
- least privilege
- no raw secret exposure

## Canonical Credential Contract Baseline (2026-05-29)

Credential Reference Contract Draft is now defined as canonical architecture documentation:
- `docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md`

Boundary remains explicit:
- design/docs only
- no runtime changes
- no database changes
- no APIs
- no secret storage
- no secret resolution
- no provider execution

Canonical credential reference states are now fixed as:
- `missing`
- `configured_reference_only`
- `resolution_disabled`
- `resolution_ready`
- `execution_blocked`

Credential Reference Registry Preview milestone is now implemented and validated as read-model/UI/docs only:
- runtime registry: `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.ts`
- runtime tests: `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.test.ts`
- provider fleet UI section: `Credential Reference Registry Preview`
- provider fleet tests: `apps/platform/app/gnr8/admin/providers/provider-fleet-view.test.ts`
- deterministic preview references:
  - Openprovider sandbox reference (`configured_reference_only`)
  - OpenAI placeholder reference (`missing`)
  - Resend placeholder reference (`missing`)
- deterministic boundaries:
  - `resolutionState` is `disabled` for all references
  - `executionBlocked` is `true` for all references
  - advisory note states metadata-only with no secrets stored/resolved/exposed
- no database changes
- no APIs
- no secret storage
- no secret resolution
- no provider execution
- no writes

## Historical Provider Phase Snapshot
Provider Governance Cockpit v1 / Section Ordering Pass milestone (Provider Fleet has been consolidated into a coherent governance-first cockpit on `/gnr8/admin/providers`; UI/read-model only; no runtime/API changes; no provider execution; no writes; no secret resolution; no AI model calls).

Provider Fleet Category Summary Cards milestone is now implemented and validated (Provider Fleet now includes a `Provider Category Summary` section with category-level operator cards for total providers, connected providers, preview/read-model capabilities count, and execution status across the global provider taxonomy; current execution state remains blocked; UI/read-model/docs only; no runtime/provider/API/write/queue/worker/model-call changes).

AI Routing Readiness Advisor is now part of Provider Fleet and explicitly documents:
- current AI routing state,
- current limitations,
- missing requirements,
- recommended next step,
while keeping execution blocked and read-only boundaries intact.

Provider Fleet Operational Snapshot milestone is now implemented and validated (a new visible-by-default `Operational Snapshot` section appears above detailed control-plane sections on `/gnr8/admin/providers` and summarizes control-plane status, connected providers ratio, operational read-only capabilities count, AI routing preview availability, execution layer state, governance state, and recommended next step; counts are read-model derived from canonical registry payload; execution/governance state is boundary-derived from provider contracts; AI routing preview availability is derived from evaluator/policy registry signals; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).

Provider Fleet UI Density / Collapsible Sections milestone is now implemented and validated (overview-first governance layout on `/gnr8/admin/providers`; visible-by-default section order is `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; dense evidence sections are collapsed by default under `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; no content removed, no behavior removed, no actions/forms/buttons added, Openprovider link preserved, evaluator preview preserved, category summary preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).

Provider Fleet Environment Awareness Preview milestone is now implemented and validated (Provider Fleet now includes a visible-by-default `Environment Awareness Preview` section with environment scope and binding scope governance summaries; canonical provider contracts now include `environmentScope` (`global|sandbox|preview|staging|production`) and `bindingScope` (`global|agency|project|environment`); current expected values: Openprovider `sandbox/global`, placeholder providers `global/global`; advisory note explicitly states governance preview only with no tenant credential management and no provider execution; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).

Provider Credential Boundary Preview milestone is now implemented and validated (Provider Fleet now includes a visible-by-default `Provider Credential Boundary Preview` section with summary cards for providers requiring credentials, configured credential references, missing credential references, secret resolution state, and binding required; compact per-category credential breakdown is included for total/configured/missing/secret-resolution-disabled counts; canonical provider contracts now include `credentialBoundary` metadata with `credentialsRequired`, `credentialStatus`, `secretResolution`, and `bindingRequired`; current expected mapping: Openprovider `configured_reference_only`, placeholders `missing`, and `secretResolution:disabled` for all providers; advisory note explicitly states read-only preview and no secrets stored/resolved/exposed; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).

Provider Credential Boundary Advisor milestone is now implemented and validated (Provider Fleet now includes visible-by-default `Provider Credential Boundary Advisor` governance cards for `Current State`, `Current Limitations`, `Missing Requirements`, and `Recommended Next Step`; explicit badge semantics are preserved for modeled/available `success`, missing/required `warning`, and disabled/blocked `critical`; advisory note explicitly states credential governance is preview-only and no secrets are stored/resolved/exposed; UI/read-model/tests/docs only; no credential storage/secret management/secret resolution/provider execution/writes).

Provider Execution Governance Chain Preview milestone is now implemented and validated (Provider Fleet now includes a visible-by-default `Provider Execution Governance Chain Preview` section that renders the full six-stage future governance sequence: `Provider Contract` (`modeled`), `Credential Reference` (`previewed`), `Secret Resolution` (`design_only_disabled`), `Authorization Context` (`design_only_not_issued`), `Execution Approval` (`design_only_not_requested`), and `Execution` (`blocked`); badge mapping is explicit as success/warning/critical by stage state; advisory note explicitly states governance preview only and that no secrets, approvals, authorization contexts, or executions are created; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).

## Latest Completed Milestone

- Provider Governance Cockpit v1 / Section Ordering Pass is completed and validated.
- Provider Fleet now reads as a coherent governance-first cockpit rather than an accumulated list of provider surfaces.
- UI surface:
  - `/gnr8/admin/providers`
- Visible-by-default order is canonicalized as:
  - `Operational Snapshot`
  - `Provider Execution Governance Chain Preview`
  - `Provider Category Summary`
  - `Environment Awareness Preview`
  - `Provider Credential Boundary Preview`
  - `Provider Credential Boundary Advisor`
  - `AI Routing Readiness Advisor`
- Collapsible detail order is canonicalized as:
  - `Provider Registry Details`
  - `AI Provider Capability Matrix`
  - `AI Routing Policy Preview`
  - `AI Routing Evaluator Preview`
  - `Credential Reference Registry Preview`
  - `Provider Capability Status`
  - `Realtime Register Contract Readiness`
- Preserved boundaries:
  - UI/read-model only
  - no runtime/API changes
  - no provider execution
  - no writes
  - no secret resolution
  - no AI model calls
- Recommended next milestone options:
  - Founder Docs Canonical Repo Commit
  - AI Credential Boundary Preview
  - Second Real Provider Read-only Connector
- Success criteria:
  - future bootstrap resumes from Provider Governance Cockpit v1 as the canonical Provider Fleet UX baseline

- Credential Reference Registry Preview is completed and validated.
- Provider Fleet now includes a collapsible `Credential Reference Registry Preview` section with:
  - `Total references`
  - `Configured references`
  - `Missing references`
  - `Secret resolution disabled count`
  - `Execution blocked count`
- Provider Fleet now renders a registry preview table with:
  - `Provider`
  - `Binding scope`
  - `Environment scope`
  - `Secret type`
  - `Status`
  - `Resolution state`
  - `Execution`
- Advisory note is explicit:
  - `Credential references are metadata only. No secrets are stored, resolved, or exposed.`
- Boundary remains explicit:
  - read-model/UI/docs only
  - no database changes
  - no APIs
  - no secret storage
  - no secret resolution
  - no provider execution
  - no writes

- Provider Fleet Operational Snapshot is completed and validated.
- Provider Fleet now includes a visible-by-default `Operational Snapshot` section above detailed control-plane sections with:
  - `Control Plane Status`: `Operational (read-only)`
  - `Connected Providers`: derived from canonical registry totals (no hardcoded total where possible)
  - `Operational Read-only Capabilities`: derived from canonical registry capabilities (no hardcoded total where possible)
  - `AI Routing Preview`: `Available` (derived from evaluator + policy preview registry presence)
  - `Execution Layer`: `Blocked` (derived from provider boundary state)
  - `Governance State`: `Preview / non-executable` (derived from provider boundary state)
  - `Recommended Next Step`: connect second real provider or introduce AI credential boundary
- Derivation model is explicit:
  - registry-driven
  - boundary-driven
  - evaluator/policy registry driven
  - no hardcoded totals where possible
- Preserved sections/behavior:
  - `Provider Category Summary`
  - `AI Routing Readiness Advisor`
  - collapsible detailed sections
  - Openprovider links
  - evaluator preview
- Boundary remains explicit:
  - UI/read-model only
  - no runtime changes
  - no API changes
  - no execution controls
  - no provider calls
  - no writes
- Conclusion:
  - Provider Fleet now exposes an executive operational overview above all detailed provider and AI orchestration surfaces.
- Recommended next milestone:
  - Provider Fleet Multi-Tenant / Environment Awareness
- Success criteria:
  - future bootstrap resumes from Provider Fleet Operational Snapshot milestone

- AI Routing Evaluator Preview Model is completed and validated.
- AI Routing Evaluator Preview UI is completed and validated.
- UI files:
  - `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.tsx`
  - `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.test.ts`
  - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
  - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.test.ts`
- Provider Fleet now includes `AI Routing Evaluator Preview` with:
  - task selector
  - preview routing result
  - diagnostics
  - constraints
  - execution state (always blocked)
- Supported deterministic preview tasks:
  - `site_migration_planning`
  - `long_architecture_review`
  - `layout_visual_understanding`
  - `fast_interactive_generation`
  - `eu_sensitive_workloads`
  - `structured_tool_orchestration`
- Advisory note is explicit:
  - Routing evaluator preview is deterministic and non-executable. No AI providers are called.
- Boundary remains explicit:
  - UI/read-model only
  - no runtime AI execution
  - no provider dispatch
  - no model calls
  - no API execution layer
- Runtime files:
  - `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.ts`
  - `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.test.ts`
- Canonical architecture docs updated:
  - `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
  - `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- Evaluator input contract:
  - `taskType`
  - `inputModality`
  - `outputModality`
  - `sensitivityLevel`
  - `latencyPreference`
  - `costPreference`
  - `contextRequirement`
  - `regionPreference`
  - `fallbackAllowed`
- Evaluator output contract:
  - `selectedProviderId`
  - `selectedModelFamily`
  - `routingStrategy`
  - `fallbackProviderIds`
  - `reason`
  - `constraintsApplied`
  - `executionAllowed`
  - `executionBlocked`
  - `diagnostics`
- Deterministic behavior:
  - matches `taskType` against `AI_ROUTING_POLICY_PREVIEW_REGISTRY`
  - uses preferred/secondary providers from policy when matched
  - defaults to `openai` + `anthropic` fallback when unmatched
  - resolves `selectedModelFamily` from provider registry metadata
  - applies preferences as constraints
  - always includes `execution_blocked` and `preview_only`
  - always returns `executionAllowed:false` and `executionBlocked:true`
- Diagnostics documented:
  - `AI_ROUTING_EVALUATOR_PREVIEW_CREATED`
  - `AI_ROUTING_POLICY_MATCHED`
  - `AI_ROUTING_POLICY_DEFAULTED`
  - `AI_ROUTING_EXECUTION_BLOCKED`
  - `AI_ROUTING_PREVIEW_ONLY`
- Policy/metadata sources documented:
  - `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
  - `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`
- Safety boundary is explicit:
  - deterministic preview only
  - no model calls
  - no credential resolution
  - no provider dispatch
  - no runtime execution
  - no API endpoint yet
- Validation:
  - preview evaluator tests passed
  - next build passed
- Boundary remains explicit:
  - deterministic preview evaluator only
  - no runtime execution routing
  - no live model calls
  - no AI execution
  - no API changes
- Conclusion:
  - GNR8 now has its first deterministic AI routing decision preview. The system can explain which AI provider would be selected for a task while keeping execution fully blocked.
- Recommended next milestone:
  - AI Routing Evaluator Preview UI
- Success criteria:
  - future thread bootstrap resumes from deterministic AI routing evaluator preview model

- AI Routing Policy Registry Extraction is completed.
- Canonical registry for AI routing policy preview rows is now the source of truth:
  - `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`
- Registry test coverage is explicit:
  - `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.test.ts`
- Provider Fleet UI now consumes routing policy preview from registry:
  - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
- Registry rows include canonical fields:
  - `taskType`
  - `preferredProviderId`
  - `secondaryProviderId`
  - `routingStrategy`
  - `reasoning`
  - `executionState`
- Execution state remains explicit and deterministic:
  - all rows are `preview_only`
- Provider name display resolution is registry-backed where possible:
  - `provider-contract-registry` display names are used for preferred/secondary provider columns
- Boundary remains explicit:
  - UI/read-model only
  - no runtime AI routing
  - no live model calls
  - no API changes
  - no execution
  - no action buttons/forms
- Conclusion:
  - AI routing strategy is now represented as canonical read-model data, preparing future runtime routing without implementing execution.

- AI Routing Policy Preview / Task-to-Provider Mapping Matrix UI is completed.
- Documented UI surface:
  - `/gnr8/admin/providers`
- Documented sections:
  - `AI Provider Capability Matrix`
  - `AI Routing Policy Preview`
- Matrix now visibly includes AI providers:
  - `OpenAI`
  - `Anthropic`
  - `Gemini`
  - `Groq`
  - `Mistral`
- Displayed routing metadata:
  - `model families`
  - `strengths`
  - `routing hints`
  - `latency class`
  - `cost class`
  - `context window class`
- Documented provider states:
  - `not_configured`
  - `control_plane_only`
  - `execution_blocked`
- Advisory note is explicit:
  - AI routing metadata is advisory only. No model calls are performed.
  - Routing policy preview is strategic only. No live AI routing is performed.
- Task-based orchestration preview is now visible:
  - `Site Migration Planning` -> preferred `OpenAI`, secondary `Anthropic`, strategy `reasoning_priority`
  - `Long Architecture Review` -> preferred `Anthropic`, secondary `OpenAI`, strategy `context_priority`
  - `Layout / Visual Understanding` -> preferred `Gemini`, secondary `OpenAI`, strategy `context_priority`
  - `Fast Interactive Generation` -> preferred `Groq`, secondary `OpenAI`, strategy `latency_priority`
  - `EU-sensitive Workloads` -> preferred `Mistral`, secondary `OpenAI`, strategy `sovereignty_priority`
  - `Structured Tool Orchestration` -> preferred `OpenAI`, secondary `Anthropic`, strategy `orchestration_priority`
- Boundary remains explicit:
  - UI/read-model only
  - no runtime AI orchestration
  - no live model calls
  - no API changes
  - no execution
  - no secrets
  - no action buttons/forms
- Conclusion:
  - Provider Fleet now visibly includes AI provider routing strategy metadata and task-based routing policy preview, making it the control-plane home for future policy-driven multi-model orchestration.
- Recommended next milestone:
  - task-based AI orchestration contract wiring
- Success criteria:
  - future bootstrap resumes from Provider Fleet with visible AI provider capability matrix

- Provider Contract Registry Extraction is completed.
- Canonical provider contract registry is now the fleet source of truth:
  - `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
- Registry contract test coverage is now explicit:
  - `apps/platform/gnr8/runtime/providers/provider-contract-registry.test.ts`
- Provider Fleet UI now consumes registry contracts (no inline provider objects):
  - `apps/platform/app/gnr8/admin/providers/page.tsx`
  - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
- Providers currently represented in registry:
  - Registrar / Domain Providers:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - Deployment Providers:
    - `Vercel`
    - `Netlify`
    - `Railway`
  - Communication Providers:
    - `Resend`
    - `Proton Mail`
    - `Microsoft 365`
  - ERP / Accounting Providers:
    - `Pantheon`
  - Edge Infrastructure Providers:
    - `Cloudflare`
  - Commerce / Billing Providers:
    - `Stripe`
    - `Paddle`
    - `Polar`
  - Execution Providers:
    - `Inngest`
    - `Trigger.dev`
    - `Temporal`
  - Source Control Providers:
    - `GitHub`
    - `GitLab`
  - AI Providers:
    - `OpenAI`
    - `Anthropic`
    - `Gemini`
    - `Groq`
    - `Mistral`
  - Storage / Data Providers:
    - `Supabase`
    - `R2`
    - `S3`
  - Identity Providers:
    - `Clerk`
    - `Auth0`
    - `Supabase Auth`
- Canonical provider contract fields in registry:
  - `providerId`
  - `displayName`
  - `providerType`
  - `providerCategory`
  - `environment`
  - `status`
  - `capabilities`
  - `readiness`
  - `boundaries`
  - `advisor`
  - `links`
- Openprovider links currently modeled:
  - `cockpit`
  - `domains`
  - `dns`
- Provider capabilities are category-aware in Provider Fleet:
  - registrar: `domains`, `dns`, `availability`, `registration`, `execution`
  - deployment: `deployments`, `previews`, `rollbacks`, `domains`, `environment_variables`
  - communication: `email_delivery`, `transactional_email`, `inbound_email`, `domains`, `webhooks`
  - erp/accounting: `accounting`, `invoicing`, `bookkeeping`, `tax`, `synchronization`
  - edge infrastructure: `dns`, `edge_compute`, `object_storage`, `cdn`, `routing`
  - commerce: `billing`, `subscriptions`, `invoices`, `webhooks`, `checkout`
  - execution: `jobs`, `workflows`, `retries`, `schedules`, `events`
  - source control: `repositories`, `branches`, `pull_requests`, `webhooks`, `commits`
  - AI: `model_metadata`, `routing_policy`, `inference`, `embeddings`, `multimodal`
  - storage: `database`, `object_storage`, `backups`, `vector_search`, `file_storage`
  - identity: `auth`, `users`, `sessions`, `oauth`, `sso`
- Operational read-only capability count remains `3` from Openprovider (`domains`, `dns`, `availability`).
- Current boundary remains explicit:
  - deterministic read-model registry
  - no runtime provider execution
  - no provider APIs added
  - no writes
  - no queue/worker execution
- Conclusion:
  - Provider Fleet is no longer backed by inline UI objects. It now consumes a canonical provider contract registry, creating the foundation for multi-provider orchestration.
- Strategic direction:
  - Provider Fleet documented as Global Provider Control Plane
  - Future orchestration direction:
    - AI provider routing
    - communication orchestration
    - ERP/accounting orchestration
    - edge infrastructure orchestration
    - deployment orchestration
    - billing orchestration
    - execution governance
    - multi-provider failover
    - capability discovery
- Recommended next milestone:
  - Global Provider Taxonomy Expansion
- Success criteria:
  - future thread bootstrap resumes from registry-backed provider fleet, not hardcoded UI provider definitions

- Second Provider Placeholder Readiness Contract is completed for Realtime Register as a control-plane placeholder only.
- Updated UI surface:
  - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
- Updated tests:
  - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.test.ts`
- Realtime Register orchestration contract fields now render explicitly:
  - Capabilities:
    - `domains:false`
    - `dns:false`
    - `availability:false`
    - `registration:false`
    - `execution:false`
  - Readiness:
    - `not_configured`
    - `control_plane_only`
  - Boundary:
    - `execution_blocked`
    - `read_only`
  - Provider Identity:
    - `providerId: realtime_register`
    - `providerType: registrar`
    - `environment: unknown`
- Realtime Register Readiness Advisor now renders:
  - Current State:
    - `provider placeholder initialized`
    - `orchestration contract compatible`
  - Current Limitations:
    - `no credentials configured`
    - `no provider APIs connected`
  - Missing Requirements:
    - `provider auth layer`
    - `provider capability normalization`
    - `sandbox verification`
  - Recommended Next Step:
    - `implement read-only provider inventory`
    - `validate provider contract compatibility`
- Openprovider behavior preserved unchanged:
  - remains the only connected and linked operational provider
  - no Realtime Register links added
  - no provider execution controls added
- Boundary remains explicit:
  - UI/read-model only
  - no runtime execution
  - no provider APIs
  - no writes
  - no queue/worker execution
- Conclusion:
  - GNR8 now validates that provider orchestration abstractions are not Openprovider-specific.
- Recommended next milestone:
  - Provider Identity Registry Contract Wiring
  - or Multi-Provider Capability Discovery Read Model
- Success criteria:
  - future thread bootstrap resumes from second provider placeholder contract readiness baseline

- Provider Orchestration Contract Architecture Draft is completed as the first canonical architecture contract for multi-provider orchestration in GNR8.
- New canonical architecture doc:
  - `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- Contract scope:
  - provider capability model
  - provider readiness model
  - provider boundary model
  - provider execution governance model
  - provider orchestration model
  - canonical provider identity model
- Current reality captured explicitly:
  - Openprovider is reference implementation
  - all current provider surfaces are read-only
  - execution remains blocked
  - no mutation orchestration exists yet
- Future direction captured explicitly:
  - GNR8 as provider orchestration/control-plane above multiple infrastructure providers
  - architecture draft only (no implementation promises)
- Boundary remains explicit:
  - docs-only milestone
  - no runtime changes
  - no API changes
  - no provider execution changes
  - no mutation enablement
- Conclusion:
  - GNR8 now has the first canonical provider orchestration architecture contract.
- Recommended next milestone:
  - Provider Identity Registry Contract Wiring
  - or Multi-Provider Capability Discovery Read Model
- Success criteria:
  - future thread bootstrap resumes from Provider Orchestration Contract architecture baseline

- Provider Readiness Advisor Layer is implemented, deployed, and manually verified.
- Updated UI surfaces:
  - `/gnr8/admin/providers`
  - `/gnr8/admin/providers/openprovider`
- New section:
  - `Readiness Advisor`
- Advisor cards:
  - `Current State`
  - `Current Limitations`
  - `Missing Requirements`
  - `Recommended Next Step`
- Provider Fleet guidance:
  - one provider connected
  - multi-provider registry initialized
  - provider fleet navigation operational
  - only Openprovider connected
  - no production execution providers
  - no orchestration layer
  - missing provider abstraction layer
  - missing execution governance
  - missing multi-provider failover
  - missing production verification
  - recommended: connect second provider, normalize provider capabilities, introduce provider orchestration contracts
- Openprovider guidance:
  - availability intelligence operational
  - DNS inventory operational
  - domain inventory operational
  - sandbox verified
  - read-only boundary active
  - registration disabled
  - execution blocked
  - no provider writes
  - no live environment verification
  - missing execution orchestration
  - missing approval workflows
  - missing worker/provider execution layer
  - missing live provider verification
  - missing mutation safety review
  - recommended: verify live environment behavior, prepare provider execution architecture, add approval-driven registration flow
- Preserved UI:
  - availability search panel preserved
  - provider surfaces links preserved
  - capability cards preserved
  - read-only messaging preserved
- Boundary remains explicit:
  - UI/read-model only
  - no runtime changes
  - no API changes
  - no provider writes
  - no DNS writes
  - no registration
  - no queue/Inngest/worker execution
  - no provider execution
- Conclusion:
  - provider UX now includes operator guidance/readiness interpretation, not only raw diagnostics and statuses
- Recommended next milestone:
  - Provider Orchestration Contract Draft
  - or Second Provider Placeholder Readiness Contract
- Success criteria:
  - future thread bootstrap resumes from Provider Readiness Advisor milestone

- Provider Navigation Wiring is implemented, deployed, and manually verified.
- Completed navigation flow:
  - Agency Dashboard -> `/gnr8/admin/providers`
  - Provider Fleet Cockpit -> `/gnr8/admin/providers/openprovider`
  - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/domains`
  - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/dns`
- Changed UI files:
  - `app/gnr8/admin/agencies/[agencyId]/dashboard/page.tsx`
  - `app/gnr8/admin/providers/provider-fleet-view.tsx`
  - `app/gnr8/admin/providers/openprovider/openprovider-provider-cockpit-view.tsx`
- Verified UX:
  - Agency Dashboard includes Provider Fleet card
  - Openprovider is the only navigable provider row
  - Realtime Register, INWX, Netim remain non-linked / `not_configured`
  - Openprovider cockpit includes Provider Surfaces section
  - Provider Surfaces links to Domain Inventory and DNS Inventory
  - Availability remains embedded in Openprovider cockpit
- Boundary remains explicit:
  - UI/navigation only
  - no runtime changes
  - no API changes
  - no provider writes
  - no DNS writes
  - no registration
  - no queue/Inngest/worker execution
  - no provider execution
  - no secret changes
- Conclusion:
  - Provider features are no longer hidden behind manually typed admin URLs.
  - GNR8 now has a navigable provider control-plane flow from agency dashboard into provider fleet, provider cockpit, and read-only provider surfaces.
- Recommended next milestone:
  - Provider Capability Detail Cards / Provider Readiness Explainer
  - or Openprovider Availability UI Search Panel
- Success criteria:
  - future thread bootstrap resumes from navigable Provider Control Plane UX

- Openprovider Domain Availability Read-only Connector is implemented, deployed, and manually verified end-to-end.
- Runtime model is deployed:
  - `gnr8/runtime/providers/openprovider/openprovider-domain-availability.ts`
- Backing API is deployed:
  - `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>`
- Env support is deployed:
  - `OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT`
  - `OPENPROVIDER_DOMAIN_AVAILABILITY_METHOD`
  - shared auth via `openprovider-auth.ts`
- Deployed verified values:
  - `provider`: `openprovider`
  - `readOnly`: `true`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `domain`: `levi-testis.com`
  - `available`: `true`
  - `status`: `available`
  - `endpoint path`: `/v1beta/domains/check`
- Verified diagnostics:
  - `OPENPROVIDER_AUTH_STARTED`
  - `OPENPROVIDER_AUTH_SUCCEEDED`
  - `OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED`
  - `OPENPROVIDER_AVAILABILITY_ENDPOINT_PATH:/v1beta/domains/check`
  - `OPENPROVIDER_AVAILABILITY_METHOD_POST`
  - `OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED`
  - `OPENPROVIDER_AVAILABILITY_STARTED`
  - `OPENPROVIDER_AVAILABILITY_SUCCEEDED`
- Conclusion:
  - GNR8 can now perform real Openprovider read-only domain availability checks.
  - This is the first directly user-facing provider intelligence capability: `is this domain available?`
- Boundary remains explicit:
  - read-only
  - no registration
  - no DNS writes
  - no domain update/delete
  - no queue/Inngest/worker execution
  - no provider execution
  - no secret leakage
  - `executionAllowed:false`
  - `executionBlocked:true`
- Recommended next milestone:
  - Openprovider Domain Availability Admin UI
  - or Provider Reality Dashboard linking Domains + DNS + Availability
- Success criteria:
  - future thread bootstrap resumes from working real Openprovider availability lookup

- Openprovider DNS Inventory Admin UI is implemented, deployed, and manually verified end-to-end.
- Deployed admin UI route:
  - `/gnr8/admin/providers/openprovider/dns`
- Backing API is deployed:
  - `GET /api/gnr8/admin/providers/openprovider/dns`
- Deployed verified UI values:
  - `title`: `Openprovider DNS Inventory`
  - `banner`: `Read-only provider boundary active`
  - `provider`: `openprovider`
  - `mode`: `read only`
  - `execution`: `blocked`
  - `domains`: `0`
  - `records`: `0`
  - `inventory status`: `empty`
  - `empty message`: `No DNS records found in current Openprovider sandbox account.`
- Verified diagnostics:
  - `OPENPROVIDER_AUTH_STARTED`
  - `OPENPROVIDER_AUTH_SUCCEEDED`
  - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
  - `OPENPROVIDER_DNS_READ_STARTED`
  - `OPENPROVIDER_DNS_READ_SUCCEEDED`
- Conclusion:
  - GNR8 now has a real provider-read UI surface for Openprovider DNS inventory.
  - The current sandbox account has no domains, so DNS inventory is empty, but auth, read boundary, API, and UI rendering are verified end-to-end.
- Boundary remains explicit:
  - read-only
  - no DNS writes
  - no domain registration/update/delete
  - no queue/Inngest/worker execution
  - no provider execution
  - no secret leakage
  - `executionAllowed:false`
  - `executionBlocked:true`
- Recommended next milestone:
  - Sandbox Domain Fixture / Seed Real Test Domain
  - or Provider Reality Dashboard linking Domain Inventory + DNS Inventory
- Success criteria:
  - future thread bootstrap resumes from real Openprovider DNS Inventory UI milestone
- Operator Evidence Provenance Layer is implemented, deployed, and manually verified end-to-end (control-plane only).
- Executive Summary now includes visible provenance support so operators can trace evidence at-a-glance.
- Evidence Sources chips are now visible for operator-facing provenance cues.
- Source mapping uses a static source mapping approach.
- Milestone scope distinction:
  - no runtime lineage engine
  - no API changes
  - no runtime changes
  - no execution controls
- Verified source mappings:
  - Current Situation:
    - `Readiness`
    - `Safety Manifest`
  - Primary Blockers:
    - `Execution Preconditions Ledger`
    - `Execution Readiness Gate`
    - `Execution Remediation Plan`
  - Verified Positives:
    - `Governance Decision Package`
    - `Execution Preconditions Ledger`
    - `Safety Manifest`
- Recommended next step:
  - `Execution Remediation Plan`
- Conclusion:
  - operator can now answer, `How do we know this?`, using visible evidence provenance
- Boundary remains:
  - execution impossible
  - simulation only
  - no provider execution
  - no queue execution
  - no secret resolution
- Recommended next milestone:
  - Operator Cockpit Completion / UI Freeze Candidate
- Success criteria:
  - future thread bootstrap resumes from provenance-enabled cockpit milestone
- Operator Cockpit Evidence Status Badges / Severity System is implemented, deployed, and manually verified end-to-end (control-plane only).
- Evidence counters and badge levels are now visible in the Operator Cockpit for fast risk/readiness/governance/safety scanning.
- Badge severity levels verified:
  - `critical`
  - `warning`
  - `success`
  - `info`
  - `neutral`
- Deployed verified counters:
  - `Critical: 8`
  - `Warnings: 4`
  - `Success: 8`
- Verified top cards:
  - `Execution State`
  - `Governance State`
  - `Readiness State`
  - `Safety State`
- Verified sticky banner:
  - `Execution impossible. Control-plane simulation only.`
- Verified grouping:
  - `Governance`
  - `Execution Analysis`
  - `Execution Simulation`
  - `Safety`
- Milestone scope distinction:
  - UI/read-model only
  - no runtime changes
  - no API changes
  - no behavior changes
  - no execution controls added
- Milestone note:
  - some badge chips currently render as a compact raw evidence strip below the counters; this is acceptable for the milestone and may be refined later
- Boundary remains explicit:
  - no provider execution
  - no sandbox execution
  - no DNS writes
  - no Openprovider/registrar calls
  - no queue/Inngest/worker execution
  - no secret resolution
- Conclusion:
  - operator can now identify execution risk, readiness state, governance state, and safety state quickly through counters and visual badges
- Recommended next milestone:
  - Operator Cockpit Compact Evidence Strip / Visual Polish Pass
  - still no execution
- Evidence Surface Consolidation / Operator Cockpit Layout Pass is implemented, deployed, and manually verified end-to-end (control-plane only).
- Readiness page has been reorganized from a linear debug page into an operator-oriented cockpit layout.
- Cockpit layout updates:
  - sticky summary banner:
    - `Execution impossible. Control-plane simulation only.`
  - top summary cards:
    - `Execution State`
    - `Governance State`
    - `Readiness State`
    - `Safety State`
  - grouped sections:
    - `Governance`
    - `Execution Analysis`
    - `Execution Simulation`
    - `Safety`
  - default-collapsed sections:
    - `Timelines`
    - `Diagnostics`
    - `Payload JSON Blocks`
- Critical distinction for this milestone:
  - UI/read-model only
  - no runtime model changes
  - no API changes
  - no execution behavior changes
  - all evidence artifacts preserved
  - no execution controls added
  - execution remains impossible
- Provider Execution Safety Manifest / No-Execution Boundary Proof is implemented, deployed, and manually verified end-to-end (control-plane only).
- Runtime model exists:
  - `runtime-provider-execution-safety-manifest.ts`
- Provider Execution Safety Manifest API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-safety-manifest`
- Readiness UI now includes a Provider Execution Safety Manifest section.
- Provider Execution Safety Manifest verified deployed values:
  - `overallStatus`: `execution_impossible`
  - `summary`: `Provider execution is impossible in this runtime: active governance, worker, queue, provider, security, and execution boundaries enforce simulation-only behavior.`
  - diagnostics include:
    - `EXECUTION_SAFETY_BOUNDARY_PROVEN`
    - `EXECUTION_SAFETY_MANIFEST_CREATED`
- Provider Execution Safety Manifest verified barriers:
  - `governance_boundary_active`
  - `worker_dispatch_disabled`
  - `queue_allocation_disabled`
  - `provider_execution_disabled`
  - `secret_resolution_disabled`
  - `runtime_execution_boundary_active`
- Provider Execution Safety Manifest critical distinction:
  - safety manifest proves the no-execution boundary
  - governance remains advisory
  - worker dispatch is disabled
  - queue allocation is disabled
  - provider execution is disabled
  - credential/secret resolution remains disabled
  - runtime remains simulation-only
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- UI note:
  - UI may redact secret-related barrier IDs because generic redaction treats `secret` as sensitive
  - this is safe and non-blocking
- Provider Execution Contract Envelope / Worker Payload Contract Preview is deployed and manually verified end-to-end (control-plane only).
- Runtime model exists:
  - `runtime-provider-worker-envelope-preview.ts`
- Worker Envelope Preview API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/worker-envelope-preview`
- Readiness UI now includes a Provider Worker Envelope Preview section.
- Provider Worker Envelope Preview verified deployed values:
  - `summary`: `Deterministic provider worker envelope preview generated; execution remains disabled.`
  - `queueTarget`: `provider-control-plane`
  - `workerTarget`: `provider-execution-worker`
  - `payloadVersion`: `v1`
  - `executionIntent`: `control_plane_simulation_only`
  - `executionBlocked`: `true`
  - `executionAllowed`: `false`
  - `providerId`: `openprovider`
  - `operationKind`: `upsert_dns_record`
  - `environment`: `sandbox`
  - `siteId`: `dev_readiness_seed_site`
  - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
  - diagnostics include:
    - `PROVIDER_WORKER_ENVELOPE_PREVIEW_INTENT_ONLY`
- Provider Worker Envelope Preview boundary distinction:
  - worker envelope is preview/evidence only
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider execution occurs
  - no payload is sent to a runtime worker
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- Execution Job Shape Preview / Planned Job Materialization Contract is deployed and manually verified end-to-end (control-plane only).
- Runtime model exists:
  - `runtime-provider-execution-job-preview.ts`
- Execution Job Preview API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-job-preview`
- Readiness UI now includes an Execution Job Preview section.
- Execution Job Preview verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 execution job preview artifact(s) generated; execution remains disabled.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `queueTarget`: `provider-control-plane`
    - `workerTarget`: `provider-execution-worker`
    - `simulatedStatus`: `preview_only`
    - `payloadShape` includes:
      - `providerId`: `openprovider`
      - `operationKind`: `upsert_dns_record`
      - `siteId`: `dev_readiness_seed_site`
      - `siteVersionId`: `00000000-0000-0000-0000-00000000d365`
      - `correlationKey`: `eed1514dcd76dcd5a14f7d07c59b982b550e18558090d5ee7eadb7e3ccecbd6a`
  - diagnostics include:
    - `EXECUTION_JOB_PREVIEW_INTENT_ONLY`
    - `EXECUTION_JOB_PREVIEW_JOB_CREATED`
- Execution Job Preview boundary distinction:
  - preview evidence only
  - no persisted execution jobs are created
  - no `plannedJobIds` are changed
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider calls occur
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- Governance authorization intent is deployed and manually verified end-to-end (control-plane only).
- Control-plane layers for provider settings, credential reference contract, provider selection/communicator, job planning, approvals, and execution handoffs are implemented.
- Deterministic Openprovider sandbox adapter and contract/readiness boundaries are in place.
- Explicit execution boundaries are enforced in control-plane artifacts and dry-run paths.
- Provider handoff readiness is testable end-to-end from deployed UI.
- Admin seed flow creates/reuses a deterministic persisted handoff for readiness inspection.
- Readiness inspection displays persisted `handoffArtifact` and reconstructed deterministic `workerPickupEvidence`.
- `workerPickupEvidence.blockedReasons` is normalized to deterministic, operator-readable reasons with no contradictory approval/handoff/planned-job reasons.
- Operator review intent can now be created, persisted, and surfaced from readiness UI.
- Operator review persistence exists via `gnr8_runtime_provider_operator_reviews`.
- Read-only operator review API exists: `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews`.
- Admin-only operator review creation API exists: `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews`.
- Governance snapshot model exists:
  - `runtime-provider-governance-snapshot.ts`
- Governance snapshot combines:
  - handoff readiness
  - `workerPickupEvidence`
  - operator `reviewSummary`
  - diagnostics
- Governance snapshot fields include:
  - `snapshotId`
  - `handoffId`
  - `correlationKey`
  - `readinessStatus`
  - `executionBlocked: true`
  - `workerPickupEvidence`
  - `reviewSummary`
  - `diagnostics`
  - `createdAt`
- Governance snapshot diagnostics are emitted:
  - `GOVERNANCE_SNAPSHOT_CREATED`
  - `GOVERNANCE_SNAPSHOT_REUSED`
  - `GOVERNANCE_SNAPSHOT_AUDIT_READ`
  - `GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED`
- Readiness API now includes `governanceSnapshot`.
- Readiness UI now displays a Governance Snapshot section.
- Governance Timeline API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline`
- Governance Timeline UI section is deployed.
- Governance snapshot persistence table is deployed:
  - `gnr8_runtime_provider_governance_snapshots`
- Governance authorization model exists:
  - `runtime-provider-governance-authorization.ts`
- Governance authorization persistence table is deployed:
  - `gnr8_runtime_provider_governance_authorizations`
- Governance authorization APIs are deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/authorization`
  - `POST /api/gnr8/admin/provider-handoffs/[handoffId]/authorization`
- Readiness UI now includes an Authorization section.
- Governance authorization statuses are:
  - `not_requested`
  - `pending_authorization`
  - `authorized_for_future_execution`
  - `denied`
- `authorized_for_future_execution` remains intent-only and does not authorize execution.
- Governance Decision Package / Pre-execution Readiness Dossier is deployed and manually verified.
- Execution Readiness Gate model is deployed and manually verified.
- Execution Preconditions Ledger is deployed and manually verified.
- Execution Blocker Remediation Planner / Missing Requirements Planner is deployed and manually verified.
- Execution Readiness Gate API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate`
- Execution Preconditions Ledger API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions`
- Execution Remediation Plan API is deployed:
  - `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan`
- Readiness UI now includes an Execution Readiness Gate section.
- Readiness UI now includes an Execution Preconditions Ledger section.
- Readiness UI now includes an Execution Remediation Plan section.
- Execution Readiness Gate verified deployed values:
  - `gateStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `blockingReasons`:
    - `approval_status_blocked`
    - `global_execution_boundary_active`
    - `handoff_status_blocked`
    - `no_planned_jobs`
- Execution Preconditions Ledger verified deployed values:
  - `overallStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `missingRequirements`:
    - `execution_planned_jobs_present:missing`
  - `blockedRequirements`:
    - `approval_status_not_blocked:blocked`
    - `execution_handoff_status_not_blocked:blocked`
- Execution Remediation Plan verified deployed values:
  - `overallStatus`: `blocked`
  - `summary`: `Execution remains blocked because 4 remediation actions are still unresolved.`
  - `diagnostics`:
    - `EXECUTION_REMEDIATION_ACTIONS_GENERATED`
    - `EXECUTION_REMEDIATION_INTENT_ONLY`
    - `EXECUTION_REMEDIATION_PLAN_CREATED`
  - `remediationActions`:
    1. `critical` / `ledger`
       - `reason`: `Approval status is blocked.`
       - `recommendedAction`: `Review approval workflow before execution eligibility can be evaluated.`
    2. `high` / `ledger`
       - `reason`: `No planned jobs are present.`
       - `recommendedAction`: `Create deterministic planned jobs before execution readiness evaluation.`
    3. `critical` / `handoff`
       - `reason`: `Handoff status is blocked.`
       - `recommendedAction`: `Resolve handoff blockers and regenerate readiness evidence.`
    4. `normal` / `gate`
       - `reason`: `Global execution boundary is active.`
       - `recommendedAction`: `Execution boundary intentionally active. No action required.`
- Governance conditions verified as satisfied/passed while execution remained blocked:
  - `review_approved_for_future_execution`: satisfied/passed
  - `authorization_authorized_for_future_execution`: satisfied/passed
- Conclusion:
  - governance intent can be satisfied while execution readiness remains blocked
- Additional conclusion:
  - GNR8 can now explain not only why execution is blocked, but what remediation steps remain before future execution could ever become possible.
- Verified deployed flow:
  - readiness
  - operator review summary
  - governance authorization
  - governance snapshot
  - governance timeline
  - governance decision package
  - execution readiness gate
  - execution preconditions ledger
  - execution remediation plan
- Governance Decision Package verified values:
  - `recommendedAction`: `remain_blocked`
  - `executionBlocked`: `true`
  - `reviewStatus`: `approved_for_future_execution`
  - `authorizationStatus`: `authorized_for_future_execution`
  - `snapshotCount`: `3`
- Decision package remains advisory only; execution remains blocked.
- Verified deployed governance loop behavior:
  - readiness-test UI creates/reuses deterministic handoff
  - readiness inspection loads `handoffArtifact` and `workerPickupEvidence`
  - operator review form creates persisted review intent
  - authorization form creates persisted authorization intent
  - governance snapshot updates after authorization/review state changed
  - governance timeline contains multiple snapshots
  - operator review summary is displayed from persisted reviews
  - Governance Snapshot is displayed
  - Governance Timeline is displayed
  - Governance Timeline fields verified:
    - `snapshotId`
    - `createdAt`
    - `reviewSummaryStatus`
    - `reviewCount`
    - `readinessStatus`
    - `diagnostics`
  - `executionBlocked` remains `true`
- Example verified values from deployed manual verification:
  - `authorizationStatus`: `authorized_for_future_execution`
  - `authorizationReason`: `1234`
  - `intentOnly`: `true`
  - `executionBlocked`: `true`
  - diagnostics include:
    - `GOVERNANCE_AUTHORIZATION_CREATED`
    - `GOVERNANCE_AUTHORIZATION_INTENT_ONLY`

## Recommended Next Milestone

- Operator Cockpit Compact Evidence Strip / Visual Polish Pass
- remains control-plane only (no execution)
- Future note:
  - deterministic `createdAt` may show epoch values for dev-seed artifacts
  - potential future improvement: add `snapshotCreatedAt` and `persistedAt`

## Current Blocker

- DB readiness is environment-dependent: `gnr8_provider_credential_references` is documented as missing until migration application in target DBs.
- DB-backed repository tests for provider control-plane surfaces depend on DB URL/table availability.

## Next Milestone

- Operator Cockpit Compact Evidence Strip / Visual Polish Pass (still no execution).

## Latest Provider Control Plane State

- provider selection: implemented
- credential references: implemented
- credential resolution: implemented
- provider communicator: implemented
- operation bundle: implemented
- operation orchestrator: implemented
- approval requirement: implemented
- approval artifact: implemented
- approval repository: implemented
- approval transitions: implemented
- approval transition repository: implemented
- execution handoff: implemented
- execution handoff repository: implemented
- worker pickup readiness: implemented
- provider handoff readiness inspection route: implemented
- provider handoff readiness debug UI: implemented
- deployed superadmin readiness test UI: implemented
- admin readiness seed API: implemented
- operator review persistence: implemented
- operator review read-only API: implemented
- operator review create API (admin-only): implemented
- operator review summary model: implemented
- governance snapshot model: implemented
- governance snapshot diagnostics: implemented
- governance authorization model: implemented
- governance authorization persistence: implemented
- governance authorization read-only API: implemented
- governance authorization create API (admin-only): implemented
- governance authorization readiness UI section: implemented
- operator review read-only readiness UI section: implemented
- governance snapshot readiness UI section: implemented
- operator review create readiness UI form: implemented

Openprovider:
- sandbox adapter exists
- readiness: ready_for_sandbox
- execution: planning/dry-run only
- liveEligible: false
- Openprovider API calls: not enabled

DB readiness:
- gnr8_runtime_provider_jobs: present
- gnr8_agency_provider_settings: present
- gnr8_provider_credential_references: migration exists, target DB table may still be missing until applied
- approval/handoff migrations exist; target DB application must be verified per environment

## Active Runtime Architecture

- Runtime identity/readiness/resolution models are active and deterministic.
- Provider/DNS/domain layers are active at control-plane level.
- Worker pickup readiness simulation and evidence projection are modeled, but provider action execution remains disabled by policy.

## Completed Readiness Inspection Files/Routes

Files:
- `apps/platform/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness.ts`
- `apps/platform/app/api/gnr8/runtime/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-route-handlers.ts`
- `apps/platform/app/api/gnr8/runtime/provider-handoffs/[handoffId]/readiness/route.ts`
- `apps/platform/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/page.tsx`
- `apps/platform/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-view.tsx`
- `apps/platform/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-presenter.ts`
- `apps/platform/app/api/gnr8/runtime/_tests/provider-handoff-readiness-route.test.ts`

Routes:
- `GET /api/gnr8/runtime/provider-handoffs/[handoffId]/readiness` (read-only control-plane inspection response)
- `/gnr8/admin/provider-handoffs/[handoffId]/readiness` (internal debug/operator inspection UI)
- `/gnr8/admin/provider-handoffs/readiness-test` (deployed superadmin readiness test UI)
- `POST /api/gnr8/admin/provider-handoffs/readiness-seed` (admin seed API for deterministic persisted handoff)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (read-only operator reviews)
  - includes deterministic `reviewSummary` projection
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (admin-only operator review intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline` (read-only governance timeline audit projection)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (read-only governance authorization)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (admin-only governance authorization intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate` (read-only execution readiness gate)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions` (read-only execution preconditions ledger)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan` (read-only execution blocker remediation planner)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan` (read-only dry-run planned jobs simulation evidence)

Readiness UI operator review controls:
- Governance Snapshot section (deterministic evidence projection)
- Dry-run Job Plan section
- Execution Readiness Gate section
- Execution Preconditions Ledger section
- Execution Remediation Plan section
- read-only operator review section
- create operator review form
- status dropdown values:
  - `pending_review`
  - `approved_for_future_execution`
  - `rejected`
  - `needs_changes`
- reason textarea
- Save review intent action

Required production env flag:
- `GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1`

## Execution Boundaries (Current)

- Phase 7F-4 Original Mirror Fidelity Surface is implemented as diagnostics/read-model/UI/docs only.
- `evidence_capture_baseline` now drives an operator-visible Original Mirror Fidelity projection with capture status, coverage status, evidence counts/percentages, deterministic `HIGH`/`MEDIUM`/`LOW` badge, readiness state, grouped known limitations, and route-level limitations when persisted route evidence exists.
- Readiness states are `READY`, `PARTIAL`, and `NOT_READY`; `NOT_READY` applies when the baseline artifact is missing, rendered capture is missing, or any blocker limitation is present.
- Limitation categories surfaced: Capture, Styles, Layout, Runtime, Assets, Maps / Widgets.
- Architecture note: `docs/architecture/ORIGINAL_MIRROR_LIMITATIONS_SURFACE.md`.
- Boundary unchanged: no capture changes, no preview rendering changes, no importer changes, no reconstruction logic, no persistence schema changes, no asset/script policy changes.

- NO provider execution.
- NO sandbox execution.
- NO live DNS.
- NO DNS writes.
- NO queue/Inngest execution for provider handoff readiness inspection.
- NO external registrar calls.
- NO Openprovider API calls.
- NO worker execution for provider actions.
- NO secret reads.
- NO secret resolution.
- NO persisted execution job creation from dry-run job plan.
- NO `plannedJobIds` mutation from dry-run job plan.
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.
- `approved_for_future_execution` is intent-only and does not authorize execution.
- `authorized_for_future_execution` is intent-only and does not authorize execution.
- `executionBlocked` remains `true`.
- governance snapshot is evidence only.
- NO Openprovider/registrar calls.
- NO queue/Inngest/worker execution.

## Worker Pickup Readiness Criteria

Worker pickup readiness required conditions:
- handoff_status_ready
- non_live_environment
- has_planned_jobs
- approval_status_approved

Blocked when:
- live environment
- handoffStatus blocked
- unapproved blocked handoff
- executable provider handoff with no planned jobs

Clarifications:
- readiness model exists
- worker pickup evidence is deterministic and reconstructable from persisted handoff artifact
- blockedReasons are normalized: no contradictory approval/handoff/planned-job reasons; reasons remain deterministic and operator-readable
- worker execution is not enabled
- this is pre-worker control-plane only

## Current DB/Schema Readiness State

Missing (until migration applied in target DB):
- `gnr8_provider_credential_references`

Present (migration-defined baseline):
- `gnr8_runtime_provider_jobs`
- `gnr8_agency_provider_settings`
- `gnr8_runtime_provider_operation_approvals`
- `gnr8_runtime_provider_execution_handoffs`
- `gnr8_runtime_provider_operator_reviews`
- `gnr8_runtime_provider_governance_snapshots`

## Open Decisions (Needs ADR Before Live Execution)

- Live provider execution gate release criteria.
- External registrar/API execution policy and audit boundary.
- Worker execution enablement criteria for provider actions.

## Bootstrap Notes For New Threads

Start every new thread with:
1. `docs/ai/GNR8_THREAD_HANDOFF.md`
2. `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
3. `docs/ai/GNR8_CURRENT_STATE.md`
4. `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
5. `docs/ai/GNR8_PROJECT_MAP.md`
6. `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
7. `docs/ai/decisions/*.md`
