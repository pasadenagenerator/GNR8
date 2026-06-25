# Structure Planning Builder Design

## Phase And Boundary

Phase 8F-2 defines how a future deterministic Structure Plan builder should
organize approved `ReconstructionPackage` candidates into routes, navigation,
sections, and assignments.

This phase is documentation and architecture only. It adds no builder
implementation, persistence, AI, generation, publishing, schema, workers, UI,
API, or behavior change. It does not modify Evidence Capture, Candidate
Discovery, Candidate Context, Candidate Review, Review Actions,
Reconstruction Package, StructurePlan contract, AI systems, generation
systems, publishing systems, schema, or workers.

## Builder Purpose

The builder converts:

```text
ReconstructionPackage
  -> StructurePlan
```

The builder is a pure deterministic mapper over one exact latest
`ReconstructionPackage` artifact. Its job is to organize already-approved
candidate refs into metadata-only planned routes, planned navigation, planned
sections, and candidate assignments.

The builder does not:

- infer new candidates;
- add candidates from Discovery, Review, Context, screenshots, DOM, evidence,
  operator notes, or generated output;
- generate React;
- generate components;
- generate blocks;
- generate content;
- call AI;
- publish;
- deploy;
- execute work;
- enqueue workers;
- persist a plan.

The builder may create only a `StructurePlan` value that can be validated by
the existing Structure Plan contract.

## Inputs

### Required Input

The first implementation requires one exact latest persisted
`ReconstructionPackage` artifact record:

- `reconstructionPackageArtifactId`;
- immutable `ReconstructionPackage` payload;
- latest-pointer proof showing this artifact is the current latest
  `reconstruction_package` head for the site version;
- package validation result or enough payload to run
  `validateReconstructionPackage(...)`;
- source package contract version.

The builder must bind to that exact artifact before deriving the plan. It must
not re-follow a floating latest pointer during derivation, merge multiple
package heads, accept a historical artifact as current, or build from a
caller-supplied package copy without artifact identity.

Only `approvedCandidateRefs` already included in the exact package may
participate. Rejected, deferred, unreviewed, excluded, stale, invalid, and
foreign-lineage candidates remain outside the plan.

### Optional Supporting Lineage

The builder may receive supporting lineage for diagnostics or future audit:

| Supporting input | Use | Planning authority |
| --- | --- | --- |
| `CandidateDiscoveryResult` | Lineage validation and source-candidate diagnostics when explicitly supplied. | Cannot add, remove, or reorder candidates. |
| `CandidateContextProjection` | Optional context diagnostics for unresolved assignments. | Cannot infer route, navigation, section, content, geometry, or design intent. |
| `CandidateReviewPackage` | Latest-head and review-event diagnostics when explicitly supplied. | Cannot override the Reconstruction Package included set. |

For the first implementation, these supporting objects are optional and should
not be required to build a valid plan when the exact latest
`ReconstructionPackage` already carries valid lineage and included approved
candidate refs. Missing supporting lineage may be recorded as diagnostics, but
it must not cause the builder to query upstream systems or infer missing
structure.

## Route Planning

For each approved route candidate in package order, the builder creates one
planned route unless the candidate is blocked by missing required route data.

### Route Identity

`plannedRouteId` should be deterministic:

```text
planned-route:<structurePlanId>:<normalizedRoutePath>:<candidateId>
```

If the contract version later changes normalization semantics, the
`structurePlanId` version component creates a new route identity space.

### Route Path

The route path comes only from the approved candidate ref `routePath`.

Rules:

- use the candidate `routePath` when present;
- normalize only with contract-safe path normalization, such as ensuring a
  leading slash and removing empty duplicate slash segments when that behavior
  is already established by the contract implementation;
- do not invent a path from labels, URLs, section text, navigation labels, DOM
  selectors, screenshots, or AI;
- block the route candidate if no route path is present.

### Source Candidate Ref

Each planned route carries:

- `sourceCandidateIds = [candidateId]`;
- `assignmentIds` for assignments targeting that route;
- deterministic diagnostics describing source order and route path
  normalization, when applicable.

### Assignment Rules

Each route candidate creates exactly one route assignment when route planning
succeeds. The assignment target is `targetKind = "route"` and
`plannedRouteId = <plannedRouteId>`.

If a route candidate cannot produce a route because the required path is
missing or invalid, it creates no normal route assignment and is counted as a
blocked candidate. A blocked candidate must be reflected in limitations and
diagnostics.

## Navigation Planning

For each approved navigation candidate, the builder creates one planned
navigation entry unless route association cannot be determined.

### Navigation Identity

`plannedNavigationId` should be deterministic:

```text
planned-navigation:<structurePlanId>:<associatedRouteId-or-unscoped>:<candidateId>
```

The identity is tied to the source candidate and the planned route association,
not to generated menu markup.

### Route Association

The builder associates a navigation candidate to a planned route by
deterministic metadata only:

1. If the navigation candidate carries `routePath`, match it to a planned
   route with the same normalized route path.
2. If there is exactly one planned route and the navigation candidate has no
   route path, associate it with that route.
3. Otherwise, block the navigation candidate as ambiguous.

The builder must not infer route association from labels, hrefs, page titles,
visual context, DOM location, or design intent unless that association already
exists as explicit metadata in the approved candidate ref or Structure Plan
contract.

### Item Labels If Available

The current `StructurePlanNavigation` contract does not store navigation item
labels. If future contract evolution adds label metadata, labels may be copied
only from approved candidate metadata already present in the
`ReconstructionPackage` candidate ref or explicitly supplied supporting
lineage. Labels must not be generated, rewritten, translated, summarized, or
inferred.

For 8F-3, the builder should not add labels beyond the existing contract.
Label availability can be recorded only as diagnostics if supported by the
input data available at that time.

### Source Candidate Ref

Each planned navigation entry carries:

- `sourceCandidateIds = [candidateId]`;
- associated `plannedRouteIds`;
- `assignmentIds` for assignments targeting that navigation entry;
- diagnostics for association rule used or blocker.

### Assignment Rules

Each navigation candidate creates exactly one navigation assignment when
navigation planning succeeds. The assignment target is
`targetKind = "navigation"`, with `plannedNavigationId` and the associated
planned route IDs recorded on the planned navigation entry.

If association is ambiguous or no planned route exists, the candidate is
blocked and reported in limitations and diagnostics.

## Section Planning

For each approved section candidate, the builder creates one planned section
unless route association cannot be determined.

### Section Identity

`plannedSectionId` should be deterministic:

```text
planned-section:<structurePlanId>:<associatedRouteId>:<sectionOrder>:<candidateId>
```

The identity is based on route association, deterministic order, and source
candidate identity. It is not based on generated block IDs, generated content,
component names, CSS selectors, or AI output.

### Route Association

The builder associates a section candidate to a planned route by deterministic
metadata only:

1. If the section candidate carries `routePath`, match it to a planned route
   with the same normalized route path.
2. If there is exactly one planned route and the section candidate has no
   route path, associate it with that route.
3. Otherwise, block the section candidate as ambiguous.

The builder must not infer section route association from screenshots,
geometry, labels, selectors, DOM order, content, or visual placement unless
that association already exists as explicit approved candidate metadata.

### Structural Label

The current `StructurePlanSection` contract does not store a structural label.
If a later contract version adds one, the builder may copy a label only from
approved candidate metadata or supplied lineage. It must not generate a new
label or infer design intent.

For 8F-3, structural labels should remain outside the output except as
diagnostics if the exact input already exposes them and the contract permits
diagnostic strings.

### Ordering Rules

Sections are ordered per planned route using the candidate source order from
the exact package. `sectionOrder` starts at `0` for each planned route and
increments only for successfully planned section candidates associated with
that route.

No AI sorting, layout-based reordering, visual prominence ranking, content
importance ranking, or design-intent heuristic is allowed.

### Source Candidate Ref

Each planned section carries:

- `sourceCandidateIds = [candidateId]`;
- `plannedRouteId`;
- `sectionOrder`;
- `assignmentIds` for assignments targeting that section;
- deterministic diagnostics for source order and association rule used.

### Assignment Rules

Each section candidate creates exactly one section assignment when section
planning succeeds. The assignment target is `targetKind = "section"` with
`plannedSectionId` and `plannedRouteId`.

If route association is ambiguous or no planned route exists, the candidate is
blocked and reported in limitations and diagnostics.

## Assignment Model

Each included approved candidate should produce exactly one assignment unless
blocked.

### Assignment ID Strategy

`assignmentId` should be deterministic:

```text
structure-plan-assignment:<structurePlanId>:<candidateType>:<candidateId>
```

This makes assignment identity stable for repeated derivation from the same
package artifact and contract version.

### Assignment Target

Assignment targets are bounded to the existing contract target kinds:

| Candidate type | Successful target kind | Required target ref |
| --- | --- | --- |
| `route` | `route` | `plannedRouteId` |
| `navigation` | `navigation` | `plannedNavigationId` |
| `section` | `section` | `plannedSectionId` and `plannedRouteId` |

The existing contract also allows `unresolved` assignments. The first builder
implementation should prefer fail-closed blockers over unresolved assignments
when a candidate cannot be assigned deterministically, because the requested
8F-2 rule is "exactly one assignment unless blocked." A later phase may open a
separate unresolved-bucket policy if there is a demonstrated planning need.

### Candidate Ref

Every assignment copies only metadata already carried by the approved package
candidate ref:

- `candidateId`;
- `candidateType`;
- `sourceCandidateRefs`;
- `evidenceRefs`;
- deterministic assignment diagnostics.

Assignments must not contain generated content, generated components, AI
output, publishing artifacts, deployment artifacts, execution artifacts, or
instructions for reconstruction.

### Assignment Type

The assignment type is represented by the contract `targetKind`. It is derived
only from the approved candidate type:

- route candidate -> route assignment;
- navigation candidate -> navigation assignment;
- section candidate -> section assignment.

Unsupported candidate types are contract invalid and should produce an
invalid Structure Plan rather than an inferred assignment.

## Ordering Rules

All ordering is deterministic and source-bound:

1. Routes sort by normalized route path, then source package order, then
   candidate ID.
2. Navigation sorts by associated route order, then source package order, then
   candidate ID.
3. Sections sort by associated route order, then source package order, then
   candidate ID.
4. Assignments sort by source package order, then candidate type, then
   candidate ID.

The source package order is the order of `approvedCandidateRefs` in the exact
`ReconstructionPackage` payload.

The builder must not use AI sorting, layout heuristics, visual importance,
content quality, confidence preference, operator note sentiment, source DOM
position, or inferred design intent to reorder candidates.

## Status Rules

The builder should create `StructurePlan` status as follows:

| Status | Builder rule |
| --- | --- |
| `valid` | All included approved candidates are assigned successfully, lineage is current and valid, and `validateStructurePlan(...)` passes. |
| `blocked` | There are no included candidates, required lineage is missing, or one or more included candidates cannot be assigned deterministically. |
| `stale` | The supplied `ReconstructionPackage` artifact is not the latest head for the site version at builder start. |
| `invalid` | The package or derived Structure Plan fails contract validation, contains forbidden fields, has unsupported candidate types, or has inconsistent lineage/counts. |

The builder should not emit generated, executed, published, deployed,
reconstructed, running, complete, or ready-for-execution statuses.

## Limitation Propagation

The Structure Plan limitations should include:

- limitations copied from the source `ReconstructionPackage`;
- candidate-specific limitations available on the approved candidate refs or
  supporting lineage, when explicitly supplied;
- deterministic builder blockers, such as missing route path, ambiguous route
  association, missing latest-package proof, invalid lineage, duplicate planned
  identity, unsupported candidate type, and failed contract validation.

Limitations are explanatory metadata only. They do not authorize fallback
generation, upstream querying, candidate inference, or publishing.

## Diagnostics

The builder diagnostics should include:

- route count;
- navigation count;
- section count;
- assignment count;
- included approved candidate count;
- blocked candidate IDs and reasons;
- source package artifact ID;
- source package latest validation result;
- source package contract validation result;
- Structure Plan contract validation result;
- lineage validation against Review, Discovery, site version, and dry run refs
  carried by the package;
- ordering decisions for routes, navigation, sections, and assignments;
- limitation propagation summary.

Diagnostics must remain developer/operator metadata. They must not contain
generated UI, content, components, AI output, publishing artifacts, execution
instructions, or source patches.

## Example

Input package contains four reviewed candidates:

| Candidate | Type | Decision in Review | Included in ReconstructionPackage? |
| --- | --- | --- | --- |
| `candidate-route-home` | `route` | approved | yes |
| `candidate-nav-main` | `navigation` | deferred | no |
| `candidate-section-hero` | `section` | rejected | no |
| `candidate-section-footer` | `section` | unreviewed | no |

The exact latest `ReconstructionPackage` therefore contains only:

```text
approvedCandidateRefs = [
  { candidateId: "candidate-route-home", candidateType: "route", routePath: "/" }
]
```

Expected Structure Plan:

- planned routes: `1`;
- assignments: `1`;
- planned navigation: `0`;
- planned sections: `0`;
- the route candidate receives one route assignment;
- the deferred navigation candidate is excluded before planning;
- the rejected section candidate is excluded before planning;
- the unreviewed section candidate is excluded before planning.

No navigation or section is created from excluded candidates, even if upstream
lineage still contains their source candidate records.

## First Implementation Scope

Phase 8F-3 should implement:

- a pure deterministic Structure Plan builder;
- route planning from approved route candidates;
- navigation planning from approved navigation candidates;
- section planning from approved section candidates;
- assignment creation;
- limitation propagation;
- diagnostics;
- focused tests for valid, blocked, stale, and invalid outcomes.

Phase 8F-3 should not add persistence, UI, API, AI, generation, publishing,
schema, workers, Evidence Capture behavior, Candidate Discovery behavior,
Candidate Context behavior, Candidate Review behavior, Review Actions
behavior, Reconstruction Package behavior, or runtime execution.

## Completion

At the end of Phase 8F-2, the Structure Plan builder design is defined well
enough for Phase 8F-3 to implement deterministic planning from one exact
latest `ReconstructionPackage` without generating anything.

Phase 8F-3 implemented that first deterministic builder in:

```text
apps/platform/gnr8/architecture/structure-plan-builder.ts
```

The implementation keeps the 8F-2 boundary intact. It accepts one exact
`ReconstructionPackage` payload plus the source artifact ID and latest artifact
ID, derives `structure-plan:<reconstructionPackageArtifactId>:8F-1`, plans
routes, navigation, sections, and assignments from included approved candidate
refs only, propagates source limitations and deterministic builder blockers,
records counts/stale/validation diagnostics, and validates the output with
`validateStructurePlan(...)`.

Blocked plans remain contract-valid and assignment-free when no included
candidates exist or route association blockers are present. Valid plans create
one assignment per successfully planned included approved candidate. Stale
inputs are marked `stale`, and contract validation failures are marked
`invalid`.

Phase 8F-3 added no persistence, AI, generation, publishing, schema, workers,
Evidence Capture behavior, Candidate Discovery behavior, Candidate Context
behavior, Candidate Review behavior, Review Actions behavior, Reconstruction
Package behavior, StructurePlan contract changes, API, UI, or runtime
execution.

The recommended next phase is:

```text
Phase 8F-4 - Structure Planning Real-Artifact Validation
```
