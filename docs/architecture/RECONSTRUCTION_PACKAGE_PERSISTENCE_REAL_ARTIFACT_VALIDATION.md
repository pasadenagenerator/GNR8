# Reconstruction Package Persistence Real-Artifact Validation

Phase 8E-7 validates Reconstruction Package persistence against the real
latest approved ODV and ViroiDoc Candidate Review Package artifacts.

Boundary:

- Validation only.
- Use existing `persistReconstructionPackage(...)`,
  `loadLatestReconstructionPackage(...)`, and
  `loadReconstructionPackageById(...)` helpers.
- Do not add Structure Planning.
- Do not add AI.
- Do not generate content.
- Do not publish.
- Do not add schema, workers, API, or UI.
- Do not modify behavior unless fixing a blocking persistence defect.

No blocking persistence defect was found. No application behavior was changed.

## Validation Method

The validation loaded each target's latest Candidate Review Package using the
existing Candidate Review persistence loader, asserted that the live latest
artifact matched the exact artifact requested for this phase, loaded the linked
Candidate Discovery Result by ID, built a `ReconstructionPackage`, persisted it
through `persistReconstructionPackage(...)`, and reloaded it through both:

- `loadLatestReconstructionPackage(...)`
- `loadReconstructionPackageById(...)`

The validation then retried the same persistence input and confirmed the retry
reused the same artifact without appending another record.

## ODV Result

Inputs:

- Site Version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- Latest Review Package:
  `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b`
- Linked Candidate Discovery Result:
  `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`
- Dry Run: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`

Persisted Reconstruction Package:

- Artifact ID: `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`
- Package ID:
  `reconstruction-package:candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b:8E-1`
- Status: `valid`
- Included count: `3`
- Excluded count: `1`
- Approved count: `3`
- Persisted at: `2026-06-24T19:55:36.766Z`

Review and eligibility counts:

- Review decisions: `4` reviewed, `3` approved, `0` rejected, `1` deferred.
- Eligibility summary: `3` approved, `0` rejected, `1` deferred,
  `0` unreviewed, `3` included, `1` excluded.
- Limitations: `0`.

The first persist appended one artifact:

- Reconstruction artifact count before persist: `0`
- Count after first persist: `1`
- Count after retry: `1`

## ViroiDoc Result

Inputs:

- Site Version: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- Latest Review Package:
  `candidate_review_package_ecb5f777160a45e15b958948348bca08`
- Linked Candidate Discovery Result:
  `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`
- Dry Run: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`

Persisted Reconstruction Package:

- Artifact ID: `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`
- Package ID:
  `reconstruction-package:candidate_review_package_ecb5f777160a45e15b958948348bca08:8E-1`
- Status: `valid`
- Included count: `1`
- Excluded count: `4`
- Approved count: `1`
- Persisted at: `2026-06-24T19:55:38.674Z`

Review and eligibility counts:

- Review decisions: `3` reviewed, `1` approved, `1` rejected, `1` deferred.
- Eligibility summary: `1` approved, `1` rejected, `1` deferred,
  `2` unreviewed, `1` included, `4` excluded.
- Limitations: `36` deterministic propagated source limitations.

The first persist appended one artifact:

- Reconstruction artifact count before persist: `0`
- Count after first persist: `1`
- Count after retry: `1`

## Reload And Idempotency

Both targets passed reload and idempotency checks:

| Target | Latest reload | Exact by-ID reload | Retry behavior |
| --- | --- | --- | --- |
| ODV | Reloaded latest artifact `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`. | Reloaded exact artifact and exact package payload matched the built package. | Retry reused `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296`; no append. |
| ViroiDoc | Reloaded latest artifact `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`. | Reloaded exact artifact and exact package payload matched the built package. | Retry reused `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb`; no append. |

## Lineage And Metadata

Both persisted artifacts passed metadata and lineage checks:

- `kind` and `artifactKind` are `reconstruction_package`.
- `artifactVersion` is `1`.
- `reconstructionPackageId` matches the package payload.
- `candidateReviewPackageArtifactId` matches the authorizing latest Review
  Package artifact and package lineage.
- `candidateDiscoveryArtifactId` matches the linked Discovery artifact and
  package lineage.
- `siteVersionId` and `dryRunId` match the Review artifact, Discovery artifact,
  Reconstruction Package, and lineage object.
- `includedCount`, `excludedCount`, and `approvedCount` match the package
  eligibility summary.
- `contractVersion` is `8E-1`.
- Persisted validation is `valid`.
- `createdAt` and `persistedAt` are present timestamps.
- The returned artifact reference from `persistReconstructionPackage(...)` is
  metadata-only and does not include the package payload.

## Safety Result

Recursive forbidden-field scans found no forbidden fields in either persisted
artifact or package payload.

Confirmed absent:

- `structurePlan`
- `aiOutputs`
- `generatedContent`
- `generatedOutputs`
- `generatedBlocks`
- `publishingArtifacts`
- `deploymentArtifacts`
- `executionArtifacts`
- `reactOutput`
- `designTokens`
- `reconstructionPlan`

Phase 8E-7 added no Structure Planning, AI output, generated content,
publishing artifact, execution artifact, schema change, worker, API, UI, or
runtime behavior change.

## Validation Commands

Real-artifact persistence validation:

```text
set -a
source apps/platform/.env.production
set +a
cd apps/platform
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx <8E-7 validation script>
```

Result: passed. ODV and ViroiDoc persisted and reloaded exact
`reconstruction_package` artifacts, and idempotent retries reused the same
artifacts without appending.

Focused tests:

```text
cd apps/platform
NODE_OPTIONS="--conditions=react-server" pnpm exec tsx --test gnr8/architecture/reconstruction-package-contract.test.ts gnr8/architecture/reconstruction-package-builder.test.ts gnr8/architecture/reconstruction-package-persistence.test.ts
```

Result: `26 / 26` tests passed. The first sandboxed run failed before tests
with the known local `tsx` IPC `EPERM` pipe restriction; the identical command
passed outside the sandbox.

Platform build:

```text
cd apps/platform
pnpm run vercel-build
```

Result: passed. Existing unrelated lint warnings remain in frontend files for
hook dependency arrays and `<img>` usage.

Diff whitespace check:

```text
git diff --check
```

Result: passed during Phase 8E-7 validation.

## Conclusion

The real latest approved ODV and ViroiDoc Candidate Review decisions now have
durable, metadata-only `reconstruction_package` artifacts. Each artifact can be
reloaded by latest pointer and exact ID, preserves exact Review and Discovery
lineage, passes metadata and forbidden-field checks, and is idempotently reused
on retry.

## Recommended Next Phase

> **Phase 8F-0 - Structure Planning Foundation Design**, documentation and
> contract design only, with no AI, generation, execution, publishing, worker,
> API, UI, or schema changes.
