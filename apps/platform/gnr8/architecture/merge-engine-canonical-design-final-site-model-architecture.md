# Merge Engine Architecture (Canonical Import + Design -> Final Site Model)

## 1) Problem statement
GNR8 currently has canonical import truth and normalized external design output, but no deterministic engine that resolves authority and conflicts into one implementation-ready model. Without this merge boundary, import fidelity and redesign intelligence cannot safely co-exist.

## 2) Why merge engine is required
The merge engine is the explicit control point for deciding:
- what imported truth is preserved,
- where design proposals are accepted,
- how conflicts are surfaced,
- and how output remains stable for renderer/CMS/publish.

This prevents silent destructive changes and makes redesign explainable.

## 3) System boundary
In scope:
- merge contracts,
- deterministic page/section/component/token/content binding reconciliation,
- diagnostics and conflict records,
- final site model assembly.

Out of scope:
- renderer output,
- CMS schema generation,
- external vendor calls,
- queueing/persistence/runtime redesign.

## 4) Merge authority model
Authority split encoded in merge implementation:
- Content authority: import wins; design cannot silently invent business content.
- Structure authority: import routes/pages are authoritative; section composition can be influenced by design based on mode and confidence.
- Style authority: import tokens are baseline; design can refine based on style mode with drift diagnostics.
- Component authority: design proposes, merge validates/maps/fallbacks.

## 5) Merge modes
Supported by `MergeOptions`:
- `preserve_import`: preserve import structure, conservative design adoption.
- `prefer_design`: include design structure aggressively while retaining import content truth.
- `hybrid` (default): import route/content truth + design layout influence with confidence thresholds.

## 6) Page reconciliation
Deterministic page reconciliation logic:
1. Normalize and sort import pages and design pages.
2. Match by normalized path first (deterministic tie-break by id).
3. Preserve import-only pages with diagnostics.
4. Diagnose design-only pages and include only per mode/confidence policy.
5. Emit conflict taxonomy entries for every non-trivial case.

## 7) Section reconciliation
Section matching priority is explicit and deterministic:
1. page-level scope (already matched within page),
2. semantic role match,
3. content/title similarity from available canonical bindings and design props,
4. stable positional fallback.

Unmatched import sections are preserved. Unmatched design sections are either included (mode/confidence) or skipped with diagnostics.

## 8) Component mapping
External component types are mapped into normalized internal kinds:
- hero, section heading, rich text, image/media, CTA group,
- card grid, gallery, testimonial, pricing, FAQ,
- footer block, container, generic.

Unknown types follow `unknownComponentPolicy`:
- `wrap_as_generic`: fallback generic with raw metadata.
- `drop`: skip component with warning conflict.
- `diagnose`: skip component with error diagnostic.

## 9) Token merge strategy
Token merge behavior:
- Import style tokens are baseline with provenance.
- Design patches apply based on style mode + confidence threshold.
- Large token drift (e.g., major color delta) emits `token_conflict` and warning diagnostics.
- Output token sets are stable and sorted.

## 10) Content binding strategy
Final model contains explicit slot-level content bindings:
- `component.slot -> canonical content record`.
- Binding resolution prefers canonical section bindings, then owner-level heuristics.
- Slot/type/field-key similarity scoring is deterministic.
- Missing bindings emit conflicts and diagnostics (safe degradation, never crash).

## 11) Conflict taxonomy
Implemented conflict classes:
- `missing_import_page`
- `missing_design_page`
- `section_mismatch`
- `component_unmapped`
- `token_conflict`
- `content_binding_missing`
- `layout_override_rejected` (reserved for policy gate expansion)

Each conflict includes deterministic `resolution` and details payload.

## 12) Diagnostics / explainability
Every important decision emits diagnostics, including:
- page/section match decisions with score evidence,
- preservation vs inclusion decisions,
- unknown component fallback behavior,
- token drift detection,
- missing binding cases.

Diagnostics are sorted deterministically by severity/code/page/section/message.

## 13) Determinism strategy
Determinism is enforced by:
- explicit sort order at all merge boundaries,
- stable tie-breakers (ids/paths),
- no random IDs or timestamp-driven branching,
- conservative, pure scoring heuristics,
- deterministic diagnostics/conflict ordering.

Same input should produce byte-stable structural output ordering.

## 14) Final site model boundary
`FinalSiteModel` is implementation-ready for downstream systems and includes:
- site metadata, routes, navigation, global regions,
- page models with section tree and SEO placeholders,
- section models with semantic role/layout/components/content bindings/style refs/provenance,
- component models with slots, token refs, fallback metadata,
- merged token set with provenance,
- reusable components,
- diagnostics and conflicts.

## 15) Risks / open questions
Current conservative risks:
- heuristic similarity may under-match sparse sections,
- token drift thresholds need empirical tuning,
- section-level style refs are currently minimal placeholders,
- `layout_override_rejected` is defined and ready, but strict layout policy gates can be deepened.

## 16) Phased rollout plan
- Phase 1 (this task): contracts + deterministic merge core + tests.
- Phase 2: richer section/component semantic confidence and layout gate policy.
- Phase 3: feed final model into renderer contract layer.
- Phase 4: feed final model into CMS schema generation and edit surfaces.

## 17) Recommendation
Adopt this merge engine as the canonical boundary between import truth and design proposals, with `hybrid` as default mode. This enables safe progression into renderer and CMS layers without coupling to external design vendors.
