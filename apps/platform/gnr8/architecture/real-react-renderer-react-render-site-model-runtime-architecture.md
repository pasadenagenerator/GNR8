# GNR8 Real React Renderer Architecture (ReactRenderSiteModel -> Components)

## 1. Problem statement
`ReactRenderSiteModel` exists as deterministic renderer contract output, but there is no production React execution layer that resolves routes, renders sections/components, applies theme tokens, and enforces safe fallback behavior at runtime.

## 2. Why real React renderer is a separate boundary
The contract layer normalizes data; the real renderer executes UI. Keeping them separate prevents merge/contract heuristics from leaking into runtime rendering and enables reuse of one runtime engine for preview, publish, and editor shells.

## 3. Runtime system boundary
In scope:
- Input: `ReactRenderSiteModel`, `routePath`, renderer options.
- Output: `<RenderedSite />` plus renderer result metadata.
- Responsibilities: route resolution, page/section/component rendering, theme boundary, slot rendering, fallback behavior, diagnostics behavior.

Out of scope:
- CMS generation, publish deployment pipeline, visual editor, drag/drop behavior, AI/runtime personalization.

## 4. Route resolution model
- Normalize incoming route path deterministically (`/`, no query/hash influence, no fuzzy matching).
- Match exact route path from `site.routes` sorted by `order`, `path`, `routeId`.
- Resolve `pageId` to page.
- Missing route or unresolved page uses deterministic not-found fallback and emits runtime diagnostic.

## 5. Page rendering model
- `SiteRenderer` selects one resolved page.
- `PageRenderer` renders section list in model order.
- Empty page renders `RenderEmptyPage` fallback while preserving page shell metadata.
- Deterministic structure is preserved through fixed wrappers and data attributes.

## 6. Section rendering model
- Every section renders a stable semantic wrapper with:
  - section id metadata
  - semantic role metadata
  - layout kind hook
  - section theme refs hook
- Unsupported layout kind maps to `stack` at runtime with diagnostic.
- Child components render in deterministic order.

## 7. Component registry model
- Runtime registry maps `renderKind` to concrete React implementations.
- Default kinds registered:
  - `render.hero`, `render.heading`, `render.rich_text`, `render.image`, `render.cta_group`, `render.card_grid`, `render.gallery`, `render.testimonial`, `render.pricing`, `render.faq`, `render.footer_block`, `render.generic`.
- Unknown render kinds deterministically render through `RenderGeneric` fallback and emit diagnostic.

## 8. Slot rendering model
- Slot utilities handle:
  - text-like slot values
  - image/media-like slot values
  - repeatable array slots
  - nested object slot structures
- Generic renderer recursively renders nested slot content.
- Malformed slot data is detected, diagnosed, and safely rendered.

## 9. Theme/token injection model
- `ThemeBoundaryProvider` is the site-level token boundary.
- Token groups map to deterministic CSS variables (`--gnr8-color-*`, `--gnr8-space-*`, `--gnr8-gradient-*`, `--gnr8-typography-*`).
- Semantic token refs exposed as `--gnr8-semantic-*` variables.
- Section/component wrappers expose theme reference metadata without hardcoding design values in each component.

## 10. Fallback rendering strategy
Fallbacks are deterministic and non-breaking for:
- unmatched route -> `RenderNotFound`
- empty page -> `RenderEmptyPage`
- unsupported section layout -> normalized `stack`
- unknown component render kind -> `RenderGeneric`
- missing content/media props -> safe text/media placeholders
- malformed slots -> safe generic slot rendering

Each fallback emits diagnostics and keeps page renderable.

## 11. Diagnostics-aware rendering
Modes:
- `silent`: diagnostics only in renderer result metadata.
- `comments`: diagnostics exposed as structured hidden metadata (`template` data payload + attrs).
- `visible`: diagnostics rendered in lightweight visible debug UI.

Diagnostic ordering is deterministic and mode-independent.

## 12. Determinism strategy
- Stable route sorting and exact path matching.
- No randomness/time/env branching.
- Stable diagnostic sorting by severity/code/location/message.
- Stable registry lookup and fallback paths.
- Stable slot traversal and object key ordering.

Same input model + route path always produces the same structure and diagnostics ordering.

## 13. Accessibility / semantics
- Page shell uses `<main>`.
- Hero uses article structure with heading/media.
- Heading uses heading tag.
- CTA groups render navigable links.
- Image/gallery render `<img>` with alt fallbacks.
- FAQ renders structured `dl` blocks.
- Generic fallback includes accessible labels and readable fallback details.

## 14. Preview/runtime/publish reuse path
This renderer becomes shared runtime engine:
1. Preview shell renders directly from `ReactRenderSiteModel`.
2. Publish pipeline later reuses same renderer for deterministic production output.
3. Editor overlays can attach to renderer wrappers via stable data attributes.

## 15. Risks / open questions
- Contract currently carries content references/fallback placeholders, not full rich content payload resolution.
- Future media/content resolution adapters may be needed to replace placeholder URLs.
- Global region model currently renders structural region shells; richer region composition remains future scope.

## 16. Phased rollout plan
1. Phase 1 (this task): deterministic real runtime renderer + fallback + diagnostics + tests.
2. Phase 2: preview shell integration and runtime surface wiring.
3. Phase 3: publish/runtime artifact execution on same renderer boundary.
4. Phase 4: editor overlays using stable section/component metadata hooks.

## 17. Recommendation
Adopt this real renderer as the only execution boundary for `ReactRenderSiteModel`; keep contract generation and runtime rendering independently evolvable while preserving deterministic fallback and diagnostics behavior.
