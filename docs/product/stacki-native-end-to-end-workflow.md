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
  native site publication, AI provider write, or DNS change has occurred.
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
- Read-only browser check on 2026-11-21: `/studio` on the Ladja Žaba working
  host still renders the public website; Logatčan returns `403` from runtime
  governance. CHS and ViroiDoc both render native Stacki's GitHub sign-in page
  on their working hosts. The separate Ladja Žaba and Logatčan Studio Workers
  are deployed with `ASSETS`, `DRAFTS`, and `PREVIEW` bindings and custom
  `preview.<working-host>` domains. Their direct preview `/studio` paths show
  a session-expired response, which does not establish successful login or
  Container health. Both new public site Workers still have zero bindings,
  no custom domain, and no route; they cannot serve the required same-host
  `/studio` gateway. No provider setting or domain was changed in this check.
- On 2026-11-21, the two local `codex/native-stacki` heads still matched their
  remote GitHub heads (`e8839c987d1f305085e055ee7a2e68143d441645` and
  `535bc5c1cdc42c2f7cb80abeec6a51aada5e00e6`). Wrangler's local dry run
  packaged both public site gateways with `ASSETS` and the exact per-site
  `STUDIO` service binding. A smoke check against each packaged Worker sent
  `/`, `/en/` to assets and `/studio`, its OAuth callback and API path to the
  Studio service while preserving the request. The retained build directories
  have 428 Ladja Žaba and 78 Logatčan files. No provider deployment occurred.
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
native-source preparation read that receipt and recheck the current site domain
and repository before using it, with the old deployment-owned map
as a transition fallback restricted to the four existing site IDs. A new site
cannot use that map in place of the verified receipt. The schema migration has
not been applied to a hosted database, and no provider job writes these receipts
yet. This does **not** make new sites self-provisioning. Payment/Stripe work is
recorded as a later integration phase per the user's latest instruction; no
payment behavior changes in this slice.

For the next slice, the existing automatic GitHub repository reservation/binding
at site import must be reused. Cloudflare's [Workers Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/)
can connect an existing Worker to the already authorized GitHub repository and
start its first build. The API requires a **user-scoped** token with Workers
Builds Configuration Edit; account-scoped tokens are rejected. It also requires
the Worker's immutable tag, the exact repository connection and a build token.
For the public site Worker, the push-triggered deploy command must use
`wrangler versions upload` so a GitHub Push creates an inactive version rather
than publishing it. Native Stacki Publish remains the live deployment action.
The local public-Worker Builds adapter now enforces this exact command, the
verified scoped GitHub repository, branch, immutable Worker tag and build token.
It checks an existing configuration before any write, stores one durable create
intent, reconciles a lost provider response and never repeats an unconfirmed
create. It has only mocked provider tests. The user-scoped Builds credential and
build token UUID are not configured; no hosted build connection or trigger has
been created by this code. The Studio Worker, Container and ready binding still
need their own provisioning and health checks.

### First Studio Worker installation boundary

Read-only dashboard inspection on 2026-11-21 confirmed the existing Logatčan
Studio Worker is connected to its exact site repository on
`codex/native-stacki`, with **Disable builds** enabled. This is a retained
working configuration, not evidence that the new-site installer is automatic.
Do not reuse the public site's `versions upload` build configuration for the
Studio Worker: its `PreviewContainer` is a Cloudflare Container. Cloudflare
states that `wrangler versions upload` cannot publish the image or roll out
instances, and that even a successful first `wrangler deploy` activates the
Worker before Container setup finishes. The Builds API also addresses an
**existing** Worker by immutable tag, so it cannot by itself create the first
Studio Worker.

For a new site, a trusted provisioning runner must first create or verify the
exact private draft R2 bucket, take the verified repository checkout, and run
the retained native Stacki build and the Studio
`wrangler deploy` with the site's exact `studio/cloudflare/wrangler.jsonc`.
It must reconcile a timeout against the named Worker, its immutable tag,
Container application, R2 bucket, and preview route before retrying. A Worker
URL responding is insufficient: the runner must install and read back the six
runtime secret names, then wait for the Container-backed preview route and
authenticated Studio path to work before recording the ready binding. The
first deployment must use a provisioner-held credential;
no site owner should create or paste a key per site.

Cloudflare's current [Create Worker API](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/methods/create/)
provides a safer first resource step than uploading placeholder code: it can
reserve the named `-studio` and `-site` Workers with both `workers.dev` and
Preview URLs disabled, without a code deployment. The local reservation
adapter now checks the current scoped site and bound repository, creates each
Worker at most once under a durable per-site intent, and reads back its
immutable ID and disabled subdomain settings. It never overwrites an existing
Worker. Cloudflare's [first-version rule](https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/)
still requires the subsequent real `wrangler deploy`; `versions upload` cannot
be the first code upload. This adapter has mocked tests only and has not
created a hosted Worker. This Cloudflare endpoint is marked Beta, so hosted
readback must be verified before enabling automatic creation. The Container
runner, routes and readiness check remain separate steps.

The guarded `gnr8/native-studio.resources.reserve.requested` job now joins the
private draft bucket and both empty Worker reservations under one central
Cloudflare account configuration. It accepts only the current agency/client/site
scope and a user ID, rechecks that user's publish permission, then verifies the
persisted site and bound GitHub repository before provider access. A successful
scoped site import enqueues the event only when
`GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED=1`; the flag defaults off.
The job requires central `GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID`,
`GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER`, and
`GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR` values. Queue failure appears
in the import diagnostics, while the completed import remains available. The
local tests mock provider access; the flag and credentials have not been set
in hosted environments, and no R2 bucket or Worker has been created by this
path. Reservation is not a deployment or a ready Studio binding. Before
enabling it, verify the Beta Worker creation and readback against an authorized
test site and decide how a failed queue send is retried without repeating the
import. The Container build, first deployment, secrets, routes and readiness
checks remain to be connected.

After that first installation, the public site Worker may be connected to
GitHub Builds with `versions upload`. Keep the Studio Worker build trigger
disabled as on Logatčan unless a separately designed update path can deploy
its Container without making a native Push to GitHub a live site publication.
Do not create a temporary `wrangler deploy` push trigger and switch it off
afterward: a push in that interval can activate a Worker before the publisher
has acted. This also means the current public-Worker Builds adapter cannot
serve as the new-site bootstrap job. The runner, its one-time credentials,
hosted invocation, and reconciliation checks are still missing.

The exact automatic handoff point is the scoped site-import route: it already
reserves and verifies the private GitHub repository before starting capture.
The native source-preparation path deliberately requires a ready Studio binding,
so neither that path nor a Stacki launch request can serve as the installer.
After the import has persisted the site and its bound repository, GNR8 must
enqueue one background bootstrap for that scope. The job must re-read the
current domain and repository from the authoritative tables; event payloads
may identify the site but must not choose a Cloudflare account, Worker name,
repository, branch, domain, or credential. The job then prepares the exact
source, starts a Container-capable build runner, reconciles the named Cloudflare
resources, installs the shared and per-site secrets, checks the real preview
and authenticated editor, and only then writes the ready binding. If any step
fails, leave the binding absent and retain a retryable diagnostic. No such
runner or dispatch exists in the current GNR8 repository. The current Vercel
Inngest preparation job only prepares source and cannot be treated as this
bootstrap. A central
[GitHub Actions Ubuntu 24.04 runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
is a candidate because its current image includes Docker. Its dispatch
permission, exact target verification and per-site Cloudflare credential
isolation must be implemented before use; a workflow
that trusts dispatch inputs or exposes an account-wide deploy token to site
build scripts would widen access to the whole account.

The first local bootstrap step can now create or reuse the exact
`gnr8-<site-id>-drafts` R2 bucket through Cloudflare's
[bucket API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/methods/create/).
Before any provider call, its hosted boundary checks the current scoped site
and bound GitHub repository. A durable create intent prevents duplicate
creation after an ambiguous response. Readback requires the default
jurisdiction and checks both the [managed `r2.dev` domain](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/managed/methods/list/)
and [custom domains](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/custom/methods/list/)
are disabled, so existing public draft buckets fail closed. The adapter now
runs first in the central Studio secret installer. That installer requires one
additional central `GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER` credential and
stops before publish-token creation or secret upload if the bucket is missing,
unreadable or public. The composed path has mocked provider tests only; it has
no configured central credentials or hosted caller yet and has not created a
bucket in Cloudflare.

Creating future per-site publish tokens by API separately requires account-token
management permission. A Container deployment
is not transactional: the Worker can become live before its image rollout
finishes. Therefore the provisioner must reconcile exact resource identities
and read back both the Worker and Container before it inserts a ready binding.
No push-triggered deployment may be installed on the public site Worker, because
native Push to GitHub must remain independent of native Publish.

The next local implementation step now stores each site's two independently
random `SESSION_SECRET` and `CONTAINER_TOKEN` values as one AES-GCM sealed,
append-only object in the existing private per-site publication store. The
scope is authenticated as associated data; concurrent or repeated provisioning
reads the winning original values instead of rotating them. The master key
`GNR8_NATIVE_STUDIO_VAULT_KEY` is a separate one-time deployment secret and is
not configured or read in this rollout. Rotation needs an explicit migration
plan because native Stacki encrypts saved CMS connections under `SESSION_SECRET`.
The vault feeds the local installer step; it does not enable a hosted Studio
by itself.

A trusted installer input boundary now assembles the six exact secret names
required by the unchanged Studio Worker: the shared GitHub App private key and
client secret, shared AI key, one scoped per-site publish token, and the two
stable per-site values from the vault. The provider-issued publish token is
sealed in a separate append-only per-site object with its Cloudflare account,
token ID and exact site Worker identity. Retries read the same value; a
conflicting token fails closed. The installer reads this saved token before it
creates the site's session/container values and rejects missing shared
credentials first. This remains an offline preparation boundary: no central
credentials have been configured, no Cloudflare secrets have been uploaded by
this code, and no provider readback or ready receipt has occurred.

The offline provider adapter patches those six secrets together on the exact
per-site Studio Worker and reads back their names and `secret_text` types.
The local installer step now links exact per-site token issuance, sealed
runtime-secret assembly, upload and name/type readback in that order. It
validates shared and Studio setup credentials and reads the exact scoped site,
working domain and bound GitHub repository before issuing a token. A pending
repository stops before token creation or secret upload. A retry
reuses the saved publish, session and Container values. It is not wired to a
hosted provisioner, and its successful result is not a ready-site receipt.
Cloudflare does not return the secret values on this readback, so this check
cannot certify correct values, a functioning Container, or a working Studio.
The provisioner must test those separately before writing the ready receipt.

Read-only Cloudflare dashboard inspection on 2026-11-20 showed four active
account-owned `gnr8-*-native-publish` tokens. Their list rows show `Workers
Routes Write` plus `Individual Workers Editor`; the Ladja Žaba detail page
confirms the route permission is scoped to `pasadenagenerator.com` and the
Editor permission to `gnr8-2e7146cd-e516-4088-94ad-6cac90cb17f4-site`.
This is the existing token model to reproduce, not evidence that the proposed
API issuer already works. Cloudflare's documented account-token quota is 500,
so one token per site has a finite capacity. Token creation can return a value
only once; an ambiguous response needs exact-name/provider reconciliation and
possibly a token roll before a value can be sealed. No central
token-management credential is configured yet.

The local token-issuance coordinator now reserves one deterministic token name
per site before a create request. It verifies the exact account, zone, site
Worker, active status, and only the two required permission roles before
sealing a newly issued value and on every later readback. A lost create
response never causes another create. If the token
appears after the in-flight window, one recovery claimant can roll its value
and seal it; duplicate names or broader permissions fail closed. If no token
appears after a claimed create, the operation stays pending for operator
reconciliation because Cloudflare does not document an idempotency key for this
token-creation endpoint. A recovered value is verified against the provider
before it can enter the vault; an unverified roll stays pending for operator
reconciliation. The coordinator and provider adapter have local tests;
setup credentials, hosted readback, and a retry runner are not yet configured.
They must not be wired to a customer site until those pieces and the full
Studio health check pass.
The local read-only token-details client retrieves a known account token's
policy map from Cloudflare's documented endpoint and discards any credential
fields and provider error bodies. It has not been called against the account:
no central account-token credential is configured. The Cloudflare dashboard's
JSON Payload review of the unchanged Ladja Žaba token on 2026-11-21 confirmed
two `allow` policies: `Workers Routes Write` on the exact zone resource
`com.cloudflare.api.account.zone.<zone-id>`, and `Individual Workers Editor`
on `com.cloudflare.api.account.<account-id>` with the nested resource
`com.cloudflare.edge.worker.script.<immutable-worker-id>`. The role IDs in the
existing token are `28f4b596e7d643029c524985477ae49a` and
`7e79ec33834341f28dd431ab73884400`, respectively. Its JSON Payload view
also showed no expiration or IP filter. This is a read-only dashboard finding;
the token was not updated.

The local Cloudflare provider adapter now resolves the existing public site
Worker by name to its immutable ID, lists account tokens, checks the exact two
provider policies on readback, creates one scoped token, verifies its value,
and supports a guarded roll after an ambiguous create. Token management and
Worker metadata use separate setup credentials. A mocked request test runs
the adapter through the actual issuance coordinator and vault; it is not a
hosted API result. The central account-token manager and Worker-read credentials
are not configured, and the adapter is not connected to a hosted provisioner.
The existing native-source preparation routes already require a verified Studio
binding before they can run. Credential installation cannot be inserted there:
the new-site bootstrap must establish Workers, domain routing and Studio health,
then write the verified binding, before source preparation or launch uses it.

The local credential installer now has one central configuration entry point for
all sites. It expects account and zone IDs, separate Cloudflare R2-management,
token-management, Worker-read and Studio-secret-install credentials, the vault
key, the GitHub App private key and client secret, and the AI key under `GNR8_NATIVE_STUDIO_*`
environment names. It validates every shared input before storage or provider
access and then uses the existing per-site issuer and installer. Read-only Vercel
inspection on 2026-11-21 found none of these central settings on the Platform
project and no linked shared variables; older site-import GitHub tokens are
present but cannot replace the native GitHub App credentials. This entry point
is now called by a registered `gnr8-worker` background job for sites whose
public and Studio Workers already exist. The job accepts only scoped site IDs
and an actor, rechecks the actor's publish right, and is disabled unless
`GNR8_NATIVE_STUDIO_SECRET_SETUP_ENABLED=1`. It has no automatic dispatcher;
it does not create Workers, test Studio health, or write a ready binding. The
separate `gnr8-worker`
Vercel project also has no `GNR8_NATIVE_STUDIO_*` settings or linked shared
variables. The one-time credentials must be installed where the eventual
provisioning job runs; setting them only on the Platform project would not
configure that job. Local tests and a production Worker build passed; no
credential was read, created or installed in a hosted environment.

The upstream editor's access check calls GitHub for the signed-in user's write
permission on the site repository. Several native routes force that same check
even if the general editor access setting changes. Consequently, automatically
creating the repository and installing the GitHub App does not grant every GNR8
owner editing rights. The universal workflow must also supply an authorized
GitHub identity with repository write access, or an upstream-supported identity
integration; this cannot be solved by a launch link or Worker secret alone while
keeping Stacki unchanged. One-time GitHub OAuth consent remains a provider-owned
step for a new user, separate from repeat per-site setup.

References: [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/),
[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[account token creation](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/create/),
[Container deployment behavior](https://developers.cloudflare.com/containers/guides/deploy/),
[bulk Worker secrets](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/bulk_update/),
[secret name readback](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/secrets/methods/list/),
[token roll](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/subresources/value/methods/update/),
[account token details](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/get/),
[token quota](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/limits/).
- Focused preparation/integrity/ownership/Lumos checks pass. The broad development typecheck reports 200 errors in unrelated tests/services and generated development types; no diagnostic points to the changed native integration files. The actual production typecheck (`tsconfig.build.json`) passes; the route export check passes for 211 routes. Across the focused release, binding, preparation, ownership, library and asset checks, 18 tests pass with no skips.

Local prepared checkouts: `/private/tmp/gnr8-native-sites/{chs,viroidoc,ladja-zaba,logatcan}`.
They are review artifacts, not deployed installations. The user outcome is not
complete until all four hosted flows are verified.

On 2026-11-21, the retained Logatčan checkout passed a full local
`wrangler deploy --dry-run --config cloudflare/wrangler.jsonc`: Wrangler 4.151.1
built the unchanged Stacki 1.4.8 Studio, its Dockerfile image and Worker bundle,
recognized the `PreviewContainer`, `PREVIEW` and `DRAFTS` bindings, and exited
without a Cloudflare publication. An earlier Worker-only dry run using
`--containers-rollout=none` also passed but cannot establish image buildability.
The full result establishes a viable local build for this retained checkout;
it does not establish hosted credentials, a working Container rollout,
authenticated Studio access, GitHub Push, or native Publish.

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
