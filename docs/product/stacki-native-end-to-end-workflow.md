# Native Stacki for every GNR8 site

## Current user decisions (2026-11-20)

- Stacki is the sole editor for all authorized GNR8 site owners/administrators.
- Keep the complete upstream editor unchanged, including builder, AI, autosave,
  GitHub and Publish controls. Do not revive the GNR8 Save/Publish patch.
- The user explicitly accepted native wording: drafts autosave; **Push to GitHub**
  commits source; **Deploy to hosting** publishes. The main Publish action can do both.
  Prepared projects set native `defaultTarget` to `all`; choose the native
  `hosting` target when verifying Cloudflare publication without a GitHub push.
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

The [official Stacki release](https://github.com/flowtricks/stacki-releases/releases/tag/v1.4.8)
is still marked latest on 2026-11-21. The official updater installed **1.4.8**
in local copies of all four sites. All 2,170 distributed native files match the verified release byte for
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
cannot use that map in place of the verified receipt. For those four sites,
the fallback now also rechecks the current scoped domain
and bound repository whenever a service-role database client is available;
a changed target invalidates launch and preparation. The fallback remains
available without that client for the existing deployment configuration.
The schema migration has
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
readback must be verified before enabling automatic creation. Hosted Container
runner wiring, routes and readiness check remain separate steps.

The guarded `gnr8/native-studio.resources.reserve.requested` job now joins the
private draft bucket and both empty Worker reservations under one central
Cloudflare account configuration. It accepts only the current agency/client/site
scope and a user ID, rechecks that user's publish permission, then verifies the
persisted site and bound GitHub repository before provider access. A successful
reservation now returns the current scoped HTTPS origin, bound repository and
its immutable ID alongside the reserved resource IDs. It reads the target again
after reservation and refuses to return it if the domain or repository changed
during provider work; the event cannot supply these values. The repository
branch and GitHub App identifiers still require an authoritative bootstrap
source before first deployment.
The reservation now also saves an append-only, scoped receipt of the exact
private bucket and both immutable Worker IDs. The later build-handoff
coordinator requires that receipt and refuses a caller-supplied Studio Worker
ID or changed site/repository that does not match it. This prevents a future
job event from choosing its own deployment target; active provider state is
still rechecked before deployment and readiness.
A successful scoped site import enqueues the event only when
`GNR8_NATIVE_STUDIO_RESOURCE_RESERVATION_ENABLED=1`; the flag defaults off.
The job requires central `GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID`,
`GNR8_NATIVE_STUDIO_CLOUDFLARE_R2_MANAGER`, and
`GNR8_NATIVE_STUDIO_CLOUDFLARE_WORKER_CREATOR` values. Queue failure appears
in the import diagnostics, while the completed import remains available. The
local tests mock provider access; the flag and credentials have not been set
in hosted environments, and no R2 bucket or Worker has been created by this
path. Reservation is not a deployment or a ready Studio binding. Before
enabling it, verify the Beta Worker creation and readback against an authorized
test site. When the feature flag is enabled and a site has no ready Stacki
binding, opening its Design tab also sends the same scoped event through a
same-origin, publish-authorized endpoint. A failed queue request is retried
twice while the tab remains open and is attempted again on a later visit;
the site import is not repeated. The job's durable per-resource create intents
make duplicate events safe. This is not a persistent background outbox: an
unavailable queue after the tab closes still needs a later visit or an operator
retry. The hosted Container build and first deployment, secrets, routes and
readiness checks remain to be connected.
The `native-studio.secrets.install.requested` event now prepares the publish
token and sealed first-deploy secrets after resource reservation. It does not
run the bulk secret installer: the reserved Studio Worker is empty and has no
active deployed version. Wrangler receives the six secrets during first deploy.
Source preparation stores bytes and reports
`hosted:false`; it neither deploys the Container nor writes a ready binding.
The missing step is a trusted first-deployment runner that consumes that exact
prepared source, builds without credentials, deploys with protected credentials,
then verifies the active Studio and Container before any ready binding is written.
The review page now labels this state explicitly as prepared source, with Studio
still uninstalled. It must not present a prepared-source receipt as an editor
that the site owner can open.

After that first installation, the public site Worker may be connected to
GitHub Builds with `versions upload`. Keep the Studio Worker build trigger
disabled as on Logatčan unless a separately designed update path can deploy
its Container without making a native Push to GitHub a live site publication.
Do not create a temporary `wrangler deploy` push trigger and switch it off
afterward: a push in that interval can activate a Worker before the publisher
has acted. This also means the current public-Worker Builds adapter cannot
serve as the new-site bootstrap job. The hosted Container runner, its one-time
credentials, invocation and health checks are still missing.

The exact automatic handoff point is the scoped site-import route: it already
reserves and verifies the private GitHub repository before starting capture.
The direct native source-preparation path can now use a separate new-site
bootstrap binding when `GNR8_NATIVE_STUDIO_PREPARE_ENABLED=1` and
`GNR8_NATIVE_STUDIO_BOOTSTRAP_ENABLED=1`. It re-reads the current scoped domain
and bound repository, uses the shared Cloudflare account and GitHub App IDs
from central configuration, and fixes the source branch to the retained
`codex/native-stacki` convention. It rechecks the target after export before
persisting source bytes. With the bootstrap flag off, the existing ready-Studio
binding remains the source. With the flag on, a valid existing ready binding
still takes precedence; a stale binding fails rather than switching targets.
An unavailable binding read also fails closed; the receipt migration must be
present before enabling this path in a hosted environment.
The existing `prepare-source` request and its status read now use this same
bootstrap gate, so they can reach the already registered background preparation
job for a new site. The legacy release request still requires a ready binding.
Each manual source-preparation request now receives its own attempt ID. Its
failure receipt is scoped to that attempt, while a successful immutable source
receipt remains shared by the confirmed selection. While the review page stays
open, a retry therefore reports "preparing" instead of immediately replaying
the previous attempt's failure;
the existing status endpoint without an attempt ID remains compatible.
After the user confirms the selected import, the review route automatically
queues that same source-preparation job when bootstrap is enabled and the target
is available. It records the confirmation first; a queue failure is reported
separately and the existing preparation button can retry without repeating the
import review. An unavailable bootstrap target is also reported instead of
silently claiming that preparation started. The Worker rechecks confirmation,
ownership and target before storing the package.
While the review stays open, its status is checked automatically after a queued
request. The page reports a prepared package or a Worker failure without a
second click; after repeated status-read failures it stops polling and keeps
the manual status check available. A successful source receipt still does not
mean the Studio Container has been installed or the site has been published.
This prepares an immutable package only; a Stacki
launch request still cannot serve as the installer.
The central values are `GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCOUNT_ID`,
`GNR8_NATIVE_STUDIO_GITHUB_APP_ID`,
`GNR8_NATIVE_STUDIO_GITHUB_INSTALLATION_ID`, and
`GNR8_NATIVE_STUDIO_GITHUB_CLIENT_ID`. They are not copied from the event or
entered per site. The later trusted Git checkout must still prove that the
exact repository and branch contain the approved source commit.
After the import has persisted the site and its bound repository, GNR8 must
enqueue one background bootstrap for that scope. The job must re-read the
current domain and repository from the authoritative tables; event payloads
may identify the site but must not choose a Cloudflare account, Worker name,
repository, branch, domain, or credential. The job then prepares the exact
source, starts a Container-capable build runner, reconciles the named Cloudflare
resources, installs the shared and per-site secrets, checks the real preview
and authenticated editor, and only then writes the ready binding. If any step
fails, leave the binding absent and retain a retryable diagnostic. A guarded
resource-reservation dispatch now follows import, with retry on the Design tab;
neither deploys a Container or records readiness. No hosted Container runner is
connected in the current GNR8 repository. The current Vercel
Inngest preparation job only prepares source and cannot be treated as this
bootstrap. A central
[GitHub Actions Ubuntu 24.04 runner](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)
is a candidate because its current image includes Docker. Its dispatch
permission, exact target verification and per-site Cloudflare credential
isolation must be implemented before use; a workflow
that trusts dispatch inputs or exposes an account-wide deploy token to site
build scripts would widen access to the whole account.

The local `verifyCommittedStudioSource` gate now accepts the immutable prepared
source ID, verified site binding and a dedicated checkout. It re-reads every
stored source byte, checks the exact Git remote/branch, requires a clean checkout,
rejects Git filters and extra Studio files, and compares both the committed HEAD
and working files against the approved package. It returns the exact commit for
a future runner but performs no build or provider action. The Container runner
must use this gate immediately before its first deployment and still reconcile
Cloudflare resources and health afterward.

The local `runFirstStudioDeployment` orchestrator now uses that gate before any
site build and again after both native builds and a full Wrangler dry run. The
runner requires a trusted Wrangler executable supplied by the host outside the
site checkout; a local executable or a symlink back into the checkout is
rejected. The hosted runner must mount that executable read-only so site build
scripts cannot replace it. It passes no Cloudflare credential to install,
build or dry run, then claims one
append-only per-site deployment intent before invoking the exact Studio
`wrangler deploy` command through a separate trusted deployment callback. The
build and dry-run callback cannot receive secrets or a Cloudflare credential;
the deployment callback receives the six exact runtime secrets and must run in
an isolated environment, with the checkout mounted read-only. It should use
Wrangler's documented `--secrets-file` support to include the secrets in the
first version, without a second secret-patch version. The command carries a
deterministic Wrangler version tag derived from the verified source, commit,
target and keyed secret identity. A lost response or
timeout is read back against that tag on the actively serving version and never
causes a second automatic deploy. The result remains `reconcile-required` or
`pending-review`, never a ready binding. The orchestration has mocked command
and inspector tests only. It now also requires the exact private GitHub
repository ID, branch and remote commit after the build and before claiming a
deploy intent; an existing intent is checked again during reconciliation.
A trusted disposable Docker runner must still provide
the scoped inspector, protected credential and private store and call it; no
hosted job invokes it, and no provider command has been run by this path.

The existing `@vercel/sandbox` dependency can run Docker, but the current
`VercelStackiProvider` creates editor sessions, not a deployment boundary.
Do not build site-controlled code and later inject a Cloudflare credential into
that same Sandbox: a process left by the build could read it. A hosted adapter
needs separate fresh build and deploy environments, with orchestration outside
both. The build environment gets the exact pinned source and no deploy secrets;
the deploy environment gets only the verified checkout and required build
artifacts, with the checkout read-only and secrets supplied only at deployment.
The source handoff must preserve the Git metadata and byte-for-byte source
checks required by `verifyCommittedStudioSource`. A local `build-handoff.mjs`
contract now stores the source, commit, scoped Worker identity and hashes of
only `dist/**` and `studio/dist/**`. It rejects altered or extra output and
symlinks in those directories when checked in a fresh environment. The local
artifact-transfer step now exports only those receipt-listed files and
restores them into a fresh checkout. It rejects extra files, changed bytes and
symlinks in the transferred directory and removes partially restored output
if final verification fails. It does not upload artifacts or start a hosted job.
The deployment job must independently reconstruct the clean Git checkout, copy
only those listed files, regenerate `studio/.studio-image/site` from verified
root manifests and check the stored receipt before receiving credentials.
No hosted artifact transfer or two-environment adapter is connected yet.
The fresh trusted job can now prepare the same first-deploy intent without
running `npm`: it verifies that handoff, re-reads the scoped site, checks the
exact GitHub head with a repository-only `contents:read` token, confirms that
the reserved Cloudflare Worker has no deployment, and then claims the existing
per-site deploy intent. The post-build preparer and final deploy gate share one
version-tag calculation. A local contract test passes its command directly to
`runTrustedStudioDeploy` without a second build. This is a callable local
entry point, not a hosted dispatch or a completed production deployment.
Vercel's [Docker support](https://vercel.com/changelog/run-docker-containers-inside-vercel-sandbox)
establishes runtime capability, not this credential isolation.
A local build adapter now reads the exact scoped source package through the
trusted store, checks a centrally configured, unexpired
`GNR8_NATIVE_STUDIO_BUILD_SNAPSHOT`, and sends only source bytes to a fresh,
ephemeral Vercel Sandbox. The Sandbox has no supplied secrets or exposed ports;
its network policy permits only GET/HEAD requests to the npm registry. It
requires Node 26.13.0, rejects a snapshot containing an existing build root,
runs fixed install/build commands, re-reads every source file after the build,
downloads only bounded and hashed `dist/**`
and `studio/dist/**` output, then stops. A changed site binding discards the
downloaded artifact. The SDK and output scanner have local mocked/temporary
filesystem tests, but no real Sandbox has been started by this path. A verified
build snapshot, hosted dispatch, artifact upload and fresh deploy environment
still need to be connected. Projects needing other install/build network hosts
will fail this narrow policy until their dependencies are reviewed.
The local Sandbox-to-handoff bridge now checks the downloaded directory against
the Sandbox file list, verifies the clean committed source, copies only the
listed output, and records the immutable source/commit/Worker receipt. A failed
copy or receipt check removes partial output. The source verifier permits only
untracked `dist/**` and `studio/dist/**` while checking a build handoff; it
continues to reject other changes and retains its strict default everywhere
else. The later registered first-build job calls this bridge, but the hosted
environment and artifact transfer have not been exercised.
A configured, credential-free coordinator now checks the exact committed
checkout before the Sandbox build, re-reads the scoped site afterward, records
that Sandbox output through the bridge, and always removes its owned temporary
output directory. It refuses to delete an unexpected directory. A local
producer-to-receipt test covers this path with hosted I/O replaced at the
existing build and source-verification boundaries. The coordinator does not
dispatch a hosted job or supply GitHub/Cloudflare credentials.
A configured first-build coordinator now connects the verified private source
checkout, reserved Studio Worker identity, isolated build handoff, first source
push and a second, artifact-only GitHub ref. The artifact commit has the source
commit as its sole parent and contains exactly the receipt-listed output, not a
second editable Stacki branch. Its ref name is derived from the source commit;
a durable intent permits only one push attempt and readback reconciles a lost
response. On success both source and build bytes are durable in the same private
repository, while the temporary checkout is removed. The local Git tests and
mocked GitHub flow pass. Successful direct source preparation now queues a
scoped first-build Inngest event when the central
`GNR8_NATIVE_STUDIO_FIRST_BUILD_ENABLED=1` switch is set. Its registered job
rechecks the actor's publish permission and the exact durable source receipt
before entering this coordinator. The job requires a centrally configured
trusted Git executable and Git author; the existing build coordinator also
requires its verified Sandbox snapshot and GitHub App configuration. These
settings are not per-site credentials. Local tests exercise the event contract
with provider I/O replaced; the job has not run in a hosted environment, and
the switch must stay off until the host has the required Git executable,
runtime duration and Sandbox access. A successful first build now queues a
separate, credential-free deploy preflight when
`GNR8_NATIVE_STUDIO_FIRST_DEPLOY_PREFLIGHT_ENABLED=1`. That job rechecks the
actor and the exact private artifact receipt, restores the verified Git refs,
then runs the existing Wrangler dry run and records its scoped proof. It needs
centrally configured trusted Git and Wrangler executables. Local tests cover
the queue and receipt gate, but neither the hosted preflight nor its runtime
requirements have been verified; this switch remains off. The proof is not a
Cloudflare publication. A fresh deploy
checkout can now recover the exact source commit from the recorded first-push
intent and private GitHub branch. The local artifact restorer fetches the
recorded build ref, checks its parent and tree, hashes every Git blob against
the stored handoff, and copies only those files into the clean checkout. A
configured adapter first checks the exact private artifact branch and bound
repository with a read-scoped GitHub App token. Focused local tests pass; the
registered deployment job reaches this restore path through the configured
coordinator, but it remains disabled and unverified in a hosted runtime, so no
Cloudflare publication or native Publish result is established. A pending push
requires exact remote-head reconciliation; this coordinator does not invent a
second commit.
The configured first-deploy checkout bridge now checks the reserved Worker,
recovers the exact source and artifact Git refs in a fresh checkout, and holds
that checkout only while the trusted next step uses it. It removes the checkout
on success or failure. The configured intent preparer loads deployment
credentials only after this verified transfer, then uses the existing
post-build intent gate without rebuilding the site. Local focused tests cover
ordering and cleanup. The registered runner still needs host configuration,
Docker build verification and an actual Cloudflare deployment.
The fresh checkout now assembles `studio/.studio-image/site` from the two
verified root npm manifests before loading deployment credentials. It checks
the unchanged upstream Dockerfile's exact copy path and rejects an existing
image directory. Read-only inspection of the four retained local checkouts
found stale manifest copies in CHS and ViroiDoc: their source manifests were
updated after the old ignored image directories. The fresh checkout uses the
current verified Git commit, so those stale local copies are not transferred.
The Docker build and hosted execution boundary still need an end-to-end check.
The first-deploy path can now read one central Cloudflare deploy credential and
the sealed secrets for the bound site after verifying the exact preparation
receipt. It does not create or rotate secrets during deployment.
The central credential still needs trusted-host configuration; no per-site
credential entry is required by this local call.
The local first-deploy path now has a credential-free dry-run receipt and a
single configured deploy call. A separate disposable preflight job can run the
unchanged Wrangler `deploy --dry-run`, reverify the source, build handoff and
Docker context, then claim a receipt bound to the exact artifact commit.
The deploy job reads that receipt before loading Cloudflare credentials. Its
final gate rechecks the build bytes and Docker context before claiming the
one deploy attempt; a lost response leads to control-plane readback and never
an automatic second deploy. These steps pass focused local tests with provider
I/O mocked. The successful dry-run job now queues a separate trusted first
deploy job when `GNR8_NATIVE_STUDIO_FIRST_DEPLOY_ENABLED=1`. Its event carries
only scoped identities, not credentials. The job rechecks actor authorization,
the exact artifact ref and the saved dry-run proof before the configured
coordinator reconstructs the checkout and verifies the full proof again prior
to loading central deployment credentials. A matching intent without an
attempt can resume after renewed target inspection; a recorded attempt can
only be reconciled, never redeployed. Local mocked tests cover both paths.
The hosted runner requirements and Cloudflare readback remain unverified, so
the flag stays off. No live Cloudflare deploy or authenticated Stacki health
result is established.
The public gateway now has a separate first-deploy intent gate. It reconstructs
the verified source and build artifacts, requires the exact Studio deploy
intent and attempt plus an active tagged Studio version with six secret names,
then reads the reserved public Worker and intended hostname. An already
deployed public Worker or a hostname claimed by another Worker blocks the
intent. It rechecks the bound site before an append-only claim. This is a
local preflight. The trusted public deploy call now consumes that exact intent,
reverifies the source, build bytes, generated root Wrangler configuration,
GitHub head, active Studio and domain vacancy, then claims one append-only
attempt before its exact `wrangler deploy --config wrangler.json --tag` command.
It rejects local dotenv files before loading the Cloudflare credential. A lost
response is reconciled against the tagged active public version, without a
second deploy. A confirmed active Studio result now queues one scoped public
gateway job when `GNR8_NATIVE_STUDIO_PUBLIC_GATEWAY_ENABLED=1`. The job
rechecks actor authorization and the exact private build artifact, prepares
the public intent only after verifying the live Studio version and vacant
bound hostname, then invokes the existing one-attempt public deployment gate.
Its event cannot select a Worker, domain or credential. Local mocked tests
cover the job boundary and the underlying intent/deploy gates. On a retry after
a recorded public attempt, it skips the vacancy-only intent preparer and lets
the existing deploy coordinator verify the exact intent and read back the
active version; it cannot issue a second deploy. A pending Studio readback does
not queue it; that
state still needs later reconciliation. The flag remains off until the hosted
runner, central credentials and Cloudflare readback are verified. No live
public Worker deployment has occurred through this path.
The existing Inngest resource-reservation job now queues secret preparation
automatically after an exact reservation when both stage flags are enabled.
The event carries only site scope and actor; the second job rechecks authority
and provider targets. A failed reservation cannot enqueue secret preparation.
One bounded retry covers a lost queue response; the Cloudflare reservation and
publish-token issuer retain their append-only intent/readback protections.
This is local job wiring, not evidence that the
hosted environment has the required central credentials or that either job
has run for a customer site.

The `runTrustedStudioDeploy` callback now implements the exact deploy command
for a dedicated job. It checks that the executable lives outside the site
checkout, independently re-reads the retained source and exact checkout commit,
rechecks the exact GitHub head, and recomputes the target-bound version tag
before any provider invocation.
It also requires the matching durable first-deploy intent and atomically claims
the only attempt, so a repeated callback cannot issue another deploy command.
The existing private, per-site `SupabasePublicationStore` provides this
append-only read/claim contract; a local SDK test confirms that fresh store
instances see the same intent and only one concurrent attempt claim succeeds.
It accepts only the intended config and tag, writes the six
secrets to a private temporary file for Wrangler, strips ambient environment
variables, sanitizes failures and removes the file. It does not itself isolate
the host: the build job must end before a separate deploy job receives secrets,
and that job must mount the verified checkout read-only. No job currently calls
this callback in a hosted environment.

A read-only first-deployment inspector now checks the reserved Worker's immutable
ID and disabled public subdomains, its [actively serving deployment](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/),
the active version's `PreviewContainer` export and exact
[version-scoped bindings](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/),
and the matching [Container application](https://developers.cloudflare.com/api/resources/containers/subresources/applications/methods/list/).
It also checks the exact preview origin, public-site deployment URL and
repository-only editor settings. The hosted wrapper compares the configured
GitHub repository against the current scoped site binding. A login page alone
is not a Container or editor health check; authenticated Studio status and
preview must still be exercised before recording readiness.
When given the expected first-deploy tag, it also reads the active version's
[version annotation](https://developers.cloudflare.com/api/resources/workers/subresources/beta/subresources/workers/subresources/versions/methods/get/)
and refuses a mismatch. This links readback to the one intended deploy, but a
tag alone cannot prove the deployed bytes. The Beta endpoint's response shape
still needs hosted readback.
For this combined first-deploy path, the inspector also requires all six secret
names on that active version. Their values remain unreadable. The isolated
deployment callback is wired behind a disabled flag and has not run hosted.
It re-reads the current scoped site and GitHub binding before Cloudflare access.
An absent deployment or delayed application remains pending; a mismatched Worker,
bucket, domain or split deployment fails closed. Newer unpublished settings
cannot stand in for active-version bindings. Hosted readback of this API shape,
preview health, authenticated editor access, secrets and the exact deployed source remain
required before a ready binding. Tests use mocked responses; no hosted provider
call was made.

The external `verifyAuthenticatedStudioHealth` gate now checks the unchanged
Studio's signed-in GitHub identity, Container-backed status, editor HTML and
protected preview handoff and page. It requires a short-lived native Studio
session from a user with repository write access; a login page cannot pass.
It does not create a session, modify Stacki, check visual fidelity, exercise
GitHub Push or Publish, or write a ready binding. The hosted runner still needs
to supply a valid session and call this gate after deployment. Local tests use
mocked HTTP responses only.
An additional public-entry check can request `/studio/` without a session and
verify the unchanged Stacki login page at the confirmed host. This is suitable
for unattended route smoke testing, but it cannot prove that the protected
Container starts or that an owner can edit. The native Worker deliberately
checks its GitHub-backed session before forwarding editor requests to the
Container. The current ready-binding criterion therefore still needs an
authenticated owner session; no unattended bootstrap caller can supply one
without adding a separate privileged identity or changing native Stacki.
Do not silently treat the public login page as full editor health. A first-user
native sign-in can satisfy this check inside Stacki once the initial Studio
link is safely available; the handoff and readiness transition are not wired.

### First native sign-in without an external confirmation

The Design tab still gives an immutable ready binding (or one of the four
scoped legacy bindings) precedence. A local `first-open` recorder now requires
the verified build handoff, exact GitHub branch head, active tagged Studio
version with secrets, active public gateway version and domain, and native
login page before claiming a separate append-only receipt. It binds the
agency/client/site, repository ID and branch, working origin, source commit,
both immutable Worker IDs and active version IDs. The guarded link reader
rechecks the current scoped target and, only with
`GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED=1`, labels the link as a first native
sign-in. A stale ready binding blocks this fallback; reservation and source
preparation alone never expose a URL. The flag defaults off. A read-only
GitHub installation-token check now verifies the private repository ID and
the exact branch head against the prepared commit. The configured first-open
adapter now resolves the resource receipt, build handoff, exact first-deploy
intent and attempt for both Workers, central Cloudflare credential, and a
repository-scoped GitHub read token before invoking that recorder. It checks
the active public version's exact first-deploy tag. It does not take Worker IDs,
commit or domain from an event. An observed public-gateway result now queues a
scoped first-open job when `GNR8_NATIVE_STUDIO_FIRST_OPEN_ENABLED=1`. The job
rechecks actor authorization and the exact durable source handoff before the
adapter independently checks GitHub, both Cloudflare versions and the public
Stacki login page. The existing Design tab reads the resulting receipt and
shows a labelled first native sign-in link; it does not label the editor ready.
Local mocked tests cover this handoff. Pending public readback does not queue
it, and the flag remains off until the hosted path is verified, so no new
receipt has been produced in production.
A central, trusted token issuer is available for
that later job. It signs a short-lived GitHub App JWT with the shared private
key, requests `contents:write` for the first push or `contents:read` for
deployment verification, only for the current bound repository ID,
checks the returned repository and permissions, and re-reads the target before
handing the token to the job. It has only mocked local coverage and no hosted
caller. The read-only head check accepts GitHub's longer stateless installation
tokens and distinguishes a missing first-push branch from a missing or wrong
private repository. A local checkout adapter now uses a centrally issued
`contents:read` installation token to fetch the private repository's default
HEAD into a fresh trusted directory, requires its exact inspected base commit,
rejects Git attributes, submodules and linked files before checkout, then
prepares and verifies the source commit as that base's sole child. The token is
removed from the Git process before any site build; the returned checkout and
cleanup path contain no credential. A local bare-repository test covers this
transfer and changed-base rejection. No hosted runner calls the adapter yet.
The first-push step verifies the retained source
commit, claims a separate durable per-site intent, checks the exact remote
repository ID and branch, and transfers only that commit through a fresh bare
Git repository. The credentialed command uses a literal bound GitHub URL,
sterile Git configuration and a temporary askpass helper; checkout-local
`pushurl` and `insteadOf` settings cannot redirect it. Before transfer it
requires the new commit's sole parent to match the repository's verified
default-branch commit, so unrelated local history cannot travel with the
source. This parent check now runs before the append-only push intent is
claimed, and the intent records that base commit. A lost push response is
reconciled against the remote commit, and an absent or unavailable result
remains pending without an automatic duplicate push. This step has a local
Git receiver test. A configured post-build entry point now verifies the
immutable build handoff, obtains the short-lived token centrally, and connects
the scoped remote inspector and push step. No hosted runner calls this entry
point yet. Before rollout, verify that the unchanged Stacki release also accepts
the actual token length: the retained 1.4.8 source caps its parsed token at
500 characters, so a longer live token may break native Push to GitHub. The
first-push adapter, deployment head check and first-open recorder now fail
before claiming success
when the observed token exceeds that limit; a real native Push smoke is still
required, and a longer live token needs a compatible official Stacki update.
Mocked local tests do not establish hosted readiness.

The unchanged Stacki OAuth callback returns to the site's own `/studio` and
sets a host-only, HttpOnly session cookie. Platform runs on another host; it
cannot read that cookie or the protected `/studio/api/status` response, and
Stacki emits no GNR8 post-login callback. Do not mint a session using the
central `SESSION_SECRET` or reinterpret Container instance status as owner
access. Native sign-in remains the user's only first-use action. A future
same-host, GNR8-owned verification path outside upstream Stacki may report
authenticated editor/preview health to Platform, but it needs a separately
reviewed identity and replay contract before it can write the immutable ready
binding. Until then, first-open and fully verified readiness are distinct.

The public gateway now has a separate read-only control-plane inspector. It
rechecks the current scoped domain and bound repository, then checks the
reserved public Worker's immutable ID, its single actively serving version,
`ASSETS` and exact `STUDIO` service bindings, and the enabled custom domain
attached to that public Worker. An empty Worker or unattached domain remains
pending; a foreign Worker, split traffic, wrong Studio target or wrong domain
fails closed. It uses Cloudflare's [active deployment](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/),
[version bindings](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/)
and [Worker domains](https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/list/)
readbacks. Mocked responses pass; the API response shape, actual routing and
served source still require hosted verification. This inspector does not deploy
the public Worker or write a ready binding.

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

The separate offline provider adapter remains for a Worker that needs secrets
after its first code deployment; the combined first-deploy path above is the
intended new-site flow. Before any patch, the adapter reads the active Studio
version and refuses to overwrite an existing `PUBLISH_CLOUDFLARE_API_TOKEN`
binding. The four existing Studios therefore need their separate verified
cutover path; this first-install adapter cannot silently migrate them. The
adapter patches those six secrets together on the exact
per-site Studio Worker. Cloudflare documents that the bulk patch creates a new
version. The adapter now requires a different 100%-active version after the
patch and reads the six names and `secret_text` types from that version's
bindings; a latest-version secret list is insufficient. If Cloudflare leaves
the newly created version inactive, this step fails closed until a separate,
exact-version activation and readback is implemented. The installer currently
claims a durable per-site patch intent before the provider request. Its identity
is keyed with the private vault key, so the store contains no raw secret value
or plain digest of one. An ambiguous response leaves the intent pending and
cannot trigger another patch on retry. A successful active-version readback is
saved as a separate receipt with the pre-patch active Studio version ID;
repeated calls reuse it. Earlier receipts without that ID remain readable and
report no recovery reference. The captured ID is not proof that the older
version has all required bindings or can publish. A local read-only inspector
can now fetch that exact previous version, verify the immutable Studio Worker
identity and expected domain/repository, and report missing or duplicate
secret and non-secret bindings, a missing version, or an earlier receipt with
no reference. Its expected identities must come from the authoritative site
and repository binding, never from an untrusted event.
The bound read-only entry point now resolves those identities from scoped
Supabase site and GitHub repository rows and reads the immutable Studio Worker
ID before inspecting the captured version. It returns candidate metadata only;
the version ID must still come from a trusted install receipt, and hosted
rollback and native Publish remain unverified.
Complete bindings are only a recovery candidate: the old secret value, native
Publish and rollback eligibility still require hosted verification. The inspector
has only mocked local tests and is not wired to hosted provisioning. Changes to the shared
secrets conflict with that first-install intent and need a separate rotation
flow. A pending intent still needs exact-version reconciliation before the
hosted job can continue without review.
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

The local token-issuance coordinator now reserves one deterministic managed
token name per site, `gnr8-<site-id>-native-publish-v2`, before a create request.
This separate name lets the four existing manual tokens remain active while a
new narrowly scoped value is issued and sealed. It verifies the exact account, zone, site
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
The exact-policy check also rejects account tokens with IP, activation, or
expiration restrictions before sealing or reusing them. A token verified from
the central provisioner might otherwise be unusable in the Studio Worker;
restriction details and token values are not retained in the policy receipt.
The four existing Studio Workers have scoped publish-token secret names, but
their values cannot be read back from Worker secrets. No matching value in the
central vault has been verified. The managed v2 token path deliberately does
not adopt or roll those manual tokens. Its local mocked-provider test confirms
that the old token is untouched while the new value is sealed. A hosted
cutover path must install the managed value, prove the exact active Worker
version and native Publish. The first-install adapter now refuses to replace
an existing publish secret, so that separate migration installer is still
missing. A composed local test now exercises managed token
issuance, sealed storage, Studio secret upload and active-version name/type
readback while a separate legacy account token remains untouched; its mocked
Studio has no pre-existing publish secret. This cannot prove the
Worker secret's value: native Publish can still succeed through the old token
while both are active. Retiring the old token needs a separately reviewed
hosted cutover and recovery check; no retirement action is implemented. Until
that point there are two scoped tokens per existing site; this is a temporary
migration state, not a universal steady state. No hosted token has been issued
by the v2 path, and the existing Worker secrets remain unchanged. Do not repeat
the withdrawn per-site user token handoff.

The one-time cutover for each existing site must use its verified site ID,
account ID, public Worker ID, old token ID, and managed v2 token ID. Before
replacing the Studio secret, preserve the ID of an existing Studio version
whose native Publish and required bindings have been verified with the old
token. Confirm that this version remains eligible for rollback; a version
with missing shared secrets or broken publishing is not a recovery point.
The old token value cannot be read back, so merely re-enabling that token
after its Studio secret has been replaced cannot restore publishing. If no
verified recovery version exists, stop the cutover until one can be prepared.

Confirm that the new token is active with the exact two policies, its sealed
value verifies as that token, and a future migration receipt names the
currently active Studio version. Record the old token's complete definition
and status for recovery without exposing either token value. Disable only the
old token and read back its disabled status. While it is disabled, perform
native Publish from the unchanged Stacki Studio using a distinguishable,
reviewed revision; verify that revision reached the intended public Worker
and working domain. Publish while the old token remains active is not cutover
evidence. On failure or ambiguous publication, stop, restore the verified
older Studio version, re-enable the old token with its exact recorded
definition, and verify native Publish again before another attempt. Do not
delete either token or overwrite the managed vault value as an automatic
retry. After successful cutover, check native Push to GitHub separately, then
retire the disabled old token only in a reviewed cleanup. The recovery version
and status changes need hosted verification before this can run. A local
mocked adapter can now disable the exact old account token and restore it only
with the definition fingerprint returned by a successful disable. It preserves
the token's policy and optional IP/time settings and requires exact status and
definition readback. There is no provider compare-and-swap, so concurrent
token edits must be excluded during the hosted cutover; an ambiguous update
stops for reconciliation without automatic retry. This adapter is not wired to
a hosted runner, and the distinct Studio secret migration/rollback path is not
implemented. Future sites begin with a single managed token and do not
need this migration cutover.

Cloudflare API references: [update account token](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/update/),
[verify account token](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/),
[delete account token](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/delete/),
[Worker version rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
The legacy release preparation requires a ready Studio binding; the newer
direct source path can use a guarded bootstrap target before readiness.
Credential installation cannot be inserted into these preparation routes:
the new-site bootstrap may prepare source early, but must establish Workers,
domain routing and Studio health before it writes the verified launch binding.

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

On 2026-11-21, the retained CHS, ViroiDoc and Ladja Žaba checkouts also passed
the full local `wrangler deploy --dry-run --config cloudflare/wrangler.jsonc`
with Docker. Wrangler built each unchanged Studio Worker and Container image,
reported its `PREVIEW`, `DRAFTS` and asset bindings, and exited without
publication. The checked commits were CHS `2983c728`, ViroiDoc `80d0e850`
and Ladja Žaba `e8839c98`; the three checkouts remained clean. Together with
the Logatčan result above, all four retained Studio packages have local build
evidence.
On 2026-11-22, all four retained local Git heads still matched the reviewed
values and all four checkouts were clean. Hosted branch heads were not rechecked.
This does not verify hosted routing, secrets, authenticated editing, GitHub
Push or native Cloudflare Publish.

## Concrete external rollout still required

### Trusted-runner audit — 2026-11-23

The local `apps/worker` production build passes and its `/api/inngest` bundle
contains all six registered first-build through first-open functions, including
the Vercel Sandbox SDK code. This proves packaging in the local build only.
The route declares Node.js and `maxDuration = 800`; the local build ran on
Node 22, while the Worker package requests Node 26. Neither fact proves the
deployed runtime or its available system executables. The Worker package does
not install Wrangler, and no configured trusted Git/Wrangler paths or verified
build snapshot are established by this repository. The configured first
deployment needs a Docker-backed Wrangler Container build in a distinct trusted
environment. Vercel documents [Docker inside Sandbox](https://vercel.com/changelog/run-docker-containers-inside-vercel-sandbox),
but that capability has not been connected to this deployment job. The
registered Inngest route itself is not evidence of a Docker daemon.

There is also a credential-boundary blocker in the current first-deploy path.
The credential-free Wrangler dry run builds the unchanged Studio Dockerfile,
but the later `runTrustedStudioDeploy` invokes Wrangler again with the
Cloudflare token and six Studio secrets while its container `image` still
points to `../Dockerfile`. Wrangler therefore builds the image again in the
credentialed process. This does not satisfy the intended separation between
site-controlled builds and deployment credentials. Cloudflare supports a
[pre-built image reference](https://developers.cloudflare.com/containers/guides/image-management/)
for this container configuration, with no Docker build at deploy time. The
trusted deploy gate now requires a private, scoped receipt that binds the
image digest to the source commit, Worker and site. It derives a temporary
deploy configuration that changes only the container image to a Cloudflare
Registry digest reference, then removes that configuration after the attempt.
Missing or mismatched receipts stop before the one deployment attempt is
claimed. The committed Stacki configuration remains unchanged. A separate
hosted credential-free image builder, immutable artifact transfer, registry
push and receipt producer are still needed before this gate can run; the
previous local dry-run result does not establish them. All related feature
switches stay off.

A local credential-free image archive boundary now verifies the exact source
handoff and Docker context, invokes a trusted Docker executable with a stripped
environment, exports one image tar, then checks source and context again. Its
receipt binds the archive hash and size to the site, source commit and Worker.
The receiving side can verify the tar bytes against that receipt without
running the image. Mocked local tests cover the command and integrity checks;
no Docker build or transfer was performed by this new path. The hosted build
job, archive transport, registry push and scoped registry-digest receipt are
still unconnected. The deploy switch remains off.

A local receiving gate now checks the transferred archive against its private
scoped receipt, loads it into Docker without Cloudflare credentials, verifies
the required `linux/amd64` architecture, then makes one Wrangler
`containers push` attempt with the central Cloudflare credential. It reads the
exact account/repository digest from Docker after a successful push and claims
the prebuilt-image receipt required by first deployment. A lost or failed push
is not retried blindly. Focused tests replace Docker and Wrangler calls; no
registry push or live Docker load has been performed by this path. The hosted
transfer and trusted-runner wiring still need to supply the private archive
receipt and both executables. A local trusted receiver now records that receipt
only after checking the archive bytes, source/build handoff and Docker context.
One local producer-to-receiver-to-deploy-config test passes with Docker and
Wrangler replaced at their command boundaries. The hosted archive transport
remains unconnected; the installed Sandbox SDK supports Vercel Drives, which
can move a large archive between isolated Sandboxes. Read-only inspection of
the `gnr8-worker` Vercel project's Drives page on 2026-11-23 showed the
feature available and no project Drive yet. No Drive or Docker runner has been
configured or exercised for this path. The deploy switch
remains off.

The local Vercel Drive adapter now creates a per-attempt Drive, attaches it to
a fresh build Sandbox, stops that Sandbox, then attaches a read-only Drive
snapshot to a separate push Sandbox. The receiver must rehash and size-check
the archive on that snapshot before the Cloudflare credential loader runs.
The trusted receipt writer accepts that remote verification result while also
rechecking the scoped source handoff and Docker context. A mismatch prevents
the credential load or private receipt claim. The adapter requires explicit
restricted network policies and two distinct pinned Sandbox snapshots, and deletes
the temporary Drive after both Sandboxes stop. Mocked SDK and receiver tests
prove ordering, integrity checks and cleanup; no Drive or Sandbox has been
created through this adapter yet. A build callback now writes the verified
Stacki source and the two required root manifests into the credential-free
Sandbox, verifies source bytes before and after Docker build/save, and returns
the scoped archive hash and size. A separate receiving callback loads and
checks the image without credentials, claims one private push attempt, passes
the Cloudflare token only to Wrangler's push command, and records the exact
registry digest afterward. Both callbacks are locally tested with Sandbox
commands replaced. They are now connected to registered, disabled Worker jobs
through the Drive coordinator and private receipt writer. No verified
Docker snapshots or network allowlists have been configured. First deployment
remains disabled until that hosted path and one scoped end-to-end run pass.
The first-deploy Worker job now requires the exact scoped prebuilt-image
receipt and its match to the reserved Cloudflare account before it calls the
coordinator that loads deploy secrets. A two-stage
Drive adapter is also available locally: the first invocation claims a
private, site-scoped attempt before creating a Drive, stops the builder, then
records the Drive identity and producer archive receipt. A second invocation
reads that record from the private store, opens the existing Drive with
`Drive.get`, mounts a read-only snapshot, rehashes the archive and verifies
the source handoff before loading the Cloudflare credential. It stops the
receiver and deletes the Drive afterward. A failed or ambiguous build retains
its attempt record and cannot silently start a new Drive. Mocked tests cover
the two-invocation ordering; no hosted Worker has called these stages yet.
The source file list is stored as a bounded, hashed Sandbox manifest rather
than embedded in a command argument; a large prepared source therefore does
not exceed the Linux single-argument limit. The Worker Inngest route currently
allows 800 seconds per invocation. The configured adapters and registered
Worker jobs now use the detached Sandbox command lifecycle. A build, save,
load or push command is started once, with its scoped intent and session ID
stored privately; later Inngest steps poll that same session after durable
two-minute sleeps. A completed transfer or prebuilt receipt can resume a lost
next-event acknowledgement without repeating a build or registry push. Each
advance rechecks the artifact, source and target account. The source manifest,
Drive archive and registry digest are verified at their respective handoffs.
An ambiguous start, replaced session or changed target stops for review.
The Worker permits 50 advances per image stage, and each invocation remains
bounded. The build Sandbox requires a configured 60–90-minute session; push
requires 50–60 minutes. Before a long command starts, the adapter checks the
session's actual remaining time. These local tests use mocked Sandbox, Docker,
Wrangler and Inngest boundaries. No hosted Sandbox, Drive, image build or
registry push has been exercised through this path, and all image switches
remain off. [Vercel's Sandbox duration guide](https://vercel.com/kb/guide/vercel-sandbox-duration-and-persistence)
lists a 45-minute limit on Hobby and longer sessions on Pro or Enterprise;
the actual GNR8 project plan and snapshot setup still need verification.
The local production Worker bundle contains both image jobs and their detached
Platform modules. Review of the assembled path also added full build Sandbox
attestation, checks snapshot lifetime only before creating a new Sandbox, and
resumes a single cleanup attempt if the prebuilt receipt was written before
cleanup began. All three cases have focused local regression tests.

Keep all new build, preflight, Studio deploy, public gateway and first-open
switches off until a trusted runner has pinned executables, the required
Docker capability, a verified build snapshot, separate build/deploy credential
contexts and enough execution time. Then verify one exact scoped site through
source preparation, GitHub push, both Cloudflare deployments, first-open link,
native sign-in, GitHub-only Push and native Cloudflare Publish. The first
Studio deployment job now makes up to 15 spaced observations when the
Cloudflare control plane is temporarily pending or unavailable; an ambiguous
intent remains terminal. This local reconciliation has not been hosted-tested.

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
The retained Ladja Žaba Studio passes its scoped publish secret to Wrangler as
`CLOUDFLARE_API_TOKEN`. Native `hosting` Publish skips GitHub, and native
`github` Push skips hosting; the primary `all` target does both. Stacki reports
hosting success after Wrangler exits successfully, but the prepared
`/__studio-deployment` route returns `sha: null`. For the first hosted cutover,
record the old public Worker version, disable the old token only after a verified
Studio recovery point, publish a distinctive reviewed change with native
`hosting`, then verify a new active public Worker version and that exact change
on the confirmed working domain. A success message or token last-used timestamp
alone cannot establish which token performed the deployment. The local audit
has not performed this hosted check.

Reviewed external action inputs are saved locally in `/private/tmp/gnr8-native-sites/rollout-review.json`; the existing CHS/ViroiDoc launch bindings are in `reviewed-existing-bindings.json`. Neither file contains credentials.
