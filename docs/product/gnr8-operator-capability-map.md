# GNR8 Operator Capability Map

CAP-1 operator-facing capability inventory. Status values follow `docs/product/gnr8-current-capability-inventory.md`.

## Capability Table

### OP-01 Agency, Client, Member, And Superadmin Management

Status: Implemented

Description: Operators can manage agencies, client organizations, members, client users, agency settings, and superadmin organization views.

Operator value: Gives delivery teams a client/project container for migration work.

Entry points: `/gnr8/agency`, `/gnr8/agency/clients`, `/gnr8/admin/agencies`, `/superadmin`, related API routes.

Lifecycle stage: Setup and operations.

Evidence:
- `apps/platform/app/gnr8/agency/**` - agency/client/member UI.
- `apps/platform/app/api/gnr8/agency/**` - agency/client/member APIs.
- `apps/platform/gnr8/agency/**` - provisioning, membership, read models.
- `apps/platform/supabase/migrations/20260326090000_ownership_foundation.sql` and `20260330100100_multi_agency_rls_scope.sql` - ownership and multi-agency persistence.

Limitations: Not yet presented as a 200-site portfolio migration onboarding wizard.

Dependencies: Supabase/Postgres, auth, RBAC.

MVP relevance: Required.

200-site relevance: Required for organizing sites by agency/client.

Recommended next action: Keep and consolidate into the migration command workflow.

### OP-02 Authentication, Onboarding, And Role-Based Access

Status: Implemented

Description: Login/signup, owner setup, client setup, current agency/client resolution, superadmin checks, and role-based action access exist.

Operator value: Controls who can import, publish, manage domains, and review sites.

Entry points: `/login`, `/signup`, `/gnr8/onboarding/owner-setup`, `/gnr8/onboarding/client-setup`.

Lifecycle stage: Setup, access control, operations.

Evidence:
- `apps/platform/src/auth/**` - Supabase auth, RBAC, setup gates, current agency/client resolution.
- `apps/platform/app/api/gnr8/agency/_lib/agency-action-access.ts` - action-level agency authorization.
- `apps/platform/src/superadmin/require-superadmin-user-id.ts` - superadmin guard.
- `packages/core/src/modules/authorization/**` - authorization service/types.

Limitations: `apps/platform/middleware.ts` does not globally enforce auth; most routes rely on route-level checks.

Dependencies: Supabase session/cookies, membership tables.

MVP relevance: Required.

200-site relevance: Required for safe operations across many client sites.

Recommended next action: Verify every MVP route uses route-level access checks.

### OP-03 Client-Scoped Existing Website Import

Status: Implemented

Description: A client-scoped operator can import a public URL, preallocate deterministic runtime identity, capture source HTML/evidence, run the scoped import pipeline, create/link a client-owned site, and return preview/pipeline diagnostics.

Operator value: Core path for migrating existing websites.

Entry points: `POST /api/gnr8/agency/clients/[clientId]/sites/import`.

Lifecycle stage: Import/intake.

Evidence:
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts` - canonical scoped import route.
- `apps/platform/gnr8/site/site-import-contract.ts` - canonical path `scoped_snapshot_import_v1` and non-canonical legacy path list.
- `apps/platform/gnr8/site/scoped-import-pipeline.ts` - scoped pipeline implementation.
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts` - URL snapshot/capture implementation.

Limitations: Operator flow is request/API driven; no dedicated bulk import wizard was found.

Dependencies: Runtime store, rendered capture, scoped import pipeline, agency action access.

MVP relevance: Required.

200-site relevance: Required, but must be bulk-friendly.

Recommended next action: Build a bulk intake wrapper around this canonical route.

### OP-04 Legacy / Non-Canonical Import Routes

Status: Historical / obsolete

Description: Older import routes still exist, but the repository explicitly classifies them as non-canonical.

Operator value: Important mainly to avoid using the wrong path.

Entry points: `/api/gnr8/import/url-and-save`, `/api/gnr8/import/html-and-save`, `/api/gnr8/runtime/migrate/url`.

Lifecycle stage: Historical compatibility.

Evidence:
- `apps/platform/gnr8/site/site-import-contract.ts` - lists non-canonical scoped import paths.
- `apps/platform/app/api/gnr8/runtime/migrate/url/route.ts` - marks response `importPathClassification: "legacy_non_canonical"`.

Limitations: Should not be the MVP source of truth.

Dependencies: Legacy migration utilities.

MVP relevance: Should not be pursued before MVP.

200-site relevance: Risk if used accidentally.

Recommended next action: Keep visible in CAP-1 as warning; route new work to OP-03.

### OP-05 Multi-Page Discovery And Static Multi-Page Import

Status: Partially implemented

Description: Multi-page discovery can inspect links, sitemap, robots, canonical URLs, redirects/aliases, route priority, template families, controlled HTML acquisition, raw artifact assembly, and operator summaries.

Operator value: Needed for real client websites that are not single-page.

Entry points: `multiPageDiscovery` option in the client import API; operator summaries in site/workspace/hosting surfaces.

Lifecycle stage: Import expansion.

Evidence:
- `apps/platform/gnr8/multipage-import/**` - discovery, normalization, route priority, summaries, tests.
- `apps/platform/gnr8/site/scoped-import-pipeline.ts` - optional multi-page discovery/acquisition/raw artifact assembly.
- `apps/platform/gnr8/runtime/multipage-preview-validation.ts` - raw preview validation.
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md` - Phase 7B/7C/7D completion context.

Limitations: Static websites only; no auth flows, forms, commerce, dynamic content, or public production multi-page activation guarantee found.

Dependencies: URL import, raw template runtime, preview validation.

MVP relevance: Required for many 200-site migrations.

200-site relevance: High.

Recommended next action: Decide MVP static-site limits and add bulk monitoring for discovery failures.

### OP-06 Source Website Understanding

Status: Implemented

Description: Read-only deterministic projection of source website understanding over import artifacts, evidence, candidate discovery/review, reconstruction package, and structure plan context.

Operator value: Helps operators understand what was captured and what evidence is missing.

Entry points: `/gnr8/admin/website-understanding/[siteVersionId]`.

Lifecycle stage: Understanding and review.

Evidence:
- `apps/platform/gnr8/architecture/source-website-understanding-projection-builder.ts`.
- `apps/platform/gnr8/architecture/source-website-understanding-projection-loader.ts`.
- `apps/platform/app/gnr8/admin/website-understanding/[siteVersionId]/page.tsx`.
- `docs/architecture/SOURCE_WEBSITE_UNDERSTANDING_PROJECTION_RUNTIME.md`.

Limitations: Read-only; no persistence of projection as a separate table; not a business truth source.

Dependencies: Import provenance and downstream artifact references.

MVP relevance: Strongly recommended.

200-site relevance: High for audit and triage.

Recommended next action: Keep read-only and connect to operator decision dashboards.

### OP-07 Source Content And Visual Continuity

Status: Implemented

Description: Projects source text, visual assets, screenshot references, color/typography signals, reuse candidates, and continuity limitations without making them canonical brand truth.

Operator value: Helps preserve source-site intent during regeneration or redesign.

Entry points: `/gnr8/admin/continuity/[siteVersionId]`.

Lifecycle stage: Continuity review before regeneration/design enrichment.

Evidence:
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-builder.ts`.
- `apps/platform/gnr8/architecture/source-content-visual-continuity-projection-loader.ts`.
- `apps/platform/app/gnr8/admin/continuity/[siteVersionId]/page.tsx`.
- `docs/architecture/SOURCE_CONTENT_VISUAL_CONTINUITY_PROJECTION_RUNTIME.md`.

Limitations: Read-only; no asset approval or licensing confirmation workflow.

Dependencies: Source Website Understanding, screenshots, raw/source artifacts.

MVP relevance: Strongly recommended.

200-site relevance: High for recognizability and QA.

Recommended next action: VCU-3 should remain contract/design unless MVP boundary says continuity must drive generation.

### OP-08 Business Foundation / Business Discovery Surface

Status: Partially implemented

Description: Business foundation read-only UX and business discovery builders exist, but WU-based cutover and full business discovery runtime mode are not active.

Operator value: Shows business meaning extracted from source artifacts.

Entry points: `/gnr8/admin/business-foundation/[siteVersionId]`.

Lifecycle stage: Business understanding and review.

Evidence:
- `apps/platform/app/gnr8/admin/business-foundation/[siteVersionId]/page.tsx`.
- `apps/platform/gnr8/architecture/business-discovery-builder.ts`.
- `apps/platform/gnr8/architecture/business-discovery-persistence.ts`.
- `docs/architecture/BUSINESS_FOUNDATION_RUNTIME_UX.md`.
- `docs/architecture/BUSINESS_DISCOVERY_RUNTIME_INTEGRATION_PLAN.md` - future WU integration plan.

Limitations: WU integration modes are documented/planned; full cutover is not implemented.

Dependencies: Import provenance, business discovery artifacts, WU projections.

MVP relevance: Strongly recommended.

200-site relevance: Medium-high for client success, lower for pure lift-and-shift.

Recommended next action: Decide whether MVP requires WU-driven business discovery or only review surfaces.

### OP-09 Digital Business Twin Preparation

Status: Prepared

Description: Digital Business Twin contracts, builders, persistence, runtime/twin preview modules, and tests exist, but a complete operator lifecycle for maintaining a twin is not evident.

Operator value: Future source of business truth and evolution intelligence.

Entry points: `/gnr8/admin/twin-preview`, `/gnr8/admin/twin-preview-real`.

Lifecycle stage: Business modeling and future evolution.

Evidence:
- `apps/platform/gnr8/architecture/digital-business-twin-contract.ts`.
- `apps/platform/gnr8/architecture/digital-business-twin-builder.ts`.
- `apps/platform/gnr8/architecture/digital-business-twin-persistence.ts`.
- `apps/platform/gnr8/runtime/twin/**`.
- `apps/platform/app/gnr8/admin/twin-preview*/**`.

Limitations: Many twin execution/readiness modules are pre-execution; no unified operator edit/approval workflow found.

Dependencies: Business Discovery, WU, artifacts, approval model.

MVP relevance: Can be deferred for migration MVP unless regeneration/evolution is in scope.

200-site relevance: Useful later; not required for first migration throughput.

Recommended next action: Defer full DBT productization until MVP boundary is decided.

### OP-10 Website Business Design / Website Design Brief

Status: Partially implemented

Description: Website Design Brief contracts, builder, persistence, tests, and real-target validation docs exist.

Operator value: Converts business understanding into website design intent.

Entry points: No primary operator workflow found beyond admin artifact surfaces.

Lifecycle stage: Design planning before generation.

Evidence:
- `apps/platform/gnr8/architecture/website-design-brief-contract.ts`.
- `apps/platform/gnr8/architecture/website-design-brief-builder.ts`.
- `apps/platform/gnr8/architecture/website-design-brief-persistence.ts`.
- `docs/architecture/WEBSITE_DESIGN_BRIEF_RUNTIME_BUILDER.md`.

Limitations: Not a complete operator-facing design workflow.

Dependencies: DBT, Business Alignment.

MVP relevance: Can be deferred for migration-only MVP; required for regeneration MVP.

200-site relevance: Medium unless each site is redesigned/regenerated.

Recommended next action: Decide whether MVP means clone/migrate or business-led regeneration.

### OP-11 Website Generation Package

Status: Partially implemented

Description: WGP contracts, builder, persistence, and validation exist as generation planning artifacts.

Operator value: Prepares external/provider generation work.

Entry points: Artifact/admin workflows; no fully automated provider generation found.

Lifecycle stage: Generation preparation.

Evidence:
- `apps/platform/gnr8/architecture/website-generation-package-contract.ts`.
- `apps/platform/gnr8/architecture/website-generation-package-builder.ts`.
- `apps/platform/gnr8/architecture/website-generation-package-persistence.ts`.
- `docs/architecture/WEBSITE_GENERATION_PACKAGE_RUNTIME_BUILDER.md`.

Limitations: Does not itself execute generation, publish, provider calls, or approval.

Dependencies: Website Design Brief, Business Alignment, DBT.

MVP relevance: Required only if MVP includes regeneration beyond imported runtime serving.

200-site relevance: Medium-high for regeneration; lower for migration serving.

Recommended next action: Keep as prepared planning layer until regeneration MVP boundary is approved.

### OP-12 Provider Payload / External Generation Handoff

Status: Prepared

Description: Provider payload builders, payload persistence, Codex task payloads, and provider handoff readiness exist, but provider execution is gated or absent for generation.

Operator value: Enables controlled handoff to external generation systems in future.

Entry points: Provider handoff/admin routes and pages.

Lifecycle stage: Generation handoff.

Evidence:
- `apps/platform/gnr8/architecture/provider-generation-payload-v2-builder.ts`.
- `apps/platform/gnr8/architecture/codex-task-provider-payload-builder.ts`.
- `apps/platform/gnr8/runtime/providers/**`.
- `apps/platform/app/gnr8/admin/provider-handoffs/**`.
- `docs/ai/GNR8_PROJECT_MAP.md` - says provider execution is not enabled.

Limitations: Export/control-plane readiness only; no live provider execution authority.

Dependencies: WGP, governance, provider settings, credentials.

MVP relevance: Needs architectural decision before MVP if regeneration is required.

200-site relevance: Important only for AI regeneration at scale.

Recommended next action: Do not treat as implemented generation execution.

### OP-13 Generated Proposal Import And Bundle Durability

Status: Partially implemented

Description: Generated Proposal Bundle durability exists for persisted preview reconstruction and ODV materialization; general proposal generation workflow is not complete.

Operator value: Operators can review persisted generated proposal previews without relying on local filesystem folders.

Entry points: Evolution preview routes.

Lifecycle stage: Generated proposal review.

Evidence:
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`.
- `apps/platform/app/gnr8/admin/evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/**`.
- `docs/architecture/GENERATED_PROPOSAL_BUNDLE_RUNTIME.md`.
- `docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_CLOSEOUT.md`.

Limitations: ODV-focused proof; no broad proposal generation execution.

Dependencies: Generated proposal import, runtime provenance.

MVP relevance: Can be deferred unless proposal preview is part of operator QA.

200-site relevance: Low-medium; useful for proof/review, not core migration throughput.

Recommended next action: Keep durable bundle path, avoid making it implicit mutable state.

### OP-14 Durable Generated Proposal Preview

Status: Implemented

Description: Superadmin preview routes reconstruct generated proposal output from persisted bundle assets with path traversal protection and auth fail-closed behavior.

Operator value: Stable review of generated iterations.

Entry points: `/gnr8/admin/evolution/[siteVersionId]/iterations/[iteration]/preview/`.

Lifecycle stage: Review and comparison.

Evidence:
- `apps/platform/app/gnr8/admin/evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/generation-evolution-preview-route-handlers.ts`.
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.ts`.
- `apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.test.ts`.

Limitations: Private/superadmin preview only; not production serving.

Dependencies: Generated proposal bundle persistence.

MVP relevance: Strongly recommended for regeneration QA, deferrable for pure migration.

200-site relevance: Medium for auditability.

Recommended next action: Keep private and immutable.

### OP-15 Website Version Thumbnails

Status: Implemented

Description: Private presentation thumbnails are persisted as artifact records and displayed in workspace/evolution contexts.

Operator value: Fast visual comparison of source and generated versions.

Entry points: Knowledge Workspace and Evolution Dashboard thumbnail routes.

Lifecycle stage: Review and comparison.

Evidence:
- `apps/platform/gnr8/architecture/website-version-thumbnail-builder.ts`.
- `apps/platform/gnr8/architecture/website-version-thumbnail-persistence.ts`.
- `apps/platform/gnr8/architecture/website-version-thumbnail-materializer.ts`.
- `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/thumbnails/**`.
- `docs/architecture/WEBSITE_VERSION_THUMBNAIL_CLOSEOUT.md`.

Limitations: Presentation-only; not source truth, approval, deployment, public sharing, or provider output.

Dependencies: Source screenshots and generated proposal bundles.

MVP relevance: Strongly recommended for operator throughput.

200-site relevance: High for rapid review.

Recommended next action: Keep immutable and private; add batch thumbnail health only if needed.

### OP-16 Knowledge Workspace

Status: Implemented

Description: Read-only workspace surface aggregates source understanding, business foundation, generated proposal links, thumbnails, continuity, limitations, and review context.

Operator value: Gives a single review workspace for a site version.

Entry points: `/gnr8/admin/workspace/[siteVersionId]`, `/gnr8/admin/workspace-overview`.

Lifecycle stage: Review and command workspace.

Evidence:
- `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/page.tsx`.
- `apps/platform/app/gnr8/admin/workspace/[siteVersionId]/knowledge-workspace-components.tsx`.
- `apps/platform/gnr8/architecture/knowledge-workspace-projection.ts`.
- `docs/architecture/KNOWLEDGE_WORKSPACE_RUNTIME_FOUNDATION.md`.

Limitations: Read-only; may duplicate Command Center surfaces.

Dependencies: Runtime provenance and artifact projections.

MVP relevance: Strongly recommended.

200-site relevance: High, but needs list/queue context.

Recommended next action: Consolidate workspace and Command Center workflows.

### OP-17 Generation Evolution Dashboard

Status: Implemented

Description: Read-only dashboard shows generation cycles, iterations, compliance status, recommendations, previews, and thumbnails.

Operator value: Helps compare generated versions and decide next improvement step.

Entry points: `/gnr8/admin/evolution/[siteVersionId]`.

Lifecycle stage: Evolution/review.

Evidence:
- `apps/platform/app/gnr8/admin/evolution/[siteVersionId]/page.tsx`.
- `apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.ts`.
- `apps/platform/app/gnr8/admin/generation-evolution-dashboard-page.test.ts`.
- `docs/architecture/GENERATION_EVOLUTION_DASHBOARD_RUNTIME_FOUNDATION.md`.

Limitations: Read-only; no automated regeneration loop.

Dependencies: Generated proposal artifacts, compliance/evolution artifacts.

MVP relevance: Deferrable for migration-only MVP; useful for regeneration MVP.

200-site relevance: Medium.

Recommended next action: Do not prioritize before bulk migration workflow unless regeneration is in MVP.

### OP-18 Candidate Discovery, Review, And Actions

Status: Partially implemented

Description: Candidate Discovery and Candidate Review artifacts, read-only pages, action controls, and action APIs exist. The full downstream review-to-reconstruction execution chain remains incomplete.

Operator value: Allows human review of source-derived reconstruction candidates.

Entry points: `/gnr8/admin/candidate-discovery/[siteVersionId]`, `/gnr8/admin/candidate-review/[siteVersionId]`.

Lifecycle stage: Reconstruction review.

Evidence:
- `apps/platform/gnr8/architecture/candidate-discovery-*.ts`.
- `apps/platform/gnr8/architecture/candidate-review-*.ts`.
- `apps/platform/app/gnr8/admin/candidate-review/[siteVersionId]/**`.
- `apps/platform/app/api/gnr8/admin/candidate-review/actions/**`.

Limitations: Not yet a scaled operator queue for hundreds of candidates/sites.

Dependencies: First limited dry run, evidence capture, reconstruction package.

MVP relevance: Can be deferred unless reconstruction is in MVP.

200-site relevance: Medium; high for reconstruction quality but heavy for throughput.

Recommended next action: Decide if candidate review is in or after MVP.

### OP-19 Structure Planning And Reconstruction Readiness

Status: Partially implemented

Description: Reconstruction packages, structure plan artifacts, readiness evaluation, and read-only structure/reconstruction surfaces exist, but reconstruction execution is not implemented.

Operator value: Shows what is eligible for future reconstruction.

Entry points: `/gnr8/admin/structure-plan/[siteVersionId]`.

Lifecycle stage: Reconstruction planning.

Evidence:
- `apps/platform/gnr8/architecture/reconstruction-package-*.ts`.
- `apps/platform/gnr8/architecture/structure-plan-*.ts`.
- `apps/platform/gnr8/architecture/reconstruction-dry-run-contract.ts`.
- `docs/architecture/RECONSTRUCTION_CONTROL_PLANE.md`.

Limitations: Metadata/planning only; no AI reconstruction, React/block generation, publish handoff.

Dependencies: Candidate review and source evidence.

MVP relevance: Defer unless MVP includes reconstruction.

200-site relevance: Medium later; not required for first migration wave.

Recommended next action: Keep outside migration MVP critical path.

### OP-20 CMS-Like Content Slots, Draft Overrides, Publish, And Rollback

Status: Implemented

Description: Runtime can infer content slots, save draft overrides, batch save overrides, publish draft overrides, list history, and apply published overrides to raw public runtime output.

Operator value: Enables post-import content edits without rebuilding the whole site.

Entry points: Client content APIs; client dashboard/workspace surfaces.

Lifecycle stage: Manage and evolve.

Evidence:
- `apps/platform/gnr8/runtime/content-binding.ts`.
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/**`.
- `apps/platform/src/public-site/content-override-runtime.ts`.
- `apps/platform/gnr8/site/scoped-import-pipeline.ts` - content slot materialization.

Limitations: Full rich editorial UI coverage is not proven by CAP-1.

Dependencies: Content slot materialization, runtime version scope, agency auth.

MVP relevance: Required.

200-site relevance: High for client changes after migration.

Recommended next action: Verify operator UI and batch edit needs.

### OP-21 Public Runtime Serving

Status: Implemented

Description: Public route resolves host/path to active artifacts or raw template artifacts, applies content overrides, rewrites assets, enforces governance, and records runtime usage.

Operator value: Migrated websites can be served from GNR8 runtime.

Entry points: Public catch-all route `apps/platform/app/(public)/[[...slug]]/route.ts`.

Lifecycle stage: Live serving.

Evidence:
- `apps/platform/app/(public)/[[...slug]]/route.ts`.
- `apps/platform/src/public-site/public-runtime-render.tsx`.
- `apps/platform/src/public-site/raw-template-runtime.ts`.
- `apps/platform/gnr8/runtime/runtime-store.ts`.

Limitations: Runtime mode is `artifact-only`; dynamic app behavior and complex source-system features depend on compatibility paths.

Dependencies: Active pointers, host bindings, artifacts, content overrides.

MVP relevance: Required.

200-site relevance: Required.

Recommended next action: Add operational runtime health dashboard for many sites.

### OP-22 Publish Activation

Status: Implemented

Description: Operators can publish approved site versions. The system builds deterministic artifacts, runs integrity and enforcement checks, switches active pointers, archives older published versions, activates eligible domain bindings, and reports domain warnings.

Operator value: Moves a migrated site/version to live serving.

Entry points: `POST /api/gnr8/runtime/versions/[siteVersionId]/publish`.

Lifecycle stage: Approval to live serving.

Evidence:
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`.
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`.
- `apps/platform/gnr8/runtime/publish-enforcement.ts`.
- `apps/platform/gnr8/runtime/publish-safety-check.ts`.

Limitations: Requires `APPROVED` state; not a full deployment pipeline; domain verification can remain pending.

Dependencies: Version lifecycle, runtime artifacts, governance, domains.

MVP relevance: Required.

200-site relevance: Required.

Recommended next action: Add bulk publish readiness and rollback decision workflow.

### OP-23 Hosting Operations

Status: Implemented

Description: Read-only Command Center hosting overview/detail surfaces show runtime readiness, domain readiness, DNS instructions, recheck workflow state, asset diagnostics, active version/artifact, and diagnostics.

Operator value: Lets operators inspect serving readiness and domain issues.

Entry points: `/gnr8/command-center/hosting`, `/gnr8/command-center/hosting/[siteId]`.

Lifecycle stage: Operations and support.

Evidence:
- `apps/platform/app/gnr8/command-center/hosting/**`.
- `apps/platform/gnr8/runtime/hosting-operations/**`.
- `apps/platform/app/api/gnr8/admin/hosting-operations/**`.
- `docs/ai/MIGRATION_RUNTIME_PROGRESS.md` - Phase 6A-6C context.

Limitations: Mostly read-only; not a complete incident/recovery dashboard.

Dependencies: Runtime store, domain bindings, asset diagnostics.

MVP relevance: Required.

200-site relevance: High.

Recommended next action: Consolidate with batch operations and add failure recovery actions.

### OP-24 Custom Domain Connection And DNS Instructions

Status: Partially implemented

Description: Operators can connect a custom domain through Vercel, persist host binding state, compute DNS instructions, recheck verification, and activate bindings when verified.

Operator value: Lets migrated sites move to customer-owned domains.

Entry points: `POST /api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain`; hosting detail recheck controls.

Lifecycle stage: Domain setup and launch.

Evidence:
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`.
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`.
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`.
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`.
- `apps/platform/supabase/migrations/20260424170000_runtime_domain_host_bindings.sql`.

Limitations: Wildcards unsupported; DNS is instruction/verification oriented; not full registrar/DNS-zone automation.

Dependencies: Vercel credentials, runtime host bindings, Inngest worker.

MVP relevance: Required for launch if customer domains are in scope.

200-site relevance: High.

Recommended next action: Define manual vs automated DNS boundary for MVP.

### OP-25 Openprovider Provider Cockpit And Domain/DNS Inventory

Status: Partially implemented

Description: Superadmin Openprovider surfaces and APIs can read domain availability, domain inventory, and DNS record inventory with fail-closed read-only boundaries.

Operator value: Helps inspect registrar/DNS provider state.

Entry points: `/gnr8/admin/providers/openprovider/**`; related admin provider APIs.

Lifecycle stage: Provider operations.

Evidence:
- `apps/platform/app/gnr8/admin/providers/openprovider/**`.
- `apps/platform/app/api/gnr8/admin/providers/openprovider/**`.
- `apps/platform/gnr8/runtime/providers/openprovider/**`.
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`.

Limitations: Read-only/control-plane; no live domain purchase or DNS mutation.

Dependencies: Openprovider credentials and auth.

MVP relevance: Can be deferred unless Openprovider is mandatory for launch.

200-site relevance: Medium if many domains are managed externally.

Recommended next action: Keep read-only until explicit provider execution ADR.

### OP-26 Migration Jobs And Batches Command Center

Status: Implemented

Description: Durable migration jobs and batches can be created, listed, inspected, run, resumed, and observed through API and Command Center UI. Batch execution is operator-driven and sequential.

Operator value: Gives a practical foundation for managing many migrations.

Entry points: `/gnr8/command-center/migration-batches`; `POST/GET /api/gnr8/admin/migration-batches/**`; migration job APIs.

Lifecycle stage: Bulk migration operations.

Evidence:
- `apps/platform/gnr8/migration-factory/**`.
- `apps/platform/app/api/gnr8/admin/migration-jobs/**`.
- `apps/platform/app/api/gnr8/admin/migration-batches/**`.
- `apps/platform/app/gnr8/command-center/migration-batches/**`.
- `apps/platform/supabase/migrations/20260603120000_migration_job_store.sql`, `20260603130000_migration_batch_store.sql`, `20260603140000_migration_batch_events.sql`.

Limitations: No unattended queue/worker orchestration, leases, heartbeat, retry scheduler, or automatic prioritization found.

Dependencies: Durable stores, MigrationFactory, Command Center.

MVP relevance: Required.

200-site relevance: Critical.

Recommended next action: Add queue/worker/retry decision before 200-site run.

### OP-27 Bulk Migration Actions

Status: Partially implemented

Description: Bulk action types and execution helper exist for import, approve, and publish actions.

Operator value: Helps run repetitive site actions.

Entry points: Command Center bulk action helpers; UI presence not fully confirmed by CAP-1.

Lifecycle stage: Bulk operations.

Evidence:
- `apps/platform/gnr8/command-center/bulk-action-types.ts`.
- `apps/platform/gnr8/command-center/bulk-migration-actions.ts`.
- `apps/platform/gnr8/command-center/migration-state-automation.ts`.

Limitations: Not enough evidence of a complete, safe, audited bulk operator product.

Dependencies: Site action APIs, migration state automation.

MVP relevance: Required or strongly recommended.

200-site relevance: Critical.

Recommended next action: Promote into first-class batch workflow with audit and dry-run preview.

### OP-28 Billing And Cost Visibility

Status: Partially implemented

Description: Cost events, unified cost views, margin metrics, pricing simulation, runtime/AI/migration cost models, and debug APIs exist.

Operator value: Gives internal cost and profitability visibility.

Entry points: Debug/cost APIs; superadmin billing surfaces.

Lifecycle stage: Operations and finance.

Evidence:
- `apps/platform/gnr8/billing/**`.
- `apps/platform/app/api/gnr8/debug/unified-cost/route.ts`.
- `apps/platform/app/api/gnr8/debug/margin/route.ts`.
- `apps/platform/app/api/gnr8/debug/ai-usage/route.ts`.
- `apps/platform/supabase/migrations/20260327090000_billing_account_cost_center_foundation.sql` and `20260327100100_cost_event_logging_foundation.sql`.

Limitations: Debug/internal orientation; not a polished customer billing workflow.

Dependencies: Cost center tables, usage event logging, runtime usage hooks.

MVP relevance: Strongly recommended, not launch-blocking for first internal migration wave.

200-site relevance: High for cost control.

Recommended next action: Decide MVP billing reporting minimum.

### OP-29 Stripe Subscription Billing

Status: Partially implemented

Description: Stripe webhook ingestion maps subscription events to organization subscriptions and entitlements. Superadmin billing modules/repositories exist.

Operator value: Supports subscription/entitlement automation.

Entry points: `POST /api/stripe/webhook`, superadmin billing APIs.

Lifecycle stage: Billing/entitlement.

Evidence:
- `apps/platform/app/api/stripe/webhook/route.ts`.
- `packages/core/src/modules/billing/service.ts`.
- `packages/core/src/modules/entitlement/**`.
- `packages/data/src/repositories/postgres-stripe-events-repository.ts`.
- `packages/data/src/repositories/postgres-subscriptions-repository.ts`.

Limitations: CAP-1 did not find customer checkout, plan management, invoicing UI, or domain/billing integration.

Dependencies: Stripe env vars, subscriptions, entitlements, org metadata.

MVP relevance: Can be deferred if migrations are internal; required if customers self-serve/pay.

200-site relevance: Medium unless monetization is part of MVP.

Recommended next action: Do not describe as complete billing product.

### OP-30 AI Strategy / Orchestration Routes

Status: Ambiguous

Description: Many AI route files exist for strategic planning, migration review, execution replay, adaptation, scheduling, optimization, and wave execution.

Operator value: Potentially useful for AI-assisted migration/evolution.

Entry points: `apps/platform/app/api/gnr8/ai/**`.

Lifecycle stage: AI assistance/evolution.

Evidence:
- `apps/platform/app/api/gnr8/ai/**` - many route files.
- `apps/platform/gnr8/ai/**` - scenario/support files.

Limitations: CAP-1 did not find a consolidated, validated operator workflow tying these routes into the 200-site migration process. Some may be scaffolds or experiments.

Dependencies: AI providers, billing hooks, governance, operator UI.

MVP relevance: Needs architectural decision before MVP.

200-site relevance: Potentially high, but uncertain.

Recommended next action: Run a focused AI-route productization audit before relying on them.

### OP-31 Audit, Forensics, And Operational Review

Status: Partially implemented

Description: Import artifact audit, preview forensics, runtime diagnostics, batch observability, and audit log repositories exist.

Operator value: Supports investigation and support for failed migrations.

Entry points: Admin API routes and Command Center/hosting pages.

Lifecycle stage: Operations/support.

Evidence:
- `apps/platform/app/api/gnr8/admin/import-artifact-audit/**`.
- `apps/platform/app/api/gnr8/admin/preview-forensics/route.ts`.
- `apps/platform/gnr8/runtime/preview-forensics.ts`.
- `apps/platform/gnr8/migration-factory/migration-batch-observability.ts`.
- `packages/data/src/repositories/postgres-audit-log-repository.ts`.

Limitations: No unified incident dashboard or replay console found.

Dependencies: Diagnostics, persisted artifacts/events.

MVP relevance: Required/strongly recommended.

200-site relevance: Critical for failure triage.

Recommended next action: Consolidate into an operator failure recovery dashboard.

### OP-32 Template Library And Template Intake

Status: Implemented

Description: Client template upload/list/detail APIs and worker-side template intake/processing foundation exist, including source zip storage, manifest reading, validation, query services, and processing jobs.

Operator value: Supports reusable templates and bootstrap sources.

Entry points: Client dashboard template library and `/api/gnr8/clients/[clientId]/templates/**`.

Lifecycle stage: Template setup and site creation.

Evidence:
- `apps/platform/app/gnr8/_components/client-dashboard/TemplateLibraryPanel.tsx`.
- `apps/platform/app/api/gnr8/clients/[clientId]/templates/**`.
- `apps/worker/gnr8/template-intake/**`.
- `apps/platform/supabase/migrations/20260415_template_intake_foundation.sql`.

Limitations: CAP-1 did not validate full operator UX maturity.

Dependencies: Worker, storage, client template scope.

MVP relevance: Strongly recommended if using templates for 200 sites.

200-site relevance: High for repeatable patterns.

Recommended next action: Verify template library against migration MVP needs.

### OP-33 Rendered Capture Worker Visibility

Status: Partially implemented

Description: Rendered capture worker server, readiness APIs, worker route handlers, and production hardening reports exist.

Operator value: Improves import fidelity and helps operators see capture availability.

Entry points: Admin readiness route and import diagnostics.

Lifecycle stage: Import evidence capture.

Evidence:
- `apps/platform/gnr8/rendered-capture-worker-server/**`.
- `apps/platform/app/api/gnr8/admin/rendered-capture-worker/readiness/**`.
- `apps/worker/gnr8/rendered-capture-worker-route-handlers.ts`.
- `apps/platform/gnr8/import-rendered-capture-worker/**`.

Limitations: Capture failures still require fallback handling; no operator-wide worker queue dashboard found.

Dependencies: Playwright/chromium, worker deployment, import pipeline.

MVP relevance: Required for fidelity.

200-site relevance: Critical for source capture quality.

Recommended next action: Add worker health and capture failure monitoring to Command Center.

### OP-34 Business Approval

Status: Documented only

Description: Business approval specs exist, but CAP-1 did not find a complete operator approval workflow that gates publish across business stakeholders.

Operator value: Needed for governed client approvals.

Entry points: Not found as complete product flow.

Lifecycle stage: Approval/governance.

Evidence:
- `docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md` - documentation evidence.
- Related provider/governance authorization code exists, but not a complete business approval product.

Limitations: Documentation only for the broad business approval concept.

Dependencies: Review, compliance, publish governance.

MVP relevance: Needs decision. Internal MVP can use operator approval; client-facing MVP may require it.

200-site relevance: High if clients approve every migration.

Recommended next action: Define MVP approval boundary.

### OP-35 Autonomous Evolution / Regeneration Loop

Status: Documented only

Description: Evolution, optimization, AI strategy, and autonomous execution concepts are documented and partially scaffolded, but no complete autonomous regenerate-test-approve-publish loop was found.

Operator value: Future evolution engine for websites after migration.

Entry points: Not complete.

Lifecycle stage: Post-MVP evolution.

Evidence:
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`.
- `docs/architecture/GENERATION_CYCLE_ARCHITECTURE.md`.
- `apps/platform/app/api/gnr8/ai/autonomous-execution-*` route files are signals, but product completeness is not established.

Limitations: No complete operator workflow, deterministic replay contract, or safe publish loop found.

Dependencies: AI, provider execution, approval, compliance, billing, observability.

MVP relevance: Should not be pursued before migration MVP.

200-site relevance: Valuable later; risky before MVP.

Recommended next action: Defer until after MVP boundary and verification phase.

## Prepared But Incomplete Operator Capabilities

- Billing/Stripe: cost and subscription foundations exist, but complete customer billing/checkout/plan-management is not evident. Required for commercial self-serve; can be deferred for internal 200-site migration if cost reporting remains internal.
- DNS/domains: Vercel custom domain connection and verification are real, but registrar/Openprovider mutation is not complete. Required for launch if GNR8 manages domains; manual DNS can be an MVP boundary.
- Provider execution: provider handoffs, approvals, dry-run jobs, and readiness exist, but live generation/provider execution is not complete. Required only if MVP includes AI regeneration.
- Bulk migration: batches exist, but queue/worker/retry/leases/heartbeat are missing. Required for 200-site reliability.
- Business Approval: documented and conceptually important, but not complete as a product. Needs MVP decision.
