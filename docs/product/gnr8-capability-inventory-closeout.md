# GNR8 CAP-1 Closeout

CAP-1 is a documentation and analysis phase only. No runtime behavior, APIs, schemas, migrations, provider payload generation, billing behavior, Stripe behavior, DNS/domain behavior, deployment behavior, website generation behavior, thumbnails, generated proposal bundles, or workspace runtime code were intentionally changed.

## What Was Reviewed

Repository areas reviewed:

- Application surfaces: `apps/platform/app/gnr8/**`, public route, admin/superadmin pages, login/signup/onboarding.
- API surfaces: `apps/platform/app/api/gnr8/**`, `apps/platform/app/api/stripe/webhook/route.ts`, auth/superadmin/org APIs.
- Worker/runtime: `apps/worker/gnr8/**`, `apps/platform/gnr8/runtime/**`, rendered capture worker server, runtime contracts.
- Import and migration: `apps/platform/gnr8/import/**`, `importer/**`, `import-rendered-capture/**`, `multipage-import/**`, `migration/**`, `migration-factory/**`, `site/**`.
- Understanding/proposal/evolution: `apps/platform/gnr8/architecture/**`, admin workspace/evolution/understanding/continuity pages.
- Command Center: `apps/platform/app/gnr8/command-center/**`, `apps/platform/gnr8/command-center/**`.
- Billing/Stripe: `apps/platform/gnr8/billing/**`, `packages/core/src/modules/billing/**`, `packages/core/src/modules/entitlement/**`, Stripe route, data repositories.
- DNS/domains/hosting: Vercel domain libraries, runtime DNS/domain modules, Openprovider modules/routes, hosting operations.
- Storage/persistence/auth/testing/docs/scripts: Supabase migrations, repositories, auth/RBAC, validation areas, package scripts, canonical docs.

## What Was Excluded

Excluded as archive/legacy/duplicate/generated/temporary/build/dependency material:

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
- Generated ODV/export folders except as referenced historical/generated context.
- Root founder-level strategy specs identified by the canonical doc index as archive-level context.

## Classification Method

Capabilities were classified by strongest current evidence:

- Implemented required executable code and supporting structure such as routes, services, stores, tests, schemas, UI, or worker jobs.
- Partially implemented required meaningful code but missing product flow, scale validation, automation, or completeness.
- Prepared required contracts, docs, scaffolding, dry-run gates, or read-only/sandbox modules without active completion.
- Documented only required current documentation but no implementation evidence.
- Historical / obsolete required evidence only in excluded legacy/archive/decommission contexts or explicit non-canonical paths.
- Ambiguous was used where files/routes exist but CAP-1 could not confirm product integration or operational readiness.

## Key Operator-Facing Capabilities

Implemented highlights:

- Agency/client/member management and RBAC.
- Canonical client-scoped URL import.
- Source Website Understanding read-only projection.
- Source Content & Visual Continuity read-only projection.
- Durable generated proposal preview.
- Website version thumbnails.
- Knowledge Workspace and Generation Evolution Dashboard.
- Content slots, draft overrides, content publish/rollback APIs.
- Public runtime serving.
- Publish activation.
- Hosting Operations.
- Migration jobs and migration batches.
- Template library/intake.

Partially implemented or prepared highlights:

- Static multi-page import.
- Business Foundation/Business Discovery runtime cutover.
- DBT/WDB/WGP chain.
- Provider payload/handoff execution.
- Candidate review/reconstruction planning.
- Custom domains/DNS beyond Vercel.
- Openprovider provider cockpit.
- Bulk migration actions.
- Billing/Stripe productization.
- AI strategy/orchestration route surface.
- Audit/forensics and failure recovery.

Operator status counts:

- Implemented: 15
- Partially implemented: 14
- Prepared: 2
- Documented only: 2
- Historical / obsolete: 1
- Ambiguous: 1

## Key Technical / Platform Capabilities

Implemented highlights:

- Monorepo runtime structure.
- Supabase/Postgres persistence.
- Runtime artifact store and active serving model.
- Deterministic IDs/hashing.
- Static import, URL rendered capture, rendered capture worker.
- Scoped import pipeline.
- Linear migration pipeline and quality gates.
- Durable job/batch stores.
- Command Center read models.
- Preview runtime and public runtime.
- Content override store.
- Publish governance/lifecycle.
- Vercel custom domain binding/verification.
- Template intake/site bootstrap.
- Billing cost model/cost events.
- WU/VCU projections.
- Generated proposal bundle durability.
- Thumbnail artifacts.
- Preview smoke validation.

Partial/prepared highlights:

- Multi-page import beyond static/controlled cases.
- Rollback operator workflow.
- Openprovider/DNS provider execution.
- Provider approvals/handoffs without worker execution.
- Worker coverage for migration queues.
- Stripe beyond webhook/entitlements.
- Business artifact chain as complete product.
- Audit and observability consolidation.
- AI route surface.
- Business approval and autonomous evolution.

Technical status counts:

- Implemented: 27
- Partially implemented: 8
- Prepared: 3
- Documented only: 2
- Historical / obsolete: 1
- Ambiguous: 1

## Prepared But Incomplete Capabilities

Billing/Stripe:
- Exists today: cost centers, cost events, AI/runtime/migration cost models, unified cost, margin, pricing simulation, Stripe webhook, subscription/entitlement sync.
- Missing: customer checkout, customer billing UI, plan management, invoicing/customer portal evidence, billing-domain/provider integration.
- Type: both operator-facing and technical.
- Required for MVP: only if commercial self-serve is in MVP; internal cost reporting is strongly recommended.
- 200-site need: cost visibility yes; full Stripe product optional.
- Risk if ignored: cost overruns and mistaken billing readiness.
- Recommended milestone: MVP Billing Boundary and Cost Visibility Verification.

DNS/domains:
- Exists today: Vercel custom domain add/status, DNS instruction computation, domain host bindings, scheduled verification worker, hosting operations visibility, Openprovider read-only/sandbox/control-plane.
- Missing: full DNS-zone mutation, registrar purchase, Openprovider live execution, wildcard support, bulk domain launch dashboard.
- Type: both.
- Required for MVP: domain operating model is required; full automation may be deferred.
- 200-site need: high if domains move during migration.
- Risk if ignored: launch bottleneck and support burden.
- Recommended milestone: MVP Domain Operating Model Decision.

Provider execution:
- Exists today: provider payloads, approvals, handoffs, readiness gates, dry-run plans, worker envelope preview.
- Missing: live provider worker execution and audited output capture.
- Type: both.
- Required for MVP: only if regeneration/provider execution is in MVP.
- 200-site need: high for AI regeneration, low for faithful migration serving.
- Risk if ignored: false assumption that GNR8 can regenerate autonomously.
- Recommended milestone: Provider Execution ADR, after MVP boundary.

Bulk migration orchestration:
- Exists today: durable jobs/batches, sequential operator-driven executor, observability, Command Center pages.
- Missing: queue workers, retry scheduling, leases, heartbeat, bulk intake UI, bulk failure recovery.
- Type: both.
- Required for MVP: yes for 200-site reliability.
- 200-site need: critical.
- Risk if ignored: manual throughput bottleneck and unrecovered failures.
- Recommended milestone: Bulk Migration MVP Boundary and Orchestration Design.

Business approval:
- Exists today: specs and related governance concepts.
- Missing: complete operator/client business approval runtime.
- Type: operator-facing.
- Required for MVP: depends on customer approval scope.
- 200-site need: high if clients approve each site.
- Risk if ignored: unclear publish authority.
- Recommended milestone: MVP Approval Boundary Decision.

## MVP Readiness

MVP-ready if constrained:
- Operator-assisted migration/runtime serving.
- Public, static or mostly static sites.
- Manual or Vercel-guided domain setup.
- Operator-driven batches.
- Read-only understanding/continuity review.
- Content edits through content slot/override system.

Not MVP-ready if defined as:
- Autonomous 200-site migration.
- Full AI regeneration at scale.
- Fully automated DNS/registrar migration.
- Full customer billing platform.
- Complete business approval workflow.
- Fully unattended migration queue with retries and leases.

## Critical Risks

Critical/high risks documented in `docs/product/gnr8-mvp-readiness-map.md`:

- Unclear source of truth.
- Documentation drift.
- Generated/projection artifacts becoming implicit mutable state.
- Provider output mistaken for deterministic output.
- Insufficient unified audit trail.
- Missing replay/reproduction paths.
- Partial billing/DNS mistaken for complete.
- Workspace views depending on transient runtime assumptions.
- Too many inspection pages without workflow consolidation.
- Missing bulk migration workflow.
- Missing operational dashboards.
- Missing failure recovery paths.
- Unclear capability ownership.
- Unclear MVP boundary.

## Recommended Next Milestone

Recommended next milestone before VCU-3 implementation:

MVP Boundary and Verification Closeout.

Purpose:

1. Decide whether MVP is migration/runtime serving or regeneration.
2. Define supported site classes for the 200-site migration.
3. Decide whether operator-driven batches are sufficient or queue workers are required.
4. Define domain/DNS operating model.
5. Define approval and rollback requirements.
6. Define MVP audit/replay/failure recovery requirements.
7. Update canonical bootstrap docs to reflect publish/domain/billing reality.

VCU-3 can still be next only if it remains design/contract-only and is explicitly subordinated to the MVP boundary decision.

## Validation Checklist

- Only documentation files were created.
- No runtime code was modified.
- No APIs were modified.
- No provider payload generation was modified.
- No database schemas or migrations were modified.
- No billing or Stripe behavior was modified.
- No DNS/domain behavior was modified.
- No deployment or website generation behavior was modified.
- No thumbnails or generated proposal bundles were modified.
- All capability lists are in English.
- Every capability has a status.
- Every capability has repository evidence or is explicitly marked ambiguous/documented-only/historical.
- Archive, obsolete, deprecated, superseded, backup, scratch, temporary, build, dependency, and generated materials were excluded unless explicitly referenced as context.
- Prepared/incomplete capabilities were not described as complete.
- Billing/Stripe and DNS/domain capabilities were specifically searched and classified.
- MVP readiness specifically addresses migrating approximately 200 existing websites.

CAP-1 status: Complete pending architectural review.
