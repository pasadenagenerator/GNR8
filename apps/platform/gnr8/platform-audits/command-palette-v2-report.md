# Command Palette V2 Report

## 1) New action system
- Extended `CommandItem` to support executable actions:
  - `type: 'recent' | 'agency' | 'client' | 'route' | 'action'`
  - `href?: string`
  - `action?: () => void`
- Actions are created inside the client component (`CommandPalette.tsx`) only.
- No function props are passed from server components.
- Added executable command actions:
  - Go to Command Center
  - Go to Agency Dashboard
  - Go to Client Dashboard
  - Create new client
  - Invite team member
  - Open Agency Settings
  - Open Client Settings
  - Open Client Team

## 2) Context-awareness rules
- Workspace scope is resolved from pathname:
  - `/gnr8/agency/clients/*` -> `client`
  - `/gnr8/agency*` -> `agency`
  - `/gnr8/command-center*` -> `command-center`
  - fallback -> `other`
- Agency scope actions:
  - Create new client
  - Invite team member (agency members surface)
  - Open Agency Settings
- Client scope actions:
  - Open Client Settings
  - Open Client Team
- Command Center action visibility honors existing `allowCommandCenter` guard.

## 3) Grouping logic
- Result groups are rendered with minimal labels in this order:
  1. Actions
  2. Navigation
  3. Recent
  4. Agencies
  5. Clients
- Mapping:
  - `action` -> Actions
  - `route` -> Navigation
  - `recent` -> Recent
  - `agency` -> Agencies
  - `client` -> Clients

## 4) Execution model
- Enter/select behavior:
  - If `href` exists -> `router.push(href)`
  - Else if `action` exists -> execute action immediately
- Palette closes and resets query/active index before execution.
- Existing V1 navigation and recent-item pathways are preserved.

## 5) Limitations
- Action authorization is route-level/context-level only; action visibility does not inspect fine-grained permissions beyond existing page guards.
- Ranking is intentionally lightweight (`exact`, `startsWith`, `includes`) with a small action boost; no fuzzy scoring is introduced.
- Action set is currently static and local to `CommandPalette`.

## 6) Next-step recommendation
- Command Palette v3 (Fuzzy + Global Search)
