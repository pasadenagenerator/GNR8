# GNR8 Single-Site Clone Start Orchestrator Closeout

Date: 2026-07-29
Phase: MVP-11 single-site clone-start orchestrator core
Scope: Server-only orchestration core, injected clone executor contract, focused tests, disposable DB integration validation, and documentation index update.

MVP-11 did not create UI, API routes, Command Center wiring, Ops Inbox wiring, proposal integration, billing/domain/publish integration, clone fidelity improvements, SQL migrations, external provider calls, or real clone executor wiring.

## 1. Files Reviewed

- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `docs/architecture/gnr8-single-site-clone-start-boundary-design.md`
- `docs/architecture/gnr8-single-site-clone-gate-runtime-integration-contract.md`
- `docs/product/gnr8-single-site-clone-start-operator-workflow.md`
- `docs/product/gnr8-single-site-clone-start-boundary-closeout.md`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- MVP-6 unit and disposable DB integration test patterns under `apps/platform/gnr8/single-site/`

## 2. Files Created/Updated

Created:

- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`

Updated:

- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Orchestrator Location

`apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`

Main entry point:

`startSingleSiteCloneGeneration(input, dependencies)`

## 4. Executor Interface Summary

`SingleSiteCloneExecutor` is a dependency-injected interface with one method:

`execute(input: SingleSiteCloneExecutorInput): Promise<SingleSiteCloneExecutorResult>`

The executor input carries migration id, client id, site id, source evidence review id, accepted-with-limitations flag, limitations, actor/correlation/request/idempotency context, deterministic child idempotency keys, optional target refs, source evidence package ref, watermarks, payload hash, and sanitized metadata.

The executor result can return completed/failed status, clone site version ref, runtime artifact ref, raw template artifact ref, preview ref, source/evidence refs, warnings, limitations, and watermarks. MVP-11 does not implement a real executor.

## 5. Input Contract

Required for execution:

- `migrationId`
- `clientId`
- `siteId`
- `mode: "dry_run" | "execute"`
- `actor.actorType`
- `actor.actorId`
- `actor.actorRole`
- `correlationId`
- `idempotencyKey`

Optional:

- `sourceEvidenceReviewId`
- `sourceEvidencePackageRef`
- `sourceWatermark`
- `payloadHash`
- `aafApprovalDecisionId`
- `targetRefs`
- `requestId`
- `causationId`
- `metadataJson`

`migrationId` is never inferred from site id, client id, source URL, runtime site id, or runtime version ids.

## 6. Gate-Before-Executor Behavior

The orchestrator reads the single-site read model, calls MVP-9 `evaluateCloneGenerationGate(...)`, validates client/site/review identity, and only then performs any execute-mode transition or executor call.

Unit tests prove ordering: read model, gate, `clone_generation_started`, executor.

## 7. Dry-Run Behavior

Dry-run evaluates identity and the MVP-9 gate only.

It records no MVP-6 state transitions, calls no executor, creates no clone refs, returns `mutatesSourceTruth: false`, and sets `executorCalled: false`.

## 8. Execute Behavior

Execute mode:

- fails closed when required identity/idempotency/executor inputs are missing;
- blocks when the MVP-9 gate blocks;
- records `clone_generation_started` through `SingleSiteStateTransitionService`;
- calls only the injected executor after the start transition;
- records `clone_generation_completed` on executor success;
- records `clone_review_required` after completion;
- records no publish/domain/billing/proposal behavior.

## 9. Accepted-With-Limitations Behavior

Accepted-with-limitations is allowed with warning mode.

The orchestrator preserves limitations in the result, returns a warning, writes limitation/gate context into transition metadata, carries the source evidence review id, and passes the existing AAF approval decision id from the read model into the start transition when available.

## 10. State Transitions Recorded

Supported execute success path:

- `source_evidence_review_required -> clone_generation_started`
- `clone_generation_started -> clone_generation_completed`
- `clone_generation_completed -> clone_review_required`

Supported executor failure path after start:

- `clone_generation_started -> migration_failed`

All state transitions use `SingleSiteStateTransitionService`.

## 11. Failure Behavior

Blocked gate/identity failures return structured blocked or failed-closed results without mutation.

Executor failure after `clone_generation_started` is recorded as `migration_failed` through MVP-6. MVP-6 currently treats `migration_failed` as terminal, so automatic clone retry from that state remains out of scope.

No blocker row is directly written by MVP-11; the supported MVP-6 vocabulary used here is the failure state transition.

## 12. Idempotency Behavior

The orchestrator requires a parent `idempotencyKey` and derives deterministic child keys for:

- gate evaluation context;
- `clone_generation_started`;
- executor call;
- `clone_generation_completed`;
- `clone_review_required`;
- `migration_failed`.

MVP-6 transition service idempotency is used for state events. MVP-11 also tightened transition replay so an existing state event cannot rewind current migration state and now fails clearly on semantic drift for key transition fields.

If a retry sees the migration already at `clone_review_required`, the orchestrator returns `idempotent_replay` and performs no executor call or state write.

## 13. Dependency Injection Boundary

Runtime clone behavior is fully dependency-injected through `SingleSiteCloneExecutor`.

The orchestrator imports MVP-9 gate/read model services and MVP-6 transition service only. It does not import generic runtime artifact/site version primitives.

## 14. Runtime/Generic Clone Preservation

No generic runtime, import, proposal, site action, worker, publish, billing, domain/DNS, provider, AI, storage, auth, public runtime, or client portal code was modified.

Generic runtime clone primitives are preserved for future wiring behind the injected executor boundary.

## 15. Non-Integration Boundaries

MVP-11 did not add:

- API routes;
- UI;
- Command Center or Ops Inbox wiring;
- proposal generation/import;
- content editing;
- billing/Stripe behavior;
- domain/DNS behavior;
- publish or rollback behavior;
- SQL migrations;
- external provider calls;
- real clone fidelity generation.

## 16. Unit Test Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`

Result: 12 tests passed.

Coverage includes missing migration id, missing idempotency key, dry-run allowed/blocked no-write behavior, execute blocked by missing evidence, gate-before-transition/executor ordering, accepted-with-limitations warnings/limitations, success transitions, executor failure to `migration_failed`, idempotent replay without duplicate transitions, dependency-injected executor requirement, and no forbidden runtime/publish/billing/domain/proposal imports.

## 17. Integration Test Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`

Result: 1 disposable local PostgreSQL test passed.

The integration test used local Docker `postgres:15` with `--pull=never`, applied only `20260729120000_single_site_state_evidence_spine.sql`, created migrations/reviews through MVP-6 writer/review services, executed dry-run/blocked/accepted/accepted-with-limitations/failure/retry paths, confirmed clone states were written only when allowed, confirmed failed executor did not create completed state, confirmed runtime/proposal tables were absent, confirmed non-single-site public table row counts were unchanged, and stopped the container.

MVP-9 baseline also passed:

- MVP-9 gate unit tests: 18 passed.
- MVP-9 gate disposable DB integration test: 1 passed.

MVP-6 transition service focused unit test also passed after the idempotency replay hardening:

- MVP-6 transition service unit tests: 3 passed.

## 18. Type/Static Validation Results

Passed:

- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `git diff --check`
- trailing whitespace scan over changed/new MVP-11 files and canonical index

## 19. Guardrail Results

Passed guardrails confirmed:

- no SQL migrations were created or changed;
- no API routes, UI files, workers, public runtime, generic runtime, site, site-action, billing, domain, publish, rollback, proposal, Command Center, or Ops Inbox files were modified;
- no direct SQL writes were added by the orchestrator;
- no generic runtime artifact/site version primitives are imported or called;
- no provider, DNS, Vercel, Openprovider, Stripe, AI, publish, rollback, proposal, billing, or domain imports/calls were added;
- no production/staging/remote Supabase or external providers were called;
- Docker cleanup check found no running `gnr8-single-site` disposable containers.

Expected static-search false positives:

- required result field `publishActionPerformed: false`;
- unit test text asserting no publish/domain/billing/proposal calls;
- integration test query checking tables not like `gnr8_single_site_%`.

## 20. Issues Found

- MVP-6 transition replay previously could update the migration current state back to an old idempotent transition target. MVP-11 fixed this in `SingleSiteStateTransitionService` by returning reused transition results without rewinding current state.
- MVP-6 transition replay previously checked only migration id and target state. MVP-11 added semantic drift checks for existing transition event idempotency keys.
- The first sandboxed `tsx` command failed on local IPC pipe creation; reruns with the existing unsandboxed local validation pattern passed.

## 21. Residual Risks

- A real clone executor is not wired.
- Clone fidelity is not improved.
- `migration_failed` is terminal under the current MVP-6 graph; clone retry after executor failure requires a later state-machine milestone.
- Idempotent replay after `clone_review_required` is safe and non-mutating, but the current read model does not expose detailed prior clone refs back to the orchestrator, so replay does not reconstruct previous output refs.
- Accepted-with-limitations depends on the existing source evidence review carrying the AAF approval decision required by MVP-6.

## 22. Whether MVP-11 Is Safe To Accept

Yes. MVP-11 is safe to accept as a server-only clone-start orchestration core.

## 23. Whether Real Clone Executor Wiring May Begin

Yes, real clone executor wiring may begin in the next milestone, but only behind the injected `SingleSiteCloneExecutor` interface and without modifying generic runtime primitives directly unless a clone-only adapter is proven safe.

## 24. Recommended Next Milestone

MVP-12: implement a real clone executor adapter behind `SingleSiteCloneExecutor`, prove it is idempotent with stable target refs, and preserve the MVP-11 gate-before-executor and MVP-6-only state transition boundary.

## 25. Git Status Summary

MVP-11 changes:

- modified `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- created `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- created `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- created `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- created `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Pre-existing MVP-10 workspace changes were present before MVP-11 implementation:

- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- untracked `docs/architecture/gnr8-single-site-clone-gate-runtime-integration-contract.md`
- untracked `docs/architecture/gnr8-single-site-clone-start-boundary-design.md`
- untracked `docs/product/gnr8-single-site-clone-start-boundary-closeout.md`
- untracked `docs/product/gnr8-single-site-clone-start-operator-workflow.md`

No commit or push was performed.

## 26. Commands Run

- `pwd`
- `git status --short`
- `rg --files apps/platform/gnr8/single-site docs/product docs/architecture docs/ai`
- `sed -n ...` over MVP-9 gate/tests/closeout, MVP-10 design docs, MVP-6 transition/writer/review/read services, and canonical index
- `rg -n ...` over transition, repository, test, Docker, and guardrail patterns
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `TMPDIR=/private/tmp NODE_OPTIONS='--conditions=react-server' pnpm exec tsc --noEmit --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node ...MVP-11 files...`
- `git diff --check`
- `git ls-files --others --exclude-standard`
- `git diff --name-only -- apps/platform/supabase/migrations supabase db ...`
- `git status --short apps/platform/supabase/migrations supabase db apps/platform/app apps/worker ...`
- `rg -n "\\s$" ...MVP-11 files...`
- `rg` guardrails for forbidden imports/calls and direct SQL writes
- `docker ps --filter name=gnr8-single-site --format '{{.Names}} {{.Status}}'`

## 27. Explicit Confirmation Of Runtime Behavior Impact

MVP-11 has no public runtime behavior impact.

It adds a server-only orchestrator core that can mutate only single-site migration state through MVP-6 when called in execute mode with an injected executor. No real executor is wired, no generic runtime generation is modified, no API/UI entry point invokes the orchestrator, and no publish/domain/billing/proposal/provider behavior is reachable from this phase.
