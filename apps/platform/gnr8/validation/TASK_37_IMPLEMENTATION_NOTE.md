# Task 37 - Persistent Preview Bundle Storage for Hosted Exports (Implementation Note)

## Storage backend used
- Primary persistent backend: `Supabase Storage` (service role upload/download).
- Bucket env: `GNR8_PREVIEW_SUPABASE_BUCKET` (default: `gnr8-preview-bundles`).
- Required env for Supabase backend: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Deterministic local persistent object-storage fallback for tests/dev: `GNR8_PREVIEW_PERSISTENT_FS_ROOT`.

## Deterministic preview storage key rule
- Preview bundle root key:
  - `phase1-materialized-previews/v1/<executionPlanId>`
- Per-file path mapping:
  - For each materialized file at bundle-relative path `<relPath>`, object key is
    - `phase1-materialized-previews/v1/<executionPlanId>/<relPath>`
- `index.html` entry rule:
  - Entry file key is always
    - `phase1-materialized-previews/v1/<executionPlanId>/index.html`
- Asset path mapping:
  - Asset files keep their materialized relative path under the same deterministic root.

## Local vs deployed preview behavior
- Materialized runs now attempt persistent publish first.
- If persistent publish succeeds:
  - preview URLs are backed by persistent storage keys and remain valid across requests/runtime instances.
- If persistent publish is unavailable/fails:
  - local filesystem preview fallback is allowed by default in non-hosted runtime (`NODE_ENV !== production`, no `VERCEL=1`), preserving local dev ergonomics.
  - hosted/prod can disable fallback and require persistence (`GNR8_PREVIEW_ALLOW_LOCAL_FALLBACK=0`).
- Preview serving route resolves both key types:
  - persistent object-storage preview keys
  - local filesystem preview keys (controlled `.gnr8-static-output` roots only)

## Metadata surfaced on execution results
- `previewHosting` now includes:
  - `status`
  - `available`
  - `previewEntryUrl`
  - `previewRootUrl`
  - `previewStorageKind`
  - `previewStorageKey`
  - `reasonCode`
- Simulation and blocked runs remain explicitly unavailable and do not claim persistent preview availability.

## Files changed
- `apps/platform/gnr8/migration/temporary-preview-hosting.ts`
- `apps/platform/gnr8/migration/execution-result-model.ts`
- `apps/platform/app/validation/previews/by-output/[previewKey]/[[...previewPath]]/route.ts`
- `apps/platform/src/validation-shell/temporary-preview-hosting.test.ts`
- `apps/platform/app/validation/beta-export-operator/page.tsx`
- `apps/platform/app/validation/url-import-operator/_components/url-import-operator-console.tsx`
- `apps/platform/gnr8/validation/README.md`
- `apps/platform/gnr8/validation/TASK_37_IMPLEMENTATION_NOTE.md`

## Current limitations
- Supabase public URL/CDN/publish flow is not part of this task; preview route still streams through app server.
- No ZIP packaging.
- No customer-facing sharing UX.
- No multi-page crawl changes.
- If persistent backend env is missing in hosted runtime and local fallback is disabled, previews are intentionally unavailable with structured reason codes.
