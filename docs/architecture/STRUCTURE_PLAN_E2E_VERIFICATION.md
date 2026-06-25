# Structure Plan End-to-End Verification

## Scope

Phase 8F-10 verifies the complete read-only Structure Plan admin chain:

```text
persisted structure_plan artifact
-> latest loader
-> StructurePlanSurfaceProjection
-> dedicated read-only admin page
```

This phase is verification-only. It does not add Content Planning, Layout
Planning, AI, generation, publishing, schema, workers, API behavior, UI
mutations, buttons, forms, or inputs.

## Targets

| Target | siteVersionId | Structure Plan artifact |
| --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `structure_plan_08e12e859e457d5ac15870ce2892c817` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `structure_plan_7b73cf96b695da6ba0103fb30ad306a0` |

## Method

The verification used the existing read-only helpers only:

```text
loadLatestStructurePlan(...)
loadStructurePlanById(...)
loadLatestStructurePlanSurfaceProjection(...)
```

For each target, the check loaded the latest persisted Structure Plan, reloaded
the exact artifact by ID, built the surface projection, compared status,
summary counts, attention states, lineage, planned rows, assignments, and
limitations, and scanned the dedicated page source for read-only sections and
forbidden controls.

The local Next app was also started and the ODV admin URL was opened in the
browser:

```text
/gnr8/admin/structure-plan/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The dynamic page compiled and served the expected unauthenticated `307`
redirect to `/login` through the existing superadmin guard. The current browser
session was not authenticated as a superadmin, so artifact display was verified
through the live loader/projection checks, page source, focused tests, and
production build route output rather than by bypassing auth.

## ODV Result

Latest persisted artifact:

```text
structure_plan_08e12e859e457d5ac15870ce2892c817
```

Result:

| Check | Result |
| --- | --- |
| latest loader | matched target artifact |
| by-ID reload | matched target artifact |
| projection artifact | matched target artifact |
| status | `valid` |
| validation | `valid`, `0` errors |
| planned routes | `1` |
| planned navigation | `0` |
| planned sections | `2` |
| assignments | `3` |
| blocked candidates | `0` |
| attention states | `no_navigation` |
| limitations | none |

The projection exposes planned route `/`, two planned section rows associated
to `/`, and three assignment rows: one route assignment and two section
assignments.

## ViroiDoc Result

Latest persisted artifact:

```text
structure_plan_7b73cf96b695da6ba0103fb30ad306a0
```

Result:

| Check | Result |
| --- | --- |
| latest loader | matched target artifact |
| by-ID reload | matched target artifact |
| projection artifact | matched target artifact |
| status | `valid` |
| validation | `valid`, `0` errors |
| planned routes | `1` |
| planned navigation | `0` |
| planned sections | `0` |
| assignments | `1` |
| blocked candidates | `0` |
| attention states | `limitations_present`, `no_navigation`, `no_sections` |
| limitations | present |

The projection exposes planned route `/`, no planned sections, one route
assignment, and propagated source Reconstruction Package limitations.

## Lineage Result

ODV lineage:

| Field | Value |
| --- | --- |
| Reconstruction Package | `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` |
| Review Package | `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` |
| Discovery Result | `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` |
| siteVersionId | `09dce7ea-d860-4f60-a1eb-26c3335b302e` |
| dryRunId | `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l` |
| latest Reconstruction Package | current |

ViroiDoc lineage:

| Field | Value |
| --- | --- |
| Reconstruction Package | `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb` |
| Review Package | `candidate_review_package_ecb5f777160a45e15b958948348bca08` |
| Discovery Result | `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` |
| siteVersionId | `e26b0754-988b-45b9-9e24-8e213179b6cf` |
| dryRunId | `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n` |
| latest Reconstruction Package | current |

Both projections report `reconstructionPackageStale = false`.

## Page And Projection Result

The dedicated admin page remains:

```text
apps/platform/app/gnr8/admin/structure-plan/[siteVersionId]/page.tsx
```

It uses:

```text
loadLatestStructurePlanSurfaceProjection(...)
requireSuperadminUserIdForPage(...)
```

Verified read-only page sections:

- Overview
- Lineage
- Plan Summary
- Planned Routes
- Planned Navigation
- Planned Sections
- Assignments
- Diagnostics

The production build includes:

```text
/gnr8/admin/structure-plan/[siteVersionId]
```

as a dynamic server-rendered route.

## Forbidden Controls Result

The page source contains no:

- `<button>`
- `<form>`
- `<input>`
- `<textarea>`
- `<select>`
- AI controls
- generation controls
- publishing controls
- execution controls
- retry controls
- approval controls
- edit controls
- Content Planning controls
- Layout Planning controls

This phase added no UI mutation surface and no behavior change.

## Validation

Focused tests:

```text
cd apps/platform &&
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test \
  gnr8/architecture/structure-plan-persistence.test.ts \
  gnr8/architecture/structure-plan-surface-projection.test.ts \
  app/gnr8/admin/structure-plan-page.test.ts
```

Result: pass, `16 / 16`.

Build:

```text
cd apps/platform && pnpm run vercel-build
```

Result: pass. The build includes the dynamic
`/gnr8/admin/structure-plan/[siteVersionId]` route and reports existing
unrelated lint warnings.

Whitespace:

```text
git diff --check
```

Result: pass.

## Phase 8F-10 Completion Boundary

At the end of Phase 8F-10, operators can inspect real persisted Structure Plan
artifacts through the dedicated read-only admin page when authenticated as a
superadmin. The complete chain from persisted `structure_plan` artifact to
latest loader, surface projection, and admin route is verified for ODV and
ViroiDoc.

Phase 8F-10 changed documentation only. It did not change Structure Plan
persistence, projection, page behavior, Evidence Capture, Candidate Discovery,
Candidate Context, Candidate Review, Review Actions, Reconstruction Package,
StructurePlan contract, StructurePlan builder, AI systems, generation systems,
publishing systems, schema, workers, API behavior, UI mutation behavior,
Content Planning, or Layout Planning.

The recommended next phase is **Phase 8F-11 - Post-Structure Plan Boundary
Reassessment**, documentation-only, to decide the next legitimate boundary
after read-only Structure Plan inspection without jumping directly into Content
Planning, Layout Planning, AI, generation, publishing, or execution.
