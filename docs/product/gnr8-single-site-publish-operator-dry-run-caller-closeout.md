# GNR8 MVP-54 Single-Site Publish Operator Dry-Run Caller Closeout

Scope: Internal superadmin-only dry-run caller surface for the MVP-52 single-site publish wrapper.

MVP-54 implements a narrow admin API caller that validates strict single-site publish context and invokes the MVP-52 wrapper only with `dryRun: true`. It does not publish, switch active pointers, mutate runtime, create AAF records, evaluate gates, call PASR, create DDOM snapshots, call providers, expose client portal actions, add Ops Inbox actions, implement blocking enforcement, commit, or push.

## Files Reviewed

- `docs/product/gnr8-single-site-publish-operator-caller-surface-closeout.md`
- `docs/architecture/gnr8-single-site-publish-operator-caller-surface-architecture.md`
- `docs/architecture/gnr8-single-site-publish-operator-caller-contract.md`
- `docs/architecture/gnr8-single-site-publish-operator-access-control.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- `apps/platform/app/gnr8/command-center/layout.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `apps/platform/app/gnr8/command-center/page.tsx`
- `apps/platform/app/api/gnr8/admin/first-limited-dry-run/first-limited-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/provider-handoffs/[handoffId]/dryrun-job-plan/provider-handoff-dryrun-job-plan-route-handlers.ts`
- `apps/platform/src/auth/require-superadmin-user-id.ts`
- `apps/platform/src/superadmin/require-superadmin-user-id.ts`
- `apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts`
- `apps/platform/app/api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts`
- `apps/platform/app/gnr8/client/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- `docs/product/gnr8-single-site-publish-operator-dry-run-caller-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Selected Implementation Pattern

Selected: narrow internal admin API route under `/api/gnr8/admin/single-site-publish/dry-run`, backed by a pure single-site caller helper.

No Command Center UI was added in MVP-54. The API route is the first callable internal surface; UI display remains future work after operators have an approved display model. This follows the existing admin route handler and dependency-injected test pattern instead of adding a broad server action or extending generic publish.

## Authorization Behavior

The route uses `requireSuperadminUserId()` from the existing superadmin posture. The actor passed to the wrapper is derived server-side as:

- `actorType: "human"`
- `actorId: <superadmin user id>`
- `actorRole: "platform_superadmin"`

The request body cannot override actor identity or role. Anonymous users, client users/reviewers, agency members/admins/owners, public callers, support/debug actors without superadmin posture, and Ops Inbox actors fail closed before validation can reach the wrapper.

## Input Validation

The caller requires:

- `mode: "dry_run"`
- `tenantId`
- `clientId`
- `siteId`
- `migrationId`
- `candidateSiteVersionRef`
- `runtimeArtifactRef`
- `expectedPublishTargetRef`
- `publishStage`
- `publishEnvironment`
- `expectedLaunchReadinessEvidenceRef`
- `expectedPublishActivationRequestRef`
- `expectedPublishActivationDecisionRef`
- `expectedGateAttemptResultRef`
- `expectedHandoffWatermark`
- `expectedGateInputWatermark`
- `operatorConfirmation`
- `idempotencyKey`
- `correlationId`

The operator confirmation must bind `mode: "dry_run"`, `dryRunOnly: true`, `publishes: false`, `runtimeMutation: false`, the exact migration id, and the candidate site version ref/id. Missing, invalid, unknown, or execute-oriented request fields fail before wrapper invocation.

## Wrapper Dry-Run Invocation

The caller invokes `publishSingleSiteApprovedCandidateShadow(...)` with:

- `enabled: true`
- `mode: "shadow_publish"`
- `dryRun: true`
- all strict expected refs and watermarks from the caller request
- server-derived `platform_superadmin` actor

The caller never passes `dryRun: false`, never calls the wrapper execute path, and never imports or calls `publishApprovedSiteVersion(...)` or the publish orchestrator directly.

## Result Projection And Redaction

The response is a safe internal operator projection containing:

- caller and wrapper versions
- preflight status
- resolver status
- wrapper dry-run status
- metadata completeness summary
- blocker codes
- warnings
- limitation codes only
- safe strict context ids/refs
- correlation id and idempotency key
- explicit non-mutating flags

The response omits raw `resolverResult`, raw `publishActivationMetadataHandoff`, `publishOrchestratorInput`, `publishOrchestratorResult`, raw AAF rows, raw evidence payloads, source refs, diagnostic refs, provider secrets, and billing data.

## UI And API Boundary

MVP-54 adds only the internal admin API route. It adds no visual Command Center button, no publish or execute button, no blocking controls, no client-visible route, and no dashboard redesign.

## Generic Publish Route Boundary

`apps/platform/app/api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts` was reviewed and left unchanged. The new route is separate and the generic route does not import the MVP-54 caller or the MVP-52 wrapper.

## Client Portal Boundary

Client portal and client content publish routes were reviewed and left unchanged. MVP-54 adds no client dashboard, client API, client reviewer, or public runtime exposure.

## Ops Inbox Boundary

Ops Inbox remains read-only/derived-only for this milestone. MVP-54 adds no Ops Inbox action payload, button, route, or work-item execution hook.

## AAF And Gate Boundary

The caller does not create approval requests, approval decisions, evidence packages, policy evaluations, audit events, gate attempts, or other AAF records. It does not import or invoke the MVP-44 gate evaluator. It consumes expected refs only and lets the MVP-52/MVP-49 read-only path validate completeness.

## PASR Boundary

The caller does not import or call PASR observer/source-reader/read-model paths.

## DDOM Boundary

The caller does not create DDOM snapshots, call DDOM manual trigger/caller paths, or call live DNS.

## Domain, DNS, Provider, Billing, And Stripe Boundary

The caller does not call Vercel, Openprovider, registrars, DNS providers, SSL providers, AI providers, production Supabase, staging Supabase, Stripe, billing, entitlement, subscription, domain, DNS, or provider mutation paths. Validation used dependency-injected tests and local disposable integration only.

## Publish, Rollback, Runtime Boundary

The caller never publishes, never rolls back, never switches active pointers, never mutates runtime artifacts, site versions, publish targets, content overrides, rollback state, public runtime, or active pointers. Dry-run wrapper output reports `publishes: false` and `runtimeMutation: false`.

## Validation Results

Focused dry-run caller/API tests:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- Result: pass, 8/8 tests.

MVP-52 wrapper unit regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- Result: pass, 10/10 tests.

MVP-52 wrapper disposable integration regression:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts`
- Result: pass, 1/1 test.

Focused TypeScript no-emit:

- `pnpm exec tsc -p tmp-mvp54-tsconfig.json --pretty false`
- Result: pass after adding `composite: false` to the temporary config. The temporary config and generated `.tsbuildinfo` were removed.

MVP-49 resolver tests were not rerun separately because resolver files were not touched; MVP-52 integration exercised resolver-backed persisted context.

## Guardrails

Focused test source guardrails and final shell checks verify:

- wrapper execute mode is not invoked by the caller
- publish orchestrator is not called directly by the caller
- generic publish route is unchanged by MVP-54
- client portal/content publish routes are unchanged by MVP-54
- Ops Inbox is unchanged by MVP-54
- no AAF record creation code is added
- no gate evaluator invocation is added
- no PASR invocation is added
- no DDOM snapshot creation is added
- no provider/DNS/Vercel/Openprovider/Stripe/AI call is added
- no direct active pointer/runtime mutation is added
- no SQL migration is added

## Issues Found And Fixed

- The first source guard test overmatched defensive forbidden-field strings and explicit `false` safety flags. The regexes were narrowed to actual imports/calls and mutation signals.
- The first focused no-emit temporary config inherited root `composite: true`, causing `TS6307` file-list enforcement on transitive imports. The temporary config was adjusted with `composite: false`.
- `tsx` could not create an IPC pipe inside the sandbox; focused tests were rerun with approved escalation for the same local commands.

## Residual Risks

- The route is internal API only; no Command Center UI display is included yet.
- Production invocation will read persisted metadata through the MVP-52/MVP-49 path and can return resolver/preflight blockers when upstream refs are missing, stale, or mismatched.
- Blocking enforcement remains intentionally unimplemented.
- Shadow-publish execution remains a later milestone and must use a separate explicit operator action/flag.

## Safe-To-Accept Decision

MVP-54 is safe to accept as an internal superadmin-only dry-run caller surface. It validates strict caller context before wrapper invocation, invokes the MVP-52 wrapper only with `dryRun: true`, returns a redacted operator-safe projection, and preserves all generic publish, client portal, Ops Inbox, AAF/gate, PASR/DDOM, provider/domain/DNS/billing/Stripe, runtime, rollback, and active pointer boundaries.

## Recommended Next Milestone

MVP-55: add a separately flagged internal shadow-publish operator action only after an explicit execution contract, confirmation, audit/redaction model, and tests prove the action cannot be confused with MVP-54 dry-run and still does not implement blocking enforcement.

No commit or push was performed.
