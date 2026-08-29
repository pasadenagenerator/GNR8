# GNR8 Single-Site MVP CUTLINE-59 Shadow-Publish Orchestrator Failure Diagnosis

Date: 2026-08-29

## Result

Status: `shadow_publish_orchestrator_failure_diagnosed_no_retry`.

CUTLINE-58 local contract changes were preserved. `git status --short` was clean at task start, and the checked-out source still contains the shadow-publish canonical metadata handoff support in:

- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`

No shadow-publish retry, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, migration, env mutation, deploy, commit, or push was run in CUTLINE-59.

## Exact Failure

Persisted operator action `9d0f1a3d-cb00-4fb7-8b2f-64c19f86084b` is `shadow_publish_failed`.

- Route: `publish_orchestrator_failed`.
- Wrapper: `orchestrator_failed`.
- Resolver: `complete`.
- Publish orchestrator: `failed`.
- Blocker: `single_site_publish_wrapper_orchestrator_failed`.
- Persisted warning redaction: `single_site_shadow_publish_warning_redacted`.

The exact underlying local runtime failure reproduced through direct read-only enforcement evaluation is:

```text
publish-enforcement requires page migration governance on site version pages
```

Failing path:

1. `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts` prepared `publishOrchestratorInput`.
2. The wrapper called `publishApprovedSiteVersion(...)`.
3. `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts` entered the `APPROVED` candidate branch.
4. The branch called `evaluatePublishEnforcement(...)`.
5. `apps/platform/gnr8/runtime/publish-enforcement.ts` found no site-version pages with `migrationGovernance` and threw before artifact refresh, candidate validation, pointer readiness, guard observation, or active pointer switch.

## Publish Input Shape

The wrapper input shape for the failed execute path was:

```ts
{
  siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
  actor: "codex-cutline-58",
  stage: "production",
  publishActivationShadowGateEnabled: false,
  publishActivationEnforcementShadowEnabled: true,
  publishActivationMetadataHandoff: "<complete normalized MVP-48 handoff>"
}
```

Persisted safe refs confirmed:

- tenant `6a09c2d9-12c3-4c19-a466-0c29ae2f723e`
- client `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`
- canonical site `a03fcb5b-6ad9-4b19-a682-4c06f998881a`
- migration `682a09fd-8fd5-4f73-93b8-54f5d4067c63`
- runtime site version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`
- runtime artifact `1f80138a-39c2-4210-ac61-16200e5a2254`
- publish target `production`
- publish stage/environment `production` / `production`
- readiness evidence `193bc66e-f9e0-482e-abd1-3fa04356d24e`
- publish activation request `1487a4a7-24bb-469e-9ebf-75315f7b538e`
- publish activation decision `19d1a96d-97ef-4f6b-ab65-38682b5f8751`
- gate attempt `aaee77bc-2caa-428d-8b3e-848e3622befd`

## Production Readback

Read-only production diagnostics confirmed:

- Candidate version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`: `APPROVED`, version `3`, artifact binding `1f80138a-39c2-4210-ac61-16200e5a2254`, updated `2026-08-28 09:09:52.683474+00`.
- Bound artifact `1f80138a-39c2-4210-ac61-16200e5a2254`: site/version lineage matches the candidate, root path exists, root HTML length `11770`, manifest paths include `/`.
- Bound artifact publish stage: `shadow`.
- Bound artifact governance publish stage: `shadow`.
- Bound artifact site enforcement state: shadow `ALLOW`, canary `REVIEW`, production `REVIEW`.
- Selected runtime active pointer for `site_57d9665a3a5867edf6ef`: `0`.
- Host binding: `www.chs.si`, `ACTIVE`, `shadow`.
- Runtime row counts for selected runtime site: versions `3`, artifacts `3`, active pointers `0`, host bindings `1`.

Refreshed source-owned chain remained valid:

- Readiness `f1be154d-5533-4f88-ad5a-0ca3deaa50fc`: `ready_with_limitations`, `fresh`.
- Evidence `193bc66e-f9e0-482e-abd1-3fa04356d24e`: `created`, freshness `partial_timeline`, source watermark `single-site-launch-readiness:ea0b2dd1f214c27740feb12f04f3635c260bfa425747013b7ed62fdf91454d25`.
- Publish activation request `1487a4a7-24bb-469e-9ebf-75315f7b538e`: `requested`, scope `publish_activation`, subject `site_version` / `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, policy `MVP-41`.
- Publish activation decision `19d1a96d-97ef-4f6b-ab65-38682b5f8751`: `granted_with_limitations`, evidence `193bc66e-f9e0-482e-abd1-3fa04356d24e`, policy `MVP-41`.
- Gate `aaee77bc-2caa-428d-8b3e-848e3622befd`: `allowed`, no fail-closed reason, linked to the refreshed request/decision/evidence refs.
- Dry-run `dc2f19ca-00ca-4881-85ae-fb701eafa9ac`: `dry_run_completed`, `ok=true`, wrapper `dry_run_ready`, resolver `complete`, metadata complete, blockers `[]`.

## Root Cause

The CUTLINE-58 canonical metadata contract fix worked: resolver metadata was complete and the wrapper reached the existing publish orchestrator.

The orchestrator failed because the selected production publish candidate lacks page-level `migration_governance` on `gnr8_runtime_page_versions`. `publishApprovedSiteVersion(...)` currently recomputes publish enforcement from site-version page governance before it refreshes or activates the artifact. For this improved candidate, the artifact carries shadow/review governance, but the page rows do not carry the `migrationGovernance` payload required by `evaluatePublishEnforcement(...)`.

This is a runtime payload/source-truth gap, not a provider, domain, billing, DNS, Stripe, Openprovider, or active-pointer failure.

## Fix Decision

No code fix was made in CUTLINE-59.

A safe fix is not a narrow retry-path edit because:

- Silently changing `publishStage` from `production` to `shadow` would change operator intent and publish semantics.
- Inferring page governance from artifact summary fields would be a runtime architecture decision.
- Repairing the existing production candidate would require a reviewed source-owned data repair, regeneration, or migration, all outside this task boundary.
- Running a new dry-run or shadow-publish retry was explicitly out of scope.

Recommended next narrow task: define and execute a reviewed remediation for the missing page-level governance on candidate `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, or explicitly choose a separately approved shadow-stage publish rehearsal path. Only after that remediation and deployment decision should a new governed dry-run/shadow-publish chain be considered.

## Stop Point

Active pointer before/after CUTLINE-59 diagnostics: `0 -> 0`.

Online verification status: `shadow_publish_orchestrator_failure_diagnosed_missing_page_migration_governance_no_retry`.
