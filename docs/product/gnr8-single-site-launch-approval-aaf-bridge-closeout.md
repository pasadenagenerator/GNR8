# GNR8 Single-Site Launch Approval AAF Bridge Closeout

Phase: MVP-35
Date: 2026-08-03
Scope: server-only, non-executing AAF bridge and evidence/decision validation core for `single_site_launch_approval`.

## Result

MVP-35 implemented the single-site launch approval AAF bridge. The bridge prepares or reuses exact-scope AAF evidence packages and approval requests, validates launch approval decisions read-only against AAF request/evidence/freshness/source-ref truth, and integrates validated decisions into the MVP-34 launch approval service.

No SQL migration was added. The MVP-31 AAF client/launch vocabulary and constraints already support `single_site_launch_approval`, `single_site_launch_approval_evidence`, `single_site_launch_readiness_review`, and `approve_single_site_launch_readiness`.

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-launch-approval-aaf-bridge-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/launch-approval-service.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Bridge API

Location: `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.ts`

APIs:

- `SingleSiteLaunchApprovalAafBridge.prepareLaunchApprovalRequest(input)`
- `SingleSiteLaunchApprovalAafBridge.validateLaunchApprovalDecisionRef(input)`
- `prepareLaunchApprovalRequest(input)`
- `validateLaunchApprovalDecisionRef(input)`
- `computeLaunchApprovalSemanticWatermark(input)`
- `buildExpectedLaunchApprovalRefs(input)`

## Evidence And Request Behavior

Preparation creates or reuses one AAF evidence package of type `single_site_launch_approval_evidence` and one AAF request with scope `single_site_launch_approval`, subject type `single_site_launch_readiness_review`, status `requested`, and policy action `approve_single_site_launch_readiness`.

Evidence includes content approval decision, conditional client approval decision, improved candidate refs, migration/client/site refs, client requirement policy, launch checklist snapshot and refs, blocker/limitation summary, domain/billing/rollback/publish placeholders or refs, smoke QA refs where available, operator launch notes, and audit timeline refs.

Preparation writes freshness rows and never creates approval decisions.

## Validation Behavior

Decision validation is read-only and fails closed unless the decision is `granted` or `granted_with_limitations`, the linked request and evidence package exist, scope/action/subject/evidence type match exactly, required subject and evidence refs are present, freshness rows pass, request/evidence link exists, no revocation/supersession/expiration applies, and the deterministic semantic watermark matches current input.

`granted_with_limitations` is valid only when limitations are present and returns those limitations for service carry-forward.

## Service And Read Model

`LaunchApprovalService` no longer accepts raw launch AAF decision refs. Attach, approve, and approve-with-limitations paths require a successful MVP-35 bridge validation result matching the supplied decision id and exact launch scope/subject/status.

The read model remains derived-only. It now exposes launch AAF request-prepared, decision-ref-attached, decision-validated, decision-invalid, approved-with-limitations, and limitations-carried-forward state.

## Boundaries

Launch approval remains separate from content approval, client approval, and publish activation approval. Domain, DNS, DDOM, billing, subscription, hosting entitlement, rollback, smoke QA, PASR, PTT, and publish target state remain evidence/placeholders only.

No runtime artifact mutation, site version mutation, active pointer switch, publish activation, rollback, provider call, billing activation, domain/DNS mutation, UI/API route, server action, worker, Command Center action, Ops Inbox action, client portal exposure, production Supabase call, staging Supabase call, commit, or push was added.

## Validation

Passed focused validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-approval-aaf-bridge.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-approval-aaf-bridge.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-approval-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/launch-approval-service.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`

Disposable PostgreSQL tests verified evidence/request creation and reuse, persisted launch decision validation, wrong-scope rejection, service attachment/approval requiring bridge validation, no AAF decision creation by preparation, no forbidden side-effect refs, and Docker cleanup.

## Acceptance

MVP-35 is safe to accept. Recommended next milestone: launch readiness evidence/source-reader architecture only, still without domain/DNS, billing/hosting, publish activation, runtime mutation, or provider execution.

No commit or push was performed.
