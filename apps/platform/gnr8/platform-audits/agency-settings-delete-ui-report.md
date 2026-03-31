# Agency Settings + Delete UI Report

## 1. Route/Location Chosen
- Implemented a dedicated settings route: `/gnr8/agency/settings`.
- Kept `/gnr8/agency` dashboard intact and added an `Open Settings` entry link.
- Settings route supports multi-agency context via `?agency=<agency_id>` (same active-agency pattern as dashboard).

## 2. Settings Sections Implemented
- `Agency Settings`
  - Editable: `Agency Name`, `Slug`
  - Save action: `POST /api/gnr8/agency/settings/profile`
- `Owner Profile`
  - Editable: `Owner Name`
  - Visible but non-editable: `Owner Email`
  - Save action: `POST /api/gnr8/agency/settings/owner`
- `Security`
  - Editable: `New Password`, `Confirm Password`
  - Save action: `POST /api/gnr8/agency/settings/password`
- `Danger Zone`
  - Warning text + typed confirmation input
  - Delete action: `POST /api/gnr8/agency/delete`

## 3. Authorization Model
- Settings page access: authenticated agency users with valid resolved agency membership.
- Mutations: owner-only for V1.
- Enforcement points:
  - UI disables mutation controls for non-owner users.
  - API routes enforce owner role via `requireOwnerAgencyContext(...)` using server-side membership resolution.
  - Routes fail closed on unauthorized/invalid/ambiguous agency context.

## 4. Delete-Agency Behavior
- Dedicated backend service: `apps/platform/gnr8/agency/agency-deprovisioning-service.ts`.
- Delete flow executes in controlled DB transaction order:
  - agency-scoped cost event cleanup
  - migration jobs cleanup
  - runtime-site cleanup for runtime sites linked through `ownership_site_id`
  - `gnr8_pages` cleanup by agency organizations (if table present)
  - sites, memberships, organizations
  - billing accounts and cost centers
  - agency row deletion
- Service supports memberships schema compatibility (`organization_id` / legacy `org_id`).
- Post-transaction: attempts auth-user deletion for agency-only users via service-role `auth.admin.deleteUser(...)`.
- Explicit dependency checks run before success return; unresolved rows fail with operator-facing error.

## 5. Confirmation Requirement
- Delete endpoint requires typed confirmation.
- UI keeps delete button disabled until input exactly matches the current agency slug.
- Server also validates typed slug against current persisted slug before delete execution.

## 6. Intentionally V1-Only / Unsafe-by-Later Standards
- Hard delete behavior for agency data (no soft-delete/archive flow yet).
- Auth-email change intentionally not implemented; email shown read-only to prevent unsafe mutation.
- No billing cancellation/legal/compliance offboarding workflow integrated.
- If auth cleanup fails after DB deletion, response is explicit error requiring operator follow-up.

## 7. Limitations
- Delete coverage is scoped to known agency-linked tables used by current platform model; schema drift/new tables may require extension of delete plan.
- Auth-user cleanup currently targets agency-only users determined from membership/org scope and may require manual cleanup on provider/API failure.
- Slug edits are supported with validation and uniqueness checks; any external systems keyed by old slug are not auto-migrated in this V1.

## 8. Next-Step Recommendation
- Build a safer offboarding/archive workflow with staged deactivation, reversible retention window, and asynchronous cleanup jobs before final hard-delete.
