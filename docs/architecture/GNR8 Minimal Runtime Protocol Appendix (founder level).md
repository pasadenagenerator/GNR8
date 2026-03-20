GNR8 Minimal Runtime Protocol Appendix (founder level)

1. Purpose

This appendix defines a minimal, authoritative runtime protocol layer for GNR8 V1.

It is normative for:
- execution mode semantics
- SiteVersion lifecycle semantics
- artifact identity contract

It does not define:
- orchestration frameworks
- event bus architecture
- infra/deployment topology
- component registry formalization
- AI governance layers

2. ExecutionMode (Normative Enum)

ExecutionMode =
- PREVIEW
- PUBLISH_RENDER
- VALIDATION

2.1 PREVIEW
- render under non-authoritative flags
- may include overlays, auth gates, and diagnostics
- must remain semantically publish-equivalent

2.2 PUBLISH_RENDER
- render for artifact generation tied to SiteVersion activation
- must fail closed on critical integrity issues

2.3 VALIDATION
- render for structural integrity and migration quality checks
- may allow broader diagnostics instrumentation

ExecutionMode is authoritative for:
- Rendering Engine Spec
- Public Runtime & Publish Model Spec
- migration pipeline execution layers

3. SiteVersionLifecycleState (Normative Enum)

SiteVersionLifecycleState =
- DRAFT
- READY_FOR_REVIEW
- APPROVED
- PUBLISHED
- ARCHIVED

Optional reference state concept:
- ROLLED_BACK_TO (pointer reference concept, not an independent lifecycle state)

Rules:
- lifecycle applies to SiteVersion, not PageVersion individually
- publish always activates a SiteVersion
- rollback always points to a previously PUBLISHED SiteVersion

4. Artifact Identity Contract (Conceptual)

Artifact =
- deterministic render output bound to:
  - SiteID
  - SiteVersionID
  - RendererCompatibilityVersion
- immutable after generation
- addressable for preview and publish activation

Artifact identity must support:
- atomic publish switching
- deterministic rollback
- preview addressing without mutating canonical state

Non-goals (explicitly not defined here):
- CDN topology
- storage provider
- bucket layout
- edge execution specifics

5. Normative Usage

- Rendering Engine Spec must treat `ExecutionMode` enum as authoritative.
- Public Runtime Spec must treat `SiteVersionLifecycleState` as authoritative.
- Canonical Page Model Spec must not redefine lifecycle or execution modes.

No duplication of ontology or publish semantics is allowed across these specs.
