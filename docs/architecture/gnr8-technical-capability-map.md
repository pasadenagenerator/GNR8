# GNR8 Technical Capability Map

CAP-1 technical/platform capability inventory. Status values follow `docs/product/gnr8-current-capability-inventory.md`.

## Capability Table

### TECH-01 Monorepo Runtime Structure

Status: Implemented

Technical description: GNR8 is a pnpm monorepo with a Next.js platform app, worker app, shared core/data/runtime-contract packages, and runtime modules under `apps/platform/gnr8`.

Architectural purpose: Separates control plane, worker jobs, shared domain modules, data repositories, and runtime contracts.

Owning paths: `apps/platform`, `apps/worker`, `packages/core`, `packages/data`, `packages/gnr8-runtime-contracts`.

Evidence:
- `package.json`
- `pnpm-workspace.yaml`
- `apps/platform/package.json`
- `apps/worker/package.json`
- `packages/*/package.json`

Limitations: Build/test scripts are fragmented; platform package lacks a top-level `test` script.

Downstream consumers: All platform and worker code.

Determinism/auditability impact: Positive when shared contracts are used consistently.

Enterprise readiness impact: Positive, but needs consistent build/test pipeline.

MVP relevance: Required.

Recommended next action: Standardize validation commands for CAP closeouts.

### TECH-02 Supabase/Postgres Persistence

Status: Implemented

Technical description: Runtime, ownership, billing, templates, provider control plane, domains, migration jobs/batches, and content overrides are backed by Postgres migrations and repository/store modules.

Architectural purpose: Durable state for migration/runtime operations.

Owning paths: `apps/platform/supabase/migrations/**`, `apps/platform/gnr8/runtime/runtime-store.ts`, `packages/data/src/repositories/**`.

Evidence:
- `apps/platform/supabase/migrations/*.sql`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `packages/data/src/repositories/*.ts`

Limitations: `_legacy_duplicates` migrations excluded; CAP-1 did not verify target DB application state.

Downstream consumers: Runtime serving, command center, billing, templates, domains.

Determinism/auditability impact: High.

Enterprise readiness impact: High, assuming migrations are applied and schema drift is controlled.

MVP relevance: Required.

Recommended next action: Run DB readiness verification before 200-site migration.

### TECH-03 Runtime Artifact Store And Active Serving Model

Status: Implemented

Technical description: Runtime store creates site versions, artifacts, raw imported/raw template artifacts, artifact bindings, active pointers, host bindings, content slots, overrides, and publish audit records.

Architectural purpose: Provides deterministic serving and versioned runtime state.

Owning path: `apps/platform/gnr8/runtime/runtime-store.ts`.

Evidence:
- `createSiteVersionFromMigration`, `createArtifact`, `bindArtifactToVersion`, `switchActivePointer`, `resolveActiveArtifactForHostAndPathWithDiagnostics` in `apps/platform/gnr8/runtime/runtime-store.ts`.
- `apps/platform/gnr8/runtime/runtime-store.*.test.ts`.

Limitations: Some advanced artifacts are stored inside `importProvenanceSummary`, which can become implicit mutable state if not governed.

Downstream consumers: Public runtime, preview runtime, publish, imports, workspaces.

Determinism/auditability impact: High, but mutable provenance summary risk remains.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Clarify artifact source-of-truth and immutable append-only rules for provenance summary.

### TECH-04 Deterministic IDs, Hashing, And Pipeline Discipline

Status: Implemented

Technical description: Deterministic ID and stable hashing utilities are used across import, artifacts, bundles, projections, and migration identity.

Architectural purpose: Reproducible artifacts and traceable runs.

Owning paths: `apps/platform/gnr8/runtime/deterministic.ts`, `docs/ai/decisions/ADR-001-deterministic-pipeline.md`.

Evidence:
- `apps/platform/gnr8/runtime/deterministic.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/architecture/*builder.ts`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`

Limitations: Provider/AI outputs remain non-deterministic unless captured as immutable inputs.

Downstream consumers: Import, artifacts, projections, migration batches.

Determinism/auditability impact: High.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Define replay inputs for any AI/provider phases before use.

### TECH-05 Static Site Import Runtime

Status: Implemented

Technical description: Static import reads HTML/assets under a root, normalizes HTML, extracts assets, computes diagnostics, and creates import output.

Architectural purpose: Deterministic file/source import foundation.

Owning path: `apps/platform/gnr8/import/**`.

Evidence:
- `apps/platform/gnr8/import/runtime/import-static-site.ts`
- `apps/platform/gnr8/import/runtime/extract-assets.ts`
- `apps/platform/gnr8/import/runtime/import-static-site.test.ts`

Limitations: Static import only; dynamic/authenticated/commercial sites require additional handling.

Downstream consumers: Scoped import pipeline, validation, runtime artifacts.

Determinism/auditability impact: High.

Enterprise readiness impact: Medium-high.

MVP relevance: Required.

Recommended next action: Keep strict diagnostics and expose import failure categories to operators.

### TECH-06 URL Rendered Capture And Evidence Capture

Status: Implemented

Technical description: URL import can fetch HTML, invoke rendered capture worker/client, persist rendered DOM/screenshot/style evidence, and fall back to raw HTML with diagnostics.

Architectural purpose: Improves fidelity for real websites.

Owning paths: `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`, `apps/platform/gnr8/import-rendered-capture/**`, `apps/platform/gnr8/import-rendered-capture-worker/**`.

Evidence:
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-service.ts`
- `apps/platform/gnr8/import-rendered-capture-worker/**`

Limitations: Browser/worker availability can degrade to raw HTML; no broad capture queue dashboard found.

Downstream consumers: Scoped import, WU, continuity, thumbnails, source evidence.

Determinism/auditability impact: High when artifacts are persisted; lower when fallback occurs.

Enterprise readiness impact: High for migration fidelity.

MVP relevance: Required.

Recommended next action: Track capture success rate per batch.

### TECH-07 Rendered Capture Worker Server

Status: Implemented

Technical description: Dedicated worker server with Playwright/Chromium support and startup hardening exists.

Architectural purpose: Offloads rendered page capture from platform runtime.

Owning paths: `apps/platform/gnr8/rendered-capture-worker-server/**`, `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts`.

Evidence:
- `apps/platform/gnr8/rendered-capture-worker-server/server.ts`
- `apps/platform/gnr8/rendered-capture-worker-server/Dockerfile`
- `apps/platform/gnr8/rendered-capture-worker-server/startup-hardening.test.ts`
- `apps/worker/gnr8/rendered-capture-worker-route-handlers.test.ts`

Limitations: CAP-1 did not verify live deployment health.

Downstream consumers: URL import, evidence capture.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Add production health and capacity checks to Command Center.

### TECH-08 Scoped Import Pipeline

Status: Implemented

Technical description: Pipeline combines URL snapshot, static import, linear migration pipeline, semantic import, style signals, content slot inference, site-tree/model creation, raw artifact persistence, and provenance summaries.

Architectural purpose: Canonical migration intake path.

Owning path: `apps/platform/gnr8/site/scoped-import-pipeline.ts`.

Evidence:
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/site/site-import-contract.ts`

Limitations: Complex module with many responsibilities; needs operational boundaries for bulk migration.

Downstream consumers: Public runtime, content overrides, workspace projections.

Determinism/auditability impact: High.

Enterprise readiness impact: High but needs monitoring.

MVP relevance: Required.

Recommended next action: Add trace/replay identifiers per stage for batch runs.

### TECH-09 Multi-Page Discovery

Status: Partially implemented

Technical description: Discovery covers sitemap, robots, canonical, redirect/alias, route priority, template families, navigation, shared regions, and operator summaries.

Architectural purpose: Expands migration from single-page to static multi-page sources.

Owning path: `apps/platform/gnr8/multipage-import/**`.

Evidence:
- `apps/platform/gnr8/multipage-import/core/discover-multipage-import-tree.ts`
- `apps/platform/gnr8/multipage-import/operator-summary-read-model.ts`
- `apps/platform/gnr8/multipage-import/**/*.test.ts`

Limitations: Static controlled acquisition only; no authenticated/dynamic crawl.

Downstream consumers: Scoped import pipeline, raw template route maps, operator summaries.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: High for real-site migration.

MVP relevance: Required.

Recommended next action: Define static-site support limits for MVP.

### TECH-10 Linear Migration Pipeline And Quality Gates

Status: Implemented

Technical description: Pipeline models prepared site, layout graph, execution plan/result, preview document, quality gates, enforcement, rollout policy, static output, and run reports.

Architectural purpose: Deterministic migration transformation and governance.

Owning path: `apps/platform/gnr8/migration/**`.

Evidence:
- `apps/platform/gnr8/migration/runtime/run-linear-migration-pipeline.ts`
- `apps/platform/gnr8/migration/quality-gates/*.ts`
- `apps/platform/gnr8/migration/enforcement/*.ts`
- `apps/platform/gnr8/migration/policy/*.ts`

Limitations: Coverage may not handle every real source-system behavior.

Downstream consumers: Scoped import, publish enforcement, command center.

Determinism/auditability impact: High.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Expand real-site validation set before 200-site run.

### TECH-11 Durable Migration Job Store

Status: Implemented

Technical description: Durable job store persists job state, stages, events, activation history, and supports run/resume/replay.

Architectural purpose: Durable migration execution state.

Owning path: `apps/platform/gnr8/migration-factory/**`.

Evidence:
- `apps/platform/gnr8/migration-factory/migration-factory.ts`
- `apps/platform/gnr8/migration-factory/postgres-migration-job-store.ts`
- `apps/platform/app/api/gnr8/admin/migration-jobs/**`
- `apps/platform/supabase/migrations/20260603120000_migration_job_store.sql`

Limitations: Replay exists but no complete operator replay console found.

Downstream consumers: Migration batches, Command Center.

Determinism/auditability impact: High.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Add operational replay/runbook.

### TECH-12 Durable Migration Batch Store And Executor

Status: Implemented

Technical description: Durable batch store, batch/job membership, events, observability, route handlers, and sequential operator-driven executor exist.

Architectural purpose: Group many migration jobs into operational batches.

Owning path: `apps/platform/gnr8/migration-factory/**`.

Evidence:
- `apps/platform/gnr8/migration-factory/migration-batch-executor.ts`
- `apps/platform/gnr8/migration-factory/postgres-migration-batch-store.ts`
- `apps/platform/app/api/gnr8/admin/migration-batches/**`
- `apps/platform/supabase/migrations/20260603130000_migration_batch_store.sql`
- `apps/platform/supabase/migrations/20260603140000_migration_batch_events.sql`

Limitations: No queue/worker orchestration, leases, heartbeat, retry scheduler.

Downstream consumers: Command Center migration batches UI.

Determinism/auditability impact: High for operator-driven execution.

Enterprise readiness impact: Medium-high; needs automation for scale.

MVP relevance: Required.

Recommended next action: Decide queue/retry architecture before 200-site run.

### TECH-13 Command Center Read Models

Status: Implemented

Technical description: Command Center read models and UI services aggregate site assignments, migration snapshots, batch details, hosting details, and operational tables.

Architectural purpose: Operator control plane.

Owning paths: `apps/platform/gnr8/command-center/**`, `apps/platform/app/gnr8/command-center/**`.

Evidence:
- `apps/platform/gnr8/command-center/command-center-read-model.ts`
- `apps/platform/app/gnr8/command-center/**`

Limitations: Too many separate inspection pages remain; workflow consolidation is incomplete.

Downstream consumers: Operators, migration batches, hosting ops.

Determinism/auditability impact: Medium.

Enterprise readiness impact: High if consolidated.

MVP relevance: Required.

Recommended next action: Make Command Center the primary 200-site workbench.

### TECH-14 Preview Runtime

Status: Implemented

Technical description: Unified preview rendering resolves raw template/artifacts, applies draft/published content as appropriate, validates multi-page previews, rewrites assets, and has DB backpressure handling.

Architectural purpose: Safe operator preview and review.

Owning path: `apps/platform/gnr8/runtime/unified-render-preview.ts`.

Evidence:
- `apps/platform/gnr8/runtime/unified-render-preview.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/preview/**`
- `apps/platform/gnr8/runtime/unified-render-preview.test.ts`

Limitations: Depends on runtime DB and persisted raw artifacts; many modes increase complexity.

Downstream consumers: Workspace, client dashboard, operators.

Determinism/auditability impact: High when using persisted artifacts.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Add preview health metrics and failure categorization.

### TECH-15 Public Runtime Serving

Status: Implemented

Technical description: Public catch-all resolves host/path, serves active artifacts or raw templates, applies published overrides, enforces artifact governance, rewrites assets, and logs runtime usage.

Architectural purpose: Production serving for migrated sites.

Owning paths: `apps/platform/app/(public)/[[...slug]]/**`, `apps/platform/src/public-site/**`.

Evidence:
- `apps/platform/app/(public)/[[...slug]]/route.ts`
- `apps/platform/src/public-site/public-runtime-render.tsx`
- `apps/platform/src/public-site/raw-template-runtime.ts`

Limitations: Dynamic source-system behaviors need compatibility adapters/fallbacks.

Downstream consumers: End users and client sites.

Determinism/auditability impact: High.

Enterprise readiness impact: Required.

MVP relevance: Required.

Recommended next action: Add SLO/error monitoring for 200-site serving.

### TECH-16 Content Slot And Override Store

Status: Implemented

Technical description: Content slots are inferred and persisted; draft and published overrides can be saved, published, rolled back, and applied at runtime.

Architectural purpose: Post-import content management without full regeneration.

Owning paths: `apps/platform/gnr8/runtime/content-binding.ts`, content API routes, runtime-store content functions.

Evidence:
- `apps/platform/gnr8/runtime/content-binding.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/**`
- `apps/platform/supabase/migrations/20260504120000_content_overrides_version_hardening.sql`
- `apps/platform/supabase/migrations/20260504133000_content_override_history.sql`

Limitations: Rich editorial UX and conflict workflow not fully evidenced.

Downstream consumers: Public runtime, client dashboard.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Validate editing workflow with migrated sites.

### TECH-17 Publish Governance And Version Lifecycle

Status: Implemented

Technical description: Version lifecycle enforcer, publish enforcement, safety checks, render integrity gate, artifact creation, active pointer switching, and audit records exist.

Architectural purpose: Controlled transition from approved version to live serving.

Owning paths: `apps/platform/gnr8/runtime/publish-*.ts`, `apps/platform/gnr8/runtime/version-lifecycle-*.ts`.

Evidence:
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/version-lifecycle-enforcer.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`

Limitations: Client/business approval workflow still unclear.

Downstream consumers: Public runtime, domains, hosting ops.

Determinism/auditability impact: High.

Enterprise readiness impact: High.

MVP relevance: Required.

Recommended next action: Define MVP approval gate and rollback UX.

### TECH-18 Rollback / Version Reversal

Status: Partially implemented

Technical description: Rollback switch and route exist, and content rollback exists, but CAP-1 did not find a complete operator rollback UI for live incidents.

Architectural purpose: Recovery path after bad publish/content changes.

Owning paths: `apps/platform/gnr8/runtime/rollback-switch.ts`, rollback API routes.

Evidence:
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/rollback/route.ts`

Limitations: Operator incident workflow and bulk rollback dashboard are incomplete.

Downstream consumers: Operators, public runtime.

Determinism/auditability impact: High if fully wired.

Enterprise readiness impact: High.

MVP relevance: Required/strongly recommended.

Recommended next action: Verify live rollback workflow before 200-site migration.

### TECH-19 Vercel Custom Domain Binding And Verification

Status: Implemented

Technical description: Domain connection route calls Vercel add/status APIs, computes DNS instructions, persists runtime host bindings, supports publish-time reconciliation, and worker scheduled verification.

Architectural purpose: Customer custom-domain launch path.

Owning paths: `apps/platform/src/lib/vercel/**`, domain API route, worker domain job.

Evidence:
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- `apps/platform/supabase/migrations/20260427121000_runtime_domain_host_binding_verification_lifecycle.sql`

Limitations: Wildcard unsupported; depends on Vercel credentials; not registrar DNS mutation.

Downstream consumers: Publish, hosting ops, public runtime.

Determinism/auditability impact: Medium; external Vercel state involved.

Enterprise readiness impact: High.

MVP relevance: Required if custom domains launch in MVP.

Recommended next action: Add domain runbook and bulk domain readiness reports.

### TECH-20 DNS Provider Abstraction And Openprovider Control Plane

Status: Prepared

Technical description: DNS provider types, adapter registry, execution gate, sandbox/manual/mock adapters, readiness planning, provider job planning, and Openprovider read-only/sandbox modules exist.

Architectural purpose: Future provider-neutral DNS/registrar execution plane.

Owning paths: `apps/platform/gnr8/runtime/dns/**`, `apps/platform/gnr8/runtime/providers/openprovider/**`.

Evidence:
- `apps/platform/gnr8/runtime/dns/provider-adapter-registry.ts`
- `apps/platform/gnr8/runtime/dns/provider-execution-gate.ts`
- `apps/platform/gnr8/runtime/dns/openprovider-sandbox-adapter.ts`
- `apps/platform/gnr8/runtime/providers/openprovider/**`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

Limitations: No live Openprovider DNS writes/domain purchase; docs explicitly gate execution.

Downstream consumers: Provider handoffs, future DNS automation.

Determinism/auditability impact: High if kept gated.

Enterprise readiness impact: Medium until live execution and audit are designed.

MVP relevance: Decision needed.

Recommended next action: Keep prepared; do not use for live execution without ADR.

### TECH-21 Provider Operation Approvals And Handoffs

Status: Prepared

Technical description: Provider operation approval artifacts, approval repositories/stores, governance snapshots, execution handoffs, worker envelope previews, readiness gates, remediation plans, and dry-run job plans exist.

Architectural purpose: Governance/control plane before provider execution.

Owning path: `apps/platform/gnr8/runtime/providers/**`.

Evidence:
- `apps/platform/gnr8/runtime/providers/runtime-provider-operation-approval*.ts`
- `apps/platform/gnr8/runtime/providers/runtime-provider-execution-handoff*.ts`
- `apps/platform/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness.ts`
- `apps/platform/app/api/gnr8/admin/provider-handoffs/**`

Limitations: Worker provider execution is not enabled.

Downstream consumers: Future provider workers, admin handoff surfaces.

Determinism/auditability impact: High.

Enterprise readiness impact: Medium-high but incomplete.

MVP relevance: Only required if provider execution is in MVP.

Recommended next action: Defer live execution; validate control-plane tables.

### TECH-22 Inngest Worker Jobs

Status: Partially implemented

Technical description: Worker app includes Inngest functions for template processing, site bootstrap/render capture, and domain verification.

Architectural purpose: Background processing outside request/response.

Owning paths: `apps/worker/gnr8/**`.

Evidence:
- `apps/worker/gnr8/inngest/functions.ts`
- `apps/worker/gnr8/template-intake/inngest/**`
- `apps/worker/gnr8/site/inngest/**`
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- `packages/gnr8-runtime-contracts/src/**`

Limitations: Migration batch queue workers/provider workers are not implemented.

Downstream consumers: Templates, site bootstrap/render capture, domains.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: Medium until queue/retry coverage expands.

MVP relevance: Required for domain/template/capture, insufficient for full bulk orchestration.

Recommended next action: Decide whether migration jobs move to worker queue before MVP.

### TECH-23 Template Intake And Site Bootstrap Runtime

Status: Implemented

Technical description: Template upload, zip validation, durable source storage, template records, processing jobs, list/detail contracts, source previews, and bootstrap jobs exist.

Architectural purpose: Reusable site/template foundation.

Owning paths: `apps/worker/gnr8/template-intake/**`, `apps/platform/app/api/gnr8/clients/[clientId]/templates/**`, `apps/worker/gnr8/site/**`.

Evidence:
- `apps/worker/gnr8/template-intake/core/*.ts`
- `apps/worker/gnr8/template-intake/storage/*.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/templates/**`
- `apps/worker/gnr8/site/site-template-runtime-bootstrap-service.ts`

Limitations: CAP-1 did not prove full UX maturity.

Downstream consumers: Client dashboard, bootstrap status.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: Medium-high.

MVP relevance: Strongly recommended.

Recommended next action: Verify template processing for high-volume use.

### TECH-24 Billing Cost Model And Cost Events

Status: Implemented

Technical description: AI/runtime/migration cost models, cost event logging, billing resolution, cost center resolution, unified cost, margin, and pricing simulation services exist.

Architectural purpose: Internal cost attribution and profitability.

Owning path: `apps/platform/gnr8/billing/**`.

Evidence:
- `apps/platform/gnr8/billing/cost-model.ts`
- `apps/platform/gnr8/billing/cost-event-logging-service.ts`
- `apps/platform/gnr8/billing/unified-cost-view-service.ts`
- `apps/platform/gnr8/billing/margin-service.ts`
- `apps/platform/gnr8/billing/pricing-simulation-service.ts`

Limitations: Customer-facing billing product not complete.

Downstream consumers: Runtime usage logging, debug APIs, finance views.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: Medium.

MVP relevance: Strongly recommended.

Recommended next action: Define cost reporting minimum for 200-site migration.

### TECH-25 Stripe Webhook And Entitlements

Status: Partially implemented

Technical description: Stripe subscription webhook validates signature, maps org metadata, upserts subscription state, and syncs entitlements.

Architectural purpose: Subscription/entitlement automation.

Owning paths: `apps/platform/app/api/stripe/webhook/route.ts`, `packages/core/src/modules/billing/**`, `packages/core/src/modules/entitlement/**`.

Evidence:
- `apps/platform/app/api/stripe/webhook/route.ts`
- `packages/core/src/modules/billing/service.ts`
- `packages/core/src/modules/entitlement/service.ts`
- `packages/data/src/repositories/postgres-stripe-events-repository.ts`

Limitations: No checkout/customer portal/plan management flow found in CAP-1.

Downstream consumers: Entitlements, superadmin billing.

Determinism/auditability impact: Medium.

Enterprise readiness impact: Medium.

MVP relevance: Defer unless commercial self-serve is part of MVP.

Recommended next action: Classify as subscription webhook foundation, not complete billing.

### TECH-26 Source Website Understanding Projection

Status: Implemented

Technical description: Deterministic projection builder and loader compose existing import/evidence/candidate/review/reconstruction/structure artifacts into a source understanding read model.

Architectural purpose: Source understanding without new source of truth.

Owning path: `apps/platform/gnr8/architecture/source-website-understanding-*`.

Evidence:
- `apps/platform/gnr8/architecture/source-website-understanding-projection-builder.ts`
- `apps/platform/gnr8/architecture/source-website-understanding-projection-loader.ts`
- `apps/platform/gnr8/architecture/source-website-understanding-projection-*.test.ts`

Limitations: Read-only; no projection persistence table.

Downstream consumers: VCU, Business Discovery integration plan, admin pages.

Determinism/auditability impact: High.

Enterprise readiness impact: Medium-high.

MVP relevance: Strongly recommended.

Recommended next action: Keep as projection, not canonical business truth.

### TECH-27 Source Content Visual Continuity Projection

Status: Implemented

Technical description: Deterministic projection builds source content blocks, asset continuity, image/logo/color/typography candidates, layout continuity, screenshots, readiness, diagnostics, and contamination guards.

Architectural purpose: Preserve source intent for future design/regeneration.

Owning path: `apps/platform/gnr8/architecture/source-content-visual-continuity-*`.

Evidence:
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-builder.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-loader.ts`
- `apps/platform/gnr8/architecture/source-content-visual-continuity-*.test.ts`

Limitations: No asset approval, brand truth, or downstream WGP mutation.

Downstream consumers: Knowledge Workspace, future WDB/WGP enrichment.

Determinism/auditability impact: High.

Enterprise readiness impact: Medium-high.

MVP relevance: Strongly recommended.

Recommended next action: VCU-3 should define downstream contract only.

### TECH-28 Business/DBT/WDB/WGP Artifact Chain

Status: Partially implemented

Technical description: Contracts, builders, persistence, and tests exist for Business Discovery, DBT, Business Alignment, WDB, WGP, BUR, compliance reports, improvement plans, and evolution analysis.

Architectural purpose: Business-aware generation planning.

Owning path: `apps/platform/gnr8/architecture/**`.

Evidence:
- `business-discovery-*.ts`
- `digital-business-twin-*.ts`
- `business-alignment-*.ts`
- `website-design-brief-*.ts`
- `website-generation-package-*.ts`
- `generation-contract-compliance-*.ts`
- `generation-improvement-plan-*.ts`

Limitations: Broad artifact chain exists, but complete operator workflow and provider execution are not complete.

Downstream consumers: Provider payloads, proposal/generation/evolution surfaces.

Determinism/auditability impact: High if artifacts remain immutable.

Enterprise readiness impact: Medium until source-of-truth boundaries are clear.

MVP relevance: Depends on regeneration scope.

Recommended next action: Make MVP boundary decision before extending.

### TECH-29 Generated Proposal Bundle Durability

Status: Implemented

Technical description: Bundle persistence stores file bytes, content types, lineage, hashes, path maps, and immutable preview metadata inside runtime provenance.

Architectural purpose: Durable generated preview reconstruction.

Owning path: `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`.

Evidence:
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.test.ts`
- `apps/platform/app/gnr8/admin/evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/**`

Limitations: Stored inside provenance summary; broad proposal generation not complete.

Downstream consumers: Evolution preview, workspace, thumbnails.

Determinism/auditability impact: High for preview assets.

Enterprise readiness impact: Medium-high.

MVP relevance: Deferrable for migration-only MVP.

Recommended next action: Preserve immutability guarantees.

### TECH-30 Website Version Thumbnail Artifacts

Status: Implemented

Technical description: Thumbnail builder/materializer/persistence stores original and generated iteration thumbnail artifacts as private presentation derivatives.

Architectural purpose: Fast visual review of versions.

Owning path: `apps/platform/gnr8/architecture/website-version-thumbnail-*`.

Evidence:
- `apps/platform/gnr8/architecture/website-version-thumbnail-builder.ts`
- `apps/platform/gnr8/architecture/website-version-thumbnail-persistence.ts`
- `apps/platform/gnr8/architecture/website-version-thumbnail-materializer.ts`
- `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/thumbnails/**`

Limitations: Not source truth or public sharing.

Downstream consumers: Knowledge Workspace, Evolution Dashboard.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: Medium.

MVP relevance: Strongly recommended.

Recommended next action: Add generation failure visibility if thumbnails are used in batch review.

### TECH-31 Testing And Validation Coverage

Status: Implemented

Technical description: Many focused tests cover runtime, import, migration, DNS, provider, billing, worker, templates, content, and UI projections.

Architectural purpose: Regression control.

Owning paths: `*.test.ts`, `*.test.tsx`, package scripts.

Evidence:
- `apps/platform/gnr8/**/*.test.ts`
- `apps/platform/app/**/*.test.tsx`
- `apps/worker/gnr8/**/*.test.ts`
- `apps/worker/package.json` test script.

Limitations: CAP-1 did not run the entire suite. Docs note broader typecheck failures existed in prior phases.

Downstream consumers: All development phases.

Determinism/auditability impact: High.

Enterprise readiness impact: High if suites are consistently run.

MVP relevance: Required.

Recommended next action: Establish MVP validation command set.

### TECH-32 Preview Smoke Validation

Status: Implemented

Technical description: Preview smoke validator and baseline files exist for runtime preview validation.

Architectural purpose: Detect preview/runtime regressions.

Owning path: `apps/platform/gnr8/runtime/preview-smoke/**`.

Evidence:
- `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.ts`
- `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.cli.ts`
- `docs/gnr8/preview-smoke-baseline-2026-05.md`

Limitations: Need current MVP baselines for all 200 sites or representative cohorts.

Downstream consumers: Runtime validation, deployment verification.

Determinism/auditability impact: Medium-high.

Enterprise readiness impact: High when automated.

MVP relevance: Required/strongly recommended.

Recommended next action: Expand to batch-level smoke validation.

### TECH-33 Observability And Diagnostics

Status: Partially implemented

Technical description: Diagnostics are pervasive in import, runtime, migration batches, public serving logs, cost quality flags, DNS checks, worker jobs, preview forensics, and platform audits.

Architectural purpose: Root-cause analysis and operator support.

Owning paths: `apps/platform/gnr8/**`, `apps/platform/app/api/gnr8/admin/**`, `apps/platform/gnr8/platform-audits/**`.

Evidence:
- Diagnostic codes in `url-single-page-import.ts`, `scoped-import-pipeline.ts`, `migration-batch-observability.ts`, `public-runtime-render.tsx`, `domain-verification-job.ts`.
- `apps/platform/app/api/gnr8/admin/preview-forensics/route.ts`.

Limitations: Many diagnostics, but no single operational observability dashboard for 200-site runs.

Downstream consumers: Operators, support, engineering.

Determinism/auditability impact: High.

Enterprise readiness impact: Medium until consolidated.

MVP relevance: Required.

Recommended next action: Build a batch/run observability page with failure recovery links.

### TECH-34 Audit Log Repository

Status: Partially implemented

Technical description: Audit log repository and service exist, and publish activation records audit events, but not every capability has a unified audit trail.

Architectural purpose: Compliance and accountability.

Owning paths: `packages/core/src/modules/audit-log/**`, `packages/data/src/repositories/postgres-audit-log-repository.ts`, publish audit runtime store.

Evidence:
- `packages/core/src/modules/audit-log/service.ts`
- `packages/data/src/repositories/postgres-audit-log-repository.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`

Limitations: No end-to-end audit model across import, review, edit, publish, DNS, billing, and provider handoffs found.

Downstream consumers: Enterprise admin, support, compliance.

Determinism/auditability impact: High if completed.

Enterprise readiness impact: High.

MVP relevance: Required/strongly recommended.

Recommended next action: Define minimum audit events for MVP.

### TECH-35 Runtime Usage Logging

Status: Implemented

Technical description: Public runtime records request/bandwidth/compute usage into billing cost events.

Architectural purpose: Cost attribution and usage monitoring.

Owning paths: `apps/platform/src/public-site/public-runtime-render.tsx`, `apps/platform/gnr8/runtime/runtime-usage-event-logger.ts`, `apps/platform/gnr8/billing/cost-event-logging-service.ts`.

Evidence:
- `persistRuntimeUsageEvent` call in `public-runtime-render.tsx`.
- `apps/platform/gnr8/runtime/runtime-usage-event-logger.ts`.
- `apps/platform/gnr8/runtime/runtime-usage-flusher.ts`.

Limitations: CAP-1 did not verify aggregation job coverage.

Downstream consumers: Unified cost, margin.

Determinism/auditability impact: Medium.

Enterprise readiness impact: Medium.

MVP relevance: Strongly recommended.

Recommended next action: Verify cost events under production traffic.

### TECH-36 Environment And Build Tooling

Status: Implemented

Technical description: Node version check, Next route export check, platform build/rendered-capture-worker build, and worker build/test scripts exist.

Architectural purpose: Build and runtime discipline.

Owning paths: `scripts/**`, package scripts.

Evidence:
- `scripts/check-node-version.js`
- `scripts/check-next-route-exports.mjs`
- `apps/platform/package.json`
- `apps/worker/package.json`

Limitations: Platform test command is not centralized.

Downstream consumers: CI/release process.

Determinism/auditability impact: Medium.

Enterprise readiness impact: Medium.

MVP relevance: Required.

Recommended next action: Add single MVP validation script or runbook.

### TECH-37 Openprovider Live DNS/Registrar Mutation

Status: Prepared

Technical description: Openprovider auth/read APIs and sandbox probes exist, but live purchase/DNS mutation is not implemented as an allowed execution plane.

Architectural purpose: Future registrar/DNS provider integration.

Owning paths: `apps/platform/gnr8/runtime/providers/openprovider/**`, provider routes.

Evidence:
- `apps/platform/gnr8/runtime/providers/openprovider/openprovider-domain-inventory.ts`
- `apps/platform/gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory.ts`
- `apps/platform/gnr8/runtime/providers/openprovider/openprovider-sandbox-register-domain-probe.ts`
- `apps/platform/app/api/gnr8/admin/providers/openprovider/**`

Limitations: Read-only/sandbox; execution blocked.

Downstream consumers: Future DNS/provider execution.

Determinism/auditability impact: High if gated.

Enterprise readiness impact: Medium-low until live design is approved.

MVP relevance: Defer or decide.

Recommended next action: Do not use for MVP launch unless explicit execution milestone is approved.

### TECH-38 AI Route Surface

Status: Ambiguous

Technical description: Many AI API route files exist for planning, execution, adaptation, replay, wave execution, and optimization.

Architectural purpose: Future AI-assisted migration/evolution.

Owning path: `apps/platform/app/api/gnr8/ai/**`.

Evidence:
- `apps/platform/app/api/gnr8/ai/**`
- `apps/platform/gnr8/ai/**`

Limitations: CAP-1 did not establish product integration, billing enforcement, replayability, or deterministic capture for these routes.

Downstream consumers: Unknown or future operator workflows.

Determinism/auditability impact: Unknown.

Enterprise readiness impact: Risk if treated as production-ready.

MVP relevance: Needs decision before use.

Recommended next action: Run focused AI route audit.

### TECH-39 Business Approval Runtime

Status: Documented only

Technical description: Business approval is specified in docs, but a complete runtime product was not found.

Architectural purpose: Human/business governance gate.

Owning paths: `docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md`.

Evidence:
- Documentation-only evidence in `docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md`.

Limitations: No complete route/UI/persistence workflow found in CAP-1.

Downstream consumers: Publish, generation approval, client success.

Determinism/auditability impact: High if implemented.

Enterprise readiness impact: High.

MVP relevance: Decision needed.

Recommended next action: Define MVP approval mechanism.

### TECH-40 Autonomous Regeneration Execution

Status: Documented only

Technical description: Architecture docs describe future autonomous/evolution loops, but no complete autonomous execution pipeline was verified.

Architectural purpose: Future website evolution automation.

Owning paths: `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`, `docs/architecture/GENERATION_CYCLE_ARCHITECTURE.md`.

Evidence:
- Documentation and scattered AI route scaffolding only.

Limitations: Not production-ready.

Downstream consumers: Future optimization engine.

Determinism/auditability impact: High risk until designed.

Enterprise readiness impact: Not ready.

MVP relevance: Should not be pursued before migration MVP.

Recommended next action: Defer.

### TECH-41 Chai/Legacy Builder Removal Context

Status: Historical / obsolete

Technical description: Chai removal docs exist but are not current product capability.

Architectural purpose: Historical decommissioning context.

Owning path: `apps/platform/gnr8/chai-removal/**`.

Evidence:
- `apps/platform/gnr8/chai-removal/**` path name and content indicate decommission/removal history.

Limitations: Not current runtime source of truth.

Downstream consumers: None for MVP.

Determinism/auditability impact: Prevents accidental reliance on retired builder paths.

Enterprise readiness impact: Positive if kept out of current flow.

MVP relevance: Should not be pursued.

Recommended next action: Keep excluded from current planning except deprecation warnings.

### TECH-42 Provider Payload Construction

Status: Partially implemented

Technical description: Provider payload contract/builders and payload v2 builder serialize WGP/improvement context with explicit no-execution/no-publish/no-DNS instructions.

Architectural purpose: Safe handoff to external generation tools.

Owning path: `apps/platform/gnr8/architecture/provider-generation-payload-*`.

Evidence:
- `apps/platform/gnr8/architecture/provider-generation-payload-contract.ts`
- `apps/platform/gnr8/architecture/provider-generation-payload-v2-builder.ts`
- `apps/platform/gnr8/architecture/provider-generation-payload-persistence.ts`
- `apps/platform/gnr8/architecture/codex-task-provider-payload-builder.ts`

Limitations: Serialization is not execution.

Downstream consumers: Future provider handoff and manual Codex execution.

Determinism/auditability impact: Medium-high if payloads are persisted.

Enterprise readiness impact: Medium.

MVP relevance: Needs decision for regeneration MVP.

Recommended next action: Keep export-only until provider execution is approved.

## Prepared But Not Fully Realized Platform Capabilities

- Billing/Stripe: cost and webhook foundations exist; customer billing product is incomplete.
- DNS/Openprovider: provider abstraction and read-only inventory exist; live registrar/DNS mutation is not complete.
- Provider execution: approvals, handoffs, worker envelopes, and readiness gates exist; no worker execution.
- Migration orchestration: durable batches exist; unattended queue/retry/leases/heartbeat do not.
- AI orchestration: many routes exist; product integration and replay guarantees are ambiguous.
- Business approval: docs exist; complete runtime workflow absent.

