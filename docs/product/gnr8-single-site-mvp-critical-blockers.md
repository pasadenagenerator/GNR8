# GNR8 Single-Site MVP Critical Blockers

Date: 2026-07-29
Phase: MVP-3 documentation audit

## P0 Blockers

### P0-1: No canonical single-site migration state machine

Description: The MVP-2 workflow requires states from `site_candidate_created` through `migration_closed_out`. Current implementation primarily exposes runtime version states such as `DRAFT`, `READY_FOR_REVIEW`, `APPROVED`, `PUBLISHED`, and `ARCHIVED`, plus scattered diagnostics.

Affected states: All MVP-2 states.

Evidence: `apps/platform/gnr8/runtime/version-lifecycle-rules.ts`, `apps/platform/gnr8/runtime/runtime-store.ts`, and publish/approve routes show runtime lifecycle ownership, not a migration lifecycle.

Risk: Operators cannot know which single-site stage is canonical, which evidence is required, or which gate is allowed next.

Recommended fix milestone: Milestone 1, single-site state and evidence spine.

Must solve before 20-site validation: Yes.

### P0-2: Source evidence review is not first-class

Description: Capture artifacts and diagnostics exist, but there is no canonical source evidence package review and acceptance gate before clone generation.

Affected states: `source_capture_completed`, `source_evidence_review_required`, `clone_generation_started`.

Evidence: Capture outputs are persisted in import provenance/raw artifact/runtime asset paths, while no source evidence review record or approval route was found.

Risk: Clone, proposal, and publish decisions can be made from incomplete or ambiguous source truth.

Recommended fix milestone: Milestone 1, capture/source evidence hardening.

Must solve before 20-site validation: Yes.

### P0-3: Clone review and fidelity acceptance are missing

Description: Runtime artifacts can be generated and previewed, but no required clone review, clone revision, fidelity score, or manual correction state is canonical.

Affected states: `clone_generation_completed`, `clone_review_required`, `clone_revision_required`, `improvement_proposal_started`.

Evidence: Runtime artifact creation exists in `scoped-import-pipeline.ts` and `runtime-store.ts`; validation/scoring modules exist, but no clone acceptance truth was found.

Risk: The system cannot prove best-effort 1:1 clone quality before proposing improvements.

Recommended fix milestone: Milestone 2, 1:1 clone fidelity hardening.

Must solve before 20-site validation: Yes.

### P0-4: Improvement proposal approval is not canonical

Description: Generated proposal artifacts are intentionally quarantined and non-executable; transformation planning exists, but no canonical single-site proposal approval/rejection source truth is implemented.

Affected states: `improvement_proposal_ready`, `improvement_proposal_approved`, `improvement_proposal_rejected`, `improvement_implementation_started`.

Evidence: `generated-website-proposal-contract.ts` marks proposals as implementation-proposal-only, not approval, not runtime mutation, and not publishing. Twin proposal approval records are preview-only.

Risk: Improvements cannot be safely tied to a human-approved proposal.

Recommended fix milestone: Milestone 3, improvement proposal and implementation workflow.

Must solve before 20-site validation: Yes.

### P0-5: Content, launch, and publish activation approvals are not separated and enforced

Description: MVP-2 requires distinct proposal approval, content approval, launch approval, and publish activation approval. Current runtime approval is too coarse, and PASR is shadow-only.

Affected states: `content_approved`, `launch_approval_required`, `publish_ready`, `published`.

Evidence: Version approve route transitions to `APPROVED`; PASR shadow observation is non-blocking; publish route calls the publish orchestrator without the full MVP-2 launch gate stack.

Risk: A site can be published without complete approval/evidence separation.

Recommended fix milestone: Milestones 3, 5, and 6.

Must solve before 20-site validation: Yes.

### P0-6: Billing/Stripe/hosting activation is unsafe to claim for MVP-lite

Description: Billing cost foundations and Stripe webhook projection exist, but no site-scoped hosting subscription creation and entitlement readiness workflow was found.

Affected states: `subscription_required`, `subscription_created`, `hosting_entitlement_ready`, `launch_approval_required`.

Evidence: `billing_accounts`, `cost_centers`, and cost event tables exist; Stripe webhook code syncs generic org entitlements. Repository code references `public.subscriptions`, `public.entitlements`, and `public.stripe_events`, but creation migrations for those tables were not found in the reviewed platform migrations.

Risk: MVP-lite billing was moved into scope, but launch readiness cannot depend on unverified or non-site-scoped billing truth.

Recommended fix milestone: Milestone 4, MVP-lite billing/subscription/hosting activation architecture.

Must solve before 20-site validation: Yes.

### P0-7: Publish-to-domain readiness is not enforced

Description: Publish mechanics are real, but publish readiness does not enforce content approval, domain readiness, subscription/hosting entitlement, launch approval, publish activation approval, and rollback readiness as one prerequisite bundle.

Affected states: `domain_readiness_ready`, `hosting_entitlement_ready`, `launch_approval_required`, `publish_ready`, `published`, `rollback_available`.

Evidence: Domain/Vercel readiness checks and DDOM/PASR observations exist; publish activation still performs real pointer switching with PASR as shadow-only.

Risk: A production publish can occur before corrected MVP launch prerequisites are satisfied.

Recommended fix milestone: Milestones 5, 6, and 7.

Must solve before 20-site validation: Yes.

## P1 Blockers

### P1-1: Multi-page capture and clone proof is incomplete for 20 real websites

Description: Multi-page discovery and route maps exist, but the default operator workflow and validation metrics are not proven across varied real sites.

Affected states: `source_capture_completed`, `clone_generation_completed`, `clone_review_required`.

Evidence: Import pipeline includes multi-page options and route-map diagnostics; MVP-2 validation requires 20 real websites with measured outcomes.

Risk: 20-site validation results will be inconsistent or hard to compare.

Recommended fix milestone: Milestones 1 and 2.

Must solve before 20-site validation: Yes.

### P1-2: Domain owner evidence and exception handling are missing

Description: Manual DNS instructions and Vercel checks exist, but domain owner proof, exception categories, stale readiness handling, and operator signoff are not complete.

Affected states: `domain_readiness_required`, `domain_readiness_ready`, `launch_approval_required`.

Evidence: Domain route and verification job handle Vercel readiness; DDOM/PASR expose missing/stale readiness, but no owner evidence record was found.

Risk: DNS blockers cannot be reliably categorized during validation.

Recommended fix milestone: Milestone 5.

Must solve before 20-site validation: Yes.

### P1-3: Rollback readiness evidence is missing

Description: Rollback mechanics exist, but there is no pre-publish proof that rollback target, active pointer, domain serving, and recovery path are ready.

Affected states: `rollback_available`, `publish_ready`, `published`.

Evidence: Rollback route/switch and happy-path tests exist; no rollback readiness evidence model was found.

Risk: Operators may publish without knowing rollback is available.

Recommended fix milestone: Milestone 7.

Must solve before 20-site validation: Yes.

### P1-4: Command Center does not project the full MVP-2 single-site state

Description: Command Center shows useful hosting, sites, batches, and PASR shadow information, but not the full capture/clone/proposal/billing/publish/rollback state model for one site.

Affected states: All operator-visible states.

Evidence: Command Center pages and read models are derived; Ops Inbox only surfaces PASR-derived publish shadow work items.

Risk: Operators cannot run 20 sites reliably from one state cockpit.

Recommended fix milestone: Milestone 6 or 8, after source truths exist.

Must solve before 20-site validation: Yes for formal validation, no for limited engineering rehearsals.

### P1-5: Closeout and validation metrics are not state-owned

Description: MVP-2 requires 20-site metrics and migration closeout. No canonical closeout record exists.

Affected states: `migration_closed_out`, validation reporting.

Evidence: Prior phase closeout docs exist; runtime events and diagnostics are scattered.

Risk: 20-site validation will lack comparable evidence and lessons.

Recommended fix milestone: Milestone 8.

Must solve before 20-site validation: Yes.

## P2 Blockers

### P2-1: Failure and cancellation states are incomplete

Description: Diagnostics exist, but `migration_failed` and `migration_cancelled` are not complete operator states with owner, reason, and recovery plan.

Affected states: `migration_failed`, `migration_cancelled`.

Evidence: Capture/import/publish routes emit errors and diagnostics, but no unified migration failure/cancellation state was found.

Risk: Exception handling remains manual and inconsistent.

Recommended fix milestone: Add after P0 state spine.

Must solve before 20-site validation: Helpful but can be bounded by manual operator logging.

### P2-2: Replay and reproducibility package is incomplete

Description: Source evidence is persisted, but a replay-safe package for future inspection is not canonical.

Affected states: `source_capture_completed`, `source_evidence_review_required`.

Evidence: Raw imported artifacts and screenshots exist; replay contract and review workflow were not found.

Risk: Debugging clone defects across validation sites will be slower.

Recommended fix milestone: Milestone 1 or 2.

Must solve before 20-site validation: Recommended, not strictly required for first rehearsals.

### P2-3: Public runtime post-publish verification is not formalized

Description: Public resolve and runtime serving exist, but intended-domain verification evidence is not a closeout prerequisite.

Affected states: `published`, `migration_closed_out`.

Evidence: Runtime happy-path tests verify public resolve; no production verification record was found.

Risk: Operators may miss launch regressions.

Recommended fix milestone: Milestone 6.

Must solve before 20-site validation: Yes for formal validation.

## P3 Blockers

### P3-1: Batch migration remains deferred

Description: Batch/bulk migration docs and Command Center batch tools exist, but MVP-2 explicitly defers batch migration until single-site validation is proven.

Affected states: Future scale only.

Evidence: MVP-2 boundary and validation plan defer 10+ and 200-site migration; BMF-1 is context only.

Risk: Premature scale work would hide single-site workflow gaps.

Recommended fix milestone: Post 20-site validation.

Must solve before 20-site validation: No. It must remain deferred.

### P3-2: Provider/AI automation expansion is future scope

Description: AI transformation and provider handoff foundations exist, but autonomous generation/execution is outside this audit's implementation scope.

Affected states: Future automation.

Evidence: Generated proposal contracts explicitly prohibit AI/provider execution and canonical truth mutation.

Risk: Treating advisory outputs as executable truth would violate MVP-2 approvals.

Recommended fix milestone: Post MVP after approval/evidence foundation is enforced.

Must solve before 20-site validation: No.
