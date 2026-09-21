# GNR8 Airship Captured Diff To Draft Mapping

Date: 2026-09-21
Status: `airship_adapter_capture_diff_to_draft_mapping_recorded`

## Summary

ADAPTER 07 adds a proof-only mapper for captured Airship sidecar `index.html` edits.

The mapper compares baseline HTML with the current workspace HTML, resolves changed `data-airship-element` targets and nearest `data-airship-section` markers, and returns structured dry-run draft edit candidates. It does not persist changes to Airship draft storage, regenerate artifacts, publish, promote, rollback, mutate live pointers, or run Airship.

## Code Entry Points

- Mapper: `apps/platform/gnr8/airship/proof-session/airship-captured-diff-to-draft-mapper.ts`
- Proof-session dry-run readback: `mapAirshipProofSessionCapturedDiffToDraft(...)` in `apps/platform/gnr8/airship/proof-session/airship-proof-session-entry.ts`
- Tests: `apps/platform/gnr8/airship/proof-session/airship-captured-diff-to-draft-mapper.test.ts`

## Supported Mappings

The first safe mappings are intentionally narrow:

| Airship marker | Draft field key | Confidence | Safe to apply later |
| --- | --- | --- | --- |
| `hero-headline` | `headline` | `exact` | yes |
| `hero-subheading` | `subheading` | `exact` | yes |
| `hero-body` | `subheading` | `probable` | no, operator review first |
| `hero-cta` | `ctaLabel` | `exact` | yes |
| `primary-cta` | `ctaLabel` | `exact` | yes |
| `contact-cta` | `ctaLabel` | `exact` | yes |
| `cta-label` | `ctaLabel` | `exact` | yes |

Card title/body edits are supported only when optional known draft field mapping metadata makes the marker, section, and element index unambiguous.

## Unsupported Changes

Unsupported changes are reported as readback entries, not dropped:

- structural changes inside a marked element
- added or removed `data-airship-section` markers
- added or removed `data-airship-element` markers
- multiple changed text nodes inside one marked element
- unknown element markers
- class/style/attribute changes
- CSS `<style>` changes
- script changes
- HTML changes outside known Airship markers

Unsupported entries always have `confidence: "unsupported"` and `safeToApplyLater: false`.

## Confidence Model

- `exact`: the marker has a known direct draft field mapping and exactly one text node changed.
- `probable`: the marker is a known alias, but the mapper cannot prove it should be applied without operator review.
- `unsupported`: the change is structural, styling/script/CSS, ambiguous, unknown, or otherwise outside the safe proof mapping set.

Only `exact` entries are marked safe for a future explicit apply action.

## ADAPTER 04 Example

Captured text change:

```text
The CHS team helps your IT change with every technology wave.
```

to:

```text
Airship real capture test
```

on:

```html
<h1 data-airship-element="hero-headline">...</h1>
```

maps to:

- `changedElementMarker`: `hero-headline`
- `sectionMarker`: `hero`
- `draftFieldKey`: `headline`
- `confidence`: `exact`
- `safeToApplyLater`: `true`

## Dry-Run Boundary

`mapAirshipProofSessionCapturedDiffToDraft(...)` reads:

- the baseline `index.html` snapshot captured during proof-session preparation
- the current workspace `index.html`

It returns the mapper result and proof-only safety flags. It does not write to the workspace, draft tables, runtime artifacts, publish state, or live pointers.

## Next Step

The next adapter step should apply safe `exact` mappings to draft storage only behind an explicit operator action, with a readback of every proposed field mutation before commit.
