# GNR8 Single-Site MVP Online Verification Checklist

Phase: MVP-CUTLINE-5
Scope: short operator sequence for the first deployed one-site rehearsal.

## Preconditions

Do not start online verification until all are true:

- release commit has been reviewed and pushed by a human-approved release step;
- deployment target is running the intended commit SHA;
- required Supabase migrations have been applied in chronological order to the target environment; CUTLINE-20 completed this prerequisite for production project `ujfbpzugdsdmroqvhfvn` on 2026-08-17;
- post-migration catalog checks passed; CUTLINE-20 readback found 76/76 expected tables present, RLS enabled on all expected tables, 49/49 expected append-only triggers present, and no missing AAF vocabulary tokens;
- `SUPERADMIN_EMAILS` includes the named rehearsal operator;
- baseline Supabase/database env values point at the intended target environment;
- `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` is off unless shadow-publish has explicit approval;
- selected `tenantId`, `clientId`, `siteId`, `migrationId`, candidate refs, runtime artifact ref, publish target ref, launch readiness evidence ref, publish activation request/decision/gate refs, handoff watermark, and gate input watermark are known;
- seeded or bypassed source-truth records are listed as MVP exceptions before the run.

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

## CUTLINE-20 Migration Prerequisite Record

Production migration prerequisite status: complete for the database/catalog gate only.

- Applied migration set: the 18 migrations listed in `docs/product/gnr8-single-site-deployment-readiness-checklist.md`, in chronological order from `20260722120000_aaf_persistence_core.sql` through `20260806120000_single_site_publish_operator_action_audit.sql`.
- Target: production Supabase project `ujfbpzugdsdmroqvhfvn`, database host `aws-1-eu-west-1.pooler.supabase.com`, database `postgres`.
- Readback: migration history matched local and remote for all 18 required versions after execution.
- Boundary: CUTLINE-20 did not run online verification, dry-run, shadow-publish, runtime publish, deploy, Vercel/provider/DNS/domain/billing/Stripe/Openprovider calls, or env mutation.
- Next gate before online verification: confirm deploy health on `ba0d070`, env flag posture, superadmin auth, and selected source-truth site data or explicit MVP exceptions.

## CUTLINE-21 Online Verification Preflight Record

Production online preflight status: complete for read-only health/auth/catalog/source-truth readiness, with governed dry-run blocked by missing site data.

- Platform health: `GET https://app.pasadenagenerator.com/` returned HTTP 200 from Vercel and rendered the GNR8 platform shell.
- Worker health: `GET https://gnr8-worker.vercel.app/health` returned HTTP 200 with `ok: true`, `service: gnr8-worker`, and `status: ready`.
- Deploy ref: production was supplied as `main / ba0d070`; exact platform/worker commit was not independently observable through public headers or local Vercel metadata.
- Env flags: available production env artifact has `GNR8_SINGLE_SITE_SHADOW_PUBLISH_OPERATOR_ACTION` missing and `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` missing.
- Superadmin auth: `/gnr8/command-center/single-site-publish` loaded in the in-app browser and rendered `Superadmin Workspace`.
- Panel: `Single-Site Publish Operator Panel` rendered read-only, lookup-required, and with mutation boundary flags false.
- Status route: unauthenticated live `GET /api/gnr8/admin/single-site-mvp/status` returned HTTP 401 `SUPERADMIN_REQUIRED`, redactions, and mutation flags false.
- Action route: unauthenticated live `POST /api/gnr8/admin/single-site-mvp/action` returned HTTP 401 `SUPERADMIN_REQUIRED`, redactions, and mutation flags false. Authenticated JSON probe was not completed because the in-app browser blocked direct `/api/...` navigation and did not expose page-scope network APIs.
- Production read-only DB readback: 18/18 required migration versions present; expected core tables visible; publish target row is `production / production / active / ptt-1`.
- Candidate source truth: missing. Production counts were `gnr8_single_site_migrations=0`, `migrations_with_site=0`, `gnr8_single_site_launch_readiness_records=0`, `operator_actions=0`.
- Dry-run readiness: `dry_run_blocked_missing_site_data`.
- Dry-run run: no. The exact approval sentence was absent.
- Shadow-publish/runtime publish/provider/env/deploy/migration mutations: none.

Closeout: `docs/product/gnr8-single-site-mvp-cutline-21-online-verification-preflight.md`.

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
