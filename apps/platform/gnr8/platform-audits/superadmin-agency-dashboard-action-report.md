# Superadmin Agency Dashboard Action Report

## 1. Route chosen
- Added action link from `/gnr8/admin/agencies` to `/gnr8/admin/agencies/<agencyId>/dashboard`.
- Implemented route at `apps/platform/app/gnr8/admin/agencies/[agencyId]/dashboard/page.tsx`.

## 2. How admin view differs from normal agency dashboard
- Normal dashboard (`/gnr8/agency`) resolves scope from authenticated user membership and owner/setup gating.
- Admin dashboard (`/gnr8/admin/agencies/[agencyId]/dashboard`) is explicitly superadmin-only and resolves scope from selected path param `agencyId`.
- Admin page shows an explicit `Admin View` badge and target agency identity (name/id/slug where present).

## 3. Data access/scoping model
- Superadmin auth is enforced with `requireSuperadminUserIdForPage()` (read-only cookie-safe page guard).
- Agency dashboard data reuses existing `getAgencyDashboardReadModel({ agencyId, ... })`.
- Scope source is only the selected `agencyId` route param, not membership resolution.
- Agency identity metadata uses one service-role query on `agencies` for target labeling.

## 4. Actor/audit semantics
- Admin view render logs support semantics:
  - `actor_user_id`: authenticated superadmin id
  - `actor_mode`: `admin_view`
  - `target_agency_id`: route-selected agency id
- No new mutation endpoint was introduced in this task; existing mutation paths remain unchanged.

## 5. Limitations
- This task adds explicit actor semantics for admin-view page access, but does not retrofit all downstream mutation paths to persist `actor_mode` and `target_agency_id` yet.
- `Open Agency Settings` links to existing settings surface, which remains governed by its current membership-based guards.

## 6. Next-step recommendation
- Add explicit admin-aware mutation audit envelopes so superadmin-triggered writes consistently persist `actor_user_id`, `actor_mode`, and `target_agency_id` at write time across settings/control actions.
