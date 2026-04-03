# Logo Upload / Branding Settings UI Audit Report

## 1. Upload Flow
- Agency settings (`/gnr8/agency/settings`) now includes a `Branding` section (owner/admin visible) with:
  - current logo preview (or initials fallback)
  - file input upload (`png`, `jpg/jpeg`, `svg`)
  - replace logo via re-upload
  - remove logo action
- Client settings (`/gnr8/agency/clients/[clientId]/settings`) now includes the same `Branding` section for scoped client branding (owner/admin visible).
- Both UIs call `POST /api/gnr8/branding/upload` using `FormData`, then refresh the router so global navigation re-resolves latest brand context.
- Both UIs call `DELETE /api/gnr8/branding/upload` to clear logo and re-enable initials fallback.

## 2. Storage Strategy
- Supabase Storage bucket used: `branding` (auto-created when missing, configured public).
- Object paths:
  - `agency/<agencyId>/logo`
  - `client/<clientId>/logo`
- Upload uses `upsert: true` for straightforward replace behavior.
- Persisted URL uses public bucket URL with cache-busting query parameter `?v=<timestamp>` to prevent stale logo rendering after replacements.

## 3. Scoping Enforcement
- API route requires agency action context via `requireAgencyActionContext`.
- Action gating:
  - agency logo: `edit_agency_settings`
  - client logo: `edit_client_settings`
- Additional role gate enforces owner/admin/superadmin and denies member.
- Fail-closed scope checks:
  - requested `agencyId` must match resolved action context
  - target organization row must exist in same agency scope
  - client target requires `organization_type='client'` and matching `agency_id`
  - agency target requires `organization_type='agency'` and matching `agency_id`
- `organizations.brand_logo_url` updates are constrained with scoped `where` filters to prevent cross-tenant writes.

## 4. Rendering Behavior
- `GlobalNavigation` already consumes `agency_logo_url` and `client_logo_url` from resolver memberships and falls back to initials on absent/failed logo.
- After upload/remove, `router.refresh()` is triggered in settings UI so navigation updates immediately without waiting for full reload.
- Reload persistence is ensured because URLs are saved in `organizations.brand_logo_url` and re-hydrated through existing resolver flow.

## 5. Limitations
- No crop/editor/asset library; single-file upload only (intentional scope).
- Bucket is public to keep rendering simple and stable in global nav.
- API allows `superadmin` in admin-view mode in addition to owner/admin.
- No image processing or dimension normalization beyond basic MIME and size validation (2 MB max).

## 6. Next-Step Recommendation
- Add observability around branding operations (upload/remove success/failure counters and scope-denial metrics) to strengthen tenant-security monitoring and operational debugging.
