# Per-Context State Persistence V2 Audit Report

## 1. V1 limitations
- V1 workspace persistence stored `lastAgencyTab` and `lastClientTab` as global fields.
- Multi-agency/multi-client workflows caused cross-context overwrites because one agency/client tab memory could replace another.
- Restoration behavior could only use a single global tab memory for agency/client entry routes.

## 2. V2 state model
- Canonical persisted shape is now V2 and scoped by identity:
  - `activeAgencyId`
  - `activeClientId`
  - `agencyStateById[agencyId].lastTab`
  - `clientStateById[clientId].lastTab`
  - `clientStateById[clientId].agencyId` (optional safety association)
- Storage now writes V2-only at `gnr8.workspace.state.v2`.

## 3. Migration and compatibility handling
- Read path supports V2 first, then V1 fallback (`gnr8.workspace.state.v1`).
- Legacy V1 fields (`lastAgencyTab`, `lastClientTab`) are normalized and projected into per-context entries when active IDs are available.
- When any legacy state is read successfully, it is rewritten into V2 format and V1 storage key is removed.
- Compatibility fallback remains available in-memory so stale V1 payloads do not crash restoration.

## 4. Agency/client-specific persistence behavior
- Agency tab state is persisted via `setAgencyContextState(activeAgencyId, { lastTab })`.
- Client tab state is persisted via `setClientContextState(activeClientId, { lastTab, agencyId })`.
- Workspace context IDs continue to update via `setWorkspaceState({ activeAgencyId, activeClientId })`.
- Quick-switch persistence no longer writes global tab memory fields.

## 5. Restoration precedence
Restoration precedence remains:
1. Explicit path
2. Explicit query tab params (`tab`, `agency_tab`, `client_tab`)
3. Persisted per-context state (`agencyStateById` / `clientStateById`)
4. Safe default (`dashboard`)

URL intent remains authoritative and is never overridden by persisted state.

## 6. Limitations
- Legacy global fallback can only be projected into V2 when corresponding active IDs are known.
- Client tab restoration with mismatched associated `agencyId` is fail-closed (ignored) when both agency identities are present.
- State remains localStorage-based (no backend/session sync by design).

## 7. Next-step recommendation
- Add lightweight unit tests for:
  - V1 to V2 migration projection
  - per-agency tab restoration isolation
  - per-client tab restoration isolation
  - client-agency mismatch fail-closed behavior
