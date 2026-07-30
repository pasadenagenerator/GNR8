# GNR8 Single-Site Implementation Authorization Bridge Closeout

Phase: MVP-18
Scope: Server-only, non-executing bridge from approved single-site improvement proposal planning to AAF implementation authorization request/validation

## Files Reviewed

- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`
- `docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`
- `docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`
- `docs/product/gnr8-single-site-implementation-authorization-aaf-contracts-closeout.md`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`

## Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-implementation-authorization-bridge-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## Bridge Module

Location: `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`

API:

- `SingleSiteImplementationAuthorizationBridge.prepareImplementationAuthorizationRequest(input)`
- `SingleSiteImplementationAuthorizationBridge.validateImplementationAuthorizationRef(input)`
- convenience exports `prepareImplementationAuthorizationRequest(input)` and `validateImplementationAuthorizationRef(input)`

The module imports `server-only`, hardcodes exact MVP-17 constants, and does not expose UI, API, route, server action, worker, provider, runtime, billing, publish, domain, DNS, Command Center, Ops Inbox, or client portal behavior.

## Evidence Package Behavior

The bridge creates or reuses an AAF evidence package with type `single_site_improvement_implementation_authorization_evidence`.

The package includes canonical refs for:

- proposal plan snapshot;
- proposal approval request, decision, and evidence refs;
- clone review acceptance;
- clone site version;
- runtime artifact ref as evidence only;
- source evidence review acceptance;
- selected recommendations;
- risk/impact/effort summary;
- implementation scope summary;
- non-goals;
- limitations;
- operator notes;
- optional advisory AI/provider refs as evidence only;
- optional audit timeline refs.

Evidence package idempotency uses the AAF writer idempotency key plus deterministic semantic content hash/watermark. Volatile timestamps are not part of the bridge semantic watermark. Evidence source refs are role-qualified to avoid AAF source-ref uniqueness collisions when multiple evidence roles cite the same canonical proposal/source record.

## AAF Request Behavior

The bridge creates or reuses an AAF approval request with exact scope `single_site_improvement_implementation_authorization`, subject type `single_site_improvement_proposal_plan`, subject id equal to the proposal plan id, and action `start_single_site_improvement_implementation`.

The request is human, non-replayable, status `requested`, linked to the evidence package, and accompanied by a policy evaluation/audit request record. It does not create an approval decision.

## Validation Behavior

The validator is read-only against AAF tables. It checks:

- decision exists;
- request exists;
- request scope is exactly `single_site_improvement_implementation_authorization`;
- tenant/client/site scope matches exactly and unrelated tenant-scope dimensions are null;
- subject type/id match the proposal plan;
- policy version matches;
- decision status is `granted` or `granted_with_limitations`;
- rejected, revoked, expired, superseded, cancelled, missing, wrong-scope, and wrong-subject refs fail closed;
- decision and request evidence package refs match when supplied;
- evidence package exists, has exact type/scope/subject, is not invalid/superseded/expired, and has matching semantic watermark;
- freshness check is fresh and watermark-matched when present;
- required request subject refs exist;
- required evidence source refs exist;
- approval request is linked to the evidence package.

## Proposal Service Integration

`ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)` now requires a successful bridge validation result for decision refs. It fails closed for unvalidated refs, wrong AAF scope, wrong subject, mismatched decision id, non-granted validation status, proposal plans that are not approved/approved-with-limitations, or attempt to treat an AAF request ref as implementation readiness.

The service stores validated AAF request/decision/evidence refs and limitations in `implementation_authorization_refs_json`, keeps implementation authorization separate from proposal approval, and does not mutate runtime state.

## Read Model Projection

`single-site-state-read-model.ts` now projects a derived `implementationAuthorizationStatus`:

- `not_required_yet`
- `required`
- `requested`
- `granted`
- `granted_with_limitations`
- `invalid`
- `stale`
- `missing`

The read model remains derived-only and non-enforcing.

## Exact-Scope And Substitution Behavior

Wrong AAF scopes cannot satisfy implementation authorization. Proposal approval, content approval, client review, launch signoff, publish activation, AI advisory approval, Command Center state, Ops Inbox state, generated proposal bundles, domain readiness, billing, DNS, rollback, and provider output cannot be substituted for exact implementation authorization.

## Granted With Limitations

The bridge validator preserves `granted_with_limitations` when the AAF row model can represent it and returns carried limitations from the evidence package. Current persisted AAF SQL/contract status vocabulary does not yet include `granted_with_limitations`; disposable PostgreSQL validation therefore proves persisted `granted` decisions and documents this as residual model work before persisted limited grants can be first-class.

## Implementation Boundary

No improvement execution was implemented. No runtime artifact, site version, active pointer, improved runtime version, content edit, publish, rollback, billing, hosting, domain/DNS, Vercel, Openprovider, Stripe, AI/provider call, Generated Proposal Bundle, UI, API route, server action, worker, Command Center action, Ops Inbox action, client portal route, or public runtime route was added or changed.

## Validation Summary

Passed:

- MVP-18 bridge unit tests.
- MVP-18 disposable PostgreSQL integration test.
- MVP-15 proposal planning unit and integration tests touched by the service hardening.
- MVP-7 read-model focused tests touched by the derived status projection.
- MVP-17 AAF contract tests.
- AAF writer and policy/gate focused tests.
- Focused TypeScript no-emit validation for changed bridge/proposal/read-model files.
- Disposable DB migration application for AAF core, MVP-17 AAF scope migration, and single-site state/clone/proposal migrations.
- `git diff --check`.
- trailing whitespace check on changed/new files.
- guardrail search for forbidden runtime/provider/publish/domain/billing/route/UI side effects.
- guardrail search confirming no approval decision creation helper is called by the bridge request-preparation module.
- guardrail search confirming wrong scopes are explicitly rejected.
- Docker cleanup check for disposable PostgreSQL containers.

No SQL migration was added in MVP-18.

## External Provider Non-Call Confirmation

No production or staging Supabase instance was called. No AI provider, DNS provider, registrar, Vercel, Openprovider, Stripe, billing, hosting, domain, publish, rollback, runtime mutation, or provider execution service was called. Docker was used only for disposable local PostgreSQL validation.

## Issues Found

- Existing proposal planning could attach raw implementation authorization refs; MVP-18 hardened this path to require bridge validation for decision refs.
- AAF source-ref uniqueness required role-qualified bridge evidence source watermarks for evidence roles that cite the same canonical source record.
- Current AAF persisted status vocabulary does not yet support `granted_with_limitations`, so persisted limited grants remain a future tiny AAF vocabulary/migration decision.

## Residual Risks

- Future implementation execution must revalidate AAF immediately before mutation; MVP-18 does not add an executor.
- Persisted `granted_with_limitations` needs an AAF status vocabulary migration before database-backed limited grants can be recorded directly.
- The bridge validates the AAF rows it creates/consumes but is not exposed through UI/API/operator surfaces yet.

## Acceptance

MVP-18 is safe to accept as a non-executing bridge core.

Improvement execution architecture may begin next only as a separate milestone and must remain AAF-gated at execution time.

Recommended next milestone: MVP-19 single-site improvement execution architecture/readiness design, with no runtime mutation until execution-time AAF validation and content/runtime boundaries are explicitly approved.

## Git Status Summary

Modified:

- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Untracked:

- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `docs/product/gnr8-single-site-implementation-authorization-bridge-closeout.md`

No commit or push was performed.

## Commands Run

- `pnpm exec tsc --noEmit --module esnext --moduleResolution bundler --target ES2022 --strict --skipLibCheck --types node --baseUrl apps/platform ...`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- final combined focused test bundle covering 61 subtests.
- `git diff --check`
- `rg -n "\\s$" ...`
- guardrail `rg` searches for approval-decision creation, wrong-scope rejection, and forbidden side-effect terms.
- `docker ps -a --filter name=gnr8-implementation-auth --filter name=gnr8-single-site-proposal --format '{{.Names}} {{.Status}}'`
- `git status --short`
