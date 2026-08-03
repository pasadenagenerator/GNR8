# GNR8 Single-Site Content Approval AAF Bridge Closeout

Phase: MVP-29
Scope: server-only, non-executing AAF bridge and evidence/decision validation core for `single_site_content_approval`

## Files Reviewed

- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-service.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-db-verification-closeout.md`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-service.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No SQL migration was added.

## Bridge Module

Location: `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`

APIs:

- `SingleSiteContentApprovalAafBridge.prepareContentApprovalRequest(input)`
- `SingleSiteContentApprovalAafBridge.validateContentApprovalDecisionRef(input)`
- `prepareContentApprovalRequest(input)`
- `validateContentApprovalDecisionRef(input)`
- `computeContentApprovalSemanticWatermark(input)`
- `buildExpectedContentApprovalRefs(input)`

The module imports `server-only`, uses the existing AAF writer repository, and does not call runtime, provider, billing, domain, DNS, publish, route, UI, API, worker, AI, Vercel, Openprovider, Stripe, Supabase production, or Supabase staging surfaces.

## Evidence Package Behavior

Preparation creates or reuses one AAF evidence package of type `single_site_content_approval_evidence`.

The evidence package includes deterministic source refs/items for:

- improved candidate rendered snapshot;
- improved candidate content snapshot;
- improved candidate metadata snapshot;
- recommendation coverage summary;
- selected recommendation application status;
- SEO/AEO metadata summary;
- headings/body copy/CTA/internal link review summary;
- accessibility/content caveats;
- structured data summary;
- legal/compliance notes;
- known limitations;
- unresolved/not-applied recommendations;
- operator review notes;
- audit timeline refs where supplied.

The semantic watermark excludes volatile timestamps and includes the exact tenant/client/site, migration, content approval, improved candidate, proposal, implementation authorization, execution, source, clone, evidence, limitations, operator-note, and policy-version inputs. Same semantic input plus the same idempotency key reuses the package; semantic drift under the same key fails through AAF idempotency conflict.

## AAF Request Behavior

Preparation creates or reuses an approval request with:

- exact scope `single_site_content_approval`;
- subject type `single_site_improved_version_review`;
- subject id equal to the improved version review ref;
- status `requested`;
- action key `approve_single_site_content` in the policy evaluation;
- replay class `not_replayable` on the request audit event;
- linked evidence package;
- complete exact subject refs for tenant, client, site, migration, content approval, improved review, improved candidate refs, proposal approval, implementation authorization, execution attempt, selected recommendations, source evidence, clone review, clone version/artifact, and limitations.

Preparation does not create an AAF approval decision.

## Decision Validation Behavior

Validation is read-only and fails closed unless:

- the AAF decision exists;
- the linked request exists;
- the request scope is exactly `single_site_content_approval`;
- tenant/client/site are exact and no unrelated batch/job/site-version/domain/cost-center scope is present;
- subject type/id match the improved version review ref;
- request and decision policy versions match;
- decision status is `granted` or `granted_with_limitations`;
- the linked evidence package exists, uses `single_site_content_approval_evidence`, matches subject/scope, is not invalid/superseded, and carries the expected semantic watermark;
- freshness, revocation, supersession, expiration, subject refs, evidence refs, and request-evidence link checks pass.

Rejected, revoked, expired, superseded, cancelled, wrong-scope, stale, mismatched, missing, and prohibited substitution decisions fail closed. `granted_with_limitations` is valid only when carried limitations are present.

## Service Integration

`ContentApprovalService` now rejects raw AAF decision attachment. `attachAafDecisionRef`, `approve`, and `approveWithLimitations` require a successful MVP-29 bridge validation result matching the supplied decision id, exact scope, exact subject type, and allowed decision status.

`approve` accepts only validated `granted` decisions.

`approveWithLimitations` accepts only validated `granted_with_limitations` decisions and carries validation limitations forward into the content approval row and event.

AAF request refs can still be attached after bridge preparation. Content approval creation now rejects pre-seeded AAF decision refs so decision truth must pass through the validated attachment path.

## Read Model

The read model remains derived-only and non-enforcing. It now exposes:

- request prepared;
- decision missing;
- decision ref attached;
- decision validated;
- decision invalid by stored AAF shape;
- approved-with-limitations;
- limitations carried forward.

## Boundaries

Content approval remains separate from:

- content editing;
- client approval;
- launch approval;
- publish activation approval;
- publish;
- rollback;
- runtime mutation;
- site version mutation;
- active pointer mutation;
- domain/DNS readiness or mutation;
- billing/subscription/hosting activation;
- AI/provider authorization;
- Generated Proposal Bundles;
- Command Center, Ops Inbox, client portal, public runtime, UI, API routes, server actions, or workers.

Preview rendering and public runtime rendering may be cited only as evidence refs where appropriate. They are never approval truth.

## Validation Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/content-approval-aaf-bridge.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/content-approval-aaf-bridge.test.ts apps/platform/gnr8/single-site/content-approval-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/content-approval-aaf-bridge.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- focused TypeScript no-emit validation for changed files

The first un-escalated `tsx` run was blocked by local IPC pipe sandbox permissions. The same focused unit test passed after rerunning with local test-runner permission.

## SQL And Disposable DB Validation

No migration was added.

The MVP-29 disposable PostgreSQL integration test applied:

- AAF persistence core;
- AAF implementation authorization vocabulary;
- AAF `granted_with_limitations` vocabulary;
- AAF content approval vocabulary;
- single-site state, clone review, proposal, execution, improved version review, and content approval persistence migrations.

The integration proved:

- evidence package rows are written;
- approval request rows are written;
- no approval decision is written by preparation;
- idempotent replay reuses package/request;
- idempotency drift fails;
- exact-scope granted and granted-with-limitations decisions validate;
- wrong-scope and rejected decisions fail;
- service attaches only validated decision refs;
- read-model projection shows request prepared and decision validated;
- runtime/provider/active-pointer tables are absent in the disposable DB.

Docker cleanup was verified by checking no disposable container remained after each integration test.

## Guardrails

Guardrail searches were run for forbidden runtime, publish, provider, domain, DNS, billing, route, UI, worker, AI, Generated Proposal Bundle, active pointer, rollback, client portal, Command Center, and Ops Inbox changes.

No external providers were called. No production or staging Supabase was called.

## Issues Found

- MVP-28 allowed raw AAF decision refs to be attached by shape only. MVP-29 closes that gap by requiring bridge validation.
- The read model previously could not distinguish request prepared vs decision validated/missing. It now derives that distinction.

## Residual Risks

- AAF decision validation relies on the current AAF persistence model. It can validate exact request/evidence refs, freshness rows, revocation rows, and supersession rows, but it does not cryptographically prove every external source system row still exists because many refs intentionally point at append-only logical records outside AAF.
- Child subject refs are append-only and may duplicate on repeated request transactions in existing AAF patterns. Validation tolerates duplicates and requires the complete exact role set.

## Acceptance

MVP-29 is safe to accept.

Client/launch approval architecture may begin next, but it must remain separate from content approval and must not treat content approval as launch, publish, domain, billing, or runtime authorization.

Recommended next milestone: design and implement the client/launch approval architecture as an exact-scope AAF bridge/gate that consumes validated content approval readiness without collapsing boundaries.

No commit or push was performed.
