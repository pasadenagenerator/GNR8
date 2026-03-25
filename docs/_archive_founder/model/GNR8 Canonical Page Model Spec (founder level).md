GNR8 Canonical Page Model Spec (founder level)

1. Purpose

This document defines the one authoritative internal representation of a website/page inside GNR8 V1.

It makes explicit:
- what a Site is
- what a Page is
- what a version is
- what migration creates
- what AI reads/writes
- what rendering consumes

This spec is the system ontology for model-state.

2. Why This Exists

Without one canonical model:
- migration output diverges from AI input
- AI output diverges from runtime input
- preview diverges from publish
- approvals lose meaning
- versioning loses trust

Canonical model is the lingua franca between migration, AI, operator workflows, and execution.

3. Explicit Non-Sources of Truth

The following are explicitly not source of truth in GNR8:
- raw HTML
- builder JSON
- runtime-rendered output
- ad-hoc page blobs
- mutable editor/view state

They may exist as inputs, artifacts, or diagnostics. They are never authoritative state.

4. Canonical Ontology (V1)

GNR8 V1 standardizes on this ontology:
- Site
- SiteVersion
- Page
- PageVersion
- Structure Model
- Content Model
- Style Tokens
- Asset Graph
- Semantic Signals
- Runtime Directives

Everything else maps to or derives from this ontology.

5. Site

Site is the stable brand/web property boundary.

Site defines:
- domain and routing ownership scope
- design system scope
- analytics and learning boundary
- AI reasoning boundary

Site identity is stable over redesigns, migrations, and model evolution.

6. SiteVersion

SiteVersion is an immutable, versioned snapshot of site-level state.

SiteVersion:
- references a consistent set of PageVersions
- captures draft/candidate/published lifecycle state
- supports diff, audit, approval, and rollback

SiteVersion is publishable state, not runtime output.

SiteVersion defines the atomic publish boundary for a site.

While PageVersion is the primary unit of change and evolution, SiteVersion is the primary unit of coordinated release, rollback, and public runtime consistency.

No public publish operation may partially apply PageVersions outside a SiteVersion boundary.

7. Page

Page is the stable identity for a route-level experience over time.

Page has stable identity (PageID) across:
- redesign
- migration
- AI transformation
- content rewrites

A Page is not a static file or one-time render; it is a version stream.

8. PageVersion

PageVersion is an immutable, reproducible, renderable snapshot of page state.

PageVersion contains:
- Structure Model
- Content Model
- Style Tokens
- Asset Graph
- Semantic Signals
- Runtime Directives

PageVersion is the canonical unit for AI change, operator approval, rendering input resolution, and audit history.

9. Source of Truth Rule

Canonical source of truth for a site in GNR8 is:
- Site + SiteVersion + Page + PageVersion (with the six model layers)

Authoritative state lives in structured, queryable, diffable model storage.

Runtime artifacts, HTML, and exports are outputs of this state, never replacements for it.

10. Structure Model

Structure Model is the semantic layout skeleton.

It defines:
- layout hierarchy (sections, containers, grids, stacks, blocks)
- composition and placement relationships
- responsive/visibility layout behavior

It is not pixel replay and not a DOM clone.

11. Content Model

Content Model is typed, structured, locale-aware content mapped to semantic roles.

It defines:
- headings, text, lists, labels, CTA fields, form fields
- metadata fields needed for SEO/runtime output
- content meaning independent of raw markup

AI and humans edit structured fields, not raw HTML blobs.

12. Style Tokens

Style is represented by tokenized design intent, not CSS dumps.

Style Tokens include:
- brand tokens (color, typography, spacing, radius, shadows)
- component-level style contracts
- layout rhythm primitives

This preserves redesignability and deterministic rendering across versions.

13. Asset Graph

Assets are modeled as first-class entities in a graph, not loose URLs.

Asset Graph supports:
- stable asset identity and source provenance
- variants/optimization metadata
- usage mapping across pages/nodes
- semantic role tagging (logo, hero, gallery, icon, decorative)

This enables deterministic asset resolution and AI-aware reuse.

14. Semantic Signals

Semantic Signals are structured, non-LLM-ephemeral signals about meaning and intent.

They include:
- intent and conversion goals
- industry/business context hints
- hierarchy/trust/UX pattern signals
- quality or confidence markers where relevant

Semantic Signals power explainable AI decisions and meaningful operator diffs.

15. Runtime Directives

Runtime Directives capture execution intent that is not core content.

Examples:
- hydration policy
- animation policy
- personalization hooks
- experiment flags
- preview/draft indicators

They belong in PageVersion as explicit runtime contract inputs.

Runtime Directives must remain strictly bounded to execution behavior and must not evolve into an unstructured feature container.

Any new directive category must be explicitly classified as execution-level (not content, structure, or style) and must preserve deterministic render guarantees.

16. Migration Output Contract

Migration does not produce canonical HTML clones.

Migration must produce canonical model state:
- Site + initial SiteVersion context
- Page identities
- first PageVersion per migrated page
- extracted Structure Model
- extracted Content Model
- baseline Style Tokens
- Asset Graph entries and usage links
- initial Semantic Signals (with confidence where available)
- Runtime Directives only when inferable and safe

Migration is canonicalization, not replay.

17. AI Transformation Contract

AI operates on canonical model state only.

AI reads:
- Site/SiteVersion/Page/PageVersion and associated layers

AI writes:
- new PageVersion and/or new SiteVersion deltas

AI does not write:
- DOM patches
- CSS patch blobs
- runtime artifact mutations
- builder-schema diffs as source of truth

Core rule: AI performs version-to-version evolution, not runtime-time mutation.

18. Manual Editing Contract

Manual/operator editing modifies the same canonical model layers.

Manual edits never target runtime output as authoritative state.

This keeps human and AI changes in one diff/audit system.

19. Rendering Boundary Contract (Model -> Render)

Rendering consumes canonical model inputs, not builder/runtime state.

Minimum render input contract:
- SiteID
- PageVersionID (or SiteVersion + Page resolution)
- RenderMode (preview/publish/validation) [1]
- RuntimeFlags

Renderer resolves from PageVersion layers:
- Structure Model -> render tree
- Content Model -> content bindings
- Style Tokens -> deterministic style output
- Asset Graph -> resolved asset references
- Runtime Directives -> execution behavior

20. Deterministic Execution Rule

For the same PageVersion + same flags, renderer must produce the same effective result.

Not allowed:
- AI/content inference at request time
- random layout/content drift
- source-of-truth mutation during render

Allowed mode differences are limited to safe overlays/instrumentation (for preview or diagnostics), not content/layout truth.

21. Preview/Publish Parity Rule

Preview and Publish must share the same canonical rendering contract and engine behavior.

Rule:
- Preview is publish-equivalent rendering under safe non-authoritative flags.

If preview diverges from publish output semantics, approval trust collapses.

22. Diff and Approval Unit

Approvals operate on model deltas:
- structural diff
- content diff
- style-token diff
- semantic-signal diff
- runtime-directive diff

Primary approval unit is PageVersion/SiteVersion change, not code diff.

23. Completion Criteria for Model Integrity

The canonical model is considered complete for a page/site when:
- the experience can be rendered deterministically from model layers
- AI can reason and evolve without raw HTML dependency
- migration consistently outputs model state
- publish consistently consumes model state
- history, diff, and rollback are version-native

A canonical model implementation is considered architecturally stable only if the same Site identity can survive migration, repeated AI-driven evolution, and multiple publish lifecycles without requiring ontology changes or runtime-specific reinterpretation.

24. Founder Directive

Canonical Page Model is GNR8 core IP.

If canonical model is not absolute center:
- migration becomes a dead-end scraper
- AI becomes prompt theater
- runtime becomes fragile glue
- approvals become cosmetic

If canonical model is absolute center:
- GNR8 has one durable ontology
- one trusted source of truth
- one execution boundary
- one compounding intelligence loop

Any proposal that introduces alternative authoritative representations of site state must be treated as an architectural risk and requires explicit founder-level review.

[1] Execution mode and lifecycle enums are normatively defined in GNR8 Minimal Runtime Protocol Appendix.
