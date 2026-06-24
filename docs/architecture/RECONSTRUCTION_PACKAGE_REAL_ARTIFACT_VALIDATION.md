# Reconstruction Package Real-Artifact Validation

Phase 8E-4 validates the Phase 8E-3 pure Reconstruction Package builder
against real ODV and ViroiDoc Candidate Review and Candidate Discovery
artifacts.

Boundary:

- Validation only.
- No persistence.
- No Structure Planning.
- No AI.
- No generation.
- No publishing.
- No schema change.
- No workers.
- No UI.
- No behavior change.

## Validation Method

The validation loaded the two real site-version import provenance summaries
with one read-only `select` against `public.gnr8_runtime_site_versions`.
It did not call runtime-store persistence helpers, mutation helpers,
`ensureRuntimeTables(...)`, routes, workers, or UI code.

The in-memory validation then called:

- `buildReconstructionPackage(...)`
- `validateReconstructionPackage(...)`

No Reconstruction Package was persisted. No latest pointer was advanced. No
artifact was written.

## Important Latest-Head Finding

The review artifact IDs supplied to Phase 8E-4 are loadable and valid, but
they are no longer the current latest Review Package heads in production
provenance.

This is not a builder defect. It is a real-data drift finding:

| Target | Supplied Review artifact | Current latest Review artifact |
| --- | --- | --- |
| ODV | `candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f` | `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` |
| ViroiDoc | `candidate_review_package_4e70cbc788098383b52de76249a5c412` | `candidate_review_package_ecb5f777160a45e15b958948348bca08` |

The supplied historical artifacts correctly produce `stale` packages. The
actual current latest heads correctly produce `valid` packages.

## ODV Supplied Artifact Result

Inputs:

- Site Version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- Supplied Review artifact: `candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f`
- Current latest Review artifact: `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`
- Discovery artifact: `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`
- Dry Run: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

Result:

- Reconstruction Package ID: `reconstruction-package:candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f:8E-1`
- Status: `stale`
- Validation: `valid`, `0` errors, `1` warning
- Approved candidate count: `1`
- Included candidate count: `1`
- Excluded candidate count: `3`
- Excluded breakdown: `1` rejected, `1` deferred, `1` unreviewed
- Diagnostics include `STALE_REVIEW_PACKAGE_CHECK:stale`, valid Review
  validation, valid Discovery validation, valid lineage, matched Discovery
  lineage, no missing approved candidates, and valid Reconstruction Package
  validation with the stale warning.
- Limitations: `1` builder blocker,
  `STALE_REVIEW_PACKAGE:Review Package artifact is not the latest package for this lineage.`

Approved mapping:

- Included approved Route: `candidate:route:/`
- Excluded deferred Navigation: `candidate:navigation:nav%3A%2F`
- Excluded rejected Section:
  `candidate:section:/:section-boundary-7ea033afed92`
- Excluded unreviewed Section:
  `candidate:section:/:section-boundary-acafcf3135dc`

Lineage:

- Review artifact lineage is retained as
  `candidate_review_package_9db6afaefda96317c2e1e858c6cf5b8f`.
- Review package ID is
  `candidate-review:candidate_discovery_result_dbf786254717f980469b9b99853c14b8`.
- Discovery artifact lineage is retained as
  `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`.
- Site Version and Dry Run match the linked Discovery result.

Forbidden fields:

- `structurePlan`: absent.
- `aiOutputs`: absent.
- `generatedContent`: absent.
- `publishingArtifacts`: absent.
- `executionArtifacts`: absent.
- Full forbidden-field scan: none present.

## ODV Current Latest-Head Result

Inputs:

- Site Version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- Current latest Review artifact:
  `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`
- Discovery artifact: `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`
- Dry Run: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

Result:

- Reconstruction Package ID:
  `reconstruction-package:candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b:8E-1`
- Status: `valid`
- Validation: `valid`, `0` errors, `0` warnings
- Review counts: `4` reviewed, `3` approved, `0` rejected, `1` deferred
- Approved candidate count: `3`
- Included candidate count: `3`
- Excluded candidate count: `1`
- Excluded breakdown: `0` rejected, `1` deferred, `0` unreviewed
- Limitations: `0`
- Approved included candidates:
  - `candidate:route:/`
  - `candidate:section:/:section-boundary-7ea033afed92`
  - `candidate:section:/:section-boundary-acafcf3135dc`
- Diagnostics include `STALE_REVIEW_PACKAGE_CHECK:latest`,
  valid source validations, valid lineage, matched Discovery lineage,
  `MISSING_APPROVED_CANDIDATE_CHECK:none`, and
  `RECONSTRUCTION_PACKAGE_VALIDATION:valid:errors=0:warnings=0`.
- Forbidden-field scan: none present.

## ViroiDoc Supplied Artifact Result

Inputs:

- Site Version: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- Supplied Review artifact: `candidate_review_package_4e70cbc788098383b52de76249a5c412`
- Current latest Review artifact: `candidate_review_package_ecb5f777160a45e15b958948348bca08`
- Discovery artifact: `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`
- Dry Run: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`

Result:

- Reconstruction Package ID:
  `reconstruction-package:candidate_review_package_4e70cbc788098383b52de76249a5c412:8E-1`
- Status: `stale`
- Validation: `valid`, `0` errors, `1` warning
- Discovery counts: `5` candidates, `18` source limitations, `0` blockers
- Approved candidate count: `1`
- Included candidate count: `1`
- Excluded candidate count: `4`
- Excluded breakdown: `1` rejected, `1` deferred, `2` unreviewed
- Diagnostics include `STALE_REVIEW_PACKAGE_CHECK:stale`, valid Review
  validation, valid Discovery validation, valid lineage, matched Discovery
  lineage, no missing approved candidates, and valid Reconstruction Package
  validation with the stale warning.
- Limitations: `37` deterministic strings, including the stale builder blocker
  and propagated ViroiDoc dry-run scope warnings from the approved Route
  candidate and Discovery source limitations.

Approved mapping:

- Included approved Route: `candidate:route:/`
- Excluded deferred Navigation: `candidate:navigation:nav%3A%2F`
- Excluded rejected Section:
  `candidate:section:/:section-boundary-4156e11f8f75`
- Excluded unreviewed Sections:
  `candidate:section:/:section-boundary-c8165b22f882`
  and `candidate:section:/:section-boundary-230d7a52f0d6`

Lineage:

- Review artifact lineage is retained as
  `candidate_review_package_4e70cbc788098383b52de76249a5c412`.
- Review package ID is
  `candidate-review:candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`.
- Discovery artifact lineage is retained as
  `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`.
- Site Version and Dry Run match the linked Discovery result.

Forbidden fields:

- `structurePlan`: absent.
- `aiOutputs`: absent.
- `generatedContent`: absent.
- `publishingArtifacts`: absent.
- `executionArtifacts`: absent.
- Full forbidden-field scan: none present.

## ViroiDoc Current Latest-Head Result

Inputs:

- Site Version: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- Current latest Review artifact:
  `candidate_review_package_ecb5f777160a45e15b958948348bca08`
- Discovery artifact: `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`
- Dry Run: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`

Result:

- Reconstruction Package ID:
  `reconstruction-package:candidate_review_package_ecb5f777160a45e15b958948348bca08:8E-1`
- Status: `valid`
- Validation: `valid`, `0` errors, `0` warnings
- Review counts: `3` reviewed, `1` approved, `1` rejected, `1` deferred
- Approved candidate count: `1`
- Included candidate count: `1`
- Excluded candidate count: `4`
- Excluded breakdown: `1` rejected, `1` deferred, `2` unreviewed
- Limitations: `36` deterministic propagated source limitations
- Approved included candidate: `candidate:route:/`
- Diagnostics include `STALE_REVIEW_PACKAGE_CHECK:latest`,
  valid source validations, valid lineage, matched Discovery lineage,
  `MISSING_APPROVED_CANDIDATE_CHECK:none`, and
  `RECONSTRUCTION_PACKAGE_VALIDATION:valid:errors=0:warnings=0`.
- Forbidden-field scan: none present.

## Validation Conclusion

The Phase 8E-3 builder correctly transforms real approved review decisions
into contract-valid, metadata-only Reconstruction Packages when supplied the
actual latest Review Package head. It also correctly marks older Review
Package artifacts as `stale` while preserving their audit lineage and keeping
their historical package shape contract-valid.

No builder defect was found. No behavior change was made.

The only finding is data drift: the Review artifact IDs supplied to the phase
were no longer the current latest Review Package pointers at validation time.
The builder handled that drift correctly by returning `stale` packages for
those historical artifacts.

## Validation Commands

Focused tests:

```text
cd apps/platform
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx --test gnr8/architecture/reconstruction-package-contract.test.ts gnr8/architecture/reconstruction-package-builder.test.ts
```

Result: `18 / 18` tests passed.

Platform build:

```text
cd apps/platform
pnpm run vercel-build
```

Result: passed. Existing lint warnings remained in unrelated frontend files.

Diff whitespace check:

```text
git diff --check
```

Result: passed.

## Safety Confirmation

Phase 8E-4 added no:

- persistence
- Structure Plan
- AI output
- generated content
- publishing artifact
- execution artifact
- schema change
- worker
- API
- UI
- latest-pointer mutation

## Recommended Next Phase

> **Phase 8E-5 - Reconstruction Package Persistence Boundary Design**
