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
