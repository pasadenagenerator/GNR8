# GNR8 Airship MVP Recovery 20 Demo Readiness Summary

Date: 2026-09-16
Status: `mvp_recovery_demo_readiness_summary_recorded`

## Demo URLs

- CHS: `https://chs-airship.app.pasadenagenerator.com/`
- ARIS: `https://aris-airship.app.pasadenagenerator.com/`

## Current Demo Status

- CHS is visually accepted for internal demo.
- ARIS is visually accepted for internal demo.
- Both URLs are GNR8-controlled preview/demo surfaces.
- Neither demo URL implies DNS cutover for the real customer domains.

## Architecture Distinction

- CHS currently uses an active pointer to a promoted Airship candidate.
- ARIS uses preview-host binding without an active pointer.
- The preview-host path is the preferred MVP demo path before DNS cutover.

## External Domains

- `https://www.chs.si/` remains external and untouched.
- `https://www.aris.si/` remains external and untouched.
- Real customer sites will change only after explicit DNS/domain cutover work.

## MVP-Demonstrable Now

- Import/source capture exists.
- Airship simplified draft/candidate can be created.
- A GNR8-controlled preview/demo URL can serve an improved page.
- Visual acceptance can be recorded.
- No AI provider dependency is required for the demo path.
- No customer DNS access is required for the demo path.

## Remaining Product MVP Work

- Repeatable preview-host creation UX/admin flow.
- Better visual artifact generation from capture evidence.
- Client/site ownership assignment UX.
- Domain/DNS cutover flow.
- Rollback flow for real cutover.
- Basic billing/package/token accounting can remain post-demo unless needed for sales.

## Recommended Next Execution Path

- Use the preview-host approach for future demos.
- Avoid the governed dry-run/shadow-publish loop for MVP demos.
- Keep live publish/cutover as a separate, explicitly approved phase.

## Boundary

This summary is documentation/status only. It does not change code, runtime artifacts, active pointers, host bindings, DNS/domain/provider/billing/env state, or customer production ownership.

No promote, rollback, dry-run, shadow-publish, source-capture, DNS/domain/billing/provider/env mutation, AI provider call, broad build, or broad test was performed for this record.

## Passive HTTP Validation

- `https://chs-airship.app.pasadenagenerator.com/`: HTTP `200`.
- `https://aris-airship.app.pasadenagenerator.com/`: HTTP `200`.
- `https://www.chs.si/`: HTTP `200`.
- `https://www.aris.si/`: HTTP `200`.

## Related Closeouts

- `docs/product/gnr8-airship-mvp-recovery-chs-demo-readiness-closeout.md`
- `docs/product/gnr8-airship-mvp-recovery-aris-demo-visual-acceptance-closeout.md`
- `docs/product/gnr8-airship-mvp-recovery-aris-draft-candidate-closeout.md`
