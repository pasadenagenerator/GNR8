# GNR8 MVP-1 Boundary Closeout

MVP-1 is complete as a documentation and architecture phase. No runtime behavior, APIs, route handlers, schemas, migrations, provider execution, billing/Stripe behavior, DNS/domain behavior, publish/rollback implementation, thumbnail implementation, Generated Proposal Bundle runtime, Workspace runtime, Evolution runtime, AI execution, or deployment configuration was intentionally changed.

## Documents Created Or Updated

Updated canonical MVP-1 documents:

- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

Canonical index status:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` exists and already references the five MVP-1 documents. It did not require unrelated rewrites for this closeout.

## Evidence Reviewed

STRAT-1 baseline reviewed:

- `docs/product/future-gnr8-north-star.md`
- `docs/product/future-gnr8-mvp-bridge.md`
- `docs/architecture/future-gnr8-platform-pillars.md`
- `docs/product/future-gnr8-competitive-positioning.md`
- `docs/product/future-gnr8-strategy-closeout.md`

CAP-1/current-state evidence reviewed:

- `docs/product/gnr8-current-capability-inventory.md`
- `docs/product/gnr8-operator-capability-map.md`
- `docs/architecture/gnr8-technical-capability-map.md`
- `docs/product/gnr8-mvp-readiness-map.md`
- `docs/product/gnr8-capability-inventory-closeout.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Implementation evidence was inspected read-only across ownership/auth, scoped import, static/multi-page import, rendered capture, migration jobs/batches, runtime artifacts, public serving, content slots/overrides, publish activation, rollback primitives, Vercel domains, Openprovider/provider boundaries, Command Center, cost/billing, audit/event foundations, and AI/provider surfaces.

Representative paths inspected:

- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/import/**`
- `apps/platform/gnr8/multipage-import/**`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/platform/gnr8/migration-factory/**`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/src/public-site/**`
- `apps/platform/gnr8/runtime/content-binding.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/**`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- `apps/platform/gnr8/runtime/providers/openprovider/**`
- `apps/platform/app/gnr8/command-center/**`
- `apps/platform/gnr8/billing/**`
- `packages/core/src/modules/billing/**`
- `packages/core/src/modules/audit-log/**`
- `apps/platform/app/api/gnr8/ai/**`
- `apps/platform/supabase/migrations/**`

## STRAT-1 Verification Status

All five required STRAT-1 files are present and tracked. Targeted `git status --short -- <STRAT-1 files>` returned no modified or untracked entries for those files during verification.

STRAT-1 confirms the strategic north star is Future GNR8 as an AI-native website operations layer for portfolios, while the practical MVP is migration-first, operator-assisted, deterministic, auditable, approval-gated, and constrained to static or mostly static public websites.

## Final MVP Definition

GNR8 MVP is an operator-assisted migration factory and website operations backbone for static or mostly static public websites, designed to migrate and operate approximately 200 existing websites with deterministic workflows, explicit source-of-truth boundaries, auditability, recovery paths, and controlled human approvals.

## Supported Site Classes Summary

Supported in the normal MVP wave:

- simple static brochure sites;
- mostly static multi-page business websites;
- small service business websites.

Supported with manual review:

- public marketing sites with forms;
- embedded widgets;
- WordPress public/static surfaces;
- Webflow/Wix/Squarespace public/static surfaces;
- multilingual sites;
- small/static blogs/news archives;
- third-party booking/reservation flows that remain external and pass testing;
- complex SEO migrations with redirect/runbook review.

Import-only:

- heavy JavaScript public sites unless fidelity is proven;
- unknown/damaged source states;
- dynamic listing/catalog sites unless accepted as static snapshots.

Out of scope or deferred:

- ecommerce;
- member/authenticated sites;
- custom backend applications;
- payment flows;
- compliance-heavy sites without separate legal/compliance approval.

## Source-Of-Truth Conclusions

Runtime production truth is active pointer, site version, runtime artifact, and published override state.

Canonical MVP state lives in ownership/auth records, site records, migration jobs/batches/stages/events, runtime site versions/artifacts/raw artifacts, active pointers, content slots/overrides/history, domain host bindings, approval records/events, audit events, incident/recovery events, and cost events.

Review and presentation surfaces are non-authoritative: Website Understanding, Source Content and Visual Continuity, Website Version Thumbnails, Generated Proposal Bundles, Knowledge Workspace, Generation Evolution, previews, Command Center read models, Ops Inbox items, AI/provider outputs, billing dashboards, and external workflow snapshots.

External systems remain authoritative for their own domains: Vercel for Vercel project/domain state, registrars/DNS providers for registrar/DNS truth, Stripe for Stripe billing truth, CMSs for source CMS state, booking/commerce systems for transactional workflows, and external project/CRM/support tools for their records unless a future ADR changes ownership.

## Operational State Conclusions

The MVP state model uses these canonical site states:

- `intake_created`
- `intake_validated`
- `intake_blocked`
- `import_queued`
- `import_running`
- `import_failed`
- `import_completed_with_warnings`
- `import_completed`
- `preview_ready`
- `review_pending`
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
- `rollback_completed`
- `incident_open`
- `incident_resolved`
- `archived_decommissioned`

The model also defines batch-level states, failure states, recovery states, prohibited shortcuts, approval gates, publish gates, rollback gates, domain gates, Command Center projection requirements, and Ops Inbox taxonomy.

## Explicit Deferrals

Deferred or forbidden before later ADR/design:

- autonomous migration;
- autonomous regeneration/evolution;
- full Digital Business Twin productization;
- full Stripe/customer billing;
- full registrar/DNS automation;
- Openprovider/live provider mutation;
- full external integration marketplace;
- full agency marketplace;
- fully autonomous AI operator execution;
- AI-driven publish, rollback, DNS, billing, provider, or external-workflow mutation;
- full visual website builder;
- commerce/auth/payment/custom-backend migration;
- treating generated artifacts, projections, thumbnails, or AI outputs as runtime truth.

## Required Architecture Decisions Before Implementation

1. Canonical MVP approval persistence model.
2. Unified audit event taxonomy and event-store strategy.
3. Exact active pointer/publish event authority across runtime store and site publish events.
4. Replay input bundle contract for deterministic stages.
5. Bulk intake format, dry-run contract, batch pause/resume semantics, retries, leases, and heartbeat.
6. Ops Inbox read-model and work-item ownership contract.
7. Domain/DNS stale-status policy and manual DNS completion evidence.
8. Cost threshold/anomaly policy for a 200-site wave.
9. External workflow reference model.
10. AI advisory input/output bundle requirements before any AI-assisted MVP use.

## Risks And Warnings

- The repository has real publish activation and Vercel domain attachment/check foundations, but this must not be stretched into claims of autonomous publish, full DNS automation, or registrar control.
- Approval persistence is the largest blocking architecture decision before governed launch/publish/rollback implementation.
- Command Center must become the primary operator workbench; Workspace/admin pages should remain drilldowns.
- AI/provider outputs, Generated Proposal Bundles, WU/VCU, thumbnails, and Evolution views must stay review-only unless a future approved publish/promotion architecture changes that.
- Heavy JavaScript, commerce, auth, payment, custom backend, and compliance-heavy sites can derail the 200-site wave unless filtered early.

## Recommended Next Milestone

Bulk Migration Factory Design should be next, after architectural review of MVP-1.

Recommended next scope:

- bulk intake format;
- batch dry-run contract;
- batch lifecycle and pause/resume semantics;
- retry/replay rules;
- failure recovery runbooks;
- worker/queue/lease/heartbeat decision;
- Command Center/Ops Inbox read model inputs;
- audit event contract.

Do not proceed into Bulk Migration Factory implementation until the MVP-1 boundary is approved.

## Validation Performed

Documentation validation performed:

- required MVP-1 files exist;
- Markdown files are readable;
- canonical documentation index exists and already references the MVP-1 files;
- required STRAT-1 files exist, are tracked, and had no targeted status changes;
- MVP/non-MVP/future boundaries are explicit;
- supported/deferred/import-only/out-of-scope site classes are explicit;
- source-of-truth matrix includes all requested domains;
- operational state model includes approvals, publish, rollback, domain, incident, and recovery states;
- docs do not claim full autonomous migration, full autonomous AI execution, full registrar/DNS automation, or full Stripe billing as MVP;
- git status was reviewed for changed/untracked files.

## Confirmation

MVP-1 changed Markdown documentation only. No runtime behavior was changed.
