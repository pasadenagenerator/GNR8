# GNR8 Single-Site MVP CUTLINE-63 Controlled Shadow-Publish Retry

Date: 2026-08-30

## Result

Status: `shadow_publish_completed_pending_public_verification_and_mvp_closeout`.

Exact approval sentence present: yes.

One controlled production shadow-publish retry was run for the selected `chs.si` single-site MVP rehearsal candidate through the existing governed shadow-publish operator route handler. The route completed successfully, the wrapper reached the existing publish orchestrator, and production DB readback confirmed the selected runtime site now has an active pointer to the candidate version.

No rollback was run.

## Preflight

Git status at task start: clean.

Production health before the run:

- `https://app.pasadenagenerator.com/`: HTTP `200`.
- `https://gnr8-worker.vercel.app/health`: HTTP `200`, `ok=true`, `service=gnr8-worker`, `status=ready`.

Read-only production preflight confirmed:

- Candidate site version: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Runtime site: `site_57d9665a3a5867edf6ef`.
- Candidate state before run: `APPROVED`.
- Runtime artifact binding: `1f80138a-39c2-4210-ac61-16200e5a2254`.
- Page `migration_governance`: `1/1`.
- Publish target: `production / production / active`, watermark `ptt-1:gnr8_publish_targets:production`.
- CUTLINE-62 dry-run action: `ad9660dd-c474-431c-a4ef-f935302c946b`.
- CUTLINE-62 dry-run result: `ok=true`, preflight `caller_validated`, resolver `complete`, wrapper `dry_run_ready`, blockers `[]`.
- CUTLINE-62 gate: `cee202bb-e99c-4b5b-8839-876a54a1ba35`, result `allowed`, bound to request `0940467e-f890-4e7d-a149-39a6b95074b4`, decision `de02949d-5a02-4a83-adf1-595f5b2ed3f4`, and evidence `18726904-e8df-4b4e-b397-f5a0dd72245a`.
- CUTLINE-62 dry-run action count: `1`.
- CUTLINE-62 shadow-publish action count: `0`.
- Selected runtime active pointer before run: `0`.
- CUTLINE-63 shadow-publish action count before run: `0`.

The existing dry-run was not rerun.

## Shadow-Publish Readback

Operator action:

- Action id: `6c44f0ac-5546-448b-9e04-a07aa179f92f`.
- Action ref: `gnr8:single_site_publish_operator_action:6c44f0ac-5546-448b-9e04-a07aa179f92f`.
- Mode/status: `shadow_publish` / `shadow_publish_completed`.
- Correlation id: `gnr8-cutline-63-chs-si-shadow-publish-retry-20260830`.
- Idempotency key: `gnr8-cutline-63-chs-si-shadow-publish-retry-20260830:one-controlled-retry`.
- Audit refs/events created for the action: `12/6`.

Route/wrapper result:

- HTTP status: `200`.
- Result: `ok=true`.
- Route status: `shadow_publish_completed`.
- Preflight status: `caller_validated`.
- Resolver status: `complete`.
- Wrapper status: `published_via_existing_orchestrator`.
- Publish orchestrator status: `called`.
- Publish orchestrator pointer switch: `atomic_site_pointer_reassignment`.
- Metadata completeness: `complete`, missing `[]`, mismatches `[]`, warnings `[]`.
- Blocker codes: `[]`.
- Warnings: `limitations_carried_forward`, `limitations_explicitly_accepted_by_policy`, `single_site_shadow_publish_warning_redacted`.
- `publishMayHaveExecuted=true`.

Active pointer readback:

- Selected runtime active pointer before/after: `0 -> 1`.
- Active pointer target: `site_57d9665a3a5867edf6ef -> a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Active pointer updated at: `2026-08-30T17:11:16.948Z`.

Runtime state readback:

- Candidate state moved `APPROVED -> PUBLISHED` through the existing publish orchestrator.
- Bound artifact publish stage moved `shadow -> production` through the existing publish orchestrator.
- Runtime site version count stayed `30 -> 30`.
- Runtime artifact count stayed `29 -> 29`.
- Runtime page version count stayed `30 -> 30`.

Public/read-only URL evidence after the run:

- `https://www.chs.si/`: HTTP `200`.
- `https://app.pasadenagenerator.com/`: HTTP `200`.
- `https://gnr8-worker.vercel.app/health`: HTTP `200`, `ok=true`, `service=gnr8-worker`, `status=ready`.

## Mutation Boundaries

Expected governed mutations:

- CUTLINE-63 shadow-publish actions: `0 -> 1`.
- Operator action rows: `7 -> 8`.
- Operator action refs: `99 -> 111`.
- Operator action events: `37 -> 43`.
- Runtime active pointers: `6 -> 7`.

Unchanged source/governance/provider/domain/billing counts:

- AAF approval requests: `8 -> 8`.
- AAF approval decisions: `8 -> 8`.
- AAF gate attempts: `3 -> 3`.
- Publish targets: `1 -> 1`.
- Runtime provider operation approvals: `2 -> 2`.
- Runtime provider execution handoffs: `2 -> 2`.
- Runtime provider jobs: `0 -> 0`.
- Runtime host bindings: `22 -> 22`.
- Runtime domain host bindings: `4 -> 4`.
- Runtime rollback events table: absent.
- Billing subscription tables checked: absent.

No second shadow-publish retry, rollback, dry-run rerun, metadata refresh rerun, provider/DNS/domain/billing/Stripe/Openprovider mutation, migration, env mutation, deploy, or unrelated code change occurred.

## Closeout

Online verification status is now `shadow_publish_completed_pending_public_verification_and_mvp_closeout`.

Next narrow step: perform public runtime verification and MVP closeout against active pointer `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, without rollback unless separately approved.
