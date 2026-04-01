# Client User Invitation UI Report

## 1) Route Chosen
- Agency-scoped client user management page:
  - `/gnr8/agency/clients/[clientId]/users`
- Supporting API routes:
  - `GET /api/gnr8/agency/clients/[clientId]/users`
  - `POST /api/gnr8/agency/clients/[clientId]/users/invite`

## 2) Invite Flow Design
- Actor opens a client-scoped users page under agency scope.
- UI submits invite payload (`agencyId`, `email`, `role`) to invite API route.
- API resolves and validates agency scope via centralized `requireAgencyActionContext`.
- Service validates client belongs to the resolved agency (`organizations.organization_type='client'`).
- Service sends invite email via `auth.admin.inviteUserByEmail(..., { redirectTo: /auth/callback })`.
- Service writes invite row into canonical `client_membership_invites` with explicit `client_organization_id`, `agency_id`, `role`, and `invited_by_user_id`.
- Duplicate pending invites for same client/email are blocked.

## 3) Client Membership Model Used
- Canonical model only:
  - `user -> client_membership_invites -> client (organization) -> agency`
  - `user -> client_memberships -> client (organization) -> agency`
- No agency membership is created for invited client users.
- No parallel invite model was introduced.

## 4) RBAC Model
- Added centralized actions:
  - `view_client_users`
  - `invite_client_user`
  - `edit_client_user`
  - `remove_client_user`
- V1 policy implemented in central RBAC matrix:
  - `owner`: allowed
  - `admin`: allowed
  - `member`: denied
- UI and API both enforce via centralized RBAC action checks (no ad hoc owner/admin checks).

## 5) Acceptance/Post-Login Behavior
- Added post-login reconciliation:
  - `reconcilePendingClientMembershipInvitesForCurrentUser()`
  - invoked from post-login resolver before role-home resolution.
- Reconciliation behavior:
  - finds pending invites for authenticated email,
  - upserts `client_memberships` for authenticated user,
  - marks invite `accepted` with `accepted_by_user_id` and `accepted_at`.
- Result:
  - accepted invitees become client-scoped users,
  - resolver routes them to `/gnr8/client`,
  - no agency dashboard access is granted by this flow.

## 6) Limitations
- V1 page supports list + invite only.
- Role editing/removal actions are not exposed in UI yet.
- Existing pending invite rows are shown as `pending`; active rows are from `client_memberships`.
- Full invite-email delivery and browser acceptance path depends on configured Supabase/auth environment.

## 7) Next-Step Recommendation
- Add safe V1 mutation endpoints and UI controls for:
  - revoke pending invite,
  - remove client membership,
  - limited client role updates (`owner/member`) with ownership-protection guardrails.
