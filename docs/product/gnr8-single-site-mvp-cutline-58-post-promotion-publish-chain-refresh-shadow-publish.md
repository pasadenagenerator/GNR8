# GNR8 Single-Site MVP CUTLINE-58 Post-Promotion Publish Chain Refresh And Shadow-Publish Retry

Date: 2026-08-28

## Result

Status: `shadow_publish_orchestrator_failed_after_post_promotion_chain_refresh`.

Exact approval sentence present: yes.

The post-promotion launch readiness, publish activation request/decision, gate attempt, governed dry-run audit, and one shadow-publish audit were refreshed for the approved `chs.si` single-site MVP rehearsal candidate. The dry-run passed with canonical metadata complete. The single approved shadow-publish retry reached the publish wrapper with resolver `complete`, then failed at the existing runtime publish orchestrator stage. Active pointer for runtime site `site_57d9665a3a5867edf6ef` remained absent: `0 -> 0`.

## Root Cause

CUTLINE-57 had two causes:

- The candidate promotion changed candidate source metadata. Candidate `a3f9493e-9da4-4ef8-8608-154fe6d25a0f` moved to `APPROVED` and its source watermark moved to `updated_at:2026-08-28 09:09:52.683474+00`, making the old readiness/evidence/request/decision/gate chain stale for post-promotion publish metadata.
- The shadow-publish caller still lacked the CUTLINE-55 canonical metadata contract support already added to governed dry-run. It collapsed canonical persisted refs/watermarks back to strings, causing wrapper resolver mismatches before the orchestrator could be called.

## Code Fix

Needed: yes.

Changed files:

- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`

The fix mirrors the CUTLINE-55 dry-run canonical ref contract in the shadow-publish caller path, preserving legacy string compatibility and audit redaction. Shadow-publish now accepts and forwards canonical candidate, artifact, publish-target, evidence, and gate metadata through the wrapper path.

Focused validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts gnr8/single-site/single-site-publish-operator-action-audit.test.ts gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`: passed `47/47`.
- Focused touched-file TypeScript via `/private/tmp/gnr8-cutline58-focused-tsconfig.json`: passed.

## Production Readback

Candidate:

- Candidate site version: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Candidate state: `APPROVED`.
- Candidate publishable: yes.
- Candidate artifact binding: `1f80138a-39c2-4210-ac61-16200e5a2254`.
- Candidate source watermark: `updated_at:2026-08-28 09:09:52.683474+00`.

Refreshed chain:

- Launch readiness record: `f1be154d-5533-4f88-ad5a-0ca3deaa50fc`, status `ready_with_limitations`, freshness `fresh`, semantic watermark `sha256:6da2b467d125d4fdb2ec6f63f7e63cb95e141befcd8642615105da303082bebc`.
- Launch readiness evidence: `193bc66e-f9e0-482e-abd1-3fa04356d24e`, status `created`, freshness `partial_timeline`, source watermark `single-site-launch-readiness:ea0b2dd1f214c27740feb12f04f3635c260bfa425747013b7ed62fdf91454d25`.
- Publish activation request: `1487a4a7-24bb-469e-9ebf-75315f7b538e`, status `requested`, policy `MVP-41`.
- Publish activation decision: `19d1a96d-97ef-4f6b-ab65-38682b5f8751`, status `granted_with_limitations`, policy `MVP-41`.
- Gate attempt: `aaee77bc-2caa-428d-8b3e-848e3622befd`, result `allowed`, evaluation status `warning`, blockers `[]`.

Governed dry-run:

- Operator action: `dc2f19ca-00ca-4881-85ae-fb701eafa9ac`.
- Status: `dry_run_completed`.
- Result: `ok=true`, preflight `caller_validated`, wrapper `dry_run_ready`, resolver `complete`.
- Metadata completeness: `complete`, missing `[]`, mismatches `[]`, warnings `[]`.
- Blockers: `[]`.

Shadow-publish retry:

- Operator action: `9d0f1a3d-cb00-4fb7-8b2f-64c19f86084b`.
- Status: `shadow_publish_failed`.
- Result: `ok=false`, route `publish_orchestrator_failed`, wrapper `orchestrator_failed`, resolver `complete`, publish orchestrator `failed`.
- Metadata completeness: `complete`, missing `[]`, mismatches `[]`, warnings `[]`.
- Blocker: `single_site_publish_wrapper_orchestrator_failed`.
- `publishMayHaveExecuted=true` from the safe projection, but final DB readback confirmed no selected active pointer row was created and candidate/artifact refs stayed unchanged.

Active pointer and target:

- Runtime site: `site_57d9665a3a5867edf6ef`.
- Active pointer before shadow retry: `0`.
- Active pointer after shadow retry: `0`.
- Target: none activated.
- Host binding readback: `www.chs.si`, `ACTIVE`, `binding_kind=shadow`.

Online verification:

- `https://www.chs.si/` returned HTTP `200`.
- Runtime activation status remains not completed because the selected runtime site has no active pointer after the retry.

Mutation confirmation:

- Provider/DNS/domain/billing/Stripe/Openprovider mutation: no.
- Runtime active pointer mutation: no.
- Rollback: no.
- Migration/env/deploy/commit/push: no.
- Sentinel counts moved only for the expected refreshed readiness, AAF request/decision, gate, and operator action audit rows. Runtime site versions, runtime artifacts, provider operation approvals, provider execution handoffs, provider jobs, runtime host bindings, runtime domain host bindings, and billing tables did not move.

## Accepted Limitations

The refreshed readiness chain carried forward the canonical ten accepted MVP rehearsal limitations only:

- `0be61bde-6568-4f33-8499-4d5eade70837:unsupported_in_mvp`
- `73de9484-1461-4476-b677-f41d7a839df7:requires_operator_input`
- `86342f67-7cce-43de-823f-ea0f4adc1a41:requires_operator_input`
- `a61e857e-89c1-4ab1-bdc1-581a24e824c1:unsupported_in_mvp`
- `mvp_rehearsal_limited_missing_billing_subscription_source_truth`
- `mvp_rehearsal_limited_missing_dns_operator_evidence`
- `mvp_rehearsal_limited_missing_domain_ddom_source_truth`
- `mvp_rehearsal_limited_missing_rollback_readiness_source_truth`
- `mvp_rehearsal_limited_missing_site_scoped_hosting_entitlement_truth`
- `mvp_rehearsal_limited_missing_vercel_custom_domain_ssl_state`

## Stop Point

Stop condition reached after the single approved shadow-publish retry: publish wrapper resolver is now complete, but the existing publish orchestrator failed. No second shadow-publish was run. Next work should diagnose the runtime publish orchestrator failure path before any new publish attempt.
