# GNR8 THREAD HANDOFF

This is the first file every new ChatGPT/Codex thread should read.

## A) Current Project State

GNR8 is currently in provider/DNS control-plane hardening and migration/preview validation mode.
The active emphasis is deterministic contracts, approval/handoff safety, and no hidden execution.
Provider handoff readiness with operator review creation milestone is complete and testable end-to-end from deployed UI (seed + inspection surfaces), and execution remains explicitly blocked.

Current snapshot sources:
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

## B) Canonical Docs

Read these as the canonical bootstrap set:
- `docs/ai/GNR8_THREAD_HANDOFF.md`
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_COLLABORATION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

Read `docs/ai/GNR8_COLLABORATION_PROTOCOL.md` before generating Codex tasks.

## C) Rules

- Slovenian conversation.
- English Codex tasks.
- step-by-step work.
- deterministic contracts.
- no hidden execution.
- no autonomous live execution.

## D) Current Architecture Status

- Architectural baseline remains modular monolith + service-layer discipline (`SYSTEM.md`, `architecture.md`).
- GNR8 runtime/control-plane work lives primarily under `apps/platform/gnr8/runtime/**`.
- Migration/import/validation subsystems are active and contract-driven (`apps/platform/gnr8/migration/**`, `apps/platform/gnr8/import/**`, `apps/platform/gnr8/validation/**`).

## E) Current Provider-Control-Plane Status

Implemented control-plane layers include provider settings, credential references contract, provider selection/communicator, job planner/repository foundation, approval artifacts/transitions, execution handoff, and worker pickup readiness checks.
Readiness inspection now includes deterministic `workerPickupEvidence` projection from persisted `handoffArtifact`, read-only API inspection route, internal debug UI route, deployed superadmin readiness-test UI, admin seed API for deterministic persisted handoff creation/reuse, and operator review intent persistence/creation surfaces.

Completed readiness inspection routes:
- `GET /api/gnr8/runtime/provider-handoffs/[handoffId]/readiness` (read-only)
- `/gnr8/admin/provider-handoffs/[handoffId]/readiness` (internal debug UI)
- `/gnr8/admin/provider-handoffs/readiness-test` (deployed superadmin readiness test UI)
- `POST /api/gnr8/admin/provider-handoffs/readiness-seed` (admin seed API)
- `GET /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (read-only operator reviews)
- `POST /api/gnr8/admin/provider-handoffs/[handoffId]/reviews` (admin-only operator review intent creation)

Required production env flag:
- `GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1`

Evidence and diagnostics milestone:
- seed creates/reuses deterministic persisted handoff
- readiness page shows persisted `handoffArtifact` and reconstructed deterministic `workerPickupEvidence`
- `workerPickupEvidence.blockedReasons` is normalized with no contradictory approval/handoff/planned-job reasons; reasons are deterministic and operator-readable
- operator review persistence exists via `gnr8_runtime_provider_operator_reviews`
- readiness UI includes read-only operator review section
- readiness UI includes create operator review form with:
  - status dropdown values: `pending_review`, `approved_for_future_execution`, `rejected`, `needs_changes`
  - reason textarea
  - Save review intent action
- `approved_for_future_execution` is intent-only; it does not authorize execution
- `executionBlocked` remains `true`

Hard boundaries remain:
- no live provider execution
- no sandbox execution
- no worker execution for provider actions
- no Openprovider API calls
- no DNS writes
- no queue/Inngest execution for provider handoff readiness inspection
- no external registrar calls
- no secret reads/stores
- no secret resolution
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## F) Current Active Implementation Phase

Active phase: provider handoff readiness with operator review creation milestone.

Practical next phase:
1. Operator review audit/history hardening, or review state summarization in readiness evidence.
2. Keep execution paths in dry-run/sandbox-gated mode with explicit execution-blocked evidence (still no execution).

## G) How Next Thread Should Behave

1. Read canonical files first before proposing changes.
2. Compare docs against actual repository structure before edits.
3. Update canonical docs instead of creating parallel systems.
4. Preserve deterministic contracts and explicit diagnostics.
5. Treat live/provider execution as disallowed unless explicitly re-authorized.

## Documentation Discipline

Rules:
- Update canonical docs instead of creating parallel doctrine.
- Do not create "final/v2/new/current" duplicates.
- If a document is historical, mark or index it as secondary/archive.
- Baseline/checkpoint docs are evidence, not the primary doctrine.
- When current state changes, update `docs/ai/GNR8_CURRENT_STATE.md` and relevant baseline/checkpoint docs.

## Ready-to-Copy Prompt

"Read these files first in this exact order: docs/ai/GNR8_THREAD_HANDOFF.md, docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md, docs/ai/GNR8_CURRENT_STATE.md, docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md, docs/ai/GNR8_COLLABORATION_PROTOCOL.md, docs/ai/GNR8_PROJECT_MAP.md, docs/ai/GNR8_CANONICAL_DOC_INDEX.md, and docs/ai/decisions/*.md. Read docs/ai/GNR8_COLLABORATION_PROTOCOL.md before generating Codex tasks. Then compare with apps/platform/gnr8/**, apps/worker/gnr8/**, and apps/platform/supabase/migrations/** before making any changes. Keep deterministic contracts, control-plane boundaries, and no-live-execution rules intact."
