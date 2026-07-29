# GNR8 Single-Site End-to-End Gap Audit

Date: 2026-07-29
Phase: MVP-3 documentation audit
Scope: Corrected single-site end-to-end MVP workflow from MVP-2

## Executive Summary

GNR8 has substantial implementation foundations for source intake, rendered capture, runtime artifacts, preview/public serving, active pointer publish, domain binding/readiness observation, cost tracking, and read-only operational surfacing. The implementation is not yet ready to claim the corrected MVP-2 single-site migration workflow end to end.

The largest gaps are source-of-truth orchestration and enforced gates. Current runtime state is centered on runtime site version lifecycle states such as `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`, `PUBLISHED`, and `ARCHIVED`, while MVP-2 requires a richer migration state model from candidate creation through capture, clone, proposal, improvement, domain readiness, subscription, launch approval, publish, rollback, and closeout. Approval boundaries are also not separated enough: proposal approval, content approval, launch approval, and publish activation approval are not first-class enforced checkpoints in the single-site workflow.

Billing/Stripe MVP-lite is partial and unsafe to claim as ready. Cost-center and margin foundations exist, and Stripe webhook handling plus entitlement sync are scaffolded, but there is no verified client/site-scoped hosting subscription creation workflow, no site hosting entitlement source truth, and repository code references subscription/entitlement/stripe event tables that were not found in the reviewed platform migrations.

Batch migration remains deferred. The next implementation work should harden the single-site state machine, evidence/approval gates, and MVP-lite hosting subscription truth before 20-site validation.

## Classification Legend

- Implemented: executable implementation exists and appears aligned with the MVP-2 requirement.
- Partially implemented: meaningful code exists, but gaps remain in scope, integration, operator workflow, evidence, or enforcement.
- Documented only: described in docs or tests, but not connected as runtime behavior.
- Missing: no implementation evidence found in the reviewed repository scope.
- Ambiguous: evidence exists but source-of-truth ownership, schema, or runtime wiring is unclear.
- Unsafe for MVP: implementation exists but is not safe to claim as fulfilling the corrected MVP until guardrails or source truth are fixed.

## Stage 1: Capture

What exists:
- Source URL intake exists through client-scoped import and site creation paths, including agency/client/site ownership checks.
- Rendered capture exists in `apps/worker/gnr8/site/site-render-capture-service.ts` and is consumed by `apps/platform/gnr8/site/scoped-import-pipeline.ts`.
- Single-page import captures rendered DOM, screenshots, computed styles, image candidates, direct stylesheets, scripts, stylesheet-local assets, lazy image fallbacks, gallery anchor hrefs, and diagnostic events in `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`.
- Imported runtime artifacts, raw imported artifacts, asset file rows, content slots, and provenance summaries are persisted through `apps/platform/gnr8/runtime/runtime-store.ts`.
- Multi-page discovery/acquisition is present behind import pipeline options and route-map diagnostics.

What is partial:
- Text extraction and page structure extraction are real enough for runtime materialization, but the canonical MVP-2 source evidence package is not isolated as an operator-reviewed immutable object.
- Image and asset capture are broad for direct/static and rendered-discovered assets, but full replay fidelity for all lazy, background, remote, protected, and script-produced assets remains partial.
- Font extraction is partial: typography/style signals and external font references are observed or preserved, but complete font asset inventory, licensing status, and replay-safe capture are not canonicalized.
- Visual identity and CGP-style extraction exist as style signals/projections, but the operator-facing source evidence review boundary is not complete.
- Failure handling is rich at diagnostic level, but there is no state-owned source capture failure/retry/review flow mapped to `source_capture_failed` and `source_evidence_review_required`.

What is missing:
- A first-class source evidence review workflow with explicit acceptance before clone generation.
- Reproducible replay package boundaries for a 20-site validation operator to inspect without reading raw provenance internals.
- Capture-level approval/evidence references wired to the MVP-2 state machine.

MVP risk:
- P0. Without canonical source evidence acceptance, later clone/proposal/publish decisions can rest on ambiguous source truth.

Required next work:
- Create a single-site migration record/state machine and source evidence package model.
- Add capture completion, failure, replay, and review records as first-class evidence.
- Expose source capture status and evidence review in the operator surface before clone generation.

## Stage 2: 1:1 Clone

What exists:
- The scoped import pipeline creates runtime site versions and artifacts from captured/imported source material.
- Runtime artifact creation, binding, preview serving, active pointer serving, and content slot materialization exist in the runtime store and artifact response paths.
- Asset mapping and source provenance are persisted with imported artifact metadata.
- Runtime integration tests cover happy-path migrate, approve, preview, publish, public resolve, rollback, and form submit behavior.

What is partial:
- The generated import is a best-effort runtime artifact, but it is not explicitly modeled as the MVP-2 `clone_generation_*` product state.
- Multi-page clone handling exists in parts of the import pipeline, but is not yet proven as the default real-site clone workflow.
- Visual/content continuity projections and fidelity-related validations exist, but not as an operator acceptance score tied to the clone review gate.

What is missing:
- Formal clone review, clone revision required/completed workflow, manual correction queue, fidelity scoring, and acceptance evidence.
- Clear clone-to-improved-version lineage that distinguishes a 1:1 clone version from an improved version.

MVP risk:
- P0 for real validation if clone acceptance is not explicit.
- P1 for 20-site validation because fidelity defects will be hard to compare across sites without a stable scoring/revision model.

Required next work:
- Add clone version classification, fidelity score records, clone review decisions, and revision evidence.
- Keep manual correction as a single-site operator workflow before proposal generation.

## Stage 3: Improvement Proposal

What exists:
- Quarantined generated website proposal artifacts exist in `apps/platform/gnr8/architecture/generated-website-proposal-contract.ts` and persistence in `apps/platform/gnr8/architecture/generated-website-proposal-persistence.ts`.
- Those artifacts explicitly classify generated output as implementation-proposal-only, non-executable, not trusted, not approval, not publishing, not DNS mutation, not runtime mutation, and not canonical truth.
- AI transformation planning exists in `apps/platform/gnr8/ai/transformation-planner.ts`, with per-step safety, approval-required flags, preview hints, and policy summaries.
- Workspace/twin proposal approval projections exist, but they are preview-only and mark execution/mutation/publishing as not allowed.

What is partial:
- Proposal generation exists as capability, but it is not the canonical single-site improvement proposal artifact required by MVP-2.
- Proposal persistence exists for quarantined generated proposals, but not as a reviewed, client/site/migration-scoped proposal truth with approval/rejection state.
- Proposal review surfaces exist in workspace/evolution/demo contexts, but not as the MVP-2 operator/client approval boundary.

What is missing:
- First-class proposal approval and rejection events tied to `improvement_proposal_ready`, `improvement_proposal_approved`, and `improvement_proposal_rejected`.
- Evidence refs tying proposal recommendations back to source capture and clone review.
- Distinct proposal approval, content approval, launch approval, and publish activation approval records.

MVP risk:
- P0. The proposal layer is intentionally safe as quarantined material, but it is not yet the approved-improvement source of truth.

Required next work:
- Promote a single-site improvement proposal artifact and approval model that remains separate from execution.
- Require proposal approval before any improved version is created.

## Stage 4: Improvement Implementation

What exists:
- Content slots, content overrides, content draft/publish/rollback history, and runtime site versions provide implementation primitives.
- `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts` can execute selected transformation steps against legacy page storage after explicit `approvedStepIds` or `safeBatch=true`.
- `apps/platform/gnr8/ai/transformation-executor.ts` evaluates execution policy and skips steps that require approval unless explicitly selected.

What is partial:
- The implementation engine can mutate pages, but it does not create the MVP-2 improved runtime version from an approved proposal in the current single-site runtime flow.
- Versioning between clone and improved version exists at a low runtime level, but not as a product state boundary.
- Preview of improved version exists through runtime preview mechanics, but not as a proposal-scoped improved preview workflow.

What is missing:
- Approved-proposal-to-improved-version orchestrator.
- Content approval gate before launch readiness.
- Rejection/revision loop for implemented improvements.
- Audit/evidence refs that explain exactly which approved proposal item changed which runtime artifact/content slot.

MVP risk:
- P0. There is no safe claim that approved improvements can be implemented end to end inside the corrected single-site MVP workflow.

Required next work:
- Build the approved-improvement implementation orchestrator after proposal approval truth exists.
- Require content approval before domain readiness and subscription/launch gates.

## Stage 5: Preview

What exists:
- Runtime preview and artifact serving exist.
- Preview asset boundaries and imported asset artifacts are implemented.
- Generated proposal bundle previews exist for quarantined proposal inspection.

What is partial:
- Preview exists technically, but preview readiness is not tied to `improved_preview_ready` and `content_review_required`.
- Operator preview surfaces do not fully compare source, clone, proposal, improved version, evidence, and blockers in one single-site workflow.

What is missing:
- A canonical improved preview acceptance record.
- Preview evidence package for final content approval.

MVP risk:
- P1. Initial validation can proceed only if operators manually inspect previews, but evidence will be inconsistent.

Required next work:
- Wire improved preview readiness and content approval to the migration state machine.

## Stage 6: Domain/DNS

What exists:
- Domain binding route exists at `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`.
- The route validates ownership, normalizes the domain, adds/checks Vercel project domains, computes manual DNS instructions, persists runtime domain binding state, and updates site domain.
- Vercel domain client and DNS instruction builder exist in `apps/platform/src/lib/vercel/`.
- Background verification exists in `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`.
- DDOM readiness snapshot persistence, writer, stored-state caller, and manual trigger facade exist.
- PASR can consume DDOM snapshots as publish-readiness evidence.

What is partial:
- Domain intent and readiness exist, but not as the complete MVP-2 launch prerequisite state sequence.
- DDOM manual trigger has no integrated UI/API route in the Command Center single-site flow.
- Stale/failed readiness is surfaced in PASR/Command Center read models, but not enforced as a launch blocker.

What is missing:
- DNS owner evidence, exception handling, and operator signoff.
- Domain readiness approval distinction: DDOM readiness is evidence, not launch approval.
- A single launch prerequisite record combining domain intent, DDOM freshness, subscription/hosting readiness, content approval, and rollback readiness.

MVP risk:
- P0 if publish-to-domain is attempted without enforced readiness.
- P1 for 20-site validation because DNS failures and owner-evidence exceptions must be categorized consistently.

Required next work:
- Keep live DNS/registrar/Openprovider mutation out of MVP.
- Integrate manual DNS instructions, DDOM freshness, owner evidence, and exceptions into launch readiness.

## Stage 7: Billing/Subscription/Hosting

What exists:
- Client/agency/site ownership foundations exist.
- Billing accounts and cost centers exist in platform migrations.
- Cost event logging for AI, runtime, and migration usage exists.
- Cost model, unified cost view, margin service, pricing simulation, billing resolution, and cost-center services exist.
- Stripe webhook handling exists for subscription created/updated/deleted events and syncs generic entitlements by plan.
- Superadmin billing read models exist.

What is partial:
- Stripe webhook support is real but reactive; no reviewed checkout/subscription creation path was found for MVP-lite hosting activation.
- Generic organization entitlements exist, but site-scoped hosting entitlement records were not found.
- Repository code references `public.subscriptions`, `public.entitlements`, and `public.stripe_events`, but reviewed platform migrations did not show creation of those tables. That makes schema source truth ambiguous from repository evidence.
- Command Center can show cost/margin/hosting read models, but not subscription-required/subscription-created/hosting-entitlement-ready product states.

What is missing:
- Client-scoped site hosting record as MVP-lite launch prerequisite.
- Subscription creation workflow under selected client/site.
- Stripe customer/subscription source-truth mapping for a single hosted migrated site.
- Hosting entitlement activation record tied to site/domain/public runtime.
- Billing failure handling and launch-blocking behavior.

MVP risk:
- P0. Billing/subscription/hosting activation was moved into MVP-lite scope by MVP-2, and current evidence is not enough to claim it.

Required next work:
- Define and implement MVP-lite site hosting subscription source truth before 20-site validation.
- Verify or add schema ownership for subscription, entitlement, and Stripe event tables before relying on the webhook path.

## Stage 8: Publish

What exists:
- Publish activation route exists at `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`.
- Publish orchestrator exists in `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`.
- Active pointer switching, artifact binding, and publish audit append exist in `apps/platform/gnr8/runtime/runtime-store.ts`.
- Publish target source truth table exists through PTT migration and is consumed by PASR source reader.
- PASR shadow observation is integrated before pointer switch.
- Publish enforcement and render integrity checks exist.

What is partial:
- Publish activation is real, but approval/evidence gates are not fully enforced against MVP-2 launch prerequisites.
- PASR is explicitly shadow-only, non-blocking, feature-flagged, and fails open.
- The publish route can reconcile Vercel domain state when configured, but that does not equal full domain launch readiness.

What is missing:
- Enforced publish activation approval.
- Enforced content approval, domain readiness, subscription/hosting entitlement, and rollback readiness prerequisites.
- Post-publish verification record tied to the intended domain.

MVP risk:
- P0. Publish can mutate active runtime state without the full MVP-2 gate stack.

Required next work:
- Convert PASR findings and launch prerequisites into enforced publish readiness after the source truths exist.

## Stage 9: Rollback

What exists:
- Rollback route exists at `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/rollback/route.ts`.
- Rollback switch logic exists in `apps/platform/gnr8/runtime/rollback-switch.ts` and can switch the active pointer back to a target artifact/version.
- Runtime happy-path tests include rollback.

What is partial:
- Rollback mechanics are real, but rollback readiness evidence is not a launch prerequisite.
- Rollback history is available for content overrides, but not a complete site/domain rollback plan.

What is missing:
- Rollback readiness verification before publish.
- Rollback approval/incident record.
- Post-publish verification and failure recovery workflow.

MVP risk:
- P1 for first validation, P0 for any claim of launch-ready production migration.

Required next work:
- Require rollback target/artifact/domain recovery evidence before publish.

## Stage 10: Closeout

What exists:
- Documentation closeout patterns exist across previous phases.
- Runtime version and publish audit records provide raw inputs for closeout evidence.

What is partial:
- There is no single migration closeout record tying capture, clone, proposal, approvals, subscription, domain, publish, verification, rollback readiness, and operator notes together.

What is missing:
- `migration_closed_out` state implementation.
- Final evidence package and lessons/metrics record for the 20-site validation plan.

MVP risk:
- P1. Validation learning will be fragmented without a closeout record.

Required next work:
- Add closeout state and validation metrics capture after publish/rollback readiness are enforceable.

## Stage 11: 20-Site Validation

What exists:
- MVP-2 defines a 20-site single-site validation plan and metrics.
- Beta migration scoring and dry-run reports exist in validation modules.

What is partial:
- Validation tooling exists in scattered form, but not as a single-site runbook-backed record across all MVP-2 states.

What is missing:
- Per-site validation record with required inputs, approvals, metrics, exceptions, and outcomes.
- Dashboard/report that summarizes the 20-site validation criteria.

MVP risk:
- P1. The team can start internal rehearsals, but should not run formal 20-site validation until P0 source-truth, approval, billing, and publish-readiness blockers are addressed.

Required next work:
- Build validation logging only after the single-site state model is implemented enough to produce consistent data.

## Approval Boundary Findings

The audit explicitly distinguishes these required approvals:
- Proposal approval: Missing as a canonical single-site approval. Existing generated proposal artifacts are quarantined and explicitly not approval.
- Improvement implementation approval: Partial at transformation-step selection level, but not tied to a canonical approved proposal.
- Content approval: Missing as a first-class gate before launch readiness.
- Launch approval: Missing as a gate that combines content, domain, subscription/hosting, and rollback readiness.
- Publish activation approval: Partial/shadow through AAF/PASR evidence and policy-gate components, but not enforced in the publish route for the corrected MVP.

## Source-Of-Truth Findings

Implemented or partial source truths:
- Source capture/import provenance: partial, owned by runtime import provenance and raw imported artifacts.
- Clone/runtime artifact: implemented at runtime version/artifact level, missing clone review truth.
- Improvement proposal: partial/quarantined, not canonical approval truth.
- Improved version: partial through runtime version/content override primitives, missing approved-proposal linkage.
- Domain readiness: partial through runtime domain bindings, Vercel checks, DDOM snapshots, and PASR reads.
- Publish target: implemented by PTT persistence core for production target truth.
- Billing/cost: implemented for cost centers/events/margin; subscription/hosting truth partial/ambiguous.
- Active pointer: implemented.
- Audit/approval/evidence: partial; AAF/PASR components exist, but gate enforcement is incomplete.

## Overall Readiness Estimate

Current corrected single-site MVP readiness estimate: 35-45 percent.

Rationale: capture/runtime/publish/domain foundations are meaningfully implemented, but the workflow cannot yet be treated as an end-to-end migration product because state, approval, evidence, billing/subscription/hosting, and launch/rollback gates are incomplete.

Batch migration remains deferred until the single-site flow is validated.
