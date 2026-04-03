# Cross-Workspace Recent Items Report

## 1. Tracked Events
- Route-driven tracking was added inside `WorkspaceStateSync` via a client-side `useEffect` that runs when pathname/search params change.
- Tracked route families:
  - Agency context: `/gnr8/agency`, `/gnr8/agency/clients`, `/gnr8/agency/members`, `/gnr8/agency/settings`
  - Client context (managed under agency): `/gnr8/agency/clients/[clientId]/dashboard|settings|users`
  - Direct client dashboard: `/gnr8/client?client=...`
  - Command Center: `/gnr8/command-center`, `/gnr8/command-center/sites`, `/gnr8/command-center/agencies`
- Non-workspace routes are ignored by design (no login/auth/system routes are tracked).

## 2. Storage Model
- Local-only persistence in `localStorage` key: `gnr8.workspace.recents.v1`.
- Shared type:

```ts
type WorkspaceRecentItem = {
  type: 'agency' | 'client' | 'command-center'
  label: string
  href: string
  agencyId?: string
  clientId?: string
  timestamp: number
}
```

- Constraints and behavior:
  - Max size: 12 items
  - Newest-first ordering by `timestamp`
  - Dedupe by `href`
  - Revisits overwrite timestamp and move item to top

## 3. Label Strategy
- Agency labels: `Agency Name / <Section>` with fallback `My Agency / <Section>`.
- Client labels: `Client Name / <Section>` with fallback `Client / <Section>`.
- Command Center labels: `Command Center / <Section>`.
- Current section mapping:
  - Agency: Dashboard, Clients, Team, Settings
  - Client: Dashboard, Settings, Team
  - Command Center: Overview, Sites, Agencies

## 4. UI Placement
- Shared component created: `WorkspaceRecentItems`.
- Placement:
  - Agency workspace: rendered below tabs in `afterTabs`
  - Client workspace: rendered below tabs in `afterTabs`
  - Command Center: rendered below tabs in `afterTabs` (optional included)
- UI style remains lightweight: compact vertical list of links.

## 5. Scoping Rules
- Rendering filters items by allowed context IDs supplied by layout:
  - Agency workspace filters by accessible agency IDs from memberships
  - Client workspace filters by active agency + available client options
  - Command Center allows command-center items
- Items outside accessible scope are excluded from render.

## 6. Limitations
- Recents are browser-local only; no cross-device sync.
- Access filtering currently hides inaccessible items in UI, but does not hard-delete them from storage.
- Labels depend on available context props; fallback labels are used when names are not available in the mounted layout.

## 7. Next-Step Recommendation
- Add a tiny “Clear recent items” action in the recent-items UI block for user-managed reset while keeping the same local-only architecture.
