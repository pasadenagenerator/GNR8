# Digital Business Twin Real-Target Validation

## Phase And Boundary

Phase MVP-1B-R validates the MVP-1B Digital Business Twin runtime against the
real ODV and ViroiDoc Business Discovery artifacts.

This phase is validation only. It does not add or modify runtime behavior,
schema, API routes, UI, workers, provider adapters, external AI, generation,
Business Understanding Report runtime, Business Alignment, Website Design
Brief, Website Generation Package, compliance, Business Approval, or
publishing.

## Objective

MVP-1B-R proves that persisted Business Discovery can become a persisted
Digital Business Twin suitable for downstream Business Understanding Report
generation.

The validation used:

```text
buildDigitalBusinessTwinFromBusinessDiscovery(...)
persistDigitalBusinessTwinArtifact(...)
loadLatestDigitalBusinessTwinArtifact(...)
loadDigitalBusinessTwinArtifactById(...)
```

## Source Targets

| Target | Site Version | Source Business Discovery | Source Status | Source Findings | Source Limitations | Source Blockers |
| --- | --- | --- | --- | ---: | ---: | ---: |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `business_discovery_7b37413651d79de0d109e31690a34b62` | `partial` | 12 | 104 | 0 |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | `partial` | 17 | 105 | 0 |

Both source artifacts existed, passed Business Discovery validation, preserved
lineage, and had acceptable current statuses for DBT creation.

## Persisted DBT Artifacts

| Target | DBT Artifact | DBT ID | Status | Knowledge Items | Missing Knowledge | Confidence |
| --- | --- | --- | --- | ---: | ---: | --- |
| ODV | `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` | `digital-business-twin:09dce7ea-d860-4f60-a1eb-26c3335b302e:09dce7ea-d860-4f60-a1eb-26c3335b302e-8b-12l:business_discovery_7b37413651d79de0d109e31690a34b62` | `partial` | 12 | 2 | `LOW` |
| ViroiDoc | `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` | `digital-business-twin:e26b0754-988b-45b9-9e24-8e213179b6cf:e26b0754-988b-45b9-9e24-8e213179b6cf-8b-12n:business_discovery_360fa099cbcede288c2d0e04f2ec7986` | `partial` | 17 | 1 | `LOW` |

Confidence is low for both targets because MVP-1B is website-only and each DBT
still has missing business knowledge.

## Implemented Domains

Both targets implement the MVP-1B DBT domains:

- `business_identity`
- `offerings`
- `audience`
- `brand`
- `digital_presence`
- `goals`
- `trust`
- `content`
- `constraints`

## Knowledge Validation

Business Discovery findings were converted into DBT knowledge items without
inventing unsupported knowledge.

ODV knowledge by domain:

| Domain | Knowledge Items | Missing Knowledge |
| --- | ---: | ---: |
| `business_identity` | 2 | 0 |
| `offerings` | 0 | 1 |
| `audience` | 0 | 1 |
| `brand` | 1 | 0 |
| `digital_presence` | 3 | 0 |
| `goals` | 2 | 0 |
| `trust` | 1 | 0 |
| `content` | 1 | 0 |
| `constraints` | 2 | 0 |

ViroiDoc knowledge by domain:

| Domain | Knowledge Items | Missing Knowledge |
| --- | ---: | ---: |
| `business_identity` | 2 | 0 |
| `offerings` | 1 | 0 |
| `audience` | 0 | 1 |
| `brand` | 1 | 0 |
| `digital_presence` | 3 | 0 |
| `goals` | 3 | 0 |
| `trust` | 4 | 0 |
| `content` | 1 | 0 |
| `constraints` | 2 | 0 |

Missing Business Discovery domains became `missingKnowledge`:

- ODV: `offerings`, `audience`
- ViroiDoc: `audience`

The validation checked that every DBT knowledge item referenced an existing
source Business Discovery finding ID. Invented knowledge count was `0` for
both targets.

## Lineage

ODV lineage:

- site version: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- dry run: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`
- source Business Discovery:
  `business_discovery_7b37413651d79de0d109e31690a34b62`
- source status: `partial`
- source contract: `MVP-1A`
- upstream Candidate Discovery:
  `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`

ViroiDoc lineage:

- site version: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- dry run: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`
- source Business Discovery:
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`
- source status: `partial`
- source contract: `MVP-1A`
- upstream Candidate Discovery:
  `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`

## Reload And Idempotency

| Target | Latest Reload Equality | By-ID Reload Equality | Idempotent Retry |
| --- | --- | --- | --- |
| ODV | pass | pass | reused `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` |
| ViroiDoc | pass | pass | reused `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` |

The idempotent retry rebuilt each DBT from the same latest Business Discovery
artifact and reused the identical persisted DBT artifact record.

## Blocked Behavior

The validation also built DBT artifacts from a blocked Business Discovery
fixture produced by `buildBusinessDiscoveryFromSiteEvidence(...)` with no
evidence input.

Result:

- DBT status: `blocked`
- usable knowledge items: `0`
- missing knowledge records: `9`
- DBT contract validation: pass

This confirms that blocked Business Discovery produces a blocked fail-closed
Digital Business Twin with no usable knowledge items.

## Safety Validation

Recursive DBT artifact scans found no forbidden downstream or execution
fields:

- no Business Understanding Report
- no Business Alignment
- no Website Design Brief
- no Website Generation Package
- no provider payload
- no prompt
- no AI output
- no generated HTML
- no generated React
- no generated components
- no generated blocks
- no publishing artifact
- no deployment artifact
- no execution artifact

## Real-Target Assessment

### ODV

Current business understanding quality: partial and suitable for a first
Business Understanding Report, with explicit missing knowledge.

Usable domains:

- `business_identity`
- `brand`
- `digital_presence`
- `goals`
- `trust`
- `content`
- `constraints`

Missing domains:

- `offerings`
- `audience`

ODV is suitable as input for BUR because it has persisted, valid, partial DBT
knowledge with lineage, confidence, limitations, diagnostics, and explicit
missing knowledge. BUR must preserve the low confidence and missing offerings
and audience gaps.

### ViroiDoc

Current business understanding quality: stronger than ODV but still partial
because audience is missing and all knowledge remains website-only.

Usable domains:

- `business_identity`
- `offerings`
- `brand`
- `digital_presence`
- `goals`
- `trust`
- `content`
- `constraints`

Missing domains:

- `audience`

ViroiDoc is suitable as input for BUR because it has persisted, valid, partial
DBT knowledge with lineage, confidence, limitations, diagnostics, and explicit
missing audience knowledge. BUR must preserve the low confidence and avoid
promoting website-only signals into confirmed business truth.

## Validation Commands

Focused DBT tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/digital-business-twin-contract.test.ts apps/platform/gnr8/architecture/digital-business-twin-builder.test.ts apps/platform/gnr8/architecture/digital-business-twin-persistence.test.ts
```

Result: pass, `17 / 17`.

Platform build:

```text
cd apps/platform && pnpm run vercel-build
```

Result: pass. The build emitted existing unrelated frontend lint warnings for
hook dependencies and `<img>` usage.

Diff hygiene:

```text
git diff --check
```

Result: pass.

## Result

MVP-1B-R is complete.

ODV and ViroiDoc now both have persisted Digital Business Twin artifacts.
Latest and by-ID reloads match. Idempotent persistence is verified. DBT is
confirmed ready to become the canonical input for Business Understanding
Report real-target validation.

## Recommended Next Phase

MVP-1C-R Business Understanding Report Real-Target Validation retry.

The retry should consume the newly persisted ODV and ViroiDoc DBT artifacts,
produce persisted Business Understanding Reports, verify reload/idempotency,
and stop before Business Alignment, Website Design Brief, Website Generation
Package, provider adapters, external AI, generation, compliance, Business
Approval, or publishing.
