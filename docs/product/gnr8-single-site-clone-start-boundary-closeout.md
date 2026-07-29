# GNR8 Single-Site Clone Start Boundary Closeout

Date: 2026-07-29
Phase: MVP-10 single-site clone start boundary design
Scope: Documentation-only boundary design, integration contract, operator workflow, closeout, canonical index update, and validation.

MVP-10 made no runtime behavior changes.

## 1. Files Reviewed

- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/migration-factory.ts`
- `apps/platform/app/api/gnr8/runtime/migrate/url/route.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- `apps/platform/gnr8/site-actions/site-action-service.ts`
- `apps/platform/app/api/gnr8/site-actions/route.ts`
- `apps/platform/app/api/gnr8/ai/migration-run/route.ts`
- `apps/platform/gnr8/architecture/website-generation-package-builder.ts`
- `apps/platform/gnr8/architecture/provider-generation-payload-v2-builder.ts`
- `apps/platform/gnr8/architecture/generated-website-proposal-import.ts`
- `apps/worker/gnr8/inngest/functions.ts`
- `apps/worker/gnr8/site/site-template-runtime-bootstrap-service.ts`
- `apps/worker/gnr8/template-intake/core/template-upload-import-runner.ts`
- relevant tests listed by repository search for runtime store, scoped import pipeline, site action service, proposal builders/importers, provider payload builders, migration factory, and worker bootstrap.

## 2. Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-clone-start-boundary-design.md`
- `docs/architecture/gnr8-single-site-clone-gate-runtime-integration-contract.md`
- `docs/product/gnr8-single-site-clone-start-operator-workflow.md`
- `docs/product/gnr8-single-site-clone-start-boundary-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Candidate Clone Boundaries Inspected

- Generic runtime site version creation: not safe; no `migrationId`, source evidence review, or single-site lifecycle ownership.
- Generic runtime artifact creation: not safe; too late and too generic.
- Raw imported site artifact persistence: not safe; capture/import artifact path.
- Legacy migration factory and URL migrate route: not safe; URL/page-driven draft creation without `migrationId`.
- Client-scoped site import route: not safe for clone start; correct capture boundary, not clone boundary.
- Scoped import pipeline: not safe; creates runtime output for import/template paths and lacks accepted review state.
- Site actions route/service: not safe; broad operational action surface without `migrationId`.
- AI migration route: not safe; legacy AI/page-storage path, outside scope.
- Website generation package/provider payload/proposal import builders: not safe; proposal-only or pure artifacts, no runtime clone start.
- Worker template bootstrap: not safe; template runtime bootstrap, not single-site clone lifecycle.
- Worker Inngest registry: not safe; dispatch only.

## 4. Recommended Boundary

Create a new server-only single-site clone-start orchestrator in a future MVP:

`apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`

Recommended function:

`startSingleSiteCloneGeneration(...)`

It should require `migrationId`, call the MVP-9 gate in blocking mode, write state through MVP-6, and wrap existing clone/runtime generation primitives only after the gate allows.

## 5. Whether Existing Boundary Is Safe

No existing boundary is safe for direct MVP-9 blocking integration.

The repository has runtime generation primitives and import/generation-adjacent routes, but none is both narrow and single-site lifecycle-owned with a required `migrationId`.

## 6. Whether New Orchestrator Is Recommended

Yes. A new server-only orchestrator is recommended.

The orchestrator should live in `apps/platform/gnr8/single-site/` beside the MVP-6, MVP-7, MVP-8, and MVP-9 single-site services.

## 7. Required Input Contract

Required inputs:

- `migrationId`
- `clientId`
- `siteId`
- `actor`
- `correlationId`
- `idempotencyKey`
- `requestedMode`

Optional inputs:

- `sourceEvidenceReviewId`
- intended clone runtime site id
- intended clone site version id
- intended artifact id
- source evidence package ref
- source watermark
- request and causation ids
- sanitized metadata

`migrationId` is required and must be validated against the MVP-7 read model. It must not be inferred from site id, client id, source URL, runtime site id, or latest runtime version.

## 8. Gate Integration Behavior

The future orchestrator must call `evaluateCloneGenerationGate({ migrationId })` before any clone/runtime generation call.

The MVP-9 gate must block clone start unless evidence is `accepted` or `accepted_with_limitations`.

Blocked gate results must prevent:

- runtime site version creation;
- runtime artifact creation;
- raw clone artifact persistence;
- proposal generation;
- clone state transitions;
- provider or AI execution.

## 9. State Transition Behavior

State writes must use `SingleSiteStateTransitionService`.

Start transition:

- `source_evidence_review_required -> clone_generation_started`
- carries source evidence review and package refs
- carries AAF decision ref for accepted-with-limitations when required

Completion transition:

- `clone_generation_started -> clone_generation_completed`
- carries clone runtime refs, including runtime site version and runtime artifact refs

Failure transition:

- after start, clone primitive failure transitions to `migration_failed` under the current MVP-6 graph
- before start, failures should not write direct state changes outside valid MVP-6 transitions

## 10. Accepted-With-Limitations Behavior

Accepted-with-limitations is allowed with warning mode.

The future orchestrator must preserve:

- warning mode;
- limitation details;
- source evidence review id;
- AAF degraded evidence approval decision ref required by MVP-6;
- limitation context in transition metadata and caller result.

Accepted-with-limitations must not be flattened into clean acceptance.

## 11. Failure And Retry Behavior

Gate-level blocked states return structured blocked results without mutation.

Dry-run mode never writes or generates.

Generation failure after `clone_generation_started` records failure through MVP-6. The current MVP-6 state machine treats `migration_failed` as terminal, so automatic retry from that state is not part of MVP-11 unless a later state-machine milestone explicitly changes it.

Source evidence retry remains a review/capture action: `retry_required`, `rejected`, missing, and superseded reviews block clone start.

## 12. Existing Clone Generation Preservation

Existing generic runtime generation paths must be preserved.

Do not modify directly:

- runtime store primitives;
- scoped import pipeline;
- legacy URL migration route;
- client-scoped import route;
- site actions;
- proposal builders/importers;
- worker template bootstrap;
- public runtime serving;
- publish, rollback, billing, domain/DNS, providers, or AI routes.

The orchestrator should call an existing clone/runtime primitive only after the gate allows and should use dependency injection in tests to prove blocked results do not call generation.

## 13. Test Requirements

MVP-11 should add focused tests for:

- required `migrationId`;
- identity mismatch;
- read-model unavailable;
- missing migration;
- all MVP-9 blocked review states;
- accepted review execution;
- accepted-with-limitations warning execution;
- dry-run allowed and dry-run blocked with no writes;
- gate-blocked path with no generation call;
- start and completion transitions through MVP-6;
- failure after start through MVP-6;
- idempotency replay and idempotency conflict;
- preservation of generic runtime/import/proposal/site-action/template paths.

## 14. Architecture Risks Found

- Current runtime primitives do not carry `migrationId`.
- Current import pipeline can create runtime site versions/artifacts before source evidence review is accepted; it is capture/import output, not clone generation.
- Site actions can generate redesign variants from runtime versions without single-site evidence context.
- Existing failure transition after clone start goes to terminal `migration_failed`, so clone retry semantics are not yet rich.
- Accepted-with-limitations requires AAF approval decision refs at the MVP-6 transition layer; future callers must supply or resolve them.

## 15. Whether Implementation May Begin

Yes, implementation may begin in the next milestone, but only for the new server-only single-site clone-start orchestrator and focused tests.

Implementation should not begin by modifying generic runtime artifact generation directly.

## 16. Recommended Next Milestone

MVP-11: implement the new server-only single-site clone-start orchestrator.

Expected MVP-11 scope:

- require `migrationId`;
- call MVP-9 gate in blocking mode;
- call existing clone/runtime generation primitive only after the gate allows;
- record `clone_generation_started`, `clone_generation_completed`, and failure through MVP-6;
- keep generic runtime artifact generation untouched;
- avoid UI/API unless an existing safe route with `migrationId` is proven.

## 17. Validation Performed

Documentation validation was performed:

- confirmed all MVP-10 docs exist and are readable;
- confirmed the canonical index references the MVP-10 docs;
- confirmed no runtime/code/SQL/API/UI/provider files were modified;
- ran `git diff --check`;
- checked new Markdown files for trailing whitespace;
- confirmed docs state whether an existing clone boundary is safe;
- confirmed docs define how `migrationId` is required;
- confirmed docs state the MVP-9 gate must block clone start unless evidence is accepted or accepted-with-limitations;
- confirmed docs state generic runtime artifact generation must not be modified directly unless justified;
- confirmed docs recommend MVP-11.

## 18. Git Status Summary

Expected MVP-10 changes only:

- new `docs/architecture/gnr8-single-site-clone-start-boundary-design.md`
- new `docs/architecture/gnr8-single-site-clone-gate-runtime-integration-contract.md`
- new `docs/product/gnr8-single-site-clone-start-operator-workflow.md`
- new `docs/product/gnr8-single-site-clone-start-boundary-closeout.md`
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

No commit or push was performed.

## 19. Commands Run

- `pwd`
- `git status --short`
- `rg --files ...`
- `rg -n ...` over single-site, clone, generation, runtime, proposal, capture, import, migration, worker, and docs surfaces
- `sed -n ...` over MVP-9 gate/tests/closeout, MVP-6/MVP-7/MVP-8 services and closeouts, runtime store, migration factory, runtime migrate route, scoped import route/pipeline, site actions, AI migration route, proposal builders/importers, worker bootstrap, and canonical index
- `git diff --check`
- Markdown/readability and changed-file guardrail checks

## 20. Explicit Runtime Behavior Confirmation

No runtime behavior changed.

MVP-10 changed Markdown documentation and the canonical documentation index only. It did not implement clone integration, modify runtime generation, create routes, create UI, create migrations, call providers, call Supabase, commit, or push.
