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

## Next Phase Boundary

The next recommended phase is MVP-1E Website Design Brief Runtime Builder.

That phase should consume aligned DBT output and Business Alignment lineage.
It should still stop before Website Generation Package, provider adapters,
external AI, generation, compliance, Business Approval, and publishing.
