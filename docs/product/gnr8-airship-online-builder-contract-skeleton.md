# GNR8 Airship Online Builder Contract Skeleton

Date: 2026-09-22
Status: `airship_adapter_remote_worker_contract_skeleton_recorded`

## What Exists Now

ADAPTER 18 turns the ADAPTER 17 remote builder architecture into a typed, non-launching skeleton:

- hardened worker contract types for create, status, editor URL, capture, stop, cleanup, health, lifecycle, audit events, mutation boundaries, and failure reasons
- GNR8 control-plane service boundary with injected auth/context, migration allowlist checks, origin/CSRF intent checks, lifecycle transition guards, and worker-client normalization
- deterministic fake worker client for tests only
- pure security helpers for opaque session ids, ownership, TTL, allowlist, origin/CSRF placeholders, and audit event construction
- type-only repository boundaries for session, lease, workspace snapshot/hash, captured diff, mapping readback, draft apply readback, generated preview readback, and audit events
- route-handler helper skeletons for create/status/open/capture/stop actions without a production `route.ts`

## Intentionally Not Implemented

This skeleton does not launch remote infrastructure, call the real Airship CLI, start local sidecars, publish, mutate live pointers, mutate demo or preview-host bindings, touch DNS/provider/billing/env/source-capture/customer-domain/rollback/dry-run/shadow-publish paths, or add database migrations.

No production route can launch a worker. The helper returns blocked/not-configured unless a worker client is injected; the only implementation added here is a deterministic fake marked for tests.

## Difference From Local Proof Flow

The local proof flow owns a temporary local workspace and optional local sidecar process for controlled operator proof work. The online builder skeleton is the future control-plane shape: GNR8 will authorize and persist intent, while a remote worker will eventually own filesystem workspace, target server, Airship CLI sidecar, ports, health, diff capture, and cleanup.

The reuse path is explicit but still only a readback boundary:

- captured diff feeds ADAPTER 07 mapper
- exact safe mappings require confirmed ADAPTER 08 draft apply
- applied draft feeds ADAPTER 12 internal preview generation

## Recommended Next Task

Implement a persistence-backed session repository and a disabled UI readback for `Create online Airship session`, status, open editor, capture, and stop. Keep worker launch behind a future explicit configuration flag and continue using the fake worker only in tests until worker authentication, leases, cleanup, and signed editor URL gateway are designed.
