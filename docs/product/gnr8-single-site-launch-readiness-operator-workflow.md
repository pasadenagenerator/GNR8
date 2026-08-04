# GNR8 Single-Site Launch Readiness Operator Workflow

Phase: MVP-36
Scope: Documentation and product workflow only.

This workflow defines how operators should prepare launch readiness after validated launch approval and before publish activation review. It does not implement UI, actions, routes, services, workers, persistence, billing activation, provider calls, DDOM snapshot creation, publish activation, publish execution, rollback execution, Command Center actions, Ops Inbox actions, or client portal work.

## Operator Goal

Produce a launch readiness package that proves the improved candidate is operationally ready to proceed to publish activation approval review, or clearly records why it is blocked.

## Required Workflow

1. Review validated launch approval.
   - Confirm exact `single_site_launch_approval` AAF decision scope, candidate refs, content approval refs, required client approval refs, limitations, and semantic watermark.
   - If launch approval is missing, stale, revoked, superseded, expired, wrong-scope, or candidate-mismatched, stop readiness work.

2. Confirm improved candidate truth.
   - Verify runtime site version and runtime artifact refs match launch approval, content approval, and selected candidate.
   - Verify artifact bundle/governance/renderer compatibility/publish stage watermarks are current.
   - If changed, return to the source-owned candidate/content/launch approval workflow.

3. Collect publish target truth.
   - Read the canonical PTT target row and policy watermark.
   - Confirm intended environment, stage, target kind, status, and allowed artifact stage.
   - Missing, disabled, retired, or mismatched target blocks launch readiness.

4. Collect domain and DDOM evidence.
   - Review latest DDOM snapshot for the target site/domain/version.
   - Confirm readiness state, freshness, blockers, warnings, and source watermark.
   - Review DNS instruction/operator evidence, owner evidence, Vercel/custom-domain/SSL stored-state refs where applicable.
   - If DDOM is missing/stale, refresh DDOM outside PASR through the DDOM manual/source-owned workflow.
   - Never run DDOM snapshot creation from PASR or publish evaluation.

5. Verify billing/subscription/hosting entitlement.
   - Confirm a future site-scoped hosting/subscription/entitlement source exists before claiming ready.
   - Cite Stripe customer/subscription/payment refs when policy requires Stripe truth.
   - Current cost-center, margin, webhook, and org entitlement foundations are evidence-only unless a site-scoped hosting readiness source has been implemented and verified.
   - Missing or ambiguous billing/hosting truth blocks launch readiness.

6. Confirm rollback readiness.
   - Identify known-good runtime version/artifact or recovery plan.
   - Confirm current active pointer/history refs and content recovery refs are current enough for the launch path.
   - Record limitations when only a recovery plan exists and policy permits.
   - Do not execute rollback during readiness.

7. Review smoke QA and preview evidence.
   - Confirm smoke/preview run refs match the improved candidate watermark.
   - Review route status, required asset checks, forbidden fallback markers, operator QA notes, and limitations.
   - Missing/stale/failed smoke evidence blocks or must be accepted as a carried limitation by source-owned policy.

8. Review PASR diagnostics if present.
   - Treat PASR shadow evidence as optional diagnostic evidence for future publish activation readiness.
   - Do not treat PASR shadow ready as launch readiness or publish permission.
   - Use PASR warnings to prepare DDOM, publish target, and publish activation approval follow-up.

9. Classify missing, stale, blocked, and limitation items.
   - Assign each item to the source owner workflow.
   - P0 blockers and unaccepted stale required sources block launch readiness.
   - Accepted limitations must carry forward into publish activation review.

10. Prepare publish activation approval handoff.
    - If launch readiness is ready or ready with limitations, prepare a handoff package for the separate AAF `publish_activation` workflow.
    - The handoff is not publish activation approval and not publish execution.

## Owner Resolution Table

| Condition | Owner workflow | Readiness behavior |
| --- | --- | --- |
| Launch approval stale or invalid | Launch approval AAF/single-site workflow | Blocks. |
| Content/client approval stale | Content/client approval workflow | Blocks. |
| Candidate version/artifact mismatch | Improved candidate/runtime workflow | Blocks. |
| Publish target missing/invalid | PTT admin/source-truth workflow | Blocks. |
| DDOM missing/stale | DDOM manual snapshot refresh outside PASR | Blocks until refreshed or excepted. |
| DNS owner/instruction evidence missing | Domain/DNS operator workflow | Blocks for custom-domain paths. |
| Vercel/custom-domain/SSL stored state stale | Domain/DDOM workflow | Blocks when required. |
| Site-scoped hosting entitlement missing | Billing/hosting MVP-lite workflow | Blocks. |
| Stripe refs missing when required | Billing/Stripe reconciliation workflow | Blocks. |
| Rollback target/plan missing | Rollback readiness workflow | Blocks. |
| Smoke QA missing/stale/failed | Preview/smoke QA workflow | Blocks or limitation by policy. |
| PASR shadow missing | Optional PASR workflow | Does not block launch readiness. |
| Publish activation approval missing | AAF publish activation workflow | Does not block readiness once package is ready; it is the required next step. |

## Handling Ready With Limitations

Operators may classify readiness as `ready_with_limitations` only when:

- every required source owner has current refs or an accepted exception;
- limitations are explicit, scoped, non-expired, and carried from source-owned evidence;
- no unresolved open P0 blocker remains;
- publish activation review receives the limitation list and source refs.

Limitations must not be converted into `ready` by projection or UI language.

## Prohibited Operator Shortcuts

Operators must not:

- treat launch approval as domain, billing, rollback, smoke QA, publish activation, or publish execution readiness;
- treat DDOM readiness as launch or publish approval;
- treat billing readiness as launch approval;
- treat Stripe webhook state alone as site hosting entitlement;
- treat PASR shadow status as enforcement;
- treat Command Center or Ops Inbox projection as source truth;
- create DDOM snapshots from PASR;
- call Stripe, Vercel, Openprovider, registrars, DNS providers, SSL providers, or AI from the readiness review;
- mutate active pointers, runtime artifacts, site versions, content overrides, domain bindings, publish targets, rollback state, billing state, Command Center, Ops Inbox, or client portal state.

## Completion Criteria

The workflow is complete when one of these is recorded in the future package:

- `launch_readiness_ready`;
- `launch_readiness_ready_with_limitations`;
- `launch_readiness_blocked`.

The next source-owned step after ready or ready with limitations is `publish_activation_approval_required`.
