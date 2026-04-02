# Agency Client Management Entry Points Report

## 1. Add Client flow
- Added a visible `Add Client` action in the Agency Dashboard `Client Overview` section (`/gnr8/agency`).
- Added route `GET /gnr8/agency/clients/new` with a minimal form:
  - `Client Name` (required)
  - `Slug` (required)
- Added mutation endpoint `POST /api/gnr8/agency/clients/create`:
  - Enforces authenticated agency context via `requireAgencyActionContext(...)`.
  - Enforces centralized RBAC action `create_client`.
  - Creates canonical client row in `public.organizations` with:
    - `organization_type = 'client'`
    - `agency_id = current agency`
    - persisted `name` and `slug`
- Successful create redirects to client settings:
  - `/gnr8/agency/clients/[clientId]/settings?agency=[agencyId]`

## 2. Routes added/used
- Added:
  - `GET /gnr8/agency/clients/new`
  - `GET /gnr8/agency/clients/[clientId]/dashboard`
  - `GET /gnr8/agency/clients/[clientId]/settings`
  - `POST /api/gnr8/agency/clients/create`
  - `POST /api/gnr8/agency/clients/[clientId]/settings`
- Reused:
  - `GET /gnr8/agency/clients/[clientId]/users` (existing client team route)
  - `GET /gnr8/client?client=[clientId]` (linked as client-side dashboard route)

## 3. RBAC model
- Extended centralized RBAC actions:
  - `create_client`
  - `edit_client_settings`
- Policy:
  - `owner`: allowed
  - `admin`: allowed
  - `member`: denied
- Existing `view_client_users` remains the gate for Client Team access.
- Added RBAC tests to lock owner/admin/member behavior.

## 4. Client actions exposed
- In Agency Dashboard `Client Overview`, each client row now exposes:
  - `Client Dashboard`
  - `Client Settings`
  - `Client Team`
- Added section-level action:
  - `Add Client`

## 5. Settings/dashboard/team behavior
- Client Dashboard:
  - Agency-side entry route validates agency/client scope and reuses existing client dashboard read model service (`getClientDashboardReadModelForPage`).
  - Does not rely on client membership context; uses agency-scoped validation.
- Client Settings:
  - Added minimal settings surface for `Client Name` + `Slug`.
  - Uses `POST /api/gnr8/agency/clients/[clientId]/settings`.
  - Denies edits for member role.
- Client Team:
  - Reuses existing route: `/gnr8/agency/clients/[clientId]/users`.

## 6. Limitations
- `next build` is currently blocked by environment/toolchain issues unrelated to this feature:
  - ESLint plugin load failure (`jsx-a11y` dependency package config issue).
  - Runtime page-data collection failure (`binaryParsers.init is not a function`) on existing API route collection.
- No public signup or CRM-style client lifecycle expansion was added (intentionally out of scope).

## 7. Next-step recommendation
- Add targeted E2E coverage for:
  - create client (owner/admin success, member forbidden)
  - per-row action access visibility by role
  - cross-agency client-id access attempts (fail-closed responses)
