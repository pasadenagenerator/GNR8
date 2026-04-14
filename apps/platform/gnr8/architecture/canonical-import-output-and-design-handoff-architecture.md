# Canonical Import Output & External Design Handoff Architecture

## 1) Problem statement
GNR8 needs a deterministic, vendor-neutral canonical model that can represent imported websites in a way that is stable enough for automation, safe enough for product usage, and structured enough for future editor/CMS generation. The model must separate structural truth, content truth, and style/brand truth so redesign systems can propose presentation changes without corrupting imported content fidelity.

## 2) Current importer capability snapshot
Current GNR8 capability is strongest in single-page import normalization, section detection, rendered-capture reliability, and migration-oriented prepared models. It already has important foundations:
- Section-level semantic inference and diagnostics.
- Style signal extraction with confidence and diagnostics.
- Prepared model flow intended for deterministic migration stages.
- Design intelligence and section treatment decisioning.

Current gaps for redesign handoff:
- No explicit multipage canonical structure model as the long-lived import truth.
- No canonical content inventory normalized for future CMS field generation.
- No explicit vendor-neutral handoff request/response contracts for external design tools.
- No controlled merge contract that defines authoritative ownership across import vs external design.

## 3) Target future capability
Target state is:
1. Import source site into canonical layers: `structure`, `content`, `style`.
2. Produce vendor-neutral external design handoff payload.
3. Receive composition-focused design response (not necessarily code).
4. Merge response into GNR8 with explicit authority and conflict policy.
5. Persist result as an editable production site where content and style remain independently manageable.

## 4) Why canonical intermediate model is needed
A canonical intermediate model is required because both raw HTML and generated React are unstable as long-term product truth:
- HTML is source-capture truth but too noisy and non-editorial for robust CMS/edit workflows.
- React is runtime/render truth but encodes implementation details and is too coupled to renderer choices.
- A deterministic canonical model can bridge capture fidelity and product editability, while supporting multiple downstream renderers and external design vendors.

## 5) Canonical architecture overview
Canonical architecture introduces an explicit import bundle (`CanonicalImportBundle`) with three decoupled layers plus provenance:
- Layer A `structure`: pages/routes/regions/section topology.
- Layer B `content`: normalized editable content inventory with ownership scope.
- Layer C `style`: canonical CGP-style token/signal model with evidence and confidence.

Primary boundaries:
- Import pipeline owns deterministic extraction and normalization.
- External design adapter owns vendor mapping from canonical request/response.
- Merge engine owns authoritative reconciliation and conflict surfacing.
- Runtime renderer consumes merged canonical representation, not external vendor artifacts directly.

## 6) Layer A: structure model
Structure defines the site shape, independent from wording and exact visual treatment.

Core entities:
- `CanonicalSite`: root site record, locale assumptions, import provenance.
- `CanonicalPage`: route-level node with page purpose and section references.
- `CanonicalGlobalRegion`: shared layout regions (header, footer, announcement bar, etc.).
- `CanonicalSection`: structural section nodes with semantic role + slot boundaries.
- `CanonicalNavigationTree`: normalized navigation graph.
- `CanonicalRouteNode`: route hierarchy node for multipage trees.
- `CanonicalSharedComponentPattern`: repeated pattern signatures (cards, repeated CTAs, repeated testimonial structures).

Deterministic normalization rules (structure):
1. Stable IDs are derived from canonical path + ordinal + semantic key (`sha256`/stable hash strategy).
2. Route normalization enforces one canonical path format (lowercase, slash-normalized, deduplicated trailing slash rules).
3. Global region extraction prioritizes explicit semantic tags (`header`, `nav`, `footer`) then fallback heuristics.
4. Section boundaries are deterministic from ordered DOM block segmentation; confidence metadata records ambiguity.
5. Repetition detection uses deterministic pattern signatures (tag/role/content-shape digest) rather than non-deterministic clustering.
6. Multipage trees maintain parent-child route relationships even when only partial crawl is available (unknown placeholders allowed with explicit status).

## 7) Layer B: content model
Content is the canonical editable inventory and future CMS source of truth.

Core entities:
- `CanonicalContentInventory`: full indexed content corpus.
- `CanonicalContentRecord`: atomic content unit with type + location + scope.
- `CanonicalContentBinding`: references from structure nodes to content records.
- `CanonicalReusableContentGroup`: reusable/global content groups (e.g., nav/footer/contact blocks).

Supported content variants:
- Headings/subheadings/paragraphs/rich text.
- CTA labels and URLs.
- Media references (image/icon/svg/logo/background).
- Structured lists, cards, metrics, testimonials, FAQ items.
- Form field labels/help text/placeholders.
- Contact/legal/footer/navigation labels.
- SEO text/meta summaries where available.

Deterministic normalization rules (content):
1. Text normalization applies whitespace collapse + unicode normalization + stable punctuation trimming policy.
2. URL normalization resolves relative links against canonical page base.
3. Media references are deduplicated by normalized URL + intrinsic dimension hash when available.
4. Scoped ownership is always explicit: `global`, `page`, `section`, `component_pattern`.
5. Repeated content references are represented via pointer bindings, not copy duplication.
6. Missing content is represented explicitly as unresolved placeholders with severity.

## 8) Layer C: style/CGP model
Style layer captures brand system and visual rules, with evidence provenance.

Core entities:
- `CanonicalStyleCgpModel`: style root model for brand/system.
- `CanonicalColorTokenSet`: palette + semantic colors.
- `CanonicalTypographySystem`: families, scales, weight rules.
- `CanonicalSpacingSystem`: spacing/rhythm/density hints.
- `CanonicalSurfaceSystem`: radius, border, shadow, elevation.
- `CanonicalComponentStyleProfile`: button/input/card/media treatment conventions.
- `CanonicalStyleEvidence`: provenance entries linking tokens/rules to source evidence.

Deterministic normalization rules (style/CGP):
1. Color extraction maps values to normalized 8-digit hex + optional alpha and dedupes by canonical color distance threshold.
2. Typography family names are normalized and grouped by fallback-equivalence.
3. Spacing/radius/shadow values are tokenized into deterministic scales (`xs..2xl`) from observed quantiles.
4. Inferred semantic tokens are flagged as `inferred` vs `observed`.
5. Every non-observed rule must include rationale + evidence references + confidence score.
6. Style confidence is aggregated deterministically from evidence weights and sample coverage.

## 9) External design handoff request contract
`ExternalDesignHandoffRequest` is vendor-neutral and includes:
- Canonical `structure` layer.
- Canonical `content` inventory.
- Canonical `style`/CGP model.
- Optional business/context brief.
- Design goals/constraints.
- Editability constraints (content lock policy, token lock policy, no hardcoded lorem, etc.).
- Delivery target assumptions (responsive expectations, output abstraction level).

Vendor neutrality strategy:
- Use adapter boundary: `VendorAdapter.mapRequest(request) => vendorPayload`.
- Keep canonical contract stable; vendors get mapped payloads and mapped responses.
- Avoid vendor-specific primitive names in canonical types.

## 10) External design response contract
`ExternalDesignHandoffResponse` supports four abstraction levels:
1. `composition_spec`: page/section composition decisions.
2. `component_layout_spec`: concrete section/component layout hierarchy.
3. `token_system_spec`: global token overrides/additions.
4. `render_hints` (optional): code/render hints that are non-authoritative.

Required response components:
- Per-page design outputs.
- Section composition choices and component variants.
- Global decisions (navigation, shared regions, interaction conventions).
- Token overrides and additions.
- Unresolved placeholders and dependencies.
- Merge warnings and confidence metadata.

## 11) Merge-back strategy
Recommended authority split:
- Imported canonical `content` remains authoritative for user/business content by default.
- External design response is authoritative for presentation/layout proposals.
- Canonical `structure` mediates mapping and remains the anchor for cross-layer linkage.

Merge policy:
1. Build mapping table between external design nodes and canonical structure IDs.
2. Apply layout/component decisions only where mapping confidence passes threshold.
3. Apply style token overrides/additions with provenance and conflict flags.
4. Preserve content values unless response explicitly marks safe transforms (e.g., truncation policy, optional rewrite placeholders) and product policy allows.
5. Global regions merge separately and then propagate references to page instances.
6. Unmapped nodes become `mergeWarnings` and require manual review path.

Conflict resolution principles:
- `content_conflict`: prefer import content unless policy override.
- `structure_conflict`: prefer canonical structure unless explicit migration operation approved.
- `style_conflict`: allow overlay layers (`baseImportedStyle` + `designOverrideStyle`).

## 12) CMS future-compatibility
The canonical content model is intentionally schema-friendly:
- Each `CanonicalContentRecord` has type, cardinality, scope, and validation hints.
- Content groups map naturally to CMS collections/reusable blocks.
- Scope and bindings enable generation of:
  - Page-specific forms.
  - Global settings forms.
  - Navigation/footer editors.
  - Reusable component schemas.
- Validation metadata can power field constraints (required, URL format, max length).

## 13) HTML vs React vs canonical intermediate model decision
Decision: canonical imported output should be a structured intermediate model, not HTML-first and not React-first.

Reasoning:
- HTML-first keeps high source fidelity but is weak as stable product editing truth.
- React-first optimizes rendering implementation but couples canonical truth to runtime framework and component set.
- Canonical intermediate model preserves import truth semantically and structurally, while allowing many downstream targets (React renderer, design systems, static export, CMS generation).

Therefore:
- HTML remains an evidence/source artifact.
- React remains a downstream runtime/render target.
- Canonical structure/content/style is the product truth contract.

## 14) Proposed module/file placement
Recommended placement in `apps/platform/gnr8`:
- `architecture/canonical-import-models.ts`: stable canonical layer contracts.
- `architecture/external-design-handoff-contracts.ts`: request/response/merge contracts + adapter boundary types.
- `architecture/canonical-import-output-and-design-handoff-architecture.md`: architecture reference.
- `platform-audits/canonical-import-output-external-design-handoff-architecture-report.md`: implementation audit/report.

When moving toward implementation:
- Add `importer/canonical-normalizer.ts` for deterministic normalization orchestration.
- Add `design-intelligence/external-design-adapters/` for vendor-specific mappers.
- Add `migration/design-merge/` for merge engine and policy checks.

## 15) Phased implementation roadmap
- Phase A: Introduce canonical contracts and architecture docs.
- Phase B: Normalize current single-page importer output into structure/content/style layers.
- Phase C: Add multipage tree and global region stitching.
- Phase D: Implement vendor-neutral adapter interfaces and one initial adapter.
- Phase E: Implement merge-back engine with conflict classes and safety gates.
- Phase F: Generate draft CMS schemas/forms from canonical content inventory.

## 16) Risks / open questions
- Confidence calibration: thresholds for automatic merge acceptance need empirical tuning.
- Partial crawl ambiguity: missing pages may lead to false global-region inference.
- Rich-text fidelity: balancing deterministic normalization vs preserving author intent.
- Reusable pattern detection quality: deterministic signatures can under-cluster semantically similar blocks.
- Vendor response variability: adapters must normalize inconsistent payload quality.

## 17) Recommendation
Adopt canonical structure/content/style contracts immediately as the product truth boundary, keep HTML and React as downstream artifacts, and implement merge-back with strict authority split (content-import authority, design-presentation authority, structure-mediated mapping). This gives GNR8 a safe and extensible path from import fidelity to external redesign and future CMS generation.
