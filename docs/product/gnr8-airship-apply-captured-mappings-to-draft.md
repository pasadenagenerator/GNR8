# GNR8 Airship Apply Captured Mappings To Draft

Date: 2026-09-21
Status: `airship_adapter_apply_safe_captured_mappings_to_draft_recorded`

## Summary

ADAPTER 08 adds a proof-only apply step for captured Airship sidecar mappings.

The apply service takes the ADAPTER 07 captured `index.html` mapping result, an existing Airship draft context, and an explicit operator confirmation. It writes only safe exact text mappings into the saved GNR8 Airship draft model. It does not regenerate previews, create runtime artifacts, publish, promote, rollback, mutate active/live pointers, change DNS/provider state, or run source capture/import.

## Code Entry Points

- Apply service: `apps/platform/gnr8/airship/proof-session/airship-apply-captured-mappings-to-draft.ts`
- Captured diff mapper: `apps/platform/gnr8/airship/proof-session/airship-captured-diff-to-draft-mapper.ts`
- Draft persistence service: `apps/platform/gnr8/single-site/airship-single-site-draft-service.ts`
- Tests: `apps/platform/gnr8/airship/proof-session/airship-apply-captured-mappings-to-draft.test.ts`

## Apply Flow

1. Operator runs the proof-only Airship sidecar edit/capture flow.
2. ADAPTER 07 maps the captured `index.html` diff into draft edit candidates.
3. ADAPTER 08 receives the mapping result plus the current draft id/version, draft seed, actor, and `confirmed: true`.
4. The service rejects the request unless confirmation is explicit.
5. The service reads the current saved draft for the migration.
6. The service rejects stale input if the current draft id/version no longer matches the expected draft.
7. The service applies only safe exact mappings to existing draft edit rows through the existing Airship draft persistence service.
8. The readback returns `Captured edits saved to draft` and `Preview not regenerated yet`.

## Supported Fields

The apply step supports only draft fields already present in the current editor draft model:

| Draft field | Airship markers |
| --- | --- |
| `headline` | `hero-headline` |
| `subheading` | `hero-subheading` |
| `ctaLabel` | `hero-cta`, `primary-cta`, `contact-cta`, `cta-label` |

Card title/body mappings are not applied in ADAPTER 08 unless the current draft model already exposes a supported draft field. No new draft fields are invented.

## Confirmation And Version Guards

Apply requires `confirmed: true`. Without explicit confirmation, no draft read or write is attempted.

The apply input must include the draft version used when the operator reviewed the mapping. If the saved draft version has changed, the service fails closed with a stale draft diagnostic. The operator should refresh the mapping/readback before applying again.

The mapping migration id, draft seed migration id, and current draft migration id must match. This keeps CHS and ARIS proof mappings separated.

## Skipped Mappings

The service skips and reports:

- unsupported mappings
- probable mappings
- mappings with `safeToApplyLater: false`
- mappings to unknown draft fields
- mappings whose current draft edit row does not exist
- mappings with missing next text
- repeated mappings whose value is already saved
- conflicting multiple mappings for one draft field

Repeated apply with the same saved value becomes a safe no-op and does not duplicate draft rows.

## No Preview Regeneration

ADAPTER 08 saves captured text edits to the draft only. It does not regenerate the candidate artifact or preview host.

The returned readback includes:

- `Captured edits saved to draft`
- `Preview not regenerated yet`
- next recommended action: `Apply / generate preview`

## Boundaries

This remains proof-only/admin-only. The apply service reports mutation flags showing:

- draft data may mutate only when at least one safe field changes
- runtime version mutation is false
- active pointer mutation is false
- publish, dry-run, shadow-publish, and rollback are false
- artifact and preview regeneration are false
- source capture/import, DNS, and provider mutation are false

## Validation

Focused validation:

- captured diff mapper tests
- proof-session apply tests
- proof-session entry tests
- Airship draft persistence tests
- `git diff --check`
- touched-file trailing whitespace scan
