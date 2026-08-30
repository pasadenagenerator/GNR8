# GNR8 Single-Site MVP CUTLINE-61 Source-Owned Page Governance Remediation

Date: 2026-08-30

## Result

Status: `page_governance_remediated_dry_run_blocked_stale_publish_metadata`.

Exact approval sentence present: yes.

Approval sentence:

```text
I approve implementing a narrow source-owned page migration_governance remediation workflow for the approved chs.si candidate, using verified single-site source/migration evidence only, applying it once to the selected candidate if validation passes, and rerunning the governed operator dry-run. Do not run shadow-publish in this task.
```

The CUTLINE-60 page-level `migration_governance` blocker is resolved for the selected approved candidate/page. A governed dry-run rerun was then performed and failed closed before publish execution because the current publish activation metadata chain is stale/mismatched.

No shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, migration, env mutation, deploy, commit, or push occurred.

## Required Governance Shape

The publish enforcement path `evaluatePublishEnforcement(...)` requires page-level `migration_governance` on runtime page rows before it can evaluate site/page gates. The canonical runtime payload shape is `PageMigrationGovernanceSnapshot`:

- `pageStructuralConfidence`
- `weakSectionIds`
- `structuralAnomalies`
- `pageMigrationGate`
- `pageRolloutPolicy`
- `pageEnforcement`

CUTLINE-61 materialized that shape through the existing runtime-store primitive `materializePageMigrationGovernanceForSiteVersion(...)`.

## Implementation

New workflow:

- `apps/platform/gnr8/single-site/source-owned-page-governance-remediation.ts`
- `apps/platform/gnr8/single-site/source-owned-page-governance-remediation.test.ts`

The workflow reconstructs page governance only after verifying:

- selected tenant/client/site/migration/runtime site/candidate/artifact identity;
- accepted source evidence review `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3`;
- source package `url-import-snapshot:imported-url-site-6cba4d2b35d630b5`;
- source watermark `imported-url-site-6cba4d2b35d630b5`;
- required single-site source evidence categories;
- source evidence refs/events and migration refs/events;
- candidate state `APPROVED`;
- artifact binding `1f80138a-39c2-4210-ac61-16200e5a2254`;
- target route `/`.

It fails closed on missing evidence, ambiguous/missing target page, wrong site/migration/candidate/artifact identity, unaccepted source review, insufficient required evidence categories, incomplete materialization, or active pointer drift. It does not infer from artifact summary alone.

## Validation

Focused local validation:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/source-owned-page-governance-remediation.test.ts`: pass, 4/4.
- Focused touched-file TypeScript project including the new workflow/test and temporary production runners: pass.

The tests cover:

- building required `migration_governance` from source-owned evidence;
- failing closed when source evidence is missing;
- failing closed on wrong site/migration/candidate/artifact;
- calling `materializePageMigrationGovernanceForSiteVersion(...)` with the expected shape;
- preserving active pointer state;
- avoiding publish, rollback, provider, DNS, domain, billing, Stripe, Openprovider, AAF request/decision, and gate creation paths.

## Production Remediation

Remediation path used:

`createSourceOwnedPageGovernanceRemediationPlan(...)` -> `applySourceOwnedPageGovernanceRemediation(...)` -> `materializePageMigrationGovernanceForSiteVersion(...)`.

Production mutation was limited to one page-level `migration_governance` materialization on candidate `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, route `/`, page id `page_44f18ca16509a5109482`.

Remediation audit:

- Runtime version audit id: `8a4d4356-4078-42c2-96e6-aa57824444ef`.
- Actor: `human:gregorzigon:cutline-61-source-owned-page-governance-remediation`.
- Workflow: `mvp-cutline-61-source-owned-page-governance-remediation:v1`.
- Affected rows: `1`.
- Idempotency key: `gnr8-cutline-61-chs-si-page-governance-source-remediation-20260829`.
- Correlation id: `gnr8-cutline-61-chs-si-page-governance-20260829`.

Readback:

- Page governance before/after: `0/1 -> 1/1`.
- Required governance fields present after: yes.
- Governance identity matches source/client/site/migration/candidate/artifact: yes.
- Candidate state after: `APPROVED`.
- Artifact binding after: `1f80138a-39c2-4210-ac61-16200e5a2254`, unchanged.
- Bound artifact publish stage: `shadow`, unchanged.
- Selected runtime active pointer before/after: `0 -> 0`.

## Governed Dry-Run Rerun

Dry-run rerun performed: yes.

Dry-run action:

- Action id: `3fdef831-4897-4605-9f17-6ae00c888894`.
- Action ref: `gnr8:single_site_publish_operator_action:3fdef831-4897-4605-9f17-6ae00c888894`.
- Idempotency key: `gnr8-cutline-61-chs-si-dry-run-after-page-governance-20260829`.

Dry-run result:

- `ok=false`.
- Preflight status: `wrapper_blocked`.
- Resolver status: `incomplete`.
- Wrapper status: `preflight_blocked`.
- Runtime mutation: `false`.
- Publishes: `false`.
- Creates AAF records: `false`.
- Creates gate attempt: `false`.
- Evaluates gate: `false`.

Blockers:

- `publish_activation_gate_input_watermark_mismatch`
- `publish_activation_gate_stale`
- `publish_activation_handoff_watermark_mismatch`
- `publish_target_ref_mismatch`
- `single_site_publish_wrapper_resolver_incomplete`

Warnings:

- `limitations_carried_forward`
- `no_publish_execution`
- `would_block_if_wired`

AAF mutation counts for CUTLINE-61 dry-run correlation/idempotency:

- Requests: `0`.
- Decisions: `0`.
- Gates: `0`.

## Stop Point

CUTLINE-61 resolved the page-governance blocker but did not restore shadow-publish eligibility. The next blocker is stale/mismatched publish activation metadata, not missing page governance.

Shadow-publish eligibility next: no. Before any shadow-publish retry, the publish metadata chain needs a fresh approved readiness/request/decision/gate path, and the local CUTLINE-61 remediation workflow must be committed, pushed, and deployed if the hosted production route or deployed code path is expected to own this remediation capability.
