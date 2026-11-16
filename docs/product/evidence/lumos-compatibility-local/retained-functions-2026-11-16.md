# Universal retained-functions continuation — 16 November 2026

Status: implementation in progress, not deployed or accepted end to end.

## Current decisions

- Universal import, not a Logatčan-only generator.
- Keep functions; replace supported CF7 delivery with native GNR8 contact.
- Confirmed recipient: `komerciala@logatcan.si`.
- Exclude only `/home` as the approved obsolete template.
- Keep `/about-us`, `/contact`, `/locations` and their functions; omit only the four exact missing background URLs listed below (explicitly approved).
- No public publication or real contact submissions.
- Required outcome remains hosted Lumos → Stacki Save → private GitHub → reopen.

## Implementation and local evidence

The retained-functions contract carries the recipient and exact route exclusions through the API, Worker, generated source and contact resolver. Recognized search/consent controls use byte-identified owned code. Captured source scripts are never executed: selected missing theme bundles are acquired as inert bytes and checked against reviewed hashes. Arbitrary scripts remain rejected.

The actual dependency-completion implementation now has an injectable persistence boundary for local replay. Production uses its unchanged default persistence functions. The temporary replay supplied in-memory persistence, reconstructed source rows from the pinned private raw archive, verified every file hash, and fetched public missing dependencies. It did not write to hosted storage or GitHub.

Input: `83f82e39-e45e-4745-8cdc-0b8834542f9d`, raw archive commit `cc99b3bec844e3845d7fe1e7c549c4f0e7d145e0`. After excluding `/home`, source conversion and actual Astro 7.4.4 build pass for 15 routes. A second build includes the pinned Lumos components and an **unsaved local guide fixture with no confirmed decisions**; this is not evidence of binding a real saved hosted guide.

Focused contact, source-input, dependency-capture, export-bridge, registration, Lumos and Worker payload tests pass. Platform and Worker `tsconfig.build.json` typechecks pass. `git diff --check` passes. Tests cover exact recipient preservation, private-preview rejection, script acquisition opt-in, rejection of changed owned controllers and unsafe search/map destinations.

## Current blocking evidence

The user approved omission of exactly these four missing background images, while retaining all three routes:

- `/about-us`: `2019/06/home_dentist3_pic27.jpg`, `2019/06/home_dentist3_pic31.jpg`.
- `/contact`: `2019/06/home_dentist3_pic29.png`, `2019/06/home_dentist3_pic31.jpg`.
- `/locations`: `2019/06/home_dentist3_pic27.jpg`, `2018/12/home_dentist3_pic22.png`.

All four unique resources under `https://ra-in.si/demo/logatcan/wp-content/uploads/` independently returned HTTP 404. The original retained URLs use `http:`. The request carries those exact original URLs in `omittedBackgroundImages`; there is no domain-specific omission rule. After this approval, the actual Astro build, export bridge and final registration pass for all 15 routes. Lumos now leaves native form internals unchanged so the GDPR form-version binding survives compilation.

Read-only hosted Design inspection showed the guide opens successfully but is still an unsaved proposal, with no confirmed brand fields. Do not mark inferred values as user-confirmed.

## Still required

Desktop home and contact inspected locally. Mobile menu opened and navigated to contact; width390 had no horizontal overflow. Carousel advanced, declining cookies hid the consent banner, and Google Maps remained about:blank with its exact original destination retained. No form submission. Complete remaining interaction/fidelity checks and verify the actual saved guide binding; consolidate a private Platform/Worker release and check bundled code; exercise hosted Generate, actual Stacki Save and GitHub readback, then reopen. Current changes are uncommitted. No hosted Generate, deployment, new site-repository write or public Publish happened in this continuation.

Local replay artifacts (not committed): `/private/tmp/gnr8-functions-local-replay.ts`, `/private/tmp/gnr8-functions-derived.json`, `/private/tmp/gnr8-functions-built`, `/private/tmp/gnr8-functions-export.json`. The derived input is cached locally so debugging need not refetch public dependencies. Local IDs are fixtures and must never be used as hosted identities.


## Hosted configuration access

Read-only project inspection confirmed both Vercel projects protect Preview deployments. Existing Vercel CLI login refreshed successfully with official CLI 65.16.0. Automatic approval review rejected a bulk Preview env pull and then a narrower encrypted-value read. Neither rejected command executed. User subsequently explicitly approved reading only `INNGEST_ENV`, `GNR8_STACKI_GITHUB_BINDINGS_ENABLED`, `GNR8_STACKI_GITHUB_ENABLED` in Platform/Worker. Do not treat that as permission to read other secret values.
