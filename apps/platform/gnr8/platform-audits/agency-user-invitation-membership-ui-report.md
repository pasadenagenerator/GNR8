# Agency User Invitation & Membership UI Report

## 1) Route Chosen
- Implemented dedicated agency members route: `/gnr8/agency/members`.
- The page is agency-scoped, authenticated, and fail-closed on missing/invalid/ambiguous agency context.

## 2) Invite Flow Design
- Added invite endpoint: `POST /api/gnr8/agency/members`.
- Flow:
  1. Resolve actor + agency scope via centralized `requireAgencyActionContext`.
  2. Enforce RBAC action `invite_user`.
  3. Send Supabase invite email with service-role `auth.admin.inviteUserByEmail`.
  4. Upsert membership in the current agency organization with selected role.
- No direct user creation UI was added; invite-based onboarding model is preserved.

## 3) Membership Model Used
- Canonical model retained: `user -> membership -> organization (agency)`.
- Membership mutations are scoped to the agency organization row (`organizations.organization_type = 'agency'`).
- Membership listing is derived from `memberships` for the resolved agency organization and enriched from Supabase Auth user metadata.

## 4) RBAC Model for Member Management
- Extended centralized RBAC actions in `src/auth/rbac.ts`:
  - `view_members`
  - `invite_user`
  - `edit_member_role`
  - `remove_member`
- V1 policy implemented:
  - `owner`: full member management actions allowed.
  - `admin`: view-only for members page.
  - `member`: view-only for members page.
  - `superadmin`: allowed in admin-view mode through existing action-context helper.

## 5) Role Change / Removal Rules
- Role update endpoint: `PATCH /api/gnr8/agency/members/[membershipId]`.
- Removal endpoint: `DELETE /api/gnr8/agency/members/[membershipId]`.
- Safety rules:
  - Role edits are limited to `admin <-> member` in V1.
  - Owner role transfer/demotion is intentionally blocked in V1.
  - Owner membership removal is blocked in V1.
  - Self-removal is blocked in V1.

## 6) Limitations
- Member `status` is inferred from auth state (`confirmed/sign-in` => `active`, otherwise `invited`) and is not backed by a dedicated invitation-state table.
- Owner transfer workflows are intentionally deferred to avoid ownerless/self-lockout risk.
- Invite API currently relies on Supabase invite behavior for existing emails; no separate "existing-account attach" flow was introduced in this task.
- In this environment, `pnpm exec next build` did not complete and appeared to hang without output, so full build validation could not be confirmed here.

## 7) Next-Step Recommendation
- Add a dedicated invitation lifecycle model/table (token/state/timestamps) to replace inferred status and support deterministic invitation auditing + resend/cancel flows without broadening scope to enterprise IAM.
