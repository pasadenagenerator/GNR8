# GNR8 Context Router

Read the smallest useful set of documents. Do not read canonical history or broad architecture docs unless the task touches that area.

## Always

- Read the user task.
- Read `TASK-TEMPLATE.md` when the task is being created, checked, or clarified.
- Read this router before choosing more docs.

## For Implementation Tasks

- Identify touched files first with targeted search.
- Read nearby code, local tests, and the closest domain document.
- Read `docs/ai/GNR8_CURRENT_STATE.md` only when the task affects current milestone state, project direction, or documented status.
- Read `docs/ai/GNR8_THREAD_HANDOFF.md` only when starting a fresh long-running thread, resuming prior milestone work, or preparing a handoff.
- Read `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` only when you need to locate the canonical document for an area.
- Read `docs/ai/decisions/*.md` only when the task changes architecture, contracts, execution boundaries, or governance.

## Common Area Routing

- Platform app: read nearby files under `apps/platform/` and, for Supabase access, `apps/platform/gnr8-supabase-architecture.md`.
- Worker app: read nearby files under `apps/worker/` and local worker tests.
- Runtime/contracts: read package contracts under `packages/` and the relevant architecture doc.
- Product/operator workflow: read the specific `docs/product/` workflow named by the task.
- Architecture-only tasks: read the specific `docs/architecture/` document named by the task and relevant ADRs.
- Billing/auth/tenancy: read `ai-rules.md`, `execution.md`, and the nearest implementation docs.

## Avoid

- Do not read every file in `docs/architecture/`, `docs/product/`, or `docs/ai/`.
- Do not require a full project map before small edits.
- Do not load historical closeout docs unless the task needs historical evidence.
