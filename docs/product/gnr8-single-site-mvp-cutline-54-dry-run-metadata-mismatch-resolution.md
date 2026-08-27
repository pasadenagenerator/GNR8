# GNR8 Single-Site MVP CUTLINE-54 Dry-Run Metadata Mismatch Resolution

Date: 2026-08-27
Site: `chs.si`
Scope: read-only diagnosis of the CUTLINE-53 governed operator dry-run metadata mismatches. Stopped before rerun because the existing governed MVP-CUTLINE-3/MVP-54 caller cannot currently carry the canonical persisted source watermarks required by MVP-49. No shadow-publish, runtime publish, rollback, provider/domain/DNS/billing mutation, deploy, migration, env mutation, commit, push, active pointer mutation, new launch readiness, new publish activation request/decision, or new gate attempt occurred.

## Result

- Exact approval sentence present: yes.
- CUTLINE-53 operator action inspected: `d9432ad3-0d3c-4424-a3ba-1edca6b18e5e` / `gnr8:single_site_publish_operator_action:d9432ad3-0d3c-4424-a3ba-1edca6b18e5e`.
- Rerun performed: no.
- Reason no rerun was performed: the persisted production refs are coherent, but the current MVP-54/CUTLINE-3 request contract accepts only string refs. MVP-49's decision read model requires canonical `source_table`, `source_record_id`, and `source_watermark` equality for candidate, artifact, and publish target refs. A string ref is normalized to a synthetic `ref:<table>:<id>` watermark, which cannot equal the persisted production evidence watermarks.
- Read-only resolver probe with full persisted ref objects: `complete`, blocker codes `[]`, missing codes `[]`, mismatch codes `[]`, stale codes `[]`.
- Online verification status after this task: `operator_dry_run_metadata_contract_mismatch_no_rerun_no_publish`.

## CUTLINE-53 Supplied Values

- Candidate ref supplied: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Runtime artifact ref supplied: `1f80138a-39c2-4210-ac61-16200e5a2254`.
- Publish target ref supplied: `production`.
- Publish stage/environment supplied: `production` / `active`.
- Gate attempt ref supplied: `aaf:action_gate_attempt:e2993dcb-8a9f-4e31-b499-d4d6b8d739de`.
- Handoff/gate input watermarks supplied: `single-site-publish-activation-gate-handoff:bfbf793f9110306f2403e8e306fac8fb66af09c1bf07c999dfc4d7800d98441f` / `single-site-publish-activation-gate-input:cf92da520741ce06bc7b9051f5253275888f150676b15cf3aa9d6adf15cb42f8`.

## Persisted Canonical Truth

- Candidate: `gnr8:gnr8_runtime_site_versions:a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, watermark `updated_at:2026-08-21 06:18:00.763932+00`.
- Runtime artifact: `gnr8:gnr8_runtime_artifacts:1f80138a-39c2-4210-ac61-16200e5a2254`, watermark `bundle_sha256:c652e15c369a9861b05004cf303ecc8a51f79a8d1c79a2a80a8b9186d23ae237|id:1f80138a-39c2-4210-ac61-16200e5a2254`.
- Publish target: `gnr8:gnr8_publish_targets:production`, environment `production`, publish stage `production`, status `active`, policy `ptt-1`, watermark `ptt-1:gnr8_publish_targets:production`.
- Launch readiness: `17121fc3-db6c-40ad-bb4f-b3acb2213d5f`, status `ready_with_limitations`, freshness `fresh`, watermark `sha256:078fbec8b80984c3525f232222b822e357294c017d25af361edf2f9e83911ae4`.
- Evidence package: `17f10140-b31f-4c32-a673-13b95543fdd2`, ref `aaf:evidence_package:17f10140-b31f-4c32-a673-13b95543fdd2`, freshness `partial_timeline`, watermark `single-site-launch-readiness:3d346b059d9d9b3b814abf22cbf464bf02b3434977a5ef51322a559876a9b203`.
- Publish activation request/decision: `aaf:approval_request:4f273f5d-63e2-40f5-a3be-377bfc8d9380` / `aaf:approval_decision:53e9cba6-74ac-44b4-bfba-57826f037f71`, decision status `granted_with_limitations`.
- Gate: raw id `e2993dcb-8a9f-4e31-b499-d4d6b8d739de`, ref `aaf:action_gate_attempt:e2993dcb-8a9f-4e31-b499-d4d6b8d739de`, result/status `allowed` / `warning`, policy evaluation `2e2d62a9-87ab-4d50-bbe0-372a9d1f0e4f`.
- Handoff/gate input watermarks: `single-site-publish-activation-gate-handoff:bfbf793f9110306f2403e8e306fac8fb66af09c1bf07c999dfc4d7800d98441f` / `single-site-publish-activation-gate-input:cf92da520741ce06bc7b9051f5253275888f150676b15cf3aa9d6adf15cb42f8`.

## Mismatch Root Cause

- `improved_candidate_site_version_ref_mismatch`: CUTLINE-53 supplied only the candidate id. MVP-49 normalized it with synthetic watermark `ref:gnr8_runtime_site_versions:a3f9493e-9da4-4ef8-8608-154fe6d25a0f`; production evidence expects `updated_at:2026-08-21 06:18:00.763932+00`.
- `improved_runtime_artifact_ref_mismatch`: CUTLINE-53 supplied only the artifact id. MVP-49 normalized it with synthetic watermark `ref:gnr8_runtime_artifacts:1f80138a-39c2-4210-ac61-16200e5a2254`; production evidence expects the `bundle_sha256:...|id:...` watermark.
- `publish_target_ref_mismatch`: CUTLINE-53 supplied only `production`. MVP-49 normalized it with synthetic watermark `ref:gnr8_publish_targets:production`; production evidence expects `ptt-1:gnr8_publish_targets:production`.
- `publish_activation_gate_mismatch`: CUTLINE-53 supplied the AAF gate ref, but MVP-49 validation compares `expectedGateAttemptResultRef` to the raw gate attempt id. The raw id is `e2993dcb-8a9f-4e31-b499-d4d6b8d739de`.
- `publish_activation_handoff_watermark_mismatch`: secondary effect of the stale/ref and environment mismatches changing the derived handoff diagnostics. A read-only resolver probe with full persisted refs matched the stored handoff watermark.
- `publish_activation_stage_mismatch`: CUTLINE-53 placed `active` in `publishEnvironment`; persisted PTT has `environment=production`, `publish_stage=production`, and `status=active`.
- `single_site_publish_wrapper_resolver_incomplete`: aggregate wrapper blocker caused by the resolver incomplete state above.

## Read-Only Resolver Probe

The MVP-49 resolver was called read-only with object refs carrying the persisted production `sourceTable`, `sourceRecordId`, `sourceRef`, `sourceVersion`, and `sourceWatermark` values. It returned:

- Resolver status: `complete`.
- Blockers/missing/mismatches/stale: `[]` / `[]` / `[]` / `[]`.
- Warnings: `enforcement_not_applied_in_mvp46`, `limitations_carried_forward`, `limitations_explicitly_accepted_by_policy`, `no_publish_execution`, `read_only_guard_evaluated`.
- Metadata watermark: `single-site-publish-activation-metadata-handoff:beab789fb9c448e59dfaef399cfef725ba4c0e27594a49f1062cc2b25ac2dae6`.
- Shadow-publish eligibility next: no until the governed MVP-54/CUTLINE-3 caller can submit watermarked refs and a fresh audited dry-run reaches `dry_run_ready`.

## Required Narrow Fix

Update the governed MVP-54/CUTLINE-3 operator dry-run request contract so candidate, runtime artifact, and publish target inputs can carry canonical persisted ref objects or explicit source-watermark fields through validation, audit redaction, wrapper input construction, and read-only resolver invocation. The fix should preserve the existing dry-run-only boundary, keep `allowWarningsWithLimitations=true`, keep gate attempt validation strict, and should not create new launch readiness, publish activation request/decision, or gate attempts.

After that code contract fix is deployed, rerun the governed dry-run once with:

- candidate/runtime/target canonical source refs and watermarks above;
- `publishStage=production`;
- `publishEnvironment=production`;
- `expectedGateAttemptResultRef=e2993dcb-8a9f-4e31-b499-d4d6b8d739de`;
- existing request/decision/evidence refs and stored handoff/gate input watermarks;
- `dryRun=true`;
- idempotency/correlation base `gnr8-cutline-54-chs-si-operator-dry-run-metadata-fix-20260827`, or a new approved base if this diagnostic task remains no-mutation.

## Boundary And Counts

- New CUTLINE-54 operator dry-run audit/action rows: `0`.
- Active pointer count for selected runtime site `site_57d9665a3a5867edf6ef`: `0 -> 0`.
- Shadow-publish actions for candidate: `0`.
- CUTLINE-54 AAF approval requests/decisions/gate attempts: `0 / 0 / 0`.
- Forbidden migration refs: `0`.
- Site publish events for candidate: `0`.
- Candidate state: `DRAFT`.
- Commit/push/deploy: none.

## Validation

- Production DB probe: repeatable-read read-only transaction, passed.
- Production DB mismatch readback: repeatable-read read-only transaction, passed.
- MVP-49 resolver probe with full persisted refs: read-only, returned `complete`.
- Governed dry-run rerun: not performed.
- Broad platform typecheck and unrelated test suites: not run by design.
