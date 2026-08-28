# GNR8 Single-Site MVP CUTLINE-55 Governed Dry-Run Contract Fix

Date: 2026-08-27
Site: `chs.si`
Scope: local governed dry-run metadata contract fix, focused validation, one production audited dry-run rerun using corrected canonical metadata, and read-only production readback. Stopped before shadow-publish, runtime publish, rollback, active pointer switch, provider/domain/DNS/billing mutation, deploy, migration, env mutation, commit, or push.

## Result

- Exact approval sentence present: yes.
- Contract fix: local only; no deploy, commit, or push.
- Rerun performed: yes, once.
- Workflow path: MVP-CUTLINE-3 facade preflight -> MVP-54 audited dry-run route/caller -> MVP-52 wrapper with `dryRun=true` -> MVP-49 resolver -> MVP-57 audit persistence.
- Operator action id/ref/status: `882304c9-fc52-4c3c-9cd3-533d9ebf1eed` / `gnr8:single_site_publish_operator_action:882304c9-fc52-4c3c-9cd3-533d9ebf1eed` / `dry_run_completed`.
- Dry-run result: HTTP `200`, `ok=true`, `preflightStatus=caller_validated`, `wrapperDryRunStatus=dry_run_ready`.
- Resolver status: `complete`.
- Wrapper status: `dry_run_ready`.
- Metadata completeness: `complete=true`, missing `[]`, mismatch `[]`, warning `[]`.
- Blockers: `[]`.
- Warnings: `enforcement_not_applied_in_mvp46`, `limitations_carried_forward`, `limitations_explicitly_accepted_by_policy`, `no_publish_execution`, `read_only_guard_evaluated`.
- Limitation codes returned by dry-run response: `[]`; the facade preflight still surfaces the accepted rehearsal limitation history and non-enforcing projection diagnostics.
- Shadow-publish eligibility next: yes from this dry-run result, pending separate fresh approval, deployment of the contract fix if the hosted route is used, and the existing shadow-publish feature flag/boundary checks.

## Contract Behavior

Before CUTLINE-55, the governed dry-run caller accepted only string refs for candidate version, runtime artifact, publish target, and launch readiness evidence. MVP-49 then synthesized fallback watermarks such as `ref:<table>:<id>`, which mismatched persisted source-truth watermarks.

After CUTLINE-55, the MVP-54 dry-run caller accepts either legacy string refs or canonical persisted ref objects with `sourceSystem`, `sourceTable`, `sourceRecordId`, `sourceRef`, `sourceVersion`, `sourceWatermark`, `contentHash`, and redacted `metadataJson`. The MVP-CUTLINE-3 route/facade preserves those objects into the shared dry-run validator and wrapper. The audit path stores only safe display strings.

The caller now rejects mismatched canonical identity/stage/ref combinations, requires `expectedGateAttemptResultRef` to be the raw gate attempt id, optionally preserves the display ref separately, enforces `production` stage/environment for the `production` publish target, preserves `allowWarningsWithLimitations=true`, and keeps dry-run-only execution fields closed.

## Canonical Metadata Used

- Candidate: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, ref `gnr8:site_version:a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, watermark `updated_at:2026-08-21 06:18:00.763932+00`.
- Runtime artifact: `1f80138a-39c2-4210-ac61-16200e5a2254`, ref `gnr8:runtime_artifact:1f80138a-39c2-4210-ac61-16200e5a2254`, watermark `bundle_sha256:c652e15c369a9861b05004cf303ecc8a51f79a8d1c79a2a80a8b9186d23ae237|id:1f80138a-39c2-4210-ac61-16200e5a2254`.
- Publish target: `production`, environment `production`, publish stage `production`, status `active`, watermark `ptt-1:gnr8_publish_targets:production`.
- Publish activation request/decision: `4f273f5d-63e2-40f5-a3be-377bfc8d9380` / `53e9cba6-74ac-44b4-bfba-57826f037f71`.
- Gate attempt raw id/ref: `e2993dcb-8a9f-4e31-b499-d4d6b8d739de` / `aaf:action_gate_attempt:e2993dcb-8a9f-4e31-b499-d4d6b8d739de`.
- Handoff/gate input watermarks: `single-site-publish-activation-gate-handoff:bfbf793f9110306f2403e8e306fac8fb66af09c1bf07c999dfc4d7800d98441f` / `single-site-publish-activation-gate-input:cf92da520741ce06bc7b9051f5253275888f150676b15cf3aa9d6adf15cb42f8`.
- Launch readiness evidence: readiness record `17121fc3-db6c-40ad-bb4f-b3acb2213d5f`, evidence package `17f10140-b31f-4c32-a673-13b95543fdd2`, ref `aaf:evidence_package:17f10140-b31f-4c32-a673-13b95543fdd2`, watermark `single-site-launch-readiness:3d346b059d9d9b3b814abf22cbf464bf02b3434977a5ef51322a559876a9b203`.

## Production Readback

- Idempotency/correlation: `gnr8-cutline-55-chs-si-governed-dry-run-contract-fix-20260827`.
- Active pointer counts: total `6 -> 6`; selected runtime site `0 -> 0`; selected canonical site `0 -> 0`; candidate refs `0 -> 0`.
- CUTLINE-55 dry-run actions for idempotency key: `0 -> 1`.
- CUTLINE-55 audit refs/events for new action: `0/0 -> 11/5`.
- Shadow-publish actions for candidate: `0 -> 0`.
- CUTLINE-55 AAF approval requests/decisions/gate attempts: `0/0/0 -> 0/0/0`.
- DDOM readiness snapshots/refs for CUTLINE-55 base: `0/0 -> 0/0`.
- Runtime publish/rollback event tables were absent in this production schema readback; active site versions table was absent.
- Candidate row stayed on version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, runtime site `site_57d9665a3a5867edf6ef`, artifact `1f80138a-39c2-4210-ac61-16200e5a2254`, updated at `2026-08-21T06:18:00.763932+00:00`.

## Validation

- Focused tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/single-site-mvp-operator-action-facade.test.ts app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts gnr8/single-site/single-site-publish-operator-action-audit.test.ts` passed, `41/41`.
- Focused TypeScript: `pnpm exec tsc --noEmit --pretty false --project /private/tmp/gnr8-cutline55-focused-tsconfig.json` passed with a standalone touched-file config.
- `git diff --check`: passed.
- Trailing whitespace scan over touched files: passed.
- Broad platform typecheck: not run by design.
- Unrelated test suites: not run by design.

## Files Changed

- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.test.ts`
- `docs/product/gnr8-single-site-mvp-cutline-55-governed-dry-run-contract-fix.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Boundary

No shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, push, new launch readiness, new publish activation request/decision, or new gate attempt occurred.
