# Structure Planning Foundation

## Phase And Boundary

Phase 8F-0 defines the Structure Planning boundary as documentation and
architecture only.

This phase answers one question:

> How should approved reconstruction candidates become a Structure Plan
> without generating a website?

No implementation is added in this phase. It does not modify Evidence Capture,
Candidate Discovery, Candidate Review, Review Actions, Candidate Context,
Reconstruction Package, AI systems, generation systems, publishing systems,
schema, or workers.

## Purpose

The adjacent package boundaries have distinct ownership:

```text
Reconstruction Package = what is eligible
Structure Plan         = how approved candidates are organized
```

A `ReconstructionPackage` freezes the exact approved candidate refs that may be
considered after human review and package validation. It is an eligibility
handoff.

A `StructurePlan` is a deterministic planning artifact over that eligible set.
It organizes approved candidates into routes, navigation, sections, and
candidate assignments so a later Future Reconstruction boundary can understand
the intended structure. It does not create the website, choose generated
content, create React, build blocks, call AI, publish, deploy, or execute work.

The Structure Plan is therefore an organizational map, not a generated output
and not an execution token.

## Canonical Input

### Required Input

The only required input is:

1. **One exact latest persisted `ReconstructionPackage` artifact**, including
   its artifact identity and validated package payload.

The plan builder in a future phase must bind to the exact latest
`reconstruction_package` artifact before planning begins. It must not follow a
floating latest pointer again during derivation, silently refresh to a newer
package, merge multiple package heads, or accept a historical package while
describing it as current.

Only candidates already present in that exact package may participate. The
Structure Plan must not query Candidate Review, Candidate Discovery, Candidate
Context, Limited Dry Run, Evidence Capture, AI output, generated output,
publishing state, or external systems to add candidates.

### Participating Candidates

Only included approved candidates from the selected `ReconstructionPackage`
participate in planning.

The plan must exclude:

- candidates not present in the package;
- rejected candidates;
- deferred candidates;
- unreviewed candidates;
- superseded approvals;
- candidates from a stale package;
- candidates from another site version, dry run, Review Package, Discovery
  artifact, or Reconstruction Package;
- candidates inferred from screenshots, DOM, evidence quality, confidence, or
  operator notes.

Rejected, deferred, unreviewed, stale, invalid, and excluded counts may be
reported as diagnostics when copied from the package. They must not become
hidden planning inputs.

### Supporting Lineage

The Structure Plan may retain supporting refs already carried by the
Reconstruction Package:

| Lineage | Treatment | Authority |
| --- | --- | --- |
| Reconstruction Package artifact | Required exact authorizing input. | Defines the complete eligible candidate set. |
| Candidate Review Package artifact | Copied lineage only. | Explains the approval source; cannot add candidates. |
| Candidate Discovery artifact | Copied lineage only. | Explains source candidate identity; cannot add candidates. |
| Candidate Context refs | Copied lineage only when already available. | Explains visual review context; cannot add candidates or geometry. |
| Evidence Capture / Limited Dry Run refs | Copied lineage only. | Explains source evidence; cannot add candidates or target structure by itself. |

The Structure Plan may organize existing candidate refs, but it must not
recompute eligibility from upstream lineage.

## Canonical Output

Phase 8F-1 formalized a metadata-only `StructurePlan` with these conceptual
contents:

| Area | Required contents |
| --- | --- |
| Plan identity | `structurePlanId`, contract version, deterministic derivation metadata, and creation timestamp. |
| Lineage | Exact source `reconstructionPackageArtifactId`, `reconstructionPackageId`, source package contract version, site version, dry run, Review Package artifact, and Discovery artifact refs already carried by the package. |
| Planned routes | Deterministic route entries derived from approved candidate route scopes and source refs. Routes are planned containers, not generated pages. |
| Planned navigation | Deterministic navigation groups or relationships between planned routes when approved candidates support navigation structure. Navigation is an organizational declaration, not generated UI. |
| Planned sections | Deterministic section slots or ordered section refs for route-scoped approved candidates. Sections are planning positions, not generated blocks. |
| Candidate assignments | Exact mapping from each included approved candidate ref to one planned route, navigation item/group, section slot, or unresolved planning bucket. |
| Limitations | Package limitations plus deterministic planning limitations such as ambiguous route assignment, insufficient ordering evidence, conflicting candidates, or unsupported candidate type for planning. |
| Diagnostics | Counts, excluded package counts copied from lineage, assignment coverage, unresolved candidates, deterministic ordering decisions, lineage validation, and stale/latest checks. |

The Structure Plan may contain unresolved planning buckets when approved
candidates are eligible but cannot be safely assigned to a route, navigation
relationship, or section slot. An unresolved assignment is a planning
limitation, not permission to infer missing target structure or generate a
replacement.

## Eligibility And Assignment Rules

Eligibility is inherited exactly from the source `ReconstructionPackage`.

The planner may assign only these candidates:

- candidates in `approvedCandidateRefs` or the equivalent included approved
  candidate list in the exact package;
- candidates whose source refs match the package lineage;
- candidates whose source package is latest at the time the plan is derived;
- candidates accepted by future Structure Plan contract validation.

The planner must fail closed when:

- the source package is missing, invalid, or stale;
- the source package contains forbidden generated, AI, execution, publishing,
  or planning fields;
- a candidate assignment points to a candidate not present in the source
  package;
- assignment counts do not reconcile with package included counts;
- two assignments claim the same candidate without an explicit deterministic
  conflict diagnostic;
- lineage does not match the exact source package.

Candidate ordering must be deterministic. The first contract should preserve
the package's included approved candidate order, then use the exact source
candidate ref, route path when present, authorizing Review Event ID, and
candidate ID as stable tie-breakers where needed.

## Identity Recommendation

Choose **A - plan identity tied to the exact Reconstruction Package artifact**.

The future contract should derive `structurePlanId` deterministically from:

- the exact source `reconstructionPackageArtifactId`; and
- the Structure Plan contract version.

Canonical identity shape:

```text
structure-plan:<reconstructionPackageArtifactId>:<structurePlanContractVersion>
```

This is the recommended strategy because one exact Reconstruction Package
artifact has one canonical planning meaning for a given Structure Plan
contract version. A newer Reconstruction Package artifact must create a new
Structure Plan identity, while historical plans remain loadable for audit. The
contract version prevents semantic changes in route, navigation, section, or
assignment rules from silently reusing an older plan identity.

Reject caller-supplied plan IDs. They would permit divergent plans for the
same eligibility snapshot and weaken deterministic replay, idempotency,
staleness checks, and audit.

Reject identity based only on `reconstructionPackageId`. Persisted artifact
identity is the safer source because latest package heads can advance and
historical artifacts must remain distinguishable.

## Safety Boundary

The Structure Plan is a planning artifact, not generated output and not an
execution artifact. It explicitly forbids:

- generated React;
- generated components;
- generated blocks;
- generated, extracted, rewritten, or synthetic content;
- AI prompts, responses, embeddings, classifications, summaries, or other AI
  outputs;
- publishing artifacts;
- CMS mutations;
- deployment artifacts;
- builds, releases, hosting changes, or preview deployments;
- execution artifacts;
- worker jobs;
- dry-run results;
- runtime state;
- source-code patches;
- design tokens, CSS, images, media, or asset generation;
- reconstruction instructions that can be executed directly.

Validation in a future contract phase must reject forbidden fields recursively
rather than ignore or sanitize them. No plan field may smuggle generated output
or executable instructions under names such as `reactOutput`,
`generatedOutputs`, `generatedBlocks`, `generatedContent`, `aiOutputs`,
`publishingArtifacts`, `deploymentArtifacts`, `executionArtifacts`,
`reconstructionPlan`, or `buildInstructions`.

## Relationship To Future Reconstruction

The canonical sequence is:

```text
Review
  -> Reconstruction Package
  -> Structure Plan
  -> Future Reconstruction
```

Review decides which exact observed candidates are approved.

The Reconstruction Package freezes which approved candidates are eligible.

The Structure Plan organizes those eligible candidates into deterministic
route, navigation, section, and assignment metadata.

Future Reconstruction may consume a Structure Plan only after separately
designed contract, validation, governance, and execution boundaries. The
Structure Plan itself does not authorize generation, AI, deployment,
publishing, or execution.

## Phase 8F-1 Contract Completion

Phase 8F-1 formalized the metadata-only Structure Plan contract:

```text
apps/platform/gnr8/architecture/structure-plan-contract.ts
```

The contract defines `StructurePlan`, `StructurePlanRoute`,
`StructurePlanNavigation`, `StructurePlanSection`, `StructurePlanAssignment`,
`StructurePlanLineage`, `StructurePlanValidationResult`, and
`StructurePlanStatus`.

Allowed statuses are exactly `planned`, `valid`, `invalid`, `blocked`, and
`stale`. The contract rejects generated, executed, published, deployed, or
reconstructed states.

Validation is contract-only and metadata-only. It checks deterministic
identity, required lineage, exact top-level/lineage consistency, required
counts, route/navigation/section/assignment uniqueness, assignment coverage
against included approved candidates, candidate type compatibility, referenced
planned targets, stale historical warnings, and recursive forbidden fields.

The blocked helper creates a deterministic blocked Structure Plan for no
eligible candidates, invalid lineage, or stale Reconstruction Package input. A
blocked plan has no planned routes, navigation, sections, or assignments.

Phase 8F-1 added no builder, persistence, AI output, generated React,
generated blocks, generated content, publishing artifacts, deployment
artifacts, execution artifacts, schema, workers, or behavior changes.

The recommended next phase is:

```text
Phase 8F-2 - Structure Planning Builder Design
```

Phase 8F-2 should remain design-only unless separately authorized.

## Phase 8F-2 Builder Design Completion

Phase 8F-2 defines the deterministic builder design in:

```text
docs/architecture/STRUCTURE_PLANNING_BUILDER_DESIGN.md
```

The builder design keeps the Structure Plan boundary metadata-only. The future
builder converts one exact latest `ReconstructionPackage` artifact into a
`StructurePlan` by planning approved route, navigation, and section candidates
and creating one assignment per included approved candidate unless blocked.

The required first implementation input is the exact latest persisted
`ReconstructionPackage` artifact record. Candidate Discovery, Candidate
Context, and Candidate Review lineage may support diagnostics only; they do
not authorize additional candidates, infer target structure, or reorder the
approved package set.

The design defines deterministic route, navigation, section, assignment,
ordering, status, limitation, and diagnostic rules. It adds no builder
implementation, persistence, AI, generation, publishing, schema, workers,
Evidence Capture changes, Candidate Discovery changes, Candidate Context
changes, Candidate Review changes, Review Actions changes, Reconstruction
Package changes, StructurePlan contract changes, API, UI, or runtime behavior.

The recommended next phase is:

```text
Phase 8F-3 - Structure Planning Builder Implementation
```

## Phase 8F-3 Builder Implementation Completion

Phase 8F-3 implements the pure deterministic Structure Plan builder in:

```text
apps/platform/gnr8/architecture/structure-plan-builder.ts
```

The builder input is one exact `ReconstructionPackage` payload, the exact
persisted `reconstructionPackageArtifactId`, the latest
`ReconstructionPackage` artifact ID for stale detection, and the Structure Plan
contract version override used only for tests.

The builder output is a metadata-only `StructurePlan` with deterministic
identity:

```text
structure-plan:<reconstructionPackageArtifactId>:<structurePlanContractVersion>
```

Route planning creates one planned route for each approved route candidate
with an explicit route path. Navigation and section planning create entries
only when route association is explicit through `routePath` or unambiguous
because exactly one planned route exists. Missing or ambiguous association is
reported as a deterministic builder blocker.

Valid plans create exactly one assignment per successfully planned included
approved candidate. Assignments preserve source candidate refs, evidence refs,
candidate identity/type, target kind, target ID, and source Reconstruction
Package diagnostics. Because the 8F-1 contract requires blocked plans to be
assignment-free, blocked plans report candidate blockers in limitations and
diagnostics while preserving contract-valid metadata.

Status behavior is deterministic: `valid` when all included candidates are
planned and `validateStructurePlan(...)` passes, `blocked` when there are no
included candidates or required route association is missing/ambiguous, `stale`
when the supplied Reconstruction Package artifact is not latest, and `invalid`
when source or Structure Plan validation fails.

Diagnostics include route count, navigation count, section count, assignment
count, included approved candidate count, blocked candidates, stale detection,
source Reconstruction Package validation, and Structure Plan validation.
Limitations include source Reconstruction Package limitations,
candidate-specific limitations when available, and builder blockers.

Phase 8F-3 added no Structure Plan persistence, generated React, generated
blocks, generated content, AI output, publishing artifacts, deployment
artifacts, migrations, schema, workers, Evidence Capture behavior, Candidate
Discovery behavior, Candidate Context behavior, Candidate Review behavior,
Review Actions behavior, Reconstruction Package behavior, StructurePlan
contract changes, API, UI, or runtime execution.

The recommended next phase is:

```text
Phase 8F-4 - Structure Planning Real-Artifact Validation
```
