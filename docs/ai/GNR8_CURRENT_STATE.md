# GNR8 CURRENT STATE SNAPSHOT

## Snapshot Date
2026-07-14

## Current Phase

GX-1 - GNR8 Knowledge Workspace Foundation is COMPLETE.

Canonical records:

- `docs/architecture/KNOWLEDGE_WORKSPACE_RUNTIME_FOUNDATION.md`
- `docs/architecture/BUSINESS_FOUNDATION_RUNTIME_UX.md`
- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD_RUNTIME_FOUNDATION.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`
- `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`
- `docs/architecture/THE_GNR8_BLUEPRINT.md`
- `docs/architecture/MVP_0_FIRST_EXECUTABLE_PIPELINE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`

GX-1 route:

```text
/gnr8/admin/workspace/[siteVersionId]
```

ODV route:

```text
/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

GX-1 adds the first Knowledge Workspace: the read-only operator page that
composes existing Business Foundation, Source Website Understanding, and
Generation Evolution projections into one product-oriented workspace. It
does not expose internal artifacts first. It exposes source website, latest
proposal preview, understanding quality, current gaps, workspace health, and
supporting navigation first, with technical details collapsed in Advanced.

GX-1 implementation:

- New projection composition:
  `apps/platform/gnr8/architecture/knowledge-workspace-projection.ts`.
- New route:
  `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/page.tsx`.
- New reusable read-only UI components:
  `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/knowledge-workspace-components.tsx`.
- New focused test:
  `apps/platform/app/gnr8/admin/knowledge-workspace-page.test.ts`.
- Supporting read-only links from Business Foundation, Website Understanding,
  and Generation Evolution back to Workspace.
- Validation: focused admin UX tests pass, `cd apps/platform && pnpm run
  vercel-build` passes, and `git diff --check` passes.
- ODV browser check: local navigation to the Workspace route redirects to
  `/login` without a signed-in superadmin browser session. The route is
  confirmed auth-gated; authenticated DOM verification remains GX-2.

GX-1 sections:

```text
Workspace Hero
Website Versions
Business Understanding
Visual Identity
Transformation Story
Current Knowledge Gaps
Workspace Health
Advanced
```

GX-1 adds no Business Discovery change, Website Understanding change, DBT
change, WDB/WGP change, generation change, compliance/evolution logic change,
persistence, schema, API, worker, AI, publishing, deployment, DNS, runtime
architecture mutation, edit controls, forms, or mutation controls.

Recommended next phase:

```text
GX-2 - Knowledge Workspace Real-Target Verification and UX Tightening
```

Keep GX-2 read-only unless explicitly authorized otherwise. Do not introduce
editing, confirmation, generation, regeneration, persistence, schema, API,
worker, AI, publishing, deployment, DNS, or runtime architecture changes.

Prior planning context:

WU-6 - Optional Business Discovery Runtime Integration Plan is COMPLETE.

Canonical WU-6 records:

- `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_INTEGRATION_PLAN.md`
- `docs/architecture/BUSINESS_DISCOVERY_WEBSITE_UNDERSTANDING_SHADOW_ADAPTER.md`
- `docs/architecture/BUSINESS_DISCOVERY_INPUT_EQUIVALENCE.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`
- `docs/architecture/WEBSITE_UNDERSTANDING_REALITY_AUDIT.md`
- `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`
- `docs/architecture/THE_GNR8_BLUEPRINT.md`
- `docs/architecture/MVP_0_FIRST_EXECUTABLE_PIPELINE.md`

WU-6 scope:

```text
Website Source
-> Import
-> Raw Evidence
-> Structured Evidence
-> Candidate Discovery / Review
-> Source Website Understanding Projection
-> Future runtime mode selection
-> WU adapter
-> Existing Business Discovery builder
-> DBT and downstream chain
```

WU-6 is planning and governance only. It defines future runtime integration
architecture, integration modes, rollout policy, rollback policy, readiness
rules, governance, runtime sequence diagrams, connector strategy,
observability, and failure handling. It adds no Business Discovery runtime
switch, Business Discovery builder change, adapter change, Website
Understanding change, feature flag, persistence, schema, API, UI, worker, AI,
generation, publishing, deployment, DNS, or production mutation.

Executive result:

- Website Understanding can become the canonical Business Discovery input by
  making the Source Website Understanding Projection the only upstream adapter
  input to the existing Business Discovery builder.
- Three future runtime modes are documented: `LEGACY`, `SHADOW_COMPARE`, and
  `WEBSITE_UNDERSTANDING`.
- `LEGACY` keeps current scattered input assembly canonical and disables
  shadow comparison.
- `SHADOW_COMPARE` keeps current Business Discovery canonical while WU builds
  an in-memory shadow artifact and compares it without persistence or
  downstream changes.
- `WEBSITE_UNDERSTANDING` makes WU the Business Discovery input through the
  adapter while keeping current scattered assembly available only for instant
  rollback.
- Rollout sequence is Legacy only, Legacy plus Shadow Compare, limited
  internal websites, selected migration customers, Website Understanding
  default, and legacy retirement in a later explicit phase.
- Rollback requires runtime configuration only. It must never require data
  migration, artifact migration, database repair, recomputation, rebuild, DBT
  or downstream repair, publish repair, or DNS repair.
- Readiness requires 100% dependency coverage, deterministic rebuild, no lost
  findings, no lost evidence refs, no lost limitations, no confidence
  inflation, no unsupported business meaning, no lineage regression, no
  downstream contamination, ODV validation, and ViroiDoc validation.
- Mandatory safety gates cover coverage, lineage, comparison, confidence,
  diagnostics, limitations, connector compatibility, deterministic rebuild,
  and downstream contamination.
- Connector compatibility is documented for WordPress, Joomla, Webflow,
  Shopify, Ecwid, Mono, and future connectors; connector logic remains
  upstream and WU remains connector-neutral.
- Future observability metrics are documented for shadow equivalence rate,
  runtime mode distribution, rollback count, comparison failures, lineage
  failures, coverage failures, confidence mismatches, deterministic rebuild
  failures, and connector compatibility failures. No telemetry was
  implemented.
- Failure handling is documented for projection unavailable, shadow mismatch,
  lineage regression, confidence regression/inflation, connector
  inconsistency, unexpected business finding, comparison timeout, partial
  projection, downstream contamination, lost evidence refs, lost limitations,
  deterministic rebuild mismatch, and rollback requested.

WU-6 previously recommended next phase:

```text
WU-7 - Business Discovery Runtime Mode Configuration Design
```

Keep WU-7 design-only unless explicitly authorized to implement runtime mode
selection. Do not activate Website Understanding, modify Business Discovery,
add feature flags, persist anything, or change runtime behavior by implication.

## Previous Phase

WU-5 - Section Evidence Lineage Preservation for Optional Business Discovery
Cutover is COMPLETE.

Canonical records:

- `docs/architecture/BUSINESS_DISCOVERY_WEBSITE_UNDERSTANDING_SHADOW_ADAPTER.md`
- `docs/architecture/BUSINESS_DISCOVERY_SECTION_EVIDENCE_LINEAGE_PRESERVATION.md`
- `docs/architecture/BUSINESS_DISCOVERY_INPUT_EQUIVALENCE.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_SPECIFICATION.md`

WU-5 closed the WU-4 blocker: current `content_theme_observed`
section-boundary evidence refs are preserved exactly through WU and the
shadow adapter for ODV and ViroiDoc. Both targets reached
`ready_with_expected_differences`, with no runtime switch, no projection
persistence, no shadow persistence, and no downstream mutation.

WU-4 - Business Discovery Website Understanding Shadow Adapter is COMPLETE.

Canonical records:

- `docs/architecture/BUSINESS_DISCOVERY_WEBSITE_UNDERSTANDING_SHADOW_ADAPTER.md`
- `docs/architecture/BUSINESS_DISCOVERY_INPUT_EQUIVALENCE.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_SPECIFICATION.md`

WU-4 closed the WU-3 input gaps and proved the non-persistent WU shadow path,
but still blocked cutover on section-boundary evidence lineage. WU-5 closes
that lineage blocker.

WU-2 - Source Website Understanding Projection Pure Runtime Implementation is
COMPLETE.

Canonical runtime record:

- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_SPECIFICATION.md`

WU-2 implemented the runtime projection contract, deterministic builder,
loader/composition boundary, validation helper, focused tests, and one
read-only superadmin operator page. It added no projection persistence,
schema, new import behavior, new extraction, HTML parsing, asset
classification runtime, AI analysis, Business Discovery behavior, DBT
mutation, WDB/WGP changes, provider execution, generation, approval,
publishing, deployment, DNS, workers, mutation APIs, or editing controls.

WU-0 - Website Understanding Reality Audit is
COMPLETE.

Canonical audit record:

- `docs/architecture/WEBSITE_UNDERSTANDING_REALITY_AUDIT.md`

WU-0 concluded that GNR8 already has a de facto Website Understanding layer
distributed across Import, Evidence Capture, semantic import, asset inventory,
Candidate Discovery, Candidate Review, Reconstruction Package, StructurePlan,
and Business Discovery input handling. WU-1 formalized the recommended small
source-site projection over those existing artifacts, and WU-2 implements it
as a pure runtime read model.

MVP-3.1-B - Business Foundation Upstream Evidence Gap Planning is
COMPLETE.

Canonical planning record:

- `docs/architecture/BUSINESS_FOUNDATION_UPSTREAM_EVIDENCE_GAP_PLAN.md`

MVP-3.1-B explained why ODV still lacks canonical offerings, audience, logo,
colors, typography, and full CGP knowledge even though source text,
HTML/logo metadata, CSS, font assets, screenshots, and imported assets already
exist. WU-0 preserves that finding and reconciles it with the wider Website
Understanding boundary.

MVP-3.1-A - Business Foundation Product UX Transformation is
COMPLETE.

Canonical transformation record:

- `docs/architecture/BUSINESS_FOUNDATION_PRODUCT_UX_TRANSFORMATION.md`

Updated real ODV Business Foundation route:

```text
/gnr8/admin/business-foundation/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

MVP-3.1-A transformed the page from a diagnostic-first technical artifact
surface into a story-first product experience for non-technical operators.

MVP-3.0-D - Business Foundation Real-Target Operator Verification is
COMPLETE.

Canonical verification record:

- `docs/architecture/BUSINESS_FOUNDATION_REAL_TARGET_VERIFICATION.md`

MVP-3.0-C - Business Foundation Runtime UX is COMPLETE.

Canonical runtime UX record:

- `docs/architecture/BUSINESS_FOUNDATION_RUNTIME_UX.md`

GNR8 added its second read-only Runtime UX surface:

```text
/gnr8/admin/business-foundation/[siteVersionId]
```

ODV route:

```text
/gnr8/admin/business-foundation/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The projection is a read model only. It is not a canonical artifact and does
not persist anything. It consumes only the existing business foundation chain
from `siteVersion.importProvenanceSummary`.

MVP-3.0-B - Generation Evolution Dashboard Real-Target Operator Verification
is COMPLETE.

Canonical verification record:

- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD_REAL_TARGET_VERIFICATION.md`

Local runtime verification used the existing authenticated login/session flow
and authorized the current cookie-backed local user through the existing
`SUPERADMIN_EMAILS` mechanism in an ignored local env file. The private local
email value is not documented. No auth bypass was added, no authorization
logic changed, and no production environment configuration changed.

```text
dashboard route result: 200
header/title: Generation Evolution Dashboard / GNR8 Platform
```

The real ODV dashboard projection loaded through existing read paths and
verified:

```text
siteVersionId: 09dce7ea-d860-4f60-a1eb-26c3335b302e
Generation Cycle: ODV Generation Cycle
current iteration: 2
cycle state: improving
overall trajectory: improved
latest compliance: non_compliant
latest evolution assessment: meaningful_improvement
latest recommendation: create_compliance_report_v2
business confidence: HIGH from persisted artifacts
attention states: compliance_non_compliant, limitations_present, evolution_improved, improvement_available, unresolved_knowledge_present
```

Both preview bundles are locally available through the allowlisted preview
boundary and were opened from the rendered dashboard:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/1/preview/
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/2/preview/
```

Focused security checks confirmed fail-closed handling for unknown iteration,
missing file, plain traversal, encoded traversal, absolute path attempt,
outside-source attempt, outside-bundle resolution, and unavailable bundle.

Authenticated browser inspection confirmed Business Foundation, Iteration 1,
Improvement Plan transition, Iteration 2, Evolution Analysis, Attention
States, and Artifact Lineage render as a readable story without raw JSON.
Iteration 1 rendered styled HTML/CSS/JavaScript with no image elements.
Iteration 2 rendered styled HTML/CSS/JavaScript with local SVG assets, no
broken image elements, and active desktop navigation state.

Narrow rendering/UX fixes were made: dashboard preview cards now say
`Generated Proposal Preview`, artifact lineage keys are unique, and preview
HTML rewrites local `./...` asset references through `/preview/source/` so
CSS, JavaScript, and SVG assets resolve in the browser. No authorization
logic, route authorization, artifact grouping, persistence, schema, provider,
AI, worker, approval, publishing, deployment, DNS, production behavior,
canonical artifact, or generated source bundle changed.

MVP-3.0-A - Generation Evolution Dashboard Runtime Foundation is COMPLETE.

GNR8 now has its first real read-only Runtime UX surface:

- `apps/platform/app/gnr8/admin/evolution/[siteVersionId]/page.tsx`
- `apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.ts`
- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD_RUNTIME_FOUNDATION.md`

ODV dashboard route:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The dashboard consumes existing canonical artifacts from
`siteVersion.importProvenanceSummary`; it is not a canonical artifact and does
not create business truth. It shows the ODV Generation Cycle, Iteration 1,
Iteration 2, compliance results, the persisted Evolution Analysis, attention
states, and read-only artifact references.

Preview routes:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/1/preview/
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/2/preview/
```

The preview routes are superadmin-only, static, allowlisted, and read-only.
They expose quarantined generated proposal bundles only. They are not
published websites and do not approve, publish, deploy, bind domains, mutate
DNS, mutate production, execute providers, execute AI, recompute compliance,
or mutate proposal files. Filesystem-backed preview availability depends on
the proposal source folders being packaged in the current runtime.

MVP-2.0-N - Generation Evolution Dashboard Architecture is COMPLETE.

GNR8 now has a canonical architecture for the Generation Evolution Dashboard:

- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD.md`

The dashboard is the primary historical read-only view of one website's
evolution across Generation Cycles and Iterations.

The dashboard answers:

```text
What happened to my website over time?
```

It does not answer:

```text
What does my latest website look like?
```

Canonical dashboard timeline:

```text
Generation Cycle
-> Iteration 1
-> Iteration 2
-> Iteration 3
-> ...
-> Approved
-> Published
```

Each iteration is represented by a read-only card containing iteration number,
generation cycle, creation timestamp, status, overall assessment,
recommendation, compliance status, confidence, and improvement summary.

Each card links to canonical artifacts such as Business Discovery, Digital
Business Twin, Business Understanding Report, Business Alignment, Website
Design Brief, Website Generation Package, Provider Payload, Generated
Proposal, Observed Website, Compliance, Compliance Report, Improvement Plan,
and Evolution Analysis. Links are read-only references.

Every iteration card also defines links to its generated website history:

```text
Generated Website
-> Preview URL
-> Open Preview
-> Static Snapshot
-> Proposal Bundle
```

The dashboard requires every generated website version to remain permanently
reachable through its iteration so users can manually inspect historical
versions. Future automated visual diff, trend metrics, provider comparison, or
comparison engines are documented as future possibilities only.

MVP-2.0-N added no runtime behavior, persistence, UI implementation, routes,
API, schema, workers, provider execution, AI execution, publishing, artifact
contract changes, Generation Cycle runtime changes, compliance runtime
changes, or automatic future-iteration comparison.

MVP-2.0-M - First Generation Evolution Analysis for ODV is COMPLETE.

GNR8 formally compared ODV Iteration 1 and Iteration 2 against the same
Website Generation Package without recomputing either compliance result.
Persisted Generation Evolution Analysis:
`generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253`.

Status / overall assessment / recommended next action:
`improved` / `meaningful_improvement` / `create_compliance_report_v2`.

MVP-2.0-K - Observed Website Model v2 for ODV is COMPLETE.

GNR8 has two persisted ODV Observed Website Model artifacts:

- Iteration 1:
  `observed_website_model_35499a9cb91a15740910532d451a739a`;
- Iteration 2:
  `observed_website_model_0d5e829f546745b1433557978c875626`.

OWM v2 observes only the Iteration 2 source bundle:

```text
ODV_GENERATED_PROPOSAL_002/source/
```

OWM v2 status/readiness: `observable` / `observable`.

Canonical document:

- `docs/architecture/SECOND_OBSERVED_WEBSITE_MODEL.md`

MVP-2.0-J - Import Second Generated Website Proposal is COMPLETE for ODV.

GNR8 now has two persisted, quarantined ODV Generated Website Proposal
artifacts:

- Iteration 1:
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`;
- Iteration 2:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.

Iteration 2 was imported from `ODV_GENERATED_PROPOSAL_002/` and became the
latest proposal for ODV. Latest reload and by-ID reload both returned
`generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`. Idempotent
retry reused the same artifact. Proposal count increased exactly once from
`1` to `2`. Iteration 1 remained loadable by ID.

Canonical document:

- `docs/architecture/SECOND_GENERATED_WEBSITE_PROPOSAL_IMPORT.md`

MVP-2.0-ARCH - Generation Cycle Architecture is COMPLETE.

GNR8 now possesses the canonical Generation Cycle Architecture:

- Generation Cycle is "A deterministic governance model describing the
  complete evolutionary history of a website across multiple generation
  iterations."
- Iteration is "A governed generation attempt belonging to exactly one
  Generation Cycle."
- Artifacts preserve truth.
- Lineage preserves causality.
- Generation Cycles preserve evolution.
- Iterations preserve improvement.
- Business intent remains canonical.
- Providers remain replaceable.

Generation Cycle organizes existing artifact lineage across repeated
generation iterations. It does not replace artifact lineage, own business
truth, own business alignment, own the Website Generation Package, execute
providers, execute AI, import proposals, run compliance, approve, publish,
deploy, mutate production, introduce runtime cycle IDs, or modify canonical
business artifacts.

Canonical document:

- `docs/architecture/GENERATION_CYCLE_ARCHITECTURE.md`

MVP-2.0-ARCH was documentation only. It added no runtime behavior,
persistence, schema, API, UI, workers, provider execution, AI execution,
regeneration, publishing, deployment, or canonical business artifact mutation.

MVP-2.0-H - Second Generation Delivery Package is COMPLETE for ODV.

GNR8 now possesses its first complete deterministic regeneration delivery
package for Iteration 2:

```text
ODV_REGENERATION_EXPORT_002/
```

The package exports the persisted ODV Provider Payload v2 together with copied
canonical JSON artifacts, complete lineage, business summary, regeneration
summary, Improvement Plan-derived delta, and manual external execution readme.

- target: ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`;
- export ID: `odv-regeneration-export-002`;
- generation cycle ID: `odv-generation-cycle-002`;
- iteration: `2`;
- source `WebsiteGenerationPackageArtifact`:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- source `GenerationImprovementPlanArtifact`:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- source `GenerationContractComplianceReportArtifact`:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`;
- Provider Payload v2 artifact:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- export status: `ready_for_manual_external_generation`;
- current compliance: `NON_COMPLIANT`;
- reason: `Regeneration Required`;
- improvement count: `413`;
- priority counts: critical `259`, medium `154`;
- business intent: `Preserve`;
- expected result: `Higher contractual compliance`;
- lineage continuity passed from BusinessDiscovery through ProviderPayload v2;
- manifest consistency passed;
- JSON parse validation passed.

MVP-2.0-H did not execute Codex, execute a provider, execute AI, regenerate a
website, import a Generated Website Proposal v2, mutate the Website Generation
Package, mutate the Generation Improvement Plan, mutate Compliance, mutate the
Compliance Report, create Business Approval, publish, deploy, mutate canonical
business artifacts, add UI, add API, add schema, or add workers.

Canonical document:

- `docs/architecture/SECOND_GENERATION_DELIVERY_PACKAGE.md`

Historical next phase from MVP-2.0-H was MVP-2.0-I - Manual External
Regeneration Execution. That handoff has now produced
`ODV_GENERATED_PROPOSAL_002/`, and MVP-2.0-J has imported it as
`generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.

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
Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary is COMPLETE.
Phase 8B-11 creates `docs/architecture/FIRST_LIMITED_DRY_RUN_REASSESSMENT.md` and reassesses the completed admin-only limited dry-run diagnostic chain. It confirms the implemented and verified state, remaining forbidden actions, missing capabilities, and current safety posture.
Phase 8B-11 compares next-boundary options: UI trigger button, limited approval/readiness marker, runtime mutation capture, first real-site operational test, and candidate discovery implementation.
Phase 8B-11 recommends Phase 8B-12 — First Real-Site Limited Dry Run Operational Test because the safest next step is to verify the existing superadmin API trigger, persisted artifact, latest loader, and read-only admin page against one real imported site before adding UI trigger, approval, runtime mutation capture, or candidate discovery behavior.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, new API routes, UI trigger button, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing logic was added in Phase 8B-11.
Phase 8B-12 — First Real-Site Limited Dry Run Operational Test is COMPLETE with a preflight FAIL.
Phase 8B-12 creates `docs/architecture/FIRST_REAL_SITE_LIMITED_DRY_RUN_OPERATIONAL_TEST.md` and records a read-only operational attempt against `https://www.odv-cvijanovic.si/` (`siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, `siteId = site_aaa6d44109a38b5d083f`, route count `1`).
Phase 8B-12 stopped at preflight because the selected real imported site did not have `evidenceCaptureBaselineArtifact`, layout geometry evidence, section evidence, navigation evidence, or an accepted `ReconstructionDryRunPackage`. A read-only production scan found `14` site versions with non-null import provenance summaries and `0` qualifying versions with the required baseline/package inputs. The staging database endpoint configured in `.env.staging` was not usable from this environment.
No `POST /api/gnr8/admin/first-limited-dry-run` request was sent, no dry-run output was built, no `first_limited_dry_run_output` artifact was created, no latest artifact was loaded, no admin surface was verified against a real persisted output, and no idempotency trigger was run.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, new API routes, UI trigger button, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing logic was added in Phase 8B-12.
Phase 8B-12F — Reconstruction Readiness Inventory Audit is COMPLETE.
Phase 8B-12F creates `docs/architecture/RECONSTRUCTION_READINESS_INVENTORY_AUDIT.md` and inventories all `14` production imported runtime site versions with non-null `import_provenance_summary`.
Result: `14` classify as `NO_EVIDENCE_CAPTURE`; `0` classify as `BASELINE_ONLY`, `CAPTURE_EXPANDED`, `RECONSTRUCTION_READY`, `DRY_RUN_READY`, `DRY_RUN_COMPLETED`, or `UNKNOWN_STATE`.
Root cause: every imported production site version is missing `evidenceCaptureBaselineArtifact`; all `14` have `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, zero screenshots, zero computed style samples, no capture expansion evidence, no reconstruction package chain, no `ReconstructionDryRunPackage`, and no `FirstLimitedDryRunOutput`.
Dominant blocker: production rendered Evidence Capture/worker readiness, not Limited Dry Run builder behavior or admin surface behavior. Worker health is missing on `5` versions, unreachable on `5`, and misconfigured on `4`; capture jobs are missing on `5`, transient failed on `5`, and terminal failed on `4`.
No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, worker behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, or backfills were changed or created in Phase 8B-12F.
Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit is COMPLETE.
Phase 8B-12G creates `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md` and audits rendered-capture worker config references, deployment assumptions, existing production diagnostics for representative failed versions, root-cause classification, and production readiness.
Finding: production rendered Evidence Capture fails before raw fallback because the platform cannot obtain a valid usable worker response. Four imported versions are `worker_not_configured` / terminal failed before an HTTP request is sent, five are `worker_http_error` / transient failed after request/response classification, and five older imported versions retain worker HTTP failure/fallback diagnostics but no structured job/health state. No inspected version reaches `CAPTURE_WORKER_RESPONSE_PARSED` or browser-capture dependency diagnostics.
Root-cause classification: primary `H. platform caller misconfigured`; supporting `A. worker URL missing` for config-missing paths and local production env, `C. worker health unavailable` for unreachable paths, and unresolved `J. unknown` for the exact HTTP response class because durable provenance does not retain endpoint/status/body details. `D`, `F`, `G`, and `I` are not supported by the inspected persisted diagnostics.
Readiness result: NOT PRODUCTION READY for rendered Evidence Capture. Worker deployment/reachability, health response shape, capture response shape, and auth configuration are not proven ready; timeout is not the observed failure class; browser dependency readiness remains unknown because worker execution does not reach parsed capture truth.
No importer behavior, Evidence Capture behavior, worker behavior, worker deployment, environment variables, Original Mirror behavior, preview behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, backfills, worker jobs, retries, or imports were changed or created in Phase 8B-12G.
Phase 8B-12H — Production Evidence Capture Worker Readiness Fix is COMPLETE.
Phase 8B-12H adds an explicit production rendered-capture worker readiness config/probe helper and a superadmin-only read-only endpoint at `GET /api/gnr8/admin/rendered-capture-worker/readiness`. The endpoint reports `ok`, `enabled`, `configured`, `baseUrlPresent`, `path`, `healthPath`, `sharedTokenConfigured`, `timeoutMs`, `healthStatus`, `healthHttpStatus`, and deterministic diagnostics without exposing the shared-token value.
Phase 8B-12H readiness is fail-closed: enabled worker config without `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` is `misconfigured`; enabled worker config without `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` is `misconfigured`; disabled config is `disabled`; non-OK or failed health fetch is `unreachable`; valid HTTP response that does not prove authenticated capture-service availability is `invalid_response`; valid authenticated health with capture service available is `ready`.
Phase 8B-12H health checks perform only bounded `GET` requests to the worker health endpoint, use the configured timeout, do not retry, do not send capture POSTs, and do not run browser work from the platform readiness endpoint.
Diagnostics added: `RENDERED_CAPTURE_WORKER_CONFIG_DISABLED`, `RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL`, `RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN`, `RENDERED_CAPTURE_WORKER_HEALTH_STARTED`, `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`, `RENDERED_CAPTURE_WORKER_HEALTH_FAILED`, and `RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE`.
No importer semantics, Evidence Capture capture execution, Original Mirror behavior, preview behavior, dry-run builder behavior, limited dry-run API/UI behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, imports, retries, or Evidence Capture artifacts were created or changed in Phase 8B-12H.
Phase 8B-12I — Production Worker Env Configuration Verification is COMPLETE.
Phase 8B-12I creates `docs/architecture/PRODUCTION_WORKER_ENV_CONFIGURATION_VERIFICATION.md` and documents the exact Vercel configuration required for the production platform to reach the rendered capture worker. Required platform Production envs are `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`, `GNR8_RENDERED_CAPTURE_WORKER_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, and `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`; readiness requires an explicit worker base URL and shared token.
Phase 8B-12I documents worker-side requirements: a deployed Vercel worker production URL, `GET /health`, `POST /internal/gnr8/rendered-capture-worker`, compatibility `POST /api/internal/gnr8/rendered-capture-worker`, matching `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, Node runtime, Playwright package availability, launchable Chromium/browser availability, and Vercel project configuration that actually serves the rendered capture worker rather than a generic worker app route.
Phase 8B-12I defines the 8B-12J verification flow: configure platform env vars, configure worker env vars, deploy worker, deploy platform, call `GET /api/gnr8/admin/rendered-capture-worker/readiness` as superadmin, and capture the response without exposing secrets. Expected ready proof is `enabled = true`, `configured = true`, `baseUrlPresent = true`, `sharedTokenConfigured = true`, `healthStatus = ready`, and diagnostics including `RENDERED_CAPTURE_WORKER_HEALTH_STARTED` and `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`.
Phase 8B-12I includes failure-response mappings for disabled config, missing base URL, missing token, unreachable worker, and invalid health response, plus the exact information to collect before 8B-12J: platform Vercel project name, worker Vercel project name, worker production URL, health endpoint URL, configured path, configured timeout, and readiness response.
No token values, copied production secrets, Vercel env changes, deployments, readiness calls, imports, retries, capture POSTs, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, repair jobs, migrations, importer behavior, Evidence Capture behavior, worker code, platform code, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or database schema changes were made in Phase 8B-12I.
Phase 8B-12K — Rendered Capture Smoke Test is COMPLETE with a source-resolution FAIL.
Phase 8B-12K creates `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md` and records that the one-site rendered capture attempt for `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d` did not reach the worker because capture source resolution depended on persisted `/tmp/gnr8/validation/url-import-snapshots/...` paths that no longer exist in this execution environment.
No Evidence Capture baseline artifacts, DryRun packages, FirstLimitedDryRun outputs, imports, capture retries, repair jobs, migrations, importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or database schema changes were made in Phase 8B-12K.
Phase 8B-12K-F1 — Existing SiteVersion Capture Source Rehydration Audit is COMPLETE.
Phase 8B-12K-F1 creates `docs/architecture/EXISTING_SITEVERSION_CAPTURE_SOURCE_REHYDRATION_AUDIT.md` and audits where rendered capture source HTML should come from for existing imported siteVersions. The target version has a durable `raw_imported_site` artifact (`6f0829d5-a481-4722-b9e1-1b999e65e4b7`) with `index.html` stored in `content_bytes`, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`, and 351 persisted file rows. The original `/tmp` source paths are missing; sourceUrl/finalUrl exist but refetch is non-deterministic; runtime artifact HTML is product output, not imported source truth; preview/raw routes can read the raw artifact but should not become the source of truth.
Recommendation: teach rendered capture source resolution to use persisted raw imported artifact HTML as the primary rehydration source for existing imported siteVersions when local snapshot paths are missing.
No importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, source backfills, imports, or capture retries were changed or created in Phase 8B-12K-F1.
Phase 8B-12K-F2 — Rendered Capture Raw Import Artifact Source Resolution Fix is COMPLETE.
Phase 8B-12K-F2 updates rendered capture source resolution for existing imported siteVersions only. The resolver now tries: existing local provenance file path if present; otherwise the latest durable `raw_imported_site` artifact HTML from persisted `content_bytes`; otherwise `SITE_RENDER_CAPTURE_SOURCE_NOT_FOUND`. The raw artifact fallback selects `entry_html_path` first, then `index.html`, writes the selected HTML bytes to a temporary rehydration path for the existing capture runner, and never refetches the original URL.
Phase 8B-12K-F2 adds deterministic diagnostics: `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_MISSING`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
No importer semantics, Original Mirror behavior, preview behavior, dry-run builder behavior, limited dry-run API/UI behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, imports, capture retries, or Evidence Capture artifacts were created or changed in Phase 8B-12K-F2.
Phase 8B-12K-Retry reran the one-site rendered capture smoke test for `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`. Preflight confirmed the old local `/tmp` source HTML paths are absent, the durable `raw_imported_site` artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` exists, and `index.html` is stored in `content_bytes` with SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`. The unauthenticated shell could not read the production admin readiness endpoint (`401 Unauthorized`), and the local retry process did not have `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` or `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`.
Phase 8B-12K-Retry source resolution passed: diagnostics included `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`. The retry then failed before any worker HTTP request was sent because the local worker client was not configured; diagnostics included `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`, `CAPTURE_WORKER_URL_RESOLVED`, `CAPTURE_WORKER_NOT_CONFIGURED`, `CAPTURE_WORKER_UNAVAILABLE`, and `RENDERED_CAPTURE_UNAVAILABLE`.
Phase 8B-12K-Retry result: FAIL, classified as B. worker not reached. `renderedCaptureStatus` remained `failed`, `renderedDomQuality` remained `unusable`, screenshots count remained `0`, computed style samples count remained `0`, layout geometry count remained `0`, section evidence count remained `0`, and navigation evidence count remained `0`. A baseline-shaped `evidenceCaptureBaselineArtifact` now exists after the retry, but it has no usable rendered evidence or capture-expansion evidence and therefore is not a passing Evidence Capture baseline.
Phase 8B-12K-Retry-F1 — Production Worker Config Injection / Authenticated Readiness Verification is COMPLETE.
Phase 8B-12K-Retry-F1 audits the operational methods for the next retry: A. production admin route/server-side action, B. local shell with explicit env injection, C. Vercel CLI env pull, and D. dedicated superadmin-only smoke endpoint. It recommends exactly one mode: B. local shell with explicit env injection. This is the smallest no-new-code path that directly addresses the previous `CAPTURE_WORKER_NOT_CONFIGURED` failure while avoiding a new production execution endpoint and avoiding persistent local secret files.
Phase 8B-12K-Retry-F1 documents the authenticated-superadmin readiness call path for `GET /api/gnr8/admin/rendered-capture-worker/readiness`, records the unauthenticated production boundary check (`401 Unauthorized` at `2026-06-17 11:36:36 UTC`), records that the in-app browser attempt was blocked by `net::ERR_BLOCKED_BY_CLIENT`, and carries forward the current authenticated-superadmin ready result from phase context: `ok = true`, `enabled = true`, `configured = true`, `baseUrlPresent = true`, `sharedTokenConfigured = true`, `healthStatus = ready`, with `RENDERED_CAPTURE_WORKER_HEALTH_STARTED` and `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED` in diagnostics. No secret values were recorded.
Phase 8B-12K-Retry-F1 defines the F2 env injection checklist: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED=true`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL=https://gnr8-worker.vercel.app`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=<secret, do not print>`, optional `GNR8_RENDERED_CAPTURE_WORKER_PATH`, optional `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH`, and optional `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`. Token handling rule: never commit it, paste it into docs, or print it in reports.
Phase 8B-12K-Retry-F2 — Rendered Capture Smoke Retry With Worker Env is COMPLETE with a worker HTTP error FAIL classification.
Phase 8B-12K-Retry-F2 loaded `apps/platform/.env.local` into the local execution process with shell tracing disabled. Worker token presence was confirmed as a boolean only; no token value was printed, copied into docs, committed, or persisted by the report. Preflight passed: production DB URL present, worker enabled, worker base URL present (`https://gnr8-worker.vercel.app`), worker token present, worker capture path present (`/internal/gnr8/rendered-capture-worker`), worker health path present (`/health`), worker timeout `30000`, durable raw import artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` exists, and `index.html` is stored in `content_bytes` (`29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`) with `351` persisted files.
Phase 8B-12K-Retry-F2 used the existing `runSiteRenderCapture(...)` path. Source resolution succeeded from durable raw import artifact bytes and emitted `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
Phase 8B-12K-Retry-F2 reached the worker. Live diagnostics included `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`, `CAPTURE_WORKER_URL_RESOLVED`, `CAPTURE_WORKER_REQUEST_STARTED`, `CAPTURE_WORKER_REQUEST_BUILT`, `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, `CAPTURE_WORKER_HTTP_ERROR`, `CAPTURE_WORKER_REQUEST_FAILED`, `RENDERED_CAPTURE_UNAVAILABLE`, and `CAPTURE_WORKER_UNAVAILABLE`. Existing service logs showed worker config state `enabled = true`, `baseUrlPresent = true`, and `tokenPresent = true`.
Phase 8B-12K-Retry-F2 result: FAIL, classified as D. worker HTTP error. `renderedCaptureStatus` remained `failed`, `renderedDomQuality` remained `unusable`, `sourceMode` remained `raw_html_fallback`, `hasUsableEvidence = false`, failure reason `CAPTURE_WORKER_HTTP_ERROR`, screenshots count `0`, computed style samples count `0`, rendered DOM length `0`, DOM node count `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`. A baseline-shaped `evidenceCaptureBaselineArtifact` exists and contains capture-expansion keys, but it has no usable rendered evidence or capture-expansion evidence and is not a passing Evidence Capture baseline.
Phase 8B-12K-Retry-F2 persisted rendered-capture execution reports `failureCode = CAPTURE_WORKER_HTTP_ERROR`, `environmentStatus = unsupported`, `environmentSupported = false`, `browserPackageAvailable = true`, and `browserBinaryAvailable = true`. F2 proves source rehydration works and the configured worker is reached; the remaining blocker is worker HTTP response/endpoint/runtime behavior.
Phase 8B-12K-Retry-F3 — Worker HTTP Error Diagnosis is COMPLETE.
Phase 8B-12K-Retry-F3 inspected the exact deployed worker HTTP error class without code or behavior changes and without a tokened external POST from this local session. Unauthenticated diagnostic POSTs to `https://gnr8-worker.vercel.app/internal/gnr8/rendered-capture-worker` and `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker` both returned `404 Not Found`, `content-type = text/html; charset=utf-8`, with a generic Next HTML not-found body rather than JSON worker error/diagnostics or `rendered_capture_worker_response_v1`.
Phase 8B-12K-Retry-F3 route inspection found the standalone rendered-capture worker server contract in `apps/platform/gnr8/rendered-capture-worker-server/server.ts` for `POST /internal/gnr8/rendered-capture-worker` and compatibility `POST /api/internal/gnr8/rendered-capture-worker`; the platform Next proxy route exists at `apps/platform/app/api/internal/gnr8/rendered-capture-worker/route.ts`; but `apps/worker` source/build exposes only `/health` and no capture POST route. F2's platform-called primary path was `/internal/gnr8/rendered-capture-worker`, with client fallback to `/api/internal/gnr8/rendered-capture-worker` after a `404`.
Phase 8B-12K-Retry-F3 classified the primary failure as B. route missing / 404. The response failed before auth, request validation, payload-size handling, worker runtime execution, Playwright/browser launch, timeout handling, or worker response-shape validation.
Phase 8B-12K-Retry-F4 — Deployed Worker Route / Entrypoint Alignment is COMPLETE.
Phase 8B-12K-Retry-F4 adds `POST /internal/gnr8/rendered-capture-worker` and compatibility `POST /api/internal/gnr8/rendered-capture-worker` to `apps/worker`. Both route files use the same worker route handler and delegate to the rendered-capture worker server fetch contract in `apps/platform/gnr8/rendered-capture-worker-server/fetch-handler.ts`, which reuses `worker-service.ts` and `worker-contract.ts`.
Phase 8B-12K-Retry-F4 preserves shared-token auth through `x-gnr8-rendered-capture-worker-token`, does not print or return token values, returns JSON worker errors instead of generic Next HTML for route-level failures, and returns the existing `rendered_capture_worker_response_v1` / `contractVersion = 1.0.0` response shape on successful handler execution.
Phase 8B-12K-Retry-F4 validation passed focused worker route tests and `apps/worker` production build; build output lists both `/internal/gnr8/rendered-capture-worker` and `/api/internal/gnr8/rendered-capture-worker` as dynamic routes. No full capture smoke retry, import retry, Limited Dry Run, reconstruction, generation, publishing, migration, or artifact creation was performed.
Phase 8B-12K-Retry-F5 — Rendered Capture Smoke Retry After Worker Route Alignment is COMPLETE with a worker browser/navigation failure classification.
Phase 8B-12K-Retry-F5 reran the one-site rendered capture smoke for `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d` using the existing `runSiteRenderCapture(...)` path only. Preflight passed: worker health returned ready, platform readiness route logic returned ready, worker base URL was present (`https://gnr8-worker.vercel.app`), worker token was present without printing the value, durable `raw_imported_site` artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` existed, and `index.html` was stored in `content_bytes` (`29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`) with `351` persisted files.
Phase 8B-12K-Retry-F5 source resolution again succeeded from durable raw import artifact bytes and emitted `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
Phase 8B-12K-Retry-F5 reached the deployed worker route and received JSON, not generic `404` HTML. The capture POST returned `200 OK`, `content-type = application/json; charset=utf-8`, and response kind `rendered_capture_worker_response_v1`; diagnostics included `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, and `CAPTURE_WORKER_RESPONSE_PARSED`.
Phase 8B-12K-Retry-F5 then failed during worker capture execution after browser launch/page creation: diagnostics included `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_STARTED`, `NAVIGATION_FAILED`, and `BROWSER_NAVIGATION_FAILED`. Result: `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, `hasUsableEvidence = false`, failure reason `CAPTURE_WORKER_EXECUTION_FAILED`, screenshots `0`, computed style samples `0`, rendered DOM length `0`, DOM node count `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
Phase 8B-12K-Retry-F5 confirms route alignment is successful but Evidence Capture baseline readiness still fails. A baseline-shaped `evidenceCaptureBaselineArtifact` exists, but it has no usable rendered evidence or capture-expansion evidence. Primary failure classification: E. worker browser/playwright failed, with more specific subtype worker navigation failed; secondary consequence: H. capture expansion evidence missing. No Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, migration, import retry, code change, schema change, or unrelated artifact was created in F5.
Phase 8B-12K-Retry-F6 — Worker-Accessible Source Delivery / Navigation Failure Diagnosis is COMPLETE.
Phase 8B-12K-Retry-F6 inspected source/navigation fields and worker navigation logic only. The worker request contract contains one navigation source field, `sourceUrl`; it has no `fileUrl`, `path`, source base URL, raw HTML, or data URL field. For F5, `runSiteRenderCapture(...)` rehydrated durable `raw_imported_site` HTML to a platform-local temp path under `/var/folders/.../gnr8/rendered-capture-source-rehydration/.../index.html`, converted that path with `pathToFileURL(...)`, and sent the resulting `file://` URL as worker `sourceUrl`.
Phase 8B-12K-Retry-F6 found that the worker fetch handler validates the request and then passes `request.sourceUrl` to `runRenderedCapture(...)`; the rendered capture executor navigates with `page.goto(input.sourceUrl)`. The current worker does not support raw HTML request content, does not use `page.setContent(...)`, and only supports `file://` when the target file exists inside the same worker runtime filesystem.
Phase 8B-12K-Retry-F6 classifies the F5 navigation failure as A. remote worker cannot access local file path. Browser launch/page creation succeeded; navigation failed because the deployed worker browser was asked to navigate to a platform-local `file://` URL that does not exist in the deployed worker filesystem.
Phase 8B-12K-Retry-F6 compared source delivery options and recommends exactly one strategy: add a platform source-serving endpoint for immutable raw artifact HTML and assets. This lets the worker navigate a worker-accessible HTTPS URL, keeps capture deterministic against durable imported bytes, and lets relative CSS/images resolve under the same controlled origin/path. Raw `page.setContent(...)` was not recommended as the primary strategy because imported-site screenshots, layout, and computed styles depend on asset-relative behavior.
Phase 8B-12K-F6.5 — Production Capture Execution Path Audit is COMPLETE.
Phase 8B-12K-F6.5 creates `docs/architecture/PRODUCTION_CAPTURE_EXECUTION_PATH_AUDIT.md` and distinguishes fresh production URL import from existing-siteVersion/admin retry capture. Fresh URL import sends the public `http(s)` URL (`entryFetchUrlUsed ?? normalizedHref`) to the remote worker, so a raw artifact source-serving endpoint is not required as the next gate for that intended production path. Existing-siteVersion retry still materializes durable raw artifact HTML to caller-local temp storage and sends a `file://` URL to the remote worker, so worker-accessible source delivery remains a real requirement for that separate retroactive recapture lane.
Phase 8B-12K-F6.5 decision: do not implement F7 source-serving endpoint as the immediate next step. Recommended next phase is a fresh production import capture verification after worker readiness, then reassess from the intended production path.
Phase 8B-12K-F7 — Fresh Production Import Capture Verification is COMPLETE with a worker capture timeout FAIL classification.
Phase 8B-12K-F7 creates `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md` and runs one fresh scoped URL import for `https://www.odv-cvijanovic.si/?gnr8_f7=20260617`, producing new `siteVersionId = 30100643-0517-4dff-9051-769e20658b25` and runtime `siteId = site_1f154c85c4b150f5f4b0`. Target reachability passed (`200 OK`, `text/html; charset=UTF-8`, `29849` bytes). Worker readiness passed (`ok = true`, `enabled = true`, `configured = true`, `healthStatus = ready`, `healthHttpStatus = 200`), and route preflight confirmed both deployed capture paths return `405` to `HEAD` with `x-matched-path`.
Phase 8B-12K-F7 proves the intended fresh import source contract: the worker request was built and sent with `sourceUrl = https://www.odv-cvijanovic.si/?gnr8_f7=20260617`, classified as public `https`, not `file://`. The existing-siteVersion retry path was not used.
Phase 8B-12K-F7 did not receive a worker capture response. The capture POST timed out after `1000ms`, diagnostics included `CAPTURE_WORKER_REQUEST_STARTED`, `CAPTURE_WORKER_REQUEST_BUILT`, `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, `CAPTURE_WORKER_HTTP_ERROR`, `CAPTURE_WORKER_REQUEST_FAILED`, `CAPTURE_WORKER_UNAVAILABLE`, and `CAPTURE_WORKER_HEALTH_UNAVAILABLE`; no `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_RESPONSE_PARSED`, `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_STARTED`, or `NAVIGATION_SUCCEEDED` diagnostic was present.
Phase 8B-12K-F7 capture result: `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, screenshots `0`, computed style samples `0`, rendered documents `0`, layout geometry `0`, section evidence `0`, navigation evidence `0`. A baseline-shaped `evidenceCaptureBaselineArtifact` exists, but it has no usable rendered evidence or capture expansion evidence. Classification: primary B. worker not reached, subtype capture POST timed out before worker response; secondary H. capture expansion evidence missing.
Phase 8B-12K-F8 — Fresh Import Worker Capture Timeout Diagnosis is COMPLETE.
Phase 8B-12K-F8 updates `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`, `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`, `docs/ai/GNR8_CURRENT_STATE.md`, and `docs/ai/GNR8_THREAD_HANDOFF.md` with diagnostics only. No importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, import retry, capture retry, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, or migration was changed or created.
Phase 8B-12K-F8 found the effective F7 capture POST timeout was the rendered-capture worker HTTP client config timeout, not the capture readiness policy and not the worker request/job budget. F7 persisted `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED.details.timeoutMs = 1000`, `CAPTURE_WORKER_REQUEST_STARTED.details.timeoutMs = 1000`, and `CAPTURE_WORKER_HTTP_ERROR.details.timeoutMs = 1000`, while the capture job `timeoutBudgetMs`, request payload `capture.timeoutBudgetMs`, and request readiness `maxTotalCaptureMs` all remained `30000`.
Phase 8B-12K-F8 found `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` is wired into `worker-client.ts` and was not ignored. The F7 script itself did not pass a short timeout; the local production-env execution context inherited or injected `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=1000`. Platform production would use `30000ms` if its env is set to `30000`; if absent, the worker client default is `35000ms`.
Phase 8B-12K-F8 worker receipt result: client request sent yes; client response received no; worker request received unknown; worker execution started unknown; worker browser launched unknown. Vercel logs were not accessible from this workspace because no `vercel` CLI was on PATH and no `.vercel` project metadata existed in checked workspace roots.
Phase 8B-12K-F8 classification: primary D. local smoke runner override, specifically local execution env/config inheritance of `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=1000`. Not A, B, C, E, or F as the primary timeout cause.
Phase 8B-12K-F9 — Fresh Production Import Capture Retry With 30s Worker Timeout is COMPLETE with a capture-expansion evidence FAIL classification.
Phase 8B-12K-F9 ran one fresh production import for `https://www.odv-cvijanovic.si/?gnr8_f9=20260617` with `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000` explicitly set. Required env was confirmed without printing the token: `DATABASE_URL` present, worker enabled `true`, worker base URL `https://gnr8-worker.vercel.app`, worker shared token present, and worker timeout `30000`.
Phase 8B-12K-F9 preflight passed: effective worker client timeout `30000ms`, worker readiness ready (`healthHttpStatus = 200`), deployed capture routes present via `HEAD` returning `405` with `x-matched-path`, target URL reachable (`200 OK`, `text/html; charset=UTF-8`, `29849` bytes), and the worker source URL was public `https`, not `file://`.
Phase 8B-12K-F9 created `siteVersionId = 9c1fdafd-ff1a-4d85-8559-5860d5775c1f`, runtime `siteId = site_bfabe23af164fb00b3ab`, runtime artifact `f6cecf7a-fe52-461c-a3d0-0bd2a485f33f`, and raw import artifact `61f44492-828a-4566-8ec9-c00e3b621f2d`. The existing-siteVersion retry path was not used. CMS slot inference ran, but persisted CMS slot count was `0` to honor the phase boundary.
Phase 8B-12K-F9 worker request succeeded: `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED` returned HTTP `200 OK` in `15373ms`; diagnostics included `CAPTURE_WORKER_RESPONSE_PARSED`, `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_SUCCEEDED`, `DOM_SERIALIZATION_SUCCEEDED`, `SCREENSHOT_CAPTURE_SUCCEEDED`, `STYLE_SAMPLING_SUCCEEDED`, and `CAPTURE_WORKER_RENDERED_DOM_USED`.
Phase 8B-12K-F9 capture result: `renderedCaptureStatus = available`, `renderedDomQuality = strong`, `sourceMode = rendered_dom`, `importFidelityStatus = high_fidelity_import`, screenshots `2`, computed style samples `6`, rendered DOM node count `311`, raw imported files persisted `397`, external asset fallbacks `0`, and `evidenceCaptureBaselineArtifact` exists with `artifactStatus = baseline_partial`.
Phase 8B-12K-F9 evidence result: layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`. Classification: FAIL, primary H. capture expansion evidence missing. F9 is not A target unreachable, B worker not reached, C worker auth failed, D worker/browser failed, E navigation failed, F invalid output, G baseline persistence failed, or I timeout after `30000ms`.
Phase 8B-12K-F10 - Capture Expansion Evidence Persistence Diagnosis is COMPLETE. F10 creates `docs/architecture/CAPTURE_EXPANSION_EVIDENCE_PERSISTENCE_DIAGNOSIS.md` and updates the F9 verification/current-state/handoff docs. Diagnostics only: no importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, import, recapture, Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, or migration was changed or created.
Phase 8B-12K-F10 inspected target `siteVersionId = 9c1fdafd-ff1a-4d85-8559-5860d5775c1f`. Persisted rendered capture data exists: rendered DOM path exists, computed styles path exists, acquisition evidence path exists, rendered-capture manifest path exists, and both screenshot paths exist. The rendered-capture manifest reports layout geometry captured true, region count `3`, viewport `1366 x 768`, and `layoutGeometryEvidence.length = 1`.
Phase 8B-12K-F10 found the Evidence Capture baseline does not carry that geometry: `captureEvidence.layoutGeometryPath` is absent, baseline `persistedRefs.layoutGeometryRef = null`, baseline layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
Phase 8B-12K-F10 builder path finding: `buildEvidenceCaptureBaselineArtifact(...)` calls `createLayoutGeometryEvidence(...)`, `createSectionBoundaryEvidence(...)`, and `createNavigationEvidence(...)`, but fresh import baseline attachment passes `renderedHtml: undefined` and no `layoutGeometryEvidence`. `artifactStatus = baseline_partial` does not block expansion.
Phase 8B-12K-F10 root cause classification: primary E. persistence mapping missing. Worker capture and rendered-capture manifest persistence contain layout geometry, but the fresh import baseline/provenance mapping does not carry rendered HTML, `snapshot.renderedCapture.layoutGeometryEvidence`, or the `rendered/layout-geometry.json` path into the Evidence Capture baseline.
Phase 8B-12K-F11 - Fresh Import Baseline Capture Expansion Wiring is COMPLETE. F11 changed only fresh import Evidence Capture baseline persistence/wiring. `buildImportProvenanceSummary(...)` now persists the existing `rendered/layout-geometry.json` ref into `captureEvidence.layoutGeometryPath`; `runScopedImportPipeline(...)` reads already-persisted rendered DOM HTML from `captureEvidence.renderedDomPath`; and the scoped pipeline passes that rendered HTML plus `snapshot.renderedCapture.layoutGeometryEvidence` into `attachEvidenceCaptureBaselineArtifact(...)`.
Phase 8B-12K-F11 allows existing deterministic baseline builders to materialize layout geometry, section boundary evidence, and navigation evidence when captured rendered DOM and geometry are available. Missing rendered HTML or geometry keeps the baseline partial and records missing-input diagnostics. Added diagnostics include `EVIDENCE_CAPTURE_BASELINE_INPUTS_READY`, `EVIDENCE_CAPTURE_BASELINE_EXPANSION_MATERIALIZED`, persisted import diagnostic codes for provided/missing inputs and materialized/missing evidence, and write-path provenance summary expansion counts.
Phase 8B-12K-F11 focused validation passed for the fresh scoped pipeline baseline wiring and missing-rendered-HTML partial baseline case. F11 did not rerun fresh production import, Limited Dry Run, FirstLimitedDryRun output creation, reconstruction, AI, React/block generation, publishing, migrations, schema changes, or worker/browser capture behavior changes.
Phase 8B-12K-F12 - Fresh Production Import Capture Verification Retry is COMPLETE with PASS classification. F12 ran one valid fresh production import for `https://www.odv-cvijanovic.si/?gnr8_f12=20260617` through the normal fresh path (`preallocateSiteVersionIdentity(...)`, `importPublicSinglePageUrlToSnapshot(...)`, and `runScopedImportPipeline(...)`), not the existing-siteVersion retry path. Required env was confirmed without printing the token: `DATABASE_URL` present, worker enabled `true`, worker base URL `https://gnr8-worker.vercel.app`, worker shared token present, and timeout `30000`.
Phase 8B-12K-F12 preflight passed: worker client timeout `30000ms`, worker health ready with HTTP `200`, deployed capture routes returned `405` with `x-matched-path`, target URL returned `200 OK`, `text/html; charset=UTF-8`, `29849` bytes, and worker source URL was public `https`, not `file://`.
Phase 8B-12K-F12 created `siteVersionId = 09dce7ea-d860-4f60-a1eb-26c3335b302e`, runtime `siteId = site_135623aa7648136dba36`, runtime artifact `fdcdb547-6fc6-4542-822d-1f4264812265`, and raw import artifact `4d046e09-ec56-4a17-830b-1539526636e4`. Worker request returned HTTP `200 OK` in `15048ms`; capture result was `renderedCaptureStatus = available`, `renderedDomQuality = strong`, `sourceMode = rendered_dom`, `importFidelityStatus = high_fidelity_import`, screenshots `2`, computed style samples `6`, rendered DOM length `40043`, and rendered DOM node count `292`.
Phase 8B-12K-F12 verified the F11 persistence wiring fix on the normal fresh production import path: `evidenceCaptureBaselineArtifact` exists with `artifactStatus = baseline_partial`; `captureEvidence.renderedDomPath` exists; `captureEvidence.layoutGeometryPath` exists; layout geometry evidence count `1`, layout geometry region count `3`, section evidence count `2`, navigation evidence count `1`, and navigation item count `6`. Persisted materialization diagnostics include `RENDERED_DOM_HTML_BASELINE_INPUT_PROVIDED`, `LAYOUT_GEOMETRY_BASELINE_INPUT_PROVIDED`, `LAYOUT_GEOMETRY_PATH_PERSISTED`, `LAYOUT_GEOMETRY_EVIDENCE_MATERIALIZED`, `SECTION_BOUNDARY_EVIDENCE_MATERIALIZED`, and `NAVIGATION_EVIDENCE_MATERIALIZED`.
Phase 8B-12K-F12 did not run Limited Dry Run, create FirstLimitedDryRun outputs, run reconstruction, add AI, generate React/GNR8 blocks, publish, mutate CMS bindings, create migrations, or modify code/schema/importer/preview/dry-run/reconstruction/AI/publishing/worker behavior. CMS slot inference ran, but persisted CMS slot count was `0` via no-op `upsertContentSlots`.
Phase 8B-12K-F13 - Evidence Capture Readiness Re-Assessment is COMPLETE. F13 was audit, scoring, and documentation only. It did not run import or capture retry, Limited Dry Run, create FirstLimitedDryRun outputs, run reconstruction, add AI, generate React/GNR8 blocks, create CMS bindings, publish, or create migrations/schema changes.
Phase 8B-12K-F13 updates conceptual readiness from `86/100` to `90/100` and execution readiness from `77/100` to `84/100`. F12 moved the system back into readiness for the existing bounded Limited Dry Run Route, Navigation, and Section chain because the fresh production site version now has persisted rendered DOM, layout geometry, section evidence, and navigation evidence. Computed styles and baseline persistence remain partial; content remains risky; block and design-token models remain not ready; candidate discovery/review execution remains missing.
Phase 8B-12L - Limited Dry Run Real-Site Retry On Fresh Captured SiteVersion is COMPLETE with PASS classification. Preflight reconfirmed the F12 baseline, rendered DOM and layout geometry paths/files, layout evidence `1`, section evidence `2`, and navigation evidence `1` with `6` items. No ReconstructionDryRunPackage was persisted; the existing contract helper produced a valid blocked package from transient metadata-only input without executing candidate discovery or review.
Phase 8B-12L used the existing First Limited Dry Run builder, validator, output persistence, latest-output loader, and read-only projection. Persisted artifact `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` has `outputStatus = valid`, Route/Navigation/Section counts `1 / 1 / 2`, limitations/blockers `0 / 0`, and valid readback/projection. Forbidden-field scanning found no React, GNR8 blocks, CMS bindings, content model, design token model, publishing artifacts, or generated output containers. No application code, schema, importer, capture, worker, preview, reconstruction, candidate, AI, generation, or publishing behavior changed.
Phase 8B-12M - Limited Dry Run Result Re-Assessment / Package Preparation Boundary is COMPLETE. This phase was audit, scoring, package-boundary decision, and documentation only. It created no import, capture, dry-run output, candidate/review artifact, reconstruction output, generated React/GNR8 block, CMS binding, publishing artifact, migration, worker job, or behavior change.
Phase 8B-12M updates conceptual readiness from `90/100` to `92/100` and execution readiness from `84/100` to `88/100`. 8B-12L proves the existing bounded Route, Navigation, and Section chain works end to end on one simple real site, including validation, persistence, readback, and read-only projection. It does not prove cross-site generalization, runtime mutation support, reconstruction-grade evidence, candidate discovery/review execution, a durable ready package lifecycle, reconstruction, AI, generation, or publishing.
Phase 8B-12N - Second Real-Site Limited Dry Run Validation is COMPLETE with PASS classification. ViroiDoc was selected from existing production record `e9257245-0256-4291-9989-66a33ee6741e` because it is a public research-project presentation site with visible navigation and no login or ecommerce gate. Its old capture lacked expansion evidence, so the already proven production path created fresh `siteVersionId = e26b0754-988b-45b9-9e24-8e213179b6cf` with rendered capture available and persisted rendered DOM, layout geometry `1` with `4` regions, section evidence `3`, and navigation evidence `1` with `29` items.
Phase 8B-12N used the existing metadata-only package helper, First Limited Dry Run builder/validator, persistence/readback, and read-only projection only. Authoritative latest artifact `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc` has `outputStatus = valid`, Route/Navigation/Section counts `1 / 1 / 3`, limitations/blockers `18 / 0`, no validation errors or warnings, exact semantic readback, and a present/valid projection with route, navigation, and section labels visible and no controls.
Phase 8B-12N proves the unchanged bounded chain works on two distinct public real sites. It does not prove reconstruction-grade evidence or authorize candidate discovery/review, package formalization, runtime mutation capture, reconstruction, AI, React/GNR8 generation, CMS binding, publishing, migrations, or new behavior.
Phase 8C-0 - Candidate Discovery Foundation Design is COMPLETE.
Phase 8C-0 creates `docs/architecture/CANDIDATE_DISCOVERY_FOUNDATION.md` and defines Candidate Discovery as the deterministic, non-executable interpretation layer from a valid `FirstLimitedDryRunOutput` plus its existing Evidence Capture lineage into evidence-backed candidates for future human review.
Phase 8C-0 proposes `CandidateDiscoveryResult`, `Candidate`, `CandidateEvidenceRef`, `CandidateLimitation`, `CandidateConfidence`, and `CandidateType`; defines allowed inputs, eligibility, confidence, traceability, limitation propagation, deterministic identity/order rules, and the Candidate Discovery -> Candidate Review -> Reconstruction Planning boundary.
Phase 8C-0 considered later specialized families, but Phase 8C-1 explicitly defers them. The canonical initial set is route, navigation, and section only because those map directly to the three validated `FirstLimitedDryRunOutput` model families without new semantic inference.
Phase 8C-0 refines the older Phase 7F-12 metadata-only candidate discovery envelope rather than creating a parallel source of truth. No contract code, candidate execution, candidate review execution, reconstruction planning/execution, AI, React/block generation, CMS binding, publishing artifact, persistence behavior, database schema, migration, or importer/Evidence Capture/worker/preview/Limited Dry Run behavior was created or changed.
The next safe phase is Phase 8C-1 - Candidate Discovery Contract, limited to formal TypeScript shapes and validation rules with no discovery execution or persistence.
Phase 8C-1 - Candidate Discovery Contract is COMPLETE. The canonical contract is `apps/platform/gnr8/architecture/candidate-discovery-contract.ts`, with `CandidateDiscoveryResult`, `Candidate`, `CandidateEvidenceRef`, `CandidateLimitation`, `CandidateConfidence`, `CandidateType`, `CandidateStatus`, and `CandidateDiscoveryValidationResult`.
Initial candidate types are limited to `route`, `navigation`, and `section`; candidate statuses are limited to `discovered`, `valid`, `invalid`, and `blocked`. Validation requires deterministic identifiers, Evidence Capture refs and Limited Dry Run refs, verifies count/type summaries, and recursively rejects generated, reconstruction, and publishing fields. The empty builder copies IDs and creates no candidates.
No discovery or review execution, candidate generation, reconstruction, AI, React/block generation, CMS binding, persistence behavior, publishing behavior, schema change, or migration was added.
Phase 8C-2 - Candidate Discovery Builder Design is COMPLETE. `docs/architecture/CANDIDATE_DISCOVERY_BUILDER_DESIGN.md` defines exact one-to-one mapping from valid Limited Dry Run route, navigation, and section models into the existing `CandidateDiscoveryResult` contract.
Phase 8C-2 defines readable source-derived candidate IDs with deterministic escaping, direct Evidence Capture and Limited Dry Run refs, evidence-quality confidence assignment, blocker suppression, lossless dry-run and Evidence Capture limitation propagation, route/type ordering, result identity and assembly, type counts in deterministic diagnostics, and an illustrative one-route, one-navigation, two-section result.
Phase 8C-3 - Candidate Discovery Builder Implementation is COMPLETE. `apps/platform/gnr8/architecture/candidate-discovery-builder.ts` implements the pure deterministic `buildCandidateDiscoveryResult(...)` mapping for route, navigation, and generic section candidates only.
Phase 8C-3 validates the Limited Dry Run input and assembled Candidate Discovery result; preserves Evidence Capture and dry-run refs; uses stable percent-escaped source identities and canonical route/type order; derives confidence only from source evidence quality with warning caps; preserves a lossless master limitation ledger; and suppresses blockers, unresolved evidence, out-of-scope models, and duplicate identity collision sets.
Focused contract/builder tests pass. No persistence, Candidate Review, reconstruction, AI, React/block generation, CMS binding, publishing, schema, migration, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior was added or changed. Specialized hero, footer, gallery, form, content-area, and other candidate types remain deferred.
Phase 8C-4 - Candidate Discovery Builder Validation On Known Fixtures is COMPLETE. Deterministic ODV-shaped and ViroiDoc-shaped fixtures validate the two proven Limited Dry Run count profiles without real-site execution: ODV produces `1 / 1 / 2` route/navigation/section candidates, `4` total candidates, `0` limitations, and `0` blockers; ViroiDoc produces `1 / 1 / 3`, `5` total candidates, preserves all `18` limitations, propagates applicable warnings, caps affected `HIGH` confidence at `MEDIUM`, and retains `0` blockers.
Phase 8C-4 also validates one candidate for a broad 29-item navigation model, deterministic duplicate section identity omission with one blocker diagnostic, and a contract-valid blocked empty result when required evidence refs are missing. Stable IDs and forbidden-field absence pass. The full focused contract, builder, and fixture suite passes `18 / 18`; no deterministic builder defect was found.
No persistence, Candidate Review, reconstruction, AI, React/block generation, CMS binding, publishing, schema, migration, importer, Evidence Capture, worker, preview, Limited Dry Run behavior, or real-site execution was added or changed.
Phase 8C-5 - Candidate Discovery Real-Site Dry-Run Artifact Validation is COMPLETE with PASS classification. Existing read helpers loaded authoritative artifacts `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` for ODV and `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc` for ViroiDoc; `buildCandidateDiscoveryResult(...)` ran in memory only.
ODV produces `4` candidates with `1 / 1 / 2` route/navigation/section counts, `0` limitations, and `0` blockers. ViroiDoc produces `5` candidates with `1 / 1 / 3` counts, preserves all `18` source limitations, and has `0` blockers. Both results validate with no errors or warnings and contain no forbidden generated fields.
The initial real-artifact run found one deterministic fixture gap: persisted navigation models carry compact `layout-region-*` and `section-boundary-*` Evidence Capture refs, which the builder registry did not classify. The bounded builder fix recognizes those established ref families; its focused regression plus the contract/builder/fixture suite passes `19 / 19`. Final real behavior matches 8C-4 count, limitation, blocker, validation, and forbidden-field expectations.
No Candidate Discovery result, review package, reconstruction output, generated output, CMS binding, publishing artifact, or migration was created. No persistence, Candidate Review, reconstruction, AI, generation, publishing, schema, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior changed.
Phase 8C-6 - Candidate Discovery Persistence Boundary Design is COMPLETE. `docs/architecture/CANDIDATE_DISCOVERY_PERSISTENCE_BOUNDARY.md` recommends persisting future validated results as immutable `candidate_discovery_result` records in the existing site-version import-provenance boundary, with no new table.
The design defines durable review/audit/comparison purposes; an append-only artifact history and latest pointer; required lineage, count, validation, limitation, blocker, timestamp, builder-version, and contract-version metadata; `persistCandidateDiscoveryResult(...)`, `loadLatestCandidateDiscoveryResult(...)`, and `loadCandidateDiscoveryResultById(...)` helper boundaries; semantic-result idempotency; read-only safety; and fail-closed behavior.
Phase 8C-6 is documentation only. No persistence, artifact, provenance field, code, schema, migration, runtime behavior, Candidate Review, reconstruction, AI, React/block generation, CMS binding, publishing, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior was created or changed.
Phase 8C-7 - Candidate Discovery Persistence Implementation is COMPLETE. `apps/platform/gnr8/architecture/candidate-discovery-persistence.ts` persists validated `candidate_discovery_result` records in the existing site-version import-provenance summary through `candidateDiscoveryResultArtifacts` and `latestCandidateDiscoveryResultArtifact`; no table or migration is added.
The helper surface is `persistCandidateDiscoveryResult(...)`, `loadLatestCandidateDiscoveryResult(...)`, and `loadCandidateDiscoveryResultById(...)`. Writes validate the result, recursive forbidden fields, exact site-version/dry-run lineage, and explicit builder/contract versions before persistence. Records retain artifact/result lineage, candidate count/types, validation status and diagnostics, limitation/blocker counts, versions, creation time, and persistence time. Reads return cloned full records scoped by site version.
Idempotency reuses the latest artifact for equivalent semantics under the same site version, dry run, builder version, and contract version; changed results append and advance the latest pointer. Focused contract, builder, and persistence tests pass `20 / 20`.
No Candidate Review, UI, reconstruction, AI, React/block generation, CMS binding, publishing artifact, schema, migration, worker job, or importer/Evidence Capture/preview/Limited Dry Run behavior was added or changed.
Phase 8C-8 - Candidate Discovery Read-Only Surface Design is COMPLETE. `docs/architecture/CANDIDATE_DISCOVERY_SURFACE_DESIGN.md` recommends a dedicated admin Candidate Discovery page for inspecting persisted `candidate_discovery_result` artifacts without placing discovery inside Site Workspace, the First Limited Dry Run page, or a not-yet-implemented Candidate Review workflow.
The design defines Overview, Candidate Summary, and Candidate List sections; stable route-first, navigation-second, and sections-by-route grouping that preserves builder order; missing, invalid, blocked, no-candidate, limitation, and blocker states; and a defensive `CandidateDiscoverySurfaceProjection` containing artifact metadata, validation, counts, confidence distribution, grouped candidates, limitations, diagnostics, and empty state.
The surface is admin/superadmin-only and strictly read-only, with no approve/reject, review, reconstruction, AI, edit, publish, or trigger controls. Phase 8C-8 changes documentation only and adds no UI, API, Candidate Review package, reconstruction output, generated output, CMS binding, publishing artifact, schema, migration, or importer/Evidence Capture/worker/preview/Limited Dry Run/Candidate Discovery behavior.
Phase 8C-9 - Candidate Discovery Read-Only Surface Implementation is COMPLETE. `apps/platform/gnr8/architecture/candidate-discovery-surface-projection.ts` defensively projects the latest stored Candidate Discovery artifact, and `/gnr8/admin/candidate-discovery/[siteVersionId]` renders it behind the existing superadmin page guard.
The projection exposes artifact metadata, lineage, validation, candidate types, type and confidence counts, result-level limitation and blocker counts, diagnostics, and stable route/navigation/sections-by-route groups. It distinguishes missing, invalid, blocked, no-candidate, limited-candidate, blocker-candidate, and ready states without changing the stored result.
The page contains Overview, Candidate Summary, Candidate List, and Diagnostics sections. It renders candidate identity, type, status, confidence, route path, evidence refs, dry-run refs, limitations, and diagnostics. It has no buttons, forms, inputs, approval/rejection, review, reconstruction, AI, editing, trigger, or publishing controls.
Focused projection and page-source tests pass `11 / 11`. No importer, Evidence Capture, worker, preview, Limited Dry Run, Candidate Discovery builder/persistence, Candidate Review, reconstruction, AI, generation, publishing, database schema, or runtime behavior changed.
Phase 8C-10 - Candidate Discovery End-to-End Admin Verification is COMPLETE with a FAIL classification at the real-target persistence precondition. Read-only production verification confirmed that ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` both exist with `runtime_import_provenance_summary_v1`, but each has `0` persisted `candidate_discovery_result` artifacts and no latest Candidate Discovery pointer.
The canonical latest result loader returns `null` for both targets. The canonical surface loader correctly returns `validation.status = unavailable`, `emptyState = missing`, zero projected counts, and `CANDIDATE_DISCOVERY_RESULT_MISSING`; therefore the expected ODV `4` candidates and ViroiDoc `5` candidates plus its `18 / 0` limitations/blockers cannot be verified through persistence.
The projection/page implementation itself passes: focused Candidate Discovery tests pass `31 / 31`; page source contains Candidate Discovery, Route Candidates, Navigation Candidates, and Section Candidates By Route; forbidden buttons/forms/inputs/review/approve/reject/AI/reconstruction/publish controls are absent; and `pnpm run vercel-build` passes with existing unrelated warnings. No display defect was found and no application code or behavior changed.
Phase 8C-10F - Candidate Discovery Real-Target Persistence Completion is COMPLETE with PASS classification. Existing helpers loaded ODV `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` and ViroiDoc `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc`, rebuilt and validated the proven deterministic results, and persisted `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` for ODV and `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` for ViroiDoc.
Scoped latest-loader readback matches both returned artifact refs. ODV reloads with `4` candidates (`1 / 1 / 2` route/navigation/section), zero limitations, and zero blockers. ViroiDoc reloads with `5` candidates (`1 / 1 / 3`), `18` limitations, and zero blockers. Both records validate with no errors or warnings and contain no forbidden generated, reconstruction, or publishing fields.
Each target advanced from zero to one Candidate Discovery artifact. Comparing the complete provenance summaries before and after with only `candidateDiscoveryResultArtifacts` and `latestCandidateDiscoveryResultArtifact` removed proved that no Candidate Review, AI, reconstruction, generated output, publishing, or other provenance artifact changed. No code, schema, importer, Evidence Capture, Limited Dry Run, UI, worker, or runtime behavior changed. Phase 8C-10 was not rerun.
Phase 8C-10R - Candidate Discovery End-to-End Admin Verification Rerun is COMPLETE with PASS classification. The canonical latest loader and `CandidateDiscoverySurfaceProjection` load the exact persisted target artifacts. ODV projects `4` candidates (`1 / 1 / 2` route/navigation/section), `0 / 0` limitations/blockers, valid status, and `ready`. ViroiDoc projects `5` candidates (`1 / 1 / 3`), `18 / 0` limitations/blockers, valid status, and `candidates_with_limitations`; all 18 limitations are warnings. Both projections have no errors or warnings, group all sections under `/`, and have no unscoped sections.
Page source contains Candidate Discovery, Route Candidates, Navigation Candidates, and Section Candidates By Route and contains no buttons, forms, inputs, textareas, selects, review, approve, reject, AI, reconstruction, or publish controls. Focused tests pass `36 / 36`; `pnpm run vercel-build` passes with existing unrelated lint warnings and includes the dynamic Candidate Discovery route; and `git diff --check` passes. No read-only projection/display defect was found, and no application code or behavior changed.
Phase 8C-11 - Post-Discovery Boundary Reassessment is COMPLETE. The single selected next major architectural boundary is **Candidate Review Foundation**: persisted discovered candidates -> approved/rejected/deferred review state, with review model, persistence, lineage, actor/timestamp attribution, and auditability only. Candidate Review is the smallest boundary that converts validated evidence into explicit human intent without producing target structure or reconstruction output.
Reconstruction Package Foundation is deferred because it requires durable approved-candidate inputs. Structure Planning Foundation is deferred because discovery evidence is not yet accepted target intent and no canonical Structure Plan contract exists. The Phase 7F-13 review contract is conceptual scaffolding only and must be reconciled with the canonical 8C `CandidateDiscoveryResult` rather than becoming a parallel source of truth. Detailed assessment: `docs/architecture/POST_DISCOVERY_BOUNDARY_REASSESSMENT.md`.
Phase 8C-11 changed documentation only. It added no Candidate Review behavior or persistence, reconstruction, Structure Planning, AI, publishing, schema, worker, Evidence Capture, Limited Dry Run, Candidate Discovery behavior, UI, form, button, or control.
Phase 8D-0 - Candidate Review Foundation is COMPLETE. Candidate Review is defined as human governance, approval, auditability, and reconstruction preparation over an exact persisted Candidate Discovery artifact instance. It is not reconstruction, editing, generation, AI, or publishing.
The minimal decision model is exactly `approved | rejected | deferred`; unreviewed is the absence of a decision event. Review identity is the composite `(candidateDiscoveryArtifactId, candidateId)`, so approval never transfers silently to a later discovery artifact with the same deterministic candidate identity. Every immutable decision event requires its own ID, candidate and artifact IDs, `siteVersionId`, `dryRunId`, stable reviewer reference, decision, trusted timestamp, and an explicit superseded-decision reference when changing a decision.
The Phase 7F-13 model remains compatible as historical intent but is obsolete as the canonical operational shape. Its extra decisions collapse into deferred/rejected reasons, its package-level attribution is replaced by per-event attribution, and its old discovery/planning lineage requires future migration to canonical 8C artifact lineage. Detailed foundation: `docs/architecture/CANDIDATE_REVIEW_FOUNDATION.md`.
Phase 8D-0 changed documentation only. It added no Candidate Review implementation, persistence, UI, schema, worker, Candidate Discovery behavior, Evidence Capture behavior, Limited Dry Run behavior, reconstruction, AI, generation, or publishing.
Phase 8D-1 - Candidate Review Contract is COMPLETE. `apps/platform/gnr8/architecture/candidate-review-contract.ts` defines readonly immutable `CandidateReviewEvent` records, `CandidateReviewPackage`, `CandidateReviewLatestDecision`, and validation results. Decisions are exactly `approved`, `rejected`, and `deferred`; unreviewed remains the absence of an event.
Latest decisions are derived per `(candidateDiscoveryArtifactId, candidateId)`: valid explicit supersession determines chain heads, with `decidedAt` and then `reviewEventId` providing deterministic fallback ordering. Package validation checks required lineage, package/event consistency, supersession integrity, exact derived latest decisions, counts, and recursively forbidden generated, reconstruction, execution, and publishing fields. The empty-package helper creates a valid zero-count contract package.
Approval permits only future packaging or planning consideration and creates no execution authority or output. No persistence, UI, review execution, Candidate Discovery behavior/persistence/UI, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, schema, migration, or worker behavior was added or changed.
Phase 8D-2 - Candidate Review Persistence Boundary Design is COMPLETE. `docs/architecture/CANDIDATE_REVIEW_PERSISTENCE_BOUNDARY.md` recommends a dedicated Candidate Review artifact boundary: immutable `candidate_review_package` snapshots are stored in a review-owned sibling collection in the existing site-version provenance container, with an append-only history and latest pointer. Candidate Discovery artifacts are referenced but never mutated.
The artifact metadata includes `reviewPackageId`, `candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, reviewed/approved/rejected/deferred counts, `createdAt`, `persistedAt`, and `contractVersion`. Exact semantic retries reuse the latest artifact; new event history appends and advances the pointer; equal latest decisions with different history still append; rewritten history, stale supersession, and competing heads fail closed.
The design preserves immutable review events and package snapshots, explicit supersession, reviewer attribution, event/package/persistence timestamps, exact Discovery lineage, reproducible latest decisions, and conflict visibility. Provider approval patterns contribute identity, attribution, timestamps, scoped reads, idempotency, and fail-closed diagnostics, but their mutable transitions, DB tables, execution authority, and lifecycle vocabulary are not reused as Candidate Review persistence.
Phase 8D-2 changed documentation only. It added no persistence, provenance field, UI, review execution, schema, migration, worker, Candidate Discovery behavior/persistence/UI, Candidate Review contract change, Evidence Capture, Limited Dry Run, reconstruction, AI, or publishing behavior.
Phase 8D-3 - Candidate Review Persistence Implementation is COMPLETE. `apps/platform/gnr8/architecture/candidate-review-persistence.ts` persists validated `candidate_review_package` snapshots in `candidateReviewPackageArtifacts` under the existing site-version import-provenance boundary and maintains `latestCandidateReviewPackageArtifact`. It exposes persist, latest-load, and by-ID-load helpers and returns cloned full artifact records on reads.
Before write, the helper runs `validateCandidateReviewPackage(...)`, rejects forbidden generated/execution/publishing content, validates canonical package identity and exact site-version/dry-run/Discovery-artifact lineage, confirms every reviewed candidate exists in the persisted Discovery artifact, and preserves validation plus package/event diagnostics. Exact semantic retries reuse the latest artifact; changed valid event history appends and advances the pointer; omitted, rewritten, reordered, non-extending, stale, or branching history fails explicitly.
Phase 8D-3 added no UI, review execution, Candidate Discovery behavior/persistence/UI, Evidence Capture, Limited Dry Run, reconstruction, generated output, AI, publishing, schema, migration, or worker behavior.
Phase 8D-4 - Candidate Review Read-Only Surface Design is COMPLETE. `docs/architecture/CANDIDATE_REVIEW_SURFACE_DESIGN.md` recommends a dedicated admin Candidate Review page for inspecting persisted `candidate_review_package` artifacts and their exact linked Candidate Discovery artifacts.
The design defines Overview, Candidate Decision Summary, Latest Decisions, Review Event History, Candidate Context, and Diagnostics sections. It groups candidates by approved, rejected, deferred, and unreviewed while preserving route, navigation, and sections-by-route Discovery grouping and stable source order.
The defensive `CandidateReviewSurfaceProjection` includes artifact metadata, package validation, linked Discovery summary and staleness, decision/event counts, grouped latest decisions, unreviewed candidates, complete immutable event history, empty/attention state, and separated diagnostics. Missing, empty, invalid, all-unreviewed, stale, and superseded-event states are defined.
The surface is admin/superadmin-only and strictly read-only, with no approve/reject/defer, edit, AI, reconstruction, publishing, or trigger controls. Phase 8D-4 changes documentation only and adds no UI, API route, review event/package append, Candidate Discovery or Candidate Review behavior/persistence change, Evidence Capture, Limited Dry Run, reconstruction, generated output, AI, publishing, schema, migration, or worker behavior.
Phase 8D-5 - Candidate Review Read-Only Surface Implementation is COMPLETE. `apps/platform/gnr8/architecture/candidate-review-surface-projection.ts` adds the defensive `CandidateReviewSurfaceProjection`, and `/gnr8/admin/candidate-review/[siteVersionId]` provides the dedicated guarded read-only admin page.
The projection validates the persisted review envelope and package, resolves the exact linked Candidate Discovery artifact, derives latest decisions and immutable supersession history, reports lineage/counts/staleness/diagnostics, and groups approved, rejected, deferred, and unreviewed candidates while preserving route, navigation, and sections-by-route Discovery order. Missing, empty, invalid, all-unreviewed, stale, and superseded-history states are explicit.
The page contains Overview, Decision Summary, Latest Decisions, Event History, Candidate Context, and Diagnostics. It adds no buttons, forms, inputs, review actions, edit controls, AI controls, reconstruction controls, publishing controls, or trigger controls. Focused source/projection tests pass `10 / 10`.
Phase 8D-5 changes no Candidate Discovery behavior/persistence/UI, Candidate Review contract or persistence behavior, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, schema, migrations, or workers.
Phase 8D-6 - Candidate Review End-to-End Admin Verification is COMPLETE with a MISSING-STATE PASS classification. Read-only production verification found no persisted `candidate_review_package` for ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` or ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`; the canonical latest loader returns `null` for both.
Both surface projections correctly return `validation.status = unavailable`, state `missing`, zero counts/groups/history, and `CANDIDATE_REVIEW_PACKAGE_MISSING`. The page source contains Candidate Review, Overview, Decision Summary, Latest Decisions, Event History, Candidate Context, and the missing-package message, with no buttons, forms, inputs, review actions, AI, reconstruction, publishing, or trigger controls. Focused tests pass `27 / 27`; the platform production build passes with existing unrelated lint warnings; no read-only display defect was found and no application behavior changed. Present-artifact metadata, decisions, history, and grouping remain unverified until packages exist. Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`.
Phase 8D-6F - Candidate Review Real-Target Package Persistence Completion is COMPLETE. The existing Candidate Review contract and persistence helpers created and persisted valid empty packages for ODV and ViroiDoc against their exact latest Candidate Discovery artifacts. ODV reloaded as `candidate_review_package_6bc93e296baa55f876ea0d9d6ce27520`; ViroiDoc reloaded as `candidate_review_package_c20e6b0ef6647a885ad577455d219f2f`.
Both canonical reloads have valid package/persistence validation, zero reviewed/approved/rejected/deferred counts, and empty `latestDecisions` and `reviewEvents`. No review decisions were created. Stable before/after provenance comparison confirms every non-Candidate-Review field remained unchanged, including Candidate Discovery, AI, reconstruction, publishing, generated, and execution artifact state. No code, schema, UI, helper, worker, or behavior changed. Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`.
Phase 8D-6R - Candidate Review Present-Artifact Read-Only Admin Verification is COMPLETE. The canonical latest loader returned the exact persisted ODV and ViroiDoc artifacts; both projections are `ready` and `valid`. ODV projects `4` candidates and ViroiDoc projects `5`, all unreviewed, with zero reviewed/approved/rejected/deferred counts, empty latest decisions and review history, and both `empty_review_package` and `all_candidates_unreviewed` states.
The page render contract contains Candidate Review, Overview, Decision Summary, Latest Decisions, Event History, and Candidate Context, including the all-unreviewed and empty-review states. It contains no button, form, input, review action, AI, reconstruction, or publishing control. No projection/display defect was found and no application code changed. An unauthenticated production URL check confirmed the admin guard and reached Login; the deployed authenticated page was not visually observed because no superadmin browser session was available. Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`.
Phase 8D-7 - Post-Review Boundary Reassessment is COMPLETE. The single selected next major Review Track boundary is **Candidate Review Actions Foundation**: authenticated `approved | rejected | deferred` decision creation, append-only immutable review events, latest-decision derivation, immutable audit history, idempotency, and stale/conflicting-write handling over the existing Candidate Review contract and persistence boundary. It creates no reconstruction or planning output.
Reconstruction Package Foundation is deferred because both proven real targets still have zero approved candidates and the Phase 7F package scaffolding does not use canonical 8D artifact-instance lineage. A package can safely exist before decisions only as abstract or non-authorizing empty/draft scaffolding, not as a meaningful operational reviewed handoff. Structure Planning Foundation is deferred because planning from unreviewed discovery would turn observation into target intent without human approval; a generic schema could be discussed, but no operational plan is safe or valuable before approved candidates and a canonical reviewed handoff exist. Detailed assessment: `docs/architecture/POST_REVIEW_BOUNDARY_REASSESSMENT.md`.
Phase 8D-7 changed documentation only. It added no review actions, Candidate Discovery behavior/persistence/UI, Candidate Review contract/persistence/UI behavior, Evidence Capture, Limited Dry Run, reconstruction, Structure Planning, AI, publishing, schema, migration, or worker behavior.
Phase 8D-8 - Candidate Review Actions Foundation is COMPLETE. `docs/architecture/CANDIDATE_REVIEW_ACTIONS_FOUNDATION.md` defines the exact human decision path as one authenticated superadmin action for one exact `(candidateDiscoveryArtifactId, candidateId)` instance, creating one immutable attributed `CandidateReviewEvent`, deriving latest decisions and counts, and appending one validated immutable `candidate_review_package` snapshot.
The minimal action set is exactly `approve | reject | defer`, mapped to the existing `approved | rejected | deferred` decisions. Deferred is an explicit non-authorizing decision; unreviewed remains absence of an event. Decision changes create an event that explicitly supersedes the current head, with stale expected-package or expected-head submissions rejected and identical action retries idempotently returning the existing result.
Single-candidate action is canonical. A future batch may only orchestrate independent single-candidate commands with per-item events, validation, idempotency, conflicts, and outcomes. Provider approvals contribute actor resolution, trusted timestamps, stable identity, scoped authorization, idempotency, conflict handling, audit reads, and fail-closed practices, but their mutable lifecycle, tables, execution authority, and domain vocabulary are not reused.
Phase 8D-8 changed documentation only. It added no action contract code, endpoint, UI control, review event, package write, Candidate Discovery or Candidate Review behavior/persistence/UI change, Evidence Capture, Limited Dry Run, reconstruction, Structure Planning, AI, publishing, schema, migration, or worker behavior.
Phase 8D-9 - Candidate Review Action Contract is COMPLETE. `apps/platform/gnr8/architecture/candidate-review-action-contract.ts` defines the canonical `approve | reject | defer` request, authenticated `superadmin` actor, exact candidate and package-artifact target, validation result, action result, and pure immutable event-creation helper. Actions map exactly to `approved | rejected | deferred`.
Validation rejects invalid actions and roles, missing or mismatched package/Discovery lineage, absent linked candidates, stale known package artifact refs, mismatched current heads, and recursively nested generated, execution, reconstruction, or publishing fields. Accepted results contain one immutable event with deterministic action identity and explicit current-head supersession; rejected results contain no event and explanatory diagnostics. The existing package is never mutated or persisted.
Phase 8D-9 added no API route, persistence mutation, UI action, Candidate Discovery behavior/persistence/UI change, Candidate Review persistence/UI change, Evidence Capture, Limited Dry Run, reconstruction, generated output, AI, publishing, schema, migration, or worker behavior.
Phase 8D-10 - Candidate Review Action Application Design is COMPLETE. `docs/architecture/CANDIDATE_REVIEW_ACTION_APPLICATION_DESIGN.md` defines one canonical application flow: validate the exact current Candidate Review Package and linked candidate, create one immutable event, append it to unchanged history, recompute latest decisions and counts, validate one new immutable package snapshot, and atomically compare, append, and advance the latest pointer.
The expected package artifact ID is the package-wide optimistic concurrency token. Stale packages and supersession mismatches fail explicitly without automatic rebasing; successful actions create strict one-event snapshot extensions. Deterministic `actionId`/event identity makes exact retries return the original event and resulting artifact while conflicting reuse is rejected. Actor, decision, rationale, timestamps, prior and superseded decisions, source/base/result lineage, and derived state remain reconstructable.
Phase 8D-10 changed documentation only. It added no application handler, endpoint, UI action, event or package write, Candidate Discovery or Candidate Review contract/persistence/UI change, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, schema, migration, or worker behavior.
Phase 8D-11 - Candidate Review Action Application Implementation is COMPLETE. `applyCandidateReviewAction(...)` validates one request against the authoritative latest Review Package artifact and linked Discovery result, derives the current candidate head, creates one immutable attributed event, appends it to unchanged history, recomputes latest decisions and counts, validates the complete new package, and persists one strict immutable snapshot.
Concurrency is package-wide and fail-closed: the request artifact must equal the supplied authoritative latest artifact, and persistence performs an atomic artifact-ID compare-and-set when appending and advancing the latest pointer. Stale writes fail without automatic rebasing. Exact `actionId` replay returns the original event, package snapshot, and artifact reference from immutable history; semantically conflicting reuse is rejected.
Focused Candidate Review action, contract, and persistence tests pass `29 / 29`. Phase 8D-11 added no UI control, API route, page action, reconstruction, AI, publishing, schema, migration, or worker behavior.
Phase 8D-12 - Candidate Review Action UI Design is COMPLETE. `docs/architecture/CANDIDATE_REVIEW_ACTION_UI_DESIGN.md` selects the existing Candidate Review admin page for future single-candidate Approve, Reject, and Defer controls. It defines an optional reviewer rationale with an explicit non-empty contract fallback, the exact action payload and lineage target, package-artifact optimistic concurrency, exact-replay and conflicting-ID behavior, canonical post-action refresh, preserved immutable history, and fail-closed stale-package handling without automatic rebase.
The smallest future implementation is superadmin-only, single-candidate, no batch, no tenant/customer access, and no reconstruction handoff. Phase 8D-12 changed documentation only and added no UI, API/server action, Candidate Discovery or Candidate Review behavior, action application, persistence, Evidence Capture, Limited Dry Run, reconstruction, AI, generated output, publishing, schema, migration, or worker behavior.
Phase 8D-13 - Candidate Review Action API/Server Action Design is COMPLETE. `docs/architecture/CANDIDATE_REVIEW_ACTION_API_DESIGN.md` selects one same-origin, superadmin-only Admin API JSON POST as the initial UI-to-application boundary, rather than a Next.js Server Action or dual transport. The strict client payload contains only `siteVersionId`, `candidateId`, `actionType`, optional `rationale`, `candidateDiscoveryArtifactId`, and the package-wide CAS token `candidateReviewPackageArtifactId`; `dryRunId`, actor context, trusted time, current supersession head, latest package, and linked Discovery result are server-resolved.
The server generates a deterministic action identity from the normalized intent, authenticated actor, and exact base artifact. First receipt uses server time; exact replay recovers the original immutable event time so the existing application helper returns the original event and artifact without another write. The design defines fail-closed validation, no stale-package auto-rebase, metadata-only success/error envelopes, the closed error-code set, same-origin/session constraints, forbidden fields, and focused future tests.
Phase 8D-13 changed documentation only and added no API route, Server Action, UI action, Candidate Discovery or Candidate Review behavior, action application, persistence, Evidence Capture, Limited Dry Run, reconstruction, AI, generated output, publishing, schema, migration, or worker behavior.
Phase 8D-14 - Candidate Review Action API Implementation is COMPLETE. `POST /api/gnr8/admin/candidate-review/actions` requires the existing authenticated superadmin guard, same-origin `application/json`, and an exact allowlisted intent payload. It rejects anonymous and non-superadmin access, unknown and forbidden fields, invalid actions, missing candidates, invalid lineage, stale package tokens, idempotency conflicts, validation failures, and persistence failures through the documented closed metadata-only error contract.
The route resolves actor identity and role, trusted request time, deterministic length-delimited SHA-256 action identity, dry-run identity, exact linked Candidate Discovery artifact, and authoritative latest Candidate Review Package on the server. It invokes only `applyCandidateReviewAction(...)`, preserves deterministic exact replay, persists one immutable package through the existing compare-and-set boundary, reloads canonical latest, and returns only the action/event identity, decision, resulting package artifact ID, counts, and diagnostics.
Focused route tests pass `12 / 12`. Phase 8D-14 adds no UI control or action, reconstruction, AI, generated output, publishing, schema, migration, tenant/customer access, or worker behavior.
Phase 8D-15 - Candidate Review Action UI Implementation is COMPLETE. The existing superadmin Candidate Review page now renders Approve, Reject, and Defer controls plus an optional rationale for every reviewed and unreviewed candidate. Each action posts exactly one candidate intent with the rendered Discovery and Review Package artifact identities to the existing 8D-14 endpoint.
Success shows metadata-only action/event/package state and refreshes the canonical server projection so the latest decision, counts, grouping, and immutable history reload. Stale-package responses show an explicit stale message and refresh latest without automatic rebase or resubmission. Other failures show metadata-only error state.
Focused UI and transport tests pass `10 / 10`; the platform Vercel build passes. No batch, tenant/customer, edit, AI, reconstruction, generated-output, publishing, schema, migration, or worker behavior was added.
Phase 8D-16 - Candidate Review Action End-to-End Verification is COMPLETE with PASS classification. The implemented Admin API path applied approve-route, defer-navigation, and reject-section actions to both real targets. ODV latest is `candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f`; ViroiDoc latest is `candidate_review_package_4e70cbc788098383b52de76249a5c412`.
Each action appended exactly one immutable event, created one distinct immutable package snapshot, advanced latest, preserved the previous package unchanged and loadable, and updated latest decisions and counts. Both final projections are valid and `ready`, with `1` approved, `1` rejected, and `1` deferred; ODV retains `1` unreviewed candidate and ViroiDoc retains `2`.
All six events contain actor, decision, rationale, trusted time, and correct null supersession because each candidate was initially unreviewed. Non-Review provenance remained unchanged; no reconstruction, AI, generated output, publishing, schema, migration, or worker-job state changed. Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ACTION_E2E_VERIFICATION.md`.
Phase 8D-17 - Candidate Review Operator UI Simplification is COMPLETE. The existing superadmin page now defaults to site version, review status, reviewed/total progress, four product-language summary cards, and Approved/Rejected/Deferred/Needs review candidate groups. Candidate cards use readable Route/Navigation/Section names and show route, confidence, current decision, reviewed rationale, optional rationale, and the unchanged single-candidate actions.
Artifact refs, raw candidate IDs, event IDs, validation internals, diagnostics, raw lineage, and supersession details remain available in collapsed `Technical details` disclosures. The six-field action payload, action API, persistence, contracts, success/stale/error refresh behavior, and superadmin-only boundary are unchanged. No AI, reconstruction, publishing, batch action, tenant/customer access, schema, discovery, or generated-output surface was added.
Focused operator UI and transport tests pass `10 / 10`; the platform Vercel build passes. Phase 8D-17 is presentation-only.
Phase 8D-19 - Candidate Context Visualization Foundation is COMPLETE. `docs/architecture/CANDIDATE_CONTEXT_VISUALIZATION_FOUNDATION.md` defines the minimum evidence a human operator needs before reviewing Route, Navigation, and Section candidates. It reuses exact-lineage full-page screenshots, rendered DOM, layout geometry, section/navigation evidence, computed-style samples, and Limited Dry Run models without changing their behavior.
The selected screenshot strategy is full-page screenshot plus highlighted region: Route uses the complete page without an artificial highlight, while Navigation and Section require geometry-backed highlights. Missing or ambiguous screenshot/model/geometry lineage fails closed as incomplete or unavailable. The future `CandidateContextProjection` is read-only, deterministic, metadata/ref based, non-authorizing, and separate from Candidate Discovery, review actions, persistence, and Reconstruction.
Phase 8D-19 changed documentation only. It added no implementation, UI or review behavior change, Evidence Capture or Limited Dry Run behavior, Candidate Discovery behavior/persistence/UI, Candidate Review persistence/action/API change, Reconstruction, AI, Publishing, schema, migration, or worker behavior.
Phase 8D-20 - Candidate Context Projection Design is COMPLETE. `docs/architecture/CANDIDATE_CONTEXT_PROJECTION_DESIGN.md` defines an exact-lineage, one-candidate `CandidateContextProjection` with deterministic `ready | incomplete | unavailable` states; lineage, screenshot, highlight, candidate/evidence summary, limitation, and diagnostic fields; and closed validation for Route, Navigation, and Section compatibility.
Route projects its exact full-page screenshot, route summary, confidence, and limitations without a highlight. Navigation projects the exact screenshot, one proven navigation geometry highlight, item count, ordered labels, confidence, and limitations. Section projects the exact screenshot, exact model geometry, deterministic structural label, route, confidence, and limitations.
The selected highlight model carries both resolved document coordinates and geometry evidence refs. The selected screenshot model carries both the direct persisted artifact path and evidence lineage ref. Missing screenshot or invalid lineage fails unavailable; missing, invalid, or ambiguous required geometry fails incomplete without guessing or fallback. The projection is read-only, non-authorizing, and separate from Review Actions and future Reconstruction.
Phase 8D-20 changed documentation only. It added no implementation, UI or review behavior change, Evidence Capture, Candidate Discovery, Candidate Review, Review Actions, Review API, Reconstruction, AI, Publishing, schema, migration, or worker behavior.
Phase 8D-21 - Candidate Context Projection Implementation is COMPLETE. `apps/platform/gnr8/architecture/candidate-context-projection.ts` implements a deterministic, one-candidate read model over the exact Candidate Discovery, Evidence Capture baseline, optional First Limited Dry Run, and site-version inputs. It performs no lookup, capture, persistence, or mutation.
Route projects the exact full-page screenshot, route summary, confidence, and limitations with no highlight. Navigation projects ordered labels/item count plus one exact ref-backed navigation geometry highlight. Section projects route and structural context plus one exact ref-backed section geometry highlight. Both highlight kinds carry renderable document coordinates and source geometry refs; screenshot context carries the direct artifact path, evidence ref, capture run, route, and available viewport metadata.
Missing or invalid screenshot/artifact lineage fails `unavailable`; missing, invalid, or ambiguous required Navigation/Section geometry fails `incomplete`; compatible complete evidence is `ready`. The pure validator checks required lineage, candidate/type compatibility, screenshot refs, required highlight bounds, state consistency, and recursively rejects generated, reconstruction, execution, and publishing fields. Focused tests pass `10 / 10`.
Phase 8D-21 adds no UI integration, screenshot/crop creation, Evidence Capture, Limited Dry Run, Candidate Discovery, Candidate Review persistence/action/API/UI behavior, Reconstruction, AI, Publishing, schema, migration, or worker change.
Phase 8D-22 - Candidate Context Projection Real-Artifact Validation is COMPLETE. The existing read-only projection was exercised against real ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` using their persisted Candidate Discovery, matching First Limited Dry Run, and Evidence Capture baseline artifacts.
ODV used Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` and capture run `phase-8b-12k-f12-1781722330653-af9ea5e2`; ViroiDoc used Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` and capture run `phase-8b-12n-1781765161217`. Each target produced a ready Route with exact full-page screenshot and no highlight, a ready Navigation with exact screenshot and geometry-backed highlight, and a ready selected Section with exact screenshot and geometry-backed highlight.
Combined projection quality is `ready = 6`, `incomplete = 0`, and `unavailable = 0`. All six pure validations pass with no projection diagnostics. ViroiDoc Route and Navigation each preserve 18 existing source Dry Run scope limitations; they are warnings rather than projection defects. No blocking projection defect was found, so no behavior changed.
Phase 8D-22 is validation and documentation only. It adds no UI integration, screenshot/crop generation, Review behavior, Evidence Capture, Limited Dry Run, Candidate Discovery, Candidate Review persistence/action/API behavior, Reconstruction, AI, Publishing, schema, migration, or worker change.
Phase 8D-23 - Candidate Context Review UI Integration Design is COMPLETE. `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_INTEGRATION_DESIGN.md` selects one collapsed-by-default inline `View context` panel inside each existing Candidate Review card. The panel keeps the readable candidate, exact visual evidence, and existing single-candidate actions in one flow while leaving Approve, Reject, Defer, rationale, concurrency, refresh, and all Review behavior unchanged.
The visual card reuses the exact full-page screenshot. Route deliberately has no highlight; Navigation and Section render the projection-supplied geometry as a non-interactive CSS overlay. It shows route, confidence, evidence summary, and limitations in operator language while keeping diagnostics and raw refs inside collapsed `Technical details`. Ready shows complete compatible context; incomplete shows available evidence plus a warning without guessing missing geometry; unavailable shows an evidence warning and recommends Defer without selecting or enforcing it.
The first implementation scope is read-only integration on the existing superadmin page, with no crops, no new screenshots, no evidence fallback, no new endpoint or persistence, and no action behavior change. AI, Reconstruction, Publishing, editing, generated output, capture controls, and batch actions remain forbidden.
Phase 8D-23 changes documentation only. It adds no UI implementation, Candidate Context Projection behavior, Candidate Review behavior, Review Action/API behavior, Evidence Capture, Candidate Discovery, Reconstruction, AI, Publishing, schema, migration, or worker change.
Phase 8D-24 - Candidate Context Review UI Integration Implementation is COMPLETE. The existing Candidate Review page now loads one existing `CandidateContextProjection` per displayed candidate from the Review package's exact linked Candidate Discovery artifact, matching First Limited Dry Run output, and existing Evidence Capture baseline. It creates no new persistence or endpoint.
Each candidate card has a collapsed-by-default `View Context` panel. Route shows the exact full-page screenshot without a highlight. Navigation shows the screenshot, geometry-backed CSS overlay, item count, and ordered labels. Section shows the screenshot, section CSS overlay, structural label, and route. Ready shows compatible visual context; incomplete shows the available screenshot plus a warning; unavailable shows an unavailable warning without requiring a screenshot. Projection state does not restrict or alter decisions.
The existing Approve, Reject, and Defer action path is unchanged. Operator-visible context stays compact; raw screenshot paths, evidence and geometry refs, lineage, and projection diagnostics remain in collapsed `Technical details`. Focused tests pass `22 / 22`; the platform Vercel build passes. No AI, Reconstruction, Publishing, batch, tenant/customer, Evidence Capture, Candidate Discovery, Candidate Context Projection, Candidate Review persistence/API/action, schema, worker, screenshot, crop, or image-generation behavior changed.
Phase 8D-25 - Candidate Context Review UI End-to-End Verification is COMPLETE WITH A BLOCKING PRESENTATION DEFECT FIXED IN CODE. Authenticated production checks on ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` confirmed readable default cards, collapsed context/technical disclosures, confidence, limitations, Navigation labels, all six bounded Approve/Reject/Defer submissions, canonical refresh, stable decision counts, and no forbidden controls.
The deployed pages could not display Route, Navigation, or Section screenshots because they attempted to read import-machine absolute paths from the deployment filesystem. The exact PNG bytes already existed in each raw-import artifact. The narrow fix adds a fail-closed read through existing raw-artifact helpers after the local-file read; both real artifacts resolve valid PNG data URIs. No endpoint, persistence, schema, worker, capture, projection, Review Action, AI, Reconstruction, Publishing, batch, tenant, or customer behavior changed. Focused tests pass `27 / 27`; the platform Vercel build passes. Deployed image/overlay verification remains pending deployment of this fix. Detailed evidence: `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_E2E_VERIFICATION.md`.
Phase 8D-26 - Candidate Context Review UI Production Re-Verification is COMPLETE with PASS classification. The deployed 8D-25 fix is confirmed present because both authenticated production pages now resolve the exact persisted PNG as a data URI instead of `Visual evidence unavailable`.
ODV renders the `1366 x 2970` screenshot for Route, Navigation, and the selected Section; Route has no overlay and Navigation/Section have visible, non-zero overlays. ViroiDoc renders the `1366 x 4428` screenshot for all three types with the same overlay invariants, and its `29` ordered Navigation labels remain visible. No action was submitted, review counts remain ODV `1 / 1 / 1 / 1` and ViroiDoc `1 / 1 / 1 / 2`, and no AI, Reconstruction, Publishing, batch, tenant, or customer controls are present.
Phase 8D-26 changed documentation only. Focused tests pass `27 / 27`; the platform Vercel build passes with existing lint warnings; `git diff --check` passes. Detailed evidence: `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_E2E_VERIFICATION.md`.
Phase 8D-27 - Post-Candidate-Context Boundary Reassessment is COMPLETE. The documentation-only assessment selects exactly one next boundary: Reconstruction Package Foundation. The canonical input is one exact immutable Candidate Review Package artifact selected as the current package head; approved candidates are derived only from that snapshot's latest decisions, while its linked exact Candidate Discovery, Limited Dry Run, and Evidence Capture artifacts remain supporting lineage rather than independent authorization.
Reconstruction Package Foundation is now safe for design because real approved candidates, immutable events and Review Package snapshots, compare-and-set latest advancement, canonical reload, and exact-lineage production screenshots/overlays are proven on ODV and ViroiDoc. It was not safe before Candidate Context because the action path was technically auditable but the operator could not reliably see the source page and precise Navigation/Section region being authorized. The initial boundary must reconcile the old 7F metadata scaffolding with canonical 8C/8D lineage and must not persist packages, plan structure, reconstruct, call AI, generate output, dispatch workers, or publish. Detailed assessment: `docs/architecture/POST_CANDIDATE_CONTEXT_BOUNDARY_REASSESSMENT.md`.
Structure Planning remains downstream of the canonical reviewed package. No additional governance layer or alternative boundary has a demonstrated prerequisite gap or higher current value. Phase 8D-27 changed documentation only and added no implementation or behavior change.
Phase 8E-0 - Reconstruction Package Foundation Design is COMPLETE. The canonical Reconstruction Package is an immutable, deterministic, metadata-only eligibility handoff derived from one exact latest Candidate Review Package artifact. Only that snapshot's latest `approved` decisions are eligible; rejected, deferred, unreviewed, stale, invalid, and superseded decisions remain excluded. Candidate Discovery, Candidate Context, Limited Dry Run, and Evidence Capture refs are supporting lineage and never independent authorization.
Package identity is tied deterministically to the exact source Review Package artifact ID plus the Reconstruction Package contract version. A new Review head produces a new immutable package identity and makes the prior package stale for new planning without rewriting its audit history. The package carries exact approved candidate and authorizing Review Event refs, bounded summaries, limitations, diagnostics, and Structure Planning eligibility metadata only. It contains no generated output, AI output, Structure Plan, execution readiness, worker job, deployment artifact, or publishing artifact. The older Phase 7F scaffolding must be reconciled or replaced by the canonical 8E contract rather than remain a parallel truth. Detailed design: `docs/architecture/RECONSTRUCTION_PACKAGE_FOUNDATION.md`.
Phase 8E-0 changed documentation only and added no implementation or behavior change.
Phase 8E-2 - Reconstruction Package Builder Design is COMPLETE. The canonical
builder design converts one exact latest `CandidateReviewPackage` artifact
plus its linked `CandidateDiscoveryResult` into a metadata-only
`ReconstructionPackage`. The Review Package remains the only authorizing
input; Discovery supplies exact candidate metadata and evidence refs but
cannot approve candidates independently.
Only latest approved decisions become `approvedCandidateRefs`. Rejected,
deferred, unreviewed, superseded, stale, and missing-candidate decisions are
excluded. Candidate refs carry candidate ID, candidate type, route path,
confidence, authorizing `reviewEventId`, deterministic source candidate refs,
and copied evidence refs. Package identity is derived from the exact
`candidateReviewPackageArtifactId` plus the 8E contract version. Status rules
are fail-closed: `valid` for at least one approved included candidate with
valid lineage and passing contract validation, `blocked` for no approvals or
missing required lineage, `stale` for a non-latest Review Package artifact,
and `invalid` for validation or lineage mismatch failures.
The design propagates source limitations and permits only deterministic
builder blockers as new limitations. Diagnostics cover included and excluded
counts, lineage validation, latest-head comparison, Discovery mismatch,
missing candidates, supersession/latest-decision checks, and contract
validation. Detailed design:
`docs/architecture/RECONSTRUCTION_PACKAGE_BUILDER_DESIGN.md`.
Phase 8E-2 changed documentation only and added no implementation, persistence,
Structure Planning, reconstruction, AI, generation, execution, publishing,
schema, worker, API, UI, or behavior change.
Phase 8E-3 - Reconstruction Package Builder Implementation is COMPLETE. The
pure builder module
`apps/platform/gnr8/architecture/reconstruction-package-builder.ts` creates a
metadata-only `ReconstructionPackage` from one exact
`CandidateReviewPackage`, the linked `CandidateDiscoveryResult`, the exact
Candidate Review Package artifact ID, and the latest Candidate Review Package
artifact ID.
The builder derives deterministic identity as
`reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>`,
includes only latest approved decisions that resolve to exact Discovery
candidates, copies candidate type, route, confidence, authorizing Review Event
ID, source candidate refs, and evidence/dry-run refs, and excludes rejected,
deferred, unreviewed, superseded, stale, and missing-candidate refs.
Status behavior is metadata-only and fail-closed: `valid` for included
approved candidates with valid lineage, `blocked` for no included approved
candidates, `stale` for a non-latest Review Package artifact, and `invalid`
for invalid source or package validation. The builder propagates source
limitations as deterministic strings, adds only builder blockers, emits
deterministic diagnostics, and validates output with
`validateReconstructionPackage(...)`.
Phase 8E-3 added no persistence, latest-pointer mutation, Structure Plan,
generated React, generated blocks, generated content, AI output, execution,
publishing artifact, migration, schema, worker, API, UI, or behavior outside
the pure builder. Focused Reconstruction Package contract and builder tests
pass `18 / 18`; the platform Vercel build passes with existing lint warnings;
`git diff --check` passes.
Phase 8E-4 - Reconstruction Package Real-Artifact Validation is COMPLETE. The
real-artifact validation loaded ODV and ViroiDoc provenance with a read-only
query and ran the pure builder in memory only. No package was persisted, no
latest pointer was advanced, and no planning, generation, AI, publishing,
schema, worker, API, UI, or behavior change was added.
The supplied Review artifact IDs were valid historical artifacts but no
longer current latest heads. The builder correctly produced `status = stale`
for ODV
`candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f` and ViroiDoc
`candidate_review_package_4e70cbc788098383b52de76249a5c412`, preserving exact
Review, Discovery, site-version, and dry-run lineage and keeping forbidden
fields absent. The actual current latest heads produced `status = valid`:
ODV `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` included
`3` approved candidates and excluded `1`; ViroiDoc
`candidate_review_package_ecb5f777160a45e15b958948348bca08` included `1`
approved Route candidate and excluded `4`. Detailed evidence:
`docs/architecture/RECONSTRUCTION_PACKAGE_REAL_ARTIFACT_VALIDATION.md`.
Phase 8E-5 - Reconstruction Package Persistence Boundary Design is COMPLETE.
The design selects the existing site-version provenance artifact boundary for
durable `reconstruction_package` artifacts, with append-only
`reconstructionPackageArtifacts` and `latestReconstructionPackageArtifact`.
The persistence boundary must validate with
`validateReconstructionPackage(...)`, enforce the forbidden-field guard, check
exact Review/Discovery/site-version/dry-run lineage, reuse equivalent packages,
append changed current packages, and persist only `valid` or `blocked` outputs.
Packages that are already `stale` or `invalid` are rejected before write.
Detailed design:
`docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_BOUNDARY.md`.
Phase 8E-6 - Reconstruction Package Persistence Implementation is COMPLETE.
The implementation adds `apps/platform/gnr8/architecture/reconstruction-package-persistence.ts`
and persists validated metadata-only `reconstruction_package` artifacts in the
existing site-version provenance boundary. It uses append-only
`reconstructionPackageArtifacts` plus `latestReconstructionPackageArtifact`,
stores the 8E-5 metadata set, reuses equivalent latest artifacts, appends
changed current packages, and rejects stale, invalid, forbidden-field, missing
artifact, and lineage-mismatch packages before write.
Phase 8E-7 - Reconstruction Package Persistence Real-Artifact Validation is COMPLETE.
The real-artifact validation persisted durable `reconstruction_package`
artifacts for the latest ODV and ViroiDoc approved Review Package heads:
ODV `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` with `3`
included and `1` excluded, and ViroiDoc
`reconstruction_package_0e143f5fc174668e2225f73ebe464ffb` with `1` included
and `4` excluded. Both reloaded by latest pointer and exact artifact ID, both
idempotent retries reused the same artifact, and forbidden Structure Planning,
AI, generated, execution, and publishing fields remained absent. Detailed
evidence:
`docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.
Phase 8F-0 - Structure Planning Foundation Design is COMPLETE. The
documentation-only foundation defines Structure Plan as a deterministic,
metadata-only planning artifact over one exact latest Reconstruction Package
artifact. Reconstruction Package defines what is eligible; Structure Plan
defines how included approved candidates are organized into planned routes,
planned navigation, planned sections, and exact candidate assignments without
generating a website.
The exact latest Reconstruction Package artifact is the only authorizing
input. Only included approved candidates already present in that package may
participate. Review, Discovery, Candidate Context, Limited Dry Run, and
Evidence Capture refs may be retained as copied lineage but cannot add
candidates or infer target structure. Recommended identity is
`structure-plan:<reconstructionPackageArtifactId>:<structurePlanContractVersion>`.
Detailed design: `docs/architecture/STRUCTURE_PLANNING_FOUNDATION.md`.
Phase 8F-0 changed documentation only and added no implementation, Structure
Plan contract, builder, persistence, generated output, AI output, publishing
artifact, deployment artifact, execution artifact, schema, worker, API, UI, or
behavior change.
Phase 8F-1 - Structure Planning Contract is COMPLETE. The canonical contract is
`apps/platform/gnr8/architecture/structure-plan-contract.ts`, with focused
tests in `apps/platform/gnr8/architecture/structure-plan-contract.test.ts`.
The contract defines `StructurePlan`, `StructurePlanRoute`,
`StructurePlanNavigation`, `StructurePlanSection`, `StructurePlanAssignment`,
`StructurePlanLineage`, `StructurePlanValidationResult`, and
`StructurePlanStatus`. Allowed statuses are exactly `planned`, `valid`,
`invalid`, `blocked`, and `stale`.
The plan identity is deterministic:
`structure-plan:<reconstructionPackageArtifactId>:<contractVersion>`. Lineage
carries the exact Reconstruction Package artifact, package ID/status/version,
Review artifact, Discovery artifact, site version, dry run, and included
approved candidate refs. Assignments may organize only route, navigation, and
section candidates from that included set; unresolved assignments are metadata
only and do not authorize generation.
Validation checks required fields, lineage consistency, counts, uniqueness,
candidate participation, assignment target compatibility, stale historical
warnings, and the recursive forbidden-field guard for React, generated block,
generated content, generated component, AI output, structure instruction,
publishing, deployment, and execution payloads. The blocked helper creates a
metadata-only blocked plan for no eligible candidates, invalid lineage, or
stale Reconstruction Package input.
Phase 8F-1 added no builder, persistence, AI, generated React, generated
blocks, generated content, publishing artifacts, deployment artifacts,
execution artifacts, schema, workers, API, UI, or behavior changes.
Phase 8F-2 - Structure Planning Builder Design is COMPLETE. The canonical
design is `docs/architecture/STRUCTURE_PLANNING_BUILDER_DESIGN.md`. It
defines a future deterministic builder that converts one exact latest
`ReconstructionPackage` artifact into a metadata-only `StructurePlan` by
planning approved route, navigation, and section candidates and creating one
assignment per included approved candidate unless blocked.
The required first implementation input is the exact latest persisted
Reconstruction Package artifact record. Candidate Discovery Result, Candidate
Context Projection, and Candidate Review Package may support diagnostics only;
they cannot authorize candidates, infer target structure, reorder the package
set, or add hidden planning inputs.
Phase 8F-2 changed documentation only and added no builder implementation,
persistence, AI, generation, publishing, schema, workers, API, UI, Evidence
Capture behavior, Candidate Discovery behavior, Candidate Context behavior,
Candidate Review behavior, Review Actions behavior, Reconstruction Package
behavior, StructurePlan contract changes, or runtime behavior.
Phase 8F-3 - Structure Planning Builder Implementation is COMPLETE. The
canonical builder is
`apps/platform/gnr8/architecture/structure-plan-builder.ts`; focused coverage
is in `apps/platform/gnr8/architecture/structure-plan-builder.test.ts`.
The builder is a pure deterministic mapper from one exact
`ReconstructionPackage` payload, its exact persisted artifact ID, and the
latest Reconstruction Package artifact ID into a metadata-only `StructurePlan`.
It derives `structure-plan:<reconstructionPackageArtifactId>:8F-1`, copies
lineage from the package, and runs `validateStructurePlan(...)` on the output.
Route planning creates one planned route per approved route candidate with an
explicit route path. Navigation and section planning create entries only when
route association is explicit or unambiguous. Missing or ambiguous association
is reported as a deterministic builder blocker.
Valid plans create one assignment per successfully planned included approved
candidate, preserving candidate refs, evidence refs, target kind, target ID,
and source Reconstruction Package diagnostics. Because the 8F-1 contract
requires blocked plans to be assignment-free, blocked plans report candidate
blockers in limitations and diagnostics while remaining contract-valid.
Status behavior is `valid` when all included candidates plan and assign,
`blocked` for no included candidates or route-association blockers, `stale`
when the supplied package artifact is not latest, and `invalid` when source or
Structure Plan validation fails. Diagnostics include route, navigation,
section, assignment, included candidate, blocked candidate, stale detection,
source validation, and Structure Plan validation counts/results.
Phase 8F-3 added no persistence, generated React, generated blocks, generated
content, AI outputs, publishing artifacts, deployment artifacts, migrations,
schema, workers, Evidence Capture behavior, Candidate Discovery behavior,
Candidate Context behavior, Candidate Review behavior, Review Actions
behavior, Reconstruction Package behavior, StructurePlan contract changes,
API, UI, or runtime execution.
Phase 8F-4 - Structure Planning Real-Artifact Validation is COMPLETE. The
validation loaded the exact real ODV and ViroiDoc Reconstruction Package
artifacts through the existing persistence loaders, confirmed each requested
artifact was also the latest artifact for its site version, built
metadata-only `StructurePlan` values with `buildStructurePlan(...)`, validated
the outputs with `validateStructurePlan(...)`, and scanned them for forbidden
generated, AI, publishing, deployment, and execution fields.

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` used
`reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`, linked Review
artifact `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`, linked
Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`,
and dry run `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`. The resulting
Structure Plan status is `valid`, with `1` planned route, `0` planned
navigation entries, `2` planned sections, `3` assignments, and `0` blocked
candidates.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` used
`reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`, linked Review
artifact `candidate_review_package_ecb5f777160a45e15b958948348bca08`, linked
Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`,
and dry run `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`. The resulting
Structure Plan status is `valid`, with `1` planned route, `0` planned
navigation entries, `0` planned sections, `1` assignment, and `0` blocked
candidates. ViroiDoc retained `36` propagated Reconstruction Package
limitations; they did not block Structure Plan validation.

Detailed evidence:
`docs/architecture/STRUCTURE_PLANNING_REAL_ARTIFACT_VALIDATION.md`.

Phase 8F-4 found no builder defect and changed no behavior. It added no
Structure Plan persistence, AI output, generated React, generated blocks,
generated content, publishing artifact, deployment artifact, execution
artifact, migration, schema, worker, API, UI, or runtime execution.
Phase 8F-5 - Structure Plan Persistence Boundary Design is COMPLETE. The
canonical design is
`docs/architecture/STRUCTURE_PLAN_PERSISTENCE_BOUNDARY.md`. It recommends
persisting future validated Structure Plan artifacts in the existing
site-version provenance artifact boundary, not a new DB table or hybrid
dual-write path.

The canonical artifact kind is `structure_plan`. The designed storage shape is
append-only `structurePlanArtifacts` plus `latestStructurePlanArtifact`.
Persisted metadata includes artifact ID/ref, artifact kind, `structurePlanId`,
`reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`,
`candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, `status`,
planned route/navigation/section counts, assignment count, blocked candidate
count, `createdAt`, `persistedAt`, and Structure Plan contract version.

Idempotency reuses an equivalent latest plan for the same Reconstruction
Package artifact and contract version. Changed current plans append. Stale,
invalid, forbidden-field, and lineage-mismatch plans reject before write.
The staleness policy persists only `valid` or `blocked`; `stale` and `invalid`
are not persisted.

Validation before persist must run `validateStructurePlan(...)`, enforce the
recursive forbidden-field guard, verify exact plan lineage, verify the
referenced Reconstruction Package artifact, require the Reconstruction Package
artifact to remain latest for the site-version lineage, and reconcile copied
included candidate refs and counts against the package payload.

The future helper design is `persistStructurePlan(...)`,
`loadLatestStructurePlan(...)`, and `loadStructurePlanById(...)`. The boundary
creates no AI outputs, generated content/components/blocks, publishing
artifacts, deployment artifacts, execution artifacts, worker jobs, Content
Planning artifacts, or Layout/Block Planning artifacts. Future downstream
relationships are `StructurePlan -> Future Content Planning` or
`StructurePlan -> Future Layout/Block Planning`; no next generation boundary
exists yet.

Phase 8F-5 changed documentation only. It added no persistence helper,
provenance field, artifact record implementation, latest pointer mutation,
database table, schema migration, API, UI, worker, Content Planning,
Layout/Block Planning, AI, generation, publishing, StructurePlan contract
change, StructurePlan builder change, Reconstruction Package change, or
runtime behavior.

Phase 8F-6 - Structure Plan Persistence Implementation is COMPLETE. It adds
`apps/platform/gnr8/architecture/structure-plan-persistence.ts` and focused
tests in
`apps/platform/gnr8/architecture/structure-plan-persistence.test.ts`.

The implementation persists metadata-only `structure_plan` artifacts inside
the existing site-version provenance artifact boundary using append-only
`structurePlanArtifacts` and `latestStructurePlanArtifact`. Helper surface is
limited to `persistStructurePlan(...)`, `loadLatestStructurePlan(...)`, and
`loadStructurePlanById(...)`.

Persisted metadata includes `structurePlanId`,
`reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`,
`candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, status, planned
route/navigation/section counts, assignment count, blocked candidate count,
contract version, `createdAt`, and `persistedAt`.

Persistence requires `validateStructurePlan(...)`, exact lineage checks, latest
Reconstruction Package artifact verification, and package reconciliation before
write. Equivalent latest plans reuse the existing artifact. Changed current
plans from a newer latest Reconstruction Package artifact append and advance
the latest pointer. Stale, invalid, forbidden-field, invalid-lineage,
missing-package, non-latest-package, and package-reconciliation failures reject
before write.

Phase 8F-6 added no Content Planning, Layout Planning, generated React,
generated blocks, generated content, AI output, publishing artifact, migration,
schema, worker, API, UI, Evidence Capture change, Candidate Discovery change,
Candidate Context change, Candidate Review change, Review Actions change,
Reconstruction Package change, StructurePlan contract change, StructurePlan
builder change, or runtime generation behavior.

Validation passed: focused Structure Plan persistence tests and
`cd apps/platform && pnpm run vercel-build`.

Phase 8F-7 - Structure Plan Persistence Real-Artifact Validation is COMPLETE.
Canonical evidence:
`docs/architecture/STRUCTURE_PLAN_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` persisted
`structure_plan_08e12e859e457d5ac15870ce2892c817` from latest Reconstruction
Package `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`. The
persisted Structure Plan is `valid`, with `1` planned route, `0` planned
navigation entries, `2` planned sections, `3` assignments, and `0` blocked
candidates.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` persisted
`structure_plan_7b73cf96b695da6ba0103fb30ad306a0` from latest Reconstruction
Package `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`. The
persisted Structure Plan is `valid`, with `1` planned route, `0` planned
navigation entries, `0` planned sections, `1` assignment, and `0` blocked
candidates.

For both targets, latest Structure Plan reload and by-ID reload returned the
same exact artifact, lineage and metadata checks passed, and idempotent retry
reused the same artifact without appending a duplicate. The persisted artifacts
contain no Content Plan, Layout Plan, AI output, generated content/components,
publishing artifact, deployment artifact, execution artifact, or worker job.

Phase 8F-7 changed no behavior. It added no Content Planning, Layout Planning,
AI, generation, publishing, schema, worker, API, UI, StructurePlan contract
change, StructurePlan builder change, Reconstruction Package change, or runtime
generation behavior.

Phase 8F-8 - Structure Plan Read-Only Surface Design is COMPLETE. The canonical
design is `docs/architecture/STRUCTURE_PLAN_SURFACE_DESIGN.md`.

It recommends a dedicated admin Structure Plan page for read-only inspection of
persisted `structure_plan` artifacts. The surface shows artifact metadata,
lineage, planned routes, planned navigation, planned sections, assignment
mappings, summary counts, limitations, diagnostics, and validation state while
making clear that the artifact is not generated website output.

The designed `StructurePlanSurfaceProjection` includes artifact metadata,
lineage, summary counts, grouped planned routes/navigation/sections,
assignments, limitations, diagnostics, validation, and state for missing,
invalid, stale, blocked, valid-without-navigation, valid-without-sections,
limitations-present, and ready-for-inspection cases.

Phase 8F-8 changed documentation only. It added no UI implementation, route,
API, loader, persistence helper, Evidence Capture change, Candidate Discovery
change, Candidate Context change, Candidate Review change, Review Actions
change, Reconstruction Package change, StructurePlan contract change,
StructurePlan builder change, StructurePlan persistence change, AI system,
generation system, publishing system, schema, worker, or runtime behavior.

Phase 8F-9 - Structure Plan Read-Only Surface Implementation is COMPLETE.

Implemented admin route:
`apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx`.

Implemented projection:
`apps/platform/gnr8/architecture/structure-plan-surface-projection.ts`.

The page uses the existing superadmin page guard and displays persisted
Structure Plan artifacts in read-only sections: Overview, Lineage, Plan
Summary, Planned Routes, Planned Navigation, Planned Sections, Assignments, and
Diagnostics.

The projection reads only the latest persisted Structure Plan artifact through
the existing Structure Plan persistence loader and projects artifact metadata,
linked lineage, summary counts, planned route/navigation/section metadata,
assignments, limitations, diagnostics, validation status, primary state, and
attention states.

Implemented states: missing, blocked, stale, valid, limitations present, no
navigation, and no sections.

Phase 8F-9 added no buttons, forms, inputs, edit controls, AI controls,
reconstruction controls, generation controls, publishing controls, execution
controls, retry controls, approval controls, Content Planning, Layout Planning,
AI, generation, publishing, mutation behavior, schema, workers, or changes to
Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review,
Review Actions, Reconstruction Package, StructurePlan contract, StructurePlan
builder, or StructurePlan persistence.

Validation result: focused Structure Plan surface tests pass; `cd apps/platform
&& pnpm run vercel-build` passes; `git diff --check` passes.

Phase 8F-10 - Structure Plan End-to-End Verification is COMPLETE.

Canonical evidence:
`docs/architecture/STRUCTURE_PLAN_E2E_VERIFICATION.md`.

The complete read-only admin chain is verified:

```text
persisted structure_plan artifact
-> latest loader
-> StructurePlanSurfaceProjection
-> dedicated read-only admin page
```

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` loads latest
Structure Plan `structure_plan_08e12e859e457d5ac15870ce2892c817`. The surface
projection is `valid` with `1` route, `0` navigation entries, `2` sections,
`3` assignments, `0` blocked candidates, no navigation state present, and
planned route/section/assignment rows visible.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` loads latest
Structure Plan `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`. The surface
projection is `valid` with `1` route, `0` navigation entries, `0` sections,
`1` assignment, `0` blocked candidates, no navigation state present, no
sections state present, and limitations-present state visible.

Both projections preserve current Reconstruction Package, Review Package,
Discovery Result, `siteVersionId`, and `dryRunId` lineage. The dedicated admin
page compiles as a dynamic route, enforces the superadmin guard, and contains
no buttons, forms, inputs, AI, generation, publishing, execution, retry,
approval, edit, Content Planning, or Layout Planning controls.

Phase 8F-10 changed documentation only. It added no Content Planning, Layout
Planning, AI, generation, publishing, schema, workers, API behavior, UI
mutation behavior, buttons, forms, inputs, or Structure Plan behavior changes.

Validation result: focused Structure Plan persistence/projection/page tests
pass `16 / 16`; `cd apps/platform && pnpm run vercel-build` passes with
existing unrelated lint warnings and includes the dynamic Structure Plan route;
`git diff --check` passes.

Phase 8F-10 closed with Phase 8F-11 - Post-Structure Plan Boundary
Reassessment as the next recommended phase at that time.

Phase 8F-11 - Post-Structure Plan Boundary Reassessment is COMPLETE.

Canonical assessment:
`docs/architecture/POST_STRUCTURE_PLAN_BOUNDARY_REASSESSMENT.md`.

Phase 8F-11 selects exactly one next boundary after verified persisted
StructurePlan artifacts and the read-only StructurePlan UI:

```text
StructurePlan
-> LayoutPlan
```

Recommended next boundary: Phase 8G-0 - Layout Plan Foundation.

The next layer is primarily visual/layout, not content, semantic intent, or
component/block mapping. LayoutPlan should define metadata-only placement
intent: route-level layout containers, section order/grouping, region roles,
navigation placement intent, density/prominence/alignment/responsive hints when
source-grounded, source evidence refs, StructurePlan assignment refs,
limitations, and diagnostics.

Canonical input to the next phase is the latest persisted `StructurePlan`
artifact for the requested `siteVersionId`, the exact linked Reconstruction
Package artifact referenced by that StructurePlan, and supporting lineage refs
to Candidate Review, Candidate Discovery, Candidate Context, Evidence Capture,
`dryRunId`, and `siteVersionId`. Supporting refs explain placement evidence and
limitations; they must not add candidates or override the StructurePlan
envelope.

Content Plan Foundation is deferred until layout anchors exist for content
slotting and media/text mapping. Intent / Experience Plan Foundation is
deferred until semantic purpose can attach to stable layout and content
entities without outrunning evidence. Block Plan Foundation is deferred because
component mapping is downstream of layout, content, and design constraints and
would carry the highest generic builder risk if introduced now.

AI-editor alignment: LayoutPlan remains outside AI proposals, code generation,
editing mutations, and publish flow. It gives future content and editing layers
source-grounded placement anchors while preserving proposal-before-mutation and
approval-before-publish governance.

Digital Twin alignment: LayoutPlan strengthens the Twin as operational
understanding rather than HTML replay. It bridges StructurePlan into future
Design State and Experience State without becoming a recommendation, proposal,
mutation, generated frontend, or publishable artifact.

Phase 8F-11 changed documentation only. It added no Evidence Capture,
Candidate Discovery, Candidate Context, Candidate Review, Review Actions,
Reconstruction Package, StructurePlan contract, StructurePlan builder,
StructurePlan persistence, StructurePlan UI, AI, generation, publishing,
schema, worker, runtime, API, or UI behavior.

Validation result: `git diff --check` passes.

Phase 0 - GNR8 Architecture Manifesto / AI Orchestrator Reset is COMPLETE.

Canonical manifesto:
`docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`.

Current architectural reset:
GNR8 is an AI Orchestrator with a governed Digital Business Twin at its core.

GNR8 is not a traditional website builder, not a CMS, and not a generic page
editor. The Digital Business Twin is the canonical operational understanding
of a business and its digital identity. Generated websites are outputs, not
the long-term source of truth. Generation without understanding is prohibited.
AI proposes; humans approve. The orchestrator owns the task; the model
executes it. GNR8 must remain model-agnostic.

Canonical future lifecycle:

```text
Business Journey
-> Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Decision Architecture is the governance layer between the Human Journey and
canonical artifacts. The Decision Artifact Authorization Matrix is the
canonical authorization layer inside Decision Architecture. The Canonical
Artifact Governance State Model is the canonical maturity and approval-status
layer for every canonical artifact. The Canonical Artifact Lineage and
Versioning Model is the canonical history and evolution layer shared by every
governed artifact:

```text
Decision Model
-> Authorization
-> Governance State
-> Lineage
-> Versioning
-> Canonical Artifacts
-> Business Journey
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Canonical technical lifecycle:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Rejected lifecycle:

```text
Website
-> Prompt
-> Generate React
```

Roadmap reset: do not proceed into LayoutPlan, BlockPlan, or ContentPlan as if
GNR8 is building a traditional internal website builder, CMS, page editor,
block schema, or direct React generator. LayoutPlan, BlockPlan, ContentPlan, AI
Editor architecture, publishing flow, Generation Contract Compliance, provider
orchestration, provider adapters, and external AI serialization formats require
reassessment under the AI Orchestrator / Digital Business Twin identity.

Roadmap after DA-3:

```text
Decision Model
-> Authorization
-> Governance State
-> Lineage
-> Versioning
-> Canonical Artifacts
-> Business Journey
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment Decision
-> Business Alignment
-> Website Design Decision
-> Website Design Brief
-> Generation Decision
-> Website Generation Package
-> Generation Execution Decision
-> Generated Website Proposal
-> Compliance Review Decision
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval Decision
-> Business Approval
-> Publishing Decision
-> Publish
```

Phase 0 changed documentation and architecture alignment only. It added no
Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review,
Review Actions, Reconstruction Package, StructurePlan, AI integration code,
generation systems, publishing systems, schema, workers, API, UI, or runtime
behavior.

Phase GP-0 - Generation Package Foundation is COMPLETE.

Canonical foundation:
`docs/architecture/GENERATION_PACKAGE_FOUNDATION.md`.

Purpose:
A `GenerationPackage` is the deterministic, immutable, provider-neutral,
versioned, lineage-aware, review-backed description of a website that is
sufficiently complete for any external AI system to generate or reconstruct
that website under GNR8 governance.

Generation Package does not equal Prompt. A prompt is a provider-specific
serialization of a Generation Package. The Generation Package owns meaning;
provider adapters own serialization.

Canonical AI orchestration chain:

```text
Import
-> Evidence
-> Discovery
-> Context
-> Review
-> Reconstruction Package
-> StructurePlan
-> Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Canonical input is the latest persisted `StructurePlan` artifact. Supporting
lineage includes ReconstructionPackage, CandidateReviewPackage,
CandidateDiscoveryResult, CandidateContext, Evidence, `siteVersionId`, and
`dryRunId`.

Canonical sections to evaluate are Site Identity, Business Purpose, Audience,
Brand, Design System, Logo, Colors, Typography, Assets, Navigation, Routes,
Sections, Content References, Evidence References, Constraints, Accessibility,
SEO, Runtime Target, Hosting Target, Publishing Constraints, Acceptance
Criteria, Limitations, Diagnostics, Version Metadata, and Lineage.

Provider independence: the package never contains OpenAI prompts, Claude
prompts, Gemini prompts, Codex tasks, v0 prompts, Stitch prompts,
provider-specific formatting, provider payloads, generated React, generated
HTML, generated CSS, generated content, publishing artifacts, or deployment
artifacts.

Adapter model: future OpenAI, Claude, Gemini, Codex, Stitch, v0, and
future-provider adapters own prompt/task/API serialization. The Generation
Package owns provider-neutral meaning.

Digital Twin relationship: Digital Twin -> Generation Package -> External AI
is preferred over HTML -> Prompt -> AI because the Twin and package preserve
governed understanding, evidence, lineage, constraints, diagnostics,
validation expectations, and Business Approval boundaries.

Future architecture sequence: Generation Package -> Generation Validation
Package -> Generated Website Validation -> Approval -> Publishing.

Phase GP-0 changed documentation and architecture only. It added no Evidence
Capture, Candidate Discovery, Candidate Context, Candidate Review,
Reconstruction Package, StructurePlan, Publishing, AI integrations, Workers,
Schema, API, UI, prompts, adapters, generated outputs, validation packages,
approvals, or publishing artifacts.

Phase DBT-0 - Digital Business Twin Specification v1.0 is COMPLETE.

Canonical specification:
`docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md`.

Canonical definition:
The Digital Business Twin is the canonical operational understanding of a
business and its digital identity.

The DBT is deterministic, versioned, evidence-backed, provider-neutral,
model-independent, continuously evolving, and human-governed.

Fundamental principle:
A business exists independently of any website. A website is only one
expression of the business. The Digital Business Twin represents the business
itself.

Current DBT-centered architecture:

```text
Connectors
-> Digital Business Twin
-> Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Possible connectors include Existing Website, Brand Book, CRM, ERP, Product
Catalog, Knowledge Base, Support Platform, Social Networks, Google Business,
Notion, PDFs, Office documents, Figma, Images, Video, Human interviews,
Questionnaires, and future connectors. All connectors enrich the same DBT.

Possible projections include Website Generation Package, Landing Page
Generation Package, Campaign Generation Package, Documentation Package,
Chatbot Package, Sales Package, Marketing Package, Training Package, and
future packages. Generation Package is one projection, never the source of
truth.

Internal DBT domains evaluated in DBT-0 are Business Identity, Brand,
Products, Services, Audience, Messaging, Visual Identity, Knowledge, Content,
Assets, Relationships, Evidence, Constraints, Compliance, Accessibility,
History, Governance, Lineage, Versioning, Goals, Success Metrics,
Limitations, and Diagnostics.

Relationship to existing artifacts:

```text
Evidence
-> Discovery
-> Review
-> Reconstruction Package
-> StructurePlan
-> Business Intent
-> Experience Domain
-> Generation Package
```

These artifacts become contributors or projections around the DBT. None
replaces it. Business Intent is the governed outcome layer between the DBT and
Experience Domains. Generation Packages are projections of the DBT through
Business Intent and Experience Domain scope. Connectors are enrichment
mechanisms. AI models are interchangeable execution engines.

Architectural rules: the DBT is always provider-neutral; the DBT never
contains prompts, generated React, generated HTML, or provider payloads; the
DBT owns meaning; everything else is derived.

Phase DBT-0 changed documentation and specification only. It added no
implementation, TypeScript, schema, API, UI, workers, persistence, AI
integration, provider adapters, prompts, contracts, generated outputs, or
publishing artifacts.

Phase DBT-1 - Knowledge Domain And Understanding Specification is COMPLETE.

Canonical specification:
`docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`.

Knowledge hierarchy:

```text
Reality
-> Evidence
-> Facts
-> Interpretations
-> Knowledge
-> Understanding
-> Digital Business Twin
-> Projections
-> External AI
```

Canonical concepts defined in DBT-1 are Evidence, Fact, Inference,
Interpretation, Knowledge, Understanding, Projection, Suggestion, Generated
Output, Validation, Truth, Uncertainty, Confidence, Lineage, and Governance.

Truth model: Evidence is immutable. Facts are evidence-backed.
Interpretations are derived. Knowledge is validated interpretation.
Understanding is integrated knowledge. The DBT is governed, versioned
understanding. Generation Packages are projections. AI outputs are proposals.
Published artifacts are approved manifestations.

Confidence model: confidence propagates from Evidence -> Fact -> Knowledge ->
Twin -> Generation Package. Low-confidence upstream material must lower
downstream confidence or become an explicit limitation. A projection may
narrow scope to preserve confidence, but it must not hide uncertainty.

Understanding domains defined for future phases are Website Understanding,
Brand Understanding, CRM Understanding, Commerce Understanding, Content
Understanding, Knowledge Understanding, Marketing Understanding, Support
Understanding, and Future Domains. Each domain produces domain knowledge. The
DBT integrates domain knowledge into cross-domain understanding. Connectors
may feed domains, but connectors are not domains and databases are not the
knowledge model.

Architectural rules: the DBT never stores guesses as facts; distinguishes
evidence from interpretation; distinguishes facts from knowledge;
distinguishes knowledge from generated content; distinguishes projections
from source truth; records uncertainty and conflicts; preserves lineage;
remains versioned and auditable; AI never changes truth directly; AI outputs
remain proposals until validated and approved; human governance remains
authoritative.

Phase DBT-1 changed documentation and specification only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, AI
integration, connectors, provider adapters, prompts, generated output, or
publishing behavior.

Phase DBT-2 - Business Domain Model Specification is COMPLETE.

Canonical specification:
`docs/architecture/BUSINESS_DOMAIN_MODEL_SPECIFICATION.md`.

DBT-2 constitutional rule: the Digital Business Twin is not "website
knowledge." It is the governed integration of multiple independent Business
Domains. Websites, landing pages, portals, apps, campaigns, decks,
documentation, newsletters, chatbots, marketplaces, and future channel outputs
are Experience Domains derived from the DBT.

Canonical relationship model:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Intent
-> Experience Domains
-> Generation Packages
-> Provider Adapters
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publishing
```

Fundamental Business Domains are Business Identity, Brand, Offerings,
Audience, Goals, Relationships, Knowledge, Assets, and Compliance.

Optional Business Domains are Sales, Marketing, Operations, Analytics,
Support, Digital Presence, and Future Domains.

Projection-only Experience Domains include Website, Landing Page, Customer
Portal, Mobile App, Marketplace, Documentation, Campaign, Newsletter, Chatbot,
Sales Deck, and Future Experiences.

Domain responsibility model: every Business Domain declares its purpose, what
it owns, what it consumes, what it produces, its relationships, typical
evidence sources, and likely future connectors. Business Domains own
knowledge. Experience Domains own manifestations. Generation Packages own
orchestration targets. Provider Adapters own serialization. AI owns
generation. Humans own approval.

Relationship to existing artifacts: Evidence can support facts, confidence,
limitations, and lineage for one or more Business Domains. Discovery proposes
candidate domain knowledge. Review governs acceptance, rejection, deferral, or
limitations. Reconstruction Package may inform Digital Presence, Assets,
Brand, Offerings, Knowledge, Relationships, and Website Experience Domain
scope. StructurePlan is an Experience Domain planning projection for website
structure. Business Intent is the governed outcome layer selected from DBT
understanding. Generation Package is a provider-neutral orchestration target
derived from a DBT-backed Experience Domain under one or more Business
Intents.

Phase DBT-2 changed documentation and specification only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, connectors,
AI integration, provider adapters, prompts, generated output, or publishing
behavior.

Phase DBT-3 - Business Intent Specification is COMPLETE.

Canonical specification:
`docs/architecture/BUSINESS_INTENT_SPECIFICATION.md`.

Canonical definition:
Business Intent is the governed description of the business outcome that the
organization wants to achieve.

Business Intent is provider-neutral, evidence-backed, versioned,
human-governed, and independent of implementation.

Business Intent is not a website, UI, prompt, code, AI output, or project
plan.

Intent categories are examples, not a fixed taxonomy. Evaluated categories are
Sales, Lead Generation, Brand Awareness, Recruitment, Customer Support,
Education, Commerce, Customer Self-Service, Partner Enablement, Internal
Operations, Compliance, Community, and Future Intents.

Canonical relationship model:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Intent
-> Experience Domain
-> Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publishing
```

Intent vs Experience model: Intent is why the business acts; Experience is
where that intent is expressed. Increase qualified leads can express through a
Website. Reduce support costs can express through a Knowledge Base. Employee
onboarding can express through a Training Portal. Increase sales conversion can
express through a Website, Landing Page, Sales Deck, and Email Campaign.

Intent composition: a business may have multiple active Business Intents. One
Intent may project into multiple Experience Domains. One Experience Domain may
satisfy multiple Intents. Generation Packages are created for one specific
Experience Domain within one or more Business Intents.

Architectural rules: Business Intent never contains prompts, provider
payloads, generated HTML, generated React, generated content, publishing
artifacts, or execution state. Business Intent owns desired outcomes.
Experience Domains own manifestations. Generation Packages own orchestration
targets.

Relationship to existing artifacts: Evidence supports or challenges Intent.
Knowledge justifies, constrains, prioritizes, or revises Intent. The DBT
integrates Business Domain knowledge and provides the governed understanding
from which Intents are selected, validated, and versioned. Generation Packages
translate one specific Experience Domain, under one or more Business Intents,
into a provider-neutral orchestration target for external AI.

Phase DBT-3 changed documentation and specification only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, connectors,
AI integration, provider adapters, prompts, generated output, execution state,
or publishing behavior.

Phase BR-0 - Business Understanding Report Specification is COMPLETE.

Canonical specification:
`docs/architecture/BUSINESS_UNDERSTANDING_REPORT_SPECIFICATION.md`.

Canonical definition:
A Business Understanding Report is a deterministic, evidence-backed,
provider-neutral, human-readable projection of the current Digital Business
Twin.

The report summarizes what GNR8 currently understands. It is not a prompt,
website, specification, generated code, Generation Package, or Design Brief.
The Digital Business Twin remains the canonical governed source of business
understanding.

Report purpose: validate understanding, expose missing knowledge, build trust,
explain confidence, support human corrections, prepare future planning, and
serve as business documentation before downstream generation planning.

Recommended report structure: Executive Summary, Business Overview, Mission,
Products & Services, Target Audience, Business Goals, Brand Identity,
Competitive Advantages, Customer Journey, Current Digital Presence, Strengths,
Weaknesses, Business Opportunities, Business Risks, Missing Knowledge,
Confidence Overview, Recommendations, Limitations, Evidence Summary, Version &
Lineage, and Diagnostics.

Confidence model: every major section exposes confidence and explains
uncertainty. Confidence is shown for overall understanding, Business Identity,
Brand, Offerings, Audience, Goals, Knowledge, and Digital Presence. Low,
unknown, stale, or conflicting understanding becomes a visible limitation or
human correction request.

Business recommendations model: recommendations are business-oriented only.
Examples include clarifying positioning, improving messaging, consolidating
products, strengthening trust, improving customer journey, expanding
documentation, improving SEO, and modernizing the website. Recommendations
never prescribe implementation.

Relationship model:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Roadmap after BR-0:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rules: the Business Understanding Report never contains prompts,
provider payloads, generated HTML, generated React, generated components,
generated pages, publishing artifacts, or execution state. The report
communicates understanding only.

Phase BR-0 changed documentation and specification only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, connectors,
AI integration, provider adapters, prompts, generated output, execution state,
or publishing behavior.

Phase BA-0 - Business Alignment Specification is COMPLETE.

Canonical specification:
`docs/architecture/BUSINESS_ALIGNMENT_SPECIFICATION.md`.

Canonical definition:
"A deterministic, human-governed process that confirms or improves the Digital
Business Twin before downstream planning begins."

Business Alignment is neither generation nor editing. Business Alignment
improves understanding only. It validates business understanding, not website
quality.

Business Alignment may improve Business Identity, Mission, Vision, Products,
Services, Target Audience, Business Goals, Brand, Tone of Voice, Competitive
Advantages, Business Relationships, Knowledge, Assets, Constraints,
Compliance, Business Priorities, Success Metrics, and Business Intent.

Business Alignment never edits HTML, React, components, layouts, pages,
Generation Packages, provider payloads, prompts, publishing artifacts,
deployment artifacts, or runtime state.

Canonical readiness levels are Level 0 Unknown, Level 1 Observed, Level 2
Reviewed, Level 3 Aligned, and Level 4 Confirmed. Website Generation Package
preparation should only begin after sufficient alignment.

Knowledge evolution model:

```text
Observed
-> Inferred
-> Reviewed
-> Aligned
-> Confirmed
```

Every correction creates new knowledge. Nothing rewrites history. Evidence
remains immutable. Corrections become additional lineage. Human corrections
have authority over interpretations, while evidence always remains preserved.

Generation Readiness is a projection derived from Business Understanding,
Alignment completeness, Confidence, Missing knowledge, Conflicts, and
Limitations. It does not measure website quality. It measures whether enough
understanding exists for downstream planning.

Relationship model:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rules: Business Alignment never contains generated HTML,
generated React, generated components, generated pages, generated content,
prompts, provider payloads, execution artifacts, publishing artifacts,
deployment artifacts, or runtime state. Alignment governs business
understanding only.

Phase BA-0 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, AI
integration, prompts, provider adapters, generation, publishing, validation
execution, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase WDB-0 - Website Design Brief Canonical Specification is COMPLETE.

Canonical specification:
`docs/architecture/WEBSITE_DESIGN_BRIEF_SPECIFICATION.md`.

Canonical definition:
"A deterministic, provider-neutral, human-readable, experience-oriented
projection of an aligned Digital Business Twin that defines the intended
business expression of a website."

The Website Design Brief is business-aware, experience-oriented,
technology-independent, provider-neutral, human-readable, AI-readable,
versioned, and lineage-aware. It is not React, HTML, components, blocks,
layouts, provider payloads, prompts, publishing artifacts, execution artifacts,
or generated output.

Website Design Brief purpose: transform business understanding into website
intent, guide human review, guide creative direction, guide AI generation,
create one canonical source of website intent, reduce provider-specific
prompting, and support future regeneration.

Recommended Website Design Brief structure: Executive Summary, Business
Context, Business Goals, Website Objectives, Primary Audience, Secondary
Audience, Customer Problems, Business Value Proposition, Competitive
Advantages, Brand Personality, Tone of Voice, Messaging Principles, Trust
Signals, Products & Services Overview, Desired Customer Journey, Website
Information Architecture, Required Website Pages, Required Navigation,
Required Content Themes, Accessibility Expectations, SEO Direction,
Performance Expectations, Visual Direction, Constraints, Success Criteria,
Limitations, Confidence Summary, Evidence Summary, Lineage, and Diagnostics.

Business-to-website mapping model: Business Goals -> Website Objectives;
Audience -> Navigation priorities; Offerings -> Content hierarchy; Brand ->
Visual direction; Business Intent -> Customer journey; Knowledge -> Trust
content. These are transformations of understanding, not implementation.

Experience principles: the Website Design Brief defines what users should
experience, what users should understand, what users should accomplish, and
what the website should communicate. It never defines HTML, React, CSS,
frameworks, component libraries, providers, or prompt wording.

Relationship model:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rule: Website Design Brief owns website intent only. It never
contains generated HTML, generated React, generated pages, generated
components, generated blocks, provider payloads, prompts, execution artifacts,
publishing artifacts, deployment artifacts, or runtime state.

Manifesto principle: Business understanding defines intent. Website Design
Brief defines experience. Website Generation Package defines generation. GNR8
separates Business, Experience, Generation, and Implementation.

Phase WDB-0 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, AI
integration, prompts, provider adapters, generation, publishing, validation
execution, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase WGP-0 - Website Generation Package Canonical Specification is COMPLETE.

Canonical specification:
`docs/architecture/WEBSITE_GENERATION_PACKAGE_SPECIFICATION.md`.

Canonical definition:
"A deterministic, immutable, provider-neutral, versioned, lineage-aware
generation contract describing the intended website that external generation
systems must create."

The Website Generation Package is provider-neutral, technology-neutral,
implementation-neutral, deterministic, versioned, lineage-aware,
human-readable, and AI-readable. It is not prompt, provider payload, React,
HTML, Vue, Next.js, component tree, published website, execution artifact,
deployment artifact, or runtime state.

Website Generation Package purpose: create one canonical generation contract,
remove provider-specific business logic, separate business intent from
implementation, support multiple AI providers, enable regeneration, enable
comparison, enable validation, and enable future providers.

Recommended Website Generation Package structure: Package Metadata, Business
Context, Business Objectives, Website Objectives, Audience, Business Intent,
Experience Intent, Brand Requirements, Messaging, Visual Direction,
Information Architecture, Navigation Contract, Page Contract, Section
Contract, Content Requirements, Media Requirements, SEO Requirements,
Accessibility Requirements, Performance Requirements, Technical Constraints,
Acceptance Criteria, Validation Contract, Limitations, Confidence, Evidence
Summary, Lineage, and Diagnostics.

Generation Contract model: WGP specifies what must exist, what must be
communicated, what users must accomplish, what business outcomes must be
supported, and what constraints must never be violated. It never specifies
implementation.

Compliance Contract model: WGP contains explicit success expectations later
evaluated by Generation Contract Compliance, including correct business
positioning, brand consistency, complete navigation, complete customer journey,
accessibility, SEO, required content, trust signals, and respected constraints.

Provider-neutral model:

```text
Website Generation Package
-> Provider Adapter
-> Provider Payload
-> External AI
```

Provider adapters serialize. They never redefine meaning. Provider prompts are
disposable projections.

Regeneration model: the same WGP should produce equivalent websites across
providers. Different providers may produce different implementations, but
business meaning must remain invariant.

Relationship model:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rule: Website Generation Package owns generation intent only. It
never contains provider prompts, provider payloads, React, HTML, Vue,
components, blocks, CSS, runtime artifacts, deployment artifacts, published
URLs, execution state, or generated outputs.

Manifesto principle: The Website Generation Package is the canonical
generation contract. Provider prompts are disposable projections. GNR8 owns
meaning. Providers own implementation.

Phase WGP-0 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, validation
execution, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase WGP-1 - Generation Contract Compliance Specification is COMPLETE.

Canonical specification:
`docs/architecture/GENERATION_CONTRACT_COMPLIANCE_SPECIFICATION.md`.

Canonical definition:
"A deterministic, provider-neutral, evidence-backed evaluation comparing a
generated website against the canonical Website Generation Package."

Generation Contract Compliance determines whether contractual intent has been
satisfied. It never evaluates implementation style.

Purpose: verify contractual fulfillment, measure generation completeness,
detect missing requirements, detect violated constraints, support human
approval, support provider comparison, support regeneration, and support
governance.

Compliance model:

```text
Website Generation Package
-> Expected Website Intent
-> Generated Website
-> Observed Website Reality
-> Contract Delta
-> Compliance Report
```

Compliance categories include Business Goals, Audience Representation,
Messaging, Brand Consistency, Navigation, Information Architecture, Customer
Journey, Content Coverage, Trust Signals, Accessibility, SEO, Performance
Expectations, Technical Constraints, Required Assets, and Limitations.

Canonical compliance results are PASS, PARTIAL, FAIL, NOT_APPLICABLE, and
UNKNOWN.

Compliance Report structure: Executive Summary, Overall Compliance Score,
Category Results, Detected Deviations, Missing Requirements, Unexpected
Elements, Constraint Violations, Business Risks, Recommended Actions,
Limitations, Evidence, Version, Lineage, and Diagnostics.

Provider-neutral evaluation model:

```text
Website Generation Package
-> Provider Adapter
-> External AI
-> Generated Website
-> Compliance
```

The same Website Generation Package should be measurable regardless of
provider. Providers may produce different implementation proposals, but
Compliance measures the generated website against the same contractual
reference.

Relationship model:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rule: Generation Contract Compliance never contains provider
prompts, provider payloads, HTML generation, React generation, component
generation, layout generation, publishing artifacts, deployment artifacts,
execution artifacts, or runtime state. It evaluates outcomes only.

Manifesto principles: GNR8 owns contractual meaning. External AI owns
implementation proposals. Compliance determines contractual fulfillment.
Generation quality is measured by contract compliance, not by implementation
technology.

Future direction: Compliance Reports should enable deterministic comparison
between multiple provider outputs generated from the same Website Generation
Package. The Website Generation Package remains the canonical reference.

Phase WGP-1 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, compliance
execution, validation execution, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase WGP-2 - Generation Contract Compliance Report Specification is COMPLETE.

Canonical specification:
`docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REPORT_SPECIFICATION.md`.

Canonical definition:
"A deterministic, provider-neutral, human-readable, lineage-aware report
describing contractual compliance between the Website Generation Package and a
generated website."

Generation Contract Compliance Report is the canonical business-facing report
following AI generation. It explains whether a generated website satisfies the
Website Generation Package, communicates contractual deviations, summarizes
business risks, preserves lineage, and supports Business Approval.

Generation Contract Compliance is the governed evaluation process. Generation
Contract Compliance Report is the human-readable result of that evaluation.
Compliance evaluates. The report explains.

Purpose: explain generation results, support business review, support
approval, explain contractual deviations, summarize business risks, support
provider comparison, support regeneration decisions, and provide auditability.

Recommended report structure: Executive Summary, Generation Overview, Overall
Compliance, Business Compliance, Experience Compliance, Implementation
Compliance, Category Results, Detected Deviations, Missing Requirements,
Unexpected Elements, Constraint Violations, Business Risks, Generation
Readiness, Recommendation, Limitations, Evidence Summary, Lineage, and
Diagnostics.

Recommendation model: Proceed To Approval, Regenerate, Improve Website
Generation Package, Repeat Business Alignment, Insufficient Evidence, and
Human Review Required.

Compliance classification: Business Compliance evaluates approved business
meaning; Experience Compliance evaluates whether the website expresses the
approved intent through the required website experience; Implementation
Compliance evaluates observable package-defined constraints and acceptance
expectations without grading provider craft, framework choice, code style, or
subjective aesthetics.

Generation Readiness states are READY, READY_WITH_LIMITATIONS,
REQUIRES_REGENERATION, REQUIRES_ALIGNMENT, and BLOCKED. Readiness is a
business decision, not a technical score.

Relationship model:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rule: Generation Contract Compliance Report never contains
provider prompts, provider payloads, generated HTML, generated React,
generated components, generated blocks, deployment artifacts, execution
artifacts, runtime state, or publishing state. It communicates business
evaluation only.

Manifesto principles: GNR8 communicates contractual truth before publishing.
GNR8 publishes only after governed business approval. Business approval
accepts contractual fulfillment, not implementation technology.

Phase WGP-2 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, compliance
execution, validation execution, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase WGP-3 - Business Approval Boundary Specification is COMPLETE.

Canonical specification:
`docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md`.

Canonical definition:
"A deterministic, governed business decision confirming that contractual
expectations have been sufficiently satisfied for publishing."

Business Approval governs business acceptance.

It does not govern implementation.

Business Approval is the final business governance checkpoint after
Generation Contract Compliance Report and before Publish. It approves business
intent, not implementation technology, prompts, or providers.

Purpose: approve contractual fulfillment, accept business risk, authorize
publishing, authorize regeneration, require further alignment, protect
business integrity, and maintain governance.

Approval scope: Business Approval evaluates Business Alignment, Website
Design Brief, Website Generation Package, Compliance Report, Business Risks,
Generation Readiness, Limitations, and Recommendations. It never evaluates
HTML, React, Framework, Provider, Prompt, or Coding style.

Approval outcomes are APPROVED, APPROVED_WITH_LIMITATIONS, REGENERATE,
RETURN_TO_ALIGNMENT, and BLOCKED.

Decision responsibility chain:

```text
Compliance
-> Business Approval
-> Publishing
```

Compliance evaluates contractual fulfillment. Business Approval accepts or
rejects the business consequence of that fulfillment. Publishing promotes
only Business Approved output.

Relationship model:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Architectural rule: Business Approval never contains generated HTML, provider
payloads, prompts, deployment artifacts, runtime state, or implementation
artifacts. It governs business decisions only.

Manifesto principles: GNR8 publishes only after governed business approval.
Business approval accepts contractual fulfillment, not implementation
technology.

Phase WGP-3 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, compliance
execution, validation execution, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase UX-0 - Business Journey Specification is COMPLETE.

Canonical specification:
`docs/architecture/BUSINESS_JOURNEY_SPECIFICATION.md`.

Canonical definition:
"The governed human experience through which a business progressively
transforms its business understanding into approved digital experiences."

The Business Journey is the canonical human experience layer above the
existing architecture. It is conversation-driven, business-centric,
goal-oriented, human-governed, provider-neutral, technology-independent,
deterministic in architecture, and adaptive in interaction.

The Business Journey is not a wizard, page flow, screen hierarchy, technical
pipeline, backend workflow, implementation sequence, UI flow, sequence of
screens, prompt strategy, provider integration, generation logic, publishing
implementation, schema, API, runtime state, React, or HTML.

Journey philosophy: the journey begins with understanding; every step
increases business confidence; humans approve understanding before generation;
humans approve business decisions, not AI; the system guides; the human
decides.

Primary actor: Business Owner. Future secondary actors may include Marketing,
Agency, Designer, Developer, Content Editor, Operations, Support, and
Administrators, but the Business Owner remains the canonical journey owner.

Canonical journey stages:

```text
Welcome
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Generation
-> Compliance Review
-> Business Approval
-> Publishing
-> Continuous Evolution
```

Human decisions include Continue, Correct Understanding, Provide Missing
Information, Approve Alignment, Approve Design Intent, Generate, Review
Compliance, Approve Publication, and Continue Improvement. The journey is
decision-driven rather than screen-driven.

Conversation principle: GNR8 interacts primarily through guided business
conversations. Conversation replaces traditional software complexity.
Artifacts are outcomes of conversations. Conversations produce business
understanding.

Journey outputs:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Compliance Report
-> Business Approval
```

Relationship model:

```text
Business Journey
-> Architecture
-> Generation
-> Governance
-> Publishing
```

Canonical separation:

```text
Human Journey
-> Business Understanding
-> Business Governance
-> Website Intent
-> Generation Contract
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Manifesto principles added: GNR8 guides businesses through understanding
before generation. Conversation replaces unnecessary software complexity.
Every artifact exists to support a human business decision. The Business
Journey is the canonical human experience of GNR8.

Future vision: GNR8 should feel like working with an experienced digital
transformation consultant rather than operating a traditional website builder.
Business conversations should naturally produce governed architectural
artifacts.

Phase UX-0 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, wireframes, visual
design, workers, prompts, provider adapters, AI integration, generation,
publishing, runtime state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase DA-0 - Decision Architecture Specification is COMPLETE.

Canonical specification:
`docs/architecture/DECISION_ARCHITECTURE_SPECIFICATION.md`.

Canonical definition:
"A deterministic governance model describing how business decisions progress
through canonical artifacts while preserving lineage and human authority."

Decision Architecture is the canonical governance model that controls how
businesses progress through GNR8. It governs business decisions. It never
governs implementation. Artifacts provide evidence. Humans make decisions.
The architecture determines which decisions are allowed, when they are
allowed, and what new artifacts they authorize.

Decision Architecture is not workflow, UX, or application navigation.
Workflow executes tasks. UX expresses the human experience. Navigation helps
people reach surfaces. Decision Architecture defines deterministic business
authority: what decision is allowed now, which artifact supports it, who owns
it, and what lineage it creates.

Core philosophy: artifacts exist to support decisions; humans remain decision
makers; AI produces proposals; no artifact exists without a business decision;
every decision produces new lineage; understanding precedes generation;
generation precedes approval; approval precedes publishing.

Canonical decision lifecycle:

```text
Evidence
-> Understanding
-> Decision
-> Artifact
-> Next Decision
```

Canonical decision types include Continue, Provide Information, Correct
Understanding, Approve Understanding, Reject Understanding, Approve Alignment,
Return To Discovery, Approve Website Intent, Generate, Review Compliance,
Approve Business, Reject Business, Publish, and Continue Evolution.

Decision ownership: the Business Owner is the canonical owner of business
decisions. Marketing, Agency, Designer, Developer, Administrator, and Future
Roles may contribute evidence, recommendations, review, feasibility, or
governance support, but business decisions always remain business-governed.

Decision preconditions are deterministic. Business Alignment cannot occur
before Business Understanding. Website Design Brief cannot exist before
Alignment. Website Generation Package cannot exist before an approved Website
Design Brief. Generation cannot occur before Website Generation Package.
Publishing cannot occur before Business Approval.

Decision Architecture is graph-based rather than linear. Decisions may repeat,
alignment may return to discovery, generation may repeat, compliance may
return to Website Generation Package, Business Approval may reject or request
regeneration, and business evolution may continue indefinitely.

Relationship model:

```text
Business Journey
-> Decision Architecture
-> Canonical Artifacts
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Future vision: GNR8 should behave like an experienced strategic advisor.
Every recommendation should ultimately support a business decision. Decision
Architecture should remain stable even if AI providers change.

Phase DA-0 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, wireframes, workers,
prompts, provider adapters, AI integration, generation, publishing, runtime
state, or deployment behavior.

Validation result: `git diff --check` passes.

Phase DA-1 - Decision Artifact Authorization Matrix Specification is
COMPLETE.

Canonical specification:
`docs/architecture/DECISION_ARTIFACT_AUTHORIZATION_MATRIX.md`.

Canonical definition:
"A deterministic governance model defining which business decisions authorize
each canonical artifact and under which prerequisites."

The Decision Artifact Authorization Matrix is the canonical authorization
layer inside Decision Architecture. It defines which business decision
authorizes each canonical artifact, which predecessor artifacts and decisions
are required, what governance state is required, what lineage must be
preserved, what confidence is required, and what alignment state must exist.

Canonical authorization chain:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment Decision
-> Business Alignment Artifact
-> Website Design Decision
-> Website Design Brief
-> Generation Decision
-> Website Generation Package
-> Generation Execution Decision
-> Generated Website Proposal
-> Compliance Review Decision
-> Generation Contract Compliance Report
-> Business Approval Decision
-> Business Approval
-> Publishing Decision
-> Published Experience
```

Authorization rules: every artifact requires an explicit authorizing decision;
no downstream artifact may bypass upstream authorization; no artifact may
authorize itself; authorization preserves lineage; supersession creates new
lineage; nothing overwrites previous artifacts.

Supersession model: superseded artifacts remain immutable. New decisions
create new artifacts. Lineage records the transition. No history is deleted.

Decision-to-artifact relationships include one decision to one artifact, one
decision to multiple artifacts, and multiple decisions to one artifact. Each
pattern is allowed only when authority, prerequisites, lineage, governance
state, confidence, and alignment state remain explicit.

Relationship model after DA-1:

```text
Decision Architecture
-> Authorization Matrix
-> Canonical Artifacts
-> Business Journey
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Phase DA-1 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, runtime behavior,
or deployment behavior.

Validation result: `git diff --check` passes.

Phase DA-2 - Canonical Artifact Governance State Model is COMPLETE.

Canonical specification:
`docs/architecture/CANONICAL_ARTIFACT_GOVERNANCE_STATE_MODEL.md`.

Canonical definition:
"A deterministic business governance lifecycle describing the maturity and
approval status of a canonical artifact."

Every canonical artifact has a governance state. Governance State records the
business maturity and approval status of a canonical artifact version. It is
independent of implementation and represents business maturity and governance
readiness.

Canonical Governance States:

```text
Observed
Draft
Reviewed
Aligned
Approved
Superseded
Archived
Rejected
Blocked
```

Canonical forward transition model:

```text
Observed
-> Reviewed
-> Aligned
-> Approved
-> Superseded
-> Archived
```

Canonical draft transition model:

```text
Observed
-> Draft
-> Reviewed
-> Aligned
-> Approved
-> Superseded
-> Archived
```

Rejected and Blocked are governed maturity states with legal return or archive
paths. Return To Review is a legal transition pattern, not a canonical state.
No illegal transition may skip required review, alignment, approval,
supersession, or lineage.

Governance State is not workflow and not authorization. Workflow executes
tasks. Authorization determines whether a business decision may affect an
artifact. Governance State records the artifact's maturity after that
authorization.

State ownership: the Business Owner is the canonical owner of artifact
governance decisions. Marketing, Agency, Administrator, and Future Roles may
review, recommend, resolve blockers, operate governance support, or transition
artifacts only within delegated business authority.

Relationship model after DA-2:

```text
Decision
-> Authorization
-> Governance State
-> Artifact
-> Business Journey
```

Governance State is independent from provider, implementation, runtime, UI,
generation, publishing, prompts, provider adapters, workers, APIs, schemas,
persistence, and deployment. It never contains implementation, runtime
behavior, schema, provider logic, generation logic, or publishing
implementation.

Phase DA-2 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, runtime behavior,
or deployment behavior.

Validation result: `git diff --check` passes.

Phase DA-3 - Canonical Artifact Lineage and Versioning Model is COMPLETE.

Canonical specification:
`docs/architecture/CANONICAL_ARTIFACT_LINEAGE_AND_VERSIONING_MODEL.md`.

Canonical definitions:

"The immutable chain describing how governed business artifacts originate,
evolve, authorize successors, and preserve business history."

"A deterministic revision of the same business artifact within the same
lineage."

Lineage preserves history. Versioning preserves evolution. Neither lineage nor
versioning may ever overwrite business truth.

Core philosophy:

```text
History is never rewritten.
Every decision creates traceability.
Superseded artifacts remain valid historical records.
Business evolution is additive.
Lineage preserves truth.
Versioning preserves refinement.
```

Canonical lineage continuity:

```text
Business Discovery
-> Digital Business Twin v1
-> Digital Business Twin v2
-> Business Understanding Report v3
-> Business Alignment v2
-> Website Design Brief v4
-> Website Generation Package v7
```

Lineage is the immutable business-history chain across predecessor artifacts,
authorizing decisions, governance states, versions, supersession, and
downstream consequences. Versioning is the deterministic revision model for
the same business artifact within the same lineage.

New versions are required for minor refinement, major refinement, business
correction, new evidence, new alignment, new approval, and regeneration when
governed meaning, readiness, authority, confidence, alignment, or downstream
eligibility changes.

New lineage is created when the governed business chain branches, restarts, or
produces a successor artifact that is not merely a revision of the same
artifact. Canonical causes include a new Business Discovery origin, new
business scope, new Experience Domain manifestation, new Business Intent,
return to discovery that changes source understanding, corrective fork from a
rejected or blocked path, new Published Experience family, or major
continuous-evolution cycle.

Canonical lineage events are Created, Updated, Reviewed, Aligned, Approved,
Superseded, Archived, Rejected, Regenerated, and Published.

Relationship model after DA-3:

```text
Reality
-> Evidence
-> Knowledge
-> Decision
-> Authorization
-> Governance State
-> Lineage
-> Version
-> Artifact
-> Business Journey
```

Lineage never stores implementation, provider payloads, prompts, runtime
state, React, HTML, generated code, or deployment artifacts. It preserves
business evolution only.

Decision Architecture is COMPLETE. The governance architecture now consists
of:

```text
Decision Model
-> Authorization
-> Governance State
-> Lineage
-> Versioning
-> Canonical Artifacts
-> Business Journey
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Future GNR8 should allow any historical digital experience to be reconstructed
from governed lineage without ambiguity.

Phase DA-3 changed documentation and architecture only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, publishing, runtime behavior,
or deployment behavior.

Validation result: `git diff --check` passes.

Historical DA-3 closeout: Phase DA-3 - Canonical Artifact Lineage and
Versioning Model is complete.
Historical DA-3 next recommendation: ARCH-1 Canonical Architecture Index
Reconciliation, documentation only.

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
- Implemented: Reconstruction Input Contract, deterministic readiness levels (`NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, `HIGH_CONFIDENCE`), blocker model, readiness evaluation helpers, Site Workspace Reconstruction Readiness projection, metadata-only Reconstruction Planning Gate, metadata-only Reconstruction Candidate Discovery Contract, metadata-only Reconstruction Candidate Review Contract, metadata-only Reconstruction Package Contract, Reconstruction Control Plane Closure, metadata-only Dry Run Boundary Contract, dry-run package contract validation, deterministic Dry Run Simulation Plan contract, Simulation Readiness Review, post-8A-4 Dry Run readiness reassessment, post-8A-6 Dry Run readiness reassessment, post-8A-8 Dry Run readiness reassessment, post-8A-10 Dry Run readiness reassessment, capture-expansion readiness integration for section boundary and navigation evidence, 8B-0 first limited Dry Run design, 8B-1 first limited Dry Run output contract, 8B-2 first limited Dry Run builder design, 8B-3 deterministic first limited Dry Run builder implementation, 8B-4 first limited Dry Run builder reassessment, 8B-5 first limited Dry Run output persistence, 8B-6 admin-only first limited Dry Run trigger design, 8B-7 admin-only first limited Dry Run API trigger implementation, 8B-8 read-only first limited Dry Run surface design, 8B-9 dedicated read-only first limited Dry Run admin surface, 8B-10 end-to-end admin verification, 8B-11 next-boundary reassessment, 8B-12 real-site operational preflight report, 8B-12F production reconstruction readiness inventory audit, 8B-12G production Evidence Capture worker readiness root-cause audit, 8B-12H production rendered-capture worker readiness endpoint, 8B-12I production worker env configuration verification, 8B-12K rendered capture smoke-test failure report, 8B-12K-F1 existing siteVersion source rehydration audit, 8B-12K-F2 rendered capture raw import artifact source resolution fallback, 8B-12K-Retry worker-not-reached retry report, 8B-12K-Retry-F1 operational worker config injection finding, 8B-12K-Retry-F2 worker-env smoke retry worker HTTP error finding, 8B-12K-Retry-F3 worker HTTP 404 route diagnosis, 8B-12K-Retry-F4 worker capture route entrypoint alignment, 8B-12K-Retry-F5 rendered capture smoke retry after route alignment, 8B-12K-Retry-F6 worker-accessible source delivery diagnosis, and 8B-12K-F6.5 production capture execution path audit.
- Partially implemented: evidence can be normalized and evaluated for readiness, enriched evidence can be compared with baseline evidence, capture-expansion evidence can be evaluated for route/navigation/section model support, readiness can be evaluated for planning eligibility, planning output can be evaluated for candidate discovery eligibility, completed discovery package metadata can be evaluated for human review eligibility, reviewed candidate metadata can be packaged for future dry-run reconstruction, a Reconstruction Package can be evaluated for future Dry Run eligibility, an approved Reconstruction Package can produce a valid planned Dry Run Package contract without execution, a planned Dry Run Package can produce a deterministic Simulation Plan without simulation execution, a `ReconstructionDryRunPackage` can build a valid first limited output containing route/navigation/section models from existing evidence only, and that `FirstLimitedDryRunOutput` can now be persisted, triggered through a superadmin-only API, inspected through a dedicated read-only superadmin page, and verified end to end as an admin-only diagnostic flow. The current state now has real layout geometry evidence, deterministic section boundary evidence, deterministic navigation evidence, an 8B-1 contract-only first limited Dry Run output shape, an 8B-2 mapping design, an 8B-3 pure builder for constructing route/navigation/section models from existing evidence, an 8B-5 persistence boundary, an 8B-6 trigger design, an 8B-7 API trigger, an 8B-8 read-only surface design, an 8B-9 read-only admin diagnostics page, 8B-10 end-to-end admin verification, an 8B-12 finding that checked real imported site versions do not contain the required persisted baseline/package inputs for operational trigger verification, an 8B-12F inventory proving all 14 production imported site versions are blocked before Evidence Capture baseline readiness, an 8B-12G root-cause audit showing the block is platform/worker readiness before usable rendered capture, an 8B-12H superadmin readiness endpoint to verify worker config and health before imports depend on it, and an 8B-12I Vercel env/config verification document that defines what must exist before the live check. Meaningful Dry Run execution still requires production Evidence Capture baseline availability, runtime mutation evidence, and candidate discovery/review execution.
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

## Phase 8E Reconstruction Package

Phase 8E-6 - Reconstruction Package Persistence Implementation is COMPLETE.

The canonical module is
`apps/platform/gnr8/architecture/reconstruction-package-contract.ts`. It
defines `ReconstructionPackage`, `ReconstructionPackageCandidateRef`,
`ReconstructionPackageLineage`, `ReconstructionPackageEligibilitySummary`,
`ReconstructionPackageValidationResult`, and `ReconstructionPackageStatus`.

Allowed statuses are `planned`, `valid`, `invalid`, `blocked`, and `stale`.
Only approved candidate refs may be included. Exact Candidate Review artifact,
Candidate Discovery artifact, site-version, dry-run, and authorizing Review
Event lineage is retained. Rejected, deferred, unreviewed, stale, and
superseded candidates do not enter the approved candidate list.

`validateReconstructionPackage(...)` validates required and matching lineage,
approved-only inclusion, eligibility counts, and recursive generated,
planning, execution, deployment, and publishing field prohibitions.
`createBlockedReconstructionPackage(...)` produces a metadata-only blocked
shape with zero approved refs when an authorizing package cannot be formed.

No builder, persistence, structure planning, reconstruction, AI, generated
output, execution, publishing, migration, schema, worker, API, or UI behavior
was added in Phase 8E-1.

Phase 8E-2 defines the pure deterministic mapping from one exact latest
`CandidateReviewPackage` artifact and its linked `CandidateDiscoveryResult`
into the 8E `ReconstructionPackage` contract. Only latest approved decisions
are included. Rejected, deferred, unreviewed, superseded, stale, and
missing-candidate decisions are excluded. Package identity is derived from the
Review Package artifact ID plus contract version. Status rules cover `valid`,
`blocked`, `stale`, and `invalid`; limitations and diagnostics are propagated
or generated deterministically without planning or generation.

No builder implementation, persistence, structure planning, reconstruction,
AI, generated output, execution, publishing, migration, schema, worker, API,
UI, or behavior was added in Phase 8E-2.

Phase 8E-3 implements that mapping in
`apps/platform/gnr8/architecture/reconstruction-package-builder.ts`.
The builder takes one exact `CandidateReviewPackage`, the linked
`CandidateDiscoveryResult`, the source Candidate Review Package artifact ID,
and the current latest Candidate Review Package artifact ID. It returns a
metadata-only `ReconstructionPackage` with deterministic identity, approved
candidate refs, eligibility counts, propagated limitations, builder blockers,
and diagnostics, then validates the result with
`validateReconstructionPackage(...)`.

Phase 8E-4 validates the pure builder against real ODV and ViroiDoc artifacts
without persistence. Supplied Review artifacts remained loadable but were
stale relative to current latest heads, and the builder correctly produced
`stale` metadata packages for those historical inputs. Current latest heads
produced `valid` metadata packages: ODV included `3` approved candidates and
excluded `1`; ViroiDoc included `1` approved Route candidate and excluded `4`.
Forbidden fields remained absent in all package outputs.

No persistence, structure planning, reconstruction, AI, generated output,
execution, publishing, migration, schema, worker, API, UI, latest-pointer
mutation, or behavior change was added in Phase 8E-4.

Phase 8E-5 defines the persistence boundary for immutable Reconstruction
Package artifacts without implementing it. The recommended storage is the
existing site-version provenance artifact boundary, using canonical kind
`reconstruction_package`, append-only `reconstructionPackageArtifacts`, and
`latestReconstructionPackageArtifact`. Metadata includes artifact identity,
package identity, authorizing Review artifact, linked Discovery artifact, site
version, dry run, status, counts, timestamps, and contract version.

The idempotency model reuses an equivalent package for the same Review artifact
and contract version, appends changed current packages, rejects invalid
packages, and rejects packages that are already stale relative to the latest
Review Package pointer. The staleness policy persists only `valid` or `blocked`
packages; historical artifacts that later become stale remain loadable but are
not latest for new Structure Planning. Pre-write validation must run
`validateReconstructionPackage(...)`, enforce the forbidden-field guard, check
lineage, and compare against the latest Review Package head when latest-only
enforcement is active.

No persistence helper, provenance field, latest-pointer mutation, Structure
Planning package, reconstruction, AI, generated output, execution, publishing,
migration, schema, worker, API, UI, Review API, Review UI, or behavior change
was added in Phase 8E-5.

Phase 8E-6 implements durable Reconstruction Package persistence in
`apps/platform/gnr8/architecture/reconstruction-package-persistence.ts`.
The helper surface is limited to `persistReconstructionPackage(...)`,
`loadLatestReconstructionPackage(...)`, and
`loadReconstructionPackageById(...)`.

The implementation persists `valid` and `blocked` metadata-only packages as
canonical `reconstruction_package` artifacts inside the existing site-version
`import_provenance_summary`, with append-only
`reconstructionPackageArtifacts` and
`latestReconstructionPackageArtifact`. Persisted metadata includes
`reconstructionPackageId`, `candidateReviewPackageArtifactId`,
`candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, `status`,
`includedCount`, `excludedCount`, `approvedCount`, `contractVersion`,
`createdAt`, and `persistedAt`.

Persistence validates with `validateReconstructionPackage(...)`, checks exact
Review/Discovery/site-version/dry-run lineage, requires the authorizing
Candidate Review artifact to be the current latest head for the lineage, and
rejects `stale`, `invalid`, forbidden-field, missing-artifact, and
lineage-mismatch inputs before write. Equivalent retries reuse the latest
artifact. Changed current packages append a new immutable artifact and advance
the latest pointer. Read helpers are site-version scoped and return cloned
records without repairing, rebuilding, planning, generating, executing,
publishing, or mutating provenance.

No Structure Planning package, reconstruction, AI, generated output,
execution, publishing, migration, schema, worker, API, UI, Review API, Review
UI, Evidence Capture, Candidate Discovery, Candidate Context, Candidate
Review, or Review Actions behavior was changed in Phase 8E-6.

Phase 8E-7 validates Reconstruction Package persistence against the real
latest ODV and ViroiDoc Candidate Review Package artifacts. The validation
loaded the latest Review Package, loaded the linked Candidate Discovery Result,
built a `ReconstructionPackage`, persisted it through
`persistReconstructionPackage(...)`, reloaded it through both
`loadLatestReconstructionPackage(...)` and
`loadReconstructionPackageById(...)`, and retried persistence to confirm
idempotent reuse.

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` persisted
`reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` from latest Review
artifact `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` and
linked Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`.
The package status is `valid`, with `3` included, `1` excluded, and `3`
approved candidates.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` persisted
`reconstruction_package_0e143f5fc174668e2225f73ebe464ffb` from latest Review
artifact `candidate_review_package_ecb5f777160a45e15b958948348bca08` and linked
Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`.
The package status is `valid`, with `1` included, `4` excluded, and `1`
approved candidate.

Both targets reloaded by latest pointer and exact artifact ID, exact package
payloads matched, retries reused the same artifact without appending, lineage
and metadata checks passed, and forbidden-field scans found no Structure Plan,
AI output, generated content, publishing artifact, deployment artifact, or
execution artifact. Detailed evidence:
`docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.

No Structure Planning package, reconstruction, AI, generated output,
execution, publishing, migration, schema, worker, API, UI, Review API, Review
UI, Evidence Capture, Candidate Discovery, Candidate Context, Candidate
Review, Review Actions behavior, or runtime behavior was changed in Phase
8E-7.

Phase 8F-0 - Structure Planning Foundation Design is COMPLETE. The canonical
Structure Plan is a deterministic, metadata-only planning artifact that
organizes approved candidates from one exact latest `ReconstructionPackage`
artifact into planned routes, planned navigation, planned sections, and exact
candidate assignments. It answers how approved candidates are organized, not
what is eligible and not how a website is generated.

The only authorizing input is the exact latest Reconstruction Package artifact.
Only included approved candidates already present in that package participate.
The plan may retain Review, Discovery, Candidate Context, Limited Dry Run, and
Evidence Capture refs as copied lineage, but those refs cannot add candidates
or infer target structure independently. Candidate assignments must reconcile
with the package included count and fail closed on missing, stale, invalid, or
foreign package lineage.

Recommended identity is deterministic:
`structure-plan:<reconstructionPackageArtifactId>:<structurePlanContractVersion>`.
This ties one plan meaning to one exact package artifact and contract version,
rejects caller-supplied IDs, and keeps later package heads or contract changes
from silently rewriting historical plan meaning. Detailed design:
`docs/architecture/STRUCTURE_PLANNING_FOUNDATION.md`.

Phase 8F-0 changed documentation only. It added no Structure Plan contract or
builder implementation, no persistence, no generated React, no generated
blocks, no generated content, no AI outputs, no publishing artifact, no
deployment artifact, no execution artifact, no schema, no worker, no API, no
UI, and no behavior change to Evidence Capture, Candidate Discovery, Candidate
Review, Review Actions, Candidate Context, Reconstruction Package,
generation, or publishing systems.

Phase 8F-1 - Structure Planning Contract is COMPLETE. It creates
`apps/platform/gnr8/architecture/structure-plan-contract.ts` and focused tests
in `apps/platform/gnr8/architecture/structure-plan-contract.test.ts`.
Contract types include `StructurePlan`, planned route/navigation/section
metadata, candidate assignments, exact lineage, validation result, and the
allowed `StructurePlanStatus` values `planned`, `valid`, `invalid`, `blocked`,
and `stale`.

Validation enforces deterministic identity from the exact Reconstruction
Package artifact, required lineage and top-level consistency, candidate
participation from included approved package refs only, one assignment per
included candidate for active plans, uniqueness across planned objects and
assignments, target compatibility, stale historical warnings, and recursive
rejection of generated React, generated blocks/content/components, AI outputs,
structure instructions, publishing artifacts, deployment artifacts, and
execution artifacts. `createBlockedStructurePlan(...)` creates a
metadata-only blocked plan for no eligible candidates, invalid lineage, or
stale Reconstruction Package input.

Phase 8F-1 added no builder, persistence, AI, generation, publishing, schema,
worker, API, UI, Evidence Capture, Candidate Discovery, Candidate Review,
Candidate Context, Review Actions, Reconstruction Package, or runtime behavior
change.

Phase 8F-2 - Structure Planning Builder Design is COMPLETE. It creates
`docs/architecture/STRUCTURE_PLANNING_BUILDER_DESIGN.md` and defines how a
future deterministic builder converts one exact latest
`ReconstructionPackage` artifact into a metadata-only `StructurePlan`.

The builder purpose is pure organization: approved package candidates become
planned routes, planned navigation, planned sections, and exact assignments.
The builder does not infer new candidates, generate React, generate
components, generate blocks, generate content, call AI, publish, execute, or
persist anything. The required first implementation input is the exact latest
persisted `ReconstructionPackage` artifact record with latest-head proof and
valid package payload. Candidate Discovery Result, Candidate Context
Projection, and Candidate Review Package may support diagnostics only; they
cannot authorize candidates or infer target structure.

Route planning creates one planned route per approved route candidate when a
deterministic route path is present. Navigation planning creates one planned
navigation entry per approved navigation candidate when route association is
explicit or unambiguous. Section planning creates one planned section per
approved section candidate when route association is explicit or unambiguous,
with per-route source-order section ordering. Each included approved candidate
should produce exactly one assignment unless blocked.

Ordering is deterministic only: routes by route path/source order, navigation
by route/source order, sections by route/source order, and assignments by
source package order. The design forbids AI sorting, design-intent heuristics,
layout importance ranking, content inference, and upstream querying for hidden
planning inputs.

Status rules are `valid` when all included candidates assign and contract
validation passes, `blocked` for no included candidates or missing required
lineage/blocked assignments, `stale` when the Reconstruction Package is not
latest, and `invalid` when package or Structure Plan contract validation
fails. Limitations propagate Reconstruction Package limitations,
candidate-specific limitations when available, and deterministic builder
blockers. Diagnostics include route, navigation, section, and assignment
counts; blocked candidates; lineage validation; latest-package validation;
ordering decisions; and contract validation.

Phase 8F-2 changed documentation only. It added no builder implementation,
persistence, AI, generation, publishing, schema, workers, API, UI, Evidence
Capture behavior, Candidate Discovery behavior, Candidate Context behavior,
Candidate Review behavior, Review Actions behavior, Reconstruction Package
behavior, StructurePlan contract changes, or runtime behavior.

Phase 8F-3 - Structure Planning Builder Implementation is COMPLETE. It adds
`apps/platform/gnr8/architecture/structure-plan-builder.ts` and
`apps/platform/gnr8/architecture/structure-plan-builder.test.ts`.

The builder is pure and deterministic. Inputs are the exact
`ReconstructionPackage` payload, the exact persisted
`reconstructionPackageArtifactId`, the latest Reconstruction Package artifact
ID for stale detection, and the Structure Plan contract version override only
for tests. Output is a metadata-only `StructurePlan` with identity
`structure-plan:<reconstructionPackageArtifactId>:8F-1` and validation through
`validateStructurePlan(...)`.

Route candidates create planned routes from explicit route paths only.
Navigation candidates create planned navigation entries when route association
is explicit or unambiguous. Section candidates create planned sections when
route association is explicit or unambiguous, with per-route deterministic
section ordering. Valid plans create one assignment per successfully planned
included approved candidate. Blocked plans remain assignment-free per the
8F-1 contract and report blocked candidates in limitations and diagnostics.

Status rules are implemented as `valid` for fully planned/assigned and
validated output, `blocked` for no included candidates or
missing/ambiguous route association, `stale` for non-latest Reconstruction
Package artifacts, and `invalid` for source or Structure Plan validation
failure. Limitations propagate Reconstruction Package limitations,
candidate-specific limitations when present, and builder blockers. Diagnostics
include planned route/navigation/section counts, assignment count, included
candidate count, blocked candidates, stale detection, source package
validation, and Structure Plan validation.

Phase 8F-3 added no persistence, AI, generation, publishing, schema, workers,
API, UI, Evidence Capture behavior, Candidate Discovery behavior, Candidate
Context behavior, Candidate Review behavior, Review Actions behavior,
Reconstruction Package behavior, StructurePlan contract changes, migrations,
deployment artifacts, or runtime execution.

Phase 8F-4 - Structure Planning Real-Artifact Validation is COMPLETE. It
loaded the exact real ODV and ViroiDoc Reconstruction Package artifacts through
the existing Reconstruction Package persistence helpers, confirmed each target
artifact was latest, built `StructurePlan` values with
`buildStructurePlan(...)`, validated the outputs, and verified that forbidden
generated, AI, publishing, deployment, and execution fields remained absent.

ODV produced a `valid` Structure Plan with `1` planned route, `0` planned
navigation entries, `2` planned sections, `3` assignments, and `0` blocked
candidates from
`reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`.

ViroiDoc produced a `valid` Structure Plan with `1` planned route, `0` planned
navigation entries, `0` planned sections, `1` assignment, and `0` blocked
candidates from
`reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`. Its `36`
limitations are propagated source Reconstruction Package limitations and did
not block validation.

Detailed evidence:
`docs/architecture/STRUCTURE_PLANNING_REAL_ARTIFACT_VALIDATION.md`.

Phase 8F-4 found no builder defect and changed no behavior. It added no
Structure Plan persistence, AI, generation, publishing, schema, worker, API,
UI, migration, deployment artifact, execution artifact, or runtime execution.

Phase 8F-5 - Structure Plan Persistence Boundary Design is COMPLETE. It
creates `docs/architecture/STRUCTURE_PLAN_PERSISTENCE_BOUNDARY.md` and defines
how a future implementation should persist validated Structure Plan artifacts.

The storage recommendation is the existing site-version provenance artifact
boundary. The canonical artifact kind is `structure_plan`; the designed
storage shape is append-only `structurePlanArtifacts` plus
`latestStructurePlanArtifact`.

Persisted metadata should include artifact identity, artifact kind,
`structurePlanId`, exact `reconstructionPackageArtifactId`, copied
`candidateReviewPackageArtifactId`, copied `candidateDiscoveryArtifactId`,
`siteVersionId`, `dryRunId`, status, planned route/navigation/section counts,
assignment count, blocked candidate count, `createdAt`, `persistedAt`, and
contract version.

Idempotency rules reuse an equivalent latest plan for the same Reconstruction
Package artifact and contract version, append changed current plans, and reject
stale, invalid, forbidden-field, and lineage-mismatch plans before write. The
staleness policy persists only `valid` or `blocked`; `stale` and `invalid`
outputs remain non-persisted.

Validation before persist requires `validateStructurePlan(...)`, recursive
forbidden-field rejection, exact lineage checks, latest Reconstruction Package
artifact verification, and reconciliation of included candidate refs/counts
against the resolved package payload. Future helper design is limited to
`persistStructurePlan(...)`, `loadLatestStructurePlan(...)`, and
`loadStructurePlanById(...)`.

Phase 8F-5 changed documentation only. It added no persistence, provenance
field, latest pointer mutation, schema, table, migration, worker, API, UI,
Content Planning, Layout/Block Planning, AI, generation, publishing,
StructurePlan contract change, StructurePlan builder change, Reconstruction
Package change, execution artifact, deployment artifact, or runtime behavior.

Phase 8F-6 - Structure Plan Persistence Implementation is COMPLETE. It adds
the `structure_plan` persistence helper in
`apps/platform/gnr8/architecture/structure-plan-persistence.ts` and focused
tests in
`apps/platform/gnr8/architecture/structure-plan-persistence.test.ts`.

The helper persists valid or blocked Structure Plans through the existing
site-version provenance artifact boundary, appending `structurePlanArtifacts`
and advancing `latestStructurePlanArtifact` only after contract validation,
latest Reconstruction Package verification, exact lineage checks, and package
candidate/count reconciliation pass.

Metadata persisted includes `structurePlanId`,
`reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`,
`candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, status, planned
route/navigation/section counts, assignment count, blocked candidate count,
contract version, `createdAt`, and `persistedAt`.

Idempotency reuses equivalent latest artifacts. Changed current plans from a
newer latest Reconstruction Package artifact append and advance latest. Stale,
invalid, forbidden-field, invalid-lineage, missing-package,
non-latest-package, and package-reconciliation failures reject before write.

Phase 8F-6 added no Content Planning, Layout Planning, AI, generation,
publishing, schema, worker, API, UI, StructurePlan contract change,
StructurePlan builder change, Reconstruction Package change, or runtime
generation behavior.

Validation passed: focused Structure Plan persistence tests and
`cd apps/platform && pnpm run vercel-build`.

Phase 8F-7 - Structure Plan Persistence Real-Artifact Validation is COMPLETE.
Canonical evidence:
`docs/architecture/STRUCTURE_PLAN_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` persisted
`structure_plan_08e12e859e457d5ac15870ce2892c817` from latest Reconstruction
Package `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`. The
persisted Structure Plan is `valid`, with `1` planned route, `0` planned
navigation entries, `2` planned sections, `3` assignments, and `0` blocked
candidates.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` persisted
`structure_plan_7b73cf96b695da6ba0103fb30ad306a0` from latest Reconstruction
Package `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`. The
persisted Structure Plan is `valid`, with `1` planned route, `0` planned
navigation entries, `0` planned sections, `1` assignment, and `0` blocked
candidates.

For both targets, latest Structure Plan reload and by-ID reload returned the
same exact artifact, lineage and metadata checks passed, and idempotent retry
reused the same artifact without appending a duplicate. The persisted artifacts
contain no Content Plan, Layout Plan, AI output, generated content/components,
publishing artifact, deployment artifact, execution artifact, or worker job.

Phase 8F-7 changed no behavior. It added no Content Planning, Layout Planning,
AI, generation, publishing, schema, worker, API, UI, StructurePlan contract
change, StructurePlan builder change, Reconstruction Package change, or runtime
generation behavior.

Phase 8F-8 - Structure Plan Read-Only Surface Design is COMPLETE. The canonical
design is `docs/architecture/STRUCTURE_PLAN_SURFACE_DESIGN.md`.

It recommends a dedicated admin Structure Plan page for read-only inspection of
persisted `structure_plan` artifacts. The surface shows artifact metadata,
lineage, planned routes, planned navigation, planned sections, assignment
mappings, summary counts, limitations, diagnostics, and validation state while
making clear that the artifact is not generated website output.

The designed `StructurePlanSurfaceProjection` includes artifact metadata,
lineage, summary counts, grouped planned routes/navigation/sections,
assignments, limitations, diagnostics, validation, and state for missing,
invalid, stale, blocked, valid-without-navigation, valid-without-sections,
limitations-present, and ready-for-inspection cases.

Phase 8F-8 changed documentation only. It added no UI implementation, route,
API, loader, persistence helper, Evidence Capture change, Candidate Discovery
change, Candidate Context change, Candidate Review change, Review Actions
change, Reconstruction Package change, StructurePlan contract change,
StructurePlan builder change, StructurePlan persistence change, AI system,
generation system, publishing system, schema, worker, or runtime behavior.

Phase 8F-9 - Structure Plan Read-Only Surface Implementation is complete.
- Admin route: `apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx`.
- Projection: `apps/platform/gnr8/architecture/structure-plan-surface-projection.ts`.
- Surface: superadmin-guarded, read-only Overview, Lineage, Plan Summary,
  Planned Routes, Planned Navigation, Planned Sections, Assignments, and
  Diagnostics sections.
- States: missing, blocked, stale, valid, limitations present, no navigation,
  and no sections.
- Safety: no buttons, forms, inputs, edit controls, AI controls,
  reconstruction controls, generation controls, publishing controls, execution
  controls, retry controls, approval controls, Content Planning, Layout
  Planning, AI, generation, publishing, mutations, schema, workers,
  StructurePlan contract changes, StructurePlan builder changes, or
  StructurePlan persistence changes.
- Validation result: focused Structure Plan surface tests pass; `cd
  apps/platform && pnpm run vercel-build` passes; `git diff --check` passes.

Phase 8F-10 - Structure Plan End-to-End Verification is complete.
- Canonical evidence: `docs/architecture/STRUCTURE_PLAN_E2E_VERIFICATION.md`.
- Chain verified: persisted `structure_plan` artifact -> latest loader ->
  `StructurePlanSurfaceProjection` -> dedicated read-only admin page.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`: latest Structure Plan
  `structure_plan_08e12e859e457d5ac15870ce2892c817`; projection `valid`; `1`
  route, `0` navigation, `2` sections, `3` assignments, `0` blocked
  candidates; `no_navigation` attention state; planned route/section/assignment
  rows visible.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`: latest Structure Plan
  `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`; projection `valid`; `1`
  route, `0` navigation, `0` sections, `1` assignment, `0` blocked
  candidates; `limitations_present`, `no_navigation`, and `no_sections`
  attention states.
- Lineage: both projections preserve current Reconstruction Package, Review
  Package, Discovery Result, `siteVersionId`, and `dryRunId` lineage.
- Page result: dynamic admin route compiles and is included in production
  build; unauthenticated browser requests redirect to `/login` through the
  superadmin guard; authenticated artifact display is covered by live
  loader/projection checks, page source, tests, and build route output.
- Safety: no buttons, forms, inputs, AI controls, generation controls,
  publishing controls, execution controls, retry controls, approval controls,
  edit controls, Content Planning controls, Layout Planning controls, schema,
  workers, API behavior, UI mutation behavior, or Structure Plan behavior
  changes.
- Validation result: focused Structure Plan persistence/projection/page tests
  pass `16 / 16`; `cd apps/platform && pnpm run vercel-build` passes with
  existing unrelated lint warnings and includes the dynamic Structure Plan
  route; `git diff --check` passes.

Phase 8F-11 - Post-Structure Plan Boundary Reassessment is complete.
- Canonical assessment:
  `docs/architecture/POST_STRUCTURE_PLAN_BOUNDARY_REASSESSMENT.md`.
- Recommendation: Phase 8G-0 - Layout Plan Foundation.
- Decision: the next boundary after StructurePlan is metadata-only
  LayoutPlan, not ContentPlan, Intent / Experience Plan, BlockPlan, or another
  detour.
- Primary layer answer: visual/layout. The next artifact should define
  placement intent, section order/grouping, region roles, navigation placement
  intent, source evidence refs, StructurePlan assignment refs, limitations, and
  diagnostics without generated React, blocks, content, CSS, CMS schema, AI,
  publishing, or editor mutation.
- Canonical input: latest persisted `StructurePlan` artifact, exact linked
  Reconstruction Package artifact, and supporting Candidate Review, Candidate
  Discovery, Candidate Context, Evidence Capture, `dryRunId`, and
  `siteVersionId` lineage refs.
- Deferred: ContentPlan until layout anchors exist; Intent / Experience Plan
  until semantic purpose can attach to stable layout/content entities;
  BlockPlan until layout, content, and design constraints exist.
- AI-editor alignment: keeps import evidence, code generation, content
  modeling, editor proposals, and publish flow separate while preparing
  placement anchors for future governed editing.
- Digital Twin alignment: advances operational understanding of visual
  organization without becoming HTML replay, a recommendation, proposal,
  mutation, generated frontend, or publishable artifact.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Review Actions,
  Reconstruction Package, StructurePlan contract, StructurePlan builder,
  StructurePlan persistence, StructurePlan UI, AI, generation, publishing,
  schema, worker, runtime, API, or UI behavior changed.
- Validation result: `git diff --check` passes.
- Reset note: Phase 0 supersedes this recommendation as the active roadmap.
  `LayoutPlan` is no longer the next phase until it is reassessed under the
  AI Orchestrator / Website Understanding Engine architecture.

Phase 0 - GNR8 Architecture Manifesto / AI Orchestrator Reset is complete.
- Canonical manifesto:
  `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`.
- Current architectural reset: GNR8 is an AI Orchestrator with a governed
  Digital Business Twin at its core.
- Product boundary: GNR8 is not a traditional website builder, not a CMS, and
  not a generic page editor.
- Digital Business Twin rule: the DBT is the canonical operational
  understanding of a business and its digital identity; generated websites are
  outputs, not the long-term source of truth.
- Generation rule: generation without understanding is prohibited. The
  orchestrator owns the task; the model executes it. GNR8 must remain
  model-agnostic.
- Governance rule: AI proposes; humans approve. Generation Contract Compliance
  Report before Business Approval is mandatory.
- Business Journey rule: the Business Journey is the canonical human
  experience layer above the existing architecture. It is conversation-driven,
  business-centric, goal-oriented, human-governed, provider-neutral,
  technology-independent, deterministic in architecture, and adaptive in
  interaction.
- Decision Architecture rule: GNR8 is governed by decisions rather than
  workflows. Decision Architecture is the operational backbone of GNR8 and
  preserves human authority through deterministic business decisions,
  prerequisites, artifact authorization, and immutable lineage.
- Authorization Matrix rule: no artifact exists without an authorizing
  business decision. Authorization preserves trust, lineage, and governance.
  Artifacts are authorized, never assumed.
- Governance State rule: every canonical artifact has a governance state.
  Governance State describes artifact maturity and approval status and is
  independent of provider, implementation, runtime, UI, generation, and
  publishing.
- Lineage and Versioning rule: business history is immutable. Every governed
  artifact preserves lineage. Versioning refines understanding; lineage
  preserves evolution.
- Canonical future lifecycle after DA-3: Decision Model -> Authorization ->
  Governance State -> Lineage -> Versioning -> Canonical Artifacts ->
  Business Journey -> External AI -> Compliance -> Business Approval ->
  Publishing.
- Roadmap after DA-3: Business Discovery -> Digital Business Twin -> Business
  Understanding Report -> Business Alignment Decision -> Business Alignment
  Artifact -> Website Design Decision -> Website Design Brief -> Generation
  Decision -> Website Generation Package -> Generation Execution Decision ->
  Generated Website Proposal -> Compliance Review Decision -> Generation
  Contract Compliance Report -> Business Approval Decision -> Business
  Approval -> Publishing Decision -> Published Experience.
- Rejected lifecycle: Website -> Prompt -> Generate React.
- Roadmap reset: do not proceed into LayoutPlan, BlockPlan, or ContentPlan as
  if GNR8 is building a traditional internal website builder, CMS, page editor,
  block schema, or direct React generator.
- Future reassessment areas: LayoutPlan, BlockPlan, ContentPlan, AI Editor
  architecture, publishing flow, Generation Contract Compliance, provider
  orchestration, provider adapters, and external AI serialization formats.
- Safety: documentation and architecture alignment only; no Evidence Capture,
  Candidate Discovery, Candidate Context, Candidate Review, Review Actions,
  Reconstruction Package, StructurePlan, AI integration code, generation
  systems, publishing systems, schema, workers, API, or UI behavior changed.
- Validation result: `git diff --check` passes.

Historical phase marker:
- Phase WU-3 - Business Discovery Input Equivalence and Website Understanding
  Hardening is
  complete.

Current recommended phase:
- WU-7 - Business Discovery Runtime Mode Configuration Design, kept
  design-only unless explicitly authorized to implement runtime mode selection.

Phase MVP-0 officially starts implementation planning after completion of the
canonical architecture. It creates the first executable MVP roadmap:
`docs/architecture/MVP_0_FIRST_EXECUTABLE_PIPELINE.md`.

MVP-0 does not define new architecture. It maps the completed architecture to
the actual codebase and identifies the shortest executable path from imported
website evidence to Business Discovery, Digital Business Twin, Business
Understanding Report, Business Alignment, Website Design Brief, Website
Generation Package, External AI, Generation Contract Compliance, Business
Approval, and Publish.

MVP-0 reality assessment:
- Import Existing Website: MVP-ready from existing runtime.
- Evidence Collection: partial and reusable, with an MVP readiness gate still
  required.
- Business Discovery: canonical runtime artifact, deterministic builder,
  provenance persistence, and ODV/ViroiDoc real-target validation exist.
- Digital Business Twin: canonical runtime artifact, deterministic builder,
  provenance persistence, and focused tests exist; Business Owner confirmation
  and multi-source reconciliation are not implemented.
- Business Understanding Report and Business Alignment: first runtime
  foundations exist, and both have passed ODV/ViroiDoc real-target validation.
- Website Design Brief: first runtime contract, deterministic builder,
  provenance persistence, focused tests, and real-target validation exist.
- Website Generation Package: first runtime contract, deterministic builder,
  validation helper, provider-neutral validation contract, provenance
  persistence, focused tests, and real-target validation exist.
- Provider Adapter: boundary design exists and first runtime Codex task
  ProviderGenerationPayload builder, validator, and provenance persistence now
  exist for `WebsiteGenerationPackageArtifact -> ProviderGenerationPayload`.
  Concrete provider type is `codex`, payload kind is `codex_task`, and artifact
  kind is `provider_generation_payload`. MVP-1H-R validated that real ODV and
  ViroiDoc WGP artifacts produce persisted, reloadable, export-ready Codex
  task provider payloads. MVP-1I defines the governed provider execution
  boundary:
  `ProviderGenerationPayload -> External AI Execution -> Generated Website
  Proposal`.
  MVP-1J defines the manual Codex execution runbook outside GNR8 and the
  future quarantine-first Generated Website Proposal import boundary.
- Generated Website Proposal: MVP-1K-1 implements quarantined import/storage
  of manually generated Codex output bundle metadata under artifact kind
  `generated_website_proposal`, using source ProviderGenerationPayload, source
  WGP lineage, output bundle metadata, operator attestation, fail-closed safety
  validation, provenance latest reuse, changed append, latest load, and by-ID
  load.
- Website Observation and Observed Website Model: MVP-1K-2 defines the
  observation-only boundary from quarantined Generated Website Proposal to
  Observed Website Model. MVP-1K-3 implements the first deterministic
  Observed Website Model runtime foundation with contract, builder, validator,
  focused tests, and `observed_website_model` provenance persistence.
  Observation records what exists from available proposal metadata and does
  not compare, judge compliance, approve, publish, mutate WGP, trust
  providers, or mutate runtime state.
- Generation Contract Compliance: MVP-1K-4 implements the first deterministic
  runtime foundation from Website Generation Package plus Observed Website
  Model only. It creates evidence-backed category results, findings,
  deviations, limitations, confidence, diagnostics, and lineage, then persists
  artifact kind `generation_contract_compliance` with latest reuse,
  append-on-change, latest load, and by-ID load. It does not create a
  Compliance Report, approve, publish, call providers, execute AI, add UI/API,
  add schema/workers, or mutate runtime/business truth.
- Generation Contract Compliance Report: MVP-1K-5 implements the first
  deterministic report runtime foundation from persisted
  GenerationContractComplianceArtifact only. It creates human-readable report
  sections, recommendation, readiness, evidence summary, lineage,
  diagnostics, and artifact kind `generation_contract_compliance_report` with
  latest reuse, append-on-change, latest load, and by-ID load. It explains
  compliance only and does not recompute compliance, approve, publish, call
  providers, execute AI, add UI/API/schema/workers, or mutate runtime/business
  truth. MVP-1K-5-R checked real ODV and ViroiDoc inputs and found no latest
  persisted `GenerationContractComplianceArtifact` for either target, so no
  report was built or persisted. MVP-1K-4-R then checked the real ODV and
  ViroiDoc Compliance inputs and found no latest persisted
  `ObservedWebsiteModelArtifact` for either target, so no Compliance artifact
  was built or persisted.
- External AI and Business Approval: architecture complete, runtime missing.
- Publish: runtime foundations exist, but canonical Business Approval to
  Publish gating for generated proposals is missing.

Shortest MVP path:

```text
Evidence-ready imported site
-> Business Discovery
-> persisted DBT v1
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> one provider adapter
-> Generated Website Proposal
-> Website Observation
-> Observed Website Model
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> existing runtime publish path
```

MVP-0 changed documentation and architecture planning only. It added no
implementation, TypeScript, schema, persistence, API, UI, workers, prompts,
provider adapters, AI integration, generation, or publishing behavior.

Phase MVP-1A creates the first runtime Business Discovery artifact:
`docs/architecture/BUSINESS_DISCOVERY_RUNTIME_BUILDER.md`.

MVP-1A implementation summary:
- `apps/platform/gnr8/architecture/business-discovery-contract.ts` defines
  `BusinessDiscoveryArtifact`, `BusinessDiscoveryLineage`,
  `BusinessDiscoveryDomainSummary`, `BusinessDiscoveryFinding`,
  `BusinessDiscoveryConfidence`, `BusinessDiscoveryValidationResult`, and
  `BusinessDiscoveryStatus`.
- Allowed statuses are `observed`, `partial`, `valid`, `invalid`, `blocked`,
  and `stale`.
- MVP domains are website-derived only: `business_identity`, `offerings`,
  `audience`, `brand`, `digital_presence`, `goals`, `trust`, `content`, and
  `constraints`.
- `apps/platform/gnr8/architecture/business-discovery-builder.ts` implements
  `buildBusinessDiscoveryFromSiteEvidence(...)` as a deterministic builder
  from existing imported website evidence.
- The builder derives conservative findings from source URL/host, route paths,
  navigation labels, section boundary types, asset inventory counts, upstream
  limitations, diagnostics, and optional Candidate Discovery context.
- Missing signals become limitations instead of guesses.
- `apps/platform/gnr8/architecture/business-discovery-persistence.ts` stores
  artifact kind `business_discovery` in the existing site-version
  `importProvenanceSummary`, with append-only history and
  `latestBusinessDiscoveryArtifact`.
- Equivalent latest artifacts are reused; changed current artifacts append;
  latest and by-ID read helpers are implemented.
- Persistence rejects `invalid` and `stale`; explicitly `blocked` artifacts
  are valid fail-closed records.
- Recursive forbidden fields are rejected: `generatedContent`,
  `generatedHtml`, `generatedReact`, `generatedComponents`,
  `generatedBlocks`, `providerPayload`, `prompt`, `aiOutput`,
  `websiteDesignBrief`, `websiteGenerationPackage`, `publishingArtifact`,
  `deploymentArtifact`, and `executionArtifact`.

MVP-1A did not implement Digital Business Twin runtime, Business
Understanding Report, Business Alignment, Website Design Brief, Website
Generation Package, provider adapters, external AI integration, generation,
compliance, Business Approval, publishing changes, UI, API routes, schema
migrations, CRM/ERP/commerce/support domains, or future connector domains.

MVP-1A validation:
- Focused Business Discovery tests pass `15 / 15`.
- `cd apps/platform && pnpm run vercel-build` passes with existing unrelated
  frontend lint warnings.
- `git diff --check` passes.

MVP-1A-R real-target validation:
- Canonical document:
  `docs/architecture/BUSINESS_DISCOVERY_REAL_TARGET_VALIDATION.md`.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` persisted
  `business_discovery_7b37413651d79de0d109e31690a34b62` with status
  `partial`, 12 findings, 104 limitations, 0 blockers, `MEDIUM` confidence,
  and Candidate Discovery lineage
  `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` persisted
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986` with status
  `partial`, 17 findings, 105 limitations, 0 blockers, `MEDIUM` confidence,
  and Candidate Discovery lineage
  `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  all passed for both targets.
- Safety scan found no DBT, Business Understanding Report, Business
  Alignment, Website Design Brief, Website Generation Package, provider
  payload, prompt, AI output, generated content, or publishing artifact.

Phase MVP-1B creates the first runtime Digital Business Twin artifact from
persisted Business Discovery:
`docs/architecture/DIGITAL_BUSINESS_TWIN_RUNTIME_BUILDER.md`.

MVP-1B implementation summary:
- `apps/platform/gnr8/architecture/digital-business-twin-contract.ts` defines
  `DigitalBusinessTwinArtifact`, `DigitalBusinessTwinLineage`,
  `DigitalBusinessTwinDomain`, `DigitalBusinessTwinKnowledgeItem`,
  `DigitalBusinessTwinConfidence`, `DigitalBusinessTwinValidationResult`, and
  `DigitalBusinessTwinStatus`.
- Allowed statuses are `observed`, `partial`, `aligned`, `confirmed`,
  `invalid`, `blocked`, and `stale`.
- MVP domains are Business Discovery-derived only: `business_identity`,
  `offerings`, `audience`, `brand`, `digital_presence`, `goals`, `trust`,
  `content`, and `constraints`.
- `apps/platform/gnr8/architecture/digital-business-twin-builder.ts`
  implements `buildDigitalBusinessTwinFromBusinessDiscovery(...)` as a
  deterministic builder from one Business Discovery artifact.
- Business Discovery findings become DBT knowledge items with deterministic
  IDs, evidence refs, source finding IDs, confidence, limitations, and
  diagnostics.
- Missing Business Discovery domains become `missingKnowledge`; the DBT
  validator requires domains with no knowledge items to carry matching missing
  knowledge unless the DBT is `invalid` or `stale`.
- Partial Business Discovery produces partial DBT; blocked Business Discovery
  produces blocked fail-closed DBT; invalid or stale Business Discovery
  produces invalid or stale DBT.
- MVP-1B does not produce `aligned` or `confirmed`; those statuses are reserved
  for later Business Alignment and Business Owner confirmation phases.
- `apps/platform/gnr8/architecture/digital-business-twin-persistence.ts`
  stores artifact kind `digital_business_twin` in the existing site-version
  `importProvenanceSummary`, with append-only history and
  `latestDigitalBusinessTwinArtifact`.
- Equivalent latest artifacts are reused; changed current artifacts append;
  latest and by-ID read helpers are implemented.
- Persistence rejects `invalid` and `stale`; explicitly `blocked` artifacts
  are valid fail-closed records.
- Recursive forbidden fields are rejected: `businessUnderstandingReport`,
  `businessAlignment`, `websiteDesignBrief`, `websiteGenerationPackage`,
  `providerPayload`, `prompt`, `aiOutput`, `generatedContent`,
  `generatedHtml`, `generatedReact`, `publishingArtifact`,
  `deploymentArtifact`, and `executionArtifact`.

MVP-1B did not implement Business Understanding Report, Business Alignment,
Website Design Brief, Website Generation Package, provider adapters, external
AI integration, generation, compliance, Business Approval, publishing changes,
UI, API routes, schema migrations, CRM/ERP/commerce/support domains, or future
connector domains.

MVP-1B validation:
- Focused Digital Business Twin tests pass `17 / 17`.
- `cd apps/platform && pnpm run vercel-build` passes.
- `git diff --check` passes.

MVP-1B-R real-target validation:
- Canonical document:
  `docs/architecture/DIGITAL_BUSINESS_TWIN_REAL_TARGET_VALIDATION.md`.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` persisted
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` from
  `business_discovery_7b37413651d79de0d109e31690a34b62`.
- ODV DBT status is `partial`, with 12 knowledge items, 2 missing knowledge
  records (`offerings`, `audience`), 104 limitations, `LOW` confidence, valid
  lineage, latest reload equality, by-ID reload equality, and idempotent retry
  reuse.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` persisted
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` from
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`.
- ViroiDoc DBT status is `partial`, with 17 knowledge items, 1 missing
  knowledge record (`audience`), 105 limitations, `LOW` confidence, valid
  lineage, latest reload equality, by-ID reload equality, and idempotent retry
  reuse.
- Business Discovery findings were converted into DBT knowledge without
  invented source findings. Missing Business Discovery domains became
  `missingKnowledge`.
- Blocked Business Discovery produces a blocked DBT with 0 usable knowledge
  items and 9 missing knowledge records.
- Safety scan found no Business Understanding Report, Business Alignment,
  Website Design Brief, Website Generation Package, provider payload, prompt,
  AI output, generated HTML, generated React, generated components, generated
  blocks, publishing artifact, deployment artifact, or execution artifact.

Phase MVP-1C creates the first runtime Business Understanding Report artifact
from persisted Digital Business Twin:
`docs/architecture/BUSINESS_UNDERSTANDING_REPORT_RUNTIME_BUILDER.md`.

MVP-1C implementation summary:
- `apps/platform/gnr8/architecture/business-understanding-report-contract.ts`
  defines `BusinessUnderstandingReportArtifact`,
  `BusinessUnderstandingReportLineage`,
  `BusinessUnderstandingReportSection`,
  `BusinessUnderstandingReportRecommendation`,
  `BusinessUnderstandingReportConfidence`,
  `BusinessUnderstandingReportValidationResult`, and
  `BusinessUnderstandingReportStatus`.
- Allowed statuses are `draft`, `partial`, `valid`, `invalid`, `blocked`, and
  `stale`.
- MVP sections are `executive_summary`, `business_overview`,
  `products_and_services`, `target_audience`, `business_goals`,
  `brand_identity`, `current_digital_presence`, `trust_signals`,
  `missing_knowledge`, `confidence_overview`, `recommendations`,
  `limitations`, `evidence_summary`, and `diagnostics`.
- `apps/platform/gnr8/architecture/business-understanding-report-builder.ts`
  implements `buildBusinessUnderstandingReportFromDigitalBusinessTwin(...)`
  as a deterministic builder from one Digital Business Twin artifact.
- DBT knowledge items become human-readable report sections. DBT
  `missingKnowledge` becomes the Missing Knowledge section. DBT confidence,
  evidence refs, limitations, lineage, and diagnostics propagate into the
  report.
- Partial DBT produces partial BUR; blocked DBT produces blocked fail-closed
  BUR; invalid or stale DBT produces invalid or stale fail-closed BUR.
- Recommendations are business-oriented only: `clarify_positioning`,
  `improve_messaging`, `strengthen_trust`, `improve_customer_journey`,
  `expand_content`, `improve_digital_presence`,
  `resolve_missing_audience`, and `resolve_missing_offerings`.
- Recommendations do not prescribe React, HTML, components, layouts, prompts,
  provider behavior, publishing behavior, generated content, or deployment
  behavior.
- `apps/platform/gnr8/architecture/business-understanding-report-persistence.ts`
  stores artifact kind `business_understanding_report` in the existing
  site-version `importProvenanceSummary`, with append-only
  `businessUnderstandingReportArtifacts` and
  `latestBusinessUnderstandingReportArtifact`.
- Equivalent latest artifacts are reused; changed current artifacts append;
  latest and by-ID read helpers are implemented.
- Persistence rejects `invalid` and `stale`; `blocked` is accepted as a valid
  fail-closed artifact.
- Recursive forbidden fields are rejected: `businessAlignment`,
  `websiteDesignBrief`, `websiteGenerationPackage`, `providerPayload`,
  `prompt`, `aiOutput`, `generatedContent`, `generatedHtml`,
  `generatedReact`, `generatedComponents`, `generatedBlocks`,
  `publishingArtifact`, `deploymentArtifact`, and `executionArtifact`.

MVP-1C did not implement Business Alignment, Website Design Brief, Website
Generation Package, provider adapters, external AI integration, generation,
compliance, Business Approval, publishing changes, UI, API routes, or schema
migrations.

MVP-1C validation:
- Focused Business Understanding Report tests pass `19 / 19`.
- `cd apps/platform && pnpm run vercel-build` passes.
- `git diff --check` passes.

Recommended next phase after MVP-1C implementation:
- MVP-1C-R Business Understanding Report Real-Target Validation retry.

MVP-1C-R real-target validation:
- Canonical document:
  `docs/architecture/BUSINESS_UNDERSTANDING_REPORT_REAL_TARGET_VALIDATION.md`.
- Previous attempt before MVP-1B-R was blocked for both supplied targets
  because the required latest persisted `DigitalBusinessTwinArtifact` was
  missing at that time.
- ODV source DBT
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` is latest for
  site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` and produced persisted
  BUR artifact
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad`.
- ODV BUR status is `partial`, with 14 sections, 2 recommendations, 2 missing
  knowledge records (`audience`, `offerings`), 104 limitations, `LOW`
  confidence, valid lineage, latest reload equality, by-ID reload equality,
  and idempotent retry reuse.
- ViroiDoc source DBT
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` is latest for
  site version `e26b0754-988b-45b9-9e24-8e213179b6cf` and produced persisted
  BUR artifact
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10`.
- ViroiDoc BUR status is `partial`, with 14 sections, 1 recommendation, 1
  missing knowledge record (`audience`), 105 limitations, `LOW` confidence,
  valid lineage, latest reload equality, by-ID reload equality, and idempotent
  retry reuse.
- Human-readability checks pass for both targets: the reports explain current
  business understanding, products/services, audience gaps, brand/digital
  presence, missing knowledge, and business-oriented recommendations without
  inventing absent knowledge.
- Safety scan found no Business Alignment, Website Design Brief, Website
  Generation Package, provider payload, prompt, AI output, generated content,
  or publishing artifact fields in the persisted BUR artifacts.
- Focused Business Understanding Report tests pass `19 / 19`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passes with existing unrelated
  frontend lint warnings for hook dependency and `<img>` usage.
- `git diff --check` passes.

Recommended next phase:
- MVP-1D Business Alignment Runtime Foundation, limited to consuming persisted
  Business Understanding Report artifacts and stopping before Website Design
  Brief, Website Generation Package, provider adapters, external AI,
  generation, compliance, Business Approval, or publishing.

Phase MVP-1D creates the first Business Alignment runtime foundation:
`docs/architecture/BUSINESS_ALIGNMENT_RUNTIME_FOUNDATION.md`.

MVP-1D implementation summary:
- `apps/platform/gnr8/architecture/business-alignment-contract.ts` defines
  `BusinessAlignmentArtifact`, `BusinessAlignmentDecision`,
  `BusinessAlignmentCorrection`, `BusinessAlignmentLineage`,
  `BusinessAlignmentConfidence`, `BusinessAlignmentValidationResult`, and
  `BusinessAlignmentStatus`.
- Allowed statuses are `draft`, `reviewed`, `applied`, `blocked`, `invalid`,
  and `stale`.
- MVP correction domains are `business_identity`, `offerings`, `audience`,
  `brand`, `digital_presence`, `goals`, `trust`, `content`, and
  `constraints`.
- MVP correction types are `confirm`, `correct`, `remove`, `add_missing`, and
  `unresolved`.
- `apps/platform/gnr8/architecture/business-alignment-runtime.ts` implements
  `applyBusinessAlignment(...)` as a deterministic runtime from one source
  Digital Business Twin, one source Business Understanding Report, explicit
  alignment decisions, and explicit corrections.
- Business Alignment evolves the Digital Business Twin. Business Alignment
  never edits reports.
- Business Understanding Reports remain deterministic projections from the
  current Digital Business Twin. MVP-1D does not implement report
  regeneration.
- Corrections apply only to DBT knowledge and missing knowledge. The runtime
  never overwrites the source DBT; it produces DBT vNext with a new
  `digitalBusinessTwinId`.
- The runtime preserves source lineage, upstream artifact refs, evidence refs,
  confidence, limitations, and diagnostics. Unresolved corrections become
  missing knowledge and limitations.
- `apps/platform/gnr8/architecture/business-alignment-persistence.ts` stores
  artifact kind `business_alignment` in the existing site-version
  `importProvenanceSummary`, with append-only `businessAlignmentArtifacts` and
  `latestBusinessAlignmentArtifact`.
- Equivalent latest artifacts are reused; changed current artifacts append;
  latest and by-ID read helpers are implemented.
- Persistence rejects `invalid` and `stale`; `blocked` is accepted as a valid
  fail-closed artifact.
- Recursive forbidden fields are rejected: `websiteDesignBrief`,
  `websiteGenerationPackage`, `providerPayload`, `prompt`,
  `generatedContent`, `generatedReact`, `generatedHtml`,
  `generatedComponents`, `generatedBlocks`, `AIOutput`, `aiOutput`,
  `publishingArtifact`, `deploymentArtifact`, and `executionArtifact`.

MVP-1D did not implement Website Design Brief, Website Generation Package,
provider adapters, external AI integration, generation, compliance, Business
Approval, publishing changes, UI, API routes, or schema migrations.

MVP-1D validation:
- Focused Business Alignment tests pass `16 / 16`; initial sandbox execution
  hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue, and the
  rerun outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passes with existing unrelated
  frontend lint warnings for hook dependency and `<img>` usage.
- `git diff --check` passes.

MVP-1D-R real-target validation:
- Canonical document:
  `docs/architecture/BUSINESS_ALIGNMENT_REAL_TARGET_VALIDATION.md`.
- ODV source DBT
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` and source BUR
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad` were both
  latest for site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` before
  validation.
- ODV persisted Business Alignment
  `business_alignment_18c0a6958048bf8985044e4781e788a8` with status
  `reviewed`, 1 decision, 5 corrections, correction types `confirm` and
  `unresolved`, and DBT vNext
  `digital_business_twin_2614a690e29e87a201658f3de4f72983`.
- ViroiDoc source DBT
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` and source BUR
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10` were both
  latest for site version `e26b0754-988b-45b9-9e24-8e213179b6cf` before
  validation.
- ViroiDoc persisted Business Alignment
  `business_alignment_7a3ad7e2222e732a895f89c1dc22452a` with status
  `reviewed`, 1 decision, 4 corrections, correction types `confirm` and
  `unresolved`, and DBT vNext
  `digital_business_twin_3429791a7d365461306d74059c206f8f`.
- Both DBT vNext artifacts were persisted through the existing
  `persistDigitalBusinessTwinArtifact(...)` helper; no new persistence
  behavior was added.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  passed for both Business Alignment artifacts and both DBT vNext artifacts.
- Source DBTs remained reloadable by original artifact ID. Lineage, evidence
  refs, limitations, and missing knowledge were preserved; missing audience
  and ODV missing offerings were explicitly marked unresolved without adding
  new customer facts.
- Safety scan found no Website Design Brief, Website Generation Package,
  provider payload, prompt, AI output, generated content, publishing artifact,
  generation, compliance, or Business Approval.
- Focused Business Alignment tests pass `16 / 16`; initial sandbox execution
  hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue, and the
  rerun outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passes with existing unrelated
  frontend lint warnings for hook dependency and `<img>` usage.
- `git diff --check` passes.

Phase MVP-1E creates the first runtime Website Design Brief artifact from an
aligned Digital Business Twin:
`docs/architecture/WEBSITE_DESIGN_BRIEF_RUNTIME_BUILDER.md`.

MVP-1E implementation summary:
- `apps/platform/gnr8/architecture/website-design-brief-contract.ts` defines
  `WebsiteDesignBriefArtifact`, `WebsiteDesignBriefLineage`,
  `WebsiteObjective`, `AudienceExperience`, `WebsiteMessage`,
  `WebsiteJourney`, `WebsiteConstraint`,
  `WebsiteDesignBriefConfidence`, `WebsiteDesignBriefValidationResult`, and
  `WebsiteDesignBriefStatus`.
- Allowed statuses are `draft`, `partial`, `valid`, `blocked`, `invalid`, and
  `stale`.
- Website Design Brief is NOT a design document.
- Website Design Brief is the first Experience Projection of an Aligned
  Digital Business Twin.
- Website Design Brief is produced ONLY from an Aligned Digital Business Twin
  and Business Alignment lineage.
- Website Design Brief contains website intent.
- Website Design Brief never contains implementation.
- Canonical sections are Executive Summary, Website Purpose, Website
  Objectives, Target Audience, Core Messages, Brand Expression, Information
  Priorities, Website Journey, Trust Strategy, Accessibility Goals, SEO Intent,
  Experience Constraints, Missing Knowledge, Recommendations, Confidence,
  Limitations, and Diagnostics.
- `apps/platform/gnr8/architecture/website-design-brief-builder.ts`
  implements `buildWebsiteDesignBrief(...)` as a deterministic builder from
  one aligned Digital Business Twin artifact and one Business Alignment
  artifact lineage.
- Transformation behavior: Business Goals -> Website Objectives; Audience ->
  Audience Experience; Offerings -> Information Priorities; Brand -> Brand
  Expression; Trust -> Trust Strategy; Digital Presence -> Experience
  Recommendations; Missing knowledge -> Missing Knowledge section.
- The builder never invents business information. Missing DBT knowledge is
  preserved as missing knowledge, limitations, low-confidence recommendations,
  and diagnostics.
- Confidence, limitations, evidence refs, lineage, and diagnostics propagate
  from the aligned DBT and Business Alignment lineage.
- `apps/platform/gnr8/architecture/website-design-brief-persistence.ts`
  stores artifact kind `website_design_brief` in the existing site-version
  `importProvenanceSummary`, with append-only
  `websiteDesignBriefArtifacts` and `latestWebsiteDesignBriefArtifact`.
- Equivalent latest artifacts are reused; changed current artifacts append;
  latest and by-ID read helpers are implemented.
- Persistence rejects `invalid` and `stale`; `blocked` is accepted as a valid
  fail-closed artifact.
- Recursive forbidden fields are rejected: `providerPayload`, `prompt`,
  `generatedWebsite`, `generatedHTML`, `generatedHtml`, `generatedReact`,
  `generatedComponents`, `generatedBlocks`, `code`, `framework`, `library`,
  `deploymentArtifact`, `publishingArtifact`, and `executionArtifact`.

MVP-1E did not implement Website Generation Package, provider adapters,
external AI integration, generation, compliance, Business Approval, publishing
changes, UI, API routes, schema migrations, workers, or generated website
artifacts.

MVP-1E validation:
- Focused Website Design Brief tests pass `17 / 17`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.
- Platform Vercel build passes.
- `git diff --check` passes.

MVP-1E-R real-target validation:
- ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` loaded exact
  aligned DBT `digital_business_twin_2614a690e29e87a201658f3de4f72983` and
  Business Alignment `business_alignment_18c0a6958048bf8985044e4781e788a8`;
  both were latest before WDB build.
- ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` loaded exact
  aligned DBT `digital_business_twin_3429791a7d365461306d74059c206f8f` and
  Business Alignment `business_alignment_7a3ad7e2222e732a895f89c1dc22452a`;
  both were latest before WDB build.
- ODV persisted
  `website_design_brief_ff19a711c948d28fdd58bdea521c4f59`, status `partial`,
  17 sections, 2 objectives, 0 audience-experience items with audience
  missing-knowledge limitation recorded, 5 messages, journey present with 4
  steps, 6 constraints, LOW confidence, 109 limitations, and WDB-valid
  diagnostics.
- ViroiDoc persisted
  `website_design_brief_782c43e390c353d192af867c227d191d`, status `partial`,
  17 sections, 3 objectives, 0 audience-experience items with audience
  missing-knowledge limitation recorded, 12 messages, journey present with 4
  steps, 4 constraints, LOW confidence, 108 limitations, and WDB-valid
  diagnostics.
- Both briefs clearly explain the website kind, map business goals to website
  objectives, preserve missing audience knowledge, project brand/digital
  presence into website intent, use trust/content/digital presence to shape
  intent, and preserve limitations before WGP.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  passed for both Website Design Brief artifacts.
- Blocking WDB fix: source validation now accepts a Business-Alignment-output
  DBT with status `partial`, matching MVP-1D-R's conservative unresolved
  knowledge behavior while still rejecting unreviewed `observed` DBTs.
- Safety scan found no WGP, provider payload, prompt, AI output, generated
  content, generated HTML, generated React, generated components, publishing
  artifact, generation, compliance, or Business Approval.
- Focused Website Design Brief tests pass `17 / 17`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passes.
- `git diff --check` passes.

Recommended next phase after MVP-1E-R:
- MVP-1F Website Generation Package Runtime Builder.

Phase MVP-1F creates the first runtime Website Generation Package artifact
from a persisted Website Design Brief:
`docs/architecture/WEBSITE_GENERATION_PACKAGE_RUNTIME_BUILDER.md`.

MVP-1F implementation summary:
- `apps/platform/gnr8/architecture/website-generation-package-contract.ts`
  defines `WebsiteGenerationPackageArtifact`,
  `WebsiteGenerationPackageLineage`, `WebsiteGenerationObjective`,
  `WebsiteGenerationAudience`, `WebsiteGenerationMessage`,
  `WebsiteGenerationNavigationContract`, `WebsiteGenerationPageContract`,
  `WebsiteGenerationSectionContract`,
  `WebsiteGenerationContentRequirement`, `WebsiteGenerationConstraint`,
  `WebsiteGenerationValidationExpectation`,
  `WebsiteGenerationConfidence`, `WebsiteGenerationValidationResult`, and
  `WebsiteGenerationPackageStatus`.
- Allowed statuses are `draft`, `partial`, `valid`, `blocked`, `invalid`, and
  `stale`.
- Website Generation Package answers: "What must an external generation system
  create?"
- Website Generation Package is NOT a prompt, provider payload, generated
  website, implementation artifact, publishing artifact, UI, API, schema, or
  worker.
- Website Generation Package consumes only a persisted Website Design Brief and
  lineage already present in that WDB.
- `apps/platform/gnr8/architecture/website-generation-package-builder.ts`
  implements `buildWebsiteGenerationPackage(...)` as a deterministic builder
  from one Website Design Brief artifact.
- Transformation behavior: WDB Objectives -> Generation Objectives; WDB
  Audience Experience -> Audience Requirements; WDB Messages -> Required
  Messaging; WDB Journey -> Navigation/Page/Section Intent; WDB constraints,
  missing knowledge, limitations, SEO, accessibility, trust, and information
  priorities -> content requirements and constraints.
- Missing knowledge remains explicit and is never filled by inference.
- Confidence, limitations, evidence refs, lineage, and diagnostics propagate
  from WDB.
- The validation contract covers business positioning, audience
  representation, message coverage, brand consistency, navigation
  completeness, journey completeness, trust signal coverage, accessibility
  expectations, SEO intent, and constraint preservation.
- `apps/platform/gnr8/architecture/website-generation-package-persistence.ts`
  stores artifact kind `website_generation_package` in the existing
  site-version `importProvenanceSummary`, with append-only
  `websiteGenerationPackageArtifacts` and
  `latestWebsiteGenerationPackageArtifact`.
- Equivalent latest artifacts are reused; changed current artifacts append;
  latest and by-ID read helpers are implemented.
- Persistence rejects `invalid` and `stale`; `blocked` is accepted as a valid
  fail-closed artifact.
- Recursive forbidden fields are rejected: `providerPayload`, `prompt`,
  `openAiPrompt`, `claudePrompt`, `geminiPrompt`, `aiOutput`,
  `generatedWebsite`, `generatedContent`, `generatedHtml`, `generatedReact`,
  `generatedComponents`, `generatedBlocks`, `code`, `framework`, `library`,
  `deploymentArtifact`, `publishingArtifact`, and `executionArtifact`.

MVP-1F did not implement provider adapters, external AI integration,
generation, compliance execution, Business Approval, publishing changes, UI,
API routes, schema migrations, workers, or generated website artifacts.

MVP-1F validation:
- Focused Website Generation Package tests pass `18 / 18`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passes.
- `git diff --check` passes.

Recommended next phase after MVP-1F:
- MVP-1F-R Website Generation Package Real-Target Validation.

Phase MVP-1F-R validates the Website Generation Package runtime against real
persisted ODV and ViroiDoc Website Design Brief artifacts:
`docs/architecture/WEBSITE_GENERATION_PACKAGE_REAL_TARGET_VALIDATION.md`.

MVP-1F-R validation summary:
- ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` loaded exact source
  WDB `website_design_brief_ff19a711c948d28fdd58bdea521c4f59`, confirmed it
  is latest for dry run `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`, and
  persisted WGP
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`.
- ODV WGP status is `partial`; objectives `2`, audience requirements `3`,
  messages `5`, navigation destinations `4`, page contracts `4`, section
  contracts `14`, content requirements `128`, constraints `114`, validation
  expectations `10`, confidence `LOW`, limitations `111`.
- ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` loaded exact
  source WDB `website_design_brief_782c43e390c353d192af867c227d191d`,
  confirmed it is latest for dry run
  `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`, and persisted WGP
  `website_generation_package_3e34393aef612a2c597042917dc45085`.
- ViroiDoc WGP status is `partial`; objectives `3`, audience requirements
  `3`, messages `12`, navigation destinations `4`, page contracts `4`,
  section contracts `14`, content requirements `134`, constraints `111`,
  validation expectations `10`, confidence `LOW`, limitations `110`.
- Both WGPs are reloadable by latest and by ID; latest/by-ID reload equality
  passes, rebuilt semantic equality passes, and idempotent retry reuses the
  same artifact IDs.
- Both WGPs are human-readable provider-neutral contracts that explain what an
  external generation system must create, what business objectives must be
  supported, what messages must be communicated, what journey/navigation/content
  must be represented, what constraints must be preserved, and what validation
  expectations must be checked later.
- Safety scan found no provider payload, prompt, OpenAI/Claude/Gemini prompt,
  AI output, generated website, generated content, generated HTML, generated
  React, generated components, code/framework/library fields, publishing
  artifact, generation, compliance execution, or Business Approval.
- Focused Website Generation Package tests pass `18 / 18`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.
- `cd apps/platform && pnpm run vercel-build` passes.
- `git diff --check` passes.

MVP-1F-R did not implement provider adapters, external AI integration,
generation, compliance execution, Business Approval, publishing changes, UI,
API routes, schema migrations, workers, or generated website artifacts.

Recommended next phase after MVP-1F-R:
- MVP-1G Provider Adapter Boundary Design, documentation and contract design
  only. Stop before provider payloads, prompts, external AI calls, generated
  websites, compliance execution, Business Approval, publishing, UI, API,
  schema, or workers unless explicitly authorized.

Phase MVP-1G defines the Provider Adapter boundary:
`docs/architecture/PROVIDER_ADAPTER_BOUNDARY_DESIGN.md`.

MVP-1G boundary summary:
- Provider Adapter responsibility is
  `WebsiteGenerationPackageArtifact -> ProviderGenerationPayload`.
- The adapter serializes. It never redefines business intent.
- Provider-neutral source is `WebsiteGenerationPackageArtifact`.
- Provider-specific output is `ProviderGenerationPayload`.
- The first MVP provider recommendation is exactly one path: Codex task
  payload.
- Concrete first provider type is `codex`; concrete first payload kind is
  `codex_task`. OpenAI API payload, Claude payload, and manual export payload
  are deferred.
- Adapter identity must include adapter ID, adapter name, adapter version,
  adapter contract version, provider type, provider payload kind, source WGP
  reference, creation timestamp, serialization mode, and diagnostics.
- ProviderGenerationPayload conceptually contains payload identity, adapter
  identity, provider type, payload kind, source WGP reference, serialized
  package content, provider-specific task envelope, preserved constraints,
  preserved validation expectations, preserved limitations, preserved
  confidence, preserved lineage, diagnostics, and safety classification.
- Future conceptual functions are `buildProviderGenerationPayload(...)`,
  `validateProviderGenerationPayload(...)`, and
  `serializeWebsiteGenerationPackageForProvider(...)`.
- Serialization rules require preserving all WGP objectives, audience
  requirements, messaging, navigation, page and section contracts, content
  requirements, constraints, validation expectations, confidence,
  limitations, lineage, and diagnostics.
- Forbidden mutation rules prohibit business reinterpretation, new facts,
  hidden prompt-only business logic, removal or weakening of WGP constraints,
  hidden limitations, hidden low confidence, provider-only requirements,
  provider output persistence, generated output persistence, and generation
  execution in this phase.
- Safety rule: provider payload may contain provider-specific formatting, but
  must preserve WGP meaning and lineage.

MVP-1G did not implement TypeScript, schema, persistence, UI, API, workers,
provider calls, prompts sent, AI integration, generation, compliance
execution, Business Approval, publishing, runtime state, deployment behavior,
provider output persistence, or generated output persistence.

Recommended next phase after MVP-1G:
- MVP-1H Codex Task Provider Payload Runtime Builder, limited to implementing
  and validating the first `codex_task` ProviderGenerationPayload builder from
  a persisted Website Generation Package. Stop before provider calls, prompts
  sent, external AI execution, generated websites, compliance execution,
  Business Approval, publishing, UI, API, schema, or workers unless explicitly
  authorized.

Phase MVP-1H implements the Codex Task Provider Payload runtime builder:
`docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_BUILDER.md`.

MVP-1H runtime summary:
- Provider Adapter responsibility remains
  `WebsiteGenerationPackageArtifact -> ProviderGenerationPayload`.
- Provider type is `codex`.
- Payload kind is `codex_task`.
- Artifact kind is `provider_generation_payload`.
- Contract version is `MVP-1H`.
- Runtime files are
  `apps/platform/gnr8/architecture/provider-generation-payload-contract.ts`,
  `apps/platform/gnr8/architecture/codex-task-provider-payload-builder.ts`,
  and
  `apps/platform/gnr8/architecture/provider-generation-payload-persistence.ts`.
- `buildCodexTaskProviderPayload(...)` consumes only a persisted
  WebsiteGenerationPackageArtifact plus source WGP artifact ID, serializes the
  full WGP, preserves constraints, validation expectations, confidence,
  limitations, lineage, and diagnostics, and creates a proposal-only Codex task
  envelope.
- `codexTaskEnvelope` contains objective, source package summary, required
  website outcomes, navigation/page/section requirements, content
  requirements, constraints, validation expectations, forbidden actions,
  expected output shape, and stop conditions.
- Expected output shape is `implementation_proposal_only`.
- Safety classification is `export_only_no_execution`; provider execution,
  AI execution, generated website output, publishing, deployment, DNS mutation,
  production mutation, and compliance execution flags are all false.
- `validateProviderGenerationPayload(...)` validates provider type, payload
  kind, lineage, source WGP reference, required envelope sections, preserved
  constraints, preserved validation expectations, forbidden fields absence, and
  generated-output/provider-result absence.
- Forbidden recursive fields include `openAiPrompt`, `claudePrompt`,
  `geminiPrompt`, `aiOutput`, `generatedWebsite`, `generatedContent`,
  `generatedHtml`, `generatedReact`, `generatedComponents`,
  `generatedBlocks`, `deploymentArtifact`, `publishingArtifact`,
  `executionArtifact`, `providerResult`, and `runtimeMutation`.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only `providerGenerationPayloadArtifacts`,
  `latestProviderGenerationPayloadArtifact`, equivalent latest reuse, changed
  append, latest load, by-ID load, `invalid`/`stale` rejection, and `blocked`
  allowed.
- Focused Provider Generation Payload tests pass `17 / 17`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.

MVP-1H did not call Codex, send prompts, execute external AI, generate a
website, persist generated websites, run compliance, add Business Approval,
publish, deploy, mutate DNS, mutate production, add UI, add API routes, add
schema, or add workers.

MVP-1H-R real-target validation:
- Canonical document:
  `docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_REAL_TARGET_VALIDATION.md`.
- ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` loaded exact source
  WGP `website_generation_package_c2c555025f186178f27c44c7cd272d4d`,
  confirmed it is latest, and persisted provider payload
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`.
- ODV provider payload status is `draft`; provider type `codex`; payload kind
  `codex_task`; preserved constraints `114`; validation expectations `10`;
  limitations `112`; diagnostics `8`; confidence `LOW`.
- ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` loaded exact
  source WGP `website_generation_package_3e34393aef612a2c597042917dc45085`,
  confirmed it is latest, and persisted provider payload
  `provider_generation_payload_2d99b17572dc23ef482cf56ba06e1230`.
- ViroiDoc provider payload status is `draft`; provider type `codex`; payload
  kind `codex_task`; preserved constraints `111`; validation expectations
  `10`; limitations `111`; diagnostics `8`; confidence `LOW`.
- Both payloads preserve source WGP lineage, full serialized WGP content,
  Codex task envelope, constraints, validation expectations, confidence,
  limitations, and diagnostics.
- Both envelopes are export-ready and include objective, source package
  summary, required website outcomes, navigation/page/section requirements,
  content requirements, constraints, validation expectations, forbidden
  actions, expected output shape, and stop conditions.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  passed for both targets.
- Safety verification found no provider call, prompt sent, AI execution,
  generated website, generated content, generated HTML, generated React,
  generated components, code/framework/library output, publishing artifact,
  deployment artifact, execution artifact, compliance execution, or Business
  Approval.

Recommended next phase after MVP-1H-R:
- MVP-1I Provider Execution Boundary Design, documentation and contract design
  only. Define the authorization boundary for a future provider call from a
  persisted `provider_generation_payload`. Stop before provider calls, prompts
  sent, AI execution, generated websites, compliance execution, Business
  Approval, publishing, UI, API, schema, or workers unless explicitly
  authorized.

MVP-1I provider execution boundary:
- Canonical document:
  `docs/architecture/PROVIDER_EXECUTION_BOUNDARY_DESIGN.md`.
- Boundary:
  `ProviderGenerationPayload -> External AI Execution -> Generated Website
  Proposal`.
- Provider Execution is the moment where GNR8 allows an external AI system to
  produce an implementation proposal.
- Provider Execution is not publishing, deployment, DNS mutation, production
  mutation, compliance approval, Business Approval, or a source of business
  truth.
- Future artifact concepts are ProviderExecutionRequest,
  ProviderExecutionRun, ProviderExecutionResult, and GeneratedWebsiteProposal.
- Execution prerequisites are a valid or explicitly export-ready
  ProviderGenerationPayload, preserved source WGP lineage, preserved provider
  payload lineage, safety classification, explicit operator authorization, no
  unresolved execution blockers, and no publishing, deployment, DNS, or
  production mutation permissions.
- Safety rules: provider may generate proposal only; generated output is
  quarantined; no production mutation, deployment, DNS mutation, publishing,
  automatic acceptance, automatic compliance pass, or automatic Business
  Approval; compliance must run after generation; Business Approval must
  happen before publish.
- First execution mode recommendation: Manual Codex execution outside GNR8,
  followed by future controlled import of manually generated output as
  quarantined GeneratedWebsiteProposal material.
- Generated output is an implementation proposal, not truth. It must not
  update the Digital Business Twin, Business Understanding Report, Business
  Alignment, Website Design Brief, Website Generation Package, or
  ProviderGenerationPayload.
- MVP-1I added no implementation, provider call, prompt sent, AI execution,
  generated website, compliance execution, Business Approval, publishing, UI,
  API, schema, or workers.

MVP-1J Manual Codex Execution Runbook and Generated Proposal Import Boundary:
- Canonical manual runbook:
  `docs/architecture/MANUAL_CODEX_EXECUTION_RUNBOOK.md`.
- Canonical import boundary:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`.
- MVP-1J defines the safe manual operator process for executing an
  export-ready Codex task ProviderGenerationPayload outside GNR8.
- Source requirements: source ProviderGenerationPayload artifact ID, source
  WGP artifact ID, provider type `codex`, payload kind `codex_task`, source
  lineage, export-ready or explicitly accepted source status, and no generated
  output, provider result, publishing, deployment, DNS, runtime mutation,
  compliance, or Business Approval artifacts.
- Operator responsibilities include exact source artifact recording, copied
  payload integrity, no hidden prompt edits, no business reinterpretation, no
  production mutation, no deployment, no publishing, no DNS mutation, external
  generated-output storage, provider notes, implementation assumptions, known
  limitations, execution timestamp, operator reference, and operator
  attestation.
- Expected Codex output is implementation proposal only: generated files or
  source bundle, provider notes, implementation assumptions, known limitations,
  source payload reference, execution timestamp, and operator reference.
- GeneratedWebsiteProposal future concepts are
  GeneratedWebsiteProposalLineage, GeneratedWebsiteProposalStatus,
  GeneratedWebsiteProposalSource, GeneratedWebsiteProposalSafety, and
  GeneratedWebsiteProposalValidationReadiness.
- GeneratedWebsiteProposalStatus values are conceptually `received`,
  `quarantined`, `invalid`, `blocked`, `superseded`, and
  `compliance_ready`.
- Future import prerequisites are source ProviderGenerationPayload artifact
  ID, source WGP artifact ID, provider execution metadata, generated output
  bundle, no publishing artifacts, no deployment artifacts, no DNS/runtime
  mutation artifacts, and operator attestation.
- Quarantine rule: Generated Website Proposal is not trusted. It cannot
  publish, update DBT, update WDB, update WGP, update ProviderGenerationPayload,
  become compliance by itself, become Business Approval by itself, or mutate
  production. It must first be checked by Generation Contract Compliance.
- MVP-1J added no implementation, provider call from GNR8, prompt sent by
  GNR8, automated AI execution, generated website import implementation,
  compliance execution, Business Approval, publishing, UI, API, schema,
  workers, deployment, DNS mutation, production mutation, or TypeScript.

MVP-1K-0 Generation Validation Engine Architecture:
- MVP-1K-0 Generation Validation Engine Architecture is complete. It defines
  observation, comparison, evidence, contractual evaluation, compliance
  evidence, compliance report input, observation philosophy, comparison
  philosophy, confidence, lineage, and non-ownership rules for checking a
  Generated Website Proposal against the Website Generation Package.
- Canonical document:
  `docs/architecture/GENERATION_VALIDATION_ENGINE_ARCHITECTURE.md`.
- Canonical pipeline:
  `Website Generation Package -> Generated Website Proposal -> Website
  Observation -> Observed Website Model -> Contract Comparison -> Compliance
  Evidence -> Generation Contract Compliance Report -> Business Approval ->
  Publish`.
- The Generation Validation Engine owns observation, comparison, evidence,
  contractual evaluation, compliance evidence, and compliance report input.
- The Generation Validation Engine does not own generation, business truth,
  business alignment, provider execution, or publishing.
- Validation observes what exists, never guesses intent, never infers business
  truth, and only records observable reality.
- Comparison is always Observed Website against Website Generation Package.
  It never compares against prompts, provider output, HTML history, provider
  identity, or operator preference.
- Future runtime concepts are ObservedWebsite, ObservedPage,
  ObservedSection, ObservedNavigation, ObservedMessage, ObservedConstraint,
  ObservedEvidence, ObservedLimitation, and ObservedWebsiteLineage. These are
  conceptual only; MVP-1K-0 adds no schemas or TypeScript.
- Compliance decisions must always reference observable evidence such as
  missing navigation, missing message, missing trust signal, accessibility
  observation, SEO observation, constraint preserved, or constraint violated.
- Confidence depends on observable evidence, comparison coverage, ambiguity,
  and missing observations. It does not depend on provider identity.
- Validation never changes DBT, BUR, Business Alignment, WDB, WGP, or
  Provider Payload. Validation only creates Compliance Evidence and
  Compliance Report input.
- MVP-1K-0 added no implementation, runtime, provider calls, generated
  website import, compliance implementation, publishing, UI, API, schema,
  workers, TypeScript, or generated website execution.

MVP-1K-1 Generated Website Proposal Import Runtime Foundation:
- MVP-1K-1 is complete. It creates the first runtime foundation for importing
  manually generated Codex output bundle metadata as a quarantined Generated
  Website Proposal.
- Canonical document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_FOUNDATION.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`,
  `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`, and
  `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`.
- Artifact kind is `generated_website_proposal`.
- The contract defines `GeneratedWebsiteProposalArtifact`,
  `GeneratedWebsiteProposalLineage`, `GeneratedWebsiteProposalSource`,
  `GeneratedWebsiteProposalSafety`,
  `GeneratedWebsiteProposalValidationReadiness`,
  `GeneratedWebsiteProposalOperatorAttestation`,
  `GeneratedWebsiteProposalStatus`, and
  `GeneratedWebsiteProposalValidationResult`.
- `buildGeneratedWebsiteProposalFromManualOutput(...)` consumes only source
  ProviderGenerationPayload, source WGP lineage, operator-provided output
  bundle metadata, provider notes, implementation assumptions, known
  limitations, and operator attestation.
- Imported proposals are deterministic, status `quarantined`, and remain
  implementation proposal material only.
- Safety validation rejects missing attestation, missing output bundle
  metadata, source lineage mismatch, publish/deploy/DNS/runtime mutation
  artifacts, compliance or approval artifacts, canonical business artifact
  fields, and claims that GNR8 performed provider execution side effects.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only history, `latestGeneratedWebsiteProposalArtifact`,
  equivalent latest reuse, changed append, latest load, and by-ID load.
- Persistence rejects `invalid`, accepts `blocked` and `quarantined`, accepts
  `compliance_ready` only when validation readiness allows it, and keeps
  `superseded` artifacts loadable.
- MVP-1K-1 added no website observation, compliance execution, Compliance
  Report, Business Approval, publishing, provider calls, AI execution,
  automatic generation, UI, API, schema, workers, deployment, DNS mutation,
  production mutation, runtime mutation, or generated output execution.
- MVP-2.0-J imported ODV Iteration 2 from
  `ODV_GENERATED_PROPOSAL_002/` as the latest quarantined Generated Website
  Proposal:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.
- Iteration 1 remains loadable by ID as
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`.
- Iteration 2 source lineage was verified through WGP
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`,
  compliance `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`,
  compliance report
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`,
  improvement plan
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`, and
  Provider Payload v2
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
- Latest reload and by-ID reload both returned Iteration 2, idempotent retry
  reused Iteration 2, proposal count increased exactly once from `1` to `2`,
  and downstream observation/compliance/report/approval counts did not change.
- Iteration and cycle metadata are preserved in diagnostics and operator
  attestation, not by changing existing canonical proposal contracts.

MVP-1K-2 Generated Website Proposal Observation Boundary Design:
- MVP-1K-2 is complete. It defines how future observation may inspect
  quarantined Generated Website Proposal material and produce an Observed
  Website Model.
- Canonical document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.
- Observation pipeline:
  `Generated Website Proposal -> Website Observation -> Observed Website Model
  -> Future Contract Comparison`.
- Conceptual future artifacts are ObservedWebsite, ObservedPage,
  ObservedNavigation, ObservedSection, ObservedMessage, ObservedAsset,
  ObservedConstraint, ObservedTechnicalSignal, ObservedEvidence,
  ObservedLimitation, and ObservedWebsiteLineage.
- Observation sources are generated output bundle metadata, generated file
  tree, rendered preview when available, static HTML/content when available,
  asset inventory, route/page inventory, operator notes, and provider notes.
- Observation readiness values are `not_observable`,
  `partially_observable`, `observable`, and `blocked`.
- Observation evidence preserves source proposal artifact, source provider
  payload, source WGP, observed routes, sections, navigation, messages,
  assets, missing observations, limitations, and diagnostics.
- Observation records what exists. It does not compare against the WGP, judge
  compliance, create a Compliance Report, approve, publish, reinterpret the
  business, mutate WGP, trust providers, or mutate runtime state.
- MVP-1K-2 added no implementation, observation runtime, compliance
  evaluator, Compliance Report, Business Approval, publishing, provider calls,
  AI execution, UI, API, schema, workers, deployment, DNS mutation, production
  mutation, or runtime mutation.

MVP-1K-3 Observed Website Model Runtime Foundation:
- MVP-1K-3 is complete. It creates the first deterministic Observed Website
  Model runtime foundation from a quarantined Generated Website Proposal.
- Canonical document:
  `docs/architecture/OBSERVED_WEBSITE_MODEL_RUNTIME_FOUNDATION.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/observed-website-model-contract.ts`,
  `apps/platform/gnr8/architecture/observed-website-model-builder.ts`, and
  `apps/platform/gnr8/architecture/observed-website-model-persistence.ts`.
- Artifact kind is `observed_website_model`.
- The contract defines `ObservedWebsiteModelArtifact`,
  `ObservedWebsiteLineage`, `ObservedPage`, `ObservedNavigation`,
  `ObservedSection`, `ObservedMessage`, `ObservedAsset`,
  `ObservedConstraint`, `ObservedTechnicalSignal`, `ObservedEvidence`,
  `ObservedLimitation`, `ObservedWebsiteReadiness`,
  `ObservedWebsiteValidationResult`, and `ObservedWebsiteStatus`.
- Allowed statuses are `not_observable`, `partially_observable`,
  `observable`, `blocked`, `invalid`, and `stale`.
- `buildObservedWebsiteModel(...)` consumes a quarantined
  `GeneratedWebsiteProposalArtifact`, output bundle metadata, available route
  and file metadata, provider notes, and operator notes. It does not consume
  the WGP directly except lineage references.
- Observation derives route/page inventory, file inventory, declared
  navigation, declared sections, declared message/content summaries, declared
  assets, technical signals, and missing observation limitations when those
  signals are explicitly available.
- If data is absent, the builder records a limitation instead of guessing.
- `validateObservedWebsiteModel(...)` validates required lineage, allowed
  status, unique observed IDs, readiness consistency, source proposal
  consistency when supplied, and recursive absence of compliance/downstream
  mutation fields.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only `observedWebsiteModelArtifacts`,
  `latestObservedWebsiteModelArtifact`, equivalent latest reuse, changed
  append, latest load, and by-ID load.
- Persistence rejects `invalid` and `stale`, and accepts `blocked`,
  `not_observable`, `partially_observable`, and `observable`.
- MVP-1K-3 added no Generation Contract Compliance, Compliance Report,
  Business Approval, publishing, provider calls, AI execution, automatic
  generation, UI, API, schema migration, workers, deployment, DNS mutation,
  production mutation, runtime mutation, generated code execution, or rendered
  inspection beyond existing metadata.

MVP-1K-4 Generation Contract Compliance Runtime Foundation:
- MVP-1K-4 is complete. It creates the first deterministic Generation
  Contract Compliance runtime foundation from Website Generation Package plus
  Observed Website Model only.
- Canonical document:
  `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_RUNTIME_FOUNDATION.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/generation-contract-compliance-contract.ts`,
  `apps/platform/gnr8/architecture/generation-contract-compliance-builder.ts`,
  and
  `apps/platform/gnr8/architecture/generation-contract-compliance-persistence.ts`.
- Artifact kind is `generation_contract_compliance`.
- Allowed statuses are `incomplete`, `partial`, `compliant`,
  `non_compliant`, `blocked`, `invalid`, and `stale`.
- `buildGenerationContractCompliance(...)` consumes only
  `WebsiteGenerationPackageArtifact` and `ObservedWebsiteModelArtifact`.
- MVP comparison categories are objectives represented, navigation
  obligations, page obligations, section obligations, message coverage, asset
  presence, trust signal presence, constraints preserved, accessibility
  expectations observable, and SEO expectations observable.
- Every finding references observable compliance evidence. Missing or
  unobservable signals become limitations rather than invented compliance.
- `validateGenerationContractCompliance(...)` validates source lineage,
  allowed statuses, required evidence, unique finding IDs, category coverage,
  source WGP/OWM consistency when supplied, and recursive absence of
  downstream approval/publishing/mutation/provider-execution fields.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only `generationContractComplianceArtifacts`,
  `latestGenerationContractComplianceArtifact`, equivalent latest reuse,
  changed append, latest load, and by-ID load.
- Persistence rejects `invalid` and `stale`, and accepts `blocked`,
  `incomplete`, `partial`, `compliant`, and `non_compliant`.
- MVP-1K-4 added no Compliance Report, Business Approval, publishing,
  provider calls, AI execution, automatic generation, UI, API, schema
  migration, workers, deployment, DNS mutation, production mutation, runtime
  mutation, or upstream business artifact mutation.
- MVP-1K-4-R real-target validation is complete and blocked before compliance
  build/persistence. ODV
  `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc
  `e26b0754-988b-45b9-9e24-8e213179b6cf` both have no latest persisted
  `ObservedWebsiteModelArtifact`, so the exact WGP artifacts were not loaded
  and no `GenerationContractComplianceArtifact` was persisted.
- MVP-1K-3-R real-target validation is complete and blocked before Observed
  Website Model build/persistence. Both targets have no latest persisted
  `GeneratedWebsiteProposalArtifact`, so no `ObservedWebsiteModelArtifact`
  was persisted.

MVP-1K-5 Generation Contract Compliance Report Runtime Foundation:
- MVP-1K-5 is complete. It creates the first deterministic Generation
  Contract Compliance Report runtime foundation from persisted
  `GenerationContractComplianceArtifact` only.
- Canonical document:
  `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_FOUNDATION.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/generation-contract-compliance-report-contract.ts`,
  `apps/platform/gnr8/architecture/generation-contract-compliance-report-builder.ts`,
  and
  `apps/platform/gnr8/architecture/generation-contract-compliance-report-persistence.ts`.
- Artifact kind is `generation_contract_compliance_report`.
- Allowed report statuses are `draft`, `partial`, `ready`, `blocked`,
  `invalid`, and `stale`.
- Recommendation values are `proceed_to_approval`, `regenerate`,
  `improve_wgp`, `repeat_business_alignment`, `insufficient_evidence`, and
  `human_review_required`.
- Readiness values are `ready`, `ready_with_limitations`,
  `requires_regeneration`, `requires_alignment`, and `blocked`.
- `buildGenerationContractComplianceReport(...)` explains the persisted
  compliance artifact through executive summary, overall compliance, business
  compliance, experience compliance, implementation observability, category
  results, deviations, missing requirements, constraint violations, business
  risks, recommendation, generation readiness, limitations, evidence summary,
  lineage, and diagnostics.
- The builder is deterministic and does not recompute compliance. Compliance
  evaluates; the report explains.
- Persistence uses existing site-version `importProvenanceSummary` with
  append-only `generationContractComplianceReportArtifacts`,
  `latestGenerationContractComplianceReportArtifact`, equivalent latest
  reuse, changed append, latest load, and by-ID load.
- MVP-1K-5 added no Business Approval, publishing, provider calls, AI
  execution, automatic generation, compliance recomputation, UI, API, schema
  migration, workers, deployment, DNS mutation, production mutation, runtime
  mutation, or upstream business artifact mutation.

MVP-2.0-C First Real Observed Website Model:
- Canonical document:
  `docs/architecture/FIRST_OBSERVED_WEBSITE_MODEL.md`.
- ODV source `GeneratedWebsiteProposalArtifact`:
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`.
- Latest ODV OWM artifact:
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- Status/readiness: `observable`.
- Observation counts: pages `1`, routes `1`, navigation/links `11`, sections
  `7`, headings `14`, CTA links `3`, messages `53`, assets `6`, constraints
  `9`, technical signals `12`, evidence refs `17`, limitations `127`.
- Latest reload, by-ID reload, immediate idempotent retry, and cold
  idempotent retry all returned
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- MVP-2.0-C added no WGP comparison, compliance, Compliance Report, Business
  Approval, publishing, deploy, provider execution, AI execution, generated
  proposal mutation, canonical business artifact mutation, UI, API, schema, or
  worker behavior.

MVP-2.0-D First Real Generation Contract Compliance:
- Canonical document:
  `docs/architecture/FIRST_REAL_GENERATION_CONTRACT_COMPLIANCE.md`.
- ODV source `WebsiteGenerationPackageArtifact`:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`.
- ODV source `ObservedWebsiteModelArtifact`:
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- Latest ODV Generation Contract Compliance artifact:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- Status/overall compliance: `non_compliant`.
- Category summary: compared `10`, compliant `0`, partial `2`,
  non-compliant `8`, blocked `0`, incomplete `0`.
- Evidence summary: findings `149`, deviations `145`, evidence records `12`,
  limitations `268`.
- Latest reload, by-ID reload, and idempotent retry all returned
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- MVP-2.0-D added no Compliance Report, Business Approval, publishing,
  deployment, provider execution, AI execution, regenerated website, WGP
  mutation, OWM mutation, canonical business artifact mutation, UI, API,
  schema, or worker behavior.

MVP-2.0-E First Real Generation Contract Compliance Report:
- Canonical document:
  `docs/architecture/FIRST_REAL_GENERATION_CONTRACT_COMPLIANCE_REPORT.md`.
- ODV source `GenerationContractComplianceArtifact`:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- Latest ODV Generation Contract Compliance Report artifact:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.
- Status: `blocked`.
- Recommendation: `regenerate`.
- Generation readiness: `requires_regeneration`.
- Section summary: executive summary `blocked` with `1` item, business
  compliance `blocked` with `4` items, experience compliance `blocked` with
  `6` items, implementation observability `blocked` with `4` items, and
  limitations `partial` with `268` items.
- Quality summary: source compliance is `non_compliant`; report item counts
  are failed `8` and partial `2`; the report preserves `12` compliance
  evidence records, `17` observed evidence references, `145` deviations,
  `147` missing requirements, `411` business risks, and `268` limitations.
- Latest reload, by-ID reload, and idempotent retry all returned
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.
- MVP-2.0-E added no Business Approval, publishing, deployment, provider
  execution, AI execution, regenerated website, WGP mutation, OWM mutation,
  Compliance artifact mutation, canonical business artifact mutation, UI,
  API, schema, or worker behavior.

MVP-2.0-F Generation Improvement Plan Runtime Foundation:
- Canonical document:
  `docs/architecture/GENERATION_IMPROVEMENT_PLAN_RUNTIME_FOUNDATION.md`.
- ODV source `GenerationContractComplianceReportArtifact`:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.
- Latest ODV Generation Improvement Plan artifact:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.
- Status: `ready`.
- Improvement count: `413`.
- Priority counts: critical `259`, high `0`, medium `154`, low `0`.
- Category summary: Constraints `228`, Assets `123`, Sections `36`,
  Navigation `8`, Messages `6`, Trust `6`, Business Positioning `4`,
  Accessibility `1`, SEO `1`.
- Recommended next action: `regenerate`.
- Estimated regeneration readiness: `ready`.
- Source report latest/by-ID validation passed, report validation passed, and
  lineage matched siteVersion, dry run, source Compliance, source Website
  Generation Package, and source Observed Website Model.
- Latest reload, by-ID reload, and idempotent retry all returned
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.
- MVP-2.0-F added no regenerated website, new Website Generation Package,
  Provider Payload v2, provider execution, AI execution, Business Approval,
  publishing, deployment, WGP mutation, Compliance mutation, Compliance Report
  mutation, provider payload mutation, UI, API, schema, or worker behavior.

MVP-2.0-G Provider Payload v2 Runtime Foundation:
- Canonical document:
  `docs/architecture/PROVIDER_PAYLOAD_V2_RUNTIME_FOUNDATION.md`.
- ODV source `WebsiteGenerationPackageArtifact`:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`.
- ODV source `GenerationImprovementPlanArtifact`:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.
- Latest ODV Provider Payload v2 artifact:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
- Status: `ready`.
- Runtime version: `MVP-2.0-G`.
- Source WGP status: `partial`; source Improvement Plan status: `ready`.
- Preserved WGP counts: objectives `2`, audience `3`, messages `5`,
  navigation destinations `4`, page contracts `4`, section contracts `14`,
  content requirements `128`, validation expectations `10`, confidence `LOW`.
- Improvement count: `413`.
- Priority counts: critical `259`, high `0`, medium `154`, low `0`.
- Affected categories: Accessibility, Assets, Business Positioning,
  Constraints, Messages, Navigation, SEO, Sections, Trust.
- Regeneration guidance counts: preserve `12`, improve `413`,
  do-not-change `6`, known limitations `112`, critical items `259`.
- Recommended regeneration strategy: run a full business-level regeneration
  pass focused first on critical items.
- Source WGP latest/by-ID validation passed, source Improvement Plan
  latest/by-ID validation passed, and lineage matched siteVersion, dry run, and
  source Website Generation Package.
- Latest reload, by-ID reload, and idempotent retry all returned
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
- Safety verification passed with no provider execution, no AI execution, no
  generated website, no generated HTML, no React, no CSS, no framework
  decisions, no deployment, no publishing, no DNS mutation, no runtime
  mutation, no Compliance execution, and no Business Approval.
- MVP-2.0-G added no Codex execution, provider execution, AI execution,
  regenerated website, Website Generation Package mutation, Generation
  Improvement Plan mutation, Compliance mutation, Compliance Report mutation,
  Business Approval, publishing, deployment, canonical business artifact
  mutation, UI, API, schema, workers, or Generated Website Proposal v2.

MVP-2.0-A First Real Website Generation Export:
- Canonical document:
  `docs/architecture/FIRST_REAL_WEBSITE_GENERATION_EXPORT.md`.
- Export directory: `ODV_EXPORT/`.
- Export ID: `odv-export-25b18a7102ed29c2`.
- Target: ODV only.
- Site version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`.
- Dry run: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`.
- Export status: `ready_for_manual_codex_execution`.
- Export safety classification: `export_only_no_execution`.
- Export contents: `manifest.json`, `lineage.json`,
  `website-generation-package.json`, `provider-generation-payload.json`,
  `business-summary.md`, `limitations.md`, and `execution-readme.md`.
- Artifact chain verified:
  `business_discovery_7b37413651d79de0d109e31690a34b62` ->
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` ->
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad` ->
  `business_alignment_18c0a6958048bf8985044e4781e788a8` ->
  `digital_business_twin_2614a690e29e87a201658f3de4f72983` ->
  `website_design_brief_ff19a711c948d28fdd58bdea521c4f59` ->
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` ->
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`.
- Lineage checks passed from BusinessDiscovery through
  ProviderGenerationPayload with no missing links.
- Safety verification passed: no provider execution, no AI execution, no
  generated website, no publishing, no deployment, no DNS mutation, no
  production mutation, no compliance execution, no Business Approval, and no
  forbidden generated-output fields in the provider payload.
- MVP-2.0-A created no provider calls, no prompt sends, no Codex execution, no
  website generation, no publishing, no compliance, no Business Approval, no
  API, no UI, no schema migration, no worker, no deployment, no DNS mutation,
  and no production mutation.

MVP-2.0-A2 Generation Delivery Package Polish:
- `ODV_EXPORT/` is now documented as the first GNR8 Generation Delivery
  Package.
- `business-summary.md` was rewritten from technical export language into a
  business-readable summary covering business overview, apparent purpose,
  website objectives, known offerings, known audience, brand/tone, trust
  signals, navigation intent, known missing knowledge, and low-confidence
  areas.
- `limitations.md` now includes explicit `What Codex MUST NOT invent` and
  `What Codex SHOULD preserve` sections while retaining the existing missing
  knowledge, low-confidence, source limitation, and operational limitation
  ledgers.
- `execution-readme.md` now includes concrete expected deliverables, stop
  conditions, forbidden actions, output-folder guidance, and the unchanged
  quarantine rule.
- `provider-generation-payload.json` now includes a non-canonical
  execution-facing `generationMission` field. The canonical
  ProviderGenerationPayload runtime contract was not changed.
- MVP-2.0-A2 added no provider calls, no Codex execution, no AI execution, no
  generated website, no import, no compliance, no approval, no publishing, no
  API, no UI, no worker, no schema change, no deployment, no DNS mutation, and
  no production mutation.

Subsequent phase after MVP-2.0-G:
- MVP-2.0-H - Regeneration Delivery Package v2 packaged the persisted
  Provider Payload v2 for a future manual regeneration cycle without Codex
  execution, provider execution, AI execution, website generation, Generated
  Website Proposal v2, publishing, deployment, DNS, or Business Approval.

Phase AO-0 created the first complete canonical architecture narrative:
`docs/architecture/THE_GNR8_BLUEPRINT.md`.

The GNR8 Blueprint is now the preferred onboarding document before reading
detailed architecture specifications. It explains GNR8 from first principles:
what GNR8 is, why it exists, why traditional CMSs and generic AI builders are
insufficient, how the Digital Business Twin, Business Journey, Decision
Architecture, Website Design Brief, Website Generation Package, external AI,
compliance, Business Approval, publishing, and Continuous Evolution fit
together.

Canonical five-layer architecture:

```text
Reality
-> Knowledge
-> Decision
-> Experience
-> Execution
```

Canonical AO-0 lifecycle:

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
-> Continuous Evolution
```

AO-0 changed documentation only. It added no implementation, TypeScript,
schema, persistence, API, UI, workers, prompts, provider adapters, AI
integration, generation, or publishing behavior.

Validation result: `git diff --check` passes.

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
- 8B-12O: Cross-Site Evidence and Model Quality Re-Assessment, documentation/read-only only.

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
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary is complete.
- Phase 8B-12 — First Real-Site Limited Dry Run Operational Test is complete with preflight failure.
- Phase 8B-12F — Reconstruction Readiness Inventory Audit is complete.
- Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit is complete.
- Phase 8B-12H — Production Evidence Capture Worker Readiness Fix is the next recommended phase.
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
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary is complete.
- Phase 8B-12 — First Real-Site Limited Dry Run Operational Test is complete with preflight failure.
- Phase 8B-12F — Reconstruction Readiness Inventory Audit is complete.
- Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit is complete.
- Phase 8B-12H — Production Evidence Capture Worker Readiness Fix is the next recommended phase.
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
