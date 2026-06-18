# Candidate Discovery End-to-End Admin Verification

## Phase 8C-10R Admin Verification Rerun

**COMPLETE / PASS - PERSISTED ADMIN CHAIN VERIFIED**

On 2026-06-18, Phase 8C-10R reran the read-only production verification after
the two real `candidate_discovery_result` artifacts were persisted. The
canonical latest-result loader and
`loadLatestCandidateDiscoverySurfaceProjection(...)` loaded the expected
artifact for each site version. No builder, persistence, mutation, trigger,
worker, review, AI, reconstruction, generation, publishing, schema, form,
button, or other control was invoked or changed.

| Target | Loaded latest artifact | Projection validation / state | Candidates by route / navigation / section | Confidence LOW / MEDIUM / HIGH | Limitations / blockers |
| --- | --- | --- | --- | --- | --- |
| ODV `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` | `valid` / `ready` | `4` total: `1 / 1 / 2` | `0 / 2 / 2` | `0 / 0` |
| ViroiDoc `e26b0754-988b-45b9-9e24-8e213179b6cf` | `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` | `valid` / `candidates_with_limitations` | `5` total: `1 / 1 / 3` | `0 / 3 / 2` | `18 / 0` |

Both artifact IDs exactly match the requested persisted artifacts. Current
contract validation and projection validation return no errors or warnings.
Both projections contain one route candidate and one navigation candidate;
ODV contains two section candidates under `/`, and ViroiDoc contains three
section candidates under `/`. Neither projection contains unscoped sections.
All 18 ViroiDoc result limitations have `warning` severity, and neither target
contains a blocker.

Page-source inspection confirms the required `Candidate Discovery`, `Route
Candidates`, `Navigation Candidates`, and `Section Candidates By Route`
labels. It finds no `<button`, `<form`, `<input`, `<textarea`, or `<select`
tags and no review, approve, reject, artificial-intelligence, reconstruction,
or publish action text. No read-only projection or display defect was found,
so no application code or behavior changed.

Validation completed successfully:

- focused Candidate Discovery contract, builder, fixture, persistence,
  projection, and page-source tests: **PASS, 36 / 36**;
- `cd apps/platform && pnpm run vercel-build`: **PASS**, including the dynamic
  Candidate Discovery route, with existing unrelated lint warnings only; and
- `git diff --check`: **PASS**.

Phase 8C-10R closes with a full PASS for both real persisted targets. The
recommended next phase is **Phase 8C-11 - Candidate Discovery Next-Boundary
Reassessment**, documentation/read-only only. It should assess the next safe
boundary without adding Candidate Review, AI, reconstruction, generation,
publishing, triggers, schema, workers, forms, buttons, or other controls.

## Phase 8C-10F Persistence Completion

**COMPLETE / PASS - REAL-TARGET PERSISTENCE READY**

On 2026-06-18, Phase 8C-10F loaded each target's existing persisted
`FirstLimitedDryRunOutput`, ran the existing deterministic
`buildCandidateDiscoveryResult(...)`, validated the result, persisted it with
`persistCandidateDiscoveryResult(...)`, and reloaded it with
`loadLatestCandidateDiscoveryResult(...)` scoped to the same dry-run lineage.
No wrapper, application code, schema, importer, Evidence Capture, Limited Dry
Run, UI, Candidate Review, reconstruction, AI, generation, publishing, or
worker change was made.

| Target | Source artifact | Persisted Candidate Discovery artifact | Reloaded candidates | Reloaded limitations / blockers |
| --- | --- | --- | --- | --- |
| ODV | `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` | `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` | `4` (`1 / 1 / 2` route/navigation/section) | `0 / 0` |
| ViroiDoc | `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc` | `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` | `5` (`1 / 1 / 3` route/navigation/section) | `18 / 0` |

Both reloaded records are valid with no validation errors or warnings, use
builder version `8C-3` and contract version `8C-1`, and match the artifact refs
returned by persistence. Each target advanced from zero to one persisted
`candidate_discovery_result` artifact. Recursive forbidden-result inspection
found no generated, reconstruction, or publishing fields. A canonical
before/after comparison with the Candidate Discovery history and latest pointer
removed confirmed that all other provenance, including Candidate Review and
existing reconstruction lineage, remained unchanged.

Phase 8C-10 was not rerun. The two persisted artifacts are now ready for that
separately authorized read-only admin verification rerun.

## Prior Phase 8C-10 Verification

## Phase Boundary

Phase 8C-10 verifies the existing Candidate Discovery admin chain only:

```text
persisted candidate_discovery_result
  -> latest loader
  -> CandidateDiscoverySurfaceProjection
  -> dedicated read-only admin page
```

The phase did not execute Candidate Discovery, persist artifacts, add review or
approval behavior, reconstruct, call AI, publish, add schema, run workers, or
add controls.

## Phase 8C-10 Classification

**COMPLETE / FAIL - REAL-TARGET PERSISTENCE PRECONDITION MISSING**

The projection and page implementation pass focused verification, but the full
real-target chain cannot pass because neither requested site version contains a
persisted `candidate_discovery_result` artifact.

## Verification Method

On 2026-06-18, a read-only script used the configured platform production
database and the canonical helpers:

- `getSiteVersion(...)` to confirm each runtime site version exists;
- `loadLatestCandidateDiscoveryResult(...)` for persisted artifact readback;
- `loadLatestCandidateDiscoverySurfaceProjection(...)` for the admin read
  model;
- `validateCandidateDiscoveryResult(...)` when an artifact is available; and
- direct page-source inspection of
  `/gnr8/admin/candidate-discovery/[siteVersionId]`.

No write helper, API mutation, worker, builder execution, or persistence call
was invoked.

## ODV Result

| Field | Result |
| --- | --- |
| siteVersionId | `09dce7ea-d860-4f60-a1eb-26c3335b302e` |
| Expected candidates | `4` |
| Runtime site version | present |
| Provenance kind | `runtime_import_provenance_summary_v1` |
| Persisted Candidate Discovery artifacts | `0` |
| Latest Candidate Discovery pointer | absent |
| Latest loader | `null` |
| Projection validation | `unavailable` |
| Projection state | `missing` |
| Projection diagnostic | `CANDIDATE_DISCOVERY_RESULT_MISSING` |
| Projected route/navigation/section counts | `0 / 0 / 0` |
| Projected limitations/blockers | `0 / 0` because no result is available |
| Classification | **FAIL** |

The expected `4` candidates cannot be verified from persistence. Phase 8C-5
proved the deterministic in-memory result, but that is not a substitute for
the persisted readback required by this phase.

## ViroiDoc Result

| Field | Result |
| --- | --- |
| siteVersionId | `e26b0754-988b-45b9-9e24-8e213179b6cf` |
| Expected candidates | `5` |
| Runtime site version | present |
| Provenance kind | `runtime_import_provenance_summary_v1` |
| Persisted Candidate Discovery artifacts | `0` |
| Latest Candidate Discovery pointer | absent |
| Latest loader | `null` |
| Projection validation | `unavailable` |
| Projection state | `missing` |
| Projection diagnostic | `CANDIDATE_DISCOVERY_RESULT_MISSING` |
| Projected route/navigation/section counts | `0 / 0 / 0` |
| Projected limitations/blockers | `0 / 0` because no result is available |
| Classification | **FAIL** |

The expected `5` candidates and the expected `18 / 0` limitations/blockers
cannot be verified from persistence. The earlier in-memory real-site result
does not satisfy this phase's persisted-chain requirement.

## Projection And Page Result

The focused suite verifies latest-artifact selection, defensive validation,
count computation, route/navigation/section grouping, builder-relative order,
and missing, invalid, blocked, no-candidate, limitation, and blocker states.

The real-target loader correctly fails closed. Both missing artifacts produce a
safe `missing` projection rather than throwing, inventing candidates, or
falling back to an in-memory build.

Page source contains all required labels:

- `Candidate Discovery`
- `Route Candidates`
- `Navigation Candidates`
- `Section Candidates By Route`

The production build includes the dynamic route
`/gnr8/admin/candidate-discovery/[siteVersionId]`.

## Forbidden Controls Check

Page-source inspection found none of the following tags:

- `<button`
- `<form`
- `<input`
- `<textarea`
- `<select`

It also found no review, approve, reject, AI, reconstruction, or publish action
text. No display defect was found, so no application code changed.

## Validation

- Focused Candidate Discovery contract, builder, persistence, projection, and
  page-source tests: **PASS, 31 / 31**.
- `cd apps/platform && pnpm run vercel-build`: **PASS**. The build retained
  existing unrelated lint warnings and emitted the Candidate Discovery route.
- `git diff --check`: **PASS**.

## Conclusion And Next Phase

Phase 8C-10 stops with a real-target FAIL at the first required link. The
loader, projection, and page behave safely, but no persisted input exists for
either target.

The recommended next phase is **Phase 8C-10F - Candidate Discovery Real-Target
Persistence Completion**, explicitly authorizing only the deterministic build
and persistence of validated Candidate Discovery results for these two proven
site versions through the existing builder and persistence helper, followed by
a rerun of Phase 8C-10. It should add no trigger, UI control, review, AI,
reconstruction, publishing, schema, worker, form, or button.
