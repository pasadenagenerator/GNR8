# Superadmin Team + Client Users Admin-View Report

## 1. Routes Added
- Added dedicated superadmin agency-team route:
  - `/gnr8/admin/agencies/[agencyId]/members`
  - File: `apps/platform/app/gnr8/admin/agencies/[agencyId]/members/page.tsx`
- Added dedicated superadmin client-users route:
  - `/gnr8/admin/agencies/[agencyId]/clients/[clientId]/users`
  - File: `apps/platform/app/gnr8/admin/agencies/[agencyId]/clients/[clientId]/users/page.tsx`

## 2. RBAC Integration
- Reused centralized RBAC via `canPerformAction(...)` and centralized action-context gate via `requireAgencyActionContext(...)`.
- `superadmin` permissions are centrally defined in `apps/platform/src/auth/rbac.ts` and already allow:
  - `view_members`
  - `invite_user`
  - `edit_member_role`
  - `remove_member`
  - `view_client_users`
  - `invite_client_user`
  - `edit_client_user`
  - `remove_client_user`
- No ad hoc role bypasses were introduced in page code.

## 3. Actor Semantics
- Admin pages require superadmin with fail-closed gating.
- Admin pages are explicit support-mode routes and render with `actorMode='admin_view'`.
- Existing API action context resolves superadmin callers as:
  - `role = superadmin`
  - `actorMode = admin_view`
- Mutation routes now log actor envelope fields for attribution:
  - `actor_user_id`
  - `actor_mode`
  - `target_agency_id`
  - `target_client_id` (for client invite route)

## 4. Agency Team Admin-View Behavior
- Superadmin can open `/gnr8/admin/agencies/[agencyId]/members`.
- Page validates target agency exists and fails closed on invalid scope.
- Reuses existing `AgencyMembersClient` and existing member APIs.
- Support-mode UI includes:
  - `Admin View` badge
  - Agency name
  - Agency ID
  - `Actor Mode: admin_view`
- Available actions in admin view:
  - list members
  - invite user
  - edit role
  - remove member

## 5. Client Users Admin-View Behavior
- Superadmin can open `/gnr8/admin/agencies/[agencyId]/clients/[clientId]/users`.
- Page validates:
  - agency exists
  - client exists
  - client belongs to `agencyId`
  - fail-closed on mismatch/invalid IDs
- Reuses existing `ClientUsersClient` and existing client-user APIs.
- Support-mode UI includes:
  - `Admin View` badge
  - Agency name / Agency ID
  - Client name / Client ID
  - `Actor Mode: admin_view`
- Available actions in admin view:
  - view active + pending client users
  - send client-user invite

## 6. Limitations
- Current client-user UI/API surface in this codebase supports list + invite only; edit/remove client-user mutation routes are not currently implemented in this task scope.
- Agency member invite/role-update service methods do not persist a dedicated durable audit record yet; this task preserves actor context and adds mutation-envelope logging at route level.

## 7. Next-Step Recommendation
- Add a persistent audit event sink for agency/client membership mutations that stores immutable actor + target fields (`actor_user_id`, `actor_mode`, `target_agency_id`, `target_client_id`, action, timestamp) per write operation.

## 8. Follow-Up Fix (2026-04-01): memberships org-column compatibility in agency members read path
- Symptom observed in production-compatible schema variants:
  - `Failed to list agency members: column memberships.organization_id does not exist`
- Root cause:
  - agency members listing path used a hardcoded `memberships.organization_id` filter.
  - legacy production schema can expose only `memberships.org_id`.
- Fix applied:
  - agency members service now introspects `information_schema.columns` for `public.memberships` and resolves one safe runtime expression:
    - dual-column schema: `coalesce(m.organization_id, m.org_id)`
    - modern-only schema: `m.organization_id`
    - legacy-only schema: `m.org_id`
  - list query is constructed dynamically from that expression to avoid parse-time failures when one column is absent.
- Coverage:
  - superadmin admin-view page (`/gnr8/admin/agencies/[agencyId]/members`)
  - normal agency page (`/gnr8/agency/members`)
  - agency members list API route (`GET /api/gnr8/agency/members`)
- Added test:
  - query-generation compatibility assertions for `org_id`-only and dual-column schemas in `apps/platform/gnr8/agency/agency-membership-service.test.ts`.
