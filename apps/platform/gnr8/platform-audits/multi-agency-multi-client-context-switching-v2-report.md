# Multi-Agency / Multi-Client Context Switching v2 Report

## 1. V1 limitations

- Agency switching in `WorkspaceQuickSwitcher` (agency context) used static `"/gnr8/agency"` targets, so switching from Settings/Team/Clients dropped users to dashboard.
- Agency switching logic was duplicated inline across quick switcher options and command palette agency entries, without canonical preservation rules.
- Client switching in agency-managed client context preserved section in one place, but command palette client entries always forced dashboard.
- Client-self (`/gnr8/client`) switching used inline links with no shared builder and no centralized continuity rules.
- Client-self page was not writing active context to workspace persistence via `WorkspaceStateSync`, reducing cross-surface continuity.

## 2. V2 route-preservation rules

- Canonical helpers introduced in `apps/platform/src/workspace/context-switching.ts`:
  - `buildAgencySwitchHref(...)`
  - `buildClientSwitchHref(...)`
- Agency switch rules:
  - Preserve subsection for `/gnr8/agency`, `/gnr8/agency/clients`, `/gnr8/agency/members`, `/gnr8/agency/settings`.
  - If current route is deeper under clients (`/gnr8/agency/clients/...`), preserve the clients surface (`/gnr8/agency/clients`).
  - Fallback: `/gnr8/agency?agency=<id>`.
- Client switch rules:
  - Agency-managed client routes preserve `dashboard|settings|users`.
  - Invalid/unknown subsection falls back to client dashboard route.
  - Client-self route preserves `/gnr8/client` semantics by default (`/gnr8/client?client=<id>`), with optional safe mapping support in helper if needed.

## 3. Agency switching behavior

- Updated agency quick switch options in `AgencyContextLayout` to use `buildAgencySwitchHref(...)` with current active tab path.
- Updated command palette agency entries in `AgencyContextLayout` to use the same helper.
- Added switch persistence hardening on agency switch:
  - clears `activeClientId` to avoid stale cross-agency client context,
  - updates `lastAgencyTab` consistently.

## 4. Client switching behavior

- Updated client quick switch options in `ClientContextLayout` to use `buildClientSwitchHref(...)` and preserve current client subsection.
- Updated command palette client entries in `ClientContextLayout` to use `buildClientSwitchHref(...)`, making behavior consistent with quick switcher.
- Centralized fallback behavior to dashboard when subsection cannot be preserved safely.

## 5. State synchronization rules

- `WorkspaceStateSync` remains URL-first and continues syncing active agency/client and last-tab state.
- Added `WorkspaceStateSync` to `/gnr8/client` page so client-self workspace now persists:
  - `activeAgencyId`,
  - `activeClientId`,
  - `activeClientName`,
  - `lastClientTab='dashboard'`.
- Client-self switch links now use `buildClientSwitchHref(...)` so URL target generation is centralized and consistent.

## 6. admin_view handling

- `buildAgencySwitchHref(...)` and `buildClientSwitchHref(...)` preserve `admin_view` query param when present.
- Agency quick switcher remains intentionally hidden in `admin_view` (existing behavior preserved).
- If switching occurs via command palette while in `admin_view`, support-mode query semantics are retained explicitly.
- No membership-context impersonation logic was introduced.

## 7. Limitations

- Access validation remains enforced at page resolver/data layer; href builders are intentionally pure and do not perform permission checks directly.
- Client-self workspace currently has only `/gnr8/client` page; subsection preservation there is constrained by available route surface.
- No backend/global profile persistence changes were introduced (intentionally out of scope).

## 8. Next-step recommendation

- Add focused integration tests for `context-switching.ts` to lock route-preservation/fallback behavior (including admin_view and stale/invalid section inputs).
