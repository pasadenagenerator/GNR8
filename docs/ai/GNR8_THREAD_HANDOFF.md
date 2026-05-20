# GNR8 THREAD HANDOFF

This is the first file every new ChatGPT/Codex thread should read.

## A) Current Project State

GNR8 is currently in provider/DNS control-plane hardening and migration/preview validation mode.
The active emphasis is deterministic contracts, approval/handoff safety, and no hidden execution.

Current snapshot sources:
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/gnr8/dns-provider-control-plane-checkpoint-2026-05.md`
- `docs/gnr8/runtime-domain-dns-readiness-baseline-2026-05.md`

## B) Canonical Docs

Read these as the canonical bootstrap set:
- `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
- `docs/ai/GNR8_PROJECT_MAP.md`
- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
- `docs/ai/decisions/ADR-001-deterministic-pipeline.md`
- `docs/ai/decisions/ADR-002-preview-assets-architecture.md`
- `docs/ai/decisions/ADR-003-runtime-artifact-model.md`

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

Hard boundaries remain:
- no live provider execution
- no worker execution for provider actions
- no Openprovider API calls
- no DNS writes
- no external registrar calls
- no secret value reads/stores

## F) Current Active Implementation Phase

Active phase: control-plane completion + DB-readiness convergence.

Practical next phase:
1. Apply/verify missing migrations in target DBs.
2. Confirm DB-backed repository tests for provider jobs/approvals/handoffs.
3. Keep execution paths in dry-run/sandbox-gated mode.

## G) How Next Thread Should Behave

1. Read canonical files first before proposing changes.
2. Compare docs against actual repository structure before edits.
3. Update canonical docs instead of creating parallel systems.
4. Preserve deterministic contracts and explicit diagnostics.
5. Treat live/provider execution as disallowed unless explicitly re-authorized.

## Ready-to-Copy Prompt

"Read these files first: docs/ai/GNR8_THREAD_HANDOFF.md, docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md, docs/ai/GNR8_CURRENT_STATE.md, docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md, docs/ai/GNR8_PROJECT_MAP.md, docs/ai/GNR8_CANONICAL_DOC_INDEX.md, and docs/ai/decisions/*.md. Then compare with apps/platform/gnr8/**, apps/worker/gnr8/**, and apps/platform/supabase/migrations/** before making any changes. Keep deterministic contracts, control-plane boundaries, and no-live-execution rules intact." 
