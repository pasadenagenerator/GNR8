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

## Phase 8F-4 Real-Artifact Validation Completion

Phase 8F-4 validates that the Structure Planning boundary works on real
persisted Reconstruction Package artifacts without crossing into persistence,
AI, generation, execution, or publishing.

Detailed evidence:

```text
docs/architecture/STRUCTURE_PLANNING_REAL_ARTIFACT_VALIDATION.md
```

The validation used only existing loaders and the existing pure builder:
`loadLatestReconstructionPackage(...)`,
`loadReconstructionPackageById(...)`, and `buildStructurePlan(...)`. It
confirmed that the exact ODV artifact
`reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` and the exact
ViroiDoc artifact `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`
were also the latest Reconstruction Package artifacts for their site versions.

ODV produced a `valid` Structure Plan with `1` planned route, `0` planned
navigation entries, `2` planned sections, `3` assignments, and `0` blocked
candidates. ViroiDoc produced a `valid` Structure Plan with `1` planned route,
`0` planned navigation entries, `0` planned sections, `1` assignment, and `0`
blocked candidates.

Lineage was preserved for both targets: exact Reconstruction Package artifact,
Candidate Review artifact, Candidate Discovery artifact, site version, and dry
run. Recursive forbidden-field scans found no generated React, generated
blocks, generated content, AI output, publishing artifact, deployment artifact,
or execution artifact in either Structure Plan output.

Phase 8F-4 found no builder defect and changed no behavior. It added no
Structure Plan persistence, generated output, AI output, publishing artifact,
execution artifact, schema, worker, API, UI, or runtime behavior.

The recommended next phase is:

```text
Phase 8F-5 - Structure Plan Persistence Boundary Design
```

## Phase 8F-5 Persistence Boundary Design Completion

Phase 8F-5 defines the future persistence boundary in:

```text
docs/architecture/STRUCTURE_PLAN_PERSISTENCE_BOUNDARY.md
```

The selected storage strategy is the existing site-version provenance artifact
boundary, not a new table or hybrid dual-write path. The canonical artifact
kind is `structure_plan`.

The designed storage shape is append-only `structurePlanArtifacts` plus
`latestStructurePlanArtifact`, following the established provenance artifact
pattern. Persisted metadata includes artifact identity, artifact kind,
`structurePlanId`, exact Reconstruction Package artifact lineage, Candidate
Review artifact, Candidate Discovery artifact, site version, dry run, status,
planned route/navigation/section counts, assignment count, blocked candidate
count, creation/persistence timestamps, and Structure Plan contract version.

The persistence boundary should persist only `valid` or `blocked` plans.
`stale` and `invalid` plans reject before write. Equivalent plans for the same
Reconstruction Package artifact and contract version reuse the latest artifact;
changed current plans append; stale, invalid, forbidden-field, or
lineage-mismatch plans fail closed.

Before persist, a future implementation must run `validateStructurePlan(...)`,
enforce the recursive forbidden-field guard, check exact plan lineage, verify
the referenced Reconstruction Package artifact, require that package artifact
to remain latest for the site-version lineage, and reconcile copied included
candidate refs and counts against the package payload.

The future helper surface is limited to `persistStructurePlan(...)`,
`loadLatestStructurePlan(...)`, and `loadStructurePlanById(...)`. Reads are
read-only and must not rerun the builder, repair history, advance latest
pointers, create downstream planning artifacts, generate content, or mutate
provenance.

Phase 8F-5 added no persistence helper, provenance field, artifact record
implementation, latest pointer mutation, database table, schema migration, API,
UI, worker, Content Planning artifact, Layout/Block Planning artifact, AI
output, generated content, execution artifact, publishing artifact, or behavior
change.

The recommended next phase is:

```text
Phase 8F-6 - Structure Plan Persistence Implementation
```

## Phase 8F-6 Persistence Implementation Completion

Phase 8F-6 implements the Structure Plan persistence boundary in:

```text
apps/platform/gnr8/architecture/structure-plan-persistence.ts
```

The helper surface is limited to `persistStructurePlan(...)`,
`loadLatestStructurePlan(...)`, and `loadStructurePlanById(...)`. Storage uses
the existing site-version provenance artifact boundary with artifact kind
`structure_plan`, append-only `structurePlanArtifacts`, and
`latestStructurePlanArtifact`.

Persistence writes only `valid` or `blocked` Structure Plans after
`validateStructurePlan(...)` passes. It verifies exact plan lineage, confirms
the referenced Reconstruction Package artifact is valid and latest for the
site-version lineage, and reconciles copied included candidate refs/counts
against the package payload before writing.

Persisted metadata includes `structurePlanId`,
`reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`,
`candidateDiscoveryArtifactId`, `siteVersionId`, `dryRunId`, status, planned
route/navigation/section counts, assignment count, blocked candidate count,
contract version, `createdAt`, and `persistedAt`.

Equivalent latest plans for the same Reconstruction Package artifact and
contract version reuse the existing artifact. Changed current plans from a
newer latest Reconstruction Package artifact append a new record and advance
`latestStructurePlanArtifact`. Stale, invalid, forbidden-field,
invalid-lineage, missing-package, non-latest-package, and package-reconciliation
failures reject before write.

Focused tests live in:

```text
apps/platform/gnr8/architecture/structure-plan-persistence.test.ts
```

Phase 8F-6 added no Content Planning, Layout Planning, generated React,
generated blocks, generated content, AI output, publishing artifact, migration,
schema, worker, API, UI, Evidence Capture change, Candidate Discovery change,
Candidate Context change, Candidate Review change, Review Actions change,
Reconstruction Package change, StructurePlan contract change, StructurePlan
builder change, or runtime generation behavior.

The recommended next phase is:

```text
Phase 8F-7 - Structure Plan Persistence Real-Artifact Validation
```

## Phase 8F-7 Persistence Real-Artifact Validation Completion

Phase 8F-7 validates real durable Structure Plan persistence evidence in:

```text
docs/architecture/STRUCTURE_PLAN_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md
```

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` used latest
Reconstruction Package
`reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` and persisted
Structure Plan `structure_plan_08e12e859e457d5ac15870ce2892c817`.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` used latest
Reconstruction Package
`reconstruction_package_0e143f5fc174668e2225f73ebe464ffb` and persisted
Structure Plan `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`.

Both persisted Structure Plans are `valid`. Latest reload and exact by-ID
reload returned the same artifact for each target, lineage and metadata checks
passed, and idempotent retry reused the existing artifact without creating a
duplicate.

The persisted artifacts remain metadata-only. They contain no Content Plan,
Layout Plan, AI output, generated React, generated components, generated
blocks, generated content, publishing artifact, deployment artifact, execution
artifact, or worker job.

Phase 8F-7 changed no behavior and added no Content Planning, Layout Planning,
AI, generation, publishing, schema, worker, API, UI, StructurePlan contract
change, StructurePlan builder change, Reconstruction Package change, or runtime
generation behavior.

The recommended next phase is:

```text
Phase 8F-8 - Structure Plan Read-Only Surface Design
```

## Phase 8F-8 Read-Only Surface Design Completion

Phase 8F-8 designs the persisted Structure Plan inspection surface in:

```text
docs/architecture/STRUCTURE_PLAN_SURFACE_DESIGN.md
```

The surface purpose is read-only operator inspection of persisted
`structure_plan` artifacts. It shows planned routes, planned navigation,
planned sections, and deterministic assignment mappings from approved source
candidates. It also makes clear that a Structure Plan is not generated website
output, not reconstruction preview, not generated React, not generated content,
and not publishable output.

The recommended UI location is a dedicated admin Structure Plan page. Candidate
Review, Reconstruction Package, and Site Workspace placements were considered
but not selected for the first detailed surface because each risks conflating
approval, package eligibility, normal workspace operation, or future preview
with this metadata-only planning artifact.

The designed `StructurePlanSurfaceProjection` includes artifact metadata,
lineage, summary counts, grouped planned routes/navigation/sections,
assignments, limitations, diagnostics, validation status, and state. Empty and
attention states cover no Structure Plan, blocked Structure Plan, stale
Structure Plan, valid plans with no navigation, valid plans with no sections,
and limitations-present cases.

The page must expose no AI controls, reconstruction controls, generation
controls, publishing controls, execution controls, edit controls, trigger
controls, repair controls, retry controls, force controls, approval controls,
layout controls, content controls, worker controls, or queue controls.

The future UI relationship remains:

```text
StructurePlan read-only page
-> future Layout/Content Planning
-> future Reconstruction Preview
```

Phase 8F-8 changed documentation only. It added no UI implementation, route,
API, loader, persistence helper, StructurePlan contract change, StructurePlan
builder change, StructurePlan persistence change, Reconstruction Package
change, Evidence Capture change, Candidate Discovery change, Candidate Context
change, Candidate Review change, Review Actions change, AI system, generation
system, publishing system, schema, worker, or runtime behavior.

The recommended next phase is:

```text
Phase 8F-9 - Structure Plan Read-Only Surface Implementation
```

## Phase 8F-9 Read-Only Surface Implementation Completion

Phase 8F-9 implements the persisted Structure Plan inspection surface at:

```text
apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx
```

The implemented projection lives at:

```text
apps/platform/gnr8/architecture/structure-plan-surface-projection.ts
```

It reads only the latest persisted `structure_plan` artifact through the
existing Structure Plan persistence loader and projects artifact metadata,
lineage, summary counts, planned routes, planned navigation, planned sections,
assignments, limitations, diagnostics, and validation status for read-only
display.

The page implements the designed Overview, Lineage, Plan Summary, Planned
Routes, Planned Navigation, Planned Sections, Assignments, and Diagnostics
sections. It covers missing, blocked, stale, valid, limitations-present,
no-navigation, and no-sections states.

The surface remains inspection-only. It exposes no buttons, forms, inputs, edit
controls, AI controls, reconstruction controls, generation controls, publishing
controls, execution controls, retry controls, or approval controls.

Phase 8F-9 changed no Evidence Capture, Candidate Discovery, Candidate Context,
Candidate Review, Review Actions, Reconstruction Package, StructurePlan
contract, StructurePlan builder, StructurePlan persistence, AI system,
generation system, publishing system, schema, worker, Content Planning, Layout
Planning, execution, approval, mutation, or publishing behavior.

Validation result: focused Structure Plan surface tests pass; `cd apps/platform
&& pnpm run vercel-build` passes; `git diff --check` passes.

The recommended next phase is:

```text
Phase 8F-10 - Structure Plan End-to-End Verification
```

## Phase 8F-10 End-to-End Verification Completion

Phase 8F-10 verifies the complete read-only Structure Plan admin chain from
persisted `structure_plan` artifact to latest loader, surface projection, and
dedicated admin page.

Detailed evidence is recorded in:

```text
docs/architecture/STRUCTURE_PLAN_E2E_VERIFICATION.md
```

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` loads latest
Structure Plan `structure_plan_08e12e859e457d5ac15870ce2892c817`. The surface
projection is `valid` with `1` route, `0` navigation entries, `2` sections,
`3` assignments, `0` blocked candidates, no navigation state present, and
planned route/section/assignment rows visible in the projection.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` loads latest
Structure Plan `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`. The surface
projection is `valid` with `1` route, `0` navigation entries, `0` sections,
`1` assignment, `0` blocked candidates, no navigation state present, no
sections state present, and limitations-present state visible.

Both targets preserve exact Reconstruction Package, Review Package, Discovery
Result, `siteVersionId`, and `dryRunId` lineage. The Reconstruction Package
lineage is current for both projections.

The dedicated admin page compiles as a dynamic server-rendered route and
retains the superadmin guard. The browser check confirmed an unauthenticated
request redirects to `/login`; authenticated artifact inspection was verified
through live loader/projection checks, page source checks, focused tests, and
the production build route output.

The page remains read-only. It exposes no buttons, forms, inputs, AI controls,
generation controls, publishing controls, execution controls, retry controls,
approval controls, edit controls, Content Planning controls, or Layout Planning
controls.

Validation result: focused Structure Plan persistence/projection/page tests
pass `16 / 16`; `cd apps/platform && pnpm run vercel-build` passes with
existing unrelated lint warnings and includes
`/gnr8/admin/structure-plan/[siteVersionId]`; `git diff --check` passes.

Phase 8F-10 changed documentation only. It added no Content Planning, Layout
Planning, AI, generation, publishing, schema, worker, API, UI mutation,
button/form/input, StructurePlan contract change, StructurePlan builder change,
StructurePlan persistence change, or StructurePlan page behavior change.

The recommended next phase is:

```text
Phase 8F-11 - Post-Structure Plan Boundary Reassessment
```
