# GNR8 Airship Draft Persistence And Review Controls Closeout

Date: 2026-09-02
Status: `airship_draft_persistence_and_review_controls_working`.

Airship now has draft-only persistence for the `chs.si` single-site editor at `/gnr8/airship/single-site?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`.

## Implementation

- Draft storage table: `public.gnr8_airship_single_site_editor_drafts`.
- Draft event table: `public.gnr8_airship_single_site_editor_draft_events`.
- Migration: `apps/platform/supabase/migrations/20260902120000_airship_single_site_editor_drafts.sql`.
- Service/repository: `apps/platform/gnr8/single-site/airship-single-site-draft-service.ts`.
- Superadmin API route: `/api/gnr8/admin/airship/single-site/drafts`.
- UI: Airship edit rows now support `Save edit`, `Accept draft edit`, and `Reject draft edit`.

The persisted draft stores migration identity, optional source-truth refs, source URL, target site version refs, draft edits, draft status, safe metadata, version, and semantic watermark. It does not store raw provider payloads, secrets, cookies, tokens, billing data, raw SQL, or stack traces.

## Product Behavior

- Saved draft edits reload from draft storage.
- The Airship draft preview reflects saved and locally edited draft text.
- Accepted and rejected edit status is persisted as review state only.
- Rejected edits fall back to the generated CHS baseline inside the Airship draft preview.
- Labels remain explicit: `Saved Airship draft`, `Not applied to live site`, and `Not published`.
- The live CHS site remains a separate outbound link to `https://www.chs.si/`.

## Boundary

This phase does not apply draft edits to runtime site versions, does not create an improved runtime candidate, does not publish, does not dry-run, does not shadow-publish, does not roll back, does not capture source, and does not move active pointers.

The broad platform TypeScript no-emit check is currently blocked by unrelated existing test fixture/type errors outside this Airship scope. Focused Airship tests pass.

## Production Verification

Documented backup posture was rechecked from the current production-readiness docs before applying the migration: recorded evidence remains `backup_restore_confirmed`, latest visible DB backup `17 Aug 2026 03:08:21 (+0000)`, with Supabase Storage outside DB backups.

Production preflight found no existing Airship draft tables and no `20260902120000` migration history row. The narrow migration was applied directly to production and recorded in `supabase_migrations.schema_migrations` as version `20260902120000`, name `airship_single_site_editor_drafts`.

Exactly one production Airship draft was created/updated for migration `682a09fd-8fd5-4f73-93b8-54f5d4067c63`:

- Draft id: `f9b31666-b3b0-4455-8650-4a8c7304a559`.
- Draft status/version: `mixed`, version `5`.
- Accepted headline: `CHS helps modernize secure enterprise IT`.
- Saved subheading edit: `Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.`
- Rejected CTA edit: `Contact CHS at sales@chs.si`.

Reload/readback through the Airship projection returned `Saved Airship draft`, `Not applied to live site`, and `Not published`; the draft preview showed the saved headline and subheading while preserving the rejected CTA as draft review state only.

Active pointer before and after remained unchanged for runtime site `site_57d9665a3a5867edf6ef`:

- Active site version: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Active artifact: `1f80138a-39c2-4210-ac61-16200e5a2254`.
- Pointer timestamp: `2026-08-30 17:11:16.948547+00`.
