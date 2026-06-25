# Structure Planning Real-Artifact Validation

Phase 8F-4 validates the deterministic Structure Plan builder against the real
latest ODV and ViroiDoc `ReconstructionPackage` artifacts.

Boundary:

- Validation only.
- Use existing `loadLatestReconstructionPackage(...)`,
  `loadReconstructionPackageById(...)`, and `buildStructurePlan(...)`.
- Do not persist Structure Plans.
- Do not add AI.
- Do not generate React, blocks, or content.
- Do not publish.
- Do not add schema, workers, API, or UI.
- Do not modify behavior unless fixing a blocking Structure Plan builder
  defect.

No blocking Structure Plan builder defect was found. No application behavior
was changed.

## Validation Method

The validation loaded each target's latest `ReconstructionPackage` artifact
through `loadLatestReconstructionPackage(...)`, loaded the exact target
artifact through `loadReconstructionPackageById(...)`, asserted that the exact
artifact is the latest artifact for that site version, and passed the exact
package payload plus latest artifact ID into `buildStructurePlan(...)`.

The resulting `StructurePlan` was validated with `validateStructurePlan(...)`
and scanned recursively for forbidden Structure Plan fields.

## ODV Result

Inputs:

- Site Version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- Reconstruction Package artifact:
  `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`
- Latest artifact check: passed; the target artifact is latest.

Structure Plan:

- Structure Plan ID:
  `structure-plan:reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296:8F-1`
- Status: `valid`
- Planned route count: `1`
- Planned navigation count: `0`
- Planned section count: `2`
- Assignment count: `3`
- Blocked candidate count: `0`
- Limitations: `0`

Diagnostics:

```text
RECONSTRUCTION_PACKAGE_VALIDATION:valid:errors=0:warnings=0
STALE_RECONSTRUCTION_PACKAGE_CHECK:latest:reconstructionPackageArtifactId=reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296:latestReconstructionPackageArtifactId=reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296
INCLUDED_APPROVED_CANDIDATE_COUNT:3
PLANNED_ROUTE_COUNT:1
PLANNED_NAVIGATION_COUNT:0
PLANNED_SECTION_COUNT:2
ASSIGNMENT_COUNT:3
BLOCKED_CANDIDATE_COUNT:0
STRUCTURE_PLAN_VALIDATION:valid:errors=0:warnings=0
```

## ViroiDoc Result

Inputs:

- Site Version: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- Reconstruction Package artifact:
  `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`
- Latest artifact check: passed; the target artifact is latest.

Structure Plan:

- Structure Plan ID:
  `structure-plan:reconstruction_package_0e143f5fc174668e2225f73ebe464ffb:8F-1`
- Status: `valid`
- Planned route count: `1`
- Planned navigation count: `0`
- Planned section count: `0`
- Assignment count: `1`
- Blocked candidate count: `0`
- Limitations: `36` propagated Reconstruction Package limitations.

Diagnostics:

```text
RECONSTRUCTION_PACKAGE_VALIDATION:valid:errors=0:warnings=0
STALE_RECONSTRUCTION_PACKAGE_CHECK:latest:reconstructionPackageArtifactId=reconstruction_package_0e143f5fc174668e2225f73ebe464ffb:latestReconstructionPackageArtifactId=reconstruction_package_0e143f5fc174668e2225f73ebe464ffb
INCLUDED_APPROVED_CANDIDATE_COUNT:1
PLANNED_ROUTE_COUNT:1
PLANNED_NAVIGATION_COUNT:0
PLANNED_SECTION_COUNT:0
ASSIGNMENT_COUNT:1
BLOCKED_CANDIDATE_COUNT:0
STRUCTURE_PLAN_VALIDATION:valid:errors=0:warnings=0
```

The ViroiDoc limitations are deterministic propagated source limitations from
the source Reconstruction Package, primarily out-of-scope navigation hrefs from
the earlier limited dry-run/discovery lineage. They did not block Structure
Plan validation.

## Lineage Verification

Both Structure Plans preserved the exact source lineage:

| Target | Reconstruction Package artifact | Candidate Review artifact | Candidate Discovery artifact | Site Version | Dry Run |
| --- | --- | --- | --- | --- | --- |
| ODV | `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` | `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` | `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l` |
| ViroiDoc | `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb` | `candidate_review_package_ecb5f777160a45e15b958948348bca08` | `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n` |

Additional lineage checks:

- ODV package ID:
  `reconstruction-package:candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b:8E-1`
- ViroiDoc package ID:
  `reconstruction-package:candidate_review_package_ecb5f777160a45e15b958948348bca08:8E-1`
- Both source package statuses are `valid`.
- Both source package contract versions are `8E-1`.
- ODV included candidate count copied to Structure Plan lineage is `3`.
- ViroiDoc included candidate count copied to Structure Plan lineage is `1`.

## Safety Verification

Recursive forbidden-field scans found no forbidden fields in either
Structure Plan output.

Confirmed absent:

- generated React
- generated blocks
- generated content
- generated components
- AI output
- publishing artifacts
- deployment artifacts
- execution artifacts
- reconstruction instructions
- structure instructions

Phase 8F-4 added no Structure Plan persistence, AI output, generated React,
generated blocks, generated content, publishing artifact, deployment artifact,
execution artifact, schema change, worker, API, UI, or runtime behavior
change.

## Validation Commands

Real-artifact Structure Plan validation:

```text
set -a
source apps/platform/.env.production
set +a
cd apps/platform
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx tmp-structure-plan-real-artifact-validation.ts
```

Result: passed. ODV and ViroiDoc exact `reconstruction_package` artifacts were
loaded, confirmed as latest, transformed through `buildStructurePlan(...)`, and
validated as metadata-only Structure Plans. The temporary validation script was
removed after the run.

Focused tests:

```text
cd apps/platform
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx --test gnr8/architecture/structure-plan-contract.test.ts gnr8/architecture/structure-plan-builder.test.ts
```

Result: `18 / 18` tests passed. The first sandboxed run failed before tests
with the known local `tsx` IPC `EPERM` pipe restriction; the identical command
passed outside the sandbox.

Platform build:

```text
cd apps/platform
pnpm run vercel-build
```

Result: passed. Existing unrelated lint warnings remain for React hook
dependency arrays and `<img>` usage in frontend files.

Diff whitespace check:

```text
git diff --check
```

Result: passed during Phase 8F-4 validation.

## Conclusion

The real latest ODV and ViroiDoc `ReconstructionPackage` artifacts can be
deterministically transformed into metadata-only `StructurePlan` values without
persistence, AI, generation, execution, or publishing.

## Recommended Next Phase

> **Phase 8F-5 - Structure Plan Persistence Boundary Design**
