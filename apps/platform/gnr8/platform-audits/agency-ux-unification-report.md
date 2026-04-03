# Agency UX Unification Report

## 1) Previous UX Issues
- Agency pages were functionally complete but context was fragmented across `/gnr8/agency`, `/gnr8/agency/members`, and `/gnr8/agency/settings`.
- Navigation was distributed across page-local buttons, increasing context switching and cognitive load.
- Agency identity and role signal were repeated inconsistently by page, and there was no shared agency workspace shell.
- Client Overview existed only inside the dashboard page, so client management lacked a dedicated workspace surface.

## 2) New Agency Context Model
- Added `AgencyContextLayout` as the shared agency context layer for routes under `/gnr8/agency*`.
- Context layer now consistently renders:
  - agency identity (`Agency: <name>`)
  - optional slug fallback to ID
  - role indicator
  - optional `Admin View` badge and `Back to Command Center` entry when `admin_view=1`
- Existing agency resolution and membership scoping remain server-driven via `resolveCurrentUserAgencyForPage` and membership listing logic.

## 3) Navigation Structure
- Unified tabs in `AgencyContextLayout`:
  - Dashboard -> `/gnr8/agency`
  - Clients -> `/gnr8/agency/clients`
  - Team -> `/gnr8/agency/members`
  - Settings -> `/gnr8/agency/settings`
- Active tab highlighting is centralized in one place based on `activeTab` prop.
- Multi-agency switcher remains available and now lives in the shared context shell.

## 4) Layout Decisions
- Created shared shell component:
  - `app/gnr8/agency/AgencyContextLayout.tsx`
- Created dedicated clients surface component:
  - `app/gnr8/agency/AgencyClientsOverviewSection.tsx`
- Added dedicated clients page route:
  - `app/gnr8/agency/clients/page.tsx`
- Applied shared context layout to:
  - `/gnr8/agency` (dashboard)
  - `/gnr8/agency/members`
  - `/gnr8/agency/settings`
  - `/gnr8/agency/clients`
- Removed duplicated header/nav presentation from members/settings by adding embedded mode flags:
  - `embeddedInAgencyContext` in `AgencyMembersClient`
  - `embeddedInAgencyContext` in `AgencySettingsClient`
- Moved Client Overview out of dashboard body into dedicated Clients tab route, keeping Add Client + client table + actions intact.

## 5) Limitations
- `admin_view` behavior in membership routes is currently represented through query param (`admin_view=1`) for header affordance; full superadmin admin-route unification remains on `/gnr8/admin/agencies/*`.
- Existing no-access/error fallbacks remain page-local to preserve fail-closed behavior; these states are intentionally not over-generalized.
- Type-checking run in this workspace currently surfaces pre-existing `.next/types/* 2.ts` duplicate identifier issues unrelated to this UX change.

## 6) Next-Step Recommendation
- Unify `/gnr8/admin/agencies/[agencyId]/*` with the same context-shell primitives to achieve parity between membership mode and superadmin admin-view mode, reducing duplicated admin-view framing.
