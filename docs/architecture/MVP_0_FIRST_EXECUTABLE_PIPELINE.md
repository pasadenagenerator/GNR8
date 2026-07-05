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
| Generation Contract Compliance | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
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

Missing implementation:
- Website observation of quarantined proposal material.
- Observed Website Model.
- Contract comparison against the Website Generation Package.
- Generation Contract Compliance and Compliance Report.
- Business Approval and publish authorization.

Dependencies:
- ProviderGenerationPayload.
- Website Generation Package.
- Manual Codex output bundle metadata.
- Operator attestation.

Risk:
- Medium. The proposal can now be stored safely, but the generated output has
  not been observed or compared against the package.

Estimated implementation complexity:
- First import/storage foundation is complete. Remaining work begins with the
  observation boundary before any compliance evaluator is implemented.

### Generation Contract Compliance

Current implementation:
- Compliance and Compliance Report specifications are complete.
- Generation Validation Engine architecture is complete. It defines the
  observation, observed website model, comparison, evidence, confidence, and
  compliance-report input responsibilities for checking a Generated Website
  Proposal against the Website Generation Package.
- No runtime evaluator, persisted compliance result, report builder, tests, or
  approval gate exists for generated websites.

Missing implementation:
- Generated Website Proposal observation runtime foundation.
- Compliance evaluator comparing observed generated website reality against
  the Website Generation Package.
- Compliance report artifact.
- Pass/partial/fail/unknown outcome model.
- Evidence-backed criteria results and limitations.
- Gate that Business Approval can consume.

Dependencies:
- Website Generation Package.
- Generated website proposal from External AI.
- Website observation and Observed Website Model.
- Evidence or rendered capture of generated output when a future runtime
  boundary is authorized.

Risk:
- Critical. Without compliance, Business Approval becomes subjective
  inspection and publishing becomes ungoverned.

Estimated implementation complexity:
- Medium to high. MVP should evaluate measurable package criteria first and
  defer advanced visual, accessibility, performance, and multi-provider
  comparison.

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
10. Import the manually generated output bundle metadata and store a
    quarantined Generated Website Proposal.
11. Implement Generation Contract Compliance evaluator and Compliance Report
    for the generated proposal against the package.
12. Implement Business Approval decision that consumes the Compliance Report
    and authorizes or blocks Publish.
13. Connect approved generated proposal to existing runtime publish foundations
    and publish one approved website.
14. Run an end-to-end first-customer smoke path with artifact lineage from
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
MVP-1K-1 Generated Website Proposal Import Runtime Foundation
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
Approval decides, and Publish remains downstream. The next safe phase is
MVP-1K-1 Generated Website Proposal Import Runtime Foundation, limited to
quarantined import/storage of a manually generated output bundle with lineage,
metadata, operator attestation, and fail-closed safety validation. Stop before
compliance implementation, Business Approval, publishing, deployment, DNS
mutation, production mutation, UI, API, schema, workers, or provider calls
unless explicitly authorized.
