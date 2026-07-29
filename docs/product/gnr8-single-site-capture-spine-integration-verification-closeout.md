# GNR8 Single-Site Capture Spine Integration Verification Closeout

Date: 2026-07-29
Phase: MVP-8-VERIFY capture completion integration verification
Scope: Focused verification closeout for MVP-8 runtime capture/import completion recording into the canonical single-site state spine.

MVP-8-VERIFY was verification-first. It did not implement clone generation gating, clone generation, proposal behavior, billing/Stripe behavior, domain/DNS behavior, publish behavior, rollback behavior, Command Center, Ops Inbox, public runtime behavior, workers, SQL migrations, API routes, UI, external provider calls, commit, or push.

## 1. Files Reviewed

- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `apps/platform/gnr8/site/import-route-runtime-surface.test.ts`
- `apps/platform/app/api/gnr8/clients/_tests/site-import-preview-mode.test.ts`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.test.ts`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 2. Files Changed

- Created `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`.
- Updated `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` with an MVP-8-VERIFY reference section.

No runtime code, test code, SQL migrations, API routes, UI, worker, clone, proposal, billing, domain, publish, rollback, provider, or public runtime files were changed in this verification phase.

## 3. MVP-8 Boundary Verification

The capture spine adapter is server-only and depends on the MVP-6 writer repository, transition service, and source evidence review service. It does not import clone, proposal, publish, rollback, billing, Stripe, DNS, Vercel, Openprovider, provider execution, Command Center, Ops Inbox, public runtime, or worker modules.

The integration point remains the client-scoped import route only. It records after hard intake failure or after successful scoped import completion and ownership site resolution. This is the intended first runtime hook into the single-site spine.

## 4. Capture Route Behavior Verification

The route preserves existing response semantics. The hard intake failure path still returns the existing 502 JSON response with `ok: false`, `reasonCode`, `error`, `intake`, and diagnostics. The success path still returns the existing 200 JSON response with import classification, site/runtime ids, preview details, pipeline diagnostics, redirect target, and import manifest fields.

Spine recording is invoked around existing route outcomes and its result is not added to the HTTP response. A spine recording failure is logged but does not alter route status, body shape, or capture/import success/failure behavior.

## 5. Best-Effort Behavior Verification

`recordCaptureSpineBestEffort` wraps `recordSingleSiteCaptureSpine` in `try/catch` and logs `SINGLE_SITE_CAPTURE_SPINE_RECORDING_FAILED` with source URL, correlation id, outcome, and message. It does not throw after logging.

This is the intended best-effort boundary: the existing import output is preserved even if the new single-site spine write path is temporarily unavailable.

## 6. State Transition Verification

Success path records:

- `source_capture_started`
- `source_capture_completed`
- `source_evidence_review_required` when minimum evidence exists and the review is ready

Failure path records:

- `source_capture_started`
- `source_capture_failed`

All state changes go through `SingleSiteStateTransitionService`, which in turn uses `SingleSiteStateWriterRepository`. The adapter itself contains no direct SQL writes.

## 7. Source Evidence Review Verification

Successful capture creates or reuses a source evidence review through `SourceEvidenceReviewService`. It records source evidence refs, upserts evidence items, marks the review `ready_for_review` when minimum evidence exists, and links the review back to the migration through the review-required transition.

Review retry after `ready_for_review` is safe because the adapter checks `getSourceEvidenceReviewByIdempotencyKey` before attempting review creation. This avoids treating mutable `review_status` as creation-time idempotency drift on retry.

## 8. Evidence Mapping Verification

MVP-8 maps available route artifacts as follows:

- Source URL -> `source_url`
- Entry page/snapshot -> `page`
- Rendered screenshots -> `screenshot`
- Rendered DOM/raw HTML -> `dom`
- Raw HTML text extraction -> `text`
- Fetched image assets -> `image`
- Fetched non-image assets -> `asset`
- Computed font-family samples -> `font`
- Computed style samples -> `visual_identity`
- URL import metadata -> `metadata`
- Explicit degraded capture signals -> `limitation`
- Missing required categories -> category item with `missing` status plus `missing_evidence`

Missing categories are not treated as complete capture. The adapter adds missing evidence entries for every absent required category, degrades completeness status, and marks required missing/degraded/unverified items as clone-blocking in the review item data.

## 9. Idempotency And Drift Verification

Repeated capture completion with the same semantic payload reuses existing spine records. The disposable DB MVP-8 integration test verifies table counts are unchanged after retry.

Changed semantic payload with the same idempotency key fails clearly through MVP-6 semantic idempotency conflict handling. Unit tests cover source URL drift. Repository code compares semantic fields with stable JSON normalization before reusing existing rows.

No duplicate refs are produced on idempotent retry. The prior duplicate package ref issue remains fixed: the package ref is recorded on capture completion, while the review-required transition records the source evidence review ref.

## 10. Read Model Projection Verification

The MVP-8 disposable DB integration test writes capture success/failure through the adapter and reads the result through the MVP-7 read repository/model. Verified projections include:

- capture-written migration is readable by migration id;
- state history is visible;
- source evidence review status is visible as `ready_for_review`;
- source evidence review refs and item summary are visible;
- recommended next action is `review_source_evidence` for review-required success;
- failed capture projects as `source_capture_failed` with `retry_capture` next action.

## 11. Non-Integration Verification

Verification found no MVP-8 integration with clone generation, proposal generation, billing/Stripe, domain/DNS, publish, rollback, Command Center, Ops Inbox, client portal, public runtime, provider execution, or UI behavior.

The MVP-6 transition service contains future transition vocabulary and enforcement rules, including clone gating prerequisites, but MVP-8 does not invoke clone generation or cross that boundary.

## 12. Provider Non-Call Verification

No production Supabase, staging Supabase, Vercel, DNS provider, Openprovider, Stripe, AI provider, or other external provider was called during verification.

The disposable DB tests used local Docker PostgreSQL with `postgres:15` and `--pull=never`. The affected URL import tests used test doubles and local fixtures, not provider credentials.

## 13. Mutation And Direct-Write Verification

Direct `gnr8_single_site_*` mutations remain centralized in `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`.

Static search found no non-test, non-migration, non-repository direct `insert into`, `update`, or `delete from public.gnr8_single_site_*` usage. The adapter uses MVP-6 services only. The route imports only the adapter for spine recording.

## 14. Test Results

Passed:

- MVP-5/MVP-6/MVP-7/MVP-8 unit and static suite: 33 tests passed.
- MVP-6/MVP-7/MVP-8 disposable PostgreSQL integration suite: 3 tests passed.
- Scoped import route runtime-surface tests: 3 tests passed.
- Affected import preview and URL single-page capture tests: 38 tests passed.

## 15. Type And Static Validation Results

Passed:

- Static guardrails for migrations, direct writes, forbidden imports/calls, and Docker cleanup.

Failed with unrelated existing drift:

- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`

The emitted type errors were outside MVP-8 capture spine files, including older admin route tests, dry-run tests, content/site-create route test doubles, runtime/dns/provider tests, preview/runtime tests, site workspace tests, and template intake tests. No MVP-8 adapter, MVP-8 tests, single-site writer/service/read-model files, or scoped import route error was identified in the emitted failures.

## 16. Guardrail Results

Passed:

- No SQL migrations were created or changed.
- No direct `gnr8_single_site_*` writes exist outside the MVP-6 writer repository in non-test runtime code.
- No forbidden provider, DNS, Vercel, Openprovider, Stripe, or AI imports/calls were found in the MVP-8 adapter or route integration.
- No publish/rollback mutation imports were found in the MVP-8 adapter or route integration.
- No clone/proposal integration imports were found in the MVP-8 adapter or route integration.
- No Command Center, Ops Inbox, client portal, or public runtime changes were made.
- Disposable Docker validation containers were stopped.

## 17. Issues Found

No new MVP-8 boundary issue was found during MVP-8-VERIFY.

Known MVP-8 implementation-phase issues documented in the prior closeout remain fixed:

- duplicate migration-level source evidence package ref;
- retry after `ready_for_review` causing mutable review status idempotency drift.

The full platform typecheck remains blocked by unrelated existing type drift outside this phase.

## 18. Fixes Made

No runtime, test, SQL, or safety fixes were required during MVP-8-VERIFY.

Documentation-only changes were made:

- created this verification closeout;
- updated the canonical documentation index.

## 19. Residual Risks

- Best-effort route behavior means a spine outage can leave a successful import without single-site spine rows until retry or reconciliation.
- Evidence completeness is limited to artifacts available at the selected route boundary.
- Full platform typecheck remains red due to unrelated existing drift outside MVP-8.

## 20. Whether MVP-8 Is Fully Safe To Accept

Yes. MVP-8 is fully safe to accept after verification as a narrow, best-effort capture/import completion integration into the single-site state spine.

## 21. Whether Clone Generation Gating May Begin

Yes. Clone generation gating may begin after this verification closeout, provided MVP-9 remains scoped to gating on accepted source evidence review state and does not modify capture/import semantics.

## 22. Recommended Next Milestone

MVP-9: clone generation gating behind accepted source evidence review, using MVP-6 transition enforcement and MVP-7 read projection as the source of state evidence.

## 23. Git Status Summary

Expected verification-phase changes:

- new `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`;
- modified `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`.

No commit or push was performed.

## 24. Commands Run

- `git status --short`
- `rg --files -g '*single-site*' -g '*capture*' -g '*import*' -g '*mvp*' apps/platform gnr8 docs`
- `rg -n "MVP-8|capture spine|single-site-capture|source_capture|source_evidence|ready_for_review|read model|gnr8_single_site" apps/platform gnr8 docs/product docs/ai`
- `nl -ba` and `sed -n` reviews over the adapter, route, writer repository, transition service, source evidence review service, read model tests, read model integration tests, route tests, and MVP-8 closeout.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts apps/platform/gnr8/single-site/source-evidence-review-service.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/site/import-route-runtime-surface.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/clients/_tests/site-import-preview-mode.test.ts gnr8/validation/runtime/url-single-page-import.test.ts`
- `git diff --name-only -- apps/platform/supabase/migrations supabase db`
- `rg -n "\b(insert into|update|delete from)\s+public\.gnr8_single_site_" apps/platform --glob '!**/*.test.ts' --glob '!**/*.integration.test.ts' --glob '!apps/platform/supabase/migrations/**' --glob '!apps/platform/gnr8/single-site/single-site-state-writer-repository.ts'`
- `rg` guardrails for forbidden clone/proposal/publish/rollback/billing/Stripe/DNS/Vercel/Openprovider/provider/Command Center/Ops Inbox/public runtime imports and calls.
- `docker ps --format '{{.Names}}'`
- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`

## 25. Explicit Confirmation Of Runtime Behavior Impact

MVP-8-VERIFY made no runtime behavior changes. Existing capture/import behavior remains preserved. The already-implemented MVP-8 behavior remains a best-effort route-side attempt to record capture success or failure into the single-site state spine without changing import response semantics, clone generation, proposals, billing, domains, publishing, rollback, UI, provider calls, or public runtime behavior.
