# Business Understanding Report Runtime Builder

## Phase Boundary

Phase MVP-1C creates the first runtime Business Understanding Report artifact
from a persisted Digital Business Twin artifact.

This phase does not implement Business Alignment, Website Design Brief,
Website Generation Package, provider adapters, external AI, generation,
compliance, Business Approval, publishing changes, UI, API routes, or schema
migrations.

## Purpose

The Business Understanding Report answers:

```text
How does GNR8 currently explain what it understands about this business to a human?
```

It is the first human-readable projection of the Digital Business Twin. It does
not replace the Digital Business Twin, correct the Digital Business Twin, or
authorize downstream planning. It explains the current DBT state with evidence,
confidence, missing knowledge, limitations, and business-oriented
recommendations.

## Runtime Inputs

The MVP-1C builder consumes only a supplied `DigitalBusinessTwinArtifact`.

It does not read raw HTML, source files, imported page content, Business
Discovery artifacts, external services, AI providers, or generation outputs.
Business Discovery is referenced only through DBT lineage fields.

## Artifact Kind

The canonical artifact kind is:

```text
business_understanding_report
```

Artifacts are stored in the existing site-version `importProvenanceSummary`
boundary, using append-only `businessUnderstandingReportArtifacts` records and
`latestBusinessUnderstandingReportArtifact` as the latest pointer.

## Contract Shape

The runtime contract lives in:

```text
apps/platform/gnr8/architecture/business-understanding-report-contract.ts
```

It defines:

- `BusinessUnderstandingReportArtifact`
- `BusinessUnderstandingReportLineage`
- `BusinessUnderstandingReportSection`
- `BusinessUnderstandingReportRecommendation`
- `BusinessUnderstandingReportConfidence`
- `BusinessUnderstandingReportValidationResult`
- `BusinessUnderstandingReportStatus`

Allowed statuses are:

```text
draft
partial
valid
invalid
blocked
stale
```

The MVP artifact includes:

- `businessUnderstandingReportId`
- `status`
- `siteVersionId`
- `dryRunId`
- `sourceDigitalBusinessTwinArtifactId`
- `createdAt`
- `contractVersion`
- `lineage`
- `sections`
- `recommendations`
- `confidence`
- `limitations`
- `diagnostics`

## MVP Sections

The report always includes the MVP section set in deterministic order:

```text
executive_summary
business_overview
products_and_services
target_audience
business_goals
brand_identity
current_digital_presence
trust_signals
missing_knowledge
confidence_overview
recommendations
limitations
evidence_summary
diagnostics
```

DBT knowledge items become human-readable section content. DBT
`missingKnowledge` becomes the Missing Knowledge section. DBT limitations and
diagnostics propagate into the report without being rewritten into certainty.

## Builder Behavior

The deterministic builder lives in:

```text
apps/platform/gnr8/architecture/business-understanding-report-builder.ts
```

It exports:

```text
buildBusinessUnderstandingReportFromDigitalBusinessTwin(...)
```

Behavior:

- deterministic only;
- no AI;
- no external services;
- no provider adapters;
- no generation;
- no publishing;
- consumes one `DigitalBusinessTwinArtifact`;
- preserves source lineage;
- maps DBT domains into human-readable report sections;
- carries DBT evidence refs, confidence, limitations, missing knowledge, and
  diagnostics forward;
- partial DBT produces a partial report when gaps remain;
- blocked DBT produces a blocked fail-closed report;
- invalid DBT produces an invalid fail-closed report;
- stale DBT produces a stale fail-closed report.

## Recommendations

Recommendations are business-oriented only.

Allowed recommendation types are:

```text
clarify_positioning
improve_messaging
strengthen_trust
improve_customer_journey
expand_content
improve_digital_presence
resolve_missing_audience
resolve_missing_offerings
```

Recommendations never prescribe React, HTML, components, layouts, prompts,
provider behavior, publishing behavior, generated content, or deployment
behavior.

## Validation

The contract exports:

```text
validateBusinessUnderstandingReportArtifact(...)
```

Validation enforces:

- required lineage;
- allowed report status;
- unique section IDs;
- unique section types;
- all MVP section types present;
- allowed section types;
- allowed business-oriented recommendation types;
- recommendation text that does not prescribe downstream implementation;
- recursive downstream forbidden-field rejection.

The recursive forbidden guard rejects:

```text
businessAlignment
websiteDesignBrief
websiteGenerationPackage
providerPayload
prompt
aiOutput
generatedContent
generatedHtml
generatedReact
generatedComponents
generatedBlocks
publishingArtifact
deploymentArtifact
executionArtifact
```

## Persistence

Persistence lives in:

```text
apps/platform/gnr8/architecture/business-understanding-report-persistence.ts
```

It exports:

```text
persistBusinessUnderstandingReportArtifact(...)
loadLatestBusinessUnderstandingReportArtifact(...)
loadBusinessUnderstandingReportArtifactById(...)
```

Persistence behavior:

- uses the existing site-version `importProvenanceSummary` boundary;
- stores immutable artifact records under `businessUnderstandingReportArtifacts`;
- updates `latestBusinessUnderstandingReportArtifact`;
- reuses an equivalent latest artifact;
- appends changed current artifacts;
- rejects `invalid` and `stale` reports;
- accepts `blocked` reports as fail-closed artifacts.

## Test Coverage

Focused tests cover:

- valid and partial BUR construction from DBT;
- blocked BUR construction;
- invalid and stale fail-closed builder states;
- missing knowledge section propagation;
- deterministic section order;
- business-only recommendations;
- recursive forbidden-field rejection;
- idempotent persistence reuse;
- append-on-change persistence behavior;
- latest load;
- by-ID load;
- invalid and stale persistence rejection.

## MVP-1C Result

At the end of MVP-1C, GNR8 can create and persist the first deterministic,
human-readable, evidence-backed, uncertainty-preserving Business Understanding
Report from a Digital Business Twin.

The next architecture stage remains Business Alignment, but MVP-1C does not
implement it.

## MVP-1C-R Real-Target Validation

MVP-1C-R validates the BUR contract, builder, and persistence helpers against
the real ODV and ViroiDoc DBT artifacts:

- ODV: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- ViroiDoc: `e26b0754-988b-45b9-9e24-8e213179b6cf`

The first attempt before MVP-1B-R was blocked because both site versions were
missing persisted DBT artifacts. The retry consumed the newly persisted DBT
artifacts and succeeded:

- ODV source DBT
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` was confirmed
  latest and produced
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad`.
- ViroiDoc source DBT
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` was confirmed
  latest and produced
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10`.
- Both BUR artifacts are `partial`, persisted, latest-reloadable,
  by-ID-reloadable, and idempotent retry reuses the same artifact.
- ODV produced 14 sections, 2 recommendations, 2 missing knowledge records
  (`audience`, `offerings`), 104 limitations, and `LOW` confidence.
- ViroiDoc produced 14 sections, 1 recommendation, 1 missing knowledge record
  (`audience`), 105 limitations, and `LOW` confidence.
- Human-readability checks passed: both reports explain current business
  understanding, products/services, audience gaps, brand/digital presence,
  missing knowledge, and business-oriented recommendations without inventing
  absent knowledge.
- Safety verification found no Business Alignment, Website Design Brief,
  Website Generation Package, provider payload, prompt, AI output, generated
  content, or publishing artifact fields in the persisted BUR artifacts.

The focused BUR tests pass `19 / 19`, the platform Vercel build passes with
existing unrelated frontend lint warnings, and `git diff --check` passes.
MVP-1C-R stops before Business Alignment.
