# Structure Plan Persistence Real-Artifact Validation

## Phase And Scope

Phase 8F-7 validates Structure Plan persistence against real latest
Reconstruction Package artifacts for ODV and ViroiDoc.

This was validation-only. It did not add Content Planning, Layout Planning, AI,
generation, publishing, schema, workers, API, UI, or downstream execution.

## Method

For each target, validation used the existing helper path:

1. Load latest Reconstruction Package with `loadLatestReconstructionPackage(...)`.
2. Confirm the latest artifact matches the requested real artifact ID.
3. Reload the exact Reconstruction Package by ID with
   `loadReconstructionPackageById(...)`.
4. Build a Structure Plan with `buildStructurePlan(...)`.
5. Persist with `persistStructurePlan(...)`.
6. Reload latest with `loadLatestStructurePlan(...)`.
7. Reload exact artifact with `loadStructurePlanById(...)`.
8. Retry the same persist and verify idempotent reuse.
9. Scan the persisted Structure Plan artifact for forbidden downstream fields.

## ODV Result

Target site version:

```text
09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Latest Reconstruction Package:

```text
reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296
```

The latest Reconstruction Package matched the requested artifact and exact
by-ID reload matched latest. It had status `valid`, dry run
`09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`, Review artifact
`candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`, Discovery
artifact `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`, and
`3` included/approved candidates.

Persisted Structure Plan:

```text
structure_plan_08e12e859e457d5ac15870ce2892c817
```

Persisted metadata:

| Field | Value |
| --- | --- |
| `structurePlanId` | `structure-plan:reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296:8F-1` |
| `status` | `valid` |
| `plannedRouteCount` | `1` |
| `plannedNavigationCount` | `0` |
| `plannedSectionCount` | `2` |
| `assignmentCount` | `3` |
| `blockedCandidateCount` | `0` |
| `contractVersion` | `8F-1` |
| `createdAt` | `2026-06-22T09:40:57.349Z` |
| `persistedAt` | `2026-06-25T17:31:52.828Z` |
| `validation.valid` | `true` |
| `diagnostics` | `STRUCTURE_PLAN_VALIDATION_PASSED` |
| `limitationCount` | `0` |

Reload verification:

- latest reload returned
  `structure_plan_08e12e859e457d5ac15870ce2892c817`;
- by-ID reload returned
  `structure_plan_08e12e859e457d5ac15870ce2892c817`;
- latest and by-ID records were deeply equal;
- idempotent retry returned the same artifact ID;
- `structurePlanArtifacts` moved from `0` to `1`, and retry did not append a
  second artifact.

Lineage and metadata checks passed. The persisted artifact, plan lineage, and
Reconstruction Package agreed on Reconstruction Package artifact, package ID,
package status, package contract version, Review artifact, Discovery artifact,
site version, dry run, and included candidate refs.

## ViroiDoc Result

Target site version:

```text
e26b0754-988b-45b9-9e24-8e213179b6cf
```

Latest Reconstruction Package:

```text
reconstruction_package_0e143f5fc174668e2225f73ebe464ffb
```

The latest Reconstruction Package matched the requested artifact and exact
by-ID reload matched latest. It had status `valid`, dry run
`e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`, Review artifact
`candidate_review_package_ecb5f777160a45e15b958948348bca08`, Discovery
artifact `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`, and
`1` included/approved candidate.

Persisted Structure Plan:

```text
structure_plan_7b73cf96b695da6ba0103fb30ad306a0
```

Persisted metadata:

| Field | Value |
| --- | --- |
| `structurePlanId` | `structure-plan:reconstruction_package_0e143f5fc174668e2225f73ebe464ffb:8F-1` |
| `status` | `valid` |
| `plannedRouteCount` | `1` |
| `plannedNavigationCount` | `0` |
| `plannedSectionCount` | `0` |
| `assignmentCount` | `1` |
| `blockedCandidateCount` | `0` |
| `contractVersion` | `8F-1` |
| `createdAt` | `2026-06-22T09:10:24.166Z` |
| `persistedAt` | `2026-06-25T17:31:54.568Z` |
| `validation.valid` | `true` |
| `diagnostics` | `STRUCTURE_PLAN_VALIDATION_PASSED` |
| `limitationCount` | `36` |

Reload verification:

- latest reload returned
  `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`;
- by-ID reload returned
  `structure_plan_7b73cf96b695da6ba0103fb30ad306a0`;
- latest and by-ID records were deeply equal;
- idempotent retry returned the same artifact ID;
- `structurePlanArtifacts` moved from `0` to `1`, and retry did not append a
  second artifact.

Lineage and metadata checks passed. The persisted artifact, plan lineage, and
Reconstruction Package agreed on Reconstruction Package artifact, package ID,
package status, package contract version, Review artifact, Discovery artifact,
site version, dry run, and included candidate refs.

The `36` propagated source Reconstruction Package limitations remained
metadata-only limitations and did not block Structure Plan validation or
persistence.

## Safety Verification

The persisted Structure Plan artifacts contained none of these forbidden
surfaces:

- Content Plan artifacts or Content Planning fields;
- Layout Plan artifacts or Layout Planning fields;
- AI outputs;
- generated React, generated components, generated blocks, or generated
  content;
- publishing artifacts;
- deployment artifacts;
- execution artifacts;
- worker jobs.

No new forbidden provenance sibling keys were added for either target. The only
new durable artifacts were `structure_plan` artifacts under
`structurePlanArtifacts` with `latestStructurePlanArtifact` advanced to the
same artifact.

## Validation Result

Real-artifact persistence passed for both requested targets.

Focused Structure Plan tests passed `26 / 26`. `cd apps/platform && pnpm run
vercel-build` passed with existing unrelated frontend lint warnings.
`git diff --check` passed.

At the end of Phase 8F-7, ODV and ViroiDoc latest Reconstruction Package
artifacts have durable Structure Plan artifacts that can be reloaded exactly
and safely.

The recommended next phase is:

```text
Phase 8F-8 - Structure Plan Read-Only Surface Design
```
