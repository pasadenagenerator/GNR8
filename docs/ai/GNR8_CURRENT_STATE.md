# GNR8 CURRENT STATE SNAPSHOT

## Snapshot Date
2026-05-20

## Current Phase
Provider/DNS control-plane consolidation with DB-readiness convergence.

## Latest Completed Milestone

- Control-plane layers for provider settings, credential reference contract, provider selection/communicator, job planning, approvals, and execution handoffs are implemented.
- Deterministic Openprovider sandbox adapter and contract/readiness boundaries are in place.
- Explicit execution boundaries are enforced in control-plane artifacts and dry-run paths.

## Current Blocker

- DB readiness is environment-dependent: `gnr8_provider_credential_references` is documented as missing until migration application in target DBs.
- DB-backed repository tests for provider control-plane surfaces depend on DB URL/table availability.

## Next Milestone

- Apply/verify provider-control-plane migrations in target DBs.
- Validate repository roundtrip/ordering behavior for provider jobs, approvals, and handoffs against real DB.
- Keep execution paths dry-run/sandbox-gated only.

## Active Runtime Architecture

- Runtime identity/readiness/resolution models are active and deterministic.
- Provider/DNS/domain layers are active at control-plane level.
- Worker pickup readiness is modeled, but provider action execution remains disabled by policy.

## Execution Boundaries (Current)

- NO provider execution.
- NO live DNS.
- NO external registrar calls.
- NO worker execution for provider actions.
- Openprovider sandbox only.
- control-plane only.

## Current DB/Schema Readiness State

Missing (until migration applied in target DB):
- `gnr8_provider_credential_references`

Present (migration-defined baseline):
- `gnr8_runtime_provider_jobs`
- `gnr8_agency_provider_settings`
- `gnr8_runtime_provider_operation_approvals`
- `gnr8_runtime_provider_execution_handoffs`

## Open Decisions (Needs ADR Before Live Execution)

- Live provider execution gate release criteria.
- External registrar/API execution policy and audit boundary.
- Worker execution enablement criteria for provider actions.

## Bootstrap Notes For New Threads

Start every new thread with:
1. `docs/ai/GNR8_THREAD_HANDOFF.md`
2. `docs/ai/GNR8_MASTER_CONTEXT_BOOTSTRAP.md`
3. `docs/ai/GNR8_CURRENT_STATE.md`
4. `docs/ai/GNR8_TASK_EXECUTION_PROTOCOL.md`
5. `docs/ai/GNR8_PROJECT_MAP.md`
6. `docs/ai/GNR8_CANONICAL_DOC_INDEX.md`
