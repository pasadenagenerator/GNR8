# Second Real-Site Limited Dry Run Validation

## Scope

Phase 8B-12N validated the unchanged Evidence Capture and First Limited Dry Run chain on a second real imported site. It changed no importer, Evidence Capture, worker, preview, dry-run builder, persistence, API, UI, reconstruction, candidate, AI, generation, publishing, or database-schema behavior.

The phase used the existing production import path and the existing bounded Route, Navigation, and Section chain only. It created no candidate discovery/review artifacts, reconstruction output, React/GNR8 blocks, CMS bindings, content/design-token models, publishing artifacts, migrations, or worker jobs.

## Candidate Selection

Selected existing production record:

| Field | Result |
| --- | --- |
| existing siteVersionId | `e9257245-0256-4291-9989-66a33ee6741e` |
| source | `https://www.viroidoc.eu/` |
| site | ViroiDoc |

ViroiDoc is a public university research-project presentation site. It is marketing/information oriented, exposes visible Home, Project, People, News, Blog, Learn, CGP, and Subscribe navigation, has no login gate, is not ecommerce-heavy, and is not application-like. It is distinct from `odv-cvijanovic.si` and provides a more content-rich second sample.

The existing record had provenance and persisted rendered DOM, but its earlier worker capture had failed and it had no layout, section, or navigation expansion evidence. The phase therefore used the already proven production import path rather than introducing an existing-record repair or backfill path.

## Production-Path Preflight

The authorized fresh verification used:

- `preallocateSiteVersionIdentity(...)`
- `importPublicSinglePageUrlToSnapshot(...)`
- `runScopedImportPipeline(...)`
- the existing rendered-capture worker client with a `30000ms` timeout
- no-op CMS slot persistence

Fresh result:

| Field | Result |
| --- | --- |
| source URL | `https://www.viroidoc.eu/?gnr8_8b_12n=20260618` |
| siteVersionId | `e26b0754-988b-45b9-9e24-8e213179b6cf` |
| siteId | `site_7ed6ad3668e5c99caea3` |
| import mode | `pipeline` |
| renderedCaptureStatus | `available` |
| sourceMode | `rendered_dom` |
| Evidence Capture baseline | exists; `baseline_partial` |
| rendered DOM path/file | present |
| layout geometry path/file | present |

## Evidence Verification

| Evidence | Count |
| --- | ---: |
| rendered DOM | `1` |
| layout geometry evidence | `1` |
| layout regions | `4` |
| section boundary evidence | `3` |
| navigation evidence | `1` |
| navigation items | `29` |

The scoped pipeline persisted `EVIDENCE_CAPTURE_BASELINE_INPUTS_READY` and `EVIDENCE_CAPTURE_BASELINE_EXPANSION_MATERIALIZED`, reporting rendered HTML and layout geometry inputs present and materialized counts `1 / 3 / 1` for layout, section, and navigation evidence.

## Existing Chain Result

The phase used only:

- transient metadata-only `ReconstructionPackage`
- `createReconstructionDryRunPackage(...)`
- `buildFirstLimitedDryRunOutput(...)`
- `validateFirstLimitedDryRunOutput(...)`
- `persistFirstLimitedDryRunOutput(...)`
- `loadLatestFirstLimitedDryRunOutput(...)`
- `loadLatestFirstLimitedDryRunSurfaceProjection(...)`

Candidate discovery and candidate review were not executed. As in 8B-12L, the metadata-only package produced a contract-valid blocked `ReconstructionDryRunPackage` with `simulationStatus = unavailable` and one package-level blocker. That package state did not prevent the evidence-only builder from producing the bounded diagnostic models.

Authoritative latest output:

| Field | Result |
| --- | --- |
| dryRunId | `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n` |
| outputId | `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n:first-limited-output` |
| artifact kind | `first_limited_dry_run_output` |
| artifact ref | `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc` |
| persistedAt | `2026-06-18T06:49:18.828Z` |
| outputStatus | `valid` |
| Route Models | `1` |
| Navigation Models | `1` |
| Section Models | `3` |
| limitations | `18` |
| blocker limitations | `0` |
| validation | valid; no errors or warnings |
| semantic readback | exact match |

The `18` limitations are non-blocking evidence/model limitations produced by the existing builder for the richer page. They are a portability result, not a claim that ViroiDoc is reconstruction-ready.

During runner verification, an initial invocation supplied the same persisted expansion evidence both through the baseline and as explicit arrays. That produced duplicate section inputs and was immediately superseded by the authoritative latest artifact above, built with the persisted baseline exactly once. No implementation changed.

## Read-Only Surface

The persisted latest-output projection loaded successfully:

- `artifactStatus = present`
- `outputStatus = valid`
- `validationStatus = valid`
- route label `/` visible
- navigation labels Home, Project, People, News, Blog, Learn, CGP, and Subscribe visible
- three persisted section IDs visible
- First Limited Dry Run, Route Models, Navigation Models, and Section Models labels present
- no form, button, input, textarea, or select controls present

## Classification

Result: **PASS**.

Evidence exists, the corrected authoritative dry-run output persists, the existing validator accepts it with no errors or warnings, semantic readback matches, and the read-only projection loads all required model families and labels. This proves the current bounded chain succeeds on a second real site without new implementation.

The result does not authorize candidate discovery, candidate review, reconstruction, AI, React/block generation, CMS binding, mutation, publishing, or package lifecycle expansion.

## Recommended Next Phase

Recommended next phase: **Phase 8B-12O - Cross-Site Evidence and Model Quality Re-Assessment**.

Audit the two passing real-site results, especially the second site's non-blocking limitations and broad navigation label extraction, before deciding whether Candidate Discovery design is justified. Keep 8B-12O documentation/read-only only; do not implement Candidate Discovery, AI, reconstruction, generation, publishing, migrations, or new capture behavior.
