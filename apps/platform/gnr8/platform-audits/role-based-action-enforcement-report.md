# Role-Based Action Enforcement Report

## 1. Role model
- Canonical membership roles: `owner`, `admin`, `member`.
- Special actor role: `superadmin` for explicit admin-view routes.
- Canonical action model is centralized in `apps/platform/src/auth/rbac.ts`.

## 2. Permission matrix
- `owner`
  - Allowed: all modeled actions (`view_dashboard`, `edit_agency_settings`, `change_password`, `delete_agency`, `run_migration`, `approve_migration`, `publish`, `assign_client`, `bulk_actions`).
- `admin`
  - Allowed: operational actions (`view_dashboard`, `edit_agency_settings`, `change_password`, `run_migration`, `approve_migration`, `publish`, `assign_client`, `bulk_actions`).
  - Denied: `delete_agency`.
- `member`
  - Allowed: `view_dashboard`, `change_password`.
  - Denied: all mutation operations (`edit_agency_settings`, `delete_agency`, migration/publish/assignment/bulk actions).
- `superadmin`
  - Allowed: all modeled actions through explicit `admin_view` actor mode.

## 3. Enforcement points (UI + API)
- UI enforcement
  - Agency Settings UI now uses role-derived capability props (`canEditAgencySettings`, `canDeleteAgency`, `canChangePassword`) and owner-specific controls.
  - Slug change controls are owner-only in UI and API.
  - Destructive delete controls are hidden unless role allows `delete_agency`.
  - Command Center row and bulk actions use role-aware disable/deny logic with role restriction hints.
- API enforcement
  - Shared API guard: `apps/platform/app/api/gnr8/agency/_lib/agency-action-access.ts`.
  - Agency settings/profile/password/delete routes now require explicit action authorization.
  - Runtime mutation routes (`migrate/url`, `ready`, `approve`, `publish`, `rollback`) now require action authorization and fail closed when agency scope cannot be resolved.
  - Runtime routes include actor context output (`actor_mode`) for explicit semantics.

## 4. Superadmin override model
- Superadmin override is explicit and non-impersonating:
  - Role resolves as `superadmin`.
  - `actorMode` resolves as `admin_view`.
  - Membership resolution is bypassed for authorized admin-view actions.
- No silent owner-role substitution occurs.

## 5. Limitations
- `migrate/url` still depends on migration-factory internals for target site/agency creation behavior; RBAC now gates caller role but does not rewrite migration ownership internals.
- Command Center is currently superadmin-scoped UI; role-aware controls are now future-safe but primarily exercised as `superadmin` in current routing.

## 6. Future improvements
- Add agency-scoped assignment endpoint (membership + agency ownership checks) so `assign_client` can be exercised in non-superadmin agency paths.
- Add route-level integration tests with mocked auth/session context for API deny/allow behavior per role.
- Add reusable server instrumentation for denied RBAC events (action, actor mode, target agency).
