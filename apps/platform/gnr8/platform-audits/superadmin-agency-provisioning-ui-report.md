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

## 8. Follow-Up Fix (2026-03-30): organizations.id NULL Provisioning Failure
- Root cause identified in `gnr8/agency/agency-provisioning-service.ts`:
  - transactional `provisionAgency(...)` inserted into `public.organizations` without explicitly passing `id`.
  - in environments where legacy `public.organizations.id` has no default generator, inserts failed with:
    - `null value in column "id" of relation "organizations" violates not-null constraint`.
- Minimal safe fix applied in provisioning service:
  - explicit UUID generation in application code (`randomUUID()`) for all provisioning inserts that previously relied on DB defaults:
    - `public.agencies`
    - `public.organizations` (agency + default client)
    - `public.memberships`
    - `public.billing_accounts`
    - `public.cost_centers` (agency + client)
  - added `buildOrganizationInsertPayload(...)` helper with validation so organization insert shape always includes:
    - `id`
    - `name`
    - `agency_id`
    - `organization_type`
- Partial-failure invite/provisioning handling clarity improved:
  - if provisioning fails after invite and delete rollback fails, error now explicitly states manual cleanup is required and points operators to verify `auth.users` before retry.
  - if rollback succeeds, error now explicitly states rollback was executed via `deleteUser(...)` and recommends verification before retry.
- Validation added:
  - new test file: `gnr8/agency/agency-provisioning-service.test.ts`
  - covers organization payload generation for both agency/client inserts and invalid input rejection.

## 9. Follow-Up Fix (2026-03-30): memberships organization_id/org_id Schema Alignment
- Runtime failure observed after invite succeeded and rollback worked:
  - `column "organization_id" of relation "memberships" does not exist`.
- Root cause:
  - provisioning membership insert assumed `public.memberships.organization_id` existed in all environments.
  - production-compatible environments can still expose legacy `memberships.org_id` without `organization_id`.
- Safe schema-aligned fix:
  - provisioning now inspects `information_schema.columns` for `public.memberships` and dynamically uses:
    - dual write (`organization_id` + `org_id`) when both exist,
    - `organization_id` write when only that column exists,
    - `org_id` write when legacy schema is present.
  - membership write was updated to an update-then-insert CTE so idempotent role reconciliation does not depend on a specific unique constraint shape.
- Additional provisioning schema audit hardening in code:
  - preflight validation now checks required columns across:
    - `agencies`
    - `organizations`
    - `memberships`
    - `billing_accounts`
    - `cost_centers`
  - missing columns fail closed with explicit mismatch messaging.
- Validation coverage extended:
  - tests now verify membership mutation SQL payload selection for legacy (`org_id`), modern (`organization_id`), and dual-column compatibility schemas.
  - tests include required-column mismatch detection for provisioning table set.
