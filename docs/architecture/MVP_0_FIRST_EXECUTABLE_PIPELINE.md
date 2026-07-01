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
| Digital Business Twin | COMPLETE | PARTIAL | PARTIAL | MISSING | PARTIAL | PARTIAL |
| Business Understanding Report | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
| Business Alignment | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
| Website Design Brief | COMPLETE | MISSING | MISSING | MISSING | MISSING | MISSING |
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
- No DBT builder consumes Business Discovery yet.
- No Business Owner confirmation or multi-source domain reconciliation exists
  in this layer.

Dependencies:
- Evidence Collection.
- Canonical Business Domain model.
- Digital Business Twin specification.

Risk:
- Medium after MVP-1A-R. The first runtime artifact now exists and has been
  validated on ODV and ViroiDoc, but downstream DBT, Business Understanding
  Report, Design Brief, Generation Package, and Compliance must consume it
  rather than bypassing it with prompt-first or website-copy-first shortcuts.

Estimated implementation complexity:
- First runtime slice and real-target validation are complete. Remaining work
  is DBT input consumption.

### Digital Business Twin

Current implementation:
- A runtime `twin` package exists with deterministic in-memory website twin
  snapshots, viewer payloads, insights, optimizations, proposal candidates,
  approval previews, and execution-readiness records.
- The current twin code is useful as prior runtime foundation, but it is not
  yet the canonical governed Digital Business Twin that integrates Business
  Domains, evidence, facts, interpretations, knowledge, understanding,
  governance state, lineage, and versioning.

Missing implementation:
- No durable canonical DBT artifact exists.
- No DBT builder maps Business Discovery into Business Domains with evidence,
  confidence, lineage, governance state, and version.
- No persisted latest DBT read path exists for downstream canonical artifacts.

Dependencies:
- Business Discovery.
- Governance State.
- Lineage and Versioning.
- Canonical artifact persistence boundary.

Risk:
- High. The DBT is the business source of truth. If MVP bypasses it, the
  pipeline contradicts the architecture and risks generating from a prompt or
  website snapshot instead of governed business understanding.

Estimated implementation complexity:
- Medium to high. The MVP can start with one website-derived DBT version and
  postpone multi-source continuous evolution.

### Business Understanding Report

Current implementation:
- The architecture specification is complete.
- No runtime builder, persisted report artifact, read path, validation tests,
  or approval/alignment handoff exists.

Missing implementation:
- Deterministic report builder from a DBT version.
- Report artifact persistence.
- Report validation.
- Human-readable projection fields, missing-knowledge summary, confidence
  summary, evidence summary, and lineage.

Dependencies:
- Digital Business Twin.
- Canonical artifact governance state.
- Lineage.

Risk:
- High. The Business Understanding Report is the first human-facing checkpoint
  and prevents generation before understanding.

Estimated implementation complexity:
- Medium. The report can be deterministic and text-structured for MVP, with a
  minimal internal read surface deferred until the implementation phase that
  authorizes UI/API work.

### Business Alignment

Current implementation:
- The architecture specification is complete.
- No canonical runtime alignment decision, artifact, persistence, tests, or
  downstream authorization gate exists.

Missing implementation:
- Minimal alignment decision model.
- Alignment outcomes such as approved, needs clarification, blocked, and
  superseded.
- DBT correction loop for first customer corrections.
- Gate that allows Website Design Brief only after alignment.

Dependencies:
- Business Understanding Report.
- Digital Business Twin.
- Governance State.
- Lineage.

Risk:
- High. Business Alignment is the governed checkpoint that confirms or improves
  the DBT before planning begins.

Estimated implementation complexity:
- Medium. MVP can support a simple explicit Business Owner approval/correction
  decision and defer advanced alignment collaboration.

### Website Design Brief

Current implementation:
- The architecture specification is complete.
- No runtime Website Design Brief artifact, builder, persistence, tests, or
  downstream gate exists.

Missing implementation:
- Deterministic builder from aligned DBT and Business Alignment.
- Experience intent, audience, messaging, IA, section priorities, content
  direction, brand direction, constraints, acceptance expectations, evidence,
  confidence, and lineage.

Dependencies:
- Business Alignment.
- Aligned Digital Business Twin.
- Website Experience Domain scope.

Risk:
- High. Without a Website Design Brief, the Website Generation Package has no
  governed experience source.

Estimated implementation complexity:
- Medium. MVP can produce one website-only brief and postpone non-website
  Experience Domains.

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
4. Implement canonical Digital Business Twin v1 builder and durable latest-DBT
   read path from Business Discovery.
5. Implement Business Understanding Report builder and persistence from DBT
   v1.
6. Implement minimal Business Alignment decision and DBT correction loop.
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
- Candidate Discovery, Candidate Review, Candidate Context, and
  Reconstruction Package metadata foundations.
- Runtime publish activation, publish enforcement, runtime resolution, and
  hosting/domain foundations.

### Partially Implemented

- Evidence Collection for MVP use.
- Business Discovery, through the first canonical runtime artifact,
  persistence boundary, and real-target validation, pending downstream DBT
  consumption.
- Digital Business Twin, through a runtime website twin preview model rather
  than the canonical governed DBT.
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

- Durable canonical Digital Business Twin artifact and latest read path.
- Business Understanding Report builder and artifact.
- Business Alignment decision artifact and correction loop.
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
- Minimal Business Alignment.
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
MVP-1B Digital Business Twin Runtime Builder
```

MVP-1A-R persisted ODV
`business_discovery_7b37413651d79de0d109e31690a34b62` and ViroiDoc
`business_discovery_360fa099cbcede288c2d0e04f2ec7986`, verified latest/by-ID
reload equality, verified idempotent retry reuse, and confirmed no downstream
DBT, Business Understanding Report, Business Alignment, Website Design Brief,
Website Generation Package, provider, AI, generation, or publishing artifacts
were created. MVP-1B should consume those Business Discovery artifacts as the
first canonical DBT input.
