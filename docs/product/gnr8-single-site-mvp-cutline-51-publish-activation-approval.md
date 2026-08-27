# GNR8 Single-Site MVP CUTLINE-51 Publish Activation Approval

Date: 2026-08-26
Site: `chs.si`
Scope: AAF publish activation request and human decision only. Stopped before gate evaluation, dry-run, shadow-publish, runtime publish, rollback, provider/domain/DNS/billing mutation, deploy, commit, push, or active pointer mutation.

## Result

CUTLINE-51 succeeded. Fresh human approval was present, the CUTLINE-50 launch readiness evidence package was linked directly, and the publish activation decision was recorded as `granted_with_limitations` for the launch-ready-with-limitations candidate.

- Exact approval sentence present: yes.
- Request workflow path used: `SingleSitePublishActivationRequestBridge.preparePublishActivationRequestFromLaunchReadiness(...)`.
- Publish activation request id/ref: `4f273f5d-63e2-40f5-a3be-377bfc8d9380` / `aaf:approval_request:4f273f5d-63e2-40f5-a3be-377bfc8d9380`.
- Request status/scope/action/subject: `requested` / `publish_activation` / `publish.activation` / `site_version:a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Request semantic watermark: `single-site-publish-activation-request:fed30dbde86621d1e01274bb06564921bd6f596408681e302e10c0793e351b6a`.
- Decision workflow path used: `SingleSitePublishActivationDecisionService.recordPublishActivationDecision(...)`.
- Publish activation decision id/ref: `53e9cba6-74ac-44b4-bfba-57826f037f71` / `aaf:approval_decision:53e9cba6-74ac-44b4-bfba-57826f037f71`.
- Decision status: `granted_with_limitations`.
- Decision semantic watermark: `single-site-publish-activation-decision:5952a37e18442479424e1fde1bf57648531b4f9b8f38252fd2a9c7bc644b6626`.
- Online verification status after this task: `publish_activation_request_decision_granted_with_limitations_gate_evaluation_eligible_no_publish`.

## Preflight

Read-only production preflight confirmed:

- Launch readiness record `17121fc3-db6c-40ad-bb4f-b3acb2213d5f` exists with `status=ready_with_limitations`, `freshness_status=fresh`, and watermark `sha256:078fbec8b80984c3525f232222b822e357294c017d25af361edf2f9e83911ae4`.
- Launch readiness evidence package `17f10140-b31f-4c32-a673-13b95543fdd2` exists as `single_site_launch_readiness_evidence`, ref `aaf:evidence_package:17f10140-b31f-4c32-a673-13b95543fdd2`, freshness `partial_timeline`, and watermark `single-site-launch-readiness:3d346b059d9d9b3b814abf22cbf464bf02b3434977a5ef51322a559876a9b203`.
- `partial_timeline` evidence freshness was accepted for this MVP rehearsal only.
- Open P0 blockers: `0`.
- Candidate refs matched site version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, runtime artifact `1f80138a-39c2-4210-ac61-16200e5a2254`, and publish target `production / active / ptt-1`.
- Content, client, and launch AAF approvals were present and valid: `67ec5313-a122-456c-8476-7abd9fb772e5`, `b8001dfa-0d8e-40be-bdc3-18544530a0e9`, and `6c930318-be52-4aea-af87-e1bc7b84094f`, all `granted_with_limitations`.
- No publish activation request or decision existed before the write.
- No publish activation gate attempt, dry-run, shadow-publish, runtime publish, rollback, or active pointer existed for this candidate.
- Active pointers before: total `6`, selected runtime site `0`, selected site `0`, candidate refs `0`.

## Evidence And Audit

- Direct request evidence link id: `ff0e3baf-e1f2-4ea2-ba14-0ae594573828`, role `publish_activation_request_launch_readiness_evidence`, evidence package `17f10140-b31f-4c32-a673-13b95543fdd2`.
- Direct decision evidence link id: `eb7b2127-0c67-41fd-b791-6da4af19e7e6`, role `publish_activation_decision_launch_readiness_evidence`, evidence package `17f10140-b31f-4c32-a673-13b95543fdd2`.
- Request audit event id: `9bfef22a-c955-48f3-acad-f719f80e95ca`, event `single_site.publish_activation.requested`.
- Decision audit event id: `7e897149-2c97-4f7a-a9bd-4c7f769761ea`, event `single_site.publish_activation.decision.granted_with_limitations`.
- Decision audit refs: `a9076991-cf92-4716-bd0c-dbc1af47c800` for the publish activation request and `c362c132-54fa-4856-b23a-89f58de292f1` for the launch readiness evidence package.

## Limitations Carried Forward

Canonical CUTLINE-50 limitations carried forward:

- Four unapplied recommendation limitations: `0be61bde-6568-4f33-8499-4d5eade70837:unsupported_in_mvp`, `73de9484-1461-4476-b677-f41d7a839df7:requires_operator_input`, `86342f67-7cce-43de-823f-ea0f4adc1a41:requires_operator_input`, `a61e857e-89c1-4ab1-bdc1-581a24e824c1:unsupported_in_mvp`.
- `mvp_rehearsal_limited_missing_billing_subscription_source_truth`.
- `mvp_rehearsal_limited_missing_dns_operator_evidence`.
- `mvp_rehearsal_limited_missing_domain_ddom_source_truth`.
- `mvp_rehearsal_limited_missing_rollback_readiness_source_truth`.
- `mvp_rehearsal_limited_missing_site_scoped_hosting_entitlement_truth`.
- `mvp_rehearsal_limited_missing_vercel_custom_domain_ssl_state`.

Readback warning: the existing request/decision services also persist the raw launch-readiness limitation payload in audit metadata. That raw payload contains duplicate dimension/blocker forms and the non-enforcing evidence diagnostics `durable_audit_timeline_refs_missing` and `pasr_shadow_diagnostics_missing`. The canonical human-approved CUTLINE-50 carried-forward set remains the ten items above.

## Readback

- Read model status: `decision_granted_with_limitations`.
- Read model valid: `true`.
- Next action: `prepare_gate_evaluation`.
- Eligible for gate evaluation next: yes.
- Readback blockers/missing/stale/warnings: `[]` / `[]` / `[]` / `[]`.
- Active pointers after: total `6`, selected runtime site `0`, selected site `0`, candidate refs `0`.
- Forbidden downstream counts after: publish operator actions `0`, publish activation requests `1`, publish activation decisions `1`, downstream AAF gate attempts `0`, runtime publish events table absent, runtime active site versions table absent.

## Boundary

No gate evaluation, AAF gate attempt, dry-run, shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, or push occurred.

Temporary runners were kept outside the repo under `/private/tmp`; no temp runner was left in the repository.

## Validation

- Production preflight: read-only transaction with `transaction_read_only=on`.
- Publish activation mutation: existing request bridge and decision service only.
- Final production DB readback: read-only transaction with `transaction_read_only=on`.
- `git diff --check`: passed.
- Trailing whitespace scan over changed docs: passed.
- Blockers: none.
- Warnings: raw persisted limitation payload includes duplicate/non-enforcing evidence diagnostics as noted above.
- Commit/push/deploy: none.
