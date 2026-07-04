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
valid
invalid
stale
blocked
```

Persistence rejects `invalid` and `stale`. Persistence accepts `blocked` as a
fail-closed export artifact.

## Contract Shape

`ProviderGenerationPayload` contains:

- `providerGenerationPayloadId`
- `status`
- `providerType`
- `payloadKind`
- `sourceWebsiteGenerationPackageId`
- `sourceWebsiteGenerationPackageArtifactId`
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
- `generatedComponents`
- `generatedBlocks`
- `deploymentArtifact`
- `publishingArtifact`
- `executionArtifact`
- `providerResult`
- `runtimeMutation`

This guard applies to the full ProviderGenerationPayload, including nested
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

Recommended next phase:

- MVP-1H-R Codex Task Provider Payload Real-Target Validation, limited to
  building and persisting ProviderGenerationPayload artifacts from the latest
  persisted real ODV and ViroiDoc Website Generation Package artifacts. Stop
  before provider calls, prompts sent, external AI execution, generated
  websites, compliance execution, Business Approval, publishing, UI, API,
  schema, or workers unless explicitly authorized.
