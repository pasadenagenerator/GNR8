# Business Discovery Input Equivalence

## WU-6 Runtime Integration Plan Update

WU-6 uses the WU-3 through WU-5 equivalence evidence to define the future
production migration plan from current Business Discovery input assembly to
Website Understanding as the canonical upstream input.

Canonical plan:

- `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_INTEGRATION_PLAN.md`

Readiness before `WEBSITE_UNDERSTANDING` mode may be enabled requires 100%
dependency coverage, deterministic rebuild, no lost findings, no lost
evidence refs, no lost limitations, no confidence inflation, no unsupported
business meaning, no lineage regression, no downstream contamination, ODV
validation, and ViroiDoc validation.

The plan does not change Business Discovery runtime behavior. Future rollout
must pass through `LEGACY`, `SHADOW_COMPARE`, and then scoped
`WEBSITE_UNDERSTANDING`, with rollback by runtime configuration only.

## Phase WU-3 Boundary

WU-3 proves whether the Source Website Understanding Projection can become the
single canonical upstream input boundary for Business Discovery.

This phase adds only equivalence analysis, read-only validation helpers,
projection completeness checks, documentation, and focused tests. It does not
migrate Business Discovery, add extraction, add classifiers, execute AI,
persist a projection, mutate DBT/WDB/WGP, generate, approve, publish, deploy,
or change production data.

## Executive Result

WU-5 update, 2026-07-14:

Website Understanding still covers 100% of current Business Discovery input
dependencies for ODV and ViroiDoc. The WU-4 section-lineage blocker is closed:
current `content_theme_observed` section-boundary refs are preserved exactly in
the shadow Business Discovery artifacts.

| Target | Business Discovery artifact | WU projection | Missing finding kinds | Added finding kinds | Missing content-theme refs | Added content-theme refs | Readiness |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| ODV | `business_discovery_7b37413651d79de0d109e31690a34b62` | `source_website_understanding_0caa89099ee02c9469b539cf2b2d0613` | 0 | 0 | 0 | 0 | `ready_with_expected_differences` |
| ViroiDoc | `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | `source_website_understanding_72cece90151974f980a2abf7b5528709` | 0 | 0 | 0 | 0 | `ready_with_expected_differences` |

The remaining differences are projection-normalized IDs/tokens, supported
evidence supersets on non-content-theme findings, and source-traceable
projection-transparency limitations. They are not input-coverage blockers. No
Business Discovery runtime switch occurred.

WU-4 update, 2026-07-14:

Website Understanding now covers 100% of current Business Discovery input
dependencies for ODV and ViroiDoc. The WU-3 blockers are closed:

- exact persisted `sourceSiteId` is projected from the runtime site-version
  boundary;
- Evidence Capture baseline/fidelity limitations are projected verbatim with
  original messages, source refs, source artifact refs, severity/state,
  original codes, and deterministic deduplication.

Current WU-4 real-target matrix:

| Target | Business Discovery artifact | WU projection | Dependency coverage | Partial inputs | Missing inputs | Conflicts | Duplicates |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| ODV | `business_discovery_7b37413651d79de0d109e31690a34b62` | `source_website_understanding_b0cd478c45734c2e6f31db84ed9ad2c3` | 100% | 0 | 0 | 0 | 0 |
| ViroiDoc | `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | `source_website_understanding_d80895ffc313fb393b15ecbef3e90c1a` | 100% | 0 | 0 | 0 | 0 |

This was input equivalence only. WU-4 shadow comparison still blocked runtime
cutover because the shadow `content_theme_observed` finding lost at least one
current section-boundary evidence ref for both ODV and ViroiDoc. WU-5 closes
that blocker; see
`docs/architecture/BUSINESS_DISCOVERY_SECTION_EVIDENCE_LINEAGE_PRESERVATION.md`.

## WU-3 Result

Website Understanding is not switch-ready as the only Business Discovery input
yet, but it is close enough for a shadow-migration phase.

Real ODV and ViroiDoc validation on 2026-07-14 showed:

| Target | Business Discovery artifact | WU projection | Dependency coverage | Coverage report | Conflicts | Duplicates |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| ODV | `business_discovery_7b37413651d79de0d109e31690a34b62` | `source_website_understanding_17e489688596671bf353e23f216bd1e4` | 89% | 82% | 0 | 0 |
| ViroiDoc | `business_discovery_360fa099cbcede288c2d0e04f2ec7986` | `source_website_understanding_b9796806c7e95914abce1845675bcd4f` | 89% | 82% | 0 | 0 |

Both targets covered 12 current or adjacent input dependencies, partially
covered 1 dependency, and missed 1 dependency.

Migration blockers:

- `sourceSiteId` is still an input-only runtime metadata field and is not
  projected as a first-class Website Understanding identity field.
- Evidence Capture baseline and fidelity limitations are visible only
  partially; WU must project verbatim baseline/fidelity limitation messages
  before Business Discovery can stop reading them directly.

## Deterministic Validator

WU-3 adds:

- `apps/platform/gnr8/architecture/business-discovery-input-equivalence.ts`
- `apps/platform/gnr8/architecture/business-discovery-input-equivalence-real-target.cli.ts`
- `apps/platform/gnr8/architecture/business-discovery-input-equivalence.test.ts`

Primary helper:

```ts
validateBusinessDiscoveryInputEquivalence(
  websiteUnderstandingProjection,
  existingBusinessDiscoveryInputs,
)
```

The validator reports:

- `covered`
- `partiallyCovered`
- `missing`
- `unexpected`
- `duplicate`
- `conflicting`
- `obsoleteRuntimeAssemblies`
- `migrationBlockers`
- `recommendedMigrationOrder`

It is read-only and sidecar-only. Business Discovery runtime behavior is
unchanged.

## Business Discovery Dependency Inventory

| Group | Dependency | Current Business Discovery use | WU-3 status |
| --- | --- | --- | --- |
| runtime metadata | `siteVersionId` | artifact identity and lineage | YES |
| runtime metadata | `dryRunId` | artifact identity and dry-run lineage | YES |
| runtime metadata | `sourceSiteId` | optional copied source site identity | NO |
| import | source URL / hostname | identity and digital-presence findings | YES |
| import | route inventory | route inventory and route keyword findings | YES |
| semantic import | navigation labels and hrefs | navigation, offering, audience, trust, goal keyword findings | YES |
| Evidence Capture | section IDs and region types | content theme findings | YES |
| Evidence Capture | asset inventory count | brand asset count finding | YES, stronger |
| limitations | upstream baseline/fidelity limitations | limitations and constraints finding | PARTIAL |
| diagnostics | import diagnostic codes | note-level limitations | YES |
| Candidate Discovery | artifact ID, count, route paths, diagnostics | constraints finding and route input | YES |
| Candidate Review | review decisions | not consumed today | YES, stronger |
| Reconstruction | package lineage | not consumed today | YES, stronger |
| StructurePlan | planning context | not consumed today | YES, stronger |

## Website Understanding Coverage Report

| Category | WU-3 coverage | Notes |
| --- | --- | --- |
| Identity | YES | Source URL, hostname, siteVersionId, dryRunId are projected; `sourceSiteId` is missing. |
| Routes | YES | Current route inventory is projected. |
| Pages | YES | Page records are projected. |
| Navigation | YES | Navigation labels/hrefs are projected. |
| Sections | YES | Source section semantic types are projected. |
| Body content | PARTIAL | Body/source text availability and visible messages are projected, but no new business classifier was added. |
| Messages | YES | Visible source messages are projected where semantic import has them. |
| CTA | YES | CTA signals are projected where semantic import has them. |
| Assets | YES | WU is stronger than Business Discovery because it projects concrete assets, not just counts. |
| Logo candidates | YES | Candidates only; not confirmed brand truth. |
| Color signals | YES | Structured source/style signals only; not canonical palette. |
| Typography signals | YES | Structured/local font signals only; not canonical typography. |
| Trust candidates | PARTIAL | Source-level candidates only. |
| Offering candidates | PARTIAL | Source-level candidates only; no new classifier. |
| Audience candidates | PARTIAL | Source-level candidates only; no new classifier. |
| Goals | NO | Goal candidates are not yet projected independently beyond current navigation/CTA evidence. |
| Geography | NO | Geography is not yet projected as an explicit source signal. |
| Languages | YES | Language signals are projected when semantic metadata exists. |
| Technical signals | YES | Title, headings, runtime hints, and source technical metadata are projected. |
| SEO | PARTIAL | Canonical/robots/sitemap evidence may be projected when available. |
| Diagnostics | YES | Diagnostics array exists and carries available upstream diagnostics. |
| Limitations | PARTIAL | Limitations exist, but verbatim baseline/fidelity propagation is incomplete. |
| Readiness | YES | Readiness status and dimensions are projected. |
| Lineage | YES | Artifact refs and deterministic input IDs are projected. |
| Confidence | YES | Projection-level and item-level confidence are projected. |

## Uncovered And Weaker Dependencies

`sourceSiteId`

- reason: current WU identity exposes `siteVersionId`, source URL, hostname,
  import identity, and artifact refs, but not source site ID.
- required source artifact: runtime site version.
- missing projection: `sourceIdentity.sourceSiteId` or an equivalent runtime
  identity field.
- future classifier: none.
- human confirmation requirement: none.

Verbatim Evidence Capture baseline/fidelity limitations

- reason: WU projects limitations and readiness blockers, but WU-3 does not
  prove every baseline/fidelity limitation message is preserved verbatim.
- required source artifact: Evidence Capture baseline artifact.
- missing projection: explicit source limitations mapped from
  `baseline.limitations` and `baseline.fidelityLimitations`.
- future classifier: none.
- human confirmation requirement: none.

Goal and geography candidates

- reason: WU keeps current source candidates fail-closed and does not add a
  new classifier.
- required source artifact: semantic import/body content or future governed
  candidate artifact.
- missing projection: explicit goal/geography candidate arrays with evidence
  refs.
- future classifier: yes, but not WU-3.
- human confirmation requirement: required before DBT canonical truth.

## Stronger Inputs

WU already exposes stronger source concepts than current Business Discovery
uses:

- body/source text availability;
- visible messages;
- CTA labels;
- concrete asset records;
- logo candidates;
- color signals;
- typography signals;
- Candidate Review context;
- Reconstruction Package lineage;
- StructurePlan context separated from source truth;
- source readiness and confidence dimensions.

These stronger signals must remain candidates or diagnostics until a later
Business Discovery migration or classifier phase explicitly consumes them.

## Duplicate Runtime Logic

The following Business Discovery operations become unnecessary after a safe
migration to Website Understanding:

- source URL fallback resolution from source URL, Evidence Capture baseline,
  and import provenance seed URL;
- route inventory aggregation across baselines, layout evidence, section
  evidence, navigation evidence, import provenance, raw route map, and
  Candidate Discovery;
- navigation signal assembly from Evidence Capture navigation items;
- section region aggregation from section boundary evidence;
- asset count aggregation from Evidence Capture baseline summaries;
- import diagnostic and upstream limitation copying once projection
  limitations are complete;
- Candidate Discovery context/count assembly once projection candidate refs
  are canonical.

WU-3 documents this logic only. It deletes nothing.

## Real-Target Validation

Command used:

```text
cd apps/platform
set -a
source .env.production
set +a
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/architecture/business-discovery-input-equivalence-real-target.cli.ts
```

The first sandboxed `tsx` attempt hit the known local IPC error:

```text
listen EPERM ... tsx-501/*.pipe
```

The read-only validation succeeded outside the sandbox with the server-side
module condition.

### ODV

- siteVersionId: `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- Business Discovery artifact:
  `business_discovery_7b37413651d79de0d109e31690a34b62`
- Business Discovery status: `partial`
- WU projection:
  `source_website_understanding_17e489688596671bf353e23f216bd1e4`
- WU projection status: `valid`
- WU validation: `valid`
- dependency coverage: 89%
- coverage report: 82%
- covered inputs: `runtime.site_version_id`, `runtime.dry_run_id`,
  `import.source_url`, `import.route_inventory`,
  `semantic_import.navigation_labels`,
  `evidence_capture.section_region_types`,
  `evidence_capture.asset_inventory_count`,
  `diagnostics.import_diagnostics`, `candidate_discovery.context`,
  `candidate_review.context`, `reconstruction.context`,
  `structure_plan.context`
- partial inputs: `limitations.upstream_evidence_limitations`
- missing inputs: `runtime.source_site_id`
- conflicts: 0
- duplicates: 0
- migration blockers: `sourceSiteId`, verbatim baseline/fidelity limitations

### ViroiDoc

- siteVersionId: `e26b0754-988b-45b9-9e24-8e213179b6cf`
- Business Discovery artifact:
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`
- Business Discovery status: `partial`
- WU projection:
  `source_website_understanding_b9796806c7e95914abce1845675bcd4f`
- WU projection status: `valid`
- WU validation: `valid`
- dependency coverage: 89%
- coverage report: 82%
- covered inputs: `runtime.site_version_id`, `runtime.dry_run_id`,
  `import.source_url`, `import.route_inventory`,
  `semantic_import.navigation_labels`,
  `evidence_capture.section_region_types`,
  `evidence_capture.asset_inventory_count`,
  `diagnostics.import_diagnostics`, `candidate_discovery.context`,
  `candidate_review.context`, `reconstruction.context`,
  `structure_plan.context`
- partial inputs: `limitations.upstream_evidence_limitations`
- missing inputs: `runtime.source_site_id`
- conflicts: 0
- duplicates: 0
- migration blockers: `sourceSiteId`, verbatim baseline/fidelity limitations

## Projection Hardening

WU-3 hardens the projection without new extraction:

- diagnostic codes/messages/source refs are normalized;
- no-navigation readiness is now `missing`, not `partial`;
- projection validation rejects duplicate limitations and duplicate readiness
  dimensions;
- projection validation checks that top-level artifact refs match lineage
  artifact refs;
- projection validation checks deterministic lineage artifact IDs against
  projected artifact refs.

## Migration Answer

Can Business Discovery consume Website Understanding as its only upstream
input today?

No. WU is close but not ready as the only input boundary because `sourceSiteId`
and verbatim Evidence Capture baseline/fidelity limitations are not fully
projected.

Can WU become the canonical boundary after a narrow hardening phase?

Yes. The remaining blockers are deterministic projection completeness gaps, not
new AI, new parsing, new extraction, or new business classification.

## Recommended Next Phase

```text
WU-4 - Business Discovery Website Understanding Shadow Adapter
```

Implement only a non-persistent shadow adapter that maps Website Understanding
into the current Business Discovery input shape, adds the two missing
projection fields first, runs ODV/ViroiDoc artifact equivalence comparisons,
and stops before switching Business Discovery runtime behavior.
