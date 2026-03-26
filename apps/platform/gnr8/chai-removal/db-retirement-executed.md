# DB Retirement Executed: `public.builder_pages`

- Date: 2026-03-26
- Scope: Retirement of legacy ChaiBuilder table `public.builder_pages` only.
- Migration file reference: `apps/platform/supabase/migrations/20260326_retire_builder_pages.sql`
- Export confirmation reference: archival export completed before destructive step (recorded in retirement workflow and preconditioned in `apps/platform/gnr8/chai-removal/db-schema-retirement-plan.md`, sections "Stage 3 — Archival artifact generation" and "Preconditions Before Any DROP").
- Verification method: static compile/build verification after migration creation:
  - `pnpm exec tsc --noEmit`
  - `pnpm exec next build`

Architectural note: “ChaiBuilder fully removed from runtime, API, packages and database”
