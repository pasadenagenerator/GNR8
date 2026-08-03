# GNR8 Single-Site Client Approval AAF Bridge Closeout

Phase: MVP-33
Date: 2026-08-03
Scope: server-only, non-executing AAF bridge and evidence/decision validation core for `single_site_client_approval`.

## Result

MVP-33 implemented the single-site client approval AAF bridge and evidence validation core.

The bridge prepares or reuses AAF evidence packages and approval requests for exact scope `single_site_client_approval` and evidence type `single_site_client_approval_evidence`. It validates supplied AAF decision refs read-only before client approval can be considered valid.

No launch approval, client portal, UI/API route, server action, publish, runtime mutation, site version mutation, active pointer mutation, domain/DNS, billing, provider, AI, Vercel, Openprovider, Stripe, production Supabase, or staging Supabase behavior was implemented or called.

## Files Reviewed

- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-service.test.ts`
- `apps/platform/gnr8/single-site/client-approval-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260803190000_single_site_client_approval_core.sql`
- `docs/product/gnr8-single-site-client-approval-persistence-service-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- `docs/product/gnr8-single-site-client-launch-approval-aaf-contracts-closeout.md`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-client-approval-aaf-bridge-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Bridge Module

Location: `apps/platform/gnr8/single-site/client-approval-aaf-bridge.ts`

APIs:

- `SingleSiteClientApprovalAafBridge.prepareClientApprovalRequest(input)`
- `SingleSiteClientApprovalAafBridge.validateClientApprovalDecisionRef(input)`
- `prepareClientApprovalRequest(input)`
- `validateClientApprovalDecisionRef(input)`
- `computeClientApprovalSemanticWatermark(input)`
- `buildExpectedClientApprovalRefs(input)`

The module imports `server-only`, uses existing AAF writer repository transaction helpers, and does not execute or mutate runtime behavior.

## Evidence Package Behavior

Preparation creates or reuses one AAF evidence package of type `single_site_client_approval_evidence`.

The evidence package cites deterministic source refs/items for:

- content approval decision;
- improved candidate rendered snapshot;
- client-facing summary;
- limitations summary;
- deferred or not-applied recommendation summary;
- operator/account notes;
- deferred/not-applied recommendation refs where supplied;
- audit timeline refs where supplied.

The semantic watermark excludes volatile timestamps and includes tenant/client/site, migration, client approval, content approval, AAF content approval decision, improved candidate, proposal, implementation authorization, execution, selected recommendations, reviewer/representative identity, evidence refs, limitations, deferred/not-applied refs, operator notes, audit timeline refs, and policy version.

Same semantic input plus the same idempotency key reuses the evidence package. Same idempotency key plus semantic drift fails with an AAF idempotency conflict.

## AAF Request Behavior

Preparation creates or reuses an approval request with:

- exact scope `single_site_client_approval`;
- subject type `single_site_improved_candidate_client_acceptance`;
- subject id equal to the client approval id;
- status `requested`;
- action key `approve_single_site_client_acceptance` in policy evaluation;
- replay class `not_replayable` on the request audit event;
- linked evidence package;
- complete subject refs for tenant, client, site, migration, client approval, content approval, improved candidate site version, improved runtime artifact, improved version review, proposal plan, proposal approval, implementation authorization, improvement execution attempt, selected recommendations, limitations, reviewer identity, and reviewer representative role.

Preparation does not create an AAF approval decision.

## Decision Validation Behavior

Validation is read-only and fails closed unless:

- the AAF decision exists;
- the linked request exists;
- the request scope is exactly `single_site_client_approval`;
- tenant/client/site match and no unrelated batch/job/site-version/domain/cost-center scope is present;
- subject type is `single_site_improved_candidate_client_acceptance`;
- subject id matches the client approval id;
- request and decision policy versions match;
- decision status is `granted` or `granted_with_limitations`;
- the linked evidence package exists, uses `single_site_client_approval_evidence`, matches subject/scope, is not invalid/superseded, and carries the expected semantic watermark;
- freshness, revocation, supersession, expiration, required subject refs, required evidence refs, and request-evidence link checks pass.

Rejected, revoked, expired, superseded, cancelled, wrong-scope, stale, mismatched, missing, preview/rendering-only, content-approval-as-client-approval, launch-approval-as-client-approval, and publish-approval-as-client-approval substitutions fail closed.

`granted_with_limitations` is valid only when limitations are present and returns the carried limitations.

## Service Integration

`ClientApprovalService` now imports the bridge validation result type.

Decision ref attachment and approval paths require successful MVP-33 validation:

- `attachAafRequestRef` still records prepared request refs.
- `attachAafDecisionRef` requires a valid MVP-33 bridge validation result.
- `approve` accepts only validated `granted` decisions.
- `approveWithLimitations` accepts only validated `granted_with_limitations` decisions and carries validation limitations forward.
- raw decision ids without validation fail closed.
- wrong-scope, rejected, revoked, expired, superseded, cancelled, or invalid validation results fail closed.

The service remains idempotent and keeps client approval separate from launch approval and publish activation approval.

## Read Model

The read model remains derived-only and non-enforcing.

It now projects client approval AAF validation state:

- request prepared;
- decision missing;
- decision ref attached;
- decision validated;
- decision invalid by stored AAF shape;
- approved with limitations;
- limitations carried forward.

## Idempotency Strategy

The bridge uses the supplied idempotency key with stable suffixes:

- `:client-approval-evidence`
- `:client-approval-evidence:freshness`
- `:client-approval-request`
- `:client-approval-request:evidence-link`
- `:client-approval-request:policy`
- `:client-approval-request:audit`

AAF repository semantic idempotency checks reject drift. The watermark is deterministic and excludes volatile timestamps.

## Boundaries

Client approval remains separate from:

- content approval;
- launch approval;
- publish activation approval;
- domain/DNS readiness or mutation;
- billing/subscription/hosting activation;
- runtime mutation;
- site version mutation;
- active pointer mutation;
- provider execution;
- AI execution or approval;
- Generated Proposal Bundles;
- preview/public rendering approval truth;
- Command Center or Ops Inbox derived state;
- client portal, public runtime routes, UI, API routes, server actions, or workers.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-aaf-bridge.test.ts`: 7 tests passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-aaf-bridge.integration.test.ts`: 1 disposable PostgreSQL test passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-service.test.ts`: 5 tests passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/client-approval-service.integration.test.ts`: 1 disposable PostgreSQL test passed.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`: 10 tests passed.
- Combined focused bundle: 24 tests passed.
- Focused TypeScript no-emit validation over changed MVP-33/service/read-model files passed.

Full platform `pnpm exec tsc --noEmit` was also run from `apps/platform`; it still fails on existing unrelated test typing issues outside the MVP-33 boundary. The run initially reported one MVP-33 integration-test nullability issue, which was fixed, and the focused no-emit check now passes.

## SQL And Disposable DB Validation

No migration was added.

The MVP-33 disposable PostgreSQL integration applied:

- AAF persistence core;
- AAF implementation authorization vocabulary;
- AAF `granted_with_limitations` vocabulary;
- AAF content approval vocabulary;
- AAF client/launch approval vocabulary from MVP-31;
- single-site state, clone review, proposal, execution, improved version review, content approval, and client approval persistence migrations.

The integration proved:

- client approval persistence migration applies;
- AAF evidence package rows are written;
- AAF approval request rows are written;
- no approval decision is written by request preparation;
- idempotent replay reuses package/request;
- idempotency drift fails;
- exact-scope `granted_with_limitations` decision validates;
- wrong-scope launch approval decision fails;
- rejected decision fails;
- service attaches only validated decision refs;
- limitations carry forward into approved-with-limitations client approval;
- read model projects request prepared and decision validated;
- no runtime artifact/version mutation flags are set;
- active pointer table is absent in the disposable DB and no active-pointer refs are created;
- no publish/domain/billing/provider refs are created.

Docker cleanup was verified by checking no disposable container remained after each integration test.

## Guardrails

Guardrail searches were run for forbidden runtime, site-version, active pointer, public runtime, provider, DNS, Vercel, Openprovider, Stripe, billing, domain, publish, rollback, AI, Generated Proposal Bundle, route, worker, UI, client portal, Command Center, and Ops Inbox changes.

No external providers were called. No production or staging Supabase was called.

## Issues Found

- MVP-32 service attachment accepted decision refs with no validation object. MVP-33 closes that by requiring successful bridge validation.
- The client approval read model lacked derived AAF request/decision validation state. MVP-33 adds it as non-enforcing projection.
- Full platform TypeScript no-emit remains blocked by unrelated existing test typing issues outside the allowed MVP-33 boundary.

## Residual Risks

- AAF validation proves exact AAF rows, linked refs, watermarks, freshness, revocation, supersession, status, scope, and evidence package state. It does not cryptographically prove every non-AAF source row still exists, matching existing AAF source-ref patterns.
- Repeated AAF request preparation may tolerate duplicate child subject refs in existing append-only AAF patterns. Validation requires the full exact role set and ignores harmless duplicates.

## Acceptance

MVP-33 is safe to accept.

Launch approval persistence/service core may begin next if it consumes validated client approval only as prerequisite truth and remains separate from publish activation, domain/DNS, billing, runtime, and UI/API surfaces.

Recommended next milestone: implement launch approval persistence/service core or launch approval AAF bridge as a separate exact-scope milestone for `single_site_launch_approval`.

No commit or push was performed.
