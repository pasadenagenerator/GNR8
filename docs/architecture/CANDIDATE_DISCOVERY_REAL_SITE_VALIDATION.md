# Candidate Discovery Real-Site Validation

## Scope

Phase 8C-5 validates `buildCandidateDiscoveryResult(...)` in memory against the
two real persisted `FirstLimitedDryRunOutput` artifacts created by the successful
8B real-site validations. The existing latest-output loader and read-only surface
projection were used. No `CandidateDiscoveryResult` was persisted.

This phase created no Candidate Review package, reconstruction output, generated
React or blocks, CMS binding, publishing artifact, migration, or database-schema
change. It did not change importer, Evidence Capture, worker, preview, Limited
Dry Run, Limited Dry Run persistence, Candidate Discovery persistence, Candidate
Review, reconstruction, AI, generation, or publishing behavior.

## Validation Method

For each site version, the validation:

1. loaded the latest persisted output through
   `loadLatestFirstLimitedDryRunOutput(...)`;
2. confirmed the expected latest artifact ref through
   `loadLatestFirstLimitedDryRunSurfaceProjection(...)`;
3. called `buildCandidateDiscoveryResult(...)` in memory;
4. validated the result with `validateCandidateDiscoveryResult(...)`;
5. asserted candidate family counts, total count, blocker count, limitation
   preservation, and recursive absence of every
   `CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS` key.

No persistence helper was called and no new output artifact was created.

## ODV Result

| Field | Result |
| --- | --- |
| siteVersionId | `09dce7ea-d860-4f60-a1eb-26c3335b302e` |
| loaded artifact ref | `first_limited_dry_run_output_4e86f6e01f67640ec0fd70bdf9cbf445` |
| dryRunId | `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l` |
| candidate count | `4` |
| route / navigation / section | `1 / 1 / 2` |
| limitations / blockers | `0 / 0` |
| Candidate Discovery validation | valid; no errors or warnings |
| forbidden generated fields | absent |

Candidate IDs are source-derived from the real artifact: one `/` route, one
`nav:/` navigation model, and the two persisted section-boundary IDs.

## ViroiDoc Result

| Field | Result |
| --- | --- |
| siteVersionId | `e26b0754-988b-45b9-9e24-8e213179b6cf` |
| loaded artifact ref | `first_limited_dry_run_output_f913707d4cfeda4a1d2ab8bdc4a054fc` |
| dryRunId | `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n` |
| candidate count | `5` |
| route / navigation / section | `1 / 1 / 3` |
| limitations / blockers | `18 / 0` |
| Candidate Discovery validation | valid; no errors or warnings |
| forbidden generated fields | absent |

All 18 source dry-run limitations are preserved in the result ledger. The
29-item navigation model remains one navigation candidate.

## Fixture Comparison And Deterministic Fix

The first real-artifact run exposed one deterministic difference not represented
by the 8C-4 fixtures. Persisted navigation models include compact Evidence
Capture refs such as `layout-region-*` and `section-boundary-*` alongside the
expanded `evidence:*` refs. The builder registry recognized only expanded refs,
so it initially omitted the navigation and dependent route candidates as
unresolved while still producing the section candidates.

The bounded fix teaches the existing evidence registry to classify those two
established compact ref families as layout geometry and section-boundary
evidence. A focused regression test covers the persisted shape. It changes no
candidate mapping, confidence, limitation, persistence, review, reconstruction,
generation, or publishing rule.

After that fix, both real artifacts match the 8C-4 fixture behavior for total and
family counts, limitation preservation, blocker absence, contract validity, and
forbidden-field absence. Expected source-derived IDs and confidence values differ
from representative fixture values because the real outputs contain their own
model identities and evidence confidence.

## Validation

- Candidate Discovery contract, builder, regression, and fixture tests:
  `19 / 19` passed.
- Real persisted artifact assertions: ODV passed; ViroiDoc passed.
- Candidate Discovery artifacts persisted: `0`.

## Result And Next Phase

Result: **PASS**.

Candidate Discovery is now validated against both persisted real Limited Dry Run
outputs without candidate persistence. The recommended next phase is **Phase
8C-6 - Candidate Discovery Persistence Boundary Design**, documentation and
contract assessment only. It should not implement persistence, Candidate Review,
reconstruction, AI, generation, CMS bindings, publishing, or schema changes.
