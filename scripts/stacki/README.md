# Native Studio preparation

Completed slice: an existing, retained standalone Astro export can receive the same
pinned native Studio source and site-specific Cloudflare configuration using one
local command. No recapture, generated-code patch, new service, or shared runtime.
The `prepareFromStoredRelease` bridge now reads a release and its bytes from the
existing immutable publication store. It checks the release identity, exact file
hashes, source manifest, confirmed-import foundation and repository binding, then
returns the source export plus native Studio files. It omits Vercel deployment
configuration and the Vercel-specific README in the Cloudflare derivative, while
retaining the original source manifest and recording its digest in a new native README. It uses the stored result:
no capture, build, provider call, Git write or external configuration is repeated.
The bridge can now persist the prepared derivative with the existing append-only
store and reuse it by release/site identity after a retry. A local Git step checks
the dedicated repository and stable branch, stages exactly these files, and is
repeatable. `commitPreparedStudio` can make one local commit with an explicit
author; it disables hooks and signing and returns the same commit on retry. It
does not push. It is not yet invoked
by the hosted Worker and does not change the existing Vercel publication path.

```sh
node scripts/stacki/prepare-native-studio.mjs /path/to/export /path/to/stacki-studio-1.4.2.json /path/to/site.json
```

Use `site.example.json` for the non-secret binding schema. Supply the actual verified
site/repository/App identities from the existing connection flow. The tool does not
verify ownership or private visibility with GitHub, create a repository, or infer
which retained import was approved. Its caller must use the existing confirmed-import
and ownership checks before handing it a project. Do not run it on a live checkout.
The release JSON must match `release-pin.mjs`; it is not downloaded by this command.
The current digest pins the retained 1.4.2 artifact, not a new upstream signature check.

The command writes:

- `studio/`: all pinned release files, byte-for-byte, including native licensing.
- `studio/cloudflare/wrangler.jsonc`: one Worker/Container and private draft bucket
  name per site; repository-only editor access; separate preview origin.
- `cloudflare/site.wrangler.json`: native site gateway, `/studio` forwarding and the
  deployment revision endpoint. Preview is a child hostname of the site hostname.
- `.gnr8/native-studio.json`: the exact pin and non-secret site binding for resumption.

Website source, package versions, Astro configuration, lockfile and source manifest
remain unchanged. The source manifest continues to describe the imported website;
Studio is an additional integration layer and is recorded separately. AI is unset.
Existing unmanaged Studios are refused, so this does not migrate CHS or ViroiDoc.
A server export (`api/` or `functions/`) is refused: the native static gateway cannot
silently replace its contact/API behavior.

Repeat the same command after interruption. It fills missing files/configuration,
checks existing bytes and leaves local state/drafts alone. A changed identity or
edited managed file stops preparation. Run only one preparation per directory.
It neither selects a newer capture nor changes a Git head. An installed native
Studio can change its source during normal operation; this command intentionally
refuses to overwrite such edits.

## Remaining external setup (not performed)

1. Use the existing GitHub connection/provisioning boundary to verify a dedicated
   private repository and branch, then deliver the prepared files there. Install
   the GitHub App on that repository and configure its callback at
   `STUDIO_ORIGIN/studio/auth/callback`.
2. Provision that site's Cloudflare Worker/Container and private R2 bucket, custom
   site and preview hostnames. Store independent `SESSION_SECRET` and
   `CONTAINER_TOKEN`, plus `GITHUB_PRIVATE_KEY` and `GITHUB_CLIENT_SECRET`, in the
   Worker secret store. Never put them in `site.json` or the generated files.
3. Install/build native Studio using its own instructions. Validate the website's
   actual dependencies inside the native Container before deploying. This slice
   does not claim Astro 5/7 runtime compatibility or change the Astro version.
4. Connect the exact branch to Workers Builds for the public site. On every build,
   set `SITE_VERSION.tag` to the exact 40-character deployed Git commit in the
   generated site config, build the website, then deploy that config. The empty
   tag in the prepared file deliberately reports an unknown revision. Without
   this pipeline, native Publish may commit but cannot report a verified live
   result. The `GITHUB_DEPLOY_*` vars select native GitHub-pipeline publishing and
   assume this pipeline is configured; they do not create it.
5. Verify login/access denial, actual `/studio` preview, edit/reconnect recovery,
   and a published revision on the selected domains before enabling customers.

## Single next delivery slice

Do not attach this derivative to `runStandalonePublication`: that job uses an
immutable `gnr8-release-<manifest>` Git branch and stages a Vercel deployment,
while native Publish needs a stable connected branch and a separate Cloudflare
website build. It would otherwise advertise a Studio with no valid live Publish.

Invoke `persistPreparedStudio` from an authorized new-site action after the
existing release is saved, using verified repository IDs and site-specific Cloudflare
settings. Revalidate current confirmation and access before each action. The pinned
release can now be fetched from the one fixed release URL and verified by SHA-256
before use; a retry with a saved derivative does not fetch it again. The `/tmp`
release file remains only a local test input. The derivative receipt
already supports resumption without repeating the capture or export. Add the authorized Cloudflare provisioning,
secret injection and Git-to-live revision pipeline at that boundary. Do not create
another capture/export path, queue, database, or shared multi-tenant Studio service.
Resolve server/contact hosting compatibility before enabling such sites.

CHS and ViroiDoc migration is a separate reviewed rollout: preserve their current
repositories, buckets, domains, drafts and rollback paths. Keep their current IDs
instead of blindly replacing them with names generated for new sites.

For upgrades, change the central pin only after validating the new native release.
Use Stacki's native updater for existing installations; it preserves `cloudflare/`
and state while replacing Studio code. Our only site adaptations are configuration,
outside replaceable native source. Automatic upgrade/receipt migration for previously
prepared sites remains to be connected; changing the pin alone currently fails
closed on an older receipt. No native customization patch must be re-created.

## Focused verification

```sh
STACKI_RELEASE_FILE=/path/to/stacki-studio-1.4.2.json node --conditions=react-server --import tsx --test scripts/stacki/prepare-native-studio.test.mjs
```

This runs the existing standalone exporter into a temporary project, prepares the
actual pinned release, compares every native and website file, exercises native
`serveSite` routing/revision behavior, resumes a missing config write, preserves
local drafts, and refuses identity drift, edited/unmanaged Studio, changed release,
server exports and symlinked metadata. No network, npm install, containers or hosted
execution. Without the release path the two release-dependent tests are skipped;
a skip is not acceptance evidence.

Verified locally on 2026-11-14 with Node 22.22.3 and the retained release matching
the pin: the original 3 tests and the stored-release bridge test passed, 0 skipped. No hosted attempts. Rendering, login, actual
Cloudflare resources and live Publish have not been verified by this check.

## Disabled-by-default preparation action

The local `prepareFromVerifiedAstroExport` bridge can now compose the same
offline Studio files directly from a verified Astro export, its selected source
identity and the current confirmation hash. It does not require a Vercel release
or invoke a provider. The caller must perform the current capture, Brand and
technical-closure checks before supplying that hash. `persistVerifiedAstroStudio`
stores the resulting bytes and an immutable receipt in the existing private
publication store. Its identity binds the source manifest, current confirmation,
normalized site binding and pinned Stacki release. A matching retry reads back
and verifies every stored byte; a changed input gets a distinct receipt. No
provider operation or live Studio is implied by this receipt.
The saved target-free receipt can also be read back with every byte checked and
locally staged/committed through `prepareGitBranchFromSource` and
`commitPreparedSource`. They require the exact dedicated repository and stable
branch, refuse unmanaged changes and symlinks, disable commit hooks/signing, and
never push. This source ID is separate from the older Vercel release ID.

The application now exposes a disabled-by-default direct action from the
confirmed import review. `POST native-studio` with `action: "prepare-source"`
and the selected artifact queues the Worker to recheck ownership and current
acceptance, export only the selected Astro source, and store the offline package.
`GET native-studio` with the same selected artifact and agency ID recomputes
the current confirmed request identity, then reads its immutable success or
sanitized failure receipt. This works after reloading the review. The existing
release-based action remains available.
The direct action does not install dependencies, execute generated code, push
Git, create Cloudflare resources or publish the site. A request without a
receipt may still be running; if status storage itself is unavailable, inspect
the Worker job before retrying. No hosted run of this new action has been
performed.

`POST /api/gnr8/agency/clients/{clientId}/sites/{siteId}/native-studio`
accepts `agencyId` and an existing `releaseId`. It checks same-origin JSON,
authorized site access, the release's tenant/site/version identity and the
currently configured site binding before enqueueing the native preparation job.
The job rechecks the actor and ownership, then stores the native derivative
under the existing release store. `GNR8_NATIVE_STUDIO_PREPARE_ENABLED=1` and a
matching entry in `GNR8_NATIVE_STUDIO_SITES` are required; no site is enabled by
default. This action prepares bytes only. It does not push Git, deploy Cloudflare
or report a live Studio. The binding is per site, so this is a controlled
integration point, not yet unattended preparation for every future import.
The action also requires the saved source build receipt to match the release's
confirmation and transform identity. The import-review route writes a
`confirmedImport` certificate only after the selected routes, content and
layout decisions, Brand revision, and technical closure have been reviewed and
the selected scope has been explicitly accepted. This confirms the selected
scope, not discovery of every page on the original website.
Immediately before preparing bytes, the Worker reads the current source artifact,
capture provenance, Brand revision, confirmation and selected-route closure again.
A withdrawn or changed confirmation fails closed even when an older immutable
release still exists. Release creation performs the same current closure check
before reading the source assets.

`evaluateSelectedImportClosure` now combines the existing retained capture review
with the generated-output technical PASS for an exact list of selected routes. It
reports missing routes/assets, omitted links, capture limits and unsupported
capabilities. Its result is deliberately `wholeSiteComplete: false`: the retained
capture review says that discovery of every page of the original website remains
unverified. This selected-route result supports explicit acceptance but does not
authorize Publish by itself.
The existing import-review screen now reads this evidence when it is available and
shows the reasons in plain language. The evidence digest is part of the review
token, so a changed capture or technical result invalidates an older save. A
failed evidence read leaves the existing review usable but keeps completeness
unverified.
