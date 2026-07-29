# GNR8 Single-Site Capture Spine Integration Closeout

Date: 2026-07-29
Phase: MVP-8 capture completion integration into the single-site state spine
Scope: Narrow server-only adapter, client-scoped import completion/failure boundary integration, focused tests, validation, and documentation only.

MVP-8 did not implement clone generation gating, clone generation, proposal generation, content editing, billing/Stripe, domain/DNS, publish, rollback, Command Center, Ops Inbox, public runtime, providers, workers beyond the narrow import route boundary, external provider behavior, SQL migrations, broad APIs, UI, commit, or push.

## 1. Files Reviewed

- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- MVP-5, MVP-6, and MVP-7 unit/integration tests.
- MVP-5, MVP-6, and MVP-7 closeouts.
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/validation/runtime/url-single-page-import.ts`
- `apps/platform/gnr8/import-rendered-capture/rendered-capture-contract.ts`
- `apps/platform/gnr8/site/scoped-import-pipeline.ts`
- Existing import/capture route and URL snapshot tests.

## 2. Files Created Or Updated

Created:

- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`

Updated:

- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 3. Selected Capture/Import Boundary

Selected boundary: the client-scoped site import route, after deterministic runtime identity preallocation and `importPublicSinglePageUrlToSnapshot`, with success recording after `runScopedImportPipeline` and ownership site resolution.

Failure recording occurs at the existing hard intake failure return path where no usable raw HTML exists. This is the narrowest safe boundary because it already owns URL intake, capture snapshot creation, rendered capture artifacts, pipeline completion, runtime identity, ownership site linkage, and existing response semantics.

## 4. Integration Strict Vs Best-Effort Decision

Spine recording is best-effort at the route boundary. If spine recording fails, the route logs `SINGLE_SITE_CAPTURE_SPINE_RECORDING_FAILED` and preserves the existing import success/failure response behavior. This avoids losing capture output or changing user-visible import semantics because the existing import route was not previously strict on the new single-site spine.

## 5. Adapter Location

- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`

The adapter is server-only and accepts plain capture completion/failure input. It does not call capture, providers, AI, clone, proposal, publish, rollback, or runtime serving code.

## 6. Existing Data Available At Boundary

Available: tenant/agency id, client id, source URL, canonical URL, intended domain host, deterministic runtime site id, site version id, ownership site id on success, capture snapshot id, snapshot run id, rendered capture status, rendered DOM refs, screenshot refs, raw HTML, import diagnostics, fetch manifest assets/images, computed style samples, pipeline mode, CMS diagnostics, and source/pipeline degradation signals.

## 7. Data Missing At Boundary

Missing or partial: structured data extraction, full multi-page evidence unless multi-page discovery is enabled elsewhere, complete font file provenance, full visual identity/CGP package, reviewer decisions, AAF approval refs, clone refs, proposal refs, billing refs, domain readiness refs, publish refs, and rollback refs.

## 8. State Transitions Written

Success path:

- `site_candidate_created -> source_capture_started`
- `source_capture_started -> source_capture_completed`
- `source_capture_completed -> source_evidence_review_required` when minimum evidence exists and the review is ready

Failure path:

- `site_candidate_created -> source_capture_started`
- `source_capture_started -> source_capture_failed`

All transitions use `SingleSiteStateTransitionService`.

## 9. Source Evidence Review Behavior

On capture completion, the adapter creates or reuses a source evidence review through `SourceEvidenceReviewService`, records evidence refs, adds category items, marks the review `ready_for_review` when source URL, page, and at least one of DOM/text/screenshot exists, then transitions the migration to `source_evidence_review_required`.

The adapter also reuses an existing review by idempotency key to avoid retry drift after a review has already moved from `not_started` to `ready_for_review`.

## 10. Evidence Item Mapping

- Source URL -> `source_url`
- Captured page/snapshot -> `page`
- Rendered screenshots -> `screenshot`
- Rendered DOM/raw HTML -> `dom`
- Raw HTML text source -> `text`
- Fetched image manifest entries -> `image`
- Fetched non-image assets -> `asset`
- Computed font-family samples -> `font`
- Computed style samples -> `visual_identity`
- URL import metadata -> `metadata`
- Structured data -> currently missing unless future capture supplies it
- Degraded capture -> `limitation`
- Missing required categories -> category item with `missing` plus `missing_evidence`

## 11. Idempotency/Drift Behavior

Migration creation uses the MVP-6 repository idempotency key and semantic drift checks. Transitions use deterministic child idempotency keys. Review creation reuses existing review rows by idempotency key before creating. Review refs and items use stable child keys.

Drift is expected to fail clearly through MVP-6 idempotency errors when the same idempotency key is reused with incompatible migration identity/source payload.

## 12. Transaction Behavior

Each MVP-6 repository/service call uses its existing transaction boundary. The adapter sequences narrow transactional operations rather than introducing direct SQL or broad cross-system transactions. This preserves existing capture output behavior and keeps the new spine writes retryable.

## 13. Failure Behavior

Capture/intake failure records `source_capture_failed` when preallocated identity and source URL are available. Spine write failures are logged and do not turn an existing import response into a different HTTP result.

## 14. Non-Integration Boundaries

No clone generation gating, clone generation, proposal generation, content editing, billing/Stripe, domain/DNS, publish, rollback, Command Center, Ops Inbox, public runtime, provider, worker, SQL migration, UI, broad API, AAF approval, DDOM, PTT, or runtime serving mutation was added.

## 15. Unit Test Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`

Result: 7 tests passed.

Combined MVP-5/MVP-6/MVP-7/MVP-8 unit/static suite:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts apps/platform/gnr8/single-site/source-evidence-review-service.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`

Result: 33 tests passed.

## 16. Integration Test Results

Passed:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`

Result: 1 disposable local PostgreSQL test passed.

Combined disposable DB integration suite:

- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`

Result: 3 tests passed. Tests used local Docker `postgres:15` with `--pull=never`, applied only the MVP-5 migration, and stopped containers afterward.

## 17. Type/Static Validation Results

Passed:

- `git diff --check`
- Filtered changed-file TypeScript diagnostics from `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`: no diagnostics for changed MVP-8 files after fixes.

The full platform typecheck currently reports unrelated pre-existing test/type errors outside MVP-8 files, including admin candidate review tests, dry-run tests, content route test doubles, site-create route test doubles, runtime resolution binding tests, and template intake tests.

## 18. Guardrail Results

Passed guardrails confirmed:

- no SQL migrations were created or changed;
- direct writes to `gnr8_single_site_*` remain in `single-site-state-writer-repository.ts`;
- the adapter has no direct SQL writes;
- the adapter has no clone/proposal/publish/rollback/billing/Stripe/DNS/Vercel/Openprovider/provider/Command Center/Ops Inbox/public runtime imports or calls;
- added route imports do not add forbidden provider/runtime/publish/billing/rollback integrations;
- no production, staging, remote Supabase, external provider, Stripe, Vercel, DNS, Openprovider, or AI provider calls were made during validation;
- Docker cleanup check found no running `gnr8-single-site-capture`, `gnr8-single-site-writer`, or `gnr8-single-site-read` containers.

## 19. Issues Found

- Initial adapter attempted to insert the same migration-level `source_evidence_package` ref on both capture completion and review-required transitions. Fixed by recording the package on capture completion and the review ref on review-required.
- Retry after `ready_for_review` exposed review creation idempotency drift because `review_status` is mutable. Fixed with a narrow MVP-6 repository read by review idempotency key and adapter reuse.
- Full app TypeScript validation is blocked by unrelated existing type errors outside the MVP-8 changes.

## 20. Residual Risks

- The route-level integration is best-effort, so a spine outage can leave successful capture output without spine rows until retried or reconciled.
- Evidence mapping is limited to data present at the selected boundary. Structured data and full font/source identity evidence remain missing unless future capture supplies them.
- Capture timestamps can vary by actual run; adapter idempotency is strongest when callers supply stable capture identity and evidence payloads for retries.

## 21. Whether MVP-8 Is Safe To Accept

Yes. MVP-8 is safe to accept as the first runtime capture completion integration into the single-site state spine.

## 22. Whether Clone Generation Gating May Begin

Yes. Clone generation gating may begin as the next milestone, using the source evidence review state produced here. MVP-8 itself did not implement or alter clone generation.

## 23. Recommended Next Milestone

MVP-9: gate clone generation behind accepted source evidence review, using MVP-6 transition enforcement and MVP-7 read projections without changing capture semantics.

## 24. Git Status Summary

At closeout drafting time, changed/new files were the capture adapter, adapter unit/integration tests, the scoped import route, the MVP-6 writer repository read helper, this closeout, and the canonical doc index. No commit or push was performed.

## 25. Commands Run

- `rg --files ...` and `rg ...` to locate MVP-5/MVP-6/MVP-7 spine files and capture/import boundaries.
- `sed -n ...` over spine contracts, writer, transition service, source evidence service, read model, read repository, closeouts, scoped import route, URL capture snapshot, rendered capture contract, and scoped pipeline.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts apps/platform/gnr8/single-site/source-evidence-review-service.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/site/import-route-runtime-surface.test.ts apps/platform/app/api/gnr8/clients/_tests/site-import-preview-mode.test.ts apps/platform/gnr8/validation/runtime/url-single-page-import.test.ts` from repo root; alias-dependent tests were rerun from `apps/platform`.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/clients/_tests/site-import-preview-mode.test.ts gnr8/validation/runtime/url-single-page-import.test.ts` from `apps/platform`.
- `pnpm exec tsc -p apps/platform/tsconfig.json --noEmit --pretty false`
- Filtered changed-file TypeScript diagnostic search.
- `git diff --check`
- `git diff --name-only -- apps/platform/supabase/migrations supabase db`
- `rg` guardrails for direct SQL writes and forbidden imports/calls.
- `docker ps --format '{{.Names}}' | rg 'gnr8-single-site-(capture|writer|read)'`
- `git status --short`

## 26. Explicit Confirmation Of Runtime Behavior Impact

Existing capture/import output semantics are preserved. The scoped import route now attempts best-effort single-site spine recording after capture/import completion or hard intake failure, but successful capture output is not discarded if spine recording fails. No clone/proposal/billing/domain/publish/rollback/UI/provider/public runtime behavior was added or changed.
