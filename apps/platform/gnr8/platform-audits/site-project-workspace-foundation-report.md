# Site / Project Workspace Foundation Report

## 1. Site as First-Class Entity
- Added a formal site domain model in `apps/platform/gnr8/site/site-entity.ts`.
- Site normalization now defines `id`, `clientId`, `agencyId`, `label`, `domain`, `status`, and timestamps.
- Added fail-closed scope validation in `assertSiteWorkspaceScope(...)` inside `apps/platform/gnr8/site/site-workspace-read-model.ts`.

## 2. New Workspace Structure
- Added dedicated route family under:
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]`
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]/overview`
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]/structure`
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]/design`
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]/preview`
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]/settings`
- Added `SiteContextLayout` using existing workspace primitives, including breadcrumb lineage and tab navigation.

## 3. Surfaces (Overview / Structure / Design / Preview / Settings)
- Overview:
  - site identity, status, last run, and pipeline summary (sections/hero/cta/strategy)
  - quick actions (Open Preview, Re-run placeholder, View Structure, View Design Decisions)
- Structure:
  - section list with section types, confidence labels/scores, and key diagnostics
  - focused operator/debug readability (not raw JSON)
- Design:
  - selected strategy, section-level decisions, rationale, AI suggestion status
  - visual signal summaries (hero prominence, visual density, cta prominence)
- Preview:
  - embedded preview iframe from current runtime preview URL
  - open preview/live in new tab
- Settings:
  - minimal site name/domain
  - placeholders for publish settings, branding overrides, environment

## 4. Integration with Existing Layers
- Client dashboard site cards now include deep-link action: `Open Workspace`.
- Client context command palette now includes site-level entries:
  - `Open Site: {name}`
  - `Open Site Preview: {name}`
  - `Open Site Design: {name}`
  - `Open Site Structure: {name}`
- Site context command palette includes current-site and sibling-site navigation routes.
- Recent Items integration updated so site routes are tracked and labeled with site context.
- Breadcrumb lineage in site context:
  - `Command Center / Agency / Client / Site / [Section]`

## 5. Limitations (Explicit V1)
- No editing/building UI.
- No publishing flow implementation from this workspace.
- No live analytics dashboards.
- No A/B testing.
- No collaboration layer.
- No version history timeline UI.
- Re-run transformation action is placeholder only.
- Visual/design summaries are deterministic derivations from currently available runtime/governance data.

## 6. Next-Step Recommendation
- Build a dedicated **Site Actions Layer** on top of this foundation:
  - Re-run transformation orchestration
  - redesign workflow hooks
  - publish gating and execution controls
- This is the smallest coherent follow-up to convert the workspace from visibility-first to action-capable.
