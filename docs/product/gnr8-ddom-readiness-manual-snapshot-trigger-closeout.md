# GNR8 DDOM-6 Readiness Manual Snapshot Trigger Closeout

DDOM-6 implements the first controlled manual trigger facade for DDOM readiness snapshot creation. The trigger is server-only, authorization-aware, non-provider, non-publishing, and calls the DDOM-5 manual snapshot caller, which reads stored GNR8 state through the DDOM-5 repository and writes append-only snapshot/ref rows through the DDOM-3 writer.

No publish-route shadow integration, publish enforcement, active pointer behavior, rollback behavior, PASR behavior, Command Center UI, Ops Inbox, public runtime serving, worker, Vercel helper, Openprovider helper, DNS resolver/helper, registrar/provider code, billing, Stripe, AI, scheduled job, queue, SQL migration, production Supabase, staging Supabase, remote Supabase, DNS provider, Vercel, Openprovider, registrar, Stripe, or AI provider was intentionally changed or called.

## Files Reviewed

DDOM-5 baseline:
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`

DDOM-4 architecture and workflow:
- `docs/architecture/gnr8-ddom-readiness-snapshot-production-caller-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-caller-options.md`
- `docs/product/gnr8-ddom-readiness-snapshot-operator-workflow.md`
- `docs/product/gnr8-ddom-readiness-snapshot-production-caller-architecture-closeout.md`

DDOM-2/DDOM-3:
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.ts`
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`

PASR future compatibility:
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`

Auth/RBAC/operator patterns reviewed read-only:
- `apps/platform/src/auth/rbac.ts`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `apps/platform/src/auth/resolve-current-agency.ts`
- `apps/platform/src/auth/resolve-current-client.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/site/routes/site-bootstrap-trigger.ts`
- representative Command Center/admin/operator route/action search results under `apps/platform/app`, `apps/platform/src`, and `apps/platform/gnr8`

## Files Created Or Updated

Created:
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.integration.test.ts`
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`

Updated:
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Final Trigger Location

The trigger facade lives at:
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`

No API route, server action, Command Center UI export, or Ops Inbox wiring was implemented. Route/action/UI wiring is deferred because the repository has several operator/admin patterns, but no narrow DDOM-specific trigger boundary that should be extended in this phase without broadening runtime behavior.

## Authorization Strategy

The trigger uses dependency-injected authorization:
- production construction without an authorization adapter fails closed;
- tests provide fake allow/deny adapters;
- actor id, actor type, roles, tenant/client/agency/site scope, subject ids, reason, correlation id, idempotency key, privacy label, and retention class are validated before the DDOM-5 caller runs;
- local role vocabulary follows existing GNR8 operator/RBAC patterns: `superadmin`, `owner`, `admin`, plus explicit operator-shaped roles such as `agency_admin`, `client_admin`, `domain_operator`, `ddom_operator`, and `publish_operator`;
- non-superadmin actors require explicit scope, and scope mismatch fails closed before snapshot creation.

The adapter remains the integration point for future app auth helpers such as superadmin, agency, client, or Command Center-specific authorization resolution.

## Source-State Contract

The trigger itself does not read source state. It validates the operator request and passes the canonical trigger request into the DDOM-5 manual snapshot caller.

DDOM-5 then reads only already-known stored GNR8 state through `DdomReadinessStoredStateRepository`:
- runtime sites and site versions;
- ownership site identity;
- stored domain and host bindings;
- stored Vercel-shaped domain fields;
- stored DNS instruction fields;
- exact existing AAF approval/evidence/audit refs when supplied.

The trigger performs no source-state mutation.

## DDOM-5 Caller Usage

The trigger calls `createManualReadinessSnapshot(...)` on the DDOM-5 caller boundary. It passes actor, tenant/client/agency/site scope, optional site version/domain/host refs, intended domain/internal host, environment/stage, reason, correlation/causation, idempotency, privacy, retention, TTL, and optional existing AAF refs.

Caller errors are converted into safe `rejected` trigger results.

## DDOM-3 Writer Usage

DDOM-6 does not call the DDOM-3 writer directly. The write path is:

`DDOM-6 trigger facade -> DDOM-5 manual snapshot caller -> DDOM-5 mapper -> DDOM-3 writer -> append-only DDOM snapshot/ref tables`

The only database writes proven by integration tests are inserts into:
- `public.gnr8_ddom_readiness_snapshots`
- `public.gnr8_ddom_readiness_snapshot_refs`

## Idempotency Behavior

The trigger requires an idempotency key and passes it through to the DDOM-5 caller and DDOM-3 writer. Same idempotency key with same semantic payload reuses the existing snapshot and returns `reusedExisting: true`. Unauthorized attempts never call the caller and therefore create no idempotency record.

## DDOM-To-PASR Mapping

The trigger preserves the DDOM-5 PASR implication summary in the result payload:
- DDOM `ready` -> PASR `ready`
- DDOM `ready_with_warnings` -> PASR `ready` plus warnings
- DDOM `not_applicable` -> PASR `not_applicable`
- DDOM `manually_excepted` -> PASR `manually_excepted`
- DDOM `blocked` -> PASR `blocked`
- DDOM `stale` -> PASR `blocked` with stale reason/blocker context

The trigger explicitly reports:
- `publishReadyApprovalGranted: false`
- `publishActionPerformed: false`
- `providerCallsPerformed: false`
- `pasrSnapshotCreationPerformed: false`

PASR remains read-only and does not create snapshots.

## Audit And Activity Decision

No activity/audit log write was added. Existing AAF audit/event infrastructure is available elsewhere, but adding a DDOM trigger attempt audit row would require ownership and schema/policy review beyond this narrow phase. DDOM-6 therefore returns an authorization summary and correlation/idempotency-driven operator payload only.

No AAF approval or evidence package records are created.

## Boundary Confirmations

Provider non-call confirmation:
- no Vercel calls;
- no Openprovider calls;
- no DNS provider/resolver calls;
- no registrar calls;
- no Stripe calls;
- no AI provider calls.

Source non-mutation confirmation:
- integration query logging showed no non-DDOM `insert`, `update`, `delete`, `merge`, or `truncate` during trigger/caller/writer execution;
- source fixture table counts were unchanged after authorized and unauthorized trigger attempts.

Publish/rollback non-integration confirmation:
- no publish route, publish orchestrator, publish enforcement, active pointer, rollback route/module, or rollback behavior was modified or imported.

Command Center/Ops Inbox non-integration confirmation:
- no Command Center or Ops Inbox files were modified or imported;
- both remain derived-only and unwired in this phase.

Runtime behavior confirmation:
- no runtime route behavior changed;
- no API route/server action/UI/runtime/public serving/worker files were modified.

## Validation Results

Passed:
- DDOM-3 writer unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- DDOM-5 caller unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- DDOM-6 trigger unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.test.ts`
- DDOM-5 caller disposable DB integration tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`
- DDOM-6 trigger disposable DB integration tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.integration.test.ts`
- Focused TypeScript validation: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p /private/tmp/ddom-6-tsconfig.json --pretty false`

The initial sandboxed trigger unit test failed because `tsx` could not create a local IPC pipe under the sandbox. The same test passed when rerun with the already-used local `tsx` execution allowance.

Disposable DB integration proves:
- authorized trigger creates a DDOM snapshot row;
- refs are created;
- idempotent retry reuses the same snapshot;
- unauthorized trigger creates no snapshot;
- source fixture rows are not mutated;
- append-only constraints remain effective;
- no broad RLS policies are added;
- Docker containers are stopped in `finally`.

## Static Guardrail Results

Passed source guardrails over the new trigger implementation/tests and DDOM-5/DDOM-3 path:
- no Vercel helper imports or calls;
- no Openprovider helper imports or calls;
- no DNS resolver/provider imports or calls;
- no registrar client imports or calls;
- no Stripe/billing imports or calls;
- no AI imports or calls;
- no publish orchestrator/route imports or calls;
- no product rollback imports or calls;
- no Command Center imports;
- no Ops Inbox imports;
- no public runtime serving imports;
- no worker imports;
- no runtime-store imports.

No SQL migrations were created or modified. No runtime route, publish route, rollback route, Command Center, Ops Inbox, public runtime, provider, billing, AI, worker, or broad API files were modified.

No production/staging/remote Supabase or external provider was called. Only disposable local Docker PostgreSQL was used for integration validation.

## Issues Found

No schema/auth gap requiring a migration was found.

The only implementation decision surfaced during review was trigger location: existing operator/admin patterns were not narrow enough to justify creating a route/action in this phase, so the safe facade-only path was chosen.

## Residual Risks

The default production facade requires a future caller to supply an authorization adapter. This is intentional fail-closed behavior, but UI/API integration must implement the adapter using the app's authenticated actor and tenant/client/site resolution before exposing an operator control.

No audit/activity record is persisted for trigger attempts yet. If that becomes required, it should be a separately reviewed non-AAF activity/audit milestone or a precise AAF audit-event integration, not an incidental write in DDOM-6.

## Safety Conclusion

DDOM-6 is safe to accept.

Publish-route shadow integration may begin after this phase, with the explicit constraint that publish shadow reads existing DDOM snapshots and must not create snapshots from PASR or publish-route evaluation.

Recommended next milestone:
- publish-route shadow integration that reads pre-existing DDOM readiness snapshots through PASR, remains non-blocking/non-enforcing, and records only shadow/read outcomes without provider calls or DDOM writes.

## Commands Run

- `sed -n ...` over DDOM-5 implementation/tests and DDOM-2/DDOM-3/DDOM-4/PASR docs
- `rg -n ...` for auth/RBAC/operator/internal action/route/audit patterns
- `git status --short`
- `find apps/platform/supabase/migrations -maxdepth 1 -type f -name '*ddom*' -print | sort`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-snapshot-writer.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsc -p /private/tmp/ddom-6-tsconfig.json --pretty false`
- `git diff --check`
- trailing whitespace `rg` checks over changed files
- forbidden import/call guardrail `rg` checks over changed files
- changed-file scope checks for migrations, routes, runtime, providers, billing, AI, workers, Command Center, Ops Inbox, and public runtime files
- `docker ps --format '{{.Names}}'`
