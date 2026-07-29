# GNR8 Single-Site MVP Next Implementation Sequence

Date: 2026-07-29
Phase: MVP-3 documentation audit

## Ordering Principles

The next work should build the corrected single-site workflow from source truth outward. Runtime publish and domain capabilities already exist in partial form, but they should not be promoted before the source evidence, approval, billing, and launch readiness records they depend on are canonical.

Batch migration remains deferred. Do not implement or validate batch migration until the single-site workflow is proven across at least 20 real websites.

## Milestone 1: Single-Site State And Source Evidence Spine

Goal: Create the canonical single-site migration record and source evidence package.

Implement after MVP-3:
- Single-site migration state machine covering every MVP-2 state.
- Candidate record with client, source URL, intended domain, operator, and timestamps.
- Source capture run record with start/completion/failure transitions.
- Source evidence package containing rendered DOM, raw/source refs, screenshots, assets, fonts/style signals, route map, metadata, diagnostics, and replay refs.
- Source evidence review record and acceptance/rejection decision.
- Failure and retry categorization.

Exit criteria:
- A single site cannot proceed to clone generation until source evidence is complete or explicitly exception-approved.
- Command Center can read the state and evidence summary as a derived view.

## Milestone 2: 1:1 Clone Fidelity Hardening

Goal: Make the best-effort clone an explicit reviewed artifact.

Implement after Milestone 1:
- Clone generation state transitions and lineage from accepted source evidence.
- Clone artifact classification separate from improved versions.
- Fidelity score model and issue list.
- Manual correction/revision workflow.
- Source-to-clone visual/content/asset continuity evidence.
- Multi-page clone acceptance criteria for validation.

Exit criteria:
- A single site cannot proceed to improvement proposal until clone review is accepted or explicitly exception-approved.
- Each validation site has measurable clone fidelity evidence.

## Milestone 3: Improvement Proposal And Implementation Workflow

Goal: Connect proposal generation, proposal approval, implementation, improved preview, and content approval without collapsing approval scopes.

Implement after Milestone 2:
- Canonical single-site improvement proposal artifact.
- Proposal approval and rejection records.
- Approved-proposal-to-improved-version implementation orchestrator.
- Diff/evidence mapping from approved proposal item to content slot, asset, or runtime artifact change.
- Improved preview readiness.
- Content review and content approval gate.
- Rejection/revision loop for proposed and implemented improvements.

Exit criteria:
- Proposal approval, implementation approval, content approval, launch approval, and publish activation approval are distinct.
- Improved versions are traceable back to source evidence, clone review, and approved proposal items.

## Milestone 4: MVP-Lite Billing/Subscription/Hosting Activation Architecture

Goal: Make billing/subscription/hosting activation a real single-site launch prerequisite.

Implement after Milestone 3 can produce an approved improved version:
- Verify or create schema ownership for `subscriptions`, `entitlements`, and `stripe_events`.
- Define site-scoped hosting subscription record.
- Define hosting entitlement record tied to client, site, domain, runtime version, plan, billing account, and Stripe refs where applicable.
- Add subscription creation or controlled manual-attestation workflow for MVP-lite.
- Add billing failure states and operator remediation.
- Add Command Center derived billing/hosting readiness projection.

Exit criteria:
- `subscription_created` and `hosting_entitlement_ready` can be proven for a single site before launch approval.
- Billing/Stripe status is honest: Stripe remains external customer/payment truth where used, GNR8 owns internal hosting entitlement and cost/margin truth.

## Milestone 5: Domain/DNS Launch Workflow Integration

Goal: Integrate domain readiness into launch readiness without adding registrar or DNS mutation.

Implement after Milestone 4:
- Domain intent record tied to the single-site migration.
- Manual DNS instruction evidence and operator/client owner evidence.
- DDOM snapshot trigger route/UI for authorized operators.
- Freshness, stale, failed, and exception handling.
- Vercel readiness and SSL/routing evidence consumption.
- Domain readiness gate feeding launch approval.

Exit criteria:
- Live DNS/registrar/Openprovider mutation remains out of MVP.
- Domain readiness can be classified as ready, blocked, stale, failed, or exception-approved.

## Milestone 6: Publish-To-Domain End-To-End Rehearsal

Goal: Convert existing publish mechanics into the corrected gated publish workflow.

Implement after Milestone 5:
- Publish readiness record that composes content approval, domain readiness, subscription/hosting entitlement, launch approval, publish target, artifact integrity, and rollback readiness.
- Enforced publish activation approval.
- PASR findings moved from shadow observation into enforceable readiness once source truths are mature.
- Post-publish verification against the intended domain.
- Command Center derived state for capture, clone, proposal, domain, billing, publish, and verification.

Exit criteria:
- Publish cannot switch active production pointer unless all MVP-lite prerequisites are satisfied or explicitly exception-approved.
- Publish result records the active pointer, artifact, domain, verification result, and evidence refs.

## Milestone 7: Rollback Readiness Verification

Goal: Prove rollback before and after publish.

Implement after Milestone 6 publish readiness exists:
- Rollback target selection and readiness evidence.
- Pre-publish rollback rehearsal or static readiness proof.
- Rollback activation approval/incident record.
- Post-rollback verification.
- Failure recovery runbook.

Exit criteria:
- Every launch has rollback readiness before publish.
- Every published validation site has rollback evidence.

## Milestone 8: 20-Site Validation Run

Goal: Prove the corrected workflow on at least 20 real websites, one site at a time.

Implement after P0 blockers are cleared:
- Per-site validation record.
- Metrics capture for source capture success, clone fidelity, manual correction time, proposal usefulness, improvement implementation time, DNS blockers, subscription/billing success, publish success, rollback readiness, operator time, cost, approval cycles, and defects.
- Closeout record per site.
- Aggregate validation report.

Exit criteria:
- 20 real websites are run through the single-site workflow or categorized with documented blockers.
- Batch migration remains deferred until this validation passes.

## Recommended Immediate Next Milestone

Start with Milestone 1: single-site state and source evidence spine.

Do not begin billing UI, domain automation, batch migration, or public launch expansion until the state/evidence spine can prove what stage a single site is in and why the next action is allowed.
