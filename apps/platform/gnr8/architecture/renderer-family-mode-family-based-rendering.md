# Renderer Family Mode — Family-Based Rendering Architecture

## 1. Why page-based-only rendering is now insufficient
Current preview/runtime preparation treats each page as a primary authored render unit. With Site Tree V1 + deterministic FamilyHandoffModel in provenance, page-only preparation duplicates structure decisions for pages that are template variants of the same family. This causes:
- repeated per-page structural inference,
- inconsistent structure authority across sibling pages,
- weak explainability about shared vs page-specific truth.

Family mode resolves this by making family truth the first reusable render boundary while preserving deterministic fallback to page mode.

## 2. Why family is the correct reusable render boundary
A family represents deterministic template-level invariants:
- shared section order tendencies,
- shared layout roles,
- shared component patterns,
- route-group/template identity.

Pages in that family are instances with route/content/SEO overrides. This maps to reusable rendering semantics better than isolated page-level reconstruction.

## 3. Relationship across models
- `SiteTree`: route topology + conservative shared layout hints (header/footer candidates).
- `FamilyHandoffModel` / `TemplateFamily`: deterministic family clustering + page-to-family mappings.
- `FinalSiteModel` / `ReactRenderSiteModel`: existing renderer contract surface.
- preview runtime: now composes page render input from:
  - family-shared structure (primary when usable),
  - page instance overrides,
  - deterministic page fallback when family path is unusable.

## 4. Family render model shape
`FamilyRenderModel` captures:
- identity: `familyId`, `familyKind`, `baseRouteGroup`, `representativeRoute`,
- shared structure: `sharedLayoutHints`, `sharedSectionPatterns`, `sharedComponentPatterns`,
- membership: `memberPages`,
- override/fallback state: `pageOverrides`, `fallbackFlags`,
- provenance + deterministic diagnostics.

`FamilyRenderSiteModel` adds site-level bindings and unmapped page truth.

## 5. Page instance derivation model
`FamilyPageInstance` is derived from:
- family base patterns (sections/components/layout roles), and
- page-specific data (route, title, SEO, content bindings, exceptional sections).

Derivation is conservative:
- match page components to shared component patterns by stable order/kind,
- append exceptional page sections as explicit overrides,
- degrade mode when shared structure is weak/ambiguous.

## 6. Authority rules
Family-shared truth owns (when usable/high-confidence):
- shared section order,
- shared layout roles,
- shared component patterns,
- shared structural defaults.

Page-instance truth owns:
- route/path,
- page identity,
- page-specific content bindings,
- page-specific SEO/meta scaffolding,
- exceptional sections and deterministic overrides.

Fallback page truth owns everything when family derivation is unavailable/unusable.

## 7. Deterministic derivation rules
- stable sort for families/pages/sections/components,
- stable IDs via deterministic hash IDs,
- shared section/component inference from member-page agreement at each order,
- conservative confidence (`high|medium|low`) by coverage ratio,
- singleton/ambiguous/weak-family conditions emit explicit deterministic diagnostics,
- no heuristic content synthesis.

## 8. Compatibility strategy
Downstream renderer is unchanged.

Bridge:
- derive `FamilyPageInstance`,
- adapt it back into existing `FinalSiteModel` page contract,
- feed existing renderer-contract + real-react-renderer path.

This is additive and migration-safe: if family path fails, existing page-based preparation continues.

## 9. Diagnostics and explainability
Family diagnostics are deterministic, deduped, sorted, and surfaced in preview/runtime summary:
- `FAMILY_RENDER_MODE_SELECTED`
- `FAMILY_RENDER_MODEL_BUILT`
- `FAMILY_RENDER_PAGE_INSTANCE_DERIVED`
- `FAMILY_RENDER_DEGRADED_TO_PAGE`
- `FAMILY_RENDER_NO_FAMILY_MAPPING`
- `FAMILY_RENDER_SHARED_STRUCTURE_WEAK`
- `FAMILY_RENDER_SINGLETON_FAMILY`
- `FAMILY_RENDER_INSTANCE_OVERRIDE_APPLIED`

Preview summary additionally surfaces:
- family mode used,
- selected family id,
- selected family render mode (`family_primary|hybrid_family_page|page_fallback`),
- fallback flag,
- key diagnostics + count.

## 10. Risks and extension path
Risks:
- weak/singleton families can overstate shared structure if not guarded,
- aggressive structure reuse can drop page-specific exceptions.

Current mitigations:
- conservative confidence thresholds,
- explicit hybrid mode,
- deterministic fallback path,
- explicit override diagnostics.

Future extension:
- richer family confidence calibration,
- stronger section/component signature extraction from canonical models,
- family-level token/profile reuse in addition to structure,
- workspace UI surfacing of family render mode truth.
