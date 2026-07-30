# GNR8 CANONICAL DOC INDEX

## Canonical

Read in this exact order:
1. `docs/ai/GNR8_THREAD_HANDOFF.md`
2. `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
3. `docs/ai/GNR8_CURRENT_STATE.md`
4. `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
5. `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
6. `docs/ai/GNR8_PROJECT_MAP.md`
7. `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
8. `docs/ai/decisions/*.md`

Current decision records:
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

## MVP-1 Boundary

Canonical MVP boundary and authority docs:
- `docs/product/gnr8-mvp-boundary.md`
- `docs/product/gnr8-mvp-supported-site-classes.md`
- `docs/architecture/gnr8-mvp-source-of-truth-matrix.md`
- `docs/architecture/gnr8-mvp-operational-state-model.md`
- `docs/product/gnr8-mvp-boundary-closeout.md`

## MVP-2 Single-Site Migration Realignment

Canonical single-site end-to-end migration MVP realignment docs:
- `docs/product/gnr8-single-site-migration-mvp-boundary.md`
- `docs/architecture/gnr8-single-site-migration-mvp-state-model.md`
- `docs/architecture/gnr8-single-site-migration-mvp-source-of-truth.md`
- `docs/product/gnr8-single-site-migration-operator-workflow.md`
- `docs/product/gnr8-single-site-migration-20-site-validation-plan.md`
- `docs/product/gnr8-single-site-migration-mvp-realignment-closeout.md`

## MVP-3 Single-Site End-To-End Gap Audit

Canonical single-site end-to-end implementation gap audit docs:
- `docs/product/gnr8-single-site-end-to-end-gap-audit.md`
- `docs/architecture/gnr8-single-site-end-to-end-implementation-map.md`
- `docs/product/gnr8-single-site-mvp-critical-blockers.md`
- `docs/product/gnr8-single-site-mvp-next-implementation-sequence.md`
- `docs/product/gnr8-single-site-end-to-end-gap-audit-closeout.md`

## MVP-4 Single-Site State And Source Evidence Spine

Canonical single-site state and source evidence spine implementation design docs:
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`

## MVP-5 Single-Site State And Source Evidence SQL Persistence Core

Canonical single-site state and source evidence SQL persistence implementation:
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-evidence-persistence.integration.test.ts`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- `docs/architecture/gnr8-single-site-state-spine-implementation-design.md`
- `docs/architecture/gnr8-single-site-state-schema-design.md`
- `docs/architecture/gnr8-source-evidence-review-schema-design.md`
- `docs/architecture/gnr8-single-site-state-transition-contract.md`
- `docs/product/gnr8-single-site-state-evidence-operator-workflow.md`
- `docs/product/gnr8-single-site-state-evidence-spine-closeout.md`

## MVP-6 Single-Site State And Source Evidence Writer Core

Canonical single-site state and source evidence writer implementation:
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.test.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.integration.test.ts`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`

## MVP-7 Single-Site State Read Model Core

Canonical single-site state read model implementation:
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.integration.test.ts`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`

## MVP-8 Single-Site Capture Spine Integration

Canonical single-site capture completion integration implementation:
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `apps/platform/supabase/migrations/20260729120000_single_site_state_evidence_spine.sql`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-state-evidence-sql-persistence-closeout.md`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`

## MVP-8-VERIFY Single-Site Capture Spine Integration Verification

Canonical verification closeout for MVP-8 capture completion integration:
- `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.test.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.integration.test.ts`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/source-evidence-review-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-state-evidence-writer-core-closeout.md`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`

## MVP-9 Single-Site Clone Generation Gate

Canonical clone generation gate implementation:
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.integration.test.ts`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts`
- `docs/product/gnr8-single-site-state-read-model-core-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-closeout.md`
- `docs/product/gnr8-single-site-capture-spine-integration-verification-closeout.md`

## MVP-10 Single-Site Clone Start Boundary Design

Canonical clone start boundary design docs:
- `docs/architecture/gnr8-single-site-clone-start-boundary-design.md`
- `docs/architecture/gnr8-single-site-clone-gate-runtime-integration-contract.md`
- `docs/product/gnr8-single-site-clone-start-operator-workflow.md`
- `docs/product/gnr8-single-site-clone-start-boundary-closeout.md`

## MVP-11 Single-Site Clone Start Orchestrator Core

Canonical clone start orchestrator implementation:
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- `docs/architecture/gnr8-single-site-clone-start-boundary-design.md`
- `docs/architecture/gnr8-single-site-clone-gate-runtime-integration-contract.md`

## MVP-12 Single-Site Real Clone Executor Adapter Core

Canonical real clone executor adapter implementation:
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`
- `docs/product/gnr8-single-site-clone-start-orchestrator-closeout.md`
- `docs/product/gnr8-single-site-clone-generation-gate-closeout.md`

## MVP-12-VERIFY Single-Site Real Clone Executor Runtime Verification

Canonical runtime-store integration verification for MVP-12:
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.integration.test.ts`
- `docs/product/gnr8-single-site-real-clone-executor-runtime-verification-closeout.md`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`
- `apps/platform/gnr8/single-site/single-site-real-clone-executor.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-clone-generation-gate.ts`
- `apps/platform/gnr8/runtime/runtime-store.ts`
- `apps/platform/gnr8/runtime/artifact-builder.ts`
- `docs/product/gnr8-single-site-real-clone-executor-closeout.md`

## MVP-13 Single-Site Clone Review And Fidelity Acceptance Core

Canonical clone review and fidelity acceptance implementation:
- `apps/platform/gnr8/single-site/clone-review-service.ts`
- `apps/platform/gnr8/single-site/clone-review-service.test.ts`
- `apps/platform/gnr8/single-site/clone-review-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/supabase/migrations/20260730120000_single_site_clone_review_core.sql`
- `docs/product/gnr8-single-site-clone-review-fidelity-acceptance-closeout.md`

## MVP-14 Single-Site Improvement Proposal Planning Architecture

Canonical improvement proposal planning source-of-truth and transition design docs:
- `docs/architecture/gnr8-single-site-improvement-proposal-planning-architecture.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-improvement-proposal-transition-contract.md`
- `docs/product/gnr8-single-site-improvement-proposal-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-proposal-planning-closeout.md`

## BMF-1 Bulk Migration Factory

Canonical Bulk Migration Factory design docs:
- `docs/architecture/gnr8-bulk-migration-factory-design.md`
- `docs/architecture/gnr8-bulk-migration-batch-lifecycle.md`
- `docs/architecture/gnr8-bulk-migration-failure-recovery.md`
- `docs/product/gnr8-bulk-migration-operator-workflow.md`
- `docs/product/gnr8-bulk-migration-factory-closeout.md`

## CCO-1 Command Center And Ops Inbox

Canonical Command Center and Ops Inbox design docs:
- `docs/architecture/gnr8-command-center-ops-inbox-design.md`
- `docs/architecture/gnr8-command-center-read-model-contract.md`
- `docs/architecture/gnr8-ops-inbox-work-item-model.md`
- `docs/product/gnr8-command-center-operator-workbench.md`
- `docs/product/gnr8-command-center-ops-inbox-closeout.md`

## AAF-1 Audit And Approval Foundation

Canonical audit, approval, and evidence foundation docs:
- `docs/architecture/gnr8-audit-approval-foundation-design.md`
- `docs/architecture/gnr8-approval-persistence-model.md`
- `docs/architecture/gnr8-audit-event-taxonomy.md`
- `docs/architecture/gnr8-evidence-package-contract.md`
- `docs/product/gnr8-audit-approval-operator-workflow.md`
- `docs/product/gnr8-audit-approval-foundation-closeout.md`

## AAF-2 Audit And Approval Implementation Design

Canonical audit, approval, and evidence implementation design docs:
- `docs/architecture/gnr8-audit-approval-implementation-design.md`
- `docs/architecture/gnr8-approval-schema-and-policy-contract.md`
- `docs/architecture/gnr8-audit-event-write-path-contract.md`
- `docs/architecture/gnr8-evidence-package-implementation-contract.md`
- `docs/architecture/gnr8-approval-gate-integration-map.md`
- `docs/product/gnr8-audit-approval-implementation-operator-workflow.md`
- `docs/product/gnr8-audit-approval-implementation-closeout.md`

## AAF-3 Audit And Approval Persistence Core

Canonical audit, approval, and evidence persistence implementation docs:
- `docs/product/gnr8-audit-approval-persistence-core-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-verification-closeout.md`
- `docs/product/gnr8-audit-approval-persistence-core-db-execution-closeout.md`

## AAF-4 Audit And Approval Writer Core

Canonical audit, approval, and evidence writer implementation docs:
- `docs/product/gnr8-audit-approval-writer-core-closeout.md`

## AAF-5 Audit And Approval Policy Gate Facade

Canonical audit, approval, evidence policy evaluator and non-executing gate facade docs:
- `docs/product/gnr8-audit-approval-policy-gate-facade-closeout.md`

## AAF-6 Publish Activation Gate Dry-Run

Canonical publish activation dry-run gate adapter closeout:
- `docs/product/gnr8-audit-approval-publish-gate-dry-run-closeout.md`

## AAF-7 Publish Activation Evidence Builder

Canonical publish activation evidence package builder closeout:
- `docs/product/gnr8-audit-approval-publish-evidence-builder-closeout.md`

## AAF-8 Publish Source Reader And DDOM Snapshot Architecture

Canonical publish source reader and DDOM snapshot architecture docs:
- `docs/architecture/gnr8-aaf-publish-source-reader-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-persistence-design.md`
- `docs/architecture/gnr8-publish-target-source-truth-design.md`
- `docs/product/gnr8-aaf-publish-source-reader-review-closeout.md`

## DDOM-2 Readiness Snapshot Persistence Core

Canonical DDOM readiness snapshot persistence implementation closeout:
- `docs/product/gnr8-ddom-readiness-snapshot-persistence-core-closeout.md`

## DDOM-3 Readiness Snapshot Writer Core

Canonical DDOM readiness snapshot writer implementation closeout:
- `docs/product/gnr8-ddom-readiness-snapshot-writer-core-closeout.md`

## DDOM-4 Readiness Snapshot Production Caller Architecture

Canonical DDOM readiness snapshot production caller architecture docs:
- `docs/architecture/gnr8-ddom-readiness-snapshot-production-caller-architecture.md`
- `docs/architecture/gnr8-ddom-readiness-source-state-contract.md`
- `docs/architecture/gnr8-ddom-readiness-snapshot-caller-options.md`
- `docs/product/gnr8-ddom-readiness-snapshot-operator-workflow.md`
- `docs/product/gnr8-ddom-readiness-snapshot-production-caller-architecture-closeout.md`

## DDOM-5 Readiness Manual Snapshot Caller Core

Canonical DDOM readiness manual stored-state caller implementation:
- `docs/product/gnr8-ddom-readiness-manual-snapshot-caller-core-closeout.md`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.integration.test.ts`

## DDOM-6 Readiness Manual Snapshot Trigger

Canonical controlled manual DDOM readiness snapshot trigger implementation:
- `docs/product/gnr8-ddom-readiness-manual-snapshot-trigger-closeout.md`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-trigger.integration.test.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-manual-snapshot-caller.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-mapper.ts`

## PTT-1 Publish Target Source Truth Persistence Core

Canonical publish target source truth persistence implementation closeout:
- `docs/product/gnr8-publish-target-source-truth-persistence-core-closeout.md`

## PASR-1 Publish Activation Source Reader Read-Only Core

Canonical publish activation source reader implementation closeout:
- `docs/product/gnr8-publish-activation-source-reader-read-only-core-closeout.md`

## PASR-2 Publish Activation Shadow Gate Integration

Canonical publish activation shadow gate integration closeout:
- `docs/product/gnr8-publish-activation-shadow-gate-integration-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-shadow-observer.integration.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-shadow-gate-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-source-reader.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-evidence-builder.ts`
- `apps/platform/gnr8/aaf/aaf-publish-activation-gate-adapter.ts`
- `apps/platform/gnr8/ddom/ddom-readiness-stored-state-repository.ts`
- `apps/platform/supabase/migrations/20260727130000_publish_target_source_truth_persistence_core.sql`

## PASR-3 Publish Shadow Result Surfacing Architecture

Canonical publish shadow result surfacing architecture docs:
- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/architecture/gnr8-publish-shadow-result-read-model-contract.md`
- `docs/product/gnr8-publish-shadow-evidence-review-workflow.md`
- `docs/product/gnr8-publish-shadow-result-surfacing-closeout.md`

## PASR-4 Publish Shadow Result Read Model Core

Canonical publish shadow result read model core implementation:
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.integration.test.ts`
- `docs/architecture/gnr8-publish-shadow-result-surfacing-architecture.md`
- `docs/architecture/gnr8-publish-shadow-result-read-model-contract.md`
- `docs/product/gnr8-publish-shadow-evidence-review-workflow.md`
- `docs/product/gnr8-publish-shadow-result-surfacing-closeout.md`

## PASR-5 Publish Shadow Access And Redaction Architecture

Canonical publish shadow access and redaction architecture docs:
- `docs/architecture/gnr8-publish-shadow-access-redaction-architecture.md`
- `docs/architecture/gnr8-publish-shadow-role-visibility-matrix.md`
- `docs/product/gnr8-publish-shadow-operator-visibility-workflow.md`
- `docs/product/gnr8-publish-shadow-access-redaction-closeout.md`

## PASR-6 Publish Shadow Result Redaction Transformer

Canonical publish shadow result redaction transformer implementation:
- `docs/product/gnr8-publish-shadow-result-redaction-transformer-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts`
- `docs/architecture/gnr8-publish-shadow-access-redaction-architecture.md`
- `docs/architecture/gnr8-publish-shadow-role-visibility-matrix.md`
- `docs/product/gnr8-publish-shadow-operator-visibility-workflow.md`
- `docs/product/gnr8-publish-shadow-access-redaction-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `docs/product/gnr8-publish-shadow-result-read-model-core-closeout.md`

## PASR-7 Command Center Publish Shadow Surfacing

Canonical Command Center read-only publish shadow surfacing implementation:
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `apps/platform/app/gnr8/command-center/hosting/[siteId]/page.tsx`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts`

## PASR-7-VERIFY Command Center Publish Shadow Surfacing Verification

Canonical PASR-7 verification closeout and boundary references:
- `docs/product/gnr8-command-center-publish-shadow-surfacing-verification-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.ts`

## PASR-8 Ops Inbox Publish Shadow Surfacing

Canonical read-only derived Ops Inbox publish shadow surfacing implementation:
- `docs/product/gnr8-ops-inbox-publish-shadow-surfacing-closeout.md`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-repository.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-command-center-publish-shadow-view-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-read-model.test.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-result-redaction.test.ts`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-closeout.md`
- `docs/product/gnr8-command-center-publish-shadow-surfacing-verification-closeout.md`

## OPS-1 First-Class Internal Ops Inbox Shell

Canonical first-class internal Ops Inbox shell architecture docs:
- `docs/architecture/gnr8-ops-inbox-first-class-shell-architecture.md`
- `docs/architecture/gnr8-ops-inbox-derived-work-item-contract.md`
- `docs/product/gnr8-ops-inbox-operator-workflow.md`
- `docs/product/gnr8-ops-inbox-first-class-shell-closeout.md`

## OPS-2 Minimal Internal Ops Inbox Shell

Canonical minimal internal Ops Inbox shell implementation:
- `docs/product/gnr8-ops-inbox-minimal-shell-closeout.md`
- `apps/platform/app/gnr8/command-center/ops-inbox/page.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx`
- `apps/platform/app/gnr8/command-center/ops-inbox/ops-inbox-shell.test.tsx`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.ts`
- `apps/platform/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model.test.ts`
- `docs/architecture/gnr8-ops-inbox-first-class-shell-architecture.md`
- `docs/architecture/gnr8-ops-inbox-derived-work-item-contract.md`
- `docs/product/gnr8-ops-inbox-operator-workflow.md`
- `docs/product/gnr8-ops-inbox-first-class-shell-closeout.md`

## DDOM-1 Domain And DNS Operating Model

Canonical domain and DNS operating model docs:
- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/product/gnr8-domain-dns-operator-workflow.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`

## Secondary

- `SYSTEM.md`
- `ai-rules.md`
- `architecture.md`
- `engineering-principles.md`
- `execution.md`
- `codex-context.md`
- `docs/architecture/*.md`
- `apps/platform/gnr8/architecture/*.md`

## Checkpoint

- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`
- `docs/gnr8/preview-smoke-baseline-2026-05.md`

## Archive

- `docs/_archive_founder/**`
- root founder-level strategy/spec docs:
  - `GNR8 AI Platform Vision (founder level).md`
  - `GNR8 Architecture Hygiene & Evolution Policy (founder level).md`
  - `GNR8 Billing Architecture Strategy Spec (founder level).md`
  - `GNR8 Canonical Model Philosophy (founder level).md`
  - `GNR8 Migration Execution Strategy (Founder Level).md`
  - `GNR8 Platform Operating Model (Founder Level).md`
  - `GNR8 Runtime Philosophy (founder level).md`
  - `GNR8 Spec Compression Strategy (founder level).md`
  - `GNR8 V1 Execution Convergence Plan (founder level).md`

## Potentially Stale

- `docs/ai/GNR8_CURRENT_STATE.md` (if snapshot date drifts from active implementation reality)
- `apps/platform/gnr8/platform-audits/*.md` (point-in-time reports; verify recency before using as authority)
- `apps/platform/gnr8/validation/*IMPLEMENTATION_NOTE.md` (task-scoped notes may not reflect latest baseline)
- `platform-roadmap.md` (not part of canonical AI bootstrap set)
- `docs/gnr8-vercel-runtime-backbone.md` (verify against current runtime topology before relying)
