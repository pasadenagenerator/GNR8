# MVP-0 First Executable Website Transformation Pipeline

## Phase And Boundary

Phase MVP-0 transforms the completed GNR8 architecture into the first
executable MVP roadmap.

This document defines no new architecture. It reconciles the existing
canonical architecture with the current codebase and identifies the shortest
path from one imported customer website to one newly generated, validated,
approved, and published website.

This phase is documentation, architecture analysis, and implementation
planning only. It adds no feature implementation, TypeScript, database schema,
API, UI, worker, provider adapter, AI integration, or publishing behavior.

## Business Objective

The first executable MVP must prove one business outcome:

```text
Import one existing website.
Understand the business.
Produce a Website Generation Package.
Generate a new website through an external AI provider.
Validate the result.
Approve it.
Publish it.
```

## Canonical MVP Pipeline

```text
Import Existing Website
-> Evidence Collection
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generated Website Proposal
-> Website Observation
-> Observed Website Model
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

## MVP-2.0-ARCH Generation Cycle Addendum

MVP-2.0-ARCH adds the canonical Generation Cycle Architecture as an
organizational governance model for iterative website evolution. It does not
rewrite the canonical artifact lineage above.

Canonical document:

- `docs/architecture/GENERATION_CYCLE_ARCHITECTURE.md`

Canonical relationship:

```text
Reality
        ↓
Business Understanding
        ↓
Website Generation Package
        ↓
Generation Cycle
        ↓
Iteration 1
        ↓
Iteration 2
        ↓
Iteration 3
        ↓
...
        ↓
Approved Website
```

Generation Cycle groups proposal, observation, compliance, report,
improvement, and next-payload history across iterations. The Website
Generation Package remains the canonical generation contract, and artifact
lineage remains the canonical truth and causality model.

MVP-2.0-ARCH adds no runtime behavior, persistence, schema, API, UI, workers,
provider execution, AI execution, regeneration, publishing, deployment, or
canonical business artifact mutation.

## MVP-2.0-N Generation Evolution Dashboard Addendum

MVP-2.0-N adds the canonical Generation Evolution Dashboard architecture as
the read-only historical view of a website's evolution across Generation
Cycles and Iterations.

Canonical document:

- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD.md`

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

Each iteration is represented by a read-only card that summarizes iteration
number, Generation Cycle, creation timestamp, status, overall assessment,
recommendation, compliance status, confidence, and improvement summary. Each
card links to canonical artifacts such as Business Discovery, Digital Business
Twin, Business Understanding Report, Business Alignment, Website Design Brief,
Website Generation Package, Provider Payload, Generated Proposal, Observed
Website, Compliance, Compliance Report, Improvement Plan, and Evolution
Analysis.

The dashboard also defines the conceptual preview relationship:

```text
Generated Website
-> Preview URL
-> Open Preview
-> Static Snapshot
-> Proposal Bundle
```

Every generated version must remain reachable through its iteration so users
can manually inspect and compare historical versions. Future automated visual
diff, metrics, provider comparison, or comparison engines remain outside this
phase.

MVP-2.0-N adds no runtime behavior, persistence, schema, API, UI, workers,
provider execution, AI execution, publishing, dashboard routes, artifact
contract changes, Generation Cycle runtime changes, compliance runtime
changes, or automatic future-iteration comparison.

## MVP-3.0-A Generation Evolution Dashboard Runtime Foundation Addendum

MVP-3.0-A implements the first real read-only GNR8 Runtime UX surface:

```text
/gnr8/admin/evolution/[siteVersionId]
```

ODV target:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Runtime foundation document:

- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD_RUNTIME_FOUNDATION.md`

The implementation adds a runtime dashboard projection, a superadmin-only
server-rendered admin page, read-only artifact references, focused tests, and
safe static previews for the two quarantined generated proposal bundles:

```text
/gnr8/admin/evolution/[siteVersionId]/iterations/1/preview/
/gnr8/admin/evolution/[siteVersionId]/iterations/2/preview/
```

The previews serve only allowlisted proposal bundle files rooted at
`source/index.html`. They are quarantined generated proposals, not published
websites. Runtime preview availability depends on whether the proposal source
folders are present in the current runtime filesystem.

MVP-3.0-A adds no artifact editing, Business Alignment interaction,
generation controls, regeneration controls, approval controls, publishing,
deployment, DNS mutation, production website mutation, provider execution, AI
execution, workers, schema changes, persistence changes, automatic visual
comparison, or compliance recomputation.

## MVP-3.0-B Generation Evolution Dashboard Real-Target Verification Addendum

MVP-3.0-B performs and completes the first local real-target authenticated
operator verification pass for the ODV Generation Evolution Dashboard.

Verification document:

- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD_REAL_TARGET_VERIFICATION.md`

Verified ODV runtime facts:

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
```

The existing superadmin guard is active and the authenticated browser pass
used the existing `SUPERADMIN_EMAILS` allowlist through an ignored local env
file. No auth bypass was added, no production env configuration changed, and
the private local email value is not documented.

Both allowlisted generated proposal preview bundles are available locally and
were opened from the dashboard in the browser. Iteration 1 rendered styled
HTML/CSS/JavaScript with no image elements. Iteration 2 rendered styled
HTML/CSS/JavaScript with local SVG assets and no broken image elements. The
preview boundary remains fail-closed for unknown iterations, missing files,
traversal, encoded traversal, absolute path attempts, outside-source attempts,
outside-bundle resolution, and unavailable bundles.

MVP-3.0-B made narrow rendering/UX fixes only: the preview card now says
`Generated Proposal Preview`, artifact lineage keys are unique, and preview
HTML rewrites local `./...` asset references through `/preview/source/` so
CSS, JavaScript, and SVG assets resolve in the browser.

MVP-3.0-B adds no edit UX, Business Alignment UX, generation controls,
regeneration controls, approval controls, publishing, deployment, provider
execution, AI execution, DNS controls, production mutation, schema changes,
workers, broad redesign, or new dashboard concepts.

## MVP-3.0-C Business Foundation Runtime UX Addendum

MVP-3.0-C implements the second real read-only GNR8 Runtime UX surface:

```text
/gnr8/admin/business-foundation/[siteVersionId]
```

ODV target:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Runtime UX document:

- `docs/architecture/BUSINESS_FOUNDATION_RUNTIME_UX.md`

The Business Foundation page is the canonical superadmin entry point for
understanding why GNR8 generated a website the way it did. It visualizes the
persisted business foundation without requiring operators to open raw JSON
artifacts.

The runtime projection consumes only the existing business artifact chain:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Aligned Digital Business Twin
-> Website Design Brief
-> Website Generation Package
```

It intentionally excludes provider artifacts, Generated Proposals,
Compliance, Compliance Reports, Improvement Plans, Observed Website Models,
and Generation Evolution Analysis.

The page displays Business Summary, Business Knowledge, Offerings, Audience,
Missing Knowledge, Transformation Story, Business Foundation Status,
Attention States, and a read-only Artifact Explorer with copyable artifact
IDs.

After MVP-3.0-C, GNR8 has two complete Runtime UX surfaces:

```text
Business Foundation (WHY)
-> Generation Evolution Dashboard (HOW)
```

MVP-3.0-C adds no editing, AI execution, generation, regeneration, provider
execution, Business Alignment editing, approval, publishing, deployment, DNS,
schema changes, persistence changes, workers, or mutation server actions.

## MVP-3.0-D Business Foundation Real-Target Operator Verification Addendum

MVP-3.0-D completes the first authenticated real-target operator verification
of the ODV Business Foundation page.

Canonical verification record:

- `docs/architecture/BUSINESS_FOUNDATION_REAL_TARGET_VERIFICATION.md`

Verified route:

```text
/gnr8/admin/business-foundation/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The authenticated local browser session loaded the route without redirecting
to login or agency workspace. The page displayed the target `siteVersionId`,
source site, dry run, Business Summary, Business Knowledge, Offerings,
Audience, Missing Knowledge, Transformation Story, Business Foundation
Status, Attention States, and Artifact Explorer.

ODV remained visibly partial:

```text
business confidence: LOW
known knowledge: 12
missing knowledge: 4
limitations: 538
WGP status: partial
attention states: low_confidence, missing_audience, missing_offerings, large_limitation_count, business_partially_understood
```

Narrow read-only UX fixes:

- Business Foundation now links to `Inspect Generation Evolution`.
- Generation Evolution now links back to `Inspect Business Foundation`.
- The visible `Business Health` label was narrowed to `Business Foundation
  Status`.

MVP-3.0-D adds no editing, Business Alignment interaction, correction
controls, generation controls, regeneration controls, provider execution, AI
execution, approval controls, publishing, deployment, DNS mutation,
production mutation, schema changes, persistence changes, workers, broad
redesign, new business interpretation logic, or new confidence/readiness
calculations.

## Reality Assessment Table

Allowed status values are `COMPLETE`, `PARTIAL`, `MISSING`, and
`NOT_REQUIRED_FOR_MVP`.

| Stage | Architecture Status | Current Code Status | Existing Runtime | Existing Persistence | Existing Tests | MVP Readiness |
| --- | --- | --- | --- | --- | --- | --- |
| Import Existing Website | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE |
| Evidence Collection | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Business Discovery | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Digital Business Twin | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Business Understanding Report | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Business Alignment | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Website Design Brief | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Website Generation Package | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Provider Adapter | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| External AI | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
| Generated Website Proposal | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Website Observation | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Observed Website Model | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Generation Contract Compliance | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Generation Contract Compliance Report | COMPLETE | PARTIAL | PARTIAL | PARTIAL | COMPLETE | PARTIAL |
| Business Approval | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
| Publish | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | MISSING |

## Stage Assessments

### Import Existing Website

Current implementation:
- URL and HTML import paths exist through the validation and scoped import
  pipeline.
- The runtime persists imported site versions, raw imported site artifacts,
  file rows, content slots, preview artifacts, and import provenance.
- Multi-page discovery, raw artifact assembly, route normalization, sitemap
  discovery, robots discovery, and operator summaries exist.
- Existing code references include `importPublicSinglePageUrlToSnapshot(...)`,
  `runScopedImportPipeline(...)`, raw import artifact persistence, and
  agency/import API routes.

Missing implementation:
- No MVP-specific transformation orchestrator yet connects import completion
  directly to the canonical business-understanding chain.

Dependencies:
- Runtime site version identity.
- Raw imported site artifact.
- Import provenance summary.
- Evidence capture baseline attachment.

Risk:
- Low for first import execution.
- Medium if the first customer website needs broad multi-page acquisition,
  authenticated pages, scripts, forms, or dynamic interactions.

Estimated implementation complexity:
- Low for MVP because import already exists and should be reused.

### Evidence Collection

Current implementation:
- Evidence Capture baseline artifacts exist as partial provenance artifacts.
- Rendered capture worker contracts, worker client, readiness checks, layout
  geometry evidence, section boundary evidence, and navigation evidence exist.
- The baseline explicitly records `baseline_partial`, not reconstruction-grade
  evidence.
- Recent operational history shows fresh capture can fail or degrade depending
  on worker readiness, timeout, navigation, and capture-expansion persistence.

Missing implementation:
- Evidence remains incomplete for reconstruction-grade fidelity.
- Runtime mutation evidence, full network traces, computed style depth,
  responsive breakpoints, accessibility tree, interaction state, and advanced
  media/widget evidence are not required for MVP 1.0 but remain missing.
- The MVP needs a pass/fail evidence readiness gate for business discovery,
  not a broad reconstruction-grade gate.

Dependencies:
- Import Existing Website.
- Raw imported site artifact and source URL.
- Rendered capture worker readiness.
- Evidence Capture baseline persistence.

Risk:
- Medium. MVP can tolerate partial evidence, but the first customer result
  must have enough source-grounded text, route, navigation, section, asset, and
  screenshot evidence to support business understanding and compliance.

Estimated implementation complexity:
- Medium. Existing capture foundations can be reused, but MVP needs a narrow
  readiness gate and a deterministic evidence summary for downstream artifacts.

### Business Discovery

Current implementation:
- Semantic import, site tree, style signals, template family, multipage
  discovery, Candidate Discovery, Candidate Review, Candidate Context, and
  Reconstruction Package foundations exist.
- These are useful website-understanding and reconstruction-adjacent systems,
  but they are not yet the canonical Business Discovery artifact described by
  the completed architecture.
- MVP-1A adds the first canonical runtime Business Discovery artifact,
  deterministic website-evidence builder, contract validator, and provenance
  persistence boundary under artifact kind `business_discovery`.
- The first builder derives conservative findings from imported source URL,
  route paths, navigation labels, section boundary types, asset inventory
  counts, upstream limitations, diagnostics, and optional Candidate Discovery
  context.

Missing implementation:
- DBT builder consumption is now implemented in MVP-1B.
- No Business Owner confirmation or multi-source domain reconciliation exists
  in this layer.

Dependencies:
- Evidence Collection.
- Canonical Business Domain model.
- Digital Business Twin specification.

Risk:
- Medium after MVP-1C-R. The first runtime Business Discovery artifacts now
  exist and have produced persisted ODV and ViroiDoc DBT and Business
  Understanding Report artifacts, but downstream Business Alignment, Design
  Brief, Generation Package, and Compliance must consume the artifact chain
  rather than bypassing it with prompt-first or website-copy-first shortcuts.

Estimated implementation complexity:
- First runtime slice, provenance persistence, real-target validation, and DBT
  input consumption are complete.

### Digital Business Twin

Current implementation:
- A runtime `twin` package exists with deterministic in-memory website twin
  snapshots, viewer payloads, insights, optimizations, proposal candidates,
  approval previews, and execution-readiness records.
- The current twin code is useful as prior runtime foundation, but it is not
  yet the canonical governed Digital Business Twin that integrates Business
  Domains, evidence, facts, interpretations, knowledge, understanding,
  governance state, lineage, and versioning.
- MVP-1B adds the first canonical runtime DBT artifact from persisted Business
  Discovery, deterministic builder, contract validator, and provenance
  persistence boundary under artifact kind `digital_business_twin`.
- DBT v1 maps Business Discovery findings into knowledge items, records
  missing knowledge for domains without Business Discovery support, preserves
  uncertainty, and fail-closes blocked, invalid, or stale source Business
  Discovery states.
- MVP-1B-R validates DBT runtime behavior on real ODV and ViroiDoc Business
  Discovery artifacts and persists real DBT artifacts for both targets.
- MVP-1C adds the first canonical Business Understanding Report consumer of
  persisted DBT artifacts.
- MVP-1C-R validates that the real ODV and ViroiDoc DBT artifacts produce
  persisted, reloadable, human-readable Business Understanding Reports.

Missing implementation:
- No Business Owner confirmation or multi-source domain reconciliation exists.
- No governance-state transition or alignment correction loop exists above DBT.

Dependencies:
- Business Discovery.
- Governance State.
- Lineage and Versioning.
- Canonical artifact persistence boundary.

Risk:
- Medium after MVP-1C-R. The first canonical DBT artifact, persistence path,
  and real-target ODV/ViroiDoc DBT artifacts exist and have been consumed by
  persisted Business Understanding Reports. Business Alignment, Design Brief,
  Generation Package, and Compliance must continue to consume the artifact
  chain rather than bypassing it.

Estimated implementation complexity:
- First deterministic DBT runtime slice and real-target DBT validation are
  complete. Remaining work starts with Business Alignment consuming persisted
  Business Understanding Report artifacts.

### Business Understanding Report

Current implementation:
- The architecture specification is complete.
- MVP-1C adds the first runtime Business Understanding Report artifact from
  persisted Digital Business Twin, deterministic builder, contract validator,
  and provenance persistence boundary under artifact kind
  `business_understanding_report`.
- DBT knowledge items become human-readable report sections. DBT
  `missingKnowledge` becomes the Missing Knowledge section. DBT limitations,
  evidence refs, confidence, lineage, and diagnostics are preserved.
- The report includes executive summary, business overview, products and
  services, target audience, business goals, brand identity, current digital
  presence, trust signals, missing knowledge, confidence overview,
  recommendations, limitations, evidence summary, and diagnostics.
- Recommendations are business-oriented only and never prescribe implementation
  technology, prompts, provider behavior, publishing behavior, or generated
  output.
- MVP-1C-R previously attempted real-target validation on ODV and ViroiDoc, but
  both supplied site versions were missing persisted DBT artifacts at that
  time. MVP-1B-R has now produced the required DBT artifacts.
- MVP-1C-R retry validates the newly persisted ODV and ViroiDoc DBT artifacts,
  persists BUR artifacts for both targets, verifies latest and by-ID reload,
  verifies idempotent retry reuse, and records human-readability and safety
  checks.

Missing implementation:
- No Business Owner review, correction loop, UI, or API exists for the report.
- No downstream authorization gate exists above the report.

Dependencies:
- Digital Business Twin.
- Canonical artifact governance state.
- Lineage.

Risk:
- Medium after MVP-1D. The BUR contract, builder, persistence helpers, and
  real-target ODV/ViroiDoc validation now pass, and the first Business
  Alignment runtime consumes BUR plus DBT without editing reports. The
  remaining risk is downstream Website Design Brief consuming aligned DBT
  output without bypassing evidence, missing knowledge, confidence,
  limitations, or lineage.

Estimated implementation complexity:
- First deterministic report builder, validation, persistence, and focused
  tests are complete. Real-target BUR validation is complete. The first
  runtime Business Alignment foundation is complete.

### Business Alignment

Current implementation:
- The architecture specification is complete.
- MVP-1D adds the first runtime Business Alignment artifact, correction
  contract, deterministic DBT revision runtime, validator, and provenance
  persistence boundary under artifact kind `business_alignment`.
- Business Alignment consumes a source Business Understanding Report and a
  source Digital Business Twin, but modifies only DBT knowledge.
- Business Alignment never edits Business Understanding Reports. Reports
  remain deterministic projections from the current Digital Business Twin.
- Supported MVP correction types are `confirm`, `correct`, `remove`,
  `add_missing`, and `unresolved`.
- Alignment produces a new Digital Business Twin revision, not report changes.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only `businessAlignmentArtifacts`,
  `latestBusinessAlignmentArtifact`, equivalent latest reuse, changed append,
  latest/by-ID loads, `invalid`/`stale` rejection, and `blocked` allowed.
- MVP-1D-R validates Business Alignment on real ODV and ViroiDoc DBT plus BUR
  artifacts, persists Business Alignment artifacts for both targets, persists
  DBT vNext through the existing DBT persistence helper, verifies latest and
  by-ID reload equality, verifies idempotent retry reuse, and records lineage,
  evidence, limitations, and missing knowledge preservation.

Missing implementation:
- Gate that allows Website Design Brief only after alignment.
- Business Owner UI/API review surface.
- Advanced alignment collaboration, supersession, and governance-state
  workflows.

Dependencies:
- Business Understanding Report.
- Digital Business Twin.
- Governance State.
- Lineage.

Risk:
- Medium after MVP-1D-R. Business Alignment now deterministically confirms or
  improves DBT knowledge before planning begins, and real ODV/ViroiDoc
  validation has produced persisted Business Alignment artifacts and governed
  DBT vNext results without inventing customer facts. The downstream Website
  Design Brief gate is still missing.

Estimated implementation complexity:
- First deterministic alignment contract, runtime, persistence, focused tests,
  and real-target validation are complete. Remaining work starts with the
  first Website Design Brief builder.

### Website Design Brief

Current implementation:
- The architecture specification is complete.
- MVP-1E adds the first runtime Website Design Brief artifact from an aligned
  Digital Business Twin plus Business Alignment lineage.
- Website Design Brief is the first Experience Projection of an Aligned
  Digital Business Twin.
- Website Design Brief is produced ONLY from an Aligned Digital Business Twin.
- Website Design Brief contains website intent.
- Website Design Brief never contains implementation.
- MVP-1E adds the deterministic builder, contract validator, focused tests,
  and provenance persistence boundary under artifact kind
  `website_design_brief`.
- MVP-1E-R validates the Website Design Brief runtime against real ODV and
  ViroiDoc aligned DBT vNext artifacts and Business Alignment lineage.
- MVP-1E-R persists ODV
  `website_design_brief_ff19a711c948d28fdd58bdea521c4f59` and ViroiDoc
  `website_design_brief_782c43e390c353d192af867c227d191d`.
- MVP-1E-R confirms latest reload equality, by-ID reload equality,
  idempotent retry reuse, human-readability, and no downstream generation
  material for both targets.
- Canonical sections are Executive Summary, Website Purpose, Website
  Objectives, Target Audience, Core Messages, Brand Expression, Information
  Priorities, Website Journey, Trust Strategy, Accessibility Goals, SEO Intent,
  Experience Constraints, Missing Knowledge, Recommendations, Confidence,
  Limitations, and Diagnostics.
- Persistence uses existing site-version `importProvenanceSummary` with
  append-only `websiteDesignBriefArtifacts`,
  `latestWebsiteDesignBriefArtifact`, equivalent latest reuse, changed append,
  latest/by-ID loads, `invalid`/`stale` rejection, and `blocked` allowed.

Missing implementation:
- Human Website Design decision and review workflow.
- Downstream Website Generation Package runtime builder.

Dependencies:
- Business Alignment.
- Aligned Digital Business Twin.
- Website Experience Domain scope.

Risk:
- Medium-low. The first deterministic Website Design Brief runtime exists and
  real-target validation has passed, but downstream package preparation is not
  implemented yet.

Estimated implementation complexity:
- First deterministic Website Design Brief runtime slice and focused tests are
  complete, and real-target validation has persisted ODV/ViroiDoc WDB
  artifacts. Remaining work starts with the first Website Generation Package
  runtime builder.

### Website Generation Package

Current implementation:
- The architecture specification and earlier Generation Package foundation
  document exist.
- MVP-1F adds the first canonical `WebsiteGenerationPackage` runtime artifact
  from a persisted Website Design Brief.
- MVP-1F adds the deterministic builder, contract validator, focused tests,
  provider-neutral validation contract, and provenance persistence boundary
  under artifact kind `website_generation_package`.
- MVP-1F-R validates the Website Generation Package runtime against real ODV
  and ViroiDoc persisted Website Design Brief artifacts.
- MVP-1F-R persists ODV
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` and ViroiDoc
  `website_generation_package_3e34393aef612a2c597042917dc45085`.
- MVP-1F-R confirms latest reload equality, by-ID reload equality, rebuilt
  semantic equality, idempotent retry reuse, human-readability,
  provider-neutrality, and no forbidden downstream generation material for
  both targets.
- The package answers: "What must an external generation system create?"
- The package is not a prompt, provider payload, generated website,
  implementation artifact, publishing artifact, UI, API, schema, or worker.
- Persistence uses existing site-version `importProvenanceSummary` with
  append-only `websiteGenerationPackageArtifacts`,
  `latestWebsiteGenerationPackageArtifact`, equivalent latest reuse, changed
  append, latest/by-ID loads, `invalid`/`stale` rejection, and `blocked`
  allowed.

Missing implementation:
- Provider serialization boundary.

Dependencies:
- Website Design Brief.
- Governance State.
- Lineage.
- Canonical artifact persistence.

Risk:
- Medium-low. The first deterministic Website Generation Package runtime
  exists and real-target validation has passed, but provider serialization is
  not implemented yet.

Estimated implementation complexity:
- First deterministic Website Generation Package runtime slice and focused
  tests are complete, and real-target validation has persisted ODV/ViroiDoc WGP
  artifacts. Remaining work starts with provider-adapter boundary design before
  any provider payload, prompt, external AI call, or generated website is
  introduced.

### Provider Adapter

Current implementation:
- MVP-1G defines the provider adapter boundary as
  `WebsiteGenerationPackageArtifact -> ProviderGenerationPayload`.
- The adapter is defined as a serialization-only boundary. It preserves WGP
  meaning, constraints, limitations, confidence, diagnostics, and lineage.
- MVP-1G recommends exactly one first provider path: Codex task payload.
- MVP-1H implements the first concrete provider payload path with provider
  type `codex`, payload kind `codex_task`, and artifact kind
  `provider_generation_payload`.
- Runtime modules now implement `ProviderGenerationPayload`,
  `ProviderGenerationPayloadLineage`, `ProviderAdapterIdentity`,
  `buildCodexTaskProviderPayload(...)`,
  `validateProviderGenerationPayload(...)`,
  `persistProviderGenerationPayload(...)`,
  `loadLatestProviderGenerationPayload(...)`, and
  `loadProviderGenerationPayloadById(...)`.
- The Codex task envelope instructs future Codex execution to produce an
  implementation proposal only, with no provider call, prompt send, external
  AI execution, generated website output, compliance execution, Business
  Approval, publishing, deployment, DNS mutation, production mutation, UI,
  API, schema, or worker behavior in MVP-1H.
- Provider payload persistence uses the existing site-version
  `importProvenanceSummary` boundary with append-only history, latest pointer,
  equivalent latest reuse, changed append, latest load, by-ID load,
  `invalid`/`stale` rejection, and `blocked` allowed.
- MVP-1H-R validates that real ODV and ViroiDoc Website Generation Package
  artifacts produce persisted, reloadable, export-ready Codex task provider
  payloads.
- ODV source WGP `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
  produced `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`.
- ViroiDoc source WGP
  `website_generation_package_3e34393aef612a2c597042917dc45085` produced
  `provider_generation_payload_2d99b17572dc23ef482cf56ba06e1230`.
- Both provider payloads reload by latest and by ID, idempotent retry reuses
  the same artifact IDs, and the envelopes are export-ready with objective,
  source package summary, required website outcomes, navigation/page/section
  requirements, content requirements, constraints, validation expectations,
  forbidden actions, expected output shape, and stop conditions.
- MVP-1I defines the governed provider execution boundary after export-ready
  payloads:
  `ProviderGenerationPayload -> External AI Execution -> Generated Website
  Proposal`.
- MVP-1I recommends Manual Codex execution outside GNR8 as the first execution
  mode, followed by future controlled import of manually generated output as
  quarantined proposal material.
- MVP-1J defines the manual Codex execution runbook and future Generated
  Website Proposal import boundary. It requires exact source payload and WGP
  artifact recording, copied payload integrity, no hidden prompt edits, no
  business reinterpretation, proposal-only output, no production mutation, no
  deployment, no publishing, no DNS mutation, external bundle storage, and
  operator attestation.
- Canonical design document:
  `docs/architecture/PROVIDER_ADAPTER_BOUNDARY_DESIGN.md`.
- Canonical runtime document:
  `docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_BUILDER.md`.
- Canonical real-target validation document:
  `docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_REAL_TARGET_VALIDATION.md`.
- Canonical provider execution boundary document:
  `docs/architecture/PROVIDER_EXECUTION_BOUNDARY_DESIGN.md`.
- Canonical manual execution runbook:
  `docs/architecture/MANUAL_CODEX_EXECUTION_RUNBOOK.md`.
- Canonical generated proposal import boundary document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`.

Missing implementation:
- No provider call, prompt sent, external AI execution, or generated website
  exists.

Dependencies:
- Website Generation Package.
- Governance State.
- Lineage.
- Provider credential and execution policy for later provider-call phases.

Risk:
- Low for provider payload export. Real-target validation has proved durable
  payload persistence and reload without business reinterpretation.
- Higher risk remains at the future execution runbook, controlled import, and
  actual provider execution boundary.

Estimated implementation complexity:
- Low for execution runbook and generated proposal import boundary design.
- External provider execution remains a later, higher risk boundary.

### External AI

Current implementation:
- Legacy AI, migration, transformation, and provider-control-plane code exists.
- Provider/DNS control-plane readiness and governance metadata exist.
- MVP-1I defines the canonical future execution boundary:
  `ProviderGenerationPayload -> External AI Execution -> Generated Website
  Proposal`.
- MVP-1I defines future ProviderExecutionRequest, ProviderExecutionRun,
  ProviderExecutionResult, and GeneratedWebsiteProposal concepts, but adds no
  TypeScript or runtime behavior.
- MVP-1J defines the manual Codex execution runbook outside GNR8 and the
  future quarantine-first GeneratedWebsiteProposal import boundary. It defines
  conceptual GeneratedWebsiteProposalLineage, GeneratedWebsiteProposalStatus,
  GeneratedWebsiteProposalSource, GeneratedWebsiteProposalSafety, and
  GeneratedWebsiteProposalValidationReadiness without runtime behavior.
- MVP-1K-1 implements quarantined Generated Website Proposal import/storage
  for manually generated Codex output bundle metadata under artifact kind
  `generated_website_proposal`.
- No canonical external AI execution runtime consumes a ProviderGenerationPayload
  and returns a Generated Website Proposal for this architecture.

Missing implementation:
- Provider execution from the selected Codex task payload path.
- Execution record with model/provider metadata, input package reference,
  output reference, diagnostics, and failure classification.
- Safe generated-output content storage and observation for validation before
  publish.

Dependencies:
- Website Generation Package.
- Provider Adapter.
- Provider credential resolution and execution policy.
- Generated proposal artifact boundary.

Risk:
- Critical for actual execution. MVP cannot prove website transformation
  without one working provider path, but multiple providers are not required.
- Lower for the first recommended mode because Manual Codex execution outside
  GNR8 avoids provider credential plumbing and keeps generated output
  quarantined until observation, compliance, and Business Approval exist.

Estimated implementation complexity:
- Low for the completed manual-output import/storage foundation.
- High for direct or API-based provider execution.

### Generated Website Proposal

Current implementation:
- MVP-1K-1 implements the first runtime foundation for importing manually
  generated Codex output bundle metadata as a quarantined Generated Website
  Proposal.
- Runtime modules now implement `GeneratedWebsiteProposalArtifact`,
  `GeneratedWebsiteProposalLineage`, `GeneratedWebsiteProposalSource`,
  `GeneratedWebsiteProposalSafety`,
  `GeneratedWebsiteProposalValidationReadiness`,
  `GeneratedWebsiteProposalOperatorAttestation`,
  `buildGeneratedWebsiteProposalFromManualOutput(...)`,
  `validateGeneratedWebsiteProposal(...)`,
  `persistGeneratedWebsiteProposal(...)`,
  `loadLatestGeneratedWebsiteProposal(...)`, and
  `loadGeneratedWebsiteProposalById(...)`.
- Artifact kind is `generated_website_proposal`.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only history, latest pointer, equivalent latest reuse,
  changed append, latest load, and by-ID load.
- Import requires source ProviderGenerationPayload, source WGP lineage,
  operator-provided output bundle metadata, and operator attestation.
- Import rejects missing attestation, missing output bundle metadata, lineage
  mismatch, publish/deploy/DNS/runtime mutation artifacts, compliance or
  approval artifacts, canonical business artifact fields, and claims that GNR8
  performed provider execution side effects.
- Imported proposals remain implementation proposal material only. They are not
  trusted, not compliance, not Business Approval, not publishable, and not a
  mutation of DBT, BUR, Business Alignment, WDB, WGP, or
  ProviderGenerationPayload.
- MVP-2.0-J imported the second real ODV proposal from
  `ODV_GENERATED_PROPOSAL_002/` as quarantined Generated Website Proposal v2:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.
- Iteration 1 remains immutable and reloadable by ID as
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`.
- Iteration 2 became the latest proposal for ODV. Latest reload and by-ID
  reload both returned
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`; idempotent
  retry reused the same artifact; the proposal count increased exactly once
  from `1` to `2`.
- Iteration 2 source lineage was verified as WGP
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` ->
  compliance `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`
  -> report
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`
  -> improvement plan
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694` ->
  Provider Payload v2
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7` ->
  proposal v2
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.
- Iteration and generation cycle metadata are preserved in source diagnostics
  and operator attestation, not by changing existing canonical proposal
  contracts.

Missing implementation:
- Compliance Report v2.
- Business Approval and publish authorization.

Dependencies:
- ProviderGenerationPayload.
- Website Generation Package.
- Manual Codex output bundle metadata.
- Operator attestation.

Risk:
- Medium. The proposal can now be stored safely and has been observed into
  OWM v2, but the generated output has not been compared against the package.

Estimated implementation complexity:
- First import/storage foundation is complete. Remaining work begins with the
  compliance v2 boundary for Iteration 2.

### Website Observation

Current implementation:
- MVP-1K-2 defines the Generated Website Proposal Observation Boundary Design
  in
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.
- MVP-1K-3 adds the first deterministic observation runtime foundation in
  `apps/platform/gnr8/architecture/observed-website-model-builder.ts`.
- Observation pipeline is
  `Generated Website Proposal -> Website Observation -> Observed Website Model
  -> Future Contract Comparison`.
- Observation sources are generated output bundle metadata, generated file
  tree metadata when available, asset inventory metadata, route/page
  inventory metadata, operator notes, and provider notes.
- Observation rules are observe only, no compliance judgment, no business
  reinterpretation, no canonical business updates, no WGP mutation, no
  provider trust, no publishing, and no runtime mutation.
- Observation readiness values are `not_observable`,
  `partially_observable`, `observable`, and `blocked`.
- The MVP-1K-3 builder records missing observation limitations when metadata
  is absent instead of guessing.
- MVP-2.0-K observed the Iteration 2 source bundle
  `ODV_GENERATED_PROPOSAL_002/source/` through parsed static HTML observation
  metadata and persisted OWM v2:
  `observed_website_model_0d5e829f546745b1433557978c875626`.

Missing implementation:
- Rendered preview inspection.
- ViroiDoc real Generated Website Proposal observation.

Dependencies:
- Quarantined Generated Website Proposal.
- Source ProviderGenerationPayload lineage.
- Source Website Generation Package lineage.
- Available output bundle metadata and observation sources.

Risk:
- Medium. Observation must be conservative enough to preserve missing or
  ambiguous proposal reality without turning provider claims into facts.

Estimated implementation complexity:
- First bounded observation runtime is complete. Remaining observation work is
  richer inspection and real-target validation before broad compliance use.

### Observed Website Model

Current implementation:
- MVP-1K-2 defines conceptual ObservedWebsite, ObservedPage,
  ObservedNavigation, ObservedSection, ObservedMessage, ObservedAsset,
  ObservedConstraint, ObservedTechnicalSignal, ObservedEvidence,
  ObservedLimitation, and ObservedWebsiteLineage artifacts.
- MVP-1K-3 implements `ObservedWebsiteModelArtifact`,
  `ObservedWebsiteLineage`, `ObservedPage`, `ObservedNavigation`,
  `ObservedSection`, `ObservedMessage`, `ObservedAsset`,
  `ObservedConstraint`, `ObservedTechnicalSignal`, `ObservedEvidence`,
  `ObservedLimitation`, `ObservedWebsiteReadiness`,
  `ObservedWebsiteValidationResult`, and `ObservedWebsiteStatus`.
- Artifact kind is `observed_website_model`.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only `observedWebsiteModelArtifacts`,
  `latestObservedWebsiteModelArtifact`, equivalent latest reuse, changed
  append, latest load, and by-ID load.
- Persistence rejects `invalid` and `stale`, and accepts `blocked`,
  `not_observable`, `partially_observable`, and `observable`.
- The evidence model must preserve source proposal artifact, source provider
  payload, source WGP, observed routes, sections, navigation, messages,
  assets, missing observations, limitations, and diagnostics.
- MVP-2.0-C created the first real persisted Observed Website Model for ODV
  from `GeneratedWebsiteProposalArtifact`
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`.
- Latest ODV OWM artifact:
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- ODV OWM status/readiness is `observable`; counts are pages `1`, routes `1`,
  navigation/links `11`, sections `7`, headings `14`, CTA links `3`,
  messages `53`, assets `6`, constraints `9`, technical signals `12`,
  evidence refs `17`, and limitations `127`.
- Latest reload, by-ID reload, immediate idempotent retry, and cold
  idempotent retry reuse all returned
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- MVP-2.0-C added no WGP comparison, compliance, Compliance Report, Business
  Approval, publishing, deploy, provider execution, AI execution, generated
  proposal mutation, canonical business artifact mutation, UI, API, schema, or
  worker behavior.
- MVP-2.0-K created the second real persisted Observed Website Model for ODV
  from `GeneratedWebsiteProposalArtifact`
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`.
- Latest ODV OWM artifact:
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- ODV OWM v2 status/readiness is `observable`; counts are pages `1`, routes
  `1`, navigation/links `11`, nav-menu links `7`, sections `7`, headings
  `17`, CTA links `3`, messages `70`, assets `14`, constraints `53`,
  technical signals `18`, evidence refs `18`, and limitations `121`.
- Latest reload, by-ID reload, immediate idempotent retry, and cold
  idempotent retry reuse all returned
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- OWM v1 remains immutable and reloadable by ID as
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- OWM v2 is now latest. MVP-2.0-M later compared Iteration 1 and Iteration 2
  compliance through the first persisted Generation Evolution Analysis.
- MVP-2.0-K added no WGP comparison, Generation Contract Compliance v2,
  Compliance Report v2, Generation Improvement Plan v2, Business Approval,
  publishing, deploy, provider execution, AI execution, generated proposal
  mutation, canonical business artifact mutation, UI, API, schema, or worker
  behavior.

Missing implementation:
- Rendered browser inspection backed observations.
- ViroiDoc real Generated Website Proposal observation.

Dependencies:
- Website Observation.
- Quarantined Generated Website Proposal.
- Source WGP lineage.

Risk:
- Medium. The model must support future compliance without itself judging
  pass, partial, fail, unknown, or not applicable.

Estimated implementation complexity:
- First runtime contract, builder, validator, focused tests, and provenance
  persistence are complete. The first and second real ODV static-HTML
  observations are persisted, and ODV Generation Contract Compliance v2 is
  persisted. Remaining work starts with ODV Compliance Report v2 or richer
  rendered observation.

### Generation Contract Compliance

Current implementation:
- Compliance and Compliance Report specifications are complete.
- Generation Validation Engine architecture is complete. It defines the
  observation, observed website model, comparison, evidence, confidence, and
  compliance-report input responsibilities for checking a Generated Website
  Proposal against the Website Generation Package.
- MVP-1K-2 clarifies that observation creates the Observed Website Model and
  compliance later compares that observed reality against the Website
  Generation Package.
- MVP-1K-4 implements the first deterministic Generation Contract Compliance
  runtime foundation.
- Runtime modules now implement `GenerationContractComplianceArtifact`,
  `ComplianceCategory`, `ComplianceEvidence`, `ComplianceFinding`,
  `ComplianceDeviation`, `ComplianceLimitation`, `ComplianceConfidence`,
  `validateGenerationContractCompliance(...)`,
  `buildGenerationContractCompliance(...)`,
  `persistGenerationContractCompliance(...)`,
  `loadLatestGenerationContractCompliance(...)`, and
  `loadGenerationContractComplianceById(...)`.
- Artifact kind is `generation_contract_compliance`.
- The builder consumes only `WebsiteGenerationPackageArtifact` and
  `ObservedWebsiteModelArtifact`.
- The MVP comparison scope covers objectives represented, navigation
  obligations, page obligations, section obligations, message coverage, asset
  presence, trust signal presence, constraints preserved, accessibility
  expectations observable, and SEO expectations observable.
- Every finding references observable compliance evidence. Missing or
  unobservable signals become limitations rather than invented compliance.
- Persistence uses existing site-version `importProvenanceSummary` with
  append-only `generationContractComplianceArtifacts`,
  `latestGenerationContractComplianceArtifact`, equivalent latest reuse,
  changed append, latest load, and by-ID load.
- Persistence rejects `invalid` and `stale`, and accepts `blocked`,
  `incomplete`, `partial`, `compliant`, and `non_compliant`.
- MVP-1K-4-R real-target validation checked ODV
  `09dce7ea-d860-4f60-a1eb-26c3335b302e` with source WGP
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` and ViroiDoc
  `e26b0754-988b-45b9-9e24-8e213179b6cf` with source WGP
  `website_generation_package_3e34393aef612a2c597042917dc45085`.
- MVP-1K-4-R originally blocked because both targets were missing a latest
  persisted `ObservedWebsiteModelArtifact`.
- MVP-2.0-D performed the first real ODV Generation Contract Compliance
  evaluation after MVP-2.0-C persisted latest OWM
  `observed_website_model_35499a9cb91a15740910532d451a739a`.
- MVP-2.0-D persisted
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7` with
  status `non_compliant`, 10 category results, 149 findings, 145 deviations,
  12 evidence records, and 268 limitations.
- Latest reload, by-ID reload, and idempotent retry all returned
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- MVP-2.0-D added no Compliance Report, Business Approval, publishing,
  deployment, provider execution, AI execution, UI, API, schema, workers, WGP
  mutation, OWM mutation, or canonical business artifact mutation.
- MVP-2.0-L performed the second real ODV Generation Contract Compliance
  evaluation against OWM v2
  `observed_website_model_0d5e829f546745b1433557978c875626`.
- MVP-2.0-L persisted
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b` with
  status `non_compliant`, 10 category results, 149 findings, 132 deviations,
  25 evidence records, 252 limitations, and `MEDIUM` confidence.
- Latest reload, by-ID reload, and idempotent retry all returned
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`.
- Iteration 1 compliance
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7` remains
  reloadable. Iteration 2 compliance is now latest. Both compliance artifacts
  belong to the same ODV Generation Cycle.
- MVP-2.0-L added no Compliance Report v2, iteration comparison, statistics
  across iterations, Generation Improvement Plan v2, Provider Payload v3,
  regeneration, Business Approval, publishing, deployment, DNS mutation,
  production mutation, provider execution, AI execution, UI, API, schema,
  workers, WGP mutation, OWM mutation, or canonical business artifact
  mutation.
- MVP-2.0-M then persisted the first deterministic Generation Evolution
  Analysis:
  `generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253`.
  It compared Iteration 1 compliance
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7` against
  Iteration 2 compliance
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b` against
  the same WGP `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
  without recomputing either compliance result. Status is `improved`, overall
  assessment is `meaningful_improvement`, and recommended next action is
  `create_compliance_report_v2`.
- MVP-2.0-M added no Compliance Report v2, Improvement Plan v2, Provider
  Payload v3, regeneration, Business Approval, publishing, deployment, DNS
  mutation, production mutation, provider execution, AI execution, UI, API,
  schema migration, workers, WGP mutation, OWM mutation, source compliance
  mutation, or canonical business artifact mutation.

Completed follow-up:
- MVP-2.0-E created the first real ODV Compliance Report from
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- The persisted report is
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`
  with status `blocked`, recommendation `regenerate`, and generation
  readiness `requires_regeneration`.
- Latest reload, by-ID reload, and idempotent retry all returned the same
  report artifact.

Missing implementation:
- Business Approval artifact and approval decision boundary.
- Gate that Business Approval can consume.
- Compliance Report v2 for
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`.
- Improvement Plan v2, if authorized after Compliance Report v2.

Dependencies:
- Website Generation Package.
- Generated website proposal from External AI.
- Website observation and Observed Website Model.
- Evidence or rendered capture of generated output when a future runtime
  boundary is authorized.

### Generation Contract Compliance Report

Current implementation:
- Compliance Report specification is complete.
- MVP-1K-5 implements the first deterministic Generation Contract Compliance
  Report runtime foundation.
- Runtime modules now implement `GenerationContractComplianceReportArtifact`,
  report sections, recommendation model, readiness model, validation helper,
  `buildGenerationContractComplianceReport(...)`,
  `persistGenerationContractComplianceReport(...)`,
  `loadLatestGenerationContractComplianceReport(...)`, and
  `loadGenerationContractComplianceReportById(...)`.
- Artifact kind is `generation_contract_compliance_report`.
- The builder consumes only persisted `GenerationContractComplianceArtifact`
  and explains compliance through executive summary, overall compliance,
  business compliance, experience compliance, implementation observability,
  category results, deviations, missing requirements, constraint violations,
  business risks, recommendation, generation readiness, limitations, evidence
  summary, lineage, and diagnostics.
- Recommendation values are `proceed_to_approval`, `regenerate`,
  `improve_wgp`, `repeat_business_alignment`, `insufficient_evidence`, and
  `human_review_required`.
- Readiness values are `ready`, `ready_with_limitations`,
  `requires_regeneration`, `requires_alignment`, and `blocked`.
- Persistence uses existing site-version `importProvenanceSummary` with
  append-only `generationContractComplianceReportArtifacts`,
  `latestGenerationContractComplianceReportArtifact`, equivalent latest
  reuse, changed append, latest load, and by-ID load.
- The report explains compliance only. It does not recompute compliance,
  approve, publish, call providers, execute AI, add UI/API/schema/workers, or
  mutate runtime/business truth.
- MVP-1K-5-R real-target validation originally checked ODV
  `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc
  `e26b0754-988b-45b9-9e24-8e213179b6cf`, but both targets were missing the
  required latest persisted `GenerationContractComplianceArtifact` at that
  time. No Generation Contract Compliance Report was built or persisted.
- MVP-2.0-D unblocked ODV for a report by persisting
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`.
- MVP-2.0-E completed the first real ODV report:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.
- The report status is `blocked`, recommendation is `regenerate`, and
  generation readiness is `requires_regeneration`.
- The report explains `8` failed categories, `2` partial categories, `145`
  deviations, `147` missing requirements, `411` business risks, `268`
  limitations, `12` compliance evidence records, and why ODV is not ready for
  Business Approval.

Missing implementation:
- Business Approval artifact and approval decision boundary.
- Publish gate that consumes Business Approval.
- Real-target Generation Contract Compliance artifact for ViroiDoc.

Dependencies:
- Persisted Generation Contract Compliance artifact.

Risk:
- Medium. The deterministic compliance runtime and report runtime now exist,
  but no governed Business Approval decision has accepted business consequence
  for a generated proposal.

Estimated implementation complexity:
- First deterministic report contract, builder, validation, persistence, and
  focused tests are complete. Remaining work starts with real-target
  Generation Contract Compliance validation before Business Approval.

### Generation Improvement Plan

Current implementation:
- MVP-2.0-F implements the first deterministic Generation Improvement Plan
  runtime foundation.
- Runtime modules now implement `GenerationImprovementPlanArtifact`,
  `GenerationImprovementAction`, `GenerationImprovementPriority`,
  `GenerationImprovementCategory`, `GenerationImprovementLineage`,
  `GenerationImprovementValidationResult`,
  `buildGenerationImprovementPlan(...)`,
  `persistGenerationImprovementPlan(...)`,
  `loadLatestGenerationImprovementPlan(...)`, and
  `loadGenerationImprovementPlanById(...)`.
- Artifact kind is `generation_improvement_plan`.
- The builder consumes only persisted
  `GenerationContractComplianceReportArtifact` and translates compliance
  findings into provider-neutral, business-governed regeneration instructions.
- Allowed statuses are `draft`, `ready`, `blocked`, `invalid`, and `stale`.
  Persistence rejects `invalid` and `stale`; it allows `draft`, `ready`, and
  `blocked`.
- Improvement categories are Business Positioning, Audience, Navigation,
  Messages, Sections, Trust, Assets, Accessibility, SEO, Constraints, and
  Other.
- Priority values are `critical`, `high`, `medium`, and `low`; priority
  depends only on compliance deviations, missing requirements, business risks,
  and recommendation.
- Recommended next action values are `regenerate`,
  `collect_more_information`, `human_review`, and `stop`.
- Persistence uses existing site-version `importProvenanceSummary` with
  append-only `generationImprovementPlanArtifacts`,
  `latestGenerationImprovementPlanArtifact`, equivalent latest reuse, changed
  append, latest load, and by-ID load.
- MVP-2.0-F completed the first real ODV Generation Improvement Plan from
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.
- Persisted plan artifact:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.
- Status is `ready`; recommended next action is `regenerate`; estimated
  regeneration readiness is `ready`.
- Counts are improvements `413`, critical `259`, high `0`, medium `154`,
  low `0`.
- Category summary is Constraints `228`, Assets `123`, Sections `36`,
  Navigation `8`, Messages `6`, Trust `6`, Business Positioning `4`,
  Accessibility `1`, SEO `1`.
- Latest reload, by-ID reload, and idempotent retry all returned
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.
- The plan does not contain provider prompts, HTML, React, implementation
  instructions, CSS, framework decisions, provider payloads, provider
  execution, AI execution, regeneration output, approval, or publishing
  permission.

Missing implementation:
- Regeneration Delivery Package v2 that can package the persisted Provider
  Payload v2 for a future manual regeneration cycle.
- Provider execution remains outside GNR8 until explicitly authorized.
- Business Approval remains unimplemented.

Dependencies:
- Persisted Generation Contract Compliance Report.
- Existing Website Generation Package for any later payload phase.

Risk:
- Medium. The plan is ready to drive the next generation cycle, but no next
  export payload, provider execution, AI execution, or Business Approval has
  been created.

Estimated implementation complexity:
- Generation Improvement Plan runtime foundation is complete. MVP-2.0-G has
  now completed Provider Payload v2. Next work is MVP-2.0-H - Regeneration
  Delivery Package v2, still stopping before Codex execution, provider
  execution, AI execution, generated website output, publishing, deployment,
  DNS, and Business Approval.

### Provider Payload v2 Runtime Foundation

Current implementation:
- MVP-2.0-G implements the deterministic ProviderGenerationPayload v2 runtime
  foundation.
- Runtime module `provider-generation-payload-v2-builder.ts` now implements
  `buildProviderGenerationPayloadV2(...)`,
  `assertProviderGenerationPayloadV2SourceIntegrity(...)`, and
  `verifyProviderGenerationPayloadV2Safety(...)`.
- Provider Payload v2 reuses the existing `ProviderGenerationPayload`
  contract and persists under artifact kind `provider_generation_payload`.
  No new canonical `ProviderGenerationPayloadV2` artifact type exists.
- The v2 builder consumes only `WebsiteGenerationPackageArtifact` plus
  `GenerationImprovementPlanArtifact`, with persisted source artifact IDs.
- The original Website Generation Package is preserved unchanged in
  `serializedWebsiteGenerationPackage`.
- The Generation Improvement Plan is translated into deterministic,
  business-level `regenerationGuidance` and `deltaSummary`.
- `regenerationGuidance` contains only `preserve`, `improve`,
  `do_not_change`, `known_limitations`, and `critical_items`.
- `deltaSummary` records total improvements, priority counts, affected
  categories, and recommended regeneration strategy. This is regeneration
  planning, not compliance.
- Provider payload persistence now allows `ready` alongside existing
  `draft`, `valid`, and `blocked` persisted records. It still rejects
  `invalid` and `stale`.
- MVP-2.0-G completed the first real ODV Provider Payload v2 from source WGP
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` plus source
  Improvement Plan
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`.
- Persisted Provider Payload v2 artifact:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
- Status is `ready`; runtime version is `MVP-2.0-G`.
- Source WGP status is `partial`; source plan status is `ready`.
- Preserved WGP counts are objectives `2`, audience `3`, messages `5`,
  navigation destinations `4`, page contracts `4`, section contracts `14`,
  content requirements `128`, validation expectations `10`, confidence `LOW`.
- Improvement counts are total `413`, critical `259`, high `0`, medium
  `154`, low `0`.
- Affected categories are Accessibility, Assets, Business Positioning,
  Constraints, Messages, Navigation, SEO, Sections, and Trust.
- Guidance counts are preserve `12`, improve `413`, do-not-change `6`,
  known limitations `112`, and critical items `259`.
- Latest reload, by-ID reload, and idempotent retry all returned
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
- Safety verification passed with no provider execution, no AI execution, no
  generated website, no generated HTML, no React, no CSS, no framework
  decision, no deployment, no publishing, no DNS mutation, no runtime
  mutation, no compliance execution, and no Business Approval.

Missing implementation:
- Regeneration Delivery Package v2 for a future manual regeneration cycle.
- Provider execution remains outside GNR8 until explicitly authorized.
- Generated Website Proposal v2 remains uncreated.
- Business Approval remains unimplemented.

Dependencies:
- Existing Website Generation Package.
- Existing Generation Improvement Plan.

Risk:
- Medium. The v2 payload is persisted and ready for a future regeneration
  cycle, but no export package or governed execution boundary has consumed it.

Estimated implementation complexity:
- Runtime foundation is complete. Next work is MVP-2.0-H - Regeneration
  Delivery Package v2, still stopping before Codex execution, provider
  execution, AI execution, generated website output, Generated Website
  Proposal v2, publishing, deployment, DNS, or Business Approval.

### Business Approval

Current implementation:
- The architecture specification is complete.
- Provider-control-plane review/authorization intent models exist, but they do
  not implement canonical Business Approval for a generated website after
  Generation Contract Compliance.

Missing implementation:
- Business Approval decision artifact.
- Approval outcomes: approve to publish, approve with limitations, reject,
  regenerate, return to alignment, or block.
- Gate that allows Publish only after approval.
- Lineage from compliance report and upstream artifacts.

Dependencies:
- Generation Contract Compliance Report.
- Website Generation Package.
- Website Design Brief.
- Business Alignment lineage.

Risk:
- High. MVP must preserve human authority before publishing.

Estimated implementation complexity:
- Medium. MVP can implement a single Business Owner approval decision with
  deterministic status, reason, and lineage.

### Publish

Current implementation:
- Runtime publish activation, publish guards, runtime resolution, hosting
  operations, domain readiness, active/published pointers, and publish
  enforcement foundations exist.
- These systems can publish runtime artifacts, but they are not yet connected
  to canonical Business Approval for generated website proposals.

Missing implementation:
- Generated website proposal to publishable runtime artifact conversion.
- Publish gate that requires Business Approval.
- Published Experience lineage to Website Generation Package, Compliance
  Report, and Business Approval.
- First customer publish happy path.

Dependencies:
- Business Approval.
- Publishable generated artifact.
- Runtime publish enforcement.
- Hosting/domain readiness.

Risk:
- Medium to high. Existing runtime publishing reduces platform risk, but the
  canonical approval-to-publish bridge does not exist.

Estimated implementation complexity:
- Medium. Reuse existing runtime publish foundations and implement only the
  canonical gate and artifact handoff required for one approved website.

## Critical Path

If we want to migrate the first real customer website, the minimum
implementation sequence is:

1. Define the MVP canonical artifact persistence boundary for Business
   Discovery through Business Approval using existing runtime provenance or a
   minimal artifact store.
2. Add a first-customer evidence readiness gate that accepts one imported
   website when source HTML, route, navigation, section, asset, text,
   screenshot/rendered evidence, diagnostics, and limitations are sufficient
   for business understanding.
3. Implement Business Discovery builder from imported website evidence into
   website-derived business domains, confidence, missing knowledge, evidence
   refs, and limitations.
4. Use the implemented canonical Digital Business Twin v1 builder and durable
   latest-DBT read path from Business Discovery.
5. Implement Business Understanding Report builder and persistence from DBT
   v1.
6. Validate minimal Business Alignment over real persisted BUR and DBT inputs,
   then expose the aligned DBT output to Website Design Brief.
7. Implement Website Design Brief builder from aligned DBT and Business
   Alignment.
8. Validate Website Generation Package runtime against real persisted Website
   Design Brief artifacts.
9. Validate the first Codex task provider payload runtime against real
   persisted Website Generation Package artifacts.
10. Produce the first deterministic, human-reviewable ODV export bundle for
    manual Codex execution.
11. Run manual Codex execution outside GNR8 and produce an implementation
    proposal bundle only.
12. Import the manually generated output bundle metadata and store a
    quarantined Generated Website Proposal.
13. Implement Generation Contract Compliance evaluator and Compliance Report
    for the generated proposal against the package.
14. Implement Business Approval decision that consumes the Compliance Report
    and authorizes or blocks Publish.
15. Connect approved generated proposal to existing runtime publish foundations
    and publish one approved website.
16. Run an end-to-end first-customer smoke path with artifact lineage from
    imported website to published experience.

## Deferred Features

The following are not required for the first working website:

- Multiple external AI providers.
- Provider comparison.
- Provider marketplace selection.
- Advanced provider routing.
- Multi-user workflows.
- Enterprise collaboration.
- Role delegation beyond a single Business Owner approval.
- Advanced Business Alignment.
- Continuous Evolution.
- Experience Domains beyond Website.
- Mobile app, customer portal, marketplace, campaign, newsletter, chatbot, and
  sales deck generation.
- Advanced Governance UI.
- Advanced Decision Architecture UI.
- Full artifact lineage browser.
- Full historical reconstruction from lineage.
- Reconstruction-grade Evidence Capture.
- Runtime mutation evidence.
- Full network trace.
- Responsive breakpoint matrix.
- Accessibility tree evidence.
- Animation and interaction evidence.
- Advanced media/widget/canvas/video evidence.
- Authenticated website import.
- Broad multi-page crawl beyond a bounded first customer scope.
- Multiple generated variants from one package.
- A/B testing.
- Automated regeneration loops.
- Editable block/CMS authoring surface.
- Manual drag-and-drop website builder behavior.
- Internal React/block generation as the canonical generation path.
- Advanced publish environments beyond the first approved publish target.
- Domain/DNS automation beyond what is required for the first publish path.
- Agency dashboard polish.
- Public customer self-service onboarding.
- Billing integration for the MVP proof.
- Analytics-driven optimization.

## First MVP Definition

GNR8 MVP 1.0 is considered complete when one real customer website can move
through the full governed pipeline with measurable artifact evidence:

- one existing public website is imported into a runtime site version;
- Evidence Collection produces a persisted MVP-ready evidence summary with
  source refs, limitations, and diagnostics;
- Business Discovery produces a persisted canonical discovery artifact;
- Digital Business Twin v1 is persisted with evidence-backed business domains,
  confidence, governance state, and lineage;
- Business Understanding Report is produced from DBT v1 and can be reviewed by
  a human;
- Business Alignment records an explicit governed approval or correction;
- Website Design Brief is produced from aligned understanding;
- Website Generation Package is produced as an immutable provider-neutral
  generation contract;
- one provider adapter serializes the package into a Codex task payload without
  changing meaning;
- one external AI provider generates a website proposal from the package;
- Generation Contract Compliance evaluates the proposal against the package
  and produces a human-readable Compliance Report;
- Business Approval explicitly approves the result for publishing;
- Publish promotes the approved result through the runtime publish path;
- final published output can be loaded by URL;
- lineage links every stage from imported website evidence to published
  experience;
- no stage requires prompt-only, provider-only, or implementation-only truth.

## Gap Analysis

### Already Implemented

- URL import and raw imported site artifact persistence.
- Runtime site versions and import provenance.
- Multi-page discovery and route evidence foundations.
- Evidence Capture baseline artifact shape and partial persistence.
- Rendered capture worker/client/readiness foundations.
- Layout geometry, section boundary, and navigation evidence foundations.
- First Limited Dry Run route/navigation/section model builder and
  persistence.
- Business Discovery contract, deterministic website-evidence builder, focused
  tests, provenance persistence boundary for `business_discovery`, and
  real-target validation on ODV and ViroiDoc.
- Digital Business Twin contract, deterministic Business Discovery consumer,
  focused tests, provenance persistence boundary for `digital_business_twin`,
  and real-target validation on ODV and ViroiDoc.
- Business Understanding Report contract, deterministic DBT projection builder,
  focused tests, provenance persistence boundary for
  `business_understanding_report`, and real-target validation on ODV and
  ViroiDoc.
- Business Alignment contract, deterministic DBT correction runtime, focused
  tests, and provenance persistence boundary for `business_alignment`.
- Provider Adapter boundary design for `codex_task` payload serialization.
- Quarantined Generated Website Proposal import/storage artifact,
  deterministic manual-output import builder, focused tests, and provenance
  persistence boundary for `generated_website_proposal`.
- Candidate Discovery, Candidate Review, Candidate Context, and
  Reconstruction Package metadata foundations.
- Runtime publish activation, publish enforcement, runtime resolution, and
  hosting/domain foundations.

### Partially Implemented

- Evidence Collection for MVP use.
- Evidence-backed Business Discovery, Digital Business Twin, Business
  Understanding Report, and Business Alignment are partially implemented as
  the first canonical runtime artifact chain, but still need real-target
  Business Alignment execution and downstream gating into Website Design
  Brief.
- Publish, through runtime mechanisms that are not yet gated by canonical
  Business Approval for generated proposals.
- Provider control-plane governance, through intent-only readiness and
  authorization surfaces rather than canonical external AI generation.

### Architecture Complete

- GNR8 Architecture Manifesto.
- The GNR8 Blueprint.
- Digital Business Twin.
- Business Journey.
- Decision Architecture.
- Governance State.
- Lineage and Versioning.
- Business Understanding Report.
- Business Alignment.
- Website Design Brief.
- Website Generation Package.
- Generation Contract Compliance.
- Generation Contract Compliance Report.
- Business Approval.
- Publish Governance.

### Runtime Missing

- External AI execution from the provider payload.
- Generated Website Proposal observation runtime.
- Generation Contract Compliance evaluator and report artifact.
- Business Approval decision artifact.
- Business Approval to Publish gate for generated proposals.
- End-to-end MVP orchestrator.

### Can Be Postponed

- Multiple providers.
- Multi-user collaboration.
- Advanced governance UI.
- Advanced alignment workflows.
- Continuous Evolution.
- Experience Domains beyond Website.
- Reconstruction-grade fidelity.
- Advanced capture modalities.
- Provider comparison.
- Internal visual editor features.
- Enterprise administration.

### Must Exist Before First Customer

- MVP evidence readiness gate.
- Canonical DBT v1 persistence.
- Business Understanding Report.
- Real-target Business Alignment validation and aligned DBT handoff.
- Website Design Brief.
- Website Generation Package.
- Quarantined Generated Website Proposal import/storage.
- Generated Website Proposal observation.
- Generation Contract Compliance and Compliance Report.
- Business Approval.
- Publish gate connected to Business Approval.
- End-to-end lineage and smoke validation.

## Shortest Path Answer

The shortest path to successfully transforming the first real customer website
is to reuse the existing import, evidence, runtime, and publish foundations,
then build only the missing canonical artifact chain between Evidence
Collection and Publish:

```text
Evidence-ready imported site
-> Business Discovery
-> DBT v1
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> one provider adapter
-> External AI
-> Generated Website Proposal
-> Website Observation
-> Observed Website Model
-> Generation Contract Compliance
-> Compliance Report
-> Business Approval
-> existing runtime publish path
```

Do not continue into a broad reconstruction engine, multi-provider system,
advanced governance console, or editable website builder before this first
customer path works.

## Recommended Next Implementation Phase

MVP-1A implemented the first Business Discovery runtime builder, contract,
validator, focused tests, and `business_discovery` provenance persistence
boundary. MVP-1A-R validated that boundary on current ODV and ViroiDoc
imported website evidence.

Recommended next phase:

```text
Manual Codex execution outside GNR8 using ODV_EXPORT/
```

MVP-1D implemented the first Business Alignment runtime foundation. MVP-1D-R
validated that foundation on real ODV and ViroiDoc DBT plus BUR artifacts,
persisted Business Alignment artifacts and DBT vNext artifacts, and confirmed
that Business Alignment never edits Business Understanding Reports or invents
missing customer facts. MVP-1E implemented the first deterministic Website
Design Brief runtime builder from aligned DBT output and Business Alignment
lineage. The brief is the first Experience Projection, contains website intent
only, and contains no implementation, provider knowledge, prompts, generation,
compliance, approval, publishing, UI, API, or schema migration behavior.
MVP-1E-R validated that brief runtime on persisted ODV and ViroiDoc aligned
DBT vNext artifacts and Business Alignment lineage. MVP-1F implemented the
first deterministic Website Generation Package runtime builder from persisted
Website Design Brief artifacts. The package is provider-neutral, contains the
generation contract and validation expectations, and contains no provider
payload, prompt, external AI call, generated website, compliance evaluator,
Business Approval artifact, publishing behavior, UI, API, schema migration, or
worker behavior. MVP-1F-R validated that package runtime on persisted ODV and
ViroiDoc Website Design Brief artifacts, persisted reloadable Website
Generation Packages, and confirmed provider-neutrality, safety, and
idempotent retry reuse. The next safe phase is Provider Adapter Boundary
Design, documentation and contract design only. MVP-1G defined
`WebsiteGenerationPackageArtifact -> ProviderGenerationPayload`, recommended
Codex task payload as the first provider path, and kept adapters
serialization-only with no business reinterpretation, no new facts, no
provider calls, no prompts sent, no generation, and no provider output
persistence. MVP-1H implemented the deterministic `codex_task`
ProviderGenerationPayload runtime builder, validator, and provenance
persistence boundary from persisted Website Generation Package artifacts. It
preserves WGP meaning, constraints, validation expectations, confidence,
limitations, lineage, and diagnostics; creates a proposal-only Codex task
envelope; rejects forbidden generated-output/provider-result fields; and
persists artifact kind `provider_generation_payload` with latest reuse and
append-on-change semantics. MVP-1H-R validated that runtime against real ODV
and ViroiDoc Website Generation Package artifacts, persisted reloadable Codex
task provider payloads, proved latest/by-ID reload equality and idempotent
retry reuse, and confirmed export-readiness plus no-execution safety. The next
safe phase is MVP-1I Provider Execution Boundary Design, documentation and
contract design only. Stop before provider calls, prompts sent, AI execution,
generated websites, compliance execution, Business Approval, publishing, UI,
API, schema, or workers. MVP-1I defined the governed execution boundary
`ProviderGenerationPayload -> External AI Execution -> Generated Website
Proposal`; defined future ProviderExecutionRequest, ProviderExecutionRun,
ProviderExecutionResult, and GeneratedWebsiteProposal concepts; established
execution prerequisites and safety rules; and recommended Manual Codex
execution outside GNR8 as the first execution mode, followed by future
controlled import of generated output as quarantined proposal material.
MVP-1J defined the manual Codex execution runbook and future Generated Website
Proposal import boundary. It requires exact source ProviderGenerationPayload
and WGP artifact recording, copied payload integrity, no hidden prompt edits,
no business reinterpretation, proposal-only Codex output, no production
mutation, no deployment, no publishing, no DNS mutation, external generated
output storage, provider notes, implementation assumptions, known limitations,
execution timestamp, operator reference, and operator attestation. It also
defined future GeneratedWebsiteProposal, GeneratedWebsiteProposalLineage,
GeneratedWebsiteProposalStatus, GeneratedWebsiteProposalSource,
GeneratedWebsiteProposalSafety, and
GeneratedWebsiteProposalValidationReadiness concepts with status values
`received`, `quarantined`, `invalid`, `blocked`, `superseded`, and
`compliance_ready`. MVP-1K-0 defined the Generation Validation Engine
architecture: generation produces a proposal, validation observes reality,
compliance compares reality against the Website Generation Package, Business
Approval decides, and Publish remains downstream. MVP-1K-1 implemented
quarantined import/storage of a manually generated output bundle with lineage,
metadata, operator attestation, and fail-closed safety validation. MVP-1K-2
defined the Generated Website Proposal observation boundary:
`Generated Website Proposal -> Website Observation -> Observed Website Model
-> Future Contract Comparison`. It also defined conceptual observation
artifacts, observation sources, observation readiness, and the evidence model
while adding no implementation, observation runtime, compliance, approval, or
publishing behavior. MVP-1K-3 implemented the first deterministic Observed
Website Model runtime foundation from quarantined Generated Website Proposal
metadata. It added contract, builder, validator, focused tests, and
`observed_website_model` provenance persistence with latest reuse, append,
latest load, by-ID load, invalid/stale rejection, and blocked/not observable/
partially observable/observable acceptance. MVP-1K-4 implemented the first
deterministic Generation Contract Compliance runtime foundation. It compares
only Website Generation Package artifacts and Observed Website Model
artifacts, records evidence-backed category results, findings, deviations,
limitations, confidence, diagnostics, and lineage, and persists
`generation_contract_compliance` with latest reuse, append, latest load,
by-ID load, invalid/stale rejection, and blocked/incomplete/partial/
compliant/non-compliant acceptance. MVP-1K-5 implemented the first
deterministic Generation Contract Compliance Report runtime foundation from
persisted `GenerationContractComplianceArtifact` only. It creates
human-readable report sections, recommendation, readiness, evidence summary,
lineage, diagnostics, and `generation_contract_compliance_report`
provenance persistence with latest reuse, append, latest load, and by-ID
load. MVP-1K-5-R found that real ODV and ViroiDoc report validation was
blocked because latest persisted `GenerationContractComplianceArtifact` inputs
were missing. MVP-1K-4-R then found that both targets were missing the
prerequisite latest persisted `ObservedWebsiteModelArtifact`, so no compliance
artifact was built or persisted in that phase. MVP-2.0-C later persisted the
first real ODV Observed Website Model, and MVP-2.0-D then persisted the first
real ODV Generation Contract Compliance artifact:
`generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`. MVP-2.0-E
then persisted the first real ODV Generation Contract Compliance Report:
`generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`.
The report status is `blocked`, recommendation is `regenerate`, and
generation readiness is `requires_regeneration`, so ODV is not ready for
Business Approval. MVP-2.0-F then persisted the first real ODV Generation
Improvement Plan:
`generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`. The plan
status is `ready`, recommended next action is `regenerate`, estimated
regeneration readiness is `ready`, and latest reload, by-ID reload, and
idempotent retry reuse passed.
MVP-2.0-G then persisted the first real ODV Provider Payload v2:
`provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`. The payload
status is `ready`, preserves the original Website Generation Package, adds
business-level regeneration guidance from the Generation Improvement Plan, and
passed latest reload, by-ID reload, idempotent retry reuse, and safety
verification.
MVP-2.0-A then produced the first deterministic ODV export bundle at
`ODV_EXPORT/`, with manifest, complete lineage, source WGP, ProviderGenerationPayload,
business summary, limitations, and manual execution instructions. MVP-2.0-A2
polished `ODV_EXPORT/` as the first GNR8 Generation Delivery Package by making
`business-summary.md` business-readable, adding explicit non-invention and
preservation guidance to `limitations.md`, adding expected deliverables, stop
conditions, forbidden actions, and output-folder guidance to
`execution-readme.md`, and adding a non-canonical execution-facing
`generationMission` field to `provider-generation-payload.json` without
changing canonical runtime contracts. MVP-2.0-H then created
`ODV_REGENERATION_EXPORT_002/`, the first complete Second Generation Delivery
Package for ODV Iteration 2. It includes manifest, lineage, copied canonical
WebsiteGenerationPackage, copied Provider Payload v2, copied
GenerationImprovementPlan, business summary, regeneration summary,
Improvement Plan-derived delta, and manual external execution readme.
MVP-2.0-ARCH then established the canonical Generation Cycle Architecture as
the governance model for grouping multiple generation iterations into one
evolutionary history while preserving artifact lineage as the truth and
causality model. MVP-2.0-J then imported `ODV_GENERATED_PROPOSAL_002/` as
latest quarantined Generated Website Proposal v2
`generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`, preserving
Iteration 1
`generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3` by ID and
stopping before observation v2, compliance v2, comparison, Compliance Report
v2, Business Approval, publishing, deployment, DNS mutation, production
mutation, provider execution, AI execution, UI, API, schema, or workers.
MVP-2.0-K then observed `ODV_GENERATED_PROPOSAL_002/source/` only and
persisted latest ODV Observed Website Model v2
`observed_website_model_0d5e829f546745b1433557978c875626`, preserving
Iteration 1 OWM `observed_website_model_35499a9cb91a15740910532d451a739a`
by ID and stopping before compliance v2, comparison, Compliance Report v2,
Generation Improvement Plan v2, Business Approval, publishing, deployment,
DNS mutation, production mutation, provider execution, AI execution, UI, API,
schema, or workers.
