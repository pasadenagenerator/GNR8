# GNR8 MVP-53 Single-Site Publish Operator Caller Surface Closeout

Scope: Documentation-only architecture for the first eligible operator caller surface that may invoke the MVP-52 single-site publish wrapper in a later milestone.

MVP-53 created documentation and canonical index entries only. It did not implement UI, API routes, server actions, wrapper wiring, blocking enforcement, publish behavior changes, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, client portal exposure, runtime mutations, commit, or push.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/architecture/gnr8-single-site-publish-caller-context-architecture.md`
- `docs/architecture/gnr8-single-site-publish-caller-context-contract.md`
- `docs/architecture/gnr8-single-site-publish-caller-selection-and-boundaries.md`
- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/product/gnr8-single-site-launch-readiness-operator-workflow.md`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-publish-shadow-operator-visibility-workflow.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `apps/platform/app/gnr8/layout.tsx`
- `apps/platform/app/gnr8/command-center/layout.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `apps/platform/app/gnr8/command-center/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/api/gnr8/agency/_lib/agency-action-access.ts`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `apps/platform/src/auth/resolve-current-agency.ts`
- `apps/platform/src/auth/resolve-current-client.ts`
- `apps/platform/src/auth/rbac.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-publish-operator-caller-surface-architecture.md`
- `docs/architecture/gnr8-single-site-publish-operator-caller-contract.md`
- `docs/architecture/gnr8-single-site-publish-operator-access-control.md`
- `docs/product/gnr8-single-site-publish-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-operator-caller-surface-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Options Evaluated

- Internal Command Center operator action.
- Internal server action attached to Command Center.
- Internal API route under Command Center/admin namespace.
- CLI/rehearsal harness only.
- Generic runtime publish route extension.
- Ops Inbox action.
- Client portal action.

## Selected Caller Surface

Selected: an internal Command Center operator action backed by an internal admin-namespace route in a later milestone.

MVP-54 should implement dry-run only, hidden/default-off, with explicit strict refs and no publish. MVP-55 may add shadow-publish only behind a separate explicit flag and confirmation. The generic runtime publish route, Ops Inbox, and client portal remain excluded.

## Caller Input Contract

Future caller input must require tenant id, client id, site id, migration id, candidate site version ref/id, runtime artifact ref/id, publish stage/environment, expected launch readiness evidence ref, expected publish activation request ref, expected publish activation decision ref, expected gate attempt/result ref, expected handoff watermark, expected gate input watermark, actor identity/role, correlation id, idempotency key, explicit mode, and explicit operator confirmation. Publish target ref should remain required to preserve MVP-51/MVP-52 identity.

## Authorization Policy

MVP-54 should allow only the current internal Command Center superadmin posture. Client users, client reviewers, public users, agency members, agency admins/owners without later explicit extension, and Ops Inbox derived-item actors are denied. Tenant/client/site/migration/candidate/artifact/target/evidence/request/decision/gate/watermark scope must be proven before wrapper invocation. Authorization fails closed.

## Operator Workflow

Operator opens the single-site migration/candidate in Command Center context, verifies content/client/launch approvals, verifies launch readiness evidence, verifies publish activation request/decision/gate result and watermarks, runs dry-run wrapper, reviews diagnostics, resolves blockers at source, and only in MVP-55 may run shadow-publish behind explicit flag. Manual published-result verification and closeout persistence are later milestone work. This is not blocking enforcement.

## Response/Result Contract

Future result should include preflight status, resolver status, wrapper status, publish orchestrator status when called, shadow guard diagnostics, blocker codes, limitations, safe refs, redaction summary, correlation/idempotency linkage, and explicit `publishes`/`runtimeMutation` flags. It must not expose raw sensitive AAF/source refs to broad users and must not be client-facing.

## Future Implementation Milestones

1. MVP-54: implement internal caller surface as dry-run only, no publish.
2. MVP-55: implement shadow-publish operator action behind explicit flag.
3. MVP-56: blocking enforcement flag architecture or implementation.
4. MVP-57: end-to-end publish rehearsal.
5. Later: minimal Command Center visibility if not already included.

## MVP-54/MVP-55 Test Plan

Required tests:

- unauthorized role denied;
- missing scope denied;
- missing required refs blocked before wrapper;
- dry-run calls wrapper dry-run only;
- shadow-publish calls wrapper execute only under explicit flag;
- generic publish route unchanged;
- client portal unchanged;
- Ops Inbox unchanged;
- no AAF record creation by caller;
- no gate reevaluation;
- no PASR calls;
- no DDOM/provider/DNS calls;
- no billing/Stripe calls;
- no response contract leak;
- no action visible without flag.

## Boundary Confirmations

Command Center boundary: selected as future internal surface only; no Command Center implementation changed in MVP-53.

Ops Inbox boundary: not selected; remains derived-only/no-action.

Client portal boundary: excluded.

Generic publish route boundary: excluded and unchanged.

Publish/runtime boundary: no runtime behavior changed; future dry-run must report no runtime mutation.

Domain/DNS/provider boundary: no DDOM, live DNS, Vercel, Openprovider, registrar, SSL, AI, production Supabase, or staging Supabase call is allowed.

Billing/Stripe boundary: no billing or Stripe read/write authority is added.

## Risks Found

- Generic runtime publish currently performs domain reconciliation/activation after publish, making it unsafe to extend for single-site wrapper context.
- Current agency `publish` permission is broader than the first single-site operator-caller policy should allow.
- Ops Inbox is intentionally derived-only, so adding action payloads there first would blur source-truth ownership.
- MVP-44 gate input watermark recovery depends on persisted causation marker behavior noted in MVP-49.
- Shadow-publish still uses existing publish behavior once explicitly invoked, so MVP-55 needs extra flag and confirmation tests.

## Implementation May Begin

Implementation may begin for MVP-54 only: an internal admin/Command Center dry-run caller surface, hidden/default-off, no publish, no client exposure, no Ops Inbox action, and no generic publish route modification.

Implementation may not begin from MVP-53 for shadow-publish, blocking enforcement, generic route integration, client portal exposure, Ops Inbox actions, provider/domain/billing execution, AAF writes, gate reevaluation, rollback changes, or active pointer behavior changes.

## Recommended Next Milestone

MVP-54: implement the internal Command Center/admin dry-run caller surface for the MVP-52 wrapper, with strict authorization, strict input contract, default-off flag, and source guard tests proving no publish/runtime/provider/billing/domain/client/Ops Inbox/generic route changes.

No commit or push was performed.
