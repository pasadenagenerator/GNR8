GNR8 Public Runtime & Publish Model Spec (founder level)

1. Purpose

This document defines the single authoritative runtime and publish truth for GNR8 V1.

It makes explicit:
- what runs publicly
- what is versioned
- what is previewed
- what is published
- what rollback switches
- where static delivery ends and controlled dynamic behavior begins

This is the production execution contract for V1.

2. V1 Runtime Decision (Locked)

GNR8 V1 is static-first public runtime with working forms.

Meaning:
- canonical source of truth remains structured model and versions
- public delivery format is a versioned static artifact
- preview and publish converge on that artifact model
- controlled dynamic bridges are allowed (including forms)
- full managed dynamic runtime is not V1 architecture truth

3. Foundational Principle

GNR8 is not a builder runtime.

GNR8 public serving does not execute builder JSON or builder-native runtime state.

GNR8 is a structured model -> deterministic artifact -> version activation system.

4. Canonical Source of Truth

Authoritative state is:
- Site
- SiteVersion (immutable)
- PageVersion set within the SiteVersion
- structured model layers (structure/content/style tokens/assets/semantic/runtime directives)

Not source of truth:
- raw HTML
- builder JSON
- runtime-rendered output
- ad-hoc blobs

Artifacts are outputs of canonical state, never replacements for it.

5. Public Delivery Unit

Public delivery unit in V1 is:
- versioned static artifact bundle tied to a SiteVersion

Artifact bundle conceptually includes:
- static HTML outputs
- compiled token-derived styling
- asset map and fingerprinted references
- manifest metadata required for deterministic serving
- minimal runtime JS only where required by controlled bridges

6. SiteVersion Runtime Model

SiteVersion is immutable and site-wide.

Lifecycle states:
- DRAFT
- READY_FOR_REVIEW
- APPROVED
- PUBLISHED
- ARCHIVED
- ROLLED_BACK_REFERENCE

Lifecycle state definitions are normatively defined in GNR8 Minimal Runtime Protocol Appendix.

Core rule:
- system never mutates live site state directly
- live is an active pointer to a published SiteVersion and its artifact

7. Rendering to Artifact Contract

Renderer consumes canonical versioned model state and produces deployable artifact output.

Render input contract (minimum):
- SiteID
- SiteVersionID (optionally PageVersion scope for diagnostics/preview focus)
- RenderMode (preview/publish/validation)
- RuntimeFlags

Renderer responsibilities:
- resolve structured page/site model deterministically
- resolve content bindings without generating new content at request time
- resolve style tokens into deterministic style output
- resolve asset graph into fingerprinted references
- apply runtime directives as explicit execution behavior

Renderer is execution layer, not source-of-truth layer.

8. Deterministic Output Guarantee

For the same SiteVersion/PageVersion + same flags, output must be equivalent.

Not allowed:
- AI inference during public request rendering
- random layout/content drift
- source-of-truth mutation during render

Allowed differences by mode are limited to safe overlays/instrumentation, never semantic content/layout divergence.

9. Preview Model

Preview is real rendering of a specific version using the same artifact contract as publish.

Rule:
- Preview = publish-equivalent artifact behavior under safe flags (auth/noindex/diagnostic overlays).

Preview is not:
- builder preview
- alternate rendering pipeline
- migration HTML replay

10. Publish Model

Publish means activation of a new SiteVersion and its artifact.

Publish flow:
1. Candidate SiteVersion is finalized.
2. Artifact bundle is generated/validated.
3. Required approvals pass.
4. Domain/runtime active pointer switches to this version/artifact.
5. Caches/propagation are refreshed.

Publish is version activation, not live mutation.

11. Rollback Model

Rollback is pointer reassignment to a previously published SiteVersion/artifact.

Rollback is:
- instant switch
- no rebuild-from-scratch requirement
- deterministic recovery path

Rollback is not undo/patch of live mutable state.

12. Domain and Active Pointer Semantics

Domain binding resolves to active SiteVersion/artifact for that site.

This enables:
- atomic publish swaps
- instant rollback
- version-scoped preview URLs

Operational truth:
- production domain points to active published version
- preview endpoints point to explicit non-production version references

13. Static-First Dynamic Boundary (V1)

13.1 What is static in V1
- page markup output
- token-resolved styling output
- asset references and manifests
- version identity and routing resolution

13.2 Controlled dynamic bridges allowed in V1
- forms submission/processing bridge
- analytics/event ingestion hooks
- constrained embeds and limited personalization hooks where explicitly modeled

13.3 Out of scope for V1
- full managed dynamic app runtime
- arbitrary per-block server execution
- open-ended custom JS builder runtime model
- dynamic-first request-time page composition as architecture default

14. Forms in V1 (Conceptual Contract)

Forms are first-class V1 capability via controlled dynamic bridge.

Conceptual model:
- form structure and fields remain in canonical model/version
- public page is still delivered via static-first artifact
- submission flows through controlled runtime endpoint/bridge
- validation/safety policy applies before accepting and routing submission

Forms do not reclassify V1 into full dynamic runtime.

14.1 Forms Execution Boundary Rule

Forms execution must not mutate canonical model state at request time.

Submission handling:
- must execute through controlled runtime endpoints
- must produce external side effects (notifications, CRM routing, storage, workflows)
- must not alter PageVersion, SiteVersion, or canonical model layers directly

Any model-impacting change derived from form data must flow through:
- explicit operator workflow
- or future governed AI transformation cycle

Forms are runtime interactions, not implicit content-editing mechanisms.

15. Publish Safety and Validation Gate

Publish must fail closed on critical issues.

Minimum gate checks:
- render integrity
- required asset completeness
- structural validity
- required approvals present

High-risk changes remain policy-gated in V1.

16. Version Diff and Auditability

Every publishable version must support:
- structural/content/style/asset/runtime-directive diffability
- actor/provenance metadata (human/AI/migration)
- activation timeline and rollback history

This is required for agency trust and operator control.

17. Performance and Serving Expectations (V1)

V1 serving priorities:
- edge/cache friendliness
- predictable response behavior
- minimal runtime execution overhead
- no heavy builder-client runtime dependency

Performance is achieved through deterministic static-first artifacts, not dynamic complexity.

18. ChaiBuilder Architectural Position

ChaiBuilder is legacy/transitional input context, not runtime truth.

V1 runtime truth is:
- canonical structured model
- GNR8 render-to-artifact pipeline
- SiteVersion activation and pointer switching

Any builder-origin data is migrated/transformed, never executed as authoritative runtime state.

19. Relationship to Other Systems

Migration:
- creates draft canonical versions; does not directly publish live

AI:
- operates on draft/versioned model state; does not bypass publish gate in V1

Runtime:
- serves approved published artifacts and controlled bridges

20. Runtime Completion Criteria (V1)

Runtime/publish model is complete when:
- public sites run from versioned static artifacts generated from canonical model
- preview and publish are parity-equivalent under safe flags
- publish is atomic version+artifact activation
- rollback is pointer switch to prior version/artifact
- forms work via controlled bridges without requiring full dynamic runtime
- builder runtime dependency is eliminated from production truth

21. Founder Directive

Public runtime and publish model must be boring, deterministic, safe, and fast.

If this layer is ambiguous, AI, migration, and agency operations lose trust.

If this layer is crisp, the whole system compounds.
