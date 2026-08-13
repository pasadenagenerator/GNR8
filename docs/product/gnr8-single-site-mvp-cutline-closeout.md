# GNR8 Single-Site MVP Cutline Closeout

Date: 2026-08-13
Phase: MVP-CUTLINE-1
Scope: Documentation, audit, planning, and canonical index update only.

## Result

MVP-CUTLINE-1 stops the current scope expansion loop and resets the next work toward the shortest safe single-site MVP path.

The recommended direction is to pause MVP-65 diagnostic snapshot persistence and replace it with a direct end-to-end orchestration contract, a minimal operator action surface, an honest readiness truth or bypass policy, one real-site online shadow-publish rehearsal, deployment/migration verification, and a 20-site validation harness.

## Files Reviewed

Docs and closeouts reviewed:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/product/gnr8-single-site-end-to-end-gap-audit.md`
- `docs/product/gnr8-single-site-mvp-next-implementation-sequence.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/product/gnr8-single-site-clone-review-fidelity-acceptance-closeout.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-client-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-client-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-launch-approval-persistence-service-closeout.md`
- `docs/product/gnr8-single-site-launch-approval-aaf-bridge-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/product/gnr8-single-site-shadow-publish-internal-admin-route-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-action-audit-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-panel-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-runbook-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-readonly-snapshot-diff-closeout.md`
- `docs/product/gnr8-single-site-publish-diagnostic-snapshot-history-closeout.md`

Key implementation files reviewed read-only:

- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/app/api/gnr8/runtime/migrate/url/route.ts`
- `apps/platform/gnr8/billing/billing-resolution-service.ts`
- `apps/platform/gnr8/ptt/publish-target-source-truth-persistence.test.ts`

## Files Created Or Updated

Created:

- `docs/architecture/gnr8-single-site-mvp-acceptance-cutline.md`
- `docs/architecture/gnr8-single-site-mvp-end-to-end-gap-audit.md`
- `docs/product/gnr8-single-site-mvp-final-task-plan.md`
- `docs/product/gnr8-single-site-mvp-cutline-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP Acceptance Criteria Summary

MVP acceptance requires one internal operator to run one real website through source import/capture, source evidence review, near-1:1 clone, clone review, approved improvement recommendation, improved candidate creation, improved version/content/client/launch approval, launch readiness review, governed dry-run, governed shadow-publish, online verification, rollback readiness, and closeout. The same path must then be repeatable across a 20-site validation set.

## Must-Have Remaining Gaps

- End-to-end orchestration or a precise runnable sequence across the existing modules.
- Minimal operator action surface from import to shadow-publish.
- Billing/hosting readiness truth or explicit MVP bypass/attestation.
- Domain/DDOM/PTT readiness truth or explicit exception.
- Rollback and smoke QA evidence.
- Online one-site rehearsal after deploy and migrations.
- 20-site validation harness/checklist.

## Should-Have And Deferred Gaps

- Read-only panel polish.
- Diagnostic snapshot persistence and history.
- Additional AAF scope expansion.
- Client portal actions.
- Ops Inbox actions.
- Autonomous AI proposal generation and implementation.
- Advanced Stripe/billing automation.
- Full publish blocking enforcement.
- Batch migration.

## Freeze List

Freeze now:

- MVP-65 diagnostic snapshot persistence;
- more diagnostic snapshot, read-only panel, runbook, and diff work;
- more approval subdivisions or AAF scope expansion;
- Ops Inbox and client portal action surfaces;
- autonomous AI proposal or implementation;
- advanced billing automation;
- full publish blocking enforcement if shadow-publish remains enough for MVP;
- batch migration.

## Recommended Final Task Sequence

1. MVP-CUTLINE-2 - End-to-End Single-Site Orchestration Contract.
2. MVP-CUTLINE-3 - Minimal Operator Action Surface For Existing Workflow.
3. MVP-CUTLINE-4 - Billing, Hosting, Domain, DDOM, And PTT MVP Truth Policy.
4. MVP-CUTLINE-5 - One Real-Site Publish/Shadow-Publish Rehearsal.
5. MVP-CUTLINE-6 - Online Deploy And Supabase Migration Verification Checklist.
6. MVP-CUTLINE-7 - 20-Site Validation Harness And Runbook.
7. MVP-CUTLINE-8 - 20-Site Validation Fix Pass.
8. MVP-CUTLINE-9 - MVP Acceptance Closeout.

## Estimated Remaining Task Count

Minimum to internal single-site MVP: 4 to 5 tasks.

Realistic to online validated MVP: 7 to 9 tasks.

Stretch to polished demo MVP: 10 to 14 tasks.

Uncertainty is mostly in deployed Supabase migration state, real source-site capture quality, whether billing/domain can use explicit MVP bypasses, and how many defects appear in the first online rehearsal.

## MVP-65 Answer

MVP-65 diagnostic snapshot persistence should not continue now.

It should return after the first real online shadow-publish rehearsal or after the 20-site validation set shows repeated diagnostic-history needs. It should be replaced by direct end-to-end orchestration and a minimal operator-runnable path.

## Online GNR8 Verification

Online GNR8 verification becomes necessary after:

- the next implementation slice for the operator path is committed and pushed;
- the deployment containing that slice is live;
- required Supabase migrations are applied;
- one real site flow is seeded;
- the internal operator route or panel is available to a platform superadmin.

The human should then check the internal refs/readiness path, dry-run, shadow-publish, public/intended URL, SSL/domain behavior where applicable, content/layout/routes, forms/widgets/external links, metadata, active pointer, and rollback target evidence.

## Runtime Behavior

No runtime behavior changed in MVP-CUTLINE-1. No SQL, services, routes, workers, providers, UI, Command Center actions, Ops Inbox actions, billing, domain, DNS, publish, rollback, PASR, DDOM, AAF, diagnostics, snapshots, persistence, external calls, commits, or pushes were implemented.
