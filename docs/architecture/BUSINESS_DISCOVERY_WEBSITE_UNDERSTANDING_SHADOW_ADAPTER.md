# Business Discovery Website Understanding Shadow Adapter

## WU-6 Runtime Integration Plan Update

WU-6 documents the future production integration strategy without changing
runtime behavior.

Canonical plan:

- `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_INTEGRATION_PLAN.md`

The future integration strategy defines three modes:

- `LEGACY`: Business Discovery uses the current scattered input assembly.
  Shadow execution and comparison are disabled.
- `SHADOW_COMPARE`: current Business Discovery remains canonical while WU
  builds an in-memory shadow Business Discovery artifact through the adapter
  and compares it without writes.
- `WEBSITE_UNDERSTANDING`: WU becomes the Business Discovery input through
  the adapter, while current scattered assembly remains available only for
  instant runtime-configuration rollback.

The adapter remains the upstream boundary. Business Discovery builder behavior
remains unchanged. WU-6 adds no feature flags, mode selection code,
persistence, API, UI, worker, schema, or production mutation.

## WU-5 Section Evidence Lineage Update

WU-5 closes the WU-4 cutover blocker. The adapter now preserves exact
section-boundary refs from Source Website Understanding sections when assembling
the Business Discovery builder input.

The loss was in adapter input mapping: WU sections carried upstream
`evidence:section-boundary:<routePath>:<sectionId>` refs, but the adapter
rebuilt synthetic section evidence using WU projection section IDs. WU-5 adds
explicit source section identity and region type to the projection section model
and maps only traceable observed section-boundary rows into Business Discovery.

Real-target WU-5 result:

| Target | WU projection | Current BD | Shadow BD | Findings | Content-theme missing refs | Content-theme added refs | Limitations | Confidence | Readiness |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| ODV | `source_website_understanding_0caa89099ee02c9469b539cf2b2d0613` | `business_discovery_7b37413651d79de0d109e31690a34b62` | `business_discovery_shadow_effc750dce31c593fa8932ca66d98a8f` | 12 / 12 | 0 | 0 | 104 / 131 | `MEDIUM` / `MEDIUM` | `ready_with_expected_differences` |
| ViroiDoc | `source_website_understanding_72cece90151974f980a2abf7b5528709` | `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | `business_discovery_shadow_e608b04066ab15ca5156579843aaf859` | 17 / 17 | 0 | 0 | 105 / 132 | `MEDIUM` / `MEDIUM` | `ready_with_expected_differences` |

ODV `content_theme_observed` current and shadow refs are identical:
`section-boundary-7ea033afed92` and `section-boundary-acafcf3135dc`.
ViroiDoc current and shadow refs are identical:
`section-boundary-230d7a52f0d6`, `section-boundary-4156e11f8f75`, and
`section-boundary-c8165b22f882`.

Added limitations are expected projection transparency diagnostics only:
27 added `IMPORT_DIAGNOSTIC_OBSERVED` limitations on each target, 0 missing
limitations, and 0 duplicate semantic limitations. The CLI confirmed
deterministic rebuild equality and no writes. No runtime cutover occurred.

See
`docs/architecture/BUSINESS_DISCOVERY_SECTION_EVIDENCE_LINEAGE_PRESERVATION.md`.

## Phase WU-4 Boundary

WU-4 implements a non-persistent, non-authoritative shadow path that builds
Business Discovery input from the Source Website Understanding Projection and
compares the resulting in-memory Business Discovery artifact with the current
persisted Business Discovery artifact.

WU-4 does not switch Business Discovery runtime behavior, persist shadow
artifacts, replace latest artifacts, mutate provenance, create DBT/BUR/BA/WDB
or WGP artifacts, add schema, add APIs, add UI, add workers, add classifiers,
parse new HTML, call AI, generate, publish, deploy, or touch DNS.

## Runtime Files

- `apps/platform/gnr8/architecture/business-discovery-website-understanding-adapter.ts`
- `apps/platform/gnr8/architecture/business-discovery-shadow-comparison.ts`
- `apps/platform/gnr8/architecture/business-discovery-website-understanding-shadow.cli.ts`
- focused tests:
  `business-discovery-website-understanding-adapter.test.ts` and
  `business-discovery-shadow-comparison.test.ts`

The shadow flow is:

```text
Existing artifacts
-> Source Website Understanding Projection
-> Website Understanding adapter
-> buildBusinessDiscoveryFromSiteEvidence(...)
-> in-memory shadow Business Discovery artifact
-> deterministic semantic comparison
```

The adapter has no persistence imports and no raw artifact loader. It consumes
only the projection object and reuses the existing
`buildBusinessDiscoveryFromSiteEvidence(...)` builder.

## Projection Gaps Closed

WU-4 closes the two WU-3 Business Discovery input gaps:

- `sourceSiteId` is now projected as a first-class field at the top level,
  inside `sourceIdentity`, in lineage, and in deterministic inputs. It is
  copied from the authoritative runtime site-version `siteId`; it is not
  derived from `siteVersionId`.
- Evidence Capture baseline and fidelity limitations are projected verbatim
  with the current Business Discovery limitation codes, original messages,
  source refs, source artifact refs, severity/state where available, and
  deterministic deduplication.

If `sourceSiteId` is unavailable, the projection exposes a blocking
`SOURCE_SITE_ID_MISSING` limitation and the adapter refuses to build a shadow
Business Discovery artifact.

## Dependency Coverage

The WU-4 equivalence validator reports 100% current Business Discovery
dependency coverage for ODV and ViroiDoc:

- covered inputs: `runtime.site_version_id`, `runtime.dry_run_id`,
  `runtime.source_site_id`, `import.source_url`, `import.route_inventory`,
  `semantic_import.navigation_labels`,
  `evidence_capture.section_region_types`,
  `evidence_capture.asset_inventory_count`,
  `limitations.upstream_evidence_limitations`,
  `diagnostics.import_diagnostics`, `candidate_discovery.context`,
  `candidate_review.context`, `reconstruction.context`,
  `structure_plan.context`
- partial inputs: none
- missing inputs: none
- conflicts: none
- duplicates: none

## Semantic Comparison Rules

The comparator classifies differences as:

- `equivalent`: no semantic difference
- `semantically_equivalent`: meaning matches though deterministic IDs or
  summaries differ
- `expected_projection_normalization`: ordering/token/source-boundary
  normalization without changed meaning
- `improvement`: stronger lineage or evidence without changed meaning
- `regression`: lost evidence, lower confidence, or weaker domain status
- `missing`: current finding/limitation/domain absent in shadow
- `conflicting`: identity or status conflict
- `unexpected`: unsupported new business finding or confidence inflation

Cutover is blocked by source identity mismatch, `sourceSiteId` mismatch,
missing current finding, lost evidence reference, lost limitation, confidence
increase without stronger evidence, new unsupported business fact, domain
status regression, lineage break, downstream contamination, or
nondeterministic rebuild.

Readiness values are migration readiness only:

- `ready_for_optional_runtime_integration`
- `ready_with_expected_differences`
- `blocked`

They are not Business Discovery artifact statuses.

## Real-Target Shadow Validation

Command:

```text
cd apps/platform
set -a
source .env.production
set +a
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/architecture/business-discovery-website-understanding-shadow.cli.ts
```

The first sandboxed `tsx` attempt hit the known local IPC error
`listen EPERM ... tsx-501/*.pipe`; the same read-only command succeeded
outside the sandbox. The CLI exits non-zero because both targets are blocked
for cutover readiness.

### ODV

- siteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- WU projection:
  `source_website_understanding_b0cd478c45734c2e6f31db84ed9ad2c3`
- current Business Discovery:
  `business_discovery_7b37413651d79de0d109e31690a34b62`
- shadow Business Discovery ID:
  `business_discovery_shadow_0f6788b6b6eed75ec7db2aa3c5f78231`
- shadow content identity:
  `0f6788b6b6eed75ec7db2aa3c5f78231f7b0159d8ae638734ba1d8230c9ed5c0`
- dependency coverage: 100%
- current vs shadow status: both `partial`
- current vs shadow findings: 12 vs 12
- current vs shadow limitations: 104 vs 131
- confidence: `MEDIUM` vs `MEDIUM`
- deterministic rebuild equality: true
- no write occurred: true
- cutover readiness: `blocked`
- blocker: shadow lost at least one current
  `content_theme_observed` section-boundary evidence reference for the
  navigation content finding

Expected differences:

- deterministic finding IDs changed for projection-normalized asset,
  constraint, content, and primary-navigation findings
- several findings gained stronger evidence lineage
- limitation count increased because WU projects the current Evidence Capture
  limitation set verbatim

### ViroiDoc

- siteVersionId: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- WU projection:
  `source_website_understanding_d80895ffc313fb393b15ecbef3e90c1a`
- current Business Discovery:
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`
- shadow Business Discovery ID:
  `business_discovery_shadow_84c495a9a06e38f1d5980f89f62a0886`
- shadow content identity:
  `84c495a9a06e38f1d5980f89f62a0886540a21432f87f1b09fd63befafda7a28`
- dependency coverage: 100%
- current vs shadow status: both `partial`
- current vs shadow findings: 17 vs 17
- current vs shadow limitations: 105 vs 132
- confidence: `MEDIUM` vs `MEDIUM`
- deterministic rebuild equality: true
- no write occurred: true
- cutover readiness: `blocked`
- blocker: shadow lost at least one current
  `content_theme_observed` section-boundary evidence reference for the
  footer/navigation content finding

Expected differences:

- deterministic finding IDs changed for projection-normalized asset,
  constraint, content, and primary-navigation findings
- several findings gained stronger evidence lineage
- limitation count increased because WU projects the current Evidence Capture
  limitation set verbatim

## Artifact Identity Behavior

The shadow path does not force the current persisted Business Discovery
artifact ID to match. WU-4 produces different non-authoritative shadow IDs
because projection-normalized evidence, limitation lineage, and deterministic
input ordering change the semantic artifact content. Semantic comparison is
the migration gate; identifier equality is not required.

## No Circular Dependency

The projection and adapter do not consume persisted Business Discovery, DBT,
BUR, Business Alignment, WDB, WGP, provider payloads, generated proposals,
OWM, compliance, improvement, or evolution artifacts. The real-target CLI
loads the current persisted Business Discovery artifact only as a comparison
reference and never feeds it into the shadow builder.

## WU-4 Historical Result

WU-4 proves that Business Discovery can be built in memory from one
connector-neutral Website Understanding Projection using the existing builder,
with 100% current dependency coverage. It also proves that runtime cutover
was blocked at WU-4 until the projection preserved the exact current
section-boundary evidence refs used by `content_theme_observed` findings.

WU-5 closes that blocker. Optional runtime integration is now ready with
expected differences, but no runtime switch has occurred.

WU-6 documents the future integration modes, rollout, rollback, safety gates,
readiness, connector strategy, observability, failure handling, and production
cutover sequence.

Recommended next phase after WU-6:

```text
WU-7 - Business Discovery Runtime Mode Configuration Design
```
