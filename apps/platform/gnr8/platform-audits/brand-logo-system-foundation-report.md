# Brand Logo System Foundation Report

## 1. Chosen logo data model
- Canonical logo field: `public.organizations.brand_logo_url` (`text`, nullable).
- Rationale: `organizations` already carries shared identity context for both agency and client organization records.
- Scope in V1:
  - Agency workspace branding reads logo from the agency-type organization linked to membership.
  - Client workspace branding reads logo from the client organization linked to membership.
  - Command Center branding stays application-owned (`GNR8` static textual brand in V1; no DB dependency).
- Migration added: `apps/platform/supabase/migrations/20260403_brand_logo_url_foundation.sql` (additive only).

## 2. Workspace-specific brand behavior
- Command Center (`/gnr8/command-center...`): renders `GNR8` brand model.
- Agency Workspace (`/gnr8/agency...`): renders active agency identity from existing agency membership context.
  - Uses agency logo when `agency_logo_url` exists.
  - Uses agency label fallback when logo is absent/invalid.
- Client Workspace (`/gnr8/client...`): renders active client identity from existing client membership context.
  - Uses client logo when `client_logo_url` exists.
  - Uses client label fallback when logo is absent/invalid.

## 3. Fallback behavior
- If no logo URL is present, brand slot renders an initial-based identity chip + textual label.
- If logo URL is present but fails to load, UI fails over to the same initial-based fallback.
- If active context ID cannot be resolved, label fallback is used (`Agency` or `Client`) without layout collapse.

## 4. Rendering approach
- `GlobalNavigation` now receives brand identity arrays from `app/gnr8/layout.tsx` using existing membership resolver calls (no new broad fetch path).
- Logo rendering is bounded and safe:
  - fixed logo frame dimensions
  - `object-fit: contain` to preserve aspect ratio
  - URL sanitization (`http`, `https`, and root-relative paths only)
  - runtime image error handling with fallback rendering
- BrandSlot model now supports:
  - `variant`: `command-center | agency | client`
  - `label`
  - optional `logoUrl`
  - optional `subtitle`

## 5. Limitations
- This task does not add upload/edit UI for `brand_logo_url` (rendering foundation only).
- Command Center uses text-first branding in V1; no dedicated static logo asset file was introduced.
- Agency-managed client subroutes under `/gnr8/agency/clients/...` remain under the Agency workspace brand context by route family.

## 6. Next-step recommendation
- Implement a minimal Logo Upload / Branding Settings UI for agency and client contexts that writes `organizations.brand_logo_url` with strict validation and scoped access control.
