# Client Invite Acceptance Onboarding Polish Report

## 1. Onboarding flow design
- Flow now enforces:
  - invite acceptance + auth success
  - post-login resolver checks client onboarding completion
  - incomplete users are routed to `/gnr8/onboarding/client-setup`
  - user submits `Name`, `Surname`, `Mobile number`
  - setup completion is persisted per client membership
  - user is redirected to `/gnr8/client`
- This mirrors owner-onboarding gate discipline (dedicated setup route + completion mutation + fail-closed checks), while remaining client-specific.

## 2. New route(s)
- Added onboarding entry page:
  - `apps/platform/app/gnr8/onboarding/client-setup/page.tsx`
- Added onboarding completion route:
  - `apps/platform/app/gnr8/onboarding/client-setup/complete/route.ts`
- Added client onboarding form component:
  - `apps/platform/app/gnr8/onboarding/client-setup/ClientSetupForm.tsx`

## 3. Data collected
- `Name`
- `Surname`
- `Mobile number`
- Email is displayed read-only in onboarding UI (from authenticated user context); not editable in this flow.

## 4. Storage model chosen
- Storage target: `public.client_memberships` (client-scoped relationship record).
- Added columns (migration: `20260401_client_setup_completed_membership_profile.sql`):
  - `client_setup_completed boolean not null default false`
  - `first_name text`
  - `last_name text`
  - `mobile_number text`
- Why this model:
  - explicit per-client relationship state (not global user metadata),
  - minimal additive schema change,
  - directly supports future client-scoped profile growth without role-model blurring.

## 5. Gating behavior
- New gate utility:
  - `apps/platform/src/auth/client-setup-gate.ts`
- Gate semantics:
  - if resolved client membership exists and `client_setup_completed=false` -> redirect to `/gnr8/onboarding/client-setup`
  - if completed -> allow `/gnr8/client`
  - if membership/client scope invalid/ambiguous -> fail closed with explicit error messaging
- `/gnr8/client` now enforces setup gate before dashboard read model load.

## 6. Post-login routing behavior
- `apps/platform/src/auth/resolve-post-login-home.ts` updated with client onboarding precedence under client role:
  - superadmin > agency > client preserved
  - after invite reconciliation and agency checks:
    - if incomplete client setup exists -> route to `/gnr8/onboarding/client-setup` (scoped with `?client=` when determinable)
    - else route to `/gnr8/client` scoped home as before

## 7. Limitations
- Mobile number validation is intentionally light (required + max length), not full E.164 parsing.
- Completion redirect uses client-scoped query path (`/gnr8/client?client=...`) to preserve correct context in multi-client users.
- No standalone client profile/settings surface is added (intentionally out of scope).

## 8. Next-step recommendation
- Build a dedicated client profile/settings surface that reuses these persisted fields, adds stronger phone formatting/validation, and supports safe updates post-onboarding without weakening invite-based access controls.
