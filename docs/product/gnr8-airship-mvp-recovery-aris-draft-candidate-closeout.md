# GNR8 Airship MVP Recovery ARIS Draft Candidate Closeout

Date: 2026-09-15
Status: `mvp_recovery_aris_airship_draft_candidate_ready_no_pointer_mutation`.

MVP Recovery 15 generated the first simplified ARIS Airship MVP draft and internal preview candidate from source evidence and passive public ARIS content. The degraded transformed runtime artifact was verified as an identity/reference input only and was not used as source truth for the generated ARIS copy or candidate page content.

## Source Inputs

- Source URL: `https://www.aris.si/`
- Migration id: `ebf62324-1e51-4435-abd7-004722fb48d6`
- Ownership site id: `ccc4e66e-5dcb-4556-a339-51dbe891cfd8`
- Runtime site id: `site_6b859cc1599a5b6642dc`
- Initial runtime site version id: `ae35c6ad-5a26-4413-a3c8-64362b042810`
- Runtime artifact id: `f024459a-8bc9-41b9-b2a7-137ee85eaf83`
- Source evidence review id: `c868beb0-08d8-412c-9f21-4ef49cfae4c5`
- Capture run id: `imported-url-site-5a3cd0011548018e`
- Source package ref: `b66c7af5-f365-4d85-a821-46eb31dbc633`

## Draft

- Airship draft id: `5ed1b4da-eb06-4eee-bdc0-5b5cdec99707`
- Draft version/status: `1` / `draft`
- Internal label: `simplified ARIS MVP draft generated from source evidence`
- Draft fields/sections:
  - `airship-aris-home-headline`: `Homepage / hero headline`
  - `airship-aris-home-subheading`: `Homepage / hero subheading`
  - `airship-aris-home-product-offers`: `Homepage / product offer section`
  - `airship-aris-home-brand-category-proof`: `Homepage / brand and category proof`
  - `airship-aris-home-ctaLabel`: `Homepage / contact inquiry call-to-action`

## Candidate

- Candidate site version id: `6d712ab9-f48e-49a3-9c26-03915365d746`
- Candidate artifact id: `8073651e-510b-47e7-8363-8a742b7967db`
- Internal preview route: `/api/gnr8/admin/single-site-studio/versions/6d712ab9-f48e-49a3-9c26-03915365d746/preview?mode=transformed`
- Internal preview URL: `https://app.pasadenagenerator.com/api/gnr8/admin/single-site-studio/versions/6d712ab9-f48e-49a3-9c26-03915365d746/preview?mode=transformed`
- Candidate status: `created`
- Published: `false`
- Active pointer before/after: `null` / `null`

## Boundary Readback

- Active pointer: none exists for `site_6b859cc1599a5b6642dc`; unchanged.
- Host binding: no `aris-airship.app.pasadenagenerator.com` host binding exists; runtime host binding count stayed unchanged.
- Candidate review: not created.
- Publish readiness: not created.
- Promote: not run.
- Rollback: not run.
- Dry-run: not run.
- Shadow-publish: not run.
- Source-capture second run: not run; source evidence review/ref/item/event counts stayed unchanged.
- AI provider call: not run.

## Limitations

- Runtime artifact preview mode was degraded and ignored as source truth.
- `finalSiteModelAvailable=false` and `rendererContractAvailable=false` are carried forward from the recovery context.
- Source warning `PRIMARY_STYLESHEET_NOT_USED_IN_FINAL_HTML` is carried forward.
- The result is a simplified one-page Airship MVP draft; exact clone fidelity is not claimed.

## MVP Recovery 19 Visual Acceptance Addendum

Status: `mvp_recovery_aris_demo_visual_accepted`.

Gregor manually reviewed `https://aris-airship.app.pasadenagenerator.com/` and accepted ARIS as visually OK for internal MVP demo purposes. ARIS is now recorded as the second imported-site demo target after CHS.

- Preview URL: `https://aris-airship.app.pasadenagenerator.com/`
- Preview binding id: `e73e5d73-cbbe-4ff7-9cdb-75c0ee6aa2ae`
- Preview hostname: `aris-airship.app.pasadenagenerator.com`
- Candidate site version id: `6d712ab9-f48e-49a3-9c26-03915365d746`
- Candidate artifact id: `8073651e-510b-47e7-8363-8a742b7967db`
- Candidate state: `DRAFT`
- Artifact stage: `shadow`
- Active pointer: `null` / no row
- External source site: `https://www.aris.si/` remains external and untouched.

This acceptance is documentation/status only and covers the internal preview-host demo. It is not DNS cutover, live customer publish, launch approval, active pointer mutation, promote, rollback, dry-run, shadow-publish, source-capture, runtime mutation, provider/DNS/domain/billing/env mutation, or an AI provider call.

Closeout: `docs/product/gnr8-airship-mvp-recovery-aris-demo-visual-acceptance-closeout.md`.
