# Business Alignment Runtime Foundation

## Phase Boundary

Phase MVP-1D creates the first runtime Business Alignment foundation.

Business Alignment is not a document editor. Business Alignment is the
governed evolution of the Digital Business Twin through human business
corrections.

This phase does not implement Website Design Brief, Website Generation
Package, provider adapters, external AI, generation, compliance, Business
Approval, publishing changes, UI, API routes, or schema migrations.

## Purpose

Business Alignment answers:

```text
How should the Digital Business Twin evolve after a human reviews the current
Business Understanding Report?
```

Business Alignment evolves the Digital Business Twin. Business Alignment never
edits Business Understanding Reports.

Business Understanding Reports remain deterministic projections from the
current Digital Business Twin. A later phase may regenerate a new report from
DBT vNext, but MVP-1D does not implement report regeneration.

## Runtime Inputs

The MVP-1D runtime consumes:

- one source `DigitalBusinessTwinArtifact`;
- one source `BusinessUnderstandingReportArtifact`;
- explicit governed `BusinessAlignmentDecision` records;
- explicit governed `BusinessAlignmentCorrection` records.

It does not read raw HTML, imported page content, external services, provider
payloads, prompts, generated output, approval artifacts, or publishing
artifacts.

## Artifact Kind

The canonical artifact kind is:

```text
business_alignment
```

Artifacts are stored in the existing site-version `importProvenanceSummary`
boundary, using append-only `businessAlignmentArtifacts` records and
`latestBusinessAlignmentArtifact` as the latest pointer.

## Contract Shape

The runtime contract lives in:

```text
apps/platform/gnr8/architecture/business-alignment-contract.ts
```

It defines:

- `BusinessAlignmentArtifact`
- `BusinessAlignmentDecision`
- `BusinessAlignmentCorrection`
- `BusinessAlignmentLineage`
- `BusinessAlignmentConfidence`
- `BusinessAlignmentValidationResult`
- `BusinessAlignmentStatus`

Allowed statuses are:

```text
draft
reviewed
applied
blocked
invalid
stale
```

The MVP artifact includes:

- `businessAlignmentId`
- `status`
- `siteVersionId`
- `dryRunId`
- `sourceBusinessUnderstandingReportId`
- `sourceDigitalBusinessTwinId`
- `createdAt`
- `contractVersion`
- `lineage`
- `decisions`
- `corrections`
- `confidence`
- `limitations`
- `diagnostics`

## Supported Domains

MVP-1D supports only these DBT knowledge domains:

```text
business_identity
offerings
audience
brand
digital_presence
goals
trust
content
constraints
```

## Correction Types

MVP-1D supports only explicit corrections:

```text
confirm
correct
remove
add_missing
unresolved
```

There is no free-form mutation engine and no AI interpretation layer. A
correction must state its domain, type, target where required, statement or
reason where required, evidence refs, confidence, limitations, and diagnostics.

## Runtime Behavior

The deterministic runtime lives in:

```text
apps/platform/gnr8/architecture/business-alignment-runtime.ts
```

It exports:

```text
applyBusinessAlignment(...)
```

Behavior:

- deterministic only;
- no AI;
- no external services;
- no provider adapters;
- no generation;
- no publishing;
- consumes one source DBT and one source BUR;
- applies corrections only to DBT knowledge and missing knowledge;
- never edits the source Business Understanding Report;
- never overwrites the source Digital Business Twin;
- produces a new `DigitalBusinessTwinArtifact` revision;
- preserves source lineage, upstream artifact refs, evidence refs,
  confidence, limitations, and diagnostics;
- records unresolved corrections as missing knowledge and limitations;
- marks alignment `applied` for applied explicit corrections, `reviewed` when
  unresolved corrections remain, `blocked` for blocked source artifacts, and
  `invalid` or `stale` for invalid or stale source artifacts.

## DBT Evolution

Alignment produces:

```text
Digital Business Twin vNext
```

It does not produce Business Understanding Report changes.

The source DBT remains immutable. DBT vNext receives a new
`digitalBusinessTwinId`, retains source lineage, and adds the Business
Alignment artifact as an upstream artifact reference.

DBT vNext persistence is separate from Business Alignment persistence. MVP-1D-R
validated that DBT vNext can be persisted safely with the existing
`persistDigitalBusinessTwinArtifact(...)` helper because the runtime returns a
valid `DigitalBusinessTwinArtifact` revision. No new DBT persistence behavior
was added.

## Validation

The contract exports:

```text
validateBusinessAlignment(...)
```

Validation enforces:

- required lineage;
- source DBT validation when supplied;
- source BUR validation when supplied;
- allowed domains;
- allowed correction types;
- no duplicate correction IDs;
- no duplicate correction target/payload combinations;
- decision references to existing corrections;
- recursive downstream forbidden-field rejection.

The recursive forbidden guard rejects:

```text
websiteDesignBrief
websiteGenerationPackage
providerPayload
prompt
generatedContent
generatedReact
generatedHtml
generatedComponents
generatedBlocks
AIOutput
aiOutput
publishingArtifact
deploymentArtifact
executionArtifact
```

## Persistence

Persistence lives in:

```text
apps/platform/gnr8/architecture/business-alignment-persistence.ts
```

It exports:

```text
persistBusinessAlignment(...)
loadLatestBusinessAlignment(...)
loadBusinessAlignmentById(...)
```

Persistence uses the existing site-version `importProvenanceSummary` boundary.
It appends changed `business_alignment` artifacts, reuses the equivalent
latest artifact, advances `latestBusinessAlignmentArtifact`, rejects
`invalid` and `stale`, and allows `blocked` as a valid fail-closed artifact.

## Validation Result

Focused MVP-1D tests pass:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/business-alignment-*.test.ts
```

The first sandbox run hit the known `tsx` IPC pipe permission issue. The same
command passed outside the sandbox with `16 / 16` tests passing.

## Real-Target Validation Result

MVP-1D-R validates Business Alignment against real ODV and ViroiDoc DBT plus
BUR artifacts:

```text
docs/architecture/BUSINESS_ALIGNMENT_REAL_TARGET_VALIDATION.md
```

Results:

- ODV source DBT
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` and source BUR
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad` were both
  latest before validation.
- ODV persisted Business Alignment
  `business_alignment_18c0a6958048bf8985044e4781e788a8` with status
  `reviewed`, 1 decision, 5 corrections, correction types `confirm` and
  `unresolved`, and DBT vNext
  `digital_business_twin_2614a690e29e87a201658f3de4f72983`.
- ViroiDoc source DBT
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` and source BUR
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10` were both
  latest before validation.
- ViroiDoc persisted Business Alignment
  `business_alignment_7a3ad7e2222e732a895f89c1dc22452a` with status
  `reviewed`, 1 decision, 4 corrections, correction types `confirm` and
  `unresolved`, and DBT vNext
  `digital_business_twin_3429791a7d365461306d74059c206f8f`.
- Latest reload equality, by-ID reload equality, and idempotent retry reuse
  passed for both Business Alignment artifacts and both DBT vNext artifacts.
- Source DBTs remained reloadable by original artifact ID. Lineage, evidence
  refs, limitations, and missing knowledge were preserved; missing audience
  and ODV missing offerings were explicitly marked unresolved.
- Safety scan found no Website Design Brief, Website Generation Package,
  provider payload, prompt, AI output, generated content, publishing artifact,
  generation, compliance, or Business Approval.

## Next Phase Boundary

The next recommended phase is MVP-1E Website Design Brief Runtime Builder.

That phase should consume aligned DBT output and Business Alignment lineage.
It should still stop before Website Generation Package, provider adapters,
external AI, generation, compliance, Business Approval, and publishing.
