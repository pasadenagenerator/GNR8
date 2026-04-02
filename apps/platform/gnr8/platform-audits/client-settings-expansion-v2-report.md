# Client Settings Expansion V2 Report

## 1. Previous settings scope

- Existing route: `/gnr8/agency/clients/[clientId]/settings`
- Existing editable fields: `name`, `slug`
- Existing save path: `POST /api/gnr8/agency/clients/[clientId]/settings`
- Existing protections:
  - central RBAC action gate: `edit_client_settings`
  - fail-closed agency/client scope checks (`agency_id` + `organization_type='client'`)

## 2. New sections added

- **Client Identity**
  - `Client Name`
  - `Slug`
- **Client Contact**
  - `Contact Person Name`
  - `Contact Email`
  - `Contact Phone`
- **Client Access / Links**
  - direct link to client dashboard route
  - direct link to client team route
  - optional copy dashboard URL button
- **Danger Zone (minimal)**
  - explicit placeholder text only, no new destructive logic

## 3. Data model choices

- Chosen canonical storage: `public.organizations` (client entity record)
- Additive schema extension:
  - `contact_person_name text`
  - `contact_email text`
  - `contact_phone text`
- Migration: `apps/platform/supabase/migrations/20260402_client_settings_contact_fields.sql`
- Rationale:
  - keeps client organization profile data on the canonical client entity
  - avoids mixing organization profile data into auth user metadata
  - keeps change minimal and explicit

## 4. RBAC/scoping model

- RBAC remains centralized via `requireAgencyActionContext({ action: 'edit_client_settings' })`
- Existing role behavior retained:
  - `owner`: edit allowed
  - `admin`: edit allowed
  - `member`: edit denied (read-only surface)
- Scope protections retained on both read/write:
  - client query/update constrained by:
    - `id = clientId`
    - `agency_id = currentAgencyId`
    - `organization_type = 'client'`
  - invalid cross-agency scope fails closed

## 5. Limitations

- No new destructive action implemented in Danger Zone (placeholder only by design).
- Contact phone validation is intentionally lightweight (length + trim) to avoid locale lock-in.
- No dedicated automated tests were added for the updated client settings API/UI in this change.

## 6. Next-step recommendation

- Add focused API and page-level tests for:
  - contact field persistence and validation
  - member read-only behavior
  - cross-agency fail-closed behavior on settings update
