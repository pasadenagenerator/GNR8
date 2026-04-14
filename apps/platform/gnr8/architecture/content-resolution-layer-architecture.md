# Renderer Content Resolution Layer Architecture

## 1. Problem statement
The real React renderer was receiving binding references (`contentId`, slot paths, safe fallbacks) instead of render-ready values, so preview/runtime output frequently showed placeholders where authoritative content already existed.

## 2. Why content resolution is a separate layer
Content resolution is orthogonal to import, merge, and component rendering. Keeping it as an explicit layer preserves bounded ownership: import captures truth, merge composes structure, content-resolution materializes render values, renderer renders UI.

## 3. Runtime boundary and data flow
`FinalSiteModel -> ReactRenderSiteModel -> Content Resolution Layer -> resolved ReactRenderSiteModel -> Real React Renderer -> Preview shell`.

## 4. Content source-of-truth precedence
Deterministic precedence:
1. Explicit resolved value already present in render model (`slot.resolvedValue` or explicit resolved prop).
2. Final-model bound content value (`contentId` -> `resolvedContentById`).
3. Final-model structured slot truth (`resolvedSlotValues` by `slotPath`).
4. Deterministic renderer fallback value.
5. Deterministic placeholder when no authoritative/fallback truth exists.

## 5. Value categories to resolve
Resolved categories: text, rich text, URL, image/media, repeatable item groups, and generic/nested slot structures.

## 6. Text resolution model
Text/rich text slots are resolved to concrete strings when non-empty truth exists. Missing text falls back deterministically (`[missing:slotPath]` or existing safe fallback).

## 7. Media resolution model
Media resolves from structured objects (`src`, `alt`, optional `caption`) or string source forms. Missing `alt` with valid `src` is treated as degraded-resolved; no media truth uses deterministic placeholder media.

## 8. Repeatable group resolution model
List slots resolve arrays of deterministic item maps. Item fields are normalized by key intent (`url/link`, `image/media`, text). Empty arrays emit repeatable-empty diagnostics and are treated as unresolved fallback.

## 9. Nested slot resolution model
Nested/generic structures resolve through stable key sorting and map-to-resolved-item conversion, preserving deterministic order and shape for generic components.

## 10. Fallback/degraded resolution model
Each slot is classified as:
- `resolved`
- `degraded_resolved`
- `unresolved_fallback`

Degraded is used when partial truth exists (for example media `src` without `alt`, partially mapped list entries). Unresolved fallback is used only when authoritative truth cannot be derived.

## 11. Diagnostics model
The layer emits deterministic diagnostics including:
`CONTENT_RESOLUTION_STARTED`, `CONTENT_RESOLUTION_COMPLETED`, `CONTENT_VALUE_RESOLVED`, `CONTENT_VALUE_RESOLVED_FROM_FINAL_MODEL`, `CONTENT_VALUE_RESOLVED_FROM_RENDER_MODEL`, `CONTENT_MEDIA_RESOLVED`, `CONTENT_REPEATABLE_GROUP_RESOLVED`, `CONTENT_VALUE_PARTIALLY_RESOLVED`, `CONTENT_VALUE_UNRESOLVED_FALLBACK_USED`, `CONTENT_BINDING_TARGET_MISSING`, `CONTENT_BINDING_SOURCE_MISSING`, `CONTENT_REPEATABLE_GROUP_EMPTY`, `CONTENT_RESOLUTION_DEGRADED`.

## 12. Renderer integration model
`renderRealReactSite` now runs deterministic content resolution before route/page analysis and component rendering, then renders using resolved slots/props.

## 13. Preview/runtime summary implications
Preview summary now includes content-resolution truth:
- `contentResolutionApplied`
- `resolvedContentCount`
- `unresolvedContentCount`
- `contentResolutionDegraded`
- `contentResolutionDiagnostics`

This persists runtime truth for read-model and preview diagnostics surfaces.

## 14. Determinism strategy
Determinism is enforced via:
- stable traversal order (page/section/component/slot sorting)
- stable precedence rules
- stable diagnostics sorting
- deterministic value normalization for objects/arrays.

## 15. Risks / open questions
- Final models that do not carry structured content metadata may still degrade to fallback.
- Slot semantics for highly custom components can require richer schema conventions over time.

## 16. Phased rollout recommendation
1. Current phase: deterministic resolver + diagnostics + summary truth.
2. Next phase: broaden authoritative content attachment in final model generation paths.
3. Later phase: enforce stricter unresolved thresholds in quality gates.

## 17. Recommendation
Adopt this content-resolution layer as the required renderer boundary for all React preview/runtime paths, and treat unresolved/degraded counters as first-class runtime quality signals.
