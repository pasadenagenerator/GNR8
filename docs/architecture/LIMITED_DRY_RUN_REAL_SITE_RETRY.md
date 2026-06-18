# Limited Dry Run Real-Site Retry

## Scope

Phase 8B-12L ran the existing Limited Dry Run diagnostic chain against the fresh F12 production `siteVersionId = 09dce7ea-d860-4f60-a1eb-26c3335b302e` for `https://www.odv-cvijanovic.si/?gnr8_f12=20260617`.

This phase did not change importer, Evidence Capture, worker, preview, reconstruction, candidate discovery, candidate review, AI, React/block generation, publishing, or database-schema behavior. It created no reconstruction output, React, GNR8 block, CMS binding, content model, design token model, publishing artifact, or migration.

## Preflight

| Check | Result |
| --- | --- |
| Evidence Capture baseline | exists; `artifactStatus = baseline_partial` |
| rendered DOM path | present; file exists |
| layout geometry path | present; file exists |
| layout geometry evidence | `1` |
| section boundary evidence | `2` |
| navigation evidence | `1` |
| navigation items | `6` |
| persisted ReconstructionDryRunPackage | absent |
| existing FirstLimitedDryRunOutput | absent before the run |

The existing `createReconstructionDryRunPackage(...)` contract helper produced the required package from a transient metadata-only draft Reconstruction Package. Candidate discovery and candidate review were not executed, and no candidate or review artifacts were created. The resulting package was contract-valid with `status = blocked`, `simulationStatus = unavailable`, and one package blocker because the metadata-only input was intentionally `not_ready`; this package status did not prevent the evidence-only First Limited Dry Run builder from producing the bounded diagnostic models.

## Existing Chain Result

The run used only existing pieces:

- `createReconstructionDryRunPackage(...)`
- `buildFirstLimitedDryRunOutput(...)`
- `validateFirstLimitedDryRunOutput(...)`
- `persistFirstLimitedDryRunOutput(...)`
- `loadLatestFirstLimitedDryRunOutput(...)`
- `loadLatestFirstLimitedDryRunSurfaceProjection(...)`

| Field | Result |
| --- | --- |
| dryRunId | `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l` |
| outputId | `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l:first-limited-output` |
| artifact kind | `first_limited_dry_run_output` |
| artifact ref | `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` |
| persistedAt | `2026-06-18T06:08:53.912Z` |
| outputStatus | `valid` |
| routeModelCount | `1` |
| navigationModelCount | `1` |
| sectionModelCount | `2` |
| limitationsCount | `0` |
| blockerLimitationsCount | `0` |
| output validation | valid; no errors or warnings |
| persistence diagnostic | `FIRST_LIMITED_DRY_RUN_OUTPUT_VALIDATION_PASSED` |

The persisted output was loaded back by `siteVersionId` and `dryRunId` with the same IDs, status, counts, and validation result.

## Safety

A recursive forbidden-key scan of the persisted output found no forbidden generated fields. The output contains no React, GNR8 blocks, CMS bindings, content model, design token model, publishing artifacts, or generated output containers.

The output contains only the bounded Route, Navigation, and Section model families plus evidence references and limitations metadata.

## Read-Only Surface

The latest-output projection loaded successfully from persisted site-version provenance:

- `artifactStatus = present`
- `outputStatus = valid`
- `validationStatus = valid`
- model counts `1 / 1 / 2`
- limitations/blockers `0 / 0`

The existing admin page source includes `First Limited Dry Run`, `Route Models`, `Navigation Models`, `Section Models`, and the corresponding count labels. It contains no form, button, input, textarea, or select controls.

## Classification

Result: **PASS**.

The output persisted, all three required model families exist, validation passed, the read-only projection loaded, and no forbidden generated field was present. None of failure classes A-H applies.

## Recommended Next Phase

Recommended next phase: **Phase 8B-12M - Limited Dry Run Result Re-Assessment / Package Preparation Boundary**.

Audit the successful evidence-only output and decide the smallest explicit lifecycle for a durable ReconstructionDryRunPackage before any candidate discovery or review execution is authorized. Do not add AI, reconstruction execution, React/GNR8 blocks, CMS bindings, content/design-token generation, publishing, or migrations.

## Post 8B-12M Re-Assessment

Phase 8B-12M completed the audit and package-boundary decision. The result proves the unchanged bounded chain works end to end on one simple real site, but it does not yet prove portability across sites or justify candidate discovery/review execution or durable package formalization. The transient blocked package is expected while no candidate/review execution exists.

Updated readiness scores are conceptual `92/100` and execution `88/100`. The detailed assessment and capability matrix are in `docs/architecture/LIMITED_DRY_RUN_RESULT_REASSESSMENT.md`.

Recommended next phase: **Phase 8B-12N - Second Real-Site Limited Dry Run Validation**. Validate the unchanged Route, Navigation, and Section chain on one additional simple public real site before implementing candidate discovery or formalizing the package lifecycle.
