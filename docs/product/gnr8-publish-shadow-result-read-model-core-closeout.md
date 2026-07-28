# GNR8 Publish Shadow Result Read Model Core Closeout

PASR-4 implements the first server-only, read-only publish activation shadow result read model and repository.

No UI, Ops Inbox work item, publish API metadata, enforcement, DDOM snapshot creation, AAF approval creation, provider call, runtime mutation, SQL migration, commit, push, production Supabase call, staging Supabase call, Vercel call, DNS provider call, Openprovider call, registrar call, Stripe call, AI provider call, worker, queue, scheduled job, route, or server action was implemented.

## 1. Files Reviewed

- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/architecture/gnr8-publish-shadow-result-read-model-contract.md`
- `docs/product/gnr8-publish-shadow-evidence-review-workflow.md`
- `docs/product/gnr8-publish-shadow-result-surfacing-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.integration.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.ts`
- `apps/platform/supabase/migrations/20260722120000_aaf_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727120000_ddom_readiness_snapshot_persistence_core.sql`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## 2. Files Created Or Updated

Created:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.integration.test.ts`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

Pre-existing untracked PASR-3 docs were reviewed but not rewritten by PASR-4.

## 3. Final Module Locations

Read model:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`

Read repository:

- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`

## 4. Read Model Status Vocabulary

PASR-4 implements:

- `shadow_not_enabled`
- `shadow_not_available`
- `shadow_ready`
- `shadow_ready_with_warnings`
- `shadow_missing_source_truth`
- `shadow_stale_source_truth`
- `shadow_missing_ddom_snapshot`
- `shadow_stale_ddom_snapshot`
- `shadow_missing_publish_target`
- `shadow_missing_publish_activation_approval`
- `shadow_gate_not_ready`
- `shadow_evaluation_failed`

## 5. Source Records Read

The repository reads only existing persisted rows from:

- `gnr8_aaf_evidence_packages`
- `gnr8_aaf_evidence_package_source_refs`
- `gnr8_aaf_evidence_package_freshness_checks`
- `gnr8_aaf_action_gate_attempts`
- `gnr8_aaf_approval_policy_evaluations`
- `gnr8_aaf_audit_events`
- `gnr8_aaf_approval_requests`
- `gnr8_aaf_approval_decisions`
- `gnr8_aaf_approval_revocations`
- `gnr8_aaf_approval_supersession_links`
- `gnr8_aaf_audit_partial_timeline_markers`
- `gnr8_ddom_readiness_snapshots`
- `gnr8_publish_targets`
- `gnr8_runtime_site_versions`
- `gnr8_runtime_artifacts`
- `gnr8_runtime_active_pointers`

## 6. Correlation And Idempotency Strategy

Lookup supports site id, site version id, runtime artifact id, publish target id, correlation id, and idempotency key. Evidence rows are primary when present. Gate, policy, and audit rows are linked by exact evidence package id, exact correlation id, exact idempotency key, and PASR-2 facade suffixes such as `:policy` and `:audit`.

Durable publish attempt ids are not currently persisted for PASR-2 shadow observations. PASR-4 therefore reports `correlation_idempotency_fallback` and carries `durable_publish_attempt_id_unavailable_correlation_idempotency_fallback` as a limitation when no durable attempt ref is supplied.

## 7. DDOM Snapshot Behavior

PASR-4 reads the latest matching `gnr8_ddom_readiness_snapshots` row. It can represent present, missing, stale, blocked, not applicable, manually excepted, and unavailable states. It never creates a DDOM snapshot and recommends the manual DDOM trigger only outside PASR.

## 8. Publish Target Behavior

PASR-4 reads `gnr8_publish_targets` by requested target id, intended target, or the MVP production default. Current missing target source truth wins over older evidence refs, so operators see `shadow_missing_publish_target` when the requested target record is absent.

## 9. Approval Behavior

PASR-4 reads scoped AAF publish activation approval request/decision timeline rows. Launch signoff remains separate and does not satisfy publish activation approval. Missing approval maps to `shadow_missing_publish_activation_approval`; wrong-scope, stale, revoked, superseded, and partial timeline conditions remain limitations.

## 10. Evidence, Gate, And Audit Behavior

PASR-4 reconstructs evidence package summaries, source refs, freshness checks, dry-run gate attempts, policy evaluation blockers, audit event ids, blocked reasons, stale evidence reasons, and idempotency refs. Gate dry-runs remain `dryRunOnly: true`, action `publish.activation`, scope `publish_activation`, subject type `site_version`, and non-enforcing.

## 11. Recommended Next Actions

Implemented action keys:

- `none`
- `review_warnings`
- `run_ddom_manual_trigger_outside_pasr`
- `refresh_stale_ddom_snapshot_outside_pasr`
- `request_publish_activation_approval`
- `configure_verify_publish_target_source_truth`
- `review_source_reader_failure`
- `review_evidence_builder_failure`
- `review_gate_dry_run_failure`
- `escalate_domain_dns_ambiguity`
- `wait_for_shadow_observer_to_run`

Every action includes owner role, reason, `safeNow`, `blocksCurrentPublish: false`, future enforcement readiness impact, and required refs.

## 12. Derived-Only And Non-Enforcement Boundary

Every read model includes:

- `derivedOnly: true`
- `shadowOnly: true`
- `enforcementApplied: false`
- `publishActionBlocked: false`
- `createsDdomSnapshot: false`
- `createsApproval: false`
- `mutatesSourceTruth: false`

The read model is derived only and is not canonical source truth.

## 13. Provider And Mutation Confirmation

PASR-4 added no provider imports or calls for Vercel, Openprovider, DNS resolvers/providers, registrars, Stripe, AI providers, DDOM manual callers/triggers, runtime mutation, rollback, Command Center, Ops Inbox, public runtime serving, workers, queues, or broad API files.

The repository uses `begin isolation level repeatable read read only` and only executes `select`, transaction `commit`, and best-effort transaction `rollback`.

## 14. Validation Results

PASR-4 unit tests:

- Passed: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`

PASR-4 disposable DB integration tests:

- Passed: `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.integration.test.ts`
- Passed combined with unit tests: 11 tests passed.
- Disposable Docker containers were stopped after validation.

PASR-2 regression tests:

- Passed observer unit and integration tests.
- Runtime hook test passed when run from `apps/platform`.
- One combined run from repo root failed only because `@/` path alias resolution requires `apps/platform` as cwd for that runtime test.

Focused TypeScript validation:

- Passed for the PASR-4 read model, repository, unit test, and integration test files.

## 15. Guardrail Results

Static searches found no forbidden provider/runtime/DNS/AI/Stripe/DDOM-trigger/publish-mutation/rollback/Command Center/Ops Inbox imports or calls. Expected matches were only:

- `escalate_domain_dns_ambiguity` as a recommended action key.
- transaction `rollback` cleanup in the read-only repository.

No SQL migrations were created or changed. No runtime routes, publish routes, rollback routes, Command Center, Ops Inbox, public runtime, provider, billing, AI, worker, or broad API files were modified.

No production Supabase, staging Supabase, remote Supabase, Vercel, DNS provider, Openprovider, registrar, Stripe, or AI provider was called.

## 16. Issues Found

- No durable publish attempt id exists for PASR-2 shadow observations, so correlation/idempotency refs are the current linkage.
- PASR-2 does not persist a first-class shadow result row; PASR-4 reconstructs from AAF evidence/gate/audit plus source-owned tables.
- A custom SQL-tracking wrapper in the first integration test draft kept a Node handle open; it was removed. Final integration tests rely on row-count invariants and the repository read-only transaction.

## 17. Residual Risks

- Reconstruction is limited by what PASR-2 persisted; source-reader/evidence-builder failures that only reached logs cannot always be reconstructed.
- Older evidence refs can disagree with current source truth; PASR-4 intentionally favors current missing publish target/DDOM rows for operator status.
- Durable publish-attempt identity should be designed before API metadata, Ops Inbox work item keys, or enforcement.

## 18. Acceptance Recommendation

PASR-4 is safe to accept as a read-only core.

Command Center read-only surfacing may begin after access/redaction review and should consume this read model rather than reconstructing AAF/PASR rows directly.

Publish enforcement may not begin. Enforcement remains deferred until operators review real shadow data and a separate enforcement policy/rollout milestone is designed.

Recommended next milestone: Command Center internal read-only surfacing backed by this PASR-4 read model, with no publish API response change and no Ops Inbox mutation yet.

## 19. Git Status Summary

PASR-4 created four TypeScript files and this closeout, and updated the canonical documentation index. No commit or push was performed.

The worktree also contains pre-existing untracked PASR-3 docs that PASR-4 reviewed but did not rewrite.

## 20. Commands Run

- `sed` reviews of PASR-3 architecture/product docs.
- `sed` and `rg` reviews of PASR-2 observer, source reader, evidence builder, gate facade, writer repository, migrations, runtime orchestrator, and canonical index.
- `pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts` without server-only condition, which failed as expected on `server-only`.
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.test.ts apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.integration.test.ts`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/publish-activation-shadow-gate-observation.test.ts` from `apps/platform`
- `pnpm exec tsc --noEmit --pretty false --target ES2022 --module esnext --moduleResolution bundler --strict --skipLibCheck --types node ...PASR-4 files...`
- `docker ps --format '{{.Names}} {{.Status}}'`
- Static `rg` guardrail searches.
- `git status --short`
- `git diff --name-status`

## 21. Runtime Behavior Confirmation

No runtime behavior changed. PASR-4 added a server-only derived read model/repository and tests only. It does not block publish, modify publish activation behavior, modify active pointers, modify rollback behavior, modify PASR-2 observer behavior, create DDOM snapshots, create approvals, create evidence packages, create gate attempts, mutate source truth, or call providers.
