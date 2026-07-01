# Business Discovery Real-Target Validation

## Phase And Boundary

Phase MVP-1A-R validates the MVP-1A Business Discovery contract, builder, and
persistence helpers against existing imported website evidence for ODV and
ViroiDoc.

This phase is validation plus documentation. It does not add Digital Business
Twin runtime, Business Understanding Report, Business Alignment, Website Design
Brief, Website Generation Package, provider adapters, external AI, generation,
compliance, Business Approval, publishing changes, UI, API, schema, or workers.

## Method

For each target, the validation loaded the existing runtime site version,
existing Evidence Capture baseline artifact, and latest linked Candidate
Discovery context. It then built a `BusinessDiscoveryArtifact` with
`buildBusinessDiscoveryFromSiteEvidence(...)`, persisted it with
`persistBusinessDiscoveryArtifact(...)`, reloaded latest with
`loadLatestBusinessDiscoveryArtifact(...)`, reloaded the exact persisted record
with `loadBusinessDiscoveryArtifactById(...)`, and retried persistence to
verify semantic idempotency.

## Target Results

| Target | siteVersionId | dryRunId | status | artifactId | findings | limitations | confidence |
| --- | --- | --- | --- | --- | ---: | ---: | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l` | `partial` | `business_discovery_7b37413651d79de0d109e31690a34b62` | 12 | 104 | `MEDIUM` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n` | `partial` | `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | 17 | 105 | `MEDIUM` |

Both artifacts validated with no contract errors or warnings and persisted
under artifact kind `business_discovery`.

## Evidence Loaded

| Target | Evidence baseline | Section evidence | Navigation evidence | Navigation items | Layout geometry evidence | Candidate Discovery |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| ODV | present at `/` | 2 | 1 | 6 | 1 | `candidate_discovery_result_dbf786254717f980469b9b99853c14b8` |
| ViroiDoc | present at `/` | 3 | 1 | 29 | 1 | `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64` |

ODV Candidate Discovery carried 4 candidates, 0 limitations, and 0 blockers.
ViroiDoc Candidate Discovery carried 5 candidates, 18 limitations, and 0
blockers.

## Domain Summary

ODV implemented domains:

- `business_identity`: observed, 2 findings, `MEDIUM`
- `brand`: observed, 1 finding, `LOW`
- `digital_presence`: observed, 3 findings, `HIGH`
- `goals`: observed, 2 findings, `MEDIUM`
- `trust`: observed, 1 finding, `LOW`
- `content`: observed, 1 finding, `MEDIUM`
- `constraints`: partial, 2 findings, `HIGH`

ODV had no deterministic website-derived findings for `offerings` or
`audience`; both remained partial with `DOMAIN_SIGNAL_MISSING` limitations.

ViroiDoc implemented domains:

- `business_identity`: observed, 2 findings, `MEDIUM`
- `offerings`: observed, 1 finding, `LOW`
- `brand`: observed, 1 finding, `LOW`
- `digital_presence`: observed, 3 findings, `HIGH`
- `goals`: observed, 3 findings, `MEDIUM`
- `trust`: observed, 4 findings, `LOW`
- `content`: observed, 1 finding, `MEDIUM`
- `constraints`: partial, 2 findings, `HIGH`

ViroiDoc had no deterministic website-derived finding for `audience`; it
remained partial with a `DOMAIN_SIGNAL_MISSING` limitation.

## Finding Kinds

ODV produced:

- `asset_signal_observed`
- `candidate_discovery_context_observed`
- `company_identity_observed`
- `contact_path_observed`
- `content_theme_observed`
- `evidence_constraint_observed`
- `goal_candidate_observed`
- `primary_navigation_observed`
- `route_inventory_observed`
- `source_site_observed`
- `trust_signal_observed`

ViroiDoc produced the same finding kinds plus
`offering_candidate_observed`.

## Reload And Idempotency

| Target | latest reload | by-ID reload | retry result | history count |
| --- | --- | --- | --- | ---: |
| ODV | matched `business_discovery_7b37413651d79de0d109e31690a34b62` | matched latest | reused same artifact ID | 1 |
| ViroiDoc | matched `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | matched latest | reused same artifact ID | 1 |

For both targets, latest reload equality and by-ID reload equality passed.
Retry persistence reused the same artifact ID because the rebuilt artifact was
semantically equivalent.

## Lineage

ODV lineage:

- `siteVersionId`: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- `dryRunId`: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`
- `sourceSiteId`: `site_135623aa7648136dba36`
- `sourceUrl`: `https://www.odv-cvijanovic.si/?gnr8_f12=20260617`
- evidence refs: 4
- upstream Candidate Discovery ref:
  `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`

ViroiDoc lineage:

- `siteVersionId`: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- `dryRunId`: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`
- `sourceSiteId`: `site_7ed6ad3668e5c99caea3`
- `sourceUrl`: `https://www.viroidoc.eu/?gnr8_8b_12n=20260618`
- evidence refs: 4
- upstream Candidate Discovery ref:
  `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`

## Limitations And Diagnostics

Both artifacts are `partial`, not `blocked`. Neither artifact has blockers.

Observed limitation codes:

- `DOMAIN_SIGNAL_MISSING`
- `IMPORT_DIAGNOSTIC_OBSERVED`
- `UPSTREAM_EVIDENCE_LIMITATION`

Observed diagnostics:

- `BUSINESS_DISCOVERY_BUILDER_VERSION:MVP-1A`
- `BUSINESS_DISCOVERY_FINDING_COUNT:<count>`
- `BUSINESS_DISCOVERY_LIMITATION_COUNT:<count>`
- `BUSINESS_DISCOVERY_STATUS:partial`
- `BUSINESS_DISCOVERY_ARTIFACT_VALID`

Persistence diagnostics:

- `BUSINESS_DISCOVERY_ARTIFACT_VALIDATION_PASSED`

## Safety Result

Recursive Business Discovery artifact and persisted provenance scans found no
forbidden downstream Business Discovery fields.

No downstream artifacts were created:

- no Digital Business Twin
- no Business Understanding Report
- no Business Alignment
- no Website Design Brief
- no Website Generation Package
- no provider payload
- no prompt
- no AI output
- no generated content
- no publishing artifact

The only persisted change was the Business Discovery artifact history/latest
entry inside each target's existing site-version `importProvenanceSummary`.

## Validation Result

The real-target validation passed for both ODV and ViroiDoc. GNR8 has proven
that real imported website evidence can produce persisted Business Discovery
artifacts for both targets through the MVP-1A contract, builder, and
persistence helpers.

Command validation:

- Focused Business Discovery tests passed `15 / 15`:
  `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/business-discovery-contract.test.ts apps/platform/gnr8/architecture/business-discovery-builder.test.ts apps/platform/gnr8/architecture/business-discovery-persistence.test.ts`
- `cd apps/platform && pnpm run vercel-build` passed. The build emitted
  existing unrelated frontend lint warnings for hook dependency and `<img>`
  usage.
- `git diff --check` passed.
- Direct trailing-whitespace/CR scan of this new document passed.

## Recommended Next Phase

Recommended next phase:

```text
MVP-1B Digital Business Twin Runtime Builder
```

MVP-1B should consume the persisted Business Discovery artifacts as DBT input
and stop before Business Understanding Report, Business Alignment, Website
Design Brief, Website Generation Package, provider adapters, external AI,
generation, compliance, Business Approval, or publishing.
