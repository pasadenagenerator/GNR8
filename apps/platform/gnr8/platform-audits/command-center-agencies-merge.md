# Command Center Agencies Merge Audit

## 1. Previous split architecture
- ` /gnr8/command-center ` hosted migration command center workflows (portfolio metrics, migration operations table, superadmin controls for site operations).
- ` /gnr8/admin/agencies ` hosted agency provisioning and agency directory operations (create agency + existing agencies table).
- Superadmin operators needed to context-switch between two routes for related operating tasks.

## 2. New unified structure
- ` /gnr8/command-center ` is now the unified superadmin operating interface.
- Agencies provisioning and agencies directory have been integrated as a dedicated section inside Command Center.
- The old ` /gnr8/admin/agencies ` route is retained as a deprecation route and now redirects to ` /gnr8/command-center `.

## 3. Sections inside Command Center
- Portfolio and migration controls (existing):
  - filters
  - portfolio metrics
  - sites/operations table
- Agencies (new):
  - Create Agency form
  - Existing Agencies table (Name, Slug, Agency ID, Created At, Actions)

## 4. Reused components
- Reused existing create form component:
  - `apps/platform/app/gnr8/admin/agencies/_components/create-agency-form.tsx`
- Extracted and reused agencies list rendering logic into a dedicated component:
  - `apps/platform/app/gnr8/admin/agencies/_components/existing-agencies-table.tsx`
- Reused the existing Command Center read model path and extended it to include agencies list data:
  - `apps/platform/gnr8/command-center/command-center-read-model.ts`

## 5. Routing decisions
- ` /gnr8/admin/agencies ` now performs a server redirect to ` /gnr8/command-center ` for safe deprecation.
- Preserved existing agency routes unchanged:
  - ` /gnr8/admin/agencies/[agencyId]/dashboard `
  - ` /gnr8/admin/agencies/[agencyId]/settings `
- Agencies table actions continue linking to those preserved routes.

## 6. Limitations
- Existing create form success state does not auto-refresh the agencies table without a page refresh (existing behavior preserved).
- Agencies list currently depends on the same read-model availability as the command center client directory branch; when that branch falls back, agencies list can be empty in fallback mode.

## 7. Next steps
- Add progressive enhancement for agencies table refresh after successful create (client-side refresh or server action revalidation), without changing provisioning business logic.
- Add explicit instrumentation counters for agencies list query health distinct from client directory loading.
- Consider introducing pagination/search for agencies list if row count grows beyond practical render bounds.
