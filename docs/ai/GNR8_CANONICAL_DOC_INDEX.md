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

## MVP-15 Single-Site Improvement Proposal Planning Core

Canonical improvement proposal planning persistence and server-only service core:
- `apps/platform/supabase/migrations/20260730143000_single_site_improvement_proposal_planning_core.sql`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-improvement-proposal-planning-core-closeout.md`

## MVP-16 Single-Site Implementation Authorization Boundary

Canonical implementation authorization boundary design docs:
- `docs/architecture/gnr8-single-site-implementation-authorization-boundary.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-aaf-scope-design.md`
- `docs/architecture/gnr8-single-site-implementation-authorization-transition-contract.md`
- `docs/product/gnr8-single-site-implementation-authorization-operator-workflow.md`
- `docs/product/gnr8-single-site-implementation-authorization-boundary-closeout.md`

## MVP-17 Single-Site Implementation Authorization AAF Contracts

Canonical AAF scope/contracts foundation for single-site implementation authorization:
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/supabase/migrations/20260730170000_aaf_single_site_implementation_authorization_scope.sql`
- `docs/product/gnr8-single-site-implementation-authorization-aaf-contracts-closeout.md`

## MVP-18 Single-Site Implementation Authorization Bridge Core

Canonical non-executing server-side bridge from approved single-site improvement proposal planning to AAF implementation authorization request/validation:
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-proposal-planning-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/product/gnr8-single-site-implementation-authorization-bridge-closeout.md`

## MVP-19 Single-Site Improvement Execution Architecture And Reuse Map

Canonical design-only architecture, source-of-truth, reuse map, AAF revalidation, transition contract, operator workflow, and closeout for future single-site improvement execution:
- `docs/architecture/gnr8-single-site-improvement-execution-architecture.md`
- `docs/architecture/gnr8-single-site-existing-capability-reuse-map.md`
- `docs/architecture/gnr8-single-site-improvement-execution-source-of-truth.md`
- `docs/architecture/gnr8-single-site-improvement-execution-transition-contract.md`
- `docs/architecture/gnr8-single-site-improvement-execution-aaf-revalidation-contract.md`
- `docs/product/gnr8-single-site-improvement-execution-operator-workflow.md`
- `docs/product/gnr8-single-site-improvement-execution-readiness-closeout.md`

## MVP-20 Single-Site Improvement Execution AAF Validator Core

Canonical server-only execution-time AAF validator core for future single-site improvement execution:
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.integration.test.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `docs/product/gnr8-single-site-improvement-execution-aaf-validator-closeout.md`

## MVP-20A AAF Granted-With-Limitations Vocabulary Closeout

Canonical AAF-only approval decision status vocabulary closeout for implementation authorization:
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/supabase/migrations/20260731100000_aaf_granted_with_limitations_status.sql`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `docs/product/gnr8-aaf-granted-with-limitations-vocabulary-closeout.md`

## MVP-21 Single-Site Improvement Execution Persistence Boundary Core

Canonical execution attempt persistence and server-only future executor boundary core:
- `apps/platform/supabase/migrations/20260731120000_single_site_improvement_execution_core.sql`
- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-writer-repository.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `apps/platform/gnr8/single-site/improvement-execution-aaf-validator.ts`
- `docs/product/gnr8-single-site-improvement-execution-persistence-boundary-closeout.md`

## MVP-22 Single-Site Improved Candidate Adapter Design And Dry-Run Contract

Canonical design-only improved candidate adapter, dry-run fixture, primitive map, evidence/watermark contract, operator workflow, and closeout:
- `docs/architecture/gnr8-single-site-improved-candidate-adapter-design.md`
- `docs/architecture/gnr8-single-site-improved-candidate-dry-run-contract.md`
- `docs/architecture/gnr8-single-site-improved-candidate-runtime-primitive-map.md`
- `docs/architecture/gnr8-single-site-improved-candidate-evidence-watermark-contract.md`
- `docs/product/gnr8-single-site-improved-candidate-operator-workflow.md`
- `docs/product/gnr8-single-site-improved-candidate-adapter-readiness-closeout.md`

## MVP-23 Single-Site Improved Candidate Dry-Run Adapter Core

Canonical server-only improved candidate dry-run adapter core:
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-dry-run-adapter.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-dry-run-adapter-closeout.md`

## MVP-24 Single-Site Improved Candidate Creation Adapter Core

Canonical server-only real improved candidate creation adapter core:
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.test.ts`
- `apps/platform/gnr8/single-site/improved-candidate-creation-adapter.integration.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-contracts.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.test.ts`
- `docs/product/gnr8-single-site-improved-candidate-creation-adapter-closeout.md`

## MVP-25 Single-Site Improved Version Review And Acceptance Core

Canonical server-only improved candidate review and acceptance truth:
- `apps/platform/gnr8/single-site/improved-version-review-service.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.test.ts`
- `apps/platform/gnr8/single-site/improved-version-review-service.integration.test.ts`
- `apps/platform/supabase/migrations/20260731143000_single_site_improved_version_review_core.sql`
- `docs/product/gnr8-single-site-improved-version-review-acceptance-closeout.md`

## MVP-26 Single-Site Content Approval Architecture And Source-Of-Truth Design

Canonical design-only content approval boundary, source-of-truth decision, AAF scope recommendation, transition contract, operator workflow, and closeout:
- `docs/architecture/gnr8-single-site-content-approval-architecture.md`
- `docs/architecture/gnr8-single-site-content-approval-source-of-truth-design.md`
- `docs/architecture/gnr8-single-site-content-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-content-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-content-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-content-approval-architecture-closeout.md`

## MVP-27 Single-Site Content Approval AAF Contracts

Canonical AAF scope/contracts foundation for single-site content approval:
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-closeout.md`

## MVP-27-DB-VERIFY Single-Site Content Approval AAF Contracts DB Verification

Canonical disposable PostgreSQL verification for MVP-27 AAF content approval vocabulary:
- `docs/product/gnr8-single-site-content-approval-aaf-contracts-db-verification-closeout.md`
- `apps/platform/supabase/migrations/20260803120000_aaf_single_site_content_approval_scope.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`

## MVP-28 Single-Site Content Approval Persistence And Service Core

Canonical server-only content approval workflow persistence, service core, transition/read-model projection, focused tests, and closeout:
- `apps/platform/supabase/migrations/20260803143000_single_site_content_approval_core.sql`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/content-approval-service.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.integration.test.ts`
- `docs/product/gnr8-single-site-content-approval-persistence-service-closeout.md`

## MVP-29 Single-Site Content Approval AAF Bridge And Evidence Validation

Canonical server-only, non-executing AAF bridge and exact-scope evidence/decision validation core for single-site content approval:
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/content-approval-aaf-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/content-approval-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/product/gnr8-single-site-content-approval-aaf-bridge-closeout.md`

## MVP-30 Single-Site Client And Launch Approval Architecture

Canonical design-only client approval and launch approval boundary, source-of-truth, AAF scope recommendation, transition contract, operator workflow, and closeout:
- `docs/architecture/gnr8-single-site-client-approval-architecture.md`
- `docs/architecture/gnr8-single-site-launch-approval-architecture.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-source-of-truth.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-transition-contract.md`
- `docs/architecture/gnr8-single-site-client-launch-approval-aaf-scope-design.md`
- `docs/product/gnr8-single-site-client-launch-approval-operator-workflow.md`
- `docs/product/gnr8-single-site-client-launch-approval-architecture-closeout.md`

## MVP-31 Single-Site Client And Launch Approval AAF Contracts

Canonical AAF scope/contracts foundation for single-site client approval and launch approval:
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.test.ts`
- `apps/platform/gnr8/aaf/aaf-writer-repository.integration.test.ts`
- `apps/platform/supabase/migrations/20260803170000_aaf_single_site_client_launch_approval_scopes.sql`
- `docs/product/gnr8-single-site-client-launch-approval-aaf-contracts-closeout.md`

## MVP-32 Single-Site Client Approval Persistence And Service Core

Canonical server-only client approval workflow persistence, service core, transition/read-model projection, focused tests, and closeout:
- `apps/platform/supabase/migrations/20260803190000_single_site_client_approval_core.sql`
- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/client-approval-service.test.ts`
- `apps/platform/gnr8/single-site/client-approval-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-client-approval-persistence-service-closeout.md`

## MVP-33 Single-Site Client Approval AAF Bridge And Evidence Validation

Canonical server-only, non-executing AAF bridge and exact-scope evidence/decision validation core for single-site client approval:
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/client-approval-aaf-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/client-approval-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/product/gnr8-single-site-client-approval-aaf-bridge-closeout.md`

## MVP-34 Single-Site Launch Approval Persistence And Service Core

Canonical server-only launch approval workflow persistence, service core, transition/read-model projection, focused tests, and closeout:
- `apps/platform/supabase/migrations/20260803210000_single_site_launch_approval_core.sql`
- `apps/platform/gnr8/single-site/launch-approval-service.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.integration.test.ts`
- `apps/platform/gnr8/single-site/single-site-state-contracts.ts`
- `apps/platform/gnr8/single-site/single-site-state-transition-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-repository.ts`
- `docs/product/gnr8-single-site-launch-approval-persistence-service-closeout.md`

## MVP-35 Single-Site Launch Approval AAF Bridge And Evidence Validation

Canonical server-only, non-executing AAF bridge and exact-scope evidence/decision validation core for single-site launch approval:
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.ts`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-aaf-bridge.integration.test.ts`
- `apps/platform/gnr8/single-site/launch-approval-service.ts`
- `apps/platform/gnr8/single-site/single-site-state-read-model.ts`
- `docs/product/gnr8-single-site-launch-approval-aaf-bridge-closeout.md`

## MVP-36 Single-Site Launch Readiness Source Of Truth And Evidence Architecture

Canonical documentation-only launch readiness architecture after validated launch approval and before publish activation review:
- `docs/architecture/gnr8-single-site-launch-readiness-source-of-truth.md`
- `docs/architecture/gnr8-single-site-launch-readiness-evidence-architecture.md`
- `docs/architecture/gnr8-single-site-launch-readiness-transition-contract.md`
- `docs/architecture/gnr8-single-site-launch-readiness-source-reader-design.md`
- `docs/product/gnr8-single-site-launch-readiness-operator-workflow.md`
- `docs/product/gnr8-single-site-launch-readiness-architecture-closeout.md`

## MVP-37 Single-Site Launch Readiness Persistence Core

Canonical additive SQL persistence core for single-site launch readiness records, dimensions, durable refs, blockers, lifecycle events, closeouts, append-only protections, RLS posture, and focused validation:
- `apps/platform/supabase/migrations/20260804120000_single_site_launch_readiness_core.sql`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-persistence.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-persistence-closeout.md`

## MVP-38 Single-Site Launch Readiness Source Reader Core

Canonical server-only, read-only launch readiness source reader core that gathers existing source truth, deterministic refs/watermarks, freshness states, blockers, limitations, missing/stale/unsupported diagnostics, and non-enforcing PASR diagnostics without writing MVP-37 readiness persistence or mutating source systems:
- `apps/platform/gnr8/single-site/launch-readiness-source-reader.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-read-repository.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-reader.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-source-reader.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-source-reader-closeout.md`

## MVP-39 Single-Site Launch Readiness Writer And Service Core

Canonical server-only launch readiness writer repository and service core that consumes MVP-38 source packages and writes MVP-37 launch readiness records, dimensions, refs, blockers, events, limitations, and closeouts without creating AAF records, DDOM snapshots, provider calls, runtime mutation, publish activation, publish, rollback, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-service.integration.test.ts`
- `docs/product/gnr8-single-site-launch-readiness-writer-service-closeout.md`

## MVP-40 Single-Site Launch Readiness AAF Evidence Builder Core

Canonical server-only, non-executing AAF evidence builder core that creates/reuses distinct `single_site_launch_readiness_evidence` packages from persisted launch readiness records without creating approval requests, decisions, gate attempts, DDOM snapshots, provider calls, runtime mutation, publish activation, publish, rollback, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/supabase/migrations/20260804143000_aaf_single_site_launch_readiness_evidence_type.sql`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-evidence-builder.integration.test.ts`
- `apps/platform/gnr8/single-site/launch-readiness-writer-repository.ts`
- `docs/product/gnr8-single-site-launch-readiness-evidence-builder-closeout.md`
- `docs/product/gnr8-single-site-mvp-cutline-50-launch-readiness-evidence.md`

## MVP-41 Single-Site Publish Activation Request Bridge Core

Canonical server-only, non-executing bridge that validates MVP-40 `single_site_launch_readiness_evidence` fail-closed and creates/reuses one exact-scope AAF `publish_activation` / `publish.activation` approval request without creating approval decisions, gate attempts, PASR observations, DDOM snapshots, provider calls, runtime mutation, publish activation enforcement, publish, rollback, billing/domain mutation, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-request-bridge.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-request-bridge-closeout.md`

## MVP-42 Single-Site Publish Activation Human Decision Workflow Core

Canonical server-only, non-executing human decision workflow core that validates the MVP-41 `publish_activation` / `publish.activation` request and MVP-40 `single_site_launch_readiness_evidence` fail-closed before creating/reusing one exact-scope AAF approval decision, without creating gate attempts, evaluating gates, calling PASR, creating DDOM snapshots, mutating runtime, publishing, rollback, provider calls, billing/domain mutation, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/gnr8/single-site/publish-activation-decision-service.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-service.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-human-decision-workflow-closeout.md`

## MVP-43 Single-Site Publish Activation Decision Read Model And Gate Handoff Core

Canonical server-only, read-only publish activation decision read model and deterministic gate handoff core that reconstructs MVP-41 request + MVP-42 decision + MVP-40 launch readiness evidence before any future gate evaluation, without creating AAF records, creating gate attempts, evaluating gates, calling PASR, creating DDOM snapshots, mutating runtime, publishing, rollback, provider calls, billing/domain mutation, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/gnr8/single-site/publish-activation-decision-read-repository.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-decision-read-model.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-decision-read-model-handoff-closeout.md`

## MVP-44 Single-Site Publish Activation Gate Evaluation Core

Canonical server-only, non-publishing publish activation gate evaluation core that consumes the MVP-43 handoff, validates it fail-closed, builds a deterministic gate input, and creates/reuses only canonical AAF policy/audit/gate attempt records through the AAF gate facade, without creating approval requests/decisions, calling PASR, creating DDOM snapshots, enforcing publish activation, publishing, rollback, mutating runtime/active pointers, provider calls, billing/domain mutation, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-gate-evaluator.integration.test.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.ts`
- `apps/platform/gnr8/aaf/aaf-policy-gate-facade.test.ts`
- `docs/product/gnr8-single-site-publish-activation-gate-evaluation-closeout.md`

## MVP-45 Single-Site Publish Activation Enforcement Architecture

Canonical documentation-only architecture and safety plan for future consumption of MVP-44 gate evaluation results before single-site active pointer mutation, defining the future integration point, runtime contract, fail-closed policy, feature flags, operator workflow, source reread policy, response/audit/rollback behavior, and staged implementation plan without implementing enforcement, route wiring, publish execution, runtime mutation, rollback, provider calls, billing/domain execution, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-architecture.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-runtime-contract.md`
- `docs/architecture/gnr8-single-site-publish-activation-enforcement-fail-closed-policy.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-architecture-closeout.md`

## MVP-46 Single-Site Publish Activation Enforcement Guard Core

Canonical server-only, read-only publish activation enforcement guard core that consumes a future publish intent plus persisted MVP-44 gate result and MVP-43/MVP-44 watermarks to decide whether activation would pass, block, error, or explicitly bypass, without route/orchestrator wiring, publish execution, rollback, active pointer mutation, AAF record creation, gate evaluation, PASR invocation, DDOM snapshots, provider calls, billing/domain mutation, UI/API, Command Center, Ops Inbox, or client portal exposure:
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.integration.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`

## MVP-47 Single-Site Publish Activation Enforcement Shadow Integration

Canonical shadow-only integration of the MVP-46 read-only publish activation enforcement guard inside `publishApprovedSiteVersion(...)`, after candidate/artifact and pointer-readiness evaluation and before active pointer mutation, with `GNR8_SINGLE_SITE_PUBLISH_ACTIVATION_GATE_SHADOW` defaulting off, without blocking publish, changing active pointer behavior, changing response contracts, creating AAF records, evaluating gates, calling PASR, creating DDOM snapshots, calling providers, mutating billing/domain/runtime beyond existing publish behavior, or exposing UI/API/Command Center/Ops Inbox/client portal behavior:
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`

## MVP-48 Single-Site Publish Activation Metadata Handoff Plumbing

Canonical server-only, optional metadata handoff contract and read-only normalization helper that allows eligible future single-site publish calls to carry persisted MVP-43/MVP-44 publish activation decision, gate, source ref, and watermark metadata into the existing MVP-47/MVP-46 shadow guard observation, without blocking publish, changing active pointer behavior, changing response contracts, reevaluating gates, creating AAF records, invoking PASR, creating DDOM snapshots, calling providers, mutating billing/domain/runtime beyond existing publish behavior, or exposing UI/API/Command Center/Ops Inbox/client portal behavior:
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.test.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`

## MVP-49 Single-Site Publish Activation Metadata Resolver Core

Canonical server-only, read-only metadata resolver that reconstructs complete MVP-48 `publishActivationMetadataHandoff` objects from persisted MVP-40/MVP-41/MVP-42/MVP-43/MVP-44/PTT rows using one repeatable-read read-only transaction, without wiring into publish execution, blocking publish, evaluating gates, creating AAF records, invoking PASR, creating DDOM snapshots, calling providers, mutating runtime/active pointers/rollback/billing/domain/DNS state, or exposing UI/API/Command Center/Ops Inbox/client portal behavior:
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.integration.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`

## MVP-50 Single-Site Publish Activation Resolver Shadow Integration

Canonical shadow-only integration of the MVP-49 read-only publish activation metadata resolver inside the existing MVP-47/MVP-48 publish activation shadow guard path, so absent or incomplete explicit metadata may resolve to complete MVP-48 metadata before MVP-46 shadow guard diagnostics, without blocking publish, changing active pointer behavior, changing response contracts, evaluating gates, creating AAF records, invoking PASR, creating DDOM snapshots, calling providers, mutating billing/domain/runtime beyond existing publish behavior, adding UI/API/Command Center/Ops Inbox/client portal exposure, or adding SQL migrations:
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `apps/platform/gnr8/runtime/publish-activation-resolver-shadow-observation.test.ts`
- `apps/platform/gnr8/runtime/publish-activation-enforcement-shadow-observation.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/single-site/publish-activation-enforcement-guard.ts`
- `docs/product/gnr8-single-site-publish-activation-resolver-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-shadow-integration-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-enforcement-guard-closeout.md`

## MVP-51 Single-Site Publish Caller Context Architecture

Canonical documentation-only architecture for a future server-only single-site publish wrapper that supplies strict tenant/client/site/migration/candidate/artifact/publish-target/request/decision/gate/handoff metadata to `publishApprovedSiteVersion(...)`, selecting shadow-only wrapper context as the safe future caller path while leaving generic runtime publish callers unchanged and without implementing caller wiring, routes, services, SQL, UI, publish behavior changes, blocking enforcement, AAF record creation, gate reevaluation, PASR invocation, DDOM snapshots, provider calls, billing/domain execution, Command Center actions, Ops Inbox actions, client portal exposure, commit, or push:
- `docs/architecture/gnr8-single-site-publish-caller-context-architecture.md`
- `docs/architecture/gnr8-single-site-publish-caller-context-contract.md`
- `docs/architecture/gnr8-single-site-publish-caller-selection-and-boundaries.md`
- `docs/product/gnr8-single-site-publish-caller-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`

## MVP-52 Single-Site Publish Wrapper Orchestrator Shadow Core

Canonical server-only, default-off, shadow-only single-site publish wrapper/orchestrator that validates strict single-site context, resolves complete MVP-48 publish activation metadata through the MVP-49 read-only resolver, dry-runs without publishing, and in execute mode calls only the existing `publishApprovedSiteVersion(...)` with complete metadata handoff, while leaving generic publish callers unchanged and without blocking enforcement, gate evaluation, AAF record creation, PASR invocation, DDOM snapshots, provider/DNS/domain/billing calls, direct active pointer/runtime mutation, UI/API/Command Center/Ops Inbox/client portal exposure, SQL migrations, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.integration.test.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-resolver.ts`
- `apps/platform/gnr8/single-site/publish-activation-metadata-handoff.ts`
- `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-resolver-closeout.md`
- `docs/product/gnr8-single-site-publish-activation-metadata-handoff-closeout.md`

## MVP-53 Single-Site Publish Operator Caller Surface Architecture

Canonical documentation-only architecture selecting the first eligible internal operator caller surface for later MVP-52 wrapper invocation: a hidden/default-off Command Center operator action backed by an internal admin-namespace route, dry-run only in MVP-54 and shadow-publish only in MVP-55 behind an additional flag, while keeping generic runtime publish, Ops Inbox, client portal, provider/domain/DNS/billing/Stripe, AAF/gate, PASR/DDOM, runtime, rollback, Command Center implementation, and publish behavior unchanged:
- `docs/architecture/gnr8-single-site-publish-operator-caller-surface-architecture.md`
- `docs/architecture/gnr8-single-site-publish-operator-caller-contract.md`
- `docs/architecture/gnr8-single-site-publish-operator-access-control.md`
- `docs/product/gnr8-single-site-publish-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-operator-caller-surface-closeout.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`
- `docs/architecture/gnr8-single-site-publish-caller-context-architecture.md`
- `docs/architecture/gnr8-single-site-publish-caller-context-contract.md`
- `docs/architecture/gnr8-single-site-publish-caller-selection-and-boundaries.md`
- `docs/product/gnr8-single-site-publish-caller-context-closeout.md`

## MVP-54 Single-Site Publish Operator Dry-Run Caller

Canonical internal superadmin-only admin API caller surface for validating strict single-site publish context and invoking the MVP-52 wrapper only with `dryRun: true`, while returning a redacted operator-safe result and leaving publish execution, generic runtime publish, client portal, Ops Inbox, AAF/gate records/evaluation, PASR/DDOM, providers/domain/DNS, billing/Stripe, rollback, active pointers, runtime mutation, SQL migrations, commit, and push unchanged:
- `apps/platform/gnr8/single-site/single-site-publish-operator-dry-run-caller.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `docs/product/gnr8-single-site-publish-operator-dry-run-caller-closeout.md`
- `docs/product/gnr8-single-site-publish-operator-caller-surface-closeout.md`
- `docs/product/gnr8-single-site-publish-wrapper-orchestrator-shadow-closeout.md`

## MVP-55 Single-Site Shadow-Publish Operator Action Architecture

Canonical documentation-only architecture and safety contract for a future separately flagged internal superadmin-only single-site shadow-publish operator action that may invoke the MVP-52 wrapper execute path with complete MVP-48 metadata handoff so the wrapper calls existing `publishApprovedSiteVersion(...)`, while making explicit that publish may execute and active pointer mutation may occur through existing orchestrator behavior, MVP-47/MVP-50 guard diagnostics remain non-blocking, blocking enforcement is not applied, MVP-54 dry-run remains dry-run only, and no route/action/UI/publish/generic route/runtime/provider/domain/DNS/billing/Stripe/Ops Inbox/client portal behavior is implemented or changed in MVP-55:
- `docs/architecture/gnr8-single-site-shadow-publish-operator-action-architecture.md`
- `docs/architecture/gnr8-single-site-shadow-publish-execution-contract.md`
- `docs/architecture/gnr8-single-site-shadow-publish-access-audit-redaction.md`
- `docs/product/gnr8-single-site-shadow-publish-operator-workflow.md`
- `docs/product/gnr8-single-site-shadow-publish-operator-action-closeout.md`

## MVP-56 Single-Site Shadow-Publish Internal Admin Route

Canonical separately flagged internal admin API route for platform-superadmin-only single-site shadow-publish execution through the MVP-52 wrapper with `mode: "shadow_publish"` and `dryRun: false`, while preserving default-off behavior, strict confirmation/context validation, redacted response projection, structured safe logging, MVP-54 dry-run non-regression, generic publish/client portal/Ops Inbox boundaries, and no blocking enforcement, AAF/gate creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe/rollback/direct runtime mutation outside existing wrapper/orchestrator behavior:
- `apps/platform/gnr8/single-site/single-site-shadow-publish-operator-caller.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- `docs/product/gnr8-single-site-shadow-publish-internal-admin-route-closeout.md`
- `apps/platform/gnr8/single-site/single-site-publish-wrapper-orchestrator.ts`
- `docs/product/gnr8-single-site-shadow-publish-operator-action-closeout.md`

## MVP-57 Single-Site Publish Operator Action Audit Core

Canonical durable internal non-AAF audit persistence and server-only audit service for MVP-54 dry-run and MVP-56 shadow-publish operator attempts, storing actor, intent, refs, watermarks, mode, requested/preflight/started/completed/failed status, redacted diagnostics, limitation/error summaries, correlation, and idempotency with RLS closed by default and append-only refs/events, while preserving generic publish/client portal/Ops Inbox boundaries and without blocking enforcement, AAF/gate creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe calls, rollback, direct runtime mutation outside existing MVP-52 wrapper/orchestrator behavior, UI, commit, or push:
- `apps/platform/supabase/migrations/20260806120000_single_site_publish_operator_action_audit.sql`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.test.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-action-audit.integration.test.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-publish-operator-dry-run-route.test.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-shadow-publish-route.test.ts`
- `docs/product/gnr8-single-site-publish-operator-action-audit-closeout.md`

## MVP-58 Single-Site Publish Operator Read-Only Panel

Canonical internal Command Center read-only panel and SELECT-only projection over MVP-57 dry-run/shadow-publish audit records for platform-superadmin visibility into governed single-site publish state, latest audit attempts, safe refs/watermarks, blockers/warnings/limitations, redacted diagnostics, persisted result flags, and recommended next operator action, while preserving generic publish/client portal/Ops Inbox boundaries and without action buttons, publish/dry-run/shadow-publish/retry/approval/rollback controls, blocking enforcement, AAF/gate creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe calls, active pointer/runtime mutation, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-panel-closeout.md`

## MVP-59 Single-Site Publish Operator Read-Only Source Enrichment

Canonical internal Command Center read-only source enrichment for the MVP-58 panel, adding source-owned launch readiness, launch readiness evidence, publish activation request/decision, gate/handoff, metadata completeness, stale/missing/blocker diagnostics, latest MVP-57 audit attempts, and deterministic next-action projection, while preserving source-truth boundaries and without action buttons, forms, publish/dry-run/shadow-publish/retry/approval/rollback controls, blocking enforcement, AAF request/decision creation, gate attempt creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe/AI calls, active pointer/runtime/publish-target/content/rollback mutation, generic publish route changes, client portal changes, Ops Inbox action changes, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-source-enrichment-closeout.md`

## MVP-60 Single-Site Publish Operator Read-Only Drilldown And Filtering

Canonical internal Command Center read-only drilldown and filtering pass for the MVP-58/MVP-59 single-site publish operator panel, adding source-derived launch readiness dimension groups, blocker counts, freshness rows, activation request/decision detail, gate/handoff mismatch and conflict detail, metadata resolver diagnostics, sanitized audit event/timeline detail, and local UI-only filters/search/sorting, while preserving source-truth boundaries and without action buttons, forms, publish/dry-run/shadow-publish/retry/approval/rollback controls, blocking enforcement, AAF request/decision creation, gate attempt creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe/AI calls, active pointer/runtime/publish-target/content/rollback mutation, generic publish route changes, client portal changes, Ops Inbox action changes, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-drilldown-closeout.md`

## MVP-61 Single-Site Publish Operator Read-Only Runbook

Canonical internal Command Center read-only diagnostic runbook for the MVP-58/MVP-59/MVP-60 single-site publish operator panel, adding deterministic source-owned interpretation of launch readiness, publish activation request/decision, gate evaluation, metadata resolver, runtime candidate, publish target, and operator audit states with severity/source counts, top blocking reason, recommended inspection order, redacted safe refs/codes, and explicit `readOnly: true` / `actionAvailable: false` entries, while preserving source-truth boundaries and without action buttons, forms, publish/dry-run/shadow-publish/retry/approval/rollback controls, blocking enforcement, AAF request/decision creation, gate attempt creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe/AI calls, active pointer/runtime/publish-target/content/rollback mutation, generic publish route changes, client portal changes, Ops Inbox action changes, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-runbook-closeout.md`

## MVP-62 Single-Site Publish Operator Read-Only Diagnostic Snapshot

Canonical internal Command Center read-only diagnostic snapshot layer for the MVP-58/MVP-59/MVP-60/MVP-61 single-site publish operator panel, adding deterministic export-safe snapshot construction, stable semantic snapshot watermarking that excludes volatile generated timestamps, safe source watermarks, display-only safe refs/cross-links, compact collapsible redacted JSON preview, source-owned versus derived-only labels, and explicit `readOnly: true` / `exportSafe: true` / `actionAvailable: false` / `publishes: false` / `runtimeMutation: false` / `enforcementApplied: false` flags, while preserving source-truth boundaries and without action buttons, forms, downloads, POST routes, publish/dry-run/shadow-publish/retry/approval/rollback controls, blocking enforcement, AAF request/decision creation, gate attempt creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe/AI calls, active pointer/runtime/publish-target/content/rollback mutation, generic publish route changes, client portal changes, Ops Inbox action changes, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-diagnostic-snapshot-closeout.md`

## MVP-63 Single-Site Publish Operator Read-Only Snapshot Diff

Canonical internal Command Center read-only snapshot diff layer for the MVP-62 diagnostic snapshot, adding deterministic comparison against an optional previous safe snapshot or latest safe shadow-publish/dry-run audit summary, diff severity classification, blocker/warning/limitation/stale-missing/status/watermark/ref deltas, comparable-baseline metadata, top regression/improvement, no-baseline empty state, and explicit `readOnly: true` / `actionAvailable: false` / `mutatesSourceTruth: false` flags, while preserving source-truth boundaries and without action buttons, forms, downloads, POST routes, snapshot persistence, migrations, publish/dry-run/shadow-publish/retry/approval/rollback controls, blocking enforcement, AAF request/decision creation, gate attempt creation/evaluation, PASR/DDOM/provider/domain/DNS/billing/Stripe/AI calls, active pointer/runtime/publish-target/content/rollback mutation, generic publish route changes, client portal changes, Ops Inbox action changes, commit, or push:
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.ts`
- `apps/platform/gnr8/single-site/single-site-publish-operator-readonly-projection.test.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-publish-operator-readonly-snapshot-diff-closeout.md`

## MVP-64 Single-Site Publish Diagnostic Snapshot History Design

Canonical documentation-only architecture, redaction/retention contract, operator workflow, and closeout for future safe persisted diagnostic snapshot history behind the internal single-site publish operator panel, defining derived-only historical observation semantics, source-of-truth boundaries, stale snapshot labeling, future table shapes for snapshots/refs/events, allowed and forbidden stored data, internal-only privacy, short operational retention, idempotency and semantic watermark strategy, future MVP-63 baseline selection from persisted snapshots, and explicit guardrails against treating snapshots as source truth, approval truth, AAF truth, audit truth, publish authority, enforcement authority, client-facing export, Ops Inbox action state, or mutation authority, while preserving the MVP-64 boundary of no SQL, tables, services, routes, UI, APIs, workers, providers, runtime behavior, persistence, downloads, action buttons, Command Center actions, Ops Inbox actions, client portal exposure, external provider calls, commit, or push:
- `docs/architecture/gnr8-single-site-publish-diagnostic-snapshot-history-architecture.md`
- `docs/architecture/gnr8-single-site-publish-diagnostic-snapshot-redaction-retention-contract.md`
- `docs/product/gnr8-single-site-publish-diagnostic-snapshot-history-operator-workflow.md`
- `docs/product/gnr8-single-site-publish-diagnostic-snapshot-history-closeout.md`

## MVP-CUTLINE-1 Single-Site MVP Acceptance Cutline And End-To-End Path Audit

Canonical documentation-only acceptance cutline, gap audit, final task plan, and closeout for stopping diagnostic/governance expansion and defining the shortest safe path to a real one-site-at-a-time internal MVP. MVP-CUTLINE-1 explicitly pauses MVP-65 diagnostic snapshot persistence, freezes non-essential read-only/AAF/Ops Inbox/client portal/autonomous/batch work, defines must-have/should-have/deferred/dangerous-before-20-site-validation boundaries, identifies the remaining end-to-end orchestration/operator/readiness/deploy/20-site validation gaps, and sets the online verification trigger after commit, push, deployment, Supabase migrations, seeded real-site flow, and operator route availability. This phase does not implement SQL, services, routes, runtime behavior, UI, workers, providers, diagnostics, snapshots, persistence, external calls, commit, or push:
- `docs/architecture/gnr8-single-site-mvp-acceptance-cutline.md`
- `docs/architecture/gnr8-single-site-mvp-end-to-end-gap-audit.md`
- `docs/product/gnr8-single-site-mvp-final-task-plan.md`
- `docs/product/gnr8-single-site-mvp-cutline-closeout.md`

## MVP-CUTLINE-2 Single-Site MVP End-To-End Orchestration Service

Canonical server-only read-only orchestration contract/service for projecting the single-site MVP path from source capture through closeout, deriving deterministic step/status state, carrying source-owned blockers/warnings/limitations, and identifying one advisory next operation without adding SQL, UI, routes, Command Center buttons, action surfaces, AAF writes, gate evaluation, provider/PASR/DDOM/billing/domain/DNS calls, publish/shadow-publish/dry-run execution, runtime/active-pointer/publish-target/rollback mutation, generic publish route changes, client portal changes, Ops Inbox changes, commit, or push:
- `apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-orchestration-service.test.ts`
- `docs/product/gnr8-single-site-mvp-end-to-end-orchestration-service-closeout.md`

## MVP-CUTLINE-3 Single-Site MVP Minimal Operator Action Surface

Canonical narrow internal superadmin-only operator action facade and admin API routes for reading MVP orchestration status, preflighting requested next operations, executing only existing MVP-54 dry-run and MVP-56 shadow-publish caller logic under their current strict confirmation/feature-flag contracts, returning manual/not-implemented responses for all other operation keys, and preserving boundaries against UI buttons, generic publish route changes, client portal/Ops Inbox changes, SQL migrations, AAF writes, gate evaluation, PASR/DDOM calls, providers, DNS/domain, Vercel/Openprovider/Stripe/AI/billing/payment calls, and direct runtime/publish-target/active-pointer/rollback/public-runtime mutation:
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.ts`
- `apps/platform/gnr8/single-site/single-site-mvp-operator-action-facade.test.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/status/route.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/action/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-operator-action-route.test.ts`
- `docs/product/gnr8-single-site-mvp-minimal-operator-action-surface-closeout.md`

## MVP-CUTLINE-4 One-Site Rehearsal And Deployment Readiness Plan

Canonical documentation-only deployment and one-site rehearsal readiness plan for the first real single-site MVP rehearsal, inventorying current committed scope, required migrations, env flags, internal routes/panels, source-truth data requirements, online verification trigger/checklist, success criteria, stop criteria, shadow-publish versus MVP acceptance boundaries, and the recommended next milestone, while preserving the boundary of no runtime behavior changes, SQL changes, route/UI/service/worker/provider changes, commits, pushes, deploys, migration applications, provider calls, DNS/domain actions, billing/Stripe actions, Vercel/Openprovider actions, or production/staging Supabase calls:
- `docs/product/gnr8-single-site-one-site-rehearsal-plan.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/architecture/gnr8-single-site-mvp-migration-and-env-inventory.md`
- `docs/product/gnr8-single-site-mvp-cutline-4-closeout.md`

## MVP-CUTLINE-5 Commit/Deploy/Migration Bundle Plan

Canonical documentation-only commit/deploy/migration application bundle plan for the first one-site MVP rehearsal, classifying current git status, current docs-only uncommitted files, already committed implementation baseline, bundle inventory by single-site area, ordered migration application plan, focused precommit validation plan, env/feature-flag posture, human approval gates, online operator verification sequence, risks, split-commit recommendation, and closeout confirmations, while preserving the boundary of no staging, commits, pushes, deploys, Supabase migration applications, production/staging Supabase calls, provider/DNS/domain/billing/Stripe/Vercel/Openprovider actions, implementation changes, or runtime behavior changes:
- `docs/product/gnr8-single-site-mvp-commit-bundle-plan.md`
- `docs/product/gnr8-single-site-mvp-precommit-validation-plan.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/product/gnr8-single-site-mvp-cutline-5-closeout.md`

## MVP-CUTLINE-6 Human-Reviewed Commit Prep

Canonical documentation-only precommit validation and commit-prep closeout for the single-site MVP rehearsal docs/index bundle, recording docs/index scope verification, diff review, focused static checks, focused tests, TypeScript no-emit context, infeasible checks, post-validation boundary confirmations, online verification posture, and the next milestone while preserving the boundary of no implementation changes, SQL changes, package changes, push, deploy, Supabase migration application, production/staging Supabase call, provider/DNS/domain/billing/Stripe/Vercel/Openprovider action, publish, rollback, active-pointer mutation, or runtime behavior change:
- `docs/product/gnr8-single-site-mvp-cutline-6-commit-prep-closeout.md`

## MVP-CUTLINE-7 Release Branch Push And Deploy/Migration Readiness Gates

Canonical local-only release branch, push, deploy, migration, and online verification readiness closeout for the single-site MVP cutline bundle, confirming the expected committed docs/index HEAD, current branch and remote state, local deploy-trigger evidence, release branch strategy, push blocker, required deploy/migration/online-verification gates, required migration set, online verification decision, and boundary confirmations while preserving the boundary of no deploys, Supabase migration applications, production/staging Supabase calls, provider/DNS/domain/billing/Stripe/Vercel/Openprovider actions, publish/shadow-publish, env flag changes, implementation changes, or runtime mutation:
- `docs/product/gnr8-single-site-mvp-cutline-7-release-readiness-closeout.md`

## MVP-CUTLINE-20 Production Supabase Migration Execution

Canonical production Supabase migration execution and read-only catalog verification closeout for the single-site MVP migration prerequisite, reconciling the 18 required migration filenames, applying the approved chronological migration set to production project `ujfbpzugdsdmroqvhfvn`, confirming migration-history readback, table/RLS/trigger/AAF vocabulary catalog checks, and preserving the boundary against deploys, env changes, Vercel/provider/DNS/domain/billing/Stripe/Openprovider calls, dry-run, shadow-publish, runtime publish, online verification, commits, or pushes:
- `docs/product/gnr8-single-site-mvp-cutline-20-production-migration-execution-closeout.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-21 Online Verification Preflight

Canonical read-only online verification preflight after production migrations, confirming platform and worker health, safe single-site feature flag posture from the available production env artifact, superadmin Command Center panel access, unauthenticated admin endpoint fail-closed behavior, production migration-history/catalog/readback state, production publish target `production / active / ptt-1`, absence of selected single-site source-truth rows, dry-run readiness decision `dry_run_blocked_missing_site_data`, and the boundary of no dry-run, shadow-publish, runtime publish, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration application, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-21-online-verification-preflight.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-22 Rehearsal Candidate Source-Truth Plan

Canonical no-mutation source-truth plan for producing the first production-safe single-site rehearsal candidate, recommending a real selected production site through the canonical client-scoped import/capture-spine workflow, classifying implemented callable workflows, manual/operator-required workflows, missing implementation, unsafe paths, minimum dry-run records/refs, exact human input, and the online verification blocker while preserving the boundary of no production data writes, source capture, clone, proposal, approval, launch readiness, AAF request/decision/gate, dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-22-rehearsal-candidate-source-truth-plan.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-23 One-Site Source Capture Authorization Readback

Canonical source-capture authorization and readback stop record for the first production single-site rehearsal candidate, confirming the exact source-capture approval sentence, concrete selected `clientId`, source URL/domain, rehearsal posture, selected agency/client readback, and action-time authenticated POST confirmation were present; recording read-only platform/worker health and before/after source-truth counts; identifying that the only available authenticated browser session could not resolve agency scope for the client-scoped import workflow; and preserving the boundary of no import/capture POST, production DB write, source-truth row creation, proposal, clone acceptance, improvement execution, approval, launch readiness, AAF request/decision/gate, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-23-one-site-source-capture-readback.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-24 Agency Import Route Context Resolution

Canonical no-mutation route/auth context diagnosis for the first production single-site source-capture workflow, establishing that the client import page is membership-scoped and lacks a superadmin/admin-view page context, while the canonical client-scoped import POST route already supports superadmin/admin-view action context when the JSON body supplies `agencyId`; confirming the selected client/agency relationship from prior read-only evidence, classifying the browser posture as superadmin-capable but not agency-scoped for the importer page, selecting either the existing route-context path with fresh exact later confirmation or a new narrow no-mutation admin import preflight wrapper, and preserving the boundary of no import/capture POST, production DB write, deploy, migration, env mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-24-agency-import-route-context-resolution.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-25 One-Site Source Capture Admin-View Execution

Canonical stopped-before-mutation execution record for the first production single-site source-capture attempt through the existing admin-view capable route, confirming the exact fresh action-time approval sentence, selected client/agency/source/posture, route contract, app/worker health, superadmin page auth, and before/after production DB counts; documenting that no import/capture POST reached the network because the authenticated browser execution surface could not issue the required same-origin JSON POST and the importer page still failed closed on agency scope; and preserving the boundary of no production DB write, source-truth row creation, launch readiness, AAF request/decision/gate, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-25-one-site-source-capture-admin-view-execution.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-26 Authenticated Admin-View Import Execution Surface

Canonical narrow authenticated superadmin-only admin-view import execution surface for a future exactly-one production single-site MVP source capture, requiring strict body fields, rejecting unknown fields and actor overrides, enforcing the exact confirmation sentence and `internal test` rehearsal posture, delegating only to the existing canonical scoped import route with `url`, `agencyId`, and `adminView: true`, returning a redacted operator-safe projection, and preserving the boundary of no production import/capture execution in CUTLINE-26, no UI/client route, no dry-run, shadow-publish, runtime publish, launch readiness, AAF decision/gate behavior, provider/DNS/domain/billing/Stripe/Openprovider mutation, env mutation, deploy, migration, commit, or push:
- `apps/platform/app/api/gnr8/admin/single-site-mvp/source-capture/source-capture-route-handlers.ts`
- `apps/platform/app/api/gnr8/admin/single-site-mvp/source-capture/route.ts`
- `apps/platform/app/api/gnr8/admin/_tests/single-site-mvp-source-capture-route.test.ts`
- `docs/product/gnr8-single-site-mvp-cutline-26-authenticated-admin-view-import-execution-surface.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-26B Source-Capture Route Commit Deploy Readiness

Canonical commit/push and deploy-readiness closeout for the CUTLINE-26 admin source-capture route, confirming exact commit/push approval, branch/ref posture, route bundle commit `1cc2d495` on `main` and `origin/main`, limited changed scope, focused validation plan, expected-but-unverified Vercel auto-deploy posture, remaining production deployment verification requirement, and the boundary of no source-capture route call, no `chs.si` import/capture POST, no production data writes, no dry-run, no shadow-publish, no runtime publish, no rollback, no active pointer mutation, no migrations, no env mutation, no provider/DNS/domain/billing/Stripe/Openprovider mutation, and no AAF decision or gate attempt:
- `docs/product/gnr8-single-site-mvp-cutline-26b-source-capture-route-commit-deploy-readiness.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-26C Source-Capture Route Deployment Verification

Canonical deployment verification closeout for the CUTLINE-26 admin source-capture route, recording the human-confirmed Vercel `gnr8-platform` production branch `main` and deployed SHA `c97bee1`, local resolution to `c97bee1bfa26aef7755ffa73d9b75aa7120c60cd`, containment of route bundle commit `1cc2d495`, safe unauthenticated production preflight returning HTTP 401 with route version `mvp-cutline-26-authenticated-admin-view-import-execution-surface:v1`, deployment gate `source_capture_route_deployed`, source-capture approval `not_approved`, online verification blocked until CUTLINE-27 exact approval and one successful import/capture request, and the boundary of no valid authenticated source-capture body, no `chs.si` import/capture POST, no production data writes, no deploy, no migration, no env mutation, no provider/DNS/domain/billing/Stripe/Openprovider mutation, no dry-run, no shadow-publish, no runtime publish, no rollback, no active pointer mutation, no commit, and no push:
- `docs/product/gnr8-single-site-mvp-cutline-26c-source-capture-route-deployment-verification.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-27 One-Site Source Capture Execution Readback

Canonical blocked-before-mutation closeout for the approved CUTLINE-27 one-site source-capture execution attempt, recording exact approval present, deployment gate `source_capture_route_deployed`, selected `Glazura Glizon` client/agency/source/posture/idempotency/correlation values, production app and worker HTTP 200 health, read-only before/after production DB counts unchanged, authenticated superadmin page proof, blocked authenticated API-request execution context, source-capture/import POST count `0`, no returned site/migration/source-evidence refs, online verification status `blocked_authenticated_superadmin_api_request_context_unavailable`, and the boundary of no production source-truth writes, no old agency page import route call, no launch readiness, no approval, no AAF decision/gate attempt, no dry-run, no shadow-publish, no runtime publish, no rollback, no active pointer mutation, no provider/DNS/domain/billing/Stripe/Openprovider mutation, no deploy, no migration, no env mutation, no commit, and no push:
- `docs/product/gnr8-single-site-mvp-cutline-27-one-site-source-capture-execution-readback.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-27A Supported Authenticated Source-Capture Execution Surface

Canonical browser-clickable superadmin-only execution surface for the deployed admin source-capture route, adding a gated `Source Capture Execution` page under `/gnr8/command-center/single-site-publish/source-capture`; accepting only `clientId`, `agencyId`, `url`, `rehearsalPosture`, `idempotencyKey`, `correlationId`, and `explicitConfirmation`; disabling execution until the exact confirmation sentence is entered; submitting only to `POST /api/gnr8/admin/single-site-mvp/source-capture`; rendering only redacted response/status; preserving the existing route validations and actor override rejection; and preserving the boundary of no production source-capture POST, no `chs.si` import/capture POST, no production data write, no deploy, no migration, no env mutation, no dry-run, no shadow-publish, no runtime publish, no rollback, no active pointer mutation, no provider/DNS/domain/billing/Stripe/Openprovider mutation, no AAF decision, no gate attempt, no commit, and no push:
- `apps/platform/gnr8/single-site/single-site-mvp-source-capture-execution-contract.ts`
- `apps/platform/app/gnr8/command-center/single-site-publish/source-capture/page.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSiteMvpSourceCaptureExecutionSurface.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx`
- `apps/platform/app/gnr8/command-center/single-site-publish/single-site-publish-operator-panel.test.tsx`
- `docs/product/gnr8-single-site-mvp-cutline-27a-supported-authenticated-source-capture-execution-surface.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-27C One-Site Source-Capture Post-Submit Readback

Canonical read-only production DB readback after the human submitted exactly one source-capture request through the deployed superadmin UI, confirming selected site `a03fcb5b-6ad9-4b19-a682-4c06f998881a`, selected migration `682a09fd-8fd5-4f73-93b8-54f5d4067c63`, source evidence review `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3`, selected source-domain/migration/source-evidence counts changing from zero to first source-truth rows, launch readiness/publish operator action/AAF request/AAF decision/AAF gate counts remaining zero, runtime active pointers unchanged at `6`, online verification status `source_capture_completed_pending_review_or_next_step`, and the boundary of no second source-capture POST, no production mutation by Codex, no dry-run, no shadow-publish, no runtime publish, no rollback, no active pointer mutation, no provider/DNS/domain/billing/Stripe/Openprovider mutation, no deploy, no migration, no env mutation, no commit, and no push:
- `docs/product/gnr8-single-site-mvp-cutline-27c-one-site-source-capture-post-submit-readback.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-28 Source Evidence Operator Review

Canonical source evidence operator review closeout for the first production single-site rehearsal site, recording source evidence review `40c0b86c-0349-4b7c-89c2-bfdef7e9fea3` moving from `ready_for_review` to `accepted` through the existing `SourceEvidenceReviewService.accept(...)` workflow; confirming all ten required evidence categories were present, warnings were non-blocking, no P0 blockers existed, one production source-review event `c7b33fae-d62d-40ac-b8d9-74758db328cd` was inserted, review `clone_generation_allowed=true`, online verification status `source_evidence_review_accepted_pending_clone`, and the boundary of no clone/proposal/improvement/approval/launch-readiness/dry-run/shadow-publish/runtime-publish/rollback/active-pointer/provider/DNS/domain/billing/Stripe/Openprovider/deploy/migration/env/commit/push mutation:
- `docs/product/gnr8-single-site-mvp-cutline-28-source-evidence-operator-review.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-29 One-Site Clone Generation And Review

Canonical clone generation and clone review closeout for the accepted first production single-site rehearsal evidence, recording exact clone-generation approval present, safe path `startSingleSiteCloneGeneration(..., { executor: singleSiteRealCloneExecutor })` plus `CloneReviewService.createOrReuseReview(...)` and `CloneReviewService.accept(...)`, clone runtime site version `6b172a5b-200e-471c-9599-5dc70f04ea53`, clone runtime artifact `929106cd-fa19-47eb-9582-ce6931d0e370`, clone semantic output watermark `sha256:b27fb986be0366de66a1577e0d1771fbc053affa5b7329a0294e2f0c7fae5522`, clone review `79176567-4911-4900-bc86-0fefa6043fbe` accepted with `proposal_planning_allowed=true`, online verification status `clone_review_accepted_pending_proposal`, forbidden proposal/improvement/approval/readiness/publish/AAF counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no proposal planning, implementation authorization, improvement execution, approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-29-one-site-clone-generation-review.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-30 Proposal Planning For Accepted Clone

Canonical proposal planning closeout for the accepted first production single-site rehearsal clone, recording exact proposal-planning approval present, safe path `ImprovementProposalPlanningService.createOrReuseProposalPlan(...)` plus `addFinding(...)`, `addRecommendation(...)`, and `markReadyForReview(...)`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571`, proposal status `ready_for_review`, four selected recommendations, four findings, categories `content_clarity`, `conversion`, `mobile_responsive`, and `trust_credibility`, proposal semantic watermark `sha256:22fd5d1cfbb488a3153cd6ddba186ea7f2b8676a6c96521ae8f4d98771f8a42a`, proposal approval required next, online verification status `proposal_plan_created_pending_approval`, forbidden implementation/improved-review/approval/readiness/publish/AAF counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no implementation authorization, improvement execution, improved candidate creation, approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-30-proposal-planning-accepted-clone.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-31 Proposal Approval

Canonical proposal approval closeout for the first production single-site rehearsal plan, recording exact proposal-approval authorization present, safe path `ImprovementProposalPlanningService.approve(...)`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571`, proposal status `ready_for_review` -> `approved`, plan version `2` -> `3`, proposal approval event `f7320eae-2426-4c8e-ab91-0cfdac135d82`, proposal approval state event `54ace8d6-401c-4ade-9ad2-ec4539dc3642`, four accepted recommendation ids, proposal semantic watermark `sha256:22fd5d1cfbb488a3153cd6ddba186ea7f2b8676a6c96521ae8f4d98771f8a42a`, implementation authorization required next, online verification status `proposal_approved_pending_implementation_authorization`, forbidden implementation-authorization/improvement/improved-review/content-client-launch/readiness/publish/AAF counts remaining zero, selected site runtime active pointers `0`, and the boundary of no implementation authorization, improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-31-proposal-approval.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-32 Implementation Authorization Request

Canonical prepared-but-blocked implementation authorization request closeout for the first production single-site rehearsal plan, recording exact authorization-request approval present, read-only production preflight with proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` approved at version `3`, proposal approval event `f7320eae-2426-4c8e-ab91-0cfdac135d82`, state event `54ace8d6-401c-4ade-9ad2-ec4539dc3642`, four expected accepted recommendation ids matched, existing bridge path `SingleSiteImplementationAuthorizationBridge.prepareImplementationAuthorizationRequest(...)` inspected, requested prompt scope `single_site_implementation_authorization` differing from installed bridge scope `single_site_improvement_implementation_authorization`, production proposal approval refs being proposal-event refs rather than bridge-required AAF proposal approval request/decision/evidence refs, no AAF evidence package or approval request created, prepared request semantic watermark `single-site-implementation-authorization-prepared-request:0080ccebb14b10e47572f2057a639c8ad97457d54a67d680ac6208beb5bd1fad`, online verification status `implementation_authorization_request_blocked`, forbidden AAF request/decision/gate/improvement/improved-review/content-client-launch/readiness/publish counts remaining zero, runtime active pointers unchanged at `6`, selected site runtime active pointers `0`, and the boundary of no authorization decision, improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-32-implementation-authorization-request.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`

## MVP-CUTLINE-33 Implementation Authorization Bridge Alignment

Canonical local bridge-alignment closeout for preparing exact-scope implementation authorization requests from proposal-event approval evidence, recording canonical scope `single_site_improvement_implementation_authorization`, shorter scope `single_site_implementation_authorization` rejected, bridge input extended to accept explicit proposal-event refs `f7320eae-2426-4c8e-ab91-0cfdac135d82` and state event `54ace8d6-401c-4ade-9ad2-ec4539dc3642` as evidence for proposal plan `f541075c-4641-4f70-b5ff-64a8af071571`, proposal-event approval kept evidence-only and not treated as implementation authorization decision truth, no SQL migration required, focused bridge test, AAF contract test, and focused TypeScript no-emit passed, broad platform TypeScript no-emit still blocked by unrelated existing fixture diagnostics with no touched-file diagnostics, online verification status remaining `implementation_authorization_request_blocked` until bridge code deploy and later authorized retry, production AAF evidence/request/decision/gate rows created by this task `0`, and the boundary of no production Supabase write, authorization decision, improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider call, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-33-implementation-authorization-bridge-alignment.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.ts`
- `apps/platform/gnr8/single-site/implementation-authorization-bridge.test.ts`
- `apps/platform/gnr8/single-site/improvement-execution-service.ts`
- `packages/gnr8-runtime-contracts/src/aaf-contracts.test.ts`

## MVP-CUTLINE-34B Implementation Authorization Bridge Deployment Verification

Canonical deployment verification closeout for the CUTLINE-33 implementation authorization bridge alignment, recording human-reported `gnr8-platform` production branch/SHA `main` / `2caf3f8`, resolved SHA `2caf3f82745484200f9b10997f7f360f6c0c6366`, local `main`, local `origin/main`, and remote `refs/heads/main` all resolving to that commit, deployed SHA on `origin/main`, deployed SHA containing `implementation-authorization-bridge.ts`, `implementation-authorization-bridge.test.ts`, and `aaf-contracts.test.ts`, deployed alignment preserving canonical scope `single_site_improvement_implementation_authorization`, rejecting shorter scope `single_site_implementation_authorization`, accepting proposal-event approval refs as evidence only, safe production app health HTTP `200`, deployment gate `implementation_authorization_bridge_deployed`, authorization request retry `not_run`, online verification status remaining `implementation_authorization_request_blocked` until CUTLINE-35 creates exact-scope AAF request/evidence rows, production AAF evidence/request/decision/gate rows created by this task `0`, and the boundary of no authorization retry, authorization decision, improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-34b-implementation-authorization-bridge-deployment-verification.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-35 Implementation Authorization Request Creation

Canonical production AAF implementation authorization request/evidence creation closeout for the approved `chs.si` single-site proposal, recording exact authorization-request approval present, deployed bridge gate `implementation_authorization_bridge_deployed`, workflow path `SingleSiteImplementationAuthorizationBridge.prepareImplementationAuthorizationRequest(...)` via `AafWriterRepository`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` approved at version `3`, four expected selected recommendation refs matched, exact scope `single_site_improvement_implementation_authorization`, deployed canonical action `start_single_site_improvement_implementation`, prompt-requested action label `authorize_single_site_improvement_implementation` noted as a wording mismatch against the persisted contract, evidence package `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3`, approval request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, request status `requested`, policy result `approval_required`, semantic watermark `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`, freshness `fresh` with no expiry, proposal-event approval refs `f7320eae-2426-4c8e-ab91-0cfdac135d82` and `54ace8d6-401c-4ade-9ad2-ec4539dc3642` recorded as evidence only with no implementation authorization decision substitution, online verification status `implementation_authorization_requested_pending_decision`, forbidden AAF decision/gate/improvement/improved-review/content-client-launch/readiness/publish counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no authorization decision/grant, gate attempt, improvement execution, improved candidate, content/client/launch approval, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-35-implementation-authorization-request-creation.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-36 Human AAF Implementation Authorization Decision

Canonical production human AAF implementation authorization decision closeout for the approved `chs.si` single-site proposal, recording exact grant approval present, workflow path `AafWriterRepository.createApprovalDecisionTransaction(...)`, deterministic idempotency/correlation base `gnr8-cutline-36-chs-si-implementation-authorization-decision-20260818`, exact-scope decision `12adb404-b9f6-4961-aa7a-63e24e023b12` with status `granted`, request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, evidence package `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3`, decision evidence link `364698fe-08e0-4bb6-b8cf-f4bda20a583f`, audit event `ecebbc77-e924-4ed5-be4f-18b0b7352f4f`, audit refs `76565aaf-24ba-482e-ba6d-ac99f06011e9`, `24a2ea4b-0f53-4ee7-b822-634bee4570ca`, `7dabe73d-38a7-4273-a264-b2d63db9713c`, and `1c64555e-8d25-4531-918b-1383dd7ebb53`, scope/action `single_site_improvement_implementation_authorization` / `start_single_site_improvement_implementation`, subject `single_site_improvement_proposal_plan` / `f541075c-4641-4f70-b5ff-64a8af071571`, policy version/result `MVP-18` / `approval_required`, policy evaluation `fcc739bf-b1be-4e40-86d9-aae45abc9949`, semantic watermark `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`, freshness `fresh`, no expiry, no carried limitations, online verification status `implementation_authorization_granted_pending_improvement_execution`, forbidden AAF gate/improvement/improved-review/content-client-launch/readiness/publish counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no gate attempt, improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-36-human-aaf-implementation-authorization-decision.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-37 Authorized Improvement Execution Candidate Readback

Canonical blocked production improvement execution closeout for the approved `chs.si` single-site proposal, recording exact improvement-execution approval present, deterministic idempotency/correlation base `gnr8-cutline-37-chs-si-improvement-execution-20260820`, inspected/used workflow path `ImprovementExecutionAafValidator.validateImprovementExecutionAuthorization(...)` followed by `ImprovementExecutionService.createOrReuseExecutionAttempt(...)`, MVP-20 validation result `blocked` / `evidence_stale` with blocker `evidence_watermark_mismatch`, MVP-21 execution guard `improvement execution requires implementation authorization ref`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` read back with `implementation_authorization_attached=false` and empty implementation authorization refs, no execution attempt id, no improved candidate site version/artifact, no semantic output watermark, online verification status `improvement_execution_blocked`, forbidden improved-review/content-client-launch/readiness/publish counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no improved version review acceptance, content/client/launch approval, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing mutation, active pointer mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-37-authorized-improvement-execution-candidate-readback.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-37A Attach Implementation Authorization Refs

Canonical production implementation authorization ref attachment closeout for the approved `chs.si` single-site proposal, recording exact attachment approval present, deterministic idempotency/correlation base `gnr8-cutline-37a-chs-si-attach-implementation-authorization-20260820`, safe workflow path direct read-only AAF validity readback followed by `ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)`, granted decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, evidence package `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3`, semantic watermark `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` moving `implementation_authorization_attached=false` to `true` and plan version `3` to `4`, proposal implementation authorization ref `94ee9cf8-2efd-49a0-b821-28a2d5ca7348`, proposal event `5e7dc7ef-0ad5-4fb5-a763-c5a5c830d2ce`, no state event because migration state was already `improvement_proposal_approved`, MVP-20 semantic replay not run because original operator-note hash inputs are not echoed in persisted AAF rows, online verification status `implementation_authorization_attached_pending_improvement_execution`, forbidden improvement/improved-review/content-client-launch/readiness/gate counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no improvement execution attempt, improved candidate creation, content/client/launch approval chain, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing mutation, active pointer mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-37a-attach-implementation-authorization-refs.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-38 Authorized Improvement Execution Retry

Canonical blocked production improvement execution retry closeout for the approved `chs.si` single-site proposal, recording exact improvement-execution approval present, deterministic idempotency/correlation base `gnr8-cutline-38-chs-si-improvement-execution-20260820`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` read back with `implementation_authorization_attached=true`, attached implementation authorization request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, evidence package `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3`, proposal authorization ref `94ee9cf8-2efd-49a0-b821-28a2d5ca7348`, attachment event `5e7dc7ef-0ad5-4fb5-a763-c5a5c830d2ce`, semantic watermark `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`, direct AAF decision readback `granted` / exact scope / matching request-evidence-subject / fresh / no expiry / no limitations, workflow path `ImprovementExecutionAafValidator.validateImprovementExecutionAuthorization(...)` only, MVP-20 validation result `allowed=false`, mode `blocked`, reason `evidence_stale`, blocker code `policy_version_mismatch`, semantic replay mismatch with best reconstructable watermark `single-site-implementation-authorization:1949f45661be2cae6bf32419177ac7d658192eb198fbb97551e90458b130749b`, stale roles `implementation_target`, `implementation_attempt_placeholder`, `implementation_scope_summary`, `implementation_non_goals`, `operator_notes`, and `freshness_check`, no MVP-21 execution attempt, no MVP-23 dry-run, no MVP-24 improved candidate creation, no execution attempt id, no improved candidate site version/artifact, no applied/not-applied recommendations, no semantic output watermark, online verification status `improvement_execution_blocked`, forbidden improved-review/content-client-launch/readiness/publish/gate/publish-activation counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, and the boundary of no improved version review acceptance, content/client/launch approval, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing mutation, active pointer mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-38-authorized-improvement-execution-retry.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-39 MVP-20 Semantic Replay Reconciliation

Canonical local semantic replay reconciliation for MVP-20 implementation authorization validation, recording root cause that CUTLINE-35 AAF evidence/request rows persisted the final semantic watermark but not the full original authorization semantic input, including implementation target, implementation attempt placeholder, scope summary, non-goals, operator notes, and original freshness policy/version data; fixed future bridge writes by storing a versioned `implementationAuthorizationSemanticReplay` contract in existing AAF evidence package JSON; fixed execution-time validation by replaying stored canonical authorization semantic input and stored authorization policy version while preserving fail-closed stale/revoked/superseded/expired/wrong-scope/wrong-subject/wrong-evidence checks; no SQL migration required; proposal-event approval refs remain evidence only; missing or mismatched replay data blocks; existing production AAF request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, and evidence package `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` cannot be reused because they lack the new stored replay contract; CUTLINE-40 must create a fresh implementation authorization request/evidence package and obtain a fresh decision after deployment; focused bridge tests, MVP-20 validator tests, and focused TypeScript no-emit passed; and the boundary of no production AAF mutation, improvement execution attempt, improved candidate creation, content/client/launch approval chain, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing mutation, active pointer mutation, deploy, production migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-39-mvp20-semantic-replay-reconciliation.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-39C MVP-20 Semantic Replay Fix Deployment Verification

Canonical deployment verification closeout for the CUTLINE-39 MVP-20 semantic replay fix, recording human-reported `gnr8-platform` production branch/SHA `main` / `023a5d4`, resolved SHA `023a5d4fcd37485ac17d739150e8d163218e3b7a`, local `main`, local `origin/main`, and remote `refs/heads/main` all resolving to that commit, deployed SHA on `origin/main`, deployed SHA containing `implementation-authorization-bridge.ts`, `improvement-execution-aaf-validator.ts`, `implementation-authorization-bridge.test.ts`, and `improvement-execution-aaf-validator.test.ts`, deployed fix evidence for stored versioned `implementationAuthorizationSemanticReplay`, replay-based validation, and fail-closed missing/mismatched replay blockers, safe production app health HTTP `200`, deployment gate `mvp20_semantic_replay_fix_deployed`, fresh authorization request status `not_created`, improvement execution retry status `not_run`, online verification status `blocked_pending_cutline_40_fresh_aaf_request_decision_with_replay_data`, existing production AAF request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, and evidence `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` not reusable, and the boundary of no production AAF write, fresh authorization request/decision, attach refs, improvement execution, improved candidate creation, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-39c-mvp20-semantic-replay-fix-deployment-verification.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-40 Fresh Implementation Authorization Request With Replay Data

Canonical production AAF request/evidence closeout for a fresh exact-scope implementation authorization request using the deployed MVP-20 semantic replay fix, recording exact fresh request approval present, workflow path `SingleSiteImplementationAuthorizationBridge.prepareImplementationAuthorizationRequest(...)` via `AafWriterRepository`, deployment gate `mvp20_semantic_replay_fix_deployed`, idempotency base `gnr8-cutline-40-chs-si-implementation-authorization-request-replay-v2-20260820`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` approved at version `4`, accepted recommendation refs matched, fresh evidence package `b4ddb218-ce37-42ab-b2f3-433138df6489`, fresh approval request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, request status `requested`, exact scope/action/subject/evidence type, semantic watermark `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`, stored `implementationAuthorizationSemanticReplay` contract `single_site_implementation_authorization_semantic_replay` version `1`, replay roles/components and freshness present, proposal-event approval refs evidence-only, old request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, and evidence `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` not reused, forbidden downstream counts clean, runtime active pointers unchanged, online verification status `fresh_implementation_authorization_requested_pending_decision`, and the boundary of no human decision, approval grant, AAF gate attempt, proposal attach refs, improvement execution, improved candidate, content/client/launch approval, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-40-fresh-implementation-authorization-request-replay-data.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-41 Fresh Human AAF Implementation Authorization Decision

Canonical production human AAF implementation authorization decision closeout for the fresh replay-backed `chs.si` request, recording exact fresh grant approval present, workflow path `AafWriterRepository.createApprovalDecisionTransaction(...)`, deterministic idempotency/correlation base `gnr8-cutline-41-chs-si-fresh-implementation-authorization-decision-replay-v2-20260820`, exact-scope decision `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0` with status `granted`, request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, evidence package `b4ddb218-ce37-42ab-b2f3-433138df6489`, decision evidence link `c360081e-2913-422d-b5a9-3fe90cbbbc5c`, audit event `cc287a3a-1a56-505c-979a-7cee89a58699`, audit refs `4eab7abe-6917-4bde-9a89-0cc8108b8360`, `01e763ae-58dc-4f8f-bb70-7ed5e446ac76`, `33d6258e-a67e-4422-948d-a4b1bdd12426`, `169c4675-6962-470a-a49a-ec20fb40ae1a`, `49b9d29b-f86b-4b79-9286-83a12af8de2a`, `b3e450be-5b37-4c32-bb9e-411891aec58b`, and `b61c0a03-9d2d-41c2-8486-88d0a115e6dd`, scope/action `single_site_improvement_implementation_authorization` / `start_single_site_improvement_implementation`, subject `single_site_improvement_proposal_plan` / `f541075c-4641-4f70-b5ff-64a8af071571`, policy version/result `MVP-18` / `approval_required`, policy evaluation `365afbf6-e078-45ae-86c6-7790df9bec88`, replay contract/version `single_site_implementation_authorization_semantic_replay` / `1`, semantic watermark `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`, freshness `fresh`, no expiry, no carried limitations, online verification status `fresh_implementation_authorization_granted_pending_attach_refs`, forbidden AAF gate/improvement/improved-review/content-client-launch/readiness/publish counts remaining zero, downstream AAF content/client/launch approval decisions remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, active pointer fingerprint unchanged, and the boundary of no proposal attach refs, gate attempt, improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-41-fresh-human-aaf-implementation-authorization-decision.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-42 Attach Fresh Implementation Authorization Refs

Canonical production proposal attachment closeout for fresh replay-backed implementation authorization refs, recording exact fresh attachment approval present, workflow path direct read-only AAF/replay readback plus `SingleSiteImplementationAuthorizationBridge.validateImplementationAuthorizationRef(...)` followed by `ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)`, deterministic idempotency/correlation base `gnr8-cutline-42-chs-si-attach-fresh-implementation-authorization-replay-v2-20260820`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571`, old attached CUTLINE-37A refs request `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`, decision `12adb404-b9f6-4961-aa7a-63e24e023b12`, and evidence `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` reconciled to fresh request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, fresh decision `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`, and fresh evidence package `b4ddb218-ce37-42ab-b2f3-433138df6489`, replay contract/version `single_site_implementation_authorization_semantic_replay` / `1`, attached replay watermark `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`, bridge validation `valid=true` with status `granted`, proposal status remaining `approved`, initial attachment plan version `4` -> `5`, idempotent readback `5` -> `5`, proposal auth ref `21fd1ce8-0531-4f40-a944-1f46d481f395`, proposal event `635188b5-5720-4be0-bf38-0478f573f23a`, state event `null`, read-only MVP-20 validation `allowed=true` mode `allowed` reason `authorization_valid` with no blockers and all replay drift checks matched, online verification status `fresh_implementation_authorization_attached_pending_improvement_execution`, forbidden improvement/improved-review/content-client-launch/readiness/publish/gate/downstream-approval counts remaining zero, runtime active pointers unchanged at `6`, selected runtime active pointers `0`, active pointer fingerprint unchanged, and the boundary of no improvement execution, improved candidate creation, content/client/launch approval chain, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-42-attach-fresh-implementation-authorization-refs.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-43 Authorized Improvement Execution Candidate Readback

Canonical production authorized improvement execution readback for chs.si, recording exact improvement-execution approval present, deterministic idempotency/correlation base `gnr8-cutline-43-chs-si-improvement-execution-20260820`, fresh attached refs request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, decision `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`, evidence package `b4ddb218-ce37-42ab-b2f3-433138df6489`, proposal auth ref `21fd1ce8-0531-4f40-a944-1f46d481f395`, replay contract/version `single_site_implementation_authorization_semantic_replay` / `1`, replay watermark `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`, AAF decision readback `granted`, exact scope, matching subject/request/evidence, replay present, fresh/not expired/not revoked/not superseded, execution-time MVP-20 validation `allowed=true` mode `allowed` reason `authorization_valid` with blocker codes `[]` and all drift checks matched, MVP-21 service blocker `proposal approval request ref is required` before attempt creation because proposal approval is stored as proposal-event evidence while the execution service still expects AAF-shaped proposal approval refs, `improvementExecutionAttemptId` not created, no improved candidate site version or runtime artifact, applied/not-applied recommendations none because MVP-23/MVP-24 did not run, online verification status `improvement_execution_blocked`, forbidden downstream counts remaining clean, runtime active pointers unchanged at `6`, selected active pointers `0`, active pointer fingerprint `67f2f987170cbf15dcd4733ac174a2df6e73bb7f0079f68c5818a79a08a5eeab`, and the boundary of no execution attempt, improved candidate, improved review acceptance, content/client/launch approval, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing mutation, active pointer mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-43-authorized-improvement-execution-candidate-readback.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-44 MVP-21 Proposal Approval Ref Alignment

Canonical local MVP-21 service-boundary alignment closeout for accepting proposal-event approval evidence at improvement execution attempt creation, recording that `ImprovementExecutionService.createOrReuseExecutionAttempt(...)` now supports both existing AAF-shaped proposal approval refs and `approvalSource: "proposal_event"` evidence refs for the proposal-approval prerequisite; proposal-event refs remain evidence only and cannot substitute for implementation authorization request/decision/evidence, execution-time MVP-20 validation, AAF gate attempt, improvement execution approval, or publish approval; missing proposal approval, unapproved proposal/event status, wrong proposal identity/watermark metadata, missing fresh MVP-20 validation status, stale/mismatched implementation authorization refs, wrong implementation authorization source/scope, and proposal-event-as-implementation-authorization substitution block fail-closed; no SQL migration is required; focused MVP-21 tests passed 13/13, bridge/MVP-20 validator tests passed 22/22, touched-file TypeScript diagnostics are clean while broad platform no-emit remains blocked by unrelated fixture diagnostics; and the boundary of no production rows, execution attempts, improved candidates, AAF rows, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider action, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-44-mvp21-proposal-approval-ref-alignment.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-44B MVP-21 Alignment Deployment Verification

Canonical deployment verification blocker for the CUTLINE-44 MVP-21 proposal approval ref alignment, recording human deployment context that commit, push, and Vercel production deploy occurred after CUTLINE-44 but no exact Vercel production deployed SHA was available from the task text, local docs, local Vercel metadata, or local CLI metadata; local `HEAD`, local `origin/main`, and remote `refs/heads/main` resolve to `ed06b61c93c78af54432fd01eb3af412c1e2abc3` (`Align MVP-21 approval refs`), that candidate SHA is on `origin/main` and contains `improvement-execution-service.ts` plus `improvement-execution-service.test.ts` with proposal-event approval evidence support and implementation-authorization substitution blockers, safe production app health returned HTTP `200` from Vercel, deployment gate remains `blocked_deployed_sha_missing_cutline_44`, improvement execution retry status remains `not_run`, online verification is `blocked_pending_cutline_44b_vercel_deployed_sha_confirmation`, and the boundary of no production improvement execution, execution attempt, improved candidate, AAF row, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider/Vercel mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-44b-mvp21-alignment-deployment-verification.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-44C MVP-21 Alignment Deployed SHA Confirmation

Canonical deployed SHA confirmation for the CUTLINE-44 MVP-21 proposal approval ref alignment, recording human-confirmed `gnr8-platform` production branch/SHA `main` / `ed06b61`, resolved full SHA `ed06b61c93c78af54432fd01eb3af412c1e2abc3`, exact match with the CUTLINE-44B candidate, SHA on `origin/main`, commit subject `Align MVP-21 approval refs`, deployed SHA containing `apps/platform/gnr8/single-site/improvement-execution-service.ts` and `apps/platform/gnr8/single-site/improvement-execution-service.test.ts` with proposal-event approval evidence support and implementation-authorization substitution blockers, deployment gate `mvp21_proposal_approval_ref_alignment_deployed`, improvement execution retry status `not_run`, online verification status `ready_for_cutline_45_fresh_improvement_execution_retry`, and the boundary of no production improvement execution, execution attempt, improved candidate, AAF row, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider/Vercel mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-44c-mvp21-alignment-deployed-sha-confirmation.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-45 Improvement Execution Candidate Readback

Canonical blocked production improvement execution retry readback for `chs.si`, recording exact improvement-execution approval present, deterministic idempotency/correlation base `gnr8-cutline-45-chs-si-improvement-execution-20260820`, deployment gates `mvp20_semantic_replay_fix_deployed` and `mvp21_proposal_approval_ref_alignment_deployed`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` approved at version `5`, fresh attached implementation authorization request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, decision `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`, evidence package `b4ddb218-ce37-42ab-b2f3-433138df6489`, proposal auth ref `21fd1ce8-0531-4f40-a944-1f46d481f395`, replay watermark `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`, MVP-20 validation `allowed=true` mode `allowed` reason `authorization_valid` with blocker codes `[]` and all replay drift checks matched, exactly one MVP-21 `ImprovementExecutionService.createOrReuseExecutionAttempt(...)` call blocked before persistence with `proposal approval request ref is required` because proposal approval event `f7320eae-2426-4c8e-ab91-0cfdac135d82` and state event `54ace8d6-401c-4ade-9ad2-ec4539dc3642` exist but proposal plan `approval_refs_json` does not persist `proposalEventId` / `stateEventId`, no execution attempt id, no improved candidate site version or runtime artifact, no applied/not-applied recommendation rows, no semantic output watermark, online verification status `improvement_execution_blocked_pending_proposal_approval_event_ref_persistence`, forbidden downstream counts remaining clean, runtime active pointers unchanged at `6`, selected active pointers `0`, active pointer fingerprint `03825da8ea15570a6abe3e331f529f7a`, and the boundary of no improved candidate review acceptance, content/client/launch approval, launch readiness, publish activation request/decision/gate, publish dry-run, shadow-publish, runtime publish, provider/DNS/domain/billing mutation, active pointer mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-45-improvement-execution-candidate-readback.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-45A Reconcile Proposal Refs And Execute

Canonical production reconciliation and authorized improvement execution closeout for `chs.si`, recording exact approval sentence present, deterministic idempotency/correlation base `gnr8-cutline-45a-chs-si-reconcile-and-execute-20260820`, proposal plan `f541075c-4641-4f70-b5ff-64a8af071571` remaining `approved` version `5`, direct guarded JSONB reconciliation of proposal `approval_refs_json` from metadata-only approval refs to proposal-event refs `proposalEventId=f7320eae-2426-4c8e-ab91-0cfdac135d82` and `stateEventId=54ace8d6-401c-4ade-9ad2-ec4539dc3642`, no AAF proposal approval row creation and no proposal-event substitution for implementation authorization truth, fresh implementation authorization request `0b3a888e-cc6a-4cc1-bc53-476d70a20144`, decision `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`, evidence package `b4ddb218-ce37-42ab-b2f3-433138df6489`, proposal auth ref `21fd1ce8-0531-4f40-a944-1f46d481f395`, replay watermark `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`, MVP-20 validation `allowed=true` mode `allowed` reason `authorization_valid` with blocker codes `[]`, MVP-21 execution attempt `6dc259c1-b659-4d64-95f2-3858803eb470` completed with limitations, improved candidate site version `gnr8:site_version:a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, improved runtime artifact `gnr8:runtime_artifact:1f80138a-39c2-4210-ac61-16200e5a2254`, semantic output watermark `single-site-improved-candidate-creation-output:33927ef17c44860377b45e6f367d30df45ed2fec4f8bebafe3ba8aa97b67f612`, no applied recommendations because production recommendation rows lacked deterministic operator-authored change payloads, not-applied recommendations recorded for `0be61bde-6568-4f33-8499-4d5eade70837`, `73de9484-1461-4476-b677-f41d7a839df7`, `86342f67-7cce-43de-823f-ea0f4adc1a41`, and `a61e857e-89c1-4ab1-bdc1-581a24e824c1`, narrow completion repair after service duplicate semantic migration-ref guard `idx_gnr8_single_site_migration_refs_semantic_uq`, migration state readback `improvement_implementation_completed`, online verification status `improved_candidate_created_pending_review_no_publish`, forbidden downstream review/content/client/launch/readiness/publish/AAF gate counts `0`, runtime active pointers total `6`, selected active pointers `0`, and the boundary of no improved candidate acceptance/rejection/review, content/client/launch approval, launch readiness, publish activation, publish dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-45a-reconcile-proposal-refs-and-execute.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-46 Improved Candidate Review

Canonical production improved candidate review closeout for `chs.si`, recording exact approval sentence present, read-only preflight integrity for execution attempt `6dc259c1-b659-4d64-95f2-3858803eb470`, improved candidate site version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, runtime artifact `1f80138a-39c2-4210-ac61-16200e5a2254`, runtime site `site_57d9665a3a5867edf6ef`, review id `bc642626-1242-427a-96ed-8003b881e71c`, decision/status `accept_with_limitations` / `accepted_with_limitations`, decision event id `0c09ae9b-5e8c-475e-ac9d-b6304bcf1e5c`, accepted limitations for four unapplied recommendations without inventing applied changes, content approval eligibility next with limitations, active pointers unchanged at total `6` and selected/candidate `0`, forbidden downstream approval/readiness/publish/AAF counts `0`, online verification status `improved_candidate_reviewed_accepted_with_limitations_pending_content_approval_no_publish`, and the boundary of no content/client/launch approval, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-46-improved-candidate-review.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-47 Content Approval

Canonical production content approval closeout for the accepted-with-limitations `chs.si` improved candidate, recording exact approval sentence present, deterministic idempotency/correlation base `gnr8-cutline-47-chs-si-content-approval-20260821`, workflow path `ContentApprovalService.createOrReuseContentApproval(...)`, `SingleSiteContentApprovalAafBridge.prepareContentApprovalRequest(...)`, `AafWriterRepository.createApprovalDecisionTransaction(...)`, bridge validation, AAF request/decision ref attachment, and `ContentApprovalService.approveWithLimitations(...)`, content approval `319c360a-d7d4-4a3e-9c3b-6daecd930e02` with status/decision `approved_with_limitations` / `approve_with_limitations`, AAF request `437e05f9-df87-4bb7-8478-466495c06fd1`, AAF decision `67ec5313-a122-456c-8476-7abd9fb772e5` with status `granted_with_limitations`, evidence package `dca2c91e-3449-4ec9-aba9-833f22ccccf8`, decision evidence link `2594e39f-29bb-4469-8655-47fe2b38f7b1`, request audit event `5d1a40bd-20fc-4df0-9979-5c770021efb9`, decision audit event `fd6445aa-69aa-4fae-a269-0b091d9f3134`, service decision event `1b54da3c-5cd5-430b-91fb-61177f92a506`, AAF validation `valid=true` with blocker codes `[]`, four unique CUTLINE-46 accepted limitations carried forward without inventing applied changes, warning that persisted limitation JSON repeats the same unique set due MVP-29 validation/service merge behavior, client approval eligibility next `ready=true` with missing requirements `[]`, migration state `content_approved`, active pointers unchanged at total `6` and selected/candidate `0`, forbidden downstream client/launch/readiness/publish/AAF gate counts `0`, online verification status `content_approval_granted_with_limitations_pending_client_approval_no_publish`, and the boundary of no client approval, launch approval, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-47-content-approval.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-48 Client Approval

Canonical production client approval closeout for the content-approved-with-limitations `chs.si` improved candidate, recording exact approval sentence present, deterministic idempotency/correlation base `gnr8-cutline-48-chs-si-client-approval-20260821`, workflow path `ClientApprovalService.createOrReuseClientApproval(...)`, `SingleSiteClientApprovalAafBridge.prepareClientApprovalRequest(...)`, `AafWriterRepository.createApprovalDecisionTransaction(...)`, bridge validation, AAF request/decision ref attachment, and `ClientApprovalService.approveWithLimitations(...)`, client approval `f764ee08-b912-458f-a25e-a26d2921ef7c` with status/decision `approved_with_limitations` / `approve_with_limitations`, AAF request `9c4597b0-9706-478c-b4da-5a02a82da0dd`, AAF decision `b8001dfa-0d8e-40be-bdc3-18544530a0e9` with status `granted_with_limitations`, evidence package `2d41f7ea-2f76-4982-bcf6-65310e9d9589`, decision evidence link `a8b019b5-59f6-42c0-9dff-d517b2693589`, request audit event `25506ccf-933e-4c7b-8ce9-ebbf1d57a957`, decision audit event `adb2decb-23af-4dc0-aa5b-97063be03d9e`, service decision event `e9d4ba66-041f-40de-877b-3a72b9cee60e`, AAF validation `valid=true` with blocker codes `[]`, four unique CUTLINE-46/CUTLINE-47 accepted limitations carried forward without inventing applied changes or client-facing endorsement beyond internal MVP rehearsal scope, warning that persisted limitation JSON repeats the same unique set through MVP-33 validation/service merge behavior, launch approval eligibility next `ready=true` with missing requirements `[]`, migration state `client_approval_required`, active pointers unchanged at total `6` and selected/candidate `0`, forbidden downstream launch/readiness/publish/AAF gate counts `0`, online verification status `client_approval_granted_with_limitations_pending_launch_approval_no_publish`, and the boundary of no launch approval, launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-48-client-approval.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

## MVP-CUTLINE-49 Launch Approval

Canonical production launch approval closeout for the client-approved-with-limitations `chs.si` improved candidate, recording exact approval sentence present, deterministic idempotency/correlation base `gnr8-cutline-49-chs-si-launch-approval-20260821`, workflow path `LaunchApprovalService.createOrReuseLaunchApproval(...)`, `SingleSiteLaunchApprovalAafBridge.prepareLaunchApprovalRequest(...)`, `AafWriterRepository.createApprovalDecisionTransaction(...)`, bridge validation, AAF request/decision ref attachment, and `LaunchApprovalService.approveWithLimitations(...)`, launch approval `1880858f-bf44-46af-8f00-cb80b5a1ef2f` with status/decision `approved_with_limitations` / `approve_with_limitations`, AAF request `1f051e47-a61b-49ed-8bb1-77b8ac4a200a`, AAF decision `6c930318-be52-4aea-af87-e1bc7b84094f` with status `granted_with_limitations`, evidence package `1dc141ba-b40a-4bae-a68a-3aa85f81b755`, decision evidence link `bc07da6d-4c4a-486b-9195-64a4746f19fc`, request audit event `9e50f265-b50d-487b-8008-829958797689`, decision audit event `5b6d5b74-42fa-4ef7-a0c3-76327e08c544`, service decision event `200648eb-6c47-401c-ba09-64bdd24eb275`, AAF validation `valid=true` with blocker codes `[]`, four unique CUTLINE-46/CUTLINE-47/CUTLINE-48 accepted limitations carried forward without inventing applied changes, warning that persisted limitation JSON repeats the same unique set through MVP-35 validation and MVP-34 service merge behavior, launch readiness eligibility next `ready=true` with missing requirements `[]`, migration state `launch_approval_required`, active pointers unchanged at total `6` and selected/candidate `0`, forbidden launch-readiness/publish/AAF gate counts `0`, online verification status `launch_approval_granted_with_limitations_pending_launch_readiness_no_publish`, and the boundary of no launch readiness, dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, env mutation, commit, or push:
- `docs/product/gnr8-single-site-mvp-cutline-49-launch-approval.md`
- `docs/product/gnr8-single-site-deployment-readiness-checklist.md`
- `docs/product/gnr8-single-site-mvp-online-verification-checklist.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`

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
