# Superadmin Agency Settings Admin View Report

## 1. Route
- Added dedicated superadmin settings route:
  - `/gnr8/admin/agencies/[agencyId]/settings`
  - File: `apps/platform/app/gnr8/admin/agencies/[agencyId]/settings/page.tsx`

## 2. RBAC Integration Approach
- Reused existing centralized RBAC + action-context enforcement:
  - `requireAgencyActionContext(...)` remains the single API gate.
  - No RBAC bypass or direct permission shortcut was introduced.
- Added granular RBAC actions in `rbac.ts` so owner-only route behavior is modeled in RBAC instead of route-local role checks:
  - `edit_agency_slug`
  - `edit_owner_profile`
- Updated settings APIs to enforce via RBAC actions:
  - `/api/gnr8/agency/settings/profile` now checks slug-change permission with `canPerformAction(..., 'edit_agency_slug')`.
  - `/api/gnr8/agency/settings/owner` now authorizes with `action: 'edit_owner_profile'`.

## 3. admin_view Semantics
- Superadmin admin route requires `requireSuperadminUserIdForPage()` and scopes to explicit `agencyId`.
- API actions continue through `requireAgencyActionContext`, which yields:
  - `actor_mode = admin_view`
  - `role = superadmin`
  - `agencyId = requestedAgencyId`
- Added explicit admin-view actor logging on the new settings page:
  - `actor_user_id`
  - `actor_mode`
  - `target_agency_id`

## 4. Differences From Normal Settings
- Normal route remains unchanged in behavior and membership resolution:
  - `/gnr8/agency/settings`
- New admin route is parallel and explicit:
  - no membership-based agency selection
  - agency scope injected from route param
  - UI shows clear admin context banner:
    - `Admin View`
    - `Agency Name`
    - `Agency ID`
    - `Actor Mode: admin_view`
- Added admin entry links labeled `Agency Settings` from:
  - `/gnr8/admin/agencies` table Actions
  - `/gnr8/admin/agencies/[agencyId]/dashboard`

## 5. Limitations
- `owner` and `password` settings endpoints still operate on the currently authenticated actor account via `supabase.auth.updateUser(...)`.
- In `admin_view`, this means updates apply to the superadmin user identity, not impersonated agency-owner identity (no impersonation was added, by design).

## 6. Next Steps
- If true target-owner account mutation is needed in admin_view, introduce a dedicated audited admin flow that updates a selected target user through service-role/admin APIs with explicit actor/target attribution and immutable audit records.
