# GNR8 Airship Single-Site Editor Foundation Closeout

Date: 2026-09-01

## Result

Status: `airship_single_site_editor_foundation_visible`.

Airship now has a narrow internal single-site editor foundation for the accepted `chs.si` MVP rehearsal:

- route: `/gnr8/airship/single-site?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`;
- imported site: `chs.si`;
- source URL: `https://www.chs.si/`;
- original clone preview: internal GNR8 runtime preview for site version `6b172a5b-200e-471c-9599-5dc70f04ea53`;
- current improved/published preview: internal GNR8 runtime preview for site version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`;
- live site link: `https://www.chs.si/`;
- AI improvement status: no concrete editable AI changes have been generated yet.

## Boundary

This phase added a read-only product-facing Airship projection and UI only.

No production content mutation, source capture, publish, dry-run, shadow-publish, rollback, active pointer mutation, provider/DNS/domain/billing mutation, migration, env change, or broad refactor was introduced.

Single-Site Studio and single-site publish diagnostics remain intact.

## Implementation

- `apps/platform/gnr8/single-site/airship-single-site-editor-readonly-projection.ts`
- `apps/platform/app/gnr8/airship/single-site/page.tsx`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.tsx`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.test.tsx`

## Verification

Focused render tests pass for Airship and the existing Single-Site Studio surface.

Scoped TypeScript verification passes for the new Airship route, component, and projection.
