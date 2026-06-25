# Structure Plan Surface Design

## Scope

Phase 8F-8 designs the read-only admin surface for persisted
`structure_plan` artifacts.

This phase answers:

> How should an operator inspect a StructurePlan without confusing it with
> generated reconstruction?

This phase does not implement UI, add routes, add APIs, change persistence,
change the StructurePlan contract, change the StructurePlan builder, call AI
systems, generate website output, dispatch workers, publish, or modify schema.

## Surface Purpose

The Structure Plan surface is an artifact inspection page for the latest
persisted `structure_plan` for a site version. It shows how approved
Reconstruction Package candidates were organized into metadata-only route,
navigation, section, and assignment records.

The surface must show:

- what routes are planned;
- what navigation is planned;
- what sections are planned;
- how approved candidates were assigned.

The surface must also clarify that a Structure Plan is not generated website
output. It is not a reconstruction preview, not generated React, not generated
content, not a block tree, not a deployment, and not evidence that publishing is
available. It is the read-only planning artifact between persisted
Reconstruction Package approval and future Layout/Content Planning.

## Recommended UI Location

Options assessed:

| Option | Assessment | Decision |
| --- | --- | --- |
| A. Dedicated admin Structure Plan page | Keeps the artifact, lineage, counts, assignments, limitations, and diagnostics together without making it look like a generated site or editable workspace output. It can use the same read-only admin inspection pattern as prior planning artifacts while remaining separate from reconstruction preview. | **Recommended.** |
| B. Candidate Review page extension | Shows the approval source nearby, but risks making Structure Plan look like another review action result and would crowd candidate review with downstream planning details. | Do not use now. |
| C. Reconstruction Package page | Preserves lineage adjacency, but risks conflating "what was approved" with "how it was planned" and would make future Structure Plan inspection harder once multiple planning artifacts exist. | Do not use now. |
| D. Site Workspace | Useful later for a compact status tile or link, but too close to normal site operations and future preview surfaces for the first detailed inspection view. | Defer. |

Recommendation: **A. Dedicated admin Structure Plan page**.

Rationale: a dedicated admin page is the clearest way to keep persisted
Structure Plan metadata inspectable without presenting it as generated
reconstruction. The Site Workspace can later link to this page with a compact
read-only status, but the first full inspection surface should remain an admin
artifact view.

## Access And Read-Only Boundary

Initial access should be admin/superadmin-only, following the existing
admin-only provenance inspection pattern. The page should fail closed before
loading or displaying the artifact when the operator is not authorized.

The surface must be read-only. It must not mutate Structure Plan artifacts,
upstream candidates, Reconstruction Package artifacts, downstream planning, or
site workspace state.

## Surface Sections

### Overview

The Overview section should show:

- artifact ref;
- `structurePlanId`;
- `siteVersionId`;
- `status`;
- `createdAt`;
- `persistedAt`;
- `contractVersion`.

The status label should use Structure Plan status language only, such as
`valid`, `blocked`, `stale`, `invalid`, or `missing`. It should not use
generated, reconstructed, published, deployed, or preview-ready language.

### Lineage

The Lineage section should show exact source artifact IDs:

- `reconstructionPackageArtifactId`;
- `candidateReviewPackageArtifactId`;
- `candidateDiscoveryArtifactId`;
- `dryRunId`.

Lineage should be displayed as traceability, not as a set of action links that
trigger rebuilds, regeneration, replay, or publishing.

### Plan Summary

The Plan Summary section should show:

- route count;
- navigation count;
- section count;
- assignment count;
- blocked candidate count.

The summary should use counts as a quick audit of planning coverage. Counts are
not reconstruction readiness, generated output coverage, or publish readiness.

### Planned Routes

Planned Routes should be displayed as a compact table or grouped list ordered
by the persisted plan order.

Each planned route should show:

- `routeId`;
- `routePath`;
- source candidate ref;
- assignment ref.

The route path is planned metadata only. It should not be presented as a live
page, generated route, published URL, or preview link unless a separate future
preview boundary explicitly provides one.

### Planned Navigation

Planned Navigation should be grouped by route association when available.

Each planned navigation row should show:

- `navigationId`;
- route association;
- source candidate ref;
- assignment ref.

Navigation entries describe the planned placement of approved navigation
candidates. They do not create menus, generate links, or modify route scope.

### Planned Sections

Planned Sections should be grouped by route association and ordered by section
order within each route.

Each planned section row should show:

- `sectionId`;
- route association;
- section order;
- source candidate ref;
- assignment ref.

Section order is planning metadata only. The first surface should not render
screenshots, overlays, drag handles, editable selectors, layout editors, or
generated components.

### Assignments

Assignments should show the mapping from approved source candidate to planned
target.

Each assignment row should show:

- `assignmentId`;
- `candidateId`;
- `candidateType`;
- target kind;
- target ID.

The assignment view should be the primary place an operator verifies that each
approved route, navigation, or section candidate has one deterministic planning
target unless the Structure Plan is blocked.

### Diagnostics

Diagnostics should show:

- limitations;
- diagnostics;
- validation status.

Limitations should be visible without implying an override path. Diagnostics
should be read-only strings suitable for operator troubleshooting. They should
not include stack traces, secrets, database internals, auth internals, raw
request bodies, generated output payloads, or downstream execution payloads.

## Empty And Attention States

No Structure Plan:

- State: no latest `structure_plan` artifact exists for the site version.
- Display: "No Structure Plan has been persisted for this site version yet."
- Allowed action in this phase: none.
- Forbidden action: no build, generate, retry, repair, or trigger button.

Blocked Structure Plan:

- State: latest artifact exists with `status = "blocked"`.
- Display: blocked status, blocked candidate count, relevant limitations, and
  diagnostics.
- Allowed action in this phase: none.
- Forbidden action: no override, force-plan, approve, generate, or publish
  control.

Stale Structure Plan:

- State: an inspected artifact is no longer the latest for its Reconstruction
  Package lineage or validation reports stale lineage.
- Display: stale status, artifact refs, latest-head diagnostic when available,
  and lineage details.
- Allowed action in this phase: none.
- Forbidden action: no refresh, rebuild, regenerate, or make-latest control.

Valid but no navigation:

- State: latest Structure Plan is valid and `plannedNavigation.length = 0`.
- Display: valid status with an attention note that no navigation candidates
  were planned.
- Allowed action in this phase: none.
- Forbidden action: no add-navigation, infer-navigation, or generate-menu
  control.

Valid but no sections:

- State: latest Structure Plan is valid and `plannedSections.length = 0`.
- Display: valid status with an attention note that no section candidates were
  planned.
- Allowed action in this phase: none.
- Forbidden action: no add-section, infer-section, layout, or generate-section
  control.

Limitations present:

- State: latest Structure Plan has one or more limitations.
- Display: limitation count, severity or kind when available, message, and
  affected refs.
- Allowed action in this phase: none.
- Forbidden action: no override, dismiss, retry, repair, or generation control.

Attention-state precedence should be `missing`, then `invalid`, then `stale`,
then `blocked`, then `valid_no_navigation`, then `valid_no_sections`, then
`limitations_present`, then `ready_for_inspection`.

## Safety Constraints

The surface must not expose:

- AI controls;
- reconstruction controls;
- generation controls;
- publishing controls;
- execution controls;
- edit controls;
- trigger controls;
- repair controls;
- retry controls;
- force controls;
- approval controls;
- route creation controls;
- navigation creation controls;
- section creation controls;
- layout controls;
- content controls;
- worker controls;
- queue controls.

The surface must not change Evidence Capture, Candidate Discovery, Candidate
Context, Candidate Review, Review Actions, Reconstruction Package,
StructurePlan contract, StructurePlan builder, StructurePlan persistence, AI
systems, generation systems, publishing systems, schema, or workers.

## Projection Shape

`StructurePlanSurfaceProjection` should be a UI-independent read-only
projection over one persisted Structure Plan artifact. It should not be a new
persistence record, mutation contract, generation input, or reconstruction
output.

Recommended shape:

```ts
type StructurePlanSurfaceState =
  | "missing"
  | "invalid"
  | "stale"
  | "blocked"
  | "valid_no_navigation"
  | "valid_no_sections"
  | "limitations_present"
  | "ready_for_inspection";

type StructurePlanSurfaceProjection = {
  artifact: {
    artifactRef: string | null;
    artifactKind: "structure_plan";
    artifactVersion: number | null;
    structurePlanId: string | null;
    siteVersionId: string;
    status: string | null;
    createdAt: string | null;
    persistedAt: string | null;
    contractVersion: string | null;
  };
  lineage: {
    reconstructionPackageArtifactId: string | null;
    candidateReviewPackageArtifactId: string | null;
    candidateDiscoveryArtifactId: string | null;
    dryRunId: string | null;
  };
  summary: {
    routeCount: number;
    navigationCount: number;
    sectionCount: number;
    assignmentCount: number;
    blockedCandidateCount: number;
  };
  plannedRoutes: Array<{
    routeId: string;
    routePath: string;
    sourceCandidateRef: string;
    assignmentRef: string | null;
  }>;
  plannedNavigation: Array<{
    navigationId: string;
    routeAssociation: string | null;
    sourceCandidateRef: string;
    assignmentRef: string | null;
  }>;
  plannedSections: Array<{
    sectionId: string;
    routeAssociation: string | null;
    sectionOrder: number | null;
    sourceCandidateRef: string;
    assignmentRef: string | null;
  }>;
  assignments: Array<{
    assignmentId: string;
    candidateId: string;
    candidateType: "route" | "navigation" | "section";
    targetKind: "route" | "navigation" | "section" | "unresolved";
    targetId: string | null;
  }>;
  limitations: string[];
  diagnostics: string[];
  validation: {
    status: "valid" | "invalid" | "unavailable";
    errorCount: number;
    warningCount: number;
    errors: string[];
    warnings: string[];
  };
  state: StructurePlanSurfaceState;
};
```

The projection should group planned route, navigation, section, and assignment
metadata for display only. It should not add derived candidates, infer missing
navigation, infer missing sections, create generated output, or expand the
StructurePlan contract.

## Relationship To Future UI

The read-only Structure Plan page should sit before any future planning or
preview surfaces:

```text
StructurePlan read-only page
-> future Layout/Content Planning
-> future Reconstruction Preview
```

The page is the audit view for persisted planning metadata. Future
Layout/Content Planning may consume the same persisted Structure Plan, but that
will require a separate boundary. Future Reconstruction Preview may inspect
outputs from later planning/generation phases, but the Structure Plan surface
must not show a preview or imply that generated reconstruction exists.

## Phase 8F-8 Completion Boundary

At the end of Phase 8F-8, the read-only surface purpose, dedicated admin page
recommendation, section design, empty/attention states, safety constraints,
projection shape, and future UI relationship are defined.

Phase 8F-8 changed documentation only. It added no UI implementation, route,
API, loader, persistence helper, contract change, builder change, Evidence
Capture change, Candidate Discovery change, Candidate Context change, Candidate
Review change, Review Actions change, Reconstruction Package change, AI system,
generation system, publishing system, schema, worker, or runtime behavior.

## Phase 8F-9 Implementation Completion

Phase 8F-9 implements the dedicated read-only admin Structure Plan page:

```text
apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx
```

The page uses the existing superadmin page guard and loads a UI-independent
read-only projection from:

```text
apps/platform/gnr8/architecture/structure-plan-surface-projection.ts
```

The projection reads the latest persisted Structure Plan artifact through the
existing Structure Plan persistence loader and projects only artifact metadata,
lineage, summary counts, planned routes, planned navigation, planned sections,
assignments, limitations, diagnostics, and validation state for display.

Implemented display states:

- missing Structure Plan;
- blocked Structure Plan;
- stale Reconstruction Package lineage;
- valid Structure Plan;
- limitations present;
- no planned navigation;
- no planned sections.

The page exposes no buttons, forms, inputs, edit controls, AI controls,
reconstruction controls, generation controls, publishing controls, execution
controls, retry controls, or approval controls.

Phase 8F-9 changed only the read-only surface implementation, projection, focused
tests, and phase documentation. It did not modify Evidence Capture, Candidate
Discovery, Candidate Context, Candidate Review, Review Actions, Reconstruction
Package, StructurePlan contract, StructurePlan builder, StructurePlan
persistence, AI systems, generation systems, publishing systems, schema, or
workers.

Validation result: focused Structure Plan surface tests pass; `cd apps/platform
&& pnpm run vercel-build` passes; `git diff --check` passes.

The recommended next phase is **Phase 8F-10 - Structure Plan End-to-End
Verification**, limited to verifying the read-only surface against persisted
Structure Plan artifacts without Content Planning, Layout Planning, AI,
generation, publishing, or mutation behavior.

## Phase 8F-10 End-to-End Verification Completion

Phase 8F-10 verifies the complete persisted Structure Plan admin chain:

```text
persisted structure_plan artifact
-> latest loader
-> StructurePlanSurfaceProjection
-> dedicated read-only admin page
```

Detailed evidence is recorded in:

```text
docs/architecture/STRUCTURE_PLAN_E2E_VERIFICATION.md
```

ODV site version `09dce7ea-d860-4f60-a1eb-26c3335b302e` loads latest
Structure Plan `structure_plan_08e12e859e457d5ac15870ce2892c817` with
`valid` status, `1` planned route, `0` planned navigation entries, `2`
planned sections, `3` assignments, `0` blocked candidates, and the
`no_navigation` attention state.

ViroiDoc site version `e26b0754-988b-45b9-9e24-8e213179b6cf` loads latest
Structure Plan `structure_plan_7b73cf96b695da6ba0103fb30ad306a0` with
`valid` status, `1` planned route, `0` planned navigation entries, `0`
planned sections, `1` assignment, `0` blocked candidates, and
`limitations_present`, `no_navigation`, and `no_sections` attention states.

Both projections preserve current lineage for Reconstruction Package, Review
Package, Discovery Result, `siteVersionId`, and `dryRunId`. The dedicated page
source remains read-only and contains no buttons, forms, inputs, AI,
generation, publishing, execution, retry, approval, edit, Content Planning, or
Layout Planning controls.

The local browser verified that the dynamic admin route compiles and enforces
the superadmin guard by redirecting an unauthenticated request to `/login`.
Authenticated artifact display was verified through the live latest loader,
surface projection, page source, focused tests, and production build.

Validation result: focused Structure Plan persistence/projection/page tests
pass `16 / 16`; `cd apps/platform && pnpm run vercel-build` passes with
existing unrelated lint warnings and includes the dynamic Structure Plan route;
`git diff --check` passes.

Phase 8F-10 changed documentation only. It added no Content Planning, Layout
Planning, AI, generation, publishing, schema, workers, API behavior, UI
mutation behavior, buttons, forms, inputs, or changes to Structure Plan
persistence, projection, or page behavior.

The recommended next phase is **Phase 8F-11 - Post-Structure Plan Boundary
Reassessment**, documentation-only.
