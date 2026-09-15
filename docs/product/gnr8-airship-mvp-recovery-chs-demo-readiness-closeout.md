# GNR8 Airship MVP Recovery CHS Demo Readiness Closeout

Date: 2026-09-15
Status: `mvp_recovery_chs_airship_demo_ready`

## Result

CHS Airship MVP Recovery is demo-ready on the GNR8-controlled HTTPS demo URL:

- `https://chs-airship.app.pasadenagenerator.com/`

Verified recovery evidence:

- HTTPS returned HTTP `200`.
- TLS verification passed.
- Response contains `The CHS team helps your IT change with every technology wave.`
- Response is served by Vercel/GNR8 and includes the GNR8 preview marker.
- Active pointer target is `92e476b9-67fc-408a-be3d-5c744aa0f3f6 / 5ac3716a-f29d-4648-bc86-a6942638ed53`.
- Host binding `89b2cafa-651a-4402-a947-0c3d45378a3d` is `ACTIVE`, `shadow`, for runtime site `site_57d9665a3a5867edf6ef`.
- External `https://www.chs.si/` remains external and not cut over; that is expected and not a demo failure.

## UI Readback

Airship now exposes a compact superadmin/operator readback for this demo state:

- Airship overview: `/gnr8/airship/single-site?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`.
- Airship visual editor: `/gnr8/airship/single-site/editor?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63`.
- Readback includes the GNR8 demo URL, active pointer target, external `www.chs.si` status as `external / not cut over`, host binding, and compact admin-only rollback refs.

## Rollback Refs

- Previous site version id: `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`.
- Previous artifact id: `1f80138a-39c2-4210-ac61-16200e5a2254`.
- Current Airship site version id: `92e476b9-67fc-408a-be3d-5c744aa0f3f6`.
- Current Airship artifact id: `5ac3716a-f29d-4648-bc86-a6942638ed53`.
- Promote audit rows: `d873b627-bab9-4868-9def-e4772fb71f37`, `7b667851-5132-43b3-8202-d56fc30ee193`.

## Boundary

This closeout and UI update did not run promote-to-live, rollback, dry-run, shadow-publish, source-capture, DNS/domain/provider/billing/env mutation, or runtime pointer mutation.

The external `https://www.chs.si/` site remains unchanged/external.
