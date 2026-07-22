# GNR8 MVP-1 Boundary Closeout

MVP-1 is a documentation and architecture phase only. No runtime behavior, APIs, database schemas, migrations, provider payload construction, billing/Stripe behavior, DNS/domain behavior, publishing behavior, rollback behavior, thumbnails, Generated Proposal Bundles, Workspace runtime behavior, or Evolution runtime behavior were intentionally changed.

## Files Reviewed

Required STRAT-1/CAP-1/current-state evidence reviewed:

- `docs/product/gnr8-current-capability-inventory.md`
- `docs/product/gnr8-operator-capability-map.md`
- `docs/architecture/gnr8-technical-capability-map.md`
- `docs/product/gnr8-mvp-readiness-map.md`
- `docs/product/gnr8-capability-inventory-closeout.md`
- `docs/product/future-gnr8-north-star.md`
- `docs/product/future-gnr8-mvp-bridge.md`
- `docs/architecture/future-gnr8-platform-pillars.md`
- `docs/product/future-gnr8-competitive-positioning.md`
- `docs/product/future-gnr8-strategy-closeout.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Implementation ownership evidence was inspected read-only in these areas:

- `apps/platform/gnr8/migration-factory/**`
- `apps/platform/gnr8/runtime/**`
- `apps/platform/gnr8/command-center/**`
- `apps/platform/gnr8/billing/**`
- `apps/platform/gnr8/architecture/**`
- `apps/platform/src/lib/vercel/**`
- `apps/platform/app/api/gnr8/**`
- `apps/worker/gnr8/**`
- `packages/core/src/modules/**`
- `packages/data/src/repositories/**`
- `apps/platform/supabase/migrations/**`

## Files Created Or Changed

Created:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

Changed:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` was updated with an MVP-1 canonical boundary section.

## STRAT-1 Repository Status

The STRAT-1 files were present and `git status --short -- <required files>` returned no modified or untracked entries for them at the start of MVP-1. They were not committed.

STRAT-1 files verified:

- `docs/product/future-gnr8-north-star.md`
- `docs/product/future-gnr8-mvp-bridge.md`
- `docs/architecture/future-gnr8-platform-pillars.md`
- `docs/product/future-gnr8-competitive-positioning.md`
- `docs/product/future-gnr8-strategy-closeout.md`

## MVP Definition

GNR8 MVP is an operator-assisted migration factory and website operations backbone for static or mostly static public websites, designed to migrate and operate approximately 200 existing websites with deterministic workflows, auditability, clear source-of-truth boundaries, and controlled human approvals.

The MVP is migration-first, operator-assisted, portfolio-aware, deterministic where possible, audit-focused, safe for client/domain/publish operations, designed for the internal 200-site migration first, and compatible with later agency adoption.

The MVP is not full Future GNR8, autonomous AI regeneration, a full DXP, a visual website builder, full DNS registrar automation, a full Stripe/customer billing product, a full agency marketplace, a general automation platform, or an autonomous AI operator.

## Supported Site Classes Summary

Supported for MVP:

- Static brochure websites.
- Mostly static multi-page websites.
- Small business service websites.

Supported with manual review:

- Sites with forms.
- Sites with embedded maps/widgets.
- Sites with external scripts.
- WordPress sites as public/static source surfaces.
- Webflow sites as public/static source surfaces.
- Wix/Squarespace sites when static enough.
- Multilingual sites when route/language coverage is manageable.
- Blogs/news sites when static/archive-oriented.
- Sites with complex SEO redirect histories when reviewed.

Importable but not launch-ready:

- Booking/reservation sites unless external flow is verified.
- Dynamic listing/catalog sites unless accepted as static snapshots.
- Sites with heavy JavaScript rendering unless preview fidelity is proven.

Out of scope for MVP:

- Shopify or commerce sites.
- Authenticated/member sites.
- Sites with custom backend functionality.
- Sites with payment flows.
- Sites requiring legal/compliance workflows unless separately approved.

## Capability Boundary Summary

Required for MVP:

- Client-scoped import, bulk intake design, rendered capture, raw HTML fallback, static import, multi-page discovery, migration batches, batch pause/resume, retry/replay, failure recovery, Command Center, Ops Inbox, content slots, draft/published overrides, content rollback, preview runtime, public runtime, publish activation, rollback, domain binding/DNS instructions/Vercel verification if custom domains launch, and client approval.

Strongly recommended for MVP:

- Batch dry-run, WU/VCU projections, Knowledge Workspace drilldown, thumbnails as presentation-only, cost visibility, minimal client portal review, reporting/account management, external workflow references, AI read-only inspection/summarization.

Design-only before MVP:

- AI recommendation/planning, external workflow reference model, approval persistence model, replay bundle model.

Explicitly deferred after MVP:

- Full Stripe/customer billing, full external integrations, Digital Business Twin productization, advisory layer, regeneration/evolution, provider payload generation as operational workflow.

Forbidden before explicit ADR:

- AI execution, provider execution, Openprovider/live DNS or registrar mutation, AI-driven publish, AI-driven DNS mutation.

## Source-Of-Truth Matrix Summary

The canonical MVP authority is:

- Agency/client/user/site identity: Postgres ownership/auth/membership tables and agency/site modules.
- Migration jobs/batches/stages: `gnr8_migration_jobs`, stage/event tables, `gnr8_migration_batches`, batch job/event tables.
- Runtime serving: runtime site versions, runtime artifacts, raw template artifacts, active pointer/publish activation state, published overrides.
- Review projections: WU, VCU, Knowledge Workspace, thumbnails, Generated Proposal Bundles are projections/review/presentation artifacts, not production truth.
- Domain/DNS: GNR8 domain host bindings and DNS instruction snapshots are MVP operational records; registrar/DNS providers remain external systems of record.
- Billing/cost: cost events are append-only operational visibility; Stripe/customer billing remains external/partial and not a full MVP product.
- AI/provider bundles: immutable review-only artifacts, forbidden as source of runtime truth in MVP.

Known high-priority ambiguities:

- Approval state needs a canonical MVP persistence model.
- Active pointer/publish event authority should be documented against exact runtime fields before publish implementation changes.
- Source capture/rendered DOM/screenshot artifacts are partly represented through provenance and worker records; a uniform artifact registry decision is needed.
- External workflow references need a minimal source-of-truth model before integration work.

## Operational State Model Summary

The MVP state model defines:

- `intake_created`
- `import_pending`
- `import_running`
- `import_succeeded`
- `import_failed`
- `capture_degraded`
- `review_pending`
- `review_blocked`
- `preview_ready`
- `content_changes_requested`
- `approval_pending`
- `approved_for_launch`
- `domain_pending`
- `domain_ready`
- `publish_ready`
- `published`
- `publish_failed`
- `rollback_available`
- `rollback_required`
- `incident_open`
- `incident_resolved`
- `archived_decommissioned`

Each state has defined transitions, prohibited transitions, evidence, operator action, approval, audit event, source-of-truth fields/artifacts, Command Center representation, and Ops Inbox representation.

## Approval Boundary Summary

MVP approval gates exist for:

- Migration batch start.
- Failed site retry.
- Unsupported site-class exception.
- Content change.
- Client review.
- Launch approval.
- Publish activation.
- Rollback.
- Domain/DNS change.
- AI-generated plan acceptance.
- Billing/cost exception.

Post-MVP or deferred approvals include:

- External workflow mutation.
- AI-generated content acceptance beyond manual human review.
- Provider/DNS/billing mutations.

No approval may be implied by AI output, UI state, preview availability, or generated artifacts.

## DNS/Domain Boundary Summary

MVP may support:

- Domain binding records for GNR8 runtime.
- Vercel domain attachment/checks where current code supports them.
- Manual DNS instruction workflows.
- DNS verification/readiness display.
- SSL/readiness display when available.
- Openprovider availability/inventory as read-only evidence.

MVP must not claim:

- Full registrar automation.
- Full DNS-zone mutation.
- Openprovider live write execution.
- AI-driven DNS mutation.

Live provider DNS mutation remains deferred until an explicit ADR approves it.

## Publish/Rollback Boundary Summary

Publish means an approved runtime site version/artifact plus approved content state becomes active in the public runtime through publish activation/active pointer state. Publish requires launch approval, technical readiness, domain readiness or exception, rollback plan, and audit.

Rollback means switching to a previous known-good version or reverting published content overrides. Rollback requires incident/reason evidence, approved target, before/after state, and audit. AI must not publish, rollback, or select rollback targets autonomously.

## Audit/Replay/Failure Recovery Minimum

Minimum audit events are defined for site intake, import, capture degradation, batch lifecycle, retry/replay, preview, review, content change/publish, approval grant/reject, domain checks, publish, rollback, incidents, cost anomalies, external workflow links, and AI plan generation if applicable.

Replayable in MVP:

- Source URL normalization.
- Static/raw import.
- Multi-page discovery.
- Deterministic projections.
- Preview generation.

Replayable with external variance:

- Rendered capture.

Manually repeatable only:

- Manual content review.
- Vercel/domain checks.

Not replayable as side effects:

- Client approvals.
- Publish activation.
- Rollback.
- Provider execution.

Failure recovery categories cover intake errors, source/network failures, degraded capture, unsupported functionality, artifact/readiness failures, domain verification failures, publish failures, and cost anomalies.

## Command Center/Ops Inbox Requirements

Command Center is the primary MVP operator surface.

Required Command Center views:

- Portfolio overview.
- Migration batch overview.
- Site-level migration detail.
- Failed site triage.
- Domain readiness.
- Publish readiness.
- Approval queue.
- Cost visibility.
- Incidents/recovery.
- Replay/runbook links.

Required Ops Inbox work item taxonomy:

- Intake blocked.
- Import failed.
- Capture degraded.
- Unsupported site class.
- Review needed.
- Content change requested.
- Approval needed.
- Domain action needed.
- Publish ready.
- Publish failed.
- Rollback needed.
- Incident open.
- Cost anomaly.
- External workflow update.
- AI plan review, if applicable.

Ops Inbox is derived from canonical state and must not become a separate source of truth.

## Explicit Deferrals

Deferred after MVP:

- Autonomous regeneration.
- Full Digital Business Twin productization.
- Full Stripe/customer billing.
- Full registrar/DNS automation.
- Full external integration marketplace.
- Full agency marketplace.
- Autonomous AI execution.
- AI-driven publish.
- AI-driven DNS mutation.
- Provider execution.
- Large visual builder investment.
- Full enterprise DXP features.

Resume conditions and ADR requirements are documented in `docs/product/gnr8-mvp-boundary.md`.

## Recommended Next Milestone

Bulk Migration Factory Design should be next.

Recommended scope:

- Bulk intake format.
- Batch dry-run contract.
- Batch state machine.
- Batch pause/resume semantics.
- Retry/replay rules.
- Failure recovery runbooks.
- Command Center/Ops Inbox read model inputs.
- Audit event contract.

Do not implement the Bulk Migration Factory until architectural review explicitly approves MVP-1.

## Architecture Warnings Or Objections

1. The repository has real publish activation and Vercel domain capabilities, but MVP must not overclaim full publish automation, full DNS automation, or registrar control.
2. The bootstrap/current-state docs contain historical "NO live DNS" style wording while CAP-1 found Vercel domain attachment/check code. A separate documentation reconciliation task should update bootstrap wording without weakening the no-registrar/no-provider-execution boundary.
3. Approval persistence is the largest unresolved implementation dependency before governed publish/rollback/client review.
4. Generated Proposal Bundles, WU/VCU, thumbnails, DBT, provider payloads, and AI plans must stay review-only unless a future ADR changes authority.
5. Command Center must become the primary operator workbench before 200-site implementation, with Knowledge Workspace and admin pages as drilldowns.

## Validation Performed

Repository checks performed:

- Verified required STRAT-1/CAP-1/current-state docs exist.
- Checked STRAT-1 required file status with `git status --short -- <required files>`.
- Inspected canonical documentation index/bootstrap.
- Inspected implementation ownership paths read-only.
- Created only Markdown documentation files and updated one Markdown documentation index.
- Reviewed final diff/status to confirm no runtime code, APIs, migrations, billing/Stripe code, DNS/domain code, provider code, publish/rollback code, thumbnail code, Generated Proposal Bundle code, Workspace runtime code, or Evolution runtime code was modified.

## MVP-1 Completion Statement

MVP-1 documentation and architecture work is complete. Further implementation must wait for architectural review and explicit approval.
