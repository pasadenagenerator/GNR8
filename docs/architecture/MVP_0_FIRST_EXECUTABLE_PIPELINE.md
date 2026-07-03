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
-> External AI
-> Generation Contract Compliance
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
| Website Generation Package | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
| External AI | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
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
- No canonical `WebsiteGenerationPackage` runtime artifact, builder,
  persistence, tests, provider-neutral validation contract, or downstream
  adapter handoff exists.

Missing implementation:
- Deterministic package builder from an aligned Website Design Brief.
- Immutable package artifact persistence.
- Validation contract and acceptance criteria.
- Provider serialization boundary.

Dependencies:
- Website Design Brief.
- Governance State.
- Lineage.
- Canonical artifact persistence.

Risk:
- Critical. The Website Generation Package is the contract GNR8 owns before
  any external AI system executes.

Estimated implementation complexity:
- Medium to high. The first version can be text/JSON and provider-neutral,
  with one provider adapter built later.

### External AI

Current implementation:
- Legacy AI, migration, transformation, and provider-control-plane code exists.
- Provider/DNS control-plane readiness and governance metadata exist.
- No canonical external AI execution path consumes a Website Generation
  Package and returns a generated website proposal for this architecture.

Missing implementation:
- One external AI provider adapter for the Website Generation Package.
- Provider request serialization.
- Generated website proposal artifact.
- Execution record with model/provider metadata, input package reference,
  output reference, diagnostics, and failure classification.
- Safe storage of generated output for validation before publish.

Dependencies:
- Website Generation Package.
- Provider credential resolution and execution policy.
- Generated proposal artifact boundary.

Risk:
- Critical. MVP cannot prove website transformation without one working
  provider path, but multiple providers are not required.

Estimated implementation complexity:
- High. Keep the first provider adapter narrow, auditable, and disposable so
  provider concerns do not redefine package meaning.

### Generation Contract Compliance

Current implementation:
- Compliance and Compliance Report specifications are complete.
- No runtime evaluator, persisted compliance result, report builder, tests, or
  approval gate exists for generated websites.

Missing implementation:
- Compliance evaluator comparing generated website proposal against the
  Website Generation Package.
- Compliance report artifact.
- Pass/partial/fail/unknown outcome model.
- Evidence-backed criteria results and limitations.
- Gate that Business Approval can consume.

Dependencies:
- Website Generation Package.
- Generated website proposal from External AI.
- Evidence or rendered capture of generated output.

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
8. Implement Website Generation Package builder from aligned Website Design
   Brief.
9. Implement one external AI provider adapter that serializes the Website
   Generation Package without redefining it and stores a Generated Website
   Proposal.
10. Implement Generation Contract Compliance evaluator and Compliance Report
    for the generated proposal against the package.
11. Implement Business Approval decision that consumes the Compliance Report
    and authorizes or blocks Publish.
12. Connect approved generated proposal to existing runtime publish foundations
    and publish one approved website.
13. Run an end-to-end first-customer smoke path with artifact lineage from
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

- Business Alignment to Website Design Brief gate.
- Website Design Brief builder and artifact.
- Website Generation Package builder and artifact.
- External AI provider adapter for Website Generation Package execution.
- Generated Website Proposal artifact.
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
- One external AI provider adapter.
- Generated Website Proposal storage.
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
MVP-1E-R Website Design Brief Real-Target Validation
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
The next safe phase is real-target validation of persisted ODV and ViroiDoc
aligned DBT vNext artifacts before any Website Generation Package work. Stop
before Website Generation Package, provider adapters, external AI, generation,
compliance, Business Approval, or publishing.
