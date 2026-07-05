# GNR8 THREAD HANDOFF

This is the first file every new ChatGPT/Codex thread should read.

## Active Track

First Executable MVP Pipeline

Current status:
- Phase MVP-1C - Business Understanding Report Runtime Builder is complete.
- Phase MVP-1B-R - Digital Business Twin Real-Target Validation is complete
  and has persisted ODV and ViroiDoc DBT artifacts.
- Phase MVP-1C-R - Business Understanding Report Real-Target Validation retry
  is complete and has persisted ODV and ViroiDoc BUR artifacts.
- Phase MVP-1D - Business Alignment Runtime Foundation is complete.
- Phase MVP-1D-R - Business Alignment Real-Target Validation is complete and
  has persisted ODV and ViroiDoc Business Alignment plus DBT vNext artifacts.
- Phase MVP-1E - Website Design Brief Runtime Builder is complete.
- Phase MVP-1E-R - Website Design Brief Real-Target Validation is complete and
  has persisted ODV and ViroiDoc Website Design Brief artifacts.
- Phase MVP-1F - Website Generation Package Runtime Builder is complete.
- Phase MVP-1F-R - Website Generation Package Real-Target Validation is
  complete and has persisted ODV and ViroiDoc Website Generation Package
  artifacts.
- Phase MVP-1G - Provider Adapter Boundary Design is complete.
- Phase MVP-1H - Codex Task Provider Payload Runtime Builder is complete.
- Phase MVP-1H-R - Codex Task Provider Payload Real-Target Validation is
  complete and has persisted ODV and ViroiDoc provider payload artifacts.
- Phase MVP-1I - Provider Execution Boundary Design is complete.
- Phase MVP-1J - Manual Codex Execution Runbook and Generated Proposal Import
  Boundary Design is complete.
- Phase MVP-1K-0 - Generation Validation Engine Architecture is complete.
- Phase MVP-1K-1 - Generated Website Proposal Import Runtime Foundation is
  complete.
- Phase MVP-1K-2 - Generated Website Proposal Observation Boundary Design is
  complete.
- Phase MVP-1K-3 - Observed Website Model Runtime Foundation is complete.
- Phase MVP-1K-4 - Generation Contract Compliance Runtime Foundation is
  complete.
- Phase MVP-1K-5 - Generation Contract Compliance Report Runtime Foundation
  is complete.

Current Phase:
- Phase MVP-1K-5 - Generation Contract Compliance Report Runtime Foundation
  is complete.

Next Phase:
- MVP-1K-6 Business Approval Runtime Foundation.

Current architecture direction:
- GNR8 is an AI Orchestrator with a governed Digital Business Twin at its
  core.
- The primary architecture overview is
  `docs/architecture/THE_GNR8_BLUEPRINT.md`. Read it before detailed
  specifications when onboarding to the complete GNR8 architecture.
- Canonical five-layer architecture: Reality -> Knowledge -> Decision ->
  Experience -> Execution.
- Digital Business Twin is the canonical operational understanding of a
  business and its digital identity.
- A business exists independently of any website; a website is only one
  expression of the business.
- Business Journey is the canonical human experience layer above the existing
  architecture.
- Decision Architecture is the canonical governance model between the Human
  Journey and canonical artifacts.
- GNR8 is governed by decisions rather than workflows.
- Decision Architecture determines which business decisions are allowed, when
  they are allowed, which artifacts authorize them, and what new artifacts
  they authorize.
- The Decision Artifact Authorization Matrix is the canonical authorization
  layer inside Decision Architecture.
- No artifact exists without an authorizing business decision. Authorization
  preserves trust, lineage, and governance. Artifacts are authorized, never
  assumed.
- The Authorization Matrix defines required predecessor artifacts, required
  predecessor decisions, required governance state, required lineage, required
  confidence, and required alignment state for each canonical artifact.
- Every canonical artifact has a governance state.
- Governance State is the canonical business maturity and approval-status
  layer for artifacts. It is independent of provider, implementation, runtime,
  UI, generation, and publishing.
- Canonical Governance States are Observed, Draft, Reviewed, Aligned,
  Approved, Superseded, Archived, Rejected, and Blocked.
- Lineage is the immutable chain describing how governed business artifacts
  originate, evolve, authorize successors, and preserve business history.
- Versioning is a deterministic revision of the same business artifact within
  the same lineage.
- Business history is immutable. Every governed artifact preserves lineage.
  Versioning refines understanding; lineage preserves evolution.
- Artifacts exist to support business decisions.
- GNR8 guides businesses through understanding before generation.
- Conversation replaces unnecessary software complexity.
- Every artifact exists to support a human business decision.
- The Business Owner is the canonical journey owner.
- Evidence Capture -> Original Mirror -> Reconstruction remains part of the
  website-understanding connector chain, not a traditional builder/CMS path.
- Website Generation Package is the canonical generation contract between an
  aligned Website Design Brief and future external generation systems.
- Provider prompts are disposable projections. Provider adapters serialize the
  package; they never redefine meaning.
- The first MVP Provider Adapter path is Codex task payload. It is a
  provider-specific serialization of the Website Generation Package, not a new
  source of business intent.
- MVP-1H concrete provider identifiers are provider type `codex`, payload kind
  `codex_task`, and artifact kind `provider_generation_payload`.
- The Codex task payload is export-only and instructs future Codex execution
  to produce an implementation proposal only.
- Provider Execution is the governed boundary
  `ProviderGenerationPayload -> External AI Execution -> Generated Website
  Proposal`.
- Provider Execution may produce a quarantined implementation proposal only.
  It is not publishing, deployment, DNS mutation, production mutation,
  compliance approval, Business Approval, or a source of business truth.
- The first recommended execution mode is Manual Codex execution outside GNR8,
  followed by future controlled import of manually generated output as
  quarantined GeneratedWebsiteProposal material.
- MVP-1J defines the manual execution runbook and future Generated Website
  Proposal import boundary. The manual run requires exact source payload and
  WGP artifact recording, copied payload integrity, no hidden prompt edits, no
  business reinterpretation, proposal-only output, external bundle storage,
  and operator attestation.
- Generated Website Proposal import is quarantine-first. Proposal material is
  not trusted, cannot publish, cannot update DBT/WDB/WGP or
  ProviderGenerationPayload, cannot become compliance or Business Approval by
  itself, and must first be checked by Generation Contract Compliance.
- MVP-1K-1 implements the quarantine-first import/storage foundation for
  manual Codex output bundle metadata under artifact kind
  `generated_website_proposal`.
- `buildGeneratedWebsiteProposalFromManualOutput(...)` consumes source
  ProviderGenerationPayload, source WGP lineage, output bundle metadata, and
  operator attestation only. It performs no provider call, AI execution, code
  execution, publishing, deployment, DNS mutation, production mutation,
  runtime mutation, compliance execution, approval, UI, API, schema, or
  persistence behavior.
- Generated Website Proposal persistence uses existing site-version
  `importProvenanceSummary` with append-only history,
  `latestGeneratedWebsiteProposalArtifact`, equivalent latest reuse, changed
  append, latest load, and by-ID load.
- MVP-1K-2 defines the observation-only boundary
  `Generated Website Proposal -> Website Observation -> Observed Website Model
  -> Future Contract Comparison`.
- Observation records what exists in quarantined proposal material. It does
  not compare against WGP, judge compliance, create a Compliance Report,
  approve, publish, reinterpret the business, mutate WGP, trust providers, or
  mutate runtime state.
- Observation readiness values are `not_observable`,
  `partially_observable`, `observable`, and `blocked`.
- Conceptual observation artifacts are ObservedWebsite, ObservedPage,
  ObservedNavigation, ObservedSection, ObservedMessage, ObservedAsset,
  ObservedConstraint, ObservedTechnicalSignal, ObservedEvidence,
  ObservedLimitation, and ObservedWebsiteLineage.
- GNR8 owns contractual meaning. External AI owns implementation proposals.
- Generation Validation Engine observes proposal reality. Compliance
  determines contractual fulfillment.
- Generation Contract Compliance Report communicates contractual fulfillment
  for Business Approval.
- GNR8 publishes only after governed business approval.
- Business approval accepts contractual fulfillment, not implementation
  technology.
- Generation quality is measured by contract compliance, not by implementation
  technology.
- Knowledge hierarchy: Reality -> Evidence -> Facts -> Interpretations ->
  Knowledge -> Understanding -> Digital Business Twin -> Projections ->
  External AI.
- Business Alignment confirms or improves the Digital Business Twin before
  downstream planning begins.
- Current human governance layer after DA-3: Decision Model -> Authorization
  -> Governance State -> Lineage -> Versioning -> Canonical Artifacts ->
  Business Journey -> External AI -> Compliance -> Business Approval ->
  Publishing.
- Current authorization lifecycle: Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment Decision -> Business
  Alignment Artifact -> Website Design Decision -> Website Design Brief ->
  Generation Decision -> Website Generation Package -> Generation Execution
  Decision -> Generated Website Proposal -> Compliance Review Decision ->
  Generation Contract Compliance Report -> Business Approval Decision ->
  Business Approval -> Publishing Decision -> Published Experience.
- Roadmap after DA-3: Business Discovery -> Digital Business Twin -> Business
  Understanding Report -> Business Alignment Decision -> Business Alignment
  Artifact -> Website Design Decision -> Website Design Brief -> Generation
  Decision -> Website Generation Package -> Generation Execution Decision ->
  Generated Website Proposal -> Compliance Review Decision -> Generation
  Contract Compliance Report -> Business Approval Decision -> Business
  Approval -> Publishing Decision -> Published Experience.
- Business Domains own knowledge; Business Intent owns desired outcomes;
  Experience Domains own manifestations; Generation Packages own
  orchestration targets.
- Evidence is immutable; facts are evidence-backed; interpretations are
  derived; knowledge is validated interpretation; understanding is integrated
  knowledge; AI outputs are proposals.
- Current architecture: Decision Model -> Authorization -> Governance State
  -> Lineage -> Versioning -> Canonical Artifacts -> Business Journey ->
  External AI -> Compliance -> Business Approval -> Publishing.
- AO-0 canonical lifecycle: Reality -> Business Discovery -> Digital Business
  Twin -> Business Understanding Report -> Business Alignment -> Website
  Design Brief -> Website Generation Package -> Provider Adapter -> External
  AI -> Generation Contract Compliance -> Generation Contract Compliance
  Report -> Business Approval -> Publish -> Continuous Evolution.
- MVP-0 implementation planning lifecycle: Import Existing Website -> Evidence
  Collection -> Business Discovery -> Digital Business Twin -> Business
  Understanding Report -> Business Alignment -> Website Design Brief ->
  Website Generation Package -> Provider Adapter -> External AI -> Generation
  Contract Compliance -> Business Approval -> Publish.
- Architecture is complete. Implementation planning has officially started.
- MVP-0 identifies the shortest executable path as reusing import, evidence,
  runtime, and publish foundations, then building the missing canonical
  artifact chain between Evidence Collection and Publish.
- MVP-1A implements the first Business Discovery runtime builder and
  provenance persistence boundary. MVP-1A-R validates that boundary on current
  ODV and ViroiDoc imported website evidence. MVP-1B implements the first
  deterministic DBT runtime builder and provenance persistence boundary from
  Business Discovery. MVP-1B-R validates DBT on ODV and ViroiDoc and persists
  real-target DBT artifacts. MVP-1C implements the first deterministic
  Business Understanding Report runtime builder and provenance persistence
  boundary from Digital Business Twin. MVP-1C-R validates BUR on ODV and
  ViroiDoc and persists real-target BUR artifacts. MVP-1D implements the first
  deterministic Business Alignment runtime foundation and provenance
  persistence boundary from Business Understanding Report plus Digital
  Business Twin. MVP-1D-R validates Business Alignment on ODV and ViroiDoc,
  persists Business Alignment artifacts, and persists governed DBT vNext
  artifacts without adding customer facts. MVP-1E implements the first
  deterministic Website Design Brief runtime builder from aligned DBT output
  and Business Alignment lineage. MVP-1E-R validates that runtime against
  persisted ODV and ViroiDoc aligned DBT vNext artifacts and Business
  Alignment lineage. MVP-1F implements the first deterministic Website
  Generation Package runtime builder from persisted Website Design Brief
  artifacts. MVP-1F-R validates that runtime against persisted ODV and
  ViroiDoc Website Design Brief artifacts and persists real Website Generation
  Package artifacts. MVP-1G defines the first Provider Adapter boundary and
  recommends Codex task payload as the first provider path. MVP-1H implements
  the first deterministic Codex task ProviderGenerationPayload builder,
  validator, and provenance persistence boundary from persisted Website
  Generation Package artifacts. MVP-1H-R validates that runtime against real
  ODV and ViroiDoc Website Generation Package artifacts and persists
  reloadable provider payload artifacts without provider execution. MVP-1I
  defines the governed provider execution boundary, prerequisites, safety
  rules, and first execution mode recommendation without adding runtime
  execution. MVP-1J defines the manual Codex execution runbook and future
  Generated Website Proposal import boundary without adding provider calls,
  prompts sent from GNR8, automated AI execution, generated website import,
  compliance, Business Approval, publishing, UI, API, schema, workers,
  deployment, DNS mutation, production mutation, or TypeScript.

Website OS branch status:
- Closed/frozen/paused.
- Do not continue Website OS runtime expansion unless explicitly requested.

Current validation status:
- Phase MVP-1K-2 - Generated Website Proposal Observation Boundary Design
  is COMPLETE.
- Canonical Generation Validation Engine architecture document:
  `docs/architecture/GENERATION_VALIDATION_ENGINE_ARCHITECTURE.md`.
- Canonical generated proposal observation boundary document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.
- Canonical manual runbook:
  `docs/architecture/MANUAL_CODEX_EXECUTION_RUNBOOK.md`.
- Canonical generated proposal import boundary document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`.
- Canonical generated proposal import runtime document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_FOUNDATION.md`.
- Canonical provider execution boundary document:
  `docs/architecture/PROVIDER_EXECUTION_BOUNDARY_DESIGN.md`.
- Canonical validation document:
  `docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_REAL_TARGET_VALIDATION.md`.
- Canonical document:
  `docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_RUNTIME_BUILDER.md`.
- Companion boundary document:
  `docs/architecture/PROVIDER_ADAPTER_BOUNDARY_DESIGN.md`.
- Provider Adapter responsibility is
  `WebsiteGenerationPackageArtifact -> ProviderGenerationPayload`.
- Provider-neutral source is `WebsiteGenerationPackageArtifact`.
- Provider-specific output is `ProviderGenerationPayload`.
- The adapter serializes. It never redefines business intent.
- First MVP runtime provider type is `codex`.
- First MVP runtime payload kind is `codex_task`.
- Artifact kind is `provider_generation_payload`.
- Runtime files:
  `apps/platform/gnr8/architecture/provider-generation-payload-contract.ts`,
  `apps/platform/gnr8/architecture/codex-task-provider-payload-builder.ts`,
  and
  `apps/platform/gnr8/architecture/provider-generation-payload-persistence.ts`.
- Test files:
  `apps/platform/gnr8/architecture/provider-generation-payload-contract.test.ts`,
  `apps/platform/gnr8/architecture/codex-task-provider-payload-builder.test.ts`,
  and
  `apps/platform/gnr8/architecture/provider-generation-payload-persistence.test.ts`.
- `buildCodexTaskProviderPayload(...)` consumes only a persisted
  WebsiteGenerationPackageArtifact plus source WGP artifact ID, serializes the
  full WGP, preserves constraints, validation expectations, confidence,
  limitations, lineage, and diagnostics, and creates a proposal-only Codex task
  envelope.
- `validateProviderGenerationPayload(...)` validates provider type, payload
  kind, lineage, source WGP reference, required envelope sections, preserved
  constraints, preserved validation expectations, export-only safety, and
  recursive forbidden generated-output/provider-result fields.
- Persistence uses the existing site-version `importProvenanceSummary`
  boundary with append-only `providerGenerationPayloadArtifacts`,
  `latestProviderGenerationPayloadArtifact`, equivalent latest reuse, changed
  append, latest load, by-ID load, `invalid`/`stale` rejection, and `blocked`
  allowed.
- Focused Provider Generation Payload tests pass `17 / 17`; initial sandbox
  execution hit the known `tsx` IPC `listen EPERM ... tsx-501/*.pipe` issue,
  and the rerun outside the sandbox passed.
- Input readiness from MVP-1F-R remains: ODV WGP
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d` and ViroiDoc
  WGP `website_generation_package_3e34393aef612a2c597042917dc45085` are
  persisted, reloadable, provider-neutral package inputs for real-target
  provider payload validation.
- MVP-1H-R persisted ODV provider payload
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c` from source
  WGP `website_generation_package_c2c555025f186178f27c44c7cd272d4d`.
- MVP-1H-R persisted ViroiDoc provider payload
  `provider_generation_payload_2d99b17572dc23ef482cf56ba06e1230` from source
  WGP `website_generation_package_3e34393aef612a2c597042917dc45085`.
- Both source WGPs were latest for their site version and dry run before
  payload build.
- Both payloads persisted with status `draft`, provider type `codex`, payload
  kind `codex_task`, full serialized WGP, Codex task envelope, preserved
  constraints, validation expectations, confidence, limitations, diagnostics,
  lineage, and safety classification `export_only_no_execution`.
- ODV payload counts: preserved constraints `114`, validation expectations
  `10`, limitations `112`, diagnostics `8`, confidence `LOW`.
- ViroiDoc payload counts: preserved constraints `111`, validation
  expectations `10`, limitations `111`, diagnostics `8`, confidence `LOW`.
- Both payloads pass latest reload equality, by-ID reload equality, and
  idempotent retry reuse.
- Both envelopes are export-ready and include objective, source package
  summary, required website outcomes, navigation/page/section requirements,
  content requirements, constraints, validation expectations, forbidden
  actions, expected output shape, and stop conditions.
- MVP-1H-R created no provider calls, prompts sent, AI integration, external AI
  execution, generated website, generated output persistence, compliance
  execution, Business Approval, publishing, deployment, DNS mutation,
  production mutation, UI, API routes, schema migrations, or workers.
- MVP-1I defines the boundary
  `ProviderGenerationPayload -> External AI Execution -> Generated Website
  Proposal`.
- MVP-1I defines future ProviderExecutionRequest, ProviderExecutionRun,
  ProviderExecutionResult, and GeneratedWebsiteProposal concepts without
  TypeScript.
- MVP-1I execution prerequisites require a valid or explicitly export-ready
  ProviderGenerationPayload, preserved source WGP lineage, preserved provider
  payload lineage, safety classification, explicit operator authorization, no
  unresolved execution blockers, and no publishing, deployment, DNS, or
  production mutation permissions.
- MVP-1I safety rules require proposal-only generation, quarantined generated
  output, no production mutation, no deployment, no DNS mutation, no
  publishing, no automatic acceptance, compliance after generation, and
  Business Approval before publish.
- MVP-1I recommends Manual Codex execution outside GNR8 as the first execution
  mode, followed by future controlled import of manually generated output as
  quarantined GeneratedWebsiteProposal material.
- Generated output is an implementation proposal, not truth. It must not
  update the Digital Business Twin, Business Understanding Report, Business
  Alignment, Website Design Brief, Website Generation Package, or
  ProviderGenerationPayload.
- MVP-1I added no implementation, provider call, prompt sent, AI execution,
  generated website, compliance execution, Business Approval, publishing, UI,
  API, schema, or workers.
- MVP-1J manual runbook requires source ProviderGenerationPayload artifact ID,
  source WGP artifact ID, latest or explicitly accepted source status, copied
  payload integrity, no hidden prompt edits, no business reinterpretation, no
  production mutation, no deployment, no publishing, no DNS mutation, external
  generated-output storage, provider notes, implementation assumptions, known
  limitations, execution timestamp, operator reference, and operator
  attestation.
- MVP-1J generated proposal import boundary defines future concepts:
  GeneratedWebsiteProposal, GeneratedWebsiteProposalLineage,
  GeneratedWebsiteProposalStatus, GeneratedWebsiteProposalSource,
  GeneratedWebsiteProposalSafety, and
  GeneratedWebsiteProposalValidationReadiness.
- GeneratedWebsiteProposalStatus values are conceptually `received`,
  `quarantined`, `invalid`, `blocked`, `superseded`, and
  `compliance_ready`.
- Future import prerequisites are source ProviderGenerationPayload artifact
  ID, source WGP artifact ID, provider execution metadata, generated output
  bundle, no publishing artifacts, no deployment artifacts, no DNS/runtime
  mutation artifacts, and operator attestation.
- Generated Website Proposal is not trusted. It cannot publish, update DBT,
  update WDB, update WGP, update ProviderGenerationPayload, become compliance
  by itself, become Business Approval by itself, or mutate production. It must
  first be checked by Generation Contract Compliance.
- MVP-1J added no implementation, provider call from GNR8, prompt sent by
  GNR8, automated AI execution, generated website import implementation,
  compliance execution, Business Approval, publishing, UI, API, schema,
  workers, deployment, DNS mutation, production mutation, or TypeScript.
- MVP-1K-0 defines the Generation Validation Engine architecture in
  `docs/architecture/GENERATION_VALIDATION_ENGINE_ARCHITECTURE.md`.
- Core validation principle: generation produces a proposal, validation
  observes reality, compliance compares reality against the contract, Business
  Approval decides.
- Canonical validation pipeline:
  `Website Generation Package -> Generated Website Proposal -> Website
  Observation -> Observed Website Model -> Contract Comparison -> Compliance
  Evidence -> Generation Contract Compliance Report -> Business Approval ->
  Publish`.
- The engine owns observation, comparison, evidence, contractual evaluation,
  compliance evidence, and compliance report input.
- The engine does not own generation, business truth, business alignment,
  provider execution, or publishing.
- Future runtime concepts are ObservedWebsite, ObservedPage,
  ObservedSection, ObservedNavigation, ObservedMessage, ObservedAsset,
  ObservedConstraint, ObservedTechnicalSignal, ObservedEvidence,
  ObservedLimitation, and ObservedWebsiteLineage. MVP-1K-0 and MVP-1K-2
  define them conceptually only.
- Observation records what exists, never guesses intent, never infers business
  truth, and preserves missing or ambiguous observations as limitations.
- Comparison is Observed Website against Website Generation Package only. It
  never compares against prompts, provider output, HTML history, provider
  identity, or operator preference.
- Compliance decisions must reference observable evidence, and confidence is
  based on evidence, coverage, ambiguity, and missing observations rather than
  provider identity.
- Validation never changes DBT, BUR, Business Alignment, WDB, WGP, or
  Provider Payload. Validation only creates Compliance Evidence and
  Compliance Report input.
- MVP-1K-0 added no implementation, runtime, provider calls, generated
  website import, compliance implementation, publishing, UI, API, schema,
  workers, TypeScript, or generated website execution.
- MVP-1K-1 implements the Generated Website Proposal import runtime foundation
  in `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`,
  `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`, and
  `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`.
- Artifact kind is `generated_website_proposal`.
- `buildGeneratedWebsiteProposalFromManualOutput(...)` consumes source
  ProviderGenerationPayload, source WGP lineage, output bundle metadata, and
  operator attestation. It imports metadata only and returns a quarantined
  implementation proposal.
- `validateGeneratedWebsiteProposal(...)` enforces source references, output
  bundle metadata, operator attestation, quarantine safety, validation
  readiness, and recursive absence of canonical business artifacts,
  compliance, approval, publishing, deployment, DNS mutation, production
  mutation, runtime mutation, auto-publish, trusted provider result, and
  canonical truth update fields.
- Persistence uses existing site-version `importProvenanceSummary` with
  `generatedWebsiteProposalArtifacts`, `latestGeneratedWebsiteProposalArtifact`,
  equivalent latest reuse, changed append, latest load, and by-ID load.
- Persistence rejects `invalid`, accepts `blocked` and `quarantined`, accepts
  `compliance_ready` only when validation readiness allows it, and keeps
  `superseded` artifacts loadable.
- MVP-1K-1 added no website observation, compliance execution, Compliance
  Report, Business Approval, publishing, provider calls, AI execution,
  automatic generation, UI, API, schema, workers, deployment, DNS mutation,
  production mutation, runtime mutation, or generated output execution.
- MVP-1K-2 defines Generated Website Proposal Observation Boundary Design in
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.
- Observation pipeline is `Generated Website Proposal -> Website Observation
  -> Observed Website Model -> Future Contract Comparison`.
- Observation sources are generated output bundle metadata, generated file
  tree, rendered preview when available, static HTML/content when available,
  asset inventory, route/page inventory, operator notes, and provider notes.
- Observation evidence preserves source proposal artifact, source provider
  payload, source WGP, observed routes, sections, navigation, messages,
  assets, missing observations, limitations, and diagnostics.
- MVP-1K-2 added no implementation, observation runtime, compliance
  evaluator, Compliance Report, Business Approval, publishing, provider calls,
  AI execution, UI, API, schema, workers, deployment, DNS mutation, production
  mutation, or runtime mutation.
- MVP-1K-3 implements the first Observed Website Model runtime foundation in
  `apps/platform/gnr8/architecture/observed-website-model-contract.ts`,
  `apps/platform/gnr8/architecture/observed-website-model-builder.ts`, and
  `apps/platform/gnr8/architecture/observed-website-model-persistence.ts`.
- Artifact kind is `observed_website_model`.
- `buildObservedWebsiteModel(...)` consumes a quarantined
  GeneratedWebsiteProposalArtifact, output bundle metadata, available route
  and file metadata, provider notes, and operator notes. It records
  limitations when metadata is absent and does not compare against WGP.
- `validateObservedWebsiteModel(...)` validates required lineage, allowed
  status, unique observed IDs, readiness consistency, source proposal
  consistency when supplied, and recursive absence of compliance/downstream
  mutation fields.
- Persistence uses existing site-version `importProvenanceSummary` with
  `observedWebsiteModelArtifacts`, `latestObservedWebsiteModelArtifact`,
  equivalent latest reuse, changed append, latest load, and by-ID load.
- Persistence rejects `invalid` and `stale`, and accepts `blocked`,
  `not_observable`, `partially_observable`, and `observable`.
- MVP-1K-3 added no Generation Contract Compliance, Compliance Report,
  Business Approval, publishing, provider calls, AI execution, automatic
  generation, UI, API, schema migration, workers, deployment, DNS mutation,
  production mutation, runtime mutation, generated code execution, or rendered
  inspection beyond existing metadata.
- MVP-1K-4 implements the first Generation Contract Compliance runtime
  foundation in
  `apps/platform/gnr8/architecture/generation-contract-compliance-contract.ts`,
  `apps/platform/gnr8/architecture/generation-contract-compliance-builder.ts`,
  and
  `apps/platform/gnr8/architecture/generation-contract-compliance-persistence.ts`.
- Artifact kind is `generation_contract_compliance`.
- `buildGenerationContractCompliance(...)` consumes only
  WebsiteGenerationPackageArtifact and ObservedWebsiteModelArtifact. It
  compares objectives represented, navigation obligations, page obligations,
  section obligations, message coverage, asset presence, trust signal
  presence, constraints preserved, accessibility expectations observable, and
  SEO expectations observable.
- Every finding references observable compliance evidence. Missing or
  unobservable signals become limitations rather than invented compliance.
- `validateGenerationContractCompliance(...)` validates source lineage,
  allowed statuses, required evidence, unique finding IDs, category coverage,
  source WGP/OWM consistency when supplied, and recursive absence of
  downstream approval/publishing/mutation/provider-execution fields.
- Persistence uses existing site-version `importProvenanceSummary` with
  `generationContractComplianceArtifacts`,
  `latestGenerationContractComplianceArtifact`, equivalent latest reuse,
  changed append, latest load, and by-ID load.
- Persistence rejects `invalid` and `stale`, and accepts `blocked`,
  `incomplete`, `partial`, `compliant`, and `non_compliant`.
- MVP-1K-4 added no Compliance Report, Business Approval, publishing,
  provider calls, AI execution, automatic generation, UI, API, schema
  migration, workers, deployment, DNS mutation, production mutation, runtime
  mutation, or upstream business artifact mutation.
- MVP-1K-5 implements the first Generation Contract Compliance Report runtime
  foundation in
  `apps/platform/gnr8/architecture/generation-contract-compliance-report-contract.ts`,
  `apps/platform/gnr8/architecture/generation-contract-compliance-report-builder.ts`,
  and
  `apps/platform/gnr8/architecture/generation-contract-compliance-report-persistence.ts`.
- Artifact kind is `generation_contract_compliance_report`.
- `buildGenerationContractComplianceReport(...)` consumes only persisted
  `GenerationContractComplianceArtifact` and creates executive summary,
  overall compliance, business compliance, experience compliance,
  implementation observability, category results, deviations, missing
  requirements, constraint violations, business risks, recommendation,
  generation readiness, limitations, evidence summary, lineage, and
  diagnostics.
- Recommendation values are `proceed_to_approval`, `regenerate`,
  `improve_wgp`, `repeat_business_alignment`, `insufficient_evidence`, and
  `human_review_required`.
- Readiness values are `ready`, `ready_with_limitations`,
  `requires_regeneration`, `requires_alignment`, and `blocked`.
- The report does not recompute compliance. Compliance evaluates; the report
  explains.
- Persistence uses existing site-version `importProvenanceSummary` with
  `generationContractComplianceReportArtifacts`,
  `latestGenerationContractComplianceReportArtifact`, equivalent latest
  reuse, changed append, latest load, and by-ID load.
- MVP-1K-5 added no Business Approval, publishing, provider calls, AI
  execution, automatic generation, compliance recomputation, UI, API, schema
  migration, workers, deployment, DNS mutation, production mutation, runtime
  mutation, or upstream business artifact mutation.
- Next recommended phase is MVP-1K-6 Business Approval Runtime Foundation.
  Stop before publishing, deployment, DNS mutation, production mutation, UI,
  API, schema, workers, provider calls, AI execution, or runtime mutation
  outside the explicitly authorized Business Approval boundary.

Latest completed milestone:
- Phase MVP-1K-5 - Generation Contract Compliance Report Runtime Foundation.
- Status: COMPLETE / GENERATION CONTRACT COMPLIANCE REPORT RUNTIME
  FOUNDATION / PERSISTED COMPLIANCE ARTIFACT INPUT ONLY / DETERMINISTIC
  REPORT BUILDER / CONTRACT VALIDATOR / HUMAN-READABLE SECTIONS /
  RECOMMENDATION MODEL / READINESS MODEL / EVIDENCE SUMMARY / LINEAGE /
  DIAGNOSTICS / FORBIDDEN GUARD / EXISTING PROVENANCE BOUNDARY /
  LATEST REUSE / CHANGED APPEND / LATEST LOAD / BY-ID LOAD /
  NO COMPLIANCE RECOMPUTATION / NO BUSINESS APPROVAL / NO PUBLISHING /
  NO PROVIDER CALLS / NO AI EXECUTION / NO UI / NO API ROUTES /
  NO SCHEMA MIGRATIONS / NO WORKERS / NO DEPLOYMENT / NO DNS MUTATION /
  NO PRODUCTION MUTATION / NO RUNTIME MUTATION.
- Canonical document:
  `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REPORT_RUNTIME_FOUNDATION.md`.
- Recommended next phase after MVP-1K-5: MVP-1K-6 Business Approval Runtime
  Foundation.

Previous completed milestone:
- Phase MVP-1K-2 - Generated Website Proposal Observation Boundary Design.
- Status: COMPLETE / GENERATED WEBSITE PROPOSAL OBSERVATION BOUNDARY /
  OBSERVATION ONLY / GENERATED WEBSITE PROPOSAL TO WEBSITE OBSERVATION /
  OBSERVED WEBSITE MODEL / FUTURE CONTRACT COMPARISON / CONCEPTUAL ARTIFACTS
  DEFINED / OBSERVATION SOURCES DEFINED / OBSERVATION READINESS DEFINED /
  EVIDENCE MODEL DEFINED / NO COMPLIANCE JUDGMENT / NO COMPLIANCE REPORT /
  NO BUSINESS APPROVAL / NO PUBLISHING / NO PROVIDER CALLS /
  NO AI EXECUTION / NO UI / NO API ROUTES / NO SCHEMA MIGRATIONS /
  NO WORKERS / NO DEPLOYMENT / NO DNS MUTATION / NO PRODUCTION MUTATION /
  NO RUNTIME MUTATION.
- Canonical document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_OBSERVATION_BOUNDARY_DESIGN.md`.

Earlier completed milestone:
- Phase MVP-1K-1 - Generated Website Proposal Import Runtime Foundation.
- Status: COMPLETE / GENERATED WEBSITE PROPOSAL IMPORT RUNTIME FOUNDATION /
  QUARANTINED IMPORT STORAGE / MANUAL CODEX OUTPUT BUNDLE METADATA /
  SOURCE PROVIDER PAYLOAD LINEAGE REQUIRED / SOURCE WGP LINEAGE REQUIRED /
  OPERATOR ATTESTATION REQUIRED / OUTPUT BUNDLE METADATA REQUIRED /
  FORBIDDEN GUARD IMPLEMENTED / EXISTING PROVENANCE BOUNDARY /
  LATEST REUSE / CHANGED APPEND / LATEST LOAD / BY-ID LOAD /
  INVALID REJECTED / BLOCKED ACCEPTED / QUARANTINED ACCEPTED /
  COMPLIANCE_READY GATED / SUPERSEDED LOADABLE /
  NO OBSERVATION / NO COMPLIANCE EXECUTION / NO COMPLIANCE REPORT /
  NO BUSINESS APPROVAL / NO PUBLISHING / NO PROVIDER CALLS /
  NO AI EXECUTION / NO AUTOMATIC GENERATION / NO UI / NO API ROUTES /
  NO SCHEMA MIGRATIONS / NO WORKERS / NO DEPLOYMENT / NO DNS MUTATION /
  NO PRODUCTION MUTATION / NO RUNTIME MUTATION.
- Canonical document:
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_RUNTIME_FOUNDATION.md`.

Earlier completed milestone:
- Phase MVP-1J - Manual Codex Execution Runbook and Generated Proposal Import
  Boundary Design.
- Status: COMPLETE / MANUAL CODEX RUNBOOK DEFINED /
  GENERATED PROPOSAL IMPORT BOUNDARY DEFINED / SOURCE ARTIFACT RECORDING
  REQUIRED / COPIED PAYLOAD INTEGRITY REQUIRED / NO HIDDEN PROMPT EDITS /
  NO BUSINESS REINTERPRETATION / QUARANTINE-FIRST IMPORT MODEL /
  GENERATED WEBSITE PROPOSAL IS NOT TRUSTED / COMPLIANCE REQUIRED BEFORE
  APPROVAL / NO PROVIDER CALL FROM GNR8 / NO PROMPT SENT BY GNR8 /
  NO AUTOMATED AI EXECUTION / NO GENERATED WEBSITE IMPORT IMPLEMENTATION /
  NO COMPLIANCE EXECUTION / NO BUSINESS APPROVAL / NO PUBLISHING /
  NO DEPLOYMENT / NO DNS MUTATION / NO PRODUCTION MUTATION /
  NO UI / NO API ROUTES / NO SCHEMA MIGRATIONS / NO WORKERS / NO TYPESCRIPT.
- Canonical documents:
  `docs/architecture/MANUAL_CODEX_EXECUTION_RUNBOOK.md` and
  `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`.
- Provider type: `codex`.
- Provider payload kind: `codex_task`.
- Artifact kind: `provider_generation_payload`.
- Source artifact: `WebsiteGenerationPackageArtifact`.
- Execution input: `ProviderGenerationPayload`.
- Execution output concept: `GeneratedWebsiteProposal`.
- ODV provider payload:
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`.
- ViroiDoc provider payload:
  `provider_generation_payload_2d99b17572dc23ef482cf56ba06e1230`.
- Recommended next phase after MVP-1J: superseded by completed MVP-1K-0
  Generation Validation Engine Architecture and completed MVP-1K-1 Generated
  Website Proposal Import Runtime Foundation, completed MVP-1K-2 Generated
  Website Proposal Observation Boundary Design, and completed MVP-1K-3
  Observed Website Model Runtime Foundation, and completed MVP-1K-4
  Generation Contract Compliance Runtime Foundation, and completed MVP-1K-5
  Generation Contract Compliance Report Runtime Foundation. Current next
  recommended phase is MVP-1K-6 Business Approval Runtime Foundation.

Earlier completed milestone:
- Phase MVP-1D-R - Business Alignment Real-Target Validation.
- Status: COMPLETE / REAL ODV VALIDATED / REAL VIROIDOC VALIDATED /
  BUSINESS ALIGNMENT ARTIFACTS PERSISTED / DBT VNEXT PERSISTED /
  RELOAD EQUALITY PASSES / IDEMPOTENT RETRY REUSES ARTIFACTS /
  LINEAGE PRESERVED / MISSING KNOWLEDGE UNRESOLVED WITHOUT NEW FACTS /
  NO WEBSITE DESIGN BRIEF / NO WEBSITE GENERATION PACKAGE / NO AI /
  NO PROVIDER ADAPTER / NO GENERATION / NO COMPLIANCE /
  NO BUSINESS APPROVAL / NO PUBLISHING / NO UI / NO API ROUTES /
  NO SCHEMA MIGRATIONS.
- Canonical document:
  `docs/architecture/BUSINESS_ALIGNMENT_REAL_TARGET_VALIDATION.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/business-alignment-contract.ts`,
  `apps/platform/gnr8/architecture/business-alignment-runtime.ts`, and
  `apps/platform/gnr8/architecture/business-alignment-persistence.ts`.
- Test files:
  `apps/platform/gnr8/architecture/business-alignment-contract.test.ts`,
  `apps/platform/gnr8/architecture/business-alignment-runtime.test.ts`, and
  `apps/platform/gnr8/architecture/business-alignment-persistence.test.ts`.
- Artifact kind: `business_alignment`.
- Contract version: `MVP-1D`.
- Runtime behavior: deterministic Business Alignment from one source DBT, one
  source BUR, explicit decisions, and explicit corrections. Corrections apply
  only to DBT knowledge and missing knowledge. Business Alignment produces a
  DBT vNext revision and never edits Business Understanding Reports.
- Supported correction types: `confirm`, `correct`, `remove`, `add_missing`,
  and `unresolved`.
- Persistence: existing site-version `importProvenanceSummary` boundary,
  append-only `businessAlignmentArtifacts`, latest pointer
  `latestBusinessAlignmentArtifact`, semantic latest reuse, changed artifact
  append, latest/by-ID load helpers, `invalid`/`stale` rejection, and
  `blocked` accepted as valid fail-closed.
- Forbidden guard rejects: `websiteDesignBrief`,
  `websiteGenerationPackage`, `providerPayload`, `prompt`,
  `generatedContent`, `generatedReact`, `generatedHtml`,
  `generatedComponents`, `generatedBlocks`, `AIOutput`, `aiOutput`,
  `publishingArtifact`, `deploymentArtifact`, and `executionArtifact`.
- Recommended next phase after MVP-1D-R: MVP-1E Website Design Brief Runtime
  Builder, limited to consuming aligned DBT output and Business Alignment
  lineage.

Previous completed milestone:
- Phase MVP-1C - Business Understanding Report Runtime Builder.
- Status: COMPLETE / BUR CONTRACT IMPLEMENTED / DETERMINISTIC BUILDER
  IMPLEMENTED / PROVENANCE PERSISTENCE IMPLEMENTED / FOCUSED TESTS PASS /
  PLATFORM VERCEL BUILD PASSES / GIT DIFF CHECK PASSES / NO BUSINESS
  ALIGNMENT / NO WEBSITE DESIGN BRIEF / NO WEBSITE GENERATION PACKAGE /
  NO AI / NO PROVIDER ADAPTER / NO GENERATION / NO COMPLIANCE /
  NO BUSINESS APPROVAL / NO PUBLISHING / NO UI / NO API ROUTES /
  NO SCHEMA MIGRATIONS.
- Canonical document:
  `docs/architecture/BUSINESS_UNDERSTANDING_REPORT_RUNTIME_BUILDER.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/business-understanding-report-contract.ts`,
  `apps/platform/gnr8/architecture/business-understanding-report-builder.ts`,
  and
  `apps/platform/gnr8/architecture/business-understanding-report-persistence.ts`.
- Test files:
  `apps/platform/gnr8/architecture/business-understanding-report-contract.test.ts`,
  `apps/platform/gnr8/architecture/business-understanding-report-builder.test.ts`,
  and
  `apps/platform/gnr8/architecture/business-understanding-report-persistence.test.ts`.
- Artifact kind: `business_understanding_report`.
- Contract version: `MVP-1C`.
- Builder behavior: deterministic BUR construction from one supplied Digital
  Business Twin artifact only. DBT knowledge items become human-readable report
  sections. DBT `missingKnowledge` becomes the Missing Knowledge section. DBT
  limitations, confidence, evidence refs, lineage, and diagnostics propagate.
  Partial DBT produces partial BUR; blocked DBT produces blocked fail-closed
  BUR; invalid or stale DBT produces invalid or stale fail-closed BUR.
- MVP sections: `executive_summary`, `business_overview`,
  `products_and_services`, `target_audience`, `business_goals`,
  `brand_identity`, `current_digital_presence`, `trust_signals`,
  `missing_knowledge`, `confidence_overview`, `recommendations`,
  `limitations`, `evidence_summary`, and `diagnostics`.
- Recommendations are business-oriented only:
  `clarify_positioning`, `improve_messaging`, `strengthen_trust`,
  `improve_customer_journey`, `expand_content`, `improve_digital_presence`,
  `resolve_missing_audience`, and `resolve_missing_offerings`.
- Recommendations never prescribe React, HTML, components, layouts, prompts,
  provider behavior, publishing behavior, generated content, or deployment
  behavior.
- Persistence: existing site-version `importProvenanceSummary` boundary,
  append-only `businessUnderstandingReportArtifacts`, latest pointer
  `latestBusinessUnderstandingReportArtifact`, semantic latest reuse, changed
  artifact append, latest/by-ID load helpers, `invalid`/`stale` rejection, and
  `blocked` accepted as valid fail-closed.
- Forbidden guard rejects: `businessAlignment`, `websiteDesignBrief`,
  `websiteGenerationPackage`, `providerPayload`, `prompt`, `aiOutput`,
  `generatedContent`, `generatedHtml`, `generatedReact`,
  `generatedComponents`, `generatedBlocks`, `publishingArtifact`,
  `deploymentArtifact`, and `executionArtifact`.
- Validation result: focused Business Understanding Report tests pass; platform
  Vercel build passes; `git diff --check` passes.
- Recommended next phase after MVP-1C implementation was MVP-1C-R Business
  Understanding Report Real-Target Validation retry, now complete.

Previous completed milestone:
- Phase MVP-1B - Digital Business Twin Runtime Builder.
- Status: COMPLETE / DBT CONTRACT IMPLEMENTED / DETERMINISTIC BUILDER
  IMPLEMENTED / PROVENANCE PERSISTENCE IMPLEMENTED / FOCUSED TESTS PASS /
  PLATFORM VERCEL BUILD PASSES / GIT DIFF CHECK PASSES / NO BUR /
  NO BUSINESS ALIGNMENT / NO WEBSITE DESIGN BRIEF / NO WEBSITE GENERATION
  PACKAGE / NO AI / NO PROVIDER ADAPTER / NO GENERATION / NO COMPLIANCE /
  NO BUSINESS APPROVAL / NO PUBLISHING / NO UI / NO API ROUTES /
  NO SCHEMA MIGRATIONS.
- Canonical document:
  `docs/architecture/DIGITAL_BUSINESS_TWIN_RUNTIME_BUILDER.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/digital-business-twin-contract.ts`,
  `apps/platform/gnr8/architecture/digital-business-twin-builder.ts`, and
  `apps/platform/gnr8/architecture/digital-business-twin-persistence.ts`.
- Test files:
  `apps/platform/gnr8/architecture/digital-business-twin-contract.test.ts`,
  `apps/platform/gnr8/architecture/digital-business-twin-builder.test.ts`,
  and `apps/platform/gnr8/architecture/digital-business-twin-persistence.test.ts`.
- Artifact kind: `digital_business_twin`.
- Contract version: `MVP-1B`.
- Builder behavior: deterministic DBT construction from one supplied Business
  Discovery artifact only. Business Discovery findings become DBT knowledge
  items. Missing Business Discovery domains become `missingKnowledge`. Partial
  Business Discovery produces partial DBT; blocked Business Discovery produces
  blocked fail-closed DBT; invalid or stale Business Discovery produces invalid
  or stale DBT.
- MVP domains: `business_identity`, `offerings`, `audience`, `brand`,
  `digital_presence`, `goals`, `trust`, `content`, and `constraints`.
- Persistence: existing site-version `importProvenanceSummary` boundary,
  append-only `digitalBusinessTwinArtifacts`, latest pointer
  `latestDigitalBusinessTwinArtifact`, semantic latest reuse, changed artifact
  append, latest/by-ID load helpers, `invalid`/`stale` rejection, and
  `blocked` accepted as valid fail-closed.
- Forbidden guard rejects: `businessUnderstandingReport`,
  `businessAlignment`, `websiteDesignBrief`, `websiteGenerationPackage`,
  `providerPayload`, `prompt`, `aiOutput`, `generatedContent`,
  `generatedHtml`, `generatedReact`, `publishingArtifact`,
  `deploymentArtifact`, and `executionArtifact`.
- Validation result: focused Digital Business Twin tests pass; platform Vercel
  build passes; `git diff --check` passes.
- Then-recommended next phase: MVP-1C Business Understanding Report Runtime
  Builder, limited to consuming persisted Digital Business Twin artifacts.

Latest real-target validation:
- Phase MVP-1C-R - Business Understanding Report Real-Target Validation retry.
- Status: COMPLETE / REAL ODV AND VIROIDOC BUR ARTIFACTS PERSISTED /
  LATEST RELOAD VERIFIED / BY-ID RELOAD VERIFIED / IDEMPOTENT RETRY VERIFIED /
  HUMAN-READABILITY VERIFIED / NO BUSINESS ALIGNMENT / NO WEBSITE DESIGN
  BRIEF / NO WEBSITE GENERATION PACKAGE / NO AI / NO PROVIDER ADAPTER /
  NO GENERATION / NO COMPLIANCE / NO BUSINESS APPROVAL / NO PUBLISHING /
  NO UI / NO API ROUTES / NO SCHEMA MIGRATIONS / NO WORKERS.
- Canonical document:
  `docs/architecture/BUSINESS_UNDERSTANDING_REPORT_REAL_TARGET_VALIDATION.md`.
- ODV BUR artifact:
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad`.
- ViroiDoc BUR artifact:
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10`.
- Recommended next phase: MVP-1D Business Alignment Runtime Foundation,
  limited to consuming persisted BUR artifacts and stopping before Website
  Design Brief, Website Generation Package, provider adapters, external AI,
  generation, compliance, Business Approval, or publishing.

Previous real-target validation:
- Phase MVP-1B-R - Digital Business Twin Real-Target Validation.
- Status: COMPLETE / REAL ODV AND VIROIDOC DBT ARTIFACTS PERSISTED /
  LATEST RELOAD VERIFIED / BY-ID RELOAD VERIFIED / IDEMPOTENT RETRY VERIFIED /
  BLOCKED SOURCE BEHAVIOR VERIFIED / NO BUR / NO BUSINESS ALIGNMENT /
  NO WEBSITE DESIGN BRIEF / NO WEBSITE GENERATION PACKAGE / NO AI /
  NO PROVIDER ADAPTER / NO GENERATION / NO COMPLIANCE / NO BUSINESS APPROVAL /
  NO PUBLISHING / NO UI / NO API ROUTES / NO SCHEMA MIGRATIONS / NO WORKERS.
- Canonical document:
  `docs/architecture/DIGITAL_BUSINESS_TWIN_REAL_TARGET_VALIDATION.md`.
- ODV DBT artifact:
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f`.
- ViroiDoc DBT artifact:
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92`.

Previous completed milestone:
- Phase MVP-1A-R - Business Discovery Real-Target Validation.
- Status: COMPLETE / REAL ODV AND VIROIDOC VALIDATED / BUSINESS DISCOVERY
  ARTIFACTS PERSISTED / LATEST RELOAD VERIFIED / BY-ID RELOAD VERIFIED /
  IDEMPOTENT RETRY VERIFIED / NO DBT / NO BUR / NO BUSINESS ALIGNMENT /
  NO WEBSITE DESIGN BRIEF / NO WEBSITE GENERATION PACKAGE / NO AI /
  NO PROVIDER ADAPTER / NO GENERATION / NO COMPLIANCE / NO BUSINESS APPROVAL /
  NO PUBLISHING / NO UI / NO API ROUTES / NO SCHEMA MIGRATIONS / NO WORKERS.
- Canonical document:
  `docs/architecture/BUSINESS_DISCOVERY_REAL_TARGET_VALIDATION.md`.
- Supporting builder document:
  `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_BUILDER.md`.
- Runtime files:
  `apps/platform/gnr8/architecture/business-discovery-contract.ts`,
  `apps/platform/gnr8/architecture/business-discovery-builder.ts`, and
  `apps/platform/gnr8/architecture/business-discovery-persistence.ts`.
- Test files:
  `apps/platform/gnr8/architecture/business-discovery-contract.test.ts`,
  `apps/platform/gnr8/architecture/business-discovery-builder.test.ts`, and
  `apps/platform/gnr8/architecture/business-discovery-persistence.test.ts`.
- Artifact kind: `business_discovery`.
- Contract version: `MVP-1A`.
- Builder behavior: deterministic interpretation from existing imported
  website evidence only, including source URL/host, routes, navigation labels,
  section boundary types, asset inventory counts, upstream limitations,
  diagnostics, and optional Candidate Discovery context.
- MVP domains: `business_identity`, `offerings`, `audience`, `brand`,
  `digital_presence`, `goals`, `trust`, `content`, and `constraints`.
- Persistence: existing site-version `importProvenanceSummary` boundary,
  append-only `businessDiscoveryArtifacts`, latest pointer
  `latestBusinessDiscoveryArtifact`, semantic latest reuse, changed artifact
  append, latest/by-ID load helpers, `invalid`/`stale` rejection, and
  `blocked` accepted as valid fail-closed.
- Business Discovery differs from DBT: it is an evidence-backed interpretation
  artifact and canonical DBT input, not the governed operational business
  understanding itself.
- Real-target validation result: ODV
  `09dce7ea-d860-4f60-a1eb-26c3335b302e` persisted
  `business_discovery_7b37413651d79de0d109e31690a34b62`; ViroiDoc
  `e26b0754-988b-45b9-9e24-8e213179b6cf` persisted
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`.
- ODV result: status `partial`, 12 findings, 104 limitations, 0 blockers,
  `MEDIUM` confidence, implemented domains `business_identity`, `brand`,
  `digital_presence`, `goals`, `trust`, `content`, and `constraints`.
- ViroiDoc result: status `partial`, 17 findings, 105 limitations, 0
  blockers, `MEDIUM` confidence, implemented domains `business_identity`,
  `offerings`, `brand`, `digital_presence`, `goals`, `trust`, `content`, and
  `constraints`.
- Lineage: ODV linked Candidate Discovery
  `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`; ViroiDoc
  linked Candidate Discovery
  `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`.
- Reload/idempotency: latest reload equality, by-ID reload equality, and
  idempotent retry reuse all passed for both targets.
- Safety: no DBT, Business Understanding Report, Business Alignment, Website
  Design Brief, Website Generation Package, provider payload, prompt, AI
  output, generated content, or publishing artifact was created.
- Validation result: focused Business Discovery tests pass; platform Vercel
  build passes; `git diff --check` passes.
- Recommended next phase at completion: MVP-1B Digital Business Twin Runtime
  Builder, limited to consuming persisted Business Discovery artifacts as DBT
  input. Completed by the latest milestone above.

Earlier completed milestone:
- Phase MVP-0 - First Executable Website Transformation Pipeline.
- Status: COMPLETE / DOCUMENTATION, ARCHITECTURE ANALYSIS, AND IMPLEMENTATION
  PLANNING ONLY / FIRST EXECUTABLE MVP ROADMAP CREATED / NO IMPLEMENTATION /
  NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS /
  NO PROMPTS / NO PROVIDER ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO
  PUBLISHING.
- Canonical document:
  `docs/architecture/MVP_0_FIRST_EXECUTABLE_PIPELINE.md`.
- Document role: reconciles the completed architecture with the actual
  codebase and identifies the shortest path from one imported customer website
  to one generated, validated, approved, and published website.
- Canonical MVP pipeline: Import Existing Website -> Evidence Collection ->
  Business Discovery -> Digital Business Twin -> Business Understanding Report
  -> Business Alignment -> Website Design Brief -> Website Generation Package
  -> External AI -> Generation Contract Compliance -> Business Approval ->
  Publish.
- Reality assessment: Import Existing Website is complete; Evidence
  Collection, Business Discovery, Digital Business Twin, and Publish are
  partial; Business Understanding Report, Business Alignment, Website Design
  Brief, Website Generation Package, External AI, Generation Contract
  Compliance, and Business Approval are architecture complete but runtime
  missing.
- Critical path: create the MVP canonical artifact persistence boundary, add a
  first-customer evidence readiness gate, build Business Discovery, DBT v1,
  Business Understanding Report, Business Alignment, Website Design Brief,
  Website Generation Package, one provider adapter, Generated Website Proposal,
  Compliance Report, Business Approval, and the approval-gated publish bridge.
- Deferred: multiple providers, provider comparison, multi-user workflows,
  advanced Business Alignment, Experience Domains beyond Website, Continuous
  Evolution, advanced governance UI, enterprise collaboration,
  reconstruction-grade capture, advanced capture modalities, internal visual
  editor behavior, and broad self-service product polish.
- Recommended next phase: MVP-1 Canonical Artifact Persistence Boundary and
  Business Discovery Builder.
- Safety: documentation and architecture planning only; no implementation,
  TypeScript, schema, persistence, API, UI, workers, prompts, provider
  adapters, AI integration, generation, publishing, runtime behavior, or
  deployment behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase AO-0 - The GNR8 Blueprint.
- Status: COMPLETE / DOCUMENTATION ONLY / CANONICAL ARCHITECTURE NARRATIVE
  CREATED / PRIMARY ONBOARDING DOCUMENT ESTABLISHED / NO IMPLEMENTATION / NO
  TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO
  PROMPTS / NO PROVIDER ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO
  PUBLISHING.
- Canonical document:
  `docs/architecture/THE_GNR8_BLUEPRINT.md`.
- Document role: the preferred onboarding document before reading detailed
  specifications. It explains what GNR8 is, why it exists, which problem it
  solves, why traditional CMSs and generic AI builders are insufficient, and
  how the platform transforms business understanding into governed digital
  experiences.
- Five-layer architecture: Reality -> Knowledge -> Decision -> Experience ->
  Execution.
- Canonical lifecycle: Reality -> Business Discovery -> Digital Business
  Twin -> Business Understanding Report -> Business Alignment -> Website
  Design Brief -> Website Generation Package -> Provider Adapter -> External
  AI -> Generation Contract Compliance -> Generation Contract Compliance
  Report -> Business Approval -> Publish -> Continuous Evolution.
- Safety: documentation only; no implementation, TypeScript, schema,
  persistence, API, UI, workers, prompts, provider adapters, AI integration,
  generation, publishing, runtime behavior, or deployment behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DA-3 - Canonical Artifact Lineage and Versioning Model.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / LINEAGE AND
  VERSIONING ESTABLISHED AS THE CANONICAL HISTORY AND EVOLUTION LAYER SHARED
  BY EVERY GOVERNED ARTIFACT / DECISION ARCHITECTURE COMPLETE / NO
  IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI
  / NO WORKERS / NO PROMPTS / NO PROVIDER ADAPTERS / NO AI INTEGRATION / NO
  GENERATION / NO PUBLISHING.
- Canonical specification:
  `docs/architecture/CANONICAL_ARTIFACT_LINEAGE_AND_VERSIONING_MODEL.md`.
- Canonical definitions: "The immutable chain describing how governed
  business artifacts originate, evolve, authorize successors, and preserve
  business history." Version is "A deterministic revision of the same business
  artifact within the same lineage."
- Core philosophy: history is never rewritten; every decision creates
  traceability; superseded artifacts remain valid historical records; business
  evolution is additive; lineage preserves truth; versioning preserves
  refinement.
- Lineage continuity: Business Discovery -> Digital Business Twin v1 ->
  Digital Business Twin v2 -> Business Understanding Report v3 -> Business
  Alignment v2 -> Website Design Brief v4 -> Website Generation Package v7.
- Versioning rules: new versions are required for minor refinement, major
  refinement, business correction, new evidence, new alignment, new approval,
  and regeneration when governed meaning, readiness, authority, confidence,
  alignment, or downstream eligibility changes.
- Lineage events: Created, Updated, Reviewed, Aligned, Approved, Superseded,
  Archived, Rejected, Regenerated, and Published.
- Relationship model: Reality -> Evidence -> Knowledge -> Decision ->
  Authorization -> Governance State -> Lineage -> Version -> Artifact ->
  Business Journey.
- Architectural rule: Lineage never stores implementation, provider payloads,
  prompts, runtime state, React, HTML, generated code, or deployment
  artifacts. It preserves business evolution only.
- Decision Architecture is complete. The governance architecture now consists
  of Decision Model -> Authorization -> Governance State -> Lineage ->
  Versioning -> Canonical Artifacts -> Business Journey -> External AI ->
  Compliance -> Business Approval -> Publishing.
- Future vision: future GNR8 should allow any historical digital experience
  to be reconstructed from governed lineage without ambiguity.
- Recommended next phase: ARCH-1 Canonical Architecture Index Reconciliation,
  documentation only.
- Safety: documentation and architecture only; no implementation, TypeScript,
  schema, persistence, API, UI, workers, prompts, provider adapters, AI
  integration, generation, publishing, runtime behavior, or deployment
  behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DA-2 - Canonical Artifact Governance State Model.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / GOVERNANCE STATE
  ESTABLISHED AS THE CANONICAL BUSINESS MATURITY AND APPROVAL-STATUS LAYER
  SHARED BY ALL CANONICAL ARTIFACTS / NO IMPLEMENTATION / NO TYPESCRIPT / NO
  SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO PROMPTS / NO
  PROVIDER ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO PUBLISHING.
- Canonical specification:
  `docs/architecture/CANONICAL_ARTIFACT_GOVERNANCE_STATE_MODEL.md`.
- Canonical definition: "A deterministic business governance lifecycle
  describing the maturity and approval status of a canonical artifact."
- Governance State records whether a canonical artifact is Observed, Draft,
  Reviewed, Aligned, Approved, Superseded, Archived, Rejected, or Blocked.
- Governance State is not a workflow and not authorization. Workflow executes
  tasks. Authorization decides whether a business decision may affect an
  artifact. Governance State records the artifact's governed maturity after
  authorization.
- Canonical transition model: Observed -> Reviewed -> Aligned -> Approved ->
  Superseded -> Archived, with a draft path of Observed -> Draft -> Reviewed
  -> Aligned -> Approved and legal rejection/blocking/Return To Review paths.
- Return To Review is a legal transition pattern, not a canonical state.
- State ownership: Business Owner is the canonical owner of artifact
  governance decisions. Marketing, Agency, Administrator, and Future Roles may
  contribute, review, recommend, resolve blocks, or transition artifacts only
  within delegated business authority.
- State independence: Governance State is independent of provider,
  implementation, runtime, UI, generation, publishing, prompts, provider
  adapters, workers, APIs, schemas, persistence, and deployment.
- Relationship model: Decision -> Authorization -> Governance State ->
  Artifact -> Business Journey.
- Manifesto alignment: every canonical artifact has a governance state.
  Governance State describes artifact maturity and approval status and never
  contains implementation, runtime, schema, provider logic, generation, or
  publishing implementation.
- Recommended next phase: DA-3 Canonical Artifact Lineage and Versioning
  Model, documentation and architecture only.
- Safety: documentation and architecture only; no implementation, TypeScript,
  schema, persistence, API, UI, workers, prompts, provider adapters, AI
  integration, generation, publishing, runtime behavior, or deployment
  behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DA-1 - Decision Artifact Authorization Matrix Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / AUTHORIZATION
  MATRIX ESTABLISHED AS THE CANONICAL GOVERNANCE LAYER THAT DEFINES WHICH
  BUSINESS DECISIONS AUTHORIZE EACH CANONICAL ARTIFACT AND UNDER WHICH
  PREREQUISITES / NO IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO
  PERSISTENCE / NO API / NO UI / NO WORKERS / NO PROMPTS / NO PROVIDER
  ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO PUBLISHING.
- Canonical specification:
  `docs/architecture/DECISION_ARTIFACT_AUTHORIZATION_MATRIX.md`.
- Canonical definition: "A deterministic governance model defining which
  business decisions authorize each canonical artifact and under which
  prerequisites."
- The Authorization Matrix governs artifact creation, revision, supersession,
  and progression. Artifacts never appear automatically. Every artifact exists
  because an explicit governed business decision authorized it.
- Canonical authorization chain: Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment Decision -> Business
  Alignment Artifact -> Website Design Decision -> Website Design Brief ->
  Generation Decision -> Website Generation Package -> Generation Execution
  Decision -> Generated Website Proposal -> Compliance Review Decision ->
  Generation Contract Compliance Report -> Business Approval Decision ->
  Business Approval -> Publishing Decision -> Published Experience.
- Authorization rules: every artifact requires an explicit authorizing
  decision; no downstream artifact may bypass upstream authorization; no
  artifact may authorize itself; authorization preserves lineage; supersession
  creates new lineage; nothing overwrites previous artifacts.
- Prerequisite model: every authorization defines required predecessor
  artifacts, required predecessor decisions, required governance state,
  required lineage, required confidence, and required alignment state.
- Supersession model: superseded artifacts remain immutable; new decisions
  create new artifacts; lineage records the transition; no history is deleted.
- Decision-to-artifact relationships: one decision may authorize one artifact,
  one decision may authorize multiple artifacts, and multiple prior decisions
  may be required for one artifact when the governance chain is cumulative.
- Relationship model: Decision Architecture -> Authorization Matrix ->
  Canonical Artifacts -> Business Journey -> External AI -> Compliance ->
  Business Approval -> Publishing.
- Manifesto alignment: no artifact exists without an authorizing business
  decision. Authorization preserves trust, lineage, and governance. Artifacts
  are authorized, never assumed.
- Recommended next phase: DA-2 Canonical Artifact Governance State Model,
  documentation and architecture only.
- Safety: documentation and architecture only; no implementation, TypeScript,
  schema, persistence, API, UI, workers, prompts, provider adapters, AI
  integration, generation, publishing, runtime behavior, or deployment
  behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DA-0 - Decision Architecture Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / DECISION
  ARCHITECTURE ESTABLISHED AS THE CANONICAL GOVERNANCE MODEL THAT CONTROLS HOW
  BUSINESSES PROGRESS THROUGH GNR8 / NO IMPLEMENTATION / NO TYPESCRIPT / NO
  SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WIREFRAMES / NO WORKERS / NO
  PROMPTS / NO PROVIDER ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO
  PUBLISHING.
- Canonical specification:
  `docs/architecture/DECISION_ARCHITECTURE_SPECIFICATION.md`.
- Canonical definition: "A deterministic governance model describing how
  business decisions progress through canonical artifacts while preserving
  lineage and human authority."
- Decision Architecture governs business decisions. It never governs
  implementation. Artifacts provide evidence. Humans make decisions.
- Core philosophy: artifacts exist to support decisions; humans remain
  decision makers; AI produces proposals; no artifact exists without a
  business decision; every decision produces new lineage; understanding
  precedes generation; generation precedes approval; approval precedes
  publishing.
- Canonical decision lifecycle: Evidence -> Understanding -> Decision ->
  Artifact -> Next Decision.
- Decision types: Continue, Provide Information, Correct Understanding,
  Approve Understanding, Reject Understanding, Approve Alignment, Return To
  Discovery, Approve Website Intent, Generate, Review Compliance, Approve
  Business, Reject Business, Publish, and Continue Evolution.
- Decision ownership: Business Owner remains the canonical owner of business
  decisions. Marketing, Agency, Designer, Developer, Administrator, and Future
  Roles may contribute evidence, recommendations, review, feasibility, or
  governance support, but business decisions always remain business-governed.
- Deterministic preconditions: Business Alignment cannot occur before Business
  Understanding; Website Design Brief cannot exist before Alignment; Website
  Generation Package cannot exist before an approved Website Design Brief;
  Generation cannot occur before Website Generation Package; Publishing cannot
  occur before Business Approval.
- Decision graph: decisions may repeat; alignment may return to discovery;
  generation may repeat; compliance may return to Website Generation Package;
  Business Approval may reject or request regeneration; business evolution may
  continue indefinitely.
- Relationship model: Business Journey -> Decision Architecture -> Canonical
  Artifacts -> External AI -> Compliance -> Business Approval -> Publishing.
- Manifesto alignment: GNR8 is governed by decisions rather than workflows.
  Artifacts exist to support business decisions. Human authority is preserved
  through deterministic decision architecture. Decision Architecture is the
  operational backbone of GNR8.
- Future vision: GNR8 should behave like an experienced strategic advisor.
  Every recommendation should ultimately support a business decision. Decision
  Architecture should remain stable even if AI providers change.
- Recommended next phase: DA-1 Decision Artifact Authorization Matrix
  Specification, documentation and architecture only.
- Safety: documentation and architecture only; no implementation, TypeScript,
  schema, persistence, API, UI, wireframes, workers, prompts, provider
  adapters, AI integration, generation, publishing, runtime state, or
  deployment behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase UX-0 - Business Journey Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / BUSINESS JOURNEY
  ESTABLISHED AS THE CANONICAL HUMAN EXPERIENCE LAYER ABOVE THE EXISTING
  ARCHITECTURE / NO IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO
  PERSISTENCE / NO API / NO UI / NO WIREFRAMES / NO VISUAL DESIGN / NO
  WORKERS / NO PROMPTS / NO PROVIDER ADAPTERS / NO AI INTEGRATION / NO
  GENERATION / NO PUBLISHING / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/BUSINESS_JOURNEY_SPECIFICATION.md`.
- Canonical definition: "The governed human experience through which a
  business progressively transforms its business understanding into approved
  digital experiences."
- Business Journey is conversation-driven, business-centric, goal-oriented,
  human-governed, provider-neutral, technology-independent, deterministic in
  architecture, and adaptive in interaction.
- Business Journey is not a wizard, page flow, screen hierarchy, technical
  pipeline, backend workflow, implementation sequence, UI flow, sequence of
  screens, prompt strategy, provider integration, generation logic, publishing
  implementation, schema, API, runtime state, React, or HTML.
- Journey philosophy: the journey begins with understanding; every step
  increases business confidence; humans approve understanding before
  generation; humans approve business decisions, not AI; the system guides;
  the human decides.
- Primary actor: Business Owner. Future secondary actors may include
  Marketing, Agency, Designer, Developer, Content Editor, Operations, Support,
  and Administrators. The Business Owner remains the canonical journey owner.
- Canonical stages: Welcome -> Business Discovery -> Digital Business Twin ->
  Business Understanding Report -> Business Alignment -> Website Design Brief
  -> Website Generation Package -> Generation -> Compliance Review ->
  Business Approval -> Publishing -> Continuous Evolution.
- Human decisions: Continue, Correct Understanding, Provide Missing
  Information, Approve Alignment, Approve Design Intent, Generate, Review
  Compliance, Approve Publication, and Continue Improvement. The journey is
  decision-driven rather than screen-driven.
- Conversation principle: GNR8 interacts primarily through guided business
  conversations. Conversation replaces traditional software complexity.
  Artifacts are outcomes of conversations. Conversations produce business
  understanding.
- Journey outputs: Business Discovery -> Digital Business Twin -> Business
  Understanding Report -> Business Alignment -> Website Design Brief ->
  Website Generation Package -> Compliance Report -> Business Approval.
- Relationship model: Business Journey -> Architecture -> Generation ->
  Governance -> Publishing.
- Canonical separation: Human Journey -> Business Understanding -> Business
  Governance -> Website Intent -> Generation Contract -> External AI ->
  Compliance -> Business Approval -> Publishing.
- Manifesto alignment: GNR8 guides businesses through understanding before
  generation. Conversation replaces unnecessary software complexity. Every
  artifact exists to support a human business decision. The Business Journey
  is the canonical human experience of GNR8.
- Future vision: GNR8 should feel like working with an experienced digital
  transformation consultant rather than operating a traditional website
  builder. Business conversations should naturally produce governed
  architectural artifacts.
- Recommended next phase: DA-0 Decision Architecture Specification,
  documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Publishing, AI integrations, Workers, Schema, API, UI,
  wireframes, visual design, TypeScript, provider adapters, prompts, generated
  artifacts, compliance execution, validation execution, runtime state, or
  persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase WGP-3 - Business Approval Boundary Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / BUSINESS APPROVAL
  ESTABLISHED AS THE CANONICAL GOVERNED BUSINESS DECISION BETWEEN GENERATION
  CONTRACT COMPLIANCE REPORT AND PUBLISH / NO IMPLEMENTATION / NO TYPESCRIPT /
  NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO PROMPTS / NO
  PROVIDER ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO PUBLISHING / NO
  COMPLIANCE EXECUTION / NO VALIDATION EXECUTION / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md`.
- Canonical definition: "A deterministic, governed business decision
  confirming that contractual expectations have been sufficiently satisfied
  for publishing."
- Business Approval governs business acceptance. It does not govern
  implementation.
- Business Approval is the final business governance checkpoint after
  Generation Contract Compliance Report and before Publish.
- Purpose: approve contractual fulfillment, accept business risk, authorize
  publishing, authorize regeneration, require further alignment, protect
  business integrity, and maintain governance.
- Approval scope: Business Approval evaluates Business Alignment, Website
  Design Brief, Website Generation Package, Compliance Report, Business
  Risks, Generation Readiness, Limitations, and Recommendations. It never
  evaluates HTML, React, Framework, Provider, Prompt, or Coding style.
- Approval outcomes: APPROVED, APPROVED_WITH_LIMITATIONS, REGENERATE,
  RETURN_TO_ALIGNMENT, and BLOCKED.
- Decision responsibility chain: Compliance -> Business Approval ->
  Publishing. Compliance evaluates contractual fulfillment. Business Approval
  accepts or rejects the business consequence. Publishing promotes only
  Business Approved output.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment -> Website Design
  Brief -> Website Generation Package -> Provider Adapter -> External AI ->
  Generation Contract Compliance -> Generation Contract Compliance Report ->
  Business Approval -> Publish.
- Architectural rule: Business Approval never contains generated HTML,
  provider payloads, prompts, deployment artifacts, runtime state, or
  implementation artifacts. It governs business decisions only.
- Manifesto alignment: GNR8 publishes only after governed business approval.
  Business approval accepts contractual fulfillment, not implementation
  technology.
- Recommended next phase: WGP-4 Publishing Boundary Specification,
  documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Publishing, AI integrations, Workers, Schema, API, UI,
  TypeScript, provider adapters, prompts, generated artifacts, compliance
  execution, validation execution, runtime state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase WGP-2 - Generation Contract Compliance Report Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / GENERATION CONTRACT
  COMPLIANCE REPORT ESTABLISHED AS THE CANONICAL DETERMINISTIC
  PROVIDER-NEUTRAL HUMAN-READABLE LINEAGE-AWARE BUSINESS REPORT DESCRIBING
  CONTRACTUAL COMPLIANCE BETWEEN THE WEBSITE GENERATION PACKAGE AND A
  GENERATED WEBSITE / NO IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO
  PERSISTENCE / NO API / NO UI / NO WORKERS / NO PROMPTS / NO PROVIDER
  ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO PUBLISHING / NO
  COMPLIANCE EXECUTION / NO VALIDATION EXECUTION / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REPORT_SPECIFICATION.md`.
- Canonical definition: "A deterministic, provider-neutral, human-readable,
  lineage-aware report describing contractual compliance between the Website
  Generation Package and a generated website."
- Generation Contract Compliance is the governed evaluation process.
  Generation Contract Compliance Report is the human-readable result of that
  evaluation. Compliance evaluates. The report explains.
- Purpose: explain generation results, support business review, support
  approval, explain contractual deviations, summarize business risks, support
  provider comparison, support regeneration decisions, and provide
  auditability.
- Recommended report structure: Executive Summary, Generation Overview,
  Overall Compliance, Business Compliance, Experience Compliance,
  Implementation Compliance, Category Results, Detected Deviations, Missing
  Requirements, Unexpected Elements, Constraint Violations, Business Risks,
  Generation Readiness, Recommendation, Limitations, Evidence Summary,
  Lineage, and Diagnostics.
- Recommendation model: Proceed To Approval, Regenerate, Improve Website
  Generation Package, Repeat Business Alignment, Insufficient Evidence, and
  Human Review Required.
- Compliance classification: Business Compliance evaluates approved business
  meaning; Experience Compliance evaluates the required website experience;
  Implementation Compliance evaluates observable package-defined constraints
  and acceptance expectations without grading provider craft, framework
  choice, code style, or subjective aesthetics.
- Generation Readiness states are READY, READY_WITH_LIMITATIONS,
  REQUIRES_REGENERATION, REQUIRES_ALIGNMENT, and BLOCKED. Readiness is a
  business decision, not a technical score.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment -> Website Design
  Brief -> Website Generation Package -> Provider Adapter -> External AI ->
  Generation Contract Compliance -> Generation Contract Compliance Report ->
  Business Approval -> Publish.
- Architectural rule: Generation Contract Compliance Report never contains
  provider prompts, provider payloads, generated HTML, generated React,
  generated components, generated blocks, deployment artifacts, execution
  artifacts, runtime state, or publishing state. It communicates business
  evaluation only.
- Manifesto alignment: GNR8 communicates contractual truth before publishing.
  Human approval is based on governed compliance reports rather than
  subjective inspection.
- Recommended next phase: WGP-3 Business Approval Boundary Specification,
  documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Publishing, AI integrations, Workers, Schema, API, UI,
  TypeScript, provider adapters, prompts, generated artifacts, compliance
  execution, validation execution, runtime state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase WGP-1 - Generation Contract Compliance Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / GENERATION CONTRACT
  COMPLIANCE ESTABLISHED AS THE DETERMINISTIC PROVIDER-NEUTRAL
  EVIDENCE-BACKED EVALUATION COMPARING A GENERATED WEBSITE AGAINST THE
  CANONICAL WEBSITE GENERATION PACKAGE / NO IMPLEMENTATION / NO TYPESCRIPT /
  NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO PROMPTS / NO
  PROVIDER ADAPTERS / NO AI INTEGRATION / NO GENERATION / NO PUBLISHING / NO
  COMPLIANCE EXECUTION / NO VALIDATION EXECUTION / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_SPECIFICATION.md`.
- Canonical definition: "A deterministic, provider-neutral, evidence-backed
  evaluation comparing a generated website against the canonical Website
  Generation Package."
- Generation Contract Compliance determines whether contractual intent has
  been satisfied. It never evaluates implementation style.
- Purpose: verify contractual fulfillment, measure generation completeness,
  detect missing requirements, detect violated constraints, support human
  approval, support provider comparison, support regeneration, and support
  governance.
- Compliance model: Website Generation Package -> Expected Website Intent ->
  Generated Website -> Observed Website Reality -> Contract Delta ->
  Compliance Report.
- Compliance categories include Business Goals, Audience Representation,
  Messaging, Brand Consistency, Navigation, Information Architecture, Customer
  Journey, Content Coverage, Trust Signals, Accessibility, SEO, Performance
  Expectations, Technical Constraints, Required Assets, and Limitations.
- Canonical compliance results are PASS, PARTIAL, FAIL, NOT_APPLICABLE, and
  UNKNOWN.
- Compliance Report structure: Executive Summary, Overall Compliance Score,
  Category Results, Detected Deviations, Missing Requirements, Unexpected
  Elements, Constraint Violations, Business Risks, Recommended Actions,
  Limitations, Evidence, Version, Lineage, and Diagnostics.
- Provider-neutral evaluation model: Website Generation Package -> Provider
  Adapter -> External AI -> Generated Website -> Compliance.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment -> Website Design
  Brief -> Website Generation Package -> Provider Adapter -> External AI ->
  Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publish.
- Architectural rule: Generation Contract Compliance never contains provider
  prompts, provider payloads, HTML generation, React generation, component
  generation, layout generation, publishing artifacts, deployment artifacts,
  execution artifacts, or runtime state. It evaluates outcomes only.
- Manifesto alignment: GNR8 owns contractual meaning. External AI owns
  implementation proposals. Compliance determines contractual fulfillment.
  Generation quality is measured by contract compliance, not by implementation
  technology.
- Future direction: Compliance Reports should enable deterministic comparison
  between multiple provider outputs generated from the same Website Generation
  Package. The Website Generation Package remains the canonical reference.
- Recommended next phase: WGP-2 Generation Contract Compliance Report
  Specification, documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Publishing, AI integrations, Workers, Schema, API, UI,
  TypeScript, provider adapters, prompts, generated artifacts, compliance
  execution, validation execution, runtime state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase WGP-0 - Website Generation Package Canonical Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / WEBSITE GENERATION
  PACKAGE ESTABLISHED AS THE CANONICAL DETERMINISTIC PROVIDER-NEUTRAL
  GENERATION CONTRACT BETWEEN GNR8 AND FUTURE EXTERNAL GENERATION SYSTEMS / NO
  IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI
  / NO WORKERS / NO PROMPTS / NO PROVIDER ADAPTERS / NO AI INTEGRATION / NO
  GENERATION / NO PUBLISHING / NO VALIDATION EXECUTION / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/WEBSITE_GENERATION_PACKAGE_SPECIFICATION.md`.
- Canonical definition: "A deterministic, immutable, provider-neutral,
  versioned, lineage-aware generation contract describing the intended website
  that external generation systems must create."
- Website Generation Package is provider-neutral, technology-neutral,
  implementation-neutral, deterministic, versioned, lineage-aware,
  human-readable, and AI-readable.
- Website Generation Package is not prompt, provider payload, React, HTML,
  Vue, Next.js, component tree, published website, execution artifact,
  deployment artifact, or runtime state.
- Purpose: create one canonical generation contract, remove provider-specific
  business logic, separate business intent from implementation, support
  multiple AI providers, enable regeneration, enable comparison, enable
  validation, and enable future providers.
- Recommended structure: Package Metadata, Business Context, Business
  Objectives, Website Objectives, Audience, Business Intent, Experience
  Intent, Brand Requirements, Messaging, Visual Direction, Information
  Architecture, Navigation Contract, Page Contract, Section Contract, Content
  Requirements, Media Requirements, SEO Requirements, Accessibility
  Requirements, Performance Requirements, Technical Constraints, Acceptance
  Criteria, Validation Contract, Limitations, Confidence, Evidence Summary,
  Lineage, and Diagnostics.
- Generation Contract model: WGP specifies what must exist, what must be
  communicated, what users must accomplish, what business outcomes must be
  supported, and what constraints must never be violated. It never specifies
  implementation.
- Compliance Contract model: WGP contains explicit success expectations later
  evaluated by Generation Contract Compliance, including correct business
  positioning, brand consistency, complete navigation, complete customer
  journey, accessibility, SEO, required content, trust signals, and respected
  constraints.
- Provider-neutral model: Website Generation Package -> Provider Adapter ->
  Provider Payload -> External AI. Provider adapters serialize; they never
  redefine meaning.
- Regeneration model: the same WGP should produce equivalent websites across
  providers. Providers may produce different implementations, but business
  meaning must remain invariant.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment -> Website Design
  Brief -> Website Generation Package -> Provider Adapter -> External AI ->
  Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publish.
- Manifesto alignment: The Website Generation Package is the canonical
  generation contract. Provider prompts are disposable projections. GNR8 owns
  contractual meaning. External AI owns implementation proposals. Compliance
  determines contractual fulfillment.
- Recommended next phase: WGP-1 Generation Contract Compliance Specification,
  documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Publishing, AI integrations, Workers, Schema, API, UI,
  TypeScript, provider adapters, prompts, generated artifacts, validation
  execution, runtime state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase WDB-0 - Website Design Brief Canonical Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / WEBSITE DESIGN
  BRIEF ESTABLISHED AS THE CANONICAL BUSINESS-TO-EXPERIENCE BRIDGE FROM AN
  ALIGNED DIGITAL BUSINESS TWIN INTO WEBSITE EXPERIENCE INTENT / NO
  IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO
  UI / NO WORKERS / NO AI INTEGRATION / NO PROMPTS / NO PROVIDER ADAPTERS / NO
  GENERATION / NO PUBLISHING / NO VALIDATION EXECUTION / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/WEBSITE_DESIGN_BRIEF_SPECIFICATION.md`.
- Canonical definition: "A deterministic, provider-neutral, human-readable,
  experience-oriented projection of an aligned Digital Business Twin that
  defines the intended business expression of a website."
- Website Design Brief is business-aware, experience-oriented,
  technology-independent, provider-neutral, human-readable, AI-readable,
  versioned, and lineage-aware.
- Website Design Brief is not React, HTML, Components, Blocks, Layouts,
  Provider payloads, Prompts, Publishing artifacts, Execution artifacts, or
  Generated output.
- Purpose: transform business understanding into website intent, guide human
  review, guide creative direction, guide AI generation, create one canonical
  source of website intent, reduce provider-specific prompting, and support
  future regeneration.
- Recommended structure: Executive Summary, Business Context, Business Goals,
  Website Objectives, Primary Audience, Secondary Audience, Customer Problems,
  Business Value Proposition, Competitive Advantages, Brand Personality, Tone
  of Voice, Messaging Principles, Trust Signals, Products & Services Overview,
  Desired Customer Journey, Website Information Architecture, Required Website
  Pages, Required Navigation, Required Content Themes, Accessibility
  Expectations, SEO Direction, Performance Expectations, Visual Direction,
  Constraints, Success Criteria, Limitations, Confidence Summary, Evidence
  Summary, Lineage, and Diagnostics.
- Business-to-website mapping: Business Goals -> Website Objectives; Audience
  -> Navigation priorities; Offerings -> Content hierarchy; Brand -> Visual
  direction; Business Intent -> Customer journey; Knowledge -> Trust content.
  These are transformations of understanding, not implementation.
- Experience principles: Website Design Brief defines what users should
  experience, what users should understand, what users should accomplish, and
  what the website should communicate. It never defines HTML, React, CSS,
  frameworks, component libraries, providers, or prompt wording.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment -> Website Design
  Brief -> Website Generation Package -> Provider Adapter -> External AI ->
  Validation -> Business Approval -> Publish.
- Manifesto alignment: Business understanding defines intent. Website Design
  Brief defines experience. Website Generation Package defines generation.
  GNR8 separates Business, Experience, Generation, and Implementation.
- Recommended next phase: WGP-0 Website Generation Package Canonical
  Specification, documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Generation Package contract, Publishing, AI integrations,
  Workers, Schema, API, UI, TypeScript, provider adapters, prompts, generated
  artifacts, validation execution, runtime state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase BA-0 - Business Alignment Specification.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / BUSINESS ALIGNMENT
  ESTABLISHED AS THE HUMAN-GOVERNED CHECKPOINT THAT CONFIRMS OR IMPROVES THE
  DIGITAL BUSINESS TWIN BEFORE DOWNSTREAM PLANNING / NO IMPLEMENTATION / NO
  TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO AI
  INTEGRATION / NO PROMPTS / NO PROVIDER ADAPTERS / NO GENERATION / NO
  PUBLISHING / NO VALIDATION EXECUTION / NO RUNTIME STATE.
- Canonical specification:
  `docs/architecture/BUSINESS_ALIGNMENT_SPECIFICATION.md`.
- Canonical definition: "A deterministic, human-governed process that confirms
  or improves the Digital Business Twin before downstream planning begins."
- Business Alignment is neither generation nor editing. It improves
  understanding only.
- Business Alignment validates business understanding, not websites.
- Alignment may improve Business Identity, Mission, Vision, Products, Services,
  Target Audience, Business Goals, Brand, Tone of Voice, Competitive
  Advantages, Business Relationships, Knowledge, Assets, Constraints,
  Compliance, Business Priorities, Success Metrics, and Business Intent.
- Alignment never edits HTML, React, components, layouts, pages, Generation
  Packages, provider payloads, prompts, publishing artifacts, deployment
  artifacts, or runtime state.
- Alignment levels: Level 0 Unknown, Level 1 Observed, Level 2 Reviewed, Level
  3 Aligned, and Level 4 Confirmed. Generation Package preparation should only
  begin after sufficient alignment.
- Knowledge evolution: Observed -> Inferred -> Reviewed -> Aligned ->
  Confirmed. Every correction creates new knowledge; nothing rewrites history;
  evidence remains immutable; corrections become lineage; human corrections
  have authority over interpretations.
- Generation Readiness is derived from Business Understanding, Alignment
  completeness, Confidence, Missing knowledge, Conflicts, and Limitations. It
  measures whether enough understanding exists, not website quality.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin ->
  Business Understanding Report -> Business Alignment -> Website Design Brief
  -> Website Generation Package -> Provider Adapter -> External AI ->
  Validation -> Business Approval -> Publish.
- Manifesto alignment: GNR8 never optimizes for generation speed. GNR8
  optimizes for business understanding quality. Every generated experience must
  originate from an aligned Digital Business Twin.
- Recommended next phase: WDB-0 Website Design Brief Boundary Specification,
  documentation and architecture only.
- Safety: documentation and architecture only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Generation Package contract, Publishing, AI integrations,
  Workers, Schema, API, UI, TypeScript, provider adapters, prompts, generated
  artifacts, validation execution, runtime state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase BR-0 - Business Understanding Report Specification.
- Status: COMPLETE / DOCUMENTATION AND SPECIFICATION ONLY / BUSINESS
  UNDERSTANDING REPORT ESTABLISHED AS THE FIRST HUMAN-FACING ARTIFACT /
  UNDERSTANDING VALIDATION BEFORE DESIGN BRIEF OR GENERATION PACKAGE / NO
  IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI
  / NO WORKERS / NO CONNECTORS / NO AI INTEGRATION / NO PROVIDER ADAPTERS / NO
  PROMPTS / NO GENERATED OUTPUTS / NO EXECUTION STATE / NO PUBLISHING.
- Canonical specification:
  `docs/architecture/BUSINESS_UNDERSTANDING_REPORT_SPECIFICATION.md`.
- Canonical definition: A Business Understanding Report is a deterministic,
  evidence-backed, provider-neutral, human-readable projection of the current
  Digital Business Twin.
- The report summarizes what GNR8 currently understands. It is not a prompt,
  website, specification, generated code, Generation Package, or Design Brief.
- Report purpose: validate understanding, expose missing knowledge, build
  trust, explain confidence, support human corrections, prepare future
  planning, and serve as business documentation.
- Recommended report structure: Executive Summary, Business Overview, Mission,
  Products & Services, Target Audience, Business Goals, Brand Identity,
  Competitive Advantages, Customer Journey, Current Digital Presence,
  Strengths, Weaknesses, Business Opportunities, Business Risks, Missing
  Knowledge, Confidence Overview, Recommendations, Limitations, Evidence
  Summary, Version & Lineage, and Diagnostics.
- Confidence model: every section exposes confidence and explains uncertainty;
  overall understanding, Business Identity, Brand, Offerings, Audience, Goals,
  Knowledge, and Digital Presence receive visible confidence treatment.
- Business recommendations model: recommendations are business-oriented only,
  such as clarifying positioning, improving messaging, consolidating products,
  strengthening trust, improving customer journey, expanding documentation,
  improving SEO, and modernizing the website. They never prescribe
  implementation.
- Relationship model: Reality -> Business Discovery -> Digital Business Twin
  -> Business Understanding Report -> Business Alignment -> Website Design
  Brief -> Website Generation Package -> Provider Adapter -> External AI ->
  Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publish.
- Roadmap after BR-0: Business Discovery -> Digital Business Twin -> Business
  Understanding Report -> Business Alignment -> Website Design Brief ->
  Website Generation Package -> Provider Adapter -> External AI -> Generation
  Contract Compliance -> Generation Contract Compliance Report -> Business
  Approval -> Publish.
- Architectural rules: Business Understanding Report never contains prompts,
  provider payloads, generated HTML, generated React, generated components,
  generated pages, publishing artifacts, or execution state. The report
  communicates understanding only.
- Manifesto alignment: `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md` now
  establishes that GNR8 always validates understanding before generation.
- Recommended next phase: BR-1 Business Validation Boundary Specification,
  documentation and architecture only.
- Safety: documentation and specification only; no Evidence Capture, Candidate
  Discovery, Candidate Context, Candidate Review, Reconstruction Package,
  StructurePlan, Generation Package contract, Publishing, AI integrations,
  Workers, Schema, API, UI, TypeScript, connectors, provider adapters, prompts,
  generated artifacts, execution state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DBT-3 - Business Intent Specification.
- Status: COMPLETE / DOCUMENTATION AND SPECIFICATION ONLY / BUSINESS INTENT ESTABLISHED AS THE GOVERNED OUTCOME BRIDGE BETWEEN THE DIGITAL BUSINESS TWIN AND EXPERIENCE DOMAINS / NO IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO CONNECTORS / NO AI INTEGRATION / NO PROVIDER ADAPTERS / NO PROMPTS / NO GENERATED OUTPUTS / NO PUBLISHING.
- Canonical specification: `docs/architecture/BUSINESS_INTENT_SPECIFICATION.md`.
- Canonical definition: Business Intent is the governed description of the business outcome that the organization wants to achieve.
- Business Intent is provider-neutral, evidence-backed, versioned, human-governed, and independent of implementation.
- Business Intent is not a website, UI, prompt, code, AI output, or project plan.
- Intent categories are examples, not a fixed taxonomy: Sales, Lead Generation, Brand Awareness, Recruitment, Customer Support, Education, Commerce, Customer Self-Service, Partner Enablement, Internal Operations, Compliance, Community, and Future Intents.
- Canonical relationship model: Reality -> Business Domains -> Digital Business Twin -> Business Intent -> Experience Domain -> Generation Package -> Provider Adapter -> External AI -> Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publishing.
- Intent vs Experience model: Intent is why the business acts; Experience is where that intent is expressed. One Intent may project into many Experience Domains, and one Experience Domain may satisfy multiple Intents.
- Intent composition: a business may have multiple active Business Intents. Generation Packages are created for one specific Experience Domain within one or more Business Intents.
- Architectural rules: Business Intent never contains prompts, provider payloads, generated HTML, generated React, generated content, publishing artifacts, or execution state. Business Intent owns desired outcomes. Experience Domains own manifestations. Generation Packages own orchestration targets.
- Relationship to existing artifacts: Evidence supports or challenges Intent; Knowledge justifies and constrains Intent; the DBT selects and validates Intent from governed understanding; Generation Packages translate one specific Experience Domain under one or more Intents into provider-neutral orchestration targets.
- Updated constitutional docs: `docs/architecture/BUSINESS_DOMAIN_MODEL_SPECIFICATION.md`, `docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md`, `docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`, and `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md` now reference the DBT-3 Business Intent bridge.
- Recommended next phase: DBT-4 Experience Domain Projection Boundary Design, documentation and architecture only.
- Safety: documentation and specification only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Reconstruction Package, StructurePlan, Generation Package contract, Publishing, AI integrations, Workers, Schema, API, UI, TypeScript, connectors, provider adapters, prompts, generated artifacts, execution state, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DBT-2 - Business Domain Model Specification.
- Status: COMPLETE / DOCUMENTATION AND SPECIFICATION ONLY / BUSINESS DOMAINS ESTABLISHED AS THE SOURCE MODEL COMPOSING THE DBT / EXPERIENCE DOMAINS ESTABLISHED AS PROJECTIONS / NO IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO CONNECTORS / NO AI INTEGRATION / NO PROVIDER ADAPTERS / NO PROMPTS / NO GENERATED OUTPUTS / NO PUBLISHING.
- Canonical specification: `docs/architecture/BUSINESS_DOMAIN_MODEL_SPECIFICATION.md`.
- Constitutional rule: the Digital Business Twin is not "website knowledge." It is the governed integration of multiple independent Business Domains.
- Canonical Business Domains: Business Identity, Brand, Offerings, Audience, Goals, Relationships, Knowledge, Assets, Compliance, Sales, Marketing, Operations, Analytics, Support, Digital Presence, and Future Domains.
- Fundamental Business Domains: Business Identity, Brand, Offerings, Audience, Goals, Relationships, Knowledge, Assets, and Compliance.
- Optional Business Domains: Sales, Marketing, Operations, Analytics, Support, Digital Presence, and Future Domains.
- Projection-only Experience Domains: Website, Landing Page, Customer Portal, Mobile App, Marketplace, Documentation, Campaign, Newsletter, Chatbot, Sales Deck, and Future Experiences.
- Canonical relationship model: Reality -> Business Domains -> Digital Business Twin -> Experience Domains -> Generation Packages -> Provider Adapters -> External AI -> Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publishing.
- Domain responsibility model: every Business Domain declares purpose, owns, consumes, produces, relationships, typical evidence sources, and future connectors. Business Domains own knowledge. Experience Domains own manifestations. Generation Packages own orchestration targets. Provider Adapters own serialization. AI owns generation. Humans own approval.
- Relationship to existing artifacts: Evidence supports Business Domains; Discovery proposes candidate domain knowledge; Review governs acceptance; Reconstruction Package can inform relevant Business Domains and Website Experience Domain scope; StructurePlan is an Experience Domain planning projection; Generation Package is a provider-neutral orchestration target derived from a DBT-backed Experience Domain.
- Updated constitutional docs: `docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md`, `docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`, and `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md` now reference the DBT-2 Business Domain and Experience Domain model.
- Recommended next phase: DBT-3 Experience Domain Projection Boundary Design, documentation and architecture only.
- Safety: documentation and specification only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Reconstruction Package, StructurePlan, Generation Package contract, Publishing, AI integrations, Workers, Schema, API, UI, TypeScript, connectors, provider adapters, prompts, generated artifacts, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DBT-1 - Knowledge Domain And Understanding Specification.
- Status: COMPLETE / DOCUMENTATION AND SPECIFICATION ONLY / KNOWLEDGE HIERARCHY ESTABLISHED AS CANONICAL DBT MODEL / NO IMPLEMENTATION / NO TYPESCRIPT / NO SCHEMA / NO PERSISTENCE / NO API / NO UI / NO WORKERS / NO AI INTEGRATION / NO CONNECTORS / NO PROVIDER ADAPTERS / NO PROMPTS / NO GENERATED OUTPUTS / NO PUBLISHING.
- Canonical specification: `docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`.
- Knowledge hierarchy: Reality -> Evidence -> Facts -> Interpretations -> Knowledge -> Understanding -> Digital Business Twin -> Projections -> External AI.
- Canonical concepts: Evidence, Fact, Inference, Interpretation, Knowledge, Understanding, Projection, Suggestion, Generated Output, Validation, Truth, Uncertainty, Confidence, Lineage, and Governance.
- Truth model: Evidence is immutable; Facts are evidence-backed; Interpretations are derived; Knowledge is validated interpretation; Understanding is integrated knowledge; the DBT is governed, versioned understanding; Generation Packages are projections; AI outputs are proposals; Published artifacts are approved manifestations.
- Confidence model: confidence propagates from Evidence -> Fact -> Knowledge -> Twin -> Generation Package. Low-confidence upstream material must lower downstream confidence or become an explicit limitation.
- Domain model: Website Understanding, Brand Understanding, CRM Understanding, Commerce Understanding, Content Understanding, Knowledge Understanding, Marketing Understanding, Support Understanding, and Future Domains each produce domain knowledge; the DBT integrates domain knowledge into cross-domain understanding.
- Architectural rules: the DBT never stores guesses as facts, distinguishes evidence from interpretation, distinguishes facts from knowledge, distinguishes knowledge from generated content, distinguishes projections from source truth, records uncertainty and conflicts, preserves lineage, remains versioned and auditable, and keeps human governance authoritative.
- AI rule: AI never changes truth directly. AI outputs remain proposals until validated and approved.
- Updated constitutional docs: `docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md` and `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md` now reference the DBT-1 knowledge hierarchy and truth model.
- Then-recommended next phase: DBT-2 Domain Knowledge Boundary Design, documentation and architecture only.
- Safety: documentation and specification only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Reconstruction Package, StructurePlan, Generation Package contract, Publishing, AI integrations, Workers, Schema, API, UI, TypeScript, connectors, provider adapters, prompts, generated artifacts, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase DBT-0 - Digital Business Twin Specification v1.0.
- Status: COMPLETE / DOCUMENTATION AND SPECIFICATION ONLY / DIGITAL BUSINESS TWIN ESTABLISHED AS CANONICAL CORE / NO IMPLEMENTATION / NO TYPESCRIPT / NO CONTRACTS / NO SCHEMA / NO API / NO UI / NO WORKERS / NO PERSISTENCE / NO ADAPTERS / NO AI INTEGRATION / NO PROMPTS / NO GENERATED OUTPUTS / NO PUBLISHING.
- Canonical specification: `docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md`.
- Manifesto alignment: `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md` now establishes the Digital Business Twin as the canonical core of GNR8.
- Canonical definition: the Digital Business Twin is the canonical operational understanding of a business and its digital identity.
- Fundamental principle: a business exists independently of any website; a website is only one expression of the business; the Digital Business Twin represents the business itself.
- DBT properties: deterministic, versioned, evidence-backed, provider-neutral, model-independent, continuously evolving, and human-governed.
- Inputs/connectors: Existing Website, Brand Book, CRM, ERP, Product Catalog, Knowledge Base, Support Platform, Social Networks, Google Business, Notion, PDFs, Office documents, Figma, Images, Video, Human interviews, Questionnaires, and future connectors. All connectors enrich the same DBT.
- Outputs/projections: Website Generation Package, Landing Page Generation Package, Campaign Generation Package, Documentation Package, Chatbot Package, Sales Package, Marketing Package, Training Package, and future packages. Generation Package is one projection, never the source of truth.
- Internal domains: Business Identity, Brand, Products, Services, Audience, Messaging, Visual Identity, Knowledge, Content, Assets, Relationships, Evidence, Constraints, Compliance, Accessibility, History, Governance, Lineage, Versioning, Goals, Success Metrics, Limitations, and Diagnostics.
- Existing artifact relationship: Evidence -> Discovery -> Review -> Reconstruction Package -> StructurePlan -> Generation Package become contributors or projections around the DBT. None replace it.
- Architectural rules: the DBT is always provider-neutral; the DBT never contains prompts, generated React, generated HTML, or provider payloads; the DBT owns meaning; everything else is derived.
- Current architecture at DBT-0: Connectors -> Digital Business Twin -> Generation Package -> Provider Adapter -> External AI -> Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publish.
- Then-recommended next phase: DBT-1 Digital Business Twin Domain Boundary Design, documentation and architecture only.
- Safety: documentation and specification only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Reconstruction Package, StructurePlan, Generation Package contract, Publishing, AI integrations, Workers, Schema, API, UI, TypeScript, prompts, adapters, generated artifacts, or persistence changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase GP-0 - Generation Package Foundation.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / CANONICAL AI ORCHESTRATION BOUNDARY DEFINED / NO IMPLEMENTATION / NO PROMPTS / NO ADAPTERS / NO AI INTEGRATION / NO PUBLISHING / NO SCHEMA / NO WORKERS / NO API / NO UI.
- Canonical foundation: `docs/architecture/GENERATION_PACKAGE_FOUNDATION.md`.
- Purpose: a `GenerationPackage` is the deterministic, immutable, provider-neutral, versioned, lineage-aware, review-backed description of a website that is sufficiently complete for an external AI system to generate or reconstruct it under GNR8 governance.
- Core rule: Generation Package does not equal Prompt. A prompt is a provider-specific serialization of a Generation Package.
- Canonical input: latest persisted `StructurePlan` artifact, with supporting lineage to ReconstructionPackage, CandidateReviewPackage, CandidateDiscoveryResult, CandidateContext, Evidence, `siteVersionId`, and `dryRunId`.
- Canonical sections: Site Identity, Business Purpose, Audience, Brand, Design System, Logo, Colors, Typography, Assets, Navigation, Routes, Sections, Content References, Evidence References, Constraints, Accessibility, SEO, Runtime Target, Hosting Target, Publishing Constraints, Acceptance Criteria, Limitations, Diagnostics, Version Metadata, and Lineage.
- Provider independence: the package never contains OpenAI prompts, Claude prompts, Gemini prompts, Codex tasks, v0 prompts, Stitch prompts, provider-specific formatting, provider payloads, generated React, generated HTML, generated CSS, generated content, publishing artifacts, or deployment artifacts.
- Adapter model: future OpenAI, Claude, Gemini, Codex, Stitch, v0, and future-provider adapters own serialization; the Generation Package owns meaning.
- Digital Twin relationship: Digital Twin -> Generation Package -> External AI is preferred over HTML -> Prompt -> AI because the Twin and package preserve governed understanding, evidence, lineage, constraints, diagnostics, validation expectations, and approval boundaries.
- Future sequence: Generation Package -> Generation Validation Package -> Generated Website Validation -> Approval -> Publishing.
- Superseded next phase: GP-1 Generation Package Contract.
- Safety: documentation and architecture only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Reconstruction Package, StructurePlan, Publishing, AI integrations, Workers, Schema, API, UI, prompts, adapters, or generated artifacts changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase 0 - GNR8 Architecture Manifesto / AI Orchestrator Reset.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ALIGNMENT ONLY / AI ORCHESTRATOR IDENTITY LOCKED / NO IMPLEMENTATION / NO LAYOUT PLAN / NO BLOCK PLAN / NO CONTENT PLAN / NO AI INTEGRATION / NO GENERATION / NO PUBLISHING / NO SCHEMA / NO WORKERS / NO API / NO UI.
- Canonical manifesto: `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`.
- Canonical identity after DBT-0: GNR8 is an AI Orchestrator with a governed Digital Business Twin at its core.
- Product boundary: GNR8 is not a traditional website builder, not a CMS, and not a generic page editor.
- Digital Business Twin rule after DBT-0: the DBT is the canonical operational understanding of a business and its digital identity; generated websites are outputs, not the long-term source of truth.
- Generation rule: generation without understanding is prohibited; the orchestrator owns the task and the model executes it; GNR8 must remain model-agnostic.
- Governance rule: AI proposes; humans approve. Generation Contract Compliance
  Report before Business Approval is mandatory.
- Canonical future lifecycle after WGP-2: Connectors -> Digital Business Twin -> Generation Package -> Provider Adapter -> External AI -> Generation Contract Compliance -> Generation Contract Compliance Report -> Business Approval -> Publish.
- Rejected lifecycle after DBT-0: Website -> Prompt -> Generate React.
- Roadmap reset: do not proceed into LayoutPlan, BlockPlan, or ContentPlan as if GNR8 is building a traditional internal website builder, CMS, page editor, block schema, or direct React generator.
- Future reassessment areas: LayoutPlan, BlockPlan, ContentPlan, AI Editor architecture, publishing flow, Generation Contract Compliance, provider orchestration, provider adapters, and external AI serialization formats.
- Superseded next phase: GP-0 Generation Package Foundation.
- Safety: documentation and architecture alignment only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Review Actions, Reconstruction Package, StructurePlan, AI integration code, generation systems, publishing systems, schema, workers, API, or UI behavior changed.
- Validation result: `git diff --check` passes.

Previous completed milestone:
- Phase 8F-11 - Post-Structure Plan Boundary Reassessment.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / NEXT BOUNDARY SELECTED / LAYOUT PLAN FOUNDATION RECOMMENDED / NO CONTENT PLANNING / NO INTENT PLANNING / NO BLOCK PLANNING / NO AI / NO GENERATION / NO PUBLISHING / NO SCHEMA / NO WORKERS.
- Canonical assessment: `docs/architecture/POST_STRUCTURE_PLAN_BOUNDARY_REASSESSMENT.md`.
- Decision: the next boundary after verified persisted StructurePlan artifacts and the read-only StructurePlan UI is **Layout Plan Foundation**.
- Primary layer answer: the next layer is visual/layout, not content, semantic intent, or component/block mapping.
- Recommended next phase: Phase 8G-0 - Layout Plan Foundation.
- Boundary shape: future LayoutPlan should remain metadata-only placement intent: route-level layout containers, section order/grouping, region roles, navigation placement intent, source-grounded density/prominence/alignment/responsive hints, StructurePlan assignment refs, source evidence refs, limitations, and diagnostics.
- Canonical input: latest persisted `StructurePlan` artifact for the requested `siteVersionId`, exact linked Reconstruction Package artifact, and supporting Candidate Review, Candidate Discovery, Candidate Context, Evidence Capture, `dryRunId`, and `siteVersionId` lineage refs. Supporting refs explain placement evidence and limitations; they do not add candidates or override the StructurePlan envelope.
- Deferred options: Content Plan Foundation is deferred until layout anchors exist for slotting; Intent / Experience Plan Foundation is deferred until semantic purpose can attach to stable layout/content entities; Block Plan Foundation is deferred until layout, content, and design constraints exist.
- AI-editor alignment: LayoutPlan stays outside code generation, AI proposals, editing mutations, and publish flow while preparing placement anchors for future governed content and editing layers.
- Digital Twin alignment: LayoutPlan strengthens the Twin as operational understanding of visual organization without becoming HTML replay, a recommendation, proposal, mutation, generated frontend, or publishable artifact.
- Safety: documentation only; no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Review Actions, Reconstruction Package, StructurePlan contract, StructurePlan builder, StructurePlan persistence, StructurePlan UI, AI, generation, publishing, schema, worker, runtime, API, or UI behavior changed.
- Validation result: `git diff --check` passes.
- Reset note: Phase 0 supersedes this recommendation as the active roadmap.
  `LayoutPlan` is no longer the next phase until it is reassessed under the
  AI Orchestrator / Website Understanding Engine architecture.

Previous completed milestone:
- Phase 8F-10 - Structure Plan End-to-End Verification.
- Status: COMPLETE / VERIFICATION ONLY / REAL STRUCTURE PLAN ADMIN CHAIN VERIFIED / NO CONTENT PLANNING / NO LAYOUT PLANNING / NO AI / NO GENERATION / NO PUBLISHING / NO MUTATIONS / NO SCHEMA / NO WORKERS.
- Canonical evidence: `docs/architecture/STRUCTURE_PLAN_E2E_VERIFICATION.md`.
- Chain verified: persisted `structure_plan` artifact -> latest loader -> `StructurePlanSurfaceProjection` -> dedicated read-only admin page.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`: latest Structure Plan `structure_plan_08e12e859e457d5ac15870ce2892c817`; projection `valid`; `1` route, `0` navigation, `2` sections, `3` assignments, `0` blocked candidates; `no_navigation` attention state; planned route/section/assignment rows visible.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`: latest Structure Plan `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`; projection `valid`; `1` route, `0` navigation, `0` sections, `1` assignment, `0` blocked candidates; `limitations_present`, `no_navigation`, and `no_sections` attention states.
- Lineage: both projections preserve exact current Reconstruction Package, Review Package, Discovery Result, `siteVersionId`, and `dryRunId` lineage; `reconstructionPackageStale = false` for both.
- Page result: the dynamic admin route compiles, is included in production build, and enforces the existing superadmin guard. Browser verification without a superadmin session redirected to `/login`; authenticated artifact display was verified through live loader/projection checks, page source, focused tests, and build route output.
- Safety: page source contains no buttons, forms, inputs, edit controls, AI controls, generation controls, publishing controls, execution controls, retry controls, approval controls, Content Planning controls, or Layout Planning controls.
- Tests: `apps/platform/gnr8/architecture/structure-plan-persistence.test.ts`, `apps/platform/gnr8/architecture/structure-plan-surface-projection.test.ts`, and `apps/platform/app/gnr8/admin/structure-plan-page.test.ts`.
- Validation result: focused Structure Plan persistence/projection/page tests pass `16 / 16`; `cd apps/platform && pnpm run vercel-build` passes with existing unrelated lint warnings and includes `/gnr8/admin/structure-plan/[siteVersionId]`; `git diff --check` passes.
- Then-recommended next phase: Phase 8F-11 - Post-Structure Plan Boundary Reassessment.

Previous completed milestone:
- Phase 8F-9 - Structure Plan Read-Only Surface Implementation.
- Status: COMPLETE / READ-ONLY ADMIN SURFACE / NO CONTENT PLANNING / NO LAYOUT PLANNING / NO AI / NO GENERATION / NO PUBLISHING / NO MUTATIONS / NO SCHEMA / NO WORKERS.
- Admin route: `apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx`.
- Projection: `apps/platform/gnr8/architecture/structure-plan-surface-projection.ts`.
- Guard: existing superadmin page guard.
- Projection contents: latest persisted Structure Plan artifact metadata, linked lineage, summary counts, planned routes, planned navigation, planned sections, assignments, limitations, diagnostics, validation status, primary state, and attention states.
- Page sections: Overview, Lineage, Plan Summary, Planned Routes, Planned Navigation, Planned Sections, Assignments, and Diagnostics.
- Implemented states: missing, blocked, stale, valid, limitations present, no navigation, and no sections.
- Safety: no buttons, forms, inputs, edit controls, AI controls, reconstruction controls, generation controls, publishing controls, execution controls, retry controls, approval controls, Content Planning, Layout Planning, mutation behavior, Evidence Capture change, Candidate Discovery change, Candidate Context change, Candidate Review change, Review Actions change, Reconstruction Package change, StructurePlan contract change, StructurePlan builder change, StructurePlan persistence change, AI system, generation system, publishing system, schema, or worker.
- Tests: `apps/platform/gnr8/architecture/structure-plan-surface-projection.test.ts` and `apps/platform/app/gnr8/admin/structure-plan-page.test.ts`.
- Validation result: focused Structure Plan surface tests pass; `cd apps/platform && pnpm run vercel-build` passes; `git diff --check` passes.
- Recommended next phase: Phase 8F-10 - Structure Plan End-to-End Verification.

Previous completed milestone:
- Phase 8F-8 - Structure Plan Read-Only Surface Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / READ-ONLY SURFACE DESIGN / NO UI IMPLEMENTATION / NO AI / NO GENERATION / NO PUBLISHING / NO SCHEMA.
- Canonical design: `docs/architecture/STRUCTURE_PLAN_SURFACE_DESIGN.md`.
- UI location recommendation: dedicated admin Structure Plan page.
- Surface purpose: inspect persisted `structure_plan` metadata showing planned routes, planned navigation, planned sections, and deterministic assignment mappings from approved source candidates without presenting the artifact as generated reconstruction.
- Surface sections: Overview, Lineage, Plan Summary, Planned Routes, Planned Navigation, Planned Sections, Assignments, and Diagnostics.
- Empty/attention states: no Structure Plan, blocked Structure Plan, stale Structure Plan, valid but no navigation, valid but no sections, and limitations present.
- Projection: `StructurePlanSurfaceProjection` with artifact metadata, lineage, summary counts, grouped planned routes/navigation/sections, assignments, limitations, diagnostics, validation, and display state.
- Future relationship: `StructurePlan read-only page -> future Layout/Content Planning -> future Reconstruction Preview`.
- Safety: no AI controls, reconstruction controls, generation controls, publishing controls, execution controls, edit controls, trigger controls, repair controls, retry controls, force controls, approval controls, layout controls, content controls, worker controls, or queue controls.
- Phase 8F-8 changed documentation only. It added no UI implementation, route, API, loader, persistence helper, Evidence Capture change, Candidate Discovery change, Candidate Context change, Candidate Review change, Review Actions change, Reconstruction Package change, StructurePlan contract change, StructurePlan builder change, StructurePlan persistence change, AI system, generation system, publishing system, schema, worker, or runtime behavior.
- Validation result: `git diff --check` passes.
- Recommended next phase: Phase 8F-9 - Structure Plan Read-Only Surface Implementation.

Previous completed milestone:
- Phase 8F-7 - Structure Plan Persistence Real-Artifact Validation.
- Status: COMPLETE / VALIDATION ONLY / REAL STRUCTURE PLAN PERSISTENCE / NO CONTENT PLANNING / NO LAYOUT PLANNING / NO AI / NO GENERATION / NO PUBLISHING / NO SCHEMA.
- Canonical evidence: `docs/architecture/STRUCTURE_PLAN_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.
- Method: load latest Reconstruction Package artifact, confirm exact requested artifact ID, reload exact Reconstruction Package by ID, build with `buildStructurePlan(...)`, persist with `persistStructurePlan(...)`, reload latest with `loadLatestStructurePlan(...)`, reload exact artifact with `loadStructurePlanById(...)`, retry persist for idempotency, and scan persisted artifacts for forbidden downstream fields.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`: latest Reconstruction Package `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`; persisted Structure Plan `structure_plan_08e12e859e457d5ac15870ce2892c817`; Review artifact `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`; Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`; dry run `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`.
- ODV Structure Plan: `valid`, `1` planned route, `0` planned navigation entries, `2` planned sections, `3` assignments, `0` blocked candidates, `0` limitations.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`: latest Reconstruction Package `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`; persisted Structure Plan `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`; Review artifact `candidate_review_package_ecb5f777160a45e15b958948348bca08`; Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`; dry run `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`.
- ViroiDoc Structure Plan: `valid`, `1` planned route, `0` planned navigation entries, `0` planned sections, `1` assignment, `0` blocked candidates, `36` propagated source Reconstruction Package limitations.
- Reload/idempotency: both targets reloaded latest and by ID to the same exact Structure Plan artifact; idempotent retry reused the same artifact and did not append a duplicate.
- Lineage/metadata: both persisted artifacts preserve exact Reconstruction Package artifact, package ID/status/contract version, Candidate Review artifact, Candidate Discovery artifact, site version, dry run, included candidate refs, Structure Plan contract version, counts, createdAt, persistedAt, and validation status.
- Safety: no Content Plan, Layout Plan, AI output, generated React, generated components, generated blocks, generated content, publishing artifact, deployment artifact, execution artifact, worker job, schema, API, UI, or runtime generation behavior was added.
- Validation result: real-artifact persistence validation passed; focused Structure Plan persistence tests pass; `cd apps/platform && pnpm run vercel-build` passes; `git diff --check` passes.
- Recommended next phase: Phase 8F-8 - Structure Plan Read-Only Surface Design.

Earlier completed milestone:
- Phase 8F-6 - Structure Plan Persistence Implementation.
- Status: COMPLETE / PERSISTENCE ONLY / NO CONTENT PLANNING / NO LAYOUT PLANNING / NO AI / NO GENERATION / NO PUBLISHING / NO SCHEMA.
- Canonical design: `docs/architecture/STRUCTURE_PLAN_PERSISTENCE_BOUNDARY.md`.
- Implementation: `apps/platform/gnr8/architecture/structure-plan-persistence.ts`.
- Tests: `apps/platform/gnr8/architecture/structure-plan-persistence.test.ts`.
- Storage: uses the existing site-version provenance artifact boundary, not a new DB table or hybrid dual-write path.
- Artifact kind: `structure_plan`.
- Storage shape: append-only `structurePlanArtifacts` plus `latestStructurePlanArtifact`.
- Metadata shape: artifact ID/ref, artifact kind, `structurePlanId`, `reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`, `candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, `status`, planned route/navigation/section counts, assignment count, blocked candidate count, `createdAt`, `persistedAt`, and `contractVersion`.
- Helpers: `persistStructurePlan(...)`, `loadLatestStructurePlan(...)`, and `loadStructurePlanById(...)`.
- Idempotency: equivalent latest plan for the same Reconstruction Package artifact and contract version reuses latest; changed current plans from a newer latest Reconstruction Package artifact append and advance latest.
- Staleness policy: persist only `valid` or `blocked`; reject `stale` and `invalid`.
- Rejection behavior: stale, invalid, forbidden-field, invalid-lineage, missing-package, non-latest-package, and package-reconciliation failures reject before write.
- Validation before persist: run `validateStructurePlan(...)`, enforce recursive forbidden-field guard, check exact lineage, verify the referenced Reconstruction Package artifact, require it to remain latest, and reconcile copied included candidate refs/counts against the package payload.
- Safety: no AI outputs, generated content/components/blocks, publishing artifacts, deployment artifacts, execution artifacts, worker jobs, Content Planning artifacts, Layout/Block Planning artifacts, schema, API, UI, StructurePlan contract changes, StructurePlan builder changes, Reconstruction Package changes, or runtime behavior.
- Future relationship: `StructurePlan -> Future Content Planning` or `StructurePlan -> Future Layout/Block Planning`; no next generation boundary exists yet.
- Validation result: focused Structure Plan persistence tests pass; `cd apps/platform && pnpm run vercel-build` passes.
- Recommended next phase: Phase 8F-7 - Structure Plan Persistence Real-Artifact Validation.

Earlier completed milestone:
- Phase 8F-5 - Structure Plan Persistence Boundary Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / NO PERSISTENCE / NO AI / NO GENERATION / NO PUBLISHING.
- Canonical design: `docs/architecture/STRUCTURE_PLAN_PERSISTENCE_BOUNDARY.md`.
- Storage recommendation: use the existing site-version provenance artifact boundary, not a new DB table or hybrid dual-write path.
- Artifact kind: `structure_plan`.
- Storage shape: append-only `structurePlanArtifacts` plus `latestStructurePlanArtifact`.
- Metadata shape: artifact ID/ref, artifact kind, `structurePlanId`, `reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`, `candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, `status`, planned route/navigation/section counts, assignment count, blocked candidate count, `createdAt`, `persistedAt`, and `contractVersion`.
- Idempotency: equivalent plan for the same Reconstruction Package artifact and contract version reuses latest; changed current plans append; stale, invalid, forbidden-field, and lineage-mismatch plans reject before write.
- Staleness policy: persist only `valid` or `blocked`; reject `stale` and `invalid`.
- Validation before persist: run `validateStructurePlan(...)`, enforce recursive forbidden-field guard, check exact lineage, verify the referenced Reconstruction Package artifact, require it to remain latest, and reconcile copied included candidate refs/counts against the package payload.
- Helper design: `persistStructurePlan(...)`, `loadLatestStructurePlan(...)`, and `loadStructurePlanById(...)`.
- Safety: no AI outputs, generated content/components/blocks, publishing artifacts, deployment artifacts, execution artifacts, worker jobs, Content Planning artifacts, Layout/Block Planning artifacts, schema, API, UI, StructurePlan contract changes, StructurePlan builder changes, Reconstruction Package changes, or runtime behavior.
- Future relationship: `StructurePlan -> Future Content Planning` or `StructurePlan -> Future Layout/Block Planning`; no next generation boundary exists yet.
- Validation result: `git diff --check` passes.
- Recommended next phase: Phase 8F-6 - Structure Plan Persistence Implementation.

Earlier completed milestone:
- Phase 8F-4 - Structure Planning Real-Artifact Validation.
- Status: COMPLETE / VALIDATION ONLY / REAL RECONSTRUCTION PACKAGE ARTIFACTS / NO PERSISTENCE / NO AI / NO GENERATION / NO PUBLISHING.
- Canonical evidence: `docs/architecture/STRUCTURE_PLANNING_REAL_ARTIFACT_VALIDATION.md`.
- Method: load latest Reconstruction Package artifact, load exact artifact by ID, confirm exact artifact is latest, build `StructurePlan` with `buildStructurePlan(...)`, validate with `validateStructurePlan(...)`, and scan for forbidden generated/AI/publishing/deployment/execution fields.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`: exact/latest Reconstruction artifact `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`, Review artifact `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`, Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`, dry run `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`.
- ODV Structure Plan: `valid`, `1` planned route, `0` planned navigation entries, `2` planned sections, `3` assignments, `0` blocked candidates, `0` limitations.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`: exact/latest Reconstruction artifact `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`, Review artifact `candidate_review_package_ecb5f777160a45e15b958948348bca08`, Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`, dry run `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`.
- ViroiDoc Structure Plan: `valid`, `1` planned route, `0` planned navigation entries, `0` planned sections, `1` assignment, `0` blocked candidates, `36` propagated source Reconstruction Package limitations.
- Lineage: both outputs preserve exact `reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`, `candidateDiscoveryArtifactId`, `siteVersionId`, and `dryRunId`.
- Safety: no generated React, generated blocks, generated content, generated components, AI output, publishing artifact, deployment artifact, execution artifact, reconstruction instructions, or structure instructions in either Structure Plan output.
- Defects: no builder defect found; no behavior changed.
- Validation result: real-artifact validation passed; focused Structure Plan contract and builder tests pass `18 / 18`; platform Vercel build passes with existing unrelated frontend lint warnings; `git diff --check` passes.
- Recommended next phase: Phase 8F-5 - Structure Plan Persistence Boundary Design.

Previous completed milestone:
- Phase 8F-3 - Structure Planning Builder Implementation.
- Status: COMPLETE / PURE DETERMINISTIC BUILDER ONLY / NO PERSISTENCE / NO AI / NO GENERATION / NO PUBLISHING.
- Canonical module: `apps/platform/gnr8/architecture/structure-plan-builder.ts`.
- Focused tests: `apps/platform/gnr8/architecture/structure-plan-builder.test.ts`.
- Inputs: exact `ReconstructionPackage` payload, exact persisted `reconstructionPackageArtifactId`, latest Reconstruction Package artifact ID for stale detection, and optional Structure Plan contract version override only for tests.
- Output: metadata-only `StructurePlan`; no persistence, generated React, generated blocks, generated content, AI output, publishing artifact, deployment artifact, migration, worker job, or runtime execution.
- Identity: `structure-plan:<reconstructionPackageArtifactId>:8F-1`.
- Route planning: approved route candidates create planned routes from explicit route paths only.
- Navigation planning: approved navigation candidates create planned navigation entries only when route association is explicit or unambiguous.
- Section planning: approved section candidates create planned sections only when route association is explicit or unambiguous, with deterministic per-route section order.
- Assignment model: valid plans create exactly one assignment per successfully planned included approved candidate, preserving candidate refs, evidence refs, target kind, target ID, and source Reconstruction Package diagnostics.
- Blocked behavior: no included candidates or missing/ambiguous route association produce a contract-valid blocked plan; because the 8F-1 contract requires blocked plans to be assignment-free, blocked candidates are recorded in limitations and diagnostics.
- Status behavior: `valid` for fully planned/assigned and validated output, `blocked` for no included candidates or route-association blockers, `stale` for non-latest Reconstruction Package artifact input, and `invalid` for source or Structure Plan validation failure.
- Limitations and diagnostics: propagate Reconstruction Package limitations, candidate-specific limitations when present, and builder blockers; report route, navigation, section, assignment, included-candidate, blocked-candidate, stale, source-validation, and Structure Plan validation results.
- Safety: no Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Review Actions, Reconstruction Package behavior, StructurePlan contract, AI system, generation system, publishing system, schema, worker, API, UI, migration, deployment, or runtime behavior changed.
- Validation result: focused Structure Plan contract and builder tests pass `18 / 18`; platform Vercel build passes; `git diff --check` passes.
- Recommended next phase: Phase 8F-4 - Structure Planning Real-Artifact Validation.

Previous completed milestone:
- Phase 8F-2 - Structure Planning Builder Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / NO IMPLEMENTATION / NO PERSISTENCE / NO GENERATION.
- Canonical design: `docs/architecture/STRUCTURE_PLANNING_BUILDER_DESIGN.md`.
- Purpose: a future deterministic builder converts one exact latest `ReconstructionPackage` artifact into a metadata-only `StructurePlan`.
- Required input: the exact latest persisted Reconstruction Package artifact record with artifact identity, latest-head proof, valid package payload, and source package contract version.
- Route, navigation, section, assignment, ordering, status, limitation, and diagnostic rules are defined without AI sorting, design-intent heuristics, layout importance ranking, content inference, or upstream querying.
- Safety: no builder implementation, persistence, AI, generation, publishing, schema, workers, API, UI, Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, Review Actions, Reconstruction Package, StructurePlan contract, or runtime behavior changed.
- Recommended next phase: Phase 8F-3 - Structure Planning Builder Implementation.

Previous completed milestone:
- Phase 8F-1 - Structure Planning Contract.
- Status: COMPLETE / CONTRACT ONLY / NO BUILDER / NO PERSISTENCE / NO GENERATION.
- Canonical module: `apps/platform/gnr8/architecture/structure-plan-contract.ts`.
- Focused tests: `apps/platform/gnr8/architecture/structure-plan-contract.test.ts`.
- Types: `StructurePlan`, `StructurePlanRoute`, `StructurePlanNavigation`, `StructurePlanSection`, `StructurePlanAssignment`, `StructurePlanLineage`, `StructurePlanValidationResult`, and `StructurePlanStatus`.
- Statuses: only `planned`, `valid`, `invalid`, `blocked`, and `stale`; generated, executed, published, deployed, and reconstructed states are not allowed.
- Identity: `structure-plan:<reconstructionPackageArtifactId>:<contractVersion>`, derived from the exact Reconstruction Package artifact and Structure Plan contract version.
- Lineage: exact Reconstruction Package artifact/package/status/version, Candidate Review Package artifact, Candidate Discovery artifact, site version, dry run, and included approved candidate refs copied from the package.
- Assignment model: route, navigation, and section candidate assignments only, plus unresolved metadata buckets; assignments do not contain generated components, generated blocks, generated content, AI outputs, publishing artifacts, deployment artifacts, or execution artifacts.
- Validation: required fields, exact lineage consistency, assignment coverage against included approved candidates, candidate participation, uniqueness, target compatibility, stale historical warnings, and recursive forbidden-field rejection.
- Blocked helper: `createBlockedStructurePlan(...)` creates metadata-only blocked plans for no eligible candidates, invalid lineage, or stale Reconstruction Package input with no planned routes, navigation, sections, or assignments.
- Safety: no builder, persistence, Structure Planning execution, generated React, generated blocks, generated content, AI, generation, publishing, deployment, schema, workers, API, UI, Evidence Capture, Candidate Discovery, Candidate Review, Candidate Context, Review Actions, Reconstruction Package, or runtime behavior changed.
- Validation result: focused Structure Plan contract tests pass `8 / 8`; platform Vercel build passes; `git diff --check` passes.
- Recommended next phase: Phase 8F-2 - Structure Planning Builder Design.

Previous completed milestone:
- Phase 8F-0 - Structure Planning Foundation Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / NO IMPLEMENTATION / NO GENERATION.
- Canonical design: `docs/architecture/STRUCTURE_PLANNING_FOUNDATION.md`.
- Purpose: `ReconstructionPackage` defines what is eligible; `StructurePlan` defines how approved candidates are organized.
- Required input: one exact latest persisted `ReconstructionPackage` artifact. Only included approved candidates already present in that package participate.
- Outputs designed for the future contract: metadata-only `StructurePlan` with plan identity, exact lineage, planned routes, planned navigation, planned sections, candidate assignments, limitations, and diagnostics.
- Eligibility: no candidate outside the source package may be planned. Rejected, deferred, unreviewed, superseded, stale, invalid, foreign-lineage, and inferred candidates remain excluded.
- Identity recommendation: `structure-plan:<reconstructionPackageArtifactId>:<structurePlanContractVersion>`. Caller-supplied plan IDs are rejected.
- Safety: no generated React, generated blocks, generated content, AI output, publishing artifact, deployment artifact, execution artifact, worker job, dry-run result, runtime state, schema, API, UI, or behavior change.
- Relationship: Review -> Reconstruction Package -> Structure Plan -> Future Reconstruction.
- Validation result: `git diff --check` passes.
- Recommended next phase: Phase 8F-1 - Structure Planning Contract.

Previous completed milestone:
- Phase 8E-7 - Reconstruction Package Persistence Real-Artifact Validation.
- Status: COMPLETE / VALIDATION ONLY / REAL ARTIFACTS PERSISTED / NO STRUCTURE PLANNING.
- Canonical evidence: `docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.
- Method: load latest Candidate Review Package, load linked Candidate Discovery Result, build `ReconstructionPackage`, persist with `persistReconstructionPackage(...)`, reload latest, reload exact artifact by ID, and retry persistence for idempotency.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e`: latest Review artifact `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`, linked Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`, persisted Reconstruction artifact `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`, status `valid`, `3` included, `1` excluded, `3` approved.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`: latest Review artifact `candidate_review_package_ecb5f777160a45e15b958948348bca08`, linked Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`, persisted Reconstruction artifact `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`, status `valid`, `1` included, `4` excluded, `1` approved.
- Reload/idempotency: both latest reloads and exact by-ID reloads matched the persisted artifact and exact package payload; both retries reused the same artifact ID and did not append another record.
- Lineage/metadata: Review artifact, Review package ID, Discovery artifact, site version, dry run, counts, contract version, validation, and timestamps all matched.
- Safety: forbidden-field scans found no Structure Plan, AI output, generated content, publishing artifact, deployment artifact, execution artifact, `reactOutput`, `generatedOutputs`, `generatedBlocks`, `designTokens`, or `reconstructionPlan`.
- No Structure Planning, AI, generated output, execution, publishing, schema, worker, API, UI, Review API, Review UI, Candidate Discovery behavior, Candidate Review behavior, or runtime behavior was changed.
- Recommended next phase: Phase 8F-0 - Structure Planning Foundation Design, documentation and contract design only.

Previous completed milestone:
- Phase 8E-6 - Reconstruction Package Persistence Implementation.
- Status: COMPLETE / PERSISTENCE HELPERS ONLY / NO STRUCTURE PLANNING.
- Canonical design: `docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_BOUNDARY.md`.
- Canonical module: `apps/platform/gnr8/architecture/reconstruction-package-persistence.ts`.
- Focused tests: `apps/platform/gnr8/architecture/reconstruction-package-persistence.test.ts`.
- Storage: uses the existing site-version `import_provenance_summary` artifact boundary, not a new DB table or hybrid dual-write path.
- Artifact kind: `reconstruction_package`.
- Storage shape: append-only `reconstructionPackageArtifacts` plus `latestReconstructionPackageArtifact`.
- Metadata shape: artifact ID/ref, kind, `reconstructionPackageId`, authorizing `candidateReviewPackageArtifactId`, linked `candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, `status`, included/excluded/approved counts, `createdAt`, `persistedAt`, and `contractVersion`.
- Idempotency: equivalent package for the same Review artifact and contract version reuses latest; changed current packages append; invalid packages reject; packages already stale relative to latest Review Package reject.
- Staleness policy: persist only `valid` or `blocked` packages. Historical packages that later become stale remain loadable for audit but must not be latest for new Structure Planning.
- Validation before persist: run `validateReconstructionPackage(...)`, enforce forbidden-field guard, check exact Review/Discovery/site-version/dry-run lineage, verify referenced Candidate Review and Candidate Discovery artifacts from provenance, and require the authorizing Review artifact to be the latest head for the lineage.
- Helper design: `persistReconstructionPackage(...)`, `loadLatestReconstructionPackage(...)`, and `loadReconstructionPackageById(...)`.
- Safety: no Structure Plans, AI outputs, generated content, publishing artifacts, execution artifacts, worker jobs, schema changes, Review API changes, Review UI changes, Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review, or Review Actions behavior changed.
- Relationship to future Structure Planning: `ReconstructionPackage -> StructurePlanningPackage`, but no Structure Planning exists yet.
- Validation result: focused 8E tests pass `26 / 26`.
- Recommended next phase: Phase 8E-7 - Reconstruction Package Persistence Real-Artifact Validation.

Previous completed milestone:
- Phase 8E-5 - Reconstruction Package Persistence Boundary Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY / NO IMPLEMENTATION.
- Canonical design: `docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_BOUNDARY.md`.
- Storage recommendation: use the existing site-version `import_provenance_summary` artifact boundary, not a new DB table or hybrid dual-write path.
- Artifact kind: `reconstruction_package`.
- Storage shape: append-only `reconstructionPackageArtifacts` plus `latestReconstructionPackageArtifact`.
- Metadata shape: artifact ID/ref, kind, `reconstructionPackageId`, authorizing `candidateReviewPackageArtifactId`, linked `candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, `status`, included/excluded/approved counts, `createdAt`, `persistedAt`, and `contractVersion`.
- Idempotency: equivalent package for the same Review artifact and contract version reuses latest; changed current packages append; invalid packages reject; packages already stale relative to latest Review Package reject.
- Staleness policy: persist only `valid` or `blocked` packages. Historical packages that later become stale remain loadable for audit but must not be latest for new Structure Planning.
- Validation before persist: run `validateReconstructionPackage(...)`, enforce forbidden-field guard, check exact Review/Discovery/site-version/dry-run lineage, and compare against the latest Review Package head when latest-only enforcement is active.
- Helper design: `persistReconstructionPackage(...)`, `loadLatestReconstructionPackage(...)`, and `loadReconstructionPackageById(...)`.
- Safety: persistence must not create Structure Plans, AI outputs, generated content, publishing artifacts, execution artifacts, worker jobs, schema changes, Review API changes, or Review UI changes.
- Relationship to future Structure Planning: `ReconstructionPackage -> StructurePlanningPackage`, but no Structure Planning exists yet.
- Validation result: `git diff --check` passes.
- Recommended next phase: Phase 8E-6 - Reconstruction Package Persistence Implementation.

Previous completed milestone:
- Phase 8E-4 - Reconstruction Package Real-Artifact Validation.
- Status: COMPLETE / VALIDATION ONLY / NO BEHAVIOR CHANGE.
- Canonical evidence: `docs/architecture/RECONSTRUCTION_PACKAGE_REAL_ARTIFACT_VALIDATION.md`.
- Method: read-only provenance query for the two real siteVersions, then in-memory `buildReconstructionPackage(...)` and `validateReconstructionPackage(...)`.
- Latest-head finding: supplied Review artifact IDs were valid historical artifacts but no longer current latest heads.
- ODV supplied artifact `candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f` produced `status = stale`, `1` approved/included Route candidate, `3` excluded candidates, valid lineage, and no forbidden fields.
- ODV current latest artifact `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` produced `status = valid`, `3` approved/included candidates, `1` excluded deferred candidate, `0` limitations, valid lineage, and no forbidden fields.
- ViroiDoc supplied artifact `candidate_review_package_4e70cbc788098383b52de76249a5c412` produced `status = stale`, `1` approved/included Route candidate, `4` excluded candidates, propagated limitations, valid lineage, and no forbidden fields.
- ViroiDoc current latest artifact `candidate_review_package_ecb5f777160a45e15b958948348bca08` produced `status = valid`, `1` approved/included Route candidate, `4` excluded candidates, propagated limitations, valid lineage, and no forbidden fields.
- Safety: no persistence, latest-pointer mutation, Review API, Review UI, Candidate Discovery behavior, Candidate Review behavior, Structure Plan, reconstruction, AI, generation, execution, publishing, migration, schema, worker, API, UI, or behavior change.
- Validation result: focused Reconstruction Package contract and builder tests pass `18 / 18`; platform Vercel build passes with existing lint warnings; `git diff --check` passes.
- Recommended next phase: Phase 8E-5 - Reconstruction Package Persistence Boundary Design.

Previous completed milestone:
- Phase 8E-3 - Reconstruction Package Builder Implementation.
- Status: COMPLETE / PURE DETERMINISTIC BUILDER ONLY.
- Canonical module: `apps/platform/gnr8/architecture/reconstruction-package-builder.ts`.
- Focused tests: `apps/platform/gnr8/architecture/reconstruction-package-builder.test.ts`.
- Inputs: exact `CandidateReviewPackage`, linked `CandidateDiscoveryResult`, exact `candidateReviewPackageArtifactId`, and `latestCandidateReviewPackageArtifactId`.
- Output: metadata-only `ReconstructionPackage`; no persistence, planning, generation, execution, or publishing.
- Identity: `reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>`.
- Approved mapping: only latest approved decisions that resolve to exact Discovery candidates are included; refs copy candidate ID, candidate type, route path when available, confidence, authorizing `reviewEventId`, deterministic source candidate refs, and stable evidence/dry-run refs.
- Exclusions: rejected, deferred, unreviewed, superseded, stale, and missing-candidate refs do not enter `approvedCandidateRefs`.
- Status behavior: `valid` for included approved candidates with valid lineage and contract validation; `blocked` for no included approved candidates; `stale` for non-latest Review Package artifacts; `invalid` for invalid source lineage or contract validation failure.
- Limitations and diagnostics: source limitations are propagated as deterministic strings; only builder blockers are added; diagnostics report source validation, latest-head comparison, lineage matching, included/excluded counts, missing candidates, and Reconstruction Package validation.
- Safety: no persistence, latest-pointer mutation, Review API, Review UI, Candidate Discovery behavior, Candidate Context behavior, Candidate Review behavior, Review Actions, Evidence Capture, Structure Plan, reconstruction, AI, generation, execution, publishing, migration, schema, worker, API, UI, or behavior change outside the pure builder.
- Validation result: focused Reconstruction Package contract and builder tests pass `18 / 18`; platform Vercel build passes with existing lint warnings; `git diff --check` passes.
- Recommended next phase: Phase 8E-4 - Reconstruction Package Real-Artifact Validation.

Previous completed milestone:
- Phase 8E-2 - Reconstruction Package Builder Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Canonical design: `docs/architecture/RECONSTRUCTION_PACKAGE_BUILDER_DESIGN.md`.
- Purpose: pure deterministic mapping from one exact latest `CandidateReviewPackage` artifact plus its linked `CandidateDiscoveryResult` into the 8E `ReconstructionPackage` contract.
- Required inputs: exact latest Candidate Review Package artifact, exact linked Candidate Discovery Result, and optional supporting Evidence Capture baseline, Candidate Context, and FirstLimitedDryRunOutput refs as lineage only.
- Eligibility: only latest approved decisions become `approvedCandidateRefs`; rejected, deferred, unreviewed, superseded, stale, and missing-candidate decisions are excluded.
- Candidate refs: carry candidate ID, candidate type, route path, confidence, authorizing `reviewEventId`, deterministic source candidate refs, and copied evidence refs.
- Identity: `reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>`.
- Status rules: `valid` for at least one approved candidate with valid lineage and passing validation; `blocked` for no approvals or missing required lineage; `stale` for non-latest Review Package artifacts; `invalid` for validation or lineage mismatch failures.
- Limitations and diagnostics: propagate source limitations, add only deterministic builder blockers, and report counts, lineage validation, stale detection, missing candidates, supersession/latest-decision checks, and contract validation.
- Safety: no builder implementation, persistence, Structure Plan, reconstruction, AI, generation, execution, publishing, migration, schema, worker, API, UI, or behavior change.
- Validation result: `git diff --check` passes.
- Recommended next phase: Phase 8E-3 - Reconstruction Package Builder Implementation.

Previous completed milestone:
- Phase 8E-1 - Reconstruction Package Contract.
- Status: COMPLETE / CONTRACT ONLY.
- Canonical module: `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`.
- Types: `ReconstructionPackage`, `ReconstructionPackageCandidateRef`, `ReconstructionPackageLineage`, `ReconstructionPackageEligibilitySummary`, `ReconstructionPackageValidationResult`, and `ReconstructionPackageStatus`.
- Statuses: only `planned`, `valid`, `invalid`, `blocked`, and `stale`; generated, executed, reconstructed, published, and deployed states are not allowed.
- Candidate inclusion: approved-only refs with exact candidate and authorizing Review Event identity; optional route, confidence, source-candidate, and evidence refs remain metadata only.
- Validation: exact required lineage, lineage consistency, approved-only inclusion, unique included candidates, eligibility counts, and recursive forbidden-field rejection.
- Blocked helper: creates a deterministic metadata-only blocked package with zero approved refs for no-approval or invalid/stale-input outcomes.
- Safety: no builder, persistence, Structure Plan, reconstruction, AI, generation, execution, publishing, migration, schema, worker, API, or UI behavior.
- Validation result: focused contract tests pass `9 / 9`; platform Vercel build passes with existing lint warnings; `git diff --check` passes.
- Recommended next phase: Phase 8E-2 - Reconstruction Package Builder Design, design only.

Previous completed milestone:
- Phase 8E-0 - Reconstruction Package Foundation Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Purpose: a Candidate Review Package records what was approved; a Reconstruction Package records what is eligible for future Structure Planning.
- Required input: one exact immutable latest Candidate Review Package artifact; only its latest `approved` decisions authorize inclusion.
- Supporting lineage: exact Candidate Discovery, Candidate Context, Limited Dry Run, and Evidence Capture refs may be retained for traceability but cannot independently authorize a candidate.
- Output: an immutable metadata-only package with deterministic identity, exact Review/Discovery/Event lineage, approved candidate refs, bounded summaries, limitations, diagnostics, and planning-eligibility intent. It has no generated outputs.
- Identity: derive package identity from the exact Review Package artifact ID plus contract version; a new Review head produces a new append-only package identity.
- Staleness: a newer Review head, superseded approval, newly reviewed candidate lineage, incompatible contract version, or unresolvable exact lineage makes the package stale for new planning without changing its historical validity.
- Safety: no React, blocks, content, AI output, Structure Plan, execution readiness, jobs, publishing artifacts, or deployment artifacts.
- Canonical design: `docs/architecture/RECONSTRUCTION_PACKAGE_FOUNDATION.md`.
- Recommended next phase at completion: Phase 8E-1 - Reconstruction Package Contract, formal types and validation only.

Earlier completed milestone:
- Phase 8D-27 - Post-Candidate-Context Boundary Reassessment.
- Status: COMPLETE / DOCUMENTATION AND READ-ONLY ANALYSIS ONLY.
- Decision: recommend exactly one next boundary, Reconstruction Package Foundation.
- Canonical next input: one exact immutable Candidate Review Package artifact selected as the current package head; only candidates with an `approved` latest decision in that snapshot are eligible.
- Supporting lineage: the exact linked Candidate Discovery, Limited Dry Run, and Evidence Capture artifacts remain referenced dependencies, not independent authorization sources.
- Why now: ODV and ViroiDoc prove real approvals, immutable events/package snapshots, canonical latest reload, and production-visible exact screenshots and Navigation/Section overlays.
- Initial limit: reconcile the old 7F metadata scaffolding with canonical 8C/8D lineage only; no package persistence, UI, Structure Plan, reconstruction, AI, generation, workers, or publishing.
- Deferred: Structure Planning follows the canonical reviewed package; another governance layer and alternative boundary have no demonstrated prerequisite gap.
- Canonical assessment: `docs/architecture/POST_CANDIDATE_CONTEXT_BOUNDARY_REASSESSMENT.md`.
- Recommended next phase: Phase 8E-0 - Reconstruction Package Foundation Design, documentation and contract reconciliation only.

Earlier completed milestone:
- Phase 8D-26 - Candidate Context Review UI Production Re-Verification.
- Status: COMPLETE / PASS / AUTHENTICATED PRODUCTION VISUALS VERIFIED.
- Deployment: the 8D-25 fix is present; both pages resolve their existing persisted PNG as a data URI instead of `Visual evidence unavailable`.
- ODV: Route, Navigation, and selected Section render the `1366 x 2970` screenshot; Route has no overlay; Navigation and Section have visible, non-zero overlays.
- ViroiDoc: Route, Navigation, and selected Section render the `1366 x 4428` screenshot; Route has no overlay; Navigation and Section have visible, non-zero overlays; all `29` ordered Navigation labels remain visible.
- Actions: no new review event was created; counts remain ODV `1 / 1 / 1 / 1` and ViroiDoc `1 / 1 / 1 / 2` for approved/rejected/deferred/unreviewed.
- Safety: no AI, Reconstruction, Publishing, batch, tenant, or customer controls; no application behavior changed.
- Validation: focused tests `27 / 27`; platform Vercel build passes with existing lint warnings; `git diff --check` passes.
- Canonical evidence: `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_E2E_VERIFICATION.md`.
- Recommended next phase: Phase 8D-27 - Post-Candidate-Context Boundary Reassessment, documentation only.

Previous completed milestone:
- Phase 8D-25 - Candidate Context Review UI End-to-End Verification.
- Status: COMPLETE / REAL UI VERIFIED / BLOCKING SCREENSHOT DELIVERY DEFECT FIXED IN CODE / DEPLOYED VISUAL RE-VERIFICATION PENDING.
- Targets: ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`.
- Default cards: readable names, type, route, confidence, decision, and rationale; grouped decision hierarchy; `View Context` and `Technical details` collapsed initially.
- Context copy: Route summaries, Navigation item counts/ordered labels, Section structural labels, confidence, evidence summaries, and limitations were present. ViroiDoc preserves 18 scope warnings and some noisy source-markup labels.
- Defect: the deployment could not read import-machine absolute screenshot paths, so every expanded context showed `Visual evidence unavailable` and no overlay.
- Fix: fall back through existing read-only raw-import artifact helpers to the one exact persisted screenshot suffix; both real artifacts resolve valid PNG data URIs. No new persistence or endpoint.
- Actions: Approve, Reject, and Defer succeeded on both targets with Phase 8D-25 rationales and canonical refresh; counts remain ODV `1 / 1 / 1 / 1` and ViroiDoc `1 / 1 / 1 / 2` for approved/rejected/deferred/unreviewed.
- Safety: no AI, Reconstruction, Publishing, batch, tenant/customer, multi-candidate, schema, worker, capture, projection, or Review Action behavior added.
- Validation: focused tests `27 / 27`; real-artifact fallback checks pass for both targets; platform Vercel build passes; screenshots recorded in the canonical evidence document.
- Canonical evidence: `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_E2E_VERIFICATION.md`.
- Recommended next phase: Phase 8D-26 - Candidate Context Review UI Production Re-Verification, limited to deployment and visual verification of Route/no-overlay plus Navigation/Section overlays.

Previous completed milestone:
- Phase 8D-24 - Candidate Context Review UI Integration Implementation.
- Status: COMPLETE / READ-ONLY CANDIDATE REVIEW UI INTEGRATION.
- Loading: exact Review-linked Candidate Discovery artifact, matching First Limited Dry Run output, existing Evidence Capture baseline, and existing `buildCandidateContextProjection(...)`; no floating Discovery latest pointer.
- Placement: one collapsed-by-default inline `View Context` panel inside every candidate card; existing Approve, Reject, and Defer controls remain unchanged and visible.
- Route: persisted full-page screenshot, route summary, confidence, evidence summary, limitations, and no highlight by design.
- Navigation: persisted full-page screenshot, projection-supplied geometry CSS overlay, item count, ordered labels, confidence, and limitations.
- Section: persisted full-page screenshot, projection-supplied section CSS overlay, structural label, route, confidence, and limitations.
- State UX: ready shows screenshot and compatible overlay; incomplete shows screenshot plus warning; unavailable shows a warning without a screenshot requirement; no decision restriction.
- Technical boundary: raw paths, evidence refs, geometry refs, and diagnostics stay in collapsed `Technical details`.
- Verification: focused projection and page tests pass `22 / 22`; platform Vercel build passes; `git diff --check` passes.
- Safety: no action, API, persistence, projection, discovery, capture, AI, Reconstruction, Publishing, image generation, screenshot/crop generation, batch, tenant/customer, schema, or worker change.
- Canonical design: `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_INTEGRATION_DESIGN.md`.
- Recommended next phase: Phase 8D-25 - Candidate Context Review UI End-to-End Verification.

Previous completed milestone:
- Phase 8D-23 - Candidate Context Review UI Integration Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Placement: one collapsed-by-default inline `View context` panel inside each existing Candidate Review card; existing Approve, Reject, and Defer controls remain visible outside it.
- Canonical design: `docs/architecture/CANDIDATE_CONTEXT_REVIEW_UI_INTEGRATION_DESIGN.md`.
- Recommended next phase at completion: Phase 8D-24 - Candidate Context Review UI Integration Implementation.

Previous completed milestone:
- Phase 8D-22 - Candidate Context Projection Real-Artifact Validation.
- Status: COMPLETE / REAL-ARTIFACT READ-ONLY VALIDATION PASS.
- Targets: ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`.
- ODV lineage: Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`; capture run `phase-8b-12k-f12-1781722330653-af9ea5e2`.
- ViroiDoc lineage: Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`; capture run `phase-8b-12n-1781765161217`.
- Projection result: each target's selected Route, Navigation, and Section projection is `ready`; combined counts are `6 ready / 0 incomplete / 0 unavailable`.
- Visual invariants: both Routes have exact full-page screenshots and no highlight; both Navigations and both selected Sections have exact screenshots and unique, in-bounds, geometry-backed highlights.
- Diagnostics: all six projection validators pass with no projection diagnostics. ViroiDoc Route and Navigation preserve 18 source Dry Run scope limitations each; these are warnings, not projection defects.
- Defects: none; no behavior changed.
- Safety: validation and the four required documentation updates only; no UI integration, screenshot/crop creation, review behavior, AI, Reconstruction, Publishing, schema, migration, or worker change.
- Canonical evidence: `docs/architecture/CANDIDATE_CONTEXT_PROJECTION_DESIGN.md` and `docs/architecture/CANDIDATE_CONTEXT_VISUALIZATION_FOUNDATION.md`.
- Recommended next phase: Phase 8D-23 - Candidate Context Review UI Integration Design, documentation and contract design only.

Previous completed milestone:
- Phase 8D-21 - Candidate Context Projection Implementation.
- Status: COMPLETE / PURE DETERMINISTIC PROJECTION ONLY.
- Implementation: `apps/platform/gnr8/architecture/candidate-context-projection.ts` builds one exact-lineage `CandidateContextProjection` with `ready | incomplete | unavailable` state, screenshot, optional highlight, candidate/evidence summary, limitations, and diagnostics.
- Route: exact full-page screenshot, route summary, canonical confidence, and limitations; highlight is null by design.
- Navigation: exact full-page screenshot, one proven ref-backed geometry highlight, item count, ordered labels, canonical confidence, and limitations.
- Section: exact full-page screenshot, one exact ref-backed model geometry highlight, deterministic structural label, route, canonical confidence, and limitations.
- Fail closed: missing screenshot or invalid lineage is unavailable; missing, invalid, or ambiguous required geometry is incomplete; no guessing or fallback.
- Validation: pure required-lineage, candidate compatibility, screenshot/ref, geometry-bound, state consistency, and recursive forbidden-field checks.
- Focused tests: `10 / 10` pass.
- Safety: no UI integration, screenshot/crop creation, review behavior, Evidence Capture, Limited Dry Run, Candidate Discovery, Candidate Review persistence/action/API, Reconstruction, AI, Publishing, schema, migration, or worker behavior.
- Canonical design: `docs/architecture/CANDIDATE_CONTEXT_PROJECTION_DESIGN.md`.
- Recommended next phase: Phase 8D-22 - Candidate Context Projection Real-Artifact Validation.

Previous completed milestone:
- Phase 8D-19 - Candidate Context Visualization Foundation.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Existing reuse: exact-lineage desktop screenshots, rendered DOM, layout geometry, section/navigation evidence, computed-style samples, and Route/Navigation/Section models.
- Selected strategy: full-page screenshot plus a geometry-backed highlight for Navigation and Section; Route has no artificial highlight.
- Missing or ambiguous required evidence fails closed. The future projection is read-only, deterministic, metadata/ref based, non-authorizing, and separate from review and Reconstruction behavior.
- Canonical design: `docs/architecture/CANDIDATE_CONTEXT_VISUALIZATION_FOUNDATION.md`.
- Recommended next phase at completion: Phase 8D-20 - Candidate Context Projection Design.

Previous completed milestone:
- Phase 8D-16 - Candidate Review Action End-to-End Verification.
- Status: COMPLETE / REAL-TARGET HUMAN REVIEW LOOP PASS.
- ODV actions: approved `candidate:route:/`, deferred `candidate:navigation:nav%3A%2F`, and rejected `candidate:section:/:section-boundary-7ea033afed92`; latest package `candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f`.
- ViroiDoc actions: approved `candidate:route:/`, deferred `candidate:navigation:nav%3A%2F`, and rejected `candidate:section:/:section-boundary-4156e11f8f75`; latest package `candidate_review_package_4e70cbc788098383b52de76249a5c412`.
- Persistence: each action appended one immutable event and one distinct immutable package snapshot, advanced latest, and left every previous package unchanged and loadable; each target now has four package artifacts and three events.
- UI projection: both are valid and `ready`, with `1` approved, `1` rejected, and `1` deferred; ODV has `1` unreviewed and ViroiDoc has `2` unreviewed.
- Audit: all six events contain actor, decision, rationale, trusted `decidedAt`, and correct null supersession for initially unreviewed candidates.
- Safety: all non-Review provenance remained unchanged; no reconstruction, AI, generated output, publishing, schema, migration, or worker-job state changed.
- Canonical evidence: `docs/architecture/CANDIDATE_REVIEW_ACTION_E2E_VERIFICATION.md`.
- Recommended next phase: Phase 8D-17 - Post-Review Action Boundary Reassessment, documentation and read-only analysis only.

Previous completed milestone:
- Phase 8D-15 - Candidate Review Action UI Implementation.
- Status: COMPLETE / SUPERADMIN SINGLE-CANDIDATE ACTION UI ONLY.
- Controls: Approve, Reject, and Defer plus optional rationale on every reviewed and unreviewed candidate card.
- Payload: exactly site version, candidate, action type, rationale, Discovery artifact, and expected Review Package artifact to the existing 8D-14 endpoint.
- Refresh UX: metadata-only success followed by canonical projection refresh; explicit stale-package feedback followed by latest refresh without automatic rebase or resubmission; metadata-only other errors.
- Safety: no batch, tenant/customer, edit, AI, reconstruction, generated-output, or publishing controls or behavior.
- Validation: focused UI/transport tests pass `10 / 10`; platform Vercel build passes; `git diff --check` passes.
- Canonical implementation/design: `apps/platform/app/gnr8/admin/candidate-review/[siteVersionId]/` and `docs/architecture/CANDIDATE_REVIEW_ACTION_UI_DESIGN.md`.
- Recommended next phase: Phase 8D-16 - Candidate Review Action End-to-End Verification.

Previous completed milestone:
- Phase 8D-14 - Candidate Review Action API Implementation.
- Status: COMPLETE / SERVER API ONLY.
- Route: `POST /api/gnr8/admin/candidate-review/actions`.
- Auth and transport: authenticated superadmin only through the existing guard; same-origin `application/json`; no tenant, customer, agency-admin, anonymous, or cross-origin access.
- Payload: exact allowlist of site version, candidate, action type, optional rationale, Discovery artifact, and expected Review Package artifact. Unknown fields and client-controlled actor, role, time, action ID, dry run, generated, reconstruction, execution, and publishing fields fail closed.
- Server resolution: actor identity/role, trusted time, deterministic length-delimited SHA-256 action ID, dry-run identity, linked Discovery artifact, and authoritative latest Review Package.
- Application: existing `applyCandidateReviewAction(...)` only; immutable append, compare-and-set latest pointer, exact replay without a second write, stale/conflict rejection, and canonical latest reload.
- Response: metadata only, including action/event identity, decision, candidate, resulting package artifact, counts, diagnostics, or the documented closed error envelope.
- Validation: focused route tests pass `12 / 12`; platform Vercel build passes; `git diff --check` passes.
- Boundary: no UI controls/actions, reconstruction, AI, generated output, publishing, schema, migration, tenant/customer access, or workers.
- Canonical implementation/design: `apps/platform/app/api/gnr8/admin/candidate-review/actions/` and `docs/architecture/CANDIDATE_REVIEW_ACTION_API_DESIGN.md`.
- Recommended next phase at completion: Phase 8D-15 - Candidate Review Action UI Implementation.

Previous completed milestone:
- Phase 8D-13 - Candidate Review Action API/Server Action Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Boundary: one same-origin, superadmin-only Admin API JSON POST, not a Next.js Server Action and not dual transport, matching existing GNR8 admin mutation patterns.
- Client payload: site version, candidate, action type, optional rationale, exact Discovery artifact, and expected Review Package artifact only. Actor, role, request time, action ID, dry run, current head, latest package, and linked Discovery result are server-resolved.
- Identity: a deterministic server-generated action ID hashes the normalized intent, authenticated actor, and exact base artifact. Exact retry reuses the original trusted event time and returns the original event/artifact; semantic disagreement is an idempotency conflict.
- Validation: strict payload and forbidden-field rejection, exact linked Discovery and latest Review Package loading, package-wide stale/CAS failure without auto-rebase, existing-helper-only application, canonical latest reload, and metadata-only response.
- Errors: `UNAUTHORIZED`, `FORBIDDEN`, `INVALID_ACTION_TYPE`, `MISSING_CANDIDATE`, `STALE_REVIEW_PACKAGE`, `INVALID_LINEAGE`, `VALIDATION_FAILED`, `IDEMPOTENCY_CONFLICT`, `PERSISTENCE_FAILED`, and `UNKNOWN_ERROR`.
- Security: same-origin JSON POST, session-derived superadmin actor, trusted server time, no tenant/customer access, and no generated, execution, reconstruction, AI, worker, or publishing fields or output.
- No API route, Server Action, UI action, Candidate Discovery or Candidate Review behavior, persistence, reconstruction, AI, publishing, schema, migration, or worker was added.
- Canonical design: `docs/architecture/CANDIDATE_REVIEW_ACTION_API_DESIGN.md`.
- Recommended next phase: Phase 8D-14 - Candidate Review Action API/Server Action Implementation, limited to the designed Admin API route, its adapter, and focused tests.

Previous completed milestone:
- Phase 8D-12 - Candidate Review Action UI Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- UI location: the existing Candidate Review admin page, with one action panel per exact candidate and no Candidate Discovery UI change or duplicate action page.
- Controls: Approve, Reject, and Defer for one candidate; optional reviewer rationale is normalized by the future server boundary to `No rationale provided by reviewer.` when blank so the existing non-empty contract remains unchanged.
- The browser payload is now narrowed by 8D-13 to action intent and exact rendered artifact identities; trusted actor/time/action identity/dry-run lineage are server-resolved.
- Stale packages show a conflict and reload latest state without automatic rebase. Exact replay returns the original outcome; idempotency conflicts fail.
- Success and replay reload the canonical latest package, update derived groups and decisions, and preserve full immutable history visibility.
- First scope is superadmin-only and single-candidate, with no batch, tenant/customer access, reconstruction handoff, AI, generated output, editing, or publishing control.
- No UI, API/server action, Candidate Discovery or Candidate Review behavior, persistence, reconstruction, AI, publishing, schema, migration, or worker was added.
- Canonical design: `docs/architecture/CANDIDATE_REVIEW_ACTION_UI_DESIGN.md`.
- Recommended next phase at completion: Phase 8D-13 - Candidate Review Action API/Server Action Design.

Previous completed milestone:
- Phase 8D-11 - Candidate Review Action Application Implementation.
- Status: COMPLETE / BACKEND APPLICATION ONLY.
- `applyCandidateReviewAction(...)` validates the request, authoritative latest package artifact, linked Discovery lineage, actor, candidate, and current head; creates one immutable event; recomputes the full latest projection and counts; validates the new package; and persists one strict immutable snapshot.
- Package-wide optimistic concurrency uses the request artifact as the base token and an atomic artifact-ID compare-and-set for append plus latest-pointer advancement. Stale preflight and concurrent commits fail without automatic rebase.
- Exact deterministic-action replay returns the original event, resulting package, and artifact reference without a write. Different request semantics or base artifact reuse of the same `actionId` fails as an idempotency conflict.
- Focused action application, action contract, and persistence tests pass `29 / 29`.
- No UI control, API route, page action, Candidate Discovery behavior, reconstruction, AI, publishing, schema, migration, or worker was added.
- Canonical implementation/design: `apps/platform/gnr8/architecture/candidate-review-action-application.ts` and `docs/architecture/CANDIDATE_REVIEW_ACTION_APPLICATION_DESIGN.md`.
- Recommended next phase: Phase 8D-12 - Candidate Review Action UI Design, documentation and architecture only.

Previous completed milestone:
- Phase 8D-10 - Candidate Review Action Application Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Canonical flow: exact candidate and action request -> authentication/authorization/lineage/freshness validation -> one immutable review event -> deterministic latest-decision and count derivation -> one validated immutable package snapshot -> compare-and-set latest pointer update.
- Package strategy: never mutate an existing package artifact. Preserve its complete history and append exactly one new event in a new immutable full-package snapshot with the same logical package and Discovery lineage.
- Concurrency: the expected package artifact is the package-wide optimistic concurrency token, and the per-candidate supersession target is derived server-side from that exact package. Stale submissions fail without automatic rebasing; append plus pointer advancement is one logical commit.
- Idempotency and audit: deterministic action/event identity returns the original event and resulting artifact for exact replay, rejects conflicting reuse, and preserves actor, decision, rationale, timestamps, prior/superseded decisions, source/base/result lineage, and reproducible derived state.
- No application handler, endpoint, UI action, review event/package write, Candidate Discovery or Candidate Review contract/persistence/UI change, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, schema, migration, or worker behavior changed.
- Canonical design: `docs/architecture/CANDIDATE_REVIEW_ACTION_APPLICATION_DESIGN.md`.
- Recommended next phase: Phase 8D-11 - Candidate Review Action Application Implementation, backend boundary and focused tests only.

Previous completed milestone:
- Phase 8D-9 - Candidate Review Action Contract.
- Status: COMPLETE / CONTRACT ONLY.
- The exact action set is `approve | reject | defer`, mapped to existing `approved | rejected | deferred` decisions. Deferred is an explicit non-authorizing decision; unreviewed is absence of an event.
- `CandidateReviewActionRequest` carries stable action identity, authenticated `superadmin` actor context, exact site-version/dry-run/Discovery-candidate/Review-Package-artifact lineage, rationale, and request time. `CandidateReviewActionResult` always reports validation and diagnostics and contains an event only when accepted.
- Validation rejects invalid actions and roles, missing or mismatched lineage, absent linked Discovery candidates, stale package refs, mismatched current heads, and recursively forbidden generated, execution, reconstruction, or publishing fields.
- Pure event creation derives deterministic event identity, actor attribution, exact lineage, mapped decision, request time, rationale, and explicit current-head supersession. It never mutates or persists the supplied package.
- Focused tests cover all action mappings, supersession, rejection paths, linked lineage, stale refs, forbidden fields, and package immutability.
- No API route, persistence mutation, UI action, Candidate Discovery or Candidate Review behavior/persistence/UI change, Evidence Capture, Limited Dry Run, reconstruction, generated output, AI, publishing, schema, migration, or worker behavior changed.
- Detailed foundation: `docs/architecture/CANDIDATE_REVIEW_ACTIONS_FOUNDATION.md`.
- Recommended next phase: Phase 8D-10 - Candidate Review Action Application Design.

Previous completed milestone:
- Phase 8D-8 - Candidate Review Actions Foundation.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- The canonical single-candidate action, immutable event, explicit supersession, authenticated superadmin actor, stale-state rejection, and non-executing boundary were defined before contract implementation.
- Detailed foundation: `docs/architecture/CANDIDATE_REVIEW_ACTIONS_FOUNDATION.md`.
- Recommended next phase at completion: Phase 8D-9 - Candidate Review Action Contract.

Previous completed milestone:
- Phase 8D-7 - Post-Review Boundary Reassessment.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURAL ASSESSMENT ONLY.
- Exactly one next boundary is selected: **Candidate Review Actions Foundation**.
- The foundation is limited to authenticated `approved | rejected | deferred` decision creation, append-only immutable review events, latest-decision derivation, immutable audit history, idempotency, and stale/conflicting-write handling over the existing Candidate Review contract and persistence boundary.
- ODV and ViroiDoc prove package lineage, persistence, reload, projection, and read-only visibility, but both remain entirely unreviewed. Real review decisions are the missing prerequisite for every meaningful downstream handoff.
- Reconstruction Package Foundation is deferred. A package may exist before decisions only as abstract or non-authorizing empty/draft scaffolding; it cannot safely claim a reviewed operational handoff without approved candidates, and the Phase 7F contract still requires canonical 8D lineage reconciliation.
- Structure Planning Foundation is deferred. A generic schema could be discussed, but an operational plan before approved candidates would convert discovery observation into target intent without the human gate.
- No other option is justified. The direct prerequisite with the highest business and migration value is real, attributable, auditable human decisions.
- No review action, Candidate Discovery behavior/persistence/UI, Candidate Review contract/persistence/UI behavior, Evidence Capture, Limited Dry Run, reconstruction, Structure Planning, AI, publishing, schema, migration, or worker behavior changed.
- Detailed assessment: `docs/architecture/POST_REVIEW_BOUNDARY_REASSESSMENT.md`.
- Recommended next phase: Phase 8D-8 - Candidate Review Actions Foundation, architecture and contract design only.

Previous completed milestone:
- Phase 8D-6R - Candidate Review Present-Artifact Read-Only Admin Verification.
- Status: COMPLETE / PRESENT-ARTIFACT READ-ONLY PASS.
- The canonical latest loader returned exact ODV artifact `candidate_review_package_6bc93e296baa55f876ea0d9d6ce27520` and exact ViroiDoc artifact `candidate_review_package_c20e6b0ef6647a885ad577455d219f2f`; both persisted validations and both surface projections are valid.
- ODV projects `4` linked candidates and ViroiDoc projects `5`; every candidate is unreviewed. Reviewed, approved, rejected, deferred, latest-decision, review-event, and superseded-event counts are all zero for both targets.
- Both projections are `ready` and expose `empty_review_package` plus `all_candidates_unreviewed`; both approved/rejected/deferred groups and immutable review histories are empty.
- The page render contract contains Candidate Review, Overview, Decision Summary, Latest Decisions, Event History, and Candidate Context, with the required all-unreviewed and empty-review states. No button, form, input, review action, AI, reconstruction, or publishing control is present.
- No projection/display defect was found and no application code changed. An unauthenticated production URL check confirmed the admin guard and reached Login; no authenticated superadmin browser session was available, so the deployed authenticated page was not visually observed.
- Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`.
- Recommended next phase: Phase 8D-7 - Candidate Review Next-Boundary Reassessment, documentation and read-only analysis only.

Previous completed milestone:
- Phase 8D-6F - Candidate Review Real-Target Package Persistence Completion.
- Status: COMPLETE / VALID EMPTY PACKAGES PERSISTED AND RELOADED.
- ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` uses exact latest Discovery artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`; its Candidate Review artifact is `candidate_review_package_6bc93e296baa55f876ea0d9d6ce27520`.
- ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` uses exact latest Discovery artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`; its Candidate Review artifact is `candidate_review_package_c20e6b0ef6647a885ad577455d219f2f`.
- Canonical reload for both packages reports valid persistence/package validation, `reviewedCandidateCount = 0`, `approvedCount = 0`, `rejectedCount = 0`, `deferredCount = 0`, `latestDecisions = []`, and `reviewEvents = []`.
- No review decisions were created. Stable before/after provenance comparison confirms all non-Candidate-Review state remained unchanged, including Candidate Discovery, AI, reconstruction, publishing, generated, and execution artifacts.
- No code, schema, UI, contract, helper, worker, Candidate Discovery, reconstruction, AI, publishing, or behavior changed.
- Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`.
- Recommended next phase: Phase 8D-6R - Candidate Review Present-Artifact Read-Only Admin Verification only; do not add review actions or rerun 8D-6.

Previous completed milestone:
- Phase 8D-6 - Candidate Review End-to-End Admin Verification.
- Status: COMPLETE / MISSING-STATE PASS; present-artifact chain not exercised.
- Read-only production loaders found no persisted `candidate_review_package` for ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` or ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf`.
- Both projections return `validation.status = unavailable`, state `missing`, zero counts/groups/history, and `CANDIDATE_REVIEW_PACKAGE_MISSING` without synthesizing review state.
- Page source contains Candidate Review, Overview, Decision Summary, Latest Decisions, Event History, Candidate Context, and the explicit missing-package message.
- No buttons, forms, inputs, review actions, AI, reconstruction, publishing, or trigger controls are present.
- Focused Candidate Review tests pass `27 / 27`; the platform production build passes with existing unrelated lint warnings; no projection/display defect was found and no application code or behavior changed.
- Present-artifact metadata, latest decisions, review history, non-zero counts, grouped decisions, and linked unreviewed candidates remain unverified until real packages exist.
- Detailed evidence: `docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`.
- Recommended next phase: Phase 8D-6F - Candidate Review Real-Target Package Persistence Completion, followed by a separately authorized 8D-6R read-only rerun.

Previous completed milestone:
- Phase 8D-5 - Candidate Review Read-Only Surface Implementation.
- Status: COMPLETE / READ-ONLY ADMIN DIAGNOSTICS ONLY.
- Admin route: `/gnr8/admin/candidate-review/[siteVersionId]`, guarded by the existing server-side superadmin page guard.
- Projection: `apps/platform/gnr8/architecture/candidate-review-surface-projection.ts` safely validates the persisted review artifact/package, resolves the exact linked Candidate Discovery artifact, derives latest decisions and immutable supersession history, and reports counts, staleness, attention states, and separated diagnostics.
- Grouping: approved, rejected, deferred, and unreviewed; each preserves route, navigation, and sections-by-route Candidate Discovery order.
- States: missing package, empty package, invalid package, all candidates unreviewed, stale relative to latest Candidate Discovery, and superseded history.
- Surface sections: Overview, Decision Summary, Latest Decisions, Event History, Candidate Context, and Diagnostics.
- Safety: no buttons, forms, inputs, approve/reject/defer actions, edit controls, AI controls, reconstruction controls, publishing controls, or trigger controls.
- Focused source/projection tests pass `10 / 10`.
- No Candidate Discovery behavior/persistence/UI, Candidate Review contract or persistence behavior, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, schema, migration, or worker behavior changed.
- Recommended next phase: Phase 8D-6 - Candidate Review End-to-End Admin Verification.

Previous completed milestone:
- Phase 8D-4 - Candidate Review Read-Only Surface Design.
- Status: COMPLETE / DESIGN AND DOCUMENTATION ONLY.
- Canonical design: `docs/architecture/CANDIDATE_REVIEW_SURFACE_DESIGN.md`.
- Recommended location: a dedicated admin Candidate Review page, separate from Candidate Discovery and Site Workspace.
- Sections: Overview, Candidate Decision Summary, Latest Decisions, Review Event History, Candidate Context, and Diagnostics.
- Grouping: approved, rejected, deferred, and unreviewed, each preserving route, navigation, and sections-by-route Candidate Discovery grouping and stable source order.
- States: no review package, empty review package, invalid package, all candidates unreviewed, stale relative to latest Candidate Discovery, and packages with superseded events.
- Projection: `CandidateReviewSurfaceProjection` contains artifact metadata, validation, linked Candidate Discovery summary, decision and event counts, grouped latest decisions, unreviewed candidates, immutable event history, state/attention flags, and separated diagnostics.
- Safety: admin/superadmin-only and read-only, with no approve/reject/defer, edit, AI, reconstruction, publishing, or trigger controls.
- Future relationship: read-only surface -> later review action controls -> later append-only review package snapshot -> later Reconstruction Package handoff.
- No UI, API route, review action, package append, Candidate Discovery or Candidate Review behavior/persistence change, Evidence Capture, Limited Dry Run, reconstruction, generated output, AI, publishing, schema, migration, or worker behavior changed.
- Phase 8D-5 consumed this design without adding review actions or changing persistence.

Previous completed milestone:
- Phase 8D-3 - Candidate Review Persistence Implementation.
- Status: COMPLETE / PERSISTENCE ONLY.
- Canonical implementation: `apps/platform/gnr8/architecture/candidate-review-persistence.ts`; focused tests: `candidate-review-persistence.test.ts`.
- Artifact storage: `candidate_review_package` records append to `candidateReviewPackageArtifacts` under the existing site-version import-provenance boundary; `latestCandidateReviewPackageArtifact` is the authoritative latest pointer.
- Helpers: `persistCandidateReviewPackage(...)`, `loadLatestCandidateReviewPackage(...)`, and `loadCandidateReviewPackageById(...)`.
- Validation before persist: package contract and recursive forbidden-field validation; canonical package identity; exact persisted Candidate Discovery artifact, site-version, and dry-run lineage; reviewed candidate membership; preserved validation and package/event diagnostics.
- Idempotency and history: exact semantic retry reuses the latest artifact despite retry-only package `createdAt`; valid new immutable history appends; omitted, rewritten, reordered, non-extending, stale-supersession, and branching histories fail without writing.
- Metadata: artifact/package/Discovery/site-version/dry-run IDs, reviewed decision counts, contract version, package creation time, persistence time, validation, and diagnostics are retained.
- No review UI or execution, Candidate Discovery behavior/persistence/UI, Evidence Capture, Limited Dry Run, reconstruction, generated output, AI, publishing, schema, migration, or worker behavior changed.
- Recommended next phase: Phase 8D-4 - Candidate Review Read-Only Surface Design.

Previous completed milestone:
- Phase 8D-2 - Candidate Review Persistence Boundary Design.
- Status: COMPLETE / DOCUMENTATION AND ARCHITECTURE ONLY.
- Storage recommendation: dedicated Candidate Review artifact boundary in the existing site-version provenance container, separate from and without mutating Candidate Discovery artifacts; no dedicated table or hybrid dual write yet.
- Canonical artifact kind: `candidate_review_package`.
- Artifact strategy: append-only immutable full-package snapshots, complete immutable review-event history, and a latest pointer. `reviewPackageId` identifies the logical package; `artifactId` identifies one persisted snapshot.
- Required metadata: review package and Discovery artifact IDs, site-version/dry-run lineage, reviewed/approved/rejected/deferred counts, package creation time, persistence time, and contract version.
- Idempotency: exact semantic retries reuse the current artifact; new valid event history appends; equal latest decisions with different history append; retry-only package timestamp variation reuses; contract-version changes append; stale, branching, omitted, or rewritten history is rejected.
- Audit guarantees: immutable events and package snapshots, preserved supersession history, stable reviewer attribution, event/package/persistence timestamp lineage, reproducible latest decisions/counts, source lineage, and explicit concurrency conflicts.
- Provider approval reconciliation: identity, attribution, trusted timestamps, scoped reads, idempotency, insert conflict handling, and fail-closed diagnostics may inform future shared infrastructure. Provider tables, mutable state transitions, execution authority, and lifecycle vocabulary are not reused as Candidate Review truth.
- Relationships remain non-executable: Candidate Discovery -> Review Package without Discovery mutation; Review Package -> future Reconstruction Package / Structure Planning / governed AI Reconstruction only through later contracts and gates.
- No persistence, provenance field, schema, migration, UI, review execution, Candidate Review contract change, Candidate Discovery behavior/persistence/UI, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing, or worker behavior changed.
- Detailed design: `docs/architecture/CANDIDATE_REVIEW_PERSISTENCE_BOUNDARY.md`.
- Phase 8D-3 consumed this design without changing Candidate Discovery persistence or adding a schema boundary.

Previous completed milestone:
- Phase 8D-1 - Candidate Review Contract.
- Status: COMPLETE / CONTRACT ONLY.
- Candidate Review is human governance, approval, auditability, and reconstruction preparation. It is not reconstruction, editing, generation, AI, or publishing.
- The one minimal decision model is exactly `approved | rejected | deferred`; unreviewed is absence of a decision event, not a fourth decision.
- Review applies to the exact Candidate Artifact Instance identified by `(candidateDiscoveryArtifactId, candidateId)`, not candidate identity alone. A later discovery artifact starts unreviewed even when a deterministic candidate ID recurs.
- Minimum immutable lineage is `reviewEventId`, `candidateId`, `candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, stable `reviewerRef`, decision, trusted `decidedAt`, and nullable `supersedesReviewEventId`.
- Latest state is derived from an explicit immutable supersession chain. Superseded decisions and reviewer attribution remain auditable; stale concurrent submissions must not silently create competing latest decisions.
- Approval permits only future Reconstruction Package or Structure Planning consideration. It does not directly trigger AI, reconstruction, workers, generation, persistence, or publishing.
- Phase 7F-13 is compatible historical intent but obsolete as the canonical operational shape; its extra decisions, package-level attribution, and old lineage require future contract migration to the canonical 8C artifact instance.
- No Candidate Review persistence, UI, execution, schema, worker, Candidate Discovery behavior, Evidence Capture behavior, Limited Dry Run behavior, reconstruction, AI, generation, or publishing changed.
- Detailed foundation: `docs/architecture/CANDIDATE_REVIEW_FOUNDATION.md`.
- Canonical module: `apps/platform/gnr8/architecture/candidate-review-contract.ts`.
- Decisions: exactly `approved`, `rejected`, and `deferred`; unreviewed is no event.
- Audit model: readonly immutable events, exact artifact-instance identity, explicit supersession, attributed and deterministic derived latest decisions.
- Validation: required lineage, package/event consistency, supersession graph, exact latest-decision projection, counts, and recursive forbidden generated/execution fields.
- Approval permits future packaging or planning consideration only; it does not execute reconstruction.
- Phase 8D-2 consumed this contract without changing it.

Previous completed milestone:
- Phase 8C-11 - Post-Discovery Boundary Reassessment.
- Status: COMPLETE / SINGLE NEXT BOUNDARY SELECTED.
- Recommended next boundary: **Option A - Candidate Review Foundation**.
- Candidate Review is the direct consumer of the now-validated persisted Candidate Discovery artifacts and is the smallest boundary that turns evidence-backed observations into explicit, attributable human intent.
- The Phase 7F-13 review contract is conceptual scaffolding, not an operational fit for the canonical 8C result. The foundation must reconcile it with `CandidateDiscoveryResult`, preserve exact discovery artifact/candidate lineage, and define actor, timestamp, decision, reason, stale-result handling, idempotency, concurrency, and durable audit history.
- Approval in this boundary may authorize only later package/planning consideration. It must not authorize reconstruction, generation, AI, rendering, workers, or publishing.
- Reconstruction Package Foundation is deferred until approved-candidate review state is durable. Structure Planning Foundation is deferred until approval semantics exist and the reviewed handoff order is resolved.
- No Candidate Review behavior or persistence, reconstruction, Structure Planning, AI, publishing, schema, worker, Evidence Capture, Limited Dry Run, Candidate Discovery behavior, UI, form, button, or control changed.
- Detailed assessment: `docs/architecture/POST_DISCOVERY_BOUNDARY_REASSESSMENT.md`.

Previous completed milestone:
- Phase 8C-10R - Candidate Discovery End-to-End Admin Verification Rerun.
- Status: COMPLETE / PASS - PERSISTED ADMIN CHAIN VERIFIED.
- The canonical latest loader and `CandidateDiscoverySurfaceProjection` loaded the exact requested ODV and ViroiDoc artifacts from production persistence.
- ODV artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` projects `4` candidates (`1 / 1 / 2` route/navigation/section), `0 / 0` limitations/blockers, valid status with no errors or warnings, and `ready` state.
- ViroiDoc artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` projects `5` candidates (`1 / 1 / 3`), `18 / 0` limitations/blockers, valid status with no errors or warnings, and `candidates_with_limitations`; all limitations are warnings.
- Both projections group their section candidates under `/`, have no unscoped sections, and preserve route and navigation groups.
- Page source contains Candidate Discovery, Route Candidates, Navigation Candidates, and Section Candidates By Route and excludes buttons, forms, inputs, textareas, selects, review, approve, reject, AI, reconstruction, and publish controls.
- Focused Candidate Discovery tests pass `36 / 36`. `cd apps/platform && pnpm run vercel-build` passes with existing unrelated lint warnings and includes the dynamic Candidate Discovery route. `git diff --check` passes.
- No read-only projection or display defect was found. No application code or behavior changed.
- Detailed evidence: `docs/architecture/CANDIDATE_DISCOVERY_ADMIN_VERIFICATION.md`.
- Recommended next phase: Phase 8C-11 - Candidate Discovery Next-Boundary Reassessment, documentation/read-only only, with no Candidate Review, AI, reconstruction, generation, publishing, trigger, schema, worker, form, button, or other control.

Previous completed milestone:
- Phase 8C-10F - Candidate Discovery Real-Target Persistence Completion.
- Status: COMPLETE / PASS - REAL-TARGET PERSISTENCE READY.
- Existing helpers loaded the persisted ODV and ViroiDoc `FirstLimitedDryRunOutput` records, ran and validated `buildCandidateDiscoveryResult(...)`, persisted through `persistCandidateDiscoveryResult(...)`, and reloaded through `loadLatestCandidateDiscoveryResult(...)` scoped to each dry run.
- ODV artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` reloads with `4` candidates (`1 / 1 / 2` route/navigation/section), zero limitations, zero blockers, and valid status with no errors or warnings.
- ViroiDoc artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` reloads with `5` candidates (`1 / 1 / 3`), `18` limitations, zero blockers, and valid status with no errors or warnings.
- Both reloaded artifact IDs match the persistence refs and retain builder version `8C-3` and contract version `8C-1`. Each target advanced from zero to one Candidate Discovery artifact.
- Recursive forbidden-field checks found no generated, reconstruction, or publishing fields. Full provenance comparisons with only Candidate Discovery history/latest fields removed confirmed no Candidate Review, AI, reconstruction, generated output, publishing, or other provenance artifact changed.
- No wrapper, application code, schema, importer, Evidence Capture, Limited Dry Run, UI, worker, Candidate Review, AI, reconstruction, generation, or publishing behavior changed. Phase 8C-10 was not rerun.
- Detailed evidence: `docs/architecture/CANDIDATE_DISCOVERY_ADMIN_VERIFICATION.md`.
- Recommended next phase: Phase 8C-10R - Candidate Discovery End-to-End Admin Verification Rerun, read-only against the two persisted artifacts.

Previous completed milestone:
- Phase 8C-10 - Candidate Discovery End-to-End Admin Verification.
- Status: COMPLETE / FAIL - REAL-TARGET PERSISTENCE PRECONDITION MISSING.
- Read-only production verification confirmed that ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` both exist with runtime provenance summaries.
- Both targets contain `0` persisted `candidate_discovery_result` artifacts and no latest Candidate Discovery pointer. The canonical latest loader returns `null`; the surface projection correctly returns `unavailable`, `missing`, zero counts, and `CANDIDATE_DISCOVERY_RESULT_MISSING`.
- The expected ODV `4` candidates and ViroiDoc `5` candidates with `18 / 0` limitations/blockers cannot be verified through the required persisted chain. Earlier in-memory validation does not satisfy this phase.
- Focused Candidate Discovery contract, builder, persistence, projection, and page-source tests pass `31 / 31`.
- Page source contains Candidate Discovery, Route Candidates, Navigation Candidates, and Section Candidates By Route and excludes buttons, forms, inputs, review, approve, reject, AI, reconstruction, and publish controls.
- `cd apps/platform && pnpm run vercel-build` passes with existing unrelated lint warnings and includes the Candidate Discovery dynamic route.
- No display defect was found. No application code, persistence, trigger, review, AI, reconstruction, publishing, schema, worker, form, button, or other control changed.
- Detailed evidence: `docs/architecture/CANDIDATE_DISCOVERY_ADMIN_VERIFICATION.md`.
- Recommended next phase: Phase 8C-10F - Candidate Discovery Real-Target Persistence Completion, separately authorizing deterministic persistence for only the two proven targets through existing helpers, then rerunning 8C-10.

Previous completed milestone:
- Phase 8C-9 - Candidate Discovery Read-Only Surface Implementation.
- Status: COMPLETE / READ-ONLY ADMIN SURFACE ONLY.
- Added `CandidateDiscoverySurfaceProjection`, which defensively parses the latest stored artifact and exposes artifact lineage, validation, candidate and confidence counts, result-level limitations/blockers, diagnostics, and safe empty/attention states.
- Added `/gnr8/admin/candidate-discovery/[siteVersionId]` behind `requireSuperadminUserIdForPage()`.
- The page renders Overview, Candidate Summary, Candidate List, and Diagnostics; routes appear first, navigation second, and sections are grouped by first route appearance while preserving builder-relative order.
- Missing, invalid, blocked, no-candidate, limitation, and blocker states are explicit. Invalid stored values return diagnostics without throwing or rewriting persistence.
- No buttons, forms, inputs, review decisions, reconstruction, AI, editing, triggers, or publishing controls are present.
- Focused projection and page-source tests pass `11 / 11`.
- No importer, Evidence Capture, worker, preview, Limited Dry Run, Candidate Discovery builder/persistence, Candidate Review, reconstruction, AI, generation, publishing, schema, migration, or runtime behavior changed.
- Recommended next phase: Phase 8C-10 - Candidate Discovery End-to-End Admin Verification.

Previous completed milestone:
- Phase 8C-8 - Candidate Discovery Read-Only Surface Design.
- Status: COMPLETE / DESIGN AND DOCUMENTATION ONLY.
- Created `docs/architecture/CANDIDATE_DISCOVERY_SURFACE_DESIGN.md` and recommended a dedicated admin Candidate Discovery page for persisted `candidate_discovery_result` artifacts.
- Defined Overview, Candidate Summary, and Candidate List sections with artifact lineage, validation, route/navigation/section and confidence counts, evidence refs, dry-run refs, limitations, and diagnostics.
- Defined stable route-first, navigation-second, and sections-grouped-by-route presentation while preserving builder output order.
- Defined missing, invalid, blocked, no-candidate, limitation, and blocker states and a defensive `CandidateDiscoverySurfaceProjection` read model.
- The surface is admin/superadmin-only and read-only, with no approval/rejection, Candidate Review, reconstruction, AI, edit, publish, or trigger controls.
- No UI, API route, Candidate Review package, reconstruction output, generated React/block/content, CMS binding, publishing artifact, schema, migration, or importer/Evidence Capture/worker/preview/Limited Dry Run/Candidate Discovery behavior was created or changed.
- Recommended next phase: Phase 8C-9 - Candidate Discovery Read-Only Surface Implementation.

Previous completed milestone:
- Phase 8C-7 - Candidate Discovery Persistence Implementation.
- Status: COMPLETE / PERSISTENCE ONLY.
- Created `apps/platform/gnr8/architecture/candidate-discovery-persistence.ts` and its focused test.
- `persistCandidateDiscoveryResult(...)` stores validated `candidate_discovery_result` records in the existing site-version import-provenance summary under append-only `candidateDiscoveryResultArtifacts`, and advances `latestCandidateDiscoveryResultArtifact` for changed results. No table or migration was added.
- `loadLatestCandidateDiscoveryResult(...)` supports site-version and optional dry-run scoping. `loadCandidateDiscoveryResultById(...)` requires both site-version and artifact identity. Reads return cloned full artifact records.
- Pre-write validation preserves complete diagnostics, rejects recursive generated/reconstruction/publishing fields, rejects mismatched lineage, and requires explicit builder and contract versions.
- Persisted metadata includes artifact kind/ID, site-version/dry-run/discovery lineage, candidate count/types, validation status and diagnostics, limitation/blocker counts, versions, result creation time, and persistence time.
- Equivalent latest results under the same site version, dry run, builder version, and contract version reuse the existing artifact without a write; changed results append and advance the pointer.
- Focused Candidate Discovery contract, builder, and persistence tests pass `20 / 20`.
- No Candidate Review, UI, reconstruction, AI, React/block generation, CMS binding, publishing artifact, schema, migration, worker job, or importer/Evidence Capture/preview/Limited Dry Run behavior was added or changed.
- Recommended next phase: Phase 8C-8 - Candidate Discovery Read-Only Surface Design.

Previous completed milestone:
- Phase 8C-6 - Candidate Discovery Persistence Boundary Design.
- Status: COMPLETE / DESIGN AND DOCUMENTATION ONLY.
- Created `docs/architecture/CANDIDATE_DISCOVERY_PERSISTENCE_BOUNDARY.md` and recommended the existing site-version import-provenance artifact boundary first, with no new table.
- Canonical future artifact kind: `candidate_discovery_result`, stored as immutable append-only records with a deterministic latest pointer.
- Required metadata covers artifact/result lineage, candidate counts and types, valid status, limitation and blocker counts, result and persistence timestamps, and explicit builder/contract versions.
- Future helper boundaries are `persistCandidateDiscoveryResult(...)`, `loadLatestCandidateDiscoveryResult(...)`, and `loadCandidateDiscoveryResultById(...)`.
- Idempotency reuses the latest artifact for the same `siteVersionId + dryRunId` when canonical result semantics and versions are equivalent; changed results append and advance the latest pointer.
- The artifact remains read-only review input. No Candidate Discovery persistence, artifact, provenance field, table, schema, migration, Candidate Review, reconstruction, AI, generated React/block, CMS binding, publishing, runtime, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior was created or changed.
- Recommended next phase: Phase 8C-7 - Candidate Discovery Persistence Implementation, limited to the existing provenance artifact boundary and focused tests.

Previous completed milestone:
- Phase 8C-5 - Candidate Discovery Real-Site Dry-Run Artifact Validation.
- Status: COMPLETE / PASS / VALIDATION ONLY.
- Loaded the exact ODV and ViroiDoc persisted `FirstLimitedDryRunOutput` artifacts through existing read helpers and ran `buildCandidateDiscoveryResult(...)` in memory without candidate persistence.
- ODV result: four candidates, `1 / 1 / 2` route/navigation/section, zero limitations, zero blockers, valid output, and no forbidden generated fields.
- ViroiDoc result: five candidates, `1 / 1 / 3`, all 18 source limitations preserved, zero blockers, valid output, and no forbidden generated fields. Its 29-item navigation remains one navigation candidate.
- The first real run exposed compact persisted `layout-region-*` and `section-boundary-*` refs that the fixture-shaped registry did not classify. The bounded deterministic fix recognizes those existing Evidence Capture ref families, restoring the navigation and dependent route candidates.
- Focused contract, builder, regression, and fixture tests pass `19 / 19`; final real-artifact assertions pass for both sites. Final real behavior matches 8C-4 expectations.
- No Candidate Discovery artifact, Candidate Review package, reconstruction output, generated React/block, CMS binding, publishing artifact, migration, or schema change was created. No persistence, review, reconstruction, AI, generation, publishing, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior changed.
- Recommended next phase: Phase 8C-6 - Candidate Discovery Persistence Boundary Design, documentation and contract assessment only.

Previous completed milestone:
- Phase 8C-4 - Candidate Discovery Builder Validation On Known Fixtures.
- Status: COMPLETE / VALIDATION AND TESTS ONLY.
- Added deterministic ODV-shaped and ViroiDoc-shaped fixture tests without real-site execution. ODV validates `1 / 1 / 2` route/navigation/section candidates, four total candidates, zero limitations, zero blockers, valid output, and stable IDs.
- ViroiDoc validates `1 / 1 / 3`, five total candidates, preservation of all 18 source limitations, applicable warning propagation, confidence caps, zero blockers, valid output, and stable IDs.
- Edge fixtures validate one navigation candidate for a 29-item navigation model, deterministic duplicate section identity omission with one blocker diagnostic, and a blocked empty result when required evidence refs are missing.
- The Candidate Discovery contract, builder, and fixture suite passes `18 / 18`. No deterministic builder defect was found, so builder behavior did not change.
- No persistence, Candidate Review, reconstruction, AI, React/block generation, CMS binding, publishing, schema, migration, importer, Evidence Capture, worker, preview, Limited Dry Run behavior, or real-site execution changed.
- Recommended next phase: Phase 8C-5 - Candidate Discovery Real-Site Dry-Run Artifact Validation.

Previous completed milestone:
- Phase 8C-3 - Candidate Discovery Builder Implementation.
- Status: COMPLETE / PURE DETERMINISTIC BUILDER ONLY.
- Created `apps/platform/gnr8/architecture/candidate-discovery-builder.ts` and its focused test.
- `buildCandidateDiscoveryResult(...)` consumes explicit site/dry-run lineage, one valid `FirstLimitedDryRunOutput`, and optional supplied Evidence Capture lineage; it returns the existing `CandidateDiscoveryResult` contract without persistence or side effects.
- Implemented only one-to-one `route`, `navigation`, and generic `section` candidates. Source region types remain diagnostics only and do not create specialized candidates.
- IDs are stable source-derived percent-escaped identities; canonical order is route-scope order, then route, escaped navigation identity, and source section order. Duplicate identity collision sets are omitted with one deterministic blocker.
- Confidence never exceeds the source model. Applicable warnings cap `HIGH` at `MEDIUM`; blockers or unresolved required evidence suppress candidate creation.
- Dry-run and optional Evidence Capture limitations are retained in a lossless master ledger; candidates carry unchanged applicable ledger subsets.
- Builder output is passed through `validateCandidateDiscoveryResult(...)`; blocked inputs return no candidates with deterministic blocker limitations and diagnostics.
- Focused Candidate Discovery contract and builder tests pass, including mapping, determinism, ordering, confidence, limitation propagation, duplicate identities, forbidden fields, and output validation.
- No persistence, Candidate Review, reconstruction, AI, React/block generation, CMS binding, publishing, schema, migration, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior changed.
- Recommended next phase: Phase 8C-4 - Candidate Discovery Builder Validation On Known Fixtures.

Previous completed milestone:
- Phase 8C-2 - Candidate Discovery Builder Design.
- Status: COMPLETE / DESIGN AND DOCUMENTATION ONLY.
- Created `docs/architecture/CANDIDATE_DISCOVERY_BUILDER_DESIGN.md` and defined the exact mapping implemented by 8C-3.

Previous completed milestone:
- Phase 8C-1 - Candidate Discovery Contract.
- Status: COMPLETE / CONTRACT ONLY.
- Created `apps/platform/gnr8/architecture/candidate-discovery-contract.ts` and its focused test.
- Canonical types: `CandidateDiscoveryResult`, `Candidate`, `CandidateEvidenceRef`, `CandidateLimitation`, `CandidateConfidence`, `CandidateType`, `CandidateStatus`, and `CandidateDiscoveryValidationResult`.
- Allowed types: `route`, `navigation`, `section`. Allowed statuses: `discovered`, `valid`, `invalid`, `blocked`.
- Validation requires identifiers and both Evidence Capture and Limited Dry Run refs, verifies count/type summaries, and recursively rejects generated, reconstruction, and publishing fields.
- Empty builder copies identifiers and creates `candidateCount = 0`, no types, and no candidates. It creates no executable status or output.
- No discovery/review execution, candidate generation, reconstruction, AI, React/block generation, CMS binding, persistence, publishing, schema, migration, importer, Evidence Capture, worker, preview, or Limited Dry Run behavior changed.
- Recommended next phase: Phase 8C-2 - Candidate Discovery Builder Design, contract/design only with no execution. Completed by the latest milestone above.

Earlier completed milestone:
- Phase 8C-0 - Candidate Discovery Foundation Design.
- Status: COMPLETE / DESIGN ONLY.
- Created `docs/architecture/CANDIDATE_DISCOVERY_FOUNDATION.md`.
- Defined a candidate as a non-executable, evidence-backed proposal that an existing Limited Dry Run route, navigation structure, or section may later become a reconstruction planning unit.
- Allowed inputs are the Evidence Capture baseline, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, `NavigationEvidence`, and one valid `FirstLimitedDryRunOutput`. AI guesses, generated content, React/blocks, preview product truth, live source reads, and unpublished runtime state are forbidden.
- Proposed contracts: `CandidateDiscoveryResult`, `Candidate`, `CandidateEvidenceRef`, `CandidateLimitation`, `CandidateConfidence`, and `CandidateType`.
- Phase 8C-0 considered later specialized families; Phase 8C-1 defers them and permits route, navigation, and section only.
- Deterministic rules cover result/model eligibility, stable IDs, input ordering, confidence copied or conservatively reduced from source models, complete evidence refs, and lossless limitation propagation.
- Review boundary: Candidate Discovery identifies; future Candidate Review decides; future Reconstruction Planning assigns approved intent. Discovery cannot approve, plan execution, reconstruct, generate, persist runtime mutations, or publish.
- Phase 7F-12 remains the older metadata-only control-plane envelope. 8C-0 refines its missing evidence-to-candidate semantics and requires a future implementation to avoid parallel taxonomies or sources of truth.
- No implementation, candidate/review execution, reconstruction, AI, React/block generation, CMS bindings, publishing artifacts, persistence changes, schema changes, migrations, or importer/Evidence Capture/worker/preview/Limited Dry Run behavior changes were made.
- Recommended next phase: Phase 8C-1 - Candidate Discovery Contract, formal shapes and validation only; no discovery execution or persistence.

Previous completed milestone:
- Phase 8B-12N - Second Real-Site Limited Dry Run Validation.
- Status: COMPLETE / PASS.
- Selected existing site: ViroiDoc, `siteVersionId = e9257245-0256-4291-9989-66a33ee6741e`, a public research-project presentation site with visible navigation, no login gate, and no ecommerce-heavy or application-like flow.
- The old record had provenance and rendered DOM but lacked expansion evidence. The proven production path created fresh `siteVersionId = e26b0754-988b-45b9-9e24-8e213179b6cf` for `https://www.viroidoc.eu/?gnr8_8b_12n=20260618`.
- Evidence passed: rendered DOM `1`, layout geometry `1` with `4` regions, section evidence `3`, navigation evidence `1` with `29` items.
- Existing bounded chain only: transient metadata-only package, builder, validator, persistence, latest-output readback, and read-only projection. Candidate discovery and candidate review were not executed.
- Authoritative latest artifact: `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc`.
- Output passed: `outputStatus = valid`, Route/Navigation/Section counts `1 / 1 / 3`, limitations/blockers `18 / 0`, no validation errors or warnings, and exact semantic readback.
- Surface passed: projection `present / valid / valid`; route `/`, core ViroiDoc navigation labels, and three section IDs visible; no action controls.
- Portability result: the unchanged bounded Evidence Capture and Limited Dry Run chain is now proven on two distinct public real sites. The richer second sample exposes more non-blocking limitations and broader navigation extraction, which should be audited before Candidate Discovery work.
- No importer, Evidence Capture, worker, preview, dry-run builder/persistence/API/UI, reconstruction, candidate, AI, generation, publishing, or schema behavior changed. No CMS binding, reconstruction output, generated React/GNR8 block, publishing artifact, migration, or worker job was created.
- Detailed evidence: `docs/architecture/SECOND_REAL_SITE_LIMITED_DRY_RUN_VALIDATION.md`.
- Recommended next phase: Phase 8B-12O - Cross-Site Evidence and Model Quality Re-Assessment, documentation/read-only only.

Previous completed milestone:
- Phase 8B-12M - Limited Dry Run Result Re-Assessment / Package Preparation Boundary.
- Status: COMPLETE.
- Audit/scoring/documentation only; no import, capture, dry-run output, candidate/review artifact, reconstruction, AI, generation, publishing, migration, worker job, schema, or application behavior change.
- Re-assessment: 8B-12L proves the unchanged bounded Route/Navigation/Section chain works end to end on one simple real site, including validation, persistence, readback, and read-only projection. It does not prove cross-site generalization, dynamic/runtime mutation handling, reconstruction-grade evidence, candidate/review execution, or a durable ready package lifecycle.
- Readiness scores: conceptual `92/100` (from `90/100`); execution `88/100` (from `84/100`).
- Capability boundary: capture/evidence/builder/persistence/surface are proven once on a real site; baseline persistence remains partial; discovery/review are contract-only; Reconstruction Package is metadata-only; AI reconstruction, React/block generation, and publishing are not implemented.
- Options assessed: Candidate Discovery, Candidate Review, Limited Dry Run package formalization, Runtime Mutation Capture, and second real-site validation.
- Recommended next phase: Phase 8B-12N - Second Real-Site Limited Dry Run Validation, using the unchanged bounded chain on one additional simple public site before new behavior is implemented.
- Detailed assessment: `docs/architecture/LIMITED_DRY_RUN_RESULT_REASSESSMENT.md`.

Previous completed milestone:
- Phase 8B-12L - Limited Dry Run Real-Site Retry On Fresh Captured SiteVersion.
- Status: COMPLETE / PASS.
- Target: `siteVersionId = 09dce7ea-d860-4f60-a1eb-26c3335b302e`, source `https://www.odv-cvijanovic.si/?gnr8_f12=20260617`.
- Preflight passed: baseline exists; rendered DOM and layout geometry paths/files exist; layout/section/navigation evidence counts are `1 / 2 / 1`; navigation item count is `6`.
- No ReconstructionDryRunPackage was persisted. The existing helper produced a contract-valid blocked package from transient metadata-only input; candidate discovery and candidate review were not executed and no candidate/review artifacts were created.
- Existing builder and validation produced `outputStatus = valid`, Route/Navigation/Section counts `1 / 1 / 2`, limitations/blockers `0 / 0`, with no validation errors or warnings.
- Persisted `first_limited_dry_run_output` artifact: `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445`.
- Latest output readback and read-only surface projection passed with `artifactStatus = present`, `outputStatus = valid`, `validationStatus = valid`, and counts `1 / 1 / 2`.
- Forbidden-field scanning found no React, GNR8 blocks, CMS bindings, content model, design token model, publishing artifacts, or generated output containers. Admin page source contains the required model labels and no action controls.
- No application code, schema, importer, Evidence Capture, worker, preview, reconstruction, candidate, AI, generation, or publishing behavior changed.
- Detailed evidence: `docs/architecture/LIMITED_DRY_RUN_REAL_SITE_RETRY.md`.
- Phase 8B-12M subsequently completed the reassessment and selected Phase 8B-12N Second Real-Site Limited Dry Run Validation.

Previous completed milestone:
- Phase 8B-12K-F13 - Evidence Capture Readiness Re-Assessment.
- Status: COMPLETE.
- Updated `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the post-F12 scores, Evidence Capture readiness matrix, model feasibility matrix, blockers, and next-phase decision.
- Updated `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`, `docs/ai/GNR8_CURRENT_STATE.md`, and this handoff.
- F13 was audit, scoring, and documentation only. It did not run import or capture retry, Limited Dry Run, create FirstLimitedDryRun outputs, run reconstruction, add AI, generate React/GNR8 blocks, create CMS bindings, publish, or create migrations/schema changes.
- Readiness moved from conceptual `86/100` and execution `77/100` to conceptual `90/100` and execution `84/100`.
- F12 moved the system back into readiness for the existing bounded Limited Dry Run Route, Navigation, and Section chain: rendered capture, screenshots, rendered DOM, layout geometry, section evidence, navigation evidence, worker readiness, public source URL handling, and timeout readiness are ready. Computed style coverage and baseline persistence remain partial.
- Model feasibility: route `feasible`, navigation `feasible`, section `feasible`, content `risky`, block `not_ready`, design token `not_ready`.
- Remaining blockers: candidate discovery execution and candidate review execution are missing; Limited Dry Run has not run on fresh `siteVersionId = 09dce7ea-d860-4f60-a1eb-26c3335b302e`; no AI, reconstruction, generation, or publishing execution is authorized.
- Recommended next phase: Phase 8B-12L - Limited Dry Run Real-Site Retry On Fresh Captured SiteVersion, using the existing limited Route, Navigation, and Section boundary.

Previous completed milestone:
- Phase 8B-12K-F12 - Fresh Production Import Capture Verification Retry.
- Status: COMPLETE / PASS.
- Updated `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`.
- Updated `docs/architecture/CAPTURE_EXPANSION_EVIDENCE_PERSISTENCE_DIAGNOSIS.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F12 ran one valid fresh production import verification for `https://www.odv-cvijanovic.si/?gnr8_f12=20260617` through the normal fresh path: `preallocateSiteVersionIdentity(...)`, `importPublicSinglePageUrlToSnapshot(...)`, and `runScopedImportPipeline(...)`. The existing-siteVersion retry path was not used.
- Required env was confirmed without printing the token: `DATABASE_URL` present, worker enabled `true`, worker base URL `https://gnr8-worker.vercel.app`, worker shared token present, and worker timeout `30000`.
- Preflight passed: effective worker client timeout `30000ms`; worker readiness ready with `healthHttpStatus = 200`; deployed capture routes existed via `HEAD` returning `405` with `x-matched-path`; target URL returned `200 OK`, `text/html; charset=UTF-8`, `29849` bytes; source URL sent to worker was public `https`, not `file://`.
- New runtime version: `siteVersionId = 09dce7ea-d860-4f60-a1eb-26c3335b302e`, `siteId = site_135623aa7648136dba36`, `versionNo = 1`, reused = false, runtime artifact `fdcdb547-6fc6-4542-822d-1f4264812265`, raw import artifact `4d046e09-ec56-4a17-830b-1539526636e4`.
- Worker/capture result: worker request sent to `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker`; worker returned HTTP `200 OK` in `15048ms`; persisted diagnostics include `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_RESPONSE_PARSED`, `CAPTURE_WORKER_RESULT_ACCEPTED`, `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_SUCCEEDED`, `DOM_SERIALIZATION_SUCCEEDED`, `SCREENSHOT_CAPTURE_SUCCEEDED`, `STYLE_SAMPLING_SUCCEEDED`, and `CAPTURE_WORKER_RENDERED_DOM_USED`.
- Capture result: `renderedCaptureStatus = available`, `renderedDomQuality = strong`, `sourceMode = rendered_dom`, `importFidelityStatus = high_fidelity_import`, screenshots `2`, computed style samples `6`, rendered DOM length `40043`, rendered DOM node count `292`, raw imported files persisted `384`, and external asset fallbacks `0`.
- Evidence result: `evidenceCaptureBaselineArtifact` exists with `artifactStatus = baseline_partial`; `captureEvidence.renderedDomPath` exists; `captureEvidence.layoutGeometryPath` exists; layout geometry evidence count `1`, layout geometry region count `3`, section evidence count `2`, navigation evidence count `1`, and navigation item count `6`.
- Materialization diagnostics persisted in `importDiagnosticCodes`: `RENDERED_DOM_HTML_BASELINE_INPUT_PROVIDED`, `LAYOUT_GEOMETRY_BASELINE_INPUT_PROVIDED`, `LAYOUT_GEOMETRY_PATH_PERSISTED`, `LAYOUT_GEOMETRY_EVIDENCE_MATERIALIZED`, `SECTION_BOUNDARY_EVIDENCE_MATERIALIZED`, and `NAVIGATION_EVIDENCE_MATERIALIZED`.
- CMS slot inference ran but persisted CMS slot count was `0` via no-op `upsertContentSlots`, preserving the no-CMS-binding boundary.
- F12 did not run Limited Dry Run, create FirstLimitedDryRun outputs, run reconstruction, add AI, generate React/GNR8 blocks, publish, mutate CMS bindings, create migrations, or modify code/schema/importer/preview/dry-run/reconstruction/AI/publishing/worker behavior.
- Recommended next phase: Phase 8B-12K-F13 - Evidence Capture Readiness Re-Assessment. Reassess First Limited Dry Run readiness against the new passing fresh production Evidence Capture baseline. Do not run Limited Dry Run, FirstLimitedDryRun output creation, reconstruction, AI, React/block generation, publishing, CMS binding mutation, migrations, or additional fresh imports unless separately authorized.

Previous completed milestone:
- Phase 8B-12K-F11 - Fresh Import Baseline Capture Expansion Wiring.
- Status: COMPLETE.
- Updated `apps/platform/gnr8/site/scoped-import-pipeline.ts`.
- Updated `apps/platform/gnr8/site/scoped-import-pipeline.test.ts`.
- Updated `docs/architecture/CAPTURE_EXPANSION_EVIDENCE_PERSISTENCE_DIAGNOSIS.md`.
- Updated `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F11 changed only fresh import Evidence Capture baseline persistence/wiring. It did not modify worker behavior, browser capture behavior, importer semantics, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema.
- F11 did not rerun fresh production import, Limited Dry Run, FirstLimitedDryRun output creation, reconstruction, AI, React/block generation, publishing, migrations, or schema changes.
- `buildImportProvenanceSummary(...)` now persists `captureEvidence.layoutGeometryPath` when the existing canonical rendered capture file `rendered/layout-geometry.json` is present.
- `runScopedImportPipeline(...)` now reads already-persisted rendered DOM HTML from `captureEvidence.renderedDomPath` and passes it to `attachEvidenceCaptureBaselineArtifact(...)`.
- `runScopedImportPipeline(...)` now passes `snapshot.renderedCapture.layoutGeometryEvidence` to `attachEvidenceCaptureBaselineArtifact(...)`.
- Existing deterministic builders now receive enough captured input to materialize `captureExpansionEvidence.layoutGeometryEvidence`, `sectionBoundaryEvidence`, and `navigationEvidence` when rendered DOM HTML and layout geometry are available.
- Missing rendered HTML or layout geometry keeps the Evidence Capture baseline partial and records missing-input diagnostics instead of failing the import.
- Added/reused diagnostics: `EVIDENCE_CAPTURE_BASELINE_INPUTS_READY`, `EVIDENCE_CAPTURE_BASELINE_EXPANSION_MATERIALIZED`, persisted `importDiagnosticCodes` for provided/missing rendered DOM baseline input, layout geometry input, layout geometry path, and materialized/missing layout/section/navigation evidence. Write-path provenance summaries now include rendered DOM path presence, layout geometry path presence/path, and baseline expansion counts when available.
- Focused F11 tests passed: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test --test-name-pattern 'F11|Evidence Capture baseline expansion|rendered DOM HTML is missing' gnr8/site/scoped-import-pipeline.test.ts` from `apps/platform`.
- Full `gnr8/site/scoped-import-pipeline.test.ts` was also attempted; the new F11 subtests passed, then unrelated existing tests failed because default runtime-store dependencies required missing `DATABASE_URL`.
- Recommended next phase: Phase 8B-12K-F12 - Fresh Production Import Capture Verification Retry. Run a fresh production import verification only in F12 to confirm successful rendered capture now feeds persisted rendered HTML/layout geometry into the Evidence Capture baseline and materializes layout/section/navigation evidence. Do not run Limited Dry Run, FirstLimitedDryRun output creation, reconstruction, AI, React/block generation, publishing, migrations, or schema changes in F12 unless separately authorized.

Previous completed milestone:
- Phase 8B-12K-F10 - Capture Expansion Evidence Persistence Diagnosis.
- Status: COMPLETE.
- Created `docs/architecture/CAPTURE_EXPANSION_EVIDENCE_PERSISTENCE_DIAGNOSIS.md`.
- Updated `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F10 was diagnostics/documentation only. It did not modify importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, import execution, capture retry, Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, or migration.
- Target inspected: `siteVersionId = 9c1fdafd-ff1a-4d85-8559-5860d5775c1f`.
- Persisted rendered capture data exists: rendered DOM path exists, computed styles path exists, acquisition evidence path exists, rendered-capture manifest path exists, and both screenshot paths exist. The rendered-capture manifest reports layout geometry captured true, region count `3`, viewport `1366 x 768`, and `layoutGeometryEvidence.length = 1`.
- Persisted Evidence Capture baseline is missing that geometry: `captureEvidence.layoutGeometryPath` is absent, `persistedRefs.layoutGeometryRef = null`, `captureExpansionEvidence.layoutGeometryEvidence.length = 0`, `sectionBoundaryEvidence.length = 0`, and `navigationEvidence.length = 0`.
- Builder path finding: `buildEvidenceCaptureBaselineArtifact(...)` calls `createLayoutGeometryEvidence(...)`, `createSectionBoundaryEvidence(...)`, and `createNavigationEvidence(...)`, but the fresh import attach call passes `renderedHtml: undefined` and does not pass `layoutGeometryEvidence`. `artifactStatus = baseline_partial` does not block the expansion builders.
- Import pipeline finding: `importPublicSinglePageUrlToSnapshot(...)` and worker mapping carry `RenderedCaptureResult.layoutGeometryEvidence` and materialize `rendered/layout-geometry.json`; `buildImportProvenanceSummary(...)` omits `captureEvidence.layoutGeometryPath`; `runScopedImportPipeline(...)` omits rendered HTML and layout geometry when attaching the baseline artifact.
- Root cause classification: primary E. persistence mapping missing. Worker capture and rendered-capture manifest persistence have layout geometry, but the fresh baseline artifact/provenance mapping does not carry geometry or rendered HTML into the Evidence Capture baseline expansion builders. The read model is not the primary cause.

Earlier completed milestone:
- Phase 8B-12K-F9 — Fresh Production Import Capture Retry With 30s Worker Timeout.
- Status: COMPLETE with FAIL classification.
- Updated `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F9 ran one fresh production import for `https://www.odv-cvijanovic.si/?gnr8_f9=20260617` with `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000` explicitly set. Required env was confirmed without printing the token: `DATABASE_URL` present, worker enabled `true`, worker base URL `https://gnr8-worker.vercel.app`, worker shared token present, timeout `30000`.
- Preflight passed: effective worker client timeout `30000ms`; worker readiness ready with `healthHttpStatus = 200`; deployed routes existed (`HEAD /internal/gnr8/rendered-capture-worker` and `HEAD /api/internal/gnr8/rendered-capture-worker` returned `405` with matching `x-matched-path`); target URL returned `200 OK`, `text/html; charset=UTF-8`, `29849` bytes; worker source URL was public `https`, not `file://`.
- New runtime version: `siteVersionId = 9c1fdafd-ff1a-4d85-8559-5860d5775c1f`, `siteId = site_bfabe23af164fb00b3ab`, `versionNo = 1`, reused = false, runtime artifact `f6cecf7a-fe52-461c-a3d0-0bd2a485f33f`, raw import artifact `61f44492-828a-4566-8ec9-c00e3b621f2d`.
- F9 used the fresh import path (`importPublicSinglePageUrlToSnapshot(...)` + `runScopedImportPipeline(...)`). The existing-siteVersion retry path was not used. CMS slot inference ran, but persisted CMS slot count was `0` to honor the F9 no-CMS-binding boundary.
- Worker request/result: request sent to `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker`; worker returned HTTP `200 OK` in `15373ms`; diagnostics included `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_RESPONSE_PARSED`, worker-side request receipt with public source URL, `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_SUCCEEDED`, `DOM_SERIALIZATION_SUCCEEDED`, `SCREENSHOT_CAPTURE_SUCCEEDED`, `STYLE_SAMPLING_SUCCEEDED`, and `CAPTURE_WORKER_RENDERED_DOM_USED`.
- Capture result: `renderedCaptureStatus = available`, `renderedDomQuality = strong`, `sourceMode = rendered_dom`, `importFidelityStatus = high_fidelity_import`, screenshots `2`, computed style samples `6`, rendered DOM node count `311`, raw imported files persisted `397`, external asset fallbacks `0`, and `evidenceCaptureBaselineArtifact` exists with `artifactStatus = baseline_partial`.
- Evidence result: layout geometry count `0`, section evidence count `0`, navigation evidence count `0`; layout geometry captured false, section evidence captured false, navigation captured false.
- Failure classification: primary H. capture expansion evidence missing. F9 is not A target unreachable, B worker not reached, C worker auth failed, D worker browser/playwright failed, E navigation failed, F capture output invalid, G baseline persistence failed, or I timeout after `30000ms`.
- Recommended next phase: Phase 8B-12K-F10 Capture Expansion Evidence Persistence Diagnosis. Focus only on why successful fresh rendered capture still persists no layout geometry, section evidence, or navigation evidence. Do not run Limited Dry Run, FirstLimitedDryRun output, reconstruction, AI, React/block generation, publishing, schema changes, additional fresh imports, existing-siteVersion retries, or source-serving endpoint work without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-F8 — Fresh Import Worker Capture Timeout Diagnosis.
- Status: COMPLETE.
- Updated `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F8 was diagnostics/documentation only. It did not modify importer behavior, Evidence Capture behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, import retry behavior, or capture retry behavior. It did not rerun import, retry capture, create FirstLimitedDryRun output, create reconstruction output, generate React, generate GNR8 blocks, create CMS bindings, create publishing artifacts, or create migrations.
- Timeout sources audited: `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`, worker client HTTP timeout, readiness health timeout, request readiness policy, request `capture.timeoutBudgetMs`, worker contract clamps, capture job wait budget, capture job attempt budget, platform proxy route behavior, worker execution timeout, and local smoke/import runner context.
- Effective F7 timeout origin: the rendered-capture worker HTTP client config resolved `timeoutMs = 1000` and used `AbortSignal.timeout(timeoutMs)` for the capture POST. Persisted F7 diagnostics show `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED.details.timeoutMs = 1000`, `CAPTURE_WORKER_REQUEST_STARTED.details.timeoutMs = 1000`, `CAPTURE_WORKER_REQUEST_BUILT.details.timeoutMs = 1000`, and `CAPTURE_WORKER_HTTP_ERROR.details.timeoutMs = 1000`.
- Not the origin: F7's capture job `timeoutBudgetMs` was `30000`; the request payload `capture.timeoutBudgetMs` was `30000`; request readiness `maxTotalCaptureMs` was `30000`; `CAPTURE_JOB_WAIT_BUDGET_MS` was `40000`; no hardcoded `1000ms` capture POST timeout was found.
- Env timeout wiring: `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS` is wired into `resolveRenderedCaptureWorkerClientConfigFromEnv(...)` and then into `createHttpRenderedCaptureWorkerClient(...)`; it was not ignored. The F7 script did not pass a short timeout, so the short value came from local execution env/config inheritance or injection.
- Platform production timeout: same code would use `30000ms` if platform production env sets `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000`; if absent, worker-client default is `35000ms`. F7 proves the local F7 process used `1000ms`, not that platform production would.
- Worker receipt check: client request sent yes; client response received no; worker request received unknown; worker execution started unknown; worker browser launched unknown. Vercel-side logs were not accessible from this workspace because no `vercel` CLI was on PATH and no `.vercel` project metadata existed in checked workspace roots.
- Classification: primary D. local smoke runner override, more precisely local execution env/config inheritance of `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=1000`. Not A client hardcoded timeout, not B env timeout unwired, not C phase budget override, not E platform timeout, and not F worker hung as the primary proven cause.
- Recommended next phase: increase smoke runner timeout by explicitly setting or asserting `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS=30000` before the next bounded fresh-production verification. Do not implement worker/import/capture behavior changes as part of that timeout correction.

Previous completed milestone:
- Phase 8B-12K-F7 — Fresh Production Import Capture Verification.
- Status: COMPLETE with FAIL classification.
- Created `docs/architecture/FRESH_PRODUCTION_IMPORT_CAPTURE_VERIFICATION.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F7 ran one fresh scoped URL import for `https://www.odv-cvijanovic.si/?gnr8_f7=20260617` through the existing fresh import chain (`importPublicSinglePageUrlToSnapshot(...)` + `runScopedImportPipeline(...)`). The existing-siteVersion retry path was not used and no new route was created.
- New runtime version: `siteVersionId = 30100643-0517-4dff-9051-769e20658b25`, `siteId = site_1f154c85c4b150f5f4b0`, `versionNo = 1`, reused = false.
- Preflight: target URL reachable (`200 OK`, `text/html; charset=UTF-8`, `29849` bytes); worker readiness ready (`ok = true`, `enabled = true`, `configured = true`, `healthStatus = ready`, `healthHttpStatus = 200`); deployed route surface exists (`HEAD` returns `405` with `x-matched-path` for both `/internal/gnr8/rendered-capture-worker` and `/api/internal/gnr8/rendered-capture-worker`).
- Worker sourceUrl proof: the worker request was built and sent with `sourceUrl = https://www.odv-cvijanovic.si/?gnr8_f7=20260617`, classified as public `https`, not `file://`.
- Worker response result: no capture response was received. The capture POST timed out after `1000ms`. Diagnostics included `CAPTURE_WORKER_REQUEST_STARTED`, `CAPTURE_WORKER_REQUEST_BUILT`, `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, `CAPTURE_WORKER_HTTP_ERROR`, `CAPTURE_WORKER_REQUEST_FAILED`, `CAPTURE_WORKER_UNAVAILABLE`, and `CAPTURE_WORKER_HEALTH_UNAVAILABLE`. Diagnostics did not include `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_RESPONSE_PARSED`, `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_STARTED`, or `NAVIGATION_SUCCEEDED`.
- Capture result: `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, screenshots `0`, computed style samples `0`, rendered documents `0`, layout geometry `0`, section evidence `0`, and navigation evidence `0`.
- Evidence result: a baseline-shaped `evidenceCaptureBaselineArtifact` exists, but it has no usable rendered evidence or capture expansion evidence.
- Failure classification: primary B. worker not reached, subtype capture POST timed out before worker response; secondary H. capture expansion evidence missing.
- Normal scoped import persistence occurred as part of the requested fresh import, including raw imported artifact persistence, runtime preview artifact binding, and CMS slot materialization. No Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, publishing artifact, migration, source-serving endpoint, repair job, existing-siteVersion capture retry, code change, schema change, or AI generation was created in F7.

Previous completed milestone:
- Phase 8B-12K-F6.5 — Production Capture Execution Path Audit.
- Status: COMPLETE with F7 decision.
- Created `docs/architecture/PRODUCTION_CAPTURE_EXECUTION_PATH_AUDIT.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F6.5 did architecture audit and decision only. No importer behavior, Evidence Capture behavior, worker behavior, source resolution behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema was changed. No source-serving endpoint, Evidence Capture artifact, DryRun package, FirstLimitedDryRun output, import, capture retry, repair job, migration, or new capture artifact was created.
- Intended fresh production URL import path: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts` calls `importPublicSinglePageUrlToSnapshot(...)`; fresh import fetches the public source URL, writes run-scoped snapshot files, then sends the worker `sourceUrl = entryFetchUrlUsed ?? normalizedHref`, a public `http(s)` URL. The worker does not need platform-local snapshot files for this path.
- Existing siteVersion/admin retry path: `runSiteRenderCapture(...)` resolves existing provenance or durable `raw_imported_site` bytes, materializes HTML to caller-local temp storage, converts it to `file://`, and sends that as worker `sourceUrl`. A remote worker cannot reliably access that temp file, whether the caller is a local shell, platform runtime, or separate worker invocation.
- F7 decision: do not implement the raw artifact source-serving endpoint as the immediate next step for proving intended fresh production capture. F7 remains a real architectural requirement only for retroactive existing-siteVersion recapture if that lane must preserve durable imported-source determinism and relative asset fidelity through a remote worker.
- Recommended next phase: Phase 8B-12K-F7 Fresh Production Import Capture Verification. Use the normal fresh URL import path after worker readiness is confirmed, verify that the worker request uses public `http(s)` `sourceUrl` rather than `file://`, and reassess from the intended production path.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, source-serving endpoint implementation, existing-siteVersion capture retry, repair jobs, backfills, migrations, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry-F6 — Worker-Accessible Source Delivery / Navigation Failure Diagnosis.
- Status: COMPLETE with source-delivery recommendation for the existing-siteVersion retry lane.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- F6 did diagnostics and design only. No importer behavior, Evidence Capture behavior, worker capture behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema was changed. No FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, migration, import retry, capture retry, or new capture artifact was created.
- Worker request source fields: the contract contains `sourceUrl` only for navigation. There is no `fileUrl`, local `path`, source base URL, raw HTML field, or data URL field. The capture POST endpoint is separate from the source URL and was observed in F5 as `https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker`.
- Exact F5 source delivery shape: durable `raw_imported_site` HTML was rehydrated to a platform-local temp path under `/var/folders/z3/0ph8dyh13y940w1y1wjgnqgr0000gn/T/gnr8/rendered-capture-source-rehydration/90b3abf8-7a4c-41b5-af05-244642d1962d/6f0829d5-a481-4722-b9e1-1b999e65e4b7/index.html`, then converted with `pathToFileURL(...)` and sent as worker `sourceUrl`.
- Worker navigation logic: the worker validates the request, passes `request.sourceUrl` into `runRenderedCapture(...)`, and the rendered capture executor calls `page.goto(input.sourceUrl)` with `waitUntil = domcontentloaded`. The worker does not currently support raw HTML request content, does not call `page.setContent(...)`, and only supports `file://` when the file exists inside the same worker filesystem.
- Failure classification: A. remote worker cannot access local file path. Browser launch and page creation succeeded; navigation failed because the deployed worker browser was asked to navigate to a platform-local `file://` URL that does not exist in the worker runtime.
- Source delivery options compared: raw HTML + `setContent`, temporary/public signed URL, platform source-serving endpoint, capture inside platform context, and worker refetch of original source URL.
- F6 recommendation was source-serving for durable existing-siteVersion recapture, but F6.5 narrowed the immediate next step to fresh production import capture verification.

Previous completed milestone:
- Phase 8B-12K-Retry-F5 — Rendered Capture Smoke Retry After Worker Route Alignment.
- Status: COMPLETE with FAIL classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target retried: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- F5 used the existing `runSiteRenderCapture(...)` path only. No code, schema, importer behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or worker code was changed. No Limited Dry Run, FirstLimitedDryRun output, reconstruction output, generated React, GNR8 block, CMS binding, publishing artifact, migration, import retry, or unrelated artifact was created.
- Preflight passed: worker health returned ready, platform readiness route logic returned ready, production DB URL was present, worker enabled, worker base URL present (`https://gnr8-worker.vercel.app`), worker token present without printing the value, worker capture path `/internal/gnr8/rendered-capture-worker`, worker health path `/health`, and final F5 worker timeout `30000` ms.
- Source rehydration passed from durable raw import artifact bytes. The target artifact was `6f0829d5-a481-4722-b9e1-1b999e65e4b7`, `entry_html_path = index.html`, `content_bytes` present, media type `text/html; charset=utf-8`, size `29715`, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`, with `351` persisted files.
- Source diagnostics included `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- Worker route was reached. The capture POST returned `200 OK`, `content-type = application/json; charset=utf-8`, and response kind `rendered_capture_worker_response_v1`; no generic `404` HTML was returned. Live diagnostics included `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, and `CAPTURE_WORKER_RESPONSE_PARSED`.
- Worker execution reached Playwright/browser work, then failed at navigation. Diagnostics included `BROWSER_LAUNCH_SUCCEEDED`, `PAGE_CREATION_SUCCEEDED`, `NAVIGATION_STARTED`, `NAVIGATION_FAILED`, and `BROWSER_NAVIGATION_FAILED`.
- F5 result: `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, `hasUsableEvidence = false`, failure reason `CAPTURE_WORKER_EXECUTION_FAILED`, screenshots `0`, computed style samples `0`, rendered DOM length `0`, DOM node count `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
- A baseline-shaped `evidenceCaptureBaselineArtifact` exists, but it has no usable rendered evidence or capture-expansion evidence and is not a passing Evidence Capture baseline.
- Failure classification: primary E. worker browser/playwright failed, more specifically worker navigation failed after browser launch/page creation; secondary consequence H. capture expansion evidence missing.
- Recommended next phase: Phase 8B-12K-Retry-F6 — Worker-Accessible Source Delivery / Navigation Failure Diagnosis. Audit why the deployed worker browser cannot navigate the rehydrated source input. The likely boundary is worker-accessible delivery of durable `raw_imported_site` HTML/assets because the current retry passes a platform-local rehydrated `file://` source URL to a deployed worker.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, migrations, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry-F4 — Deployed Worker Route / Entrypoint Alignment.
- Status: COMPLETE.
- Updated `apps/worker` with `POST /internal/gnr8/rendered-capture-worker` and compatibility `POST /api/internal/gnr8/rendered-capture-worker`.
- Both route files use the same `renderedCaptureWorkerRouteHandlers.POST` handler from `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts`.
- Handler delegation path: `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts` -> `apps/platform/gnr8/rendered-capture-worker-server/fetch-handler.ts` -> `apps/platform/gnr8/import-rendered-capture-worker/worker-service.ts` / `worker-contract.ts`.
- Auth behavior: shared-token auth remains `x-gnr8-rendered-capture-worker-token` matched against `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`; token values are not printed or returned.
- Response contract: route errors are JSON worker errors, not generic Next HTML; successful mocked execution returns `kind = rendered_capture_worker_response_v1`, `contractVersion = 1.0.0`, matching `requestId`, and worker `status`.
- Validation: focused worker route tests passed and `apps/worker` build passed. The build output lists both capture routes as dynamic server routes.
- No full capture smoke retry, import retry, Limited Dry Run, reconstruction, AI, React/block generation, publishing, migration, or artifact creation was performed.
- Recommended next phase: Phase 8B-12K-Retry-F5 — Rendered Capture Smoke Retry After Worker Route Alignment.

Previous completed milestone:
- Phase 8B-12K-Retry-F3 — Worker HTTP Error Diagnosis.
- Status: COMPLETE with exact HTTP error classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Diagnostic scope: inspected deployed worker HTTP response, endpoint contracts, platform request contract, and persisted F2 summary without changing importer behavior, Evidence Capture behavior, source resolution behavior, worker behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, or database schema.
- A tokened external diagnostic POST was not executed from this local session after escalation review rejected sending the shared worker token to the external worker host. No secret values were printed or persisted. Safe unauthenticated POST probes were used for route existence/status only.
- HTTP result: both `POST https://gnr8-worker.vercel.app/internal/gnr8/rendered-capture-worker` and `POST https://gnr8-worker.vercel.app/api/internal/gnr8/rendered-capture-worker` returned `404 Not Found`, `content-type = text/html; charset=utf-8`, with a generic Next HTML not-found page. The body was not JSON, had no worker `error.code`, no worker diagnostics, and no `rendered_capture_worker_response_v1`.
- Route contract finding: the standalone rendered-capture worker server in `apps/platform/gnr8/rendered-capture-worker-server/server.ts` supports `POST /internal/gnr8/rendered-capture-worker`, compatibility `POST /api/internal/gnr8/rendered-capture-worker`, and `GET /health`; the platform proxy route exists at `apps/platform/app/api/internal/gnr8/rendered-capture-worker/route.ts`; but `apps/worker` source/build exposes only `/health` and no capture POST route.
- Platform request contract: F2 primary path was `/internal/gnr8/rendered-capture-worker`, with client fallback to `/api/internal/gnr8/rendered-capture-worker` after `404`; method `POST`; auth headers present in F2 (`x-gnr8-rendered-capture-worker-token` and bearer auth, values not printed); JSON body keys were `kind`, `contractVersion`, `requestId`, `importId`, `sourceUrl`, `trace`, and `capture`.
- Failure classification: B. route missing / 404. The deployed worker host fails before auth, request validation, payload-size handling, worker runtime execution, Playwright/browser launch, timeout handling, or response-shape validation.
- Recommended next phase: Phase 8B-12K-Retry-F4 — Deployed Worker Route/Entrypoint Alignment. Verify/correct deployment/start command so `gnr8-worker.vercel.app` serves the rendered-capture worker server entrypoint or equivalent route surface before rerunning a full capture.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, migrations, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry-F2 — Rendered Capture Smoke Retry With Worker Env.
- Status: COMPLETE with FAIL classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target retried: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- F2 loaded `apps/platform/.env.local` into the local execution process with shell tracing disabled. Worker token presence was confirmed as a boolean only; the token value was not printed, copied into docs, committed, or persisted by the report.
- Preflight passed: production DB URL present, worker enabled, worker base URL present (`https://gnr8-worker.vercel.app`), worker token present, worker capture path present (`/internal/gnr8/rendered-capture-worker`), worker health path present (`/health`), worker timeout `30000`, durable raw import artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` exists, and `index.html` is stored in `content_bytes` (`29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`) with `351` persisted files.
- The existing `runSiteRenderCapture(...)` path was used. Source resolution succeeded from durable raw import artifact bytes and emitted `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- The worker was reached in F2. Live diagnostics included `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`, `CAPTURE_WORKER_URL_RESOLVED`, `CAPTURE_WORKER_REQUEST_STARTED`, `CAPTURE_WORKER_REQUEST_BUILT`, `CAPTURE_WORKER_HTTP_REQUEST_SENT`, `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED`, `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, `CAPTURE_WORKER_HTTP_ERROR`, `CAPTURE_WORKER_REQUEST_FAILED`, `RENDERED_CAPTURE_UNAVAILABLE`, and `CAPTURE_WORKER_UNAVAILABLE`. Existing service logs showed worker config state `enabled = true`, `baseUrlPresent = true`, and `tokenPresent = true`.
- F2 result: `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, `hasUsableEvidence = false`, failure reason `CAPTURE_WORKER_HTTP_ERROR`, screenshots `0`, computed style samples `0`, rendered DOM length `0`, DOM node count `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
- A baseline-shaped `evidenceCaptureBaselineArtifact` exists and contains capture-expansion keys, but it has no usable rendered evidence or capture-expansion evidence and is not a passing Evidence Capture baseline.
- Persisted rendered-capture execution reports `failureCode = CAPTURE_WORKER_HTTP_ERROR`, `environmentStatus = unsupported`, `environmentSupported = false`, `browserPackageAvailable = true`, and `browserBinaryAvailable = true`.
- Failure classification: D. worker HTTP error. F2 proves source rehydration works and the configured worker is reached; the remaining blocker is the worker HTTP response/endpoint/runtime behavior.
- Recommended next phase: Phase 8B-12K-Retry-F3 — Worker HTTP Error Diagnosis.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, migrations, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry-F1 — Production Worker Config Injection / Authenticated Readiness Verification.
- Status: COMPLETE.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Operational modes assessed: A. production admin route/server-side action with env already present, B. local shell with explicit env injection, C. Vercel CLI env pull into local `.env`, and D. dedicated superadmin-only smoke endpoint.
- Recommended mode: B. local shell with explicit env injection. It requires no new route, endpoint, action, schema, queue, worker, or admin UI, and directly fixes the `CAPTURE_WORKER_NOT_CONFIGURED` failure class from the previous local retry.
- Mode C remains a fallback only if the operator cannot safely inject the token at execution time; pulled env files must be gitignored, access-controlled, not pasted into reports, and removed after use.
- Mode A was not recommended because no existing bounded production retry route/action was identified for this exact smoke retry. Mode D was not recommended because it would require new code and a new production execution surface.
- Authenticated readiness method documented: sign in to `https://app.pasadenagenerator.com` as superadmin, call `GET /api/gnr8/admin/rendered-capture-worker/readiness`, and record only non-secret fields (`ok`, `enabled`, `configured`, `baseUrlPresent`, `path`, `healthPath`, `sharedTokenConfigured`, `timeoutMs`, `healthStatus`, `healthHttpStatus`, and `diagnostics`).
- F1 production boundary check from this shell: unauthenticated `GET https://app.pasadenagenerator.com/api/gnr8/admin/rendered-capture-worker/readiness` returned `401 Unauthorized` at `2026-06-17 11:36:36 UTC` with `{"ok":false,"error":"Unauthorized"}`; in-app browser attempt was blocked before load with `net::ERR_BLOCKED_BY_CLIENT`.
- Latest authenticated-superadmin readiness result carried into F1 from phase context, without secrets: `ok = true`, `enabled = true`, `configured = true`, `baseUrlPresent = true`, `sharedTokenConfigured = true`, `healthStatus = ready`, and diagnostics include `RENDERED_CAPTURE_WORKER_HEALTH_STARTED` and `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`. Exact `timeoutMs` and `healthHttpStatus` should be copied from the authenticated response immediately before F2 if available.
- F2 env checklist: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED=true`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL=https://gnr8-worker.vercel.app`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN=<secret, do not print>`, optional `GNR8_RENDERED_CAPTURE_WORKER_PATH`, optional `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH`, and optional `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`.
- Secret handling rule: never commit the token, never paste it into docs, never print it in reports, disable shell tracing before injecting it, do not store pulled Production env files in tracked paths, and unset the token after the retry if exported.
- Safe F2 command shape is documented with placeholder token expansion only; no real token value was recorded.
- Recommended next phase: Phase 8B-12K-Retry-F2 — Rendered Capture Smoke Retry With Worker Env.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-Retry — Rendered Capture Smoke Test On Existing SiteVersion.
- Status: COMPLETE with FAIL classification.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target retried: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- Preflight confirmed old local `/tmp` source files are absent and durable raw import artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7` has `index.html` stored in `content_bytes` (`29715` bytes, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`) with `351` persisted artifact files.
- Production admin readiness endpoint could not be independently read from this unauthenticated shell: `GET https://app.pasadenagenerator.com/api/gnr8/admin/rendered-capture-worker/readiness` returned `401 Unauthorized`; an in-app browser attempt was blocked with `net::ERR_BLOCKED_BY_CLIENT`.
- The existing `runSiteRenderCapture(...)` path was used. Source resolution succeeded from durable raw import artifact bytes and emitted `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- The worker was not reached from this local retry process because `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` and `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` were absent. Retry diagnostics included `CAPTURE_WORKER_CLIENT_CONFIG_RESOLVED`, `CAPTURE_WORKER_URL_RESOLVED`, `CAPTURE_WORKER_NOT_CONFIGURED`, `CAPTURE_WORKER_UNAVAILABLE`, and `RENDERED_CAPTURE_UNAVAILABLE`; no worker HTTP request was sent by the retry.
- Result remained `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `sourceMode = raw_html_fallback`, screenshots `0`, computed style samples `0`, layout geometry count `0`, section evidence count `0`, and navigation evidence count `0`.
- A baseline-shaped `evidenceCaptureBaselineArtifact` now exists after the retry, but it has no usable rendered evidence or capture-expansion evidence and is not a passing Evidence Capture baseline.
- Failure classification: B. worker not reached, with subtype local worker client not configured.
- Recommended next phase: Phase 8B-12K-Retry-F1 — Production Worker Config Injection/Authenticated Readiness Verification.
- Do not run Limited Dry Run, reconstruction, AI, React/block generation, publishing, import retries, repair jobs, backfills, or unrelated artifact generation without a separate explicit phase.

Previous completed milestone:
- Phase 8B-12K-F2 — Rendered Capture Raw Import Artifact Source Resolution Fix.
- Status: COMPLETE.
- Updated `apps/worker/gnr8/site/site-render-capture-service.ts`.
- Updated `apps/worker/gnr8/site/site-render-capture-service.test.ts`.
- Updated `apps/platform/gnr8/import-rendered-capture/rendered-capture-contract.ts`.
- Updated `docs/architecture/EXISTING_SITEVERSION_CAPTURE_SOURCE_REHYDRATION_AUDIT.md`.
- Updated `docs/architecture/RENDERED_CAPTURE_SMOKE_TEST.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Target audited: `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, runtime site `site_aaa6d44109a38b5d083f`, ownership site `067e3aa9-773c-4d5d-ba2b-a138761a6354`, source URL `https://www.odv-cvijanovic.si/`.
- Existing import provenance points capture source refs at `/tmp/gnr8/validation/url-import-snapshots/imported-url-site-a5ecc916fe5604f0/runs/client-site-import-1781168573242-43684205/index.html` and `response-html.raw.html`.
- Local verification found those `/tmp` files missing, matching the 8B-12K smoke-test failure before worker execution.
- Durable source found: `raw_imported_site` artifact `6f0829d5-a481-4722-b9e1-1b999e65e4b7`, `entry_html_path = index.html`, stored in `gnr8_runtime_raw_template_artifact_files.content_bytes`, media type `text/html; charset=utf-8`, size `29715`, SHA `371313f6e7c3823f2feb91e3e6e6a400b5896bc75ae26ad0aba5190a996e7861`.
- Raw artifact metadata records `sourceUrl = https://www.odv-cvijanovic.si/`, `finalUrl = https://www.odv-cvijanovic.si/`, `htmlByteLength = 29849`, `persistedAssetCount = 351`, and `externalFallbackAssetCount = 0`.
- Runtime artifact `6d814f11-26bd-45ad-9e67-16fb0014c789` has `html_by_path` for `/`, but it is product/runtime output, not imported source HTML.
- Multipage route discovery has one route `/`; no separate durable `htmlAcquisition` or `rawArtifactAssembly` refs were present for this target.
- F2 fix: rendered capture source resolution now tries existing local provenance file path first; if missing, it performs a read-only lookup for the latest `raw_imported_site` artifact, tries artifact `entry_html_path` then `index.html`, reads selected HTML from `content_bytes`, materializes that HTML into a temporary rehydration path, and passes the file URL to the existing capture runner.
- F2 diagnostics added: `RENDERED_CAPTURE_SOURCE_LOCAL_PROVENANCE_MISSING`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_LOOKUP_STARTED`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_ARTIFACT_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_FOUND`, `RENDERED_CAPTURE_SOURCE_RAW_IMPORT_HTML_MISSING`, and `RENDERED_CAPTURE_SOURCE_RESOLVED_FROM_RAW_IMPORT_ARTIFACT`.
- Focused tests cover local provenance precedence, raw artifact fallback, raw artifact root HTML missing, no local/no raw artifact failure, and fallback diagnostics.
- Recommended next phase: Phase 8B-12K-Retry — Rendered Capture Smoke Test On Existing SiteVersion.
- No importer semantics, Original Mirror behavior, preview behavior, dry-run builder behavior, limited dry-run API/UI behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, imports, capture retries, or Evidence Capture artifacts were created or changed.

Previous completed milestone:
- Phase 8B-12I — Production Worker Env Configuration Verification.
- Status: COMPLETE.
- Created `docs/architecture/PRODUCTION_WORKER_ENV_CONFIGURATION_VERIFICATION.md`.
- Updated `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md`.
- Updated `docs/ai/GNR8_CURRENT_STATE.md`.
- Updated this handoff.
- Documented required platform Production env vars: `GNR8_RENDERED_CAPTURE_WORKER_ENABLED`, `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL`, `GNR8_RENDERED_CAPTURE_WORKER_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_HEALTH_PATH`, `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, and `GNR8_RENDERED_CAPTURE_WORKER_TIMEOUT_MS`.
- Documented that readiness requires an explicit worker base URL and shared token. Platform-origin fallbacks are not sufficient for readiness proof.
- Documented worker-side requirements: deployed Vercel worker production URL, `GET /health`, `POST /internal/gnr8/rendered-capture-worker`, compatibility `POST /api/internal/gnr8/rendered-capture-worker`, matching `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN`, Node runtime, Playwright package availability, launchable browser availability, and Vercel project configuration that serves the rendered capture worker.
- Documented the 8B-12J production verification flow: configure platform env vars, configure worker env vars, deploy worker, deploy platform, call `GET /api/gnr8/admin/rendered-capture-worker/readiness` as superadmin, and record the response without exposing token values.
- Expected ready proof: `enabled = true`, `configured = true`, `baseUrlPresent = true`, `sharedTokenConfigured = true`, `healthStatus = ready`, and diagnostics including `RENDERED_CAPTURE_WORKER_HEALTH_STARTED` and `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`.
- Failure examples now map disabled config, missing base URL, missing token, unreachable worker, and invalid health response to likely root causes.
- Information required for 8B-12J: platform Vercel project name, worker Vercel project name, worker production URL, health endpoint URL, configured path, configured timeout, token-present confirmation without token disclosure, and readiness endpoint response.
- Recommended next phase: Phase 8B-12J — Production Worker Readiness Live Check.
- No token values, copied production secrets, Vercel env changes, deployments, readiness calls, imports, retries, capture POSTs, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, repair jobs, migrations, importer behavior, Evidence Capture behavior, worker code, platform code, Original Mirror behavior, preview behavior, dry-run behavior, reconstruction behavior, AI behavior, publishing behavior, or database schema changes were made.

Previous completed milestone:
- Phase 8B-12H — Production Evidence Capture Worker Readiness Fix.
- Status: COMPLETE.
- Added `apps/platform/gnr8/import-rendered-capture-worker/worker-readiness.ts`.
- Added `apps/platform/app/api/gnr8/admin/rendered-capture-worker/readiness/route.ts`.
- Added `apps/platform/app/api/gnr8/admin/rendered-capture-worker/readiness/rendered-capture-worker-readiness-route-handlers.ts`.
- Added `apps/platform/app/api/gnr8/admin/_tests/rendered-capture-worker-readiness-route.test.ts`.
- Updated `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md`.
- Implemented a superadmin-only read-only endpoint: `GET /api/gnr8/admin/rendered-capture-worker/readiness`.
- Endpoint returns `ok`, `enabled`, `configured`, `baseUrlPresent`, `path`, `healthPath`, `sharedTokenConfigured`, `timeoutMs`, `healthStatus`, `healthHttpStatus`, and deterministic diagnostics.
- Config contract is explicit and fail-closed: enabled worker with missing/invalid `GNR8_RENDERED_CAPTURE_WORKER_BASE_URL` is `misconfigured`; enabled worker with missing `GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN` is `misconfigured`; token value is never returned.
- Default capture path is documented as `/internal/gnr8/rendered-capture-worker`; default health path is `/health`.
- Health check sends only bounded `GET` to the worker health endpoint, respects timeout, performs no retries, sends no capture POST, and runs no browser work from the platform endpoint.
- Health classifications: `ready`, `disabled`, `misconfigured`, `unreachable`, and `invalid_response`.
- Diagnostics added: `RENDERED_CAPTURE_WORKER_CONFIG_DISABLED`, `RENDERED_CAPTURE_WORKER_CONFIG_MISSING_BASE_URL`, `RENDERED_CAPTURE_WORKER_CONFIG_MISSING_TOKEN`, `RENDERED_CAPTURE_WORKER_HEALTH_STARTED`, `RENDERED_CAPTURE_WORKER_HEALTH_SUCCEEDED`, `RENDERED_CAPTURE_WORKER_HEALTH_FAILED`, and `RENDERED_CAPTURE_WORKER_HEALTH_INVALID_RESPONSE`.
- Recommended next phase: Phase 8B-12I — Production Worker Env Configuration Verification.
- No importer semantics, Evidence Capture capture execution, Original Mirror behavior, preview behavior, dry-run builder behavior, limited dry-run API/UI behavior, reconstruction behavior, AI behavior, React/block generation, publishing behavior, database schema, FirstLimitedDryRun outputs, reconstruction outputs, generated React, GNR8 blocks, CMS bindings, publishing artifacts, imports, retries, or Evidence Capture artifacts were created or changed.

Previous completed milestone:
- Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit.
- Status: COMPLETE.
- Created `docs/architecture/PRODUCTION_EVIDENCE_CAPTURE_WORKER_READINESS_AUDIT.md`.
- Read-only audit inspected rendered-capture worker config references, expected worker deployment model, existing production diagnostics, representative failed versions, root-cause classification, and production readiness.
- Representative diagnostics: `90b3abf8-7a4c-41b5-af05-244642d1962d` reached `CAPTURE_WORKER_HTTP_REQUEST_SENT` / `CAPTURE_WORKER_HTTP_RESPONSE_RECEIVED` / `CAPTURE_WORKER_HTTP_RESPONSE_CLASSIFIED`, then failed with `CAPTURE_WORKER_HTTP_ERROR`, `workerHealth.status = unreachable`, `captureJob.status = failed_transient`, and raw fallback. `88253466-783e-4484-8b68-df6c83b8a11c` built a request but did not send HTTP; it failed with `CAPTURE_WORKER_NOT_CONFIGURED`, `workerHealth.status = misconfigured`, `captureJob.status = failed_terminal`, and raw fallback.
- Production aggregate remains `14` imported versions, all `sourceMode = raw_html_fallback`, `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `screenshotCount = 0`, `computedStyleSampleCount = 0`, and missing `evidenceCaptureBaselineArtifact`.
- Root-cause classification: primary `H. platform caller misconfigured`; supporting `A. worker URL missing` for config-missing paths/local production env and `C. worker health unavailable` for unreachable paths. `J. unknown` remains for the exact HTTP status/body of transient rows because durable provenance stores diagnostic codes and job/health state but not endpoint/status/body details.
- Not supported by inspected persisted diagnostics: auth mismatch, timeout, browser dependency failure, or deployed-wrong-build as the concrete current failure class.
- Readiness result: NOT PRODUCTION READY for rendered Evidence Capture. Worker deployment/reachability, health response shape, capture response shape, and auth configuration are not proven ready.
- Recommended next phase: Phase 8B-12H — Production Evidence Capture Worker Readiness Fix.
- No importer behavior, Evidence Capture behavior, worker behavior, worker deployment, environment variables, Original Mirror behavior, preview behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, backfills, worker jobs, retries, or imports were changed or created.

Previous completed milestone:
- Phase 8B-12F — Reconstruction Readiness Inventory Audit.
- Status: COMPLETE.
- Created `docs/architecture/RECONSTRUCTION_READINESS_INVENTORY_AUDIT.md`.
- Read-only production inventory found `14` imported runtime site versions with non-null `import_provenance_summary`.
- Bucket counts: `NO_EVIDENCE_CAPTURE = 14`; `BASELINE_ONLY = 0`; `CAPTURE_EXPANDED = 0`; `RECONSTRUCTION_READY = 0`; `DRY_RUN_READY = 0`; `DRY_RUN_COMPLETED = 0`; `UNKNOWN_STATE = 0`.
- Every imported production site version is missing `evidenceCaptureBaselineArtifact`, capture expansion evidence, `ReconstructionInput`, `ReconstructionPlanningPackage`, `ReconstructionCandidateDiscovery` package, `ReconstructionReview` package, `ReconstructionPackage`, `ReconstructionDryRunPackage`, and `FirstLimitedDryRunOutput`.
- Production capture aggregates: all `14` have `sourceMode = raw_html_fallback`, `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `screenshotCount = 0`, and `computedStyleSampleCount = 0`.
- Worker/capture-job signals: worker health is missing on `5`, unreachable on `5`, and misconfigured on `4`; capture job status is missing on `5`, failed transient on `5`, and failed terminal on `4`.
- Dominant blocker: production rendered Evidence Capture/worker readiness, not Limited Dry Run builder behavior or admin surface behavior.
- Representative blocked versions: `90b3abf8-7a4c-41b5-af05-244642d1962d` (`https://www.odv-cvijanovic.si/`) is worker-unreachable/transient-failed; `88253466-783e-4484-8b68-df6c83b8a11c` (`http://www.transportimaver.si/`) is worker-misconfigured/terminal-failed; older generated-host imports have failed rendered capture with no worker/capture-job status in provenance.
- Follow-up completed by Phase 8B-12G — Production Evidence Capture Worker Readiness Root-Cause Audit.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, worker behavior, publishing behavior, database schema, Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, or backfills were changed or created.

Previous completed milestone:
- Phase 8B-12 — First Real-Site Limited Dry Run Operational Test.
- Status: COMPLETE WITH PREFLIGHT FAIL.
- Created `docs/architecture/FIRST_REAL_SITE_LIMITED_DRY_RUN_OPERATIONAL_TEST.md`.
- Selected attempted target: `https://www.odv-cvijanovic.si/`, `siteVersionId = 90b3abf8-7a4c-41b5-af05-244642d1962d`, `siteId = site_aaa6d44109a38b5d083f`, route count `1`.
- Preflight found no `evidenceCaptureBaselineArtifact`, no layout geometry evidence, no section evidence, no navigation evidence, no accepted `ReconstructionDryRunPackage`, and no existing `first_limited_dry_run_output` artifact for the selected site version.
- Read-only production candidate discovery found `14` site versions with non-null `import_provenance_summary` and `0` qualifying versions with the required baseline/package inputs.
- The staging database endpoint configured in `.env.staging` was checked but was not usable from this environment: `tenant/user postgres.dpkdxllcxnlytgjbnmvp not found`.
- Stopped per the 8B-12 boundary before triggering `POST /api/gnr8/admin/first-limited-dry-run`.
- API trigger result: not executed.
- Persistence verification: no write attempted, no output artifact created, no latest output loaded.
- Admin surface verification: not executed against a real persisted output because no output artifact exists.
- Idempotency check: not executed because the first trigger was not eligible to run.
- Result: FAIL at preflight; the current real-site dataset is not prepared for the existing limited dry-run chain.
- Follow-up completed by Phase 8B-12F — Reconstruction Readiness Inventory Audit.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, new API routes, UI trigger button, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing logic was added.

Previous completed milestone:
- Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_REASSESSMENT.md`.
- Assessed the implemented and verified admin-only diagnostic chain: superadmin API trigger, deterministic builder, persisted `first_limited_dry_run_output`, latest artifact loader, read-only admin surface, idempotency, forbidden-action absence, and platform build verification from 8B-10.
- Documented what remains forbidden: UI trigger button, approval controls, publish controls, edit controls, tenant-admin/client-user/public access, worker jobs, queues, simulation, reconstruction, AI, React generation, block generation, content generation, design token generation, CMS bindings, persistence schema changes, and publishing behavior.
- Compared next-boundary options: A. UI trigger button, B. limited approval/readiness marker, C. runtime mutation capture, D. first real-site operational test, and E. candidate discovery implementation.
- Recommended next phase: Phase 8B-12 — First Real-Site Limited Dry Run Operational Test.
- Rationale: before adding a UI trigger or approval/readiness system, verify that the existing admin API, persisted artifact, latest loader, and read-only surface work against one real imported site.
- Designed the 8B-12 operational test constraints: superadmin only, existing imported site only, small/static marketing-style site preferred, no ecommerce, no login/cookie-gated content, no publishing, no AI, no reconstruction execution, no worker execution, and no UI trigger.
- Defined 8B-12 pass/fail criteria for artifact creation/reuse, read-only display, forbidden field absence, missing evidence, invalid output, unsafe fields, and forbidden controls.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, new API routes, UI trigger button, approval controls, publish controls, edit controls, LLM calls, generated React, GNR8 blocks, CMS bindings, worker jobs, queues, client-user access, tenant-admin access, or publishing logic was added.

Previous completed milestone:
- Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification.
- Status: COMPLETE.
- Added `apps/platform/app/api/gnr8/admin/_tests/first-limited-dry-run-admin-verification.test.ts`.
- Verified the admin-only diagnostic flow end to end with a fake runtime site-version provenance summary containing an Evidence Capture baseline, layout geometry evidence, section boundary evidence, navigation evidence, and a valid `ReconstructionDryRunPackage`.
- The verification calls the superadmin API trigger handler, asserts a `first_limited_dry_run_output` artifact is created, loads the latest persisted output through `loadLatestFirstLimitedDryRunOutput(...)`, builds the read-only surface projection through `loadLatestFirstLimitedDryRunSurfaceProjection(...)`, and checks Route/Navigation/Section Model counts and read-only page labels.
- Idempotency is verified: first equivalent call creates, second equivalent call reuses without another write, and changed navigation evidence creates a new latest artifact when the rebuilt output differs.
- Safety is verified: unauthorized request rejection, forbidden field rejection, metadata-only trigger response, absence of forbidden generated-output fields in persisted output, and absence of trigger/rebuild/approve/publish/edit/AI/form/button/input controls in the read-only page source.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md`, `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`, `docs/ai/GNR8_CURRENT_STATE.md`, and this handoff.
- Recommended next phase: Phase 8B-11 — First Limited Dry Run Re-Assessment / Next Safe Boundary.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence schema, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, publishing behavior, new API routes, UI controls, worker jobs, queues, generated React, GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-surface-projection.ts`.
- Created `apps/platform/app/gnr8/admin/first-limited-dry-run/[siteVersionId]/page.tsx`.
- Added `loadLatestFirstLimitedDryRunSurfaceProjection(...)`, a defensive read-model projection over persisted `first_limited_dry_run_output` artifacts.
- Projection metadata includes artifact ref/kind, dry-run id, site-version id, output status, validation status, route/navigation/section counts, limitations count, blocker limitations count, diagnostics, created time, persisted time, and Route/Navigation/Section Model arrays.
- The page is dedicated, read-only, superadmin-only, and titled "First Limited Dry Run".
- The page displays Overview, Route Models, Navigation Models, Section Models, Limitations, diagnostics, and empty states for no output, invalid latest output, blocked latest output, no route models, and output limitations.
- Added focused source/projection tests for page labels, missing forbidden controls/phrases, empty states, and safe projection parsing.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`, `docs/ai/GNR8_CURRENT_STATE.md`, and this handoff.
- Recommended next phase: Phase 8B-10 — First Limited Dry Run End-to-End Admin Verification.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, publishing behavior, trigger UI, approval workflow, worker jobs, queues, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Earlier completed milestone:
- Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design.
- Status: COMPLETE.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md` with the post-8B-7 reassessment.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_SURFACE_DESIGN.md`.
- Reassessment: the 8B-7 API-only trigger is sufficient for the next UI phase because it can create or reuse a validated persisted `first_limited_dry_run_output` and returns the metadata needed for read-only inspection.
- Recommended UI location: dedicated admin dry-run page titled "First Limited Dry Run".
- Surface summary should display artifact status, output status, validation status, idempotency result, route/navigation/section model counts, limitations count, blocker limitations count, diagnostics, artifact refs, output id, site version id, dry-run id, reconstruction package id, created time, persisted time, and evidence ref count.
- Route Models display `routePath`, `sourceUrl`, section count, navigation refs, confidence, and limitations.
- Navigation Models display item count, labels, hrefs, confidence, evidence refs, and ordered item details.
- Section Models display ordered sections by route, region type, selector, bounding box, confidence, evidence refs, and limitations.
- Empty states are defined for no dry-run output yet, latest output invalid, latest output blocked, evidence missing, output exists but has no route models, and output exists but has limitations.
- Safety constraints: read-only, initially superadmin/admin-only, no publish controls, no approve controls, no reconstruction controls, no AI controls, no edit controls, no trigger controls, no route-scope controls, no force/rebuild controls, no worker jobs, no queues, no CMS bindings, no public/client-user access, no tenant-admin access, no generated React, no generated GNR8 blocks, no generated content, no design token generation, and no publishing logic.
- Recommended next phase: Phase 8B-9 — Read-Only First Limited Dry Run Surface Implementation.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run worker execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, publishing behavior, worker jobs, queues, UI implementation, new API route, approval workflow, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Earlier completed milestone:
- Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation.
- Status: COMPLETE.
- Created `apps/platform/app/api/gnr8/admin/first-limited-dry-run/route.ts`.
- Created `apps/platform/app/api/gnr8/admin/first-limited-dry-run/first-limited-dry-run-route-handlers.ts`.
- Added a superadmin-only POST API trigger for deterministic first limited dry-run output generation and persistence.
- Request contract accepts only `siteVersionId` and `dryRunId`; `routeScope`, `force`, evidence payloads, generated outputs, and other extra request fields are rejected deterministically.
- Trigger flow loads the runtime site version, latest Evidence Capture baseline, and matching `ReconstructionDryRunPackage`; runs `buildFirstLimitedDryRunOutput(...)`; validates with `validateFirstLimitedDryRunOutput(...)`; persists valid output as `first_limited_dry_run_output`; and returns metadata only.
- Idempotency reuses the latest equivalent artifact for the same `siteVersionId` and `dryRunId`; a new artifact is appended only when the rebuilt output differs.
- Response metadata includes `artifactRef`, `artifactKind`, `outputStatus`, validation, route/navigation/section model counts, limitations counts, blocker limitation count, `idempotencyResult`, and diagnostics.
- Added focused API tests for unauthorized access, missing IDs, forbidden fields, missing baseline, missing dry-run package, valid persistence, idempotent reuse, invalid builder output non-persistence, metadata-only response, and generated-output request rejection.
- Recommended next phase: Phase 8B-8 — Admin Trigger Re-Assessment / Read-Only Surface Design.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run worker execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, publishing behavior, worker jobs, queues, UI button, approval workflow, public/client access, tenant-admin access, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_TRIGGER_DESIGN.md`.
- Defined the superadmin-only trigger boundary for creating and persisting a `FirstLimitedDryRunOutput`.
- Trigger may load the latest Evidence Capture baseline, load the matching `ReconstructionDryRunPackage`, run the deterministic builder, validate output, persist a valid artifact, and return artifact metadata and model counts.
- Access control is fail-closed, superadmin-only, server-side, with no public access, no client-user access, and no tenant-admin access yet.
- Input contract requires `siteVersionId` and `dryRunId`; `routeScope` override and `force` are forbidden for the first implementation.
- Output contract returns `ok`, artifact reference metadata, output status, validation status, model counts, limitations counts, and deterministic diagnostics.
- Failure cases are deterministic: unauthorized, missing IDs, forbidden overrides, missing dry-run package, site-version mismatch, missing Evidence Capture baseline, invalid builder output, validation failure, and persistence failure.
- Idempotency strategy is deterministic append with latest pointer: reuse the latest artifact when the newly built output is equivalent, append a new artifact only when the output differs, and keep explicit versioning/force out of scope.
- Auditability fields include `triggeredBy`, `triggeredAt`, input refs, validation result, artifact ref, output status, model counts, limitations count, blocker limitations count, and idempotency result.
- Recommended next phase: Phase 8B-7 — Admin-Only First Limited Dry Run Trigger Implementation.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, dry-run execution runtime, simulation execution runtime, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, API route, UI button, queue execution, publishing behavior, source content mutation, domain/DNS mutation, CMS mutation, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-5 — First Limited Dry Run Output Persistence.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-output-persistence.ts`.
- Added `persistFirstLimitedDryRunOutput(...)` for validated persistence of `FirstLimitedDryRunOutput` as artifact kind `first_limited_dry_run_output`.
- Added `loadLatestFirstLimitedDryRunOutput(...)` for latest persisted output readback by `siteVersionId` and optional `dryRunId`.
- Storage uses existing runtime site-version `import_provenance_summary`, under `firstLimitedDryRunOutputArtifacts` and `latestFirstLimitedDryRunOutputArtifact`; no new DB table was added.
- Validation runs before write via `validateFirstLimitedDryRunOutput(...)`; forbidden generated output shapes and mismatched `siteVersionId`/`dryRunId` are rejected before persistence.
- Persisted artifact metadata preserves validation result and diagnostics.
- Recommended next phase: Phase 8B-6 — Admin-Only First Limited Dry Run Trigger Design.
- No importer behavior, Evidence Capture capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run runtime execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, worker execution, runtime API, UI surface, approval workflow, publishing behavior, generated React, generated GNR8 blocks, CMS bindings, or publishing logic was added.

Previous completed milestone:
- Phase 8B-4 — First Limited Dry Run Builder Re-Assessment.
- Status: COMPLETE.
- Updated `docs/architecture/SIMULATION_READINESS_REVIEW.md` with the post-8B-3 reassessment.
- Updated `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md` with implemented and still-missing status.
- Previous conceptual Dry Run readiness: 82/100.
- Previous execution Dry Run readiness: 73/100.
- Updated conceptual Dry Run readiness: 86/100.
- Updated execution Dry Run readiness: 77/100.
- Feasibility remains route model feasible, navigation model feasible, section model feasible, content model risky, block model not_ready, and design token model not_ready.
- Runtime readiness: contract, builder, and validation are implemented; persistence, API trigger, UI display, worker execution, approval, and publish remain missing.
- Conclusion: the deterministic builder is sufficient to justify moving toward a controlled runtime dry-run surface, but persistence should come before API/runtime trigger or UI exposure.
- Recommended next phase: Phase 8B-5 — First Limited Dry Run Output Persistence.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run runtime execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, runtime API, UI surface, approval workflow, or publishing logic was added.

Previous completed milestone:
- Phase 8B-3 — First Limited Dry Run Builder Implementation.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-builder.ts`.
- Added `buildFirstLimitedDryRunOutput(...)`, a pure deterministic builder that accepts `ReconstructionDryRunPackage` plus Evidence Capture baseline and/or capture expansion evidence.
- Builds only `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel` inside `FirstLimitedDryRunOutput`.
- Route models use only explicit `dryRunPackage.routeScope.routes`, captured Evidence Capture baseline source URLs, emitted section refs, emitted navigation refs, and propagated limitation refs. The builder does not infer routes from navigation hrefs or evidence outside route scope.
- Navigation models use only `NavigationEvidence`, preserving labels, hrefs, confidence, deterministic item ordering, evidence refs, and deterministic dedupe by normalized label plus href when duplicates are present.
- Section models use only `SectionBoundaryEvidence` and `LayoutGeometryEvidence` for traceability/consistency. The builder preserves section ID, route path, region type, selector, bounding box, confidence, evidence refs, and limitation refs, and does not recompute bounding boxes.
- Propagates dry-run package limitations and deterministic missing navigation evidence, missing section evidence, missing source URL, and route/evidence mismatch limitations.
- Builder output is validated with `validateFirstLimitedDryRunOutput(...)`.
- Recommended next phase: Phase 8B-4 — First Limited Dry Run Builder Re-Assessment.
- No importer behavior, Evidence Capture capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution runtime, simulation execution runtime, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8B-2 — First Limited Dry Run Builder Design.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_BUILDER_DESIGN.md`.
- Defined exact deterministic mapping rules for creating `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel` from existing Evidence Capture baseline data, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, and `NavigationEvidence`.
- Route model mapping uses only explicit dry-run route scope route identities, captured source URLs, section refs, navigation refs, route limitation refs, and conservative aggregate confidence. It does not create routes from navigation hrefs or source-site crawling.
- Navigation model mapping uses `NavigationEvidence` only, with deterministic confidence propagation, duplicate handling, item ordering, rewritten contiguous positions after dedupe, evidence refs, and limitation refs.
- Section model mapping uses `SectionBoundaryEvidence` and `LayoutGeometryEvidence`, with deterministic section ordering, exact selector copying, exact section boundary bounding box copying, confidence propagation, layout geometry used only for traceability/consistency checks, and limitation propagation.
- Defined limitation flow from Evidence Capture, section evidence, navigation evidence, and existing dry-run package limitations into `FirstLimitedDryRunOutput.limitations`.
- Defined traceability rules for `sourceEvidenceRefs`, `limitationRefs`, top-level `evidenceRefs`, and the Phase 8B-1 route model contract's indirect source traceability through `sectionRefs`, `navigationRefs`, and top-level refs.
- Defined determinism rules: same input equals same output, with no randomness, no AI, no live network reads, no preview reads, no Original Mirror product-truth reads, no selector generation, no bounding box recomputation, and no inference outside existing evidence.
- Recommended next phase: Phase 8B-3 — First Limited Dry Run Builder Implementation.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, generated route model output, generated navigation model output, generated section model output, or publishing logic was added.

Previous completed milestone:
- Phase 8B-1 — First Limited Dry Run Contract.
- Status: COMPLETE.
- Created `apps/platform/gnr8/architecture/first-limited-dry-run-contract.ts`.
- Defined the formal `FirstLimitedDryRunOutput` contract for Route Model, Navigation Model, and Section Model only.
- Defined `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel`.
- Output status values are `planned`, `valid`, `invalid`, and `blocked`; no executed, completed, or published statuses exist.
- Added `validateFirstLimitedDryRunOutput(...)` to reject forbidden output payloads including Block Model, Content Model, Design Token Model, React output, CMS bindings, publishing artifacts, and generated output containers.
- Added `createEmptyFirstLimitedDryRunOutput(...)`, which carries IDs, route scope, limitations, and created timestamp from `ReconstructionDryRunPackage`, initializes status as `planned`, creates no route/navigation/section models, and does not execute simulation.
- Recommended next phase: Phase 8B-2 — First Limited Dry Run Builder Design.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8B-0 — First Limited Dry Run Design.
- Status: COMPLETE.
- Created `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md`.
- Defined the first useful limited Dry Run output scope as Route Model, Navigation Model, and Section Model only.
- Allowed inputs are Evidence Capture baseline, `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, `NavigationEvidence`, `ReconstructionPackage`, `ReconstructionDryRunPackage`, and `ReconstructionSimulationPlan`.
- Forbidden outputs are Block Model, Content Model, Design Token Model, React, GNR8 blocks, CMS bindings, CMS/content models, publishing artifacts, generated site output, editable blocks, rewritten content, reconstruction workers, runtime mutations, and database writes.
- Output model design is documentation-only for `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel`; no TypeScript types, schema changes, generated artifacts, or runtime behavior were added.
- Success means route list, navigation item list, ordered section list per route, evidence traceability, and limitations where confidence is low.
- Failure means no route identity, no source URL, no section evidence, no navigation evidence, contradictory evidence, blocker limitations, insufficient evidence refs, unresolved section order, route-scope mismatch, or navigation hrefs that cannot be tied to captured routes/source URLs.
- Recommended first target is a static marketing site with a small route set, visible navigation, clear sections, stable source capture, and no heavy ecommerce, complex app runtime, login/cookie-gated content, or widget-dominated primary experience.
- Recommended next phase: Phase 8B-1 — First Limited Dry Run Contract.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture implementation, runtime mutation capture, candidate discovery execution, candidate review execution, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8A-11 — Dry Run Readiness Re-Assessment.
- Status: COMPLETE.
- Reassessed first Dry Run readiness after Phase 8A-10 navigation capture.
- Updated conceptual Dry Run readiness from 77/100 to 82/100.
- Updated execution Dry Run readiness from 68/100 to 73/100.
- Feasibility is now: route model feasible; navigation model feasible; section model feasible; content model risky; block model not_ready; design token model not_ready.
- Evidence coverage: layout geometry, section boundaries, and navigation evidence are READY; runtime mutation evidence remains MISSING.
- Navigation impact: explicit persisted navigation labels, hrefs, stable positions, confidence, item counts, and discovered route counts make route relationships and navigation model planning inspectable. Navigation capture does not add runtime mutation evidence, candidate discovery/review execution, simulation, reconstruction, generated outputs, block/design token generation, or publishing.
- Conclusion: navigation capture makes first limited static Dry Run design viable. Runtime Mutation Capture is still required before meaningful or broad Dry Run execution, but it is not required before designing the first limited static Dry Run boundary.
- Remaining blockers: no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next phase: Phase 8B-0 — First Limited Dry Run Design.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, runtime mutation capture, generated output, database write, or publishing logic was added.

Previous completed milestone:
- Phase 8A-10 — Navigation Capture.
- Status: COMPLETE.
- Implemented deterministic `NavigationEvidence` from existing rendered DOM, `LayoutGeometryEvidence`, and `SectionBoundaryEvidence`.
- Captures navigation item label, href, stable position, and `LOW` / `MEDIUM` / `HIGH` confidence.
- Confidence rules are deterministic: `HIGH` for anchors inside `nav`, navigation/menu roles, or header navigation regions; `MEDIUM` for repeated navigation-like link groups; `LOW` for inferred navigation containers.
- Persists navigation evidence inside the existing Evidence Capture baseline artifact under `captureExpansionEvidence.navigationEvidence`.
- Exposes summary-only navigation evidence: `navigationCaptured`, `navigationItemCount`, and `navigationRoutesDiscovered`.
- Updates capture-expansion readiness usage so Navigation Model is READY when real `NavigationEvidence` exists. Route Model and Section Model remain READY from existing route/geometry and section boundary evidence.
- Remaining blockers: no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next phase: Phase 8A-11 — Dry Run Readiness Re-Assessment.
- No importer behavior, Original Mirror behavior, preview behavior, section boundary capture, runtime mutation capture, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, LLM call, generated output, database schema change, new persistence table, or publishing logic was added.

Earlier completed milestone:
- Phase 8A-9 — Dry Run Readiness Re-Assessment.
- Status: COMPLETE.
- Reassessed first Dry Run readiness after Phase 8A-8 section boundary capture.
- Updated conceptual Dry Run readiness from 72/100 to 77/100.
- Updated execution Dry Run readiness from 63/100 to 68/100.
- Feasibility is now: route model feasible; navigation model risky; section model feasible; content model risky; block model not_ready; design token model not_ready.
- Evidence coverage: layout geometry and section boundaries are READY; navigation evidence and runtime mutation evidence remain MISSING.
- Section boundary impact: deterministic classified section refs now make the Section Model READY and improve future candidate discovery and block grouping context, but they do not add navigation extraction, runtime mutation observation, candidate discovery/review execution, simulation, reconstruction, generated outputs, or publishing.
- Remaining blockers: no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next phase: Phase 8A-10 — Navigation Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, navigation capture, runtime mutation capture, generated output, database write, or publishing logic was added.

Earlier completed milestone:
- Phase 8A-8 — Section Boundary Capture.
- Status: COMPLETE.
- Implemented deterministic `SectionBoundaryEvidence` from existing `LayoutGeometryEvidence` and rendered DOM structure.
- Classification is limited to `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
- Persists section boundary evidence inside the existing Evidence Capture baseline artifact under `captureExpansionEvidence.sectionBoundaryEvidence`.
- Exposes summary-only section evidence presence, count, and types present.
- Updates `evaluateCaptureExpansionReadiness(...)` so Section Model is READY when section boundary evidence exists. Route Model remains READY from route/geometry evidence, and Navigation Model behavior is unchanged.
- Remaining blockers: no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, and no publishing path.
- Recommended next phase: Phase 8A-9 — Dry Run Readiness Re-Assessment.
- No importer behavior, Original Mirror behavior, preview behavior, navigation extraction, runtime mutation capture, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, LLM call, generated output, database schema change, new persistence table, or publishing logic was added.

Earlier completed milestone:
- Phase 8A-7 — Dry Run Readiness Re-Assessment.
- Status: COMPLETE.
- Reassessed first Dry Run readiness after Phase 8A-6 layout geometry capture.
- Updated conceptual Dry Run readiness from 68/100 to 72/100.
- Updated execution Dry Run readiness from 58/100 to 63/100.
- Feasibility remains: route model feasible; navigation model risky; section model risky but improved by real geometry substrate; content model risky; block model not_ready; design token model not_ready.
- Layout geometry impact: real persisted major-region geometry improves route planning, gives section planning a partial substrate, and enables section boundary capture as the next slice.
- Remaining blockers: no section boundary evidence, no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, and no publishing path.
- Recommended next phase: Phase 8A-8 — Section Boundary Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, generated output, database write, navigation capture, runtime mutation capture, or section boundary capture was added.

Earlier completed milestone:
- Phase 8A-6 — Layout Geometry Capture.
- Status: COMPLETE.
- Implemented the first real Evidence Capture expansion slice: deterministic `LayoutGeometryEvidence` capture for rendered pages.
- Captures route path, viewport width/height, document height, and major structural regions only: `body`, `main`, `header`, `nav`, `footer`, `aside`, and `section`.
- Region evidence includes region id, tag name, role, selector, normalized bounding box, and child count.
- Persists geometry in the existing Evidence Capture baseline artifact under `captureExpansionEvidence.layoutGeometryEvidence` and stores the JSON evidence file at `rendered/layout-geometry.json`.
- Exposes summary-only geometry presence in the Evidence Capture baseline read path: `geometryCaptured`, `regionCount`, and viewport size.
- `evaluateCaptureExpansionReadiness(...)` now explicitly treats layout geometry as route-model ready evidence; section model remains partial when geometry exists without section boundary evidence; navigation model behavior is unchanged.
- Recommended next phase: Phase 8A-7 — Dry Run Readiness Re-Assessment.
- No section inference, navigation extraction, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, publishing behavior, candidate discovery execution, candidate review execution, database schema change, LLM call, or new persistence table was added.
- Canonical architecture doc: `docs/architecture/IMPORTER_ARCHITECTURE_SPLIT.md`.
- Reconstruction control-plane closure doc: `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md`.
- Audit doc: `docs/architecture/EVIDENCE_CAPTURE_INVENTORY_AUDIT.md`.
- Original Mirror Fidelity doc: `docs/architecture/ORIGINAL_MIRROR_LIMITATIONS_SURFACE.md`.
- Reconstruction input contract doc: `docs/architecture/RECONSTRUCTION_INPUT_CONTRACT.md`.
- Reconstruction input contract code: `apps/platform/gnr8/architecture/reconstruction-input-contract.ts`.
- Reconstruction planning gate doc: `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md`.
- Reconstruction planning contract code: `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts`.
- Reconstruction candidate discovery contract doc: `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md`.
- Reconstruction candidate discovery contract code: `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts`.
- Reconstruction candidate review contract doc: `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md`.
- Reconstruction candidate review contract code: `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts`.
- Reconstruction package contract doc: `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md`.
- Reconstruction package contract code: `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`.
- Reconstruction dry-run boundary doc: `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`.
- Simulation readiness review doc: `docs/architecture/SIMULATION_READINESS_REVIEW.md`.
- Capture expansion for first Dry Run doc: `docs/architecture/CAPTURE_EXPANSION_FOR_FIRST_DRY_RUN.md`.
- First limited Dry Run design doc: `docs/architecture/FIRST_LIMITED_DRY_RUN_DESIGN.md`.
- Reconstruction dry-run boundary contract code: `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`.
- Capture expansion layout contract code: `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts`.
- Capture expansion plan doc: `docs/architecture/CAPTURE_EXPANSION_PLAN.md`.
- Minimum handoff normalizer code: `apps/platform/gnr8/architecture/reconstruction-input-normalizer.ts`.
- Readiness evaluator code: `apps/platform/gnr8/architecture/reconstruction-readiness-evaluation.ts`.
- Original Mirror Fidelity and Reconstruction Readiness read model: `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`.
- Evidence Capture coverage against `apps/platform/gnr8/architecture/importer-architecture-split-contract.ts`: Supported Now 16/66 fields (24.2%), Partial 33/66 fields (50.0%), Missing 17/66 fields (25.8%).
- Current foundation: raw HTML, rendered DOM, viewport/full-page screenshots, computed style samples, rendered layout geometry, deterministic section boundary evidence, deterministic navigation evidence, direct asset fetch manifests, acquisition evidence, diagnostics, worker job state, worker health, and multi-page route discovery evidence.
- Highest-value gaps: runtime mutation evidence, browser network inventory, media/widget evidence, design token evidence, and normalized fidelity limitations.
- Readiness levels are now deterministic: `NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE`.
- Reconstruction Readiness is now surfaced read-only in Site Workspace from the persisted Evidence Capture baseline.
- Original Mirror Fidelity is now surfaced read-only in Site Workspace from the persisted Evidence Capture baseline.
- Reconstruction Planning Gate now defines metadata-only planning eligibility: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible.
- Reconstruction Planning Package and Reconstruction Candidate contracts exist only as planning metadata. They do not generate React, blocks, workers, approvals, persisted reconstruction, or publishing artifacts.
- Reconstruction Candidate Discovery Contract now defines the future discovery package shape, normalized candidate taxonomy, evidence traceability shape, confidence model, discovery status values, and deterministic discovery eligibility from Planning Gate readiness only.
- Reconstruction Candidate Review Contract now defines the future human review package shape, candidate review item shape, review decisions, review package statuses, deterministic review eligibility from completed discovery metadata, and decision summary behavior.
- Reconstruction Package Contract now defines the reviewed candidate handoff package, approved candidate shape, reconstruction intent values, package statuses, execution readiness values, deterministic package builder behavior, and package summary behavior.
- Reconstruction Control Plane Closure documents the complete Evidence Capture -> Original Mirror Fidelity -> Reconstruction Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review -> Reconstruction Package chain and marks Future Dry Run, Future Reconstruction, and Future Publish as NOT IMPLEMENTED YET.
- Reconstruction Dry Run Boundary now defines the future Dry Run contract boundary, deterministic eligibility from `ReconstructionPackage.executionReadiness` / `ReconstructionPackage.packageStatus`, dry-run package creation, dry-run package validation, deterministic Simulation Plan creation, and Simulation Plan validation.
- Simulation Readiness Review concludes that the control plane is ready for planning and limited first-model planning is possible with high risk, but first meaningful Dry Run execution should still wait for runtime mutation evidence, candidate discovery/review execution, and reconstruction execution boundaries.
- Phase 8A-4 creates the contract vocabulary for the highest-value capture-expansion evidence: layout geometry, section boundaries, navigation structure, and runtime mutation evidence.
- Phase 8A-5 reassesses the post-8A-4 state: conceptual readiness improved because evidence shapes are defined; execution readiness remains limited because capture implementation does not populate those shapes.
- Phase 8A-6 implements layout geometry capture and persistence for rendered major structural regions.
- Phase 8A-8 implements deterministic section boundary capture from persisted layout geometry.
- Phase 8A-9 reassesses the post-section-boundary state: conceptual readiness is 77/100, execution readiness is 68/100, route and section models are feasible, navigation and content models remain risky, and block/design token models remain not_ready.
- Phase 8A-10 implements deterministic navigation capture from rendered DOM links plus existing layout and section evidence.
- Phase 8A-11 reassesses the post-navigation state: conceptual readiness is 82/100, execution readiness is 73/100, route/navigation/section models are feasible, content remains risky, block/design token models remain not_ready, and first limited static Dry Run design is viable.
- Phase 8B-0 defines the first limited Dry Run design: Route Model, Navigation Model, and Section Model only, with documentation-only output shapes, input boundaries, success/failure criteria, human review boundary, and recommended first target site type.
- Evidence coverage summary: layout geometry, section boundaries, and navigation evidence are ready; runtime mutation evidence is missing; route identity, rendered DOM, rendered HTML hash, screenshots, computed styles, fonts, widgets, network, media, design-token, and multi-route evidence remain partial.
- Required P0 minimum handoff evidence: evidence artifact status, source URL, route identity, rendered DOM ref, rendered HTML hash, render status, route capture status, and no blocker fidelity limitation.
- P1/P2 evidence remains required for useful and high-confidence reconstruction, but not for `MINIMUM_READY`: settled DOM snapshot, screenshot refs, computed style samples, loaded font inventory, basic layout boxes, failed/blocked browser requests, iframe/embed/widget inventory, console summaries, runtime mutation summaries, media evidence, and broader network evidence.
- 7F-9 comparison confirms that baseline evidence missing rendered DOM remains `NOT_READY`, while 7F-8-enriched rendered DOM ref, rendered HTML hash, and route identity can reach `MINIMUM_READY` when no blocker fidelity limitation remains.
- Optional evidence such as fonts and widgets improves deterministic summaries but cannot override missing required fields or blocker fidelity limitations.
- No reconstruction execution exists yet. No AI reconstruction, React/block generation, semantic reconstruction, preview mutation, capture behavior change, browser instrumentation, new screenshots, route discovery change, asset rewriting change, script policy change, public rendering change, Servo integration, API change, or DB schema change exists in 7F.
- Provider strategy: Chrome / Playwright is the only active provider; there is no secondary provider. Servo is only a possible later research spike and is not on the active roadmap.
- Route sampling strategy for future expanded evidence: root route, top navigation routes, one listing route, one detail/blog route, one contact/form route, and routes with widget/map/form/gallery/embed signals, capped to a small representative MVP sample.
- Settling strategy for future capture: DOMContentLoaded, bounded network idle, max wait cap, mutation quiet window, lazy-load scroll pass, font readiness timeout, and screenshots after settle.
- Next recommended major phase: Phase 8B-12H — Production Evidence Capture Worker Readiness Fix.

Production smoke-test:
- completed successfully.
- verified batch list, batch detail, timeline, diagnostics, failures, and run/resume controls.
- verified `/gnr8/command-center/hosting`.
- verified `/gnr8/command-center/hosting/[siteId]`.
- verified hosting overview, hosting detail, active version, active artifact, publish timestamp, runtime readiness, readiness drilldown, internal/working domains, external/custom domains, DNS instruction visibility, domain recheck workflow, asset diagnostics summary, and runtime diagnostics.
- verified asset diagnostics drilldown summary, severity classification, remediation guidance, and empty-state handling on hosting detail.
- verified Maver (`transportimaver.si`) production serving through the GNR8 runtime.
- verified active pointer resolution, host binding resolution, raw imported artifact serving, governance enforcement, publish activation, asset serving, compatibility rendering, and OpenStreetMap compatibility fallback.

Phase 7B real website validation:
- Viroidoc discovery, acquisition, assembly, and preview completed successfully.
- Paul Graham discovery, acquisition, and assembly completed successfully.
- Paul Graham route-limit warnings surfaced correctly.
- Initial apex/www canonical-host mismatch assembly blocker was discovered and fixed.

Phase 7C real website validation:
- Viroidoc validation completed.
- MDN validation completed.
- GOV.UK validation completed.
- Paul Graham validation completed.
- Slovenia.info validation completed.
- Discovery quality assessment completed.
- Top-level navigation remains represented even under route limits on sitemap-heavy sites.

Phase 7D production Viroidoc verification:
- latest import run: `client-site-import-1780996748493`
- siteVersionId reused deterministically: `e9257245-0256-4291-9989-66a33ee6741e`
- artifactId: `f44a3f28-5635-4237-b73a-a33af993c73d`
- acquired pages: 20
- valid preview routes: 21
- missing preview routes: 0
- rewritten links: 39
- root route is assembled as `root_entry` using `index.html`
- raw multi-page preview links are separated from transformed preview
- transformed preview remains semantic/fallback and is not the source of truth for route-level inspection

Phase 7F importer architecture evolution:
- Evidence Capture captures source-site evidence as a browser/user sees it.
- Original Mirror provides a read-only, non-semantic, non-AI preview/archive labeled `Original Mirror Preview`.
- Reconstruction is the future GNR8-native editable output layer labeled `GNR8 Reconstruction Preview` when implemented.
- Phase 7F is complete through 7F-15: architecture split, Evidence Capture contract/audit/baseline persistence, Original Mirror Fidelity surface, Reconstruction Input Contract, capture expansion planning, minimum handoff normalization, enrichment, readiness evaluation, readiness surface, planning gate, candidate discovery contract, candidate review contract, reconstruction package contract, and reconstruction control-plane closure.
- ViroiDoc blog/news duplication is not solved by raw preview patching.
- Mono/Maver map behavior likely requires evidence capture plus widget reconstruction.
- Dongle showed source-reference preservation risk.
- DB lifecycle issue was fixed before this phase.
- Raw preview remains useful for route-level inspection and Original Mirror behavior, but Evidence Capture is the foundation for future Reconstruction.

Phase 7F-2.5 evidence capture inventory:
- The full `EvidenceCaptureArtifact` object is not emitted today.
- Chrome/Playwright rendered capture and worker orchestration exist.
- Rendered DOM, screenshots, computed style samples, raw HTML, direct asset acquisition, diagnostics, and route evidence exist.
- Full browser network, rendered layout geometry, script runtime observation, full media/widget inventory, and normalized `KnownFidelityLimitation[]` do not yet exist.
- Do not assume Phase 7F-3 has enough coverage for reconstruction-grade persistence unless a Capture Expansion phase has filled those gaps.

Phase 7F-5 reconstruction input contract:
- `ReconstructionInputArtifact` defines the maximum allowed evidence input into future reconstruction.
- `ReconstructionCandidateArtifact` defines a future output contract only; no generation exists.
- Unsupported evidence must never shape reconstruction: contract metadata, provider/run metadata, response headers, inline script signatures, route priority, and raw file paths.
- Explicit blockers are capture unavailable, capture failed, missing source URL, missing route identity, missing rendered DOM, render failed, and blocker fidelity limitation.
- Confidence inputs are defined but not calculated: DOM, asset, font, layout, widget, media, network, runtime, visual reference, and fidelity limitation completeness.

Phase 7F-6 capture expansion planning:
- `docs/architecture/CAPTURE_EXPANSION_PLAN.md` defines the smallest capture expansion path from `NOT_READY` to `MINIMUM_READY`.
- P0 is Minimum Evidence Handoff Normalization from existing capture surfaces.
- P1/P2 expands reconstruction quality with settled DOM, screenshots, computed styles, layout boxes, fonts, failed/blocked requests, widget inventories, console summaries, mutation summaries, media evidence, and broader network evidence.
- Chrome / Playwright remains the only active provider.

Phase 7F-9 reconstruction readiness re-evaluation:
- `apps/platform/gnr8/architecture/reconstruction-readiness-evaluation.ts` adds deterministic evaluation, baseline/enriched comparison, and summary helpers.
- Enriched rendered DOM ref, rendered HTML hash, and route identity can resolve the minimum handoff blocker set and reach `MINIMUM_READY`.
- Missing rendered DOM and blocker fidelity limitations keep readiness at `NOT_READY`.
- Optional fonts/widgets improve summary evidence only; they do not bypass blockers.
- No reconstruction execution exists yet.

Phase 7F-10 reconstruction readiness surface:
- Site Workspace exposes read-only `Reconstruction Readiness` from the persisted Evidence Capture baseline.
- Site Workspace exposes read-only `Original Mirror Fidelity` from the same baseline.
- The surface does not trigger reconstruction, approve reconstruction, mutate preview behavior, change capture behavior, or create new evidence.

Phase 7F-11 reconstruction planning gate:
- `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts` defines metadata-only `ReconstructionPlanningPackage`, `ReconstructionCandidate`, confidence levels, review states, and planning eligibility.
- `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md` documents the Evidence Capture -> Original Mirror -> Readiness -> Planning Gate boundary.
- Eligibility is deterministic from existing Reconstruction Readiness only: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible.
- Everything after Planning Gate remains NOT IMPLEMENTED YET: candidate discovery, semantic extraction, AI reconstruction, React/block generation, reconstruction workers, reconstruction persistence, approval execution, and publishing.

Phase 7F-12 reconstruction candidate discovery contract:
- `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts` defines metadata-only `ReconstructionCandidateDiscoveryPackage`, normalized candidate types, evidence traceability, confidence shape, discovery statuses, and discovery eligibility.
- `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md` documents the Evidence Capture -> Readiness -> Planning Gate -> Candidate Discovery boundary.
- Discovery eligibility is deterministic from Planning Gate readiness only: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible.
- Current discovery status is `contract_only`; candidate discovery, review, execution, persistence, AI reconstruction, React/block generation, workers, approvals, and publishing remain NOT IMPLEMENTED YET.

Phase 7F-13 reconstruction candidate review contract:
- `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts` defines metadata-only `ReconstructionCandidateReviewPackage`, `ReconstructionCandidateReviewItem`, review decisions, review package statuses, review eligibility, and review summary behavior.
- `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md` documents the Evidence Capture -> Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review boundary.
- Review eligibility is deterministic from Candidate Discovery metadata only: `discovery_complete` with `candidateCount > 0` is eligible; `not_started`, `contract_only`, `discovery_ready`, and `discovery_complete` with zero candidates are not eligible.
- Review decisions are `approved`, `rejected`, `needs_more_evidence`, `defer`, and `unsupported`.
- Package statuses are `pending`, `partially_reviewed`, `approved`, `rejected`, and `needs_more_evidence`.
- Candidate review, review persistence, approval execution, reconstruction execution, AI reconstruction, React/block generation, workers, and publishing remain NOT IMPLEMENTED YET.
- Next recommended phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 7F-14 reconstruction package contract:
- `apps/platform/gnr8/architecture/reconstruction-package-contract.ts` defines metadata-only `ReconstructionPackage`, `ApprovedReconstructionCandidate`, reconstruction intent values, package statuses, execution readiness values, package creation from Candidate Review metadata, and package summary behavior.
- `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md` documents the Evidence Capture -> Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review -> Reconstruction Package boundary.
- `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md` documents the full Evidence Capture -> Original Mirror Fidelity -> Reconstruction Readiness -> Planning Gate -> Candidate Discovery -> Candidate Review -> Reconstruction Package -> Future Dry Run boundary.
- Reconstruction intent values are `recreate_as_native_block`, `preserve_as_embed`, `preserve_as_external_widget`, `convert_to_runtime_provider`, `defer`, and `unsupported`.
- Package statuses are `draft`, `ready_for_reconstruction`, `needs_more_evidence`, `blocked`, and `archived`.
- Execution readiness values are `not_ready`, `ready_for_dry_run`, and `ready_for_future_execution`; Phase 7F-14 never enables future execution and the builder only reaches `ready_for_dry_run` when approved candidates exist with no blocker limitations.
- Approved review items become approved candidates; deferred decisions become deferred candidates; unsupported decisions become unsupported candidates; rejected decisions are excluded from candidate buckets but counted in limitations/notes; `needs_more_evidence` forces package status `needs_more_evidence`.
- Future Dry Run, reconstruction execution, approval execution, AI reconstruction, React/block generation, workers, persistence, and publishing remain NOT IMPLEMENTED YET.
- Next recommended phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 7F-15 reconstruction control-plane closure:
- `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md` is the canonical closure document for the deterministic Evidence Capture -> Reconstruction Package control plane.
- Contract chain audit result: IDs now link backward through Review, Discovery, and Planning; `siteVersionId`, `routeScope`, and `readinessLevel` are preserved from Planning through Package; readiness remains deterministic and is not recalculated by Review or Package; blockers/limitations remain layer-scoped; status fields are field-qualified.
- Status taxonomy result: Evidence Capture uses `status`; Original Mirror uses mirror status plus fidelity badge/readiness; Reconstruction uses `readinessLevel`; Planning and Review use `reviewStatus`; Discovery uses `discoveryStatus`; Package uses `packageStatus`; execution gating uses `executionReadiness`.
- Future Dry Run, Future Reconstruction, Future Publish, dry-run execution, reconstruction execution, approval execution, AI generation, React/block generation, workers, persistence, and publishing remain NOT IMPLEMENTED YET.
- Recommended next major phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 8A-0 dry-run boundary planning:
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts` defines metadata-only `ReconstructionDryRunPackage`, dry-run status values, simulation status values, generated output type values, boundary rules, and dry-run eligibility from Reconstruction Package metadata.
- `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md` documents the Reconstruction Package -> Dry Run boundary, allowed inputs, informational outputs, restrictions, safety guarantees, approval requirements, and future flow.
- Dry Run MAY read Reconstruction Package, Evidence Capture artifacts, Reconstruction Candidates, and Review decisions, and may produce simulation artifacts.
- Dry Run MUST NOT publish, modify the source site, modify production content, execute migrations, create live websites, modify domains, modify DNS, or write runtime content.
- Eligibility rules: `ready_for_dry_run` is eligible; `not_ready`, `needs_more_evidence`, and `blocked` are not eligible.
- Dry Run output is informational and is not approved output. Future approval remains required.
- Dry-run execution, reconstruction execution, AI generation, React/block generation, workers, runtime writes, database writes, domain/DNS changes, and publishing remain NOT IMPLEMENTED YET.
- Recommended next major phase: Phase 8A-1 — First Dry Run Contract Validation.

Phase 8A-1 first dry-run contract validation:
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts` now builds a creation-time `ReconstructionDryRunPackage` from a `ReconstructionPackage` without executing a dry run.
- Ready packages create `status = planned`, `simulationStatus = pending`, `generatedOutputs = []`, `simulationArtifacts = []`, and `blockers = []`.
- Not-ready packages create `status = blocked`, `simulationStatus = unavailable`, `generatedOutputs = []`, `simulationArtifacts = []`, and blockers explaining why.
- `validateReconstructionDryRunPackage(...)` checks required IDs, route scope, status values, blocked-package blockers, empty generated outputs, empty simulation artifacts, non-simulated package status, non-complete simulation status, informational-only output, and future approval required.
- The builder does not accept status, simulation status, simulation artifact, blocker, or generated output overrides.
- Dry-run execution, reconstruction execution, AI generation, React/block generation, workers, runtime writes, database writes, domain/DNS changes, and publishing remain NOT IMPLEMENTED YET.

Phase 8A-2 dry-run simulation planning contract:
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts` now builds a metadata-only `ReconstructionSimulationPlan` from a `ReconstructionDryRunPackage`.
- Planned Dry Run Packages create `planStatus = planned` with deterministic planned steps.
- Blocked Dry Run Packages create `planStatus = blocked` with blockers and no planned steps.
- Planned step types are `validate_package`, `load_evidence`, `map_candidates`, `plan_route_model`, `plan_section_model`, `plan_block_model`, `plan_content_model`, `plan_design_tokens`, `plan_navigation`, and `produce_simulation_summary`.
- `validateReconstructionSimulationPlan(...)` checks required IDs, route scope, planned-package steps, blocked-plan blockers, planning-only status values, planned descriptor expected outputs, and rejects generated output shapes, simulation artifacts, and executed/running/completed/simulated states.
- Simulation Plan statuses are only `not_started`, `planned`, and `blocked`.
- Simulation execution, dry-run execution, reconstruction execution, AI generation, React/block generation, workers, runtime writes, database writes, domain/DNS changes, and publishing remain NOT IMPLEMENTED YET.
- Phase 8A-2 is superseded by the Phase 8A-3 readiness review for next-step planning.

Phase 8A-3 simulation readiness review:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` audits Evidence Capture baseline, enrichment, Reconstruction Readiness, Planning Gate, Candidate Discovery, Candidate Review, Reconstruction Package, Dry Run Package, and Simulation Plan readiness.
- Dry Run Readiness score: 58/100.
- Evidence coverage summary: source URL is ready; route identity, rendered DOM, rendered HTML hash, screenshots, computed styles, fonts, widgets, network, media, navigation, section, design-token, and multi-route evidence are partial; layout geometry and runtime mutation evidence are missing.
- First-model feasibility: route model is feasible; navigation, section, and content models are risky; block and design token models are not ready.
- Critical gaps: minimum route-level handoff normalization, rendered layout geometry, runtime mutation evidence, and actual candidate discovery/review availability.
- Recommended next major phase: Phase 8A-4 — Capture Expansion For First Dry Run.

Phase 8A-4 capture expansion for first Dry Run:
- `apps/platform/gnr8/architecture/evidence-capture-layout-contract.ts` defines contract-only `LayoutGeometryEvidence`, `SectionBoundaryEvidence`, `NavigationEvidence`, and `RuntimeMutationEvidence`.
- Allowed section region types are `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
- Confidence levels are `LOW`, `MEDIUM`, and `HIGH`.
- Allowed runtime mutation types are `dom_insert`, `dom_remove`, `dom_replace`, `style_change`, `attribute_change`, and `unknown`.
- `evaluateCaptureExpansionReadiness(...)` reports `READY`, `PARTIAL`, or `MISSING` for route, navigation, and section model support using evidence presence only.
- `docs/architecture/CAPTURE_EXPANSION_FOR_FIRST_DRY_RUN.md` documents why these evidence types matter, how they relate to route/navigation/section models, why block generation remains out of scope, and how this feeds future Dry Run readiness.
- Capture implementation, runtime observers, inference engines, Dry Run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, database writes, and publishing remain NOT IMPLEMENTED YET.
- Recommended next major phase: Phase 8A-5 — Dry Run Readiness Re-Assessment.

Phase 8A-5 dry-run readiness re-assessment:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` now includes the post-8A-4 reassessment.
- Previous score: 58/100.
- Updated conceptual score: 68/100.
- Updated execution score: 58/100.
- Feasibility: route model feasible; navigation model risky; section model risky; block model not_ready; content model risky; design token model not_ready.
- Implementation gaps: layout geometry, section boundary evidence, navigation evidence, and runtime mutation evidence have contracts, but capture is not implemented, persistence is not implemented, and readiness use is contract-level only.
- Recommended next major phase: Phase 8A-6 — First Capture Implementation Slice.
- Recommended first 8A-6 path: layout geometry capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, capture implementation, browser instrumentation, generated output, database write, or publishing logic was changed.

Phase 8A-6 layout geometry capture:
- `apps/platform/gnr8/architecture/layout-geometry-capture.ts` adds deterministic normalization and major-region filtering for layout geometry evidence.
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-service.ts` captures rendered layout geometry from Playwright pages for `body`, `main`, `header`, `nav`, `footer`, `aside`, and `section` only.
- `RenderedCaptureResult` and worker response plumbing carry `layoutGeometryEvidence`.
- `apps/worker/gnr8/site/site-render-capture-service.ts` persists geometry to `rendered/layout-geometry.json`, records `captureEvidence.layoutGeometryPath`, and attaches geometry to the existing Evidence Capture baseline artifact.
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts` stores geometry under `captureExpansionEvidence.layoutGeometryEvidence` and exposes `summaries.layoutGeometry`.
- `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts` exposes summary-only geometry presence: `geometryCaptured`, `regionCount`, and viewport size.
- `evaluateCaptureExpansionReadiness(...)` treats layout geometry as route-model ready evidence and section-model partial evidence when section boundary evidence is absent. Navigation readiness is unchanged.
- Section boundary capture, navigation capture, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, candidate discovery execution, candidate review execution, publishing behavior, LLM calls, and database schema changes remain NOT IMPLEMENTED.
- Recommended next major phase: Phase 8A-7 — Dry Run Readiness Re-Assessment.

Phase 8A-7 dry-run readiness re-assessment after layout geometry:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` now includes the post-8A-6 reassessment.
- Previous conceptual score: 68/100.
- Previous execution score: 58/100.
- Updated conceptual score: 72/100.
- Updated execution score: 63/100.
- Feasibility: route model feasible; navigation model risky; section model risky but improved by the persisted geometry substrate; block model not_ready; content model risky; design token model not_ready.
- Evidence implementation: layout geometry now has a contract, capture implementation, persistence through `rendered/layout-geometry.json` and the baseline artifact, and readiness helper usage.
- Geometry impact: route planning has real viewport/document/major-region evidence; section planning has a partial substrate; section boundary capture is now the correct next slice.
- Remaining blockers: no section boundary evidence, no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, and no publishing path.
- Recommended next major phase: Phase 8A-8 — Section Boundary Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, generated output, database write, navigation capture, runtime mutation capture, or section boundary capture was changed.

Phase 8A-8 section boundary capture:
- `apps/platform/gnr8/architecture/section-boundary-capture.ts` adds deterministic section boundary classification from existing layout geometry plus rendered DOM structure.
- Allowed section types remain limited to `hero`, `navigation`, `content`, `sidebar`, `footer`, `gallery`, `form`, `map`, and `unknown`.
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts` stores section boundary evidence under `captureExpansionEvidence.sectionBoundaryEvidence` in the existing Evidence Capture baseline artifact.
- `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts` exposes summary-only section evidence: `sectionEvidenceCaptured`, `sectionCount`, and `sectionTypesPresent`.
- `evaluateCaptureExpansionReadiness(...)` now marks Section Model READY when section boundary evidence exists. Route Model remains READY from route/geometry evidence, and Navigation Model behavior is unchanged.
- Navigation extraction, runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, candidate discovery execution, candidate review execution, publishing behavior, LLM calls, generated outputs, and database schema changes remain NOT IMPLEMENTED.
- Recommended next major phase: Phase 8A-9 — Dry Run Readiness Re-Assessment.

Phase 8A-9 dry-run readiness re-assessment after section boundaries:
- `docs/architecture/SIMULATION_READINESS_REVIEW.md` now includes the post-8A-8 reassessment.
- Previous conceptual score: 72/100.
- Previous execution score: 63/100.
- Updated conceptual score: 77/100.
- Updated execution score: 68/100.
- Feasibility: route model feasible; navigation model risky; section model feasible; block model not_ready; content model risky; design token model not_ready.
- Evidence coverage: layout geometry READY; section boundaries READY; navigation evidence MISSING; runtime mutation evidence MISSING.
- Section boundary impact: section evidence now provides classified selectors, boxes, region types, and confidence, making the Section Model READY while leaving navigation extraction, runtime stability, candidate discovery/review, simulation, reconstruction, generated outputs, and publishing unchanged.
- Remaining blockers: no navigation extraction, no runtime mutation evidence, no candidate discovery execution, no candidate review execution, no simulation/reconstruction execution, no generated outputs, no block/design token generation, and no publishing path.
- Recommended next major phase: Phase 8A-10 — Navigation Capture.
- No importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, candidate discovery behavior, candidate review behavior, dry-run execution, simulation execution, reconstruction execution, AI generation, React generation, block generation, persistence schema, worker execution, publishing behavior, LLM call, capture implementation, navigation capture, runtime mutation capture, generated output, database write, or publishing logic was changed.

Phase 8A-10 navigation capture:
- `apps/platform/gnr8/architecture/navigation-capture.ts` adds deterministic navigation extraction from rendered DOM anchors, existing layout geometry, and section boundary evidence.
- Captured navigation item fields are label, href, stable position, and confidence level.
- Confidence levels remain limited to `LOW`, `MEDIUM`, and `HIGH`.
- `HIGH` is assigned to anchors inside `nav`, navigation/menu roles, or header navigation regions; `MEDIUM` is assigned to repeated navigation-like link groups; `LOW` is assigned to inferred navigation containers.
- `apps/platform/gnr8/architecture/evidence-capture-baseline-artifact.ts` stores navigation evidence under `captureExpansionEvidence.navigationEvidence` in the existing Evidence Capture baseline artifact.
- `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts` exposes summary-only navigation evidence: `navigationCaptured`, `navigationItemCount`, and `navigationRoutesDiscovered`.
- `evaluateCaptureExpansionReadiness(...)` marks Navigation Model READY when `NavigationEvidence` exists; Route Model and Section Model remain READY from existing route/geometry and section boundary evidence.
- Runtime mutation capture, dry-run execution, reconstruction execution, AI generation, React generation, block generation, candidate discovery execution, candidate review execution, publishing behavior, LLM calls, generated outputs, and database schema changes remain NOT IMPLEMENTED.
- Recommended next major phase: Phase 8A-11 — Dry Run Readiness Re-Assessment.

Dedicated progress doc:
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`

Current completed chain:
- Production Migration Gap Analysis
- CMS Reality Check
- CMS Slot Materialization
- Renderer Reality Check
- Migration MVP Renderer E2E Readiness Test
- Durable Migration Job Store
- Durable Migration Runtime Wiring
- Durable Batch Migration Model
- Operator Driven Batch Execution
- Batch Execution Observability
- Command Center Integration MVP
- Hosting Operations MVP
- Hosting Hardening
- Hosting Operations Workflow Review
- Readiness & Domain Operations MVP
- Internal vs Custom Domain Visibility
- Asset Diagnostics Drilldown
- Active Serving Consistency
- Imported Runtime Reconciliation
- Governance Reconciliation
- Publish Lineage Reconciliation
- Host-Binding Raw Template Serving
- Mono Map Compatibility Restoration
- Maver Production Validation
- Multi-Page Import MVP
- Discovery Expansion
- Multi-Page Raw Preview Correctness + Observability
- Importer Architecture Split
- Evidence Capture Inventory Audit

Latest completed migration capabilities:
- `MigrationBatchExecutor`
- batch run/resume routes
- execution policies
- batch event persistence
- batch observability service
- batch summary model
- timeline API
- observability API
- failure reporting
- diagnostics surfaces
- Command Center migration batch section
- migration batch list page
- migration batch detail page
- batch summary surface
- batch timeline surface
- run/resume controls
- real Postgres verification
- production smoke-test verification
- hosting overview page
- hosting detail page
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
- asset diagnostics severity classification
- asset diagnostics remediation guidance
- asset diagnostics empty-state handling
- runtime diagnostics visibility
- ownership site ID to runtime site ID detail resolution
- Hosting Operations
- Asset Diagnostics
- Active Serving Consistency
- Imported Runtime Reconciliation
- Production Validation
- Mono Compatibility Validation
- multi-page discovery integration
- route candidate discovery
- multi-page acquisition
- acquisition diagnostics
- fetched-page evidence persistence
- deterministic route-map assembly
- routeMap persistence
- htmlPathMap persistence
- preview-only route-map resolver
- nested route preview support
- explicit route misses
- internal link rewriting
- route-aware navigation
- multi-page preview validation
- readiness classification
- route validation
- link validation
- operator summary
- route tables
- operator-readable warnings, blockers, recommendations, and diagnostics
- sitemap.xml discovery
- sitemap_index.xml discovery
- nested sitemap traversal
- sitemap provenance
- sitemap operator visibility
- robots.txt parsing
- sitemap declarations
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
- raw/transformed preview boundary clarification
- importer architecture split into Evidence Capture, Original Mirror, and Reconstruction
- evidence capture inventory audit baseline and coverage matrix
- reconstruction input contract, readiness model, blocker model, and future candidate contract

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
- Imported Runtime Reconciliation
- Governance Reconciliation
- Publish Lineage Reconciliation
- Host-Binding Raw Template Serving
- Mono Map Compatibility Restoration
- Maver Production Validation
- Multi-Page Import MVP
- Discovery Expansion
- Multi-Page Raw Preview Correctness + Observability
- Importer Architecture Split

Phase 6 completion notes:
- Phase 6 is COMPLETE.
- Hosting Operations MVP is complete.
- Hosting Hardening is complete.
- Canonical Active Serving Resolution is complete.
- Imported Runtime Reconciliation is complete.
- Raw imported production serving is complete.
- Compatibility-based runtime adaptation has been validated in production.
- Readiness drilldown and domain operations are operational in Hosting Operations.
- Internal/working domains and external/custom domains are separated for operator visibility.
- DNS instructions and domain recheck workflow are visible without introducing DNS execution.
- Asset Diagnostics Drilldown is operational on hosting detail.
- Asset diagnostics now expose summary, severity classification, remediation guidance, and empty-state handling.
- Production hosting smoke verification passed for the hosting overview and hosting detail routes.
- Production asset diagnostics drilldown smoke verification passed.
- Maver (`transportimaver.si`) successfully serves through the GNR8 runtime as a pixel-perfect production clone.
- Mono compatibility validation restored map rendering through the Leaflet/OpenStreetMap runtime provider.
- Publish workflow remains read-only from Hosting Operations.
- Rollback UI remains intentionally excluded.
- No DNS/provider execution was introduced.
- Website OS remains frozen.

Phase 7B completion notes:
- Phase 7B is COMPLETE.
- Phase 7B moved GNR8 from single-page import validation to static multi-page website import validation.
- Scope remained intentionally limited to static websites.
- Discovery-only integration identifies internal page candidates from a seed page.
- Controlled acquisition fetches discovered child pages and preserves evidence.
- Raw artifact assembly creates a durable deterministic multi-page route structure.
- Controlled preview renders child routes from assembled route maps.
- Internal link rewriting enables imported navigation inside controlled preview mode.
- Validation classifies preview readiness as `ready`, `ready_with_warnings`, or `blocked`.
- Operators can determine import readiness, remaining warnings, blockers, and next actions without provenance JSON, debug endpoints, or database inspection.
- Public production multi-page serving was not activated.
- Automatic publish activation was not added.

Phase 7C completion notes:
- Phase 7C is COMPLETE.
- Phase 7C classification is A/B successful.
- No architectural blockers were found.
- Discovery expansion is operational.
- Sitemap discovery now covers `sitemap.xml`, `sitemap_index.xml`, nested sitemap traversal, sitemap provenance, and sitemap operator visibility.
- Robots discovery now covers `robots.txt` parsing, sitemap declarations, allow/disallow evidence, route governance evidence, and operator visibility.
- Canonical discovery now covers canonical URL extraction, hreflang extraction, canonical conflict detection, canonical provenance, and operator visibility.
- Redirect / Alias discovery now covers redirect evidence, alias groups, route collision evidence, redirect provenance, and operator visibility.
- Discovery quality validation covered Viroidoc, MDN, GOV.UK, Paul Graham, Slovenia.info, and discovery quality assessment.
- Discovery priority balancing now covers tiered route prioritization, seed-visible navigation protection, route-budget balancing, sitemap-heavy site protection, and operator diagnostics.
- Key real-world outcome: top-level navigation remains represented even under route limits on sitemap-heavy sites.

Phase 7D completion notes:
- Phase 7D is COMPLETE through 7D-9.
- Phase 7D final checkpoint validated multi-page raw preview correctness and observability in production.
- Latest Viroidoc import run: `client-site-import-1780996748493`.
- Deterministic siteVersionId reuse verified: `e9257245-0256-4291-9989-66a33ee6741e`.
- Verified artifactId: `f44a3f28-5635-4237-b73a-a33af993c73d`.
- Viroidoc acquired 20 pages.
- Viroidoc produced 21 valid preview routes.
- Viroidoc produced 0 missing preview routes.
- Viroidoc rewrote 39 links.
- Root route assembly is `root_entry` using `index.html`.
- Raw multi-page preview links are separated from transformed preview.
- Transformed preview remains semantic/fallback and is not the source of truth for route-level inspection.
- No runtime behavior was changed.
- No import logic was changed.

Phase 7F completion notes:
- Phase 7F is COMPLETE through 7F-15 as importer architecture evolution and reconstruction control-plane closure.
- Canonical architecture doc: `docs/architecture/IMPORTER_ARCHITECTURE_SPLIT.md`.
- Type scaffolding: `apps/platform/gnr8/architecture/importer-architecture-split-contract.ts`.
- Required terminology: Evidence Capture, Capture Provider, Original Mirror Preview, GNR8 Reconstruction Preview, Known Fidelity Limitation, Reconstruction Candidate.
- No ViroiDoc fix, Maver/Mono map fix, active Servo provider, AI reconstruction, reconstruction execution, React/block generation, preview renderer rewrite, import-limit change, or script-policy change was included.

Phase 8A-0 completion notes:
- Phase 8A-0 is COMPLETE as Dry Run Boundary Planning.
- Canonical dry-run boundary doc: `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`.
- Dry-run boundary contract: `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`.
- No dry-run execution, reconstruction execution, AI generation, React/block generation, runtime writes, database writes, domain/DNS changes, workers, or publishing was included.

Current critical path:
- Phase 8A-2 — Dry Run Simulation Planning Contract
- Billing

Next recommended milestone:
- Phase 8A-2 — Dry Run Simulation Planning Contract.

Explicit exclusions still in force:
- no Website OS runtime expansion
- no provider execution
- no DNS execution
- no billing automation yet
- no queue/worker unless a future phase explicitly introduces it
- no autonomous execution
- no dynamic route discovery
- no authenticated/private areas
- no JavaScript click-path crawling
- no e-commerce discovery
- no CMS page materialization
- no compatibility-provider extraction
- no public production multi-page serving
- no dynamic content extraction
- no automatic publish activation

## A) Current Project State

GNR8 is currently in Migration Platform MVP Buildout mode.
The active emphasis is website migration, renderer, CMS, durable jobs, durable batches, hosting, domains, billing, deterministic contracts, approval/handoff safety, and no hidden execution.
Bootstrap runtime state (`2026-06-03`): Observation Runtime v1 completed; Insight Runtime v1 completed; Recommendation Runtime v1 completed; Optimization Runtime v1 completed; Optimization Scoring Runtime v1 completed; Proposal Candidate Runtime v1 completed; Proposal Approval Runtime v1 completed; Approval State Runtime v1 completed; Approval Queue Preview Runtime v1 completed; Execution Readiness Runtime v1 completed; Execution Package Preview Runtime v1 completed; Execution Package Readiness Runtime v1 completed; Execution Contract Preview Runtime v1 completed; Execution Authorization Readiness Runtime v1 completed; Execution Authorization Package Runtime v1 completed; Execution Plan Readiness Runtime v1 completed; Execution Candidate Runtime v1 completed; Execution Candidate Readiness Runtime v1 completed; Execution Candidate Package Runtime v1 completed; Execution Candidate Authorization Runtime v1 completed; Execution Candidate Authorization Readiness Runtime v1 completed; Execution Candidate Authorization Package Runtime v1 completed.
Completed:
- Execution Candidate Runtime v1
- Execution Candidate Readiness Runtime v1
- Execution Candidate Package Runtime v1
- Execution Candidate Authorization Runtime v1
- Execution Candidate Authorization Readiness Runtime v1
- Execution Candidate Authorization Package Runtime v1
Current validated runtime endpoint:
- Workspace Overview
Website OS runtime expansion status:
- PAUSED
Dedicated pause note:
- Website OS runtime expansion is intentionally paused.
- Future continuation point: Execution Artifact Runtime family.
- Execution Artifact Runtime family is not currently part of the migration-critical path.
Next migration platform milestone:
- Phase 8A-1 — First Dry Run Contract Validation.
- Phase 5A completed Command Center integration for migration batches; execution remains operator-driven and queue/worker orchestration does not exist yet.
- Phase 6A completed read-only hosting operations observability for Command Center; hosting overview/detail are operational and production smoke-tested.
- Phase 6B completed Hosting Operations workflow review.
- Phase 6C-A completed Readiness & Domain Operations MVP.
- Phase 6C-A2 completed Internal vs Custom Domain Visibility.
- Phase 6C-B completed Asset Diagnostics Drilldown, including severity and remediation model visibility.
- Hosting Operations MVP is functionally complete.
- Phase 6 completed Hosting Operations, Hosting Hardening, Active Serving Consistency, Imported Runtime Reconciliation, Production Validation, and Mono Compatibility Validation.
- Phase 7B completed static multi-page import validation and is Operator Ready.
- Phase 7C completed Discovery Expansion and is operational.
Current completed runtime chain:
- `Proposal Approval Queue → Execution Readiness Execution Package → Execution Contract Execution Contract Readiness → Execution Bundle Execution Bundle Readiness → Execution Authorization Execution Authorization Readiness Execution Authorization Package → Execution Intent Execution Intent Readiness → Execution Plan Execution Plan Readiness → Execution Candidate Execution Candidate Readiness Execution Candidate Package → Execution Candidate Authorization Execution Candidate Authorization Readiness Execution Candidate Authorization Package`
Candidate Authorization Family completed. Governance graph expanded. Execution remains blocked. Website OS remains read-only.
Execution Candidate Authorization Family milestone is complete and documented (completion date: `2026-06-03`; completed milestones: `Execution Candidate Authorization Runtime v1`, `Execution Candidate Authorization Readiness Runtime v1`, `Execution Candidate Authorization Package Runtime v1`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-authorization-package.ts`; runtime summary: candidate authorization preview layer, candidate authorization readiness evaluation, and candidate authorization package assembly; verified Maver results: `Homepage Conversion Flow authorization blocked readiness incomplete package incomplete`, `Homepage Quality & Messaging authorization ready preview readiness nearly ready package ready`, `Validation Runtime authorization ready preview readiness ready package ready`; governance states: `execution_candidate_authorization_preview_only`, `execution_candidate_authorization_readiness_preview_only`, `execution_candidate_authorization_package_preview_only`; governance lock: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`; preserved boundaries: read-only, non-executable, no execution, no mutation, no publishing, no provider execution, no AI actions; conclusion: Execution Candidate Authorization Family completed successfully, governance graph extended, all governance boundaries preserved, execution remains blocked, mutation remains blocked, publishing remains blocked, provider execution remains blocked; Website OS runtime expansion is paused; future continuation point: `Execution Artifact Runtime family`, not active and not migration-critical).
Execution Candidate Runtime family v1 milestone is complete and documented (completion date: `2026-06-03`; completed milestones: `Execution Candidate Runtime v1`, `Execution Candidate Readiness Runtime v1`, `Execution Candidate Package Runtime v1`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-candidate.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-candidate-package.ts`; runtime summary: deterministic preview-only candidate generation, candidate qualification evaluation, and candidate package assembly; verified Maver results: `Homepage Conversion Flow Candidate=blocked_candidate Candidate Readiness=incomplete Candidate Package=package_incomplete`, `Homepage Quality & Messaging Candidate=candidate_ready_preview Candidate Readiness=nearly_ready Candidate Package=package_ready`, `Validation Runtime Candidate=candidate_ready_preview Candidate Readiness=ready Candidate Package=package_ready`; governance states: `execution_candidate_preview_only`, `execution_candidate_readiness_preview_only`, `execution_candidate_package_preview_only`; governance lock: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`; preserved boundaries: no execution, no mutations, no publishing, no provider execution, no AI actions, no jobs, no queues, no workers; architecture chain: `Proposal → Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Candidate → Execution Candidate Readiness → Execution Candidate Package`; conclusion: Website OS now supports deterministic preview-only candidate generation, candidate qualification evaluation, and candidate package assembly; no execution, mutation, provider execution, or publishing capability exists; next dependency milestone now completed: `Execution Candidate Authorization Family`).
Execution Plan Readiness Runtime v1 milestone is complete and documented (completion date: `2026-06-03`; runtime file: `apps/platform/gnr8/runtime/twin/twin-execution-plan-readiness.ts`; implemented function: `buildExecutionPlanReadinessRecords(...)`; emitted records: `executionPlanReadinessRecords`; fields: `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionPlanPresent`, `planningArtifactsPresent`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`; verified Maver results: `Homepage Conversion Flow readinessState=incomplete readinessScore=80`, `Homepage Quality & Messaging readinessState=nearly_ready readinessScore=90`, `Validation Runtime readinessState=ready readinessScore=100`; governance lock: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_plan_readiness_preview_only`; preserved boundaries: no execution, no approval workflow, no mutation execution, no publishing, no provider execution, no queues/workers, no API changes, no database schema changes, no UI changes, no AI model calls; architecture chain: `Planning Candidates → Governance Review → Approval Records → Approval States → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Intent → Execution Intent Readiness → Execution Plan Preview → Execution Plan Readiness → Execution Artifact Preview`; conclusion: Workspace Overview now exposes deterministic read-only Execution Plan Readiness records derived from Execution Plan Preview and planning artifact presence; no execution capability exists; next dependency milestone now completed: `Execution Candidate Runtime v1`).
Execution Authorization Package Runtime v1 milestone is complete and documented (completion date: `2026-06-03`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-authorization-package.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-authorization-package.test.ts`; implemented function: `generateTwinExecutionAuthorizationPackageRecords(authorizationPreviews, authorizationReadinessRecords)`; model: `TwinExecutionAuthorizationPackageRecord`; fields: `proposalId`, `proposalTitle`, `packageState`, `readinessState`, `readinessScore`, `authorizationType`, `includedComponents`, `missingComponents`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; package states: `package_incomplete`, `package_ready`; verified Transporti Maver results: `Improve Homepage Conversion Flow packageState=package_incomplete readinessState=not_ready readinessScore=85 authorizationType=conversion_authorization missingComponents=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging packageState=package_ready readinessState=nearly_ready readinessScore=95 authorizationType=content_authorization missingComponents=[design_evidence]`, `Maintain Read-Only Validation Mode packageState=package_ready readinessState=ready readinessScore=100 authorizationType=governance_validation_authorization missingComponents=[]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_authorization_package_preview_only`; diagnostics: `TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED`, `TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED`; preserved boundaries: no authorization workflow, no approval workflow, no execution workflow, no operator actions, no publishing, no provider execution, no mutations, no AI model calls, no background jobs, no API routes, no database schema changes, read-only deterministic package modeling only; architecture chain: `Proposal Candidate → Proposal Approval Preview → Proposal Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Plan Preview`; conclusion: Workspace Planning Console now exposes deterministic read-only Execution Authorization Package records derived from Execution Authorization Preview and Execution Authorization Readiness records; no execution capability exists; next dependency milestone now completed: `Execution Plan Readiness Runtime v1`).
Execution Authorization Readiness Runtime v1 milestone is complete and documented (completion date: `2026-06-03`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-authorization-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-authorization-readiness.test.ts`; implemented function: `generateTwinExecutionAuthorizationReadinessRecords(authorizationPreviews)`; model: `TwinExecutionAuthorizationReadinessRecord`; fields: `proposalId`, `proposalTitle`, `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; readiness states: `not_ready`, `nearly_ready`, `ready`; verified Transporti Maver results: `Improve Homepage Conversion Flow readinessState=not_ready readinessScore=85 requirementsMissing=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging readinessState=nearly_ready readinessScore=95 requirementsMissing=[design_evidence]`, `Maintain Read-Only Validation Mode readinessState=ready readinessScore=100 requirementsMissing=[]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_authorization_readiness_preview_only`; diagnostics: `TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED`, `TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED`; preserved boundaries: no authorization workflow, no approval workflow, no execution workflow, no operator actions, no publishing, no provider execution, no mutations, no AI model calls, read-only deterministic runtime only; architecture chain: `Proposal Candidate → Proposal Approval Preview → Proposal Approval → Approval State → Approval Queue → Execution Readiness → Execution Package Preview → Execution Package Readiness → Execution Contract Preview → Execution Contract Readiness → Execution Bundle Preview → Execution Bundle Readiness → Execution Authorization Preview → Execution Authorization Readiness → Execution Authorization Package → Execution Plan Preview`; conclusion: Workspace Planning Console now exposes deterministic read-only Execution Authorization Readiness records derived from Execution Authorization Preview records; no execution capability exists; next dependency milestone now completed: `Execution Authorization Package Runtime v1`).
Proposal Candidate Operator UX Cleanup v1 milestone is complete and verified (completion date: `2026-06-01`; Workspace Overview hierarchy: `Overview` -> `Proposal Candidates` -> `Optimization Ranking` -> `Validation Surfaces` -> `Provider Governance Snapshot` -> `Explicit Boundaries` -> `Advanced Runtime Analysis`; operator-first update: `Proposal Candidates` is now the primary operator-facing section; `Advanced Runtime Analysis` is collapsed by default and contains `Observations`, `Insights`, `Recommendations`, `Optimization Opportunities`, `Debug Diagnostics`, and `Twin Source chain`; visible operator-facing deployed sections for `Transporti Maver`: `Proposal Candidates`, `Optimization Ranking`, `Provider Governance Snapshot`, `Explicit Boundaries`; preserved boundaries: no runtime logic changes, no proposal generation changes, no approval workflow, no API changes, no database changes, no execution controls, no approve/reject controls, no publish controls, no AI action controls; validation: workspace overview tests passed and `next build` passed; conclusion: Workspace Overview now behaves as an operator-first Website OS console rather than a runtime/debug transcript; success criteria: future bootstrap resumes from Proposal Candidate Operator UX Cleanup v1 as the canonical Workspace Overview UX baseline; recommended next milestone: `Proposal Approval Preview Runtime v1`).
Workspace Navigation Wiring v1 milestone is complete and verified (connected surfaces: `/gnr8/admin/providers`, `/gnr8/admin/workspace-overview`, `/gnr8/admin/twin-preview`, `/gnr8/admin/twin-preview-real`; navigation sections implemented: `Website OS`, `Validation Surfaces`, `Website OS Navigation`; preserved boundaries: UI/navigation only + read-only links only + no runtime/API/database/Provider/Twin changes + no forms/actions/editing/publish/AI controls; validation: admin test suite passed `148/148` and `next build` passed; conclusion: Website OS runtime surfaces are now discoverable through navigation rather than requiring direct URL knowledge; recommended next milestone: Real Imported Site Workspace Overview Runtime).
Persisted Migration OS Evidence -> Website OS Workspace Overview milestone is complete and verified (completion date: `2026-06-01`; verified runtime chain: `Persisted Migration OS runtime evidence` -> `buildWebsiteDigitalTwin()` -> `generateTwinObservations(twin)` -> `generateTwinInsights(observations)` -> `generateTwinRecommendations(insights)` -> `generateTwinOptimizationOpportunities(recommendations)` -> `scoreOptimizationOpportunities(opportunities)` -> `generateTwinProposalCandidates(input)` -> `Workspace Overview UI`; verified deployed runtime values: `selectedSource=persisted_runtime_import_evidence`, `persistedEvidenceSelected=true`, `persistedEvidenceReason=persisted_runtime_evidence_selected`, `persistedEvidenceShapeStatus=valid`, `providerState=persisted/runtime-import-evidence`; verified imported site: `title=Transporti Maver d.o.o.`, `siteVersionId=88253466-783e-4484-8b68-df6c83b8a11c`, `importId=maver-reimport-1778654629704-63c7fcad`, `pages=2`, `sections=1`, `homepagePath=index.html`; successful diagnostics: `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED`, `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID`, `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED`; canonical bootstrap snapshot update: Website OS no longer depends exclusively on fixtures and Workspace Overview can hydrate from persisted Migration OS evidence; success criteria: future bootstrap resumes from `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console` as the completed canonical runtime chain; recommended next milestone: `Execution Contract Readiness Runtime v1`).
Execution Contract Preview Runtime v1 milestone is complete and documented (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-contract-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-contract-preview.test.ts`; implemented function: `generateTwinExecutionContractPreviews(packageReadinessRecords)`; model: `TwinExecutionContractPreview`; states: `contract_preview_ready`, `contract_preview_incomplete`, `contract_preview_blocked`; verified Transporti Maver results: `Improve Homepage Conversion Flow contractPreviewState=contract_preview_incomplete readinessScore=70 contractType=conversion_execution_contract`, `Improve Homepage Quality and Messaging contractPreviewState=contract_preview_ready readinessScore=90 contractType=content_execution_contract`, `Maintain Read-Only Validation Mode contractPreviewState=contract_preview_ready readinessScore=100 contractType=governance_validation_contract`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_contract_preview_only`; diagnostics: `TWIN_EXECUTION_CONTRACT_PREVIEW_STARTED`, `TWIN_EXECUTION_CONTRACT_PREVIEW_COMPLETED`; preserved boundaries: no execution, no approval workflow, no mutation execution, no publishing, no provider execution, no AI model calls, deterministic preview modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Contract Preview artifacts derived from Execution Package Readiness Runtime records; recommended next milestone: `Execution Contract Readiness Runtime v1`).
Twin Observation Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-observations.ts`, `apps/platform/gnr8/runtime/twin/twin-observations.test.ts`; implemented function: `generateTwinObservations(twin)`; implemented deterministic observation rules: `Small Site Footprint`, `No Asset Evidence Detected`, `Homepage Successfully Identified`, `Read-Only Runtime Validation`; diagnostics: `TWIN_OBSERVATIONS_STARTED`, `TWIN_OBSERVATIONS_COMPLETED`; preserved boundaries: no AI model calls, no recommendations, no optimization engine, no editing, no publishing, read-only deterministic observations only).
Twin Insight Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-insights.ts`, `apps/platform/gnr8/runtime/twin/twin-insights.test.ts`; implemented function: `generateTwinInsights(observations)`; implemented deterministic insight rules: `Focused Website Footprint`, `Primary Entry Experience Detected`, `Limited Design Evidence Available`, `Governance Boundary Enforced`; verified deployed insights for `Transporti Maver`: `Focused Website Footprint`, `Primary Entry Experience Detected`, `Limited Design Evidence Available`, `Governance Boundary Enforced`; supporting observation relationships: `Focused Website Footprint <- Small Site Footprint`, `Primary Entry Experience Detected <- Small Site Footprint + Homepage Successfully Identified`, `Limited Design Evidence Available <- No Asset Evidence Detected`, `Governance Boundary Enforced <- Read-Only Runtime Validation`; diagnostics: `TWIN_INSIGHTS_STARTED`, `TWIN_INSIGHTS_COMPLETED`; preserved boundaries: no AI model calls, no recommendations, no optimization engine, no editing, no publishing, deterministic read-only insights only).
Twin Recommendation Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-recommendations.ts`, `apps/platform/gnr8/runtime/twin/twin-recommendations.test.ts`; implemented function: `generateTwinRecommendations(insights)`; implemented deterministic recommendation rules: `Prioritize Core Page Quality`, `Evaluate Homepage Conversion Flow`, `Collect Additional Design Evidence`, `Maintain Read-Only Validation Mode`; verified deployed recommendations for `Transporti Maver`: `Prioritize Core Page Quality`, `Evaluate Homepage Conversion Flow`, `Collect Additional Design Evidence`, `Maintain Read-Only Validation Mode`; insight-to-recommendation relationships: `Focused Website Footprint -> Prioritize Core Page Quality`, `Primary Entry Experience Detected -> Evaluate Homepage Conversion Flow`, `Limited Design Evidence Available -> Collect Additional Design Evidence`, `Governance Boundary Enforced -> Maintain Read-Only Validation Mode`; diagnostics: `TWIN_RECOMMENDATIONS_STARTED`, `TWIN_RECOMMENDATIONS_COMPLETED`; preserved boundaries: no AI model calls, no optimization engine, no proposal generation, no editing, no publishing, deterministic read-only recommendations only; conclusion: Workspace Overview now displays deterministic Website OS recommendations derived from deterministic insights; next dependency milestone now completed: `Twin Optimization Runtime v1`).
Twin Optimization Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-optimizations.ts`, `apps/platform/gnr8/runtime/twin/twin-optimizations.test.ts`; implemented function: `generateTwinOptimizationOpportunities(recommendations)`; implemented deterministic optimization opportunities: `Homepage Quality Improvement`, `Homepage Conversion Review`, `Design Evidence Collection`, `Validation Stability Preservation`; verified deployed optimization opportunities for `Transporti Maver`: `HIGH Homepage Quality Improvement`, `HIGH Homepage Conversion Review`, `MEDIUM Design Evidence Collection`, `LOW Validation Stability Preservation`; recommendation-to-optimization mapping: `Prioritize Core Page Quality -> Homepage Quality Improvement`, `Evaluate Homepage Conversion Flow -> Homepage Conversion Review`, `Collect Additional Design Evidence -> Design Evidence Collection`, `Maintain Read-Only Validation Mode -> Validation Stability Preservation`; diagnostics: `TWIN_OPTIMIZATIONS_STARTED`, `TWIN_OPTIMIZATIONS_COMPLETED`; optimization fields: `impact`, `effort`, `priority`, `supportingRecommendations`; preserved boundaries: no AI model calls, no optimization engine, no mutation execution, no editing, no publishing, deterministic read-only optimization opportunities only; conclusion: Workspace Overview now displays deterministic optimization opportunities derived from deterministic recommendations; next dependency milestone completed: `Optimization Scoring Runtime v1`).
Optimization Scoring Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.ts`, `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.test.ts`; implemented function: `scoreOptimizationOpportunities(opportunities)`; scoring fields: `impactScore`, `effortScore`, `confidenceScore`, `evidenceQualityScore`, `totalScore`, `rank`; scoring mappings: `impact(high=100, medium=60, low=20)`, `effort(low=100, medium=60, high=20)`, `confidence(default=100)`, `evidenceQuality(Homepage Conversion Review=90, Homepage Quality Improvement=80, Design Evidence Collection=50, Validation Stability Preservation=100)`; verified deployed ranking for `Transporti Maver`: `#1 Homepage Conversion Review totalScore=390`, `#2 Homepage Quality Improvement totalScore=340`, `#3 Validation Stability Preservation totalScore=320`, `#4 Design Evidence Collection totalScore=270`; diagnostics: `TWIN_OPTIMIZATION_SCORING_STARTED`, `TWIN_OPTIMIZATION_SCORING_COMPLETED`; preserved boundaries: no AI model calls, no proposal generation, no optimization execution, no editing, no publishing, deterministic scoring only; conclusion: Workspace Overview now displays deterministic ranked optimization opportunities derived from optimization scoring; recommended next milestone: `Proposal Candidate Runtime v1`).
Proposal Candidate Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`, `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`; implemented function: `generateTwinProposalCandidates(input)`; proposal candidate fields: `proposalId`, `status`, `executionState`, `title`, `summary`, `priority`, `expectedImpact`, `expectedEffort`, `risk`, `optimizationRank`, `optimizationScore`, `sourceOpportunityId`, `supportingRecommendations`, `reason`, `boundaries`; verified deployed Proposal Candidates for `Transporti Maver`: `#1 Improve Homepage Conversion Flow status=proposal_candidate executionState=blocked rank=1 score=390`, `#2 Improve Homepage Quality and Messaging status=proposal_candidate executionState=blocked rank=2 score=340`, `#3 Maintain Read-Only Validation Mode status=proposal_candidate executionState=blocked rank=3 score=320`; selection behavior: top-ranked optimization opportunities only with default limit `3`, and `Design Evidence Collection` remains optimization-only because it is ranked `#4`; preserved boundaries: read-only, non-executable, no content mutation, no design mutation, no publishing, no provider execution, no approval workflow yet, no AI model calls; conclusion: Workspace Overview now displays read-only, non-executable Proposal Candidates derived from ranked Optimization Opportunities; recommended next milestone: `Proposal Candidate Operator UX Cleanup v1`, followed by: `Proposal Approval Preview Runtime v1`).
Approval State Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-approval-state.ts`, `apps/platform/gnr8/runtime/twin/twin-approval-state.test.ts`; implemented function: `generateTwinApprovalStateRecords(approvalRecords)`; approval state model: `TwinApprovalState` with values `approval_required`, `pending_review`, `ready_for_future_approval`; current runtime emits only `pending_review` and future values are typing/contract-only; approval state record fields: `approvalId`, `proposalId`, `proposalTitle`, `approvalState`, `requiredApprovals`, `receivedApprovals`, `approvalComplete`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; verified deployed approval state record for `Transporti Maver`: `proposalTitle=Improve Homepage Conversion Flow`, `approvalState=pending_review`, `requiredApprovals=1`, `receivedApprovals=0`, `approvalComplete=false`, `governanceState=approval_state_preview_only`; all deployed approval state records currently share identical governance state; diagnostics: `TWIN_APPROVAL_STATE_STARTED`, `TWIN_APPROVAL_STATE_COMPLETED`; preserved boundaries: no approval workflow, no approve action, no reject action, no request-review action, no execution, no provider execution, no publishing, no mutation execution, no AI model calls, read-only deterministic state modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Approval State records derived from Proposal Approval Records, and approval governance modeling now exists independently from approval workflow execution; next dependency milestone now completed: `Approval Queue Preview Runtime v1`).
Approval Queue Preview Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-approval-queue-preview.test.ts`; implemented function: `generateTwinApprovalQueueItems(approvalStates, proposalCandidates)`; approval queue item fields: `queueId`, `proposalId`, `proposalTitle`, `approvalState`, `queueRank`, `queuePriority`, `optimizationScore`, `governanceState`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `summary`; verified deployed Approval Queue for `Transporti Maver`: `#1 Improve Homepage Conversion Flow queuePriority=high optimizationScore=390 approvalState=pending_review`, `#2 Improve Homepage Quality and Messaging queuePriority=medium optimizationScore=340 approvalState=pending_review`, `#3 Maintain Read-Only Validation Mode queuePriority=medium optimizationScore=320 approvalState=pending_review`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=approval_queue_preview_only`; diagnostics: `TWIN_APPROVAL_QUEUE_PREVIEW_STARTED`, `TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED`; preserved boundaries: no approval workflow, no approval state changes, no approve action, no reject action, no review action, no request approval action, no execution, no publishing, no provider execution, no mutation execution, no AI model calls, read-only deterministic queue preview only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays a deterministic Approval Queue derived from Approval State records and ranked Proposal Candidates; next dependency milestone now completed: `Execution Readiness Runtime v1`).
Execution Readiness Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-readiness.test.ts`; implemented function: `generateTwinExecutionReadinessRecords({ approvalQueueItems, executionPlanPreviews, executionArtifactPreviews })`; Execution Readiness model fields: `readinessId`, `proposalId`, `proposalTitle`, `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; readiness states: `not_ready`, `partially_ready`, `ready_for_future_planning`; verified deployed Transporti Maver readiness records: `Improve Homepage Conversion Flow readinessState=partially_ready readinessScore=60 requirementsMet=[homepage_detected, approval_queue_ranked, execution_plan_available] requirementsMissing=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging readinessState=ready_for_future_planning readinessScore=80 requirementsMet=[homepage_detected, messaging_surface_identified, execution_plan_available, artifact_preview_available] requirementsMissing=[design_evidence]`, `Maintain Read-Only Validation Mode readinessState=ready_for_future_planning readinessScore=100 requirementsMet=[governance_boundary_present, validation_runtime_active, execution_plan_available, artifact_preview_available] requirementsMissing=[none]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_readiness_preview_only`; diagnostics: `TWIN_EXECUTION_READINESS_STARTED`, `TWIN_EXECUTION_READINESS_COMPLETED`; preserved boundaries: no execution, no execution planning execution, no publishing, no provider execution, no mutation execution, no approval actions, no workflow execution, no AI model calls, deterministic read-only readiness modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Readiness records derived from Approval Queue items, Execution Plan Preview artifacts, and Execution Artifact Preview artifacts; execution readiness modeling remains governance-blocked and non-executable; next dependency milestone now completed: `Execution Package Preview Runtime v1`).
Execution Package Preview Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-package-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-package-preview.test.ts`; implemented function: `generateTwinExecutionPackagePreviews({ readinessRecords, executionPlanPreviews, executionArtifactPreviews })`; Execution Package Preview model fields: `packageId`, `proposalId`, `proposalTitle`, `packageState`, `readinessState`, `readinessScore`, `includedArtifacts`, `includedPlans`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; package states: `preview_ready`, `preview_incomplete`; verified deployed Transporti Maver package previews: `Improve Homepage Conversion Flow packageState=preview_ready readinessState=partially_ready readinessScore=60 includedPlans=[analyze_homepage_conversion_flow, identify_primary_conversion_path, prepare_conversion_improvement_plan] includedArtifacts=[conversion_review_document, conversion_improvement_plan]`, `Improve Homepage Quality and Messaging packageState=preview_ready readinessState=ready_for_future_planning readinessScore=80 includedPlans=[analyze_homepage_content, identify_messaging_improvements, prepare_content_improvement_plan] includedArtifacts=[messaging_review_document, content_improvement_plan]`, `Maintain Read-Only Validation Mode packageState=preview_ready readinessState=ready_for_future_planning readinessScore=100 includedPlans=[maintain_read_only_runtime, continue_validation_observation] includedArtifacts=[validation_status_report]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_package_preview_only`; diagnostics: `TWIN_EXECUTION_PACKAGE_PREVIEW_STARTED`, `TWIN_EXECUTION_PACKAGE_PREVIEW_COMPLETED`; preserved boundaries: no execution, no artifact generation, no approval workflow, no approval state changes, no publishing, no provider execution, no mutation execution, no AI model calls, deterministic read-only package preview only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Package Preview records assembled from Execution Readiness, Execution Plan Preview, and Execution Artifact Preview runtime layers; execution package modeling remains governance-blocked and non-executable; next dependency milestone now completed: `Execution Package Readiness Runtime v1`).
Execution Package Readiness Runtime v1 milestone is complete and verified (completion date: `2026-06-02`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-package-readiness.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-package-readiness.test.ts`; implemented function: `generateTwinExecutionPackageReadinessRecords(packagePreviews)`; Execution Package Readiness model fields: `packageId`, `proposalId`, `proposalTitle`, `readinessState`, `readinessScore`, `requirementsMet`, `requirementsMissing`, `executionAllowed`, `mutationAllowed`, `publishingAllowed`, `providerExecutionAllowed`, `governanceState`, `summary`; readiness states: `incomplete`, `nearly_ready`, `ready`; verified deployed Transporti Maver package readiness records: `Improve Homepage Conversion Flow readinessState=incomplete readinessScore=70 requirementsMet=[execution_package_present, planning_artifacts_present, homepage_detected] requirementsMissing=[conversion_baseline, design_evidence]`, `Improve Homepage Quality and Messaging readinessState=nearly_ready readinessScore=90 requirementsMet=[execution_package_present, planning_artifacts_present, messaging_surface_identified, homepage_detected] requirementsMissing=[design_evidence]`, `Maintain Read-Only Validation Mode readinessState=ready readinessScore=100 requirementsMet=[execution_package_present, governance_boundary_present, validation_runtime_active] requirementsMissing=[none]`; governance values: `executionAllowed=false`, `mutationAllowed=false`, `publishingAllowed=false`, `providerExecutionAllowed=false`, `governanceState=execution_package_readiness_preview_only`; diagnostics: `TWIN_EXECUTION_PACKAGE_READINESS_STARTED`, `TWIN_EXECUTION_PACKAGE_READINESS_COMPLETED`; preserved boundaries: no execution, no workflow, no approvals, no artifact generation, no publishing, no provider execution, no mutation execution, no AI model calls, deterministic read-only package readiness modeling only; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Planning Console now displays deterministic Execution Package Readiness records derived from Execution Package Preview records; execution package readiness remains governance-blocked and non-executable; recommended next milestone: `Execution Contract Readiness Runtime v1`).
Execution Artifact Preview Runtime v1 milestone is complete and verified (completion date: `2026-06-01`; runtime files: `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.ts`, `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.test.ts`; implemented function: `generateTwinExecutionArtifactPreviews(executionPlanPreviews)`; verified deployed Execution Artifact Preview artifacts for `Transporti Maver`: `#1 Improve Homepage Conversion Flow artifactType=conversion_improvement_plan affectedAreas=[homepage, primary_conversion_path] plannedOutputs=[conversion_review_document, conversion_improvement_plan]`, `#2 Improve Homepage Quality and Messaging artifactType=content_improvement_plan affectedAreas=[homepage_hero, homepage_messaging] plannedOutputs=[messaging_review_document, content_improvement_plan]`, `#3 Maintain Read-Only Validation Mode artifactType=validation_continuation_plan affectedAreas=[runtime_governance] plannedOutputs=[validation_status_report]`; governance values: `executionState=preview_only`, `mutationBlocked=true`, `governanceState=preview_non_executable`; diagnostics: `TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED`, `TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED`; preserved boundaries: no execution, no artifact generation, no approval workflow, no provider execution, no publishing, no mutation execution, no AI model calls; architecture chain: `Observation Runtime → Insight Runtime → Recommendation Runtime → Optimization Runtime → Optimization Scoring Runtime → Proposal Candidate Runtime → Proposal Approval Preview Runtime → Proposal Approval Runtime → Approval State Runtime → Approval Queue Preview Runtime → Execution Readiness Runtime → Execution Package Preview Runtime → Execution Package Readiness Runtime → Execution Contract Preview Runtime → Execution Plan Preview Runtime → Execution Artifact Preview Runtime → Workspace Planning Console`; conclusion: Workspace Overview now displays deterministic, read-only Execution Artifact Preview artifacts derived from Execution Plan Preview artifacts; recommended next milestone: `Workspace Planning Console UX Cleanup v1`).
Workspace Overview Bundled Stable Import Snapshot milestone is complete and verified (fixture: `apps/platform/gnr8/runtime/twin/fixtures/stable-import-snapshot.ts`; source resolution order: `stable artifact on filesystem` -> `imported-url snapshot directory` -> `bundled stable import snapshot fixture` -> `fallback No imported site available.`; verified deployed values: `selectedSource=bundled_stable_import_snapshot`, `fallbackReason=none`, `pages=18`, `sections=74`, `detectedTitle=GNR8 Validation Site`, `homepagePath=index.html`, `assets=133`, `navigationEvidence=available`, `homepageDetected=true`, `environmentScope=preview`, `providerState=preview/runtime-only`; diagnostics: `WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED`, `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED`, `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING`, `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED`, `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0`, `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED`, `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED`; preserved boundaries: read-only + no DB/schema changes + no API + no AI + no scoring + no recommendations + no editing + no publishing; conclusion: Workspace Overview is now useful in deployed environments even without local validation snapshot files; recommended next milestone: Real Imported Runtime Evidence Persistence Path).
Twin Runtime Types and Deterministic Builder milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-types.ts`, `apps/platform/gnr8/runtime/twin/twin-builder.ts`, `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`; implemented types: `TwinIdentity`, `TwinStatus`, `TwinSnapshot`, `TwinMetadata`, `WebsiteDigitalTwin`, `TwinViewerPayload`; implemented functions: `buildWebsiteDigitalTwin(input)` and `toTwinViewerPayload(twin)`; deterministic behavior: `twinId` from `siteId+siteVersionId+environmentScope`, controlled timestamps via `nowIso|clock`, `ready` for valid input, deterministic throws for missing `siteId/siteVersionId`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`; validation: twin-builder tests passed and `next build` passed; boundaries unchanged: no DB persistence/API/UI, no scoring/recommendations/AI/optimization/publish execution; this milestone's follow-up (Twin In-Memory Store / Read-Model Store) is now complete).
Twin In-Memory Store and Read-Model Repository milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-store.ts`, `apps/platform/gnr8/runtime/twin/twin-store.test.ts`; implemented interface: `TwinStore`; implemented methods: `saveTwin(twin)`, `getTwin(twinId)`, `getTwinBySiteVersion(siteVersionId)`, `listTwins()`, `clear()`; implemented implementation: `InMemoryTwinStore`; diagnostics: `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`; behavior: map-based storage, latest twin per `siteVersionId` tracking, multiple twins supported, twin payloads are not mutated, runtime-memory only; validation: twin-store tests passed and `next build` passed; boundaries unchanged: no database, no Supabase, no persistence, no API routes, no Workspace UI, no scoring, no recommendations, no AI; conclusion: first runtime Twin Repository layer for storing/retrieving Website Digital Twins in memory is now in place; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore as the minimal Twin runtime foundation).
Twin Viewer Read-Model Helper milestone is complete and verified (implemented runtime files: `apps/platform/gnr8/runtime/twin/twin-viewer.ts`, `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`; implemented type: `TwinOverview`; implemented function: `createTwinOverview(twin)`; mapped fields: `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `contentSummary`, `designSummary`, `experienceSummary`, `governanceSummary`, `operationalSummary`, `lastUpdated`, `diagnostics`; implemented diagnostic: `TWIN_OVERVIEW_CREATED`; validation: twin-viewer tests passed and `next build` passed; boundaries unchanged: no Workspace UI yet, no React, no database, no API, no AI, no optimization, no scoring, no recommendations; conclusion: GNR8 now has a Workspace-ready Twin Overview read-model capable of presenting Website Digital Twin state before UI implementation; recommended next milestone: Workspace Overview Twin Preview UI; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + TwinOverview read-model).
Workspace Overview Twin Preview UI milestone is complete and verified (route: `/gnr8/admin/twin-preview`; runtime chain: `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview; verified deployed values: `title=Website Digital Twin Runtime Preview`, `subtitle=Read-only validation surface`, `status=ready`, `environmentScope=preview`, `contentSummary=pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`, `designSummary=assets=5; layoutEvidence=available`, `experienceSummary=navigationEvidence=available; homepageDetected=true`, `governanceSummary=sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`, `operationalSummary=environmentScope=preview; providerState=preview/runtime-only`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`, `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`, `TWIN_OVERVIEW_CREATED`; boundaries: read-only validation surface with no editing/actions/forms/publish/AI/scoring/recommendations; conclusion: GNR8 now has the first browser-visible Website Digital Twin runtime surface; recommended next milestone: Workspace Navigation Wiring; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + getTwinBySiteVersion + TwinOverview preview route).
Twin Snapshot Hydration from Imported Site Model milestone is complete and verified (route: `/gnr8/admin/twin-preview-real`; source fixture: `real-site-01`; runtime chain: `real-site-01 fixture` -> `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview; verified values: `title=Website Digital Twin Runtime Preview (Real Site)`, `sourceSiteVersionId=site_version_real-site-01_072929becae7`, `sourceImportId=import_real-site-01_c167859409d8`, `status=ready`, `environmentScope=preview`, `contentSummary=pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`, `designSummary=assets=5; layoutEvidence=available`, `experienceSummary=navigationEvidence=available; homepageDetected=true`, `governanceSummary=sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`, `operationalSummary=environmentScope=preview; providerState=preview/runtime-only`; diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`, `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`, `TWIN_OVERVIEW_CREATED`; boundaries: read-only validation surface with no editing/publish/AI/scoring/recommendations and no DB/schema changes; conclusion: GNR8 now proves an imported real-site fixture can become a visible Website Digital Twin runtime surface with evidence-hydrated read-model summaries; deterministic placeholder summaries remain fallback-only when evidence input is omitted; recommended next milestone: Workspace Navigation Wiring; success criteria: future bootstrap resumes from Twin Builder + InMemoryTwinStore + getTwinBySiteVersion + TwinOverview + real-site fixture preview route).
Twin Snapshot Hydration implemented evidence fields are now documented as `pageCount`, `sectionCount`, `assetCount`, `detectedTitle`, `detectedHomepagePath`, and `providerStateSummary`.
Twin Snapshot Hydration boundary is unchanged: no scoring, no recommendations, no AI, no optimization, no editing, no publishing.
Twin Snapshot Hydration conclusion: Digital Twin snapshots now contain imported-site evidence instead of placeholder-only summaries.
Twin Runtime Contract milestone is complete and verified as canonical contract baseline (`docs/architecture/TWIN_RUNTIME_CONTRACT.md` is now the canonical implementation source for first operational Website Digital Twin runtime objects; contract scope covers Twin Identity, Twin Status, Twin Snapshot, Twin Metadata, Twin Store rules, Twin Viewer payload, and Workspace Overview integration boundary; canonical identity fields are `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `createdAt`, `updatedAt`; status lifecycle is `building|ready|stale|failed`; snapshot fields are `contentState`, `designState`, `experienceState`, `governanceState`, `operationalState`; metadata fields are `sourceImportId`, `sourceSiteVersionId`, `sourceModels`, `generatedAt`, `generatedBy`, `diagnostics`; storage rules are immutable per site version with stale marking allowed and failed generation diagnostics required; viewer payload contract is `identity/status/snapshot/metadata/diagnostics`; explicit out-of-scope includes scoring, recommendations, optimization, proposal generation, publish execution, runtime observation engine, and runtime optimization engine; runtime baseline now includes implemented twin types/builder with persistence/API/UI still intentionally out of scope).
First Operational Twin Roadmap Draft milestone is complete and verified as documentation-only (`docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md` is now the canonical minimal implementation slice for first visible Twin runtime value; target outcome is website imported -> twin generated -> twin stored -> twin displayed in Workspace Overview; required components are Twin Identity, Twin Snapshot, Twin Builder, Twin Store, Twin Viewer, and Workspace Overview Integration; canonical inputs are Import Pipeline, Canonical Models, Site Version, and Provider State; canonical outputs are Twin Snapshot, Twin Metadata, and Twin State Summary; out-of-scope boundary is explicit for scoring/recommendations/optimization/AI editing/publish automation; no runtime/API/UI/database implementation changes).
Provider Governance Cockpit v1 / Section Ordering Pass milestone is complete and verified (Provider Fleet has been consolidated into a coherent governance-first cockpit on `/gnr8/admin/providers` rather than an accumulated list of provider surfaces; visible-by-default canonical order is `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; collapsible detail canonical order is `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; UI/read-model only; no runtime/API changes; no provider execution; no writes; no secret resolution; no AI model calls; recommended next milestone options: Founder Docs Canonical Repo Commit, AI Credential Boundary Preview, Second Real Provider Read-only Connector; success criteria: future bootstrap resumes from Provider Governance Cockpit v1 as the canonical Provider Fleet UX baseline).
Provider Contract Registry Extraction milestone is complete and verified (Provider Fleet no longer depends on inline UI provider definitions; canonical provider contract registry now drives provider fleet read-model rendering; no runtime/API/provider execution changes).
AI Provider Capability Matrix UI milestone is complete and verified (Provider Fleet now exposes read-only AI provider routing metadata in `AI Provider Capability Matrix` on `/gnr8/admin/providers` for OpenAI/Anthropic/Gemini/Groq/Mistral including model families, strengths, routing hints, latency class, cost class, and context window class; advisory metadata only; no model calls performed; UI/read-model only; no runtime AI orchestration, no API changes, no execution, no secrets, no action buttons/forms).
AI Routing Policy Registry Extraction milestone is complete and verified (Provider Fleet `AI Routing Policy Preview` now consumes canonical read-model registry rows from `apps/platform/gnr8/runtime/providers/ai-routing-policy-registry.ts`; preferred/secondary provider names resolve from `provider-contract-registry` where possible; all row execution states are `preview_only`; no runtime AI routing, no live model calls, no API changes, no execution controls/forms).
AI Routing Policy Preview / Task-to-Provider Mapping Matrix milestone is complete and verified (Provider Fleet now includes `AI Routing Policy Preview` on `/gnr8/admin/providers` with strategic task-to-provider mappings across OpenAI/Anthropic/Gemini/Groq/Mistral; advisory strategy only; no live AI routing performed; UI/read-model/docs only; no runtime AI orchestration, no API changes, no execution, no secrets, no action buttons/forms).
AI Routing Readiness Advisor milestone is complete and verified (Provider Fleet now includes `AI Routing Readiness Advisor` with explicit current state, limitations, missing requirements, and next-step guidance; badge mapping reflects success/warning/critical readiness semantics; UI/read-model only; no runtime AI routing, no live model calls, no API changes, no execution controls/forms).
AI Routing Evaluator Preview Model milestone is complete and verified (deterministic preview evaluator implemented in `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.ts` with test coverage in `apps/platform/gnr8/runtime/providers/ai-routing-evaluator-preview.test.ts`; evaluator matches `taskType` against `AI_ROUTING_POLICY_PREVIEW_REGISTRY`, uses preferred/secondary providers when matched, defaults to `openai` + `anthropic` fallback when unmatched, resolves `selectedModelFamily` from provider registry metadata, applies request preferences as constraints, always emits `execution_blocked` and `preview_only` diagnostics context, and always returns `executionAllowed:false` and `executionBlocked:true`; preview evaluator tests passed and next build passed; deterministic preview only, no model calls, no credential resolution, no provider dispatch, no runtime execution, no API endpoint yet).
AI Routing Evaluator Preview UI milestone is complete and verified (Provider Fleet now includes `AI Routing Evaluator Preview` in `apps/platform/app/gnr8/admin/providers/ai-routing-evaluator-preview.tsx`, mounted in `provider-fleet-view.tsx`, with deterministic local task selector preview for `site_migration_planning`, `long_architecture_review`, `layout_visual_understanding`, `fast_interactive_generation`, `eu_sensitive_workloads`, and `structured_tool_orchestration`; preview result includes provider/model/strategy/fallback/reason/constraints/diagnostics and execution state is always visibly blocked; advisory text explicitly states deterministic non-executable preview and no AI providers called; no runtime execution/model calls/provider dispatch/API execution layer).
Provider Fleet Operational Snapshot milestone is complete and verified (Provider Fleet now includes visible-by-default `Operational Snapshot` above detailed sections on `/gnr8/admin/providers` with compact control-plane overview cards for `Control Plane Status`, `Connected Providers`, `Operational Read-only Capabilities`, `AI Routing Preview`, `Execution Layer`, `Governance State`, and `Recommended Next Step`; verified values are `Operational (read-only)`, connected providers derived from registry totals, operational read-only capabilities derived from registry capabilities, `AI Routing Preview: Available`, `Execution Layer: Blocked`, and `Governance State: Preview / non-executable`; derivation model is registry-driven + boundary-driven + evaluator/policy-registry-driven with no hardcoded totals where possible; no forms/buttons/actions/execution controls added; Provider Category Summary, AI Routing Readiness Advisor, Openprovider links, evaluator preview, and collapsible detail sections preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes; conclusion: Provider Fleet now exposes an executive operational overview above all detailed provider and AI orchestration surfaces; recommended next milestone: Provider Fleet Multi-Tenant / Environment Awareness; success criteria: future bootstrap resumes from Provider Fleet Operational Snapshot milestone).
Provider Fleet UI Density / Collapsible Sections milestone is complete and verified (Provider Fleet now renders governance-first with visible-by-default section order `Operational Snapshot`, `Provider Execution Governance Chain Preview`, `Provider Category Summary`, `Environment Awareness Preview`, `Provider Credential Boundary Preview`, `Provider Credential Boundary Advisor`, and `AI Routing Readiness Advisor`; dense sections are collapsible by default via native `details/summary` labels in deterministic order: `Provider Registry Details`, `AI Provider Capability Matrix`, `AI Routing Policy Preview`, `AI Routing Evaluator Preview`, `Credential Reference Registry Preview`, `Provider Capability Status`, and `Realtime Register Contract Readiness`; no content removed, no behavior removed, no new actions/forms/buttons, Openprovider link preserved, evaluator preview preserved, category summary preserved; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Fleet Category Summary Cards milestone is complete and verified (Provider Fleet now includes `Provider Category Summary` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`, with one card per provider category showing category label, total providers, connected providers, preview/read-model capabilities count, and category execution status; current expected examples: registrar `4/1/3/blocked`, AI `5/0/10/blocked`, communication `3/0/0/blocked`, ERP/accounting `1/0/0/blocked`; no execution controls/actions/forms added; UI/read-model/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Fleet Environment Awareness Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Environment Awareness Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`; provider contract registry now includes `environmentScope` and `bindingScope` metadata in `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`; scope vocabularies are explicit and read-model-only; current expected mapping: Openprovider `environmentScope:sandbox` + `bindingScope:global`, placeholder providers `environmentScope:global` + `bindingScope:global`; advisory note explicitly states governance preview only with no tenant credentials managed and no provider execution performed; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Credential Boundary Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Credential Boundary Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`; canonical provider contracts now include `credentialBoundary` metadata in `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts` with `credentialsRequired`, `credentialStatus`, `secretResolution`, and `bindingRequired`; summary cards render providers requiring credentials, configured references, missing references, secret resolution state, and binding required; compact per-category credential breakdown renders total/configured/missing/secret-resolution-disabled counts; current expected mapping: Openprovider `credentialStatus:configured_reference_only`, placeholders `credentialStatus:missing`, and `secretResolution:disabled` for all providers; advisory note explicitly states read-only preview and no secrets stored/resolved/exposed; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Provider Credential Boundary Advisor milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Credential Boundary Advisor` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx` with governance cards for `Current State`, `Current Limitations`, `Missing Requirements`, and `Recommended Next Step`; card items explicitly document modeled references, preview availability, disabled secret resolution, blocked execution, missing governance architecture requirements, and recommended contract-first next steps while keeping execution blocked; advisory note explicitly states credential governance is preview-only and no secrets are stored/resolved/exposed; no forms/buttons/actions added; UI/read-model/tests/docs only; no credential storage/secret management/secret resolution/provider execution/writes).
Provider Execution Governance Chain Preview milestone is complete and verified (Provider Fleet now includes visible-by-default `Provider Execution Governance Chain Preview` in `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx` with six explicit stages and current states: `Provider Contract` (`modeled`), `Credential Reference` (`previewed`), `Secret Resolution` (`design_only_disabled`), `Authorization Context` (`design_only_not_issued`), `Execution Approval` (`design_only_not_requested`), and `Execution` (`blocked`); stage badge mapping is explicit (success for modeled/previewed, warning for design-only states, critical for blocked); advisory note explicitly states governance preview only and that no secrets, approvals, authorization contexts, or executions are created; no forms/buttons/actions added; UI/read-model/tests/docs only; no runtime/provider/API/write/queue/worker/model-call changes).
Experience Workspace Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md` is now the canonical workspace architecture defining workspace purpose, areas, responsibilities, identity fields, relationship graph, AI assistant governance boundary, governance principles, current architecture-only state, and future integration anchors; no runtime/API/UI/editor/database implementation changes).
Workspace Information Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md` is now the canonical workspace information architecture defining workspace areas, navigation model, homepage information surfaces, content/design/experience/governance/AI information domains, current architecture-only boundaries, and success condition before first workspace UI design; no runtime/UI/editor/API/database implementation changes).
Workspace UI Concept Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md` is now the canonical workspace UI concept architecture defining workspace purpose, philosophy, primary areas, overview-as-digital-twin surfaces, navigation concept, AI governed-editor boundaries, governance domains, operations domains, architecture-only constraints, and the conceptual baseline that wireframe specs build on; no runtime/API/UI implementation/database changes).
Website Digital Twin Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md` is now the canonical architecture document defining the Website Digital Twin as the continuously updated operational representation of a website, with canonical twin domains, twin identity, twin relationships to content/design/experience/workspace/intelligence/governance/operations layers, twin observations, score surfaces, AI and governance boundaries, and architecture-only current state; no runtime/API/UI/database implementation changes; no twin runtime, no scoring engine, and no recommendation engine implemented yet).
Twin Generation Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_GENERATION_ARCHITECTURE.md` is now the canonical architecture document defining how websites become Website Digital Twins from imported evidence, canonical models, and intelligence observations through staged generation from import to twin assembly; architecture/docs only; no runtime/API/UI/database implementation changes; no twin generation runtime, no scoring engine, and no observation engine implemented yet).
Twin Observation Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md` is now the canonical observation architecture document defining observation purpose, observation inputs, canonical observation types, observation flow from signals to proposal candidates, observation severity levels, AI interpretation/recommendation assistance boundary, governance sequencing, architecture-only current state, and integration anchors; no runtime/API/UI/database implementation changes; no observation runtime and no recommendation runtime implemented yet).
Twin Optimization Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md` is now the canonical optimization architecture document defining optimization purpose, optimization inputs, optimization types, optimization opportunity structure, prioritization dimensions, optimization opportunity to proposal candidate generation, AI optimization/prioritization assistance boundary, governance sequencing, architecture-only current state, and integration anchors; no runtime/API/UI/database implementation changes; no optimization runtime and no prioritization engine implemented yet).
Website Intelligence Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md` is now the canonical intelligence architecture defining observation-and-understanding domains, canonical signals, score surfaces, recommendation progression, and explicit AI publish boundary for the Website Overview Digital Twin; architecture/docs only; no runtime/UI/API/database implementation changes; no scoring engine and no recommendation engine implemented yet).
Workspace Wireframes v1 Draft milestone is complete and verified as documentation-only (`docs/product/WORKSPACE_WIREFRAMES_V1.md` is now the canonical first structural workspace wireframe specification covering Website Overview, Content Workspace, Design Workspace, Experience Workspace, Governance Workspace, AI Workspace, and Operations Workspace with required sections for purpose, primary objects, information hierarchy, left navigation, center area, right context panel, actions, and AI surfaces; no runtime/API/UI implementation/database changes).
Content & Experience Governance Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md` is now the canonical parent architecture for how websites are represented, edited, versioned, governed, and published across Content/Design/Experience/Editing/Publish layers with explicit governance principles and child architecture anchors; no runtime/API/UI/editor implementation changes).
AI Editor Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/AI_EDITOR_ARCHITECTURE.md` is now the canonical editing architecture for governed proposal-first editing across Content/Design/Experience models with explicit editor types, editing targets, editing operations, proposal model, proposal lifecycle, human + AI intent modes, governance principles, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Content Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_CONTENT_MODEL.md` is now the canonical content architecture child document defining structured/governed/versionable website content, core content entities, content types, content identity fields, content relationship patterns, governance principles, AI editing implications, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Design Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_DESIGN_MODEL.md` is now the canonical design architecture child document defining design as reusable experience structure, core design entities, design responsibilities, design identity fields, design relationship chain, governance principles, AI design editing intent, content-design separation, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Canonical Experience Model Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/CANONICAL_EXPERIENCE_MODEL.md` is now the canonical experience architecture child document defining experience as user movement through a digital system, core experience entities, experience types, experience identity fields, experience relationship chain, governance principles, AI experience editing intents, content-design-experience separation, current architecture-only boundaries, and future integration anchors; no runtime/API/UI/editor/database changes).
Versioning & Rollback Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md` is now the canonical architecture document defining versioned models, version identity, change sets, rollback model, version lifecycle, rollback lifecycle, governance principles, and AI editing relationship for governed website evolution and first-class rollback safety; architecture/docs only; no runtime/API/UI/database/editor implementation changes).
Publish Governance Architecture Draft milestone is complete and verified as documentation-only (`docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md` is now the canonical publish governance architecture document defining publish purpose, targets, inputs, publish plan, publish lifecycle, environment promotion chain, governance principles, AI editing publish boundary, current state, and future integration points; architecture/docs only; no runtime/API/UI/database/publish implementation changes).
Authorization Context Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md` is now the canonical contract for temporary/scoped/redacted provider authorization contexts, core fields, lifecycle states, safety requirements, and explicit boundaries; no runtime/database/API/secret resolution/provider execution changes).
Execution Approval Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/EXECUTION_APPROVAL_CONTRACT.md` is now the canonical contract for governed execution approval decisions, core fields, approval types, lifecycle states, safety requirements, and explicit boundaries; no runtime/database/API/provider execution changes).
Credential Reference Contract Draft milestone is complete and verified as documentation-only (`docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md` is now the canonical contract for credential reference metadata, core fields, ownership scopes, states, and explicit boundaries; no runtime/database/API/secret storage/secret resolution/provider execution changes).
Credential Reference Registry Preview milestone is complete and verified (deterministic read-model registry implemented in `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.ts` with test coverage in `apps/platform/gnr8/runtime/providers/credential-reference-registry-preview.test.ts`; Provider Fleet now includes collapsible `Credential Reference Registry Preview` section with summary counts for total/configured/missing/secret-resolution-disabled/execution-blocked references and a table for provider, binding scope, environment scope, secret type, status, resolution state, and execution; advisory note explicitly states metadata only and no secrets stored/resolved/exposed; all preview references are execution-blocked with secret resolution disabled; read-model/UI/docs only; no database changes, no APIs, no secret storage, no secret resolution, no provider execution, no writes).
Global Provider Taxonomy Expansion milestone is complete and verified (Provider Fleet now operates as the Global Provider Control Plane taxonomy across registrar, deployment, communication, ERP/accounting, edge infrastructure, commerce, execution, source control, AI, storage, and identity provider categories; registry/docs/read-model only; no runtime/API/provider execution changes).
Provider Orchestration Contract Architecture Draft milestone is complete and verified as documentation-only (first canonical multi-provider orchestration contract; no runtime/API/provider execution changes).
Second Provider Placeholder Readiness Contract milestone is complete and verified (Realtime Register placeholder now rendered with explicit orchestration contract/readiness/boundary/identity fields and provider-specific readiness advisor text in Provider Fleet Cockpit; UI/read-model only; no runtime/API/provider execution changes).
Provider Fleet Cockpit milestone is complete and verified (global provider control plane route with deterministic seeded provider registry, UI/read-model only, execution blocked).
Provider Navigation Wiring milestone is complete and verified (agency dashboard to provider fleet, provider fleet to Openprovider cockpit, and cockpit links into read-only provider surfaces).
Provider Capability Detail Cards / Readiness Explainer milestone is complete and verified (provider capability guidance layer on `/gnr8/admin/providers` and `/gnr8/admin/providers/openprovider` with status/explanation/readiness semantics for domains, dns, availability, registration, and execution).
Provider Readiness Advisor Layer milestone is complete and verified (operator guidance/readiness interpretation layer on `/gnr8/admin/providers` and `/gnr8/admin/providers/openprovider`; UI/read-model only; execution blocked).
Openprovider Availability Search Panel milestone is complete and verified (read-only GET availability search on `/gnr8/admin/providers/openprovider` using `?domain=<domain>` with default fallback `levi-testis.com`; real sandbox availability lookups visible in cockpit UI; no write or registration paths).
Openprovider Domain Availability Read-only Connector milestone is complete and verified (real provider-read availability check with shared sandbox auth, execution still blocked).
Openprovider Domain Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only inventory, execution still blocked).
Openprovider DNS Inventory Admin UI milestone is complete and verified (real provider-read UI surface with sandbox auth + read-only DNS inventory, execution still blocked).
Openprovider DNS Records Read-only Connector milestone is complete and verified (sandbox auth + read-only DNS inventory, execution still blocked).
Provider handoff readiness with Execution Job Shape Preview / Planned Job Materialization Contract milestone is complete and testable end-to-end from deployed UI (seed + inspection surfaces), and execution remains explicitly blocked.
The deployed dev-seed governance loop is manually verified end-to-end including governance decision package surfaces (still control-plane only).
Provider Execution Contract Envelope / Worker Payload Contract Preview milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Provider Execution Safety Manifest / No-Execution Boundary Proof milestone is implemented, deployed, and manually verified (still control-plane only, no execution).
Evidence Surface Consolidation / Operator Cockpit Layout Pass milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Cockpit Evidence Status Badges / Severity System milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).
Operator Evidence Provenance Layer milestone is implemented, deployed, and manually verified (UI/read-model only, still control-plane only, no execution).

Current snapshot sources:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

## B) Canonical Docs

Read these as the canonical bootstrap set:
- `docs/ai/GNR8_THREAD_HANDOFF.md`
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
- `docs/architecture/CONTENT_EXPERIENCE_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/AI_EDITOR_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/VERSIONING_ROLLBACK_ARCHITECTURE.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md`
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- `docs/architecture/AI_ROUTING_EVALUATOR_CONTRACT.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Read `docs/ai/GNR8_COLLABORATION_PROTOCOL.md` before generating Codex tasks.

## C) Rules

- Slovenian conversation.
- English Codex tasks.
- step-by-step work.
- deterministic contracts.
- no hidden execution.
- no autonomous live execution.

## D) Current Architecture Status

- Architectural baseline remains modular monolith + service-layer discipline (`SYSTEM.md`, `architecture.md`).
- GNR8 runtime/control-plane work lives primarily under `apps/platform/gnr8/runtime/**`.
- Migration/import/validation subsystems are active and contract-driven (`apps/platform/gnr8/migration/**`, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/validation/**`).

## E) Current Provider-Control-Plane Status

Implemented control-plane layers include provider settings, credential references contract, provider selection/communicator, job planner/repository foundation, approval artifacts/transitions, execution handoff, and worker pickup readiness checks.
Readiness inspection now includes deterministic `workerPickupEvidence` projection from persisted `handoffArtifact`, read-only API inspection route, internal debug UI route, deployed superadmin readiness-test UI, admin seed API for deterministic persisted handoff creation/reuse, operator review intent persistence/creation surfaces, and deterministic governance snapshot surfacing.

Completed readiness inspection routes:
- `GET /api/gnr8/runtime/provider-handoffs/[handoffId]/readiness` (read-only)
- `/gnr8/admin/provider-handoffs/[handoffId]/readiness` (internal debug UI)
- `/gnr8/admin/provider-handoffs/readiness-test` (deployed superadmin readiness test UI)
- `POST /api/gnr8/admin/provider-handoffs/readiness-seed` (admin seed API)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (read-only operator reviews)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (admin-only operator review intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (read-only governance authorization)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/authorization` (admin-only governance authorization intent creation)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-readiness-gate` (read-only execution readiness gate)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-preconditions` (read-only execution preconditions ledger)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-remediation-plan` (read-only execution blocker remediation planner)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan` (read-only dry-run planned jobs simulation evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-job-preview` (read-only execution job shape preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/worker-envelope-preview` (read-only provider worker envelope preview evidence)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/execution-safety-manifest` (read-only no-execution boundary proof evidence)
- `GET /api/gnr8/admin/providers/openprovider/domains` (read-only Openprovider domain inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/dns` (read-only Openprovider DNS records inventory evidence)
- `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>` (read-only Openprovider domain availability evidence)

Required production env flag:
- `GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1`

Evidence and diagnostics milestone:
- Provider Contract Registry Extraction is deployed:
  - canonical registry file:
    - `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
  - canonical registry test:
    - `apps/platform/gnr8/runtime/providers/provider-contract-registry.test.ts`
  - current UI consumers:
    - `apps/platform/app/gnr8/admin/providers/page.tsx`
    - `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`
  - current providers in registry:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - canonical contract fields:
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
  - Openprovider links:
    - `cockpit`
    - `domains`
    - `dns`
  - provider capabilities are category-aware:
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
  - summary behavior:
    - `Read-only Capabilities` remains `3` (Openprovider operational reads only)
  - boundary remains explicit:
    - deterministic read-model registry
    - no runtime provider execution
    - no provider APIs added
    - no writes
    - no queue/worker execution
  - conclusion:
    - Provider Fleet is no longer backed by inline UI objects. It now consumes a canonical provider contract registry, creating the foundation for multi-provider orchestration.
  - strategic direction:
    - evolve Provider Fleet into global GNR8 provider control plane covering registrar/domain, DNS, deployment, communication, ERP/accounting, edge infrastructure, commerce/billing, execution/job, source control, AI, storage/data, and identity providers
  - recommended next milestone:
    - Global Provider Taxonomy Expansion
  - success criteria:
    - future thread bootstrap resumes from registry-backed provider fleet, not hardcoded UI provider definitions
- Provider Fleet Cockpit is deployed:
  - UI route: `/gnr8/admin/providers`
  - milestone scope:
    - UI/read-model only
    - deterministic seeded provider registry
    - no runtime/provider execution changes
  - providers in registry:
    - `Openprovider`
    - `Realtime Register`
    - `INWX`
    - `Netim`
  - verified provider states:
    - Openprovider:
      - `status`: `connected`
      - `mode`: `sandbox`
      - capabilities:
        - `domains`: `true`
        - `dns`: `true`
        - `availability`: `true`
        - `registration`: `false`
        - `execution`: `false`
    - Realtime Register: `not_configured`
    - INWX: `not_configured`
    - Netim: `not_configured`
  - verified UI values:
    - `title`: `Provider Fleet Cockpit`
    - `subtitle`: `Global provider control plane`
    - `Providers`: `4`
    - `Connected`: `1`
    - `Read-only Capabilities`: `3`
    - `Execution`: `blocked`
  - boundary remains explicit:
    - read-only
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
    - no secrets
    - no action buttons
  - conclusion:
    - GNR8 now has the first provider-level control tower above individual provider integrations.
    - this is the beginning of multi-provider orchestration/readiness visibility.
  - recommended next milestone:
    - Provider Capability Detail Cards / Provider Readiness Explainer
    - or Openprovider Availability UI Search Panel
  - success criteria:
    - future thread bootstrap resumes from global provider fleet cockpit milestone
- Provider Navigation Wiring is deployed:
  - completed navigation flow:
    - Agency Dashboard -> `/gnr8/admin/providers`
    - Provider Fleet Cockpit -> `/gnr8/admin/providers/openprovider`
    - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/domains`
    - Openprovider Provider Cockpit -> `/gnr8/admin/providers/openprovider/dns`
  - changed UI files:
    - `app/gnr8/admin/agencies/[agencyId]/dashboard/page.tsx`
    - `app/gnr8/admin/providers/provider-fleet-view.tsx`
    - `app/gnr8/admin/providers/openprovider/openprovider-provider-cockpit-view.tsx`
  - verified UX:
    - Agency Dashboard includes Provider Fleet card
    - Openprovider is the only navigable provider row
    - Realtime Register, INWX, Netim remain non-linked / `not_configured`
    - Openprovider cockpit includes Provider Surfaces section
    - Provider Surfaces links to Domain Inventory and DNS Inventory
    - Availability remains embedded in Openprovider cockpit
  - boundary remains explicit:
    - UI/navigation only
    - no runtime changes
    - no API changes
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret changes
  - conclusion:
    - provider features are no longer hidden behind manually typed admin URLs
    - GNR8 now has a navigable provider control-plane flow from agency dashboard into provider fleet, provider cockpit, and read-only provider surfaces
  - recommended next milestone:
    - Provider Capability Detail Cards / Provider Readiness Explainer
    - or Openprovider Availability UI Search Panel
  - success criteria:
    - future thread bootstrap resumes from navigable Provider Control Plane UX
- Provider Capability Detail Cards / Readiness Explainer is deployed:
  - updated UI surfaces:
    - `/gnr8/admin/providers`
    - `/gnr8/admin/providers/openprovider`
  - capability explainer coverage:
    - `domains`
    - `dns`
    - `availability`
    - `registration`
    - `execution`
  - explainer semantics:
    - capability name
    - current status
    - explanation
    - readiness level
  - readiness states:
    - `sandbox_verified`
    - `not_enabled`
    - `control_plane_only`
  - verified Openprovider guidance:
    - `availability`: working / `sandbox_verified`
    - `registration`: disabled / `not_enabled`
    - `execution`: blocked / `control_plane_only`
  - boundary remains explicit:
    - read-only only
    - no provider writes
    - no DNS writes
    - no registration
    - no execution
    - no queue/Inngest/worker execution
    - no mutation POST controls
  - conclusion:
    - provider UX now includes capability explanations and readiness semantics in the provider control-plane flow
  - recommended next milestone:
    - Provider Readiness Advisor Layer
  - success criteria:
    - future thread bootstrap resumes from provider capability guidance milestone
- Provider Readiness Advisor Layer is deployed:
  - updated UI surfaces:
    - `/gnr8/admin/providers`
    - `/gnr8/admin/providers/openprovider`
  - new section:
    - `Readiness Advisor`
  - advisor cards:
    - `Current State`
    - `Current Limitations`
    - `Missing Requirements`
    - `Recommended Next Step`
  - provider fleet guidance:
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
  - preserved UI:
    - availability search panel preserved
    - provider surfaces links preserved
    - capability cards preserved
    - read-only messaging preserved
  - boundary remains explicit:
    - UI/read-model only
    - no runtime changes
    - no API changes
    - no provider writes
    - no DNS writes
    - no registration
    - no queue/Inngest/worker execution
    - no provider execution
  - conclusion:
    - provider UX now includes operator guidance/readiness interpretation, not only raw diagnostics and statuses
  - recommended next milestone:
    - Provider Orchestration Contract Draft
    - or Second Provider Placeholder Readiness Contract
  - success criteria:
    - future thread bootstrap resumes from Provider Readiness Advisor milestone
- Openprovider Availability Search Panel is deployed:
  - route:
    - `/gnr8/admin/providers/openprovider`
  - search behavior:
    - GET-only form
    - action: `/gnr8/admin/providers/openprovider`
    - query param: `?domain=<domain>`
    - default fallback: `levi-testis.com`
  - verified behavior:
    - real Openprovider availability lookups operational
    - sandbox provider responses visible through cockpit UI
    - no registration/write paths introduced
  - boundary remains explicit:
    - read-only only
    - no provider writes
    - no DNS writes
    - no registration
    - no execution
    - no queue/Inngest/worker execution
    - no mutation POST controls
  - conclusion:
    - provider UX now includes real provider availability intelligence search inside cockpit flow
  - recommended next milestone:
    - Provider Readiness Advisor Layer
  - success criteria:
    - future thread bootstrap resumes from provider capability guidance + availability search milestone
- Openprovider Domain Availability Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-domain-availability.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/domain-availability?domain=<domain>`
  - env support:
    - `OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT`
    - `OPENPROVIDER_DOMAIN_AVAILABILITY_METHOD`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domain`: `levi-testis.com`
    - `available`: `true`
    - `status`: `available`
    - `endpoint path`: `/v1beta/domains/check`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_AVAILABILITY_ENDPOINT_PATH:/v1beta/domains/check`
    - `OPENPROVIDER_AVAILABILITY_METHOD_POST`
    - `OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED`
    - `OPENPROVIDER_AVAILABILITY_STARTED`
    - `OPENPROVIDER_AVAILABILITY_SUCCEEDED`
  - conclusion:
    - GNR8 can now perform real Openprovider read-only domain availability checks.
    - this is the first directly user-facing provider intelligence capability: `is this domain available?`
  - boundary remains explicit:
    - read-only
    - no registration
    - no DNS writes
    - no domain update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Domain Availability Admin UI
    - or Provider Reality Dashboard linking Domains + DNS + Availability
  - success criteria:
    - future thread bootstrap resumes from working real Openprovider availability lookup
- Openprovider DNS Inventory Admin UI is deployed:
  - UI route: `/gnr8/admin/providers/openprovider/dns`
  - backing API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified UI values:
    - `title`: `Openprovider DNS Inventory`
    - `banner`: `Read-only provider boundary active`
    - `provider`: `openprovider`
    - `mode`: `read only`
    - `execution`: `blocked`
    - `domains`: `0`
    - `records`: `0`
    - `inventory status`: `empty`
    - `empty message`: `No DNS records found in current Openprovider sandbox account.`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 now has a real provider-read UI surface for Openprovider DNS inventory.
    - the current sandbox account has no domains, so DNS inventory is empty, but auth, read boundary, API, and UI rendering are verified end-to-end.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Sandbox Domain Fixture / Seed Real Test Domain
    - or Provider Reality Dashboard linking Domain Inventory + DNS Inventory
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS Inventory UI milestone
- Openprovider DNS Records Read-only Connector is deployed:
  - runtime model: `gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory.ts`
  - shared auth helper: `gnr8/runtime/providers/openprovider/openprovider-auth.ts`
  - API: `GET /api/gnr8/admin/providers/openprovider/dns`
  - deployed verified values:
    - `provider`: `openprovider`
    - `readOnly`: `true`
    - `executionAllowed`: `false`
    - `executionBlocked`: `true`
    - `domains`: `[]`
  - diagnostics include:
    - `OPENPROVIDER_AUTH_STARTED`
    - `OPENPROVIDER_AUTH_SUCCEEDED`
    - `OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED`
    - `OPENPROVIDER_DNS_READ_STARTED`
    - `OPENPROVIDER_DNS_READ_SUCCEEDED`
  - conclusion:
    - GNR8 can now authenticate against Openprovider sandbox and perform read-only DNS inventory access.
    - current sandbox has no domains, so DNS inventory is empty but successful.
  - boundary remains explicit:
    - read-only
    - no DNS writes
    - no domain registration/update/delete
    - no queue/Inngest/worker execution
    - no provider execution
    - no secret leakage
    - `executionAllowed:false`
    - `executionBlocked:true`
  - recommended next milestone:
    - Openprovider Provider Reality UI: DNS Inventory Page
    - or Sandbox Domain Fixture / Seed Real Test Domain
  - success criteria:
    - future thread bootstrap resumes from real Openprovider DNS read-only milestone
- Operator Evidence Provenance Layer is deployed:
  - Executive Summary includes visible provenance support
  - Evidence Sources chips are present for provenance cues
  - static source mapping approach is used
  - no runtime lineage engine
  - no API changes
  - no runtime changes
  - no execution controls
  - verified source mappings:
    - Current Situation: `Readiness`, `Safety Manifest`
    - Primary Blockers: `Execution Preconditions Ledger`, `Execution Readiness Gate`, `Execution Remediation Plan`
    - Verified Positives: `Governance Decision Package`, `Execution Preconditions Ledger`, `Safety Manifest`
  - recommended next step:
    - `Execution Remediation Plan`
  - conclusion:
    - operator can now answer `How do we know this?` using visible evidence provenance
  - boundary remains:
    - execution impossible
    - simulation only
    - no provider execution
    - no queue execution
    - no secret resolution
  - recommended next milestone:
    - Operator Cockpit Completion / UI Freeze Candidate
  - success criteria:
    - future thread bootstrap resumes from provenance-enabled cockpit milestone
- Operator Cockpit Evidence Status Badges / Severity System is deployed:
  - badge severity levels: `critical`, `warning`, `success`, `info`, `neutral`
  - verified counters: `Critical: 8`, `Warnings: 4`, `Success: 8`
  - verified top cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - verified sticky banner: `Execution impossible. Control-plane simulation only.`
  - verified grouping: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - UI/read-model only, no runtime changes, no API changes, no behavior changes
  - no execution controls added
  - milestone note: some badge chips currently render as a compact raw evidence strip below counters; acceptable for this milestone and may be refined later
  - execution boundary remains explicit:
    - no provider execution
    - no sandbox execution
    - no DNS writes
    - no Openprovider/registrar calls
    - no queue/Inngest/worker execution
    - no secret resolution
  - conclusion:
    - operator can now identify execution risk, readiness state, governance state, and safety state quickly through counters and visual badges
  - recommended next milestone:
    - Operator Cockpit Compact Evidence Strip / Visual Polish Pass
    - still no execution
- Evidence Surface Consolidation / Operator Cockpit Layout Pass is deployed:
  - readiness page reorganized from linear debug layout into operator-oriented cockpit layout
  - sticky summary banner: `Execution impossible. Control-plane simulation only.`
  - top summary cards: `Execution State`, `Governance State`, `Readiness State`, `Safety State`
  - grouped sections: `Governance`, `Execution Analysis`, `Execution Simulation`, `Safety`
  - default-collapsed sections: `Timelines`, `Diagnostics`, `Payload JSON Blocks`
  - UI/read-model only, no runtime model changes, no API changes, no behavior changes
  - all evidence artifacts preserved
  - no execution controls added
  - execution remains impossible
- seed creates/reuses deterministic persisted handoff
- readiness page shows persisted `handoffArtifact` and reconstructed deterministic `workerPickupEvidence`
- `workerPickupEvidence.blockedReasons` is normalized with no contradictory approval/handoff/planned-job reasons; reasons are deterministic and operator-readable
- operator review persistence exists via `gnr8_runtime_provider_operator_reviews`
- reviews API returns deterministic `reviewSummary` in `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews`
- governance snapshot model exists: `runtime-provider-governance-snapshot.ts`
- governance snapshot combines: handoff readiness, `workerPickupEvidence`, operator `reviewSummary`, diagnostics
- governance snapshot fields: `snapshotId`, `handoffId`, `correlationKey`, `readinessStatus`, `executionBlocked: true`, `workerPickupEvidence`, `reviewSummary`, `diagnostics`, `createdAt`
- governance snapshot persistence table exists: `gnr8_runtime_provider_governance_snapshots`
- governance authorization model exists: `runtime-provider-governance-authorization.ts`
- governance authorization persistence table exists: `gnr8_runtime_provider_governance_authorizations`
- readiness API includes `governanceSnapshot`
- governance timeline API exists: `GET /api/gnr8/admin/provider-handoffs/[handoffId]/governance-timeline`
- readiness UI displays Governance Snapshot section
- readiness UI displays Governance Timeline section
- readiness UI displays Authorization section
- readiness UI displays Dry-run Job Plan section
- readiness UI displays Execution Job Preview section
- readiness UI displays Provider Worker Envelope Preview section
- readiness UI displays Provider Execution Safety Manifest section
- readiness UI displays Execution Readiness Gate section
- readiness UI displays Execution Preconditions Ledger section
- readiness UI displays Execution Remediation Plan section
- runtime dry-run job plan model exists: `runtime-provider-dryrun-job-plan.ts`
- runtime execution job preview model exists: `runtime-provider-execution-job-preview.ts`
- runtime provider worker envelope preview model exists: `runtime-provider-worker-envelope-preview.ts`
- runtime provider execution safety manifest model exists: `runtime-provider-execution-safety-manifest.ts`
- provider execution safety manifest verified deployed values:
  - `overallStatus`: `execution_impossible`
  - `summary`: `Provider execution is impossible in this runtime: active governance, worker, queue, provider, security, and execution boundaries enforce simulation-only behavior.`
  - diagnostics include:
    - `EXECUTION_SAFETY_BOUNDARY_PROVEN`
    - `EXECUTION_SAFETY_MANIFEST_CREATED`
- provider execution safety manifest verified barriers:
  - `governance_boundary_active`
  - `worker_dispatch_disabled`
  - `queue_allocation_disabled`
  - `provider_execution_disabled`
  - `secret_resolution_disabled`
  - `runtime_execution_boundary_active`
- provider execution safety manifest critical distinction:
  - safety manifest proves no-execution boundary
  - governance remains advisory
  - worker dispatch is disabled
  - queue allocation is disabled
  - provider execution is disabled
  - credential/secret resolution remains disabled
  - runtime remains simulation-only
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- UI note:
  - secret-related barrier IDs may be redacted because generic redaction treats `secret` as sensitive
  - this is safe and non-blocking
- dry-run job plan verified deployed values:
  - `jobCount`: `1`
  - `summary`: `1 simulated provider jobs generated for readiness evidence.`
  - first job:
    - `jobType`: `provider_dns_upsert`
    - `provider`: `openprovider`
    - `environment`: `sandbox`
    - `status`: `simulated`
    - `reason`: `Deterministic simulation for operationKind=upsert_dns_record; execution remains disabled.`
- dry-run job plan is simulated evidence only:
  - no persisted execution jobs are created
  - `plannedJobIds` are not changed
  - no workers are enqueued
  - no provider calls are made
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- execution job preview verified deployed values:
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
- execution job preview is evidence only:
  - no persisted execution jobs are created
  - no `plannedJobIds` are changed
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider calls occur
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- provider worker envelope preview verified deployed values:
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
- provider worker envelope preview is evidence only:
  - worker envelope is preview/evidence only
  - no queue records are allocated
  - no worker dispatch occurs
  - no provider execution occurs
  - no payload is sent to a runtime worker
  - `executionAllowed` remains `false`
  - `executionBlocked` remains `true`
- governance authorization statuses:
  - `not_requested`
  - `pending_authorization`
  - `authorized_for_future_execution`
  - `denied`
- readiness UI keeps detailed operator review list visible
- readiness UI includes create operator review form with:
  - status dropdown values: `pending_review`, `approved_for_future_execution`, `rejected`, `needs_changes`
  - reason textarea
  - Save review intent action
- diagnostics include:
  - `GOVERNANCE_SNAPSHOT_CREATED`
  - `GOVERNANCE_SNAPSHOT_REUSED`
  - `GOVERNANCE_SNAPSHOT_AUDIT_READ`
  - `GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED`
- `approved_for_future_execution` is intent-only; it does not authorize execution
- `authorized_for_future_execution` is intent-only; it does not authorize execution
- `executionBlocked` remains `true`
- governance snapshot is evidence only
- execution readiness gate verified values:
  - `gateStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `blockingReasons`:
    - `approval_status_blocked`
    - `global_execution_boundary_active`
    - `handoff_status_blocked`
    - `no_planned_jobs`
- execution preconditions ledger verified values:
  - `overallStatus`: `blocked`
  - `executionAllowed`: `false`
  - `executionBlocked`: `true`
  - `missingRequirements`:
    - `execution_planned_jobs_present:missing`
  - `blockedRequirements`:
    - `approval_status_not_blocked:blocked`
    - `execution_handoff_status_not_blocked:blocked`
- execution remediation plan verified values:
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
- governance conditions satisfied/passed while execution remained blocked:
  - `review_approved_for_future_execution`: satisfied/passed
  - `authorization_authorized_for_future_execution`: satisfied/passed
- conclusion:
  - governance intent can be satisfied while execution readiness remains blocked
  - GNR8 can now explain not only why execution is blocked, but what remediation steps remain before future execution could ever become possible.

Deployed manual verification loop (completed):
- readiness-test UI creates/reuses deterministic handoff
- readiness inspection loads `handoffArtifact`
- `workerPickupEvidence` is displayed
- operator review form creates persisted review intent
- authorization form creates persisted authorization intent
- governance snapshot updated after authorization/review state changed
- governance timeline contains multiple snapshots
- operator review summary displays persisted review state
- Governance Snapshot is displayed
- Governance Timeline is displayed
- Governance Decision Package is displayed
- Governance Timeline verified fields:
  - `snapshotId`
  - `createdAt`
  - `reviewSummaryStatus`
  - `reviewCount`
  - `readinessStatus`
  - `diagnostics`
- `executionBlocked` remains `true`

Governance Decision Package milestone verification:
- verified deployed flow:
  - readiness
  - operator review summary
  - governance authorization
  - governance snapshot
  - governance timeline
  - governance decision package
- verified values:
  - `recommendedAction`: `remain_blocked`
  - `executionBlocked`: `true`
  - `reviewStatus`: `approved_for_future_execution`
  - `authorizationStatus`: `authorized_for_future_execution`
  - `snapshotCount`: `3`
- boundary reminder:
  - decision package remains advisory only
  - execution remains blocked

Example verified values:
- `authorizationStatus`: `authorized_for_future_execution`
- `authorizationReason`: `1234`
- `intentOnly`: `true`
- `executionBlocked`: `true`
- diagnostics include:
  - `GOVERNANCE_AUTHORIZATION_CREATED`
  - `GOVERNANCE_AUTHORIZATION_INTENT_ONLY`

Future note:
- deterministic `createdAt` may show epoch values for dev-seed artifacts
- potential future improvement: add `snapshotCreatedAt` and `persistedAt`
- recommended next milestone: Operator Cockpit Compact Evidence Strip / Visual Polish Pass (still no execution)

Hard boundaries remain:
- no live provider execution
- no sandbox execution
- no worker execution for provider actions
- no Openprovider API calls
- no DNS writes
- no queue/Inngest execution for provider handoff readiness inspection
- no queue/Inngest/worker execution
- no external registrar calls
- no secret reads/stores
- no secret resolution
- no persisted execution job creation from dry-run job plan
- no `plannedJobIds` mutation from dry-run job plan
- no persisted execution job creation from execution job preview
- no `plannedJobIds` mutation from execution job preview
- no queue record allocation from execution job preview
- no worker dispatch from execution job preview
- no queue record allocation from worker envelope preview
- no worker dispatch from worker envelope preview
- no provider execution from worker envelope preview
- no runtime worker payload send from worker envelope preview
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## F) Current Active Implementation Phase

Active phase: Phase 8A-2 — Dry Run Simulation Planning Contract is complete.

Phase 7F importer architecture evolution is complete through 7F-15:
- Evidence Capture captures source-site evidence as a browser/user sees it.
- Original Mirror provides a read-only, non-semantic, non-AI preview/archive labeled `Original Mirror Preview`.
- Reconstruction is the future GNR8-native editable output layer labeled `GNR8 Reconstruction Preview` when implemented.
- Evidence Capture is the foundation for future Reconstruction.
- Raw preview remains useful for route-level inspection and Original Mirror behavior.
- Chrome / Playwright is the primary capture provider.
- Servo is research only.
- No reconstruction execution, AI reconstruction, React/block generation, reconstruction workers, reconstruction approvals, or reconstruction publishing exists yet.

Original Mirror Fidelity surface is complete:
- read-model projection: `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`
- workspace threading: `apps/platform/gnr8/site/site-workspace-read-model.ts`
- operator UI: Site Workspace overview section titled `Original Mirror Fidelity`
- documentation: `docs/architecture/ORIGINAL_MIRROR_LIMITATIONS_SURFACE.md`
- projection source: persisted `evidence_capture_baseline` only
- surfaced summary: capture status, coverage status, supported/partial/missing evidence counts and percentages
- surfaced badge: `HIGH` at supported >= 70 percent, `MEDIUM` at supported >= 40 percent, `LOW` below 40 percent
- readiness states: `READY`, `PARTIAL`, `NOT_READY`
- readiness boundary: `NOT_READY` when artifact is missing, rendered capture is missing, or blocker limitations are present
- limitation categories: Capture, Styles, Layout, Runtime, Assets, Maps / Widgets
- route-level fidelity support: displayed only when route-specific known fidelity limitations already exist in the persisted artifact
- behavior boundary: no capture/importer/provider/Playwright/preview/reconstruction/route-discovery/asset/script/persistence/public-rendering changes

Reconstruction Readiness surface is complete:
- read-model projection: `apps/platform/gnr8/site/evidence-capture-baseline-read-model.ts`
- evaluator: `apps/platform/gnr8/architecture/reconstruction-readiness-evaluation.ts`
- input normalizer: `apps/platform/gnr8/architecture/reconstruction-input-normalizer.ts`
- operator UI: Site Workspace overview section titled `Reconstruction Readiness`
- readiness levels: `NOT_READY`, `MINIMUM_READY`, `RECOMMENDED`, `HIGH_CONFIDENCE`
- behavior boundary: read-only projection only; no reconstruction execution or approval

Reconstruction Planning Gate is complete:
- planning contract: `apps/platform/gnr8/architecture/reconstruction-planning-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_PLANNING_GATE.md`
- eligibility: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible
- review states: `pending`, `approved`, `rejected`, `needs_more_evidence`
- confidence states: `LOW`, `MEDIUM`, `HIGH`
- behavior boundary: metadata-only planning contract; no candidate discovery, generation, worker, approval execution, persistence, or publishing

Reconstruction Candidate Discovery Contract is complete:
- discovery contract: `apps/platform/gnr8/architecture/reconstruction-candidate-discovery-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_CANDIDATE_DISCOVERY_CONTRACT.md`
- eligibility: `NOT_READY` is not eligible; `MINIMUM_READY`, `RECOMMENDED`, and `HIGH_CONFIDENCE` are eligible
- discovery statuses: `not_started`, `contract_only`, `discovery_ready`, `discovery_complete`
- current discovery status: `contract_only`
- confidence states: `LOW`, `MEDIUM`, `HIGH`
- behavior boundary: metadata-only discovery contract; no candidate generation, semantic extraction, worker, approval execution, persistence, reconstruction execution, or publishing

Reconstruction Candidate Review Contract is complete:
- review contract: `apps/platform/gnr8/architecture/reconstruction-candidate-review-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_CANDIDATE_REVIEW_CONTRACT.md`
- eligibility: `discovery_complete` with `candidateCount > 0` is eligible for human review
- not eligible: `not_started`, `contract_only`, `discovery_ready`, and completed discovery with zero candidates
- review decisions: `approved`, `rejected`, `needs_more_evidence`, `defer`, `unsupported`
- package statuses: `pending`, `partially_reviewed`, `approved`, `rejected`, `needs_more_evidence`
- behavior boundary: metadata-only review contract; no candidate review execution, review persistence, approval execution, reconstruction execution, AI reconstruction, React/block generation, workers, or publishing

Reconstruction Package Contract is complete:
- package contract: `apps/platform/gnr8/architecture/reconstruction-package-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_PACKAGE_CONTRACT.md`
- reconstruction intents: `recreate_as_native_block`, `preserve_as_embed`, `preserve_as_external_widget`, `convert_to_runtime_provider`, `defer`, `unsupported`
- package statuses: `draft`, `ready_for_reconstruction`, `needs_more_evidence`, `blocked`, `archived`
- execution readiness: `not_ready`, `ready_for_dry_run`, `ready_for_future_execution`
- builder behavior: approved review items become approved candidates; deferred and unsupported decisions are separated; rejected decisions are excluded from candidate buckets but counted in limitations/notes; `needs_more_evidence` forces package status `needs_more_evidence`
- behavior boundary: metadata-only package contract; no dry-run execution, approval execution, reconstruction execution, AI reconstruction, React/block generation, workers, persistence, or publishing

Reconstruction Dry Run Boundary is complete:
- dry-run contract: `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`
- documentation: `docs/architecture/RECONSTRUCTION_DRY_RUN_BOUNDARY.md`
- dry-run statuses: `not_started`, `planned`, `simulation_ready`, `simulated`, `blocked`
- simulation statuses: `unavailable`, `pending`, `complete`, `failed`
- simulation plan statuses: `not_started`, `planned`, `blocked`
- generated output types: `route_model`, `section_model`, `block_model`, `content_model`, `design_token_model`, `navigation_model`, `unknown`
- eligibility: `ready_for_dry_run` is eligible; `not_ready`, `needs_more_evidence`, and `blocked` are not eligible
- package creation: ready packages become planned/pending with no outputs or blockers; not-ready packages become blocked/unavailable with blockers
- validation: required IDs, route scope, empty generated outputs, empty simulation artifacts, blocked-package blockers, non-simulated status, non-complete simulation status, and future approval gating
- simulation plan creation: planned dry runs become planned Simulation Plans with deterministic steps; blocked dry runs become blocked Simulation Plans with blockers
- simulation plan validation: required IDs, route scope, planned steps for planned plans, blockers for blocked plans, planning-only statuses, planned descriptor outputs, no generated output shapes, and no simulation artifacts
- behavior boundary: metadata-only dry-run boundary, validation, and simulation planning; no simulation execution, dry-run execution, reconstruction execution, AI generation, React/block generation, workers, persistence, runtime writes, domain/DNS changes, or publishing
- simulation readiness review: Phase 8A-3 completed with Dry Run Readiness score 58/100 and led to Phase 8A-4 Capture Expansion For First Dry Run
- capture expansion for first Dry Run: Phase 8A-4 completed contract-only layout geometry, section boundary, navigation, and runtime mutation evidence shapes
- dry-run readiness re-assessment: Phase 8A-5 completed with conceptual readiness 68/100, execution readiness 58/100, and recommended Phase 8A-6 Layout Geometry Capture first
- layout geometry capture: Phase 8A-6 completed deterministic rendered major-region geometry capture, baseline persistence, read-model summary, and readiness integration; recommended next milestone Phase 8A-7 Dry Run Readiness Re-Assessment
- post-geometry dry-run readiness re-assessment: Phase 8A-7 completed with conceptual readiness 72/100, execution readiness 63/100, route model feasible, section model improved but still risky, and recommended Phase 8A-8 Section Boundary Capture
- section boundary capture: Phase 8A-8 completed deterministic section evidence classification, baseline artifact persistence, summary-only read model, and readiness integration; recommended next milestone Phase 8A-9 Dry Run Readiness Re-Assessment
- post-section-boundary dry-run readiness re-assessment: Phase 8A-9 completed with conceptual readiness 77/100, execution readiness 68/100, route model feasible, section model feasible, navigation model risky, block model not_ready, design token model not_ready, and recommended Phase 8A-10 Navigation Capture
- navigation capture: Phase 8A-10 completed deterministic navigation extraction, baseline artifact persistence, summary-only read model, and readiness integration; recommended next milestone Phase 8A-11 Dry Run Readiness Re-Assessment
- first limited dry-run design: Phase 8B-0 completed documentation-only scope for Route Model, Navigation Model, and Section Model only; recommended next milestone Phase 8B-1 First Limited Dry Run Contract
- first limited dry-run contract: Phase 8B-1 completed TypeScript contracts for `FirstLimitedDryRunOutput`, `LimitedDryRunRouteModel`, `LimitedDryRunNavigationModel`, and `LimitedDryRunSectionModel`; recommended next milestone Phase 8B-2 First Limited Dry Run Builder Design
- first limited dry-run builder design: Phase 8B-2 completed deterministic mapping design for Route, Navigation, and Section Models only; recommended next milestone Phase 8B-3 First Limited Dry Run Builder Implementation
- first limited dry-run builder implementation: Phase 8B-3 completed `buildFirstLimitedDryRunOutput(...)` for deterministic Route, Navigation, and Section Models from existing evidence only; recommended next milestone Phase 8B-4 First Limited Dry Run Builder Re-Assessment
- first limited dry-run builder re-assessment: Phase 8B-4 completed post-builder reassessment with conceptual readiness 86/100, execution readiness 77/100, and recommended next milestone Phase 8B-5 First Limited Dry Run Output Persistence
- first limited dry-run output persistence: Phase 8B-5 completed durable provenance artifact persistence and latest-output readback for validated `FirstLimitedDryRunOutput`; recommended next milestone Phase 8B-6 Admin-Only First Limited Dry Run Trigger Design
- first limited dry-run trigger design: Phase 8B-6 completed superadmin-only trigger boundary design, request/response contract, deterministic failures, idempotency, and auditability; recommended next milestone Phase 8B-7 Admin-Only First Limited Dry Run Trigger Implementation
- first limited dry-run trigger implementation: Phase 8B-7 completed the superadmin-only POST API trigger, metadata-only response, validation-before-persistence, and idempotent latest-artifact reuse; recommended next milestone Phase 8B-8 Admin Trigger Re-Assessment / Read-Only Surface Design
- first limited dry-run surface design: Phase 8B-8 completed post-trigger reassessment and designed the read-only operator surface for persisted First Limited Dry Run outputs; recommended next milestone Phase 8B-9 Read-Only First Limited Dry Run Surface Implementation
- first limited dry-run surface implementation: Phase 8B-9 completed the dedicated read-only superadmin page and defensive persisted-output projection; recommended next milestone Phase 8B-10 First Limited Dry Run End-to-End Admin Verification
- first limited dry-run end-to-end admin verification: Phase 8B-10 completed focused verification that the superadmin trigger creates or reuses a persisted output, latest readback loads it, the read-only surface projection/page can inspect it, idempotency works for equivalent and changed evidence inputs, and forbidden actions/outputs remain absent; recommended next milestone Phase 8B-11 First Limited Dry Run Re-Assessment / Next Safe Boundary
- first limited dry-run reassessment: Phase 8B-11 completed the next safe boundary decision, compared UI trigger, approval/readiness marker, runtime mutation capture, real-site operational test, and candidate discovery implementation, and recommended Phase 8B-12 First Real-Site Limited Dry Run Operational Test
- first real-site limited dry-run operational test: Phase 8B-12 completed a read-only real-site preflight against `https://www.odv-cvijanovic.si/`; the phase failed at preflight because checked runtime data had no qualifying real imported site version with the required Evidence Capture baseline, layout geometry, section evidence, navigation evidence, and `ReconstructionDryRunPackage`; Phase 8B-12F completed the follow-up production readiness inventory and Phase 8B-12G completed the production Evidence Capture worker readiness root-cause audit
- reconstruction readiness inventory audit: Phase 8B-12F completed a read-only production inventory of all `14` imported runtime site versions; all `14` classify as `NO_EVIDENCE_CAPTURE`, all lack the baseline/package chain required for Limited Dry Run, and the dominant blocker is production rendered Evidence Capture/worker readiness
- production Evidence Capture worker readiness root-cause audit: Phase 8B-12G completed a read-only audit of worker config, deployment assumptions, and persisted diagnostics; primary root cause is platform/worker readiness before usable rendered capture, with the next recommended phase Phase 8B-12H Production Evidence Capture Worker Readiness Fix
- rendered capture raw import source fallback: Phase 8B-12K-F2 completed the source-resolution fix for existing imported siteVersions; rendered capture now falls back from missing local `/tmp` provenance paths to durable `raw_imported_site` artifact HTML bytes, with the next recommended phase Phase 8B-12K-Retry Rendered Capture Smoke Test On Existing SiteVersion

## G) How Next Thread Should Behave

1. Read canonical files first before proposing changes.
2. Compare docs against actual repository structure before edits.
3. Update canonical docs instead of creating parallel systems.
4. Preserve deterministic contracts and explicit diagnostics.
5. Treat live/provider execution as disallowed unless explicitly re-authorized.

## Documentation Discipline

Rules:
- Update canonical docs instead of creating parallel doctrine.
- Do not create "final/v2/new/current" duplicates.
- If a document is historical, mark or index it as secondary/archive.
- Baseline/checkpoint docs are evidence, not the primary doctrine.
- When current state changes, update `docs/ai/GNR8_CURRENT_STATE.md` and relevant baseline/checkpoint docs.

## Ready-to-Copy Prompt

"Read these files first in this exact order: docs/ai/GNR8_THREAD_HANDOFF.md, docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md, docs/ai/GNR8_CURRENT_STATE.md, docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md, docs/ai/GNR8_COLLABORATION_PROTOCOL.md, docs/ai/GNR8_PROJECT_MAP.md, docs/ai/GNR8_CANONICAL_DOC_INDEX.md, and docs/ai/decisions/*.md. Read docs/ai/GNR8_COLLABORATION_PROTOCOL.md before generating Codex tasks. Then compare with apps/platform/gnr8/**, apps/worker/gnr8/**, and apps/platform/supabase/migrations/** before making any changes. Keep deterministic contracts, control-plane boundaries, and no-live-execution rules intact."
