# Workspace Productivity Shortcuts Report

## 1. Shortcut Model

Implemented a shared lightweight model in `WorkspaceShortcuts.tsx`:

```ts
export type WorkspaceShortcut = {
  id: string
  label: string
  href: string
  description?: string
  icon?: string
  external?: boolean
}
```

V1 is href-based only for server/client safety. No server-to-client function passing is used.

## 2. Shortcut Sections Per Workspace

- Command Center (`/gnr8/command-center/*`)
  - `Create Agency`
  - `Open Agencies`
  - `Open Sites`
  - Rendered in `CommandCenterLayout` near top (above recent items).
- Agency Workspace (`/gnr8/agency/*`)
  - `Add Client` (only when role allows `create_client`, and hidden in admin-view mode)
  - `Open Clients`
  - `Open Team`
  - `Open Settings`
  - Rendered in `AgencyContextLayout` near top (with existing quick switcher/recent items).
- Client Workspace
  - Agency-managed client dashboard (`/gnr8/agency/clients/[clientId]/dashboard`)
    - `View Sites`
    - `Open Latest Site` (when available)
    - `Open Settings`
    - `Open Team`
    - `Back to Agency`
    - Rendered via shared shortcuts in `ClientDashboardHome`.
  - Agency-managed non-dashboard client tabs (`settings`, `users`)
    - `View Sites`
    - `Open Settings`
    - `Open Team`
    - `Back to Agency`
    - Rendered in `ClientContextLayout` above recent items for non-dashboard tabs.
  - Client-self workspace (`/gnr8/client`)
    - `View Sites`
    - `Open Latest Site` (when available)
    - Rendered via shared shortcuts in `ClientDashboardHome`.

## 3. Scope/Context Rules

- Command Center shortcuts are only reachable through existing superadmin-gated route layout.
- Agency shortcuts are scoped with existing `agency` query context and `admin_view` propagation where already supported.
- `Add Client` is role-gated using `canPerformAction(role, 'create_client')` and intentionally hidden in admin-view mode.
- Client shortcuts differ by context:
  - Agency-managed includes agency navigation and management links.
  - Client-self excludes agency-admin links and only exposes safe self-context actions.

## 4. Reuse of Existing Routes/Actions

No new pages were created. Shortcuts reuse existing surfaces:

- `/gnr8/command-center`, `/gnr8/command-center/sites`, `/gnr8/command-center/agencies`
- `/gnr8/agency`, `/gnr8/agency/clients`, `/gnr8/agency/members`, `/gnr8/agency/settings`, `/gnr8/agency/clients/new`
- `/gnr8/agency/clients/[clientId]/dashboard|settings|users`
- `#client-sites` anchor within client dashboard
- Existing live/preview site URLs from read model

## 5. Limitations

- Client-self workspace currently has no dedicated `/gnr8/client/settings` or `/gnr8/client/team` route, so those shortcuts are not exposed there.
- `Create Agency` and `Open Agencies` currently target the same agencies surface because creation lives on that route.
- Authorization remains fail-closed via existing route protections; this layer is intentionally lightweight and does not add new policy engines.

## 6. Next-Step Recommendation

Add lightweight per-user pinning for this shortcuts layer (max 3 pinned shortcuts per workspace scope) using existing workspace state storage patterns, without introducing a large customization UI.
