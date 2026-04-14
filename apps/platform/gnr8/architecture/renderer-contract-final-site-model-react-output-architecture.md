# GNR8 Renderer Contract Architecture (FinalSiteModel -> ReactRenderSiteModel)

## 1. Problem statement
`FinalSiteModel` is merged truth, but it is not directly executable by runtime renderers. It lacks explicit render-kind normalization, prop/slot render contract shape, deterministic fallback outputs, and renderer-facing theme binding. We need a deterministic boundary that turns merged site truth into implementation-ready React render contracts.

## 2. Why renderer contract layer is required
The layer isolates merge logic from runtime rendering mechanics. Merge output remains source-of-truth content/layout intent; renderer contract output becomes stable render authority for preview/publish/runtime without re-running merge heuristics at render time.

## 3. System boundary
Boundary in scope:
- Input: `FinalSiteModel`
- Output: `ReactRenderSiteModel`
- Responsibilities: page/section/component ordering, render mapping, slot/prop binding contract, theme contract, safe fallback, explainable diagnostics.

Out of scope:
- React UI components
- CSS/Tailwind build-out
- publish/deploy runtime
- CMS persistence
- preview shell rewrite

## 4. Render authority model
Authority chain:
1. `FinalSiteModel` defines canonical merged page/section/component + token truth.
2. Renderer contract normalizes this into deterministic render nodes.
3. Future renderer executes only `ReactRenderSiteModel`, never raw merge internals.

## 5. Input/output contract
Input:
- `RendererContractInput { site: FinalSiteModel, options? }`

Output:
- `ReactRenderSiteModel` with:
- `site` identity + route inventory
- `pages` with deterministic ordered sections/components
- `globalRegions`
- `theme` token groups + semantic token map + component themes
- `diagnostics` for explainability

## 6. Page transformation
Rules:
- Stable page sort: `path`, then `id`
- Preserve route path + role metadata
- Canonical SEO arrays sorted deterministically
- Empty section list emits warning diagnostic and still outputs renderable page shell
- Unsupported page role emits info diagnostic, preserved as metadata

## 7. Section transformation
Rules:
- Stable section sort: `order`, then `id`
- `semanticRole` preserved
- `layoutRole` normalized into `layoutKind`
- Unsupported/empty layout maps to `stack` with diagnostic
- Empty components emits info diagnostic and keeps empty section shell
- Theme refs resolved from section style refs with stable naming

## 8. Component render mapping
Deterministic map:
- `hero -> render.hero`
- `section_heading|heading -> render.heading`
- `rich_text -> render.rich_text`
- `image -> render.image`
- `cta_group -> render.cta_group`
- `card_grid -> render.card_grid`
- `gallery -> render.gallery`
- `testimonial -> render.testimonial`
- `pricing -> render.pricing`
- `faq -> render.faq`
- `footer_block -> render.footer_block`
- `generic|unknown -> render.generic`

Unknown/unsupported kinds:
- Never break output
- Emit diagnostic
- Include fallback metadata for inspection

## 9. Content/slot resolution
Resolution contract:
- Slot path authority: `${componentId}.${slotKey}`
- Resolve binding from section content bindings by exact/suffix match
- Each slot yields `ReactRenderBoundValue` with:
- binding/content refs
- confidence
- deterministic fallback value
- source (`bound_content` or `fallback`)

Props are explicitly assembled from slot refs:
- heading/body/media extraction by deterministic key matching
- CTA extraction (`label`/`href`) into `ctas[]`
- list slots emitted as collection-like `collections` inputs

Missing bindings/media:
- deterministic fallback values injected
- diagnostics emitted
- component remains renderable

## 10. Theme/token resolution
Theme contract converts merged token truth into render-facing token groups:
- `colors`, `typography`, `spacing`, `gradients`, `surface`
- stable deterministic ordering by token id
- semantic token map from color semantic roles
- deterministic conflict selection with diagnostic
- component theme metadata from merged component profile
- optional provenance attachment when requested

## 11. Fallback rendering strategy
Safe fallback guarantees output continuity for:
- unknown component kinds -> `render.generic`
- missing content bindings -> deterministic fallback payload
- missing media -> safe media fallback object
- unsupported layout -> `stack`
- partial/empty sections -> empty but renderable shells

No silent drops. All major fallbacks emit diagnostics.

## 12. Diagnostics / explainability
Diagnostics model includes:
- code, severity, message
- page/section/component scope
- optional details payload

Explainability examples now supported:
- unknown kind mapped to generic
- missing slot binding fallback reason
- unsupported layout normalized to stack
- semantic token conflict deterministic winner

## 13. Determinism strategy
Determinism controls:
- explicit sorting for pages, sections, components, routes, regions, tokens, bindings, diagnostics
- normalized key derivation with stable string transforms
- no random ids, no environment branching, no time-based behavior
- repeated runs on same `FinalSiteModel` produce identical `ReactRenderSiteModel`

## 14. React renderer boundary
Future React renderer consumes only:
- `renderKind`
- resolved `props` and `slots`
- `themeRefs` and global `theme`
- optional `fallback`

This makes React implementation a pure view layer, independent of merge heuristics.

## 15. Risks / open questions
- `FinalSiteModel` currently carries content IDs, not fully materialized content values.
- Slot schema richness may need expansion per component kind.
- Theme semantic token naming policy may need cross-team governance for long-term compatibility.

## 16. Phased rollout plan
1. Contract foundation (this task): deterministic model + mapping + fallback + diagnostics + tests.
2. Component schema hardening: stronger per-render-kind prop contracts.
3. Renderer execution: map `renderKind` to concrete React components.
4. Runtime/editor integration: bind content store and editing overlays using `contentId` references.

## 17. Recommendation
Adopt `ReactRenderSiteModel` as the only renderer input contract and keep merge/runtime concerns separated permanently. Extend slot and prop schemas incrementally without changing boundary semantics.
