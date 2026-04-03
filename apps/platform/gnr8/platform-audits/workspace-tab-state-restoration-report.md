# Workspace Tab State Restoration Report

## 1. Prior behavior
- Workspace state persisted `activeAgencyId`, `activeClientId`, `lastAgencyTab`, and `lastClientTab` in localStorage.
- Existing sync behavior restored missing `?agency` / `?client` query params but did not use last-tab state to restore section routes.
- Re-entry via generic roots often landed on default dashboard paths even when a more recent tab existed.

## 2. Restoration priority rules
Applied priority:
1. Explicit URL/path
2. Explicit query params
3. Persisted workspace tab state
4. Safe default root behavior

Implementation notes:
- Tab restoration only triggers from generic/root entry routes.
- Query context (`agency`, `client`, existing params) is preserved and only backfilled when absent.
- Legacy tab keys are normalized to canonical keys before persistence and restoration:
  - Agency: `members` -> `team`
  - Client: `users` -> `team`

## 3. Agency restoration behavior
- Root-only restoration: `/gnr8/agency` is treated as the generic agency entry.
- If persisted `lastAgencyTab` is valid and non-default, root entry restores to:
  - `dashboard` -> `/gnr8/agency`
  - `clients` -> `/gnr8/agency/clients`
  - `team` -> `/gnr8/agency/members`
  - `settings` -> `/gnr8/agency/settings`
- Explicit sub-routes (for example `/gnr8/agency/settings`) are never overridden.
- Existing query scope (including `agency` and `admin_view`) is preserved.

## 4. Client restoration behavior
- Agency-managed client root restoration:
  - `/gnr8/agency/clients/:clientId/dashboard` is treated as the generic client-context entry.
  - If persisted `lastClientTab` is valid and non-default, restores to:
    - `dashboard` -> `/dashboard`
    - `settings` -> `/settings`
    - `team` -> `/users`
- Generic client entry support:
  - `/gnr8/client` can restore to agency-managed client sections when `agency` + `client` scope is available and persisted `lastClientTab` is non-default.
- Explicit client sub-routes remain authoritative and are never overridden.

## 5. Loop-avoidance strategy
- Restoration is route-gated and runs only on narrow root-entry patterns:
  - `/gnr8/agency`
  - `/gnr8/client`
  - `/gnr8/agency/clients/:clientId/dashboard`
- No restoration is performed from already-specific tab routes.
- Restore hrefs are only applied when target path differs from current path.
- Query-only backfill runs after restore checks and only when needed.

## 6. Limitations
- Client tab persistence is currently global (`lastClientTab`) rather than per-client.
- `/gnr8/client` has no native client-tab routes yet; non-dashboard restoration from that surface depends on agency-managed client routes.
- Accessibility/validity of restored scope remains enforced by existing server-side fail-closed resolvers.
- Build validation in this environment reports unrelated pre-existing ESLint/plugin and filesystem timeout issues during `next build`.

## 7. Next-step recommendation
- Add per-client tab memory (for example keyed by `clientId`) so restoration follows each client’s own last-used section instead of a single global client tab.
