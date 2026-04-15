# Template Intake Foundation — ZIP Upload -> Template Record -> Preview Card

## Scope
Phase-1 implementation introduces deterministic template intake for client-scoped ZIP HTML uploads and exposes first-class template records in the client dashboard.

Implemented:
- Template domain persistence (`public.gnr8_templates`)
- ZIP upload API for client scope
- Safe ZIP entry validation (type/size/empty/path traversal)
- Deterministic HTML entry selection (`index.html` preference)
- Manifest normalization (`template.json` / `manifest.json` + safe fallback derivation)
- Import manifest generation via existing importer contract (`importStaticSite` + `createImportManifest`)
- Import health mapping (`clean` / `degraded` / `failed`)
- Truthful preview summary (`rendered_capture` if available, otherwise explicit fallback)
- Client dashboard template cards and upload flow
- Deterministic lifecycle diagnostics summary persisted on each template record

Out of scope:
- Website creation flow
- Domain/Vercel/SSL
- AI-generated tags
- Template editing/publishing/sharing

## Data Model
Migration: `apps/platform/supabase/migrations/20260415_template_intake_foundation.sql`

Table: `public.gnr8_templates`
- Identity: `id`
- Scope: `client_id`, `organization_id`, `agency_id`
- Provenance: `created_by_user_id`, `source_type`, `source_filename`, `import_snapshot_id`
- State: `status`, `import_health`, `version`, `visibility`
- Preview: `preview_image_path`, `preview_available`, `preview_is_fallback`, `preview_source`
- Metadata: `name`, `slug`, `tags`, `template_manifest_summary`, `diagnostics_summary`, `import_manifest_summary`
- Audit: `created_at`, `updated_at`

Deterministic ordering: `(created_at desc, id desc)`

## Intake Flow
1. `POST /api/gnr8/clients/[clientId]/templates/upload`
2. Resolve authenticated client scope (`resolveCurrentUserClient` with requested client ID)
3. Validate upload envelope:
   - `.zip` extension only
   - non-empty
   - max size cap
4. Validate ZIP entries before extraction:
   - reject traversal/unsafe paths
5. Extract ZIP to deterministic temp intake root (`snapshotId` from ZIP content hash)
6. Choose HTML entry deterministically:
   - root `index.html`
   - nested `index.html`
   - lexical first HTML
7. Resolve manifest (`template.json`/`manifest.json`) or deterministic fallback
8. Run existing deterministic import contract from extracted snapshot root
9. Build import manifest summary + health classification
10. Resolve preview summary with truthful fallback
11. Persist final template processing result

## Diagnostics
Lifecycle diagnostics are structured and persisted under `diagnostics_summary` with deterministic dedupe/sorting.

Primary codes include:
- upload acceptance/rejection
- ZIP unpack lifecycle
- path traversal protection
- HTML entry resolution
- manifest found/missing/normalized
- import started/completed/degraded/failed
- preview resolved/fallback
- template record created/updated

## UI
Client dashboard adds Templates section:
- `Add New Template` upload action
- ZIP file picker + upload state
- deterministic list refresh on success
- template cards showing:
  - preview area (real or truthful fallback)
  - name
  - tags
  - source type
  - status
  - import health

## Determinism Notes
- No AI path in intake.
- Tags use manifest first, then deterministic filename heuristics, otherwise empty.
- Diagnostics are deduped and sorted.
- Snapshot ID is stable for identical ZIP bytes.
- List ordering is stable with tie-break.
