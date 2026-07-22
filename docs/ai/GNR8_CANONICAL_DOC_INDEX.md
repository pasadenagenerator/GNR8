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
