# GNR8 Airship MVP Recovery ARIS Demo Visual Acceptance Closeout

Date: 2026-09-16
Status: `mvp_recovery_aris_demo_visual_accepted`

## Result

ARIS is accepted as the second imported-site demo target for the internal GNR8/Airship MVP demo.

- Source URL: `https://www.aris.si/`
- GNR8-controlled preview URL: `https://aris-airship.app.pasadenagenerator.com/`
- Migration id: `ebf62324-1e51-4435-abd7-004722fb48d6`
- Runtime site id: `site_6b859cc1599a5b6642dc`
- Airship draft id/version: `5ed1b4da-eb06-4eee-bdc0-5b5cdec99707` / `1`
- Candidate site version id: `6d712ab9-f48e-49a3-9c26-03915365d746`
- Candidate artifact id: `8073651e-510b-47e7-8363-8a742b7967db`
- Preview binding id: `e73e5d73-cbbe-4ff7-9cdb-75c0ee6aa2ae`
- Preview hostname: `aris-airship.app.pasadenagenerator.com`
- Candidate state: `DRAFT`
- Artifact stage: `shadow`
- Active pointer: `null` / no row

Manual visual verdict:

- Gregor manually reviewed `https://aris-airship.app.pasadenagenerator.com/` for internal MVP demo purposes.
- ARIS is visually OK for internal demo.
- This records demo visual acceptance only; it is not launch approval, DNS cutover, live customer publish, or production ownership transfer.

## Boundary

- ARIS uses a GNR8-controlled preview-host binding without an active runtime pointer.
- External `https://www.aris.si/` remains external, live, and untouched.
- No active pointer mutation occurred.
- No promote-to-live, rollback, dry-run, shadow-publish, source-capture, DNS/domain/provider/billing/env mutation, artifact mutation, runtime mutation, or AI provider call occurred.
- The accepted scope is internal demo visibility on `https://aris-airship.app.pasadenagenerator.com/` only.

## Passive HTTP Readback

- `https://aris-airship.app.pasadenagenerator.com/`: HTTP `200`.
- `https://www.aris.si/`: HTTP `200`.

This closeout records the ARIS internal demo target after the earlier draft-candidate closeout in `docs/product/gnr8-airship-mvp-recovery-aris-draft-candidate-closeout.md`.
