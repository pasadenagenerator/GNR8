# GNR8 Current Capability Inventory

CAP-1 current-state inventory. Repository reviewed on 2026-07-17.

This document is a planning inventory for the MVP goal: GNR8 can migrate, regenerate, manage, and evolve approximately 200 existing websites. The repository is treated as the source of truth. Current documentation is used as evidence only where it is consistent with executable code, tests, schemas, routes, or persisted artifact structures.

## Status Model

- Implemented: current executable code and enough supporting structure exist.
- Partially implemented: meaningful code exists, but the product flow is incomplete, unvalidated at scale, disconnected, or missing important pieces.
- Prepared: architecture, types, contracts, docs, or scaffolding exist, but the capability is not active or complete.
- Documented only: current documentation describes it, but supporting implementation evidence was not found.
- Historical / obsolete: evidence appears only in archived, legacy, deprecated, duplicate, or generated historical material.
- Ambiguous: repository signals exist, but evidence is insufficient to classify confidently.

## Repository Areas Inspected

Application surfaces:
- `apps/platform/app/gnr8/**`
- `apps/platform/app/admin/page.tsx`
- `apps/platform/app/superadmin/**`
- `apps/platform/app/login/page.tsx`
- `apps/platform/app/signup/page.tsx`
- `apps/platform/app/(public)/[[...slug]]/**`

API surfaces:
- `apps/platform/app/api/gnr8/**`
- `apps/platform/app/api/stripe/webhook/route.ts`
- `apps/platform/app/api/auth/**`
- `apps/platform/app/api/superadmin/**`
- `apps/platform/app/api/orgs/**`

Worker/runtime services:
- `apps/worker/gnr8/**`
- `apps/worker/app/api/inngest/route.ts`
- `apps/platform/gnr8/rendered-capture-worker-server/**`
- `apps/platform/gnr8/runtime/**`
- `packages/gnr8-runtime-contracts/src/**`

Generation, import, understanding, continuity, and proposal areas:
- `apps/platform/gnr8/import/**`
- `apps/platform/gnr8/importer/**`
- `apps/platform/gnr8/import-rendered-capture/**`
- `apps/platform/gnr8/import-rendered-capture-worker/**`
- `apps/platform/gnr8/import-semantic/**`
- `apps/platform/gnr8/multipage-import/**`
- `apps/platform/gnr8/migration/**`
- `apps/platform/gnr8/migration-factory/**`
- `apps/platform/gnr8/site/**`
- `apps/platform/gnr8/architecture/**`
- `apps/platform/gnr8/style-signals/**`
- `apps/platform/gnr8/visual-analysis/**`

Workspace, command center, evolution, and review areas:
- `apps/platform/app/gnr8/command-center/**`
- `apps/platform/gnr8/command-center/**`
- `apps/platform/app/gnr8/admin/**`
- `apps/platform/app/gnr8/_components/**`
- `apps/platform/src/workspace/**`

Billing, Stripe, DNS, hosting, deployment, storage, auth, and data:
- `apps/platform/gnr8/billing/**`
- `packages/core/src/modules/billing/**`
- `packages/core/src/modules/superadmin-billing/**`
- `packages/core/src/modules/entitlement/**`
- `packages/data/src/repositories/**`
- `apps/platform/src/lib/vercel/**`
- `apps/platform/gnr8/runtime/dns/**`
- `apps/platform/gnr8/runtime/domains/**`
- `apps/platform/gnr8/runtime/providers/openprovider/**`
- `apps/platform/supabase/migrations/**`
- `apps/platform/src/auth/**`
- `apps/platform/src/superadmin/**`
- `apps/platform/src/public-site/**`

Testing, validation, scripts, and docs:
- `apps/platform/gnr8/validation/**`
- `apps/platform/src/validation-shell/**`
- `scripts/**`
- `package.json`
- `apps/platform/package.json`
- `apps/worker/package.json`
- `docs/ai/**`
- `docs/architecture/**`
- `docs/gnr8/**`
- `apps/platform/docs/**`

## Intentionally Excluded

Excluded as archive, legacy, duplicate, generated, temporary, build output, dependency output, or not current product truth:

- `docs/_archive_legacy/**`
- `docs/_archive_founder/**`
- `apps/platform/supabase/migrations/_legacy_duplicates/**`
- `apps/platform/gnr8/chai-removal/**`
- `node_modules/**`
- `.pnpm-store/**`
- `.next/**`
- `dist-rendered-capture-worker/**`
- `packages/data/dist/**`
- `*.tsbuildinfo`
- `.DS_Store`
- `apps/platform/supabase/.temp/**`
- `apps/platform/gnr8/validation/.out/**`
- `apps/platform/gnr8/validation/beta-runs/**`
- Root generated ODV/export folders such as `ODV_EXPORT/**`, `ODV_REGENERATION_EXPORT_002/**`, `ODV_GENERATED_PROPOSAL_001/**`, and `ODV_GENERATED_PROPOSAL_002/**`, except as historical/generated artifact context when referenced by current closeout docs.
- Root founder-level strategy/spec files named in `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` as archive-level context, not current source of truth.

## Current Documentation Findings

Completed/current milestones supported by current docs:
- WVT-1-CLOSEOUT is documented complete in `docs/ai/GNR8_CURRENT_STATE.md` and `docs/architecture/WEBSITE_VERSION_THUMBNAIL_CLOSEOUT.md`.
- VCU-2 Source Content & Visual Continuity Projection is documented complete in `docs/ai/GNR8_CURRENT_STATE.md` and supported by runtime builder/loader/page code.
- P0 Durable Generated Proposal Preview is documented complete in `docs/ai/GNR8_CURRENT_STATE.md`, `docs/architecture/GENERATED_PROPOSAL_BUNDLE_RUNTIME.md`, and related closeout docs.
- Migration Runtime + Command Center progress is documented through Phase 7F in `docs/ai/MIGRATION_RUNTIME_PROGRESS.md`.
- Deterministic pipeline and immutable artifact principles are accepted in `docs/ai/decisions/ADR-001-deterministic-pipeline.md` and `docs/ai/decisions/ADR-003-runtime-artifact-model.md`.

Planned or prepared milestones:
- `docs/ai/GNR8_CURRENT_STATE.md` recommends a continuity delivery/VCU-3 style design track, but also warns not to implement provider execution, DNS mutation, deployment, publishing, or generation unless separately authorized.
- `docs/ai/GNR8_PROJECT_MAP.md` says provider/DNS execution remains gated and worker provider pickup is not enabled.
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md` says unattended queue/worker orchestration, retry scheduling, leases, heartbeat, and full operator dashboards remain gaps.

Documentation drift and contradictions:
- Some docs state "NO live DNS" and "NO provider execution"; current code now includes Vercel domain add/check flows in `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts` and scheduled domain verification in `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`. This is not Openprovider registrar/DNS write automation, but it is live Vercel domain management.
- Some docs say no publishing/deployment; current code includes publish activation, artifact creation, pointer switching, enforcement, and domain binding activation in `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts` and `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`.
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` warns `apps/platform/gnr8/platform-audits/*.md` and validation notes may be stale; these were used only as secondary context.
- The active codebase contains many AI strategy/orchestration API routes under `apps/platform/app/api/gnr8/ai/**`, but CAP-1 did not find enough evidence that these form a consolidated operator workflow for 200-site migration.

## High-Level Capability State

Operator-facing capabilities are detailed in `docs/product/gnr8-operator-capability-map.md`.

Status counts:
- Implemented: 15
- Partially implemented: 14
- Prepared: 2
- Documented only: 2
- Historical / obsolete: 1
- Ambiguous: 1

Technical/platform capabilities are detailed in `docs/architecture/gnr8-technical-capability-map.md`.

Status counts:
- Implemented: 27
- Partially implemented: 8
- Prepared: 3
- Documented only: 2
- Historical / obsolete: 1
- Ambiguous: 1

## Current Product Shape

GNR8 currently has a real migration control plane and runtime backbone:

- Client-scoped URL import exists and can preallocate deterministic runtime identities, capture public pages, run a scoped import pipeline, materialize runtime versions, link them to client-owned sites, and optionally run multi-page discovery.
- Raw-template public serving, content overrides, content publishing, active pointer publishing, host binding, and public runtime resolution exist.
- A Command Center exists for migration batches and hosting operations. Migration batches are durable and operator-driven, but not unattended queue orchestration.
- Source Website Understanding and Source Content & Visual Continuity exist as read-only deterministic runtime projections over existing artifacts.
- Knowledge Workspace, Generation Evolution Dashboard, durable proposal previews, and private thumbnails exist as superadmin/read-only review surfaces.
- Billing/cost infrastructure exists for cost events, unified cost, margin, pricing simulation, and Stripe subscription webhooks, but a complete operator billing product is not evident.
- DNS/domain capability is split: Vercel custom-domain connection and verification exist; Openprovider is read-only/control-plane/sandbox-oriented, not a live registrar/DNS mutation system.

## Current MVP Implication

The repository is much closer to an operator-assisted migration factory than to a fully autonomous 200-site migration machine. The highest-evidence MVP path is:

1. Use client-scoped import and migration pipeline for source capture and runtime materialization.
2. Use content slots/overrides and public raw-template serving for practical migration fidelity.
3. Use migration batches for durable operator-driven orchestration.
4. Use Command Center and Hosting Operations for visibility.
5. Keep Website Understanding, VCU, WGP, provider payload, proposal bundles, thumbnails, and evolution dashboards as review/governance aids until the MVP boundary explicitly includes regeneration beyond source-site migration.

The biggest gap for 200 websites is not isolated capability existence. It is workflow consolidation, bulk intake, unattended/retryable orchestration, operator dashboards, audit/replay discipline, and clear MVP boundaries around publish, domain, billing, and regeneration.
