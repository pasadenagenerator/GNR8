# GNR8 Airship CHS Draft Identity Local Editor Closeout

Date: 2026-09-02

## Result

Status: `airship_chs_draft_identity_fixed_local_editor_working`.

Airship now generates the `chs.si` draft from CHS-specific source evidence only and blocks Maver transport copy from the CHS draft path.

The corrected CHS proposed edits are:

- hero headline: `Less risk. More control. Better IT.`;
- hero value proposition: `Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.`;
- contact CTA: `Contact CHS at sales@chs.si`.

The draft preview is browser-local and editable for headline, subheading, and contact CTA. Changes update the local preview and proposed draft rows immediately from React state only.

## Controls

Accept and Reject remain disabled.

Save remains disabled and is labeled `Save disabled - persistence not enabled`.

No production persistence, source capture, runtime publish, dry-run, shadow-publish, rollback, active pointer mutation, provider/DNS/domain/billing mutation, migration, or env change was introduced.

## Preview Handling

The internal preview iframe route now maps `EMAXCONNSESSION` failures to a compact HTML retry message so DB pool/session errors do not dominate the Airship editor.

The live site remains a separate outbound link: `https://www.chs.si/`.

## Implementation

- `apps/platform/gnr8/single-site/airship-single-site-editor-readonly-projection.ts`
- `apps/platform/gnr8/single-site/airship-single-site-editor-readonly-projection.test.ts`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.tsx`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-local-draft-editor.tsx`
- `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.test.tsx`
- `apps/platform/app/api/gnr8/admin/single-site-studio/versions/[siteVersionId]/preview/route.ts`

## Verification

- Focused Airship render/projection tests.
- CHS draft guard rejects Maver transport copy.
- Local draft edit helper updates preview headline, subheading, and CTA.
- Live site remains separate from preview iframe sources.
- Mutation/action-control scan remains clean for the Airship surface.
