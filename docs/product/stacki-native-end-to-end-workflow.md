# Native Stacki for every GNR8 site

## Current user decisions (2026-11-20)

- Stacki is the sole editor for all authorized GNR8 site owners/administrators.
- Keep the complete upstream editor unchanged, including builder, AI, autosave,
  GitHub and Publish controls. Do not revive the GNR8 Save/Publish patch.
- The user explicitly accepted native wording: drafts autosave; **Push to GitHub**
  commits source; **Deploy to hosting** publishes. The main Publish action can do both.
- Use native Cloudflare publishing. Disable automatic website deployment on GitHub
  push before enabling the separate actions; do not silently couple them again.
- Make Lumos available through native project folders/insertion settings.
- Ladja Žaba: `ladja-zaba.app.pasadenagenerator.com` (never the `-check` host).
- Logatčan: `logatcan.app.pasadenagenerator.com`, confirmed by the user.
- Keep CHS and ViroiDoc's existing Cloudflare working hosts. Do not target the
  customer source domains `www.chs.si`, `www.viroidoc.eu`, or `www.logatcan.si`.

These decisions supersede this document's earlier custom bridge/pilot plan and
its proposed custom final-approval dialog. Native Stacki's own publishing behavior
is authoritative; no custom final artifact-review UI has been added.

## Prepared implementation

The design page resolves the authorized site using the existing agency/client
read model and publish permission, then reads a deployment-owned binding from
`GNR8_NATIVE_STUDIO_SITES`. It opens `studioOrigin/studio` directly. Native GitHub
repository authentication still controls editor access; a link grants no new
repository permission. No pilot user, sandbox quota, selected generated version,
opener tab, GNR8 postMessage save bridge, or GNR8 publication screen is required.
Unconfigured sites show an explicit unavailable state; they do not open another
site or guess a host from an imported URL. Bindings must be installed with the
Platform change, after the corresponding native site is ready.

The native preparation produces root `wrangler.json`, `.stacki/publish.json`, and
retained `studio/cloudflare/wrangler.jsonc` configuration. It uses direct native
Cloudflare Workers publishing, without `GITHUB_DEPLOY_*` auto-pipeline variables.
The immutable prepared-source identity includes the complete configuration and
release digest, so changing publication mode cannot reuse an older receipt.

The official Stacki updater installed **1.4.8** in local copies of all four sites. All 2,170 distributed native files match the verified release byte for
byte. Only retained project/connection configuration differs. New Ladja Žaba and
Logatčan installations use the same updater and release. Existing website source
and assets are retained; this is not a redesign.

Lumos **1.0.4**, commit `43e4d5290fd7fa5165e2118689e680971624f0cb`, is
available in `src/lumos` via native `.stacki/folders.json` and insertion defaults.
The adapter relocates imports and imports its required stylesheet when a component
is used. It does not replace existing pages or global styles. Native Studio sees
35 Lumos components plus its BaseLayout. Astro 7.4.7, a supported Node version,
Astro's `site` value, and its local Inter font configuration are required.

## Per-site retained inputs

All four owned sites belong to agency `00000000-0000-4000-8000-000000000001`.
Repository identity was verified through GitHub's signed-in page; the connector
currently exposes none of these private repositories.

| Site | Repository ID | Existing source branch and commit | Working host |
| --- | --- | --- | --- |
| Ladja Žaba (`2e7146cd-e516-4088-94ad-6cac90cb17f4`) | 1461123688 | `stacki/5244000a-13f0-5f29-8f66-0a6a7bf77adc`, `cd89cd3246c328077352389009b9855d5b1a7c7f` | `ladja-zaba.app.pasadenagenerator.com` |
| Logatčan (`fb4b6b9a-f2ba-4ffb-8240-1d988ebb916e`) | 1459906258 | `stacki/a0f74ed1-7f2b-4f62-9286-eb43fddefef8`, `7854b9c9bfbaebf5916e9dcf90d0acd643e04ae8` | `logatcan.app.pasadenagenerator.com` |
| CHS (`9ff5613e-1625-43f1-844e-c5c91a813d4f`) | 1450563254 | `codex/chs-astro-native`, `dbaff909ff08690d01a000108d95627ec011bd42` | `chs.pasadenagenerator.com` |
| ViroiDoc (`dbdd5b9f-6ae1-4736-917b-20adf94838c6`) | 1453825419 | `astro/a59a3e92-75f7-4c12-9129-c32e2af840df`, `7731248b692517f2017d6a98e646c4e9b5db10a8` | `viroidoc.pasadenagenerator.com` |

Ladja Žaba's saved source depended on a development-only retained-assets middleware.
`materialize-retained-assets.mjs` reuses the authoritative delivery mapping and
verifies source hashes, asset hashes and Git blob identities before copying its
424 assets to their original URL paths under `public/`. Pages and nested CSS URLs
stay unchanged. Logatčan's newer saved source contains 15 pages and its public
assets; the earlier two-page Lumos proposal was not selected as its baseline.

## Local evidence and hosted boundary

- Native updater dependency installation, both native TypeScript checks and builds
  passed for all four sites.
- Actual native `scanProject` finds all 35 Lumos components plus BaseLayout for
  both sites; actual native `parsePublishConfig` accepts the direct settings.
- CHS: 56 original routes build; ViroiDoc: 127 original routes build. An additional
  temporary upstream Lumos example page builds on both, including fonts, icons,
  images, interactive components and imported styles. It is removed after testing.
- Ladja Žaba: 3 original routes build; Logatčan: 15 original routes build.
- Browser inspection opened ViroiDoc in native 1.4.8, displayed the retained page,
  Lumos component groups, Saved status, Push to GitHub and Deploy to hosting.
- AI's original panel opens but reports no provider connected. No paid AI call,
  Cloudflare deployment, AI provider write, or DNS change has occurred.
- The GNR8 Platform change is pushed as `codex/stacki-same-host-replacement`
  and held in draft pull request #16. Ladja Žaba and Logatčan's native source is
  pushed to separate `codex/native-stacki` branches in their private repositories.
  CHS and ViroiDoc's native source is committed to local `codex/native-stacki`
  branches only. Their existing Workers Builds triggers still deploy on GitHub
  pushes, so those two branches must not be pushed until the direct native
  publication path is ready and the triggers are disabled.
- The existing `GNR8 Stacki Studios` GitHub App (`5743518`, installation
  `181570201`) already covers all account repositories. Its existing wildcard
  callback matches both new working hosts; no new App grant or callback edit is
  needed. Both new sites now have the generated native publishing configuration
  on their `codex/native-stacki` default branches, and their separate private
  R2 draft buckets exist. Both new Studio Workers built and deployed from those
  branches. The first Ladja Žaba build selected its old empty `main` branch and
  failed before installation; its corrected branch build succeeded. Both new
  public site Workers currently contain only Cloudflare's placeholder code and
  have no working-host binding. None of the two domains has migrated.
- The user chose all current and future account repositories for the separate
  Cloudflare Workers and Pages GitHub integration. That access is installed and
  verified. GitHub-triggered builds for all four Studio Workers are disabled
  after initial installation. Existing CHS and ViroiDoc public-site builds
  remain enabled until direct native publication is ready.
- Each of the four Studio Workers now has a `PUBLISH_CLOUDFLARE_API_TOKEN` runtime
  secret; the secret type and correct Worker placement were verified in the
  Cloudflare dashboard without reading the values. Each Studio Worker also has
  `AI_BASE_URL=https://api.openai.com/v1` and
  `AI_MODEL=gpt-5.4-mini-2026-03-17`. `AI_API_KEY` and the new Studio credentials
  remain unconfigured. The earlier instruction to enter them manually in each
  Worker was withdrawn after the user clarified that provisioning must itself be
  universal.

## Universal provisioning correction

The unchanged upstream Stacki runtime binds one repository, branch, draft store,
preview host and publish target per Studio Worker. Separate site runtimes are
therefore expected; separate manual credential setup is not the user workflow.
The GNR8 provisioning layer must store shared GitHub App and AI credentials once
in a protected central location, generate independent session/container secrets
for each site, create a publish token scoped to that site's target, and install
these values in the corresponding Worker without displaying them to site users.
The site owner then uses only Stacki's native autosave, Push to GitHub and Publish
controls. Keep the per-site publication token scope narrow even though the
provisioning credential necessarily has wider setup permissions. Do not enable
or claim a self-service workflow until this provisioning path and the hosted
save/publish separation have both been exercised end to end.

The first local implementation slice adds a service-role-only, immutable
`gnr8_native_studio_bindings` receipt keyed by agency/client/site and tied to
the existing bound GitHub repository and exact working domain. Site launch and
native-source preparation read that receipt, with the old deployment-owned map
as a transition fallback for the four existing sites. The schema migration has
not been applied to a hosted database, and no provider job writes these receipts
yet. This does **not** make new sites self-provisioning. Payment/Stripe work is
recorded as a later integration phase per the user's latest instruction; no
payment behavior changes in this slice.

For the next slice, the existing automatic GitHub repository reservation/binding
at site import must be reused. Cloudflare's documented CI path can deploy a
Worker from GitHub Actions with a centrally held API token; per-Worker secrets
can be uploaded with the deployment. Creating future per-site API tokens by API
requires a separate account-token-management permission. A Container deployment
is not transactional: the Worker can become live before its image rollout
finishes. Therefore the provisioner must reconcile exact resource identities
and read back both the Worker and Container before it inserts a ready binding.
No push-triggered deployment may be installed on the public site Worker, because
native Push to GitHub must remain independent of native Publish.

References: [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/),
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[account token creation](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/create/),
[Container deployment behavior](https://developers.cloudflare.com/containers/guides/deploy/).
- Focused preparation/integrity/ownership/Lumos checks pass. The broad development typecheck reports 200 errors in unrelated tests/services and generated development types; no diagnostic points to the changed native integration files. The actual production typecheck (`tsconfig.build.json`) passes; the route export check passes for 211 routes. Across the focused release, binding, preparation, ownership, library and asset checks, 18 tests pass with no skips.

Local prepared checkouts: `/private/tmp/gnr8-native-sites/{chs,viroidoc,ladja-zaba,logatcan}`.
They are review artifacts, not deployed installations. The user outcome is not
complete until all four hosted flows are verified.

## Concrete external rollout still required

1. Reconcile each branch head and newer hosted drafts before writing. Preserve
   existing CHS/ViroiDoc Worker names, R2 buckets, GitHub Apps, secrets and domains.
2. Disable the public-site Workers Builds triggers for CHS/ViroiDoc **before**
   pushing the direct-Publish configuration. Otherwise Push to GitHub would still
   publish through the old external trigger.
3. Build and exercise one-time protected credential bootstrap and automated
   per-site Worker provisioning. Four scoped publish tokens and the public AI
   settings are already installed; GitHub, session/container and AI secrets are
   still pending. No credential may enter prepared source.
4. Configure new Studio Worker secrets through provisioning; the workers, bounded containers
   and private draft buckets are deployed. Reuse the verified `GNR8 Stacki
   Studios` App identity. Both new public-site Workers exist as unbound
   placeholders. The original GNR8 checkpoint branches remain intact.
5. Route the two confirmed `*.app.pasadenagenerator.com` hosts to their Cloudflare
   site gateways and configure separate preview hosts. Their current wildcard
   routes to Vercel; changing the two exact hosts must be an explicit migration.
6. Deliver the reviewed source, build/deploy native Studio and site gateways, then
   install all verified launch bindings with the Platform release. Validate owner
   access, denied access, draft recovery, native AI Apply, GitHub-only save, separate
   Cloudflare publish, failed build and retry on the working hosts. These hosted
   acceptance checks are still outstanding.

No customer live domain is part of this rollout. Native direct Publish does not
populate the legacy GitHub-pipeline `SITE_VERSION.tag` automatically; the prepared
empty value must never be presented as verified live Git commit evidence.

Reviewed external action inputs are saved locally in `/private/tmp/gnr8-native-sites/rollout-review.json`; the existing CHS/ViroiDoc launch bindings are in `reviewed-existing-bindings.json`. Neither file contains credentials.
