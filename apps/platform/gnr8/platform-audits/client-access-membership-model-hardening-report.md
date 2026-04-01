# Client Access / Membership Model Hardening Report

Date: 2026-04-01  
Scope: Canonical client user access foundation for `/gnr8/client`

## 1. Previous Effective Model

Before this hardening pass, effective client access was derived from `public.memberships` rows that pointed at `organizations.organization_type = 'client'`.

- Agency and client access used the same membership table and role surface.
- Client resolution in `src/auth/resolve-current-client.ts` filtered shared memberships to `organization_type='client'`.
- `/gnr8/client` resolved user context through that shared membership path.
- `sites` RLS policy was agency-membership-centric, creating risk that pure client users would not have a clean DB-level read path and that future logic could drift back toward agency-derived assumptions.

Weaknesses:

- No dedicated canonical relation for `user -> client`.
- Ambiguity between agency RBAC memberships and client dashboard access memberships.
- Invite foundation for client onboarding lacked an explicit destination model.

## 2. Canonical New/Confirmed Model

Canonical client access relation is now explicit:

`user -> client_memberships -> client organization -> agency`

Implemented foundation:

- New table: `public.client_memberships`
  - `user_id`
  - `client_organization_id`
  - `agency_id`
  - `role` (`owner | member`)
- Validation trigger enforces:
  - destination organization must be `organization_type='client'`
  - `client_memberships.agency_id` must equal `organizations.agency_id`

Client users are not agency users by default:

- Agency permissions continue to derive from `public.memberships` over agency organizations.
- Client dashboard access derives from `public.client_memberships`.

## 3. Client Resolution Rules

Resolver: `src/auth/resolve-current-client.ts`

- Source of truth: `public.client_memberships` only.
- Membership rows are valid only when:
  - role is recognized (`owner | member`)
  - `client_organization_id` and `agency_id` are valid UUIDs
  - linked organization is `organization_type='client'`
  - linked organization agency matches membership `agency_id`
- Resolver is deterministic and fail-closed:
  - one valid membership -> auto-resolve
  - zero valid memberships -> `NO_MEMBERSHIP`
  - multiple valid memberships + no active client -> `ACTIVE_CLIENT_REQUIRED`
  - invalid active client -> `ACTIVE_CLIENT_INVALID`
- No silent fallback to first client.

## 4. Role Model

Client role model is intentionally minimal in V1:

- `owner`
- `member`

No additional client roles were introduced in this hardening pass.

## 5. Post-Login Routing Implications

Routing resolver: `src/auth/resolve-post-login-home.ts`

- Precedence preserved: `superadmin > agency > client`.
- Client routing now uses the hardened client resolver directly.
- Behavior:
  - single valid client context -> route to scoped `/gnr8/client?client=<id>`
  - multiple valid client contexts without explicit selection -> route to `/gnr8/client` (selection required in-page)
  - invalid requested client -> deterministic safe route to `/gnr8/client`
  - no client access -> `/signup/access-missing`

## 6. Isolation Guarantees

App-level:

- `/gnr8/client` uses resolved client scope only.
- `client-dashboard-read-model.ts` now asserts:
  - client organization belongs to resolved agency
  - every site row matches resolved `client_id + agency_id`
  - cross-client/cross-agency rows fail closed

DB-level:

- `client_memberships` introduced with validation trigger.
- `organizations` RLS policy now recognizes explicit `client_memberships` access.
- `sites` RLS policy now allows reads for exact matching `client_memberships` (`sites.org_id` + `sites.agency_id`), while preserving agency-member scope for agency users.

## 7. Limitations

- Existing agency membership/invite flows remain agency-centric; no client invite UI is implemented in this task.
- Client invite acceptance flow is not yet wired to runtime endpoints/UI.
- `client_membership_invites` is schema foundation only in this pass.
- Active client context remains query-parameter-based (`?client=<uuid>`), not persisted in session/profile.

## 8. Next-Step Recommendation

Build the client invitation acceptance/service path on top of `client_membership_invites` and `client_memberships` so invite acceptance creates only client-scoped access (never agency-wide membership).

## 9. Legacy Memberships Schema Compatibility Fix (2026-04-01)

Issue observed during migration apply:

- `20260401_client_access_membership_hardening.sql` initially referenced `coalesce(m.organization_id, m.org_id)` directly in static SQL.
- In legacy production variants where `public.memberships.organization_id` does not exist, PostgreSQL fails at parse time with:
  - `ERROR: 42703: column m.organization_id does not exist`

Applied fix:

- Migration now introspects `information_schema.columns` for `public.memberships` and resolves one safe runtime expression:
  - dual-column schema: `coalesce(m.organization_id, m.org_id)`
  - modern-only schema: `m.organization_id`
  - legacy-only schema: `m.org_id`
- Backfill insert and RLS policy creation now run via `DO $$ ... $$` dynamic `EXECUTE format(...)` using that resolved expression.
- Migration remains additive/idempotent and requires no manual pre-editing of membership columns.
