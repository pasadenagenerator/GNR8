# Codex Task Provider Payload Runtime Builder

## Phase

MVP-1H implements the first runtime ProviderGenerationPayload builder for the
Codex task export path.

Boundary:
- No Codex call.
- No prompt send.
- No external AI execution.
- No generated website.
- No generated output persistence.
- No compliance execution.
- No Business Approval.
- No publishing.
- No UI, API, schema, or worker behavior.

## Purpose

The Codex task ProviderGenerationPayload is an exportable task envelope derived
from a persisted WebsiteGenerationPackageArtifact.

It exists to serialize the Website Generation Package into a future
provider-specific task shape while preserving the WGP as the canonical source
of meaning.

It is not executed in MVP-1H.

## Runtime Modules

Implemented modules:

- `apps/platform/gnr8/architecture/provider-generation-payload-contract.ts`
- `apps/platform/gnr8/architecture/codex-task-provider-payload-builder.ts`
- `apps/platform/gnr8/architecture/provider-generation-payload-persistence.ts`

Artifact kind:

```text
provider_generation_payload
```

Contract version:

```text
MVP-1H
```

Allowed provider type:

```text
codex
```

Allowed payload kind:

```text
codex_task
```

Allowed statuses:

```text
draft
ready
valid
invalid
stale
blocked
```

Persistence rejects `invalid` and `stale`. Persistence accepts `blocked` as a
fail-closed export artifact. MVP-2.0-G also allows `ready` for the second
generation payload foundation while preserving legacy `valid` records.

## Contract Shape

`ProviderGenerationPayload` contains:

- `providerGenerationPayloadId`
- `status`
- `providerType`
- `payloadKind`
- `sourceWebsiteGenerationPackageId`
- `sourceWebsiteGenerationPackageArtifactId`
- optional `sourceGenerationImprovementPlanId`
- optional `sourceGenerationImprovementPlanArtifactId`
- `siteVersionId`
- `dryRunId`
- `createdAt`
- `contractVersion`
- `lineage`
- `serializedWebsiteGenerationPackage`
- `codexTaskEnvelope`
- `preservedConstraints`
- `validationExpectations`
- `confidence`
- `limitations`
- `diagnostics`
- `safetyClassification`
- optional `regenerationGuidance`
- optional `deltaSummary`

Lineage preserves:

- site version and dry run IDs;
- source Website Generation Package ID;
- source persisted Website Generation Package artifact ID;
- source WGP status and contract version;
- source Website Design Brief ID;
- source Digital Business Twin ID;
- source Business Alignment ID;
- evidence refs;
- upstream artifact refs;
- adapter identity.

Adapter identity records:

- adapter ID;
- adapter name;
- adapter version;
- adapter contract version;
- provider type;
- payload kind;
- source artifact kind;
- serialization mode;
- diagnostics.

## Builder Behavior

`buildCodexTaskProviderPayload(...)` consumes only:

```text
WebsiteGenerationPackageArtifact
sourceWebsiteGenerationPackageArtifactId
createdAt optional timestamp
```

The builder is deterministic for identical inputs.

The builder:

- validates the source Website Generation Package;
- maps source status to allowed provider payload status;
- serializes the full WGP into `serializedWebsiteGenerationPackage`;
- copies constraints into `preservedConstraints`;
- copies validation expectations into `validationExpectations`;
- copies confidence, limitations, diagnostics, evidence, and lineage;
- creates a Codex task envelope for a future operator-auditable task export;
- marks the payload as export-only and no-execution.

The builder does not reinterpret business meaning, add business facts, resolve
missing knowledge, choose implementation technology, call providers, send
prompts, execute AI, generate a website, run compliance, publish, deploy,
change DNS, or mutate production.

## Codex Task Envelope

`codexTaskEnvelope` contains:

- objective;
- source package summary;
- required website outcomes;
- navigation, page, and section requirements;
- content requirements;
- constraints;
- validation expectations;
- forbidden actions;
- expected output shape;
- stop conditions.

The objective explicitly instructs a future Codex execution to create an
implementation proposal only.

The expected output shape is:

```text
implementation_proposal_only
```

Prohibited output includes generated website code, generated HTML, generated
React, generated components, deployment instructions, publishing
instructions, DNS instructions, provider results, compliance results, and
Business Approval.

## Safety Classification

The safety classification is:

```text
export_only_no_execution
```

All execution flags are false:

- provider execution;
- AI execution;
- generated website output;
- publishing;
- deployment;
- DNS mutation;
- production mutation;
- compliance execution.

## Forbidden Guard

Validation rejects the following field names recursively:

- `openAiPrompt`
- `claudePrompt`
- `geminiPrompt`
- `aiOutput`
- `generatedWebsite`
- `generatedContent`
- `generatedHtml`
- `generatedReact`
- `html`
- `react`
- `css`
- `framework`
- `implementationInstructions`
- `generatedComponents`
- `generatedBlocks`
- `deploymentArtifact`
- `publishingArtifact`
- `executionArtifact`
- `providerResult`
- `runtimeMutation`

This guard applies to the full ProviderGenerationPayload, including nested
values.

## MVP-2.0-G Provider Payload v2

MVP-2.0-G extends the runtime foundation without creating a new canonical
artifact type.

New module:

```text
apps/platform/gnr8/architecture/provider-generation-payload-v2-builder.ts
```

Focused test:

```text
apps/platform/gnr8/architecture/provider-generation-payload-v2.test.ts
```

The v2 builder consumes only:

```text
WebsiteGenerationPackageArtifact
GenerationImprovementPlanArtifact
```

plus the persisted source artifact IDs and optional `createdAt`.

It preserves the original Website Generation Package in
`serializedWebsiteGenerationPackage` and integrates the Improvement Plan only
as deterministic, business-level `regenerationGuidance` plus `deltaSummary`.

Provider Payload v2 adds no provider execution, AI execution, regenerated
website, generated HTML, React, CSS, framework decision, implementation
instruction, compliance mutation, report mutation, Business Approval,
publishing, deployment, DNS mutation, UI, API, schema, or worker behavior.

ODV result:

```text
provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7
```

Status:

```text
ready
```

Sources:

```text
website_generation_package_c2c555025f186178f27c44c7cd272d4d
generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694
```

Latest reload, by-ID reload, and idempotent retry all returned
`provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`.
envelope and serialized WGP content.

## Validation

`validateProviderGenerationPayload(...)` validates:

- provider type;
- payload kind;
- status;
- lineage consistency;
- source WGP reference;
- serialized WGP validity;
- required Codex task envelope sections;
- preserved constraints;
- preserved validation expectations;
- diagnostics and limitations arrays;
- safety classification;
- forbidden fields absence;
- absence of generated output field keys.

## Persistence

`persistProviderGenerationPayload(...)` stores validated artifacts in the
existing site-version `importProvenanceSummary` boundary.

Persistence behavior:

- artifact kind `provider_generation_payload`;
- append-only history under `providerGenerationPayloadArtifacts`;
- latest pointer at `latestProviderGenerationPayloadArtifact`;
- equivalent latest artifact reuse using semantic fingerprinting;
- changed artifact append;
- latest load helper;
- by-ID load helper;
- invalid and stale rejection;
- blocked allowed.

No new schema is added.

## Tests

Focused tests:

- `provider-generation-payload-contract.test.ts`
- `codex-task-provider-payload-builder.test.ts`
- `provider-generation-payload-persistence.test.ts`

Coverage includes deterministic Codex task payload creation, WGP meaning
preservation, constraint preservation, validation expectation preservation,
safety boundary inclusion, forbidden/generated-output rejection, persistence
reuse, append, latest load, and by-ID load.

## Boundary Confirmation

MVP-1H ends with this capability:

```text
persisted WebsiteGenerationPackageArtifact
-> deterministic codex_task ProviderGenerationPayload
-> optional provider_generation_payload persistence
```

MVP-1H does not call Codex, send prompts, execute external AI, generate a
website, persist generated websites, run compliance, add Business Approval,
publish, deploy, mutate DNS, mutate production, add UI, add API routes, add
schema, or add workers.

Completed follow-up phase:

- MVP-1H-R Codex Task Provider Payload Real-Target Validation.

## MVP-1H-R Real-Target Validation

Canonical validation document:

- `docs/architecture/CODEX_TASK_PROVIDER_PAYLOAD_REAL_TARGET_VALIDATION.md`

MVP-1H-R validated the builder and persistence path against the latest real
ODV and ViroiDoc Website Generation Package artifacts.

Results:

- ODV WGP `website_generation_package_c2c555025f186178f27c44c7cd272d4d`
  produced provider payload
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`.
- ViroiDoc WGP `website_generation_package_3e34393aef612a2c597042917dc45085`
  produced provider payload
  `provider_generation_payload_2d99b17572dc23ef482cf56ba06e1230`.
- Both source WGP artifacts were confirmed latest for their site versions and
  dry runs.
- Both payloads persisted with status `draft`, provider type `codex`, payload
  kind `codex_task`, full serialized WGP content, Codex task envelope,
  preserved constraints, validation expectations, confidence, limitations,
  diagnostics, lineage, and export-only safety classification.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  passed for both targets.
- Both envelopes are export-ready and include objective, source package
  summary, required website outcomes, navigation/page/section requirements,
  content requirements, constraints, validation expectations, forbidden
  actions, expected output shape, and stop conditions.
- Safety verification found no provider call, prompt sent, AI execution,
  generated website, generated content, generated HTML, generated React,
  generated components, code/framework/library output, publishing artifact,
  deployment artifact, execution artifact, compliance execution, or Business
  Approval.

Completed follow-up phase:

- MVP-1I Provider Execution Boundary Design.

## MVP-1I Provider Execution Boundary

Canonical boundary document:

- `docs/architecture/PROVIDER_EXECUTION_BOUNDARY_DESIGN.md`

MVP-1I defines the governed boundary after an export-ready
ProviderGenerationPayload:

```text
ProviderGenerationPayload
-> External AI Execution
-> Generated Website Proposal
```

Execution is explicitly defined as proposal generation only. It is not
publishing, deployment, DNS mutation, production mutation, compliance
approval, Business Approval, or a source of business truth.

The first recommended execution mode is Manual Codex execution outside GNR8,
followed by a future controlled import of manually generated output as
quarantined GeneratedWebsiteProposal material.

Completed follow-up phase:

- MVP-1J Manual Codex Execution Runbook and Generated Proposal Import Boundary
  Design.

## MVP-1J Manual Codex Execution And Import Boundary

Canonical documents:

- `docs/architecture/MANUAL_CODEX_EXECUTION_RUNBOOK.md`
- `docs/architecture/GENERATED_WEBSITE_PROPOSAL_IMPORT_BOUNDARY.md`

MVP-1J defines how an operator may execute the export-ready Codex task
ProviderGenerationPayload outside GNR8 and save the generated output bundle
outside GNR8 for later import. It requires exact source artifact recording,
copied payload integrity, no hidden prompt edits, no business
reinterpretation, no production mutation, no deployment, no publishing, no
DNS mutation, proposal-only output, provider notes, implementation
assumptions, known limitations, source payload reference, execution timestamp,
operator reference, and operator attestation.

MVP-1J also defines the future GeneratedWebsiteProposal import boundary:
future import requires source ProviderGenerationPayload artifact ID, source
WGP artifact ID, provider execution metadata, generated output bundle, no
publishing/deployment/runtime/DNS mutation artifacts, and operator
attestation. Generated proposal status values are conceptually `received`,
`quarantined`, `invalid`, `blocked`, `superseded`, and `compliance_ready`.

The Generated Website Proposal is not trusted. It cannot publish, update DBT,
update WDB, update WGP, update ProviderGenerationPayload, become compliance by
itself, become Business Approval by itself, or mutate production. It must
first be checked by Generation Contract Compliance.

Recommended next phase after MVP-1J:

- MVP-1K Generated Website Proposal Import Runtime Foundation, limited to
  quarantined import/storage of a manually generated output bundle with
  lineage, metadata, operator attestation, and fail-closed safety validation.
  Stop before compliance execution, Business Approval, publishing, deployment,
  DNS mutation, production mutation, UI, API, schema, or workers unless
  explicitly authorized.

## VCU-0 Continuity Audit Relationship

VCU-0 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_REALITY_AUDIT.md` as a
documentation-only audit of Provider Payload v1/v2 coverage. The audit finds
that the current payloads serialize the WGP and task envelope correctly, but
they omit original body copy, exact source snippets, source asset IDs as
deliverable assets, asset preview URLs, logo candidates, source images, source
fonts, source colors, source screenshots, source HTML/CSS, and content
transformation policy.

No Provider Payload contract, builder, persistence, export runtime, AI,
generation, WDB, WGP, schema, API, UI, worker, publishing, deployment, DNS, or
production behavior is changed by VCU-0.

## VCU-1 Continuity Projection Relationship

VCU-1 adds
`docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_SPECIFICATION.md`
as the canonical future source-continuity input boundary for Provider Payload
v3 shadow delivery. Future payload work may carry a continuity projection
reference, source content excerpts, proposed transformation policies, a source
asset manifest, safe preview/access refs, logo/image/typography/color
candidates, source screenshots, layout continuity, preserve/improve/remove
obligations, review status, licensing/source limitations, unresolved items, and
expected output continuity evidence.

VCU-1 does not modify Provider Payload v1/v2 contracts, builders, persistence,
exports, AI execution, generation, WDB, WGP, schema, API, UI, workers,
publishing, deployment, DNS, thumbnails, Proposal v3, or production behavior.
Provider Payload must not treat continuity candidates as confirmed business or
brand truth.
