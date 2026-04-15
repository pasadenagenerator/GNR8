# Design Handoff Family Mode (Deterministic V1)

## Purpose

Family Mode upgrades handoff from page-level thinking to deterministic template-family thinking:

- input: `SiteTree` + per-page sections (when available)
- output: `FamilyHandoffModel` + page-to-family mappings + summary for runtime provenance/read-model

This stage runs after `site tree` generation in the scoped import pipeline.

## Deterministic Rules

### Classification

Family type is inferred with strict fallback order:

1. Path heuristics (`marketing`, `listing`, `detail`, `utility`)
2. Section heuristics (hero/text/cta, grid/cards, image+text)
3. Fallback to `unknown`

If path and section heuristics disagree, path wins and an ambiguity diagnostic is emitted.

### Clustering

Pages are clustered by:

- `familyType`
- deterministic route group (`root`, first segment, or `misc`)

Deterministic family id shape:

- `family_marketing_root`
- `family_listing_products`
- `family_detail_products`
- `family_unknown_misc`

### Shared layout (V1)

Header/footer are inferred from SiteTree shared-layout hints only.
No structural diffing is performed in V1.

### Section pattern

Family section pattern is inferred as a deterministic per-order majority vote across available page patterns.
If no page has section data, pattern remains empty and a warning diagnostic is emitted.

## Diagnostics

Family Mode emits deterministic, sorted diagnostics codes:

- `FAMILY_MODE_INITIALIZED`
- `FAMILY_CREATED`
- `FAMILY_CLASSIFIED`
- `FAMILY_PAGE_ASSIGNED`
- `FAMILY_PAGE_AMBIGUOUS_ASSIGNMENT`
- `FAMILY_ORPHAN_PAGE`
- `FAMILY_PATTERN_INFERRED`
- `FAMILY_PATTERN_EMPTY`
- `FAMILY_BUILD_COMPLETED`

## Provenance + Read Model

Runtime provenance now includes optional `templateFamilies`:

- `summary` (`familyCount`, `largestFamilySize`, `orphanPageCount`, `diagnostics`, optional `payloadPath`)
- `families` full model payload when available

Payload persistence path:

- `.../template-families/families.json`

Read-model parsing is additive and fail-safe:

- if absent/invalid, `templateFamiliesSummary` resolves to `null`
- existing UI and read paths remain unchanged
