# Workspace State Persistence Report

## 1) Prior limitations (stateless navigation)
- Active workspace context (`agency`, `client`) depended on route-local query state only.
- Refresh/navigation could drop explicit context when entering routes without query params.
- Last tab context was not remembered between route transitions.

## 2) Persistence model
- Added shared workspace model in [`apps/platform/src/workspace/workspace-state.ts`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/src/workspace/workspace-state.ts):
  - `activeAgencyId?: string`
  - `activeClientId?: string`
  - `lastAgencyTab?: string`
  - `lastClientTab?: string`
- Added lightweight client sync boundary in [`apps/platform/app/gnr8/_components/workspace/WorkspaceStateSync.tsx`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/app/gnr8/_components/workspace/WorkspaceStateSync.tsx).
- Integrated sync boundary into:
  - [`apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/app/gnr8/command-center/CommandCenterLayout.tsx)
  - [`apps/platform/app/gnr8/agency/AgencyContextLayout.tsx`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/app/gnr8/agency/AgencyContextLayout.tsx)
  - [`apps/platform/app/gnr8/agency/clients/[clientId]/ClientContextLayout.tsx`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/app/gnr8/agency/clients/[clientId]/ClientContextLayout.tsx)
  - [`apps/platform/app/gnr8/agency/layout.tsx`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/app/gnr8/agency/layout.tsx)
  - [`apps/platform/app/gnr8/client/layout.tsx`](/Users/gregorzigon/Documents/Codex/GNR8/apps/platform/app/gnr8/client/layout.tsx)

## 3) URL vs localStorage strategy
- `localStorage` is the persistence layer (`gnr8.workspace.state.v1`).
- URL query params are explicit override:
  - `syncFromUrl()` reads `?agency` / `?client` and overwrites persisted state when present.
- When URL context is missing for relevant surfaces, client sync can re-apply persisted `agency`/`client` context into the URL.

## 4) Safety/fallback rules
- Persisted state is treated as hint-level state; server-side resolvers remain authoritative.
- Existing fail-closed resolver logic remains unchanged:
  - invalid/unauthorized agency/client scope still blocks access.
- Storage parsing/writing failures are non-fatal and ignored to avoid navigation breakage.

## 5) Limitations
- Restoration from `localStorage` happens client-side after hydration (not server-side pre-resolution).
- Invalid persisted IDs can still be rejected by server resolver logic (intended fail-closed behavior).
- `lastAgencyTab`/`lastClientTab` are persisted in V1 but not yet used to force route redirects.

## 6) Next-step recommendation
- Add server-readable mirror (cookie shadow of active workspace IDs) to enable pre-hydration context restoration while keeping URL as explicit override.
