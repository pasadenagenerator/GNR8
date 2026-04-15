# Site Tree Model (Single-Page Seed -> Multi-Page Structure)

## Scope
- Deterministic, additive Site Tree V1.
- Starts from the currently imported page only.
- Derives candidate pages from internal links found on the seed page.
- No crawl, no extra fetches, no AI, no importer redesign.

## New Module
- `apps/platform/gnr8/site-tree/types/site-tree-types.ts`
- `apps/platform/gnr8/site-tree/diagnostics/site-tree-diagnostics.ts`
- `apps/platform/gnr8/site-tree/core/url-normalization.ts`
- `apps/platform/gnr8/site-tree/core/link-extractor.ts`
- `apps/platform/gnr8/site-tree/core/site-tree-builder.ts`
- `apps/platform/gnr8/site-tree/index.ts`

## Deterministic Contracts
- `SiteTree` is the canonical tree payload.
- `SiteTreePageNode` models seed/discovered pages with route metadata, conservative hierarchy, and shared layout hints.
- `SiteTreeNavigationSummary` tracks internal/external/ignored counts and candidate count.
- `SiteTreeDiagnostic` captures deterministic diagnostics with stable sorting.
- `SiteTreeSummary` is the additive runtime provenance/read-model surface.

## Deterministic Identity
- Page IDs are path-derived and deterministic:
  - `/` -> `page_home`
  - `/about` -> `page_about`
  - `/products/item-a` -> `page_products_item_a`
- No random IDs.

## URL Normalization Rules
- Strips query strings and fragments.
- Normalizes trailing slash.
- Normalizes `index.html` / `index.htm` to route root.
- Keeps only same-origin HTTP(S) links as internal candidates.
- Classifies non-same-origin as external.
- Ignores non-page links:
  - empty/hash-only
  - `mailto:`, `tel:`, `javascript:`
  - obvious asset extensions (`.jpg`, `.png`, `.svg`, `.pdf`, `.zip`, `.css`, `.js`, etc.)

## Seed-Page Rule
- Seed page is always created first.
- `rootPageId` always points to seed page.
- For non-root seed URLs (for example `/services/seo`), seed remains authoritative root of this import-scope tree.

## Conservative Hierarchy
- Parent inference is path-only:
  - `/` parent of first-level pages.
  - `/products` parent of `/products/item-a`.
- No inference from anchor text.

## Discovery Semantics
- Link-derived candidates are marked:
  - `isDiscoveredOnly = true`
  - `discoverySource = "internal_link"`
- Seed page is:
  - `isSeedPage = true`
  - `isDiscoveredOnly = false`
  - `discoverySource = "seed_page"`

## Shared Layout Hints
- Deterministic V1 hints set for all nodes:
  - `headerLikelyShared = true`
  - `footerLikelyShared = true`

## Diagnostics
Implemented codes (sorted deterministically):
- `SITE_TREE_INITIALIZED`
- `SITE_TREE_SEED_PAGE_CREATED`
- `SITE_TREE_LINKS_EXTRACTED`
- `SITE_TREE_INTERNAL_LINK_CLASSIFIED`
- `SITE_TREE_EXTERNAL_LINK_CLASSIFIED`
- `SITE_TREE_LINK_IGNORED`
- `SITE_TREE_PAGE_CANDIDATE_CREATED`
- `SITE_TREE_DUPLICATE_PAGE_SKIPPED`
- `SITE_TREE_PARENT_INFERRED`
- `SITE_TREE_BUILD_COMPLETED`
- `SITE_TREE_NO_INTERNAL_LINKS_FOUND`
- `SITE_TREE_BUILD_FAILED` (safe fallback warning path)

## Pipeline Integration (Additive)
- `scoped-import-pipeline` now builds site tree during provenance assembly.
- Uses already-imported seed page HTML evidence only; no extra fetches.
- Persists:
  - summary in runtime provenance (`import_provenance_summary.siteTree.summary`)
  - full payload in runtime provenance (`import_provenance_summary.siteTree.tree`)
  - payload artifact JSON at `<snapshot>/site-tree/site-tree.json` and path in summary.
- Failure behavior:
  - import flow does not fail
  - warning diagnostic recorded
  - seed-safe tree summary returned

## Runtime / Read Model Integration
- Extended `RuntimeImportProvenanceSummary` with additive `siteTree` field.
- `site-workspace-read-model` parser now reads and normalizes `siteTree.summary`.
- Workspace pipeline read-model now surfaces:
  - `siteTreeSummary.rootPageId`
  - `pageCount`
  - `candidatePageCount`
  - `internalLinkCount`
  - `externalLinkCount`
  - `ignoredLinkCount`
  - diagnostics

## Tests
- Added deterministic unit coverage in `site-tree-builder.test.ts`:
  1. seed only
  2. internal/external classification
  3. duplicate route dedupe
  4. path normalization identity dedupe
  5. ignored non-page links
  6. parent inference
  7. deterministic ordering
  8. non-root seed behavior
- Added provenance integration assertions in `scoped-import-pipeline.test.ts`.
- Added read-model parsing assertions for site-tree summary presence/absence in `site-workspace-read-model.test.ts`.
