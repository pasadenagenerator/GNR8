# Superadmin Agency Provisioning UI Report

## 1. Route Created
- Page route created: `apps/platform/app/gnr8/admin/agencies/page.tsx`
- API route created: `apps/platform/app/api/gnr8/admin/create-agency/route.ts`
- API method implemented: `POST`

## 2. Form Fields
- Implemented minimal provisioning form with:
  - Agency Name (required)
  - Slug (required)
  - Owner Email (required)
  - Owner Name (optional)
- Submit action: `Create Agency`
- Success state includes:
  - Agency name
  - Owner email
  - Invite status (`invited`)

## 3. Provisioning Flow
- API route enforces superadmin auth and parses validated payload.
- Route calls provisioning service entrypoint:
  - `createAgency({ name, slug, ownerEmail, ownerName })`
- Provisioning service internally:
  1. Invites owner user via Supabase Auth admin invite.
  2. Reuses existing transactional `provisionAgency(...)` to create:
     - `agencies` record
     - agency `organizations` record
     - owner `memberships` row (`role=owner`)
     - `billing_accounts` row
     - agency `cost_centers` row
     - optional default client if provided
- Partial failure handling:
  - If invite succeeds but DB provisioning fails, service attempts invite rollback using `deleteUser(...)`.
  - Failure path returns explicit error context.

## 4. Invite Flow Details
- Invite method used: `supabase.auth.admin.inviteUserByEmail(email, { data })`
- Invite metadata includes optional `full_name` from Owner Name input.
- Invited user id returned from Auth is used as owner user id for membership creation.
- Result returned to UI includes owner invite status: `invited`.

## 5. Access Control
- Page-level guard:
  - `requireSuperadminUserIdForPage()` (read-only cookie behavior in server component)
  - Unauthorized -> redirect `/login`
  - Forbidden -> redirect `/superadmin`
- API-level guard:
  - `requireSuperadminUserId()` (mutating request-safe auth helper)
  - Additional request-scoped auth check with mutating Supabase server client
- Non-superadmin callers are denied (fail closed).

## 6. Limitations
- Existing agencies list currently uses service-role read and falls back to empty list if service-role env is missing or query fails.
- Duplicate owner email is enforced as conflict; adoption flow for pre-existing auth users is not included in this minimal scope.
- Audit DB insert to `public.audit_logs` is best-effort; structured server log is always emitted.
- Idempotent retry semantics are limited to current table constraints and conflict checks; repeated same request after success returns duplicate conflicts.

## 7. Next Step
- Add superadmin-side agency membership invite/resend/role tooling for owner/admin onboarding continuity.
