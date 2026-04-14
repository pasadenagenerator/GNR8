# GNR8 Preview Runtime Integration (Renderer -> Validation/Preview Shell)

## 1. Problem statement
Preview runtime previously resolved only transformed artifact/debug fallback HTML and did not execute the deterministic `FinalSiteModel -> ReactRenderSiteModel -> real React renderer` chain inside the real preview shell path.

## 2. Why preview integration is a separate milestone
Importer, merge, renderer contract, and real renderer boundaries already exist independently. This milestone wires those boundaries into runtime preview selection without redesigning upstream architecture.

## 3. Runtime boundary and data flow
`SiteVersion + routePath` now enters `preparePreviewRuntime`:
1. deterministic FinalSiteModel projection
2. renderer-contract creation
3. real React runtime execution
4. mode selection
5. summary + diagnostics emission

Preview route selection:
- Path A: `react_preview` -> React runtime HTML shell
- Path B: `react_preview_degraded` -> React runtime HTML shell with fallback truth
- Path C: `fallback_preview` -> existing transformed/debug fallback preview

## 4. Preview mode decision model
Deterministic selector:
- `react_preview`: contract+runtime succeeded, route matched, meaningful structure, no runtime fallback
- `react_preview_degraded`: runtime succeeded but fallback/degradation evidence exists
- `fallback_preview`: missing/unsafe truth, unavailable contract, runtime failure, unresolved route, or non-renderable structure

## 5. React preview eligibility rules
Requires:
- available FinalSiteModel
- available renderer contract
- successful runtime render
- matched route/page
- at least one section and one component on matched page

## 6. Degraded preview eligibility rules
Same runtime path as React preview, but fallback evidence exists:
- renderer fallback flags/diagnostics
- generic/normalized runtime fallback behavior

## 7. Fallback preview eligibility rules
Chosen when any React safety gate fails:
- no final site model
- renderer contract unavailable
- renderer runtime failed
- route/page unresolved
- non-meaningful structure

## 8. Preview shell integration model
`/api/gnr8/runtime/versions/[siteVersionId]/preview` now:
- executes React runtime first for `mode=transformed`
- returns fallback artifact/debug only when React mode selection is `fallback_preview`
- exposes explicit mode via response headers and runtime summary

## 9. Diagnostics and evidence flow
Deterministic diagnostics emitted by preparation/selection include:
- `PREVIEW_RUNTIME_PREPARATION_STARTED`
- `PREVIEW_FINAL_SITE_MODEL_AVAILABLE|UNAVAILABLE`
- `PREVIEW_RENDERER_CONTRACT_CREATED|UNAVAILABLE`
- `PREVIEW_REAL_REACT_RENDER_SELECTED|DEGRADED`
- `PREVIEW_RENDERER_RUNTIME_FAILED`
- `PREVIEW_FALLBACK_RENDER_SELECTED`
- `PREVIEW_MODE_PERSISTED`

## 10. Persistence / summary truth model
Persisted `previewRuntimeSummary` (artifact manifest) now captures:
- mode
- contract/final availability
- fallback usage
- matched page id
- diagnostics

## 11. Read-model / workspace implications
Site Workspace read-model now parses artifact-manifest `previewRuntimeSummary` and surfaces explicit preview mode + diagnostics to the Preview tab. Shell messaging no longer implies React success when fallback mode is authoritative.

## 12. Determinism strategy
- stable page/section/component ordering
- deterministic ids and normalized routes
- no environment/time/random branching in mode selection
- sorted/unique diagnostics ordering

## 13. Failure and fallback strategy
Fallback precedence:
1. prefer valid React path
2. prefer degraded React over legacy fallback when render path is still safe
3. fallback preview only when React path unavailable/unsafe
4. diagnostics explain fallback reason

## 14. Future publish/runtime reuse
The same preparation boundary can be reused for publish/runtime/editor by swapping projection source from runtime-site-version projection to persisted merged truth once available.

## 15. Risks / open questions
- runtime-site-version projection to FinalSiteModel is deterministic but currently minimal
- richer persisted merged truth should eventually replace heuristic projection
- expanded component/token fidelity can reduce degraded-mode frequency

## 16. Phased rollout recommendation
1. enable React preview chain for transformed runtime preview route (done)
2. monitor diagnostics/mode distribution
3. harden projection fidelity and expand direct merged-truth persistence
4. converge preview/publish renderer preparation boundary

## 17. Recommendation
Keep this integration boundary as the single preview runtime truth selector and incrementally improve upstream truth quality rather than adding parallel preview paths.
