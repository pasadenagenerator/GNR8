# GNR8 PROJECT MAP

## 1) Repository Structure

- `apps/platform`: control-plane, runtime orchestration, migration/validation tooling, Supabase migrations.
- `apps/worker`: worker-side jobs/services (Inngest-driven), template and render capture pipelines.
- `packages`: shared libraries/utilities used across apps.
- `docs`: architecture specs, AI bootstrap docs, checkpoints, and archives.
- `gnr8`: root-level runtime package area used by project code.

Runtime-centric areas currently concentrated in:
- `apps/platform/gnr8/runtime/**`
- `apps/platform/gnr8/migration/**`
- `apps/platform/gnr8/import/**`
- `apps/platform/gnr8/validation/**`
- `apps/worker/gnr8/**`

## 2) Runtime System Map

### provider
- Purpose: agency provider selection/settings, credential reference contract, credential resolution, provider communication model.
- Important files:
  - `apps/platform/gnr8/runtime/providers/agency-provider-settings.ts`
  - `apps/platform/gnr8/runtime/providers/provider-credential-reference.ts`
  - `apps/platform/gnr8/runtime/providers/provider-credential-resolution.ts`
  - `apps/platform/gnr8/runtime/providers/runtime-provider-communicator.ts`
- Status: active

### provider-jobs
- Purpose: deterministic planning and persistence contract for provider operation jobs.
- Important files:
  - `apps/platform/gnr8/runtime/provider-jobs/runtime-provider-job-planner.ts`
  - `apps/platform/gnr8/runtime/provider-jobs/runtime-provider-job-repository.ts`
  - `apps/platform/gnr8/runtime/provider-jobs/runtime-provider-job-transitions.ts`
- Status: active

### dns
- Purpose: provider adapter contract, readiness planning, sandbox/manual/mock capability modeling, execution gate.
- Important files:
  - `apps/platform/gnr8/runtime/dns/dns-provider-types.ts`
  - `apps/platform/gnr8/runtime/dns/provider-adapter-registry.ts`
  - `apps/platform/gnr8/runtime/dns/runtime-dns-readiness-plan.ts`
  - `apps/platform/gnr8/runtime/dns/provider-execution-gate.ts`
- Status: active

### domains
- Purpose: runtime domain lifecycle, execution intent derivation, dry-run action planning.
- Important files:
  - `apps/platform/gnr8/runtime/domains/runtime-domain-lifecycle.ts`
  - `apps/platform/gnr8/runtime/domains/runtime-domain-execution-intent.ts`
  - `apps/platform/gnr8/runtime/domains/runtime-domain-execution-dry-run.ts`
- Status: active

### approval
- Purpose: deterministic approval requirement + artifact generation and approval persistence contracts.
- Important files:
  - `apps/platform/gnr8/runtime/providers/runtime-provider-operation-approval.ts`
  - `apps/platform/gnr8/runtime/providers/runtime-provider-operation-approval-artifact.ts`
  - `apps/platform/gnr8/runtime/providers/runtime-provider-operation-approval-repository.ts`
- Status: active

### handoff
- Purpose: approval-to-execution handoff artifact and repository layer for future worker pickup.
- Important files:
  - `apps/platform/gnr8/runtime/providers/runtime-provider-execution-handoff.ts`
  - `apps/platform/gnr8/runtime/providers/runtime-provider-execution-handoff-store.ts`
  - `apps/platform/gnr8/runtime/providers/runtime-provider-execution-handoff-repository.ts`
- Status: active

### preview
- Purpose: runtime preview rendering, recovery/fallback behavior, and smoke validation diagnostics.
- Important files:
  - `apps/platform/gnr8/runtime/unified-render-preview.ts`
  - `apps/platform/gnr8/runtime/preview-content-recovery-renderer.ts`
  - `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.ts`
- Status: active

### migration
- Purpose: deterministic migration pipeline contracts, quality gates, enforcement, and run reports.
- Important files:
  - `apps/platform/gnr8/migration/pipeline-contract.ts`
  - `apps/platform/gnr8/migration/runtime/run-linear-migration-pipeline.ts`
  - `apps/platform/gnr8/migration/quality-gates/site-quality-gate.ts`
- Status: active

### import
- Purpose: deterministic static import intake, asset extraction, normalization, and import diagnostics.
- Important files:
  - `apps/platform/gnr8/import/import-contract.ts`
  - `apps/platform/gnr8/import/runtime/import-static-site.ts`
  - `apps/platform/gnr8/import/runtime/extract-assets.ts`
- Status: active

### validation
- Purpose: dry-run/reporting, fixture-driven validation runs, and baseline evidence capture.
- Important files:
  - `apps/platform/gnr8/validation/validation-contract.ts`
  - `apps/platform/gnr8/validation/runtime/run-first-real-site-validation.ts`
  - `apps/platform/gnr8/validation/beta-migration-dry-run-report.ts`
- Status: active

### worker
- Purpose: worker execution surfaces for template processing, site bootstrap/capture, and domain verification jobs.
- Important files:
  - `apps/worker/gnr8/inngest/functions.ts`
  - `apps/worker/gnr8/site/inngest/site-template-bootstrap-job.ts`
  - `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`
- Status: foundation

## 3) Current Execution Boundaries

- NO provider execution.
- NO live DNS.
- NO external registrar calls.
- NO worker execution for provider actions.
- Openprovider sandbox only.
- control-plane only.

## 4) Current DB Readiness State

Source baseline: `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md` and migration inventory under `apps/platform/supabase/migrations`.

Missing:
- `gnr8_provider_credential_references` (documented as missing until migration application in target DB environments).

Present:
- `gnr8_runtime_provider_jobs`
- `gnr8_agency_provider_settings`
- `gnr8_runtime_provider_operation_approvals`
- `gnr8_runtime_provider_execution_handoffs`

## 5) Current Next Phase Recommendation

1. Apply/verify provider-control-plane migrations in target DBs (especially credential references).
2. Run DB-backed repository validation for provider jobs, approvals, and handoffs.
3. Keep provider execution in deterministic dry-run/sandbox gates only until explicit live-execution ADR and approvals exist.
