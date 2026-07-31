# GNR8 Single-Site Improvement Execution Persistence Boundary Closeout

Phase: MVP-21
Scope: Canonical persistence and server-only boundary core for single-site improvement execution attempts, without runtime mutation.

MVP-21 implemented durable improvement execution attempt persistence, contracts, service core, focused tests, read-model projection, and transition guard hardening. It did not implement a real improved candidate executor, create improved runtime versions, mutate runtime artifacts/site versions, switch active pointers, publish, edit content, call AI or external providers, create Generated Proposal Bundles, create authorization requests or approval decisions, expose UI/API/routes/server actions/workers/client portal surfaces, or perform billing/domain/DNS behavior.

## Files Reviewed

- MVP-19 execution architecture/readiness docs: `docs/architecture/gnr8-single-site-improvement-execution-architecture.md`, `docs/architecture/gnr8-single-site-existing-capability-reuse-map.md`, `docs/architecture/gnr8-single-site-improvement-execution-source-of-truth.md`, `docs/architecture/gnr8-single-site-improvement-execution-transition-contract.md`, `docs/architecture/gnr8-single-site-improvement-execution-aaf-revalidation-contract.md`, `docs/product/gnr8-single-site-improvement-execution-operator-workflow.md`, `docs/product/gnr8-single-site-improvement-execution-readiness-closeout.md`
- MVP-20 validator: `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`, unit/integration tests, closeout
- MVP-20A limited-grant closeout and migration: `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- MVP-15 proposal planning service, migration, tests, closeout
- MVP-18 implementation authorization bridge, tests, closeout
- Single-site state contracts, writer repository, transition service, read model, read repository, and affected tests

## Files Created Or Updated

Created:
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`

Updated:
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## SQL Migration

Migration name: `20260731120000_single_site_improvement_execution_core.sql`

Tables created:
- `gnr8_single_site_improvement_execution_attempts`
- `gnr8_single_site_improvement_execution_refs`
- `gnr8_single_site_improvement_execution_items`
- `gnr8_single_site_improvement_execution_events`

The migration is additive, enables RLS on all new tables, adds no broad grants or policies, creates append-only triggers for execution refs/events, adds idempotency uniqueness, semantic ref uniqueness, JSONB shape checks, status/mode/item/ref/action vocabulary checks, durable source refs, privacy labels, and retention classes. It also extends the existing single-site migration ref-role check with `implementation_execution_attempt` so coarse state events can cite the new attempt header.

## Contracts And Service

Contracts location: `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`

Service location: `apps/platform/gnr8/single-site/improvement-execution-service.ts`

Status vocabulary: `draft`, `blocked`, `ready`, `started`, `completed`, `completed_with_limitations`, `failed`, `retry_required`, `superseded`, `cancelled`.

Mode vocabulary: `dry_run`, `execute`, `replay`, `repair`.

Item vocabulary: `selected_recommendation`, `limitation`, `input_ref`, `output_ref`, `validation_ref`, `warning`, `error`, `manual_note`.

The future executor interface requires a successful MVP-20 execution-time AAF validation contract before any future executor can run. The service does not call that executor and has no method that mutates runtime output.

## Dependencies And Boundaries

- Proposal dependency: execution attempt creation requires an `approved` or `approved_with_limitations` proposal plan.
- Implementation authorization dependency: creation requires an attached implementation authorization decision ref.
- Execution-time AAF dependency: `started` requires an allowed MVP-20 execution-time validation result; stale, invalid, rejected, revoked, superseded, cancelled, missing, or blocked validation cannot start.
- Selected recommendation dependency: creation and start require selected recommendation refs that belong to the proposal plan.
- Limitation carry-forward: proposal limitations, proposal approval limitations, implementation authorization limitations, and execution-time validation limitations are preserved on the attempt.
- Runtime mutation boundary: completed attempts can record nullable future refs or explicit future-boundary fixture output, but no runtime artifacts/site versions or active pointers are created or mutated.
- Content/client/launch/publish boundary: completion explicitly does not grant content approval, client approval, launch approval, or publish activation approval.

## Read Model Projection

`single-site-state-read-model.ts` now projects `improvementExecution` with latest attempt id, status, mode, implementation authorization validation summary, selected recommendation count, carried limitations, nullable improved candidate refs, output refs, readiness flags, ref summaries, and execution next action.

Next actions added: `prepare_improvement_execution`, `request_or_fix_implementation_authorization`, `resolve_execution_authorization_blocker`, `start_improvement_execution`, `monitor_improvement_execution`, `review_improved_version`, `review_improved_version_with_limitations`, `retry_or_repair_improvement_execution`, `retry_improvement_execution`, `review_latest_execution_attempt`.

Projection remains `derivedOnly: true`, `mutatesSourceTruth: false`, and `nonEnforcing: true`.

## Validation Results

Passed:
- MVP-21 unit tests: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- MVP-21 disposable PostgreSQL integration: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- MVP-20 validator unit/integration: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- MVP-20A contract/writer unit confidence: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- Affected transition unit test: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- Affected read-model unit/integration tests
- Focused TypeScript no-emit validation for changed single-site files

Disposable DB validation proved migration application, RLS enabled, refs/events append-only, ready attempt creation after approved proposal plus valid MVP-20 validation, invalid validation blocks readiness/start, recommendation refs persist, limitations persist, start/fail/retry/complete transitions persist, read model projects execution state, and no forbidden coarse refs for improved runtime, active pointer, generated proposal bundle, publish/domain/billing/provider side effects were created.

## Issues Found

- The first migration draft used `jsonb_object_length`; disposable PostgreSQL rejected it, so the completion-output constraint now uses `output_refs_json <> '{}'::jsonb`.
- The execution coarse migration ref role needed a narrow SQL vocabulary extension.
- `markReady` initially overwrote carried-forward limitations with validation-only limitations; it now preserves proposal, authorization, and validation limitations together.

## Residual Risks

- MVP-21 records future candidate refs but does not validate a real future adapter output because no adapter exists yet.
- The service currently trusts the caller-supplied MVP-20 validation result object; future executor integration should call the validator immediately before mutation inside the executor orchestration path.
- Coarse migration states still have only `improvement_implementation_started` and `improvement_implementation_completed`; fine-grained truth is intentionally held by the execution tables.

## Acceptance

MVP-21 is safe to accept as the persistence and server-only boundary core for single-site improvement execution attempts.

Improved candidate adapter design may begin next. Improved candidate adapter implementation may begin only as a separate milestone that still calls MVP-20 execution-time AAF validation immediately before any runtime mutation.

Recommended next milestone: MVP-22 improved candidate adapter design and dry-run fixture contract, still without production publish/active-pointer/content approval behavior.

## External Provider And Runtime Impact

No production Supabase, staging Supabase, AI provider, DNS provider, registrar, Vercel, Openprovider, Stripe, billing, hosting, domain, publish, rollback, runtime provider, or external provider was called. Docker was used only for disposable local PostgreSQL validation.

Runtime/public behavior impact: none. No routes, workers, UI, public runtime, client portal, Command Center, Ops Inbox, provider, billing, domain/DNS, publish, rollback, content, runtime artifact, runtime site version, active pointer, or Generated Proposal Bundle behavior was added or changed.

No commit or push was performed.
