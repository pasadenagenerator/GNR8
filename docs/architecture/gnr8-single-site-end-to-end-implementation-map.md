# GNR8 Single-Site End-to-End Implementation Map

Date: 2026-07-29
Phase: MVP-3 documentation audit
Scope: Mapping current implementation evidence to the MVP-2 single-site state model and source-of-truth boundaries.

## Implementation Evidence Reviewed

MVP-2 baseline docs:
- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/product/gnr8-single-site-migration-operator-workflow.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-migration-mvp-realignment-closeout.md`

Implementation and evidence areas inspected:
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/worker/gnr8/site/site-render-capture-service.ts`
- `apps/worker/gnr8/import/runtime/extract-assets.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-guard.ts`
- `apps/platform/gnr8/runtime/publish-enforcement.ts`
- `apps/platform/gnr8/runtime/rollback-switch.ts`
- `apps/platform/gnr8/runtime/version-lifecycle-rules.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/approve/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`
- `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- `apps/platform/src/lib/vercel/domain-dns-instructions.ts`
- `apps/platform/src/lib/vercel/vercel-domain-client.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.ts`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/supabase/migrations/20260327090000_billing_account_cost_center_foundation.sql`
- `apps/platform/supabase/migrations/20260327100100_cost_event_logging_foundation.sql`
- `apps/platform/gnr8/billing/*`
- `packages/core/src/modules/billing/service.ts`
- `packages/core/src/modules/entitlement/service.ts`
- `packages/data/src/repositories/postgres-subscriptions-repository.ts`
- `packages/data/src/repositories/postgres-entitlement-repository.ts`
- `packages/data/src/repositories/postgres-stripe-events-repository.ts`
- `apps/platform/app/api/stripe/webhook/route.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`
- `apps/platform/gnr8/ai/transformation-planner.ts`
- `apps/platform/gnr8/ai/transformation-executor.ts`
- `apps/platform/app/api/gnr8/ai/transformation-plan/route.ts`
- `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
- `apps/platform/gnr8/runtime/twin/twin-proposal-approval.ts`
- `apps/platform/app/gnr8/command-center/*`
- `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx`

## Source-Of-Truth Boundary Map

| Boundary | Current source owner | Projection/read model owner | Audit/evidence owner | Status | Risk |
| --- | --- | --- | --- | --- | --- |
| Source capture | Runtime import provenance, raw imported artifact rows, capture worker outputs | Import diagnostics, provenance summaries, preview assets | Baseline evidence artifact and diagnostics | Partial | No operator evidence acceptance gate |
| Clone runtime version | `gnr8_runtime_site_versions`, page versions, artifacts | Runtime preview/public response paths, Command Center sites/hosting | Runtime artifact/audit append | Partial | No clone review/fidelity truth |
| Improvement proposal | Quarantined generated proposal records in import provenance | Evolution/workspace proposal views | Operator attestation inside quarantined proposal | Partial | Not canonical approval truth |
| Proposal approval | None for corrected single-site MVP | Twin preview-only approval projections | AAF components not wired to proposal | Missing | Blocks implementation |
| Improved version | Runtime site version/content override primitives | Preview/public runtime | Content history and runtime audits | Partial | Missing approved-proposal lineage |
| Content approval | None as first-class MVP-2 gate | None canonical | AAF possible future owner | Missing | Blocks launch readiness |
| Domain readiness | Runtime domain bindings, Vercel checks, DDOM snapshots | Hosting operations read models, PASR read model | DDOM snapshot/evidence builder | Partial | Readiness not launch-enforced |
| Publish target | `gnr8_publish_targets` | PASR source reader/read models | PTT migration metadata | Implemented | Limited target model, no launch bundle |
| Billing/cost | `billing_accounts`, `cost_centers`, cost event tables | Billing/margin/superadmin read models | Cost events | Partial | Subscription/hosting truth missing |
| Stripe subscription | Stripe as external truth, repository projections | Superadmin billing | Stripe webhook event table reference | Ambiguous/partial | Table ownership not verified in migrations |
| Hosting entitlement | Generic organization entitlements | Entitlement service/read checks | Entitlement sync from subscription | Partial/unsafe | Not site-scoped hosting entitlement |
| Active publish pointer | Runtime active pointer tables | Public runtime resolver | Runtime publish audit | Implemented | Pointer switch not fully gated |
| Rollback | Runtime rollback switch and content history | Runtime happy path tests | Active pointer audit | Partial | No readiness evidence |
| Command Center | Derived read models only | Command Center pages | PASR/hosting diagnostics | Partial | Not MVP-2 state cockpit |
| Ops Inbox | PASR-8 derived work items | Ops Inbox shell | PASR redacted projection | Partial | Read-only, shadow-only, no source truth |

## State-By-State MVP-2 Map

| MVP-2 state | Current implementation owner | Status | Canonical source | Required evidence | Required approval | Current operator surface | Missing pieces | Criticality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `site_candidate_created` | Agency/client/site import routes, ownership foundations | Partial | Site/client ownership tables | Candidate URL, client/site refs | None | Agency/site pages | Dedicated migration candidate record | P0 |
| `source_capture_started` | Scoped import pipeline, capture worker | Partial | Import run/provenance | Capture run start, normalized URL | None | Import action/diagnostics | First-class state transition | P0 |
| `source_capture_completed` | Import pipeline, raw artifact persistence | Partial | Runtime import provenance/raw imported artifacts | DOM, screenshots, assets, styles, route map, diagnostics | None | Preview/assets and internal diagnostics | Immutable source evidence package | P0 |
| `source_capture_failed` | Import diagnostics/failure codes | Partial | Import diagnostics | Failure reason, retryability, partial artifacts | None | Logs/diagnostics | Operator failure/retry state | P1 |
| `source_evidence_review_required` | No canonical implementation | Missing | Should be evidence review record | Source evidence package | Source evidence acceptance | None canonical | Review UI and acceptance record | P0 |
| `clone_generation_started` | Runtime version/artifact creation in import pipeline | Partial | Runtime site version/artifact | Clone generation input refs | Source evidence acceptance should precede | Import/preview | State transition and lineage | P0 |
| `clone_generation_completed` | Runtime artifact binding | Partial | Runtime artifact/version | Artifact id, asset map, page map | None | Runtime preview | Clone classification | P0 |
| `clone_review_required` | Fidelity/validation modules, manual preview | Partial | Should be clone review record | Screenshots, score, issues | Clone acceptance | Preview/manual inspection | Review decision, score, issue list | P0 |
| `clone_revision_required` | No canonical revision workflow | Missing | Should be clone revision record | Defects, correction plan | Clone reviewer | None | Manual correction loop | P1 |
| `improvement_proposal_started` | Generated proposal builders, transformation planner | Partial | Quarantined proposal or plan output | Clone refs, source evidence refs | None | Evolution/workspace/AI plan routes | Canonical single-site proposal run | P0 |
| `improvement_proposal_ready` | Quarantined proposal persistence, transformation plan | Partial | Proposal artifact/provenance | Proposal artifact, diffs, rationale | None yet | Read-only proposal views | MVP proposal artifact contract | P0 |
| `improvement_proposal_approved` | Twin approval preview only, AAF possible | Missing | Should be AAF/proposal decision | Approved proposal refs | Proposal approval | None canonical | Approval event and policy gate | P0 |
| `improvement_proposal_rejected` | Twin preview only | Missing | Should be proposal decision | Rejection reason | Proposal rejection | None canonical | Rejection/revision loop | P1 |
| `improvement_implementation_started` | Transformation executor/content overrides | Partial | Runtime/content mutation primitives | Approved proposal refs, work item refs | Proposal approval required | AI execute route/manual | Orchestrator tied to proposal | P0 |
| `improvement_implementation_completed` | Runtime versions/content history primitives | Partial | Improved runtime version/artifact | Diff, changed slots/assets | None | Preview/manual | Approved-improvement lineage | P0 |
| `improved_preview_ready` | Runtime preview | Partial | Runtime artifact/version | Preview URL, screenshot, diagnostics | None | Preview routes | State-owned preview evidence | P1 |
| `content_review_required` | No canonical implementation | Missing | Should be content review record | Improved preview evidence | Content approval | None canonical | Review UI/event | P0 |
| `content_approved` | Runtime `APPROVED` is too coarse | Partial/unsafe | Runtime state currently, should be content approval | Content approval decision | Content approval | Version approve route | Separate content approval scope | P0 |
| `domain_readiness_required` | Domain binding route/DDOM | Partial | Runtime domain binding/DDOM | Domain intent, DNS instructions | None | Hosting detail page | Launch prerequisite composition | P0 |
| `domain_readiness_ready` | Vercel checks/DDOM snapshots | Partial | DDOM snapshot/runtime domain binding | Fresh readiness snapshot, owner evidence | None | Hosting/PASR panels | Enforced freshness and owner evidence | P0 |
| `subscription_required` | No single-site hosting subscription state | Missing | Should be hosting subscription truth | Plan, client/site, price, terms | Billing/launch approval depending policy | None canonical | Client-scoped subscription workflow | P0 |
| `subscription_created` | Stripe webhook projection partial | Partial/unsafe | Stripe plus GNR8 subscription projection | Stripe sub/customer refs | Billing confirmation | Superadmin billing read-only | Checkout/creation path and schema verification | P0 |
| `hosting_entitlement_ready` | Generic entitlements partial | Partial/unsafe | GNR8 hosting entitlement should own | Site entitlement, domain, status | None | Entitlement checks/read models | Site-scoped hosting entitlement | P0 |
| `launch_approval_required` | AAF/PASR components shadow publish only | Missing | Should be AAF launch decision | Content, domain, billing, rollback bundle | Launch approval | None canonical | Gate and evidence package | P0 |
| `publish_ready` | Publish enforcement/render/PASR shadow partial | Partial/unsafe | Publish readiness record should own | Launch approval, target, artifact, rollback | Publish activation approval | Publish route/manual | Enforced prerequisites | P0 |
| `published` | Publish route/orchestrator/active pointer | Implemented with gaps | Runtime active pointer/version state | Publish event, active pointer, domain | Publish activation approval should precede | Runtime/Command Center hosting | Post-publish verification | P0 |
| `rollback_available` | Rollback switch route/mechanics | Partial | Runtime pointer/version artifacts | Rollback target and rehearsal evidence | Rollback approval if invoked | Runtime route/manual | Readiness proof | P1 |
| `migration_closed_out` | Documentation patterns only | Missing | Should be migration closeout record | Final evidence, metrics, exceptions | Closeout signoff | None canonical | Closeout model and UI | P1 |
| `migration_failed` | Scattered diagnostics | Partial | Should be migration state record | Failure cause, recovery, owner | None or exception approval | Logs/diagnostics | Failure state and escalation | P1 |
| `migration_cancelled` | No canonical implementation | Missing | Should be migration state record | Cancellation reason, actor, evidence | Cancellation approval if policy requires | None | Cancellation state | P2 |

## Dependency Map

1. Single-site migration state machine is the dependency for nearly every downstream MVP-2 state.
2. Source evidence package and clone review gates are prerequisites for trustworthy proposal generation.
3. Proposal approval must exist before improvement execution is connected to runtime version creation.
4. Billing/subscription/hosting entitlement truth must exist before launch readiness can be enforced.
5. Domain readiness and DDOM freshness must be integrated before publish readiness can be enforceable.
6. Publish activation approval and rollback readiness must be enforced before 20-site validation is considered formal.
7. Command Center and Ops Inbox should remain derived views and should project from the source-owned state/evidence records.

## Key Architectural Risks

- Runtime lifecycle states are too coarse for the corrected MVP-2 workflow.
- Approval scopes are collapsed or shadow-only; publish activation can proceed without the full launch evidence bundle.
- Billing/Stripe/hosting truth is not site-scoped and has schema ambiguity.
- Domain readiness can be checked and observed, but not yet composed into a launch gate.
- Proposal artifacts are intentionally quarantined and not executable; transformation execution is not linked to canonical proposal approval.
- Command Center and Ops Inbox are useful projections but not source truth.
- Batch migration code and docs must not be treated as MVP proof until single-site state and validation are complete.
