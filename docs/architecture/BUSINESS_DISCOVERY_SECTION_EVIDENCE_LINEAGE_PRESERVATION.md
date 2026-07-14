# Business Discovery Section Evidence Lineage Preservation

## Phase WU-5 Boundary

WU-5 closes the final section-evidence lineage blocker between the Source
Website Understanding shadow path and the existing Business Discovery builder.

This phase preserves current section-boundary evidence refs through Website
Understanding and the shadow adapter only. It does not switch Business
Discovery runtime behavior, persist shadow artifacts, persist projections,
mutate provenance, add schema, add UI/API/workers, create DBT/BUR/Alignment/WDB
or WGP artifacts, run AI, generate, publish, deploy, or touch DNS.

## Original Blocker

WU-4 proved 100% Business Discovery input dependency coverage for ODV and
ViroiDoc, but optional runtime integration was blocked because the shadow
`content_theme_observed` finding lost current section-boundary evidence refs:

| Target | Current finding token | Lost shadow evidence |
| --- | --- | --- |
| ODV | `navigation` | at least one navigation section-boundary ref |
| ViroiDoc | `footer|navigation` | at least one footer/navigation section-boundary ref |

## Current Evidence Source

The current Business Discovery path obtains the refs from existing structured
section evidence:

```text
SectionBoundaryEvidence
-> FirstLimitedDryRunOutput.sectionModels[].sourceEvidenceRefs
-> Source section model IDs and region types
-> BusinessDiscoveryBuilderInput.evidenceCaptureBaseline.captureExpansionEvidence.sectionBoundaryEvidence
-> buildBusinessDiscoveryFromSiteEvidence(...)
-> content_theme_observed.evidenceRefs
```

The current builder derives `content_theme_observed` from section region types
and section IDs. The canonical ref shape is:

```text
evidence:section-boundary:<routePath>:<sectionId>
```

## Where Lineage Was Lost

The loss occurred in the WU adapter input mapping. The Source Website
Understanding projection already carried `sections[].evidenceRefs` from the
First Limited Dry Run output, but the adapter rebuilt synthetic section-boundary
evidence with WU projection section IDs. That changed stable source section
identity before the existing Business Discovery builder aggregated
`content_theme_observed`.

The projection contract also did not explicitly distinguish:

- WU projection section ID;
- original source section-boundary ID;
- exact section region type;
- producing source artifact refs for the section row.

## Fix Applied

WU-5 adds the smallest lineage fields needed on `SourceSectionUnderstanding`:

- `sourceSectionId`
- `regionType`
- optional `sourceArtifactRefs`

The adapter now maps only observed, non-planned WU sections that have exact
stable section-boundary refs. It preserves `sourceSectionId`, region type,
section ordering, exact refs, and source artifact refs from projection data
only. It reads no raw imports, no persisted Business Discovery inputs, and no
downstream artifacts.

If an evidence-capture section lacks a stable boundary ref, or if
`sourceSectionId` conflicts with the stable ref, the adapter fails closed with a
lineage blocker.

## Evidence Aggregation Rule

When a Business Discovery finding derives from multiple source sections, the
builder preserves every exact section-boundary ref supplied by upstream
`sourceEvidenceRefs`.

Rules:

- preserve exact ref values;
- preserve distinct section refs even when labels or semantic types are similar;
- preserve footer and navigation as separate refs;
- deduplicate exact duplicate refs only;
- output deterministic ordering;
- do not fabricate section-boundary refs from semantic-import-only sections.

## Comparison Policy

`compareBusinessDiscoveryShadow(...)` now distinguishes:

- exact evidence equality;
- ordering-only differences;
- complete supported evidence supersets;
- lost evidence;
- unsupported added evidence;
- conflicting evidence movement.

A supported complete evidence superset is an `improvement`. Lost refs,
unsupported added refs, and conflicts remain blockers.

## Limitation Delta Policy

Cutover readiness does not require identical limitation counts. Added
limitations are allowed only when they are source-traceable and non-conflicting.

WU-5 classifies added limitations as:

- verbatim upstream fidelity preservation;
- expected projection transparency;
- source-traceable added limitation;
- duplicate semantic limitation;
- new regression.

Duplicate semantic limitations are rejected/deduped. Untraceable additions are
blockers.

## Real-Target Results

Command:

```text
cd apps/platform
set -a
source .env.production
set +a
NODE_OPTIONS='--conditions=react-server' node --import tsx gnr8/architecture/business-discovery-website-understanding-shadow.cli.ts
```

The sandboxed `pnpm exec tsx` run hit the known local `tsx-501/*.pipe` EPERM
issue. The same read-only CLI succeeded with `node --import tsx` after network
access was allowed for Supabase reads.

### ODV

- WU projection ID:
  `source_website_understanding_0caa89099ee02c9469b539cf2b2d0613`
- current Business Discovery:
  `business_discovery_7b37413651d79de0d109e31690a34b62`
- shadow Business Discovery:
  `business_discovery_shadow_effc750dce31c593fa8932ca66d98a8f`
- findings: 12 current / 12 shadow
- finding-type coverage: no missing kinds, no added kinds
- `content_theme_observed` current refs:
  `section_boundary:evidence:section-boundary:/:section-boundary-7ea033afed92:/`,
  `section_boundary:evidence:section-boundary:/:section-boundary-acafcf3135dc:/`
- `content_theme_observed` shadow refs: identical
- missing evidence refs: none
- added content-theme evidence refs: none
- limitation delta: 104 current / 131 shadow; 27 added, all
  `expected_projection_transparency`; 0 missing; 0 duplicate semantic
  limitations
- confidence: `MEDIUM` current / `MEDIUM` shadow
- deterministic rebuild equality: true
- conflicts: none
- unexpected differences: none
- cutover readiness: `ready_with_expected_differences`

### ViroiDoc

- WU projection ID:
  `source_website_understanding_72cece90151974f980a2abf7b5528709`
- current Business Discovery:
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`
- shadow Business Discovery:
  `business_discovery_shadow_e608b04066ab15ca5156579843aaf859`
- findings: 17 current / 17 shadow
- finding-type coverage: no missing kinds, no added kinds
- `content_theme_observed` current refs:
  `section_boundary:evidence:section-boundary:/:section-boundary-230d7a52f0d6:/`,
  `section_boundary:evidence:section-boundary:/:section-boundary-4156e11f8f75:/`,
  `section_boundary:evidence:section-boundary:/:section-boundary-c8165b22f882:/`
- `content_theme_observed` shadow refs: identical
- missing evidence refs: none
- added content-theme evidence refs: none
- limitation delta: 105 current / 132 shadow; 27 added, all
  `expected_projection_transparency`; 0 missing; 0 duplicate semantic
  limitations
- confidence: `MEDIUM` current / `MEDIUM` shadow
- deterministic rebuild equality: true
- conflicts: none
- unexpected differences: none
- cutover readiness: `ready_with_expected_differences`

## Optional Cutover Policy

A future optional runtime integration is ready only when:

- all current findings are retained;
- all current evidence refs are retained;
- no unsupported business finding is introduced;
- no confidence inflation occurs;
- no domain regression occurs;
- all added limitations are source-traceable;
- projection and shadow rebuild deterministically;
- no downstream contamination exists.

WU-5 meets this policy for ODV and ViroiDoc with expected, source-traceable
projection-transparency limitation differences.

## No-Write Confirmation

WU-5 confirmed:

- no Business Discovery persistence;
- no projection persistence;
- no provenance mutation;
- no DBT/downstream artifacts;
- no target writes;
- no runtime cutover;
- no production behavior switch.

## Result

All current Business Discovery section evidence refs are preserved through the
Website Understanding shadow path for ODV and ViroiDoc. Both targets are ready
for optional runtime integration with expected differences. No cutover occurred.

Recommended next phase:

```text
WU-6 - Optional Business Discovery Runtime Integration Plan
```
