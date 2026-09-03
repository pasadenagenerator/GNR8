# GNR8 Airship Visual Editor Workspace Openable CHS SI Closeout

Date: 2026-09-03
Status: `airship_visual_editor_workspace_openable_for_chs_si`.

Airship now has a real internal visual editor workspace for the `chs.si` draft candidate. The existing single-site Airship page exposes a primary `Open Airship Editor` action, and the new editor route opens a homepage hero/intro workspace at:

- `/gnr8/airship/single-site/editor?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`

## Implementation

- Entry route: `/gnr8/airship/single-site?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`.
- Editor route: `apps/platform/app/gnr8/airship/single-site/editor/page.tsx`.
- Editor workspace: `apps/platform/app/gnr8/airship/single-site/editor/airship-single-site-visual-editor-workspace.tsx`.
- Projection link: `links.airshipEditor` in `apps/platform/gnr8/single-site/airship-single-site-editor-readonly-projection.ts`.
- Focused render and command tests: `apps/platform/app/gnr8/airship/single-site/airship-single-site-editor.test.tsx`.

## Product Behavior

- The editor displays a left/main draft preview canvas and a right sidebar for the selected `Homepage hero/intro` section.
- Editable persisted text fields: H1/headline text, subheading/body text, CTA label.
- Local preview-only style fields: hero top padding, hero bottom padding, background tint, CTA color.
- Required labels are present: `Draft editor`, `Internal preview only`, `Not live`, `Not published`, `Changes are saved to Airship draft only`, and `Style changes are local preview only`.
- Text saves call only the existing superadmin Airship draft endpoint with `actionMode: "update_edit"`.
- Style edits are not persisted and are labeled local-only.

## AI Command MVP

The command box is deterministic and draft-only. Supported examples include:

- `povečaj spodnji odmik pri H1`
- `zmanjšaj zgornji odmik`
- `spremeni CTA v Kontaktirajte CHS`
- `make the headline shorter`
- `make CTA more prominent`

Unsupported commands return a helpful message and do not call publish, runtime, source capture, pointer, provider, DNS, domain, billing, or rollback actions.

## Boundary

This phase does not mutate live CHS content, does not publish, does not dry-run, does not shadow-publish, does not roll back, does not capture source, does not change provider/DNS/domain/billing/Stripe/Openprovider state, does not change env, and does not move the active pointer.

The active pointer remains intentionally separate from this editor workspace.

## Verification

- Focused Airship visual editor render tests pass.
- The `Open Airship Editor` link is asserted in render tests.
- The editor route is asserted as superadmin-gated and wired to the workspace.
- Headline edit state and AI command behavior are covered by focused tests.
- Unsupported command behavior is covered by focused tests.
- Live CHS separation is covered by focused source scan.
- `git diff --check` passes.
- Trailing whitespace scan passes.
- Mutation/action-control scan finds only the intended draft-only POST path.

Full platform `tsc --noEmit` is still blocked by existing unrelated repository-wide test fixture/type errors outside this Airship scope. A production `next build` compiled successfully, then stalled in the post-compile lint/type validation phase and was stopped without changing runtime state.
