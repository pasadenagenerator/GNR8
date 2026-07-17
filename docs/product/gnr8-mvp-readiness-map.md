# GNR8 MVP Readiness Map

CAP-1 readiness assessment for the goal:

> GNR8 can successfully migrate, regenerate, manage, and evolve approximately 200 existing websites.

## Overall Assessment

GNR8 is not yet MVP-ready for autonomous or fully self-service migration/regeneration of approximately 200 websites. It is meaningfully ready for an operator-assisted migration MVP if the scope is constrained to static or mostly static public websites, raw-template/runtime serving, manual/controlled domain setup, content slot editing, operator-driven batch execution, and Command Center review.

The repository has strong foundations: canonical scoped import, rendered capture, multi-page discovery, durable runtime artifacts, public runtime serving, publish activation, content overrides, migration jobs/batches, hosting operations, thumbnails, and review projections. The main MVP risks are workflow consolidation, bulk intake, unattended orchestration, failure recovery, audit/replay, and source-of-truth clarity.

## Required For MVP

1. Canonical client-scoped import

Why: Existing site intake is the start of every migration.

Evidence: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`, `apps/platform/gnr8/site/scoped-import-pipeline.ts`, `apps/platform/gnr8/site/site-import-contract.ts`.

Readiness: Implemented, but needs bulk wrapper and operator UX.

2. Rendered capture and raw HTML fallback

Why: Import fidelity depends on rendered DOM, screenshots, styles, and explicit fallback diagnostics.

Evidence: `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`, `apps/platform/gnr8/import-rendered-capture/**`, `apps/platform/gnr8/rendered-capture-worker-server/**`.

Readiness: Implemented, but needs batch health monitoring.

3. Static multi-page discovery/import

Why: Most real client sites have multiple pages.

Evidence: `apps/platform/gnr8/multipage-import/**`, `apps/platform/gnr8/site/scoped-import-pipeline.ts`.

Readiness: Partially implemented. MVP must define supported site classes and limits.

4. Runtime artifact persistence and active serving

Why: Migrated sites need durable serving, preview, and publish state.

Evidence: `apps/platform/gnr8/runtime/runtime-store.ts`, `apps/platform/src/public-site/public-runtime-render.tsx`.

Readiness: Implemented.

5. Public runtime serving

Why: Migrated websites must be hosted/served.

Evidence: `apps/platform/app/(public)/[[...slug]]/route.ts`, `apps/platform/src/public-site/**`.

Readiness: Implemented, but needs production monitoring for many sites.

6. Content slots and overrides

Why: Operators/clients must make edits after import.

Evidence: `apps/platform/gnr8/runtime/content-binding.ts`, `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/**`.

Readiness: Implemented, UI coverage needs verification.

7. Publish activation

Why: Approved versions must become active.

Evidence: `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`, `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`.

Readiness: Implemented. Approval and rollback workflow need MVP decision.

8. Migration jobs and batches

Why: 200 sites cannot be managed as isolated one-off requests.

Evidence: `apps/platform/gnr8/migration-factory/**`, `apps/platform/app/gnr8/command-center/migration-batches/**`.

Readiness: Implemented for operator-driven sequential batches. Not ready for unattended orchestration.

9. Command Center and hosting operations

Why: Operators need portfolio-level status, failures, readiness, and domain/asset diagnostics.

Evidence: `apps/platform/app/gnr8/command-center/**`, `apps/platform/gnr8/runtime/hosting-operations/**`.

Readiness: Implemented but fragmented; needs workflow consolidation.

10. Domain connection or explicit manual DNS boundary

Why: Migrated sites eventually need customer domains.

Evidence: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`, `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`.

Readiness: Partially implemented. Vercel path works in code; full DNS/registrar automation does not.

11. Audit/failure recovery

Why: 200 migrations will fail in varied ways; operators need traceability and recovery.

Evidence: diagnostics throughout import/runtime/migration, `apps/platform/gnr8/migration-factory/migration-batch-observability.ts`, audit repositories.

Readiness: Partially implemented. Needs consolidated recovery workflow.

## Strongly Recommended For MVP

1. Source Website Understanding

Why: Helps triage source fidelity and evidence quality.

Readiness: Implemented read-only.

2. Source Content & Visual Continuity

Why: Preserves source-site intent, content, assets, and visual cues.

Readiness: Implemented read-only.

3. Website version thumbnails

Why: Speeds review across many sites.

Readiness: Implemented private/presentation-only.

4. Knowledge Workspace

Why: Gives per-site review context.

Readiness: Implemented read-only, but should be integrated with Command Center.

5. Runtime usage/cost visibility

Why: 200 sites create cost and margin risk.

Readiness: Implemented/partial; not yet a polished product.

6. Preview smoke validation

Why: Prevents broken public/preview routes from scaling silently.

Readiness: Implemented; needs batch/site cohort expansion.

## Can Be Deferred After MVP

1. Full Digital Business Twin productization

Why: Useful for long-term evolution, not required for initial migration throughput.

Evidence: DBT contracts/builders/persistence/runtime twin modules exist.

2. Website Design Brief and Website Generation Package as full operator workflows

Why: Required for deep regeneration, but pure migration can run on import/runtime serving.

Evidence: WDB/WGP builders/persistence exist.

3. Durable Generated Proposal Preview for all sites

Why: Valuable for regeneration QA, not core to source-site migration.

Evidence: generated proposal bundle persistence and preview routes exist.

4. Openprovider registrar/DNS mutation

Why: Manual DNS plus Vercel verification can be sufficient for first MVP if explicitly accepted.

Evidence: Openprovider read-only/control-plane exists; live mutation not complete.

5. Advanced AI strategy/evolution routes

Why: Ambiguous product integration and replay guarantees.

Evidence: `apps/platform/app/api/gnr8/ai/**`.

## Should Not Be Pursued Before MVP

1. Autonomous regeneration/evolution loop

Why: Too many unresolved governance, replay, approval, billing, and deterministic-output risks.

2. Live provider execution without ADR

Why: Provider handoffs/readiness are prepared, but worker execution is not enabled and docs gate execution.

3. Treating generated proposal bundles as production truth

Why: They are review artifacts, not serving/publishing authority.

4. Reopening legacy/non-canonical import paths

Why: Canonical scoped import path exists and legacy routes are explicitly non-canonical.

## Needs Architectural Decision Before MVP

1. MVP scope: migrate vs regenerate

Decision needed: Is MVP a faithful migration/runtime serving product, or a business-led AI regeneration product?

Why it matters: WU/VCU/WGP/provider payload/DBT priorities change drastically.

2. Bulk orchestration architecture

Decision needed: Continue operator-driven sequential batches for MVP, or add queue/worker/retry/leases/heartbeat first?

Why it matters: 200-site reliability and recoverability.

3. Domain/DNS operating model

Decision needed: Manual DNS instructions, Vercel-managed domain attachment, or registrar/DNS provider automation?

Why it matters: Launch workload and support risk.

4. Approval model

Decision needed: Operator approval only, client approval, business approval artifact, or publish based on technical readiness?

Why it matters: Enterprise trust and rollback responsibility.

5. Source of truth for advanced artifacts

Decision needed: Which artifacts are canonical, immutable, persisted separately, or only projections in `importProvenanceSummary`?

Why it matters: Audit/replay and data migration risk.

6. Billing boundary

Decision needed: Internal cost tracking only, subscription billing, client invoicing, AI metering, or all of the above?

Why it matters: Stripe/cost systems are partial, not a full billing product.

## Architecture And Product Warnings

### W-01 Unclear Source Of Truth

Risk: Multiple artifacts, projections, provenance summaries, raw template artifacts, generated bundles, thumbnails, and docs can be mistaken for canonical truth.

Evidence: `apps/platform/gnr8/runtime/runtime-store.ts`, `apps/platform/gnr8/architecture/*persistence.ts`, ADR-003.

Why it matters: Operators may approve or publish from the wrong layer.

Severity: High.

Mitigation: Define a source-of-truth matrix for import, runtime, review, approval, publish, billing, and domain state.

Needed before MVP: Yes.

### W-02 Documentation Drift

Risk: Current docs still say no publishing/DNS in places, while code now has publish activation and Vercel domain flows.

Evidence: `docs/ai/GNR8_CURRENT_STATE.md`, `docs/ai/GNR8_PROJECT_MAP.md`, publish/domain route code.

Why it matters: Architecture planning may undercount or overcount live capabilities.

Severity: High.

Mitigation: Make CAP-1 docs the current baseline and update bootstrap docs after review.

Needed before MVP: Yes.

### W-03 Generated Artifacts As Mutable State

Risk: Advanced artifacts are appended into `importProvenanceSummary`, which can become a mutable mixed-purpose state bag.

Evidence: generated proposal bundle and thumbnail persistence modules update provenance summary.

Why it matters: Auditability and replay weaken if artifacts are not append-only and independently addressable.

Severity: High.

Mitigation: Formalize artifact append-only model and persistence boundaries.

Needed before MVP: Yes for artifacts used by MVP decisions.

### W-04 Provider Output Treated As Deterministic

Risk: Provider/AI outputs could be treated like deterministic pipeline stages.

Evidence: Provider payload/export code exists, but execution is gated; ADR-001 requires deterministic pipeline.

Why it matters: Regeneration QA and replay fail if provider inputs/outputs are not captured immutably.

Severity: High.

Mitigation: Require immutable provider input/output bundles before any provider execution.

Needed before MVP: Only if regeneration/provider execution is in MVP.

### W-05 Insufficient Unified Audit Trail

Risk: Many modules log diagnostics, but not all operator actions share a unified audit model.

Evidence: audit log repositories exist; publish audit exists; route-specific diagnostics vary.

Why it matters: Enterprise customers need who/what/when/why across import, edit, publish, domain, billing, and rollback.

Severity: High.

Mitigation: Define MVP audit event list and implement route-level audit consistency.

Needed before MVP: Yes.

### W-06 Missing Replay/Reproduction Path

Risk: Jobs and stages exist, but a complete replay console/runbook is not evident.

Evidence: MigrationFactory has replay stage support; Command Center lacks full replay UI.

Why it matters: 200-site failures require reproducible recovery.

Severity: High.

Mitigation: Add replay runbook and operator replay controls for allowed stages.

Needed before MVP: Strongly recommended.

### W-07 Partial Billing/DNS Mistaken For Complete

Risk: Stripe webhooks and Openprovider read-only inventories may be mistaken for full billing/DNS products.

Evidence: Stripe webhook service, Openprovider fail-closed read-only APIs, Vercel domain route.

Why it matters: Launch planning can assume unavailable automation.

Severity: High.

Mitigation: Publish a billing/DNS readiness matrix.

Needed before MVP: Yes.

### W-08 Workspace Views Depend On Runtime Assumptions

Risk: Workspace projections rely on current provenance and artifact shapes.

Evidence: Knowledge Workspace, WU, VCU, thumbnails, generated bundles.

Why it matters: Changes in import/persistence can break operator review.

Severity: Medium.

Mitigation: Add projection contract tests over representative site versions.

Needed before MVP: Strongly recommended.

### W-09 Too Many Inspection Pages

Risk: Admin pages are numerous and may not form one operator workflow.

Evidence: `apps/platform/app/gnr8/admin/**`, Command Center, validation pages, provider pages.

Why it matters: 200-site operations need scanning, sorting, triage, and action queues.

Severity: High.

Mitigation: Make Command Center the workflow hub and link specialized pages as drilldowns.

Needed before MVP: Yes.

### W-10 Missing Bulk Migration Workflow

Risk: Batch primitives exist, but bulk intake, prioritization, retry, and safe bulk actions are incomplete.

Evidence: durable batches and bulk action helpers, but no unattended orchestration.

Why it matters: Manual one-by-one operations do not scale to 200 sites.

Severity: Critical.

Mitigation: Add MVP bulk migration workflow design/implementation before migration wave.

Needed before MVP: Yes.

### W-11 Missing Operational Dashboards

Risk: Hosting and batch pages exist, but cross-batch health, worker health, capture health, domain readiness, and cost signals are not unified.

Evidence: separate hosting, migration batch, debug cost, worker readiness surfaces.

Why it matters: Operators need one command view.

Severity: High.

Mitigation: Build MVP operations dashboard.

Needed before MVP: Yes.

### W-12 Missing Failure Recovery Paths

Risk: Diagnostics exist, but automated retry/resume/recovery is incomplete.

Evidence: batch resume exists; no retry scheduler/leases/heartbeat.

Why it matters: 200-site migration will have network, capture, domain, and publish failures.

Severity: Critical.

Mitigation: Define recovery playbook and implement queued retries or explicit manual controls.

Needed before MVP: Yes.

### W-13 Capability Ownership Is Unclear

Risk: Many domains share code across `architecture`, `runtime`, `site`, `migration`, `command-center`, and `api`.

Evidence: Large surface area and overlapping docs.

Why it matters: MVP changes can break adjacent systems.

Severity: Medium.

Mitigation: Assign module owners and source-of-truth docs for MVP areas.

Needed before MVP: Strongly recommended.

### W-14 MVP Boundary Is Unclear

Risk: Migration, regeneration, proposal preview, business twin, provider execution, and autonomous evolution are all present in some form.

Evidence: Current docs and code contain all tracks.

Why it matters: Without boundary, CAP work may expand indefinitely before the 200-site migration.

Severity: Critical.

Mitigation: Hold MVP boundary decision before VCU-3 or new implementation.

Needed before MVP: Yes.

## Practical MVP Recommendation

Before VCU-3, run a short MVP Boundary and Verification phase:

1. Confirm MVP means operator-assisted migration/runtime serving for mostly static existing sites.
2. Define the allowed site classes and unsupported cases.
3. Decide whether batches remain operator-driven or must become queued workers.
4. Decide the domain operating model.
5. Define minimum audit/replay/failure recovery.
6. Update bootstrap docs to align with current publish/domain/billing reality.

VCU-3 can still be next only if it remains design/contract-only and does not distract from MVP boundary closure.

