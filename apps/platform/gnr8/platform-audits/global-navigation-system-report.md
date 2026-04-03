# Global Navigation System Audit Report

## 1) Previous Navigation Limitations
- GNR8 had workspace-local navigation patterns (breadcrumbs, tabs, quick switcher, command palette) but no unified global entry layer.
- Users could move within a workspace efficiently, but top-level orientation across Command Center, Agency, and Client was not always explicit.
- Highest-level workspace switching depended on indirect tools rather than a persistent global affordance.

## 2) Global Nav Structure
- Added a new persistent top navigation component at `apps/platform/app/gnr8/_components/global/GlobalNavigation.tsx`.
- Mounted globally in a new `/gnr8` root layout at `apps/platform/app/gnr8/layout.tsx`, so it renders above Command Center, Agency, and Client routes.
- Navigation layout is intentionally minimal:
  - Product label: `GNR8`
  - Top-level entries: `Command Center`, `Agency`, `Client`
  - Lightweight right-side placeholder: `Account`
- Active section highlighting is path-prefix based:
  - `/gnr8/command-center` -> Command Center active
  - `/gnr8/agency` -> Agency active
  - `/gnr8/client` -> Client active

## 3) Visibility Rules
- Command Center entry is shown only when `requireSuperadminUserIdForPage()` succeeds.
- Agency entry is shown only when `listCurrentUserAgencyMembershipsForPage()` returns at least one membership.
- Client entry is shown only when `listCurrentUserClientMembershipsForPage()` returns at least one membership.
- Unauthorized access (`UNAUTHORIZED`/`Unauthorized`) redirects to `/login` via existing auth behavior.

## 4) State Integration
- Global nav preserves context using existing state and URL signals.
- Agency link behavior:
  - Uses `agency` query from current URL when present.
  - Falls back to persisted `activeAgencyId` from workspace state.
  - Safe fallback when missing: `/gnr8/agency`.
- Client link behavior:
  - Uses `client` query from current URL when present.
  - Falls back to persisted `activeClientId` from workspace state.
  - Also carries current agency context when available.
  - Safe fallback when missing: `/gnr8/client`.
- `admin_view` query is preserved when present to avoid disrupting admin-view navigation context.

## 5) Limitations
- The right-side account area is a placeholder and does not yet expose user profile actions.
- Manual browser validation is required to confirm exact route behavior and visual alignment across all user role permutations.
- Global nav currently includes no dropdown or deep nav; this is intentional for V1 scope.

## 6) Visual/Branding Polish (Current Pass)
- Updated global nav visual treatment to align with workspace UI primitives already used below the nav:
  - solid workspace-toned shell (`#f8fafc`) with `#dbe6f1` divider
  - card-like left brand treatment and tab-like nav chips (`#fff`, `#cbd5e1`, `#eff6ff`)
  - tighter spacing and typography aligned with existing workspace header/tab patterns.
- Removed left brand link behavior:
  - `GNR8` is now a non-interactive brand/title surface (no navigation target).
- Added a future-ready brand slot structure:
  - extracted a `BrandSlot` model/render path with explicit `label` and optional `logo` slot support
  - keeps V1 static while preparing the component for future workspace-specific logo rendering.

## 7) Next-Step Recommendation
- Introduce `Multi-Agency / Multi-Client Context Switching v2` to make top-level switching smarter for users with many memberships while keeping this global nav minimal.
