# Site Importer UX Refinement Report

## 1. Previous routing/scoping problem
- The Client Dashboard import CTAs (empty-state `Import Existing Website` and non-empty `Import Site`) pointed to `/gnr8/command-center/sites?clientId=...`.
- `/gnr8/command-center/*` is superadmin-gated in `apps/platform/app/gnr8/command-center/layout.tsx`, so agency owners/admins were redirected to `/superadmin`.
- Import entry did not preserve explicit client-scoped tenancy context and could leak users into admin-only surfaces.

## 2. Canonical importer route
- Canonical agency/client importer entry is now:
  - `/gnr8/agency/clients/[clientId]/sites/import?agency=[agencyId][&admin_view=1]`
- Route generation is centralized in:
  - `apps/platform/gnr8/site/site-importer-routing.ts`

## 3. Client/agency scope preservation
- Import flow now requires both scope dimensions:
  - `clientId` from route param
  - `agencyId` from agency action context
- API route:
  - `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/import/route.ts`
- Enforcement behavior:
  - `requireAgencyActionContext({ action: 'run_migration', requestedAgencyId })` keeps RBAC and agency scope strict.
  - Client org is verified as `organization_type='client'` and must belong to resolved agency.
  - Ownership binding is fail-closed if runtime site history is already linked to a different client/agency.

## 4. Redirect target behavior
- Import entry no longer redirects agency owners/admins to `/superadmin`.
- On successful import, API returns client-scoped workspace redirect:
  - `/gnr8/agency/clients/[clientId]/sites/[siteId]/overview?agency=[agencyId][&admin_view=1]`
- Redirect target assembly is centralized via:
  - `importerSuccessRedirectHref(...)` in `site-importer-routing.ts`

## 5. Limitations
- This refinement introduces URL import entry (single URL) and scoped handoff but does not redesign broader importer UX flows.
- Runtime site identity remains separate from ownership `sites.id`; this flow links the new runtime version to a scoped site ownership record but does not alter core runtime identity model.
- Manual end-to-end validation depends on real authenticated agency/client accounts and environment data.

## 6. Next-step recommendation
- Add an optional post-import success surface that summarizes:
  - imported domain
  - created/reused site ownership id
  - resulting runtime version id
  before navigating to workspace for additional operator traceability.
