# GNR8 Single-Site MVP Online Verification Checklist

Phase: MVP-CUTLINE-5
Scope: short operator sequence for the first deployed one-site rehearsal.

## Preconditions

Do not start online verification until all are true:

- GitHub `main` is confirmed at `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`;
- release commit has been reviewed and pushed by a human-approved release step;
- deployment target is running the intended commit SHA, expected after MVP-CUTLINE-11 to be `ba0d070cb77da5fb8fc3618469c567c5aeb4b356` unless a later approved commit supersedes it;
- required Supabase migrations have been applied in chronological order to the target environment;
- post-migration catalog checks passed;
- `SUPERADMIN_EMAILS` includes the named rehearsal operator;
- baseline Supabase/database env values point at the intended target environment;
- `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` is off unless shadow-publish has explicit approval;
- selected `tenantId`, `clientId`, `siteId`, `migrationId`, candidate refs, runtime artifact ref, publish target ref, launch readiness evidence ref, publish activation request/decision/gate refs, handoff watermark, and gate input watermark are known;
- seeded or bypassed source-truth records are listed as MVP exceptions before the run.

MVP-CUTLINE-11 status: online verification remains blocked until manual deploy confirmation, target migration application/readback, env/flag verification, superadmin auth verification, and selected site data are complete.

MVP-CUTLINE-12 status: online verification remains blocked because manual deployment status for `origin/main` `ba0d070cb77da5fb8fc3618469c567c5aeb4b356` was not provided. Current readiness is `blocked_waiting_for_deploy_status`; migration is `migration_no_go_deploy_unknown`; env/auth is `env_no_go_unknown`.

MVP-CUTLINE-13 status: deployment target and health were manually confirmed as production and healthy, but online verification remains blocked. Vercel was reported as showing deployed commit `88c0a3b` while `origin/main` is `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`; production backup/restore posture is unknown; migration execution is not approved; selected rehearsal site refs are not recorded; no online verification, dry-run, shadow-publish, migration application, deploy, or env mutation was run.

MVP-CUTLINE-14 status: commit `88c0a3b` was reconciled as `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb` on `origin/codex/single-site-mvp-cutline-release`, not `origin/main`. It is not equal to, ahead of, or behind `ba0d070cb77da5fb8fc3618469c567c5aeb4b356` by direct ancestry; their merge base is `2e13f5d672001772c651824bd0e798f7875d190e`. Online verification remains blocked by `migration_gate_blocked_wrong_deploy_ref` and `blocked_backup_restore_posture_unknown`. No deploy, migration, Supabase call, Vercel provider call, dry-run, shadow-publish, env mutation, or online verification was run.

MVP-CUTLINE-15 status: production deployment ref remains `production_ref_still_blocked`. The reported deployed SHA `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb` is classified as `on_release_branch_only`; no human approval accepted that release branch as the intentional production deploy ref, and no human confirmation recorded a corrected `origin/main` deployment. Migration remains blocked by `migration_gate_blocked_wrong_deploy_ref`, with independent backup/restore posture `backup_restore_unknown`. No deploy, migration, Supabase call, Vercel/provider call, dry-run, shadow-publish, env mutation, online verification, or runtime/app/service/SQL behavior change was run.

MVP-CUTLINE-16B status: the human confirmed, "Supabase will be upgraded to Pro, which enables backups." Backup/restore posture is now `backup_restore_pending_pro_upgrade`, and migration is blocked by `migration_gate_blocked_waiting_for_pro_backup_confirmation`. Production Supabase Free Plan currently reports project backups unavailable; migrations are not approved until the production project is upgraded to Pro and a human confirms at least one visible backup or visible backup/PITR capability in Supabase Dashboard > production project > Database > Backups. Online verification remains blocked. No deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, online verification, or runtime/app/service/SQL behavior change was run.

MVP-CUTLINE-16C status: the human provided a Supabase screenshot confirming production organization/project on Pro plan, production project Database > Backups, visible scheduled backups, and multiple visible physical backups with Restore buttons. Backup/restore posture is now `backup_restore_confirmed`; latest visible backup is `17 Aug 2026 03:08:21 (+0000)`. The screenshot warns that Supabase Storage objects are not included in database backups; this is acceptable for SQL migration backup posture and remains documented for restore planning. Because the prior production deployment ref mismatch has not been separately resolved, migration is blocked by `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`; migration approval remains `not_approved`, and online verification remains blocked. No deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, online verification, or runtime/app/service/SQL behavior change was run.

MVP-CUTLINE-17 status: local Git inspection confirmed current HEAD and `origin/codex/single-site-mvp-cutline-release` at `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`, while `origin/main` remains `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`. No new Vercel deployment SHA was provided, production was not explicitly confirmed as redeployed to main, and the release-branch production ref was not explicitly accepted. Production deployment ref decision remains `production_ref_still_blocked`; migration gate remains `migration_gate_blocked_wrong_deploy_ref_backup_confirmed`; backup/restore posture remains `backup_restore_confirmed`; migration approval remains `not_approved`; online verification remains blocked. The exact 18-migration execution plan was prepared for a future approval-only phase, but no deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, online verification, or runtime/app/service/SQL behavior change was run.

MVP-CUTLINE-18B status: the human confirmed `gnr8-platform` and `gnr8-worker` production projects both deploy from `main` at `ba0d070`. Local Git inspection confirmed `ba0d070` resolves to `origin/main` `ba0d070cb77da5fb8fc3618469c567c5aeb4b356`; current HEAD and `origin/codex/single-site-mvp-cutline-release` remain at `88c0a3b0dfa8a10ab3c94748b533e6664fc637cb`. Production deployment ref decision is now `production_ref_corrected_to_main`; backup/restore posture remains `backup_restore_confirmed`; migration gate is `migration_gate_ready_for_execution_approval`; migration approval remains `not_approved`; online verification remains `blocked_until_migrations_applied_and_verified`. No deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, online verification, or runtime/app/service/SQL behavior change was run.

MVP-CUTLINE-19 status: the exact approval sentence was present: `I approve applying the 18 production Supabase migrations for GNR8 single-site MVP.` Migration approval is now `migration_execution_approved_pending_run`, and the next migration gate is `migration_execution_ready`. The 18 required migration files were confirmed locally from `20260722120000_aaf_persistence_core.sql` through `20260806120000_single_site_publish_operator_action_audit.sql`. Online verification remains `blocked_until_migrations_applied_and_verified` because migrations have not yet been applied and post-migration verification has not been recorded. No deploy, migration, Supabase call, Vercel/provider call, env mutation, dry-run, shadow-publish, online verification, or runtime/app/service/SQL behavior change was run.

## Operator Sequence

| Step | Action | Expected result | Stop if |
| --- | --- | --- | --- |
| 1 | Verify deployment commit/version in hosting logs or deployment UI | Target is running the approved commit | Commit SHA differs or deploy is unhealthy |
| 2 | Verify migrations with read-only catalog checks | Required tables and RLS indicators exist | Any required table is missing |
| 3 | Log in as the named superadmin | Superadmin session established | Login fails or non-superadmin can access |
| 4 | Open `/gnr8/command-center/single-site-publish` with selected refs | Panel loads read-only readiness/audit state | Panel is public, client-facing, missing auth, or shows action buttons |
| 5 | Save initial panel evidence | Screenshot/notes include selected refs, blockers, warnings, latest audit state | Unsafe diagnostics/secrets are visible |
| 6 | Call `GET /api/gnr8/admin/single-site-mvp/status` with selected ids/refs | Redacted status returns next operation, blockers, warnings, limitations, mutation flags false | Raw SQL/stack/secrets appear or auth fails unexpectedly |
| 7 | Call `POST /api/gnr8/admin/single-site-mvp/action` with `actionMode: "preflight"` and current `requestedOperationKey` | Expected allow/block reason | Preflight allows an operation that source truth should block |
| 8 | Run dry-run through the action route or direct MVP-54 route | Response says dry-run/non-publishing/non-mutating, or blocks with expected source-truth reason | Dry-run mutates runtime, publish target, active pointer, provider, DNS/domain, billing, Stripe, Vercel, or Openprovider state |
| 9 | Inspect audit | Operator audit action/refs/events exist for dry-run/preflight | Audit missing or contains unsafe raw diagnostics |
| 10 | Refresh Command Center panel | Latest audit/readiness projection reflects the route result | Panel projection differs materially from route result without explanation |
| 11 | Decide whether to stop at dry-run | Human records pass/fix/stop decision | Any stop criterion has occurred |
| 12 | Optional: enable `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` only after explicit approval | Flag value is recorded with approver and timestamp | Approval missing or dry-run did not pass |
| 13 | Optional: run shadow-publish with confirmation accepting active-pointer mutation and no automatic rollback | Route returns redacted wrapper/orchestrator result and safe before/after refs | Shadow-publish executes without approval, exposes unsafe data, or touches unexpected systems |
| 14 | Optional: verify online result | Active pointer/public or preview behavior matches returned before/after refs | Pointer/public behavior does not match response |
| 15 | Record outcome | Closeout includes correlation id, idempotency key, route status, wrapper/resolver/gate status, audit id, pointer refs, screenshots/URLs, and seeded exceptions | Outcome cannot be reproduced or evidence is incomplete |

## Required Request Evidence

For every online route call, record:

- operator account;
- timestamp;
- target environment;
- deployment commit SHA;
- correlation id;
- idempotency key for mutating/audit-writing calls;
- tenant/client/site/migration ids;
- candidate site version ref;
- runtime artifact ref;
- publish target ref;
- launch readiness evidence ref;
- publish activation request ref;
- publish activation decision ref;
- publish activation gate attempt/result ref;
- handoff watermark;
- gate input watermark;
- response status and redacted response body.

## Shadow-Publish Approval Record

Before any online shadow-publish, record:

- approving human;
- exact target environment;
- selected site;
- current active pointer/ref before the call;
- flag value and where it was set;
- confirmation that `publishMayExecute`, `runtimeMutationMayOccur`, `blockingEnforcementApplied: false`, and `noAutomaticRollback: true` are understood;
- rollback/restore contact and plan if pointer behavior is wrong.

## Pass Criteria

The one-site rehearsal passes as a route/deploy rehearsal when:

- deploy is healthy on the intended commit;
- all required migrations are present;
- superadmin auth works and non-superadmin access is denied;
- Command Center panel loads as read-only and redacted;
- status route returns expected orchestration truth;
- preflight returns expected allow/block;
- dry-run completes non-mutating or blocks with expected source-truth reason;
- audit records are visible through route/panel projections;
- no unexpected provider/domain/DNS/billing/Stripe/Vercel/Openprovider behavior occurs;
- shadow-publish is either safely blocked by default or runs only after explicit approval.

The site counts toward MVP validation only when real source-owned flow produced required approvals/readiness/gate truth, online verification passed, no unsafe exceptions were used, and the closeout records that it is validation-counting.

## Stop Criteria

Stop immediately if:

- migration application is incomplete or failed;
- auth fails open;
- internal panel/route is exposed to a client or public surface;
- dry-run mutates anything beyond audit;
- shadow-publish mutates before approval or while the flag should be off;
- active pointer/public behavior does not match returned refs;
- raw diagnostics, SQL errors, stack traces, secrets, provider credentials, billing/payment data, or raw AAF payloads are exposed;
- provider/domain/DNS/billing/Stripe/Vercel/Openprovider side effects appear;
- seeded/bypassed data is being counted as final MVP validation.

## Outcome Template

Use this short record after the run:

```text
Environment:
Commit SHA:
Operator:
Site:
Migration id:
Dry-run route:
Dry-run result:
Audit id:
Shadow-publish run: yes/no
Shadow approver:
Active pointer before:
Active pointer after:
Seeded/bypassed exceptions:
Unexpected side effects:
Decision: pass/fix/stop
Counts toward MVP validation: yes/no
Reason:
```
