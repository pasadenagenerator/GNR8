# Cross-Workspace Quick Switcher Report

## 1. Switcher surfaces implemented
- Added shared primitive: `WorkspaceQuickSwitcher` at `apps/platform/app/gnr8/_components/workspace/WorkspaceQuickSwitcher.tsx`.
- Agency workspace:
  - `AgencyContextLayout` now renders `Switch Agency` in the header/tabs meta area (`afterTabs`) when more than one accessible agency exists and actor mode is membership.
- Client workspace (agency client context):
  - `ClientContextLayout` now renders `Switch Client` in the header meta area when more than one switchable client exists.
  - Applied on:
    - `/gnr8/agency/clients/[clientId]/dashboard`
    - `/gnr8/agency/clients/[clientId]/settings`
    - `/gnr8/agency/clients/[clientId]/users`

## 2. How accessible options are resolved
- Agency options:
  - Reused existing `memberships` already passed into `AgencyContextLayout` from `listCurrentUserAgencyMembershipsForPage`.
  - No new broad data source introduced.
- Client options:
  - Added minimal helper `listSwitchableAgencyClientsForPage` in `apps/platform/app/gnr8/agency/clients/client-switcher-options.ts`.
  - Helper reads `organizations` where:
    - `agency_id = resolved active agency`
    - `organization_type = 'client'`
  - This is scoped to the already resolved active agency context and remains fail-closed (`[]`) on query failure.

## 3. URL/state integration
- Switchers navigate with explicit URLs (`router.push`), preserving URL as source of truth.
- On switch action, `WorkspaceQuickSwitcher` writes partial workspace state via `setWorkspaceState(...)` before navigation.
- Existing `WorkspaceStateSync` continues synchronizing URL <-> local workspace state (`agency`, `client`, last tabs).

## 4. Route preservation rules
- Agency switcher:
  - Conservative route target is agency dashboard root:
    - `/gnr8/agency?agency=<targetAgencyId>`
- Client switcher:
  - Preserves current client tab section when safe:
    - dashboard -> `/dashboard`
    - settings -> `/settings`
    - users -> `/users`
  - Carries active agency query parameter.
  - If an unexpected tab key appears, defaults to dashboard behavior.

## 5. Admin-view handling
- Agency quick switcher is intentionally hidden for `admin_view` in `AgencyContextLayout`.
- Existing admin-view badge/semantics remain unchanged.
- No membership impersonation behavior was introduced for superadmin contexts.

## 6. Limitations
- Command Center quick switching was not added in this V1.
- Admin-view agency switching is intentionally not exposed in V1 to avoid actor-mode ambiguity.
- Agency switch currently targets agency dashboard root (does not preserve current agency sub-route).

## 7. Next-step recommendation
- Add a constrained agency route-preservation helper for `AgencyContextLayout` so agency switches can keep `settings`, `clients`, or `members` when valid.
