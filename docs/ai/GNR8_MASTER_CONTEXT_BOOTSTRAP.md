# GNR8 MASTER CONTEXT BOOTSTRAP

## 1) What GNR8 Is
GNR8 je deterministican sistem za transformacijo spletnih strani v reproducibilen runtime in preview/publish pipeline.
Ni klasicen website builder in ni klasicen CMS.

## 2) Core Principles

- Deterministic-first.
- No hidden execution.
- Typed contracts med subsystemi.
- Stage-scoped diagnostics.
- Explicit evidence over implicit behavior.
- No silent fallbacks.

## 3) Canonical Runtime Boundaries (Current)

- NO provider execution.
- NO live DNS.
- NO external registrar calls.
- NO worker execution for provider actions.
- Openprovider sandbox planning/dry-run artifacts only. No provider execution is permitted, including sandbox execution. Control-plane metadata and deterministic planning only.

## 4) System Architecture Backbone

Primary active code surfaces:
- `apps/platform/gnr8/import/**`
- `apps/platform/gnr8/migration/**`
- `apps/platform/gnr8/runtime/**`
- `apps/platform/gnr8/validation/**`
- `apps/worker/gnr8/**`

Control-plane provider stack (active):
- providers
- provider-jobs
- dns
- domains
- approval
- handoff

## 5) Runtime Model

Runtime je zgrajen okoli immutable artifacts, snapshots, file maps, diagnostics in evidence-first persistence.

## 6) ADR Policy

Arhitekturne odlocitve se vodijo v `docs/ai/decisions/`.
Brez ADR ni dovoljen arhitekturni pivot ali live-execution boundary shift.

## 7) Canonical Bootstrap Pack For New Threads

Read first:
1. `docs/ai/GNR8_THREAD_HANDOFF.md`
2. `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
3. `docs/ai/GNR8_CURRENT_STATE.md`
4. `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
5. `docs/ai/GNR8_PROJECT_MAP.md`
6. `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
7. `docs/ai/decisions/*.md`
