# GNR8 Airship First Concrete AI Draft Closeout

Date: 2026-09-02

## Result

Status: `superseded_by_airship_chs_draft_identity_fixed_local_editor_working`.

Airship now shows the first concrete generated AI draft for the imported `chs.si` homepage at `/gnr8/airship/single-site?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`.

The original version of this closeout incorrectly documented a contaminated CHS draft that used Transporti Maver vehicle-transport copy. That content has been superseded and must not be used as CHS Airship draft source material.

The corrected draft is browser-local only and contains three CHS-specific homepage edits:

- hero headline: `Less risk. More control. Better IT.`;
- hero value proposition: `Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.`;
- contact CTA: `Contact CHS at sales@chs.si`.

The Airship editor replaces the empty-state-only draft panel with structured proposed edit rows. Each row includes target page/section, current text summary, proposed replacement text, reason for change, `proposed` status, and preview impact.

The page also renders a separate AI draft preview that shows the proposed hero/intro copy. It is labeled as browser-local draft content and explicitly states that it is not live, not published, and not persisted as production content.

## Preview Separation

Airship keeps the three surfaces distinct:

- original clone preview: internal imported/clone baseline preview;
- current improved/published preview: internal current candidate preview;
- AI draft preview: browser-local proposed copy only, not live.

The live site link remains separate from all preview iframes and points to `https://www.chs.si/`.

## Controls

Accept draft, Reject draft, and Save edit remain disabled. The UI labels Save as `persistence not enabled` and explains that this phase has no production persistence for draft actions.

## Boundary

No production content mutation, live published site change, active pointer mutation, runtime publish, dry-run, shadow-publish, rollback, source capture, provider/DNS/domain/billing mutation, migration, env change, or broad refactor was introduced.

## Implementation

- `apps/platform/gnr8/single-site/airship-single-site-editor-readonly-projection.ts`
- `apps/platform/gnr8/single-site/airship-single-site-editor-readonly-projection.test.ts`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.tsx`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-local-draft-editor.tsx`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.test.tsx`

## Verification

- `pnpm exec tsx --test app/gnr8/airship/single-site/airship-single-site-editor.test.tsx`
- `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/single-site/airship-single-site-editor-readonly-projection.test.ts gnr8/single-site/single-site-studio-readonly-projection.test.ts`
