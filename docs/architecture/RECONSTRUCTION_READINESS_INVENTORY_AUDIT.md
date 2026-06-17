# Reconstruction Readiness Inventory Audit

## Scope

Phase 8B-12F audited production imported runtime site versions to explain why no site version qualifies for the verified Limited Dry Run chain.

This phase was audit and diagnostics only. It did not modify importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API behavior, UI behavior, dry-run behavior, simulation behavior, reconstruction behavior, AI behavior, worker behavior, publishing behavior, or database schema.

No Evidence Capture artifacts, DryRun packages, FirstLimitedDryRun outputs, migrations, repair jobs, or backfills were created.

## Method

Target environment: production database configured by `apps/platform/.env.production`.

Read-only source of truth:

- `public.gnr8_runtime_site_versions`
- `public.gnr8_runtime_sites`
- `public.gnr8_runtime_page_versions`
- `gnr8_runtime_site_versions.import_provenance_summary`

Imported site versions are runtime site versions with non-null `import_provenance_summary`, matching the prior 8B-12 production preflight definition.

The Limited Dry Run trigger requires, at minimum:

- a latest Evidence Capture baseline from `import_provenance_summary.evidenceCaptureBaselineArtifact`
- a valid matching `ReconstructionDryRunPackage` under one of the accepted provenance keys
- no existing completed output is required to be ready, but an existing valid `first_limited_dry_run_output` moves the version to completed

Accepted dry-run package locations checked:

- `latestReconstructionDryRunPackage`
- `reconstructionDryRunPackage`
- `dryRunPackage`
- `reconstructionDryRunPackages[]`
- `dryRunPackages[]`

## Summary

Production has `14` imported runtime site versions. All `14` classify as `NO_EVIDENCE_CAPTURE`.

There are zero `DRY_RUN_READY` site versions because every imported site version is missing the canonical `evidenceCaptureBaselineArtifact`; every version also lacks capture expansion evidence, reconstruction packages, reconstruction dry-run packages, and first limited dry-run outputs.

Dominant blocker: rendered Evidence Capture did not produce the canonical baseline artifact in production. All imported versions are `sourceMode = raw_html_fallback`, `renderedCaptureStatus = failed`, `renderedDomQuality = unusable`, `screenshotCount = 0`, and `computedStyleSampleCount = 0`.

## Bucket Counts

| Bucket | Count |
| --- | ---: |
| `NO_EVIDENCE_CAPTURE` | 14 |
| `BASELINE_ONLY` | 0 |
| `CAPTURE_EXPANDED` | 0 |
| `RECONSTRUCTION_READY` | 0 |
| `DRY_RUN_READY` | 0 |
| `DRY_RUN_COMPLETED` | 0 |
| `UNKNOWN_STATE` | 0 |

## Production Capture Aggregates

| Signal | Count |
| --- | ---: |
| `sourceMode = raw_html_fallback` | 14 |
| `renderedCaptureStatus = failed` | 14 |
| `renderedDomQuality = unusable` | 14 |
| `screenshotCount = 0` | 14 |
| `computedStyleSampleCount = 0` | 14 |
| missing `evidenceCaptureBaselineArtifact` | 14 |
| `importFidelityStatus = capture_failed` | 5 |
| `importFidelityStatus = degraded_import` | 9 |
| `workerHealth.status = null` | 5 |
| `workerHealth.status = unreachable` | 5 |
| `workerHealth.status = misconfigured` | 4 |
| `captureJob.status = null` | 5 |
| `captureJob.status = failed_transient` | 5 |
| `captureJob.status = failed_terminal` | 4 |

## Inventory

| siteVersionId | siteId | sourceUrl | import status | state | createdAt | bucket |
| --- | --- | --- | --- | --- | --- | --- |
| `85e62c56-8aed-4615-bc28-39b105ccee89` | `site_95e41a49819792f58140` | `https://beauty-clinic.pasadenagenerator.com` | `capture_failed` | `PUBLISHED` | `2026-04-24T12:58:59.731Z` | `NO_EVIDENCE_CAPTURE` |
| `8f94365e-b22e-4f8f-b414-b0672373e682` | `site_7347e040f0a576450d25` | `https://holistic-energy.pasadenagenerator.com` | `capture_failed` | `PUBLISHED` | `2026-04-27T17:19:12.511Z` | `NO_EVIDENCE_CAPTURE` |
| `3f645a48-5788-4a1e-9e13-dae01c6d998a` | `site_f5dff1885c174b8aa681` | `https://luxury-hotel.pasadenagenerator.com` | `capture_failed` | `PUBLISHED` | `2026-05-03T08:08:52.811Z` | `NO_EVIDENCE_CAPTURE` |
| `a5136ce8-86b7-4fcf-bd90-c9f2a234426b` | `site_ca82bb9d085adae3f867` | `https://synapso.pasadenagenerator.com` | `capture_failed` | `DRAFT` | `2026-05-03T17:34:29.442Z` | `NO_EVIDENCE_CAPTURE` |
| `fda429c0-bcf7-4676-9f15-59f264c3c672` | `site_fafe8f2f6054e9602ad1` | `https://zakat-charity.pasadenagenerator.com` | `capture_failed` | `PUBLISHED` | `2026-05-04T07:14:33.008Z` | `NO_EVIDENCE_CAPTURE` |
| `30bfe5b1-a441-41ef-92e3-0d6b3ee678e1` | `site_aa6b25cd33e9c1384d35` | `https://www.roboplast.si/` | `degraded_import` | `DRAFT` | `2026-05-08T11:53:54.107Z` | `NO_EVIDENCE_CAPTURE` |
| `9dee6052-a5b7-4fd8-833c-bbfd39885fa2` | `site_5042c52e5b7620d42f60` | `http://www.pohistvo-feltrin.si/` | `degraded_import` | `DRAFT` | `2026-05-12T13:11:29.253Z` | `NO_EVIDENCE_CAPTURE` |
| `01ebd946-4085-4f01-8fbf-416ac6cf601e` | `site_7c77126de646f746b3bd` | `http://www.transportimaver.si/` | `degraded_import` | `DRAFT` | `2026-05-13T06:07:15.328Z` | `NO_EVIDENCE_CAPTURE` |
| `88253466-783e-4484-8b68-df6c83b8a11c` | `site_7c77126de646f746b3bd` | `http://www.transportimaver.si/` | `degraded_import` | `PUBLISHED` | `2026-05-13T06:44:07.891Z` | `NO_EVIDENCE_CAPTURE` |
| `d27c2b7e-ad64-4aba-a362-0f3a72806096` | `site_phase7b_viroidoc_db02fb3b28ff4a78` | `https://phase7b-viroidoc-smoke.invalid/` | `degraded_import` | `DRAFT` | `2026-06-06T14:31:28.410Z` | `NO_EVIDENCE_CAPTURE` |
| `5567c99d-66e5-45e4-8b1b-015f8fc02e9d` | `site_6bd238e84a0bf6cde0d3` | `https://info.cern.ch/` | `degraded_import` | `DRAFT` | `2026-06-06T15:55:59.270Z` | `NO_EVIDENCE_CAPTURE` |
| `ef97e773-3488-45c7-9c16-a5990cb02cd9` | `site_4afdbf327671326c44c7` | `https://www.paulgraham.com/articles.html` | `degraded_import` | `DRAFT` | `2026-06-06T15:56:38.277Z` | `NO_EVIDENCE_CAPTURE` |
| `90b3abf8-7a4c-41b5-af05-244642d1962d` | `site_aaa6d44109a38b5d083f` | `https://www.odv-cvijanovic.si/` | `degraded_import` | `DRAFT` | `2026-06-11T09:02:52.633Z` | `NO_EVIDENCE_CAPTURE` |
| `e9257245-0256-4291-9989-66a33ee6741e` | `site_d912623a50e4c26a5690` | `https://www.viroidoc.eu/` | `degraded_import` | `DRAFT` | `2026-06-11T09:19:53.272Z` | `NO_EVIDENCE_CAPTURE` |

## Readiness Matrix

For every imported site version:

| Readiness signal | Count available |
| --- | ---: |
| Evidence Capture baseline artifact | 0 |
| baseline artifact ref | 0 |
| capture status on baseline artifact | 0 |
| coverage status on baseline artifact | 0 |
| layout geometry evidence | 0 |
| section boundary evidence | 0 |
| navigation evidence | 0 |
| runtime mutation evidence | 0 |
| `ReconstructionInput` | 0 |
| `ReconstructionPlanningPackage` | 0 |
| `ReconstructionCandidateDiscovery` package | 0 |
| `ReconstructionReview` package | 0 |
| `ReconstructionPackage` | 0 |
| `ReconstructionDryRunPackage` | 0 |
| `FirstLimitedDryRunOutput` | 0 |

## Representative Examples

### Selected 8B-12 target

`90b3abf8-7a4c-41b5-af05-244642d1962d` (`https://www.odv-cvijanovic.si/`) remains blocked at the first gate:

- bucket: `NO_EVIDENCE_CAPTURE`
- `importFidelityStatus`: `degraded_import`
- `renderedCaptureStatus`: `failed`
- `workerHealth.status`: `unreachable`
- `captureJob.status`: `failed_transient`
- `sourceMode`: `raw_html_fallback`
- baseline artifact: missing
- capture expansion evidence: missing
- reconstruction packages: missing
- dry-run package: missing
- first limited output: missing

### Published transportimaver version

`88253466-783e-4484-8b68-df6c83b8a11c` (`http://www.transportimaver.si/`) shows the terminal worker failure shape:

- bucket: `NO_EVIDENCE_CAPTURE`
- `importFidelityStatus`: `degraded_import`
- `renderedCaptureStatus`: `failed`
- `workerHealth.status`: `misconfigured`
- `captureJob.status`: `failed_terminal`
- baseline artifact: missing
- dry-run package: missing

### Older published generated-host imports

The April and early May generated-host versions, such as `85e62c56-8aed-4615-bc28-39b105ccee89`, show no current worker/capture job status in provenance:

- bucket: `NO_EVIDENCE_CAPTURE`
- `importFidelityStatus`: `capture_failed`
- `renderedCaptureStatus`: `failed`
- `workerHealth.status`: missing
- `captureJob.status`: missing
- baseline artifact: missing
- dry-run package: missing

## Root-Cause Findings

There are zero `DRY_RUN_READY` site versions because none of the 14 imported site versions have the first required input: `evidenceCaptureBaselineArtifact`.

The missing dry-run package is real, but secondary. Since no site version has the baseline artifact or capture expansion evidence, candidate discovery/review/package creation would still not make a production site version eligible for the current Limited Dry Run chain.

The dominant failure mode is production rendered Evidence Capture failure before canonical baseline persistence:

- all 14 imported versions have `renderedCaptureStatus = failed`
- all 14 imported versions have `renderedDomQuality = unusable`
- all 14 imported versions have `sourceMode = raw_html_fallback`
- all 14 imported versions have zero screenshots and zero computed style samples
- 9 versions have recorded degraded imports
- 5 versions have recorded capture failures
- 5 versions show worker unreachable
- 4 versions show worker misconfigured
- 5 older versions have no worker health/capture job status recorded in provenance

This means the dataset is not stuck at the reconstruction or dry-run layer. It is stuck before the Evidence Capture baseline layer.

## Top Blockers Ranked

1. Missing canonical Evidence Capture baseline for every imported production site version.
2. Rendered capture failed for every imported production site version, leaving raw HTML fallback only.
3. Production worker health is unavailable, unreachable, or misconfigured across the dataset.
4. Capture expansion evidence is absent because it is nested under the missing baseline artifact.
5. Reconstruction control-plane packages are absent for every imported production site version.
6. Reconstruction dry-run packages are absent for every imported production site version.
7. First limited dry-run outputs are absent because no version reaches trigger eligibility.

## Recommended Next Phase

Phase 8B-12G - Production Evidence Capture Worker Readiness Root-Cause Audit.

Rationale: the audit shows the blocking layer is production rendered Evidence Capture and baseline persistence, not Limited Dry Run builder behavior, reconstruction package validation, or the read-only admin surface. The next phase should inspect production worker configuration, capture job dispatch/reachability, and baseline persistence preconditions before any repair, backfill, re-import, dry-run package creation, or trigger execution is authorized.

The next phase should remain diagnostic unless explicitly expanded.
